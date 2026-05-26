from datetime import date, datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

class ApplicationStatus(str, Enum):
    applied = "applied"
    interviewing = "interviewing"
    offer = "offer"
    rejected = "rejected"

class ApplicationBase(BaseModel):
    user_id: Optional[str] = None
    job_title: str = Field(..., min_length=1, description="Job title cannot be empty")
    company: str = Field(..., min_length=1, description="Company name cannot be empty")
    location: Optional[str] = None
    deadline: Optional[date] = None
    status: ApplicationStatus = ApplicationStatus.applied
    notes: Optional[str] = None
    job_id: Optional[str] = None
    fit_score: Optional[int] = Field(None, ge=0, le=100)

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    job_title: Optional[str] = Field(None, min_length=1)
    company: Optional[str] = Field(None, min_length=1)
    location: Optional[str] = None
    deadline: Optional[date] = None
    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None
    job_id: Optional[str] = None
    fit_score: Optional[int] = Field(None, ge=0, le=100)

class ApplicationResponse(ApplicationBase):
    id: str
    applied_at: datetime
    updated_at: datetime

    # Enable serialization from ORM models in Pydantic v2
    model_config = ConfigDict(from_attributes=True)


# ── To-Do Schemas ──────────────────────────────────────────────────

class TodoCreate(BaseModel):
    user_id: Optional[str] = None
    title: str = Field(..., min_length=1, description="Todo title cannot be empty")
    due_date: Optional[date] = None
    goal_id: Optional[str] = None

class TodoUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    due_date: Optional[date] = None
    done: Optional[bool] = None
    goal_id: Optional[str] = None

class TodoResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    due_date: Optional[date] = None
    done: bool
    goal_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Goal Schemas ───────────────────────────────────────────────────

class GoalCreate(BaseModel):
    user_id: Optional[str] = None
    title: str = Field(..., min_length=1, description="Goal title cannot be empty")
    target_date: Optional[date] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    target_date: Optional[date] = None
    progress: Optional[int] = Field(None, ge=0, le=100)

class GoalResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    target_date: Optional[date] = None
    progress: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
