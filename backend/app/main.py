import shutil
from typing import Optional
from fastapi import FastAPI, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.config import (
    ALLOWED_ORIGINS,
    DATA_DIR,
    UPLOADS_DIR,
    CLIPS_DIR,
    TEMP_DIR,
    FFMPEG_BIN,
    FFPROBE_BIN
)
from app.database import init_db, get_db
from app.schemas import HealthResponse
from app.routers import videos, jobs, clips, auth
from app.services.auth_service import seed_director_and_migrate

# Initialize database tables on app startup
init_db()
seed_director_and_migrate()

# Gracefully handle any interrupted jobs from an environment/server restart
def _recover_interrupted_jobs():
    from app.database import SessionLocal
    from app.models import Video, Job
    db = SessionLocal()
    try:
        interrupted_jobs = db.query(Job).filter(Job.status == "running").all()
        for j in interrupted_jobs:
            j.status = "interrupted"
            j.message = "Interrupted by server restart. Ready to transcribe."
        interrupted_videos = db.query(Video).filter(Video.status == "transcribing").all()
        for v in interrupted_videos:
            v.status = "audio_ready"
        db.commit()
    except Exception:
        pass
    finally:
        db.close()

_recover_interrupted_jobs()

app = FastAPI(
    title="Prune Master AI API",
    description="Local backend engine for Prune Master AI",
    version="0.1.0"
)

# CORS setup for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local media directories so frontend can preview original videos, thumbnails, and clips
app.mount("/media/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/media/clips", StaticFiles(directory=str(CLIPS_DIR)), name="clips")
app.mount("/media/temp", StaticFiles(directory=str(TEMP_DIR)), name="temp")

# Register routers
app.include_router(auth.router)
app.include_router(videos.router)
app.include_router(jobs.router)
app.include_router(clips.router)

@app.get("/api/health", response_model=HealthResponse)
def health_check():
    has_ffmpeg = bool(FFMPEG_BIN and shutil.which("ffmpeg"))
    return HealthResponse(
        status="ok",
        version="0.1.0",
        ffmpeg_detected=has_ffmpeg,
        data_directory=str(DATA_DIR)
    )

@app.get("/api/stats")
def get_stats(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    from app.models import Video, Clip, Job
    from app.services.auth_service import get_current_user_optional
    current_user = get_current_user_optional(authorization, db)

    total_videos = db.query(Video).count()
    total_clips = db.query(Clip).count()
    total_jobs = db.query(Job).count()

    user_videos = db.query(Video).filter(Video.user_id == current_user.id).count() if current_user else 0
    user_clips = db.query(Clip).filter(Clip.user_id == current_user.id).count() if current_user else 0

    return {
        "videos": total_videos,
        "clips": total_clips,
        "jobs": total_jobs,
        "user_videos": user_videos,
        "user_clips": user_clips
    }

# Production: Serve React frontend if built into frontend/dist
from pathlib import Path
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")

