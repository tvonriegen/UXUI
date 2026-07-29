-- Restore only the feed RPC contract used by FeedPage.
-- This migration intentionally does not change tables, policies or triggers.
-- Counter columns remain owned by the existing sync_likes_count and
-- sync_comments_count triggers.

CREATE OR REPLACE FUNCTION public.get_trending_tags(p_limit integer DEFAULT 10)
RETURNS TABLE(tag text, post_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT p.tag, count(*)::bigint AS post_count
  FROM public.posts AS p
  WHERE p.tag IS NOT NULL AND p.tag <> ''
  GROUP BY p.tag
  ORDER BY post_count DESC, p.tag
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
-- Required because the existing counter trigger updates posts owned by
-- another user. The auth.uid() binding below prevents impersonation.
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
  v_count integer;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'p_user_id must match the authenticated user';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.post_likes
    WHERE post_id = p_post_id AND user_id = v_user_id
  ) THEN
    DELETE FROM public.post_likes
    WHERE post_id = p_post_id AND user_id = v_user_id;
  ELSE
    INSERT INTO public.post_likes (post_id, user_id)
    VALUES (p_post_id, v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT COALESCE(p.likes_count, 0)
  INTO v_count
  FROM public.posts AS p
  WHERE p.id = p_post_id;

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_post_comment(
  p_post_id uuid,
  p_user_id uuid,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
-- Required because the existing counter trigger updates posts owned by
-- another user. The auth.uid() binding below prevents impersonation.
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
  v_comment_id uuid;
  v_author jsonb;
  v_created_at timestamptz;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'p_user_id must match the authenticated user';
  END IF;

  INSERT INTO public.post_comments (post_id, author_id, content)
  VALUES (p_post_id, v_user_id, p_content)
  RETURNING id, created_at INTO v_comment_id, v_created_at;

  SELECT jsonb_build_object(
    'name', p.name,
    'avatar', p.avatar,
    'role', p.role
  )
  INTO v_author
  FROM public.profiles AS p
  WHERE p.id = v_user_id;

  RETURN jsonb_build_object(
    'id', v_comment_id,
    'post_id', p_post_id,
    'author_id', v_user_id,
    'content', p_content,
    'created_at', v_created_at,
    'profiles', v_author
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_trending_tags(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_trending_tags(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_tags(integer) TO authenticated;

REVOKE ALL ON FUNCTION public.toggle_post_like(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_post_like(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_post_like(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.add_post_comment(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_post_comment(uuid, uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_post_comment(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
