"""Pydantic models for request/response validation"""

from pydantic import BaseModel, EmailStr


class FeedbackQuestion(BaseModel):
    """Feedback question model"""
    id: str
    question: str
    type: str  # 'text', 'rating', 'multiple_choice'
    options: list[str] | None = None
    required: bool = False


class PreviewRequest(BaseModel):
    """Request model for text preview"""
    session_id: str
    x: int
    y: int
    font_size: int
    font_name: str
    text: str
    color: str


class ValidateRequest(BaseModel):
    """Request model for settings validation"""
    session_id: str
    email: EmailStr
    app_password: str
    x: int
    y: int
    font_size: int
    font_name: str
    color: str
    email_subject: str = "Your Certificate"
    email_body: str = "Please find your certificate attached."


class GenerateRequest(BaseModel):
    """Request model for certificate generation"""
    session_id: str
    email: EmailStr
    app_password: str
    email_subject: str = "Your Certificate"
    email_body: str = "Please find your certificate attached."
    feedback_enabled: bool = False
    feedback_questions: list[FeedbackQuestion] = []


class FeedbackAnswer(BaseModel):
    """Single feedback answer"""
    question_id: str
    answer: str | int


class FeedbackSubmission(BaseModel):
    """Feedback submission from participant"""
    answers: list[FeedbackAnswer]


class FeedbackFormResponse(BaseModel):
    """Response for getting feedback form data"""
    participant_name: str
    participant_email: str
    event_name: str
    questions: list[FeedbackQuestion]


class ProcessResult(BaseModel):
    """Single participant processing result"""
    name: str
    email: str
    status: str
    error: str | None = None


class GenerateResponse(BaseModel):
    """Response model for certificate generation"""
    total: int
    successful: int
    failed: int
    details: list[ProcessResult]


class UploadResponse(BaseModel):
    """Response model for file uploads"""
    success: bool
    preview_url: str | None = None
    width: int | None = None
    height: int | None = None
    format: str | None = None
    count: int | None = None
    preview: list[dict] | None = None


class ValidationResponse(BaseModel):
    """Response model for validation"""
    valid: bool
    message: str | None = None
    errors: list[str] | None = None


class FontsResponse(BaseModel):
    """Response model for available fonts"""
    fonts: list[str]
