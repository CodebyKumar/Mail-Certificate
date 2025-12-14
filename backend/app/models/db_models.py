"""Database models using Pydantic for MongoDB documents"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId


class PyObjectId(str):
    """Custom type for MongoDB ObjectId"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v, handler):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError("Invalid ObjectId")


# ============ USER MODELS ============

class UserCreate(BaseModel):
    """Model for user registration"""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    """Model for user login"""
    email: EmailStr
    password: str


class UserInDB(BaseModel):
    """User model as stored in database"""
    id: Optional[str] = Field(None, alias="_id")
    name: str
    email: str
    password_hash: str
    is_admin: bool = False
    email_settings: Optional[dict] = None  # {email, app_password_encrypted}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True


class UserResponse(BaseModel):
    """User response model (without sensitive data)"""
    id: str
    name: str
    email: str
    is_admin: bool = False
    has_email_settings: bool = False
    created_at: datetime


class EmailSettings(BaseModel):
    """Email settings for a user"""
    email: EmailStr
    app_password: str


# ============ EVENT MODELS ============

class TextSettings(BaseModel):
    """Certificate text positioning settings"""
    y_position: int = 500
    font_name: str = "Roboto"
    font_size: int = 60
    text_color: str = "#000000"


class FeedbackQuestion(BaseModel):
    """Feedback form question"""
    id: str
    question: str
    type: str = "text"  # text, rating, multiple_choice
    options: Optional[List[str]] = None
    required: bool = False
    rating_min: int = 1
    rating_max: int = 5


class EventCreate(BaseModel):
    """Model for creating an event"""
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None


class EventUpdate(BaseModel):
    """Model for updating an event"""
    name: Optional[str] = None
    description: Optional[str] = None
    text_settings: Optional[TextSettings] = None
    feedback_enabled: bool = True
    feedback_questions: Optional[List[FeedbackQuestion]] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    feedback_email_subject: Optional[str] = None
    feedback_email_body: Optional[str] = None


class EventInDB(BaseModel):
    """Event model as stored in database"""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    name: str
    description: Optional[str] = None
    template_path: Optional[str] = None
    template_format: Optional[str] = None
    template_width: Optional[int] = None
    template_height: Optional[int] = None
    text_settings: TextSettings = Field(default_factory=TextSettings)
    feedback_enabled: bool = True
    feedback_questions: List[FeedbackQuestion] = []
    email_subject: str = "Your Participation Certificate"
    email_body: str = "Dear {name},\n\nCongratulations! Please find attached your participation certificate.\n\nBest regards"
    feedback_email_subject: str = "Complete Feedback to Receive Your Certificate"
    feedback_email_body: str = "Dear {name},\n\nThank you for your participation in {event_name}!\n\nTo receive your certificate, please complete our quick feedback form:\n\n{feedback_url}\n\nYour certificate will be sent to this email address immediately after submitting the feedback.\n\nBest regards,\nThe Event Team"
    status: str = "draft"  # draft, ready, sending, completed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True


class EventResponse(BaseModel):
    """Event response model"""
    id: str
    name: str
    description: Optional[str] = None
    has_template: bool = False
    text_settings: TextSettings
    feedback_enabled: bool
    feedback_questions: List[FeedbackQuestion]
    email_subject: str
    email_body: str
    status: str
    participant_count: int = 0
    sent_count: int = 0
    feedback_count: int = 0
    created_at: datetime
    updated_at: datetime


# ============ PARTICIPANT MODELS ============

class ParticipantCreate(BaseModel):
    """Model for creating a participant"""
    name: str
    email: EmailStr


class ParticipantInDB(BaseModel):
    """Participant model as stored in database"""
    id: Optional[str] = Field(None, alias="_id")
    event_id: str
    name: str
    email: str
    status: str = "pending"  # pending, feedback_sent, feedback_received, certificate_sent, failed
    feedback_token: Optional[str] = None
    feedback_submitted_at: Optional[datetime] = None
    certificate_sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True


class ParticipantResponse(BaseModel):
    """Participant response model"""
    id: str
    name: str
    email: str
    status: str
    feedback_submitted_at: Optional[datetime] = None
    certificate_sent_at: Optional[datetime] = None
    error_message: Optional[str] = None


# ============ FEEDBACK MODELS ============

class FeedbackAnswer(BaseModel):
    """Single feedback answer"""
    question_id: str
    answer: str | int


class FeedbackSubmission(BaseModel):
    """Feedback submission from participant"""
    answers: List[FeedbackAnswer]


class FeedbackInDB(BaseModel):
    """Feedback model as stored in database"""
    id: Optional[str] = Field(None, alias="_id")
    participant_id: str
    event_id: str
    token: str
    answers: List[dict] = []
    submitted_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True


# ============ AUTH MODELS ============

class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Data encoded in JWT token"""
    user_id: str
    email: str
    is_admin: bool = False
