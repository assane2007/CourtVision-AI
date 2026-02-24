-- packages/database/schema.sql

-- ==========================================
-- 1. TABLES CREATION
-- ==========================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  position TEXT CHECK (position IN ('PG','SG','SF','PF','C')),
  height_cm INTEGER,
  weight_kg INTEGER,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','player','coach','academy')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('match','training','shootaround')),
  video_url TEXT NOT NULL,
  duration_sec INTEGER,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'analyzing', 'live', 'complete', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  shot_attempts INTEGER DEFAULT 0,
  shot_made INTEGER DEFAULT 0,
  shot_zones JSONB,
  heatmap_data JSONB,
  mental_score FLOAT,
  body_language JSONB,
  highlights JSONB,
  ai_report TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.digital_twins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  model_version TEXT DEFAULT 'v2.0',
  overall_rating INTEGER DEFAULT 50,
  pose_data JSONB,
  play_style JSONB,
  attribute_categories JSONB DEFAULT '[]',
  strengths TEXT[],
  weaknesses TEXT[],
  nba_comparisons JSONB DEFAULT '[]',
  comfort_zones JSONB DEFAULT '[]',
  evolution JSONB DEFAULT '[]',
  mental_profile JSONB DEFAULT '{}',
  pose_signature JSONB DEFAULT '{}',
  twin_profile JSONB,
  ai_insights TEXT,
  session_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'landing',
  referral_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.community_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL,
  reward TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  end_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE public.challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.community_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  value FLOAT NOT NULL,
  metric TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (challenge_id, user_id)
);

CREATE TABLE public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ==========================================
-- Community Extended Tables
-- ==========================================

-- Profils publics avec stats agrégées et badges
CREATE TABLE public.public_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
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

-- Système de badges
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  category TEXT CHECK (category IN ('shooting', 'mental', 'consistency', 'social', 'challenge', 'milestone')),
  condition_type TEXT NOT NULL, -- e.g. 'sessions_count', 'shooting_pct', 'mental_score', 'challenges_won', 'followers'
  condition_value FLOAT NOT NULL, -- threshold to earn the badge
  xp_reward INTEGER DEFAULT 10,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Association user <-> badges débloqués
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

-- Fil d'activité communautaire
CREATE TABLE public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('session_complete', 'badge_earned', 'challenge_won', 'challenge_joined', 'follow', 'highlight_shared', 'level_up', 'new_record')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications in-app
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('badge', 'challenge', 'follow', 'leaderboard', 'system')),
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared Cards (partage viral)
CREATE TABLE public.shared_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('twin_card', 'highlight_reel', 'session_recap', 'badge', 'challenge_win')),
  platform TEXT DEFAULT 'generic',
  card_data JSONB NOT NULL,
  caption TEXT DEFAULT '',
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Coach Live Tables
-- ==========================================

CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'complete')),
  current_quarter INTEGER DEFAULT 1,
  mental_timeline JSONB DEFAULT '[]',
  cumulative_stats JSONB DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.live_quarter_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  live_session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  mental_score FLOAT DEFAULT 0,
  shooting_pct FLOAT DEFAULT 0,
  distance_covered FLOAT DEFAULT 0,
  fatigue_index FLOAT DEFAULT 0,
  alerts_count INTEGER DEFAULT 0,
  summary_message TEXT,
  tips TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, quarter)
);

CREATE TABLE public.live_alerts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  quarter INTEGER,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_twins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_quarter_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_cards ENABLE ROW LEVEL SECURITY;

-- Un utilisateur ne peut accéder qu'à ses propres données
CREATE POLICY "Users can manage their own profile" 
ON public.users FOR ALL USING (id = auth.uid());

CREATE POLICY "Users can manage their own sessions" 
ON public.sessions FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own analyses" 
ON public.analyses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE id = analyses.session_id AND user_id = auth.uid())
);

