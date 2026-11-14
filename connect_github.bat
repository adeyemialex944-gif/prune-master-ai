@echo off
title Prune Master AI - Connect to GitHub
cd /d "%~dp0"
echo ============================================================
echo         PRUNE MASTER AI - GITHUB CONNECTION WIZARD
echo ============================================================
echo.
echo Step 1: Connecting your GitHub account via browser...
echo (A one-time authorization code will appear and browser will open)
echo.
gh auth login --web -p https
if %errorlevel% neq 0 (
    echo.
    echo Login was cancelled or failed. Please run connect_github.bat again.
    pause
    exit /b %errorlevel%
)
echo.
echo ============================================================
echo Step 2: Creating remote repository and pushing your code...
echo ============================================================
echo.
gh repo create prune-master-ai --public --source=. --remote=origin --push
if %errorlevel% neq 0 (
    echo.
    echo Syncing branch to origin main...
    git push -u origin main
)
echo.
echo ============================================================
echo   SUCCESS! Prune Master AI is successfully connected to GitHub!
echo ============================================================
pause
