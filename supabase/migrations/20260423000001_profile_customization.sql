-- Profile personalization: banner image + color theme

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_color TEXT;

-- Banners storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for banners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'banners_public_read'
  ) THEN
    CREATE POLICY "banners_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'banners');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'banners_user_upload'
  ) THEN
    CREATE POLICY "banners_user_upload" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'banners'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'banners_user_update'
  ) THEN
    CREATE POLICY "banners_user_update" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'banners'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'banners_user_delete'
  ) THEN
    CREATE POLICY "banners_user_delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'banners'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
