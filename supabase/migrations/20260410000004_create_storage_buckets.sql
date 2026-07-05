-- ═══════════════════════════════════════════════════════════
-- Migration: Create Storage Buckets + enforce RLS policies
-- Date: 2026-04-10
-- Idempotent: safe to re-run. Supersedes the policy-only file
-- 20260410000001_storage_rls.sql (buckets must exist first).
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Create buckets ───────────────────────────────────────────────
-- ON CONFLICT DO NOTHING makes this re-runnable without error.
-- Bucket settings:
--   public          → public CDN URLs work without a signed token
--   file_size_limit → 5 MB for avatars, 10 MB for post media
--   allowed_mime_types → enforced by the storage service before RLS runs

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,   -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE
  SET public             = true,
      file_size_limit    = 10485760,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif',
                                 'video/mp4', 'video/webm', 'video/quicktime'];

-- ─── 2. RLS policies — avatars ───────────────────────────────────────
-- Path convention expected by the app: <user_id>/avatar.<ext>
-- storage.foldername(name)[1] extracts the first path segment (the user ID).

DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── 3. RLS policies — post-media ────────────────────────────────────
-- Path convention: <user_id>/<filename>

DROP POLICY IF EXISTS "post_media_public_select" ON storage.objects;
CREATE POLICY "post_media_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post_media_owner_insert" ON storage.objects;
CREATE POLICY "post_media_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "post_media_owner_update" ON storage.objects;
CREATE POLICY "post_media_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "post_media_owner_delete" ON storage.objects;
CREATE POLICY "post_media_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── 4. Ensure profiles.avatar column can hold a full public URL ──────
-- The column already exists as TEXT NOT NULL DEFAULT ''.
-- This is a safety net in case a prior schema variation used avatar_url.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- If an avatar_url alias column exists from a schema variant, backfill avatar from it.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    UPDATE profiles SET avatar = avatar_url WHERE avatar = '' AND avatar_url <> '';
  END IF;
END $$;

-- ─── 5. Reload PostgREST schema cache ────────────────────────────────
NOTIFY pgrst, 'reload schema';
