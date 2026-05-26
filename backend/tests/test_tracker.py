from __future__ import annotations

import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import patch

# Define valid payload helpers
_VALID_APP_PAYLOAD = {
    "job_title": "Software Engineer",
    "company": "Tech Corp",
    "location": "London",
    "deadline": "2025-10-01",
    "status": "applied",
    "notes": "Referred by Bob",
    "job_id": "job-1234",
    "fit_score": 85,
}

def test_create_application(client):
    """Test POST /api/tracker/applications creates a row and returns it."""
    user_id = str(uuid.uuid4())
    payload = {**_VALID_APP_PAYLOAD, "user_id": user_id}
    
    resp = client.post("/api/tracker/applications", json=payload)
    assert resp.status_code == 201
    
    data = resp.json()
    assert data["user_id"] == user_id
    assert data["job_title"] == "Software Engineer"
    assert data["company"] == "Tech Corp"
    assert "id" in data

def test_patch_application(client):
    """Test PATCH /api/tracker/applications/{id} with {"status": "interviewing"} returns updated row."""
    user_id = str(uuid.uuid4())
    payload = {**_VALID_APP_PAYLOAD, "user_id": user_id}
    
    create_resp = client.post("/api/tracker/applications", json=payload)
    app_id = create_resp.json()["id"]
    
    patch_payload = {"status": "interviewing"}
    resp = client.patch(f"/api/tracker/applications/{app_id}", json=patch_payload)
    assert resp.status_code == 200
    
    data = resp.json()
    assert data["id"] == app_id
    assert data["status"] == "interviewing"
    assert data["company"] == "Tech Corp"  # Preserved other fields

def test_delete_application(client):
    """Test DELETE /api/tracker/applications/{id} returns 204 and the row no longer exists."""
    user_id = str(uuid.uuid4())
    payload = {**_VALID_APP_PAYLOAD, "user_id": user_id}
    
    create_resp = client.post("/api/tracker/applications", json=payload)
    app_id = create_resp.json()["id"]
    
    # Delete
    del_resp = client.delete(f"/api/tracker/applications/{app_id}")
    assert del_resp.status_code == 204
    
    # Try fetching all applications for user to verify it is empty
    list_resp = client.get("/api/tracker/applications", params={"user_id": user_id})
    assert list_resp.status_code == 200
    assert list_resp.json()["applications"] == []

def test_patch_todo_triggers_goal_progress_recalculation(client):
    """Test PATCH /api/tracker/todos/{id} with {"done": true} triggers goal progress recalculation."""
    user_id = str(uuid.uuid4())
    
    # 1. Create a Goal
    goal_payload = {
        "user_id": user_id,
        "title": "Study FastAPI",
        "target_date": "2026-06-01",
    }
    goal_resp = client.post("/api/tracker/goals", json=goal_payload)
    assert goal_resp.status_code == 201
    goal_id = goal_resp.json()["id"]
    
    # 2. Create two Todos linked to this Goal
    todo1_payload = {
        "user_id": user_id,
        "title": "Read Docs",
        "due_date": "2026-06-01",
        "goal_id": goal_id,
    }
    todo2_payload = {
        "user_id": user_id,
        "title": "Write Tests",
        "due_date": "2026-06-01",
        "goal_id": goal_id,
    }
    todo1_resp = client.post("/api/tracker/todos", json=todo1_payload)
    todo2_resp = client.post("/api/tracker/todos", json=todo2_payload)
    assert todo1_resp.status_code == 201
    assert todo2_resp.status_code == 201
    todo1_id = todo1_resp.json()["id"]
    
    # 3. Patch Todo 1 to be done
    todo_patch_payload = {"done": True}
    todo_patch_resp = client.patch(f"/api/tracker/todos/{todo1_id}", json=todo_patch_payload)
    assert todo_patch_resp.status_code == 200
    
    # 4. Fetch Goals and verify progress is 50%
    goals_resp = client.get("/api/tracker/goals", params={"user_id": user_id})
    assert goals_resp.status_code == 200
    goals = goals_resp.json()["goals"]
    assert len(goals) == 1
    assert goals[0]["id"] == goal_id
    assert goals[0]["progress"] == 50

@patch("backend.routers.tracker._fetch_cv_skills_text")
def test_get_dashboard_stats(mock_fetch_skills, client):
    """Test GET /api/tracker/dashboard/stats returns all 5 expected fields."""
    user_id = str(uuid.uuid4())
    mock_fetch_skills.return_value = "Python FastAPI SQL"
    
    # Create application to increment stats
    app_payload = {**_VALID_APP_PAYLOAD, "user_id": user_id}
    client.post("/api/tracker/applications", json=app_payload)
    
    # Create roadmap goal to increment stats
    goal_payload = {
        "user_id": user_id,
        "title": "My Roadmap Goal",
        "target_date": "2026-06-01",
    }
    client.post("/api/tracker/goals", json=goal_payload)
    
    resp = client.get("/api/tracker/dashboard/stats", params={"user_id": user_id, "cv_id": "cv-123"})
    assert resp.status_code == 200
    
    data = resp.json()
    assert "applications_this_week" in data
    assert "applications_last_week" in data
    assert "skills_count" in data
    assert "roadmap_progress" in data
    assert "streak_days" in data
    
    assert data["applications_this_week"] == 1
    assert data["skills_count"] == 3
    assert data["roadmap_progress"] == 0  # Default progress is 0
