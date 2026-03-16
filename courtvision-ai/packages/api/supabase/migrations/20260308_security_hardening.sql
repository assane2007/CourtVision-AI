-- Security Hardening for CourtVision-AI
-- Purpose: Enable RLS and lock down user data

-- 1. Enable RLS on all public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shooting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- 2. Profiles (users) Policies
-- Users can read any profile (for leaderboard/community) but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE WITH CHECK (auth.uid() = id);

-- 3. Shooting Sessions Policies
-- Only owners can see and manage their sessions
CREATE POLICY "Users can manage own sessions" ON public.shooting_sessions
    FOR ALL USING (auth.uid() = user_id);

-- 4. Session Shots Policies
-- Only owners can see and manage their shots
CREATE POLICY "Users can manage own shots" ON public.session_shots
    FOR ALL USING (auth.uid() = user_id);

-- 5. Analyses Policies
-- Only owners can see their analyses
CREATE POLICY "Users can view own analyses" ON public.analyses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.shooting_sessions
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

-- 6. Shot DNA Policies
CREATE POLICY "Users can manage own shot dna" ON public.shot_dna
    FOR ALL USING (auth.uid() = user_id);

-- 7. Activity Feed Policies
-- Users see their own activity, and maybe public ones
CREATE POLICY "Users can view own activity" ON public.activity_feed
    FOR SELECT USING (auth.uid() = user_id);

-- 8. Missing Index on user_id for analytics performance
CREATE INDEX IF NOT EXISTS idx_shooting_sessions_user_id ON public.shooting_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_shots_user_id ON public.session_shots(user_id);
CREATE INDEX IF NOT EXISTS idx_shot_dna_user_id ON public.shot_dna(user_id);
