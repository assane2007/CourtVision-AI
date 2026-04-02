-- ==========================================
-- CourtVision AI — Migration V6.0 "Arena"
-- Toutes les nouvelles tables pour les 5 features V6
-- ==========================================

-- ==========================================
-- 1. ARENA — Challenge Multi-joueurs Temps Réel
-- ==========================================

CREATE TABLE IF NOT EXISTS public.arena_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('shootout', 'accuracy', 'speed', 'clutch', 'knockout')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'countdown', 'live', 'finished', 'cancelled')),
  config JSONB NOT NULL DEFAULT '{}',
  current_round INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.arena_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.arena_matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  is_ready BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0,
  shots_made INTEGER DEFAULT 0,
  shots_total INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  is_eliminated BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.arena_shot_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.arena_matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('made', 'missed')),
  zone TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.arena_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  avg_accuracy FLOAT DEFAULT 0,
  elo_rating INTEGER DEFAULT 1200,
  best_streak INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_matches_status ON public.arena_matches(status);
CREATE INDEX IF NOT EXISTS idx_arena_matches_host ON public.arena_matches(host_id);
CREATE INDEX IF NOT EXISTS idx_arena_players_match ON public.arena_players(match_id);
CREATE INDEX IF NOT EXISTS idx_arena_players_user ON public.arena_players(user_id);
CREATE INDEX IF NOT EXISTS idx_arena_shot_log_match ON public.arena_shot_log(match_id);
CREATE INDEX IF NOT EXISTS idx_arena_leaderboard_elo ON public.arena_leaderboard(elo_rating DESC);

-- ==========================================
-- 2. HORSE IA — Jouer contre un avatar IA
-- ==========================================

CREATE TABLE IF NOT EXISTS public.horse_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('rookie', 'pro', 'allstar', 'legend')),
  ai_personality TEXT NOT NULL DEFAULT 'classic' CHECK (ai_personality IN ('classic', 'aggressive', 'creative', 'defensive')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'abandoned')),
  letters TEXT DEFAULT '',
  ai_letters TEXT DEFAULT '',
  max_letters INTEGER DEFAULT 5,
  current_round INTEGER DEFAULT 1,
  score INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.horse_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.horse_games(id) ON DELETE CASCADE NOT NULL,
  round INTEGER NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN (
    'zone_shot', 'fadeaway', 'stepback', 'bank_shot', 'swish_only',
    'off_dribble', 'catch_and_shoot', 'turnaround', 'floater', 'logo_shot'
  )),
  target_zone TEXT NOT NULL,
  target_technique TEXT NOT NULL,
  nba_inspiration TEXT,
  description TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
  timeout_sec INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.horse_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.horse_challenges(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES public.horse_games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  success BOOLEAN NOT NULL,
  similarity_score FLOAT DEFAULT 0,
  shot_data JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.horse_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  avg_similarity FLOAT DEFAULT 0,
  longest_win_streak INTEGER DEFAULT 0,
  current_win_streak INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_horse_games_user ON public.horse_games(user_id);
CREATE INDEX IF NOT EXISTS idx_horse_games_status ON public.horse_games(status);
CREATE INDEX IF NOT EXISTS idx_horse_games_user_status ON public.horse_games(user_id, status);
CREATE INDEX IF NOT EXISTS idx_horse_challenges_game ON public.horse_challenges(game_id);
CREATE INDEX IF NOT EXISTS idx_horse_challenges_game_round ON public.horse_challenges(game_id, round DESC);
CREATE INDEX IF NOT EXISTS idx_horse_attempts_challenge ON public.horse_attempts(challenge_id);
CREATE INDEX IF NOT EXISTS idx_horse_attempts_game ON public.horse_attempts(game_id);
CREATE INDEX IF NOT EXISTS idx_horse_attempts_user ON public.horse_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_horse_leaderboard_wins ON public.horse_leaderboard(games_won DESC);

-- ==========================================
-- 3. WEARABLE / APPLE WATCH HRV
-- ==========================================

CREATE TABLE IF NOT EXISTS public.wearable_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('apple_watch', 'garmin', 'fitbit', 'whoop', 'samsung', 'other')),
  device_name TEXT NOT NULL,
  model TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wearable_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES public.wearable_devices(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'heart_rate', 'hrv', 'resting_hr', 'vo2max', 'calories',
    'steps', 'sleep', 'blood_oxygen', 'respiratory_rate', 'body_temperature'
  )),
  value FLOAT NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.hrv_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  rmssd FLOAT NOT NULL,
  sdnn FLOAT NOT NULL,
  ln_rmssd FLOAT NOT NULL,
  resting_hr FLOAT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_load (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  acute_load FLOAT DEFAULT 0,
  chronic_load FLOAT DEFAULT 0,
  acwr FLOAT DEFAULT 0,
  risk TEXT DEFAULT 'low' CHECK (risk IN ('low', 'moderate', 'high', 'very_high')),
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_wearable_devices_user ON public.wearable_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_data_user_type ON public.wearable_data(user_id, type);
CREATE INDEX IF NOT EXISTS idx_wearable_data_recorded ON public.wearable_data(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_hrv_readings_user ON public.hrv_readings(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_load_user ON public.training_load(user_id, date DESC);

-- ==========================================
-- 4. MARKETPLACE DE DRILLS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  verified BOOLEAN DEFAULT false,
  stripe_connect_id TEXT,
  total_earnings INTEGER DEFAULT 0,  -- en cents
  total_sales INTEGER DEFAULT 0,
  specialties TEXT[] DEFAULT '{}',
  credentials TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.drill_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creator_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_image_url TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'shooting', 'ball_handling', 'defense', 'conditioning',
    'footwork', 'mental', 'team', 'post_moves', 'passing', 'agility'
  )),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'elite')),
  equipment TEXT[] DEFAULT '{}',
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  rating FLOAT DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,  -- minutes
  drill_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'rejected', 'archived')),
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.drill_pack_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES public.drill_packs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT[] DEFAULT '{}',
  duration_min INTEGER NOT NULL DEFAULT 5,
  video_url TEXT,
  thumbnail_url TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'elite')),
  reps INTEGER,
  sets INTEGER,
  rest_sec INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  tips TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.drill_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  pack_id UUID REFERENCES public.drill_packs(id) ON DELETE CASCADE NOT NULL,
  price_paid INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_payment_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pack_id)
);

