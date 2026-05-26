"""
Chat router — conversational AI, cover letter, roadmap, session management.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.middleware.auth import get_current_user
from backend.services.rag import (
    SESSION_HISTORY,
    detect_query_type,
    get_system_prompt,
    retrieve_cv_context,
    build_cv_context_string,
    rag_query,
    _call_llm,
    _GROUNDING_INSTRUCTION,
)
from backend.services.cover_letter import generate_cover_letter
from backend.services.roadmap import generate_roadmap
from backend.db.pinecone_client import cv_exists, get_pinecone_vectors

router = APIRouter()

# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)
    session_id: str
    cv_id: str


class ChatResponse(BaseModel):
    reply: str
    sources: List[str]
    query_type: str
    session_id: str
    message_id: str


class SessionCreateRequest(BaseModel):
    cv_id: Optional[str] = None


class CoverLetterRequest(BaseModel):
    cv_id: str
    job_description: str = Field(..., max_length=5000)
    tone: str = "formal"


class CoverLetterResponse(BaseModel):
    cover_letter: str
    sections_used: List[str]
    word_count: int = 0


class RoadmapRequest(BaseModel):
    cv_id: str
    target_role: str
    duration_weeks: int = Field(default=12, ge=1, le=52)


class WeekPlan(BaseModel):
    week: int
    focus: str
    tasks: List[str]
    resources: List[str]


class RoadmapResponse(BaseModel):
    roadmap: List[WeekPlan]
    existing_skills_detected: List[str]
    target_role: str = ""
    duration_weeks: int = 12


# ---------------------------------------------------------------------------
# Helper: verify CV exists (Pinecone or in-memory fallback)
# ---------------------------------------------------------------------------

def _assert_cv_exists(cv_id: str) -> None:
    """Raise 404 if no vectors exist for this cv_id."""
    if cv_exists(cv_id):
        return
    # Fallback: check in-memory store
    store = get_pinecone_vectors()
    if any(v.get("metadata", {}).get("cv_id") == cv_id for v in store.values()):
        return
    raise HTTPException(status_code=404, detail="CV not found")


# ---------------------------------------------------------------------------
# Session management
# ---------------------------------------------------------------------------

@router.post("/session")
async def create_session(
    req: SessionCreateRequest = SessionCreateRequest(),
    user: dict = Depends(get_current_user),
):
    """Create a new chat session and return its ID."""
    sid = str(uuid4())
    SESSION_HISTORY[sid] = []
    return {
        "session_id": sid,
        "cv_id": req.cv_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


@router.delete("/session/{session_id}")
async def delete_session(
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """Clear conversational memory for a session."""
    if session_id not in SESSION_HISTORY:
        raise HTTPException(status_code=404, detail="session not found")
    del SESSION_HISTORY[session_id]
    return {"detail": "deleted"}


@router.get("/session/{session_id}/history")
async def get_session_history(
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """Return the message history for a session."""
    history = SESSION_HISTORY.get(session_id)
    if history is None:
        raise HTTPException(status_code=404, detail="session not found")
    return {"session_id": session_id, "messages": history}


# ---------------------------------------------------------------------------
# Core chat endpoint
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    req: ChatRequest,
    user: dict = Depends(get_current_user),
):
    """
    Main RAG chat endpoint.

    Detects query type, retrieves relevant CV chunks from Pinecone,
    composes a grounded prompt (with conversation history), calls the LLM,
    and returns the reply with source sections.
    """
    if len(req.message) > 2000:
        raise HTTPException(status_code=400, detail="Message exceeds 2000 character limit")

    # Determine query type and system prompt
    qtype = detect_query_type(req.message)
    system_prompt = get_system_prompt(qtype)
    full_system = (
        f"{system_prompt}\n\n{_GROUNDING_INSTRUCTION}"
    )

    # Retrieve CV context
    chunks = retrieve_cv_context(req.message, req.cv_id)
    context_str = build_cv_context_string(chunks)
    if context_str:
        full_system += f"\n\n[CV CONTEXT]\n{context_str}"

    # Build message list with history
    history = SESSION_HISTORY.get(req.session_id, [])
    messages = [{"role": "system", "content": full_system}]
    messages.extend(history)
    messages.append({"role": "user", "content": req.message})

    # Call LLM
    answer = _call_llm(
        messages,
        max_tokens=1000,
        temperature=0.3 if qtype in ("readiness", "gap") else 0.4,
    )

    # Update session history (cap at 20 messages = 10 turns)
    updated_history = history + [
        {"role": "user", "content": req.message},
        {"role": "assistant", "content": answer},
    ]
    if len(updated_history) > 20:
        updated_history = updated_history[-20:]
    SESSION_HISTORY[req.session_id] = updated_history

    sources = [c.get("section") for c in chunks if c.get("section")]
    return {
        "reply": answer,
        "sources": sources,
        "query_type": qtype,
        "session_id": req.session_id,
        "message_id": str(uuid4()),
    }


# ---------------------------------------------------------------------------
# Cover letter
# ---------------------------------------------------------------------------

@router.post("/cover-letter", response_model=CoverLetterResponse)
async def cover_letter_endpoint(
    req: CoverLetterRequest,
    user: dict = Depends(get_current_user),
):
    """Generate a personalised cover letter grounded in the user's CV."""
    tone = req.tone if req.tone in ("formal", "friendly", "enthusiastic") else "formal"

    # Verify CV exists
    store = get_pinecone_vectors()
    if not any(v.get("metadata", {}).get("cv_id") == req.cv_id for v in store.values()):
        if not cv_exists(req.cv_id):
            raise HTTPException(status_code=404, detail="CV not found")

    result = generate_cover_letter(req.cv_id, req.job_description, tone)
    letter = result.get("cover_letter", "")
    return {
        "cover_letter": letter,
        "sections_used": result.get("sections_used", []),
        "word_count": len(letter.split()),
    }


# ---------------------------------------------------------------------------
# Roadmap
# ---------------------------------------------------------------------------

@router.post("/roadmap", response_model=RoadmapResponse)
async def roadmap_endpoint(
    req: RoadmapRequest,
    user: dict = Depends(get_current_user),
):
    """Generate a week-by-week learning roadmap for a target role."""
    store = get_pinecone_vectors()
    if not any(v.get("metadata", {}).get("cv_id") == req.cv_id for v in store.values()):
        if not cv_exists(req.cv_id):
            raise HTTPException(status_code=404, detail="CV not found")

    result = generate_roadmap(req.cv_id, req.target_role, req.duration_weeks)
    return {
        **result,
        "target_role": req.target_role,
        "duration_weeks": req.duration_weeks,
    }
