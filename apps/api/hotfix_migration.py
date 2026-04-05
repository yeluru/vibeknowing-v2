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
        with conn.begin():
            # 1. Add is_auto_created to projects
            try:
                conn.execute(text("ALTER TABLE projects ADD COLUMN is_auto_created BOOLEAN DEFAULT FALSE"))
                logger.info("Successfully added 'is_auto_created' to 'projects' table.")
            except Exception as e:
                # If column already exists, it will throw an error
                logger.info(f"Skipped 'is_auto_created' on 'projects' (might already exist): {e}")

            # 2. Add owner_id to categories (if missing)
            try:
                conn.execute(text("ALTER TABLE categories ADD COLUMN owner_id TEXT REFERENCES users(id)"))
                logger.info("Successfully added 'owner_id' to 'categories' table.")
            except Exception as e:
                logger.info(f"Skipped 'owner_id' on 'categories' (might already exist): {e}")

            # 3. Add category_id to chat_messages (if missing)
            try:
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN category_id TEXT REFERENCES categories(id)"))
                logger.info("Successfully added 'category_id' to 'chat_messages' table.")
            except Exception as e:
                logger.info(f"Skipped 'category_id' on 'chat_messages' (might already exist): {e}")

    logger.info("Hotfix migration complete.")

if __name__ == "__main__":
    run_hotfix()
