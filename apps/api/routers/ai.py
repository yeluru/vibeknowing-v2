from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
from services.ai import AIService
from dependencies import get_optional_user, get_current_user
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



def _tutorial_scope(content_len: int, source_count: int = 1) -> tuple[int, int]:
    """
    Return (num_modules, chapters_per_module) scaled to content volume.
    Single source: driven by content length.
    Multi-source:  driven by source count, with content length as a floor.
    """
    # effective "depth units": each source roughly adds 2000 chars of unique substance
    depth = max(content_len, source_count * 2000)

    if depth < 3000:
        return 2, 2          # 4 chapters total  — shallow single page
    elif depth < 6000:
        return 2, 3          # 6 chapters total  — one short source
    elif depth < 10000:
        return 3, 2          # 6 chapters total  — medium source / 2-3 sources
    elif depth < 18000:
        return 3, 3          # 9 chapters total  — long source / 4-5 sources
    elif depth < 30000:
        return 4, 3          # 12 chapters total — 6-8 sources
    else:
        return 5, 3          # 15 chapters total — very large corpus


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
    category_id: Optional[str] = None
    message: str
    scope: str = "source" # "source", "category", or "all"


@router.post("/chat")
async def chat(request_body: ChatRequest, request: Request, db: Session = Depends(get_db), current_user: Optional[models.User] = Depends(get_optional_user)):
    source = None
    if request_body.source_id:
        source = db.query(models.Source).filter(models.Source.id == request_body.source_id).first()
        if not source or not source.content_text:
            raise HTTPException(status_code=404, detail="Source content not found")

    # Determine scope based on inputs
    if request_body.category_id:
        request_body.scope = "category"
    elif not request_body.source_id:
        request_body.scope = "all"

    # Save user message (source_id and category_id can be NULL for global chat)
    user_message = models.ChatMessage(
        source_id=request_body.source_id,
        category_id=request_body.category_id,
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
            else:
                chunks = []
        elif request_body.scope == "category" and request_body.category_id:
            # Filter by Learning Path (Category)
            chunks = db.query(models.SourceChunk)\
                .join(models.Source, models.SourceChunk.source_id == models.Source.id)\
                .join(models.Project, models.Source.project_id == models.Project.id)\
                .filter(models.Project.category_id == request_body.category_id).all()
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
            asst_msg = models.ChatMessage(
                source_id=request_body.source_id,
                category_id=request_body.category_id,
                user_id=current_user.id if current_user else None,
                role="assistant",
                content="".join(full_response)
            )
            new_db.add(asst_msg)
            new_db.commit()
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
    """Retrieve global chat history (messages with no source_id and no category_id)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required for global chat history")
        
    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.source_id == None,
        models.ChatMessage.category_id == None,
        models.ChatMessage.user_id == current_user.id
    ).order_by(models.ChatMessage.created_at).all()
    
    return [
        {
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None
        } for msg in messages
    ]


@router.get("/chat/history-path/{category_id}")
async def get_category_chat_history(category_id: str, db: Session = Depends(get_db), current_user: Optional[models.User] = Depends(get_optional_user)):
    """Retrieve chat history for a specific Learning Path"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required for path chat history")
        
    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.category_id == category_id,
        models.ChatMessage.user_id == current_user.id
    ).order_by(models.ChatMessage.created_at).all()
    
    return [
        {
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None
        } for msg in messages
    ]


