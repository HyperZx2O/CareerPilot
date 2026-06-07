-- Bootstrap migration — must be run once via Supabase SQL Editor.
-- Creates the migration tracking table and the exec_sql RPC function.
-- After this runs, backend/db/migrate.py can auto-apply future migrations.

BEGIN;

-- Track which migrations have been applied
CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    filename TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RPC to execute arbitrary SQL (used by migrate.py)
CREATE OR REPLACE FUNCTION exec_sql(sql_text TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql_text;
END;
$$;

COMMIT;
