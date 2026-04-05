-- CourtVision coach chat schema compatibility
-- This migration is idempotent and aligns the DB schema with packages/api/src/routes/coachChat.ts.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.coach_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT,
    context TEXT,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    message_count INTEGER NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coach_conversations
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS context TEXT,
    ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'coach_conversations'
          AND column_name = 'context_type'
    ) THEN
        EXECUTE '
            UPDATE public.coach_conversations
            SET context = COALESCE(context, context_type)
        ';
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'coach_conversations_context_check'
          AND conrelid = 'public.coach_conversations'::regclass
    ) THEN
        ALTER TABLE public.coach_conversations
            ADD CONSTRAINT coach_conversations_context_check
            CHECK (context IN ('general', 'session_review', 'training', 'pre_game', 'film_room', 'technique'));
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_coach_conversations_user
    ON public.coach_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_coach_conversations_last_message_at
    ON public.coach_conversations(last_message_at DESC);

ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'coach_conversations'
          AND policyname = 'coach_conversations_own'
    ) THEN
        CREATE POLICY coach_conversations_own
            ON public.coach_conversations
            FOR ALL
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END;
$$;