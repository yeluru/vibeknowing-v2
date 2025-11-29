from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..services.ai import AIService
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
        from ..database import SessionLocal
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
        type="summary",
        title=f"{style.capitalize()} Summary",
        content={"text": summary}
    )
    db.add(artifact)
    db.commit()
    
    return {"summary": summary, "artifact_id": artifact.id, "cached": False}
