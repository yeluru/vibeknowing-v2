from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
from services.ai import AIService
from dependencies import get_optional_user
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import json
import os
import asyncio

router = APIRouter(
    prefix="/ai",
    tags=["ai"]
)

# Background task to generate audio without blocking the request
def background_generate_podcast_audio(artifact_id: str, script_data: dict, api_key: str):
    from database import SessionLocal
    db = SessionLocal()
    try:
        # 1. Generate Binary Audio
        audio_bytes = AIService.generate_podcast_audio(script_data["segments"], api_key=api_key)
        
        # 2. Save to local disk
        # ai.py is in apps/api/routers/ai.py, so parent.parent.parent is apps/
        from pathlib import Path
        base_dir = Path(__file__).parent.parent.parent
        podcasts_path = base_dir / "web" / "public" / "podcasts"
        os.makedirs(podcasts_path, exist_ok=True)
        
        file_path = podcasts_path / f"{artifact_id}.mp3"
        with open(file_path, "wb") as f:
            f.write(audio_bytes)
            
        # 3. Update Artifact status
        artifact = db.query(models.Artifact).filter(models.Artifact.id == artifact_id).first()
        if artifact:
            new_content = artifact.content.copy()
            new_content["status"] = "ready"
            # The URL will be relative since we mount /podcasts in API and the web app also has it
            new_content["audio_url"] = f"/podcasts/{artifact_id}.mp3"
            artifact.content = new_content
            db.commit()
            print(f"[Podcast] Finished generating audio for {artifact_id}")
            
    except Exception as e:
        print(f"[Podcast] Background Error: {e}")
        artifact = db.query(models.Artifact).filter(models.Artifact.id == artifact_id).first()
        if artifact:
            new_content = artifact.content.copy()
            new_content["status"] = "error"
            new_content["error"] = str(e)
            artifact.content = new_content
            db.commit()
    finally:
        db.close()



def _get_ai_params(request: Request, task: str = "chat") -> dict:
    """
    Extract AI provider/model/key from request headers.
    Headers set by the frontend interceptor in api.ts:
      X-AI-Provider: "openai" | "anthropic" | "google"
      X-OpenAI-Key: "sk-..."
      X-Anthropic-Key: "sk-ant-..."
      X-Google-Key: "AI..."
      X-AI-Task-Models: '{"summary":"anthropic:claude-sonnet-4-20250514",...}'
    """
    provider = request.headers.get("X-AI-Provider", "openai")

    # Get the key for the chosen provider
    key_map = {
        "openai": request.headers.get("X-OpenAI-Key", ""),
        "anthropic": request.headers.get("X-Anthropic-Key", ""),
        "google": request.headers.get("X-Google-Key", ""),
    }
    api_key = key_map.get(provider, "")

    # Check for task-specific model override
    model = None
    task_models_header = request.headers.get("X-AI-Task-Models", "")
    if task_models_header:
        try:
            task_models = json.loads(task_models_header)
            override = task_models.get(task, "")
            if override and ":" in override:
                # Format is "provider:model_id"
                parts = override.split(":", 1)
                provider = parts[0]
                model = parts[1]
                api_key = key_map.get(provider, "")
        except (json.JSONDecodeError, ValueError):
            pass

    return {"provider": provider, "model": model, "api_key": api_key}


class ChatRequest(BaseModel):
    source_id: Optional[str] = None
    message: str
    scope: str = "source" # "source" or "all"


