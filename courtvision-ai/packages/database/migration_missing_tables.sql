-- ==========================================
-- CourtVision AI — Missing Tables Migration
-- Tables referenced by API routes but absent from schema files
-- Run AFTER schema.sql, schema_v5.sql, and sessions_schema.sql
-- ==========================================

-- ==========================================
-- 1. SHOT DNA PROFILES (JSONB-based, used by shotDna.ts & training.ts)
-- Routes query "shot_dna_profiles" with a JSONB "profile" column
-- (different from schema_v5's shot_dna which uses flat columns)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.shot_dna_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    profile JSONB NOT NULL DEFAULT '{}',
    drift_alerts JSONB DEFAULT '[]',
    sessions_analyzed INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_shot_dna_profiles_user ON public.shot_dna_profiles(user_id);

ALTER TABLE public.shot_dna_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shot_dna_profiles_own" ON public.shot_dna_profiles
    FOR ALL USING (user_id = auth.uid());

-- ==========================================
-- 2. SHOT DNA HISTORY (used by shotDna.ts /analyze endpoint)
-- Stores per-session snapshots for evolution tracking
-- ==========================================

CREATE TABLE IF NOT EXISTS public.shot_dna_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    snapshot JSONB NOT NULL DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shot_dna_history_user ON public.shot_dna_history(user_id);
CREATE INDEX IF NOT EXISTS idx_shot_dna_history_session ON public.shot_dna_history(session_id);
CREATE INDEX IF NOT EXISTS idx_shot_dna_history_recorded ON public.shot_dna_history(user_id, recorded_at DESC);

ALTER TABLE public.shot_dna_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shot_dna_history_own" ON public.shot_dna_history
    FOR ALL USING (user_id = auth.uid());

-- ==========================================
-- 3. DAILY RINGS (used by quests.ts /daily-rings endpoints)
-- Apple Watch-style daily goals: Shoot / Train / Recover
-- ==========================================

CREATE TABLE IF NOT EXISTS public.daily_rings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    shots_attempted INTEGER DEFAULT 0,
    minutes_trained INTEGER DEFAULT 0,
    recovery_logged BOOLEAN DEFAULT false,
    session_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_rings_user_date ON public.daily_rings(user_id, date DESC);

ALTER TABLE public.daily_rings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_rings_own" ON public.daily_rings
    FOR ALL USING (user_id = auth.uid());

-- ==========================================
-- 4. TRAINING DAY COMPLETIONS (used by training.ts /complete-day)
-- Individual day completions within a training plan
-- ==========================================

CREATE TABLE IF NOT EXISTS public.training_day_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,  -- references training_plans(id) if it exists
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    day_number INTEGER NOT NULL,
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    notes TEXT,
    completed_drills JSONB DEFAULT '[]',
    energy_post INTEGER CHECK (energy_post BETWEEN 1 AND 10),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_day_completions_plan ON public.training_day_completions(plan_id);
CREATE INDEX IF NOT EXISTS idx_training_day_completions_user ON public.training_day_completions(user_id);

ALTER TABLE public.training_day_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_day_completions_own" ON public.training_day_completions
    FOR ALL USING (user_id = auth.uid());

-- ==========================================
-- 5. CREW INVITES (used by crews.ts /invite endpoint)
-- Pending invitations to join a crew
-- ==========================================

CREATE TABLE IF NOT EXISTS public.crew_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID REFERENCES public.crews(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    invited_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    UNIQUE(crew_id, invited_user_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_invites_invited ON public.crew_invites(invited_user_id, status);
CREATE INDEX IF NOT EXISTS idx_crew_invites_crew ON public.crew_invites(crew_id);

ALTER TABLE public.crew_invites ENABLE ROW LEVEL SECURITY;

-- Users can see invites they sent or received
CREATE POLICY "crew_invites_sent" ON public.crew_invites
    FOR ALL USING (invited_by = auth.uid());

CREATE POLICY "crew_invites_received" ON public.crew_invites
    FOR SELECT USING (invited_user_id = auth.uid());

CREATE POLICY "crew_invites_respond" ON public.crew_invites
    FOR UPDATE USING (invited_user_id = auth.uid());

-- ==========================================
-- 6. INJURY REPORTS (used by recovery.ts /injury-report & /injuries)
-- Tracks injury history for recovery management
-- ==========================================

CREATE TABLE IF NOT EXISTS public.injury_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    body_part TEXT NOT NULL,
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 10),
    type TEXT CHECK (type IN ('muscle', 'joint', 'bone', 'ligament', 'tendon', 'other')),
    description TEXT,
    occurred_during TEXT,  -- 'training', 'game', 'practice', 'other'
    status TEXT DEFAULT 'monitoring' CHECK (status IN ('active', 'monitoring', 'recovering', 'resolved')),
    recovery_days INTEGER,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_injury_reports_user ON public.injury_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_injury_reports_status ON public.injury_reports(user_id, status);

ALTER TABLE public.injury_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "injury_reports_own" ON public.injury_reports
    FOR ALL USING (user_id = auth.uid());

-- ==========================================
-- 7. INCREMENT_XP — RPC function (called by quests.ts & training.ts)
-- Atomically increments XP in public_profiles and auto-levels up
-- ==========================================

CREATE OR REPLACE FUNCTION public.increment_xp(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_xp INTEGER;
    new_level INTEGER;
BEGIN
    -- Ensure profile exists (upsert)
    INSERT INTO public.public_profiles (user_id, xp, level)
    VALUES (p_user_id, 0, 1)
    ON CONFLICT (user_id) DO NOTHING;

    -- Atomically increment XP
    UPDATE public.public_profiles
    SET xp = COALESCE(xp, 0) + p_amount
    WHERE user_id = p_user_id
    RETURNING xp INTO new_xp;

    -- Auto-compute level (100 XP per level, logarithmic scaling)
    -- Level 1: 0-99 XP, Level 2: 100-249, Level 3: 250-449, ...
    -- Simplified: sqrt(xp / 50) + 1, capped at 100
    new_level := GREATEST(1, LEAST(100, FLOOR(SQRT(new_xp::FLOAT / 50)) + 1));

    UPDATE public.public_profiles
    SET level = new_level,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$;

-- ==========================================
-- 8. TRAINING PLANS — Additional columns used by routes
-- Routes use: is_active, plan_data, plan_type, goals, adapted_at, adaptation_reason
-- This adds missing columns if the table from schema_v5 exists
-- ==========================================

DO $$
BEGIN
    -- Add columns that routes expect but schema_v5 doesn't define
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_plans' AND table_schema = 'public') THEN
        -- Add is_active if only 'active' exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'is_active') THEN
            ALTER TABLE public.training_plans ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
        -- Add plan_data JSONB if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'plan_data') THEN
            ALTER TABLE public.training_plans ADD COLUMN plan_data JSONB DEFAULT '{}';
        END IF;
        -- Add goals if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'goals') THEN
            ALTER TABLE public.training_plans ADD COLUMN goals TEXT[];
        END IF;
        -- Add adapted_at if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'adapted_at') THEN
            ALTER TABLE public.training_plans ADD COLUMN adapted_at TIMESTAMPTZ;
        END IF;
        -- Add adaptation_reason if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_plans' AND column_name = 'adaptation_reason') THEN
            ALTER TABLE public.training_plans ADD COLUMN adaptation_reason TEXT;
        END IF;
    END IF;
END $$;
