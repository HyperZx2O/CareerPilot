import sys
from datetime import date as date_type, datetime, timedelta, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from backend.auth import get_current_user, get_supabase_user_client
from backend.logger import get_logger

logger = get_logger("tracker")

_root_path = Path(__file__).resolve().parent.parent.parent
_integrations_path = _root_path / "integrations"
for _p in (str(_root_path), str(_integrations_path)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Try to import job_hunter at module level so it's patchable in tests.
# Falls back to None if integrations dependencies aren't installed.
try:
    from job_hunter import get_structured_jobs
except ImportError:
    get_structured_jobs = None  # type: ignore[assignment]


from backend.models.schemas import (
    ApplicationCreate, ApplicationUpdate, ApplicationResponse,
    TodoCreate, TodoUpdate, TodoResponse,
    GoalCreate, GoalUpdate, GoalResponse,
)

router = APIRouter(
    prefix="/api/tracker",
    tags=["Kanban Tracker"]
)


@router.get("/applications")
async def get_applications_endpoint(user = Depends(get_current_user), user_id: str | None = Query(None, description="User ID to filter (optional)")):
    """
    Fetches all applications for the authenticated user, ordered by applied_at descending.
    """
    # If no user_id provided, default to authenticated user's ID
    if user_id is None:
        user_id = str(user.id)
    else:
        # If user_id provided, must match authenticated user
        if user_id != str(user.id):
            raise HTTPException(status_code=403, detail="Forbidden: cannot access other users' applications")
    supabase = get_supabase_user_client(user.jwt)
    result = supabase.table("applications").select("*").eq("user_id", user_id).order("applied_at", desc=True).execute()
    return {"applications": [ApplicationResponse(**app) for app in result.data]}

@router.post("/applications", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application_endpoint(payload: ApplicationCreate, user = Depends(get_current_user)):
    """
    Inserts a new job application for the authenticated user and writes a row in the activity log.
    """
    supabase = get_supabase_user_client(user.jwt)
    payload_dict = payload.model_dump()
    payload_dict["user_id"] = str(user.id)
    if payload_dict.get("applied_at") is None:
        payload_dict["applied_at"] = datetime.now(timezone.utc).isoformat()
    result = supabase.table("applications").insert(payload_dict).execute()
    app_data = result.data[0]
    # Log the activity (defensive - don't crash endpoint if activity_log fails)
    try:
        supabase.table("activity_log").insert({
            "user_id": app_data["user_id"],
            "action": "application_created"
        }).execute()
    except Exception:
        pass  # Activity logging is non-critical
    return ApplicationResponse(**app_data)

@router.patch("/applications/{id}", response_model=ApplicationResponse)
async def update_application_endpoint(id: str, payload: ApplicationUpdate, user = Depends(get_current_user)):
    """
    Partially updates an existing application belonging to the authenticated user and logs the activity.
    """
    supabase = get_supabase_user_client(user.jwt)
    # Fetch existing application
    result = supabase.table("applications").select("*").eq("id", id).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{id}' not found."
        )
    app_data = result.data[0]
    # Authorization: ensure the application belongs to the current user
    if app_data.get("user_id") != str(user.id):
        raise HTTPException(status_code=403, detail="Forbidden: cannot modify others' applications")
    # Perform partial update
    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        supabase.table("applications").update(update_data).eq("id", id).execute()
        # Refresh data after update
        result = supabase.table("applications").select("*").eq("id", id).execute()
        app_data = result.data[0]
    # Log the activity (defensive - don't crash endpoint if activity_log fails)
    try:
        supabase.table("activity_log").insert({
            "user_id": app_data["user_id"],
            "action": "application_updated"
        }).execute()
    except Exception:
        pass  # Activity logging is non-critical
    return ApplicationResponse(**app_data)

@router.delete("/applications/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application_endpoint(id: str, user = Depends(get_current_user)):
    """
    Removes a job application belonging to the authenticated user and logs the activity.
    """
    supabase = get_supabase_user_client(user.jwt)
    # Fetch existing application
    result = supabase.table("applications").select("*").eq("id", id).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{id}' not found."
        )
    app_data = result.data[0]
    # Authorization: ensure the application belongs to the current user
    if app_data.get("user_id") != str(user.id):
        raise HTTPException(status_code=403, detail="Forbidden: cannot delete others' applications")
    user_id = app_data["user_id"]
    # Delete application
    supabase.table("applications").delete().eq("id", id).execute()
    # Log the activity (defensive - don't crash endpoint if activity_log fails)
    try:
        supabase.table("activity_log").insert({
            "user_id": user_id,
            "action": "application_deleted"
        }).execute()
    except Exception:
        pass  # Activity logging is non-critical
    return Response(status_code=204)


# ====================================================================
# Helper: recalculate goal progress based on linked todos
# ====================================================================

async def _recalculate_goal_progress(goal_id: str, user_jwt: str = "") -> None:
    """
    Recomputes a goal's progress field as:
        progress = round(done_count / total_count * 100)
    and persists the update.  Called whenever a linked todo's done status changes.
    """
    supabase = get_supabase_user_client(user_jwt)
    
    # Fetch goal
    result = supabase.table("goals").select("*").eq("id", goal_id).execute()
    if not result.data:
        return  # orphaned goal_id – nothing to update
    
    # Count total and done todos for this goal
    todos_result = supabase.table("todos").select("done").eq("goal_id", goal_id).execute()
    todos = todos_result.data
    total = len(todos)
    done = sum(1 for t in todos if t.get("done", False))
    
    progress = round(done / total * 100) if total > 0 else 0
    supabase.table("goals").update({"progress": progress}).eq("id", goal_id).execute()


# ====================================================================
# To-Do Endpoints
# ====================================================================

@router.get("/todos")
async def get_todos_endpoint(user = Depends(get_current_user), user_id: str | None = Query(None, description="User ID to filter (optional)"), date: str | None = Query(None, description="Filter by due_date (YYYY-MM-DD)")):
    """
    Fetches todos for the authenticated user. If `date` is provided, only returns todos whose due_date equals that date.
    """
    # Determine user_id to use
    if user_id is None:
        user_id = str(user.id)
    else:
        if user_id != str(user.id):
            raise HTTPException(status_code=403, detail="Forbidden: cannot access other users' todos")
    supabase = get_supabase_user_client(user.jwt)
    query = supabase.table("todos").select("*").eq("user_id", user_id)
    if date is not None:
        query = query.eq("due_date", date)
    result = query.order("created_at", desc=True).execute()
    return {"todos": [TodoResponse(**t) for t in result.data]}


@router.post("/todos", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
async def create_todo_endpoint(payload: TodoCreate, user = Depends(get_current_user)):
    """
    Creates a new todo for the authenticated user and logs the activity.
    """
    supabase = get_supabase_user_client(user.jwt)
    payload_dict = payload.model_dump()
    # Ensure todo is linked to the authenticated user
    payload_dict["user_id"] = str(user.id)
    result = supabase.table("todos").insert(payload_dict).execute()
    todo_data = result.data[0]
    # Log the activity (defensive - don't crash endpoint if activity_log fails)
    try:
        supabase.table("activity_log").insert({
            "user_id": todo_data["user_id"],
            "action": "todo_created"
        }).execute()
    except Exception:
        pass  # Activity logging is non-critical
    return TodoResponse(**todo_data)


@router.patch("/todos/{id}", response_model=TodoResponse)
async def update_todo_endpoint(id: str, payload: TodoUpdate, user = Depends(get_current_user)):
    """
    Partially updates a todo.  When `done` changes and the todo has a
    linked goal, the goal's progress is automatically recalculated.
    """
    supabase = get_supabase_user_client(user.jwt)
    
    # Fetch existing todo
    result = supabase.table("todos").select("*").eq("id", id).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with ID '{id}' not found.",
        )
    todo_data = result.data[0]
    # Authorization: ensure the todo belongs to the current user
    if todo_data.get("user_id") != str(user.id):
        raise HTTPException(status_code=403, detail="Forbidden: cannot modify others' todos")
    
    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        supabase.table("todos").update(update_data).eq("id", id).execute()
        # Refresh data
        result = supabase.table("todos").select("*").eq("id", id).execute()
        todo_data = result.data[0]
    
    # Log the activity (defensive - don't crash endpoint if activity_log fails)
    try:
        supabase.table("activity_log").insert({
            "user_id": todo_data["user_id"],
            "action": "todo_updated"
        }).execute()
    except Exception:
        pass  # Activity logging is non-critical
    
    # Auto-recalculate linked goal progress when done status changes
    if "done" in update_data and todo_data.get("goal_id"):
        await _recalculate_goal_progress(todo_data["goal_id"], user.jwt)

    return TodoResponse(**todo_data)


@router.delete("/todos/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo_endpoint(id: str, user = Depends(get_current_user)):
    """Deletes a todo by id and logs the activity."""
    supabase = get_supabase_user_client(user.jwt)
    
    # Fetch existing todo
    result = supabase.table("todos").select("*").eq("id", id).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with ID '{id}' not found.",
        )
    todo_data = result.data[0]
    # Authorization: ensure the todo belongs to the current user
    if todo_data.get("user_id") != str(user.id):
        raise HTTPException(status_code=403, detail="Forbidden: cannot delete others' todos")
    user_id = todo_data["user_id"]
    goal_id = todo_data.get("goal_id")
    
    # Delete todo
    supabase.table("todos").delete().eq("id", id).execute()
    
    # Log the activity (defensive - don't crash endpoint if activity_log fails)
    try:
        supabase.table("activity_log").insert({
            "user_id": user_id,
            "action": "todo_deleted"
        }).execute()
    except Exception:
        pass  # Activity logging is non-critical
    
    # Recalculate linked goal progress after removing a todo
    if goal_id:
        await _recalculate_goal_progress(goal_id, user.jwt)


# ====================================================================
# Goal Endpoints
# ====================================================================

@router.get("/goals")
async def get_goals_endpoint(user = Depends(get_current_user)):
    """Fetches all goals for the authenticated user."""
    supabase = get_supabase_user_client(user.jwt)
    result = supabase.table("goals").select("*").eq("user_id", str(user.id)).order("created_at", desc=True).execute()
    return {"goals": [GoalResponse(**g) for g in result.data]}


@router.post("/goals", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal_endpoint(payload: GoalCreate, user = Depends(get_current_user)):
    """Creates a new goal for the authenticated user and logs the activity."""
    supabase = get_supabase_user_client(user.jwt)
    payload_dict = payload.model_dump()
    # Ensure goal linked to the authenticated user
    payload_dict["user_id"] = str(user.id)
    result = supabase.table("goals").insert(payload_dict).execute()
    goal_data = result.data[0]
    # Log the activity (defensive - don't crash endpoint if activity_log fails)
    try:
        supabase.table("activity_log").insert({
            "user_id": goal_data["user_id"],
            "action": "goal_created"
        }).execute()
    except Exception:
        pass  # Activity logging is non-critical
    return GoalResponse(**goal_data)


@router.patch("/goals/{id}", response_model=GoalResponse)
async def update_goal_endpoint(id: str, payload: GoalUpdate, user = Depends(get_current_user)):
    """Partially updates a goal belonging to the authenticated user. The `progress` field is validated 0–100 by the schema."""
    supabase = get_supabase_user_client(user.jwt)

    # Fetch existing goal
    result = supabase.table("goals").select("*").eq("id", id).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal with ID '{id}' not found.",
        )
    goal_data = result.data[0]
    # Authorization: ensure goal belongs to user
    if goal_data.get("user_id") != str(user.id):
        raise HTTPException(status_code=403, detail="Forbidden: cannot modify others' goals")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        supabase.table("goals").update(update_data).eq("id", id).execute()
        # Refresh data
        result = supabase.table("goals").select("*").eq("id", id).execute()
        goal_data = result.data[0]

    # Log the activity (defensive - don't crash endpoint if activity_log fails)
    try:
        supabase.table("activity_log").insert({
            "user_id": goal_data["user_id"],
            "action": "goal_updated"
        }).execute()
    except Exception:
        pass  # Activity logging is non-critical

    return GoalResponse(**goal_data)


@router.delete("/goals/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal_endpoint(id: str, user = Depends(get_current_user)):
    """
    Deletes a goal belonging to the authenticated user and **cascade-deletes** all todos linked to it.
    Logs the activity.
    """
    supabase = get_supabase_user_client(user.jwt)

    # Fetch existing goal
    result = supabase.table("goals").select("*").eq("id", id).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal with ID '{id}' not found.",
        )
    goal_data = result.data[0]
    # Authorization: ensure goal belongs to user
    if goal_data.get("user_id") != str(user.id):
        raise HTTPException(status_code=403, detail="Forbidden: cannot delete others' goals")
    user_id = goal_data["user_id"]

    # Cascade: delete all linked todos first
    supabase.table("todos").delete().eq("goal_id", id).execute()

    # Delete goal
    supabase.table("goals").delete().eq("id", id).execute()

    # Log the activity (defensive - don't crash endpoint if activity_log fails)
    try:
        supabase.table("activity_log").insert({
            "user_id": user_id,
            "action": "goal_deleted"
        }).execute()
    except Exception:
        pass  # Activity logging is non-critical

    return None


@router.post("/goals/generate", status_code=status.HTTP_201_CREATED)
async def generate_goals_endpoint(user = Depends(get_current_user), cv_id: str | None = Query(None, description="Optional CV UUID to extract skills")):
    """
    Generates3 AI career goals from the user's CV skills.
    Clears any existing AI-generated goals for the user first, then inserts new ones.
    """
    supabase = get_supabase_user_client(user.jwt)
    # Use authenticated user's ID
    user_id = str(user.id)

    # Fetch CV skills from cv_chunks
    skills_text = ""
    if cv_id:
        cv_owner = supabase.table("cvs").select("user_id").eq("id", cv_id).execute()
        if not cv_owner.data or cv_owner.data[0].get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Forbidden: cannot access another user's CV")
        chunks_result = supabase.table("cv_chunks").select("chunk_text").eq("cv_id", cv_id).eq("section_type", "skills").execute()
        skills_text = " ".join(c.get("chunk_text", "") for c in chunks_result.data)

    # If no skills found in cv_chunks, try from Pinecone as fallback
    if not skills_text:
        skills_text = _fetch_cv_skills_text(cv_id) or ""

    # If still no skills, use demo/generic skills for development
    if not skills_text:
        skills_text = "JavaScript, React, TypeScript, Node.js, Python, SQL, Git, REST APIs, CSS, HTML"

    if not skills_text:
        return {"goals": [], "message": "No skills found in CV"}

    from backend.services.goals import generate_career_goals
    goals = generate_career_goals(skills_text)

    # Clear existing AI-generated goals for this user (only if source column exists)
    try:
        supabase.table("goals").delete().eq("user_id", user_id).eq("source", "ai").execute()
    except Exception:
        # Fallback: delete all goals if source column doesn't exist yet
        supabase.table("goals").delete().eq("user_id", user_id).execute()

    # Insert new goals
    inserted = []
    for g in goals:
        insert_data = {
            "user_id": user_id,
            "title": g["title"],
            "description": g.get("description", ""),
            "target_role": g.get("target_role", ""),
            "priority": g.get("priority", "medium"),
            "progress": 0,
            "source": "ai",
        }

        result = supabase.table("goals").insert(insert_data).execute()
        if result.data:
            # Build response with only the fields GoalResponse expects
            goal_data = result.data[0]
            inserted.append(GoalResponse(
                id=goal_data["id"],
                user_id=goal_data["user_id"],
                title=goal_data["title"],
                target_date=goal_data.get("target_date"),
                progress=goal_data.get("progress", 0),
                created_at=goal_data.get("created_at", ""),
                description=goal_data.get("description"),
                target_role=goal_data.get("target_role"),
                priority=goal_data.get("priority", "medium"),
                source=goal_data.get("source"),
            ))

    try:
        supabase.table("activity_log").insert({
        "user_id": user_id,
        "action": "goals_generated"
        }).execute()
    except Exception:
        pass  # Activity logging is non-critical

    return {"goals": inserted, "message": f"Generated {len(inserted)} goals from your CV"}


# ====================================================================
# Phase 7 — Helpers
# ====================================================================

def _fetch_cv_skills_text(cv_id: str) -> str | None:
    """
    Fetch the skills section text from Pinecone for the given cv_id.

    Returns the content string, or None if Pinecone is unavailable,
    credentials are missing, or no skills chunk is found.
    This function is deliberately module-level so tests can patch it easily.
    """
    pinecone_key = os.getenv("PINECONE_API_KEY")
    if not pinecone_key or not cv_id:
        return None

    try:
        from pinecone import Pinecone
        index_name = os.getenv("PINECONE_INDEX", "careerpilot-cv")
        pc = Pinecone(api_key=pinecone_key)
        index = pc.Index(index_name)

        # Fetch the skills chunk directly by its known ID pattern
        fetch_resp = index.fetch(ids=[f"{cv_id}-skills"])
        vectors = fetch_resp.get("vectors", {})
        skills_vector = vectors.get(f"{cv_id}-skills")
        if skills_vector:
            return skills_vector.get("metadata", {}).get("content", None)
        return None
    except Exception as e:
        logger.warning("Error fetching CV skills from Pinecone: %s", e)
        return None


def _compute_streak(user_id: str, user_jwt: str = "") -> int:
    """
    Count consecutive days (from today backwards) where the activity_log
    has at least one entry for the user.  Stops on the first day with
    no entry.
    """
    supabase = get_supabase_user_client(user_jwt)
    today = datetime.now(timezone.utc).date()

    # Fetch all activity entries for this user (select only created_at)
    result = supabase.table("activity_log").select("created_at").eq("user_id", user_id).execute()
    
    # Extract unique dates
    active_dates: set[date_type] = set()
    for row in result.data:
        created_at = row.get("created_at")
        if created_at:
            # Handle both datetime strings and date objects
            if isinstance(created_at, str):
                active_dates.add(date_type.fromisoformat(created_at[:10]))
            else:
                active_dates.add(created_at if isinstance(created_at, date_type) else created_at.date())

    streak = 0
    check_date = today
    while check_date in active_dates:
        streak += 1
        check_date -= timedelta(days=1)

    return streak


# ====================================================================
# Phase 7 — Dashboard Stats Endpoint
# ====================================================================

@router.get("/dashboard/stats", tags=["Dashboard"])
async def get_dashboard_stats(
    user = Depends(get_current_user),
    user_id: str = Query(..., description="UUID of the user"),
    cv_id: str | None = Query(None, description="Optional CV UUID to count skills"),
):
    """
    Aggregates dashboard statistics from the database:
    - applications_this_week / applications_last_week
    - skills_count (from Pinecone CV skills text)
    - roadmap_progress (from goal matching 'roadmap')
    - streak_days (consecutive active days)
    """
    # Validate that requested user_id matches authenticated user
    if user_id != str(user.id):
        raise HTTPException(status_code=403, detail="Forbidden: cannot access other users' dashboard stats")
    supabase = get_supabase_user_client(user.jwt)
    now = datetime.now(timezone.utc)
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    fourteen_days_ago = (now - timedelta(days=14)).isoformat()

    # ── Applications this week ─────────────────────────────────────
    this_week_result = supabase.table("applications").select("id", count="exact").eq("user_id", user_id).gte("applied_at", seven_days_ago).execute()
    applications_this_week = this_week_result.count or 0

    # ── Applications last week ─────────────────────────────────────
    last_week_result = supabase.table("applications").select("id", count="exact").eq("user_id", user_id).gte("applied_at", fourteen_days_ago).lt("applied_at", seven_days_ago).execute()
    applications_last_week = last_week_result.count or 0

    # ── Skills count ───────────────────────────────────────────────
    skills_count = 0
    search_query = "software engineer"
    if cv_id:
        skills_text_db = _fetch_cv_skills_text(cv_id)
        if skills_text_db:
            skills_count = len(skills_text_db.split())
            tokens = skills_text_db.split()
            search_query = " ".join(tokens[:3]) if len(tokens) >= 3 else skills_text_db

    # ── Roadmap progress ───────────────────────────────────────────
    roadmap_result = supabase.table("goals").select("progress").eq("user_id", user_id).ilike("title", "%roadmap%").limit(1).execute()
    roadmap_progress = roadmap_result.data[0]["progress"] if roadmap_result.data else 0

    # ── Streak ─────────────────────────────────────────────────────
    streak_days = _compute_streak(user_id, user.jwt)

    # ── Top jobs ───────────────────────────────────────────────────
    top_jobs: list[dict] = []
    try:
        if get_structured_jobs is not None:
            raw_jobs = get_structured_jobs(search_query, "gb")
            for j in raw_jobs[:3]:
                top_jobs.append({
                    "title": j.get("title", ""),
                    "company": j.get("company", ""),
                    "location": j.get("location", ""),
                    "salary": j.get("salary_min") or j.get("salary_max") or "",
                    "url": j.get("url", ""),
                    "source": "adzuna",
                })
    except Exception as e:
        logger.warning("Dashboard: could not fetch jobs — %s", e)

    return {
        "applications_this_week": applications_this_week,
        "applications_last_week": applications_last_week,
        "skills_count": skills_count,
        "roadmap_progress": roadmap_progress,
        "streak_days": streak_days,
        "top_jobs": top_jobs,
    }


# ====================================================================
# Phase 7 — AI Nudge Endpoint
# ====================================================================

@router.get("/nudge", tags=["Dashboard"])
async def get_nudge(
    user = Depends(get_current_user),
    user_id: str | None = Query(None, description="UUID of the user (optional, defaults to authenticated user)"),
    cv_id: str | None = Query(None, description="Optional CV UUID for skill-based job search"),
):
    """
    Proactive nudge: if the user has no activity_log entries in the last
    3 days, fetch matching jobs using CV skills and return a nudge message.
    Otherwise return {message: null, jobs: []}.
    """
    if user_id is None:
        user_id = str(user.id)
    elif user_id != str(user.id):
        raise HTTPException(status_code=403, detail="Forbidden: cannot access other users' nudge data")
    supabase = get_supabase_user_client(user.jwt)
    three_days_ago = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()

    # Check for recent activity
    recent_result = supabase.table("activity_log").select("id", count="exact").eq("user_id", user_id).gte("created_at", three_days_ago).execute()
    recent_count = recent_result.count or 0

    if recent_count > 0:
        # User is active — no nudge
        return {"message": None, "jobs": []}

    # ── User is inactive — build nudge ─────────────────────────────
    nudge_message = "You haven't applied in 3 days. Here are 3 openings that match your profile."
    jobs: list[dict] = []

    # Derive a search query from CV skills
    search_query = "software engineer"  # default fallback
    if cv_id:
        skills_text = _fetch_cv_skills_text(cv_id)
        if skills_text:
            tokens = skills_text.split()
            search_query = " ".join(tokens[:3]) if len(tokens) >= 3 else skills_text

    # Try to fetch jobs from Adzuna
    try:
        if get_structured_jobs is None:
            raise ImportError("job_hunter integration not available")
        all_jobs = get_structured_jobs(search_query, "gb")
        jobs = all_jobs[:3]
    except Exception as e:
        logger.warning("Nudge: could not fetch jobs — %s", e)
        jobs = []

    return {
        "message": nudge_message,
        "jobs": jobs,
    }
