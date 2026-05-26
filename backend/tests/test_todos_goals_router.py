"""
Tests for the To-Do & Goal router — Phase 6.

Uses FastAPI's TestClient with an in-memory SQLite database (see conftest.py)
so every test exercises the real router → ORM → DB stack without touching
any external service.

Acceptance Criteria Verified
----------------------------
1. GET /api/tracker/todos?user_id=x&date=2025-06-01 returns only todos due on that date
2. Marking a todo done triggers automatic goal progress recalculation
3. DELETE /api/tracker/goals/{id} also removes all todos with that goal_id (cascade)
4. PATCH /api/tracker/goals/{id} with {"progress": 150} returns 422
5. All write operations log to activity_log
"""

from __future__ import annotations

import uuid
import asyncio
import pytest
from sqlalchemy import select


# ── Helpers ─────────────────────────────────────────────────────────

_USER_ID = str(uuid.uuid4())


def _todo_payload(**overrides) -> dict:
    base = {
        "user_id": _USER_ID,
        "title": "Prepare CV",
        "due_date": "2025-06-01",
    }
    return {**base, **overrides}


def _goal_payload(**overrides) -> dict:
    base = {
        "user_id": _USER_ID,
        "title": "Land a data role",
        "target_date": "2025-08-01",
    }
    return {**base, **overrides}


# ====================================================================
# To-Do CRUD
# ====================================================================

class TestCreateTodo:

    def test_creates_todo_and_returns_it(self, client):
        payload = _todo_payload()
        resp = client.post("/api/tracker/todos", json=payload)

        assert resp.status_code == 201
        body = resp.json()
        assert body["title"] == payload["title"]
        assert body["due_date"] == "2025-06-01"
        assert body["done"] is False
        assert body["goal_id"] is None
        assert "id" in body
        assert "created_at" in body

    def test_create_with_goal_id(self, client):
        # Create a goal first
        goal_resp = client.post("/api/tracker/goals", json=_goal_payload())
        goal_id = goal_resp.json()["id"]

        payload = _todo_payload(goal_id=goal_id)
        resp = client.post("/api/tracker/todos", json=payload)

        assert resp.status_code == 201
        assert resp.json()["goal_id"] == goal_id

    def test_missing_title_returns_422(self, client):
        resp = client.post("/api/tracker/todos", json={"user_id": "x"})
        assert resp.status_code == 422

    def test_empty_title_returns_422(self, client):
        resp = client.post("/api/tracker/todos", json=_todo_payload(title=""))
        assert resp.status_code == 422

    def test_create_logs_activity(self, client, db_session):
        client.post("/api/tracker/todos", json=_todo_payload())

        async def _check():
            async with db_session as s:
                from backend.models.models import ActivityLog
                result = await s.execute(
                    select(ActivityLog).where(ActivityLog.action == "todo_created")
                )
                logs = result.scalars().all()
                assert len(logs) >= 1

        asyncio.get_event_loop().run_until_complete(_check())


class TestListTodos:

    def test_returns_empty_list_when_no_data(self, client):
        resp = client.get("/api/tracker/todos", params={"user_id": "nonexistent"})
        assert resp.status_code == 200
        assert resp.json()["todos"] == []

    def test_returns_todos_for_user(self, client):
        user_id = str(uuid.uuid4())
        for title in ("Todo A", "Todo B"):
            client.post("/api/tracker/todos", json=_todo_payload(user_id=user_id, title=title))

        resp = client.get("/api/tracker/todos", params={"user_id": user_id})
        assert resp.status_code == 200
        todos = resp.json()["todos"]
        assert len(todos) == 2

    def test_filter_by_date(self, client):
        """GET /api/tracker/todos?user_id=x&date=2025-06-01 returns only matching todos."""
        user_id = str(uuid.uuid4())
        client.post("/api/tracker/todos", json=_todo_payload(user_id=user_id, due_date="2025-06-01", title="June 1"))
        client.post("/api/tracker/todos", json=_todo_payload(user_id=user_id, due_date="2025-06-15", title="June 15"))
        client.post("/api/tracker/todos", json=_todo_payload(user_id=user_id, due_date=None, title="No date"))

        resp = client.get("/api/tracker/todos", params={"user_id": user_id, "date": "2025-06-01"})
        assert resp.status_code == 200
        todos = resp.json()["todos"]
        assert len(todos) == 1
        assert todos[0]["title"] == "June 1"
        assert todos[0]["due_date"] == "2025-06-01"

    def test_does_not_leak_other_users_todos(self, client):
        user_a, user_b = str(uuid.uuid4()), str(uuid.uuid4())
        client.post("/api/tracker/todos", json=_todo_payload(user_id=user_a, title="A's todo"))
        client.post("/api/tracker/todos", json=_todo_payload(user_id=user_b, title="B's todo"))

        resp = client.get("/api/tracker/todos", params={"user_id": user_a})
        todos = resp.json()["todos"]
        assert len(todos) == 1
        assert todos[0]["title"] == "A's todo"


