-- ═══════════════════════════════════════════════════════════
-- Migration: job_postings + job_applications enhancements
-- Date: 2026-04-10
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Add max_candidates column to job_postings ─────────
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS max_candidates INT DEFAULT NULL;

-- ─── 2. Ensure job_applications has the right columns ─────
-- Some installations use applicant_id; add student_id alias
-- if not present so the profile join works via
-- !job_applications_student_id_fkey
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Back-fill student_id from applicant_id where it exists
UPDATE job_applications
SET student_id = applicant_id
WHERE student_id IS NULL AND applicant_id IS NOT NULL;

-- ─── 3. Ensure priority column exists ─────────────────────
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0;

-- ─── 4. Add "hired" to allowed statuses ───────────────────
-- (drop + recreate constraint to add the new value)
ALTER TABLE job_applications
  DROP CONSTRAINT IF EXISTS job_applications_status_check;

ALTER TABLE job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'hired'));

-- ─── 5. Index for fast applicant lookups ──────────────────
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);

-- ─── 6. Reload PostgREST schema cache ─────────────────────
NOTIFY pgrst, 'reload schema';
