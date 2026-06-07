from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest


_USER_ID = "demo_user_123"


def _create_application(client, **overrides) -> dict:
    payload: dict = {
        "job_title": overrides.get("job_title", "ML Engineer"),
        "company": overrides.get("company", "Acme Corp"),
        "status": "applied",
    }
    payload.update(overrides)
    resp = client.post("/api/tracker/applications", json=payload)
    assert resp.status_code == 201
    return resp.json()


def _insert_activity_log_at(fake_supabase, user_id: str, dt: datetime) -> None:
    fake_supabase.insert_row("activity_log", {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": "test_activity",
        "created_at": dt.isoformat(),
    })


def _backdate_application(fake_supabase, application_id: str, dt: datetime) -> None:
    fake_supabase.table("applications").update(
        {"applied_at": dt.isoformat()}
    ).eq("id", application_id).execute()


class TestDashboardStatsShape:

    def test_returns_all_six_fields(self, client):
        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        assert resp.status_code == 200
        body = resp.json()
        expected_keys = {
            "applications_this_week",
            "applications_last_week",
            "skills_count",
            "roadmap_progress",
            "streak_days",
            "top_jobs",
        }
        assert set(body.keys()) == expected_keys

    def test_defaults_to_zeros_when_no_data(self, client):
        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        body = resp.json()
        assert body["applications_this_week"] == 0
        assert body["applications_last_week"] == 0
        assert body["skills_count"] == 0
        assert body["roadmap_progress"] == 0
        assert body["streak_days"] == 0
        assert body["top_jobs"] == []


class TestApplicationsCount:

    def test_applications_this_week(self, client):
        _create_application(client, job_title="Recent Job")

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        body = resp.json()
        assert body["applications_this_week"] >= 1

    def test_applications_last_week_counted_separately(self, client, fake_supabase):
        created = _create_application(client, job_title="Old Job")

        _backdate_application(
            fake_supabase,
            created["id"],
            datetime.now(timezone.utc) - timedelta(days=10),
        )

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        body = resp.json()
        assert body["applications_last_week"] >= 1
        assert body["applications_this_week"] == 0


class TestStreak:

    def test_streak_with_consecutive_days(self, client, fake_supabase):
        now = datetime.now(timezone.utc)

        for days_ago in range(3):
            _insert_activity_log_at(
                fake_supabase, _USER_ID,
                now - timedelta(days=days_ago, hours=2),
            )

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        assert resp.json()["streak_days"] == 3

    def test_streak_breaks_on_gap(self, client, fake_supabase):
        now = datetime.now(timezone.utc)

        _insert_activity_log_at(fake_supabase, _USER_ID, now - timedelta(hours=1))
        _insert_activity_log_at(fake_supabase, _USER_ID, now - timedelta(days=2))

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        assert resp.json()["streak_days"] == 1

    def test_streak_zero_when_no_activity(self, client):
        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        assert resp.json()["streak_days"] == 0

    def test_streak_zero_when_activity_only_in_past(self, client, fake_supabase):
        _insert_activity_log_at(
            fake_supabase, _USER_ID,
            datetime.now(timezone.utc) - timedelta(days=5),
        )

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        assert resp.json()["streak_days"] == 0


class TestRoadmapProgress:

    def test_finds_roadmap_goal(self, client):
        client.post("/api/tracker/goals", json={
            "title": "My Roadmap Plan",
            "target_date": "2025-12-31",
        })
        goals = client.get("/api/tracker/goals").json()["goals"]
        client.patch(f"/api/tracker/goals/{goals[0]['id']}", json={"progress": 65})

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        assert resp.json()["roadmap_progress"] == 65

    def test_roadmap_case_insensitive(self, client):
        client.post("/api/tracker/goals", json={
            "title": "ROADMAP to Success",
        })
        goals = client.get("/api/tracker/goals").json()["goals"]
        client.patch(f"/api/tracker/goals/{goals[0]['id']}", json={"progress": 30})

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        assert resp.json()["roadmap_progress"] == 30

    def test_no_roadmap_goal_returns_zero(self, client):
        client.post("/api/tracker/goals", json={
            "title": "Get a promotion",
        })

        resp = client.get("/api/tracker/dashboard/stats", params={"user_id": _USER_ID})
        assert resp.json()["roadmap_progress"] == 0


