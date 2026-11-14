# PRUNE MASTER AI 🎬⚡

An intelligent, AI-powered vertical video cutting studio that transforms long videos (sermons, podcasts, teachings, conferences) into viral vertical shorts for YouTube Shorts, Instagram Reels, and TikTok.

---

## 🌟 Key Features

- **⚡ Multi-Video Batch Mining Studio**: Select 2, 3, 5+ uploaded videos at once to process and cut clips concurrently with live parallel progress tracking trays.
- **🛡️ 0% Zero-Scene Repetition Engine**: Strict mathematical guarantee that no scene, sentence, audio, or footage overlaps across mined shorts from the same video.
- **⏱️ Extended Timing Presets (Up to 2m 30s & 3m)**: Built-in support for short punchy clips (15s–60s) up to long sermon & narrative shorts (120s–180s) with ⚡ Auto-Split duration calculator.
- **🎯 Auto Face-Track & Smart Centering**: Scans video frames with local OpenCV facial detection to automatically center or smoothly pan with speakers across 9:16 vertical frames.
- **✨ Dynamic Burned-in Captions & Karaoke**: High-contrast, rhythmically chunked ASS captions positioned inside the safe zone with Yellow Pop, Purple Pop, and Clean White styles.
- **🌐 Permanent Public Domain Tunnel**: Preconfigured with reserved static tunnel (`https://voter-accurate-buffing.ngrok-free.dev`) so you can access Prune Master AI from any phone, laptop, or remote client anytime.
- **🔒 100% Privacy & Local Performance**: Original videos stay safely on your PC; local transcription powered by `faster-whisper` (CTranslate2 int8 CPU) with word-level timestamps and VAD.

---

## 🚀 Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLite (SQLAlchemy 2.0), `faster-whisper` 1.2.1, OpenCV, FFmpeg 9.0.2 Gyan build.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons.
- **Theme**: Obsidian / Charcoal Dark Theme (`#09090b` / `#121217`) with brand purple accents (`#a855f7`).

---

## 🛠️ Quick Start (Windows)

### Option 1: Double-Click Launcher
Simply double-click `run.bat` in the root directory. It will:
1. Verify PATH for Python, Node.js, and FFmpeg.
2. Launch the FastAPI backend on `http://127.0.0.1:8000`.
3. Launch the Vite frontend on `http://localhost:5173`.
4. Launch the permanent Ngrok tunnel on `https://voter-accurate-buffing.ngrok-free.dev`.
5. Automatically open the app in your browser.

### Option 2: Manual Startup

**Backend:**
```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend:**
```powershell
cd frontend
npm run dev
```

---

## 📂 Project Structure

```
clipmaster-ai/
├── run.bat                     # Windows one-click launcher
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI entrypoint, CORS, static mounts
│   │   ├── config.py           # Paths, FFmpeg autodiscovery, settings
│   │   ├── database.py         # SQLite connection & sessionmaker
│   │   ├── models.py           # Video, Clip, and Job models
│   │   ├── routers/
│   │   │   ├── videos.py       # Uploads, batch-mine endpoints, ffprobe
│   │   │   ├── clips.py        # Clip CRUD, rendering triggers, downloads
│   │   │   └── jobs.py         # Background worker queue status
│   │   └── services/
│   │       ├── highlight_service.py     # Gemini Pro & zero-overlap algorithm
│   │       ├── transcription_service.py # faster-whisper local engine
│   │       ├── face_tracker_service.py  # OpenCV face tracking & centering
│   │       └── render_service.py        # ASS caption generator & FFmpeg renderer
│   └── data/
│       ├── uploads/            # Source uploaded videos (read-only)
│       ├── clips/              # Rendered 1080x1920 MP4 vertical shorts
│       ├── temp/               # ASS subtitles, audio WAVs, thumbnails
│       └── transcripts/        # JSON transcript archives
└── frontend/
    ├── src/
    │   ├── App.tsx             # Main dashboard, batch mining & studios
    │   ├── components/         # CapCutEditor, ShowcaseTestimonials, etc.
    │   └── index.css           # Tailwind custom styles
    ├── package.json
    └── vite.config.ts          # Proxy configuration & allowedHosts
```
