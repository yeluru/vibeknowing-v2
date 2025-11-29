from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..services.social import SocialMediaService
from pydantic import BaseModel

router = APIRouter(
    prefix="/create",
    tags=["content-creation"]
)

class SocialRequest(BaseModel):
    source_id: str
    platform: str  # linkedin, instagram
    style: str

class DiagramRequest(BaseModel):
    source_id: str
    diagram_type: str  # flowchart, sequence, etc.

@router.post("/social")
async def create_social_post(request: SocialRequest, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == request.source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source not found")

    if request.platform == "linkedin":
        content = SocialMediaService.generate_linkedin_post(source.content_text, request.style)
    elif request.platform == "instagram":
        content = SocialMediaService.generate_instagram_caption(source.content_text, request.style)
    else:
        raise HTTPException(status_code=400, detail="Invalid platform")

    # Save as artifact
    artifact = models.Artifact(
        project_id=source.project_id,
        type=f"{request.platform}_post",
        title=f"{request.platform.capitalize()} Post ({request.style})",
        content={"text": content, "style": request.style}
    )
    db.add(artifact)
    db.commit()

    return {"content": content, "artifact_id": artifact.id}

@router.post("/diagram")
async def create_diagram(request: DiagramRequest, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == request.source_id).first()
    if not source or not source.content_text:
        raise HTTPException(status_code=404, detail="Source not found")

    diagram_code = SocialMediaService.generate_diagram(source.content_text, request.diagram_type)

    # Save as artifact
    artifact = models.Artifact(
        project_id=source.project_id,
        type="diagram",
        title=f"{request.diagram_type.capitalize()} Diagram",
        content={"mermaid": diagram_code}
    )
    db.add(artifact)
    db.commit()

    return {"diagram": diagram_code, "artifact_id": artifact.id}
