from __future__ import annotations

import uuid
import pytest


_USER_ID = "demo_user_123"


def _todo_payload(**overrides) -> dict:
    base = {
        "title": "Prepare CV",
        "due_date": "2025-06-01",
    }
    return {**base, **overrides}


def _goal_payload(**overrides) -> dict:
    base = {
        "title": "Land a data role",
        "target_date": "2025-08-01",
    }
    return {**base, **overrides}


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
        assert body["user_id"] == _USER_ID
        assert "id" in body
        assert "created_at" in body

    def test_create_with_goal_id(self, client):
        goal_resp = client.post("/api/tracker/goals", json=_goal_payload())
        goal_id = goal_resp.json()["id"]

        payload = _todo_payload(goal_id=goal_id)
        resp = client.post("/api/tracker/todos", json=payload)

        assert resp.status_code == 201
        assert resp.json()["goal_id"] == goal_id

    def test_missing_title_returns_422(self, client):
        resp = client.post("/api/tracker/todos", json={})
        assert resp.status_code == 422

    def test_empty_title_returns_422(self, client):
        resp = client.post("/api/tracker/todos", json=_todo_payload(title=""))
        assert resp.status_code == 422

    def test_create_logs_activity(self, client, fake_supabase):
        client.post("/api/tracker/todos", json=_todo_payload())

        logs = [
            log for log in fake_supabase.all("activity_log")
            if log.get("action") == "todo_created"
        ]
        assert len(logs) >= 1


