from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    version: str
    ffmpeg_detected: bool
    data_directory: str

class VideoResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    filename: str
    original_name: str
    duration_seconds: float
    file_size_bytes: int
    width: int
    height: int
    status: str
    audio_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    transcript_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class HighlightCandidate(BaseModel):
    id: str
    title: str
    start_time: float
    end_time: float
    duration: float
    score: int
    reason: str
    text: str
    method: str

class CreateClipRequest(BaseModel):
    video_id: int
    title: str
    start_time: float
    end_time: float
    aspect_ratio: str = "9:16"
    caption_style: str = "default"

class UpdateClipRequest(BaseModel):
    title: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    caption_style: Optional[str] = None

class ClipResponse(BaseModel):
    id: int
    video_id: int
    user_id: Optional[int] = None
    title: str
    start_time: float
    end_time: float
    aspect_ratio: str
    file_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    status: str
    caption_style: str
    volume_level: Optional[float] = 1.0
    remove_silence: Optional[bool] = False
    watermark: Optional[bool] = True
    watermark_text: Optional[str] = "ClipMaster AI"
    transition: Optional[str] = "none"
    bg_music: Optional[str] = None
    bg_music_volume: Optional[float] = 0.18
    created_at: datetime

    class Config:
        from_attributes = True

class JobResponse(BaseModel):
    id: str
    job_type: str
    status: str
    progress: int
    message: str
    details: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserRegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str

class UserLoginRequest(BaseModel):
    login: str  # Email or username
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    status: str
    avatar_url: Optional[str] = None
    trial_credits: Optional[int] = 10
    trial_credits_used: Optional[int] = 0
    is_pro: Optional[bool] = False
    registration_ip: Optional[str] = None
    last_ip: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = "gemini-2.5-pro"
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None

class DirectorGrantRequest(BaseModel):
    identifier: str  # Email, username, or IP address

class AuthResponse(BaseModel):
    token: str
    user: UserResponse

class UserStatusUpdateRequest(BaseModel):
    status: str  # approved, rejected, pending

class ToggleMonetizationRequest(BaseModel):
    enabled: bool

class ForgotPasswordRequest(BaseModel):
    login: str  # Email or username
    full_name: str
    new_password: str

class DirectorResetPasswordRequest(BaseModel):
    new_password: str


