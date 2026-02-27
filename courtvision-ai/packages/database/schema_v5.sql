-- ==========================================
-- CourtVision AI — Schema V5 "Apex"
-- Nouvelles tables pour les fonctionnalités révolutionnaires
-- ==========================================

-- ==========================================
-- 1. SHOT DNA™ — Empreinte de Tir Unique
-- ==========================================

CREATE TABLE public.shot_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  -- Signature biomécanique
  avg_elbow_angle FLOAT DEFAULT 0,
  avg_release_height FLOAT DEFAULT 0,
  avg_release_time FLOAT DEFAULT 0,
  follow_through_pct FLOAT DEFAULT 0,
  dominant_hand TEXT DEFAULT 'right' CHECK (dominant_hand IN ('right', 'left')),
  -- Scores
  dna_purity_score FLOAT DEFAULT 0,  -- 0-100 : consistance mécanique
  dna_nba_similarity FLOAT DEFAULT 0, -- 0-100 : ressemblance au plus proche NBA
  closest_nba_player TEXT,
  -- Zone de tir optimale
  optimal_zone TEXT,
  optimal_zone_pct FLOAT DEFAULT 0,
  -- Tendances (drift detection)
  mechanical_drift JSONB DEFAULT '[]',  -- [{date, metric, delta}]
  session_signatures JSONB DEFAULT '[]', -- [{sessionId, elbowAngle, releaseHeight, ...}]
  -- Meta
  total_shots_analyzed INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Shot par shot avec signature biomécanique complète
CREATE TABLE public.shot_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  -- Position
  zone TEXT NOT NULL,
  court_x FLOAT,
  court_y FLOAT,
  -- Outcome
  outcome TEXT CHECK (outcome IN ('made', 'missed', 'blocked', 'foul')),
  -- Biomécanique
  elbow_angle FLOAT,
  release_height FLOAT,
  release_time FLOAT,
  follow_through BOOLEAN DEFAULT false,
  -- Quality
  shot_quality_score FLOAT DEFAULT 0,  -- 0-100 (expected make %)
  nba_similarity FLOAT DEFAULT 0,
  closest_nba TEXT,
  -- Context
  quarter INTEGER,
  game_clock FLOAT,  -- secondes restantes dans le quart
  is_clutch BOOLEAN DEFAULT false,  -- dans les 2 dernières minutes, score serré
  is_contested BOOLEAN DEFAULT false,
  fatigue_level FLOAT DEFAULT 0,  -- 0-100
  mental_state FLOAT DEFAULT 0,  -- 0-100
  -- Meta
  timestamp_sec FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. PREDICTIVE ENGINE
-- ==========================================

CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('pre_game', 'zone_performance', 'momentum', 'fatigue_curve', 'weekly_forecast')),
  -- Prediction data
  predicted_fg_pct FLOAT,
  predicted_mental_score FLOAT,
  predicted_fatigue_peak INTEGER, -- minute du match
  zone_predictions JSONB DEFAULT '{}',  -- {zone: predicted_pct}
  momentum_curve JSONB DEFAULT '[]',  -- [{minute, score}]
  confidence FLOAT DEFAULT 0,  -- 0-1
  -- Context (input factors)
  input_factors JSONB DEFAULT '{}',  -- {sleep_hours, days_since_last, ...}
  -- Validation (après le match)
  actual_fg_pct FLOAT,
  actual_mental_score FLOAT,
  prediction_accuracy FLOAT,  -- 0-100
  validated BOOLEAN DEFAULT false,
  -- Meta
  valid_for TIMESTAMPTZ,  -- date pour laquelle la prédiction est faite
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. SMART TRAINING PLANS
-- ==========================================

CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  -- Plan info
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  plan_type TEXT CHECK (plan_type IN ('weekly', 'micro_cycle', 'meso_cycle', 'deload', 'peaking')),
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 10),
  -- Structure
  days JSONB NOT NULL DEFAULT '[]',  -- [{day, focus, drills: [{name, sets, reps, duration, notes, video_url}]}]
  total_duration_min INTEGER DEFAULT 0,
  -- Adaptation
  adaptation_history JSONB DEFAULT '[]',  -- [{date, change, reason}]
  fatigue_adjusted BOOLEAN DEFAULT false,
  -- Progress
  completion_pct FLOAT DEFAULT 0,
  completed_days INTEGER DEFAULT 0,
  total_days INTEGER DEFAULT 7,
  -- AI Generation
  generated_by TEXT DEFAULT 'groq',  -- 'groq', 'ollama', 'algorithmic'
  generation_context JSONB DEFAULT '{}',  -- weaknesses, goals, etc.
  -- Meta
  active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.training_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.training_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  -- Completion data
  completed_drills JSONB DEFAULT '[]',  -- [{drill_name, completed, duration_actual, notes}]
  duration_actual_min INTEGER DEFAULT 0,
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  notes TEXT,
  -- Auto-tracked (if session was recorded)
  linked_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  -- Meta
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. AI COACH CHAT
-- ==========================================

CREATE TABLE public.coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  context_type TEXT CHECK (context_type IN ('general', 'session_review', 'training', 'pre_game', 'film_room', 'technique')),
  -- Context references
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  -- Metadata
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  -- Rich content
  attachments JSONB DEFAULT '[]',  -- [{type: 'chart'|'drill'|'highlight', data: {...}}]
  suggested_actions JSONB DEFAULT '[]',  -- [{label, action, params}]
  -- Meta
  tokens_used INTEGER DEFAULT 0,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. RECOVERY & WELLNESS
-- ==========================================

CREATE TABLE public.recovery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- Sleep
  sleep_hours FLOAT,
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  -- Biometrics (from Apple Health / manual)
  resting_hr INTEGER,
  hrv FLOAT,  -- Heart Rate Variability
  -- Subjective
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  muscle_soreness INTEGER CHECK (muscle_soreness BETWEEN 1 AND 5),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  -- Nutrition
  hydration_liters FLOAT,
  meals_quality INTEGER CHECK (meals_quality BETWEEN 1 AND 5),
  -- Computed
  recovery_score FLOAT DEFAULT 0,  -- 0-100 (AI computed)
  readiness_score FLOAT DEFAULT 0,  -- 0-100 (prêt à jouer?)
  recommendation TEXT,
  -- Meta
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'apple_health', 'whoop', 'garmin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ==========================================
-- 6. QUESTS & GAMIFICATION AVANCÉE
-- ==========================================

CREATE TABLE public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  -- Type
  quest_type TEXT CHECK (quest_type IN ('daily', 'weekly', 'monthly', 'seasonal', 'legendary')),
  category TEXT CHECK (category IN ('shooting', 'mental', 'fitness', 'social', 'consistency', 'exploration')),
  -- Requirements
  condition_type TEXT NOT NULL,  -- e.g. 'shots_made', 'sessions_completed', 'mental_score_above'
  condition_value FLOAT NOT NULL,
  condition_timeframe TEXT,  -- e.g. 'today', 'this_week', 'this_month', 'alltime'
  -- Rewards
  xp_reward INTEGER DEFAULT 10,
  badge_reward UUID REFERENCES public.badges(id) ON DELETE SET NULL,
  special_reward JSONB,  -- {type: 'title'|'cosmetic'|'unlock', value: '...'}
  -- Availability
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  max_completions INTEGER DEFAULT 1,  -- -1 = unlimited (daily repeatable)
  -- Season
  season_id UUID,
  -- Meta
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5) DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE,
  -- Progress
  current_value FLOAT DEFAULT 0,
  target_value FLOAT NOT NULL,
  progress_pct FLOAT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'claimed')),
  -- Rewards
  xp_claimed BOOLEAN DEFAULT false,
  -- Meta
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  UNIQUE(user_id, quest_id)
);

