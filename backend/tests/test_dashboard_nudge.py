"""
Tests for Dashboard Stats & AI Nudge endpoints — Phase 7.

Uses FastAPI's TestClient with an in-memory SQLite database (see conftest.py).
External services (Pinecone, Adzuna) are mocked via unittest.mock.patch.

Acceptance Criteria Verified
----------------------------
1. GET /api/tracker/dashboard/stats returns all 5 fields with correct values
2. Streak counter correctly identifies consecutive active days
3. GET /api/tracker/nudge returns non-null message + jobs when inactive ≥3 days
4. GET /api/tracker/nudge returns {"message": null, "jobs": []} when active
"""

from __future__ import annotations

import uuid
import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import select


# ── Helpers ─────────────────────────────────────────────────────────

_USER_ID = str(uuid.uuid4())


def _create_application(client, user_id: str = _USER_ID, **overrides) -> dict:
    """Create an application via the API and return the response body."""
    payload = {
        "user_id": user_id,
        "job_title": overrides.get("job_title", "ML Engineer"),
        "company": overrides.get("company", "Acme Corp"),
        "status": "applied",
    }
    payload.update(overrides)
    resp = client.post("/api/tracker/applications", json=payload)
    assert resp.status_code == 201
    return resp.json()


def _insert_activity_log_at(db_session, event_loop, user_id: str, dt: datetime):
    """Insert an activity_log row with an explicit created_at timestamp."""

    async def _insert():
        async with db_session as s:
            from backend.models.models import ActivityLog
            import uuid as _uuid
            log = ActivityLog(
                id=str(_uuid.uuid4()),
                user_id=user_id,
                action="test_activity",
                created_at=dt,
            )
            s.add(log)
            await s.commit()

    event_loop.run_until_complete(_insert())


# ====================================================================
# Dashboard Stats — Response Shape
# ====================================================================

class TestDashboardStatsShape:

    def test_returns_all_five_fields(self, client):
        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        assert resp.status_code == 200
        body = resp.json()
        expected_keys = {
            "applications_this_week",
            "applications_last_week",
            "skills_count",
            "roadmap_progress",
            "streak_days",
        }
        assert set(body.keys()) == expected_keys

    def test_defaults_to_zeros_when_no_data(self, client):
        user_id = str(uuid.uuid4())
        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": user_id})
        body = resp.json()
        assert body["applications_this_week"] == 0
        assert body["applications_last_week"] == 0
        assert body["skills_count"] == 0
        assert body["roadmap_progress"] == 0
        assert body["streak_days"] == 0


# ====================================================================
# Dashboard Stats — Applications Count
# ====================================================================

class TestApplicationsCount:

    def test_applications_this_week(self, client):
        """Applications created now should count as 'this week'."""
        user_id = str(uuid.uuid4())
        _create_application(client, user_id=user_id, job_title="Recent Job")

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": user_id})
        body = resp.json()
        assert body["applications_this_week"] >= 1

    def test_applications_last_week_counted_separately(self, client, db_session, event_loop):
        """
        Manually backdate an application's applied_at to 10 days ago —
        it should appear in last_week count, not this_week.
        """
        user_id = str(uuid.uuid4())

        # Create an application (will have applied_at = now)
        created = _create_application(client, user_id=user_id, job_title="Old Job")

        # Backdate the applied_at to 10 days ago via direct DB update
        async def _backdate():
            async with db_session as s:
                from backend.models.models import Application
                result = await s.execute(
                    select(Application).where(Application.id == created["id"])
                )
                app = result.scalar_one()
                app.applied_at = datetime.now(timezone.utc) - timedelta(days=10)
                await s.commit()

        event_loop.run_until_complete(_backdate())

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": user_id})
        body = resp.json()
        assert body["applications_last_week"] >= 1
        # The backdated application should NOT be in this_week
        assert body["applications_this_week"] == 0


# ====================================================================
# Dashboard Stats — Streak
# ====================================================================

