-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Interview INSERT privacy hardening + UPDATE integrity
-- Date: 2026-07-05
-- Idempotent: safe to re-run.
--
-- Fixes bypass in interviews_insert_company: the previous policy only
-- checked auth.uid() = company_id, allowing a company to insert an
-- interview for any application, swap the student_id, set an arbitrary
-- initial status, or target another company's job posting.
--
-- New invariant for INSERT:
--   * Caller is the company_id on the new row.
--   * Initial status is exactly 'proposed'.
--   * The referenced application exists and belongs to the caller's job.
--   * The interview's student_id matches the application's applicant_id.
--   * The caller is allowed to converse with the student (can_converse).
--
-- UPDATE integrity:
--   * application_id, company_id, student_id and created_at are immutable
--     once the interview row exists. Status, proposed_at and details remain
--     mutable by participants through the existing update policy.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1 – Harden interviews INSERT policy
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "interviews_insert_company" ON interviews;

CREATE POLICY "interviews_insert_company" ON interviews
  FOR INSERT
  WITH CHECK (
    -- Caller must be the company proposing the interview.
    auth.uid() = company_id
    -- Lock the initial lifecycle state; no skipping straight to accepted/etc.
    AND status = 'proposed'
    -- The application must exist, belong to the caller's job posting, and
    -- the interview's student_id must match the real applicant.
    AND EXISTS (
      SELECT 1
      FROM job_applications ja
      JOIN job_postings jp ON jp.id = ja.job_id
      WHERE ja.id = application_id
        AND ja.applicant_id = student_id
        AND jp.company_id = auth.uid()
        AND jp.company_id = company_id
    )
    -- Privacy gate: empresa↔egresado, empresa↔adult student, or
    -- empresa↔minor student with an approved contact_request.
    AND can_converse(company_id, student_id)
  );

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2 – Immutable interview identity columns on UPDATE
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_interviews_guard_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.application_id IS DISTINCT FROM OLD.application_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'interview identity fields (application_id, company_id, student_id, created_at) are immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_interviews_guard_immutable ON interviews;
CREATE TRIGGER trg_interviews_guard_immutable
  BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION trg_fn_interviews_guard_immutable();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 3 – Reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