@router.post("/tutorial/{source_id}")
async def generate_tutorial(
    source_id: str,
    request: Request,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user),
):
    """Generate a structured JSON tutorial for a source, cached as an Artifact."""
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    # Return cached artifact unless force=true
    if not force:
        existing = (
            db.query(models.Artifact)
            .filter(
                models.Artifact.source_id == source_id,
                models.Artifact.type == "tutorial",
            )
            .first()
        )
        if existing and existing.content:
            return existing.content

    ai_params = _get_ai_params(request, "tutorial")

    title   = (source.title or "Untitled")
    content = (source.content_text or "")[:12000]
    summary = (source.summary or "")[:2000]

    # Pre-compute optional summary line (no backslash inside f-string on Python ≤ 3.11)
    summary_block = ("Summary:\n" + summary + "\n") if summary else ""

    # ── PASS 1: Generate outline ──────────────────────────────────────────
    num_modules, chapters_per_module = _tutorial_scope(len(content))
    outline_prompt = f"""You are building a tutorial outline. Return ONLY valid JSON, no markdown.

Topic: "{title}"
{summary_block}
Source material (first 8000 chars):
{content[:8000]}

Generate a tutorial outline with this structure (use EXACTLY {num_modules} modules, each with EXACTLY {chapters_per_module} chapter titles):
{{
  "title": "Clear descriptive title for this tutorial",
  "topicType": "Technical",
  "theme": "AI-Native",
  "centralMentalModel": {{
    "name": "The 4-6 word unifying concept",
    "tagline": "One sentence framing the whole topic",
    "description": "3-4 sentences: what the mental model is, why it fits, what it unlocks"
  }},
  "modules": [
    {{
      "id": "m1",
      "title": "Module title",
      "emoji": "🧠",
      "description": "2-3 sentences on what this module covers",
      "chapterTitles": {json.dumps([f"Chapter {i+1} title" for i in range(chapters_per_module)])},
      "keyTerms": ["exact term from source", "exact term from source", "exact term from source"]
    }}
    ... repeat for all {num_modules} modules with ids m1 through m{num_modules}
  ]
}}

Rules:
- topicType: one of Technical, Mathematical, Scientific, Philosophical, Historical, Creative
- theme: one of AI-Native, Science, Philosophy, Math, History, General
- Output EXACTLY {num_modules} modules (no more, no fewer)
- Each module must have EXACTLY {chapters_per_module} chapter titles (no more, no fewer)
- keyTerms: 3 exact technical terms, APIs, functions, or named concepts ACTUALLY PRESENT in the source — not generic words
- Use real terminology from the source material, not invented terms
- Return ONLY the JSON object
"""
    try:
        outline_raw = AIService.generate_json(outline_prompt, max_tokens=3500, temperature=0.3, **ai_params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Outline generation failed: {e}")

    try:
        outline_cleaned = outline_raw.strip()
        if outline_cleaned.startswith("```"):
            lines = outline_cleaned.split("\n")
            outline_cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        outline = json.loads(outline_cleaned)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse outline JSON: {e}")

    topic_type = outline.get("topicType", "Technical")
    code_note = "tutorialStep.code: Required — real, runnable, commented code or precise formula." if topic_type in ("Technical", "Mathematical") else "tutorialStep.code: Include if relevant to this topic."

    # ── PASS 2: Generate each chapter's content individually ─────────────
    filled_modules = []
    chapter_system_prompt = (
        "You are a world-class technical author writing for senior practitioners. "
        "Every sentence must add information the reader could not infer themselves. "
        "Write with the density and specificity of an O'Reilly book chapter, not a blog summary. "
        "Ground every claim in the source material provided. Return only valid JSON."
    )

    for mod in outline.get("modules", []):
        filled_chapters = []
        key_terms = mod.get("keyTerms", [])
        key_terms_hint = (f"\nKey terms from source to address in this module: {', '.join(key_terms)}" if key_terms else "")
        for ci, chapter_title in enumerate(mod.get("chapterTitles", [])):
            chapter_id = f"{mod['id']}c{ci + 1}"
            chapter_prompt = f"""You are writing one chapter of a premium tutorial. Return ONLY valid JSON, no markdown.

Topic: "{title}"
Module: "{mod['title']}"
Chapter: "{chapter_title}"{key_terms_hint}

Full source material (use specific details, APIs, examples, and terminology from this):
{content}

Write the complete chapter content as this exact JSON:
{{
  "id": "{chapter_id}",
  "title": "{chapter_title}",
  "duration": "12 min",
  "concepts": [
    {{
      "name": "exact technical term PRESENT IN THE SOURCE ABOVE",
      "explanation": "WRITE AT LEAST 120 WORDS HERE. Explain: (1) the internal mechanism — how it actually works step by step, (2) why this concept exists — what problem it uniquely solves, (3) an analogy to something the learner already knows, (4) the real-world implications — what this makes possible. Do NOT just define the word. Do NOT write a generic introduction.",
      "example": "WRITE AT LEAST 70 WORDS HERE. Give a specific, concrete scenario using actual names, numbers, API calls, or code snippets FROM THE SOURCE MATERIAL above. Show clear cause and effect. No filler text like 'for example, imagine a scenario where'."
    }},
    {{"name": "second term from source", "explanation": "120+ words — mechanism, problem solved, analogy, implications", "example": "70+ words — concrete scenario with specifics from source"}},
    {{"name": "third term from source", "explanation": "120+ words", "example": "70+ words"}},
    {{"name": "fourth term from source", "explanation": "120+ words", "example": "70+ words"}}
  ],
  "tutorialSteps": [
    {{
      "step": 1,
      "title": "Action-oriented step title (verb first)",
      "body": "WRITE AT LEAST 140 WORDS HERE. Cover: (1) exactly what you are doing at this step and the precise reason why this order matters, (2) the internal mechanism that makes this step work — not just what to type, but why it works, (3) what you should observe or measure to confirm the step succeeded, (4) specific early warning signs that something went wrong here — error messages, unexpected output, or silent failures.",
      "code": "WRITE REAL, RUNNABLE CODE HERE — multi-line, with inline comments on each non-obvious line. Include imports and context. No placeholders like 'your_value_here' without explanation."
    }},
    {{"step": 2, "title": "Step 2 action title", "body": "140+ words covering what/why/mechanism/how-to-verify/warning-signs", "code": "real runnable code with comments"}},
    {{"step": 3, "title": "Step 3 action title", "body": "140+ words", "code": "real runnable code with comments"}}
  ],
  "workedExample": {{
    "title": "Specific descriptive title for this worked example",
    "problem": "WRITE AT LEAST 80 WORDS HERE. A self-contained problem the learner should genuinely attempt before reading the solution. Include all context, constraints, starting values, and any relevant numbers or parameters drawn from the source material.",
    "solution": "WRITE AT LEAST 250 WORDS HERE. Walk through every step labeled Step 1:, Step 2:, etc. Show all intermediate values and every decision point. Explain why you made each choice over the alternatives. Nothing skipped — treat the reader as someone genuinely stuck who needs to understand not just the answer but the reasoning.",
    "verify": "WRITE AT LEAST 60 WORDS HERE. Give 2-3 specific, checkable verification steps with expected outputs or invariants. Not 'check your work' — give the exact command to run, output to expect, or invariant to assert."
  }},
  "pitfalls": [
    {{
      "name": "A memorable, specific name for this pitfall (e.g. 'The Silent Cache Staleness Trap')",
      "description": "WRITE AT LEAST 110 WORDS HERE. Tell the full story: what the learner tried to do (it seemed reasonable), the exact moment things went wrong, why it looked correct at first glance, and what the failure looks like in practice — exact error message, wrong output value, or silent bug that surfaces later.",
      "fix": "WRITE AT LEAST 90 WORDS HERE. Give the step-by-step correction with specific code or configuration changes. Explain why the fix works mechanically. Show how to verify the fix worked — the exact check or output that confirms it."
    }},
    {{
      "name": "A second, distinct memorable pitfall name",
      "description": "WRITE AT LEAST 110 WORDS HERE. A different failure mode — full story as above.",
      "fix": "WRITE AT LEAST 90 WORDS HERE. Step-by-step correction with verification."
    }}
  ],
  "proTip": {{
    "title": "Expert insight title — specific, not generic",
    "insight": "WRITE AT LEAST 160 WORDS HERE. This must be genuine expert-level knowledge that intermediate practitioners don't know. Include: (1) a counterintuitive observation or non-obvious behavior that surprises people who think they understand this, (2) the deeper mental model or abstraction that experts hold that makes everything click, (3) a specific, costly failure mode or performance trap this insight prevents — describe a real scenario where missing this insight caused a serious problem, (4) how this connects to the broader landscape of the field or unlocks adjacent capabilities."
  }}
}}

{code_note}
- Use exactly 4 concepts and 3 tutorialSteps in the arrays
- Every string value MUST meet the minimum word count — violating this is a failure
- Concept names and examples MUST reference actual terminology, APIs, or patterns from the source above
- Return ONLY the JSON object for this chapter — no preamble, no explanation
"""
            try:
                chapter_raw = AIService.generate_json(chapter_prompt, max_tokens=5000, temperature=0.4, system_prompt=chapter_system_prompt, **ai_params)
                chapter_cleaned = chapter_raw.strip()
                if chapter_cleaned.startswith("```"):
                    lines = chapter_cleaned.split("\n")
                    chapter_cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
                chapter_data = json.loads(chapter_cleaned)
                filled_chapters.append(chapter_data)
            except Exception as e:
                print(f"[Tutorial] Chapter {chapter_id} generation failed: {e}")
                # Insert a placeholder so the tutorial still loads
                filled_chapters.append({
                    "id": chapter_id,
                    "title": chapter_title,
                    "duration": "10 min",
                    "concepts": [],
                    "tutorialSteps": [],
                    "workedExample": {"title": "", "problem": "", "solution": "", "verify": ""},
                    "pitfalls": [],
                    "proTip": {"title": "", "insight": ""},
                })

        filled_modules.append({
            "id": mod["id"],
            "title": mod["title"],
            "emoji": mod.get("emoji", "📖"),
            "description": mod.get("description", ""),
            "chapters": filled_chapters,
        })

    total_chapters = sum(len(m["chapters"]) for m in filled_modules)
    total_concepts = sum(len(c.get("concepts", [])) for m in filled_modules for c in m["chapters"])

    tutorial_data = {
        "title": outline.get("title", title),
        "topicType": outline.get("topicType", "Technical"),
        "theme": outline.get("theme", "General"),
        "centralMentalModel": outline.get("centralMentalModel", {
            "name": title, "tagline": "", "description": ""
        }),
        "stats": {
            "modules": len(filled_modules),
            "chapters": total_chapters,
            "concepts": total_concepts,
            "estimatedMinutes": total_chapters * 12,
        },
        "modules": filled_modules,
    }

    # Cache as an Artifact
    existing = (
        db.query(models.Artifact)
        .filter(
            models.Artifact.source_id == source_id,
            models.Artifact.type == "tutorial",
        )
        .first()
    )
    if existing:
        existing.content = tutorial_data
    else:
        new_artifact = models.Artifact(
            project_id=source.project_id,
            source_id=source_id,
            type="tutorial",
            title=f"Tutorial: {title}",
            content=tutorial_data,
        )
        db.add(new_artifact)
    try:
        db.commit()
    except Exception:
        db.rollback()

    return tutorial_data


@router.get("/tutorial/project/{project_id}")
async def get_project_tutorial(
    project_id: str,
    db: Session = Depends(get_db),
):
    """Return cached path-level tutorial for a project, or null if not yet generated."""
    existing = (
        db.query(models.Artifact)
        .filter(
            models.Artifact.project_id == project_id,
            models.Artifact.source_id == None,
            models.Artifact.type == "tutorial",
        )
        .first()
    )
    if existing and existing.content:
        return existing.content
    return None


@router.post("/tutorial/project/{project_id}")
async def generate_project_tutorial(
    project_id: str,
    request: Request,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user),
):
    """Generate a path-level tutorial that synthesises ALL ingested sources in a project."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Collect ingested sources (those with extracted text)
    ingested = [s for s in project.sources if s.content_text and s.content_text.strip()]
    if not ingested:
        raise HTTPException(
            status_code=400,
            detail="No ingested content yet. Add and process at least one URL first."
        )

    # Return cached artifact unless force=true
    if not force:
        existing = (
            db.query(models.Artifact)
            .filter(
                models.Artifact.project_id == project_id,
                models.Artifact.source_id == None,
                models.Artifact.type == "tutorial",
            )
            .first()
        )
        if existing and existing.content:
            return existing.content

    ai_params = _get_ai_params(request, "tutorial")

    path_title = project.title or "Learning Path"

    # Build a combined content block — each source gets a labelled section
    # Cap total at 16 000 chars spread proportionally across sources
    PER_SOURCE_CAP = max(2000, 16000 // len(ingested))
    content_parts = []
    for s in ingested:
        snippet = (s.content_text or "").strip()[:PER_SOURCE_CAP]
        label = (s.title or s.url or "Source").strip()
        content_parts.append(f"=== SOURCE: {label} ===\n{snippet}")
    combined_content = "\n\n".join(content_parts)

    # Summaries block (if any)
    summary_parts = [
        f"- {(s.title or 'Source').strip()}: {(s.summary or '').strip()[:400]}"
        for s in ingested if s.summary
    ]
    summary_block = ("Source summaries:\n" + "\n".join(summary_parts) + "\n") if summary_parts else ""

    # ── PASS 1: Outline ──────────────────────────────────────────────────
    num_modules, chapters_per_module = _tutorial_scope(len(combined_content), len(ingested))
    outline_prompt = f"""You are building a tutorial outline. Return ONLY valid JSON, no markdown.

