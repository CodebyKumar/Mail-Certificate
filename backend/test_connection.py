#!/usr/bin/env python3
"""Test MongoDB connection"""

import asyncio
import ssl
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv
import os
import sys

# Load environment variables
load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "certimailer")

async def test_connection():
    """Test MongoDB Atlas connection"""
    print("Testing MongoDB connection...")
    print(f"Database: {DATABASE_NAME}")
    print(f"URL: {MONGODB_URL[:50]}...")
    
    try:
        print(f"Python version: {sys.version}")
        print(f"SSL version: {ssl.OPENSSL_VERSION}")
        
        # Create custom SSL context
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED
        
        # Try different SSL configurations
        configs = [
            # Config 1: Disablrd with SSL context
            {
                "tls": True,
                "ssl_context": ssl_context,
                "serverSelectionTimeoutMS": 30000,
                "connectTimeoutMS": 30000,
                "socketTimeoutMS": 60000,
            },
            # Config 2: Disable SSL verification (for testing)
            {
                "tls": True,
                "tlsAllowInvalidCertificates": True,
                "tlsAllowInvalidHostnames": True,
                "serverSelectionTimeoutMS": 30000,
                "connectTimeoutMS": 30000,
                "socketTimeoutMS": 60000,
            },
            # Config 3: No TLS (fallback)
            {
                "ssl": False,
                "serverSelectionTimeoutMS": 30000,
                "connectTimeoutMS": 30000,
                "socketTimeoutMS": 60000,
            }
        ]
        
        for i, config in enumerate(configs, 1):
            print(f"\nTrying configuration {i}...")
            try:
                client = AsyncIOMotorClient(
                    MONGODB_URL,
                    server_api=ServerApi('1'),
                    **config
                )
                
                # Test connection
                print("Attempting to ping MongoDB...")
                await client.admin.command('ping')
                print("✓ Successfully connected to MongoDB!")
                
                # Test database access
                db = client[DATABASE_NAME]
                collections = await db.list_collection_names()
                print(f"✓ Database '{DATABASE_NAME}' accessible")
                print(f"✓ Collections found: {collections}")
                
                # Close connection
                client.close()
                print("✓ Connection closed successfully")
                return True
                
            except Exception as e:
                print(f"✗ Configuration {i} failed: {e}")
                if hasattr(client, 'close'):
                    client.close()
                continue
        
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        print(f"Error type: {type(e).__name__}")
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_connection())
    exit(0 if success else 1)