from database import SessionLocal, engine
from models import Base
from sqlalchemy import text

def purge_database():
    print("Purging database...")
    db = SessionLocal()
    try:
        # Disable foreign key checks for SQLite
        db.execute(text("PRAGMA foreign_keys = OFF"))
        
        # Delete data from tables
        db.execute(text("DELETE FROM chat_messages"))
        db.execute(text("DELETE FROM artifacts"))
        db.execute(text("DELETE FROM sources"))
        db.execute(text("DELETE FROM projects"))
        db.execute(text("DELETE FROM categories"))
        db.execute(text("DELETE FROM otps"))
        db.execute(text("DELETE FROM users"))
        
        db.execute(text("PRAGMA foreign_keys = ON"))
        db.commit()
        print("✅ Database purged successfully. All users and projects deleted.")
        
    except Exception as e:
        print(f"❌ Error purging database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    purge_database()
