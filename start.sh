#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
    echo "[ERROR] .env not found. Copy .env.example to .env and fill in your API keys."
    exit 1
fi

echo "============================================"
echo " CareerPilot — Starting Backend + Frontend"
echo "============================================"
echo ""

cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "Done."
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "[1/2] Starting Backend (FastAPI :8000)..."
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

sleep 3

echo "[2/2] Starting Frontend (Next.js :3000)..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "Both servers are starting up."
echo "  Backend  -> http://localhost:8000"
echo "  Frontend -> http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers."
echo "============================================"

wait
