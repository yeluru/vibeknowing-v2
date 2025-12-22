from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from database import engine
import models
from routers import ingest, ai, create, sources, categories, auth, oauth
from config import settings
import force_reset_db
import seed_db

load_dotenv()

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="VibeKnowing V2 API",
    description="Backend API for VibeKnowing V2 - The Knowledge & Content Creation Suite",
    version="2.0.0"
)

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "https://vibeknowing-web-wk0z.onrender.com",
    "https://vibeknowing-api-wk0z.onrender.com",
    "https://vibeknowing.com",
    "https://www.vibeknowing.com",
]

print("Starting API with CORS origins:", origins)

# Session Middleware (Required for OAuth) - Must be added before CORS to ensure it handles requests first? 
# Actually, Last added = First executed. We want CORS first (to handle OPTIONS).
# So we add SessionMiddleware BEFORE adding CORSMiddleware?
# Let's simple add it here.
app.add_middleware(SessionMiddleware, secret_key=settings.SESSION_SECRET)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins to resolve production CORS issues
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(ai.router)
app.include_router(create.router)
app.include_router(sources.router)
app.include_router(categories.router)
app.include_router(auth.router)
app.include_router(oauth.router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to VibeKnowing V2 API",
        "status": "operational",
        "version": "2.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/reset-db-secret")
async def reset_db_secret():
    """
    Emergency endpoint to reset the database when shell access is not available.
    WARNING: This drops all tables and re-seeds!
    """
    try:
        force_reset_db.force_reset()
        seed_db.seed()
        return {"status": "success", "message": "Database reset and seeded successfully."}
    except Exception as e:
        return {"status": "error", "message": f"Failed to reset DB: {str(e)}"}

@app.post("/purge-db-secret")
async def purge_db_secret(key: str):
    """
    Emergency endpoint to PURGE all data (delete rows) without dropping tables.
    Requires 'key' query parameter matching SECRET_KEY (or 'supersecretkey' as fallback).
    """
    from config import settings
    # Simple security check
    if key != settings.SECRET_KEY and key != "supersecretkey":
         return {"status": "error", "message": "Invalid secret key"}

    import purge_db
    try:
        purge_db.purge_database()
        return {"status": "success", "message": "Database successfully purged (all data deleted)."}
    except Exception as e:
        return {"status": "error", "message": f"Failed to purge DB: {str(e)}"}