@router.post("/chat")
async def chat(request_body: ChatRequest, request: Request, db: Session = Depends(get_db), current_user: Optional[models.User] = Depends(get_optional_user)):
    source = None
    if request_body.source_id:
        source = db.query(models.Source).filter(models.Source.id == request_body.source_id).first()
        if not source or not source.content_text:
            raise HTTPException(status_code=404, detail="Source content not found")

    # If no source_id, force scope to "all" (global chat)
    if not request_body.source_id:
        request_body.scope = "all"

    # Save user message (source_id can be NULL for global chat)
    user_message = models.ChatMessage(
        source_id=request_body.source_id,
        user_id=current_user.id if current_user else None,
        role="user",
        content=request_body.message
    )
    db.add(user_message)
    db.commit()

    ai_params = _get_ai_params(request, "chat")
    print(f"[RAG] User: {current_user.email if current_user else 'ANONYMOUS'} | Scope: {request_body.scope} | Provider: {ai_params.get('provider')} | Has API Key: {bool(ai_params.get('api_key'))}")

    # ----- RAG PIPELINE START -----
    # Determine the search boundaries
    import math
    
    def cosine_similarity(v1, v2):
        if not v1 or not v2: return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        n1 = math.sqrt(sum(a * a for a in v1))
        n2 = math.sqrt(sum(b * b for b in v2))
        return dot / (n1 * n2) if n1 and n2 else 0.0

    system_memory = ""
    query_vector = AIService.generate_embedding(
        request_body.message, 
        provider=ai_params.get("provider", "openai"),
        api_key=ai_params.get("api_key")
    )
    print(f"[RAG] Embedding generated: {bool(query_vector)} | Vector length: {len(query_vector) if query_vector else 0}")
    
    if query_vector:
        # Fetch chunks depending on scope
        if request_body.scope == "all":
            if current_user:
                chunks = db.query(models.SourceChunk)\
                    .join(models.Source, models.SourceChunk.source_id == models.Source.id)\
                    .join(models.Project, models.Source.project_id == models.Project.id)\
                    .filter(models.Project.owner_id == current_user.id).all()
            elif source:
                chunks = db.query(models.SourceChunk).filter(
                    models.SourceChunk.project_id == source.project_id
                ).all()
            else:
                chunks = []
        else:
            # scope == "source" — requires a valid source
            if source:
                chunks = db.query(models.SourceChunk).filter(
                    models.SourceChunk.source_id == source.id
                ).all()
            else:
                chunks = []
            
        print(f"RAG: Found {len(chunks)} possible chunks for scope '{request_body.scope}'")
        
        # Rank by cosine similarity
        scored_chunks = []
        for c in chunks:
            if c.embedding:
                score = cosine_similarity(query_vector, c.embedding)
                scored_chunks.append((score, c))
                
        # Get Top 7 chunks
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_chunks = [c for score, c in scored_chunks[:7]]
        
        chunk_metadata = []
        system_memory = "Relevant Context Fragments:\n\n"
        for idx, chunk in enumerate(top_chunks):
            # Label by ID for citation
            chunk_id = idx + 1
            system_memory += f"[ID: {chunk_id} | Source: {chunk.source.title}]\n{chunk.content_text}\n\n"
            chunk_metadata.append({
                "id": chunk_id,
                "source_id": chunk.source_id,
                "source_title": chunk.source.title,
                "content_text": chunk.content_text
            })
    else:
        chunk_metadata = []
            
    if not system_memory:
        # Fallback to whole document(s) if no chunks
        if request_body.scope == "all":
            if current_user:
                all_sources = db.query(models.Source)\
                    .join(models.Project, models.Source.project_id == models.Project.id)\
                    .filter(models.Project.owner_id == current_user.id).all()
            elif source:
                all_sources = db.query(models.Source).filter(
                    models.Source.project_id == source.project_id
                ).all()
            else:
                all_sources = []
            for idx, s in enumerate(all_sources):
                if s.content_text:
                    system_memory += f"[ID: {idx+1} | Source: {s.title}]\n{s.content_text}\n\n"
            system_memory = system_memory[:50000]
        elif source:
            system_memory = f"[ID: 1 | Source: {source.title}]\n{source.content_text[:30000]}"
        else:
            system_memory = "No documents found. Please upload some content first."

    # Add instruction that they must use the context and CITE IT
    rag_context = f"{system_memory}\n\n" + \
        "STRICT INSTRUCTIONS:\n" + \
        "1. Answer based ONLY on the provided Context Fragments above.\n" + \
        "2. You MUST cite your sources using markers like [1], [2], etc., corresponding to the fragment IDs.\n" + \
        "3. If a claim comes from multiple sources, use multiple markers like [1][2].\n" + \
        "4. If the answer is not in the context, say you don't know based on these documents.\n" + \
        "5. Keep citations at the end of sentences for better flow."

    result = AIService.chat_with_context(request_body.message, rag_context, **ai_params)

    if result is None:
        raise HTTPException(status_code=500, detail="AI service error")

    provider_type, response_stream = result
    full_response = []

    async def iter_stream():
        try:
            # Prepend metadata for citation scrolling
            if chunk_metadata:
                import json
                yield f"__METADATA__:{json.dumps(chunk_metadata)}__END_METADATA__"

            if provider_type == "openai":
                for chunk in response_stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response.append(content)
                        yield content

            elif provider_type == "anthropic":
                with response_stream as stream:
                    for text in stream.text_stream:
                        full_response.append(text)
                        yield text

            elif provider_type == "google":
                for chunk in response_stream:
                    if chunk.text:
                        full_response.append(chunk.text)
                        yield chunk.text
        finally:
            # Save assistant message after streaming completes
            from database import SessionLocal
            new_db = SessionLocal()
            try:
                assistant_message = models.ChatMessage(
                    source_id=request_body.source_id,
                    user_id=current_user.id if current_user else None,
                    role="assistant",
                    content=''.join(full_response),
                )
                new_db.add(assistant_message)
                new_db.commit()
            finally:
                new_db.close()

    return StreamingResponse(iter_stream(), media_type="text/plain")