-- Skill Tree (progression visuelle)
CREATE TABLE public.skill_tree_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  -- Tree structure
  category TEXT CHECK (category IN ('shooting', 'mental', 'physical', 'tactical', 'leadership')),
  tier INTEGER CHECK (tier BETWEEN 1 AND 5),  -- 1=base, 5=mastery
  parent_node_id UUID REFERENCES public.skill_tree_nodes(id) ON DELETE SET NULL,
  prerequisites UUID[] DEFAULT '{}',  -- node IDs required before unlocking
  -- Unlock condition
  unlock_condition_type TEXT NOT NULL,
  unlock_condition_value FLOAT NOT NULL,
  -- Bonus (permanent stat boost when unlocked)
  bonus_type TEXT,  -- e.g. 'xp_multiplier', 'training_boost', 'cosmetic'
  bonus_value JSONB,
  -- Meta
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_skill_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  node_id UUID REFERENCES public.skill_tree_nodes(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, node_id)
);

-- Saisons compétitives
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  theme TEXT,  -- 'Summer Grind', 'March Madness', etc.
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  rewards JSONB DEFAULT '[]',  -- [{rank_range, reward_type, reward_data}]
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.season_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  season_xp INTEGER DEFAULT 0,
  season_level INTEGER DEFAULT 1,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond', 'elite')),
  rank INTEGER,
  rewards_claimed JSONB DEFAULT '[]',
  UNIQUE(user_id, season_id)
);

-- ==========================================
-- 7. CREWS (Teams/Squads)
-- ==========================================

CREATE TABLE public.crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tag TEXT UNIQUE NOT NULL CHECK (char_length(tag) BETWEEN 2 AND 6),
  description TEXT,
  avatar_url TEXT,
  -- Stats
  total_xp INTEGER DEFAULT 0,
  avg_rating FLOAT DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  -- Settings
  max_members INTEGER DEFAULT 5,
  is_public BOOLEAN DEFAULT true,
  -- Meta
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('captain', 'co-captain', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

CREATE TABLE public.crew_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_crew_id UUID REFERENCES public.crews(id) ON DELETE CASCADE,
  challenged_crew_id UUID REFERENCES public.crews(id) ON DELETE CASCADE,
  -- Challenge
  metric TEXT NOT NULL,
  duration_days INTEGER DEFAULT 7,
  -- Results
  challenger_score FLOAT DEFAULT 0,
  challenged_score FLOAT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'declined')),
  winner_crew_id UUID REFERENCES public.crews(id) ON DELETE SET NULL,
  -- Meta
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 8. ADVANCED ANALYTICS CACHE
-- ==========================================

CREATE TABLE public.advanced_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  -- NBA-Grade Metrics
  points_per_possession FLOAT,
  shot_quality_avg FLOAT,  -- Expected FG% based on shot difficulty
  clutch_rating FLOAT,  -- 0-100
  court_balance_index FLOAT,  -- 0-100 (how balanced across zones)
  offensive_rating FLOAT,
  defensive_rating FLOAT,
  -- Efficiency
  true_shooting_pct FLOAT,
  effective_fg_pct FLOAT,
  -- Streaks
  longest_make_streak INTEGER DEFAULT 0,
  longest_miss_streak INTEGER DEFAULT 0,
  hot_zones JSONB DEFAULT '[]',  -- zones with >50% FG
  cold_zones JSONB DEFAULT '[]', -- zones with <30% FG
  -- Momentum
  momentum_shifts JSONB DEFAULT '[]',  -- [{minute, direction, trigger}]
  peak_performance_window JSONB,  -- {start_min, end_min, fg_pct, mental}
  -- Comparison
  percentile_shooting FLOAT,  -- vs all users
  percentile_mental FLOAT,
  percentile_overall FLOAT,
  -- Meta
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_shot_dna_user ON public.shot_dna(user_id);
CREATE INDEX idx_shot_signatures_user ON public.shot_signatures(user_id);
CREATE INDEX idx_shot_signatures_session ON public.shot_signatures(session_id);
CREATE INDEX idx_predictions_user ON public.predictions(user_id);
CREATE INDEX idx_predictions_type ON public.predictions(type);
CREATE INDEX idx_training_plans_user ON public.training_plans(user_id);
CREATE INDEX idx_training_plans_active ON public.training_plans(active);
CREATE INDEX idx_training_completions_plan ON public.training_completions(plan_id);
CREATE INDEX idx_coach_conversations_user ON public.coach_conversations(user_id);
CREATE INDEX idx_coach_messages_conversation ON public.coach_messages(conversation_id);
CREATE INDEX idx_recovery_logs_user_date ON public.recovery_logs(user_id, date DESC);
CREATE INDEX idx_quests_type ON public.quests(quest_type);
CREATE INDEX idx_user_quests_user ON public.user_quests(user_id);
CREATE INDEX idx_user_quests_status ON public.user_quests(status);
CREATE INDEX idx_skill_tree_category ON public.skill_tree_nodes(category);
CREATE INDEX idx_user_skill_tree_user ON public.user_skill_tree(user_id);
CREATE INDEX idx_season_progress_user ON public.season_progress(user_id);
CREATE INDEX idx_season_progress_season ON public.season_progress(season_id);
CREATE INDEX idx_crews_tag ON public.crews(tag);
CREATE INDEX idx_crew_members_user ON public.crew_members(user_id);
CREATE INDEX idx_crew_members_crew ON public.crew_members(crew_id);
CREATE INDEX idx_advanced_analytics_user ON public.advanced_analytics(user_id);
CREATE INDEX idx_advanced_analytics_session ON public.advanced_analytics(session_id);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.shot_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_tree_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skill_tree ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advanced_analytics ENABLE ROW LEVEL SECURITY;

