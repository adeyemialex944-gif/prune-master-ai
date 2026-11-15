import json
import logging
import os
import re
import uuid
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Header, Query, BackgroundTasks, Body, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import TEMP_DIR, CLIPS_DIR, UPLOADS_DIR
from app.database import get_db, SessionLocal
from app.models import Video, Clip, Job, User, IPTrialRecord, SystemSetting
from app.schemas import (
    HighlightCandidate,
    CreateClipRequest,
    UpdateClipRequest,
    ClipResponse,
    JobResponse
)
from app.services.highlight_service import extract_video_highlights
from app.services.video_service import generate_thumbnail
from app.services.render_service import (
    generate_ass_subtitle_file,
    render_vertical_clip
)
from app.services.metadata_service import get_clip_social_metadata
from app.services.auth_service import get_current_user_optional
from app.routers.auth import get_client_ip

logger = logging.getLogger(__name__)
router = APIRouter(tags=["clips"])

def sanitize_filename(filename: str) -> str:
    return re.sub(r'[^\w\.-]', '_', filename)

class TextOverlayItem(BaseModel):
    id: Optional[str] = None
    text: str
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = 9999.0
    position_y: Optional[float] = 20.0  # % from top
    position_x: Optional[str] = "center"  # "left", "center", "right"
    font_size: Optional[int] = 48
    color: Optional[str] = "yellow"
    burn: Optional[bool] = True
    erased: Optional[bool] = False

class EditedSegmentItem(BaseModel):
    id: Optional[int] = None
    text: str
    start: float
    end: float
    erased: Optional[bool] = False
    words: Optional[List[Dict[str, Any]]] = None

class RenderOptionsPayload(BaseModel):
    framing_mode: Optional[str] = None
    burn_captions: Optional[bool] = None
    caption_style: Optional[str] = None
    resolution: Optional[str] = None
    aspect_ratio: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    title: Optional[str] = None
    text_position: Optional[str] = "center"
    font_size_scale: Optional[float] = 1.0
    volume_level: Optional[float] = 1.0
    vocal_boost: Optional[bool] = False
    remove_silence: Optional[bool] = False
    watermark: Optional[bool] = True
    watermark_text: Optional[str] = "ClipMaster AI"
    transition: Optional[str] = "none"
    bg_music: Optional[str] = None
    bg_music_volume: Optional[float] = 0.18
    overlays: Optional[List[TextOverlayItem]] = None
    edited_segments: Optional[List[EditedSegmentItem]] = None