@router.get("/chat/history/{source_id}")
async def get_chat_history(source_id: str, db: Session = Depends(get_db)):
    """Retrieve chat history for a source"""
    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.source_id == source_id
    ).order_by(models.ChatMessage.created_at).all()
    
    return [
        {
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None
        } for msg in messages
    ]


@router.get("/chat/history-global")
async def get_global_chat_history(db: Session = Depends(get_db), current_user: Optional[models.User] = Depends(get_optional_user)):
    """Retrieve global chat history (messages with no source_id)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required for global chat history")
        
    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.source_id == None,
        models.ChatMessage.user_id == current_user.id
    ).order_by(models.ChatMessage.created_at).all()
    
    return [
        {
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None
        } for msg in messages
    ]


@router.post("/summarize/{source_id}")
async def summarize(source_id: str, request: Request, style: str = "article", force: bool = False, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    if source.summary and not force:
        return {"summary": source.summary, "cached": True}

    ai_params = _get_ai_params(request, "summary")
    summary = AIService.generate_summary(source.content_text, style, **ai_params)
    
    source.summary = summary
    db.commit()
    
    artifact = models.Artifact(
        project_id=source.project_id,
        source_id=source.id,
        type="summary",
        title=f"{style.capitalize()} Summary",
        content={"text": summary}
    )
    db.add(artifact)
    db.commit()
    
    return {"summary": summary, "artifact_id": artifact.id, "cached": False}


@router.post("/quiz/{source_id}")
async def generate_quiz(source_id: str, request: Request, force: bool = False, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    ai_params = _get_ai_params(request, "quiz")
    quiz_json_str = AIService.generate_quiz(source.content_text, **ai_params)
    
    try:
        quiz_data = json.loads(quiz_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    artifact = models.Artifact(
        project_id=source.project_id,
        source_id=source.id,
        type="quiz",
        title=f"Quiz for {source.title}",
        content=quiz_data
    )
    db.add(artifact)
    db.commit()
    
    return quiz_data


@router.get("/quiz/{source_id}")
async def get_quiz(source_id: str, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    artifact = db.query(models.Artifact).filter(
        models.Artifact.project_id == source.project_id,
        models.Artifact.type == "quiz"
    ).order_by(models.Artifact.created_at.desc()).first()
    
    if not artifact:
        return {"questions": []}
    
    return artifact.content


@router.post("/flashcards/{source_id}")
async def generate_flashcards(source_id: str, request: Request, force: bool = False, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    if not force:
        existing_artifact = db.query(models.Artifact).filter(
            models.Artifact.source_id == source_id,
            models.Artifact.type == "flashcard"
        ).order_by(models.Artifact.created_at.desc()).first()
        
        if existing_artifact:
            return existing_artifact.content

    ai_params = _get_ai_params(request, "flashcard")
    flashcards_json_str = AIService.generate_flashcards(source.content_text, **ai_params)
    
    try:
        flashcards_data = json.loads(flashcards_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    artifact = models.Artifact(
        project_id=source.project_id,
        source_id=source.id,
        type="flashcard",
        title=f"Flashcards for {source.title}",
        content=flashcards_data
    )
    db.add(artifact)
    db.commit()
    
    return flashcards_data


@router.get("/flashcards/{source_id}")
async def get_flashcards(source_id: str, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    artifact = db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id,
        models.Artifact.type == "flashcard"
    ).order_by(models.Artifact.created_at.desc()).first()
    
    if not artifact:
        return {"flashcards": []}
    
    return artifact.content


@router.post("/social-media/{source_id}")
async def generate_social_media(source_id: str, request: Request, platform: str = "twitter", db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    ai_params = _get_ai_params(request, "social")
    social_json_str = AIService.generate_social_media(source.content_text, platform, **ai_params)
    
    try:
        social_data = json.loads(social_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    artifact = models.Artifact(
        project_id=source.project_id,
        source_id=source.id,
        type="social_media",
        title=f"{platform.capitalize()} Post for {source.title}",
        content=social_data
    )
    db.add(artifact)
    db.commit()
    
    return social_data


@router.get("/social-media/{source_id}")
async def get_social_media(source_id: str, platform: str = "twitter", db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    artifact = db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id,
        models.Artifact.type == "social_media",
        models.Artifact.title.like(f"{platform.capitalize()}%")
    ).order_by(models.Artifact.created_at.desc()).first()
    
    if not artifact:
        return {"post": "", "hashtags": [], "hook": ""}
    
    return artifact.content


@router.post("/diagram/{source_id}")
async def generate_diagram(source_id: str, request: Request, concept: str = "", db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    ai_params = _get_ai_params(request, "diagram")
    diagram_json_str = AIService.generate_diagram(source.content_text, concept, **ai_params)
    
    try:
        diagram_data = json.loads(diagram_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    artifact = models.Artifact(
        project_id=source.project_id,
        source_id=source.id,
        type="diagram",
        title=f"Diagram for {source.title}",
        content=diagram_data
    )
    db.add(artifact)
    db.commit()
    
    return diagram_data


@router.get("/diagram/{source_id}")
async def get_diagram(source_id: str, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    artifact = db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id,
        models.Artifact.type == "diagram"
    ).order_by(models.Artifact.created_at.desc()).first()
    
    if not artifact:
        return {"diagram": "", "type": "ascii", "title": "", "description": ""}
    
    return artifact.content


@router.post("/article/{source_id}")
async def generate_article(source_id: str, request: Request, style: str = "blog", db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    ai_params = _get_ai_params(request, "article")
    article_json_str = AIService.generate_article(source.content_text, style, **ai_params)
    
    try:
        article_data = json.loads(article_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    artifact = models.Artifact(
        project_id=source.project_id,
        source_id=source.id,
        type="article",
        title=f"{style.capitalize()} Article: {article_data.get('title', source.title)}",
        content=article_data
    )
    db.add(artifact)
    db.commit()
    
    return article_data


@router.get("/article/{source_id}")
async def get_article(source_id: str, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    artifact = db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id,
        models.Artifact.type == "article"
    ).order_by(models.Artifact.created_at.desc()).first()
    
    if not artifact:
        return {"title": "", "content": "", "excerpt": "", "readTime": 0}
    
    return artifact.content


class ArticleUpdate(BaseModel):
    content: str


@router.put("/article/{source_id}")
async def update_article(source_id: str, update: ArticleUpdate, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    latest_artifact = db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id,
        models.Artifact.type == "article"
    ).order_by(models.Artifact.created_at.desc()).first()
    
    article_data = {
        "title": f"Article for {source.title}",
        "content": update.content,
        "excerpt": "",
        "readTime": 0
    }
    
    if latest_artifact and isinstance(latest_artifact.content, dict):
        article_data = latest_artifact.content.copy()
        article_data["content"] = update.content
        
    artifact = models.Artifact(
        project_id=source.project_id,
        source_id=source.id,
        type="article",
        title=article_data.get("title", f"Article for {source.title}"),
        content=article_data
    )
    db.add(artifact)
    db.commit()
    
    return article_data


@router.get("/debug/{source_id}")
async def debug_artifacts(source_id: str, db: Session = Depends(get_db)):
    def check_playwright():
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                return "Installed (API loadable, Check Passed)"
        except ImportError:
            return "ImportError (Package missing)"
        except Exception as e:
            return f"Error: {str(e)}"

    import asyncio
    playwright_status = await asyncio.to_thread(check_playwright)

    artifacts = db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id
    ).all()
    
    return {
        "scraper_env": {
            "playwright": playwright_status
        },
        "count": len(artifacts),
        "artifacts": [
            {
                "id": a.id,
                "type": a.type,
                "created_at": a.created_at,
                "has_content": bool(a.content),
                "title": a.title
            } for a in artifacts
        ]
    }


@router.post("/podcast/{source_id}")
async def generate_podcast(source_id: str, request: Request, background_tasks: BackgroundTasks, force: bool = False, db: Session = Depends(get_db)):
    """
    Generate a 2-host podcast audio overview for a specific source.
    1. Generate script via AI.
    2. Save as artifact with status 'processing'.
    3. Start background task for TTS audio generation.
    """
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    # Check for existing processing/ready podcast
    existing = db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id,
        models.Artifact.type == "podcast"
    ).order_by(models.Artifact.created_at.desc()).first()
    
    if not force and existing and existing.content.get("status") in ["processing", "ready"]:
        return existing

    ai_params = _get_ai_params(request, "podcast")
    
    # Generate the script first (Blocking, but usually < 10s)
    script_json = AIService.generate_podcast_script(source.content_text, **ai_params)
    try:
        script_data = json.loads(script_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate podcast script: {e}")

    # Create artifact in 'processing' state
    artifact = models.Artifact(
        project_id=source.project_id,
        source_id=source.id,
        type="podcast",
        title=f"Podcast: {script_data.get('title', 'Audio Overview')}",
        content={
            "status": "processing",
            "title": script_data.get("title", f"Podcast Overview: {source.title}"),
            "segments": script_data.get("segments", []),
            "audio_url": None
        }
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)

    # Trigger TTS in background (uses OpenAI Key from headers)
    background_tasks.add_task(
        background_generate_podcast_audio,
        artifact_id=artifact.id,
        script_data=script_data,
        api_key=ai_params.get("api_key")
    )

    return artifact


@router.get("/podcast/{source_id}/status")
async def get_podcast_status(source_id: str, db: Session = Depends(get_db)):
    """Check the status of the latest podcast artifact"""
    artifact = db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id,
        models.Artifact.type == "podcast"
    ).order_by(models.Artifact.created_at.desc()).first()
    
    if not artifact:
        return {"status": "not_found"}
    
    return {
        "id": artifact.id,
        "title": artifact.title,
        "status": artifact.content.get("status"),
        "audio_url": artifact.content.get("audio_url"),
        "segments": artifact.content.get("segments")
    }

