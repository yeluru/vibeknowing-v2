import sys
from pathlib import Path
import os

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from database import engine, Base
# Import all models to ensure they are registered with Base.metadata
from models import User, Category, Project, Source, Artifact, ChatMessage

def reset_database():
    print("WARNING: This will PERMANENTLY DELETE ALL DATA in the database defined by DATABASE_URL.")
    db_url = os.getenv('DATABASE_URL')
    print(f"Target Database: {db_url}")
    
    # Simple confirmation for interactive shells
    print("Type 'WIPE' to confirm deletion and reset:")
    confirm = input()
    if confirm != 'WIPE':
        print("Aborted. Data was NOT deleted.")
        return

    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped.")
    
    print("Creating all tables with fresh schema...")
    Base.metadata.create_all(bind=engine)
    print("Database reset successfully! All tables recreated.")

if __name__ == "__main__":
    reset_database()
