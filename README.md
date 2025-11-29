# VibeKnowing V2

VibeKnowing V2 is a comprehensive **Knowledge & Content Creation Suite** that allows users to ingest content, learn from it, and remix it into new artifacts.

## Project Structure

- `apps/web`: Next.js 14 Frontend
- `apps/api`: FastAPI Backend

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL (or Supabase)
- Redis (for background jobs)

### Setup

1. **Frontend**
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

2. **Backend**
   ```bash
   cd apps/api
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
