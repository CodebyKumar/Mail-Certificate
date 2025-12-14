"""Authentication API endpoints"""

from fastapi import APIRouter, HTTPException, status
from bson import ObjectId
from datetime import datetime

from app.core.database import get_collection
from app.core.auth import (
    hash_password, 
    verify_password, 
    create_access_token,
    encrypt_app_password,
    decrypt_app_password
)
from app.models.db_models import (
    UserCreate, 
    UserLogin, 
    UserResponse, 
    Token,
    EmailSettings
)

router = APIRouter()


@router.post("/signup", response_model=Token)
async def signup(user_data: UserCreate):
    """Register a new user"""
    users = get_collection("users")
    
    # Check if email already exists
    existing = await users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user document
    user_doc = {
        "name": user_data.name,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "is_admin": False,
        "email_settings": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create token
    token = create_access_token(user_id, user_data.email, False)
    
    return Token(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=user_data.name,
            email=user_data.email,
            is_admin=False,
            has_email_settings=False,
            created_at=user_doc["created_at"]
        )
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login with email and password"""
    users = get_collection("users")
    
    user = await users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    user_id = str(user["_id"])
    token = create_access_token(user_id, user["email"], user.get("is_admin", False))
    
    return Token(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=user["name"],
            email=user["email"],
            is_admin=user.get("is_admin", False),
            has_email_settings=user.get("email_settings") is not None,
            created_at=user["created_at"]
        )
    )


@router.post("/admin-login", response_model=Token)
async def admin_login(credentials: UserLogin):
    """Admin login - requires admin privileges"""
    users = get_collection("users")
    
    user = await users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    user_id = str(user["_id"])
    token = create_access_token(user_id, user["email"], True)
    
    return Token(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=user["name"],
            email=user["email"],
            is_admin=True,
            has_email_settings=user.get("email_settings") is not None,
            created_at=user["created_at"]
        )
    )
