-- CareerPilot Database Schema
-- Run this in Supabase SQL Editor to create all required tables
-- Migrations are additive only (no DROP, no column renames during hackathon)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE (synced from Clerk webhook)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: To support dev-mode user IDs (non-UUID strings like "demo_user_123"),
-- change user_id columns to TEXT in dependent tables. See backend/migrations/fix_schema_v2.sql

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- =====================================================
-- CVS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cvs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    filename TEXT,
    original_content TEXT,          -- Full extracted text from PDF
    processing_status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
    sections JSONB DEFAULT '{}',   -- Parsed sections: {summary, experience, education, skills}
    metadata JSONB DEFAULT '{}',    -- file_size, page_count, uploaded_at
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_status ON cvs(processing_status);

-- =====================================================
-- CV_CHUNKS TABLE (stored in Supabase for backup/sync)
-- =====================================================
CREATE TABLE IF NOT EXISTS cv_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cv_id UUID NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    section_type TEXT,             -- summary, experience, education, skills, other
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_chunks_cv_id ON cv_chunks(cv_id);
CREATE INDEX IF NOT EXISTS idx_cv_chunks_section ON cv_chunks(section_type);

-- =====================================================
-- APPLICATIONS TABLE (job tracker)
-- =====================================================
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    job_id TEXT,                   -- External job ID from JSearch
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    currency TEXT,
    job_url TEXT,
    status TEXT NOT NULL DEFAULT 'applied',  -- applied | interview | offer | rejected | withdrawn
    applied_at TIMESTAMPTZ,
    deadline TIMESTAMPTZ,
    notes TEXT,
    source TEXT,                   -- jsearch, manual, linkedin, etc.
    fit_score INTEGER,             -- 0-100 AI fit score
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created ON applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_fit_score ON applications(fit_score);

-- =====================================================
-- GOALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    target_role TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    source TEXT DEFAULT 'custom',
    progress INTEGER DEFAULT 0,
    target_date DATE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- =====================================================
-- TODOS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    due_date TIMESTAMPTZ,
    priority INTEGER DEFAULT 0,    -- 0=none, 1=low, 2=medium, 3=high
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_goal_id ON todos(goal_id);
CREATE INDEX IF NOT EXISTS idx_todos_done ON todos(done);

-- =====================================================
-- CHAT_MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,            -- user | assistant
    content TEXT NOT NULL,
    query_type TEXT,               -- general | readiness | gap | roadmap | cover_letter
    sources JSONB DEFAULT '[]',    -- CV chunk IDs used as context
    model_used TEXT,               -- historical providers (openai/gemini) removed from runtime
    tokens_used INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- =====================================================
-- ACTIVITY_LOG TABLE (analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- =====================================================
-- AUDIT_LOG TABLE (immutable - no UPDATE/DELETE allowed)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    event TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: In production, create a rule to prevent UPDATE/DELETE:
-- CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
-- CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
--
-- NOTE: The backend currently uses SUPABASE_SERVICE_KEY (service_role),
-- which BYPASSES all RLS policies. These policies are documented here
-- as the intended access model for future anon-key usage.
--
-- TO ACTIVATE: Switch the backend to use SUPABASE_ANON_KEY and set
-- the session parameter before each request:
--   SELECT set_config('app.current_user_id', '<clerk_id>', true);
--
-- IMPORTANT: The policies below reference current_setting('app.current_user_id', true).
-- If this parameter is NOT set before queries, RLS will block ALL access
-- (the expression evaluates to NULL, which fails all policy checks).

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (clerk_id = current_setting('app.current_user_id', true));
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (clerk_id = current_setting('app.current_user_id', true));

ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own CVs" ON cvs FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert own CVs" ON cvs FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can update own CVs" ON cvs FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can delete own CVs" ON cvs FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));

ALTER TABLE cv_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own CV chunks" ON cv_chunks FOR ALL USING (
    cv_id IN (SELECT id FROM cvs WHERE user_id::text = current_setting('app.current_user_id', true))
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own applications" ON applications FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert own applications" ON applications FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can update own applications" ON applications FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can delete own applications" ON applications FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert own goals" ON goals FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own todos" ON todos FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert own todos" ON todos FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can update own todos" ON todos FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can delete own todos" ON todos FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own chat messages" ON chat_messages FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert own chat messages" ON chat_messages FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own activity" ON activity_log FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert own activity" ON activity_log FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage audit log" ON audit_log FOR ALL USING (true);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cvs_updated_at ON cvs;
CREATE TRIGGER update_cvs_updated_at BEFORE UPDATE ON cvs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();