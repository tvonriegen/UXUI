-- =====================================================================
-- Migration: Interview status transition hardening
-- Date: 2026-07-26
-- Idempotent: safe to re-run.
--
-- The existing participant policy allowed arbitrary interview status
-- updates. This migration keeps participant updates available while
-- restricting lifecycle changes to the actor and the current status.
-- =====================================================================

-- Keep the update surface participant-scoped. The trigger below enforces
-- the old-status/new-status transition because RLS WITH CHECK cannot see OLD.
DROP POLICY IF EXISTS "interviews_update_participant" ON interviews;
CREATE POLICY "interviews_update_participant" ON interviews
  FOR UPDATE
  USING (auth.uid() = company_id OR auth.uid() = student_id)
  WITH CHECK (auth.uid() = company_id OR auth.uid() = student_id);

CREATE OR REPLACE FUNCTION trg_fn_interviews_guard_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() = OLD.student_id THEN
      IF OLD.status = 'proposed'
         AND NEW.status IN ('accepted', 'declined') THEN
        NULL;
      ELSIF OLD.status IN ('proposed', 'accepted', 'rescheduled')
            AND NEW.status = 'cancelled' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'student cannot make this interview status transition';
      END IF;
    ELSIF auth.uid() = OLD.company_id THEN
      IF OLD.status IN ('proposed', 'accepted', 'declined', 'rescheduled')
         AND NEW.status = 'cancelled' THEN
        NULL;
      ELSIF OLD.status IN ('accepted', 'rescheduled')
            AND NEW.status IN ('completed', 'rescheduled') THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'company cannot make this interview status transition';
      END IF;
    ELSE
      RAISE EXCEPTION 'only interview participants can change status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_interviews_guard_status ON interviews;
CREATE TRIGGER trg_interviews_guard_status
  BEFORE UPDATE OF status ON interviews
  FOR EACH ROW EXECUTE FUNCTION trg_fn_interviews_guard_status();

NOTIFY pgrst, 'reload schema';