Learning Path: "{path_title}"
Number of sources: {len(ingested)}
{summary_block}
Combined source material (first 12000 chars):
{combined_content[:12000]}

Generate a tutorial outline that synthesises ALL sources into a coherent learning journey (use EXACTLY {num_modules} modules, each with EXACTLY {chapters_per_module} chapter titles):
{{
  "title": "Clear descriptive title for this path-level tutorial",
  "topicType": "Technical",
  "theme": "AI-Native",
  "centralMentalModel": {{
    "name": "The 4-6 word unifying concept across all sources",
    "tagline": "One sentence framing the whole learning path",
    "description": "3-4 sentences: what the mental model is, why it fits, what it unlocks"
  }},
  "modules": [
    {{"id": "m1", "title": "Module title", "emoji": "🧠", "description": "2-3 sentences", "chapterTitles": {json.dumps([f"Chapter {i+1} title" for i in range(chapters_per_module)])}, "keyTerms": ["exact term from sources", "exact term from sources", "exact term from sources"]}}
    ... repeat for all {num_modules} modules with ids m1 through m{num_modules}
  ]
}}

Rules:
- topicType: one of Technical, Mathematical, Scientific, Philosophical, Historical, Creative
- theme: one of AI-Native, Science, Philosophy, Math, History, General
- Output EXACTLY {num_modules} modules (no more, no fewer)
- Each module must have EXACTLY {chapters_per_module} chapter titles (no more, no fewer)
- keyTerms: 3 exact technical terms, APIs, functions, or named concepts ACTUALLY PRESENT in the sources above — not generic words
- Draw on the real concepts and terminology across ALL sources
- Return ONLY the JSON object
"""
    try:
        outline_raw = AIService.generate_json(outline_prompt, max_tokens=3500, temperature=0.3, **ai_params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Outline generation failed: {e}")

    try:
        outline_cleaned = outline_raw.strip()
        if outline_cleaned.startswith("```"):
            lines = outline_cleaned.split("\n")
            outline_cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        outline = json.loads(outline_cleaned)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse outline JSON: {e}")

    topic_type = outline.get("topicType", "Technical")
    code_note = (
        "tutorialStep.code: Required — real, runnable, commented code or precise formula."
        if topic_type in ("Technical", "Mathematical")
        else "tutorialStep.code: Include if relevant to this topic."
    )

    # ── PASS 2: Per-chapter content ──────────────────────────────────────
    proj_chapter_system_prompt = (
        "You are a world-class technical author writing for senior practitioners. "
        "Every sentence must add information the reader could not infer themselves. "
        "Write with the density and specificity of an O'Reilly book chapter, not a blog summary. "
        "Ground every claim in the source material provided. Return only valid JSON."
    )

    filled_modules = []
    for mod in outline.get("modules", []):
        filled_chapters = []
        key_terms = mod.get("keyTerms", [])
        key_terms_hint = (f"\nKey terms from sources to address in this module: {', '.join(key_terms)}" if key_terms else "")
        for ci, chapter_title in enumerate(mod.get("chapterTitles", [])):
            chapter_id = f"{mod['id']}c{ci + 1}"
            chapter_prompt = f"""You are writing one chapter of a premium tutorial. Return ONLY valid JSON, no markdown.

Learning Path: "{path_title}"
Module: "{mod['title']}"
Chapter: "{chapter_title}"{key_terms_hint}

All source material for this learning path (use specific details, APIs, examples, and terminology from these):
{combined_content}

