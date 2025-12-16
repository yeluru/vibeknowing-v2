import sys
from pathlib import Path
import os
import time

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from database import engine, Base
# Import all models to ensure they are registered with Base.metadata
from models import User, Category, Project, Source, Artifact, ChatMessage

def init_database():
    print("Initializing Postgres Database...")
    
    # Wait for DB to be ready (retry loop)
    retries = 5
    while retries > 0:
        try:
            # Try to create tables
            Base.metadata.create_all(bind=engine)
            print("Database initialized successfully! All tables created.")
            return
        except Exception as e:
            print(f"Connection failed: {e}")
            retries -= 1
            if retries > 0:
                print(f"Retrying in 2 seconds... ({retries} left)")
                time.sleep(2)
            else:
                print("Failed to connect to database after retries.")
                sys.exit(1)

if __name__ == "__main__":
    init_database()
