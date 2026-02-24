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
  model_version TEXT DEFAULT 'v1',
  pose_data JSONB,
  play_style JSONB,
  strengths TEXT[],
  weaknesses TEXT[],
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
CREATE POLICY "Users can manage their own follows"
ON public.user_follows FOR ALL
USING (follower_id = auth.uid());

CREATE POLICY "Users can see who follows them"
ON public.user_follows FOR SELECT
USING (following_id = auth.uid());


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
