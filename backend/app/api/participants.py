"""Participants API endpoints - manage event participants"""

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from bson import ObjectId
from datetime import datetime
from typing import List
import pandas as pd
import io

from app.core.database import get_collection
from app.core.auth import get_current_user
from app.models.db_models import ParticipantCreate, ParticipantResponse

router = APIRouter()


@router.get("/{event_id}/participants", response_model=List[ParticipantResponse])
async def list_participants(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List all participants for an event"""
    events = get_collection("events")
    participants = get_collection("participants")
    
    # Verify event ownership
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    cursor = participants.find({"event_id": event_id}).sort("name", 1)
    result = []
    
    async for p in cursor:
        result.append(ParticipantResponse(
            id=str(p["_id"]),
            name=p["name"],
            email=p["email"],
            status=p.get("status", "pending"),
            feedback_submitted_at=p.get("feedback_submitted_at"),
            certificate_sent_at=p.get("certificate_sent_at"),
            error_message=p.get("error_message")
        ))
    
    return result


@router.post("/{event_id}/participants", response_model=ParticipantResponse)
async def add_participant(
    event_id: str,
    data: ParticipantCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a single participant to an event"""
    events = get_collection("events")
    participants = get_collection("participants")
    
    # Verify event ownership
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check for duplicate
    existing = await participants.find_one({
        "event_id": event_id,
        "email": data.email.lower()
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Participant with this email already exists")
    
    participant_doc = {
        "event_id": event_id,
        "name": data.name,
        "email": data.email.lower(),
        "status": "pending",
        "feedback_token": None,
        "feedback_submitted_at": None,
        "certificate_sent_at": None,
        "error_message": None,
        "created_at": datetime.utcnow()
    }
    
    result = await participants.insert_one(participant_doc)
    
    return ParticipantResponse(
        id=str(result.inserted_id),
        name=data.name,
        email=data.email.lower(),
        status="pending"
    )


@router.post("/{event_id}/participants/upload")
async def upload_participants(
    event_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload participants from Excel file"""
    events = get_collection("events")
    participants = get_collection("participants")
    
    # Verify event ownership
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Validate file type
    if not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported")
    
    # Read Excel file
    try:
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read Excel file: {str(e)}")
    
    # Validate columns
    df.columns = df.columns.str.strip()
    if 'Name' not in df.columns or 'Email' not in df.columns:
        raise HTTPException(
            status_code=400,
            detail="Excel file must have 'Name' and 'Email' columns"
        )
    
    # Process participants
    added = 0
    skipped = 0
    errors = []
    
    for _, row in df.iterrows():
        name = str(row["Name"]).strip()
        email = str(row["Email"]).strip().lower()
        
        if not name or not email or "@" not in email:
            errors.append(f"Invalid data: {name} - {email}")
            continue
        
        # Check for duplicate
        existing = await participants.find_one({
            "event_id": event_id,
            "email": email
        })
        
        if existing:
            skipped += 1
            continue
        
        participant_doc = {
            "event_id": event_id,
            "name": name,
            "email": email,
            "status": "pending",
            "feedback_token": None,
            "feedback_submitted_at": None,
            "certificate_sent_at": None,
            "error_message": None,
            "created_at": datetime.utcnow()
        }
        
        await participants.insert_one(participant_doc)
        added += 1
    
    total_count = await participants.count_documents({"event_id": event_id})
    
    return {
        "success": True,
        "added": added,
        "skipped": skipped,
        "errors": errors[:10],  # Limit error messages
        "total_count": total_count
    }


@router.delete("/{event_id}/participants/{participant_id}")
async def delete_participant(
    event_id: str,
    participant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a participant"""
    events = get_collection("events")
    participants = get_collection("participants")
    
    # Verify event ownership
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    result = await participants.delete_one({
        "_id": ObjectId(participant_id),
        "event_id": event_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    return {"success": True, "message": "Participant deleted"}


@router.delete("/{event_id}/participants")
async def delete_all_participants(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete all participants from an event"""
    events = get_collection("events")
    participants = get_collection("participants")
    feedback = get_collection("feedback")
    
    # Verify event ownership
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Delete feedback first
    await feedback.delete_many({"event_id": event_id})
    
    result = await participants.delete_many({"event_id": event_id})
    
    return {
        "success": True,
        "deleted_count": result.deleted_count
    }
