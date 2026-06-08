from datetime import date, datetime
from typing import Optional, Union
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

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
    applied_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

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
    due_date: Optional[Union[date, str]] = None
    done: bool
    goal_id: Optional[str] = None
    created_at: datetime

    @field_validator("due_date", mode="before")
    @classmethod
    def parse_due_date(cls, v):
        if v is None:
            return None
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                return v  # Return as-is if parsing fails
        return v

    model_config = ConfigDict(from_attributes=True)


# ── Goal Schemas ───────────────────────────────────────────────────

class GoalCreate(BaseModel):
    user_id: Optional[str] = None
    title: str = Field(..., min_length=1, description="Goal title cannot be empty")
    description: Optional[str] = Field(None, max_length=120)
    target_role: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^(high|medium|low)$")
    target_date: Optional[date] = None

    @field_serializer("target_date")
    def _ser_date(self, v: Optional[date]) -> Optional[str]:
        return v.isoformat() if v is not None else None

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = Field(None, max_length=120)
    target_role: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^(high|medium|low)$")
    target_date: Optional[date] = None
    progress: Optional[int] = Field(None, ge=0, le=100)

    @field_serializer("target_date")
    def _ser_date(self, v: Optional[date]) -> Optional[str]:
        return v.isoformat() if v is not None else None

class GoalResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    target_role: Optional[str] = None
    priority: Optional[str] = None
    target_date: Optional[date] = None
    progress: int
    source: Optional[str] = None
    created_at: datetime

    @field_serializer("target_date")
    def _ser_date(self, v: Optional[date]) -> Optional[str]:
        return v.isoformat() if v is not None else None

    model_config = ConfigDict(from_attributes=True)