Write the complete chapter content as this exact JSON:
{{
  "id": "{chapter_id}",
  "title": "{chapter_title}",
  "duration": "12 min",
  "concepts": [
    {{
      "name": "exact technical term PRESENT IN THE SOURCES ABOVE",
      "explanation": "WRITE AT LEAST 120 WORDS HERE. Explain: (1) the internal mechanism — how it actually works step by step, (2) why this concept exists — what problem it uniquely solves, (3) an analogy to something the learner already knows, (4) the real-world implications — what this makes possible. Do NOT just define the word. Do NOT write a generic introduction.",
      "example": "WRITE AT LEAST 70 WORDS HERE. Give a specific, concrete scenario using actual names, numbers, API calls, or code snippets FROM THE SOURCES above. Show clear cause and effect. No filler text."
    }},
    {{"name": "second term from sources", "explanation": "120+ words — mechanism, problem solved, analogy, implications", "example": "70+ words — concrete scenario with specifics from sources"}},
    {{"name": "third term from sources", "explanation": "120+ words", "example": "70+ words"}},
    {{"name": "fourth term from sources", "explanation": "120+ words", "example": "70+ words"}}
  ],
  "tutorialSteps": [
    {{
      "step": 1,
      "title": "Action-oriented step title (verb first)",
      "body": "WRITE AT LEAST 140 WORDS HERE. Cover: (1) exactly what you are doing at this step and the precise reason why this order matters, (2) the internal mechanism that makes this step work, (3) what you should observe or measure to confirm success, (4) specific early warning signs that something went wrong here.",
      "code": "WRITE REAL, RUNNABLE CODE HERE — multi-line, with inline comments on each non-obvious line. No placeholders."
    }},
    {{"step": 2, "title": "Step 2 action title", "body": "140+ words covering what/why/mechanism/verification/warnings", "code": "real runnable code with comments"}},
    {{"step": 3, "title": "Step 3 action title", "body": "140+ words", "code": "real runnable code with comments"}}
  ],
  "workedExample": {{
    "title": "Specific descriptive title for this worked example",
    "problem": "WRITE AT LEAST 80 WORDS HERE. A self-contained problem the learner should genuinely attempt. Include all context, constraints, starting values, and relevant parameters from the sources.",
    "solution": "WRITE AT LEAST 250 WORDS HERE. Walk through every step labeled Step 1:, Step 2:, etc. Show all intermediate values and every decision. Explain why you made each choice over the alternatives.",
    "verify": "WRITE AT LEAST 60 WORDS HERE. Give 2-3 specific, checkable verification steps with expected outputs or invariants — not just 'check your work'."
  }},
  "pitfalls": [
    {{
      "name": "A memorable, specific name for this pitfall (e.g. 'The Index Rebuild Trap')",
      "description": "WRITE AT LEAST 110 WORDS HERE. Tell the full story: what the learner tried to do, the exact moment things went wrong, why it looked correct at first, what the failure looks like in practice.",
      "fix": "WRITE AT LEAST 90 WORDS HERE. Give the step-by-step correction with specific code or configuration changes, and explain how to verify the fix worked."
    }},
    {{
      "name": "A second distinct memorable pitfall name",
      "description": "WRITE AT LEAST 110 WORDS HERE. Different failure mode — full story as above.",
      "fix": "WRITE AT LEAST 90 WORDS HERE. Step-by-step correction with verification."
    }}
  ],
  "proTip": {{
    "title": "Expert insight title — specific, not generic",
    "insight": "WRITE AT LEAST 160 WORDS HERE. Genuine expert-level knowledge intermediate practitioners don't know. Include: (1) a counterintuitive observation that surprises people who think they understand this, (2) the deeper mental model experts hold that makes everything click, (3) a specific costly failure mode or performance trap this insight prevents, (4) how this connects to the broader landscape of the field."
  }}
}}

{code_note}
- Use exactly 4 concepts and 3 tutorialSteps in the arrays
- Every string value MUST meet the minimum word count — violating this is a failure
- Concept names and examples MUST reference actual terminology, APIs, or patterns from the sources above
- Return ONLY the JSON object for this chapter — no preamble, no explanation
"""
            try:
                chapter_raw = AIService.generate_json(chapter_prompt, max_tokens=5000, temperature=0.4, system_prompt=proj_chapter_system_prompt, **ai_params)
                chapter_cleaned = chapter_raw.strip()
                if chapter_cleaned.startswith("```"):
                    lines = chapter_cleaned.split("\n")
                    chapter_cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
                chapter_data = json.loads(chapter_cleaned)
                filled_chapters.append(chapter_data)
            except Exception as e:
                print(f"[PathTutorial] Chapter {chapter_id} failed: {e}")
                filled_chapters.append({
                    "id": chapter_id,
                    "title": chapter_title,
                    "duration": "10 min",
                    "concepts": [],
                    "tutorialSteps": [],
                    "workedExample": {"title": "", "problem": "", "solution": "", "verify": ""},
                    "pitfalls": [],
                    "proTip": {"title": "", "insight": ""},
                })

        filled_modules.append({
            "id": mod["id"],
            "title": mod["title"],
            "emoji": mod.get("emoji", "📖"),
            "description": mod.get("description", ""),
            "chapters": filled_chapters,
        })

    total_chapters = sum(len(m["chapters"]) for m in filled_modules)
    total_concepts = sum(len(c.get("concepts", [])) for m in filled_modules for c in m["chapters"])

    tutorial_data = {
        "title": outline.get("title", path_title),
        "topicType": outline.get("topicType", "Technical"),
        "theme": outline.get("theme", "General"),
        "centralMentalModel": outline.get("centralMentalModel", {
            "name": path_title, "tagline": "", "description": ""
        }),
        "stats": {
            "modules": len(filled_modules),
            "chapters": total_chapters,
            "concepts": total_concepts,
            "estimatedMinutes": total_chapters * 12,
            "sourceCount": len(ingested),
        },
        "modules": filled_modules,
        "sourceCount": len(ingested),
    }

    # Cache as Artifact at project level (no source_id)
    existing = (
        db.query(models.Artifact)
        .filter(
            models.Artifact.project_id == project_id,
            models.Artifact.source_id == None,
            models.Artifact.type == "tutorial",
        )
        .first()
    )
    if existing:
        existing.content = tutorial_data
    else:
        new_artifact = models.Artifact(
            project_id=project_id,
            source_id=None,
            type="tutorial",
            title=f"Tutorial: {path_title}",
            content=tutorial_data,
        )
        db.add(new_artifact)
    try:
        db.commit()
    except Exception:
        db.rollback()

    return tutorial_data


# ── Category-level tutorial (synthesises ALL sources across ALL projects in a category) ──

@router.get("/tutorial/category/{category_id}")
async def get_category_tutorial(
    category_id: str,
    db: Session = Depends(get_db),
):
    """Return cached category-level tutorial, or null if not yet generated."""
    existing = (
        db.query(models.Artifact)
        .filter(
            models.Artifact.project_id == None,
            models.Artifact.source_id == None,
            models.Artifact.type == "tutorial",
            models.Artifact.title == f"cat:{category_id}",
        )
        .first()
    )
    if existing and existing.content:
        return existing.content
    return None


@router.post("/tutorial/category/{category_id}")
async def generate_category_tutorial(
    category_id: str,
    request: Request,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user),
):
    """Generate a category-level tutorial that synthesises ALL ingested sources across ALL projects in this category."""
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Collect all projects in this category
    cat_projects = db.query(models.Project).filter(models.Project.category_id == category_id).all()
    if not cat_projects:
        raise HTTPException(status_code=400, detail="No projects found in this category.")

    # Aggregate all ingested sources across all projects
    ingested = []
    for proj in cat_projects:
        ingested.extend([s for s in proj.sources if s.content_text and s.content_text.strip()])

    if not ingested:
        raise HTTPException(
            status_code=400,
            detail="No ingested content yet. Add and process at least one URL first."
        )

    # Return cached artifact unless force=true
    cache_title = f"cat:{category_id}"
    if not force:
        existing = (
            db.query(models.Artifact)
            .filter(
                models.Artifact.project_id == None,
                models.Artifact.source_id == None,
                models.Artifact.type == "tutorial",
                models.Artifact.title == cache_title,
            )
            .first()
        )
        if existing and existing.content:
            return existing.content

    ai_params = _get_ai_params(request, "tutorial")

    path_title = category.name or "Learning Path"

    # Build combined content block — each source gets a labelled section
    PER_SOURCE_CAP = max(2000, 16000 // len(ingested))
    content_parts = []
    for s in ingested:
        snippet = (s.content_text or "").strip()[:PER_SOURCE_CAP]
        label = (s.title or s.url or "Source").strip()
        content_parts.append(f"=== SOURCE: {label} ===\n{snippet}")
    combined_content = "\n\n".join(content_parts)

    summary_parts = [
        f"- {(s.title or 'Source').strip()}: {(s.summary or '').strip()[:400]}"
        for s in ingested if s.summary
    ]
    summary_block = ("Source summaries:\n" + "\n".join(summary_parts) + "\n") if summary_parts else ""

    # ── PASS 1: Outline ──────────────────────────────────────────────────
    num_modules, chapters_per_module = _tutorial_scope(len(combined_content), len(ingested))
    outline_prompt = f"""You are building a tutorial outline. Return ONLY valid JSON, no markdown.

