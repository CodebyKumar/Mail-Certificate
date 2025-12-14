"""Authentication utilities - JWT tokens and password hashing"""

from datetime import datetime, timedelta
from typing import Optional
import bcrypt
import jwt
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from cryptography.fernet import Fernet

from app.core.config import settings

# JWT settings
JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = settings.JWT_ALGORITHM
JWT_EXPIRATION_HOURS = settings.JWT_EXPIRY_DAYS * 24

# Encryption for app passwords - use settings to get from .env
ENCRYPTION_KEY = settings.ENCRYPTION_KEY
if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY must be set in .env file! Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"")
fernet = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

# Security scheme
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt (truncated to 72 bytes)"""
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash (truncated to 72 bytes)"""
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def encrypt_app_password(password: str) -> str:
    """Encrypt an app password for storage"""
    return fernet.encrypt(password.encode()).decode()


def decrypt_app_password(encrypted: str) -> str:
    """Decrypt an app password"""
    return fernet.decrypt(encrypted.encode()).decode()


def create_access_token(user_id: str, email: str, is_admin: bool = False) -> str:
    """Create a JWT access token"""
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "is_admin": is_admin,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = decode_token(token)
    
    return {
        "user_id": payload["sub"],
        "email": payload["email"],
        "is_admin": payload.get("is_admin", False)
    }


async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Require admin privileges"""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