class TestListTodos:

    def test_returns_empty_list_when_no_data(self, client):
        resp = client.get("/api/tracker/todos", params={"user_id": _USER_ID})
        assert resp.status_code == 200
        assert resp.json()["todos"] == []

    def test_returns_todos_for_user(self, client):
        for title in ("Todo A", "Todo B"):
            client.post("/api/tracker/todos", json=_todo_payload(title=title))

        resp = client.get("/api/tracker/todos", params={"user_id": _USER_ID})
        assert resp.status_code == 200
        todos = resp.json()["todos"]
        assert len(todos) == 2

    def test_filter_by_date(self, client):
        client.post("/api/tracker/todos", json=_todo_payload(due_date="2025-06-01", title="June 1"))
        client.post("/api/tracker/todos", json=_todo_payload(due_date="2025-06-15", title="June 15"))
        client.post("/api/tracker/todos", json=_todo_payload(due_date=None, title="No date"))

        resp = client.get("/api/tracker/todos", params={"user_id": _USER_ID, "date": "2025-06-01"})
        assert resp.status_code == 200
        todos = resp.json()["todos"]
        assert len(todos) == 1
        assert todos[0]["title"] == "June 1"
        assert todos[0]["due_date"] == "2025-06-01"

    def test_only_owns_todos(self, client):
        client.post("/api/tracker/todos", json=_todo_payload(title="My todo"))

        resp = client.get("/api/tracker/todos", params={"user_id": _USER_ID})
        todos = resp.json()["todos"]
        assert len(todos) == 1
        assert todos[0]["title"] == "My todo"


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

    def test_update_logs_activity(self, client, fake_supabase):
        created = self._create_todo(client)
        client.patch(f"/api/tracker/todos/{created['id']}", json={"done": True})

        logs = [
            log for log in fake_supabase.all("activity_log")
            if log.get("action") == "todo_updated"
        ]
        assert len(logs) >= 1


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
        created = self._create_todo(client)
        client.delete(f"/api/tracker/todos/{created['id']}")

        resp = client.get("/api/tracker/todos", params={"user_id": _USER_ID})
        assert resp.json()["todos"] == []

    def test_delete_nonexistent_returns_404(self, client):
        resp = client.delete(f"/api/tracker/todos/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_delete_logs_activity(self, client, fake_supabase):
        created = self._create_todo(client)
        client.delete(f"/api/tracker/todos/{created['id']}")

        logs = [
            log for log in fake_supabase.all("activity_log")
            if log.get("action") == "todo_deleted"
        ]
        assert len(logs) >= 1


class TestCreateGoal:

    def test_creates_goal_and_returns_it(self, client):
        payload = _goal_payload()
        resp = client.post("/api/tracker/goals", json=payload)

        assert resp.status_code == 201
        body = resp.json()
        assert body["title"] == payload["title"]
        assert body["target_date"] == "2025-08-01"
        assert body["progress"] == 0
        assert body["user_id"] == _USER_ID
        assert "id" in body
        assert "created_at" in body

    def test_missing_title_returns_422(self, client):
        resp = client.post("/api/tracker/goals", json={})
        assert resp.status_code == 422

    def test_empty_title_returns_422(self, client):
        resp = client.post("/api/tracker/goals", json=_goal_payload(title=""))
        assert resp.status_code == 422

    def test_create_logs_activity(self, client, fake_supabase):
        client.post("/api/tracker/goals", json=_goal_payload())

        logs = [
            log for log in fake_supabase.all("activity_log")
            if log.get("action") == "goal_created"
        ]
        assert len(logs) >= 1


class TestListGoals:

    def test_returns_empty_list_when_no_data(self, client):
        resp = client.get("/api/tracker/goals")
        assert resp.status_code == 200
        assert resp.json()["goals"] == []

    def test_returns_goals_for_user(self, client):
        for title in ("Goal A", "Goal B"):
            client.post("/api/tracker/goals", json=_goal_payload(title=title))

        resp = client.get("/api/tracker/goals")
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

    def test_update_logs_activity(self, client, fake_supabase):
        created = self._create_goal(client)
        client.patch(f"/api/tracker/goals/{created['id']}", json={"progress": 75})

        logs = [
            log for log in fake_supabase.all("activity_log")
            if log.get("action") == "goal_updated"
        ]
        assert len(logs) >= 1


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
        created = self._create_goal(client)
        client.delete(f"/api/tracker/goals/{created['id']}")

        resp = client.get("/api/tracker/goals")
        assert resp.json()["goals"] == []

    def test_delete_nonexistent_returns_404(self, client):
        resp = client.delete(f"/api/tracker/goals/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_cascade_deletes_linked_todos(self, client):
        goal = self._create_goal(client)
        goal_id = goal["id"]

        for title in ("Todo 1", "Todo 2", "Todo 3"):
            client.post("/api/tracker/todos", json=_todo_payload(goal_id=goal_id, title=title))

        resp = client.get("/api/tracker/todos", params={"user_id": _USER_ID})
        assert len(resp.json()["todos"]) == 3

        resp = client.delete(f"/api/tracker/goals/{goal_id}")
        assert resp.status_code == 204

        resp = client.get("/api/tracker/todos", params={"user_id": _USER_ID})
        assert resp.json()["todos"] == []

    def test_delete_logs_activity(self, client, fake_supabase):
        created = self._create_goal(client)
        client.delete(f"/api/tracker/goals/{created['id']}")

        logs = [
            log for log in fake_supabase.all("activity_log")
            if log.get("action") == "goal_deleted"
        ]
        assert len(logs) >= 1


class TestAutoRecalculateGoalProgress:

    def test_marking_todo_done_updates_goal_progress(self, client):
        goal = client.post("/api/tracker/goals", json=_goal_payload()).json()
        goal_id = goal["id"]

        todo1 = client.post("/api/tracker/todos", json=_todo_payload(goal_id=goal_id, title="T1")).json()
        todo2 = client.post("/api/tracker/todos", json=_todo_payload(goal_id=goal_id, title="T2")).json()

        client.patch(f"/api/tracker/todos/{todo1['id']}", json={"done": True})

        goal_resp = client.get("/api/tracker/goals")
        goals = goal_resp.json()["goals"]
        assert len(goals) == 1
        assert goals[0]["progress"] == 50

        client.patch(f"/api/tracker/todos/{todo2['id']}", json={"done": True})

        goal_resp = client.get("/api/tracker/goals")
        assert goal_resp.json()["goals"][0]["progress"] == 100

    def test_unmarking_todo_recalculates_downward(self, client):
        goal = client.post("/api/tracker/goals", json=_goal_payload()).json()
        goal_id = goal["id"]

        todo = client.post("/api/tracker/todos", json=_todo_payload(goal_id=goal_id, title="T1")).json()

        client.patch(f"/api/tracker/todos/{todo['id']}", json={"done": True})
        goal_resp = client.get("/api/tracker/goals")
        assert goal_resp.json()["goals"][0]["progress"] == 100

        client.patch(f"/api/tracker/todos/{todo['id']}", json={"done": False})
        goal_resp = client.get("/api/tracker/goals")
        assert goal_resp.json()["goals"][0]["progress"] == 0

    def test_todo_without_goal_does_not_crash(self, client):
        todo = client.post("/api/tracker/todos", json=_todo_payload()).json()

        resp = client.patch(f"/api/tracker/todos/{todo['id']}", json={"done": True})
        assert resp.status_code == 200
        assert resp.json()["done"] is True

    def test_three_of_four_todos_done_gives_75_percent(self, client):
        goal = client.post("/api/tracker/goals", json=_goal_payload()).json()
        goal_id = goal["id"]

        todos = []
        for i in range(4):
            t = client.post("/api/tracker/todos", json=_todo_payload(goal_id=goal_id, title=f"T{i}")).json()
            todos.append(t)

        for t in todos[:3]:
            client.patch(f"/api/tracker/todos/{t['id']}", json={"done": True})

        goal_resp = client.get("/api/tracker/goals")
        assert goal_resp.json()["goals"][0]["progress"] == 75

    def test_deleting_done_todo_recalculates_goal(self, client):
        goal = client.post("/api/tracker/goals", json=_goal_payload()).json()
        goal_id = goal["id"]

        todo1 = client.post("/api/tracker/todos", json=_todo_payload(goal_id=goal_id, title="T1")).json()
        todo2 = client.post("/api/tracker/todos", json=_todo_payload(goal_id=goal_id, title="T2")).json()

        client.patch(f"/api/tracker/todos/{todo1['id']}", json={"done": True})
        client.patch(f"/api/tracker/todos/{todo2['id']}", json={"done": True})

        client.delete(f"/api/tracker/todos/{todo2['id']}")

        goal_resp = client.get("/api/tracker/goals")
        assert goal_resp.json()["goals"][0]["progress"] == 100