-- Users can manage their own data
CREATE POLICY "shot_dna_own" ON public.shot_dna FOR ALL USING (user_id = auth.uid());
CREATE POLICY "shot_signatures_own" ON public.shot_signatures FOR ALL USING (user_id = auth.uid());
CREATE POLICY "predictions_own" ON public.predictions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "training_plans_own" ON public.training_plans FOR ALL USING (user_id = auth.uid());
CREATE POLICY "training_completions_own" ON public.training_completions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "coach_conversations_own" ON public.coach_conversations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "coach_messages_own" ON public.coach_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.coach_conversations WHERE id = coach_messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "recovery_logs_own" ON public.recovery_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_quests_own" ON public.user_quests FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_skill_tree_own" ON public.user_skill_tree FOR ALL USING (user_id = auth.uid());
CREATE POLICY "season_progress_own" ON public.season_progress FOR ALL USING (user_id = auth.uid());
CREATE POLICY "advanced_analytics_own" ON public.advanced_analytics FOR ALL USING (user_id = auth.uid());

-- Public read
CREATE POLICY "quests_read" ON public.quests FOR SELECT USING (true);
CREATE POLICY "skill_tree_read" ON public.skill_tree_nodes FOR SELECT USING (true);
CREATE POLICY "seasons_read" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "crews_read" ON public.crews FOR SELECT USING (true);
CREATE POLICY "crew_members_read" ON public.crew_members FOR SELECT USING (true);
CREATE POLICY "crew_challenges_read" ON public.crew_challenges FOR SELECT USING (true);

-- Crew management
CREATE POLICY "crew_manage" ON public.crews FOR ALL USING (created_by = auth.uid());
CREATE POLICY "crew_members_manage" ON public.crew_members FOR ALL USING (user_id = auth.uid());

-- ==========================================
-- SEED DATA — Quests
-- ==========================================

