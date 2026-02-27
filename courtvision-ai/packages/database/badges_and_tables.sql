-- ==========================================
-- CourtVision AI — V5 Badges & Missing Tables
-- Tables supplémentaires pour la gamification
-- ==========================================

-- Badges (referenced by schema_v5.sql quests)
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    emoji TEXT NOT NULL,
    category TEXT CHECK (category IN ('shooting', 'mental', 'consistency', 'social', 'challenge', 'milestone')),
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    xp_reward INTEGER DEFAULT 10,
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User earned badges
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Activity feed
CREATE TABLE IF NOT EXISTS public.activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    metadata JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public profiles (extended from existing community)
CREATE TABLE IF NOT EXISTS public.public_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    position TEXT,
    bio TEXT DEFAULT '',
    location TEXT DEFAULT '',
    team TEXT DEFAULT '',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    total_sessions INTEGER DEFAULT 0,
    total_shots INTEGER DEFAULT 0,
    avg_shooting_pct FLOAT DEFAULT 0,
    avg_mental_score FLOAT DEFAULT 0,
    best_mental_score FLOAT DEFAULT 0,
    best_shooting_pct FLOAT DEFAULT 0,
    win_streak INTEGER DEFAULT 0,
    challenges_won INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON public.activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON public.activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_public_profiles_xp ON public.public_profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_public_profiles_level ON public.public_profiles(level DESC);

-- RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_read" ON public.badges FOR SELECT USING (true);
CREATE POLICY "user_badges_own" ON public.user_badges FOR ALL USING (user_id = auth.uid());
CREATE POLICY "activity_feed_read" ON public.activity_feed FOR SELECT USING (true);
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "public_profiles_read" ON public.public_profiles FOR SELECT USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "public_profiles_own" ON public.public_profiles FOR UPDATE USING (user_id = auth.uid());

-- ==========================================
-- SEED: Badges
-- ==========================================

INSERT INTO public.badges (slug, name, description, emoji, category, rarity, xp_reward) VALUES
    -- Milestone badges
    ('first_session', 'Premier Pas', 'Complète ta première session', '👟', 'milestone', 'common', 10),
    ('session_10', 'Régulier', 'Complète 10 sessions', '🏃', 'milestone', 'common', 25),
    ('session_50', 'Dévoué', 'Complète 50 sessions', '💪', 'milestone', 'rare', 100),
    ('session_100', 'Centurion', 'Complète 100 sessions', '🏛️', 'milestone', 'epic', 300),
    ('session_500', 'Légende', 'Complète 500 sessions', '👑', 'milestone', 'legendary', 1000),
    -- Shooting badges
    ('shots_1000', 'Tireur', '1000 tirs tentés au total', '🎯', 'shooting', 'common', 50),
    ('shots_5000', 'Mitrailleur', '5000 tirs tentés au total', '💣', 'shooting', 'rare', 200),
    ('shots_10000', 'Artilleur', '10000 tirs tentés au total', '🚀', 'shooting', 'epic', 500),
    ('sniper_60', 'Sniper', '60%+ de réussite sur une session', '🔫', 'shooting', 'rare', 75),
    ('sniper_70', 'Dead Eye', '70%+ de réussite sur une session', '👁️', 'shooting', 'epic', 150),
    ('perfect_quarter', 'Perfect Quarter', '100% sur un quart-temps', '💯', 'shooting', 'legendary', 500),
    -- Mental badges
    ('mental_90', 'Mental d''Acier', 'Score mental > 90', '🧠', 'mental', 'rare', 100),
    ('mental_95', 'Zen Master', 'Score mental > 95', '🧘', 'mental', 'epic', 250),
    ('clutch_king', 'Clutch King', 'Clutch rating > 85 sur une session', '🧊', 'mental', 'epic', 200),
    -- Consistency badges
    ('streak_7', 'Semaine de Feu', '7 jours consécutifs d''entraînement', '🔥', 'consistency', 'common', 50),
    ('streak_30', 'Machine', '30 jours consécutifs', '🤖', 'consistency', 'rare', 200),
    ('streak_100', 'Légende du Grind', '100 jours consécutifs', '⚡', 'consistency', 'legendary', 1000),
    -- Social badges
    ('crew_joined', 'Coéquipier', 'Rejoins un Crew', '🤝', 'social', 'common', 20),
    ('crew_captain', 'Capitaine', 'Deviens capitaine de Crew', '🏴', 'social', 'rare', 50),
    ('challenge_5', 'Competitor', 'Gagne 5 challenges communautaires', '🏆', 'challenge', 'rare', 100),
    ('challenge_20', 'Champion', 'Gagne 20 challenges', '🥇', 'challenge', 'epic', 300),
    -- DNA badges
    ('purity_85', 'Mécanique Pure', 'Shot DNA Purity Score > 85', '💎', 'shooting', 'epic', 200),
    ('purity_95', 'Perfection Mécanique', 'Shot DNA Purity Score > 95', '🌟', 'shooting', 'legendary', 500),
    ('nba_90', 'NBA Ready', 'NBA Similarity > 90%', '🏀', 'shooting', 'legendary', 500),
    -- Rating badges
    ('offensive_rating_90', 'Offensive Maestro', 'Offensive Rating > 90', '⚔️', 'shooting', 'epic', 250),
    ('apex_s', 'Apex Predator', 'Apex Score Grade S', '🦅', 'milestone', 'legendary', 2000)
ON CONFLICT (slug) DO NOTHING;