Learning Path: "{path_title}"
Number of sources: {len(ingested)}
{summary_block}
Combined source material (first 12000 chars):
{combined_content[:12000]}

Generate a tutorial outline that synthesises ALL sources into a coherent learning journey (use EXACTLY {num_modules} modules, each with EXACTLY {chapters_per_module} chapter titles):
{{
  "title": "Clear descriptive title for this path-level tutorial",
  "topicType": "Technical",
  "theme": "AI-Native",
  "centralMentalModel": {{
    "name": "The 4-6 word unifying concept across all sources",
    "tagline": "One sentence framing the whole learning path",
    "description": "3-4 sentences: what the mental model is, why it fits, what it unlocks"
  }},
  "modules": [
    {{"id": "m1", "title": "Module title", "emoji": "🧠", "description": "2-3 sentences", "chapterTitles": {json.dumps([f"Chapter {i+1} title" for i in range(chapters_per_module)])}, "keyTerms": ["exact term from sources", "exact term from sources", "exact term from sources"]}}
    ... repeat for all {num_modules} modules with ids m1 through m{num_modules}
  ]
}}

Rules:
- topicType: one of Technical, Mathematical, Scientific, Philosophical, Historical, Creative
- theme: one of AI-Native, Science, Philosophy, Math, History, General
- Output EXACTLY {num_modules} modules (no more, no fewer)
- Each module must have EXACTLY {chapters_per_module} chapter titles (no more, no fewer)
- keyTerms: 3 exact technical terms, APIs, functions, or named concepts ACTUALLY PRESENT in the sources above — not generic words
- Draw on the real concepts and terminology across ALL sources
- Return ONLY the JSON object
"""
    try:
        outline_raw = AIService.generate_json(outline_prompt, max_tokens=3500, temperature=0.3, **ai_params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Outline generation failed: {e}")

    try:
        outline_cleaned = outline_raw.strip()
        if outline_cleaned.startswith("```"):
            lines = outline_cleaned.split("\n")
            outline_cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        outline = json.loads(outline_cleaned)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse outline JSON: {e}")

    topic_type = outline.get("topicType", "Technical")
    code_note = (
        "tutorialStep.code: Required — real, runnable, commented code or precise formula."
        if topic_type in ("Technical", "Mathematical")
        else "tutorialStep.code: Include if relevant to this topic."
    )

    # ── PASS 2: Per-chapter content ──────────────────────────────────────
    cat_chapter_system_prompt = (
        "You are a world-class technical author writing for senior practitioners. "
        "Every sentence must add information the reader could not infer themselves. "
        "Write with the density and specificity of an O'Reilly book chapter, not a blog summary. "
        "Ground every claim in the source material provided. Return only valid JSON."
    )

    filled_modules = []
    for mod in outline.get("modules", []):
        filled_chapters = []
        key_terms = mod.get("keyTerms", [])
        key_terms_hint = (f"\nKey terms from sources to address in this module: {', '.join(key_terms)}" if key_terms else "")
        for ci, chapter_title in enumerate(mod.get("chapterTitles", [])):
            chapter_id = f"{mod['id']}c{ci + 1}"
            chapter_prompt = f"""You are writing one chapter of a premium tutorial. Return ONLY valid JSON, no markdown.

Learning Path: "{path_title}"
Module: "{mod['title']}"
Chapter: "{chapter_title}"{key_terms_hint}

All source material for this learning path (use specific details, APIs, examples, and terminology from these):
{combined_content}

Write the complete chapter content as this exact JSON:
{{
  "id": "{chapter_id}",
  "title": "{chapter_title}",
  "duration": "12 min",
  "concepts": [
    {{
      "name": "exact technical term PRESENT IN THE SOURCES ABOVE",
      "explanation": "WRITE AT LEAST 120 WORDS HERE. Explain: (1) the internal mechanism — how it actually works step by step, (2) why this concept exists — what problem it uniquely solves, (3) an analogy to something the learner already knows, (4) the real-world implications — what this makes possible. Do NOT just define the word. Do NOT write a generic introduction.",
      "example": "WRITE AT LEAST 70 WORDS HERE. Give a specific, concrete scenario using actual names, numbers, API calls, or code snippets FROM THE SOURCES above. Show clear cause and effect. No filler text."
    }},
    {{"name": "second term from sources", "explanation": "120+ words — mechanism, problem solved, analogy, implications", "example": "70+ words — concrete scenario with specifics from sources"}},
    {{"name": "third term from sources", "explanation": "120+ words", "example": "70+ words"}},
    {{"name": "fourth term from sources", "explanation": "120+ words", "example": "70+ words"}}
  ],
  "tutorialSteps": [
    {{
      "step": 1,
      "title": "Action-oriented step title (verb first)",
      "body": "WRITE AT LEAST 140 WORDS HERE. Cover: (1) exactly what you are doing at this step and the precise reason why this order matters, (2) the internal mechanism that makes this step work, (3) what you should observe or measure to confirm success, (4) specific early warning signs that something went wrong here.",
      "code": "WRITE REAL, RUNNABLE CODE HERE — multi-line, with inline comments on each non-obvious line. No placeholders."
    }},
    {{"step": 2, "title": "Step 2 action title", "body": "140+ words covering what/why/mechanism/verification/warnings", "code": "real runnable code with comments"}},
    {{"step": 3, "title": "Step 3 action title", "body": "140+ words", "code": "real runnable code with comments"}}
  ],
  "workedExample": {{
    "title": "Specific descriptive title for this worked example",
    "problem": "WRITE AT LEAST 80 WORDS HERE. A self-contained problem the learner should genuinely attempt. Include all context, constraints, starting values, and relevant parameters from the sources.",
    "solution": "WRITE AT LEAST 250 WORDS HERE. Walk through every step labeled Step 1:, Step 2:, etc. Show all intermediate values and every decision. Explain why you made each choice over the alternatives.",
    "verify": "WRITE AT LEAST 60 WORDS HERE. Give 2-3 specific, checkable verification steps with expected outputs or invariants — not just 'check your work'."
  }},
  "pitfalls": [
    {{
      "name": "A memorable, specific name for this pitfall (e.g. 'The Index Rebuild Trap')",
      "description": "WRITE AT LEAST 110 WORDS HERE. Tell the full story: what the learner tried to do, the exact moment things went wrong, why it looked correct at first, what the failure looks like in practice.",
      "fix": "WRITE AT LEAST 90 WORDS HERE. Give the step-by-step correction with specific code or configuration changes, and explain how to verify the fix worked."
    }},
    {{
      "name": "A second distinct memorable pitfall name",
      "description": "WRITE AT LEAST 110 WORDS HERE. Different failure mode — full story as above.",
      "fix": "WRITE AT LEAST 90 WORDS HERE. Step-by-step correction with verification."
    }}
  ],
  "proTip": {{
    "title": "Expert insight title — specific, not generic",
    "insight": "WRITE AT LEAST 160 WORDS HERE. Genuine expert-level knowledge intermediate practitioners don't know. Include: (1) a counterintuitive observation that surprises people who think they understand this, (2) the deeper mental model experts hold that makes everything click, (3) a specific costly failure mode or performance trap this insight prevents, (4) how this connects to the broader landscape of the field."
  }}
}}

