-- ═══════════════════════════════════════════════════════════
-- Migration: Storage Bucket RLS — avatars + post-media
-- Date: 2026-04-10
-- Run this in the Supabase SQL Editor after creating the
-- buckets manually (Storage → New Bucket):
--   • avatars    (public: true)
--   • post-media (public: true)
-- ═══════════════════════════════════════════════════════════

-- ─── avatars bucket policies ──────────────────────────────

-- Anyone (including unauthenticated visitors) can read avatars
DROP POLICY IF EXISTS "avatars_public_select"  ON storage.objects;
CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Only the authenticated owner can upload/update their own avatar
-- Path convention: <user_id>/avatar.<ext>
DROP POLICY IF EXISTS "avatars_owner_insert"  ON storage.objects;
CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_owner_update"  ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_owner_delete"  ON storage.objects;
CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── post-media bucket policies ───────────────────────────

DROP POLICY IF EXISTS "post_media_public_select"  ON storage.objects;
CREATE POLICY "post_media_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post_media_owner_insert"  ON storage.objects;
CREATE POLICY "post_media_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "post_media_owner_delete"  ON storage.objects;
CREATE POLICY "post_media_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── Reload PostgREST schema cache ───────────────────────
NOTIFY pgrst, 'reload schema';
