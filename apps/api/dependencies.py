from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from database import get_db
from sqlalchemy.orm import Session
import models
from typing import Optional

from jose import JWTError, jwt
from config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # AUTH BYPASS: Always return or create local admin user
    email = "admin@localhost"
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Create default admin user if missing
        from services.auth import AuthService
        user = models.User(
            email=email,
            hashed_password=AuthService.get_password_hash("admin"),
            full_name="Admin User"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return user

async def get_optional_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[models.User]:
    # Bypass: Always return the signed-in admin user
    return await get_current_user(token or "dummy", db)
