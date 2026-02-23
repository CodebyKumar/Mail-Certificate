"""MongoDB database connection and configuration"""

import ssl
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
    # Optionally skip DB connection (useful for local preview without Atlas)
    if getattr(settings, "SKIP_DB_ON_STARTUP", False):
        print("! Skipping MongoDB connection on startup (SKIP_DB_ON_STARTUP=True)")
        db.client = None
        db.db = None
        return

    # Try to connect with a few retries to tolerate transient network/TLS issues
    max_attempts = 3
    backoff_seconds = 2
    last_error = None

    for attempt in range(1, max_attempts + 1):
        try:
            db.client = AsyncIOMotorClient(
                MONGODB_URL,
                server_api=ServerApi('1'),
                tls=True,
                tlsAllowInvalidCertificates=True,
                tlsAllowInvalidHostnames=True,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                socketTimeoutMS=45000,
                maxPoolSize=10,
                minPoolSize=1,
                maxIdleTimeMS=30000
            )
            db.db = db.client[DATABASE_NAME]

            # Verify connection
            await db.client.admin.command('ping')
            print("✓ Connected to MongoDB Atlas")

            # Create indexes
            await create_indexes()
            return

        except Exception as e:
            last_error = e
            print(f"Attempt {attempt}/{max_attempts} - Failed to connect to MongoDB: {e}")
            if attempt < max_attempts:
                import asyncio
                await asyncio.sleep(backoff_seconds)
                backoff_seconds *= 2

    # All attempts failed - don't crash the whole app. Leave db.client/db.db as None.
    print(f"✗ All attempts to connect to MongoDB failed. Proceeding without DB. Last error: {last_error}")
    db.client = None
    db.db = None


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
    # Return the DB instance (may be None if not connected)
    return db.db


def get_collection(name: str):
    """Get a specific collection"""
    if db.db is None:
        # Return a dummy collection that raises at call time to avoid import-time errors
        class _MissingDBCollection:
            def __init__(self, coll_name: str):
                self._coll_name = coll_name

            def __getattr__(self, item):
                async def _missing(*args, **kwargs):
                    raise RuntimeError(f"Database is not connected. Cannot perform '{item}' on collection '{self._coll_name}'")
                return _missing

        return _MissingDBCollection(name)

    return db.db[name]
