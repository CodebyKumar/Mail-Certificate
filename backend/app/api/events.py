"""Events API endpoints - manage certificate events"""

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from bson import ObjectId
from datetime import datetime
from typing import List, Optional
import json

from app.core.database import get_collection
from app.core.auth import get_current_user
from app.models.db_models import (
    EventCreate,
    EventUpdate,
    EventResponse,
    TextSettings,
    FeedbackQuestion
)
from app.services.template_service import TemplateService
from app.core.config import settings

router = APIRouter()


async def get_event_stats(event_id: str) -> dict:
    """Get participant statistics for an event"""
    participants = get_collection("participants")
    
    total = await participants.count_documents({"event_id": event_id})
    sent = await participants.count_documents({
        "event_id": event_id,
        "status": "certificate_sent"
    })
    feedback = await participants.count_documents({
        "event_id": event_id,
        "feedback_submitted_at": {"$ne": None}
    })
    
    return {
        "participant_count": total,
        "sent_count": sent,
        "feedback_count": feedback
    }


@router.get("/", response_model=List[EventResponse])
async def list_events(current_user: dict = Depends(get_current_user)):
    """List all events for current user"""
    events = get_collection("events")
    
    cursor = events.find({"user_id": current_user["user_id"]}).sort("created_at", -1)
    result = []
    
    async for event in cursor:
        stats = await get_event_stats(str(event["_id"]))
        result.append(EventResponse(
            id=str(event["_id"]),
            name=event["name"],
            description=event.get("description"),
            has_template=event.get("template_path") is not None,
            text_settings=TextSettings(**event.get("text_settings", {})),
            feedback_enabled=event.get("feedback_enabled", True),
            feedback_questions=[FeedbackQuestion(**q) for q in event.get("feedback_questions", [])],
            email_subject=event.get("email_subject", "Your Participation Certificate"),
            email_body=event.get("email_body", ""),
            status=event.get("status", "draft"),
            participant_count=stats["participant_count"],
            sent_count=stats["sent_count"],
            feedback_count=stats["feedback_count"],
            created_at=event["created_at"],
            updated_at=event["updated_at"]
        ))
    
    return result


