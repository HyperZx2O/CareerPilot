"""
Shared pytest fixtures for the CareerPilot backend test suite.

The production backend talks to Supabase via the REST client in
`backend/db/supabase_client.py`.  These fixtures swap that client out for an
in-memory `FakeSupabaseClient` so tests run hermetically and do not require a
live Supabase project or working SQLAlchemy ORM (the ORM models are stubs in
production code anyway — see `backend/models/models.py`).
"""

from __future__ import annotations

import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

import pytest

# ── Ensure project root and backend are on sys.path ────────────────
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # …/CareerPilot
_BACKEND_DIR = _PROJECT_ROOT / "backend"

for p in (str(_PROJECT_ROOT), str(_BACKEND_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

from tests._fake_supabase import (  # noqa: E402
    FakeSupabaseClient,
    FakeResponse,
)


# ── Module-poisoning protection ────────────────────────────────────────────
# A few test files (test_jobs.py, test_jobs_router.py, test_fit_score.py) do
# `sys.modules['requests'] = MagicMock()` at import time to keep heavy SDK
# imports lightweight.  That side-effect leaks into every subsequent test
# file: when `pyiceberg` (a transitive dep of `supabase`) later does
# `from requests.auth import AuthBase` it gets the MagicMock and crashes
# with "'requests' is not a package".
#
# We work around it by snapshotting `sys.modules` for the polluting names at
# conftest load time (when the real modules are still installed) and
# restoring them after every test, so each test file gets a fresh chance
# to poison — and then we immediately clean up afterwards.

_POLLUTED_MODULE_NAMES = (
    "requests",
    "dotenv",
    "pinecone",
    "groq",
    # Note: OpenAI and Google generativeai removed from project; do not include here
)

# Capture the real modules now, while nothing has been mocked yet.
_REAL_MODULES: dict[str, Any] = {}
for _name in _POLLUTED_MODULE_NAMES:
    _real = sys.modules.get(_name)
    if _real is not None and not isinstance(_real, type(sys)) and getattr(_real, "__class__", None).__name__ != "MagicMock":
        _REAL_MODULES[_name] = _real


@pytest.fixture(autouse=True)
def _restore_real_modules():
    """After every test, put the real `requests` (etc.) back in sys.modules."""
    yield
    for _name, _real in _REAL_MODULES.items():
        sys.modules[_name] = _real



# ── Helpers ────────────────────────────────────────────────────────────────

def _new_id() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Core fixtures ──────────────────────────────────────────────────────────

@pytest.fixture()
def fake_supabase() -> Iterator[FakeSupabaseClient]:
    """A fresh in-memory Supabase replacement, isolated per test."""
    client = FakeSupabaseClient()
    yield client


@pytest.fixture()
def client(fake_supabase: FakeSupabaseClient):
    """
    FastAPI TestClient with `get_supabase_client` overridden to return the
    in-memory fake.  Routers that call `get_supabase_client()` directly will
    use the same fake because we patch the symbol's module binding in every
    router module that imported it.
    """
    import os
    os.environ.setdefault("DEV_DEMO_USER_ENABLED", "true")
    from fastapi.testclient import TestClient
    from backend.db import supabase_client as sb_module
    from backend.main import app

    # Save the original and patch the global getter for the duration of the test.
    original_getter = sb_module.get_supabase_client
    sb_module.get_supabase_client = lambda: fake_supabase
    app.dependency_overrides[original_getter] = lambda: fake_supabase

    # Also patch get_supabase_user_client to return the fake regardless.
    original_user_getter = getattr(sb_module, "get_supabase_user_client", None)
    sb_module.get_supabase_user_client = lambda user_jwt=None: fake_supabase
    # Walk sys.modules again to replace stale references to get_supabase_user_client
    patched_user_modules: list[tuple[Any, Any]] = []
    for mod_name, mod in list(sys.modules.items()):
        if mod is None:
            continue
        if not (mod_name.startswith("backend.") or mod_name == "backend"):
            continue
        if not hasattr(mod, "get_supabase_user_client"):
            continue
        if mod.get_supabase_user_client is original_user_getter:
            mod.get_supabase_user_client = lambda user_jwt=None: fake_supabase
            patched_user_modules.append((mod, original_user_getter))

    # Also patch the local binding in any module that did
    # `from backend.db.supabase_client import get_supabase_client`.
    # Without this, those modules keep a stale reference to the real
    # getter and bypass the dependency-override.
    patched_modules: list[tuple[Any, Any]] = []
    for mod_name, mod in list(sys.modules.items()):
        if mod is None:
            continue
        if not (mod_name.startswith("backend.") or mod_name == "backend"):
            continue
        if not hasattr(mod, "get_supabase_client"):
            continue
        if mod.get_supabase_client is original_getter:
            mod.get_supabase_client = lambda: fake_supabase
            patched_modules.append((mod, original_getter))

    try:
        with TestClient(app) as c:
            yield c
    finally:
        for mod, original in patched_modules:
            mod.get_supabase_client = original
        app.dependency_overrides.clear()
        sb_module.get_supabase_client = original_getter
        if original_user_getter is not None:
            sb_module.get_supabase_user_client = original_user_getter
        for mod, original in patched_user_modules:
            mod.get_supabase_user_client = original


# ── Seed helpers ───────────────────────────────────────────────────────────

@pytest.fixture()
def seed_application(fake_supabase: FakeSupabaseClient):
    """Insert a single application row and return the row dict."""
    def _seed(**overrides: Any) -> dict:
        row: dict[str, Any] = {
            "id": _new_id(),
            "user_id": "test-user",
            "job_title": "Software Engineer",
            "company": "Acme",
            "location": "Remote",
            "deadline": None,
            "status": "applied",
            "notes": None,
            "job_id": None,
            "fit_score": 80,
            "applied_at": _now_iso(),
            "updated_at": _now_iso(),
            "created_at": _now_iso(),
        }
        row.update(overrides)
        fake_supabase.insert_row("applications", row)
        return row
    return _seed


@pytest.fixture()
def seed_todo(fake_supabase: FakeSupabaseClient):
    def _seed(**overrides: Any) -> dict:
        row: dict[str, Any] = {
            "id": _new_id(),
            "user_id": "test-user",
            "application_id": None,
            "goal_id": None,
            "title": "Follow up",
            "done": False,
            "due_at": None,
            "created_at": _now_iso(),
        }
        row.update(overrides)
        fake_supabase.insert_row("todos", row)
        return row
    return _seed


@pytest.fixture()
def seed_goal(fake_supabase: FakeSupabaseClient):
    def _seed(**overrides: Any) -> dict:
        row: dict[str, Any] = {
            "id": _new_id(),
            "user_id": "test-user",
            "title": "Land a job",
            "description": None,
            "progress": 0,
            "status": "active",
            "target_date": None,
            "created_at": _now_iso(),
        }
        row.update(overrides)
        fake_supabase.insert_row("goals", row)
        return row
    return _seed


@pytest.fixture()
def seed_activity_log(fake_supabase: FakeSupabaseClient):
    def _seed(**overrides: Any) -> dict:
        row: dict[str, Any] = {
            "id": _new_id(),
            "user_id": "test-user",
            "application_id": None,
            "event": "applied",
            "detail": None,
            "created_at": _now_iso(),
        }
        row.update(overrides)
        fake_supabase.insert_row("activity_log", row)
        return row
    return _seed

