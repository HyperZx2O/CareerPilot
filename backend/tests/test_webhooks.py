import os
os.environ["ENV"] = "test"
os.environ["CLERK_WEBHOOK_SECRET"] = "whsec_test_secret"
os.environ["JSEARCH_API_KEY"] = "test-key"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "test-anon-key"

from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.main import app
import json
import time
from datetime import datetime, timezone

client = TestClient(app)


def _sign_payload(payload_str: str, secret: str, msg_id: str = "msg_test") -> tuple[str, str, str]:
    ts = datetime.now(timezone.utc)
    from svix import Webhook
    wh = Webhook(secret)
    sig = wh.sign(msg_id, ts, payload_str)
    return msg_id, str(int(ts.timestamp())), sig


class TestClerkWebhook:
    def _mock_supabase(self):
        mock_table = MagicMock()
        mock_table.select.return_value.limit.return_value.execute.return_value.data = []
        mock_table.insert.return_value.execute.return_value = MagicMock()
        mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock()
        mock_client = MagicMock()
        mock_client.table.return_value = mock_table
        return mock_client

    @patch("backend.routers.webhooks.get_supabase_client")
    def test_user_created(self, mock_get_supabase):
        mock_get_supabase.return_value = self._mock_supabase()
        payload_str = json.dumps({
            "type": "user.created",
            "data": {
                "id": "user_abc123",
                "email_addresses": [{"email_address": "test@example.com"}],
            },
        })

        svix_id, ts, sig = _sign_payload(payload_str, "whsec_test_secret")
        resp = client.post(
            "/api/webhooks/clerk",
            content=payload_str,
            headers={
                "svix-id": svix_id,
                "svix-timestamp": ts,
                "svix-signature": sig,
                "Content-Type": "application/json",
            },
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["action"] == "created"

    @patch("backend.routers.webhooks.get_supabase_client")
    def test_user_updated(self, mock_get_supabase):
        mock_get_supabase.return_value = self._mock_supabase()
        payload_str = json.dumps({
            "type": "user.updated",
            "data": {
                "id": "user_abc123",
                "email_addresses": [{"email_address": "updated@example.com"}],
            },
        })

        svix_id, ts, sig = _sign_payload(payload_str, "whsec_test_secret")
        resp = client.post(
            "/api/webhooks/clerk",
            content=payload_str,
            headers={
                "svix-id": svix_id,
                "svix-timestamp": ts,
                "svix-signature": sig,
                "Content-Type": "application/json",
            },
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["action"] == "updated"

    def test_invalid_signature_returns_401(self):
        payload = json.dumps({"type": "user.created", "data": {"id": "user_bad"}}).encode()
        resp = client.post(
            "/api/webhooks/clerk",
            content=payload,
            headers={
                "svix-id": "msg_bad",
                "svix-timestamp": str(int(time.time())),
                "svix-signature": "v1,bad_signature",
                "Content-Type": "application/json",
            },
        )
        assert resp.status_code == 401

    @patch("backend.routers.webhooks.get_supabase_client")
    def test_unknown_event_returns_ok_ignored(self, mock_get_supabase):
        mock_get_supabase.return_value = self._mock_supabase()
        payload_str = json.dumps({
            "type": "session.created",
            "data": {"id": "sess_xyz"},
        })

        svix_id, ts, sig = _sign_payload(payload_str, "whsec_test_secret")
        resp = client.post(
            "/api/webhooks/clerk",
            content=payload_str,
            headers={
                "svix-id": svix_id,
                "svix-timestamp": ts,
                "svix-signature": sig,
                "Content-Type": "application/json",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["action"] == "ignored"