CREATE POLICY "Users can manage their own digital twins" 
ON public.digital_twins FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can read their own subscriptions" 
ON public.subscriptions FOR SELECT USING (user_id = auth.uid());

-- Waitlist : insertion publique, lecture restreinte admin
CREATE POLICY "Anyone can join the waitlist"
ON public.waitlist FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own waitlist entry"
ON public.waitlist FOR SELECT
USING (email = auth.email());

-- Challenges : lecture publique, soumission par les utilisateurs authentifiés
CREATE POLICY "Anyone can view challenges"
ON public.community_challenges FOR SELECT
USING (true);

CREATE POLICY "Users can submit to challenges"
ON public.challenge_submissions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view all submissions"
ON public.challenge_submissions FOR SELECT
USING (true);

CREATE POLICY "Users can update their own submissions"
ON public.challenge_submissions FOR UPDATE
USING (user_id = auth.uid());

-- Follows : les utilisateurs gèrent leurs propres follows
CREATE POLICY "Users can manage leur propres follows"
ON public.user_follows FOR ALL
USING (follower_id = auth.uid());

CREATE POLICY "Users can see who follows them"
ON public.user_follows FOR SELECT
USING (following_id = auth.uid());

-- Coach Live : accès aux sessions en direct
CREATE POLICY "Users can manage their own live sessions"
ON public.live_sessions FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Users can view live session summaries"
ON public.live_quarter_summaries FOR SELECT
USING (session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid()));

-- Profils publics : accès public, mais mise à jour restreinte
CREATE POLICY "Anyone can view public profiles"
ON public.public_profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update leur propre profil"
ON public.public_profiles FOR UPDATE
USING (user_id = auth.uid());

-- Badges : accès public aux badges, privés aux attributions
CREATE POLICY "Anyone can view badges"
ON public.badges FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own badges"
ON public.user_badges FOR ALL
USING (user_id = auth.uid());

-- Fil d'activité : accès aux activités de l'utilisateur
CREATE POLICY "Users can view their own activity feed"
ON public.activity_feed FOR SELECT
USING (user_id = auth.uid());

-- Notifications : accès aux notifications de l'utilisateur
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

-- Shared Cards : publiques en lecture, privées en écriture
CREATE POLICY "Anyone can view shared cards"
ON public.shared_cards FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own shared cards"
ON public.shared_cards FOR ALL
USING (user_id = auth.uid());


-- ==========================================
-- 3. INDEXES (performance)
-- ==========================================

CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_analyses_session_id ON public.analyses(session_id);
CREATE INDEX idx_digital_twins_user_id ON public.digital_twins(user_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_waitlist_email ON public.waitlist(email);
CREATE INDEX idx_waitlist_created_at ON public.waitlist(created_at DESC);
CREATE INDEX idx_challenges_end_at ON public.community_challenges(end_at);
CREATE INDEX idx_challenge_subs_challenge ON public.challenge_submissions(challenge_id);
CREATE INDEX idx_challenge_subs_user ON public.challenge_submissions(user_id);
CREATE INDEX idx_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_follows_following ON public.user_follows(following_id);
CREATE INDEX idx_live_sessions_user_id ON public.live_sessions(user_id);
CREATE INDEX idx_live_sessions_status ON public.live_sessions(status);
CREATE INDEX idx_live_quarter_summaries_session_id ON public.live_quarter_summaries(session_id);
CREATE INDEX idx_live_quarter_summaries_live_session_id ON public.live_quarter_summaries(live_session_id);
CREATE INDEX idx_public_profiles_user_id ON public.public_profiles(user_id);
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_activity_feed_user_id ON public.activity_feed(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_shared_cards_user_id ON public.shared_cards(user_id);
CREATE INDEX idx_shared_cards_share_id ON public.shared_cards(share_id);


-- ==========================================
-- 4. STORAGE & BUCKETS
-- ==========================================
-- Note: Les buckets nécessitent l'extension pgcrypto ou l'API Supabase,
-- mais on peut l'insérer directement si on utilise la console SQL Supabase.

INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('highlights', 'highlights', true)
ON CONFLICT (id) DO NOTHING;

-- Les vidéos sont stockées en privé (Row Level Security sur storage.objects)
CREATE POLICY "Users can upload their own videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos' AND auth.uid() = owner);

CREATE POLICY "Users can view their own videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos' AND auth.uid() = owner);

CREATE POLICY "Users can delete leur propres vidéos"
ON storage.objects FOR DELETE
USING (bucket_id = 'videos' AND auth.uid() = owner);

-- Les highlights sont publics (partageables)
CREATE POLICY "Anyone can view highlights"
ON storage.objects FOR SELECT
USING (bucket_id = 'highlights');

CREATE POLICY "Users can upload highlights"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'highlights' AND auth.uid() = owner);


-- ==========================================
-- 5. SEED DATA — Badges
-- ==========================================

INSERT INTO public.badges (slug, name, description, emoji, category, condition_type, condition_value, xp_reward, rarity) VALUES
  ('first_session', 'Premier Pas', 'Complète ta première session', '🏀', 'milestone', 'sessions_count', 1, 10, 'common'),
  ('ten_sessions', 'Régulier', 'Complète 10 sessions', '🔥', 'consistency', 'sessions_count', 10, 25, 'common'),
  ('fifty_sessions', 'Grindeur', 'Complète 50 sessions', '💪', 'consistency', 'sessions_count', 50, 100, 'rare'),
  ('hundred_sessions', 'Machine', 'Complète 100 sessions', '🤖', 'consistency', 'sessions_count', 100, 250, 'epic'),
  ('sniper', 'Sniper', 'Atteins 60% au tir sur une session', '🎯', 'shooting', 'shooting_pct', 60, 50, 'rare'),
  ('sharpshooter', 'Sharpshooter', 'Atteins 70% au tir sur une session', '🔫', 'shooting', 'shooting_pct', 70, 100, 'epic'),
  ('splash', 'Splash', 'Atteins 80% au tir sur une session', '💦', 'shooting', 'shooting_pct', 80, 250, 'legendary'),
  ('ice_cold', 'Ice Cold', 'Score mental > 90 stable sur une session', '🧊', 'mental', 'mental_score', 90, 75, 'epic'),
  ('zen_master', 'Zen Master', 'Score mental > 95', '🧘', 'mental', 'mental_score', 95, 200, 'legendary'),
  ('mental_warrior', 'Warrior Mental', 'Score mental > 80 sur 5 sessions consécutives', '⚔️', 'mental', 'mental_streak', 5, 150, 'epic'),
  ('social_butterfly', 'Papillon Social', 'Suis 10 joueurs', '🦋', 'social', 'following_count', 10, 25, 'common'),
  ('influencer', 'Influenceur', 'Obtiens 50 followers', '⭐', 'social', 'followers_count', 50, 100, 'rare'),
  ('legend', 'Légende', 'Obtiens 200 followers', '👑', 'social', 'followers_count', 200, 500, 'legendary'),
  ('challenger', 'Challenger', 'Gagne ton premier défi', '🏆', 'challenge', 'challenges_won', 1, 50, 'common'),
  ('champion', 'Champion', 'Gagne 10 défis', '🥇', 'challenge', 'challenges_won', 10, 200, 'epic'),
  ('level_10', 'Niveau 10', 'Atteins le niveau 10', '🌟', 'milestone', 'level', 10, 100, 'rare'),
  ('level_25', 'Niveau 25', 'Atteins le niveau 25', '💎', 'milestone', 'level', 25, 300, 'epic'),
  ('hundred_shots', 'Centurion', 'Prends 100 tirs au total', '💯', 'shooting', 'total_shots', 100, 25, 'common'),
  ('thousand_shots', 'Mitrailleur', 'Prends 1000 tirs au total', '🔥', 'shooting', 'total_shots', 1000, 150, 'rare')
ON CONFLICT (slug) DO NOTHING;
