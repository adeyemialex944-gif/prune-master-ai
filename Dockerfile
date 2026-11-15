# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend with FFmpeg
FROM python:3.11-slim
WORKDIR /app

# Install FFmpeg, Node.js (for yt-dlp JS runtime), and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    nodejs \
    libsm6 \
    libxext6 \
    libglib2.0-0 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Default port: 7860 (Hugging Face Spaces) or overridden by $PORT on Render/Railway
ENV PORT=7860
EXPOSE 7860

WORKDIR /app/backend
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
