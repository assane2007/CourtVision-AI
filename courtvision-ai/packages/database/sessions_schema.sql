-- ==========================================
-- CourtVision AI — Session Storage Tables
-- Tables pour la persistance des sessions d'entraînement IA temps réel
-- ==========================================

-- ==========================================
-- 1. SHOOTING SESSIONS
-- Stocke les sessions d'entraînement avec statistiques agrégées
-- ==========================================

CREATE TABLE IF NOT EXISTS public.shooting_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_sec INTEGER NOT NULL DEFAULT 0,
    
    -- Shooting stats
    total_shots INTEGER NOT NULL DEFAULT 0,
    made_shots INTEGER NOT NULL DEFAULT 0,
    shooting_pct FLOAT NOT NULL DEFAULT 0,
    
    -- Biomechanics averages
    avg_elbow_angle FLOAT DEFAULT 0,
    avg_release_height FLOAT DEFAULT 0,
    avg_release_time FLOAT DEFAULT 0,
    avg_posture_quality FLOAT DEFAULT 0,
    
    -- Consistency & form
    mechanic_consistency FLOAT DEFAULT 0,
    follow_through_pct FLOAT DEFAULT 0,
    
    -- Pipeline performance
    total_frames INTEGER DEFAULT 0,
    avg_processing_ms FLOAT DEFAULT 0,
    
    -- Metadata
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,
    court_type TEXT CHECK (court_type IN ('indoor', 'outdoor', 'gym')),
    location TEXT,
    
    -- Timestamps
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_shooting_sessions_user_id ON public.shooting_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_shooting_sessions_created_at ON public.shooting_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shooting_sessions_user_date ON public.shooting_sessions(user_id, created_at DESC);

-- ==========================================
-- 2. SESSION SHOTS
-- Stocke chaque tir individuel d'une session
-- ==========================================

CREATE TABLE IF NOT EXISTS public.session_shots (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES public.shooting_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Outcome
    outcome TEXT CHECK (outcome IN ('made', 'missed', 'blocked')),
    
    -- Biomechanics
    elbow_angle FLOAT,
    release_height_ratio FLOAT,
    release_time FLOAT,
    posture_quality FLOAT,
    has_follow_through BOOLEAN DEFAULT false,
    
    -- Detection
    detection_confidence FLOAT DEFAULT 0,
    zone TEXT,
    
    -- Timing
    shot_timestamp FLOAT DEFAULT 0,
    
    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes
CREATE INDEX IF NOT EXISTS idx_session_shots_session_id ON public.session_shots(session_id);
CREATE INDEX IF NOT EXISTS idx_session_shots_user_id ON public.session_shots(user_id);
CREATE INDEX IF NOT EXISTS idx_session_shots_outcome ON public.session_shots(outcome);

-- ==========================================
-- 3. ROW LEVEL SECURITY
-- Chaque utilisateur ne voit que ses propres données
-- ==========================================

ALTER TABLE public.shooting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_shots ENABLE ROW LEVEL SECURITY;

-- Policies pour shooting_sessions
CREATE POLICY "Users can view own sessions"
    ON public.shooting_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON public.shooting_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON public.shooting_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON public.shooting_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Policies pour session_shots
CREATE POLICY "Users can view own shots"
    ON public.session_shots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shots"
    ON public.session_shots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shots"
    ON public.session_shots FOR DELETE
    USING (auth.uid() = user_id);

-- ==========================================
-- 4. FUNCTIONS
-- Fonctions utilitaires pour les stats et le leaderboard
-- ==========================================

-- Fonction pour obtenir les stats agrégées d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_shooting_stats(p_user_id UUID)
RETURNS TABLE (
    total_sessions BIGINT,
    total_shots BIGINT,
    total_made BIGINT,
    overall_fg_pct FLOAT,
    avg_posture_quality FLOAT,
    avg_mechanic_consistency FLOAT,
    best_session_score FLOAT,
    total_training_minutes BIGINT,
    current_streak INTEGER,
    longest_streak INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_sessions,
        COALESCE(SUM(ss.total_shots), 0)::BIGINT as total_shots,
        COALESCE(SUM(ss.made_shots), 0)::BIGINT as total_made,
        CASE
            WHEN SUM(ss.total_shots) > 0
            THEN ROUND((SUM(ss.made_shots)::FLOAT / SUM(ss.total_shots)::FLOAT) * 100, 1)
            ELSE 0
        END as overall_fg_pct,
        ROUND(AVG(ss.avg_posture_quality)::NUMERIC, 1)::FLOAT as avg_posture_quality,
        ROUND(AVG(ss.mechanic_consistency)::NUMERIC, 1)::FLOAT as avg_mechanic_consistency,
        ROUND(MAX(
            ss.avg_posture_quality * 0.35 +
            ss.mechanic_consistency * 0.25 +
            ss.shooting_pct * 0.25 +
            ss.follow_through_pct * 0.15
        )::NUMERIC, 1)::FLOAT as best_session_score,
        COALESCE(SUM(ss.duration_sec) / 60, 0)::BIGINT as total_training_minutes,
        0 as current_streak,  -- Calculé côté client
        0 as longest_streak   -- Calculé côté client
    FROM public.shooting_sessions ss
    WHERE ss.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les tendances d'un utilisateur (dernières N sessions)
CREATE OR REPLACE FUNCTION get_user_shooting_trends(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    session_id TEXT,
    created_at TIMESTAMPTZ,
    shooting_pct FLOAT,
    avg_posture_quality FLOAT,
    mechanic_consistency FLOAT,
    avg_release_time FLOAT,
    follow_through_pct FLOAT,
    overall_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ss.id as session_id,
        ss.created_at,
        ss.shooting_pct,
        ss.avg_posture_quality,
        ss.mechanic_consistency,
        ss.avg_release_time,
        ss.follow_through_pct,
        ROUND((
            ss.avg_posture_quality * 0.35 +
            ss.mechanic_consistency * 0.25 +
            ss.shooting_pct * 0.25 +
            ss.follow_through_pct * 0.15
        )::NUMERIC, 1)::FLOAT as overall_score
    FROM public.shooting_sessions ss
    WHERE ss.user_id = p_user_id
    ORDER BY ss.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour le leaderboard communautaire
CREATE OR REPLACE FUNCTION get_shooting_leaderboard(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    total_sessions BIGINT,
    overall_fg_pct FLOAT,
    avg_score FLOAT,
    total_shots BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id as user_id,
        u.username,
        u.avatar_url,
        COUNT(ss.id)::BIGINT as total_sessions,
        CASE
            WHEN SUM(ss.total_shots) > 0
            THEN ROUND((SUM(ss.made_shots)::FLOAT / SUM(ss.total_shots)::FLOAT) * 100, 1)
            ELSE 0
        END as overall_fg_pct,
        ROUND(AVG(
            ss.avg_posture_quality * 0.35 +
            ss.mechanic_consistency * 0.25 +
            ss.shooting_pct * 0.25 +
            ss.follow_through_pct * 0.15
        )::NUMERIC, 1)::FLOAT as avg_score,
        COALESCE(SUM(ss.total_shots), 0)::BIGINT as total_shots
    FROM public.users u
    JOIN public.shooting_sessions ss ON ss.user_id = u.id
    GROUP BY u.id, u.username, u.avatar_url
    HAVING COUNT(ss.id) >= 3  -- Au moins 3 sessions
    ORDER BY avg_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
