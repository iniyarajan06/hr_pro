import os
import sys

# Add the backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models.user import User
from app.core.security import get_password_hash

def seed_admin():
    db = SessionLocal()
    try:
        admin_email = "admin@example.com"
        password = "adminpassword123"
        user = db.query(User).filter(User.email == admin_email).first()
        if not user:
            print(f"Creating admin user with email {admin_email}")
            user = User(
                name="System Admin",
                email=admin_email,
                password_hash=get_password_hash(password),
                role="admin"
            )
            db.add(user)
            db.commit()
            print(f"Admin created: {admin_email} / {password}")
        else:
            print(f"Admin already exists: {admin_email}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