class TestSkillsCount:

    @patch("backend.routers.tracker._fetch_cv_skills_text")
    def test_counts_skills_tokens(self, mock_fetch, client):
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


class TestNudgeActiveUser:

    def test_active_user_gets_null_message(self, client, fake_supabase):
        _insert_activity_log_at(
            fake_supabase, _USER_ID,
            datetime.now(timezone.utc) - timedelta(hours=1),
        )

        resp = client.get("/api/tracker/nudge", params={"user_id": _USER_ID})
        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] is None
        assert body["jobs"] == []

    def test_activity_2_days_ago_still_active(self, client, fake_supabase):
        _insert_activity_log_at(
            fake_supabase, _USER_ID,
            datetime.now(timezone.utc) - timedelta(days=2),
        )

        resp = client.get("/api/tracker/nudge", params={"user_id": _USER_ID})
        body = resp.json()
        assert body["message"] is None
        assert body["jobs"] == []


class TestNudgeInactiveUser:

    @patch("backend.routers.tracker.get_structured_jobs")
    @patch("backend.routers.tracker._fetch_cv_skills_text")
    def test_inactive_user_gets_nudge_with_jobs(self, mock_skills, mock_jobs, client, fake_supabase):
        _insert_activity_log_at(
            fake_supabase, _USER_ID,
            datetime.now(timezone.utc) - timedelta(days=5),
        )

        mock_skills.return_value = "Python FastAPI SQLAlchemy"
        mock_jobs.return_value = [
            {"id": "1", "title": "ML Engineer", "company": "A", "description": "..."},
            {"id": "2", "title": "Data Scientist", "company": "B", "description": "..."},
            {"id": "3", "title": "AI Researcher", "company": "C", "description": "..."},
            {"id": "4", "title": "Backend Dev", "company": "D", "description": "..."},
        ]

        resp = client.get("/api/tracker/nudge", params={"user_id": _USER_ID, "cv_id": "test-cv"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] is not None
        assert "3 days" in body["message"]
        assert len(body["jobs"]) == 3
        mock_jobs.assert_called_once_with("Python FastAPI SQLAlchemy", "gb")

    @patch("backend.routers.tracker.get_structured_jobs")
    @patch("backend.routers.tracker._fetch_cv_skills_text")
    def test_inactive_user_no_cv_id_uses_default_query(self, mock_skills, mock_jobs, client):
        mock_skills.return_value = None
        mock_jobs.return_value = [
            {"id": "1", "title": "Software Dev", "company": "X", "description": "..."},
        ]

        resp = client.get("/api/tracker/nudge", params={"user_id": _USER_ID})
        body = resp.json()
        assert body["message"] is not None
        assert len(body["jobs"]) == 1
        mock_jobs.assert_called_once_with("software engineer", "gb")

    def test_no_activity_at_all_triggers_nudge(self, client):
        with patch("backend.routers.tracker.get_structured_jobs", return_value=[]):
            resp = client.get("/api/tracker/nudge", params={"user_id": _USER_ID})

        body = resp.json()
        assert body["message"] is not None
        assert "3 days" in body["message"]

    @patch("backend.routers.tracker.get_structured_jobs")
    def test_nudge_graceful_when_adzuna_fails(self, mock_jobs, client):
        mock_jobs.side_effect = RuntimeError("Adzuna down")

        resp = client.get("/api/tracker/nudge", params={"user_id": _USER_ID})
        body = resp.json()
        assert body["message"] is not None
        assert body["jobs"] == []
