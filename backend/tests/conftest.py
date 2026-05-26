"""
Shared pytest fixtures for the CareerPilot backend test suite.

Provides:
  - An in-memory async SQLite database engine and session
  - A FastAPI TestClient with the DB dependency overridden
  - Auto-creation / teardown of all ORM tables per test session
"""

from __future__ import annotations

import sys
import asyncio
from pathlib import Path
from typing import AsyncGenerator

import pytest

# ── Ensure project root and backend are on sys.path ────────────────
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # C:\Career Pilot
_BACKEND_DIR = _PROJECT_ROOT / "backend"

for p in (str(_PROJECT_ROOT), str(_BACKEND_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy import text

from backend.db.supabase_client import Base
from backend.models.models import Application, ActivityLog, Todo, Goal  # noqa: F401 – registers tables


# ── Test database engine (in-memory SQLite) ────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Fixtures ───────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
def _create_tables(event_loop):
    """Create all ORM tables once before the test session, drop them after."""

    async def _setup():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def _teardown():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await test_engine.dispose()

    event_loop.run_until_complete(_setup())
    yield
    event_loop.run_until_complete(_teardown())


async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a test database session."""
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@pytest.fixture()
def client():
    """
    Return a synchronous TestClient whose DB dependency is overridden
    to use the in-memory test database.
    """
    from fastapi.testclient import TestClient
    from backend.db.supabase_client import get_db
    from backend.main import app

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def db_session(event_loop):
    """Provide a standalone async session for direct DB assertions."""
    session = event_loop.run_until_complete(TestSessionLocal().__aenter__())
    yield session
    event_loop.run_until_complete(session.__aexit__(None, None, None))


@pytest.fixture(autouse=True)
def _clean_tables(event_loop):
    """Truncate all rows between tests so each test starts with a clean slate."""
    yield

    async def _truncate():
        async with TestSessionLocal() as session:
            for table in reversed(Base.metadata.sorted_tables):
                await session.execute(table.delete())
            await session.commit()

    event_loop.run_until_complete(_truncate())