{code_note}
- Use exactly 4 concepts and 3 tutorialSteps in the arrays
- Every string value MUST meet the minimum word count — violating this is a failure
- Concept names and examples MUST reference actual terminology, APIs, or patterns from the sources above
- Return ONLY the JSON object for this chapter — no preamble, no explanation
"""
            try:
                chapter_raw = AIService.generate_json(chapter_prompt, max_tokens=5000, temperature=0.4, system_prompt=cat_chapter_system_prompt, **ai_params)
                chapter_cleaned = chapter_raw.strip()
                if chapter_cleaned.startswith("```"):
                    lines = chapter_cleaned.split("\n")
                    chapter_cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
                chapter_data = json.loads(chapter_cleaned)
            except Exception:
                chapter_data = {"id": chapter_id, "title": chapter_title, "duration": "12 min", "concepts": [], "tutorialSteps": [], "workedExample": {"title": "", "problem": "", "solution": "", "verify": ""}, "pitfalls": [], "proTip": {"title": "", "insight": ""}}
            filled_chapters.append(chapter_data)
        filled_modules.append({
            "id": mod.get("id"),
            "title": mod.get("title"),
            "emoji": mod.get("emoji", "📚"),
            "description": mod.get("description", ""),
            "chapters": filled_chapters,
        })

    total_chapters = sum(len(m["chapters"]) for m in filled_modules)
    total_concepts = sum(len(c.get("concepts", [])) for m in filled_modules for c in m["chapters"])

    tutorial_data = {
        "title": outline.get("title", path_title),
        "topicType": outline.get("topicType", "Technical"),
        "theme": outline.get("theme", "General"),
        "centralMentalModel": outline.get("centralMentalModel", {
            "name": path_title, "tagline": "", "description": ""
        }),
        "stats": {
            "modules": len(filled_modules),
            "chapters": total_chapters,
            "concepts": total_concepts,
            "estimatedMinutes": total_chapters * 12,
            "sourceCount": len(ingested),
        },
        "modules": filled_modules,
        "sourceCount": len(ingested),
    }

    # Cache as Artifact with no project_id — title is the unique key
    existing = (
        db.query(models.Artifact)
        .filter(
            models.Artifact.project_id == None,
            models.Artifact.source_id == None,
            models.Artifact.type == "tutorial",
            models.Artifact.title == cache_title,
        )
        .first()
    )
    if existing:
        existing.content = tutorial_data
    else:
        new_artifact = models.Artifact(
            project_id=None,
            source_id=None,
            type="tutorial",
            title=cache_title,
            content=tutorial_data,
        )
        db.add(new_artifact)
    try:
        db.commit()
    except Exception:
        db.rollback()

    return tutorial_data


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
    try:
        quiz_json_str = AIService.generate_quiz(source.content_text, **ai_params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {type(e).__name__}: {e}")
    try:
        quiz_data = json.loads(quiz_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed output. Please try again.")
    if not quiz_data.get("questions"):
        raise HTTPException(status_code=500, detail="AI returned an empty quiz. Please try again.")

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
    try:
        flashcards_json_str = AIService.generate_flashcards(source.content_text, **ai_params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {type(e).__name__}: {e}")
    try:
        flashcards_data = json.loads(flashcards_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed output. Please try again.")
    if not flashcards_data.get("flashcards"):
        raise HTTPException(status_code=500, detail="AI returned empty flashcards. Please try again.")

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
    try:
        social_json_str = AIService.generate_social_media(source.content_text, platform, **ai_params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {type(e).__name__}: {e}")
    try:
        social_data = json.loads(social_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed output. Please try again.")

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
    try:
        diagram_json_str = AIService.generate_diagram(source.content_text, concept, **ai_params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {type(e).__name__}: {e}")
    try:
        diagram_data = json.loads(diagram_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed output. Please try again.")

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
        raise HTTPException(status_code=404, detail="Source not ready — content is still being processed. Please wait a moment and try again.")

    ai_params = _get_ai_params(request, "article")
    try:
        article_json_str = AIService.generate_article(source.content_text, style, **ai_params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {type(e).__name__}: {e}")

    try:
        article_data = json.loads(article_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned malformed output. Please try again.")

    if not article_data.get("content"):
        raise HTTPException(status_code=500, detail="AI returned an empty article. Please try again.")

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


@router.get("/vanguard/{source_id}")
async def get_vanguard_recommendations(source_id: str, db: Session = Depends(get_db)):
    """Retrieve the latest Vanguard Mastery Recommendations for a source"""
    artifact = db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id,
        models.Artifact.type == "recommendation"
    ).order_by(models.Artifact.created_at.desc()).first()
    
    if not artifact:
        return {"status": "none", "recommendations": []}
    
    return {
        "id": artifact.id,
        "status": artifact.content.get("status", "ready"),
        "recommendations": artifact.content.get("recommendations", []),
        "agent_commentary": artifact.content.get("agent_commentary", "")
    }

@router.post("/vanguard/{source_id}/refresh")
async def refresh_vanguard_recommendations(source_id: str, db: Session = Depends(get_db)):
    """Force a new research pass for the Vibe-Vanguard agent"""
    # Delete existing recommendation artifacts to trigger new pass on next fetch
    db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id,
        models.Artifact.type == "recommendation"
    ).delete()
    db.commit()
    
    # Trigger a new research pass
    from services.vanguard import VanguardService
    asyncio.create_task(VanguardService.research_and_recommend(source_id))
    
    return {"status": "processing", "message": "Mastery refresh initiated"}

@router.post("/curriculum")
async def create_curriculum(project_id: str, db: Session = Depends(get_db)):
    """Trigger the Curriculum Architect to design a learning path for a project."""
    from services.architect import ArchitectService
    curriculum = await ArchitectService.create_syllabus(project_id, db_session=db)
    if not curriculum:
        raise HTTPException(status_code=500, detail="Architect failed to design curriculum")
    return curriculum

class VisionRequest(BaseModel):
    theme: Optional[str] = ""
    vision: Optional[str] = ""
    job_description: Optional[str] = ""
    reset: Optional[bool] = False

@router.post("/curriculum/path/{category_id}")
async def create_path_curriculum(category_id: str, request: VisionRequest, db: Session = Depends(get_db)):
    """Architect a source-driven learning path for an entire Category (Learning Path)."""
    from services.architect import ArchitectService
    
    curriculum = await ArchitectService.create_path_syllabus(
        category_id, 
        db_session=db, 
        reset=request.reset
    )
    
    if not curriculum:
        raise HTTPException(status_code=500, detail="Architect failed to design path curriculum")
    return curriculum

@router.post("/curriculum/mission")
async def create_mission_curriculum(request_body: VisionRequest, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Architect a standalone global mission for the user (Vision or JD driven)."""
    from services.architect import ArchitectService
    
    curriculum = await ArchitectService.create_mission_syllabus(
        user_id=current_user.id,
        db_session=db,
        vision=request_body.vision,
        job_description=request_body.job_description,
        reset=request_body.reset,
        theme=request_body.theme
    )
    
    if not curriculum:
        raise HTTPException(status_code=500, detail="Architect failed to design mission")
    return curriculum

