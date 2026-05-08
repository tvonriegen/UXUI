-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Fix likes double-count bug
-- Date: 2026-05-07
-- Root cause: toggle_post_like RPC manually updated posts.likes_count AND
--   the trg_sync_likes trigger also updated it — both fired on every like,
--   incrementing the counter twice (+2 instead of +1).
-- Fix: Remove the redundant manual UPDATEs from the RPC; let the trigger
--   be the single source of truth for the counter.
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION toggle_post_like(p_post_id UUID, p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already BOOLEAN;
  v_count   INT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM post_likes
    WHERE post_id = p_post_id AND user_id = p_user_id
  ) INTO v_already;

  IF v_already THEN
    DELETE FROM post_likes WHERE post_id = p_post_id AND user_id = p_user_id;
    -- trg_sync_likes trigger handles likes_count - 1
  ELSE
    INSERT INTO post_likes (post_id, user_id) VALUES (p_post_id, p_user_id)
    ON CONFLICT DO NOTHING;
    -- trg_sync_likes trigger handles likes_count + 1
  END IF;

  -- Allow trigger to finish before we read back the count
  SELECT likes_count INTO v_count FROM posts WHERE id = p_post_id;
  RETURN COALESCE(v_count, 0);
END;
$$;

NOTIFY pgrst, 'reload schema';
