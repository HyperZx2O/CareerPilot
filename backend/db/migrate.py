import os
from pathlib import Path
from backend.db.supabase_client import get_supabase_client
from backend.logger import get_logger

logger = get_logger("migrate")

MIGRATIONS_DIR = Path(__file__).resolve().parent / ".." / "migrations"


def run_pending_migrations():
    if not MIGRATIONS_DIR.exists():
        return

    try:
        supabase = get_supabase_client()
    except RuntimeError:
        logger.info("Supabase not configured, skipping migrations")
        return

    # Check if bootstrap has been applied (exec_sql RPC exists)
    bootstrap_applied = False
    try:
        resp = supabase.table("_migrations").select("filename").limit(1).execute()
        bootstrap_applied = True
    except Exception:
        logger.info("_migrations table does not exist; bootstrap must be applied manually")

    if not bootstrap_applied:
        logger.warning(
            "Run backend/migrations/000_bootstrap.sql in Supabase SQL Editor first. "
            "After that, auto-migration will work."
        )
        return

    # Read already-applied migrations from the tracking table
    try:
        resp = supabase.table("_migrations").select("filename").execute()
        applied = {r["filename"] for r in (resp.data or [])}
    except Exception as e:
        logger.warning("Could not read _migrations table: %s", e)
        return

    for sql_file in sorted(MIGRATIONS_DIR.glob("*.sql")):
        if sql_file.name in applied:
            continue
        sql = sql_file.read_text().strip()
        if not sql:
            continue

        try:
            supabase.rpc("exec_sql", {"sql_text": sql}).execute()
            supabase.table("_migrations").insert({"filename": sql_file.name}).execute()
            logger.info("Applied migration: %s", sql_file.name)
        except Exception as e:
            logger.warning("Failed to apply migration %s: %s", sql_file.name, e)
