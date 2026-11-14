import glob
import os
import shutil
from pathlib import Path

# Silence Hugging Face symlink warning on standard Windows permissions
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# Paths
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

DATA_DIR = BACKEND_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
CLIPS_DIR = DATA_DIR / "clips"
TEMP_DIR = DATA_DIR / "temp"
MODELS_DIR = DATA_DIR / "models"
TRANSCRIPTS_DIR = DATA_DIR / "transcripts"

# Ensure directories exist
for path in (DATA_DIR, UPLOADS_DIR, CLIPS_DIR, TEMP_DIR, MODELS_DIR, TRANSCRIPTS_DIR):
    path.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_FILE = DATA_DIR / "clipmaster.db"
DATABASE_URL = f"sqlite:///{DATABASE_FILE.as_posix()}"

# Auto-discover FFmpeg / FFprobe if not in active session PATH
def _ensure_ffmpeg_path():
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        pattern = os.path.expanduser("~/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_*/ffmpeg-*/bin")
        matches = glob.glob(pattern)
        if matches:
            os.environ["PATH"] = matches[0] + os.pathsep + os.environ.get("PATH", "")

_ensure_ffmpeg_path()

FFMPEG_BIN = shutil.which("ffmpeg")
FFPROBE_BIN = shutil.which("ffprobe")

# Server settings
HOST = "127.0.0.1"
PORT = 8000
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
