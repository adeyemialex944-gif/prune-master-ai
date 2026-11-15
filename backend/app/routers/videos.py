import json

import logging

import os

import re

import uuid

import aiofiles

from pathlib import Path

from typing import List, Optional, Dict, Any

from pydantic import BaseModel



from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query, Header

from sqlalchemy.orm import Session



from app.config import UPLOADS_DIR, TEMP_DIR, TRANSCRIPTS_DIR, CLIPS_DIR

from app.database import get_db, SessionLocal

from app.models import Video, Job, Clip

from app.schemas import VideoResponse, JobResponse

from app.services.auth_service import get_current_user_optional

from app.services.video_service import (

    get_video_metadata,

    extract_audio_for_transcription,

    generate_thumbnail,

    download_youtube_video

)

from app.services.transcription_service import transcribe_audio_file

from app.services.highlight_service import extract_video_highlights

from app.services.render_service import (

    generate_ass_subtitle_file,

    render_vertical_clip

)



logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/videos", tags=["videos"])



ALLOWED_EXTENSIONS = {".mp4", ".mkv", ".mov", ".webm", ".avi", ".m4v"}



def sanitize_filename(filename: str) -> str:

    return re.sub(r'[^\w\.-]', '_', filename)



def run_transcription_worker(video_id: int, job_id: str, model_size: str):

    """

    Background worker that runs faster-whisper and updates job progress.

    """

    db = SessionLocal()

    try:

        video = db.query(Video).filter(Video.id == video_id).first()

        job = db.query(Job).filter(Job.id == job_id).first()



        if not video or not job:

            return



        # Ensure audio file exists

        audio_path = Path(video.audio_path) if video.audio_path else None

        if not audio_path or not audio_path.exists():

            job.progress = 5

            job.message = "Extracting 16kHz audio for Whisper..."

            db.commit()



            video_file = UPLOADS_DIR / video.filename

            audio_path = TEMP_DIR / f"{video.id}_audio.wav"

            ok = extract_audio_for_transcription(video_file, audio_path)

            if not ok:

                raise RuntimeError("Audio extraction failed")

            video.audio_path = str(audio_path)

            db.commit()



        # Define progress callback

        def progress_callback(percent: int, message: str):

            try:

                job.progress = percent

                job.message = message

                db.commit()

            except Exception as e:

                logger.warning(f"Could not update job progress: {e}")



        # Run transcription with word timestamps

        transcript_data = transcribe_audio_file(

            audio_path=audio_path,

            model_size=model_size,

            progress_callback=progress_callback

        )



        # Save transcript to disk as JSON

        transcript_filename = f"{video.id}_transcript.json"

        transcript_file = TRANSCRIPTS_DIR / transcript_filename

        with open(transcript_file, "w", encoding="utf-8") as f:

            json.dump(transcript_data, f, indent=2, ensure_ascii=False)



        video.transcript_path = str(transcript_file)

        video.status = "transcribed"



        job.status = "completed"

        job.progress = 100

        job.message = f"Done! {transcript_data['total_segments']} segments recognized."

        db.commit()



    except Exception as e:

        logger.error(f"Background transcription failed: {e}", exc_info=True)

        try:

            job = db.query(Job).filter(Job.id == job_id).first()

            video = db.query(Video).filter(Video.id == video_id).first()

            if job:

                job.status = "failed"

                job.message = f"Transcription error: {str(e)}"

            if video:

                video.status = "error"

            db.commit()

        except Exception:

            pass

    finally:

        db.close()



