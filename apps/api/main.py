from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from database import engine
import models
from routers import ingest, ai, create, sources, categories, auth

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


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
