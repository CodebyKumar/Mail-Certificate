"""Send certificates and manage results API endpoints"""

import secrets
import logging
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from typing import List
import csv
import io

from app.core.database import get_collection
from app.core.auth import get_current_user, decrypt_app_password
from app.services.certificate_service import CertificateService
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


class SendOptions(BaseModel):
    send_all: bool = True  # True = send to all pending, False = resend failed only


@router.post("/{event_id}/send")
async def send_certificates(
    event_id: str,
    options: SendOptions = SendOptions(),
    current_user: dict = Depends(get_current_user)
):
    """Send certificates to participants"""
    events = get_collection("events")
    participants = get_collection("participants")
    users = get_collection("users")
    feedback_col = get_collection("feedback")
    
    # Get user
    user = await users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user or not user.get("email_settings"):
        raise HTTPException(status_code=400, detail="Email settings not configured")
    
    # Get event
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if not event.get("template_path"):
        raise HTTPException(status_code=400, detail="No template uploaded")
    
    # Get email credentials
    sender_email = user["email_settings"]["email"]
    app_password = decrypt_app_password(user["email_settings"]["app_password_encrypted"])
    
    # Determine which participants to process
    # send_all=True: send to ALL participants (pending, failed, and previously sent)
    # send_all=False: only send to pending participants
    query = {"event_id": event_id}
    if options.send_all:
        # Include all statuses for resending
        query["status"] = {"$in": ["pending", "failed", "feedback_sent", "certificate_sent"]}
    else:
        query["status"] = "pending"  # Only pending
    
    logger.info(f"Send query: {query}")
    logger.info(f"Event feedback_enabled: {event.get('feedback_enabled', True)}")
    
    cursor = participants.find(query)
    
    results = {
        "total": 0,
        "successful": 0,
        "failed": 0,
        "details": []
    }
    
    frontend_url = settings.FRONTEND_URL or "http://localhost:5173"
    
    async for participant in cursor:
        results["total"] += 1
        participant_id = str(participant["_id"])
        name = participant["name"]
        email = participant["email"]
        
        logger.info(f"Processing participant: {name} ({email}), feedback_enabled={event.get('feedback_enabled', True)}")
        
        try:
            if event.get("feedback_enabled", True):
                # Generate feedback token and send feedback link
                token = secrets.token_urlsafe(32)
                
                # Store feedback record
                await feedback_col.update_one(
                    {"participant_id": participant_id},
                    {
                        "$set": {
                            "participant_id": participant_id,
                            "event_id": event_id,
                            "token": token,
                            "answers": [],
                            "submitted_at": None
                        }
                    },
                    upsert=True
                )
                
                # Update participant with token
                await participants.update_one(
                    {"_id": ObjectId(participant_id)},
                    {
                        "$set": {
                            "feedback_token": token,
                            "status": "feedback_sent",
                            "error_message": None
                        }
                    }
                )
                
                # Send feedback link email
                feedback_url = f"{frontend_url}/feedback/{token}"
                
                # Get custom feedback email template or use default
                feedback_subject = event.get('feedback_email_subject', f"Complete Feedback to Receive Your Certificate - {event['name']}")
                feedback_body_template = event.get('feedback_email_body', 
                    "Dear {name},\n\nThank you for your participation in {event_name}!\n\nTo receive your certificate, please complete our quick feedback form:\n\n{feedback_url}\n\nYour certificate will be sent to this email address immediately after submitting the feedback.\n\nBest regards,\nThe Event Team"
                )
                
                # Replace placeholders in the email body
                feedback_email_body = feedback_body_template.replace('{name}', name).replace('{event_name}', event['name']).replace('{feedback_url}', feedback_url)
                
                # Replace placeholders in subject if any
                feedback_email_subject = feedback_subject.replace('{name}', name).replace('{event_name}', event['name'])
                
                CertificateService.send_email(
                    email,
                    sender_email,
                    app_password,
                    feedback_email_subject,
                    feedback_email_body
                )
                
                results["successful"] += 1
                results["details"].append({
                    "name": name,
                    "email": email,
                    "status": "feedback_sent"
                })
                
            else:
                # Direct certificate sending (no feedback)
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
                    0,  # x is always centered
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
                
                await participants.update_one(
                    {"_id": ObjectId(participant_id)},
                    {
                        "$set": {
                            "status": "certificate_sent",
                            "certificate_sent_at": datetime.utcnow(),
                            "error_message": None
                        }
                    }
                )
                
                results["successful"] += 1
                results["details"].append({
                    "name": name,
                    "email": email,
                    "status": "certificate_sent"
                })
                
        except Exception as e:
            await participants.update_one(
                {"_id": ObjectId(participant_id)},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": str(e)
                    }
                }
            )
            results["failed"] += 1
            results["details"].append({
                "name": name,
                "email": email,
                "status": "failed",
                "error": str(e)
            })
    
    # Update event status
    status = "completed" if results["failed"] == 0 else "sending"
    await events.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    return results