def run_mine_clips_worker(

    video_id: int,

    job_id: str,

    clip_count: int = 3,

    lab_mode: str = "sermon",

    framing_mode: str = "blur",

    min_duration: float = 15.0,

    max_duration: float = 60.0,

    resolution: str = "1080p",

    burn_captions: bool = True,

    caption_style: str = "word_red",

    aspect_ratio: str = "9:16",

    timeline_strategy: str = "timeline_balanced"

):

    """

    ViralMinner-style Auto-Miner:

    1. Transcribes audio with local Whisper

    2. Mines top N viral moments within [min_duration, max_duration]

       When timeline_strategy='timeline_balanced', intelligently spans the entire 2-hour timeline

       to extract the key places (start, middle, climax, and end) without clustering.

    3. Renders all N into 9:16 vertical or 16:9 widescreen clips (1080p, 720p, etc.) with or without burned subtitles

    """

    db = SessionLocal()

    try:

        video = db.query(Video).filter(Video.id == video_id).first()

        job = db.query(Job).filter(Job.id == job_id).first()

        if not video or not job:

            return



        # 1. Ensure audio

        audio_path = Path(video.audio_path) if video.audio_path else None

        if not audio_path or not audio_path.exists():

            job.progress = 5

            job.message = "Extracting audio track for AI..."

            db.commit()

            source_video = UPLOADS_DIR / video.filename

            audio_path = TEMP_DIR / f"{video.id}_audio.wav"

            extract_audio_for_transcription(source_video, audio_path)

            video.audio_path = str(audio_path)

            db.commit()



        # 2. Transcribe if needed

        t_file = TRANSCRIPTS_DIR / f"{video.id}_transcript.json"

        if not t_file.exists():

            job.progress = 10

            job.message = "AI listening & transcribing speech with Whisper..."

            db.commit()



            def progress_cb(pct, msg):

                job.progress = 10 + int(pct * 0.45)

                job.message = f"Transcribing ({lab_mode.capitalize()} Lab): {msg}"

                db.commit()



            tdata = transcribe_audio_file(audio_path, model_size="tiny", progress_callback=progress_cb)

            with open(t_file, "w", encoding="utf-8") as f:

                json.dump(tdata, f, indent=2, ensure_ascii=False)

            video.transcript_path = str(t_file)

            video.status = "transcribed"

            db.commit()

        else:

            with open(t_file, "r", encoding="utf-8") as f:

                tdata = json.load(f)



        # 3. Mine top highlights using Gemini Pro & timeline balancer

        job.progress = 58

        job.message = f"Mining top viral hooks ({int(min_duration)}s-{int(max_duration)}s in {lab_mode.capitalize()} Lab)..."

        db.commit()



        user_gemini_key = video.user.gemini_api_key if video.user and video.user.gemini_api_key else None

        preferred_model = video.user.gemini_model if video.user and video.user.gemini_model else "gemini-2.5-pro"



        candidates = extract_video_highlights(

            tdata,

            api_key=user_gemini_key,

            min_duration=min_duration,

            max_duration=max_duration,

            target_count=clip_count,

            lab_mode=lab_mode,

            timeline_strategy=timeline_strategy,

            preferred_model=preferred_model

        )

        if not candidates:

            end_t = min(max_duration, video.duration_seconds)

            candidates = [{

                "title": f"Key Moment - {video.original_name[:30]}",

                "start_time": 0.0,

                "end_time": end_t

            }]



        selected_candidates = candidates[:clip_count]

        video_path = UPLOADS_DIR / video.filename

        mined_clips = []



        total_render_budget = 40

        per_clip_budget = total_render_budget / max(1, len(selected_candidates))



        for idx, cand in enumerate(selected_candidates, 1):

            clip = Clip(

                video_id=video.id,

                user_id=video.user_id,

                title=cand["title"],

                start_time=cand["start_time"],

                end_time=cand["end_time"],

                aspect_ratio=f"{aspect_ratio} ({resolution})",

                status="rendering",

                caption_style=caption_style if burn_captions else "none"

            )

            db.add(clip)

            db.commit()

            db.refresh(clip)



            # Thumbnail

            thumb_name = f"clip_{clip.id}_thumb.jpg"

            thumb_path = TEMP_DIR / thumb_name

            generate_thumbnail(video_path, thumb_path, time_sec=clip.start_time + 0.5)

            clip.thumbnail_path = f"/media/temp/{thumb_name}"

            db.commit()



            # ASS subtitles if enabled

            ass_file = None

            if burn_captions:

                ass_file = TEMP_DIR / f"clip_{clip.id}.ass"

                generate_ass_subtitle_file(

                    transcript=tdata,

                    clip_start=clip.start_time,

                    clip_end=clip.end_time,

                    output_ass_path=ass_file,

                    style_name=caption_style,

                    resolution=resolution,

                    aspect_ratio=aspect_ratio

                )



            out_name = f"clip_{clip.id}.mp4"

            out_path = CLIPS_DIR / out_name



            clip_base_prog = 60 + int((idx - 1) * per_clip_budget)



            def render_cb(pct, msg):

                job.progress = clip_base_prog + int((pct / 100) * per_clip_budget)

                cap_label = "with captions" if burn_captions else "clean"

                aspect_lbl = "16:9" if aspect_ratio == "16:9" else "9:16"

                job.message = f"Rendering {aspect_lbl} {resolution} Clip #{idx}/{len(selected_candidates)} ({cap_label}): '{clip.title[:20]}'..."

                db.commit()



            render_vertical_clip(

                source_video_path=video_path,

                output_clip_path=out_path,

                start_time=clip.start_time,

                end_time=clip.end_time,

                framing_mode=framing_mode,

                subtitle_ass_path=ass_file,

                progress_callback=render_cb,

                resolution=resolution,

                burn_captions=burn_captions,

                aspect_ratio=aspect_ratio

            )



            clip.file_path = f"/media/clips/{out_name}"

            clip.status = "ready"

            db.commit()

            mined_clips.append(clip)



        job.status = "completed"

        job.progress = 100

        job.message = f"Success! Mined {len(mined_clips)} viral {resolution} shorts ready to post!"

        db.commit()



    except Exception as e:

        logger.error(f"Mining clips failed: {e}", exc_info=True)

        job = db.query(Job).filter(Job.id == job_id).first()

        if job:

            job.status = "failed"

            job.message = f"Mining error: {str(e)}"

            db.commit()

    finally:

        db.close()



