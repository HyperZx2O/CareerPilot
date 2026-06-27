@echo off
title CareerPilot
cd /d "%~dp0"

if not exist ".env" (
    echo [ERROR] .env not found. Copy .env.example to .env and fill in your API keys.
    pause
    exit /b 1
)

echo ============================================
echo  CareerPilot — Starting all services
echo ============================================
echo.

:: --- Ngrok tunnel ---
where ngrok >nul 2>&1
if %errorlevel% equ 0 (
    echo [1/3] Starting Ngrok tunnel...
    start "CareerPilot-Ngrok" cmd /c "ngrok http 8000 --log=stdout"
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] Ngrok not found — skipping tunnel. Webhooks won't reach localhost.
)

:: --- Backend (auto-restart on crash via infinite for /l loop) ---
echo [2/3] Starting Backend (FastAPI :8000)...
start "CareerPilot-Backend" cmd /c "for /l %%x in (1,0,2) do (python -m backend.main & echo [%DATE% %TIME%] Backend crashed, restarting... & timeout /t 3 /nobreak >nul)"

timeout /t 5 /nobreak >nul

:: --- Frontend (auto-restart on crash via infinite for /l loop) ---
echo [3/3] Starting Frontend (Next.js :3000)...
start "CareerPilot-Frontend" cmd /c "for /l %%x in (1,0,2) do (cd /d "%~dp0frontend" && npm run dev & echo [%DATE% %TIME%] Frontend crashed, restarting... & timeout /t 3 /nobreak >nul)"

echo.
echo All services starting up:
echo   Backend  -> http://localhost:8000
echo   Frontend -> http://localhost:3000
echo.
echo Each service runs in its own window with auto-restart.
echo Close its window to stop that service.
echo ============================================
