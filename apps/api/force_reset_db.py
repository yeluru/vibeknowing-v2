import sys
from pathlib import Path
import os

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from database import engine, Base
from models import User, Category, Project, Source, Artifact, ChatMessage

def force_reset():
    print("Force resetting database...")
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped.")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

if __name__ == "__main__":
    force_reset()
