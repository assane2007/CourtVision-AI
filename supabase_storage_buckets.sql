-- ═══════════════════════════════════════════════════════════════════════════
-- CourtVision AI — Supabase Storage Buckets
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this SQL in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable the storage extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert storage buckets (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('courtvision', 'courtvision', true, 524288000, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Storage Policies (RLS) ─────────────────────────────────────────────────

CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN ('avatars', 'videos', 'thumbnails', 'feed')
  );

CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'courtvision');

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
  );