-- Migration: Add missing columns + fix user_id constraint for demo users
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Step 1: Add description column (for AI-generated goal descriptions)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Step 2: Add target_role column (for the target job role the goal maps to)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT '';

-- Step 3: Add priority column (high/medium/low)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- Step 4: Add source column (ai/custom - to distinguish AI-generated vs user-created goals)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'custom';

-- Step 5: Add progress column (0-100, auto-calculated from todo completion)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- Step 6: Change user_id column type to TEXT so plain strings like "demo_user_123" work
ALTER TABLE goals ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE todos ALTER COLUMN user_id TYPE TEXT;

-- Step 7: Rename activity_log.event → action (Python code uses "action" everywhere)
ALTER TABLE activity_log RENAME COLUMN event TO action;

-- Step 8: Drop the user_id FK on activity_log too and change to TEXT
DO $$
BEGIN
    ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint already dropped or does not exist: %', SQLERRM;
END $$;
ALTER TABLE activity_log ALTER COLUMN user_id TYPE TEXT;

-- Step 9: Verify goals schema
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'goals'
ORDER BY ordinal_position;

-- Step 10: Verify todos schema
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'todos'
ORDER BY ordinal_position;

-- Step 11: Verify activity_log schema
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_log'
ORDER BY ordinal_position;