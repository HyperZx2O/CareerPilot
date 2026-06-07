from __future__ import annotations

import uuid
import pytest

_VALID_PAYLOAD = {
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
    return {**_VALID_PAYLOAD, **overrides}

_AUTH_USER_ID = "demo_user_123"


class TestListApplications:

    def test_returns_empty_list_when_no_data(self, client):
        resp = client.get(
            "/api/tracker/applications",
            params={"user_id": _AUTH_USER_ID},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "applications" in body
        assert body["applications"] == []

    def test_returns_applications_for_user(self, client):
        for title in ("Job A", "Job B"):
            client.post(
                "/api/tracker/applications",
                json=_make_payload(job_title=title),
            )

        resp = client.get(
            "/api/tracker/applications",
            params={"user_id": _AUTH_USER_ID},
        )
        assert resp.status_code == 200
        apps = resp.json()["applications"]
        assert len(apps) == 2
        titles = [a["job_title"] for a in apps]
        assert "Job A" in titles
        assert "Job B" in titles

    def test_only_owns_apps(self, client):
        """All apps created by the same user should be returned."""
        client.post(
            "/api/tracker/applications",
            json=_make_payload(job_title="My job"),
        )

        resp = client.get(
            "/api/tracker/applications",
            params={"user_id": _AUTH_USER_ID},
        )
        apps = resp.json()["applications"]
        assert len(apps) == 1
        assert apps[0]["job_title"] == "My job"


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
        assert body["user_id"] == _AUTH_USER_ID
        assert "id" in body
        assert "applied_at" in body
        assert "updated_at" in body

    def test_create_logs_activity(self, client, fake_supabase):
        payload = _make_payload()
        client.post("/api/tracker/applications", json=payload)

        logs = [
            log for log in fake_supabase.all("activity_log")
            if log.get("action") == "application_created"
        ]
        assert len(logs) >= 1
        assert logs[0]["user_id"] == _AUTH_USER_ID

    def test_invalid_status_returns_422(self, client):
        payload = _make_payload(status="banana")
        resp = client.post("/api/tracker/applications", json=payload)
        assert resp.status_code == 422

    def test_missing_required_fields_returns_422(self, client):
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
        assert body["status"] == created["status"]

    def test_update_logs_activity(self, client, fake_supabase):
        created = self._create_app(client)
        client.patch(
            f"/api/tracker/applications/{created['id']}",
            json={"status": "offer"},
        )

        logs = [
            log for log in fake_supabase.all("activity_log")
            if log.get("action") == "application_updated"
        ]
        assert len(logs) >= 1

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
        created = self._create_app(client)
        app_id = created["id"]

        client.delete(f"/api/tracker/applications/{app_id}")

        resp = client.get(
            "/api/tracker/applications",
            params={"user_id": _AUTH_USER_ID},
        )
        assert resp.json()["applications"] == []

    def test_delete_logs_activity(self, client, fake_supabase):
        created = self._create_app(client)
        client.delete(f"/api/tracker/applications/{created['id']}")

        logs = [
            log for log in fake_supabase.all("activity_log")
            if log.get("action") == "application_deleted"
        ]
        assert len(logs) >= 1

    def test_delete_nonexistent_returns_404(self, client):
        resp = client.delete(f"/api/tracker/applications/{uuid.uuid4()}")
        assert resp.status_code == 404


class TestActivityLogging:

    def test_all_write_ops_produce_activity_log_entries(self, client, fake_supabase):
        resp = client.post(
            "/api/tracker/applications",
            json=_make_payload(),
        )
        app_id = resp.json()["id"]

        client.patch(
            f"/api/tracker/applications/{app_id}",
            json={"status": "interviewing"},
        )

        client.delete(f"/api/tracker/applications/{app_id}")

        logs = [
            log for log in fake_supabase.all("activity_log")
            if log.get("user_id") == _AUTH_USER_ID
        ]
        actions = {log.get("action") for log in logs}
        assert "application_created" in actions
        assert "application_updated" in actions
        assert "application_deleted" in actions
