@echo off
title PRUNE MASTER AI Launcher
cd /d "%~dp0"

echo ========================================================
echo               STARTING PRUNE MASTER AI
echo ========================================================
echo.

:: Ensure local PATH includes installed Python, Node, and FFmpeg
set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%LOCALAPPDATA%\Programs\nodejs;%PATH%"

:: 1. Launch FastAPI Backend in a separate window
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "PRUNE MASTER AI - Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak >nul

:: 2. Launch Vite Frontend in a separate window
echo Starting Frontend on http://localhost:5173 ...
start "PRUNE MASTER AI - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: 3. Launch Permanent Public Tunnel
echo Starting Permanent Public Domain (https://voter-accurate-buffing.ngrok-free.dev) ...
start "PRUNE MASTER AI - Public Tunnel" cmd /k "cd /d "%~dp0" && ngrok.exe http 5173 --url=https://voter-accurate-buffing.ngrok-free.dev"

:: Wait 3 seconds then open default browser
timeout /t 3 /nobreak >nul
echo Opening PRUNE MASTER AI in your browser...
start http://localhost:5173

echo.
echo ========================================================
echo  PRUNE MASTER AI is now running!
echo  Local Frontend:    http://localhost:5173
echo  Backend API:       http://127.0.0.1:8000
echo  Permanent Domain:  https://voter-accurate-buffing.ngrok-free.dev
echo  Close the popup terminal windows when you want to stop.
echo ========================================================
