"""
FastAPI application entry point.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import cv, chat, jobs, tracker

app = FastAPI(
    title="CareerPilot API",
    description="AI-powered career assistant backend",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — update allow_origins with your deployed frontend URL
# ---------------------------------------------------------------------------
_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Health check (unauthenticated)
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(cv.router,      prefix="/api/cv",      tags=["CV"])
app.include_router(chat.router,    prefix="/api/chat",    tags=["Chat"])
app.include_router(jobs.router,    prefix="/api/jobs",    tags=["Jobs"])
app.include_router(tracker.router, prefix="/api/tracker", tags=["Tracker"])
