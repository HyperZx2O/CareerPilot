"""
Supabase data-access client.

Provides a lazy-initialised Supabase client and CRUD helpers for the
tables defined in the database schema.  Falls back to the in-memory
``_supabase_cvs`` dict when ``SUPABASE_URL`` is absent (tests / local).
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

# In-memory fallback (shared with pinecone_client for test compatibility)
from backend.db.pinecone_client import get_supabase_cvs

# ---------------------------------------------------------------------------
# Supabase client (lazily initialised)
# ---------------------------------------------------------------------------
_supabase_client = None


def get_supabase_client():
    """
    Return a live Supabase client or ``None`` when not configured.

    Reads from:
      - SUPABASE_URL        (e.g. https://xxx.supabase.co)
      - SUPABASE_SERVICE_KEY  (service-role key — bypasses RLS for backend)
        Falls back to SUPABASE_ANON_KEY if service key is missing.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")

    if not url or not key:
        return None  # test / local mode

    try:
        from supabase import create_client
        _supabase_client = create_client(url, key)
        return _supabase_client
    except Exception:
        return None


# ---------------------------------------------------------------------------
# CV helpers
# ---------------------------------------------------------------------------

def create_cv_record(
    user_id: str,
    file_name: str,
    file_type: str,
) -> str:
    """Insert a CV row and return the generated cv_id."""
    cv_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()
    client = get_supabase_client()
    if client:
        client.table("cvs").insert({
            "id": cv_id,
            "user_id": user_id,
            "file_name": file_name,
            "file_type": file_type,
            "processing_status": "pending",
            "created_at": now,
            "updated_at": now,
        }).execute()
    else:
        store = get_supabase_cvs()
        store[cv_id] = {
            "user_id": user_id,
            "file_name": file_name,
            "file_type": file_type,
            "sections": [],
            "processing_status": "pending",
        }
    return cv_id


def update_cv_status(
    cv_id: str,
    status: str,
    sections_found: Optional[list[str]] = None,
    error_message: Optional[str] = None,
) -> None:
    """Update processing_status (and optionally sections_found) for a CV."""
    now = datetime.now(timezone.utc).isoformat()
    client = get_supabase_client()
    if client:
        payload: dict = {"processing_status": status, "updated_at": now}
        if sections_found is not None:
            payload["sections_found"] = sections_found
        if error_message:
            payload["error_message"] = error_message
        client.table("cvs").update(payload).eq("id", cv_id).execute()
    else:
        store = get_supabase_cvs()
        if cv_id in store:
            store[cv_id]["processing_status"] = status
            if sections_found is not None:
                store[cv_id]["sections"] = sections_found


def get_cv_record(cv_id: str, user_id: Optional[str] = None) -> Optional[dict]:
    """Fetch a CV record.  Returns None if not found or ownership fails."""
    client = get_supabase_client()
    if client:
        q = client.table("cvs").select("*").eq("id", cv_id)
        if user_id:
            q = q.eq("user_id", user_id)
        result = q.execute()
        rows = result.data or []
        return rows[0] if rows else None
    else:
        store = get_supabase_cvs()
        rec = store.get(cv_id)
        if rec is None:
            return None
        if user_id and rec.get("user_id") != user_id:
            return None
        return rec


def get_cv_sections(cv_id: str) -> list[str]:
    """Return sections_found for a CV (empty list if not found)."""
    rec = get_cv_record(cv_id)
    if rec is None:
        return []
    return rec.get("sections_found") or rec.get("sections") or []


# ---------------------------------------------------------------------------
# Application (Tracker) helpers
# ---------------------------------------------------------------------------

def create_application(user_id: str, data: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    app_id = str(uuid4())
    row = {
        "id": app_id,
        "user_id": user_id,
        "job_title": data["job_title"],
        "company": data["company"],
        "location": data.get("location"),
        "deadline": data.get("deadline"),
        "status": data.get("status", "applied"),
        "notes": data.get("notes"),
        "job_id": data.get("job_id"),
        "fit_score": data.get("fit_score"),
        "applied_at": now,
        "updated_at": now,
    }
    client = get_supabase_client()
    if client:
        client.table("applications").insert(row).execute()
    return row


def list_applications(user_id: str, status: Optional[str] = None, page: int = 1, per_page: int = 20) -> dict:
    client = get_supabase_client()
    if client:
        q = client.table("applications").select("*", count="exact").eq("user_id", user_id)
        if status:
            q = q.eq("status", status)
        q = q.order("applied_at", desc=True).range((page - 1) * per_page, page * per_page - 1)
        result = q.execute()
        return {"applications": result.data or [], "total": result.count or 0}
    return {"applications": [], "total": 0}


def update_application(app_id: str, user_id: str, data: dict) -> Optional[dict]:
    now = datetime.now(timezone.utc).isoformat()
    data["updated_at"] = now
    client = get_supabase_client()
    if client:
        result = (
            client.table("applications")
            .update(data)
            .eq("id", app_id)
            .eq("user_id", user_id)
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None
    return None


def delete_application(app_id: str, user_id: str) -> bool:
    client = get_supabase_client()
    if client:
        client.table("applications").delete().eq("id", app_id).eq("user_id", user_id).execute()
        return True
    return False


# ---------------------------------------------------------------------------
# Goal helpers
# ---------------------------------------------------------------------------

def create_goal(user_id: str, data: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    goal_id = str(uuid4())
    row = {
        "id": goal_id,
        "user_id": user_id,
        "title": data["title"],
        "target_date": data.get("target_date"),
        "progress": data.get("progress", 0),
        "created_at": now,
    }
    client = get_supabase_client()
    if client:
        client.table("goals").insert(row).execute()
    return row


def list_goals(user_id: str) -> list[dict]:
    client = get_supabase_client()
    if client:
        result = client.table("goals").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data or []
    return []


def update_goal(goal_id: str, user_id: str, data: dict) -> Optional[dict]:
    client = get_supabase_client()
    if client:
        result = (
            client.table("goals")
            .update(data)
            .eq("id", goal_id)
            .eq("user_id", user_id)
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None
    return None


def delete_goal(goal_id: str, user_id: str) -> bool:
    client = get_supabase_client()
    if client:
        client.table("goals").delete().eq("id", goal_id).eq("user_id", user_id).execute()
        return True
    return False


# ---------------------------------------------------------------------------
# Todo helpers
# ---------------------------------------------------------------------------

def create_todo(user_id: str, data: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    todo_id = str(uuid4())
    row = {
        "id": todo_id,
        "user_id": user_id,
        "title": data["title"],
        "due_date": data.get("due_date"),
        "goal_id": data.get("goal_id"),
        "done": False,
        "created_at": now,
    }
    client = get_supabase_client()
    if client:
        client.table("todos").insert(row).execute()
    return row


def list_todos(user_id: str, date: Optional[str] = None, goal_id: Optional[str] = None) -> list[dict]:
    client = get_supabase_client()
    if client:
        q = client.table("todos").select("*").eq("user_id", user_id)
        if date:
            q = q.eq("due_date", date)
        if goal_id:
            q = q.eq("goal_id", goal_id)
        result = q.order("created_at", desc=True).execute()
        return result.data or []
    return []


def update_todo(todo_id: str, user_id: str, data: dict) -> Optional[dict]:
    client = get_supabase_client()
    if client:
        result = (
            client.table("todos")
            .update(data)
            .eq("id", todo_id)
            .eq("user_id", user_id)
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None
    return None


def delete_todo(todo_id: str, user_id: str) -> bool:
    client = get_supabase_client()
    if client:
        client.table("todos").delete().eq("id", todo_id).eq("user_id", user_id).execute()
        return True
    return False


# ---------------------------------------------------------------------------
# Dashboard stats helper
# ---------------------------------------------------------------------------

def get_dashboard_stats(user_id: str) -> dict:
    client = get_supabase_client()
    if not client:
        return {
            "applications_this_week": 0,
            "applications_last_week": 0,
            "skills_count": 0,
            "roadmap_progress": 0,
            "streak_days": 0,
            "total_applications": 0,
        }
    from datetime import timedelta, date

    today = date.today()
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    last_week_start = (today - timedelta(days=today.weekday() + 7)).isoformat()

    total_res = client.table("applications").select("id", count="exact").eq("user_id", user_id).execute()
    this_week_res = client.table("applications").select("id", count="exact").eq("user_id", user_id).gte("applied_at", week_start).execute()
    last_week_res = client.table("applications").select("id", count="exact").eq("user_id", user_id).gte("applied_at", last_week_start).lt("applied_at", week_start).execute()

    return {
        "applications_this_week": this_week_res.count or 0,
        "applications_last_week": last_week_res.count or 0,
        "skills_count": 0,  # Calculated separately from CV sections
        "roadmap_progress": 0,
        "streak_days": 0,
        "total_applications": total_res.count or 0,
    }