INSERT INTO public.quests (slug, title, description, emoji, quest_type, category, condition_type, condition_value, condition_timeframe, xp_reward, difficulty) VALUES
  -- Daily Quests
  ('daily_session', 'Session du Jour', 'Complète une session d''entraînement aujourd''hui', '🏀', 'daily', 'consistency', 'sessions_today', 1, 'today', 20, 1),
  ('daily_50_shots', '50 Tirs', 'Prends au moins 50 tirs aujourd''hui', '🎯', 'daily', 'shooting', 'shots_today', 50, 'today', 25, 2),
  ('daily_mental_70', 'Mental Fort', 'Maintiens un score mental > 70 sur ta session', '🧠', 'daily', 'mental', 'mental_score_above', 70, 'today', 30, 2),
  ('daily_recovery_log', 'Check-in Récup', 'Log ta récupération du jour', '💤', 'daily', 'fitness', 'recovery_logged', 1, 'today', 10, 1),
  -- Weekly Quests
  ('weekly_5_sessions', 'Grindeur', 'Complète 5 sessions cette semaine', '💪', 'weekly', 'consistency', 'sessions_week', 5, 'this_week', 100, 3),
  ('weekly_200_shots', 'Bombardier', 'Prends 200 tirs cette semaine', '💣', 'weekly', 'shooting', 'shots_week', 200, 'this_week', 75, 2),
  ('weekly_improve_zone', 'Zone Killer', 'Améliore ton % de tir dans ta pire zone', '📈', 'weekly', 'shooting', 'worst_zone_improve', 5, 'this_week', 120, 4),
  ('weekly_complete_plan', 'Plan Respecté', 'Complète tous les jours de ton plan d''entraînement', '✅', 'weekly', 'consistency', 'plan_completion', 100, 'this_week', 150, 3),
  -- Monthly Quests
  ('monthly_1000_shots', 'Mitrailleur', 'Prends 1000 tirs ce mois-ci', '🔥', 'monthly', 'shooting', 'shots_month', 1000, 'this_month', 300, 3),
  ('monthly_mental_master', 'Maître Zen', 'Score mental moyen > 80 sur le mois', '🧘', 'monthly', 'mental', 'avg_mental_month', 80, 'this_month', 400, 4),
  ('monthly_community', 'Leader', 'Gagne 3 challenges communautaires', '🏆', 'monthly', 'social', 'challenges_won_month', 3, 'this_month', 350, 4),
  -- Legendary
  ('legend_10000_shots', 'Légende des 10K', 'Prends 10 000 tirs au total', '👑', 'legendary', 'shooting', 'total_shots', 10000, 'alltime', 1000, 5),
  ('legend_365_streak', 'Streak Annuelle', 'Joue 365 jours consécutifs', '🔥', 'legendary', 'consistency', 'consecutive_days', 365, 'alltime', 5000, 5),
  ('legend_twin_99', 'Perfection', 'Atteins un Digital Twin noté 99+', '💎', 'legendary', 'shooting', 'twin_rating', 99, 'alltime', 2000, 5)
ON CONFLICT (slug) DO NOTHING;

-- ==========================================
-- SEED DATA — Skill Tree
-- ==========================================

