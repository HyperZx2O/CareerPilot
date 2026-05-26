import os
import sys
from datetime import date as date_type, datetime, timedelta, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func

# Add root folder to sys.path to find database and models modules
root_path = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(root_path))
sys.path.append(str(root_path / "integrations"))

# Try to import job_hunter at module level so it's patchable in tests.
# Falls back to None if integrations dependencies aren't installed.
try:
    from job_hunter import get_structured_jobs
except ImportError:
    get_structured_jobs = None  # type: ignore[assignment]

from backend.db.supabase_client import get_db
from backend.models.models import Application, ActivityLog, Todo, Goal
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
async def get_applications_endpoint(
    user_id: str = Query(..., description="UUID of the user to fetch applications for"),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches all applications for a user, ordered by applied_at descending.
    """
    result = await db.execute(
        select(Application)
        .where(Application.user_id == user_id)
        .order_by(Application.applied_at.desc())
    )
    applications = result.scalars().all()
    # Serialize results using Pydantic schemas
    return {"applications": [ApplicationResponse.model_validate(app) for app in applications]}

@router.post("/applications", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application_endpoint(
    payload: ApplicationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Inserts a new job application into the database and writes a row in the activity log.
    """
    app = Application(**payload.model_dump())
    db.add(app)
    await db.flush()  # Populates auto-generated ID and defaults before logging activity

    # Log the activity
    activity = ActivityLog(user_id=app.user_id, action="application_created")
    db.add(activity)

    await db.commit()
    await db.refresh(app)
    return app

@router.patch("/applications/{id}", response_model=ApplicationResponse)
async def update_application_endpoint(
    id: str,
    payload: ApplicationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Partially updates an existing application by id. Logs a row in the activity log.
    """
    result = await db.execute(select(Application).where(Application.id == id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{id}' not found."
        )

    # Perform partial update
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(app, key, value)

    # Log the activity
    activity = ActivityLog(user_id=app.user_id, action="application_updated")
    db.add(activity)

    await db.commit()
    await db.refresh(app)
    return app

@router.delete("/applications/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application_endpoint(
    id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Removes a job application by id. Logs a row in the activity log.
    """
    result = await db.execute(select(Application).where(Application.id == id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{id}' not found."
        )

    user_id = app.user_id
    await db.delete(app)

    # Log the activity
    activity = ActivityLog(user_id=user_id, action="application_deleted")
    db.add(activity)

    await db.commit()
    return None


# ====================================================================
# Helper: recalculate goal progress based on linked todos
# ====================================================================

async def _recalculate_goal_progress(goal_id: str, db: AsyncSession) -> None:
    """
    Recomputes a goal's progress field as:
        progress = round(done_count / total_count * 100)
    and persists the update.  Called whenever a linked todo's done status changes.
    """
    result = await db.execute(select(Goal).where(Goal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        return  # orphaned goal_id – nothing to update

    count_result = await db.execute(
        select(
            sa_func.count(Todo.id).label("total"),
            sa_func.count(
                sa_func.nullif(Todo.done, False)
            ).label("done"),
        ).where(Todo.goal_id == goal_id)
    )
    row = count_result.one()
    total, done = row.total, row.done
    goal.progress = round(done / total * 100) if total > 0 else 0


# ====================================================================
# To-Do Endpoints
# ====================================================================

@router.get("/todos")
async def get_todos_endpoint(
    user_id: str = Query(..., description="UUID of the user"),
    date: str | None = Query(None, description="Filter by due_date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetches todos for a user.  If `date` is provided, only returns todos
    whose due_date equals that date.
    """
    stmt = select(Todo).where(Todo.user_id == user_id)
    if date is not None:
        parsed_date = date_type.fromisoformat(date)
        stmt = stmt.where(Todo.due_date == parsed_date)
    stmt = stmt.order_by(Todo.created_at.desc())

    result = await db.execute(stmt)
    todos = result.scalars().all()
    return {"todos": [TodoResponse.model_validate(t) for t in todos]}


@router.post("/todos", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
async def create_todo_endpoint(
    payload: TodoCreate,
    db: AsyncSession = Depends(get_db),
):
    """Creates a new todo and logs the activity."""
    todo = Todo(**payload.model_dump())
    db.add(todo)
    await db.flush()

    activity = ActivityLog(user_id=todo.user_id, action="todo_created")
    db.add(activity)

    await db.commit()
    await db.refresh(todo)
    return todo


@router.patch("/todos/{id}", response_model=TodoResponse)
async def update_todo_endpoint(
    id: str,
    payload: TodoUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Partially updates a todo.  When `done` changes and the todo has a
    linked goal, the goal's progress is automatically recalculated.
    """
    result = await db.execute(select(Todo).where(Todo.id == id))
    todo = result.scalar_one_or_none()
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with ID '{id}' not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(todo, key, value)

    # Log the activity
    activity = ActivityLog(user_id=todo.user_id, action="todo_updated")
    db.add(activity)

    await db.flush()

    # Auto-recalculate linked goal progress when done status changes
    if "done" in update_data and todo.goal_id:
        await _recalculate_goal_progress(todo.goal_id, db)

    await db.commit()
    await db.refresh(todo)
    return todo


@router.delete("/todos/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo_endpoint(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    """Deletes a todo by id and logs the activity."""
    result = await db.execute(select(Todo).where(Todo.id == id))
    todo = result.scalar_one_or_none()
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo with ID '{id}' not found.",
        )

    user_id = todo.user_id
    goal_id = todo.goal_id
    await db.delete(todo)

    activity = ActivityLog(user_id=user_id, action="todo_deleted")
    db.add(activity)

    await db.flush()

    # Recalculate linked goal progress after removing a todo
    if goal_id:
        await _recalculate_goal_progress(goal_id, db)

    await db.commit()
    return None


# ====================================================================
# Goal Endpoints
# ====================================================================

@router.get("/goals")
async def get_goals_endpoint(
    user_id: str = Query(..., description="UUID of the user"),
    db: AsyncSession = Depends(get_db),
):
    """Fetches all goals for a user."""
    result = await db.execute(
        select(Goal)
        .where(Goal.user_id == user_id)
        .order_by(Goal.created_at.desc())
    )
    goals = result.scalars().all()
    return {"goals": [GoalResponse.model_validate(g) for g in goals]}


@router.post("/goals", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal_endpoint(
    payload: GoalCreate,
    db: AsyncSession = Depends(get_db),
):
    """Creates a new goal and logs the activity."""
    goal = Goal(**payload.model_dump())
    db.add(goal)
    await db.flush()

    activity = ActivityLog(user_id=goal.user_id, action="goal_created")
    db.add(activity)

    await db.commit()
    await db.refresh(goal)
    return goal


@router.patch("/goals/{id}", response_model=GoalResponse)
async def update_goal_endpoint(
    id: str,
    payload: GoalUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Partially updates a goal. The `progress` field is validated 0–100 by the schema."""
    result = await db.execute(select(Goal).where(Goal.id == id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal with ID '{id}' not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(goal, key, value)

    activity = ActivityLog(user_id=goal.user_id, action="goal_updated")
    db.add(activity)

    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/goals/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal_endpoint(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes a goal and **cascade-deletes** all todos linked to it.
    Logs the activity.
    """
    result = await db.execute(select(Goal).where(Goal.id == id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Goal with ID '{id}' not found.",
        )

    user_id = goal.user_id

    # Cascade: delete all linked todos first
    linked_todos = await db.execute(select(Todo).where(Todo.goal_id == id))
    for todo in linked_todos.scalars().all():
        await db.delete(todo)

    await db.delete(goal)

    activity = ActivityLog(user_id=user_id, action="goal_deleted")
    db.add(activity)

    await db.commit()
    return None


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
        print(f"Error fetching CV skills from Pinecone: {e}")
        return None


async def _compute_streak(user_id: str, db: AsyncSession) -> int:
    """
    Count consecutive days (from today backwards) where the activity_log
    has at least one entry for the user.  Stops on the first day with
    no entry.
    """
    today = datetime.now(timezone.utc).date()

    # Fetch all distinct activity dates for this user.
    # Use func.date() which works with both SQLite (string dates) and PostgreSQL.
    result = await db.execute(
        select(
            sa_func.date(ActivityLog.created_at).label("activity_date")
        )
        .where(ActivityLog.user_id == user_id)
        .distinct()
    )
    # SQLite returns date strings, PostgreSQL returns date objects — normalise
    active_dates: set[date_type] = set()
    for row in result.all():
        val = row[0]
        if val is None:
            continue
        if isinstance(val, str):
            active_dates.add(date_type.fromisoformat(val))
        else:
            active_dates.add(val if isinstance(val, date_type) else val.date())

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
    user_id: str = Query(..., description="UUID of the user"),
    cv_id: str | None = Query(None, description="Optional CV UUID to count skills"),
    db: AsyncSession = Depends(get_db),
):
    """
    Aggregates dashboard statistics from the database:
    - applications_this_week / applications_last_week
    - skills_count (from Pinecone CV skills text)
    - roadmap_progress (from goal matching 'roadmap')
    - streak_days (consecutive active days)
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)

    # ── Applications this week ─────────────────────────────────────
    result = await db.execute(
        select(sa_func.count(Application.id))
        .where(Application.user_id == user_id)
        .where(Application.applied_at >= seven_days_ago)
    )
    applications_this_week = result.scalar() or 0

    # ── Applications last week ─────────────────────────────────────
    result = await db.execute(
        select(sa_func.count(Application.id))
        .where(Application.user_id == user_id)
        .where(Application.applied_at >= fourteen_days_ago)
        .where(Application.applied_at < seven_days_ago)
    )
    applications_last_week = result.scalar() or 0

    # ── Skills count ───────────────────────────────────────────────
    skills_count = 0
    if cv_id:
        skills_text = _fetch_cv_skills_text(cv_id)
        if skills_text:
            # Count whitespace-separated tokens as a proxy for skill count
            skills_count = len(skills_text.split())

    # ── Roadmap progress ───────────────────────────────────────────
    result = await db.execute(
        select(Goal.progress)
        .where(Goal.user_id == user_id)
        .where(Goal.title.ilike("%roadmap%"))
        .limit(1)
    )
    roadmap_row = result.scalar_one_or_none()
    roadmap_progress = roadmap_row if roadmap_row is not None else 0

    # ── Streak ─────────────────────────────────────────────────────
    streak_days = await _compute_streak(user_id, db)

    return {
        "applications_this_week": applications_this_week,
        "applications_last_week": applications_last_week,
        "skills_count": skills_count,
        "roadmap_progress": roadmap_progress,
        "streak_days": streak_days,
    }


# ====================================================================
# Phase 7 — AI Nudge Endpoint
# ====================================================================

@router.get("/nudge", tags=["Dashboard"])
async def get_nudge(
    user_id: str = Query(..., description="UUID of the user"),
    cv_id: str | None = Query(None, description="Optional CV UUID for skill-based job search"),
    db: AsyncSession = Depends(get_db),
):
    """
    Proactive nudge: if the user has no activity_log entries in the last
    3 days, fetch matching jobs using CV skills and return a nudge message.
    Otherwise return {message: null, jobs: []}.
    """
    three_days_ago = datetime.now(timezone.utc) - timedelta(days=3)

    # Check for recent activity
    result = await db.execute(
        select(sa_func.count(ActivityLog.id))
        .where(ActivityLog.user_id == user_id)
        .where(ActivityLog.created_at >= three_days_ago)
    )
    recent_count = result.scalar() or 0

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
        print(f"Nudge: could not fetch jobs — {e}")
        jobs = []

    return {
        "message": nudge_message,
        "jobs": jobs,
    }
