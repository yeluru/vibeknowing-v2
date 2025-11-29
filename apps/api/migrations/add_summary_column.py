"""Add summary column to sources table"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import engine
from sqlalchemy import text

def upgrade():
    """Add summary column to sources table"""
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='sources' AND column_name='summary'
        """))
        
        if result.fetchone() is None:
            # Add the column
            conn.execute(text("ALTER TABLE sources ADD COLUMN summary TEXT"))
            conn.commit()
            print("✓ Added 'summary' column to sources table")
        else:
            print("✓ Column 'summary' already exists")

if __name__ == "__main__":
    upgrade()
