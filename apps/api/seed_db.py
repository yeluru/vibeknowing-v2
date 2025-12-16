import sys
from pathlib import Path
from passlib.context import CryptContext

sys.path.insert(0, str(Path(__file__).parent))

from database import engine, SessionLocal
from models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed():
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.email == "admin@localhost").first()
        if not admin:
            print("Creating admin user...")
            hashed_password = pwd_context.hash("admin")
            new_user = User(
                email="admin@localhost",
                hashed_password=hashed_password
            )
            db.add(new_user)
            db.commit()
            print("Admin user created (admin@localhost / admin)")
        else:
            print("Admin user already exists.")
    except Exception as e:
        print(f"Error seeding DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
