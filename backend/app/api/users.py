"""User profile and settings API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from datetime import datetime

from app.core.database import get_collection
from app.core.auth import (
    get_current_user,
    encrypt_app_password,
    decrypt_app_password,
    hash_password,
    verify_password
)
from app.models.db_models import UserResponse, EmailSettings
from pydantic import BaseModel

router = APIRouter()


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class ProfileUpdate(BaseModel):
    name: str


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    users = get_collection("users")
    
    user = await users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        is_admin=user.get("is_admin", False),
        has_email_settings=user.get("email_settings") is not None,
        created_at=user["created_at"]
    )


@router.put("/me", response_model=UserResponse)
async def update_profile(
    update: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile"""
    users = get_collection("users")
    
    await users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$set": {"name": update.name, "updated_at": datetime.utcnow()}}
    )
    
    user = await users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    return UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        is_admin=user.get("is_admin", False),
        has_email_settings=user.get("email_settings") is not None,
        created_at=user["created_at"]
    )


@router.post("/me/change-password")
async def change_password(
    data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    users = get_collection("users")
    
    user = await users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(data.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    await users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {
            "$set": {
                "password_hash": hash_password(data.new_password),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"success": True, "message": "Password changed successfully"}


# ============ EMAIL SETTINGS ============

@router.get("/email-settings")
async def get_email_settings(current_user: dict = Depends(get_current_user)):
    """Get user's email settings (masked password)"""
    users = get_collection("users")
    
    user = await users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    settings = user.get("email_settings")
    if not settings:
        return {"configured": False}
    
    return {
        "configured": True,
        "email": settings["email"],
        "app_password_masked": "••••••••••••••••"
    }


@router.post("/email-settings")
async def save_email_settings(
    settings: EmailSettings,
    current_user: dict = Depends(get_current_user)
):
    """Save email settings (Gmail + App Password)"""
    users = get_collection("users")
    
    # Encrypt the app password before storing
    encrypted_password = encrypt_app_password(settings.app_password)
    
    await users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {
            "$set": {
                "email_settings": {
                    "email": settings.email,
                    "app_password_encrypted": encrypted_password
                },
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"success": True, "message": "Email settings saved successfully"}


@router.delete("/email-settings")
async def delete_email_settings(current_user: dict = Depends(get_current_user)):
    """Delete email settings"""
    users = get_collection("users")
    
    await users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {
            "$set": {
                "email_settings": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"success": True, "message": "Email settings removed"}


@router.post("/email-settings/test")
async def test_email_settings(current_user: dict = Depends(get_current_user)):
    """Test email settings by sending a test email"""
    import smtplib
    from email.message import EmailMessage
    
    users = get_collection("users")
    user = await users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    if not user or not user.get("email_settings"):
        raise HTTPException(status_code=400, detail="Email settings not configured")
    
    email = user["email_settings"]["email"]
    app_password = decrypt_app_password(user["email_settings"]["app_password_encrypted"])
    
    try:
        msg = EmailMessage()
        msg["Subject"] = "CertMailer - Email Test"
        msg["From"] = email
        msg["To"] = email
        msg.set_content("This is a test email from CertMailer. Your email settings are working correctly!")
        
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(email, app_password)
            smtp.send_message(msg)
        
        return {"success": True, "message": f"Test email sent to {email}"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Email test failed: {str(e)}")
