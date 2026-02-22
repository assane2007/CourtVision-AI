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
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'analyzing', 'complete', 'failed')),
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


-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_twins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

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


-- ==========================================
-- 3. STORAGE & BUCKETS
-- ==========================================
-- Note: Les buckets nécessitent l'extension pgcrypto ou l'API Supabase, 
-- mais on peut l'insérer directement si on utilise la console SQL Supabase.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', false)
ON CONFLICT (id) DO NOTHING;

-- Les vidéos sont stockées en privé (Row Level Security sur storage.objects)
-- Seul l'utilisateur (owner) de la vidéo peut la gérer
CREATE POLICY "Users can upload their own videos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'videos' AND auth.uid() = owner);

CREATE POLICY "Users can view their own videos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'videos' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own videos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'videos' AND auth.uid() = owner);
