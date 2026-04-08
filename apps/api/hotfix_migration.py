from database import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_hotfix():
    """
    Manually add missing columns for existing databases/deployments.
    Useful when not using Alembic for simple deployments.
    """
    logger.info("Starting database hotfix migration...")
    
    with engine.connect() as conn:
        # We don't use with conn.begin() here to handle manual commits better for some dialects
        
        # 1. Add is_auto_created to projects
        try:
            # Postgres and SQLite handle ADD COLUMN differently sometimes, let's use standard SQL
            conn.execute(text("ALTER TABLE projects ADD is_auto_created BOOLEAN DEFAULT FALSE"))
            conn.commit()
            logger.info("Successfully added 'is_auto_created' to 'projects' table.")
        except Exception as e:
            conn.rollback()
            logger.info(f"Skipped 'is_auto_created' on 'projects' (might already exist): {e}")

        # 2. Add owner_id to categories (if missing)
        try:
            conn.execute(text("ALTER TABLE categories ADD owner_id VARCHAR(255) REFERENCES users(id)"))
            conn.commit()
            logger.info("Successfully added 'owner_id' to 'categories' table.")
        except Exception as e:
            conn.rollback()
            logger.info(f"Skipped 'owner_id' on 'categories' (might already exist): {e}")

        # 3. Add category_id to chat_messages (if missing)
        try:
            conn.execute(text("ALTER TABLE chat_messages ADD category_id VARCHAR(255) REFERENCES categories(id)"))
            conn.commit()
            logger.info("Successfully added 'category_id' to 'chat_messages' table.")
        except Exception as e:
            conn.rollback()
            logger.info(f"Skipped 'category_id' on 'chat_messages' (might already exist): {e}")

        # 4. Add category_id to curriculums (if missing)
        try:
            conn.execute(text("ALTER TABLE curriculums ADD category_id VARCHAR(255) REFERENCES categories(id)"))
            conn.commit()
            logger.info("Successfully added 'category_id' to 'curriculums' table.")
        except Exception as e:
            conn.rollback()
            logger.info(f"Skipped 'category_id' on 'curriculums' (might already exist): {e}")

    logger.info("Hotfix migration complete.")

if __name__ == "__main__":
    run_hotfix()