class TestStreak:

    def test_streak_with_consecutive_days(self, client, db_session, event_loop):
        """Insert activity for today, yesterday, and day-before — streak = 3."""
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        for days_ago in range(3):
            _insert_activity_log_at(
                db_session, event_loop, user_id,
                now - timedelta(days=days_ago, hours=2),
            )

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": user_id})
        assert resp.json()["streak_days"] == 3

    def test_streak_breaks_on_gap(self, client, db_session, event_loop):
        """Activity today and 2 days ago (but NOT yesterday) → streak = 1."""
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        # Today
        _insert_activity_log_at(db_session, event_loop, user_id, now - timedelta(hours=1))
        # 2 days ago (skip yesterday)
        _insert_activity_log_at(db_session, event_loop, user_id, now - timedelta(days=2))

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": user_id})
        assert resp.json()["streak_days"] == 1

    def test_streak_zero_when_no_activity(self, client):
        user_id = str(uuid.uuid4())
        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": user_id})
        assert resp.json()["streak_days"] == 0

    def test_streak_zero_when_activity_only_in_past(self, client, db_session, event_loop):
        """Activity only 5 days ago — no activity today → streak = 0."""
        user_id = str(uuid.uuid4())
        _insert_activity_log_at(
            db_session, event_loop, user_id,
            datetime.now(timezone.utc) - timedelta(days=5),
        )

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": user_id})
        assert resp.json()["streak_days"] == 0


# ====================================================================
# Dashboard Stats — Roadmap Progress
# ====================================================================

class TestRoadmapProgress:

    def test_finds_roadmap_goal(self, client):
        """A goal titled 'My Roadmap Plan' should match the roadmap search."""
        user_id = str(uuid.uuid4())
        client.post("/api/tracker/goals", json={
            "user_id": user_id,
            "title": "My Roadmap Plan",
            "target_date": "2025-12-31",
        })
        # Set progress to 65
        goals = client.get("/api/tracker/goals", params={"user_id": user_id}).json()["goals"]
        client.patch(f"/api/tracker/goals/{goals[0]['id']}", json={"progress": 65})

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": user_id})
        assert resp.json()["roadmap_progress"] == 65

    def test_roadmap_case_insensitive(self, client):
        """Title 'ROADMAP' should also match."""
        user_id = str(uuid.uuid4())
        client.post("/api/tracker/goals", json={
            "user_id": user_id,
            "title": "ROADMAP to Success",
        })
        goals = client.get("/api/tracker/goals", params={"user_id": user_id}).json()["goals"]
        client.patch(f"/api/tracker/goals/{goals[0]['id']}", json={"progress": 30})

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": user_id})
        assert resp.json()["roadmap_progress"] == 30

    def test_no_roadmap_goal_returns_zero(self, client):
        user_id = str(uuid.uuid4())
        # Create a goal that does NOT match "roadmap"
        client.post("/api/tracker/goals", json={
            "user_id": user_id,
            "title": "Get a promotion",
        })

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": user_id})
        assert resp.json()["roadmap_progress"] == 0


# ====================================================================
# Dashboard Stats — Skills Count (mocked Pinecone)
# ====================================================================

class TestSkillsCount:

    @patch("backend.routers.tracker._fetch_cv_skills_text")
    def test_counts_skills_tokens(self, mock_fetch, client):
        """Mocked Pinecone returns a skills string → count tokens."""
        mock_fetch.return_value = "Python FastAPI SQLAlchemy Docker Kubernetes"
        resp = client.get("/api/tracker/dashboard/stats", params={
            "user_id": _USER_ID,
            "cv_id": "test-cv-123",
        })
        assert resp.json()["skills_count"] == 5

    @patch("backend.routers.tracker._fetch_cv_skills_text")
    def test_skills_with_commas_and_spaces(self, mock_fetch, client):
        mock_fetch.return_value = "Python, Java, C++, React, Node.js"
        resp = client.get("/api/tracker/dashboard/stats", params={
            "user_id": _USER_ID,
            "cv_id": "test-cv-123",
        })
        # "Python," "Java," "C++," "React," "Node.js" → 5 tokens
        assert resp.json()["skills_count"] == 5

    def test_no_cv_id_returns_zero_skills(self, client):
        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        assert resp.json()["skills_count"] == 0

    @patch("backend.routers.tracker._fetch_cv_skills_text")
    def test_pinecone_failure_returns_zero(self, mock_fetch, client):
        mock_fetch.return_value = None
        resp = client.get("/api/tracker/dashboard/stats", params={
            "user_id": _USER_ID,
            "cv_id": "test-cv-123",
        })
        assert resp.json()["skills_count"] == 0


