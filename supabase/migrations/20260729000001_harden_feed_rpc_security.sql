-- Keep feed RPCs invoker-secure. Only the counter triggers need to bypass the
-- post owner's UPDATE policy when a user likes or comments on another user's post.

CREATE OR REPLACE FUNCTION public.sync_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

ALTER FUNCTION public.toggle_post_like(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.add_post_comment(uuid, uuid, text) SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.sync_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_comments_count() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
