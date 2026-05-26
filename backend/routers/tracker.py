"""
Tracker router — Applications (Kanban), Goals, Todos, Dashboard stats.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.middleware.auth import get_current_user
from backend.db.supabase_client import (
    create_application, list_applications, update_application, delete_application,
    create_goal, list_goals, update_goal, delete_goal,
    create_todo, list_todos, update_todo, delete_todo,
    get_dashboard_stats,
)
from backend.models.schemas import (
    ApplicationCreate, ApplicationUpdate,
    GoalCreate, GoalUpdate,
    TodoCreate, TodoUpdate,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

@router.get("/applications")
async def list_applications_endpoint(
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    user_id = user.get("sub", "test_user")
    return list_applications(user_id, status=status, page=page, per_page=per_page)


@router.post("/applications", status_code=201)
async def create_application_endpoint(
    body: ApplicationCreate,
    user: dict = Depends(get_current_user),
):
    user_id = user.get("sub", "test_user")
    return create_application(user_id, body.model_dump())


@router.patch("/applications/{app_id}")
async def update_application_endpoint(
    app_id: str,
    body: ApplicationUpdate,
    user: dict = Depends(get_current_user),
):
    user_id = user.get("sub", "test_user")
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_application(app_id, user_id, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return result


@router.delete("/applications/{app_id}", status_code=204)
async def delete_application_endpoint(
    app_id: str,
    user: dict = Depends(get_current_user),
):
    user_id = user.get("sub", "test_user")
    delete_application(app_id, user_id)
    return None


# ---------------------------------------------------------------------------
# Goals
# ---------------------------------------------------------------------------

@router.get("/goals")
async def list_goals_endpoint(user: dict = Depends(get_current_user)):
    return list_goals(user.get("sub", "test_user"))


@router.post("/goals", status_code=201)
async def create_goal_endpoint(
    body: GoalCreate,
    user: dict = Depends(get_current_user),
):
    return create_goal(user.get("sub", "test_user"), body.model_dump())


@router.patch("/goals/{goal_id}")
async def update_goal_endpoint(
    goal_id: str,
    body: GoalUpdate,
    user: dict = Depends(get_current_user),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_goal(goal_id, user.get("sub", "test_user"), payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return result


@router.delete("/goals/{goal_id}", status_code=204)
async def delete_goal_endpoint(
    goal_id: str,
    user: dict = Depends(get_current_user),
):
    delete_goal(goal_id, user.get("sub", "test_user"))
    return None


# ---------------------------------------------------------------------------
# Todos
# ---------------------------------------------------------------------------

@router.get("/todos")
async def list_todos_endpoint(
    date: Optional[str] = Query(default=None),
    goal_id: Optional[str] = Query(default=None),
    user: dict = Depends(get_current_user),
):
    return list_todos(user.get("sub", "test_user"), date=date, goal_id=goal_id)


@router.post("/todos", status_code=201)
async def create_todo_endpoint(
    body: TodoCreate,
    user: dict = Depends(get_current_user),
):
    return create_todo(user.get("sub", "test_user"), body.model_dump())


@router.patch("/todos/{todo_id}")
async def update_todo_endpoint(
    todo_id: str,
    body: TodoUpdate,
    user: dict = Depends(get_current_user),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_todo(todo_id, user.get("sub", "test_user"), payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return result


@router.delete("/todos/{todo_id}", status_code=204)
async def delete_todo_endpoint(
    todo_id: str,
    user: dict = Depends(get_current_user),
):
    delete_todo(todo_id, user.get("sub", "test_user"))
    return None


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------

@router.get("/dashboard")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    return get_dashboard_stats(user.get("sub", "test_user"))
