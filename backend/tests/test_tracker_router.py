"""
Tests for the Application Tracker router — Phase 5 (Kanban CRUD).

Uses FastAPI's TestClient with an in-memory SQLite database (see conftest.py)
so every test exercises the real router ↔ ORM ↔ DB stack without touching
any external service.

Acceptance Criteria Verified
----------------------------
1. POST /api/tracker/applications  → inserts a row and returns the full object
2. PATCH /api/tracker/applications/{id} with {"status": "interviewing"}
      → updates only the status and returns the updated row
3. DELETE /api/tracker/applications/{id} → removes the row and returns 204
4. Every write (POST / PATCH / DELETE) logs to activity_log
5. Invalid status values return 422 Unprocessable Entity
"""

from __future__ import annotations

import uuid
import pytest
from sqlalchemy import select, text

# ── Helpers ─────────────────────────────────────────────────────────

_VALID_PAYLOAD = {
    "user_id": str(uuid.uuid4()),
    "job_title": "ML Engineer",
    "company": "Acme Corp",
    "location": "London",
    "deadline": "2025-07-01",
    "status": "applied",
    "notes": "Referred by Alice",
    "job_id": "adzuna-12345",
    "fit_score": 82,
}


def _make_payload(**overrides) -> dict:
    """Return a copy of _VALID_PAYLOAD with optional overrides."""
    return {**_VALID_PAYLOAD, **overrides}


# ====================================================================
# GET /api/tracker/applications
# ====================================================================

