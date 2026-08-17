-- Structured requirements used by the transparent student/job matcher.
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS required_skills TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_skills TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS minimum_experience_years INTEGER,
  ADD COLUMN IF NOT EXISTS work_mode TEXT;

ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_minimum_experience_check,
  ADD CONSTRAINT opportunities_minimum_experience_check
    CHECK (minimum_experience_years IS NULL OR minimum_experience_years BETWEEN 0 AND 50),
  DROP CONSTRAINT IF EXISTS opportunities_work_mode_check,
  ADD CONSTRAINT opportunities_work_mode_check
    CHECK (work_mode IS NULL OR work_mode IN ('onsite', 'hybrid', 'remote'));
