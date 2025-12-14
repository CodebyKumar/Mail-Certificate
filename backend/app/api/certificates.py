"""Certificate API endpoints"""

import secrets
import json
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from app.models.schemas import (
    PreviewRequest,
    ValidateRequest,
    GenerateRequest,
    GenerateResponse,
    ProcessResult,
    UploadResponse,
    ValidationResponse,
    FontsResponse,
    FeedbackSubmission,
    FeedbackFormResponse,
    FeedbackQuestion
)
from app.services.template_service import TemplateService
from app.services.excel_service import ExcelService
from app.services.certificate_service import CertificateService
from app.core.config import settings

router = APIRouter()

# In-memory session storage (use Redis in production)
sessions: dict[str, dict] = {}

# Feedback token storage: token -> {session_id, participant_index, name, email, questions, submitted}
feedback_tokens: dict[str, dict] = {}


@router.post("/upload-template", response_model=UploadResponse)
async def upload_template(file: UploadFile = File(...), session_id: str = Form(...)):
    """Upload certificate template (PNG or PDF)"""
    
    try:
        # Validate file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB"
            )
        
        # Validate file extension
        if not file.filename.lower().endswith(('.png', '.pdf')):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only PNG and PDF are supported."
            )
        
        result = await TemplateService.process_template(file, session_id)
        sessions[session_id] = result
        
        return UploadResponse(
            success=True,
            preview_url=result["preview_url"],
            width=result["width"],
            height=result["height"],
            format=result["template_format"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process template: {str(e)}")


@router.post("/preview-text", response_model=UploadResponse)
async def preview_text(request: PreviewRequest):
    """Generate preview with positioned text"""
    
    session = sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    preview_url = await TemplateService.generate_preview(
        session,
        request.text,
        request.x,
        request.y,
        request.font_name,
        request.font_size,
        request.color,
        request.session_id
    )
    
    return UploadResponse(success=True, preview_url=preview_url)


@router.post("/upload-excel", response_model=UploadResponse)
async def upload_excel(file: UploadFile = File(...), session_id: str = Form(...)):
    """Upload and validate Excel file"""
    
    result = await ExcelService.process_excel(file, session_id)
    
    if session_id not in sessions:
        sessions[session_id] = {}
    
    sessions[session_id].update(result)
    
    return UploadResponse(
        success=True,
        count=result["participant_count"],
        preview=result["preview"]
    )


@router.post("/validate", response_model=ValidationResponse)
async def validate_settings(request: ValidateRequest):
    """Validate all settings before generating"""
    
    session = sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    errors = []
    
    if "template_path" not in session:
        errors.append("No template uploaded")
    
    if "excel_path" not in session:
        errors.append("No Excel file uploaded")
    
    if not request.email:
        errors.append("Email address required")
    
    if not request.app_password:
        errors.append("App password required")
    
    if errors:
        return ValidationResponse(valid=False, errors=errors)
    
    # Store settings
    sessions[request.session_id].update({
        "email": request.email,
        "app_password": request.app_password,
        "text_x": request.x,
        "text_y": request.y,
        "font_size": request.font_size,
        "font_name": request.font_name,
        "text_color": request.color,
        "email_subject": request.email_subject,
        "email_body": request.email_body
    })
    
    return ValidationResponse(valid=True, message="All settings validated")


@router.post("/generate", response_model=GenerateResponse)
async def generate_certificates(request: GenerateRequest):
    """Generate and send certificates (or feedback links if enabled)"""
    
    session = sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Store feedback settings in session
    session["feedback_enabled"] = request.feedback_enabled
    session["feedback_questions"] = [q.model_dump() for q in request.feedback_questions]
    
    # Load participants
    df = ExcelService.load_participants(session["excel_path"])
    
    # Setup output directories
    output_png = settings.OUTPUT_DIR / request.session_id / "png"
    output_pdf = settings.OUTPUT_DIR / request.session_id / "pdf"
    output_png.mkdir(parents=True, exist_ok=True)
    output_pdf.mkdir(parents=True, exist_ok=True)
    
    results: list[ProcessResult] = []
    successful = 0
    failed = 0
    
    # Get frontend URL for feedback links
    frontend_url = "http://localhost:5173"  # Vite dev server
    
    # Process each participant
    for idx, row in df.iterrows():
        try:
            name = str(row["Name"]).strip()
            email = str(row["Email"]).strip()
            
            if not name or not email or "@" not in email:
                failed += 1
                results.append(ProcessResult(
                    name=name,
                    email=email,
                    status="failed",
                    error="Invalid data"
                ))
                continue
            
            if request.feedback_enabled:
                # Generate feedback token and send feedback link
                token = secrets.token_urlsafe(32)
                feedback_tokens[token] = {
                    "session_id": request.session_id,
                    "participant_index": idx,
                    "name": name,
                    "email": email,
                    "questions": session["feedback_questions"],
                    "submitted": False,
                    "answers": None
                }
                
                # Send feedback link email
                feedback_url = f"{frontend_url}/feedback/{token}"
                feedback_email_body = f"""Dear {name},

Thank you for your participation! 

To receive your certificate, please complete our quick feedback form:

{feedback_url}

Your certificate will be sent to this email address immediately after submitting the feedback.

Best regards,
The Event Team"""
                
                CertificateService.send_email(
                    email,
                    session["email"],
                    session["app_password"],
                    "Complete Feedback to Receive Your Certificate",
                    feedback_email_body
                )
                
                successful += 1
                results.append(ProcessResult(
                    name=name,
                    email=email,
                    status="success"
                ))
            else:
                # Direct certificate generation (original flow)
                safe_name = name.replace("/", "_").replace("\\", "_")
                png_path = output_png / f"{safe_name}.png"
                pdf_path = output_pdf / f"{safe_name}.pdf"
                
                CertificateService.generate_certificate(
                    session["template_path"],
                    session["template_format"],
                    name,
                    session["text_x"],
                    session["text_y"],
                    session["font_name"],
                    session["font_size"],
                    session["text_color"],
                    png_path,
                    pdf_path
                )
                
                CertificateService.send_certificate(
                    name,
                    email,
                    pdf_path,
                    session["email"],
                    session["app_password"],
                    session.get("email_subject", "Your Participation Certificate"),
                    session.get("email_body", "Congratulations! Please find attached your participation certificate.")
                )
                
                successful += 1
                results.append(ProcessResult(
                    name=name,
                    email=email,
                    status="success"
                ))
            
        except Exception as e:
            failed += 1
            results.append(ProcessResult(
                name=row.get("Name", "Unknown"),
                email=row.get("Email", "Unknown"),
                status="failed",
                error=str(e)
            ))
    
    return GenerateResponse(
        total=len(df),
        successful=successful,
        failed=failed,
        details=results
    )


@router.get("/fonts", response_model=FontsResponse)
async def get_fonts():
    """Get available fonts"""
    return FontsResponse(fonts=list(settings.GOOGLE_FONTS.keys()))


@router.get("/feedback/{token}", response_model=FeedbackFormResponse)
async def get_feedback_form(token: str):
    """Get feedback form for a participant"""
    
    feedback_data = feedback_tokens.get(token)
    if not feedback_data:
        raise HTTPException(status_code=404, detail="Feedback link not found or expired")
    
    if feedback_data["submitted"]:
        raise HTTPException(status_code=410, detail="Feedback already submitted")
    
    return FeedbackFormResponse(
        participant_name=feedback_data["name"],
        participant_email=feedback_data["email"],
        event_name="Event",  # Could be stored in session
        questions=[FeedbackQuestion(**q) for q in feedback_data["questions"]]
    )


@router.post("/feedback/{token}/submit")
async def submit_feedback(token: str, submission: FeedbackSubmission):
    """Submit feedback and send certificate"""
    
    feedback_data = feedback_tokens.get(token)
    if not feedback_data:
        raise HTTPException(status_code=404, detail="Feedback link not found or expired")
    
    if feedback_data["submitted"]:
        raise HTTPException(status_code=410, detail="Feedback already submitted")
    
    # Get session data
    session = sessions.get(feedback_data["session_id"])
    if not session:
        raise HTTPException(status_code=404, detail="Session expired. Please contact the organizer.")
    
    # Mark as submitted and store answers
    feedback_data["submitted"] = True
    feedback_data["answers"] = [a.model_dump() for a in submission.answers]
    
    # Generate and send certificate
    name = feedback_data["name"]
    email = feedback_data["email"]
    
    output_png = settings.OUTPUT_DIR / feedback_data["session_id"] / "png"
    output_pdf = settings.OUTPUT_DIR / feedback_data["session_id"] / "pdf"
    output_png.mkdir(parents=True, exist_ok=True)
    output_pdf.mkdir(parents=True, exist_ok=True)
    
    safe_name = name.replace("/", "_").replace("\\", "_")
    png_path = output_png / f"{safe_name}.png"
    pdf_path = output_pdf / f"{safe_name}.pdf"
    
    try:
        CertificateService.generate_certificate(
            session["template_path"],
            session["template_format"],
            name,
            session["text_x"],
            session["text_y"],
            session["font_name"],
            session["font_size"],
            session["text_color"],
            png_path,
            pdf_path
        )
        
        CertificateService.send_certificate(
            name,
            email,
            pdf_path,
            session["email"],
            session["app_password"],
            session.get("email_subject", "Your Participation Certificate"),
            session.get("email_body", "Congratulations! Please find attached your participation certificate.")
        )
        
        return {"success": True, "message": "Feedback submitted and certificate sent!"}
    
    except Exception as e:
        # Reset submitted status on error
        feedback_data["submitted"] = False
        raise HTTPException(status_code=500, detail=f"Failed to send certificate: {str(e)}")


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear session data"""
    if session_id in sessions:
        del sessions[session_id]
    return {"success": True}
