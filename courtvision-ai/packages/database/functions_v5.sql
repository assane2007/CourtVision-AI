-- ==========================================
-- CourtVision AI — V5 Apex RPC Functions
-- Fonctions Postgres appelées depuis l'API via supabase.rpc()
-- ==========================================

-- ==========================================
-- increment_season_xp — Ajoute du XP saisonnier
-- ==========================================

CREATE OR REPLACE FUNCTION public.increment_season_xp(
    p_user_id UUID,
    p_season_id UUID,
    p_xp INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_xp INTEGER;
    new_level INTEGER;
    new_tier TEXT;
BEGIN
    -- Upsert season progress
    INSERT INTO public.season_progress (user_id, season_id, season_xp, season_level, tier)
    VALUES (p_user_id, p_season_id, p_xp, 1, 'bronze')
    ON CONFLICT (user_id, season_id)
    DO UPDATE SET season_xp = season_progress.season_xp + p_xp;

    -- Get updated XP
    SELECT season_xp INTO new_xp
    FROM public.season_progress
    WHERE user_id = p_user_id AND season_id = p_season_id;

    -- Compute level (1000 XP per level)
    new_level := GREATEST(1, new_xp / 1000 + 1);

    -- Compute tier
    new_tier := CASE
        WHEN new_level >= 50 THEN 'elite'
        WHEN new_level >= 30 THEN 'diamond'
        WHEN new_level >= 20 THEN 'gold'
        WHEN new_level >= 10 THEN 'silver'
        ELSE 'bronze'
    END;

    -- Update level and tier
    UPDATE public.season_progress
    SET season_level = new_level, tier = new_tier
    WHERE user_id = p_user_id AND season_id = p_season_id;
END;
$$;

-- ==========================================
-- update_profile_stats — Met à jour les stats du profil public
-- ==========================================

CREATE OR REPLACE FUNCTION public.update_profile_stats(
    p_user_id UUID,
    p_shots INTEGER,
    p_made INTEGER,
    p_mental FLOAT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_total_shots INTEGER;
    current_total_sessions INTEGER;
    current_avg_shooting FLOAT;
    current_avg_mental FLOAT;
BEGIN
    -- Get current stats
    SELECT
        COALESCE(total_shots, 0),
        COALESCE(total_sessions, 0),
        COALESCE(avg_shooting_pct, 0),
        COALESCE(avg_mental_score, 0)
    INTO current_total_shots, current_total_sessions, current_avg_shooting, current_avg_mental
    FROM public.public_profiles
    WHERE user_id = p_user_id;

    -- Compute rolling averages
    UPDATE public.public_profiles
    SET
        total_shots = current_total_shots + p_shots,
        total_sessions = current_total_sessions + 1,
        avg_shooting_pct = CASE
            WHEN p_shots > 0 THEN
                ROUND(((current_avg_shooting * current_total_sessions + (p_made::FLOAT / p_shots * 100))
                    / (current_total_sessions + 1))::numeric, 1)
            ELSE current_avg_shooting
        END,
        avg_mental_score = ROUND(((current_avg_mental * current_total_sessions + p_mental)
            / (current_total_sessions + 1))::numeric, 1),
        best_shooting_pct = GREATEST(
            COALESCE(best_shooting_pct, 0),
            CASE WHEN p_shots > 0 THEN ROUND((p_made::FLOAT / p_shots * 100)::numeric, 1) ELSE 0 END
        ),
        best_mental_score = GREATEST(COALESCE(best_mental_score, 0), p_mental),
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$;

-- ==========================================
-- increment_crew_sessions — Incrémente les sessions d'un crew
-- ==========================================

CREATE OR REPLACE FUNCTION public.increment_crew_sessions(
    p_crew_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.crews
    SET
        total_sessions = total_sessions + 1,
        -- Recalculate avg rating from all members
        avg_rating = (
            SELECT COALESCE(AVG(pp.avg_shooting_pct), 0)
            FROM public.crew_members cm
            JOIN public.public_profiles pp ON pp.user_id = cm.user_id
            WHERE cm.crew_id = p_crew_id
        )
    WHERE id = p_crew_id;
END;
$$;

-- ==========================================
-- get_leaderboard — Classement global ou par crew
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_leaderboard(
    p_metric TEXT DEFAULT 'xp',
    p_scope TEXT DEFAULT 'global',
    p_crew_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    position TEXT,
    score FLOAT,
    level INTEGER,
    xp INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY
            CASE p_metric
                WHEN 'xp' THEN pp.xp::FLOAT
                WHEN 'shooting' THEN pp.avg_shooting_pct
                WHEN 'mental' THEN pp.avg_mental_score
                WHEN 'sessions' THEN pp.total_sessions::FLOAT
                WHEN 'shots' THEN pp.total_shots::FLOAT
                ELSE pp.xp::FLOAT
            END DESC
        ) as rank,
        u.id as user_id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.position,
        CASE p_metric
            WHEN 'xp' THEN pp.xp::FLOAT
            WHEN 'shooting' THEN pp.avg_shooting_pct
            WHEN 'mental' THEN pp.avg_mental_score
            WHEN 'sessions' THEN pp.total_sessions::FLOAT
            WHEN 'shots' THEN pp.total_shots::FLOAT
            ELSE pp.xp::FLOAT
        END as score,
        pp.level,
        pp.xp
    FROM public.users u
    JOIN public.public_profiles pp ON pp.user_id = u.id
    WHERE
        pp.is_public = true
        AND (
            p_scope = 'global'
            OR (
                p_scope = 'crew'
                AND p_crew_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM public.crew_members cm
                    WHERE cm.user_id = u.id AND cm.crew_id = p_crew_id
                )
            )
        )
    ORDER BY score DESC
    LIMIT p_limit;
END;
$$;

-- ==========================================
-- get_user_quest_progress — Progress for all active quests
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_user_quest_progress(
    p_user_id UUID
)
RETURNS TABLE (
    quest_id UUID,
    slug TEXT,
    title TEXT,
    emoji TEXT,
    quest_type TEXT,
    category TEXT,
    xp_reward INTEGER,
    difficulty INTEGER,
    current_value FLOAT,
    target_value FLOAT,
    progress_pct FLOAT,
    status TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.id as quest_id,
        q.slug,
        q.title,
        q.emoji,
        q.quest_type,
        q.category,
        q.xp_reward,
        q.difficulty,
        COALESCE(uq.current_value, 0) as current_value,
        q.condition_value as target_value,
        COALESCE(uq.progress_pct, 0) as progress_pct,
        COALESCE(uq.status, 'available') as status
    FROM public.quests q
    LEFT JOIN public.user_quests uq ON uq.quest_id = q.id AND uq.user_id = p_user_id
    WHERE q.active = true
    ORDER BY q.quest_type, q.sort_order;
END;
$$;

-- ==========================================
-- compute_apex_score — Server-side Apex Score computation
-- ==========================================

CREATE OR REPLACE FUNCTION public.compute_apex_score(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSONB;
    v_shooting FLOAT;
    v_mental FLOAT;
    v_consistency FLOAT;
    v_clutch FLOAT;
    v_overall FLOAT;
    v_grade TEXT;
BEGIN
    -- Shooting component
    SELECT COALESCE(
        LEAST(100, avg_shooting_pct * 1.5 + COALESCE(sd.dna_purity_score, 0) * 0.3),
        40
    )
    INTO v_shooting
    FROM public.public_profiles pp
    LEFT JOIN public.shot_dna sd ON sd.user_id = pp.user_id
    WHERE pp.user_id = p_user_id;

    -- Mental component
    SELECT COALESCE(LEAST(100, avg_mental_score), 50)
    INTO v_mental
    FROM public.public_profiles
    WHERE user_id = p_user_id;

    -- Clutch component
    SELECT COALESCE(AVG(clutch_rating), 50)
    INTO v_clutch
    FROM public.advanced_analytics
    WHERE user_id = p_user_id
    ORDER BY computed_at DESC
    LIMIT 10;

    -- Consistency (simplified: based on session count)
    SELECT LEAST(100, COALESCE(total_sessions, 0) * 2)
    INTO v_consistency
    FROM public.public_profiles
    WHERE user_id = p_user_id;

    -- Overall
    v_overall := v_shooting * 0.4 + v_mental * 0.2 + v_consistency * 0.2 + v_clutch * 0.2;

    -- Grade
    v_grade := CASE
        WHEN v_overall >= 95 THEN 'S'
        WHEN v_overall >= 88 THEN 'A+'
        WHEN v_overall >= 80 THEN 'A'
        WHEN v_overall >= 72 THEN 'B+'
        WHEN v_overall >= 64 THEN 'B'
        WHEN v_overall >= 55 THEN 'C+'
        WHEN v_overall >= 45 THEN 'C'
        WHEN v_overall >= 35 THEN 'D'
        ELSE 'F'
    END;

    result := jsonb_build_object(
        'overall', ROUND(v_overall::numeric, 1),
        'shooting', ROUND(COALESCE(v_shooting, 0)::numeric, 1),
        'mental', ROUND(COALESCE(v_mental, 0)::numeric, 1),
        'consistency', ROUND(COALESCE(v_consistency, 0)::numeric, 1),
        'clutch', ROUND(COALESCE(v_clutch, 0)::numeric, 1),
        'grade', v_grade
    );

    RETURN result;
END;
$$;

-- ==========================================
-- Daily quest auto-assignment
-- Assigns daily quests to all active users each day
-- ==========================================

CREATE OR REPLACE FUNCTION public.assign_daily_quests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    assigned_count INTEGER := 0;
    v_quest RECORD;
    v_user RECORD;
BEGIN
    FOR v_quest IN
        SELECT id, condition_value FROM public.quests
        WHERE quest_type = 'daily' AND active = true
    LOOP
        FOR v_user IN
            SELECT id FROM public.users
            WHERE NOT EXISTS (
                SELECT 1 FROM public.user_quests uq
                WHERE uq.user_id = users.id
                AND uq.quest_id = v_quest.id
                AND uq.started_at >= CURRENT_DATE
            )
        LOOP
            INSERT INTO public.user_quests (user_id, quest_id, target_value, status)
            VALUES (v_user.id, v_quest.id, v_quest.condition_value, 'active')
            ON CONFLICT (user_id, quest_id) DO NOTHING;
            assigned_count := assigned_count + 1;
        END LOOP;
    END LOOP;

    RETURN assigned_count;
END;
$$;
