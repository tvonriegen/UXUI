-- ═══════════════════════════════════════════════════════════════════════
-- Migration: ATS upgrade, company profile enhancements, and bug fixes
-- Date: 2026-04-21
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1 – Bug Fix: ensure max_candidates exists on job_postings
-- (fixes "Could not find the 'max_candidates' column" schema cache error)
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS max_candidates INT DEFAULT NULL;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2 – Bug Fix: student_id alias in job_applications
-- The frontend profile join uses !job_applications_student_id_fkey.
-- New inserts only write applicant_id; this trigger keeps student_id in sync.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Back-fill existing rows
UPDATE job_applications
  SET student_id = applicant_id
  WHERE student_id IS NULL AND applicant_id IS NOT NULL;

-- Trigger: auto-set student_id = applicant_id on every INSERT
CREATE OR REPLACE FUNCTION trg_fn_sync_student_id()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.student_id := NEW.applicant_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_id ON job_applications;
CREATE TRIGGER trg_sync_student_id
  BEFORE INSERT ON job_applications
  FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_student_id();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 3 – ATS: extend status pipeline with reviewing & interviewing
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE job_applications
  DROP CONSTRAINT IF EXISTS job_applications_status_check;

ALTER TABLE job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('pending', 'reviewing', 'interviewing', 'accepted', 'rejected', 'hired'));


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 4 – RLS: company can UPDATE priority + status on applications
-- Previously only the admin client could update (bypassed RLS).
-- The movePriority client call was failing silently without this policy.
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "job_applications_update_company" ON job_applications;

CREATE POLICY "job_applications_update_company" ON job_applications
  FOR UPDATE USING (
    -- Applicant can update their own (e.g., future withdrawal feature)
    auth.uid() = applicant_id
    OR
    -- Company that owns the job posting can update any application on it
    EXISTS (
      SELECT 1 FROM job_postings jp
      WHERE jp.id = job_id AND jp.company_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 5 – Company profile: culture & perks columns
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS benefits   TEXT[] DEFAULT '{}';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}';


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 6 – Job postings: view tracking column
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 7 – Index: speed up applicant lookups by student_id
-- ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_job_applications_student
  ON job_applications(student_id);


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 8 – Reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
