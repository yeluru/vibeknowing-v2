from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from pydantic import BaseModel, EmailStr, Field
from database import get_db
from models import User
from services.auth import AuthService
from datetime import datetime, timedelta
from config import settings
from sqlalchemy import text, func
import models

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

class OtpRequest(BaseModel):
    email: EmailStr
    type: str # 'login' or 'signup'

class OtpVerify(BaseModel):
    email: EmailStr
    code: str
    full_name: str | None = None

class Token(BaseModel):
    access_token: str
    token_type: str
    is_new_user: bool = False

@router.post("/otp/request")
async def request_otp(data: OtpRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Request a one-time password."""
    # MVP: Generate simple 6-digit code
    import random
    code = "".join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Check rate limit (basic)
    # In real app: check if recent OTP for this email exists < 1 min ago
    
    otp = models.OTP(
        email=data.email,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(otp)
    db.commit()
    
    # Send Email in Background
    from services.email import EmailService
    background_tasks.add_task(EmailService.send_otp, data.email, code)
    
    return {"status": "sent", "message": "OTP sent to email"}

@router.post("/otp/verify", response_model=Token)
async def verify_otp(data: OtpVerify, db: Session = Depends(get_db)):
    """Verify OTP and return token."""
    # Find valid OTP
    otp = db.query(models.OTP).filter(
        models.OTP.email == data.email,
        models.OTP.code == data.code,
        models.OTP.expires_at > func.now()
    ).first()
    
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # OTP Valid - Process User
    user = db.query(models.User).filter(models.User.email == data.email).first()
    is_new_user = False
    
    if not user:
        # Create new user
        if not data.full_name:
             # Basic fallback if they didn't provide name on 'login' flow but account doesn't exist
             # Ideally frontend handles this by detecting 'signup' intent
             data.full_name = data.email.split('@')[0]
             
        user = models.User(
            email=data.email,
            full_name=data.full_name
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        is_new_user = True
    
    # Delete used OTP
    db.delete(otp)
    db.commit()
    
    # Generate token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": user.email, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "is_new_user": is_new_user
    }
@router.post("/debug-email")
async def debug_email(email: EmailStr):
    """
    Synchronous email test to debug configuration and delivery.
    Returns technical logs directly in response.
    """
    logs = []
    logs.append(f"🔍 Checking Configuration...")
    logs.append(f"EMAIL_PROVIDER: {settings.EMAIL_PROVIDER}")
    logs.append(f"RESEND_API_KEY Configured: {'Yes' if settings.RESEND_API_KEY else 'No'}")
    logs.append(f"SMTP Configuration: Host={settings.SMTP_HOST}, Port={settings.SMTP_PORT}, User={settings.SMTP_USERNAME}")
    
    status_code = 200
    try:
        from services.email import EmailService
        
        # 1. Try Resend explicitly if key exists
        if settings.RESEND_API_KEY:
            logs.append("🚀 Attempting Resend (Direct)...")
            import httpx
            html_content = EmailService.get_html_content("TEST-123")
            resp = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={
                    "from": "VibeKnowing <onboarding@resend.dev>",
                    "to": [email],
                    "subject": "[Debug] VibeKnowing Test",
                    "html": html_content
                },
                timeout=10.0
            )
            logs.append(f"Resend Response: {resp.status_code} - {resp.text}")
        else:
            logs.append("⚠️ Skipping Resend (No Key)")

        # 2. Try configured provider via Service
        logs.append(f"🚀 Calling EmailService.send_otp via provider '{settings.EMAIL_PROVIDER}'...")
        # We can't easily capture stdout from the service here without redirecting stdout, 
        # but the above Resend test is the most important part.
        EmailService.send_otp(email, "TEST-CODE")
        logs.append("EmailService.send_otp executed without raising exception.")
        
    except Exception as e:
        import traceback
        logs.append(f"❌ Exception: {str(e)}")
        logs.append(traceback.format_exc())
        status_code = 500

    return {
        "status": "completed",
        "logs": logs
    }