INSERT INTO public.skill_tree_nodes (slug, name, description, emoji, category, tier, unlock_condition_type, unlock_condition_value, sort_order) VALUES
  -- Shooting tree
  ('shoot_t1_basics', 'Fondamentaux du Tir', 'Maîtrise la mécanique de base', '🏀', 'shooting', 1, 'sessions_count', 3, 1),
  ('shoot_t2_midrange', 'Mid-Range', 'Deviens fiable à mi-distance', '🎯', 'shooting', 2, 'midrange_pct', 40, 2),
  ('shoot_t2_corner', 'Corner Specialist', 'Domine les corners', '📐', 'shooting', 2, 'corner3_pct', 35, 3),
  ('shoot_t3_off_dribble', 'Pull-Up Master', 'Tire en sortie de dribble', '⚡', 'shooting', 3, 'total_shots', 500, 4),
  ('shoot_t3_catch_shoot', 'Catch & Shoot', 'Tire instantanément sur catch', '💨', 'shooting', 3, 'shot_consistency', 70, 5),
  ('shoot_t4_deep_range', 'Deep Range', 'Tire bien au-delà de la ligne', '🎆', 'shooting', 4, 'top3_pct', 35, 6),
  ('shoot_t5_splash', 'Splash Master', 'Tireur d''élite absolu', '💦', 'shooting', 5, 'overall_shooting_pct', 50, 7),
  -- Mental tree
  ('mental_t1_awareness', 'Conscience de soi', 'Commence à comprendre ton mental', '🧠', 'mental', 1, 'sessions_count', 5, 1),
  ('mental_t2_resilience', 'Résilience', 'Rebondis après les échecs', '💪', 'mental', 2, 'mental_score', 65, 2),
  ('mental_t3_clutch', 'Clutch Gene', 'Perds jamais tes moyens', '🧊', 'mental', 3, 'clutch_rating', 70, 3),
  ('mental_t4_flow', 'Flow State', 'Entre dans la zone', '🌊', 'mental', 4, 'mental_score', 85, 4),
  ('mental_t5_zen', 'Zen Master', 'Contrôle mental total', '🧘', 'mental', 5, 'mental_score', 95, 5),
  -- Physical tree
  ('phys_t1_endurance', 'Endurance de Base', 'Tiens un match complet', '🏃', 'physical', 1, 'sessions_count', 5, 1),
  ('phys_t2_stamina', 'Stamina', 'Maintiens ton niveau en fin de match', '⚡', 'physical', 2, 'fatigue_resistance', 60, 2),
  ('phys_t3_recovery', 'Machine de Récup', 'Récupère comme un pro', '💤', 'physical', 3, 'recovery_logs', 30, 3),
  ('phys_t4_iron', 'Iron Man', '50 sessions sans blessure', '🦾', 'physical', 4, 'sessions_count', 50, 4),
  -- Tactical tree
  ('tact_t1_spacing', 'Spacing', 'Comprends les espaces du terrain', '📊', 'tactical', 1, 'zone_variety', 4, 1),
  ('tact_t2_shot_select', 'Shot Selection', 'Prends les bons tirs', '🎯', 'tactical', 2, 'shot_quality_avg', 60, 2),
  ('tact_t3_adaptability', 'Adaptabilité', 'Change ton jeu selon la situation', '🔄', 'tactical', 3, 'zone_improvement_count', 3, 3),
  -- Leadership
  ('lead_t1_team', 'Coéquipier', 'Rejoins un Crew', '🤝', 'leadership', 1, 'crew_joined', 1, 1),
  ('lead_t2_mentor', 'Mentor', 'Aide 5 joueurs avec des tips', '🎓', 'leadership', 2, 'followers_count', 10, 2),
  ('lead_t3_captain', 'Capitaine', 'Deviens capitaine de Crew', '🏴', 'leadership', 3, 'crew_captain', 1, 3)
ON CONFLICT (slug) DO NOTHING;

-- ==========================================
-- FUNCTIONS — Recovery Score Computation
-- ==========================================

CREATE OR REPLACE FUNCTION public.compute_recovery_score(
  p_sleep_hours FLOAT,
  p_sleep_quality INTEGER,
  p_energy_level INTEGER,
  p_muscle_soreness INTEGER,
  p_stress_level INTEGER,
  p_hrv FLOAT DEFAULT NULL,
  p_resting_hr INTEGER DEFAULT NULL
)
RETURNS FLOAT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score FLOAT := 0;
  sleep_score FLOAT;
  soreness_inv FLOAT;
  stress_inv FLOAT;
BEGIN
  -- Sleep: 7-9h = optimal (30% weight)
  sleep_score := LEAST(1.0, p_sleep_hours / 8.0) * (p_sleep_quality / 5.0);
  score := score + sleep_score * 30;

  -- Energy (20% weight)
  score := score + (p_energy_level / 10.0) * 20;

  -- Soreness inversé (15% weight, moins = mieux)
  soreness_inv := (6 - p_muscle_soreness) / 5.0;
  score := score + soreness_inv * 15;

  -- Stress inversé (15% weight)
  stress_inv := (6 - p_stress_level) / 5.0;
  score := score + stress_inv * 15;

  -- HRV bonus (10% weight, si disponible)
  IF p_hrv IS NOT NULL THEN
    score := score + LEAST(1.0, p_hrv / 80.0) * 10;
  ELSE
    score := score + 5; -- neutral if not provided
  END IF;

  -- Resting HR bonus (10% weight, lower = better)
  IF p_resting_hr IS NOT NULL THEN
    score := score + GREATEST(0, (1.0 - (p_resting_hr - 45.0) / 40.0)) * 10;
  ELSE
    score := score + 5;
  END IF;

  RETURN ROUND(LEAST(100, GREATEST(0, score))::numeric, 1);
END;
$$;
