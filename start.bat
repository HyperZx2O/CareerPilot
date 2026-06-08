@echo off
title CareerPilot
cd /d "%~dp0"

if not exist ".env" (
    echo [ERROR] .env not found. Copy .env.example to .env and fill in your API keys.
    pause
    exit /b 1
)

echo ============================================
echo  CareerPilot — Starting Backend + Frontend
echo ============================================
echo.

echo [1/2] Starting Backend (FastAPI :8000)...
start "CareerPilot-Backend" cmd /c "uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 4 /nobreak >nul

echo [2/2] Starting Frontend (Next.js :3000)...
start "CareerPilot-Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers should be starting up.
echo   Backend  -> http://localhost:8000
echo   Frontend -> http://localhost:3000
echo.
echo Close the server windows to stop, or press Ctrl+C here.
echo ============================================
pause
