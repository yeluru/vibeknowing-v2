from database import SessionLocal, engine
from models import Base
from sqlalchemy import text

def purge_database():
    print("Purging database...")
    db = SessionLocal()
    try:
        # Disable foreign key checks for SQLite
        db.execute(text("PRAGMA foreign_keys = OFF"))
        
        tables = [
            "chat_messages", "artifacts", "sources", "projects", 
            "categories", "otps", "users", "chunks", "summaries", "transcripts"
        ]

        for table in tables:
            try:
                db.execute(text(f"DELETE FROM {table}"))
                print(f"Deleted rows from {table}")
            except Exception as e:
                # Ignore "no such table" errors
                if "no such table" not in str(e):
                    print(f"Error purging {table}: {e}")

        db.execute(text("PRAGMA foreign_keys = ON"))
        db.commit()
        print("✅ Database purged successfully (skipped missing tables).")
        
    except Exception as e:
        print(f"❌ Error purging database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    purge_database()