CREATE TABLE IF NOT EXISTS public.drill_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  pack_id UUID REFERENCES public.drill_packs(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_drill_packs_category ON public.drill_packs(category);
CREATE INDEX IF NOT EXISTS idx_drill_packs_status ON public.drill_packs(status);
CREATE INDEX IF NOT EXISTS idx_drill_packs_creator ON public.drill_packs(creator_id);
CREATE INDEX IF NOT EXISTS idx_drill_packs_featured ON public.drill_packs(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_drill_packs_rating ON public.drill_packs(rating DESC);
CREATE INDEX IF NOT EXISTS idx_drill_pack_items_pack ON public.drill_pack_items(pack_id, position);
CREATE INDEX IF NOT EXISTS idx_drill_purchases_user ON public.drill_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_purchases_pack ON public.drill_purchases(pack_id);
CREATE INDEX IF NOT EXISTS idx_drill_reviews_pack ON public.drill_reviews(pack_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user ON public.creator_profiles(user_id);

-- ==========================================
-- 5. RLS Policies (Row Level Security)
-- ==========================================

ALTER TABLE public.arena_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_shot_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hrv_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_load ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drill_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drill_pack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drill_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drill_reviews ENABLE ROW LEVEL SECURITY;

-- Arena: public matches can be read by all, but only host can modify
DROP POLICY IF EXISTS "arena_matches_read" ON public.arena_matches;
CREATE POLICY "arena_matches_read" ON public.arena_matches FOR SELECT USING (true);
DROP POLICY IF EXISTS "arena_matches_insert" ON public.arena_matches;
CREATE POLICY "arena_matches_insert" ON public.arena_matches FOR INSERT WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS "arena_matches_update" ON public.arena_matches;
CREATE POLICY "arena_matches_update" ON public.arena_matches FOR UPDATE USING (auth.uid() = host_id);

-- Arena players: visible to all, insert/update own
DROP POLICY IF EXISTS "arena_players_read" ON public.arena_players;
CREATE POLICY "arena_players_read" ON public.arena_players FOR SELECT USING (true);
DROP POLICY IF EXISTS "arena_players_insert" ON public.arena_players;
CREATE POLICY "arena_players_insert" ON public.arena_players FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "arena_players_update" ON public.arena_players;
CREATE POLICY "arena_players_update" ON public.arena_players FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "arena_players_delete" ON public.arena_players;
CREATE POLICY "arena_players_delete" ON public.arena_players FOR DELETE USING (
  auth.uid() = user_id OR auth.uid() = (SELECT host_id FROM public.arena_matches WHERE id = match_id)
);

-- Arena shot log: insert own shots in a match, read all for match participants
DROP POLICY IF EXISTS "arena_shot_log_read" ON public.arena_shot_log;
CREATE POLICY "arena_shot_log_read" ON public.arena_shot_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.arena_players WHERE match_id = arena_shot_log.match_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "arena_shot_log_insert" ON public.arena_shot_log;
CREATE POLICY "arena_shot_log_insert" ON public.arena_shot_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Arena leaderboard: public read, service-managed writes (see SECURITY DEFINER functions below)
DROP POLICY IF EXISTS "arena_leaderboard_read" ON public.arena_leaderboard;
CREATE POLICY "arena_leaderboard_read" ON public.arena_leaderboard FOR SELECT USING (true);

-- Horse: own games only
DROP POLICY IF EXISTS "horse_games_all" ON public.horse_games;
CREATE POLICY "horse_games_all" ON public.horse_games USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "horse_challenges_read" ON public.horse_challenges;
CREATE POLICY "horse_challenges_read" ON public.horse_challenges FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.horse_games WHERE id = game_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "horse_challenges_insert" ON public.horse_challenges;
CREATE POLICY "horse_challenges_insert" ON public.horse_challenges FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.horse_games WHERE id = game_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "horse_attempts_all" ON public.horse_attempts;
CREATE POLICY "horse_attempts_all" ON public.horse_attempts USING (auth.uid() = user_id);

-- Wearable: own data only
DROP POLICY IF EXISTS "wearable_devices_all" ON public.wearable_devices;
CREATE POLICY "wearable_devices_all" ON public.wearable_devices USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wearable_data_all" ON public.wearable_data;
CREATE POLICY "wearable_data_all" ON public.wearable_data USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "hrv_readings_all" ON public.hrv_readings;
CREATE POLICY "hrv_readings_all" ON public.hrv_readings USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "training_load_all" ON public.training_load;
CREATE POLICY "training_load_all" ON public.training_load USING (auth.uid() = user_id);

-- Marketplace: published packs readable by all, own packs editable
DROP POLICY IF EXISTS "drill_packs_read" ON public.drill_packs;
CREATE POLICY "drill_packs_read" ON public.drill_packs FOR SELECT USING (status = 'published' OR creator_id IN (SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "drill_pack_items_read" ON public.drill_pack_items;
CREATE POLICY "drill_pack_items_read" ON public.drill_pack_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "drill_purchases_own" ON public.drill_purchases;
CREATE POLICY "drill_purchases_own" ON public.drill_purchases USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "drill_reviews_read" ON public.drill_reviews;
CREATE POLICY "drill_reviews_read" ON public.drill_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "drill_reviews_insert" ON public.drill_reviews;
CREATE POLICY "drill_reviews_insert" ON public.drill_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "creator_profiles_read" ON public.creator_profiles;
CREATE POLICY "creator_profiles_read" ON public.creator_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "creator_profiles_own" ON public.creator_profiles;
CREATE POLICY "creator_profiles_own" ON public.creator_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Leaderboards: public read
DROP POLICY IF EXISTS "horse_leaderboard_read" ON public.horse_leaderboard;
CREATE POLICY "horse_leaderboard_read" ON public.horse_leaderboard FOR SELECT USING (true);

-- ==========================================
-- 6. ADDITIONAL V6 COLUMNS & TABLES (Peaufinage)
-- ==========================================

-- Arena: private matches, invite codes, win streaks
ALTER TABLE public.arena_matches ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE public.arena_matches ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.arena_matches ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE public.arena_shot_log ADD COLUMN IF NOT EXISTS round INTEGER;
ALTER TABLE public.arena_shot_log ADD COLUMN IF NOT EXISTS confidence FLOAT;

ALTER TABLE public.arena_leaderboard ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0;
ALTER TABLE public.horse_games ADD COLUMN IF NOT EXISTS ai_personality TEXT NOT NULL DEFAULT 'classic' CHECK (ai_personality IN ('classic', 'aggressive', 'creative', 'defensive'));

CREATE INDEX IF NOT EXISTS idx_arena_matches_invite ON public.arena_matches(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_arena_matches_private ON public.arena_matches(is_private);

-- Marketplace: Wishlist
CREATE TABLE IF NOT EXISTS public.drill_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  pack_id UUID REFERENCES public.drill_packs(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_drill_wishlist_user ON public.drill_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_wishlist_pack ON public.drill_wishlist(pack_id);

ALTER TABLE public.drill_wishlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drill_wishlist_own" ON public.drill_wishlist;
CREATE POLICY "drill_wishlist_own" ON public.drill_wishlist USING (auth.uid() = user_id);

-- ==========================================
-- 7. STORED PROCEDURES / RPC FUNCTIONS
-- ==========================================

-- Increment creator earnings atomically
CREATE OR REPLACE FUNCTION public.increment_creator_earnings(
  p_creator_id UUID,
  p_amount INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE public.creator_profiles
  SET total_earnings = total_earnings + p_amount,
      total_sales = total_sales + 1
  WHERE id = p_creator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get arena ELO rank for a user
CREATE OR REPLACE FUNCTION public.get_arena_rank(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_rank INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_rank
  FROM public.arena_leaderboard
  WHERE elo_rating > (
    SELECT COALESCE(elo_rating, 1200)
    FROM public.arena_leaderboard
    WHERE user_id = p_user_id
  );
  RETURN COALESCE(v_rank, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Cleanup stale arena matches (waiting > 30 min)
CREATE OR REPLACE FUNCTION public.cleanup_stale_arena_matches()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.arena_matches
  SET status = 'cancelled', ended_at = NOW()
  WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '30 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Abandon stale HORSE games (active > 24h)
CREATE OR REPLACE FUNCTION public.cleanup_stale_horse_games()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.horse_games
  SET status = 'abandoned', ended_at = NOW()
  WHERE status = 'active'
    AND created_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 8. MATERIALIZED VIEW: Arena Top Players (refresh daily)
-- ==========================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.arena_top_players AS
SELECT
  al.user_id,
  u.username,
  u.avatar_url,
  al.elo_rating,
  al.wins,
  al.losses,
  al.avg_accuracy,
  al.best_streak,
  al.win_streak,
  CASE WHEN al.wins + al.losses > 0
    THEN ROUND(al.wins::NUMERIC / (al.wins + al.losses) * 100, 1)
    ELSE 0
  END AS win_rate,
  ROW_NUMBER() OVER (ORDER BY al.elo_rating DESC) AS rank
FROM public.arena_leaderboard al
JOIN public.users u ON u.id = al.user_id
WHERE al.wins + al.losses >= 5
ORDER BY al.elo_rating DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_arena_top_players_user ON public.arena_top_players(user_id);

-- ==========================================
-- 9. TRIGGER: Auto-update arena_leaderboard.updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_arena_leaderboard_updated') THEN
    CREATE TRIGGER trg_arena_leaderboard_updated
      BEFORE UPDATE ON public.arena_leaderboard
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_horse_leaderboard_updated') THEN
    CREATE TRIGGER trg_horse_leaderboard_updated
      BEFORE UPDATE ON public.horse_leaderboard
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_drill_packs_updated') THEN
    CREATE TRIGGER trg_drill_packs_updated
      BEFORE UPDATE ON public.drill_packs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ==========================================
-- 10. SECURITY DEFINER FUNCTIONS (Leaderboard writes bypassing RLS)
-- ==========================================

-- Upsert arena leaderboard entry (called from service after match end)
CREATE OR REPLACE FUNCTION public.upsert_arena_leaderboard(
  p_user_id UUID,
  p_wins INTEGER,
  p_losses INTEGER,
  p_avg_accuracy FLOAT,
  p_elo_rating INTEGER,
  p_best_streak INTEGER,
  p_win_streak INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.arena_leaderboard (user_id, wins, losses, avg_accuracy, elo_rating, best_streak, win_streak)
  VALUES (p_user_id, p_wins, p_losses, p_avg_accuracy, p_elo_rating, p_best_streak, p_win_streak)
  ON CONFLICT (user_id)
  DO UPDATE SET
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    avg_accuracy = EXCLUDED.avg_accuracy,
    elo_rating = EXCLUDED.elo_rating,
    best_streak = GREATEST(arena_leaderboard.best_streak, EXCLUDED.best_streak),
    win_streak = EXCLUDED.win_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert horse leaderboard entry (called from service after game end)
CREATE OR REPLACE FUNCTION public.upsert_horse_leaderboard(
  p_user_id UUID,
  p_games_played INTEGER,
  p_games_won INTEGER,
  p_best_score INTEGER,
  p_avg_similarity FLOAT,
  p_longest_win_streak INTEGER,
  p_current_win_streak INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.horse_leaderboard (user_id, games_played, games_won, best_score, avg_similarity, longest_win_streak, current_win_streak)
  VALUES (p_user_id, p_games_played, p_games_won, p_best_score, p_avg_similarity, p_longest_win_streak, p_current_win_streak)
  ON CONFLICT (user_id)
  DO UPDATE SET
    games_played = EXCLUDED.games_played,
    games_won = EXCLUDED.games_won,
    best_score = GREATEST(horse_leaderboard.best_score, EXCLUDED.best_score),
    avg_similarity = EXCLUDED.avg_similarity,
    longest_win_streak = GREATEST(horse_leaderboard.longest_win_streak, EXCLUDED.longest_win_streak),
    current_win_streak = EXCLUDED.current_win_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 11. CRON JOBS
-- ==========================================
-- Cleanup stale arena matches (waiting > 30 min)
CREATE OR REPLACE FUNCTION public.cron_cleanup_stale_arena_matches()
RETURNS VOID AS $$
BEGIN
  PERFORM public.cleanup_stale_arena_matches();
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Abandon stale HORSE games (active > 24h)
CREATE OR REPLACE FUNCTION public.cron_cleanup_stale_horse_games()
RETURNS VOID AS $$
BEGIN
  PERFORM public.cleanup_stale_horse_games();
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Refresh materialized view: Arena Top Players
CREATE OR REPLACE FUNCTION public.cron_refresh_arena_top_players()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.arena_top_players;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ==========================================
-- 12. pg_cron SCHEDULES (run on Supabase or self-hosted with pg_cron)
-- Uncomment when pg_cron extension is enabled:
-- ==========================================
-- SELECT cron.schedule('cleanup-stale-arena', '*/10 * * * *', 'SELECT public.cron_cleanup_stale_arena_matches()');
-- SELECT cron.schedule('cleanup-stale-horse', '0 */6 * * *', 'SELECT public.cron_cleanup_stale_horse_games()');
-- SELECT cron.schedule('refresh-arena-top', '0 3 * * *', 'SELECT public.cron_refresh_arena_top_players()');

-- ==========================================
-- 13. WEARABLE DATA RETENTION (archiver les données > 1 an)
-- ==========================================
CREATE OR REPLACE FUNCTION public.archive_old_wearable_data()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Delete raw wearable_data older than 365 days (keep aggregated HRV readings)
  DELETE FROM public.wearable_data
  WHERE recorded_at < NOW() - INTERVAL '365 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT cron.schedule('archive-wearable-data', '0 4 1 * *', 'SELECT public.archive_old_wearable_data()');

-- ==========================================
-- 14. COMPOSITE INDEXES for performance (hot queries)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_wearable_data_user_type_recorded
  ON public.wearable_data(user_id, type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_arena_matches_status_private
  ON public.arena_matches(status, is_private) WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS idx_drill_packs_status_category
  ON public.drill_packs(status, category) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_drill_packs_status_sales
  ON public.drill_packs(status, sales_count DESC) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_arena_shot_log_match_user
  ON public.arena_shot_log(match_id, user_id);
