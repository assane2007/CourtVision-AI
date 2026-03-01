-- ==========================================
-- CourtVision AI — Performance Indexes
-- M-4, M-5, M-6: Composite indexes for hot query paths
-- ==========================================

-- M-4: Sessions lookup by user + status (used by dashboard, analytics, refresh-stats)
CREATE INDEX IF NOT EXISTS idx_sessions_user_status
    ON public.sessions (user_id, status);

-- M-4b: Sessions with created_at for date-range queries (weekly digest, history)
CREATE INDEX IF NOT EXISTS idx_sessions_user_created
    ON public.sessions (user_id, created_at DESC);

-- M-5: Activity feed pagination by user (community feed, profile)
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_created
    ON public.activity_feed (user_id, created_at DESC);

-- M-6: Predictions lookup by user + validation status
CREATE INDEX IF NOT EXISTS idx_predictions_user_validated
    ON public.predictions (user_id, validated);

-- Additional performance indexes for common query patterns:

-- Analyses lookup by session (used after video processing, analysis screen)
CREATE INDEX IF NOT EXISTS idx_analyses_session
    ON public.analyses (session_id);

-- Analyses by user for aggregate stats
CREATE INDEX IF NOT EXISTS idx_analyses_user
    ON public.analyses (user_id);

-- Shot signatures: hot path for Shot DNA computation
CREATE INDEX IF NOT EXISTS idx_shot_signatures_user_session
    ON public.shot_signatures (user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_shot_signatures_user_zone
    ON public.shot_signatures (user_id, zone);

-- Subscriptions by Stripe subscription ID (webhook lookups)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id
    ON public.subscriptions (stripe_subscription_id);

-- User follows: bidirectional lookups
CREATE INDEX IF NOT EXISTS idx_user_follows_follower
    ON public.user_follows (follower_id);

CREATE INDEX IF NOT EXISTS idx_user_follows_following
    ON public.user_follows (following_id);

-- Challenge submissions: lookup by challenge for leaderboard
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge
    ON public.challenge_submissions (challenge_id, value DESC);

-- Notifications by user for pagination
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON public.notifications (user_id, created_at DESC);

-- User badges by user
CREATE INDEX IF NOT EXISTS idx_user_badges_user
    ON public.user_badges (user_id);

-- Crew members by crew for leaderboard
CREATE INDEX IF NOT EXISTS idx_crew_members_crew
    ON public.crew_members (crew_id);

-- Public profiles by XP for global leaderboard
CREATE INDEX IF NOT EXISTS idx_public_profiles_xp
    ON public.public_profiles (xp DESC);
