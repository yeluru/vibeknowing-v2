from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from services.ai import AIService
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

router = APIRouter(
    prefix="/ai",
    tags=["ai"]
)

class ChatRequest(BaseModel):
    source_id: str
    message: str

@router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == request.source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    # Save user message
    user_message = models.ChatMessage(
        source_id=request.source_id,
        role="user",
        content=request.message
    )
    db.add(user_message)
    db.commit()

    # Simple RAG: Pass full text as context (for MVP)
    # In production, we would use vector search here
    
    response_stream = AIService.chat_with_context(request.message, source.content_text)
    
    # Collect the full response to save it
    full_response = []
    
    async def iter_stream():
        for chunk in response_stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response.append(content)
                yield content
        
        # Save assistant message after streaming completes
        # Create a new session for this operation
        from database import SessionLocal
        new_db = SessionLocal()
        try:
            assistant_message = models.ChatMessage(
                source_id=request.source_id,
                role="assistant",
                content=''.join(full_response)
            )
            new_db.add(assistant_message)
            new_db.commit()
        finally:
            new_db.close()

    return StreamingResponse(iter_stream(), media_type="text/event-stream")

@router.get("/chat/history/{source_id}")
async def get_chat_history(source_id: str, db: Session = Depends(get_db)):
    """Retrieve chat history for a source"""
    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.source_id == source_id
    ).order_by(models.ChatMessage.created_at).all()
    
    return [{"role": msg.role, "content": msg.content} for msg in messages]


@router.post("/summarize/{source_id}")
async def summarize(source_id: str, style: str = "article", force: bool = False, db: Session = Depends(get_db)):
    """Generate or retrieve summary. Set force=true to regenerate existing summary."""
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    # Return existing summary if available (unless force regenerate)
    if source.summary and not force:
        print(f"Returning cached summary for source {source_id}")
        return {"summary": source.summary, "cached": True}

    # Generate new summary
    print(f"Generating new summary for source {source_id}")
    summary = AIService.generate_summary(source.content_text, style)
    
    # Save summary to source
    source.summary = summary
    db.commit()
    
    # Also save as artifact for history
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
async def generate_quiz(source_id: str, force: bool = False, db: Session = Depends(get_db)):
    """Generate or retrieve quiz."""
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    # Check for existing quiz artifact
    # In a real app, we might want to support multiple quizzes. For now, we'll just check for the latest one.
    # Check for existing quiz artifact
    existing_quiz = db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id,
        models.Artifact.type == "quiz"
    ).order_by(models.Artifact.created_at.desc()).first()

    # If we wanted caching, we'd check here. But quizzes are often dynamic. Let's allow regeneration.
    
    print(f"Generating quiz for source {source_id}")
    quiz_json_str = AIService.generate_quiz(source.content_text)
    
    import json
    try:
        quiz_data = json.loads(quiz_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    # Save as artifact
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
    """Retrieve existing quiz for a source."""
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Find the latest quiz artifact for this project
    artifact = db.query(models.Artifact).filter(
        models.Artifact.project_id == source.project_id,
        models.Artifact.type == "quiz"
    ).order_by(models.Artifact.created_at.desc()).first()
    
    if not artifact:
        return {"questions": []}
    
    return artifact.content


@router.post("/flashcards/{source_id}")
async def generate_flashcards(source_id: str, force: bool = False, db: Session = Depends(get_db)):
    """Generate or retrieve flashcards."""
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    print(f"Generating flashcards for source {source_id}")
    
    # Check for existing flashcards artifact
    if not force:
        existing_artifact = db.query(models.Artifact).filter(
            models.Artifact.source_id == source_id,
            models.Artifact.type == "flashcard"
        ).order_by(models.Artifact.created_at.desc()).first()
        
        if existing_artifact:
            print(f"Returning cached flashcards for source {source_id}")
            return existing_artifact.content

    flashcards_json_str = AIService.generate_flashcards(source.content_text)
    
    import json
    try:
        flashcards_data = json.loads(flashcards_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    # Save as artifact
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
    """Retrieve existing flashcards for a source."""
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
async def generate_social_media(source_id: str, platform: str = "twitter", db: Session = Depends(get_db)):
    """Generate social media post from source content."""
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    print(f"Generating {platform} post for source {source_id}")
    social_json_str = AIService.generate_social_media(source.content_text, platform)
    
    import json
    try:
        social_data = json.loads(social_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    # Save as artifact
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
    """Retrieve existing social media post for a source."""
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Find latest social media artifact for this platform
    artifact = db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id,
        models.Artifact.type == "social_media",
        models.Artifact.title.like(f"{platform.capitalize()}%")
    ).order_by(models.Artifact.created_at.desc()).first()
    
    if not artifact:
        return {"post": "", "hashtags": [], "hook": ""}
    
    return artifact.content


@router.post("/diagram/{source_id}")
async def generate_diagram(source_id: str, concept: str = "", db: Session = Depends(get_db)):
    """Generate diagram from source content."""
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    print(f"Generating diagram for source {source_id}")
    diagram_json_str = AIService.generate_diagram(source.content_text, concept)
    
    import json
    try:
        diagram_data = json.loads(diagram_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    # Save as artifact
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
    """Retrieve existing diagram for a source."""
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
async def generate_article(source_id: str, style: str = "blog", db: Session = Depends(get_db)):
    """Generate article from source content."""
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source content not found")

    print(f"Generating {style} article for source {source_id}")
    article_json_str = AIService.generate_article(source.content_text, style)
    
    import json
    try:
        article_data = json.loads(article_json_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    # Save as artifact
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
    """Retrieve existing article for a source."""
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
    """Update (save) article content."""
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Try to find latest artifact to preserve metadata
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
        
    # Save as new artifact
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
    """Debug endpoint to list artifacts and check environment."""
    # Check scraper environment
    playwright_status = "Unknown"
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            playwright_status = "Installed (API loadable)"
            # Optional: Check for browsers? (Hard to do quickly without launching)
    except ImportError:
        playwright_status = "ImportError (Package missing)"
    except Exception as e:
        playwright_status = f"Error: {str(e)}"

    artifacts = db.query(models.Artifact).filter(
        models.Artifact.source_id == source_id
    ).all()
    
    return {
        "scraper_env": {
            "playwright": playwright_status
        },
        "count": len(artifacts),
        "artifacts": [
             # ... existing artifact fields
            {
                "id": a.id,
                "type": a.type,
                "created_at": a.created_at,
                "has_content": bool(a.content),
                "title": a.title
            } for a in artifacts
        ]
    }
