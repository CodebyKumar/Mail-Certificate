"""Public feedback API endpoints - no authentication required"""

from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime

from app.core.database import get_collection
from app.core.auth import decrypt_app_password
from app.models.db_models import FeedbackSubmission, FeedbackQuestion
from app.services.certificate_service import CertificateService
from app.core.config import settings
from pydantic import BaseModel
from typing import List

router = APIRouter()


class FeedbackFormData(BaseModel):
    participant_name: str
    participant_email: str
    event_name: str
    questions: List[FeedbackQuestion]


@router.get("/{token}", response_model=FeedbackFormData)
async def get_feedback_form(token: str):
    """Get feedback form for a participant (public endpoint)"""
    feedback_col = get_collection("feedback")
    participants = get_collection("participants")
    events = get_collection("events")
    
    # Find feedback by token
    feedback = await feedback_col.find_one({"token": token})
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback link not found or expired")
    
    if feedback.get("submitted_at"):
        raise HTTPException(status_code=410, detail="Feedback already submitted")
    
    # Get participant
    participant = await participants.find_one({"_id": ObjectId(feedback["participant_id"])})
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Get event
    event = await events.find_one({"_id": ObjectId(feedback["event_id"])})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return FeedbackFormData(
        participant_name=participant["name"],
        participant_email=participant["email"],
        event_name=event["name"],
        questions=[FeedbackQuestion(**q) for q in event.get("feedback_questions", [])]
    )


@router.post("/{token}/submit")
async def submit_feedback(token: str, submission: FeedbackSubmission):
    """Submit feedback and receive certificate (public endpoint)"""
    feedback_col = get_collection("feedback")
    participants = get_collection("participants")
    events = get_collection("events")
    users = get_collection("users")
    
    # Find feedback by token
    feedback = await feedback_col.find_one({"token": token})
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback link not found or expired")
    
    if feedback.get("submitted_at"):
        raise HTTPException(status_code=410, detail="Feedback already submitted")
    
    # Get participant
    participant = await participants.find_one({"_id": ObjectId(feedback["participant_id"])})
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Get event
    event = await events.find_one({"_id": ObjectId(feedback["event_id"])})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get user (event owner) for email credentials
    user = await users.find_one({"_id": ObjectId(event["user_id"])})
    if not user or not user.get("email_settings"):
        raise HTTPException(status_code=500, detail="Event owner email not configured")
    
    # Save feedback answers
    await feedback_col.update_one(
        {"token": token},
        {
            "$set": {
                "answers": [a.model_dump() for a in submission.answers],
                "submitted_at": datetime.utcnow()
            }
        }
    )
    
    # Update participant status
    await participants.update_one(
        {"_id": ObjectId(feedback["participant_id"])},
        {
            "$set": {
                "status": "feedback_received",
                "feedback_submitted_at": datetime.utcnow()
            }
        }
    )
    
    # Generate and send certificate
    try:
        name = participant["name"]
        email = participant["email"]
        event_id = feedback["event_id"]
        
        sender_email = user["email_settings"]["email"]
        app_password = decrypt_app_password(user["email_settings"]["app_password_encrypted"])
        
        output_dir = settings.OUTPUT_DIR / event_id
        output_png = output_dir / "png"
        output_pdf = output_dir / "pdf"
        output_png.mkdir(parents=True, exist_ok=True)
        output_pdf.mkdir(parents=True, exist_ok=True)
        
        safe_name = name.replace("/", "_").replace("\\", "_")
        png_path = output_png / f"{safe_name}.png"
        pdf_path = output_pdf / f"{safe_name}.pdf"
        
        text_settings = event.get("text_settings", {})
        
        CertificateService.generate_certificate(
            event["template_path"],
            event["template_format"],
            name,
            0,
            text_settings.get("y_position", 500),
            text_settings.get("font_name", "Roboto"),
            text_settings.get("font_size", 60),
            text_settings.get("text_color", "#000000"),
            png_path,
            pdf_path
        )
        
        CertificateService.send_certificate(
            name,
            email,
            pdf_path,
            sender_email,
            app_password,
            event.get("email_subject", "Your Participation Certificate"),
            event.get("email_body", "Congratulations!")
        )
        
        # Update participant as certificate sent
        await participants.update_one(
            {"_id": ObjectId(feedback["participant_id"])},
            {
                "$set": {
                    "status": "certificate_sent",
                    "certificate_sent_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Thank you for your feedback! Your certificate has been sent to your email."
        }
        
    except Exception as e:
        # Update participant status to failed
        await participants.update_one(
            {"_id": ObjectId(feedback["participant_id"])},
            {
                "$set": {
                    "status": "failed",
                    "error_message": str(e)
                }
            }
        )
        raise HTTPException(status_code=500, detail=f"Failed to send certificate: {str(e)}")
