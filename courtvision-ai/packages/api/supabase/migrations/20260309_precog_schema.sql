-- Precog Training Schema
-- Skill: ai-agents-architect → Un-mocking Precog

-- 1. Clips for cognitive training
CREATE TABLE IF NOT EXISTS precog_clips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    difficulty INTEGER DEFAULT 1,
    correct_answer TEXT NOT NULL,
    url TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Training Sessions
CREATE TABLE IF NOT EXISTS precog_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_seconds INTEGER NOT NULL,
    avg_response_ms INTEGER NOT NULL,
    accuracy_percentage FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Individual Responses (for deep analytics)
CREATE TABLE IF NOT EXISTS precog_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES precog_sessions(id) ON DELETE CASCADE,
    clip_id UUID REFERENCES precog_clips(id) ON DELETE NO ACTION,
    choice TEXT NOT NULL,
    correct BOOLEAN NOT NULL,
    response_time_ms INTEGER NOT NULL,
    speed_multiplier FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE precog_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE precog_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE precog_responses ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Public clips are viewable by everyone" ON precog_clips FOR SELECT USING (true);
CREATE POLICY "Users can view their own sessions" ON precog_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sessions" ON precog_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own responses" ON precog_responses FOR SELECT USING (
    EXISTS (SELECT 1 FROM precog_sessions WHERE id = precog_responses.session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert their own responses" ON precog_responses FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM precog_sessions WHERE id = precog_responses.session_id AND user_id = auth.uid())
);

-- 6. Indices for Performance
CREATE INDEX idx_precog_sessions_user_id ON precog_sessions(user_id);
CREATE INDEX idx_precog_responses_session_id ON precog_responses(session_id);

-- 7. Add progression fields to profiles (if profile table exists)
-- Assuming a 'profiles' table exists as per standard Supabase patterns
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles') THEN
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS precog_current_speed INTEGER DEFAULT 100;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS precog_baseline_speed INTEGER DEFAULT 100;
    END IF;
END $$;
