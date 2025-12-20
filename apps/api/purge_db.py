from database import SessionLocal, engine
from models import Base
from sqlalchemy import text

def purge_database():
    print("Purging database...")
    db = SessionLocal()
    try:
        engine_url = str(engine.url)
        is_sqlite = "sqlite" in engine_url
        is_postgres = "postgres" in engine_url

        if is_sqlite:
            db.execute(text("PRAGMA foreign_keys = OFF"))
        elif is_postgres:
            # Postgres specific: Disable triggers or just rely on CASCADE if defined,
            # but safer to truncate with CASCADE in postgres
            pass

        tables = [
            "chat_messages", "artifacts", "sources", "projects", 
            "categories", "otps", "users", "chunks", "summaries", "transcripts"
        ]

        for table in tables:
            try:
                if is_postgres:
                    # TRUNCATE is faster and handles cascades better in PG
                    db.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
                else:
                    db.execute(text(f"DELETE FROM {table}"))
                print(f"Purged {table}")
            except Exception as e:
                 # Ignore "no such table" or "relation does not exist" errors
                if "no such table" not in str(e) and "does not exist" not in str(e):
                    print(f"Error purging {table}: {e}")

        if is_sqlite:
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
