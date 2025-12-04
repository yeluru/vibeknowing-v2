import sys
import os
from pathlib import Path

# Add current directory to path to allow imports
sys.path.append(str(Path(__file__).parent))

from database import SessionLocal
from models import Project, Source

def truncate_titles():
    db = SessionLocal()
    try:
        # Truncate Project titles
        projects = db.query(Project).all()
        project_count = 0
        for project in projects:
            if project.title and len(project.title) > 30:
                old_title = project.title
                new_title = f"{old_title[:27]}..."
                project.title = new_title
                print(f"[Project] Truncating: '{old_title}' -> '{new_title}'")
                project_count += 1
        
        # Truncate Source titles
        sources = db.query(Source).all()
        source_count = 0
        for source in sources:
            if source.title and len(source.title) > 30:
                old_title = source.title
                new_title = f"{old_title[:27]}..."
                source.title = new_title
                print(f"[Source] Truncating: '{old_title}' -> '{new_title}'")
                source_count += 1
        
        total_count = project_count + source_count
        if total_count > 0:
            db.commit()
            print(f"\nSuccessfully truncated {project_count} project titles and {source_count} source titles.")
        else:
            print("\nNo titles needed truncation.")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting title truncation for Projects and Sources...")
    truncate_titles()
