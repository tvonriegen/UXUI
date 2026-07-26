-- ═══════════════════════════════════════════════════════════════════
-- ClassLink – Rubric Feature Migration (2026-04-13)
-- Adds: saved_posts, company_follows, skill_validations
--       + institutional badge columns
-- Run: Supabase Dashboard → SQL Editor → paste & RUN
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Saved Posts (bookmark system) ─────────────────────────────
CREATE TABLE IF NOT EXISTS saved_posts (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_select" ON saved_posts;
DROP POLICY IF EXISTS "saved_insert" ON saved_posts;
DROP POLICY IF EXISTS "saved_delete" ON saved_posts;

CREATE POLICY "saved_select" ON saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_insert" ON saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_delete" ON saved_posts FOR DELETE USING (auth.uid() = user_id);


-- ── 2. Company Follows (student tracks a company) ────────────────
CREATE TABLE IF NOT EXISTS company_follows (
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, company_id)
);
ALTER TABLE company_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_select" ON company_follows;
DROP POLICY IF EXISTS "follows_insert" ON company_follows;
DROP POLICY IF EXISTS "follows_delete" ON company_follows;

-- Anyone can read follow counts; only the student can manage their follows
CREATE POLICY "follows_select" ON company_follows FOR SELECT USING (true);
CREATE POLICY "follows_insert" ON company_follows FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "follows_delete" ON company_follows FOR DELETE USING (auth.uid() = student_id);


-- ── 3. Skill Validations (school officially validates a student skill) ──
-- validator_id must be a Colegio profile; enforced by RLS + app logic.
CREATE TABLE IF NOT EXISTS skill_validations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id     UUID        NOT NULL REFERENCES skills(id)   ON DELETE CASCADE,
  validator_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note         TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, skill_id, validator_id)
);
ALTER TABLE skill_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sv_select" ON skill_validations;
DROP POLICY IF EXISTS "sv_insert" ON skill_validations;
DROP POLICY IF EXISTS "sv_delete" ON skill_validations;

CREATE POLICY "sv_select" ON skill_validations FOR SELECT USING (true);
CREATE POLICY "sv_insert" ON skill_validations FOR INSERT WITH CHECK (
  auth.uid() = validator_id
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Colegio'
  )
);
CREATE POLICY "sv_delete" ON skill_validations FOR DELETE USING (auth.uid() = validator_id);


-- ── 4. Institutional badge columns ──────────────────────────────
-- is_institutional = TRUE means the badge was issued by a school, not auto-earned
ALTER TABLE badges     ADD COLUMN IF NOT EXISTS is_institutional BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ── 5. Helpful indexes ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_saved_posts_user   ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_company_follows_st ON company_follows(student_id);
CREATE INDEX IF NOT EXISTS idx_company_follows_co ON company_follows(company_id);
CREATE INDEX IF NOT EXISTS idx_skill_valid_student ON skill_validations(student_id);
CREATE INDEX IF NOT EXISTS idx_skill_valid_skill   ON skill_validations(skill_id);