def run_clip_render_worker(
    clip_id: int,
    job_id: str,
    framing_mode: str,
    burn_captions: bool,
    caption_style: str,
    resolution: str = "1080p",
    aspect_ratio: str = "9:16",
    text_position: str = "center",
    font_size_scale: float = 1.0,
    overlays: Optional[List[Dict[str, Any]]] = None,
    edited_segments: Optional[List[Dict[str, Any]]] = None,
    volume_level: float = 1.0,
    vocal_boost: bool = False,
    watermark: bool = True,
    watermark_text: str = "ClipMaster AI",
    transition: str = "none",
    remove_silence: bool = False,
    bg_music: Optional[str] = None,
    bg_music_volume: float = 0.18
):
    """
    Background worker that reframes video, adjusts volume, applies watermark,
    burns custom text and subtitles, and renders export MP4.
    """
    db = SessionLocal()
    try:
        clip = db.query(Clip).filter(Clip.id == clip_id).first()
        job = db.query(Job).filter(Job.id == job_id).first()

        if not clip or not job:
            return

        video = db.query(Video).filter(Video.id == clip.video_id).first()
        if not video:
            raise RuntimeError("Source video not found")

        source_video_path = UPLOADS_DIR / video.filename
        if not source_video_path.exists():
            raise RuntimeError("Source video file is missing on disk")

        # 1. Generate ASS subtitles if requested
        ass_path = None
        has_transcript_source = bool((video.transcript_path and Path(video.transcript_path).exists()) or edited_segments or overlays or watermark)
        if burn_captions and has_transcript_source:
            job.progress = 10
            job.message = "Synthesizing custom styled subtitle & text layers..."
            db.commit()

            try:
                transcript = {"segments": []}
                if video.transcript_path and Path(video.transcript_path).exists():
                    with open(video.transcript_path, "r", encoding="utf-8") as f:
                        transcript = json.load(f)

                ass_filename = f"clip_{clip.id}.ass"
                ass_path = TEMP_DIR / ass_filename
                generate_ass_subtitle_file(
                    transcript=transcript,
                    clip_start=clip.start_time,
                    clip_end=clip.end_time,
                    output_ass_path=ass_path,
                    style_name=caption_style,
                    resolution=resolution,
                    aspect_ratio=aspect_ratio,
                    text_position=text_position,
                    font_size_scale=font_size_scale,
                    custom_overlays=overlays,
                    edited_segments=edited_segments,
                    watermark=watermark,
                    watermark_text=watermark_text
                )
            except Exception as e:
                logger.warning(f"Could not generate subtitles: {e}")
                ass_path = None

        # 2. Output MP4 path
        out_filename = f"clip_{clip.id}.mp4"
        out_path = CLIPS_DIR / out_filename

        # Progress callback
        def progress_callback(pct: int, msg: str):
            try:
                job.progress = pct
                job.message = msg
                db.commit()
            except Exception as e:
                logger.warning(f"Could not update job progress: {e}")

        # 3. Render clip (9:16 vertical or 16:9 widescreen) with audio volume & transitions
        ok = render_vertical_clip(
            source_video_path=source_video_path,
            output_clip_path=out_path,
            start_time=clip.start_time,
            end_time=clip.end_time,
            framing_mode=framing_mode,
            subtitle_ass_path=ass_path if burn_captions else None,
            progress_callback=progress_callback,
            resolution=resolution,
            burn_captions=burn_captions,
            aspect_ratio=aspect_ratio,
            volume_level=volume_level,
            vocal_boost=vocal_boost,
            transition=transition
        )

        if not ok:
            raise RuntimeError("FFmpeg rendering failed")

        # 4. Generate updated thumbnail from rendered video
        thumb_name = f"clip_{clip.id}_thumb.jpg"
        thumb_path = TEMP_DIR / thumb_name
        try:
            generate_thumbnail(out_path, thumb_path, time_sec=0.5)
            clip.thumbnail_path = f"/media/temp/{thumb_name}"
        except Exception as th_err:
            logger.warning(f"Could not generate post-render thumbnail: {th_err}")

        clip.file_path = f"/media/clips/{out_filename}"
        clip.aspect_ratio = aspect_ratio
        clip.status = "ready"
        clip.caption_style = caption_style if burn_captions else "none"
        clip.volume_level = volume_level
        clip.watermark = watermark
        clip.watermark_text = watermark_text
        clip.transition = transition
        clip.remove_silence = remove_silence
        clip.bg_music = bg_music
        clip.bg_music_volume = bg_music_volume

        aspect_label = "16:9 Widescreen" if aspect_ratio == "16:9" else ("1:1 Square" if aspect_ratio == "1:1" else "9:16 Vertical")
        job.status = "completed"
        job.progress = 100
        job.message = f"{aspect_label} short rendered and ready!"
        db.commit()

    except Exception as e:
        logger.error(f"Clip rendering failed: {e}", exc_info=True)
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            clip = db.query(Clip).filter(Clip.id == clip_id).first()
            if job:
                job.status = "failed"
                job.message = f"Render error: {str(e)}"
            if clip:
                clip.status = "error"
            db.commit()
        except Exception:
            pass
    finally:
        db.close()