# ====================================================================
# Nudge — Active User
# ====================================================================

class TestNudgeActiveUser:

    def test_active_user_gets_null_message(self, client, db_session, event_loop):
        """User with activity today should NOT be nudged."""
        user_id = str(uuid.uuid4())
        _insert_activity_log_at(
            db_session, event_loop, user_id,
            datetime.now(timezone.utc) - timedelta(hours=1),
        )

        resp = client.get("/api/tracker/nudge", params={"user_id": user_id})
        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] is None
        assert body["jobs"] == []

    def test_activity_2_days_ago_still_active(self, client, db_session, event_loop):
        """Activity 2 days ago (within 3-day window) → no nudge."""
        user_id = str(uuid.uuid4())
        _insert_activity_log_at(
            db_session, event_loop, user_id,
            datetime.now(timezone.utc) - timedelta(days=2),
        )

        resp = client.get("/api/tracker/nudge", params={"user_id": user_id})
        body = resp.json()
        assert body["message"] is None
        assert body["jobs"] == []


# ====================================================================
# Nudge — Inactive User
# ====================================================================

class TestNudgeInactiveUser:

    @patch("backend.routers.tracker.get_structured_jobs")
    @patch("backend.routers.tracker._fetch_cv_skills_text")
    def test_inactive_user_gets_nudge_with_jobs(self, mock_skills, mock_jobs, client, db_session, event_loop):
        """User with activity 5 days ago → nudge with jobs."""
        user_id = str(uuid.uuid4())
        _insert_activity_log_at(
            db_session, event_loop, user_id,
            datetime.now(timezone.utc) - timedelta(days=5),
        )

        mock_skills.return_value = "Python FastAPI SQLAlchemy"
        mock_jobs.return_value = [
            {"id": "1", "title": "ML Engineer", "company": "A", "description": "..."},
            {"id": "2", "title": "Data Scientist", "company": "B", "description": "..."},
            {"id": "3", "title": "AI Researcher", "company": "C", "description": "..."},
            {"id": "4", "title": "Backend Dev", "company": "D", "description": "..."},
        ]

        resp = client.get("/api/tracker/nudge", params={"user_id": user_id, "cv_id": "test-cv"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] is not None
        assert "3 days" in body["message"]
        assert len(body["jobs"]) == 3  # top 3 only
        mock_jobs.assert_called_once_with("Python FastAPI SQLAlchemy", "gb")

    @patch("backend.routers.tracker.get_structured_jobs")
    @patch("backend.routers.tracker._fetch_cv_skills_text")
    def test_inactive_user_no_cv_id_uses_default_query(self, mock_skills, mock_jobs, client):
        """No cv_id → uses fallback search query 'software engineer'."""
        user_id = str(uuid.uuid4())

        mock_skills.return_value = None
        mock_jobs.return_value = [
            {"id": "1", "title": "Software Dev", "company": "X", "description": "..."},
        ]

        resp = client.get("/api/tracker/nudge", params={"user_id": user_id})
        body = resp.json()
        assert body["message"] is not None
        assert len(body["jobs"]) == 1
        mock_jobs.assert_called_once_with("software engineer", "gb")

    def test_no_activity_at_all_triggers_nudge(self, client):
        """Brand new user with zero activity → nudge is active."""
        user_id = str(uuid.uuid4())

        # Patch at import location — the nudge handler imports at call time
        with patch("backend.routers.tracker.get_structured_jobs", return_value=[]):
            resp = client.get("/api/tracker/nudge", params={"user_id": user_id})

        body = resp.json()
        assert body["message"] is not None
        assert "3 days" in body["message"]

    @patch("backend.routers.tracker.get_structured_jobs")
    def test_nudge_graceful_when_adzuna_fails(self, mock_jobs, client):
        """If job search raises, nudge still returns message with empty jobs."""
        user_id = str(uuid.uuid4())
        mock_jobs.side_effect = RuntimeError("Adzuna down")

        resp = client.get("/api/tracker/nudge", params={"user_id": user_id})
        body = resp.json()
        assert body["message"] is not None
        assert body["jobs"] == []
