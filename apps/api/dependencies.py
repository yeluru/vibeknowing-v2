from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from .database import get_db
from sqlalchemy.orm import Session
from . import models
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # For MVP: Auto-create/use a default user
    # TODO: Validate token with Supabase/Clerk in production
    
    user = db.query(models.User).filter(models.User.email == "demo@vibeknowing.com").first()
    if not user:
        # Create a demo user
        user = models.User(email="demo@vibeknowing.com", full_name="Demo User")
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user
