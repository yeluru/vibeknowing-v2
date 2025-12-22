from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.middleware.sessions import SessionMiddleware
from database import get_db
from config import settings
import models
from services.auth import AuthService
from datetime import timedelta
import logging

# Setup Logger
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["oauth"]
)

# Initialize Authlib
# We wrap settings in a Starlette Config object to be compatible if needed, 
# but register usually takes individual params or env vars.
oauth = OAuth()

# Google Configuration
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

# GitHub Configuration
oauth.register(
    name='github',
    client_id=settings.GITHUB_CLIENT_ID or 'PLACEHOLDER', # Avoid crash if missing
    client_secret=settings.GITHUB_CLIENT_SECRET or 'PLACEHOLDER',
    access_token_url='https://github.com/login/oauth/access_token',
    access_token_params=None,
    authorize_url='https://github.com/login/oauth/authorize',
    authorize_params=None,
    api_base_url='https://api.github.com/',
    client_kwargs={'scope': 'user:email'},
)

@router.get("/login/{provider}")
async def login(provider: str, request: Request, redirect: str = None):
    """
    Initiaties OAuth login. 
    frontend_redirect: URL to redirect the user to after successful login (frontend).
    """
    
    # Validate provider
    if provider not in ['google', 'github']:
        raise HTTPException(status_code=404, detail="Provider not supported")
    
    # Store the frontend redirect URL in session to retrieve it later
    # Default to REFERER or localhost if not provided
    if not redirect:
        redirect = request.headers.get('referer')
        if not redirect or 'auth/login' in redirect: # Verify generic login page
             # Fallback logic to determine base frontend URL
             if "localhost" in str(request.url):
                 redirect = "http://localhost:3000"
             else:
                 redirect = "https://vibeknowing.com"
    
    request.session['frontend_redirect'] = redirect
    
    # Construct absolute callback URL
    # IMPORTANT: This must match exactly what you registered in Google/GitHub
    scheme = request.url.scheme
    if "onrender" in str(request.url) and scheme == "http":
         scheme = "https" # Force HTTPS on Render if behind proxy
         
    # We use the current request domain for the callback
    # e.g. https://api.vibeknowing.com/auth/callback/google
    redirect_uri = request.url_for('auth', provider=provider).replace(scheme=scheme) 
    
    # Fix for issue where router prefix might not be included in url_for correctly or behind proxy
    # Hardcoding based on known structure is safer if url_for is ambiguous
    base_url = str(request.base_url).rstrip('/')
    if "http://" in base_url and "onrender" in base_url:
        base_url = base_url.replace("http://", "https://")
        
    redirect_uri = f"{base_url}/auth/callback/{provider}"
        
    return await oauth.create_client(provider).authorize_redirect(request, redirect_uri)


@router.get("/callback/{provider}")
async def auth(provider: str, request: Request, db: Session = Depends(get_db)):
    """
    OAuth Callback. Exchanges code for token, creates user, returns to frontend.
    """
    try:
        token = await oauth.create_client(provider).authorize_access_token(request)
    except Exception as e:
        logger.error(f"OAuth Error: {str(e)}")
        # Redirect to frontend with error
        frontend_url = request.session.get('frontend_redirect', 'https://vibeknowing.com')
        return RedirectResponse(url=f"{frontend_url}/auth/login?error=oauth_failed")

    user_info = None
    
    if provider == 'google':
        user_info = token.get('userinfo')
        # If userinfo is not in token (older flow), fetch it
        if not user_info:
            user_info = await oauth.google.userinfo(token=token)
            
    elif provider == 'github':
        resp = await oauth.github.get('user', token=token)
        user_info = resp.json()
        # Github email might be private, fetch separately
        email_resp = await oauth.github.get('user/emails', token=token)
        emails = email_resp.json()
        primary_email = next((e['email'] for e in emails if e['primary']), None)
        user_info['email'] = primary_email

    if not user_info or not user_info.get('email'):
        frontend_url = request.session.get('frontend_redirect', 'https://vibeknowing.com')
        return RedirectResponse(url=f"{frontend_url}/auth/login?error=no_email")

    email = user_info.get('email')
    
    # Check if user exists
    user = db.query(models.User).filter(models.User.email == email).first()
    is_new = False
    
    if not user:
        # Create User
        user = models.User(
            email=email,
            full_name=user_info.get('name', email.split('@')[0]),
            avatar_url=user_info.get('picture') or user_info.get('avatar_url'),
            provider=provider,
            provider_id=user_info.get('sub') or str(user_info.get('id')),
            role="user" 
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        is_new = True
    else:
        # Update provider info if linking account (or logging in again)
        # Note: If they signed up with email, we are basically "merging" by email trust
        if not user.provider_id:
            user.provider = provider
            user.provider_id = user_info.get('sub') or str(user_info.get('id'))
        
        if not user.avatar_url:
            user.avatar_url = user_info.get('picture') or user_info.get('avatar_url')
            
        db.commit()

    # Create JWT
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": user.email, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    # Redirect to Frontend
    frontend_url = request.session.pop('frontend_redirect', 'https://vibeknowing.com')
    # Strip trailing slash
    frontend_url = frontend_url.rstrip('/')
    
    # Clean redirect to a dedicated callback page or home
    # We pass token in query param. This is standard for simple OAuth implementation.
    # Frontend will read token from URL, save to localStorage, and push router to /
    redirect_target = f"{frontend_url}/auth/callback?token={access_token}&new={str(is_new).lower()}"
    
    return RedirectResponse(url=redirect_target)
