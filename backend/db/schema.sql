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

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- =====================================================
-- CVS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cvs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created ON applications(created_at DESC);

-- =====================================================
-- GOALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    status TEXT NOT NULL DEFAULT 'active',  -- active | completed | archived
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
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,            -- user | assistant
    content TEXT NOT NULL,
    query_type TEXT,               -- general | readiness | gap | roadmap | cover_letter
    sources JSONB DEFAULT '[]',    -- CV chunk IDs used as context
    model_used TEXT,               -- gemini | openai
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
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_event ON activity_log(event);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- =====================================================
-- AUDIT_LOG TABLE (immutable - no UPDATE/DELETE allowed)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action TEXT NOT NULL,
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
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Users table: users can only see their own row
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (clerk_id = current_setting('app.current_user_id', true));
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (clerk_id = current_setting('app.current_user_id', true));

-- CVS table: users can only access their own CVs
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own CVs" ON cvs FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert own CVs" ON cvs FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can update own CVs" ON cvs FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can delete own CVs" ON cvs FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));

-- CV chunks: same as CVS
ALTER TABLE cv_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own CV chunks" ON cv_chunks FOR ALL USING (
    cv_id IN (SELECT id FROM cvs WHERE user_id::text = current_setting('app.current_user_id', true))
);

-- Applications: users can only access their own
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own applications" ON applications FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert own applications" ON applications FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can update own applications" ON applications FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can delete own applications" ON applications FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));

-- Goals: users can only access their own
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert own goals" ON goals FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));

-- Todos: users can only access their own
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own todos" ON todos FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert own todos" ON todos FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can update own todos" ON todos FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can delete own todos" ON todos FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));

-- Chat messages: users can only access their own
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own chat messages" ON chat_messages FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert own chat messages" ON chat_messages FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

-- Activity log: users can only see their own
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own activity" ON activity_log FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
CREATE POLICY "Users can insert own activity" ON activity_log FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

-- Audit log: admin only (no RLS policy for now - can add later)
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