-- ═══════════════════════════════════════════════════════════
-- Migration: Step 1 — missing columns + tables
-- Date: 2026-04-09
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Add missing columns to profiles ───────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS grade       TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS soft_skills JSONB       NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS attendance  INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rut         TEXT        NOT NULL DEFAULT '';

-- ─── 2. Create school_reports table ───────────────────────

CREATE TABLE IF NOT EXISTS school_reports (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period           TEXT        NOT NULL,
  summary          TEXT        NOT NULL DEFAULT '',
  teacher_comment  TEXT        NOT NULL DEFAULT '',
  behavior_note    TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, period)
);

-- ─── 3. Create recommendation_requests table ──────────────

CREATE TABLE IF NOT EXISTS recommendation_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type  TEXT        NOT NULL CHECK (target_type IN ('colegio', 'empresa')),
  message      TEXT        NOT NULL DEFAULT '',
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. RLS for new tables ────────────────────────────────

ALTER TABLE school_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_requests ENABLE ROW LEVEL SECURITY;

-- school_reports: student can read their own; school can read/write their students'
CREATE POLICY "school_reports_student_select" ON school_reports
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "school_reports_school_select" ON school_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = school_reports.student_id
        AND profiles.school_id = auth.uid()
    )
  );

-- recommendation_requests: student manages their own
CREATE POLICY "rec_requests_student_all" ON recommendation_requests
  FOR ALL USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- school can read requests from their students
CREATE POLICY "rec_requests_school_select" ON recommendation_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = recommendation_requests.student_id
        AND profiles.school_id = auth.uid()
    )
  );

-- ─── 5. Indexes ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_school_id   ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_school_reports_student ON school_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_school_reports_school  ON school_reports(school_id);

-- ─── 6. Allow schools to update their students' profiles ──
-- (admin client bypasses RLS, but adding this for completeness)
DROP POLICY IF EXISTS "profiles_update_school_student" ON profiles;
CREATE POLICY "profiles_update_school_student" ON profiles
  FOR UPDATE USING (
    school_id = auth.uid()
  )
  WITH CHECK (
    school_id = auth.uid()
  );

-- ─── 7. Notify PostgREST to reload its schema cache ───────
NOTIFY pgrst, 'reload schema';
