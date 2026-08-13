-- Reconcile Storage buckets and ownership policies after TalentHub Staging drift.
-- Forward-only and idempotent: updates bucket metadata and replaces only the
-- named policies. Objects are never deleted or modified by this migration.

-- Bucket metadata is authoritative in Git so a manually repaired staging
-- project converges with the application contract on the next migration run.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policy replacement is limited to RLS definitions; it does not touch objects.
-- Public buckets keep URL/CDN reads working without exposing storage.objects
-- to unauthenticated REST enumeration.
DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;

DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "banners_public_select" ON storage.objects;
DROP POLICY IF EXISTS "banners_public_read" ON storage.objects;
DROP POLICY IF EXISTS "banners_user_upload" ON storage.objects;
DROP POLICY IF EXISTS "banners_user_update" ON storage.objects;
DROP POLICY IF EXISTS "banners_user_delete" ON storage.objects;

DROP POLICY IF EXISTS "banners_owner_insert" ON storage.objects;
CREATE POLICY "banners_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'banners'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "banners_owner_update" ON storage.objects;
CREATE POLICY "banners_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'banners'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'banners'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "banners_owner_delete" ON storage.objects;
CREATE POLICY "banners_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'banners'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "post_media_public_select" ON storage.objects;

DROP POLICY IF EXISTS "post_media_owner_insert" ON storage.objects;
CREATE POLICY "post_media_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "post_media_owner_update" ON storage.objects;
CREATE POLICY "post_media_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'post-media'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'post-media'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "post_media_owner_delete" ON storage.objects;
CREATE POLICY "post_media_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'post-media'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

NOTIFY pgrst, 'reload schema';