class TestListApplications:

    def test_returns_empty_list_when_no_data(self, client):
        resp = client.get(
            "/api/tracker/applications",
            params={"user_id": "nonexistent"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "applications" in body
        assert body["applications"] == []

    def test_returns_applications_for_user(self, client):
        # Create two applications
        user_id = str(uuid.uuid4())
        for title in ("Job A", "Job B"):
            client.post(
                "/api/tracker/applications",
                json=_make_payload(user_id=user_id, job_title=title),
            )

        resp = client.get(
            "/api/tracker/applications",
            params={"user_id": user_id},
        )
        assert resp.status_code == 200
        apps = resp.json()["applications"]
        assert len(apps) == 2
        # Ordered by applied_at descending — the second inserted appears first
        titles = [a["job_title"] for a in apps]
        assert "Job A" in titles
        assert "Job B" in titles

    def test_does_not_leak_other_users_data(self, client):
        user_a = str(uuid.uuid4())
        user_b = str(uuid.uuid4())
        client.post(
            "/api/tracker/applications",
            json=_make_payload(user_id=user_a, job_title="A's job"),
        )
        client.post(
            "/api/tracker/applications",
            json=_make_payload(user_id=user_b, job_title="B's job"),
        )

        resp = client.get(
            "/api/tracker/applications",
            params={"user_id": user_a},
        )
        apps = resp.json()["applications"]
        assert len(apps) == 1
        assert apps[0]["job_title"] == "A's job"


# ====================================================================
# POST /api/tracker/applications
# ====================================================================

class TestCreateApplication:

    def test_creates_application_and_returns_it(self, client):
        payload = _make_payload()
        resp = client.post("/api/tracker/applications", json=payload)

        assert resp.status_code == 201
        body = resp.json()
        assert body["job_title"] == payload["job_title"]
        assert body["company"] == payload["company"]
        assert body["status"] == "applied"
        assert body["fit_score"] == 82
        # Auto-generated fields
        assert "id" in body
        assert "applied_at" in body
        assert "updated_at" in body

    def test_create_logs_activity(self, client, db_session, event_loop):
        """Every POST should insert an 'application_created' row in activity_log."""
        payload = _make_payload()
        client.post("/api/tracker/applications", json=payload)

        import asyncio

        async def _check():
            async with db_session as s:
                from backend.models.models import ActivityLog
                result = await s.execute(
                    select(ActivityLog).where(
                        ActivityLog.action == "application_created"
                    )
                )
                logs = result.scalars().all()
                assert len(logs) >= 1
                assert logs[0].user_id == payload["user_id"]

        event_loop.run_until_complete(_check())

    def test_invalid_status_returns_422(self, client):
        payload = _make_payload(status="banana")
        resp = client.post("/api/tracker/applications", json=payload)
        assert resp.status_code == 422

    def test_missing_required_fields_returns_422(self, client):
        # job_title and company are required
        resp = client.post(
            "/api/tracker/applications",
            json={"user_id": "x"},
        )
        assert resp.status_code == 422

    def test_invalid_date_format_returns_422(self, client):
        payload = _make_payload(deadline="not-a-date")
        resp = client.post("/api/tracker/applications", json=payload)
        assert resp.status_code == 422

    def test_empty_job_title_returns_422(self, client):
        payload = _make_payload(job_title="")
        resp = client.post("/api/tracker/applications", json=payload)
        assert resp.status_code == 422


# ====================================================================
# PATCH /api/tracker/applications/{id}
# ====================================================================

class TestUpdateApplication:

    def _create_app(self, client, **overrides) -> dict:
        resp = client.post(
            "/api/tracker/applications",
            json=_make_payload(**overrides),
        )
        assert resp.status_code == 201
        return resp.json()

    def test_updates_status_and_returns_row(self, client):
        created = self._create_app(client)
        app_id = created["id"]

        resp = client.patch(
            f"/api/tracker/applications/{app_id}",
            json={"status": "interviewing"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "interviewing"
        # Other fields unchanged
        assert body["job_title"] == created["job_title"]
        assert body["company"] == created["company"]

    def test_partial_update_only_changes_provided_fields(self, client):
        created = self._create_app(client, notes="original note")
        app_id = created["id"]

        resp = client.patch(
            f"/api/tracker/applications/{app_id}",
            json={"notes": "updated note"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["notes"] == "updated note"
        assert body["status"] == created["status"]  # unchanged

    def test_update_logs_activity(self, client, db_session, event_loop):
        created = self._create_app(client)
        client.patch(
            f"/api/tracker/applications/{created['id']}",
            json={"status": "offer"},
        )

        import asyncio

        async def _check():
            async with db_session as s:
                from backend.models.models import ActivityLog
                result = await s.execute(
                    select(ActivityLog).where(
                        ActivityLog.action == "application_updated"
                    )
                )
                logs = result.scalars().all()
                assert len(logs) >= 1

        event_loop.run_until_complete(_check())

    def test_invalid_status_on_update_returns_422(self, client):
        created = self._create_app(client)
        resp = client.patch(
            f"/api/tracker/applications/{created['id']}",
            json={"status": "invalid_status"},
        )
        assert resp.status_code == 422

    def test_update_nonexistent_returns_404(self, client):
        resp = client.patch(
            f"/api/tracker/applications/{uuid.uuid4()}",
            json={"status": "interviewing"},
        )
        assert resp.status_code == 404


# ====================================================================
# DELETE /api/tracker/applications/{id}
# ====================================================================

class TestDeleteApplication:

    def _create_app(self, client, **overrides) -> dict:
        resp = client.post(
            "/api/tracker/applications",
            json=_make_payload(**overrides),
        )
        assert resp.status_code == 201
        return resp.json()

    def test_deletes_and_returns_204(self, client):
        created = self._create_app(client)
        app_id = created["id"]

        resp = client.delete(f"/api/tracker/applications/{app_id}")
        assert resp.status_code == 204

    def test_deleted_row_no_longer_exists(self, client):
        user_id = str(uuid.uuid4())
        created = self._create_app(client, user_id=user_id)
        app_id = created["id"]

        client.delete(f"/api/tracker/applications/{app_id}")

        # Verify it's gone
        resp = client.get(
            "/api/tracker/applications",
            params={"user_id": user_id},
        )
        assert resp.json()["applications"] == []

    def test_delete_logs_activity(self, client, db_session, event_loop):
        created = self._create_app(client)
        client.delete(f"/api/tracker/applications/{created['id']}")

        import asyncio

        async def _check():
            async with db_session as s:
                from backend.models.models import ActivityLog
                result = await s.execute(
                    select(ActivityLog).where(
                        ActivityLog.action == "application_deleted"
                    )
                )
                logs = result.scalars().all()
                assert len(logs) >= 1

        event_loop.run_until_complete(_check())

    def test_delete_nonexistent_returns_404(self, client):
        resp = client.delete(f"/api/tracker/applications/{uuid.uuid4()}")
        assert resp.status_code == 404


# ====================================================================
# Activity Logging — cross-cutting concern
# ====================================================================

class TestActivityLogging:

    def test_all_write_ops_produce_activity_log_entries(self, client, db_session, event_loop):
        """POST, PATCH, and DELETE should each log to activity_log."""
        user_id = str(uuid.uuid4())

        # POST
        resp = client.post(
            "/api/tracker/applications",
            json=_make_payload(user_id=user_id),
        )
        app_id = resp.json()["id"]

        # PATCH
        client.patch(
            f"/api/tracker/applications/{app_id}",
            json={"status": "interviewing"},
        )

        # DELETE
        client.delete(f"/api/tracker/applications/{app_id}")

        import asyncio

        async def _check():
            async with db_session as s:
                from backend.models.models import ActivityLog
                result = await s.execute(
                    select(ActivityLog).where(
                        ActivityLog.user_id == user_id
                    )
                )
                logs = result.scalars().all()
                actions = {log.action for log in logs}
                assert "application_created" in actions
                assert "application_updated" in actions
                assert "application_deleted" in actions

        event_loop.run_until_complete(_check())
