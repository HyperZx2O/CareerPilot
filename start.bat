@echo off
title CareerPilot Launcher
echo ===================================================
echo 🚀 CareerPilot — AI-first Career OS
echo ===================================================
echo.
echo Starting FastAPI Backend and Next.js Frontend...
echo.

:: Start Backend
start "CareerPilot Backend" cmd /c "cd backend && title Backend && pip install -r requirements.txt && python -m uvicorn main:app --reload --port 8000"

:: Start Frontend
start "CareerPilot Frontend" cmd /c "cd frontend && title Frontend && npm run dev"

echo.
echo ===================================================
echo Both services are starting in separate windows!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔌 Backend:  http://localhost:8000/docs
echo ===================================================
echo.
timeout /t 5 >nul
start http://localhost:3000
exit