class TestUpdateTodo:

    def _create_todo(self, client, **overrides) -> dict:
        resp = client.post("/api/tracker/todos", json=_todo_payload(**overrides))
        assert resp.status_code == 201
        return resp.json()

    def test_update_title(self, client):
        created = self._create_todo(client)
        resp = client.patch(f"/api/tracker/todos/{created['id']}", json={"title": "Updated title"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated title"

    def test_mark_done(self, client):
        created = self._create_todo(client)
        resp = client.patch(f"/api/tracker/todos/{created['id']}", json={"done": True})
        assert resp.status_code == 200
        assert resp.json()["done"] is True

    def test_partial_update_preserves_other_fields(self, client):
        created = self._create_todo(client, title="Original")
        resp = client.patch(f"/api/tracker/todos/{created['id']}", json={"done": True})
        body = resp.json()
        assert body["title"] == "Original"
        assert body["due_date"] == created["due_date"]

    def test_update_nonexistent_returns_404(self, client):
        resp = client.patch(f"/api/tracker/todos/{uuid.uuid4()}", json={"done": True})
        assert resp.status_code == 404

    def test_update_logs_activity(self, client, db_session):
        created = self._create_todo(client)
        client.patch(f"/api/tracker/todos/{created['id']}", json={"done": True})

        async def _check():
            async with db_session as s:
                from backend.models.models import ActivityLog
                result = await s.execute(
                    select(ActivityLog).where(ActivityLog.action == "todo_updated")
                )
                logs = result.scalars().all()
                assert len(logs) >= 1

        asyncio.get_event_loop().run_until_complete(_check())


class TestDeleteTodo:

    def _create_todo(self, client, **overrides) -> dict:
        resp = client.post("/api/tracker/todos", json=_todo_payload(**overrides))
        assert resp.status_code == 201
        return resp.json()

    def test_deletes_and_returns_204(self, client):
        created = self._create_todo(client)
        resp = client.delete(f"/api/tracker/todos/{created['id']}")
        assert resp.status_code == 204

    def test_deleted_todo_no_longer_exists(self, client):
        user_id = str(uuid.uuid4())
        created = self._create_todo(client, user_id=user_id)
        client.delete(f"/api/tracker/todos/{created['id']}")

        resp = client.get("/api/tracker/todos", params={"user_id": user_id})
        assert resp.json()["todos"] == []

    def test_delete_nonexistent_returns_404(self, client):
        resp = client.delete(f"/api/tracker/todos/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_delete_logs_activity(self, client, db_session):
        created = self._create_todo(client)
        client.delete(f"/api/tracker/todos/{created['id']}")

        async def _check():
            async with db_session as s:
                from backend.models.models import ActivityLog
                result = await s.execute(
                    select(ActivityLog).where(ActivityLog.action == "todo_deleted")
                )
                logs = result.scalars().all()
                assert len(logs) >= 1

        asyncio.get_event_loop().run_until_complete(_check())


# ====================================================================
# Goal CRUD
# ====================================================================

class TestCreateGoal:

    def test_creates_goal_and_returns_it(self, client):
        payload = _goal_payload()
        resp = client.post("/api/tracker/goals", json=payload)

        assert resp.status_code == 201
        body = resp.json()
        assert body["title"] == payload["title"]
        assert body["target_date"] == "2025-08-01"
        assert body["progress"] == 0
        assert "id" in body
        assert "created_at" in body

    def test_missing_title_returns_422(self, client):
        resp = client.post("/api/tracker/goals", json={"user_id": "x"})
        assert resp.status_code == 422

    def test_empty_title_returns_422(self, client):
        resp = client.post("/api/tracker/goals", json=_goal_payload(title=""))
        assert resp.status_code == 422

    def test_create_logs_activity(self, client, db_session):
        client.post("/api/tracker/goals", json=_goal_payload())

        async def _check():
            async with db_session as s:
                from backend.models.models import ActivityLog
                result = await s.execute(
                    select(ActivityLog).where(ActivityLog.action == "goal_created")
                )
                logs = result.scalars().all()
                assert len(logs) >= 1

        asyncio.get_event_loop().run_until_complete(_check())


class TestListGoals:

    def test_returns_empty_list_when_no_data(self, client):
        resp = client.get("/api/tracker/goals", params={"user_id": "nonexistent"})
        assert resp.status_code == 200
        assert resp.json()["goals"] == []

    def test_returns_goals_for_user(self, client):
        user_id = str(uuid.uuid4())
        for title in ("Goal A", "Goal B"):
            client.post("/api/tracker/goals", json=_goal_payload(user_id=user_id, title=title))

        resp = client.get("/api/tracker/goals", params={"user_id": user_id})
        assert resp.status_code == 200
        goals = resp.json()["goals"]
        assert len(goals) == 2


class TestUpdateGoal:

    def _create_goal(self, client, **overrides) -> dict:
        resp = client.post("/api/tracker/goals", json=_goal_payload(**overrides))
        assert resp.status_code == 201
        return resp.json()

    def test_update_progress(self, client):
        created = self._create_goal(client)
        resp = client.patch(f"/api/tracker/goals/{created['id']}", json={"progress": 50})
        assert resp.status_code == 200
        assert resp.json()["progress"] == 50

    def test_update_title(self, client):
        created = self._create_goal(client)
        resp = client.patch(f"/api/tracker/goals/{created['id']}", json={"title": "New goal"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "New goal"

    def test_progress_150_returns_422(self, client):
        """PATCH with progress=150 must return 422 (field constrained to 0–100)."""
        created = self._create_goal(client)
        resp = client.patch(f"/api/tracker/goals/{created['id']}", json={"progress": 150})
        assert resp.status_code == 422

    def test_progress_negative_returns_422(self, client):
        created = self._create_goal(client)
        resp = client.patch(f"/api/tracker/goals/{created['id']}", json={"progress": -1})
        assert resp.status_code == 422

    def test_update_nonexistent_returns_404(self, client):
        resp = client.patch(f"/api/tracker/goals/{uuid.uuid4()}", json={"progress": 10})
        assert resp.status_code == 404

    def test_update_logs_activity(self, client, db_session):
        created = self._create_goal(client)
        client.patch(f"/api/tracker/goals/{created['id']}", json={"progress": 75})

        async def _check():
            async with db_session as s:
                from backend.models.models import ActivityLog
                result = await s.execute(
                    select(ActivityLog).where(ActivityLog.action == "goal_updated")
                )
                logs = result.scalars().all()
                assert len(logs) >= 1

        asyncio.get_event_loop().run_until_complete(_check())


class TestDeleteGoal:

    def _create_goal(self, client, **overrides) -> dict:
        resp = client.post("/api/tracker/goals", json=_goal_payload(**overrides))
        assert resp.status_code == 201
        return resp.json()

    def test_deletes_and_returns_204(self, client):
        created = self._create_goal(client)
        resp = client.delete(f"/api/tracker/goals/{created['id']}")
        assert resp.status_code == 204

    def test_deleted_goal_no_longer_exists(self, client):
        user_id = str(uuid.uuid4())
        created = self._create_goal(client, user_id=user_id)
        client.delete(f"/api/tracker/goals/{created['id']}")

        resp = client.get("/api/tracker/goals", params={"user_id": user_id})
        assert resp.json()["goals"] == []

    def test_delete_nonexistent_returns_404(self, client):
        resp = client.delete(f"/api/tracker/goals/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_cascade_deletes_linked_todos(self, client):
        """DELETE /api/tracker/goals/{id} must also remove all todos with that goal_id."""
        user_id = str(uuid.uuid4())
        goal = self._create_goal(client, user_id=user_id)
        goal_id = goal["id"]

        # Create 3 todos linked to this goal
        for title in ("Todo 1", "Todo 2", "Todo 3"):
            client.post("/api/tracker/todos", json=_todo_payload(user_id=user_id, goal_id=goal_id, title=title))

        # Verify todos exist
        resp = client.get("/api/tracker/todos", params={"user_id": user_id})
        assert len(resp.json()["todos"]) == 3

        # Delete the goal
        resp = client.delete(f"/api/tracker/goals/{goal_id}")
        assert resp.status_code == 204

        # Verify all linked todos are also deleted
        resp = client.get("/api/tracker/todos", params={"user_id": user_id})
        assert resp.json()["todos"] == []

    def test_delete_logs_activity(self, client, db_session):
        created = self._create_goal(client)
        client.delete(f"/api/tracker/goals/{created['id']}")

        async def _check():
            async with db_session as s:
                from backend.models.models import ActivityLog
                result = await s.execute(
                    select(ActivityLog).where(ActivityLog.action == "goal_deleted")
                )
                logs = result.scalars().all()
                assert len(logs) >= 1

        asyncio.get_event_loop().run_until_complete(_check())


# ====================================================================
# Auto-recalculate goal progress when a todo is toggled done
# ====================================================================

class TestAutoRecalculateGoalProgress:

    def test_marking_todo_done_updates_goal_progress(self, client):
        """
        Create a goal + 2 todos.  Mark 1 done → progress should be 50%.
        Mark both done → progress should be 100%.
        """
        user_id = str(uuid.uuid4())
        goal = client.post("/api/tracker/goals", json=_goal_payload(user_id=user_id)).json()
        goal_id = goal["id"]

        todo1 = client.post("/api/tracker/todos", json=_todo_payload(user_id=user_id, goal_id=goal_id, title="T1")).json()
        todo2 = client.post("/api/tracker/todos", json=_todo_payload(user_id=user_id, goal_id=goal_id, title="T2")).json()

        # Mark todo1 done → 1/2 = 50%
        client.patch(f"/api/tracker/todos/{todo1['id']}", json={"done": True})

        goal_resp = client.get("/api/tracker/goals", params={"user_id": user_id})
        goals = goal_resp.json()["goals"]
        assert len(goals) == 1
        assert goals[0]["progress"] == 50

        # Mark todo2 done → 2/2 = 100%
        client.patch(f"/api/tracker/todos/{todo2['id']}", json={"done": True})

        goal_resp = client.get("/api/tracker/goals", params={"user_id": user_id})
        assert goal_resp.json()["goals"][0]["progress"] == 100

    def test_unmarking_todo_recalculates_downward(self, client):
        """Mark a todo done, then un-mark it — progress should go back to 0."""
        user_id = str(uuid.uuid4())
        goal = client.post("/api/tracker/goals", json=_goal_payload(user_id=user_id)).json()
        goal_id = goal["id"]

        todo = client.post("/api/tracker/todos", json=_todo_payload(user_id=user_id, goal_id=goal_id, title="T1")).json()

        # Mark done → 100%
        client.patch(f"/api/tracker/todos/{todo['id']}", json={"done": True})
        goal_resp = client.get("/api/tracker/goals", params={"user_id": user_id})
        assert goal_resp.json()["goals"][0]["progress"] == 100

        # Unmark → 0%
        client.patch(f"/api/tracker/todos/{todo['id']}", json={"done": False})
        goal_resp = client.get("/api/tracker/goals", params={"user_id": user_id})
        assert goal_resp.json()["goals"][0]["progress"] == 0

    def test_todo_without_goal_does_not_crash(self, client):
        """Marking done on a todo without goal_id should not error."""
        user_id = str(uuid.uuid4())
        todo = client.post("/api/tracker/todos", json=_todo_payload(user_id=user_id)).json()

        resp = client.patch(f"/api/tracker/todos/{todo['id']}", json={"done": True})
        assert resp.status_code == 200
        assert resp.json()["done"] is True

    def test_three_of_four_todos_done_gives_75_percent(self, client):
        """3/4 done → round(75.0) = 75."""
        user_id = str(uuid.uuid4())
        goal = client.post("/api/tracker/goals", json=_goal_payload(user_id=user_id)).json()
        goal_id = goal["id"]

        todos = []
        for i in range(4):
            t = client.post("/api/tracker/todos", json=_todo_payload(user_id=user_id, goal_id=goal_id, title=f"T{i}")).json()
            todos.append(t)

        # Mark 3 out of 4 done
        for t in todos[:3]:
            client.patch(f"/api/tracker/todos/{t['id']}", json={"done": True})

        goal_resp = client.get("/api/tracker/goals", params={"user_id": user_id})
        assert goal_resp.json()["goals"][0]["progress"] == 75

    def test_deleting_done_todo_recalculates_goal(self, client):
        """Deleting a done todo should recalculate the goal's progress."""
        user_id = str(uuid.uuid4())
        goal = client.post("/api/tracker/goals", json=_goal_payload(user_id=user_id)).json()
        goal_id = goal["id"]

        todo1 = client.post("/api/tracker/todos", json=_todo_payload(user_id=user_id, goal_id=goal_id, title="T1")).json()
        todo2 = client.post("/api/tracker/todos", json=_todo_payload(user_id=user_id, goal_id=goal_id, title="T2")).json()

        # Mark both done → 100%
        client.patch(f"/api/tracker/todos/{todo1['id']}", json={"done": True})
        client.patch(f"/api/tracker/todos/{todo2['id']}", json={"done": True})

        # Delete todo2 → only todo1 (done) remains → still 100%
        client.delete(f"/api/tracker/todos/{todo2['id']}")

        goal_resp = client.get("/api/tracker/goals", params={"user_id": user_id})
        assert goal_resp.json()["goals"][0]["progress"] == 100
