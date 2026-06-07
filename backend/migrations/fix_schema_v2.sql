-- Migration: fix_schema_v2.sql
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard > SQL Editor)
-- Fixes remaining schema issues after add_goals_columns.sql

BEGIN;

-- ================================================================
-- 1. APPLICATIONS: add fit_score, change user_id to TEXT
-- ================================================================

ALTER TABLE applications ADD COLUMN IF NOT EXISTS fit_score INTEGER;

-- Drop FK constraint if exists (allows non-UUID user_id values)
DO $$
BEGIN
    ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_user_id_fkey;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'applications_user_id_fkey already dropped or does not exist';
END $$;

ALTER TABLE applications ALTER COLUMN user_id TYPE TEXT;

-- ================================================================
-- 2. ACTIVITY_LOG: rename event -> action, change user_id to TEXT
-- ================================================================

ALTER TABLE activity_log RENAME COLUMN event TO action;

DO $$
BEGIN
    ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'activity_log_user_id_fkey already dropped or does not exist';
END $$;

ALTER TABLE activity_log ALTER COLUMN user_id TYPE TEXT;

-- ================================================================
-- 3. CVS: change user_id to TEXT
-- ================================================================

DO $$
BEGIN
    ALTER TABLE cvs DROP CONSTRAINT IF EXISTS cvs_user_id_fkey;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'cvs_user_id_fkey already dropped or does not exist';
END $$;

ALTER TABLE cvs ALTER COLUMN user_id TYPE TEXT;

-- ================================================================
-- 4. CHAT_MESSAGES: change user_id to TEXT
-- ================================================================

DO $$
BEGIN
    ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'chat_messages_user_id_fkey already dropped or does not exist';
END $$;

ALTER TABLE chat_messages ALTER COLUMN user_id TYPE TEXT;

-- ================================================================
-- 5. GOALS: ensure priority has TEXT type (not INTEGER)
-- ================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'priority' AND data_type = 'integer'
    ) THEN
        ALTER TABLE goals ALTER COLUMN priority TYPE TEXT;
    END IF;
END $$;

-- ================================================================
-- Verification queries (run separately if desired)
-- ================================================================

-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('applications','activity_log','cvs','chat_messages')
-- ORDER BY table_name, ordinal_position;

COMMIT;
