import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="user") # "director" or "user"
    status = Column(String(50), default="pending") # "pending", "approved", "rejected"
    avatar_url = Column(String(500), nullable=True)
    trial_credits = Column(Integer, default=10) # 10 free trials for monetization
    trial_credits_used = Column(Integer, default=0)
    is_pro = Column(Boolean, default=False)
    registration_ip = Column(String(100), nullable=True) # IP Tracking
    last_ip = Column(String(100), nullable=True)
    gemini_api_key = Column(String(255), nullable=True)
    gemini_model = Column(String(100), default="gemini-2.5-pro", nullable=True) # gemini-2.5-pro, gemini-1.5-pro, gemini-2.5-flash
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    videos = relationship("Video", back_populates="user", cascade="all, delete-orphan")
    clips = relationship("Clip", back_populates="user", cascade="all, delete-orphan")

class IPTrialRecord(Base):
    """
    Tracks client IP usage to enforce the 10 free trial limit across multiple sessions/registrations.
    """
    __tablename__ = "ip_trial_records"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(100), unique=True, index=True, nullable=False)
    trials_used = Column(Integer, default=0)
    max_trials = Column(Integer, default=10)
    is_unlimited = Column(Boolean, default=False)
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    duration_seconds = Column(Float, default=0.0)
    file_size_bytes = Column(Integer, default=0)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    status = Column(String(50), default="ready")  # uploaded, audio_ready, transcribing, ready, error
    audio_path = Column(String(500), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)
    transcript_path = Column(String(500), nullable=True)
    client_ip = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="videos")
    clips = relationship("Clip", back_populates="video", cascade="all, delete-orphan")

class Clip(Base):
    __tablename__ = "clips"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(255), nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    aspect_ratio = Column(String(20), default="9:16")
    file_path = Column(String(500), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)
    status = Column(String(50), default="pending")  # pending, rendering, ready, error
    caption_style = Column(String(100), default="default")
    volume_level = Column(Float, default=1.0) # 0.0 to 2.0
    remove_silence = Column(Boolean, default=False)
    watermark = Column(Boolean, default=True)
    watermark_text = Column(String(100), default="ClipMaster AI")
    transition = Column(String(50), default="none") # none, fade, dissolve, whip_pan, zoom, glitch
    bg_music = Column(String(100), nullable=True)
    bg_music_volume = Column(Float, default=0.18)
    client_ip = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    video = relationship("Video", back_populates="clips")
    user = relationship("User", back_populates="clips")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(64), primary_key=True, index=True)
    job_type = Column(String(50), nullable=False)  # audio_extraction, transcription, clip_render
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    progress = Column(Integer, default=0)
    message = Column(String(255), default="")
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(String(500), nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