@router.post("/api/videos/{video_id}/highlights", response_model=List[HighlightCandidate])
def get_video_highlights(
    video_id: int,
    min_duration: float = Query(5.0, ge=1.0, le=300.0),
    max_duration: float = Query(60.0, ge=3.0, le=300.0),
    target_count: int = Query(5, ge=1, le=10),
    lab_mode: str = Query("sermon"),
    x_gemini_key: Optional[str] = Header(None, alias="X-Gemini-Key"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    preferred_model = "gemini-2.5-pro"
    if authorization:
        user = get_current_user_optional(authorization, db)
        if user:
            if not x_gemini_key and user.gemini_api_key:
                x_gemini_key = user.gemini_api_key
            if getattr(user, "gemini_model", None):
                preferred_model = user.gemini_model

    if not video.transcript_path or not Path(video.transcript_path).exists():
        raise HTTPException(
            status_code=400,
            detail="Video must be transcribed before extracting highlights"
        )

    try:
        with open(video.transcript_path, "r", encoding="utf-8") as f:
            transcript = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read transcript: {e}")

    highlights = extract_video_highlights(
        transcript=transcript,
        api_key=x_gemini_key,
        min_duration=min_duration,
        max_duration=max_duration,
        target_count=target_count,
        lab_mode=lab_mode,
        preferred_model=preferred_model
    )

    return highlights

@router.post("/api/clips", response_model=ClipResponse)
def create_clip(
    payload: CreateClipRequest,
    db: Session = Depends(get_db)
):
    video = db.query(Video).filter(Video.id == payload.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be greater than start time")

    clip = Clip(
        video_id=payload.video_id,
        title=payload.title.strip(),
        start_time=payload.start_time,
        end_time=payload.end_time,
        aspect_ratio=payload.aspect_ratio,
        caption_style=payload.caption_style,
        status="pending"
    )
    db.add(clip)
    db.commit()
    db.refresh(clip)

    video_path = UPLOADS_DIR / video.filename
    thumb_name = f"clip_{clip.id}_thumb.jpg"
    thumb_path = TEMP_DIR / thumb_name
    thumb_time = max(0.0, clip.start_time + 0.5)

    has_thumb = generate_thumbnail(video_path, thumb_path, time_sec=thumb_time)
    if has_thumb:
        clip.thumbnail_path = f"/media/temp/{thumb_name}"
        db.commit()
        db.refresh(clip)

    return clip

@router.post("/api/clips/{clip_id}/render", response_model=JobResponse)
def trigger_clip_render(
    clip_id: int,
    background_tasks: BackgroundTasks,
    request: Request,
    payload: Optional[RenderOptionsPayload] = Body(None),
    authorization: Optional[str] = Header(None),
    framing_mode: str = Query("blur"),
    burn_captions: bool = Query(True),
    caption_style: str = Query("word_red"),
    resolution: str = Query("1080p"),
    aspect_ratio: str = Query("9:16"),
    start_time: Optional[float] = Query(None),
    end_time: Optional[float] = Query(None),
    title: Optional[str] = Query(None),
    text_position: Optional[str] = Query("center"),
    font_size_scale: Optional[float] = Query(1.0),
    db: Session = Depends(get_db)
):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    client_ip = get_client_ip(request)
    current_user = get_current_user_optional(authorization, db)
    clip.client_ip = client_ip

    ip_rec = db.query(IPTrialRecord).filter(IPTrialRecord.ip_address == client_ip).first()

    # Check global monetization master switch
    mon_setting = db.query(SystemSetting).filter(SystemSetting.key == "monetization_enabled").first()
    monetization_enabled = (mon_setting.value.strip().lower() == "true") if mon_setting else False

    # Enforce 10-trial limit monetization ONLY if monetization is enabled
    # (bypass if monetization disabled, user is director, user is_pro, or IP has unlimited grant)
    is_unlimited = (not monetization_enabled) or bool(
        (current_user and (current_user.role == "director" or current_user.is_pro))
        or (ip_rec and ip_rec.is_unlimited)
    )
    if not is_unlimited:
        if current_user:
            if (current_user.trial_credits or 0) <= 0:
                raise HTTPException(
                    status_code=402,
                    detail="Free trial limit reached (10/10 clips used). Please upgrade to Pro for unlimited exports."
                )
            current_user.trial_credits = max(0, (current_user.trial_credits or 10) - 1)
            current_user.trial_credits_used = (current_user.trial_credits_used or 0) + 1
            db.commit()
        else:
            if not ip_rec:
                ip_rec = IPTrialRecord(ip_address=client_ip, trials_used=1, max_trials=10)
                db.add(ip_rec)
                db.commit()
            else:
                if ip_rec.trials_used >= ip_rec.max_trials:
                    raise HTTPException(
                        status_code=402,
                        detail="Free trial limit reached for this IP (10/10 clips used). Please sign up or upgrade to Pro."
                    )
                ip_rec.trials_used += 1
                db.commit()

    # Default options for new features
    volume_level = 1.0
    vocal_boost = False
    watermark = True
    watermark_text = "ClipMaster AI"
    transition = "none"
    remove_silence = False
    bg_music = None
    bg_music_volume = 0.18

    # Merge payload if provided via JSON body
    if payload:
        if payload.framing_mode is not None:
            framing_mode = payload.framing_mode
        if payload.burn_captions is not None:
            burn_captions = payload.burn_captions
        if payload.caption_style is not None:
            caption_style = payload.caption_style
        if payload.resolution is not None:
            resolution = payload.resolution
        if payload.aspect_ratio is not None:
            aspect_ratio = payload.aspect_ratio
        if payload.start_time is not None:
            start_time = payload.start_time
        if payload.end_time is not None:
            end_time = payload.end_time
        if payload.title is not None:
            title = payload.title
        if payload.text_position is not None:
            text_position = payload.text_position
        if payload.font_size_scale is not None:
            font_size_scale = payload.font_size_scale
        if payload.volume_level is not None:
            volume_level = float(payload.volume_level)
        if payload.vocal_boost is not None:
            vocal_boost = bool(payload.vocal_boost)
        if payload.watermark is not None:
            watermark = bool(payload.watermark)
        if payload.watermark_text is not None:
            watermark_text = str(payload.watermark_text).strip()
        if payload.transition is not None:
            transition = str(payload.transition).strip()
        if payload.remove_silence is not None:
            remove_silence = bool(payload.remove_silence)
        if payload.bg_music is not None:
            bg_music = str(payload.bg_music).strip()
        if payload.bg_music_volume is not None:
            bg_music_volume = float(payload.bg_music_volume)

    # Normalize aspect ratio (handles "9:16", "9:16 (1080p)", "16:9", "1:1", etc.)
    raw_aspect = str(aspect_ratio).strip().lower()
    if "16:9" in raw_aspect:
        aspect_ratio = "16:9"
    elif "1:1" in raw_aspect:
        aspect_ratio = "1:1"
    else:
        aspect_ratio = "9:16"

    # Normalize resolution (4K, 1080p, 720p, 480p)
    raw_res = str(resolution).strip().lower()
    if "4k" in raw_res or "2160" in raw_res:
        resolution = "4k"
    elif "720" in raw_res:
        resolution = "720p"
    elif "480" in raw_res:
        resolution = "480p"
    else:
        resolution = "1080p"

    # Normalize framing mode
    raw_framing = str(framing_mode).strip().lower()
    if raw_framing not in ["blur", "crop", "smart_face", "fit"]:
        framing_mode = "smart_face" if aspect_ratio == "9:16" else "blur"

    # Normalize caption style
    raw_style = str(caption_style).strip().lower()
    valid_styles = ["default", "word_red", "word_yellow", "word_white", "purple_pop", "phrase_purple", "clean_white", "phrase_white", "phrase_yellow"]
    if raw_style not in valid_styles:
        caption_style = "word_red"

    if start_time is not None and end_time is not None:
        start_val = max(0.0, float(start_time))
        end_val = float(end_time)
        if end_val <= start_val:
            raise HTTPException(status_code=400, detail="end_time must be greater than start_time")
        clip.start_time = start_val
        clip.end_time = end_val

    if title:
        clip.title = title.strip()

    clip.aspect_ratio = aspect_ratio
    clip.caption_style = caption_style

    # Update thumbnail if time changed (safely handle thumbnail failures)
    video = db.query(Video).filter(Video.id == clip.video_id).first()
    if video:
        video_path = UPLOADS_DIR / video.filename
        thumb_name = f"clip_{clip.id}_thumb.jpg"
        thumb_path = TEMP_DIR / thumb_name
        try:
            generate_thumbnail(video_path, thumb_path, time_sec=max(0.0, clip.start_time + 0.5))
            clip.thumbnail_path = f"/media/temp/{thumb_name}"
        except Exception as th_err:
            logger.warning(f"Could not generate initial thumbnail: {th_err}")

    # Prepare custom overlays and edited segments
    overlays_data = [
        o.model_dump() if hasattr(o, 'model_dump') else (o.dict() if hasattr(o, 'dict') else o)
        for o in (payload.overlays if payload and payload.overlays else [])
    ]
    edited_segments_data = [
        s.model_dump() if hasattr(s, 'model_dump') else (s.dict() if hasattr(s, 'dict') else s)
        for s in (payload.edited_segments if payload and payload.edited_segments else [])
    ]

    job_id = f"job_render_{clip_id}_{uuid.uuid4().hex[:6]}"
    cap_text = "with captions & text overlays" if burn_captions else "no captions (clean video)"
    aspect_text = "16:9 Widescreen" if aspect_ratio == "16:9" else ("1:1 Square" if aspect_ratio == "1:1" else "9:16 Vertical")
    job = Job(
        id=job_id,
        job_type="clip_render",
        status="running",
        progress=5,
        message=f"Master Editor: Initializing {aspect_text} render ({resolution}, {cap_text})..."
    )
    db.add(job)
    clip.status = "rendering"
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        run_clip_render_worker,
        clip_id,
        job_id,
        framing_mode,
        burn_captions,
        caption_style,
        resolution,
        aspect_ratio,
        str(text_position),
        float(font_size_scale or 1.0),
        overlays_data,
        edited_segments_data,
        volume_level,
        vocal_boost,
        watermark,
        watermark_text,
        transition,
        remove_silence,
        bg_music,
        bg_music_volume
    )
    return job

@router.get("/api/clips", response_model=List[ClipResponse])
def list_clips(
    video_id: Optional[int] = Query(None),
    all_users: bool = Query(False),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    current_user = get_current_user_optional(authorization, db)
    if not current_user:
        # Unauthenticated visitors see NO clips
        return []

    query = db.query(Clip)
    if video_id is not None:
        query = query.filter(Clip.video_id == video_id)

    if current_user.role == "director" and all_users:
        pass  # Director viewing all users
    else:
        query = query.filter(Clip.user_id == current_user.id)

    return query.order_by(Clip.created_at.desc()).all()

@router.get("/api/clips/{clip_id}", response_model=ClipResponse)
def get_clip(clip_id: int, db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    return clip

@router.get("/api/clips/{clip_id}/transcript")
def get_clip_transcript(clip_id: int, db: Session = Depends(get_db)):
    """
    Returns synchronized transcript segments and words for a clip,
    with relative timestamps (from 0.0s for Master Editor playback)
    and absolute timestamps for precise subtitle navigation.
    """
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    video = db.query(Video).filter(Video.id == clip.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Source video not found")

    clip_start = clip.start_time
    clip_end = clip.end_time
    clip_duration = clip_end - clip_start

    segments_out = []
    full_text_parts = []

    if video.transcript_path and Path(video.transcript_path).exists():
        try:
            with open(video.transcript_path, "r", encoding="utf-8") as f:
                tdata = json.load(f)

            for idx, seg in enumerate(tdata.get("segments", [])):
                s_start = float(seg.get("start", 0.0))
                s_end = float(seg.get("end", 0.0))

                if s_end > clip_start and s_start < clip_end:
                    seg_text = seg.get("text", "").strip()
                    if seg_text:
                        full_text_parts.append(seg_text)

                    rel_start = max(0.0, s_start - clip_start)
                    rel_end = min(clip_duration, s_end - clip_start)

                    words_out = []
                    for w in seg.get("words", []):
                        w_start = float(w.get("start", 0.0))
                        w_end = float(w.get("end", 0.0))
                        w_text = w.get("word", "").strip()
                        if w_end > clip_start and w_start < clip_end:
                            words_out.append({
                                "word": w_text,
                                "start": max(0.0, round(w_start - clip_start, 2)),
                                "end": min(clip_duration, round(w_end - clip_start, 2)),
                                "abs_start": round(w_start, 2),
                                "abs_end": round(w_end, 2)
                            })

                    segments_out.append({
                        "id": idx + 1,
                        "text": seg_text,
                        "start": round(rel_start, 2),
                        "end": round(rel_end, 2),
                        "abs_start": round(s_start, 2),
                        "abs_end": round(s_end, 2),
                        "words": words_out
                    })
        except Exception as e:
            logger.error(f"Error reading transcript for clip {clip_id}: {e}")

    full_text = " ".join(full_text_parts).strip()
    if not full_text:
        full_text = clip.title

    return {
        "clip_id": clip.id,
        "video_id": clip.video_id,
        "title": clip.title,
        "start_time": clip.start_time,
        "end_time": clip.end_time,
        "duration": round(clip_duration, 2),
        "aspect_ratio": clip.aspect_ratio,
        "caption_style": clip.caption_style,
        "full_text": full_text,
        "segments": segments_out
    }

@router.get("/api/clips/{clip_id}/download")
def download_clip(clip_id: int, db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip or not clip.file_path:
        raise HTTPException(status_code=404, detail="Rendered clip not found")

    file_name = Path(clip.file_path).name
    clip_file = CLIPS_DIR / file_name
    if not clip_file.exists():
        raise HTTPException(status_code=404, detail="Rendered clip file missing on disk")

    download_name = f"{sanitize_filename(clip.title)}.mp4"
    return FileResponse(
        path=str(clip_file),
        filename=download_name,
        media_type="video/mp4"
    )

@router.patch("/api/clips/{clip_id}", response_model=ClipResponse)
def update_clip(
    clip_id: int,
    payload: UpdateClipRequest,
    db: Session = Depends(get_db)
):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if payload.title is not None:
        clip.title = payload.title.strip()
    if payload.start_time is not None:
        clip.start_time = payload.start_time
    if payload.end_time is not None:
        clip.end_time = payload.end_time
    if payload.caption_style is not None:
        clip.caption_style = payload.caption_style

    if clip.end_time <= clip.start_time:
        raise HTTPException(status_code=400, detail="End time must be greater than start time")

    db.commit()
    db.refresh(clip)
    return clip

@router.delete("/api/clips/{clip_id}")
def delete_clip(clip_id: int, db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if clip.file_path:
        file_name = Path(clip.file_path).name
        file_on_disk = CLIPS_DIR / file_name
        if file_on_disk.exists():
            try:
                file_on_disk.unlink()
            except Exception:
                pass

    if clip.thumbnail_path:
        thumb_name = Path(clip.thumbnail_path).name
        thumb_file = TEMP_DIR / thumb_name
        if thumb_file.exists():
            try:
                thumb_file.unlink()
            except Exception:
                pass

    db.delete(clip)
    db.commit()
    return {"status": "deleted", "id": clip_id}

@router.get("/api/clips/{clip_id}/metadata")
def get_clip_metadata(
    clip_id: int,
    api_key: Optional[str] = Query(None),
    x_gemini_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Generates multi-platform social media titles, descriptions, hashtags, and CTAs
    tailored for YouTube Shorts, Instagram Reels, and TikTok.
    """
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    video = db.query(Video).filter(Video.id == clip.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Source video not found")

    clip_text = ""
    if video.transcript_path and Path(video.transcript_path).exists():
        try:
            with open(video.transcript_path, "r", encoding="utf-8") as f:
                tdata = json.load(f)
            matching_texts = []
            for seg in tdata.get("segments", []):
                s_start = seg.get("start", 0.0)
                s_end = seg.get("end", 0.0)
                if s_end >= clip.start_time and s_start <= clip.end_time:
                    matching_texts.append(seg.get("text", "").strip())
            clip_text = " ".join(matching_texts).strip()
        except Exception as e:
            logger.error(f"Error reading transcript for metadata: {e}")

    effective_key = api_key or x_gemini_api_key
    metadata = get_clip_social_metadata(
        title=clip.title,
        text=clip_text,
        api_key=effective_key
    )
    metadata["clip_id"] = clip.id
    metadata["video_id"] = video.id
    return metadata

@router.post("/api/storage/prune-cache")
def prune_server_cache(max_age_hours: float = 2.0):
    """
    Auto-prunes temporary audio, thumbnails, and temp files older than max_age_hours
    so the cloud server maintains zero permanent disk bloat.
    """
    import time
    now = time.time()
    cutoff = now - (max_age_hours * 3600)
    freed_bytes = 0
    deleted_files = 0

    if TEMP_DIR.exists():
        for item in TEMP_DIR.iterdir():
            if item.is_file() and not item.name.startswith("."):
                try:
                    if item.stat().st_mtime < cutoff:
                        sz = item.stat().st_size
                        item.unlink()
                        freed_bytes += sz
                        deleted_files += 1
                except Exception:
                    pass

    return {
        "status": "ok",
        "deleted_files": deleted_files,
        "freed_mb": round(freed_bytes / (1024 * 1024), 2)
    }
