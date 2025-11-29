import sqlite3
import uuid
from datetime import datetime

def migrate():
    print("Starting migration...")
    conn = sqlite3.connect("../vibeknowing.db")
    cursor = conn.cursor()
    
    # 1. Create Categories table
    print("Creating categories table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR PRIMARY KEY,
        name VARCHAR,
        owner_id VARCHAR REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_categories_name ON categories (name)")
    
    # 2. Add column to projects table
    print("Adding category_id to projects...")
    try:
        cursor.execute("ALTER TABLE projects ADD COLUMN category_id VARCHAR REFERENCES categories(id)")
        print("Column added successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column already exists.")
        else:
            print(f"Error adding column: {e}")
            
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
