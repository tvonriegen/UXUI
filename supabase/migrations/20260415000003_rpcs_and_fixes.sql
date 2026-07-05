-- ═══════════════════════════════════════════════════════════════════════
-- Migration: RPCs, counter triggers, RLS fixes & reputation view
-- Date: 2026-04-15
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1 – ATOMIC LIKE TOGGLE RPC
-- Avoids race conditions on posts.likes_count by doing the insert/delete
-- and the counter update in a single server-side transaction.
-- Returns the new likes_count.
-- ─────────────────────────────────────────────────────────────────────

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
    UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = p_post_id;
  ELSE
    INSERT INTO post_likes (post_id, user_id) VALUES (p_post_id, p_user_id)
    ON CONFLICT DO NOTHING;
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = p_post_id;
  END IF;

  SELECT likes_count INTO v_count FROM posts WHERE id = p_post_id;
  RETURN COALESCE(v_count, 0);
END;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2 – ATOMIC ADD COMMENT RPC
-- Inserts the comment and atomically increments comments_count.
-- Returns the new comment row with author profile embedded.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION add_post_comment(
  p_post_id  UUID,
  p_user_id  UUID,
  p_content  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_id UUID;
  v_author     JSONB;
  v_created_at TIMESTAMPTZ;
BEGIN
  INSERT INTO post_comments (post_id, author_id, content)
  VALUES (p_post_id, p_user_id, p_content)
  RETURNING id, created_at INTO v_comment_id, v_created_at;

  UPDATE posts SET comments_count = comments_count + 1 WHERE id = p_post_id;

  SELECT jsonb_build_object('name', name, 'avatar', avatar, 'role', role)
  INTO v_author FROM profiles WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'id',         v_comment_id,
    'post_id',    p_post_id,
    'author_id',  p_user_id,
    'content',    p_content,
    'created_at', v_created_at,
    'profiles',   v_author
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 3 – TRIGGER: decrement comments_count on comment delete
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_comment_deleted()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_deleted ON post_comments;
CREATE TRIGGER trg_comment_deleted
AFTER DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION trg_fn_comment_deleted();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 4 – profiles: ensure companies can read any profile
-- (Required so nested selects on job_applications → profiles work)
-- ─────────────────────────────────────────────────────────────────────

-- Drop the overly-restrictive variant if it exists, then add a public-read policy
DROP POLICY IF EXISTS "profiles_select_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_select_all"   ON profiles;
DROP POLICY IF EXISTS "profiles_public_select" ON profiles;

-- Every authenticated user can read every profile (name, avatar, specialty etc.)
-- This is required for the talent directory, company applicant views, and
-- nested selects inside job_applications.
CREATE POLICY "profiles_public_select" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 5 – job_applications: company can read applications for their jobs
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "applications_select" ON job_applications;

CREATE POLICY "applications_select" ON job_applications
  FOR SELECT USING (
    -- The applicant sees their own applications
    auth.uid() = applicant_id
    -- The company that owns the job posting sees all its applications
    OR EXISTS (
      SELECT 1 FROM job_postings jp
      WHERE jp.id = job_id AND jp.company_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 6 – REPUTATION VIEW
-- Replaces the ad-hoc point system with a deterministic calculation:
--   validated skills  × 100
--   hired applications × 150  (completed internship)
--   earned badges      × 25
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW student_reputation_v AS
SELECT
  p.id                                                  AS student_id,
  p.name,
  p.specialty,
  p.school_id,
  p.avatar,

  -- Skills validated by their school
  COALESCE(sv.validated_count, 0)                       AS validated_skills,

  -- Completed internships (hired by a company)
  COALESCE(hi.hired_count, 0)                           AS completed_internships,

  -- Badges earned
  COALESCE(ub.badge_count, 0)                           AS earned_badges,

  -- Total reputation score (deterministic)
  (
    COALESCE(sv.validated_count, 0) * 100 +
    COALESCE(hi.hired_count, 0)     * 150 +
    COALESCE(ub.badge_count, 0)     * 25
  )                                                     AS reputation_score

FROM profiles p

LEFT JOIN (
  SELECT student_id, COUNT(*) AS validated_count
  FROM skill_validations
  GROUP BY student_id
) sv ON sv.student_id = p.id

LEFT JOIN (
  SELECT applicant_id AS student_id, COUNT(*) AS hired_count
  FROM job_applications
  WHERE status = 'hired'
  GROUP BY applicant_id
) hi ON hi.student_id = p.id

LEFT JOIN (
  SELECT user_id, COUNT(*) AS badge_count
  FROM user_badges
  GROUP BY user_id
) ub ON ub.user_id = p.id

WHERE p.role IN ('Estudiante', 'Egresado');


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 7 – FUNCTION: sync reputation_score from the view to profiles
-- Call this to refresh the denormalised column in bulk.
-- The triggers added in migration 20260415000002 handle incremental updates.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_all_reputation_scores()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles p
  SET reputation_score = v.reputation_score
  FROM student_reputation_v v
  WHERE p.id = v.student_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 8 – Dynamic trending tags helper function
-- Called by the frontend to get real post counts per tag.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_trending_tags(p_limit INT DEFAULT 10)
RETURNS TABLE(tag TEXT, post_count BIGINT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT tag, COUNT(*) AS post_count
  FROM posts
  WHERE tag IS NOT NULL AND tag <> ''
  GROUP BY tag
  ORDER BY post_count DESC, tag
  LIMIT p_limit;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 9 – Notify PostgREST
-- ─────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
