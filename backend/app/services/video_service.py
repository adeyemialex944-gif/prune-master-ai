import json
import logging
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

from app.config import FFMPEG_BIN, FFPROBE_BIN

logger = logging.getLogger(__name__)

def get_video_metadata(file_path: Path) -> Dict[str, Any]:
    """
    Extracts duration, dimensions, bitrate, and audio track presence using ffprobe.
    """
    ffprobe_cmd = FFPROBE_BIN or "ffprobe"
    cmd = [
        ffprobe_cmd,
        "-v", "error",
        "-show_entries", "format=duration,size,bit_rate:stream=width,height,codec_name,codec_type",
        "-of", "json",
        str(file_path)
    ]

    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(result.stdout)
    except Exception as e:
        logger.error(f"Failed to probe {file_path}: {e}")
        # Fallback to file size if ffprobe fails
        stat = file_path.stat()
        return {
            "duration": 0.0,
            "size": stat.st_size,
            "width": 0,
            "height": 0,
            "has_audio": False,
        }

    format_info = data.get("format", {})
    streams = data.get("streams", [])

    duration = float(format_info.get("duration", 0.0))
    file_size = int(format_info.get("size", file_path.stat().st_size))

    width = 0
    height = 0
    has_audio = False

    for stream in streams:
        if stream.get("codec_type") == "video" and not width:
            width = int(stream.get("width", 0))
            height = int(stream.get("height", 0))
        elif stream.get("codec_type") == "audio":
            has_audio = True

    return {
        "duration": duration,
        "size": file_size,
        "width": width,
        "height": height,
        "has_audio": has_audio,
    }

def extract_audio_for_transcription(video_path: Path, output_wav_path: Path) -> bool:
    """
    Extracts a 16kHz mono 16-bit PCM WAV audio file from the video.
    This format is optimal for whisper and faster-whisper.
    """
    ffmpeg_cmd = FFMPEG_BIN or "ffmpeg"
    cmd = [
        ffmpeg_cmd,
        "-y",
        "-threads", "0",
        "-i", str(video_path),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        str(output_wav_path)
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return output_wav_path.exists() and output_wav_path.stat().st_size > 0
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg audio extraction failed: {e.stderr.decode('utf-8', errors='ignore')}")
        return False
    except Exception as e:
        logger.error(f"Unexpected audio extraction error: {e}")
        return False

def generate_thumbnail(video_path: Path, output_thumb_path: Path, time_sec: float = 1.0) -> bool:
    """
    Extracts a representative video frame as a JPG thumbnail.
    """
    ffmpeg_cmd = FFMPEG_BIN or "ffmpeg"
    cmd = [
        ffmpeg_cmd,
        "-y",
        "-ss", str(time_sec),
        "-i", str(video_path),
        "-vframes", "1",
        "-q:v", "2",
        str(output_thumb_path)
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return output_thumb_path.exists() and output_thumb_path.stat().st_size > 0
    except Exception as e:
        logger.warning(f"Thumbnail generation failed: {e}")
        return False

def download_youtube_video(url: str, output_dir: Path) -> Dict[str, Any]:
    """
    Downloads a video from YouTube or other web links using yt-dlp locally.
    Returns the downloaded file path and video title.
    """
    import yt_dlp
    import uuid

    prefix = uuid.uuid4().hex[:8]
    out_template = str(output_dir / f"{prefix}_%(title).50s.%(ext)s")

    ydl_opts = {
        'format': 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[ext=mp4]/best',
        'outtmpl': out_template,
        'merge_output_format': 'mp4',
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['ios', 'android', 'web'],
            }
        },
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        mp4_candidate = Path(filename).with_suffix(".mp4")
        final_path = mp4_candidate if mp4_candidate.exists() else Path(filename)
        return {
            "path": final_path,
            "title": info.get("title", "YouTube Video"),
            "duration": float(info.get("duration", 0.0))
        }
