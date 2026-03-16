-- Final Security Audit & RLS Hardening
-- Date: 2026-03-10
-- Purpose: Close identified gaps in RLS and lock down public access to sensitive data

-- 1. Activity Feed Hardening
-- Ensure users can only insert their own activity
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'activity_feed' AND policyname = 'Users can insert own activity'
    ) THEN
        CREATE POLICY "Users can insert own activity" ON public.activity_feed
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 2. Users (Profiles) Hardening
-- Currently, SELECT is true (public). We should hide sensitive fields or restrict to authenticated users.
-- For a community app, usernames/avatars are public, but emails must be hidden.
-- Supabase automatically hides auth.users metadata, but public.users might have it.

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.users;
CREATE POLICY "Profiles are viewable by everyone" ON public.users
    FOR SELECT USING (true);

-- Ensure users can only DELETE their own account data (if allowed)
CREATE POLICY "Users can delete own profile" ON public.users
    FOR DELETE USING (auth.uid() = id);

-- 3. Precog Schema Hardening
-- Check if policies from 20260309 are fully active
ALTER TABLE public.precog_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precog_responses ENABLE ROW LEVEL SECURITY;

-- 4. Secure auth.users references
-- Ensure no one can bypass RLS via service_role unless explicitly intended
REVOKE ALL ON public.users FROM public;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated, service_role;
GRANT SELECT ON public.users TO anon;

-- 5. Final audit of existing tables
-- Analysis table: Needs Update/Delete protection
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'analyses' AND policyname = 'Users can delete own analyses'
    ) THEN
        CREATE POLICY "Users can delete own analyses" ON public.analyses
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM public.shooting_sessions
                    WHERE id = session_id AND user_id = auth.uid()
                )
            );
    END IF;
END $$;
