"""
In-memory fake of the Supabase REST client used by the test suite.

Production code in `backend/routers/tracker.py` calls the Supabase client with a
fluent chain like:

    supabase.table("applications").insert(payload).execute()
    supabase.table("applications").select("*").eq("user_id", uid).order("applied_at", desc=True).execute()
    supabase.table("applications").select("id", count="exact").eq("user_id", uid).gte("applied_at", iso).execute()
    supabase.table("goals").update({"progress": 50}).eq("id", goal_id).execute()
    supabase.table("todos").delete().eq("goal_id", goal_id).execute()

This fake mirrors that surface area closely enough that the routers work
unchanged.  Each `.execute()` returns a `FakeResponse` with `.data` (the list of
matching rows) and `.count` (set when the original query used `count="exact"`).
"""

from __future__ import annotations

import copy
import uuid
from datetime import datetime, timezone
from typing import Any, Iterable, Optional


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _new_id() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_iso(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value)


def _values_equal(actual: Any, expected: Any) -> bool:
    """
    Loosely compare a stored value with a filter value, tolerating common
    cross-type mismatches that occur in production code (e.g. Pydantic dumps
    a ``datetime.date`` while the caller passes an ISO string).  Mirrors the
    way Supabase REST serialises dates server-side.
    """
    if actual == expected:
        return True
    if actual is None or expected is None:
        return False
    # date vs ISO date string ("2025-06-01")
    try:
        from datetime import date as _date
        if isinstance(actual, _date) and not isinstance(actual, datetime):
            if isinstance(expected, str):
                return actual.isoformat() == expected
        if isinstance(expected, _date) and not isinstance(expected, datetime):
            if isinstance(actual, str):
                return expected.isoformat() == actual
    except Exception:
        pass
    # datetime vs ISO datetime string (truncate sub-seconds / tz differences)
    if isinstance(actual, datetime) and isinstance(expected, str):
        try:
            parsed = datetime.fromisoformat(expected)
            a = actual if actual.tzinfo else actual.replace(tzinfo=timezone.utc)
            e = parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
            return a == e
        except ValueError:
            pass
    if isinstance(expected, datetime) and isinstance(actual, str):
        try:
            parsed = datetime.fromisoformat(actual)
            a = parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
            e = expected if expected.tzinfo else expected.replace(tzinfo=timezone.utc)
            return a == e
        except ValueError:
            pass
    return False


# ---------------------------------------------------------------------------
# Response object
# ---------------------------------------------------------------------------

class FakeResponse:
    """Mimics supabase's APIResponse.  Has `.data` and optionally `.count`."""

    def __init__(
        self,
        data: Optional[list[dict]] = None,
        count: Optional[int] = None,
    ) -> None:
        self.data: list[dict] = data if data is not None else []
        self.count: Optional[int] = count


# ---------------------------------------------------------------------------
# Query builder
# ---------------------------------------------------------------------------