def run_auto_cut_worker(video_id: int, job_id: str):

    return run_mine_clips_worker(video_id, job_id, clip_count=1)



@router.post("/upload", response_model=VideoResponse)

async def upload_video(

    file: UploadFile = File(...),

    authorization: Optional[str] = Header(None),

    db: Session = Depends(get_db)

):

    current_user = get_current_user_optional(authorization, db)

    ext = Path(file.filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:

        raise HTTPException(

            status_code=400,

            detail=f"Unsupported format '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

        )



    # Pre-check available disk space

    import shutil

    total, used, free = shutil.disk_usage(UPLOADS_DIR)

    if free < 300 * 1024 * 1024:  # Less than 300 MB

        raise HTTPException(

            status_code=507,

            detail="Low disk space: Your Windows C: drive has less than 300 MB free. Please free up disk space before uploading."

        )



    safe_name = sanitize_filename(file.filename)

    unique_prefix = uuid.uuid4().hex[:8]

    stored_filename = f"{unique_prefix}_{safe_name}"

    target_path = UPLOADS_DIR / stored_filename



    try:

        # Stream directly to disk in 4MB chunks (supports 10GB+ files without memory bloat)

        async with aiofiles.open(target_path, "wb") as out_file:

            while chunk := await file.read(4 * 1024 * 1024):

                await out_file.write(chunk)

    except Exception as e:

        if target_path.exists():

            target_path.unlink()

        raise HTTPException(

            status_code=507 if "space" in str(e).lower() else 500,

            detail=f"Failed to write file to disk (likely low disk space): {e}"

        )



    meta = get_video_metadata(target_path)



    video = Video(

        user_id=current_user.id if current_user else 1,

        filename=stored_filename,

        original_name=file.filename,

        duration_seconds=meta["duration"],

        file_size_bytes=meta["size"],

        width=meta["width"],

        height=meta["height"],

        status="uploaded"

    )

    db.add(video)

    try:

        db.commit()

        db.refresh(video)

    except Exception as e:

        db.rollback()

        raise HTTPException(

            status_code=507,

            detail=f"Database error due to full disk space: {e}"

        )



    audio_filename = f"{video.id}_audio.wav"

    audio_path = TEMP_DIR / audio_filename



    thumb_time = min(1.0, meta["duration"] * 0.1) if meta["duration"] > 0 else 0.5

    thumb_filename = f"{video.id}_thumb.jpg"

    thumb_path = TEMP_DIR / thumb_filename



    try:

        has_thumb = generate_thumbnail(target_path, thumb_path, time_sec=thumb_time)

        if has_thumb:

            video.thumbnail_path = f"/media/temp/{thumb_filename}"

    except Exception as e:

        logger.warning(f"Could not generate thumbnail during upload: {e}")



    # Audio extraction is handled asynchronously in the background mining worker

    video.status = "ready"



    try:

        db.commit()

        db.refresh(video)

    except Exception as e:

        logger.warning(f"Could not finalize video status update: {e}")

        db.rollback()



    return video



@router.get("", response_model=List[VideoResponse])

def list_videos(

    all_users: bool = Query(False),

    authorization: Optional[str] = Header(None),

    db: Session = Depends(get_db)

):

    current_user = get_current_user_optional(authorization, db)

    if not current_user:

        # Unauthenticated visitors see NO videos

        return []



    query = db.query(Video)

    if current_user.role == "director" and all_users:

        pass  # Director can see all users' videos when all_users is True

    else:

        query = query.filter(Video.user_id == current_user.id)



    return query.order_by(Video.created_at.desc()).all()



@router.get("/{video_id}", response_model=VideoResponse)

def get_video(video_id: int, db: Session = Depends(get_db)):

    video = db.query(Video).filter(Video.id == video_id).first()

    if not video:

        raise HTTPException(status_code=404, detail="Video not found")

    return video



@router.post("/{video_id}/transcribe", response_model=JobResponse)

def trigger_transcription(

    video_id: int,

    background_tasks: BackgroundTasks,

    model_size: str = Query("base", pattern="^(tiny|base|small|medium)$"),

    db: Session = Depends(get_db)

):

    video = db.query(Video).filter(Video.id == video_id).first()

    if not video:

        raise HTTPException(status_code=404, detail="Video not found")



    job_id = f"job_transcribe_{video_id}_{uuid.uuid4().hex[:6]}"

    job = Job(

        id=job_id,

        job_type="transcription",

        status="running",

        progress=5,

        message=f"Starting offline transcription ({model_size})..."

    )

    db.add(job)

    video.status = "transcribing"

    db.commit()

    db.refresh(job)



    # Launch background worker

    background_tasks.add_task(run_transcription_worker, video_id, job_id, model_size)

    return job



@router.post("/{video_id}/auto-cut", response_model=JobResponse)

def auto_cut_video(

    video_id: int,

    background_tasks: BackgroundTasks,

    db: Session = Depends(get_db)

):

    """

    1-Click Auto-Cut: Transcribes, picks top highlight, and renders 9:16 short reel.

    """

    video = db.query(Video).filter(Video.id == video_id).first()

    if not video:

        raise HTTPException(status_code=404, detail="Video not found")



    job_id = f"job_autocut_{video_id}_{uuid.uuid4().hex[:6]}"

    job = Job(

        id=job_id,

        job_type="auto_cut",

        status="running",

        progress=5,

        message="Starting 1-Click Auto-Cut pipeline..."

    )

    db.add(job)

    video.status = "transcribing"

    db.commit()

    db.refresh(job)



    background_tasks.add_task(run_auto_cut_worker, video_id, job_id)

    return job



@router.get("/{video_id}/transcript")

def get_transcript(video_id: int, db: Session = Depends(get_db)):

    video = db.query(Video).filter(Video.id == video_id).first()

    if not video:

        raise HTTPException(status_code=404, detail="Video not found")



    if not video.transcript_path or not Path(video.transcript_path).exists():

        raise HTTPException(status_code=404, detail="Transcript not ready yet")



    try:

        with open(video.transcript_path, "r", encoding="utf-8") as f:

            return json.load(f)

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"Could not read transcript: {e}")



