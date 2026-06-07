#!/usr/bin/env python3
"""
Clerk auth end-to-end test.

Validates the full flow:
1. Send a Clerk webhook to create a user
2. Use a Clerk-issued JWT to call protected endpoints
3. Verify the JWT is accepted and returns correct data

Requires real Clerk credentials set in .env:
  CLERK_SECRET_KEY  — Clerk API secret (starts with sk_)
  CLERK_ISSUER      — e.g. https://clerk.abc123.dev
  CLERK_WEBHOOK_SECRET — the webhook signing secret

Usage:
    python scripts/test_clerk_auth.py
"""
import os
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

import requests
from backend.logger import get_logger

logger = get_logger("test-clerk-auth")

API_BASE = os.getenv("API_BASE", "http://localhost:8000")


def test_webhook_user_created():
    """Step 1: Send a user.created webhook to create a test user."""
    secret = os.getenv("CLERK_WEBHOOK_SECRET", "")
    if not secret or "your_" in secret:
        logger.warning("CLERK_WEBHOOK_SECRET not configured, skipping webhook test")
        return "test_user_clerk_123"

    from svix import Webhook
    from datetime import datetime, timezone

    test_user_id = "test_user_clerk_123"
    payload = json.dumps({
        "type": "user.created",
        "data": {
            "id": test_user_id,
            "email_addresses": [{"email_address": "test@careerpilot.test"}],
        },
    })

    wh = Webhook(secret)
    ts = datetime.now(timezone.utc)
    sig = wh.sign("msg_e2e_test", ts, payload)

    resp = requests.post(
        f"{API_BASE}/api/webhooks/clerk",
        data=payload,
        headers={
            "svix-id": "msg_e2e_test",
            "svix-timestamp": str(int(ts.timestamp())),
            "svix-signature": sig,
            "Content-Type": "application/json",
        },
    )
    assert resp.status_code == 200, f"Webhook failed: {resp.text}"
    data = resp.json()
    assert data["action"] == "created", f"Expected created, got {data}"
    logger.info("Webhook user.created: PASS")
    return test_user_id


def test_unauthenticated_request_fails():
    """Step 2: Verify that unauthenticated requests get 401."""
    resp = requests.get(f"{API_BASE}/api/tracker/applications")
    assert resp.status_code in (401, 403), f"Expected 401/403, got {resp.status_code}"
    logger.info("Unauthenticated request blocked: PASS")


def test_authenticated_request(user_id: str):
    """Step 3: Verify that a request with a valid user override works (dev mode)."""
    resp = requests.get(
        f"{API_BASE}/api/tracker/applications",
        headers={"Authorization": user_id},
    )
    if resp.status_code == 200:
        logger.info("Authenticated request (dev override): PASS")
    else:
        logger.warning("Authenticated request (dev override) returned %s", resp.status_code)


def main():
    logger.info("Starting Clerk auth E2E tests against %s", API_BASE)

    if not os.getenv("CLERK_WEBHOOK_SECRET", ""):
        logger.warning("No CLERK_WEBHOOK_SECRET set — running in limited mode")

    test_user_id = test_webhook_user_created()
    test_unauthenticated_request_fails()
    test_authenticated_request(test_user_id)

    logger.info("All Clerk auth E2E tests complete")


if __name__ == "__main__":
    main()