from sqlalchemy.orm import Session, joinedload

@router.get("/curriculum/missions")
async def list_missions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """List all global missions architected by the user."""
    missions = db.query(models.Curriculum).options(
        joinedload(models.Curriculum.nodes)
    ).filter(
        models.Curriculum.user_id == current_user.id,
        models.Curriculum.category_id == None,
        models.Curriculum.project_id == None
    ).all()
    
    # Enrich with basic stats
    result = []
    for m in missions:
        m_dict = {
            "id": m.id,
            "goal": m.goal,
            "created_at": m.created_at,
            "updated_at": m.updated_at,
            "node_count": len(m.nodes),
            "mastery_percent": 0
        }
        if m.nodes:
            total_score = sum(n.mastery_score or 0 for n in m.nodes)
            m_dict["mastery_percent"] = round(total_score / len(m.nodes))
        result.append(m_dict)
        
    return result

@router.delete("/curriculum/mission/{mission_id}")
async def delete_mission(mission_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Delete a global mission."""
    mission = db.query(models.Curriculum).filter(
        models.Curriculum.id == mission_id,
        models.Curriculum.user_id == current_user.id
    ).first()
    
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    # Force delete nodes first to be absolutely safe
    db.query(models.CurriculumNode).filter(models.CurriculumNode.curriculum_id == mission_id).delete()
    
    db.delete(mission)
    db.commit()
    return {"status": "success"}

@router.get("/curriculum/{project_id}")
async def get_curriculum(project_id: str, db: Session = Depends(get_db)):
    """Retrieve current learning path for a project."""
    curriculum = db.query(models.Curriculum).filter(models.Curriculum.project_id == project_id).first()
    if not curriculum: return {"phases": [], "nodes": []}
    
    nodes = db.query(models.CurriculumNode).filter(models.CurriculumNode.curriculum_id == curriculum.id).order_by(models.CurriculumNode.sequence_order).all()
    return {"id": curriculum.id, "goal": curriculum.goal, "phases": curriculum.phases, "nodes": nodes}

@router.get("/curriculum/path/{category_id}")
async def get_path_curriculum(category_id: str, db: Session = Depends(get_db)):
    """Retrieve global learning path for a Category."""
    curriculum = db.query(models.Curriculum).filter(models.Curriculum.category_id == category_id).first()
    if not curriculum: return {"phases": [], "nodes": []}
    
    nodes = db.query(models.CurriculumNode).filter(models.CurriculumNode.curriculum_id == curriculum.id).order_by(models.CurriculumNode.sequence_order).all()
    return {"id": curriculum.id, "goal": curriculum.goal, "phases": curriculum.phases, "nodes": nodes}

@router.get("/curriculum/mission/{mission_id}")
async def get_mission_details(mission_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Retrieve details for a specific global mission."""
    curriculum = db.query(models.Curriculum).filter(
        models.Curriculum.id == mission_id,
        models.Curriculum.user_id == current_user.id
    ).first()
    
    if not curriculum:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    # --- Syllabus Health Check & Auto-Repair ---
    # Ensure if ANY node is mastered, all previous nodes are at least 'unlocked'
    # And ensure THE first node is always unlocked
    nodes = db.query(models.CurriculumNode)\
        .filter(models.CurriculumNode.curriculum_id == curriculum.id)\
        .order_by(models.CurriculumNode.sequence_order).all()
        
    if nodes:
        modified = False
        # Rule 1: First node must be unlocked at minimum
        if nodes[0].status == "locked":
            nodes[0].status = "unlocked"
            modified = True
            
        # Rule 2: If a node is mastered, everything before it must be unlocked
        latest_mastered_idx = -1
        for i, n in enumerate(nodes):
            if n.status == "mastered":
                latest_mastered_idx = i
                
        if latest_mastered_idx >= 0:
            for i in range(latest_mastered_idx):
                if nodes[i].status == "locked":
                    nodes[i].status = "unlocked"
                    modified = True
        
        if modified:
            db.commit()
            
    return {"id": curriculum.id, "goal": curriculum.goal, "phases": curriculum.phases, "nodes": nodes}

@router.post("/curriculum/node/{node_id}/scout")
async def scout_node(node_id: str, db: Session = Depends(get_db)):
    """Trigger the Scout Agent to hunt for resources for a specific node."""
    from services.scout import ScoutService
    try:
        resources = await ScoutService.scout_for_node(node_id, db_session=db)
    except ValueError as e:
        # Configuration errors (e.g. missing TAVILY_API_KEY) — surface clearly
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scout error: {str(e)}")
    if resources is None:
        raise HTTPException(status_code=500, detail="Scout failed — check server logs for details")
    if not resources:
        raise HTTPException(status_code=422, detail="Scout ran but found no matching resources. Check TAVILY_API_KEY and try again.")
    return {"status": "success", "resources": resources}

@router.get("/curriculum/node/{node_id}")
async def get_node_details(node_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a specific curriculum node."""
    node = db.query(models.CurriculumNode).filter(models.CurriculumNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return {
        "id": node.id,
        "title": node.title,
        "description": node.description,
        "phase": node.phase,
        "status": node.status,
        "mastery_score": node.mastery_score,
        "search_requirements": node.search_requirements,
        "suggested_resources": node.suggested_resources,
        "lesson_content": node.lesson_content
    }

@router.post("/curriculum/node/{node_id}/lesson")
async def generate_node_lesson(node_id: str, request: Request, db: Session = Depends(get_db)):
    """Trigger the AIService to generate a deep tactical lesson for this node."""
    node = db.query(models.CurriculumNode).filter(models.CurriculumNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    ai_params = _get_ai_params(request, "lesson")
    
    lesson_json = AIService.generate_node_lesson(
        node_title=node.title,
        node_description=node.description,
        phase=node.phase,
        **ai_params
    )
    
    try:
        lesson_data = json.loads(lesson_json)
        node.lesson_content = lesson_data
        db.commit()
        return lesson_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to synthesize lesson: {str(e)}")

@router.post("/curriculum/node/{node_id}/master")
async def master_node(node_id: str, db: Session = Depends(get_db)):
    """Mark a node as mastered."""
    node = db.query(models.CurriculumNode).filter(models.CurriculumNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    node.status = "mastered"
    node.mastery_score = 100

    # 1. Ensure all nodes BEFORE this one are at least "unlocked"
    # (Fixes the 'jump ahead' locking issue)
    db.query(models.CurriculumNode)\
        .filter(models.CurriculumNode.curriculum_id == node.curriculum_id)\
        .filter(models.CurriculumNode.sequence_order < node.sequence_order)\
        .filter(models.CurriculumNode.status == "locked")\
        .update({"status": "unlocked"})

    # 2. Unlock the immediate NEXT node
    next_node = db.query(models.CurriculumNode)\
        .filter(models.CurriculumNode.curriculum_id == node.curriculum_id)\
        .filter(models.CurriculumNode.sequence_order > node.sequence_order)\
        .order_by(models.CurriculumNode.sequence_order)\
        .first()

    if next_node and next_node.status == "locked":
        next_node.status = "unlocked"

    db.commit()
    return {"status": "success", "node": node}


# ── Interview Questions ──────────────────────────────────────────────────────

def _upsert_interview_artifact(db, artifact_filter: dict, data: dict):
    """Helper: upsert interview questions artifact."""
    existing = db.query(models.Artifact).filter_by(**artifact_filter).first()
    if existing:
        existing.content = data
    else:
        db.add(models.Artifact(**artifact_filter, type="interview_questions", content=data))
    try:
        db.commit()
    except Exception:
        db.rollback()


@router.get("/interview/project/{project_id}")
async def get_project_interview_questions(project_id: str, db: Session = Depends(get_db)):
    """Return cached interview questions for a project, or null if not yet generated."""
    existing = db.query(models.Artifact).filter(
        models.Artifact.project_id == project_id,
        models.Artifact.source_id == None,
        models.Artifact.type == "interview_questions",
    ).first()
    if existing and existing.content:
        return existing.content
    return None


@router.post("/interview/project/{project_id}")
async def generate_project_interview_questions(
    project_id: str, request: Request, force: bool = False, batch: int = 0, db: Session = Depends(get_db)
):
    """Generate interview questions for a project (2 easy, 2 medium, 1 hard). batch>0 = deeper/different set."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not force and batch == 0:
        existing = db.query(models.Artifact).filter(
            models.Artifact.project_id == project_id,
            models.Artifact.source_id == None,
            models.Artifact.type == "interview_questions",
        ).first()
        if existing and existing.content:
            return existing.content

    ingested = [s for s in project.sources if s.content_text and s.content_text.strip()]
    combined = "\n\n---\n\n".join(s.content_text[:4000] for s in ingested[:5])
    topic = project.name or "the learning path"

    ai_params = _get_ai_params(request, "interview")
    raw = AIService.generate_interview_questions(topic=topic, content=combined, batch=batch, **ai_params)
    try:
        data = json.loads(raw.strip().lstrip("```json").lstrip("```").rstrip("```"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse interview questions: {e}")

    # Only overwrite DB cache for batch 0 (the canonical set)
    if batch == 0:
        _upsert_interview_artifact(db, {"project_id": project_id, "source_id": None, "title": f"interview:{project_id}"}, data)
    return data


@router.get("/interview/category/{category_id}")
async def get_category_interview_questions(category_id: str, db: Session = Depends(get_db)):
    """Return cached interview questions for a category, or null if not yet generated."""
    existing = db.query(models.Artifact).filter(
        models.Artifact.project_id == None,
        models.Artifact.source_id == None,
        models.Artifact.type == "interview_questions",
        models.Artifact.title == f"interview:cat:{category_id}",
    ).first()
    if existing and existing.content:
        return existing.content
    return None


@router.post("/interview/category/{category_id}")
async def generate_category_interview_questions(
    category_id: str, request: Request, force: bool = False, batch: int = 0, db: Session = Depends(get_db)
):
    """Generate interview questions for a category (2 easy, 2 medium, 1 hard). batch>0 = deeper/different set."""
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    cache_title = f"interview:cat:{category_id}"
    if not force and batch == 0:
        existing = db.query(models.Artifact).filter(
            models.Artifact.project_id == None,
            models.Artifact.source_id == None,
            models.Artifact.type == "interview_questions",
            models.Artifact.title == cache_title,
        ).first()
        if existing and existing.content:
            return existing.content

    cat_projects = db.query(models.Project).filter(models.Project.category_id == category_id).all()
    ingested = []
    for proj in cat_projects:
        ingested.extend([s for s in proj.sources if s.content_text and s.content_text.strip()])

    combined = "\n\n---\n\n".join(s.content_text[:3000] for s in ingested[:6])
    topic = category.name or "the learning path"

    ai_params = _get_ai_params(request, "interview")
    raw = AIService.generate_interview_questions(topic=topic, content=combined, batch=batch, **ai_params)
    try:
        data = json.loads(raw.strip().lstrip("```json").lstrip("```").rstrip("```"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse interview questions: {e}")

    if batch == 0:
        _upsert_interview_artifact(db, {"project_id": None, "source_id": None, "title": cache_title}, data)
    return data


@router.get("/interview/mission/{mission_id}")
async def get_mission_interview_questions(mission_id: str, db: Session = Depends(get_db)):
    """Return cached interview questions for a mission, or null if not yet generated."""
    existing = db.query(models.Artifact).filter(
        models.Artifact.project_id == None,
        models.Artifact.source_id == None,
        models.Artifact.type == "interview_questions",
        models.Artifact.title == f"interview:mission:{mission_id}",
    ).first()
    if existing and existing.content:
        return existing.content
    return None


@router.post("/interview/mission/{mission_id}")
async def generate_mission_interview_questions(
    mission_id: str, request: Request, force: bool = False, batch: int = 0, db: Session = Depends(get_db)
):
    """Generate interview questions for a mission (2 easy, 2 medium, 1 hard). batch>0 = deeper/different set."""
    curriculum = db.query(models.Curriculum).filter(models.Curriculum.id == mission_id).first()
    if not curriculum:
        raise HTTPException(status_code=404, detail="Mission not found")

    cache_title = f"interview:mission:{mission_id}"
    if not force and batch == 0:
        existing = db.query(models.Artifact).filter(
            models.Artifact.project_id == None,
            models.Artifact.source_id == None,
            models.Artifact.type == "interview_questions",
            models.Artifact.title == cache_title,
        ).first()
        if existing and existing.content:
            return existing.content

    nodes = db.query(models.CurriculumNode).filter(
        models.CurriculumNode.curriculum_id == mission_id
    ).order_by(models.CurriculumNode.sequence_order).all()
    node_content = "\n".join(
        f"- {n.title}: {n.description or ''}" for n in nodes[:20]
    )
    topic = curriculum.goal or "the mission"

    ai_params = _get_ai_params(request, "interview")
    raw = AIService.generate_interview_questions(topic=topic, content=node_content, batch=batch, **ai_params)
    try:
        data = json.loads(raw.strip().lstrip("```json").lstrip("```").rstrip("```"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse interview questions: {e}")

    if batch == 0:
        _upsert_interview_artifact(db, {"project_id": None, "source_id": None, "title": cache_title}, data)
    return data

