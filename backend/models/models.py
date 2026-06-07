"""
DEPRECATED — kept as a stub to avoid breaking any stray imports.

The SQLAlchemy ORM models in this file are no longer used for production
database access.  All persistence goes through the Supabase REST client in
`backend/db/supabase_client.py` and is described in code by the Pydantic
schemas in `backend/models/schemas.py`.

The previous file inherited from `Base`, which is now `None`, causing
`TypeError: NoneType takes no arguments` on import.  This stub preserves the
public names so any code that does `from backend.models.models import X`
keeps working in tests.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class Application:
    id: str = ""
    user_id: Optional[str] = None
    job_title: str = ""
    company: str = ""
    location: Optional[str] = None
    deadline: Optional[str] = None
    status: str = "applied"
    notes: Optional[str] = None
    job_id: Optional[str] = None
    fit_score: Optional[int] = None
    applied_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class ActivityLog:
    id: str = ""
    user_id: Optional[str] = None
    application_id: Optional[str] = None
    event: str = ""
    detail: Optional[dict] = None
    created_at: Optional[str] = None


@dataclass
class Todo:
    id: str = ""
    user_id: Optional[str] = None
    application_id: Optional[str] = None
    goal_id: Optional[str] = None
    title: str = ""
    done: bool = False
    due_at: Optional[str] = None
    created_at: Optional[str] = None


@dataclass
class Goal:
    id: str = ""
    user_id: Optional[str] = None
    title: str = ""
    description: Optional[str] = None
    progress: int = 0
    status: str = "active"
    target_date: Optional[str] = None
    created_at: Optional[str] = None
