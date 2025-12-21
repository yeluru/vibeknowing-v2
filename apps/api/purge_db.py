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
                # Use a nested transaction (savepoint) for each iteration
                # effectively isolating errors
                with db.begin_nested():
                    if is_postgres:
                        db.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                    else:
                        db.execute(text(f"DROP TABLE IF EXISTS {table}"))
                print(f"Dropped {table}")
            except Exception as e:
                # If error occurs, the nested transaction rolls back automatically
                # Check for "does not exist" errors to ignore them
                error_str = str(e).lower()
                if "no such table" not in error_str and "does not exist" not in error_str:
                    print(f"Error purging {table}: {e}")

        if is_sqlite:
            db.execute(text("PRAGMA foreign_keys = ON"))
        
        db.commit()
        
        # CRITICAL: Recreate tables because we dropped them!
        print("Recreating tables...")
        Base.metadata.create_all(bind=engine)
        
        print("✅ Database purged and schema recreated successfully.")
        
    except Exception as e:
        print(f"❌ Error purging database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    purge_database()