@router.delete("/{video_id}")

def delete_video(video_id: int, db: Session = Depends(get_db)):

    video = db.query(Video).filter(Video.id == video_id).first()

    if not video:

        raise HTTPException(status_code=404, detail="Video not found")



    video_file = UPLOADS_DIR / video.filename

    if video_file.exists():

        try:

            video_file.unlink()

        except Exception:

            pass



    if video.audio_path:

        audio_file = Path(video.audio_path)

        if audio_file.exists():

            try:

                audio_file.unlink()

            except Exception:

                pass



    if video.thumbnail_path:

        thumb_name = Path(video.thumbnail_path).name

        thumb_file = TEMP_DIR / thumb_name

        if thumb_file.exists():

            try:

                thumb_file.unlink()

            except Exception:

                pass



    if video.transcript_path:

        trans_file = Path(video.transcript_path)

        if trans_file.exists():

            try:

                trans_file.unlink()

            except Exception:

                pass



    db.delete(video)

    db.commit()

    return {"status": "deleted", "id": video_id}



class YouTubeImportRequest(BaseModel):

    url: str



@router.post("/youtube", response_model=VideoResponse)

def import_youtube(

    payload: YouTubeImportRequest,

    authorization: Optional[str] = Header(None),

    db: Session = Depends(get_db)

):

    """

    Downloads YouTube video using yt-dlp locally and adds to local library.

    """

    current_user = get_current_user_optional(authorization, db)

    url = payload.url.strip()

    if not url or ("youtube.com" not in url and "youtu.be" not in url):

        raise HTTPException(status_code=400, detail="Invalid YouTube URL. Please provide a valid YouTube link.")



    try:

        info = download_youtube_video(url, UPLOADS_DIR)

        target_path = info["path"]

        meta = get_video_metadata(target_path)



        video = Video(

            user_id=current_user.id if current_user else 1,

            filename=target_path.name,

            original_name=info.get("title", target_path.name),

            duration_seconds=meta["duration"],

            file_size_bytes=meta["size"],

            width=meta["width"],

            height=meta["height"],

            status="uploaded"

        )

        db.add(video)

        db.commit()

        db.refresh(video)



        # Generate thumbnail and audio

        audio_filename = f"{video.id}_audio.wav"

        audio_path = TEMP_DIR / audio_filename

        extract_audio_for_transcription(target_path, audio_path)

        video.audio_path = str(audio_path)



        thumb_filename = f"{video.id}_thumb.jpg"

        thumb_path = TEMP_DIR / thumb_filename

        generate_thumbnail(target_path, thumb_path, time_sec=min(5.0, meta["duration"] * 0.1))

        video.thumbnail_path = f"/media/temp/{thumb_filename}"

        video.status = "audio_ready"



        db.commit()

        db.refresh(video)

        return video

    except Exception as e:

        logger.error(f"YouTube download failed: {e}", exc_info=True)

        raise HTTPException(status_code=500, detail=f"YouTube import failed: {str(e)}")



