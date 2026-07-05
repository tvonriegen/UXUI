-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Fix award_badge_if_missing boolean = integer type error
-- Date: 2026-04-21
--
-- Root cause: award_badge_if_missing (20260415000002) declared v_inserted
-- as BOOLEAN but assigned it from GET DIAGNOSTICS ROW_COUNT (integer).
-- The subsequent `IF v_inserted = 0` then fails with
-- "operator does not exist: boolean = integer" on every accepted/hired
-- application status update.
--
-- Fix: replace GET DIAGNOSTICS + boolean with the built-in FOUND variable,
-- which is set to TRUE by INSERT when at least one row was written.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION award_badge_if_missing(
  p_student_id UUID,
  p_badge_name TEXT,
  p_source_id  UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_badge_id UUID;
BEGIN
  SELECT id INTO v_badge_id FROM badges WHERE name = p_badge_name LIMIT 1;
  IF v_badge_id IS NULL THEN RETURN; END IF;

  INSERT INTO user_badges (user_id, badge_id)
  VALUES (p_student_id, v_badge_id)
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  -- FOUND is TRUE when INSERT actually wrote a row (not a conflict-skip)
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO reputation_events (student_id, type, points, source_id, note)
  VALUES (p_student_id, 'badge_earned', 25, p_source_id, p_badge_name);

  UPDATE profiles SET reputation_score = reputation_score + 25 WHERE id = p_student_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
