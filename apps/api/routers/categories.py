from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..dependencies import get_current_user
from .. import models

router = APIRouter(
    prefix="/categories",
    tags=["categories"]
)

class CategoryCreate(BaseModel):
    name: str

class CategoryUpdate(BaseModel):
    name: str

from datetime import datetime

class CategoryResponse(BaseModel):
    id: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True
        orm_mode = True # Fallback for v1

@router.get("/", response_model=List[CategoryResponse])
async def list_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Category).filter(
        models.Category.owner_id == current_user.id
    ).order_by(models.Category.name).all()

@router.post("/", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if exists
    existing = db.query(models.Category).filter(
        models.Category.owner_id == current_user.id,
        models.Category.name == category.name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    new_category = models.Category(
        name=category.name,
        owner_id=current_user.id
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_category = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.owner_id == current_user.id
    ).first()
    
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db_category.name = category.name
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_category = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.owner_id == current_user.id
    ).first()
    
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Unlink projects (set category_id to null)
    projects = db.query(models.Project).filter(models.Project.category_id == category_id).all()
    for p in projects:
        p.category_id = None
        
    db.delete(db_category)
    db.commit()
    return {"status": "deleted"}
