-- packages/database/migration_v7_streaks.sql
-- Adds user streak tracking fields used by mobile dashboard and session completion hooks.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_session_at TIMESTAMPTZ;

UPDATE public.users
SET
  streak = COALESCE(streak, 0),
  longest_streak = COALESCE(longest_streak, 0)
WHERE streak IS NULL OR longest_streak IS NULL;
