"""
API Router: /api/settings
Serves the AI model catalog. No key storage - keys stay in the browser.

File: apps/api/routers/settings.py
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/api/settings",
    tags=["settings"],
)

AVAILABLE_MODELS = {
    "openai": [
        {"id": "gpt-4o", "name": "GPT-4o", "context": 128000, "tier": "standard"},
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "context": 128000, "tier": "budget"},
        {"id": "o1", "name": "o1 (Reasoning)", "context": 200000, "tier": "premium"},
        {"id": "o3-mini", "name": "o3-mini (Reasoning)", "context": 200000, "tier": "standard"},
    ],
    "anthropic": [
        {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4", "context": 200000, "tier": "standard"},
        {"id": "claude-opus-4-20250514", "name": "Claude Opus 4", "context": 200000, "tier": "premium"},
        {"id": "claude-haiku-3-5-20241022", "name": "Claude Haiku 3.5", "context": 200000, "tier": "budget"},
    ],
    "google": [
        {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "context": 1000000, "tier": "standard"},
        {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", "context": 1000000, "tier": "premium"},
    ],
}


@router.get("/defaults")
async def get_defaults():
    """Public endpoint. Returns available models per provider."""
    return {"models": AVAILABLE_MODELS}
