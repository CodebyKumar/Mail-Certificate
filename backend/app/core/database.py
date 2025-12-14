"""MongoDB database connection and configuration"""

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
from app.core.config import settings

# MongoDB connection from settings
MONGODB_URL = settings.MONGODB_URL
DATABASE_NAME = settings.DATABASE_NAME

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()


async def connect_to_mongo():
    """Connect to MongoDB Atlas"""
    try:
        db.client = AsyncIOMotorClient(
            MONGODB_URL,
            server_api=ServerApi('1')
        )
        db.db = db.client[DATABASE_NAME]
        
        # Verify connection
        await db.client.admin.command('ping')
        print("✓ Connected to MongoDB Atlas")
        
        # Create indexes
        await create_indexes()
        
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client:
        db.client.close()
        print("✓ MongoDB connection closed")


async def create_indexes():
    """Create database indexes for better performance"""
    # Users collection
    await db.db.users.create_index("email", unique=True)
    
    # Events collection
    await db.db.events.create_index("user_id")
    await db.db.events.create_index("created_at")
    
    # Participants collection
    await db.db.participants.create_index("event_id")
    await db.db.participants.create_index("email")
    await db.db.participants.create_index([("event_id", 1), ("email", 1)], unique=True)
    
    # Feedback collection
    await db.db.feedback.create_index("token", unique=True)
    await db.db.feedback.create_index("participant_id")
    
    print("✓ Database indexes created")


def get_database():
    """Get database instance"""
    return db.db


def get_collection(name: str):
    """Get a specific collection"""
    return db.db[name]
