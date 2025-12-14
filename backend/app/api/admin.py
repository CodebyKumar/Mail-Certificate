"""Admin API endpoints - for admin users only"""

from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from typing import List

from app.core.database import get_collection
from app.core.auth import get_admin_user, hash_password
from pydantic import BaseModel, EmailStr

router = APIRouter()


class UserStats(BaseModel):
    total_users: int
    total_events: int
    total_participants: int
    total_feedback: int
    total_certificates_sent: int


class AdminUserView(BaseModel):
    id: str
    name: str
    email: str
    is_admin: bool
    has_email_settings: bool
    event_count: int
    total_sent: int
    created_at: datetime


class CreateAdmin(BaseModel):
    name: str
    email: EmailStr
    password: str


@router.get("/stats", response_model=UserStats)
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    """Get overall platform statistics"""
    users = get_collection("users")
    events = get_collection("events")
    participants = get_collection("participants")
    feedback = get_collection("feedback")
    
    total_users = await users.count_documents({})
    total_events = await events.count_documents({})
    total_participants = await participants.count_documents({})
    total_feedback = await feedback.count_documents({"submitted_at": {"$ne": None}})
    total_certs = await participants.count_documents({"status": "certificate_sent"})
    
    return UserStats(
        total_users=total_users,
        total_events=total_events,
        total_participants=total_participants,
        total_feedback=total_feedback,
        total_certificates_sent=total_certs
    )


@router.get("/users", response_model=List[AdminUserView])
async def list_all_users(admin: dict = Depends(get_admin_user)):
    """List all users (admin only)"""
    users = get_collection("users")
    events = get_collection("events")
    participants = get_collection("participants")
    
    cursor = users.find({}).sort("created_at", -1)
    result = []
    
    async for user in cursor:
        user_id = str(user["_id"])
        
        # Get user's events
        user_events = await events.find({"user_id": user_id}).to_list(None)
        event_ids = [str(e["_id"]) for e in user_events]
        
        # Count certificates sent for this user's events
        total_sent = 0
        if event_ids:
            total_sent = await participants.count_documents({
                "event_id": {"$in": event_ids},
                "status": {"$in": ["certificate_sent", "feedback_sent"]}
            })
        
        result.append(AdminUserView(
            id=user_id,
            name=user["name"],
            email=user["email"],
            is_admin=user.get("is_admin", False),
            has_email_settings=user.get("email_settings") is not None,
            event_count=len(event_ids),
            total_sent=total_sent,
            created_at=user["created_at"]
        ))
    
    return result


@router.post("/users/admin")
async def create_admin_user(data: CreateAdmin, admin: dict = Depends(get_admin_user)):
    """Create a new admin user"""
    users = get_collection("users")
    
    existing = await users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "is_admin": True,
        "email_settings": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await users.insert_one(user_doc)
    
    return {"success": True, "user_id": str(result.inserted_id)}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a user and all their data"""
    users = get_collection("users")
    events = get_collection("events")
    participants = get_collection("participants")
    feedback = get_collection("feedback")
    
    # Prevent self-deletion
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = await users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all user's events
    user_events = await events.find({"user_id": user_id}).to_list(None)
    event_ids = [str(e["_id"]) for e in user_events]
    
    # Delete all related data
    for event_id in event_ids:
        await feedback.delete_many({"event_id": event_id})
        await participants.delete_many({"event_id": event_id})
    
    await events.delete_many({"user_id": user_id})
    await users.delete_one({"_id": ObjectId(user_id)})
    
    return {"success": True, "message": "User and all data deleted"}


@router.put("/users/{user_id}/toggle-admin")
async def toggle_admin(user_id: str, admin: dict = Depends(get_admin_user)):
    """Toggle admin status for a user"""
    users = get_collection("users")
    
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot modify your own admin status")
    
    user = await users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_admin", False)
    
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_admin": new_status, "updated_at": datetime.utcnow()}}
    )
    
    return {"success": True, "is_admin": new_status}


@router.get("/events")
async def list_all_events(admin: dict = Depends(get_admin_user)):
    """List all events from all users"""
    events = get_collection("events")
    users = get_collection("users")
    participants = get_collection("participants")
    
    cursor = events.find({}).sort("created_at", -1).limit(100)
    result = []
    
    async for event in cursor:
        user = await users.find_one({"_id": ObjectId(event["user_id"])})
        event_id = str(event["_id"])
        participant_count = await participants.count_documents({"event_id": event_id})
        sent_count = await participants.count_documents({
            "event_id": event_id,
            "status": "certificate_sent"
        })
        
        result.append({
            "id": event_id,
            "name": event["name"],
            "user_name": user["name"] if user else "Unknown",
            "user_email": user["email"] if user else "Unknown",
            "status": event.get("status", "draft"),
            "participant_count": participant_count,
            "sent_count": sent_count,
            "created_at": event["created_at"]
        })
    
    return result