@router.post("/{video_id}/mine", response_model=JobResponse)

def mine_video_clips(

    video_id: int,

    background_tasks: BackgroundTasks,

    clip_count: int = Query(3, ge=1, le=50),

    lab_mode: str = Query("sermon", pattern="^(sermon|podcast|general)$"),

    framing_mode: str = Query("blur", pattern="^(blur|crop|smart_face|fit)$"),

    min_duration: float = Query(15.0, ge=3.0, le=300.0),

    max_duration: float = Query(60.0, ge=5.0, le=600.0),

    resolution: str = Query("1080p", pattern="^(1080p|720p|480p)$"),

    burn_captions: bool = Query(True),

    caption_style: str = Query("word_red", pattern="^(default|word_red|word_yellow|word_white|purple_pop|phrase_purple|clean_white|phrase_white|phrase_yellow)$"),

    aspect_ratio: str = Query("9:16", pattern="^(9:16|16:9)$"),

    timeline_strategy: str = Query("timeline_balanced", pattern="^(timeline_balanced|top_peaks)$"),

    db: Session = Depends(get_db)

):

    """

    ViralMinner-style multi-clip miner:

    Transcribes audio, mines top N viral nuggets across full timeline (e.g. 2-hour video),

    and renders 9:16 vertical or 16:9 widescreen clips with customizable duration, resolution, and caption toggle.

    """

    video = db.query(Video).filter(Video.id == video_id).first()

    if not video:

        raise HTTPException(status_code=404, detail="Video not found")



    job_id = f"job_mine_{video_id}_{uuid.uuid4().hex[:6]}"

    cap_text = f"captions ({caption_style})" if burn_captions else "no captions"

    aspect_lbl = "16:9 Widescreen" if aspect_ratio == "16:9" else "9:16 Vertical"

    job = Job(

        id=job_id,

        job_type="clip_mine",

        status="running",

        progress=5,

        message=f"Starting {lab_mode.capitalize()} Lab: Mining {clip_count} {aspect_lbl} clips across full timeline ({int(min_duration)}s-{int(max_duration)}s, {resolution}, {cap_text})..."

    )

    db.add(job)

    video.status = "transcribing"

    db.commit()

    db.refresh(job)



    background_tasks.add_task(

        run_mine_clips_worker,

        video_id=video_id,

        job_id=job_id,

        clip_count=clip_count,

        lab_mode=lab_mode,

        framing_mode=framing_mode,

        min_duration=min_duration,

        max_duration=max_duration,

        resolution=resolution,

        burn_captions=burn_captions,

        caption_style=caption_style,

        aspect_ratio=aspect_ratio,

        timeline_strategy=timeline_strategy

    )

    return job



class BatchMineRequest(BaseModel):

    video_ids: List[int]

    clip_count: int = 3

    lab_mode: str = "sermon"

    framing_mode: str = "blur"

    min_duration: float = 15.0

    max_duration: float = 60.0

    resolution: str = "1080p"

    burn_captions: bool = True

    caption_style: str = "word_red"

    aspect_ratio: str = "9:16"

    timeline_strategy: str = "timeline_balanced"



@router.post("/batch-mine")

