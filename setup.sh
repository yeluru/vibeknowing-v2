#!/bin/bash

echo "🚀 Setting up VibeKnowing V2 Backend..."

# Navigate to API directory
cd "$(dirname "$0")/apps/api"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="sqlite:///./vibeknowing.db"
export OPENAI_API_KEY="${OPENAI_API_KEY:-your_key_here}"

echo "✅ Setup complete!"
echo ""
echo "To start the server, run:"
echo "  cd apps/api"
echo "  source venv/bin/activate"
echo "  uvicorn main:app --reload"
