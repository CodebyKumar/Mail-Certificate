"""Script to create the first admin user"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
import bcrypt

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.core.config import settings

MONGODB_URL = settings.MONGODB_URL
DATABASE_NAME = settings.DATABASE_NAME


def hash_password(password: str) -> str:
    """Hash a password using bcrypt directly"""
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


async def create_admin():
    """Create the first admin user"""
    
    print("\n=== CertMailer Admin Setup ===\n")
    
    # Get admin details
    name = input("Enter admin name: ").strip()
    email = input("Enter admin email: ").strip()
    password = input("Enter admin password: ").strip()
    
    if not all([name, email, password]):
        print("All fields are required!")
        return
    
    # Connect to MongoDB
    print(f"\nConnecting to MongoDB...")
    
    try:
        client = AsyncIOMotorClient(MONGODB_URL, server_api=ServerApi('1'))
        db = client[DATABASE_NAME]
        
        # Test connection
        await client.admin.command('ping')
        print("✓ Connected to MongoDB")
        
        # Check if admin already exists
        existing = await db.users.find_one({"email": email})
        if existing:
            print(f"\n⚠ User with email {email} already exists!")
            if existing.get("is_admin"):
                print("This user is already an admin.")
            else:
                update_to_admin = input("Make this user an admin? (y/n): ").lower()
                if update_to_admin == 'y':
                    await db.users.update_one(
                        {"email": email},
                        {"$set": {"is_admin": True, "updated_at": datetime.utcnow()}}
                    )
                    print("✓ User updated to admin!")
            return
        
        # Create admin user
        user_doc = {
            "name": name,
            "email": email,
            "password_hash": hash_password(password),
            "is_admin": True,
            "email_settings": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.users.insert_one(user_doc)
        print(f"\n✓ Admin user created successfully!")
        print(f"  ID: {result.inserted_id}")
        print(f"  Name: {name}")
        print(f"  Email: {email}")
        print(f"\nYou can now login at /admin with these credentials.")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(create_admin())