def batch_mine_videos(

    req: BatchMineRequest,

    background_tasks: BackgroundTasks,

    db: Session = Depends(get_db)

):

    """

    Concurrent multi-video miner:

    Allows more than 2 videos (e.g. 2, 3, 5, 10) to be mined and cut simultaneously.

    Spawns background workers for each video and tracks their progress.

    """

    if not req.video_ids:

        raise HTTPException(status_code=400, detail="No video_ids provided for batch mining.")



    started_jobs = []

    for vid_id in req.video_ids:

        video = db.query(Video).filter(Video.id == vid_id).first()

        if not video:

            continue



        job_id = f"job_mine_{vid_id}_{uuid.uuid4().hex[:6]}"

        cap_text = f"captions ({req.caption_style})" if req.burn_captions else "no captions"

        aspect_lbl = "16:9 Widescreen" if req.aspect_ratio == "16:9" else "9:16 Vertical"

        job = Job(

            id=job_id,

            job_type="clip_mine",

            status="running",

            progress=5,

            message=f"Queued ({video.original_name[:25]}): Mining {req.clip_count} {aspect_lbl} clips ({int(req.min_duration)}s-{int(req.max_duration)}s, {req.resolution}, {cap_text})..."

        )

        db.add(job)

        video.status = "transcribing"

        db.commit()

        db.refresh(job)



        background_tasks.add_task(

            run_mine_clips_worker,

            video_id=vid_id,

            job_id=job_id,

            clip_count=req.clip_count,

            lab_mode=req.lab_mode,

            framing_mode=req.framing_mode,

            min_duration=req.min_duration,

            max_duration=req.max_duration,

            resolution=req.resolution,

            burn_captions=req.burn_captions,

            caption_style=req.caption_style,

            aspect_ratio=req.aspect_ratio,

            timeline_strategy=req.timeline_strategy

        )

        started_jobs.append({

            "video_id": vid_id,

            "video_name": video.original_name,

            "job_id": job_id,

            "status": "running",

            "progress": 5,

            "message": job.message

        })



    return {

        "status": "success",

        "total_queued": len(started_jobs),

        "jobs": started_jobs

    }



@router.get("/{video_id}/highlights")

def get_video_key_highlights(

    video_id: int,

    clip_count: int = Query(5, ge=1, le=50),

    lab_mode: str = Query("sermon", pattern="^(sermon|podcast|general)$"),

    min_duration: float = Query(15.0, ge=3.0, le=300.0),

    max_duration: float = Query(60.0, ge=5.0, le=600.0),

    timeline_strategy: str = Query("timeline_balanced", pattern="^(timeline_balanced|top_peaks)$"),

    db: Session = Depends(get_db)

):

    """

    Previews detected key moments across a full video (e.g. 2 hours) before or after rendering.

    """

    video = db.query(Video).filter(Video.id == video_id).first()

    if not video:

        raise HTTPException(status_code=404, detail="Video not found")

    if not video.transcript_path or not Path(video.transcript_path).exists():

        raise HTTPException(status_code=400, detail="Video has not been transcribed yet.")



    with open(video.transcript_path, "r", encoding="utf-8") as f:

        tdata = json.load(f)



    user_gemini_key = video.user.gemini_api_key if video.user and video.user.gemini_api_key else None

    preferred_model = video.user.gemini_model if video.user and video.user.gemini_model else "gemini-2.5-pro"



    highlights = extract_video_highlights(

        tdata,

        api_key=user_gemini_key,

        min_duration=min_duration,

        max_duration=max_duration,

        target_count=clip_count,

        lab_mode=lab_mode,

        timeline_strategy=timeline_strategy,

        preferred_model=preferred_model

    )

    return {"highlights": highlights, "total": len(highlights)}



class AnalyzeVideoRequest(BaseModel):
    clip_count: Optional[int] = 5
    lab_mode: Optional[str] = "sermon"
    min_duration: Optional[float] = 15.0
    max_duration: Optional[float] = 60.0
    timeline_strategy: Optional[str] = "timeline_balanced"

