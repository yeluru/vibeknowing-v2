from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
import models
from pydantic import BaseModel

router = APIRouter(
    prefix="/sources",
    tags=["sources"]
)

class TranscriptUpdate(BaseModel):
    transcript: str

@router.get("/projects")
async def list_projects(
    category_id: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List all projects, optionally filtered by category."""
    query = db.query(models.Project).filter(models.Project.owner_id == current_user.id)
    
    if category_id:
        query = query.filter(models.Project.category_id == category_id)
    
    projects = query.order_by(models.Project.updated_at.desc()).all()
    
    return [{
        "id": p.id,
        "title": p.title,
        "description": p.description,
        "category_id": p.category_id,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "source_count": len(p.sources),
        "first_source_id": p.sources[0].id if p.sources else None
    } for p in projects]


@router.get("/{source_id}")
async def get_source(source_id: str, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    return {
        "id": source.id,
        "type": source.type,
        "url": source.url,
        "title": source.title,
        "content_text": source.content_text,
        "summary": source.summary,
        "meta_data": source.meta_data,
        "project_id": source.project_id,
        "project": {
            "id": source.project.id,
            "title": source.project.title
        } if source.project else None,
        "created_at": source.created_at
    }

@router.put("/{source_id}/transcript")
async def update_transcript(
    source_id: str,
    data: TranscriptUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Manually update the transcript for a source."""
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Verify ownership
    project = db.query(models.Project).filter(models.Project.id == source.project_id).first()
    if not project or project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    source.content_text = data.transcript
    if source.title == "Processing..." or "Transcript unavailable" in source.title:
        source.title = f"YouTube Video (Manual Transcript)"
    
    db.commit()
    
    return {"status": "updated", "source_id": source.id}

@router.get("/")
async def list_sources(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    sources = db.query(models.Source).join(models.Project).filter(
        models.Project.owner_id == current_user.id
    ).order_by(models.Source.created_at.desc()).limit(10).all()
    
    return [{
        "id": s.id,
        "type": s.type,
        "url": s.url,
        "title": s.title,
        "created_at": s.created_at,
        "status": "Ready" if s.content_text else "Processing"
    } for s in sources]

@router.delete("/{source_id}")
async def delete_source(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a source and all its data."""
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Verify ownership
    project = db.query(models.Project).filter(models.Project.id == source.project_id).first()
    if not project or project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(source)
    db.commit()
    
    return {"status": "deleted", "source_id": source_id}


class CategoryUpdate(BaseModel):
    category_id: str | None = None

@router.put("/projects/{project_id}/category")
async def update_project_category(
    project_id: str,
    update: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a project's category."""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify category exists if provided
    if update.category_id:
        category = db.query(models.Category).filter(
            models.Category.id == update.category_id,
            models.Category.owner_id == current_user.id
        ).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    
    project.category_id = update.category_id
    db.commit()
    
    return {"status": "updated", "project_id": project_id, "category_id": update.category_id}

@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a project and all its contents."""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    
    return {"status": "deleted", "project_id": project_id}


class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None

@router.put("/projects/{project_id}")
async def update_project(
    project_id: str,
    update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a project's details (title, description)."""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if update.title is not None:
        project.title = update.title
    
    if update.description is not None:
        project.description = update.description
        
    db.commit()
    db.refresh(project)
    
    return {
        "status": "updated", 
        "project": {
            "id": project.id,
            "title": project.title,
            "description": project.description
        }
    }

class ClaimProjectsRequest(BaseModel):
    project_ids: list[str]

@router.post("/projects/claim")
async def claim_projects(
    request: ClaimProjectsRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Claim guest projects (owner_id=NULL) for the current user."""
    if not request.project_ids:
        return {"claimed_count": 0}
        
    # Update projects where id in list AND owner_id is NULL
    # Security: Ensure we only claim orphaned projects, not other users' projects
    updated = db.query(models.Project).filter(
        models.Project.id.in_(request.project_ids),
        models.Project.owner_id == None
    ).update(
        {models.Project.owner_id: current_user.id},
        synchronize_session=False
    )
    
    db.commit()
    return {"claimed_count": updated}

