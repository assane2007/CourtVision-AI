-- ==========================================
-- CourtVision AI — Arena shot idempotency
-- ==========================================

-- Add optional client event id for at-least-once delivery retries.
ALTER TABLE public.arena_shot_log
  ADD COLUMN IF NOT EXISTS client_event_id TEXT;

-- Ignore duplicate retries for the same player + match + client event id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_arena_shot_log_match_user_event
  ON public.arena_shot_log(match_id, user_id, client_event_id)
  WHERE client_event_id IS NOT NULL;