def run_analyze_video_worker(
    video_id: int,
    job_id: str,
    clip_count: int = 5,
    lab_mode: str = "sermon",
    min_duration: float = 15.0,
    max_duration: float = 60.0,
    timeline_strategy: str = "timeline_balanced"
):
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        job = db.query(Job).filter(Job.id == job_id).first()
        if not video or not job:
            return

        # 1. Ensure audio
        audio_path = Path(video.audio_path) if video.audio_path else None
        if not audio_path or not audio_path.exists():
            job.progress = 10
            job.message = "Extracting audio track for speech analysis..."
            db.commit()
            source_video = UPLOADS_DIR / video.filename
            audio_path = TEMP_DIR / f"{video.id}_audio.wav"
            extract_audio_for_transcription(source_video, audio_path)
            video.audio_path = str(audio_path)
            db.commit()

        # 2. Transcribe if needed
        t_file = TRANSCRIPTS_DIR / f"{video.id}_transcript.json"
        if not t_file.exists():
            job.progress = 20
            job.message = "Listening to speech with Whisper AI..."
            db.commit()

            def progress_cb(pct, msg):
                job.progress = 20 + int(pct * 0.45)
                job.message = f"Whisper transcribing speech: {msg}"
                db.commit()

            tdata = transcribe_audio_file(audio_path, model_size="tiny", progress_callback=progress_cb)
            with open(t_file, "w", encoding="utf-8") as f:
                json.dump(tdata, f, indent=2, ensure_ascii=False)
            video.transcript_path = str(t_file)
            video.status = "transcribed"
            db.commit()
        else:
            with open(t_file, "r", encoding="utf-8") as f:
                tdata = json.load(f)

        # 3. Detect Highlights & Important Segments
        job.progress = 75
        job.message = f"AI discovering high-impact moments ({int(min_duration)}s-{int(max_duration)}s in {lab_mode.capitalize()} mode)..."
        db.commit()

        user_gemini_key = video.user.gemini_api_key if video.user and video.user.gemini_api_key else None
        preferred_model = video.user.gemini_model if video.user and video.user.gemini_model else "gemini-2.5-pro"

        candidates = extract_video_highlights(
            tdata,
            api_key=user_gemini_key,
            min_duration=min_duration,
            max_duration=max_duration,
            target_count=clip_count,
            lab_mode=lab_mode,
            timeline_strategy=timeline_strategy,
            preferred_model=preferred_model
        )

        if not candidates:
            end_t = min(max_duration, video.duration_seconds if video.duration_seconds > 0 else 60.0)
            candidates = [{
                "id": "hl_fallback_0",
                "title": f"Key Moment - {video.original_name[:30]}",
                "start_time": 0.0,
                "end_time": round(end_t, 2),
                "duration": round(end_t, 2),
                "score": 90,
                "reason": "Complete beginning thought",
                "text": "Full initial segment"
            }]

        job.details = json.dumps(candidates)
        job.status = "completed"
        job.progress = 100
        job.message = f"Analysis complete! Discovered {len(candidates)} important moments."
        db.commit()

    except Exception as e:
        logger.error(f"Video analysis worker failed: {e}", exc_info=True)
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = "failed"
            job.message = f"Analysis error: {str(e)}"
            db.commit()
    finally:
        db.close()

