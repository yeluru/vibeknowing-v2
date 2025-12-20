from database import SessionLocal
from models import Project, User

def reassign_projects():
    db = SessionLocal()
    try:
        # Get users
        admin = db.query(User).filter(User.email == "admin@localhost").first()
        target_user = db.query(User).filter(User.email == "raviyeluru@yahoo.com").first()

        if not admin or not target_user:
            print("Users not found.")
            return

        print(f"Transferring projects from {admin.email} ({admin.id}) to {target_user.email} ({target_user.id})...")

        # Find admin projects
        projects = db.query(Project).filter(Project.owner_id == admin.id).all()
        count = 0
        for p in projects:
            p.owner_id = target_user.id
            count += 1
        
        db.commit()
        print(f"Successfully transferred {count} projects.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reassign_projects()