class FakeTableQuery:
    """Fluent query builder.  Mirrors the subset of the Supabase client we use."""

    def __init__(self, store: "FakeSupabaseClient", table: str) -> None:
        self._store = store
        self._table = table
        self._filters: list[tuple[str, str, Any]] = []
        self._order: Optional[tuple[str, bool]] = None
        self._limit: Optional[int] = None
        self._select_cols: Optional[list[str]] = None
        self._count_exact: bool = False
        self._op: str = "select"          # what .execute() should do
        self._payload: Optional[Any] = None
        self._action: str = "select"      # for insert/update variants

    # ── Terminal ────────────────────────────────────────────────────────
    def execute(self) -> FakeResponse:
        rows = self._store._rows(self._table)

        if self._op == "insert":
            return self._do_insert(rows)
        if self._op == "update":
            return self._do_update(rows)
        if self._op == "delete":
            return self._do_delete(rows)
        return self._do_select(rows)

    # ── Operation chooser ───────────────────────────────────────────────
    def insert(self, payload: Any) -> "FakeTableQuery":
        new = self._clone()
        new._op = "insert"
        new._action = "insert"
        new._payload = payload
        return new

    def update(self, payload: dict) -> "FakeTableQuery":
        new = self._clone()
        new._op = "update"
        new._action = "update"
        new._payload = payload
        return new

    def delete(self) -> "FakeTableQuery":
        new = self._clone()
        new._op = "delete"
        new._action = "delete"
        new._payload = None
        return new

    # ── Modifier methods ────────────────────────────────────────────────
    def select(self, cols: str = "*", *, count: Optional[str] = None) -> "FakeTableQuery":
        new = self._clone()
        if cols == "*":
            new._select_cols = None
        else:
            new._select_cols = [c.strip() for c in cols.split(",") if c.strip()]
        if count == "exact":
            new._count_exact = True
        return new

    def eq(self, column: str, value: Any) -> "FakeTableQuery":
        new = self._clone()
        new._filters.append(("eq", column, value))
        return new

    def neq(self, column: str, value: Any) -> "FakeTableQuery":
        new = self._clone()
        new._filters.append(("neq", column, value))
        return new

    def gt(self, column: str, value: Any) -> "FakeTableQuery":
        new = self._clone()
        new._filters.append(("gt", column, value))
        return new

    def gte(self, column: str, value: Any) -> "FakeTableQuery":
        new = self._clone()
        new._filters.append(("gte", column, value))
        return new

    def lt(self, column: str, value: Any) -> "FakeTableQuery":
        new = self._clone()
        new._filters.append(("lt", column, value))
        return new

    def lte(self, column: str, value: Any) -> "FakeTableQuery":
        new = self._clone()
        new._filters.append(("lte", column, value))
        return new

    def ilike(self, column: str, pattern: str) -> "FakeTableQuery":
        new = self._clone()
        new._filters.append(("ilike", column, pattern))
        return new

    def like(self, column: str, pattern: str) -> "FakeTableQuery":
        new = self._clone()
        new._filters.append(("like", column, pattern))
        return new

    def in_(self, column: str, values: Iterable[Any]) -> "FakeTableQuery":
        new = self._clone()
        new._filters.append(("in", column, list(values)))
        return new

    def order(self, column: str, desc: bool = False) -> "FakeTableQuery":
        new = self._clone()
        new._order = (column, bool(desc))
        return new

    def limit(self, n: int) -> "FakeTableQuery":
        new = self._clone()
        new._limit = int(n)
        return new

    # ── Internals ───────────────────────────────────────────────────────
    def _clone(self) -> "FakeTableQuery":
        new = FakeTableQuery(self._store, self._table)
        new._filters = list(self._filters)
        new._order = self._order
        new._limit = self._limit
        new._select_cols = self._select_cols
        new._count_exact = self._count_exact
        new._op = self._op
        new._payload = self._payload
        new._action = self._action
        return new

    def _match(self, row: dict) -> bool:
        for op, column, value in self._filters:
            actual = row.get(column)
            if op == "eq":
                if not _values_equal(actual, value):
                    return False
            elif op == "neq":
                if _values_equal(actual, value):
                    return False
            elif op == "gt":
                if not (actual is not None and actual > value):
                    return False
            elif op == "gte":
                if not (actual is not None and actual >= value):
                    return False
            elif op == "lt":
                if not (actual is not None and actual < value):
                    return False
            elif op == "lte":
                if not (actual is not None and actual <= value):
                    return False
            elif op == "ilike":
                if actual is None:
                    return False
                import re
                regex = "^" + re.escape(str(value)).replace("%", ".*").replace("_", ".") + "$"
                if not re.match(regex, str(actual), flags=re.IGNORECASE):
                    return False
            elif op == "like":
                if actual is None:
                    return False
                import re
                regex = "^" + re.escape(str(value)).replace("%", ".*").replace("_", ".") + "$"
                if not re.match(regex, str(actual)):
                    return False
            elif op == "in":
                if not any(_values_equal(actual, v) for v in value):
                    return False
        return True

    def _project(self, row: dict) -> dict:
        if not self._select_cols:
            return dict(row)
        return {k: row.get(k) for k in self._select_cols}

    def _do_select(self, rows: list[dict]) -> FakeResponse:
        matches = [self._project(r) for r in rows if self._match(r)]
        if self._order:
            col, desc = self._order
            matches.sort(key=lambda r: (r.get(col) is None, r.get(col)), reverse=desc)
        if self._limit is not None:
            matches = matches[: self._limit]
        count = len(matches) if self._count_exact else None
        return FakeResponse(data=matches, count=count)

    def _do_insert(self, rows: list[dict]) -> FakeResponse:
        if isinstance(self._payload, list):
            inserts = self._payload
        else:
            inserts = [self._payload]

        out: list[dict] = []
        for item in inserts:
            new_row = dict(item) if item else {}
            new_row.setdefault("id", _new_id())
            if "applied_at" not in new_row and "created_at" not in new_row:
                new_row.setdefault("created_at", _now_iso())
            if "updated_at" not in new_row and self._table == "applications":
                new_row.setdefault("updated_at", _now_iso())
            # ApplicationResponse requires applied_at and updated_at as
            # non-optional fields.  Some routers fetch-and-rebuild the row
            # from the store, so make sure these always exist on rows
            # stored for the `applications` table.
            if self._table == "applications":
                new_row.setdefault("applied_at", new_row.get("created_at", _now_iso()))
                new_row.setdefault("updated_at", new_row.get("created_at", _now_iso()))
            # Schema-required fields the router never sets explicitly.
            if self._table == "goals":
                new_row.setdefault("progress", 0)
                new_row.setdefault("status", "active")
                new_row.setdefault("source", "manual")
            elif self._table == "todos":
                new_row.setdefault("done", False)
            elif self._table == "activity_log":
                new_row.setdefault("action", "unknown")
            rows.append(new_row)
            out.append(copy.deepcopy(new_row))
        return FakeResponse(data=out)

    def _do_update(self, rows: list[dict]) -> FakeResponse:
        updated: list[dict] = []
        for r in rows:
            if self._match(r):
                r.update(self._payload or {})
                updated.append(copy.deepcopy(r))
        return FakeResponse(data=updated)

    def _do_delete(self, rows: list[dict]) -> FakeResponse:
        keep: list[dict] = []
        deleted: list[dict] = []
        for r in rows:
            if self._match(r):
                deleted.append(copy.deepcopy(r))
            else:
                keep.append(r)
        self._store._replace(self._table, keep)
        return FakeResponse(data=deleted)


