-- ═══════════════════════════════════════════════════════════════
-- Migration: Company Follow system
-- Date: 2026-04-15
-- Allows students (and graduates) to follow companies so they
-- can track updates, vacancies, and internship opportunities.
-- ═══════════════════════════════════════════════════════════════

-- ── Junction table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_follows (
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, company_id)
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_company_follows_student  ON company_follows(student_id);
CREATE INDEX IF NOT EXISTS idx_company_follows_company  ON company_follows(company_id);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE company_follows ENABLE ROW LEVEL SECURITY;

-- Students can see their own follows
CREATE POLICY "follows_select_own" ON company_follows
  FOR SELECT USING (auth.uid() = student_id);

-- Companies can see who follows them
CREATE POLICY "follows_select_company" ON company_follows
  FOR SELECT USING (auth.uid() = company_id);

-- Students can follow companies
CREATE POLICY "follows_insert_own" ON company_follows
  FOR INSERT WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = company_id AND role = 'Empresa'
    )
  );

-- Students can unfollow companies
CREATE POLICY "follows_delete_own" ON company_follows
  FOR DELETE USING (auth.uid() = student_id);

-- ── Reload PostgREST schema cache ────────────────────────────
NOTIFY pgrst, 'reload schema';
