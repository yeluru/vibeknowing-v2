"""Initialize database and add summary column"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import engine
from models import Base

# Create all tables
Base.metadata.create_all(bind=engine)
print("✓ Database tables created successfully")

# Check if summary column exists and add if needed
from sqlalchemy import inspect, text

inspector = inspect(engine)
columns = [col['name'] for col in inspector.get_columns('sources')]

if 'summary' not in columns:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE sources ADD COLUMN summary TEXT"))
        conn.commit()
    print("✓ Added 'summary' column to sources table")
else:
    print("✓ Column 'summary' already exists")

print("\n✅ Database is ready!")
