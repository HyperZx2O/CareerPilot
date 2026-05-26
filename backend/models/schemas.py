"""
Pydantic request / response schemas shared across routers and tests.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# CV schemas
# ---------------------------------------------------------------------------

class CVUploadResponse(BaseModel):
    cv_id: str
    sections_found: List[str]
    status: str = "complete"


class CVSectionDetail(BaseModel):
    section: str
    content: str
    token_count: Optional[int] = None


class CVSectionsResponse(BaseModel):
    cv_id: str
    sections: List[str]


# ---------------------------------------------------------------------------
# Chat schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)
    session_id: str
    cv_id: str


class ChatResponse(BaseModel):
    reply: str
    sources: List[str]
    query_type: str = "general"
    session_id: str
    message_id: str


class SessionCreateRequest(BaseModel):
    cv_id: Optional[str] = None


class SessionCreateResponse(BaseModel):
    session_id: str
    cv_id: Optional[str] = None
    created_at: str


# ---------------------------------------------------------------------------
# Cover letter schemas
# ---------------------------------------------------------------------------

class CoverLetterRequest(BaseModel):
    cv_id: str
    job_description: str = Field(..., max_length=5000)
    tone: str = Field(default="formal", pattern="^(formal|friendly|enthusiastic)$")


class CoverLetterResponse(BaseModel):
    cover_letter: str
    sections_used: List[str]
    word_count: int = 0


# ---------------------------------------------------------------------------
# Roadmap schemas
# ---------------------------------------------------------------------------

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
# Job search schemas
# ---------------------------------------------------------------------------

class JobResult(BaseModel):
    id: str
    title: str
    company: str
    location: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = None
    deadline: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    source: str = "jsearch"
    fit_score: Optional[int] = None
    fit_reasons: List[str] = []
    gap_reasons: List[str] = []
    fetched_at: Optional[str] = None


class JobSearchResponse(BaseModel):
    jobs: List[JobResult]
    total: int
    page: int
    per_page: int


class FitRequest(BaseModel):
    job_description: str = Field(..., max_length=5000)
    cv_id: str


class FitResponse(BaseModel):
    fit_score: int
    fit_reasons: List[str]
    gap_reasons: List[str]


# ---------------------------------------------------------------------------
# Tracker — Application schemas
# ---------------------------------------------------------------------------

class ApplicationCreate(BaseModel):
    job_title: str
    company: str
    location: Optional[str] = None
    deadline: Optional[str] = None
    status: str = Field(default="applied", pattern="^(applied|interviewing|offer|rejected)$")
    notes: Optional[str] = None
    job_id: Optional[str] = None
    fit_score: Optional[int] = Field(default=None, ge=0, le=100)


class ApplicationUpdate(BaseModel):
    job_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    fit_score: Optional[int] = Field(default=None, ge=0, le=100)


class Application(BaseModel):
    id: str
    user_id: str
    job_title: str
    company: str
    location: Optional[str] = None
    deadline: Optional[str] = None
    status: str
    notes: Optional[str] = None
    job_id: Optional[str] = None
    fit_score: Optional[int] = None
    applied_at: str
    updated_at: str


class ApplicationListResponse(BaseModel):
    applications: List[dict]
    total: int


# ---------------------------------------------------------------------------
# Tracker — Goal schemas
# ---------------------------------------------------------------------------

class GoalCreate(BaseModel):
    title: str
    target_date: Optional[str] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_date: Optional[str] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)


# ---------------------------------------------------------------------------
# Tracker — Todo schemas
# ---------------------------------------------------------------------------

class TodoCreate(BaseModel):
    title: str
    due_date: Optional[str] = None
    goal_id: Optional[str] = None


class TodoUpdate(BaseModel):
    done: Optional[bool] = None
    title: Optional[str] = None
    due_date: Optional[str] = None
    goal_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    applications_this_week: int
    applications_last_week: int
    skills_count: int
    roadmap_progress: int
    streak_days: int
    total_applications: int
