-- Database Optimization for CourtVision-AI
-- Purpose: Speed up dashboard queries and history lookups

-- 1. Index for User Session History (used in dashboard and trends)
CREATE INDEX IF NOT EXISTS idx_shooting_sessions_user_id_created_at 
ON public.shooting_sessions (user_id, created_at DESC);

-- 2. Index for Session Shots (used when viewing session details)
CREATE INDEX IF NOT EXISTS idx_session_shots_session_id 
ON public.session_shots (session_id);

-- 3. Index for Analysis matching (used in background pipeline)
CREATE INDEX IF NOT EXISTS idx_analyses_session_id 
ON public.analyses (session_id);

-- 4. Index for Shot DNA similarity searches
CREATE INDEX IF NOT EXISTS idx_shot_dna_similarity 
ON public.shot_dna (dna_nba_similarity DESC);

-- 5. Index for Activity Feed performance
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id_created_at
ON public.activity_feed (user_id, created_at DESC);

-- 6. Grant read permissions for analytical roles (Investor Reporting)
-- COMMENTED OUT: Should be run by DB Admin
-- GRANT SELECT ON public.advanced_analytics TO anon, authenticated;