# ---------------------------------------------------------------------------
# Fake client
# ---------------------------------------------------------------------------

class FakeSupabaseClient:
    """In-memory Supabase replacement for tests."""

    KNOWN_TABLES = (
        "applications",
        "todos",
        "goals",
        "activity_log",
        "cv_chunks",
    )

    def __init__(self) -> None:
        self._store: dict[str, list[dict]] = {
            t: [] for t in self.KNOWN_TABLES
        }
        # Allow tests to attach arbitrary other tables on demand.
        self._auto_create = True

    # ── Routing ─────────────────────────────────────────────────────────
    def table(self, name: str) -> FakeTableQuery:
        if name not in self._store and self._auto_create:
            self._store[name] = []
        return FakeTableQuery(self, name)

    # ── Internal access for fixtures / assertions ───────────────────────
    def _rows(self, name: str) -> list[dict]:
        if name not in self._store:
            self._store[name] = []
        return self._store[name]

    def _replace(self, name: str, rows: list[dict]) -> None:
        self._store[name] = rows

    def reset(self) -> None:
        """Wipe all tables back to empty lists."""
        for k in list(self._store.keys()):
            self._store[k] = []

    # ── Direct row helpers (used by test fixtures) ─────────────────────
    def insert_row(self, table: str, row: dict) -> dict:
        rows = self._rows(table)
        new_row = dict(row)
        new_row.setdefault("id", _new_id())
        new_row.setdefault("created_at", _now_iso())
        if table == "applications":
            new_row.setdefault("applied_at", _now_iso())
            new_row.setdefault("updated_at", _now_iso())
        rows.append(new_row)
        return copy.deepcopy(new_row)

    def all(self, table: str) -> list[dict]:
        return [copy.deepcopy(r) for r in self._rows(table)]


# ---------------------------------------------------------------------------
# Dependency override helper
# ---------------------------------------------------------------------------

def override_supabase_dependency(app, fake_client: FakeSupabaseClient) -> None:
    """
    Wire the FastAPI app so that `Depends(get_supabase_client)` returns our fake
    during tests.  We replace the dependency-injection function itself; routers
    that call `get_supabase_client()` directly also pick up the override because
    we monkey-patch the global reference below.
    """
    from backend.db.supabase_client import get_supabase_client

    def _override():
        return fake_client

    app.dependency_overrides[get_supabase_client] = _override