@router.post("/", response_model=EventResponse)
async def create_event(
    event_data: EventCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new event"""
    events = get_collection("events")
    
    event_doc = {
        "user_id": current_user["user_id"],
        "name": event_data.name,
        "description": event_data.description,
        "template_path": None,
        "template_format": None,
        "template_width": None,
        "template_height": None,
        "text_settings": {
            "y_position": 500,
            "font_name": "Roboto",
            "font_size": 60,
            "text_color": "#000000"
        },
        "feedback_enabled": True,
        "feedback_questions": [
            {"id": "1", "question": "How would you rate the overall event?", "type": "rating", "required": True},
            {"id": "2", "question": "What did you like most about the event?", "type": "text", "required": False}
        ],
        "email_subject": "Your Participation Certificate",
        "email_body": "Dear {name},\n\nCongratulations! Please find attached your participation certificate.\n\nBest regards",
        "status": "draft",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await events.insert_one(event_doc)
    event_id = str(result.inserted_id)
    
    return EventResponse(
        id=event_id,
        name=event_data.name,
        description=event_data.description,
        has_template=False,
        text_settings=TextSettings(**event_doc["text_settings"]),
        feedback_enabled=True,
        feedback_questions=[FeedbackQuestion(**q) for q in event_doc["feedback_questions"]],
        email_subject=event_doc["email_subject"],
        email_body=event_doc["email_body"],
        status="draft",
        participant_count=0,
        sent_count=0,
        feedback_count=0,
        created_at=event_doc["created_at"],
        updated_at=event_doc["updated_at"]
    )


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific event"""
    events = get_collection("events")
    
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    stats = await get_event_stats(event_id)
    
    return EventResponse(
        id=str(event["_id"]),
        name=event["name"],
        description=event.get("description"),
        has_template=event.get("template_path") is not None,
        text_settings=TextSettings(**event.get("text_settings", {})),
        feedback_enabled=event.get("feedback_enabled", True),
        feedback_questions=[FeedbackQuestion(**q) for q in event.get("feedback_questions", [])],
        email_subject=event.get("email_subject", "Your Participation Certificate"),
        email_body=event.get("email_body", ""),
        status=event.get("status", "draft"),
        participant_count=stats["participant_count"],
        sent_count=stats["sent_count"],
        feedback_count=stats["feedback_count"],
        created_at=event["created_at"],
        updated_at=event["updated_at"]
    )


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    update: EventUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an event"""
    events = get_collection("events")
    
    # Build update document
    update_doc = {"updated_at": datetime.utcnow()}
    
    if update.name is not None:
        update_doc["name"] = update.name
    if update.description is not None:
        update_doc["description"] = update.description
    if update.text_settings is not None:
        update_doc["text_settings"] = update.text_settings.model_dump()
    if update.feedback_questions is not None:
        update_doc["feedback_questions"] = [q.model_dump() for q in update.feedback_questions]
    if update.email_subject is not None:
        update_doc["email_subject"] = update.email_subject
    if update.email_body is not None:
        update_doc["email_body"] = update.email_body
    
    update_doc["feedback_enabled"] = update.feedback_enabled
    
    result = await events.update_one(
        {"_id": ObjectId(event_id), "user_id": current_user["user_id"]},
        {"$set": update_doc}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return await get_event(event_id, current_user)


@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an event and all related data"""
    events = get_collection("events")
    participants = get_collection("participants")
    feedback = get_collection("feedback")
    
    # Verify ownership
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Delete related data
    await feedback.delete_many({"event_id": event_id})
    await participants.delete_many({"event_id": event_id})
    await events.delete_one({"_id": ObjectId(event_id)})
    
    return {"success": True, "message": "Event deleted"}


@router.post("/{event_id}/template")
async def upload_template(
    event_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload certificate template for an event"""
    events = get_collection("events")
    
    # Verify ownership
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Validate file - accept common image formats
    allowed_extensions = ('.png', '.jpg', '.jpeg', '.pdf')
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(status_code=400, detail="Only PNG, JPG, and PDF files are supported")
    
    # Process template
    result = await TemplateService.process_template(file, event_id)
    
    # Update event
    await events.update_one(
        {"_id": ObjectId(event_id)},
        {
            "$set": {
                "template_path": result["template_path"],
                "template_format": result["template_format"],
                "template_width": result["width"],
                "template_height": result["height"],
                "text_settings.y_position": result["height"] // 2,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "preview_url": result["preview_url"],
        "width": result["width"],
        "height": result["height"]
    }


@router.get("/{event_id}/template")
async def get_template(
    event_id: str
):
    """Get template image file (no auth required - used by browser Image loading)"""
    from fastapi.responses import FileResponse
    from pathlib import Path
    import mimetypes
    
    events = get_collection("events")
    
    # Just check if event exists (no user check since Image() can't send auth)
    event = await events.find_one({
        "_id": ObjectId(event_id)
    })
    
    if not event or not event.get("template_path"):
        raise HTTPException(status_code=404, detail="Template not found")
    
    template_path = Path(event["template_path"])
    
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template file not found")
    
    # Detect media type based on file extension
    media_type, _ = mimetypes.guess_type(str(template_path))
    if not media_type:
        media_type = "image/png"
    
    return FileResponse(
        template_path,
        media_type=media_type,
        headers={"Cache-Control": "no-cache"}
    )


@router.get("/{event_id}/template/preview")
async def get_template_preview(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get template preview URL"""
    events = get_collection("events")
    
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event or not event.get("template_path"):
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "preview_url": f"/static/previews/{event_id}_preview.png",
        "width": event.get("template_width"),
        "height": event.get("template_height")
    }
