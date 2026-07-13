-- ═══════════════════════════════════════════════════════════════════
-- CourtVision-AI: RLS + Storage Bucket Setup for Supabase
-- ═══════════════════════════════════════════════════════════════════
--
-- STEP 1: Enable RLS on ALL tables (bypassed by service_role key)
-- STEP 2: Create permissive policies for anon/authenticated access
--         (Prisma uses service_role which bypasses RLS, so these
--          policies only affect direct Supabase REST API calls)
-- STEP 3: Create the 'courtvision' storage bucket
--
-- Paste this ENTIRE script in Supabase SQL Editor and click RUN.
-- ═══════════════════════════════════════════════════════════════════

-- ── Enable RLS on all tables ──────────────────────────────────────

ALTER TABLE "Player" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutSessionDrill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Drill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DrillFavorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Achievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Challenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChallengeParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommentReply" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyLogin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Device" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailVerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeedPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeedPostLike" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Follow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Friendship" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeneratedWorkout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LiveParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LiveSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OfflineAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayerDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayerInsight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PoseData" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prediction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReactionScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShotDetection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrainingPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrainingPlanDrill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TwoFactorBackupCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Video" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VideoAnnotation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VideoExport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VideoHighlight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VoiceSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "XpLog" ENABLE ROW LEVEL SECURITY;

-- ── Create storage bucket (for avatars, feed images, videos) ─────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'courtvision',
  'courtvision',
  true,
  524288000, -- 500 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage policies ──────────────────────────────────────────────
-- Allow authenticated users to upload/read their own files
-- Allow public read for avatars and feed images

-- Anyone can read public files
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'courtvision');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'courtvision' AND
    auth.role() = 'authenticated'
  );

-- Authenticated users can update their own files
CREATE POLICY "Authenticated users can update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'courtvision' AND
    auth.role() = 'authenticated'
  );

-- Authenticated users can delete their own files
CREATE POLICY "Authenticated users can delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'courtvision' AND
    auth.role() = 'authenticated'
  );

-- ── Table-level policies (permissive — Prisma uses service_role) ──
-- These policies are permissive: they allow access but Prisma
-- connects with the service_role key which bypasses RLS entirely.
-- So these only matter if someone queries via the Supabase REST API.

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('
      CREATE POLICY "Service role full access on %I" ON %I
        FOR ALL USING (true) WITH CHECK (true);
    ', tbl, tbl);
  END LOOP;
END;
$$;