@router.get("/{event_id}/results")
async def get_results(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get sending results and statistics"""
    events = get_collection("events")
    participants = get_collection("participants")
    
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get statistics
    total = await participants.count_documents({"event_id": event_id})
    pending = await participants.count_documents({"event_id": event_id, "status": "pending"})
    feedback_sent = await participants.count_documents({"event_id": event_id, "status": "feedback_sent"})
    feedback_received = await participants.count_documents({"event_id": event_id, "status": "feedback_received"})
    certificate_sent = await participants.count_documents({"event_id": event_id, "status": "certificate_sent"})
    failed = await participants.count_documents({"event_id": event_id, "status": "failed"})
    
    return {
        "event_name": event["name"],
        "feedback_enabled": event.get("feedback_enabled", True),
        "statistics": {
            "total": total,
            "pending": pending,
            "feedback_sent": feedback_sent,
            "feedback_received": feedback_received,
            "certificate_sent": certificate_sent,
            "failed": failed
        }
    }


@router.get("/{event_id}/results/download")
async def download_results(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Download results as CSV"""
    from fastapi.responses import StreamingResponse
    
    events = get_collection("events")
    participants = get_collection("participants")
    
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Status", "Feedback Submitted", "Certificate Sent", "Error"])
    
    cursor = participants.find({"event_id": event_id}).sort("name", 1)
    async for p in cursor:
        writer.writerow([
            p["name"],
            p["email"],
            p.get("status", "pending"),
            p.get("feedback_submitted_at", ""),
            p.get("certificate_sent_at", ""),
            p.get("error_message", "")
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=results_{event_id}.csv"}
    )


@router.get("/{event_id}/feedback/download")
async def download_feedback(
    event_id: str,
    anonymous: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Download feedback responses as CSV (optionally anonymous)"""
    from fastapi.responses import StreamingResponse
    
    events = get_collection("events")
    participants = get_collection("participants")
    feedback_col = get_collection("feedback")
    
    event = await events.find_one({
        "_id": ObjectId(event_id),
        "user_id": current_user["user_id"]
    })
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    questions = event.get("feedback_questions", [])
    
    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    if anonymous:
        header = ["Response #", "Submitted At"]
    else:
        header = ["Name", "Email", "Submitted At"]
    
    for q in questions:
        header.append(q.get("question", "Question"))
    writer.writerow(header)
    
    # Data
    cursor = feedback_col.find({"event_id": event_id, "submitted_at": {"$ne": None}})
    response_num = 1
    async for fb in cursor:
        if anonymous:
            row = [
                f"Response {response_num}",
                fb.get("submitted_at", "")
            ]
        else:
            participant = await participants.find_one({"_id": ObjectId(fb["participant_id"])})
            if not participant:
                continue
            row = [
                participant["name"],
                participant["email"],
                fb.get("submitted_at", "")
            ]
        
        # Map answers to questions
        answers_map = {a["question_id"]: a["answer"] for a in fb.get("answers", [])}
        for q in questions:
            row.append(answers_map.get(q["id"], ""))
        
        writer.writerow(row)
        response_num += 1
    
    output.seek(0)
    
    filename = f"feedback_{'anonymous_' if anonymous else ''}{event_id}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