@router.post("/{video_id}/analyze")
def analyze_video_moments(
    video_id: int,
    req: AnalyzeVideoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    t_file = Path(video.transcript_path) if video.transcript_path else (TRANSCRIPTS_DIR / f"{video.id}_transcript.json")

    # If transcript already exists on disk, we can extract highlights instantaneously
    if t_file.exists():
        with open(t_file, "r", encoding="utf-8") as f:
            tdata = json.load(f)
        user_gemini_key = video.user.gemini_api_key if video.user and video.user.gemini_api_key else None
        preferred_model = video.user.gemini_model if video.user and video.user.gemini_model else "gemini-2.5-pro"

        highlights = extract_video_highlights(
            tdata,
            api_key=user_gemini_key,
            min_duration=req.min_duration or 15.0,
            max_duration=req.max_duration or 60.0,
            target_count=req.clip_count or 5,
            lab_mode=req.lab_mode or "sermon",
            timeline_strategy=req.timeline_strategy or "timeline_balanced",
            preferred_model=preferred_model
        )
        return {
            "status": "completed",
            "progress": 100,
            "highlights": highlights,
            "total": len(highlights)
        }

    # If transcript does not exist yet, launch the background analysis worker
    job_id = f"job_analyze_{uuid.uuid4().hex[:12]}"
    job = Job(
        id=job_id,
        job_type="video_analysis",
        status="running",
        progress=5,
        message="Initializing speech analysis...",
        details=None
    )
    db.add(job)
    db.commit()

    background_tasks.add_task(
        run_analyze_video_worker,
        video_id=video_id,
        job_id=job_id,
        clip_count=req.clip_count or 5,
        lab_mode=req.lab_mode or "sermon",
        min_duration=req.min_duration or 15.0,
        max_duration=req.max_duration or 60.0,
        timeline_strategy=req.timeline_strategy or "timeline_balanced"
    )

    return {
        "status": "analyzing",
        "job_id": job_id,
        "message": "AI is analyzing your video for important moments..."
    }

class SegmentCutItem(BaseModel):
    id: Optional[str] = None
    title: str
    start_time: float
    end_time: float
    score: Optional[int] = 95
    reason: Optional[str] = ""
    text: Optional[str] = ""

class CutSegmentsRequest(BaseModel):
    segments: List[SegmentCutItem]
    framing_mode: Optional[str] = "smart_face"
    burn_captions: Optional[bool] = True
    caption_style: Optional[str] = "word_red"
    resolution: Optional[str] = "1080p"
    aspect_ratio: Optional[str] = "9:16"

def run_cut_selected_segments_worker(
    video_id: int,
    job_id: str,
    segments: List[Dict[str, Any]],
    framing_mode: str = "smart_face",
    burn_captions: bool = True,
    caption_style: str = "word_red",
    resolution: str = "1080p",
    aspect_ratio: str = "9:16"
):
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        job = db.query(Job).filter(Job.id == job_id).first()
        if not video or not job:
            return

        t_file = Path(video.transcript_path) if video.transcript_path else (TRANSCRIPTS_DIR / f"{video.id}_transcript.json")
        tdata = {}
        if t_file.exists():
            with open(t_file, "r", encoding="utf-8") as f:
                tdata = json.load(f)

        video_path = UPLOADS_DIR / video.filename
        mined_clips = []
        total_clips = max(1, len(segments))
        budget_per_clip = 90.0 / total_clips

        for idx, seg in enumerate(segments, 1):
            clip = Clip(
                video_id=video.id,
                user_id=video.user_id,
                title=seg.get("title", f"Clip {idx}"),
                start_time=float(seg["start_time"]),
                end_time=float(seg["end_time"]),
                aspect_ratio=f"{aspect_ratio} ({resolution})",
                status="rendering",
                caption_style=caption_style if burn_captions else "none"
            )
            db.add(clip)
            db.commit()
            db.refresh(clip)

            # Thumbnail
            thumb_name = f"clip_{clip.id}_thumb.jpg"
            thumb_path = TEMP_DIR / thumb_name
            generate_thumbnail(video_path, thumb_path, time_sec=clip.start_time + 0.5)
            clip.thumbnail_path = f"/media/temp/{thumb_name}"
            db.commit()

            # ASS subtitles if enabled
            ass_file = None
            if burn_captions and tdata:
                ass_file = TEMP_DIR / f"clip_{clip.id}.ass"
                generate_ass_subtitle_file(
                    transcript=tdata,
                    clip_start=clip.start_time,
                    clip_end=clip.end_time,
                    output_ass_path=ass_file,
                    style_name=caption_style,
                    resolution=resolution,
                    aspect_ratio=aspect_ratio
                )

            out_name = f"clip_{clip.id}.mp4"
            out_path = CLIPS_DIR / out_name

            base_pct = 5 + int((idx - 1) * budget_per_clip)

            def render_cb(pct, msg):
                job.progress = min(98, base_pct + int((pct / 100.0) * budget_per_clip))
                cap_lbl = "with viral pop captions" if burn_captions else "clean"
                aspect_lbl = "16:9" if aspect_ratio == "16:9" else "9:16"
                job.message = f"Rendering {aspect_lbl} {resolution} Clip #{idx}/{total_clips} ({cap_lbl}): '{clip.title[:22]}'..."
                db.commit()

            render_vertical_clip(
                source_video_path=video_path,
                output_clip_path=out_path,
                start_time=clip.start_time,
                end_time=clip.end_time,
                framing_mode=framing_mode,
                subtitle_ass_path=ass_file,
                progress_callback=render_cb,
                resolution=resolution,
                burn_captions=burn_captions,
                aspect_ratio=aspect_ratio
            )

            clip.file_path = f"/media/clips/{out_name}"
            clip.status = "ready"
            db.commit()
            mined_clips.append(clip)

        job.status = "completed"
        job.progress = 100
        job.message = f"Success! Cut {len(mined_clips)} shorts ready to download & post!"
        db.commit()

    except Exception as e:
        logger.error(f"Cutting selected segments failed: {e}", exc_info=True)
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = "failed"
            job.message = f"Cutting error: {str(e)}"
            db.commit()
    finally:
        db.close()

@router.post("/{video_id}/cut-segments")
def cut_selected_video_segments(
    video_id: int,
    req: CutSegmentsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if not req.segments:
        raise HTTPException(status_code=400, detail="No segments selected to cut")

    job_id = f"job_cut_{uuid.uuid4().hex[:12]}"
    job = Job(
        id=job_id,
        job_type="cut_segments",
        status="running",
        progress=5,
        message=f"Starting to cut {len(req.segments)} selected shorts...",
        details=None
    )
    db.add(job)
    db.commit()

    seg_dicts = [s.dict() for s in req.segments]

    background_tasks.add_task(
        run_cut_selected_segments_worker,
        video_id=video_id,
        job_id=job_id,
        segments=seg_dicts,
        framing_mode=req.framing_mode or "smart_face",
        burn_captions=req.burn_captions if req.burn_captions is not None else True,
        caption_style=req.caption_style or "word_red",
        resolution=req.resolution or "1080p",
        aspect_ratio=req.aspect_ratio or "9:16"
    )

    return {
        "status": "queued",
        "job_id": job_id,
        "total_clips": len(req.segments),
        "message": f"Cutting {len(req.segments)} shorts in background..."
    }
