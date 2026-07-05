-- ═══════════════════════════════════════════════════════════════════
-- ClassLink – Job Visibility Fix + Activity Results (2026-04-13)
-- ═══════════════════════════════════════════════════════════════════
-- ROOT CAUSE: The 20260331 migration created a policy referencing
-- the column "active" BEFORE audit_fixes renamed "is_open" → "active".
-- PostgreSQL validates column names at CREATE POLICY time, so that
-- policy creation likely failed, leaving job_postings with RLS enabled
-- but NO valid SELECT policy — meaning zero rows returned for students.
-- FIX: Drop every conflicting policy variant and recreate cleanly.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Job postings – complete RLS rewrite ───────────────────────
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

-- Drop every variant that may exist (idempotent)
DROP POLICY IF EXISTS "jobs_select"                ON job_postings;
DROP POLICY IF EXISTS "job_postings_select_active" ON job_postings;
DROP POLICY IF EXISTS "job_postings_select"        ON job_postings;

DROP POLICY IF EXISTS "jobs_insert"               ON job_postings;
DROP POLICY IF EXISTS "job_postings_insert_company" ON job_postings;
DROP POLICY IF EXISTS "job_postings_insert"       ON job_postings;

DROP POLICY IF EXISTS "jobs_update"               ON job_postings;
DROP POLICY IF EXISTS "job_postings_update_own"   ON job_postings;
DROP POLICY IF EXISTS "job_postings_update"       ON job_postings;

DROP POLICY IF EXISTS "jobs_delete"               ON job_postings;
DROP POLICY IF EXISTS "job_postings_delete_own"   ON job_postings;
DROP POLICY IF EXISTS "job_postings_delete"       ON job_postings;

-- SELECT: active jobs are readable by every authenticated user;
--         the owning company can also see their inactive drafts.
CREATE POLICY "job_postings_select" ON job_postings
  FOR SELECT USING (
    active = true
    OR auth.uid() = company_id
  );

-- INSERT: only a Empresa profile can create a posting under their own id.
CREATE POLICY "job_postings_insert" ON job_postings
  FOR INSERT WITH CHECK (
    auth.uid() = company_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'Empresa'
    )
  );

-- UPDATE / DELETE: company owner only.
CREATE POLICY "job_postings_update" ON job_postings
  FOR UPDATE USING (auth.uid() = company_id);

CREATE POLICY "job_postings_delete" ON job_postings
  FOR DELETE USING (auth.uid() = company_id);


-- ── 2. Activity Results – stores gamification assessment outcomes ─
CREATE TABLE IF NOT EXISTS activity_results (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id  TEXT        NOT NULL,            -- slug, e.g. "soft-skills-v1"
  score        INT         NOT NULL DEFAULT 0,  -- 0-100 normalised
  skill_scores JSONB       NOT NULL DEFAULT '{}', -- { communication: 80, leadership: 60, ... }
  answers      JSONB       NOT NULL DEFAULT '[]',  -- ordered choice ids
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, activity_id)
);

ALTER TABLE activity_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ar_select" ON activity_results;
DROP POLICY IF EXISTS "ar_insert" ON activity_results;
DROP POLICY IF EXISTS "ar_update" ON activity_results;

-- Students can only read/write their own results.
-- Schools and companies can read any student's results (for evaluation).
CREATE POLICY "ar_select" ON activity_results
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Colegio','Empresa')
    )
  );
CREATE POLICY "ar_insert" ON activity_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ar_update" ON activity_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activity_results_user ON activity_results(user_id);


-- ── 3. Helper RPC: bulk upsert profile rows after auth user creation ─
-- Called internally by the bulkCreateStudents server action.
-- SECURITY DEFINER so it bypasses RLS during the bulk operation.
CREATE OR REPLACE FUNCTION bulk_upsert_student_profiles(students JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  s       JSONB;
  n       INT := 0;
BEGIN
  FOR s IN SELECT jsonb_array_elements(students) LOOP
    INSERT INTO profiles (
      id, name, email, role, specialty, school_id, avatar, bio, location
    ) VALUES (
      (s->>'id')::UUID,
      s->>'name',
      s->>'email',
      'Estudiante',
      COALESCE(s->>'specialty', ''),
      (s->>'school_id')::UUID,
      '', '', ''
    )
    ON CONFLICT (id) DO UPDATE SET
      name      = EXCLUDED.name,
      email     = EXCLUDED.email,
      specialty = EXCLUDED.specialty,
      school_id = EXCLUDED.school_id;
    n := n + 1;
  END LOOP;
  RETURN jsonb_build_object('inserted', n);
END;
$$;
