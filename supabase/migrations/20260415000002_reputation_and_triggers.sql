-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Reputation System & Smart Notifications  (v2 – corrected)
-- Date: 2026-04-15
-- Idempotent: safe to re-run.
--
-- IMPORTANT: skill_validations already exists (from 20260413000001) with
-- columns  student_id / skill_id (→ skills) / validator_id (→ profiles).
-- This migration does NOT recreate it; it only adds triggers + new tables.
-- ═══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1 – REPUTATION EVENTS  (immutable ledger)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reputation_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL
             CHECK (type IN (
               'skill_validated',    -- school validated a skill          +100
               'internship_review',  -- company left positive review       +150
               'badge_earned',       -- any badge awarded                  +25
               'portfolio_item',     -- portfolio item added               +10
               'applied_accepted'    -- application accepted by company    +50
             )),
  points     INT         NOT NULL DEFAULT 0,
  source_id  UUID,       -- varies by type (skill_validation id, badge id…)
  note       TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rep_student_select" ON reputation_events;
DROP POLICY IF EXISTS "rep_empresa_select" ON reputation_events;

CREATE POLICY "rep_student_select" ON reputation_events
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "rep_empresa_select" ON reputation_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Empresa')
  );

CREATE INDEX IF NOT EXISTS idx_reputation_student ON reputation_events(student_id);


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2 – REPUTATION SCORE on profiles (denormalised for O(1) reads)
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reputation_score INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_reputation ON profiles(reputation_score);


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 3 – VERIFIED BADGE CATALOG
-- Idempotent: INSERT … ON CONFLICT DO NOTHING.
-- The badges table already has the is_institutional column (added in
-- migration 20260413000001).
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO badges (name, icon, description, requirement, is_institutional) VALUES
  ('Aval Institucional',         'shield-check',  'Respaldado oficialmente por tu institución educativa.',                           'school_backing',      TRUE),
  ('Habilidad Técnica Validada', 'badge-check',   'Una habilidad técnica tuya ha sido validada por tu colegio.',                    'skill_validated',     TRUE),
  ('Top Postulante',             'star',          'Tu perfil ha sido seleccionado como candidato destacado por una empresa.',        'application_accepted', FALSE),
  ('Primer Portafolio',          'folder-open',   'Has añadido tu primer proyecto al portafolio.',                                  'portfolio_item',      FALSE),
  ('Racha de 7 Días',            'flame',         'Has iniciado sesión durante 7 días consecutivos.',                               'streak_7',            FALSE),
  ('Racha de 30 Días',           'zap',           'Has iniciado sesión durante 30 días consecutivos.',                              'streak_30',           FALSE),
  ('Práctica Completada',        'briefcase',     'Has completado una práctica profesional con evaluación positiva de la empresa.',  'internship_review',   FALSE),
  ('Perfil Completo',            'user-check',    'Tu perfil alcanzó el 100% de completitud.',                                     'profile_complete',    FALSE)
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 4 – FUNCTION: award_badge_if_missing
-- Idempotent badge award; logs reputation event + bumps score.
-- ─────────────────────────────────────────────────────────────────────

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
  v_inserted BOOLEAN;
BEGIN
  SELECT id INTO v_badge_id FROM badges WHERE name = p_badge_name LIMIT 1;
  IF v_badge_id IS NULL THEN RETURN; END IF;

  INSERT INTO user_badges (user_id, badge_id)
  VALUES (p_student_id, v_badge_id)
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  -- FOUND is TRUE when the INSERT actually inserted a row
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN RETURN; END IF;

  INSERT INTO reputation_events (student_id, type, points, source_id, note)
  VALUES (p_student_id, 'badge_earned', 25, p_source_id, p_badge_name);

  UPDATE profiles SET reputation_score = reputation_score + 25 WHERE id = p_student_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 5 – TRIGGER: auto-award badge + notify on skill validation
--
-- skill_validations schema (from 20260413000001):
--   student_id  UUID → profiles
--   skill_id    UUID → skills
--   validator_id UUID → profiles  (the school)
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_skill_validation_awarded()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_school_name TEXT;
  v_skill_name  TEXT;
BEGIN
  -- Resolve human-readable skill name from the skills table
  SELECT name INTO v_skill_name FROM skills WHERE id = NEW.skill_id;
  v_skill_name := COALESCE(v_skill_name, 'Habilidad técnica');

  -- Award the verification badge
  PERFORM award_badge_if_missing(NEW.student_id, 'Habilidad Técnica Validada', NEW.id);

  -- Log the reputation event (+100 pts)
  INSERT INTO reputation_events (student_id, type, points, source_id, note)
  VALUES (NEW.student_id, 'skill_validated', 100, NEW.id, v_skill_name);

  UPDATE profiles SET reputation_score = reputation_score + 100 WHERE id = NEW.student_id;

  -- Fetch school name via validator_id
  SELECT COALESCE(school_name, name, 'Tu colegio') INTO v_school_name
  FROM profiles WHERE id = NEW.validator_id;

  -- Notify the student
  INSERT INTO notifications (user_id, title, body, type, link)
  VALUES (
    NEW.student_id,
    '¡Habilidad validada!',
    v_school_name || ' ha validado tu habilidad: ' || v_skill_name || '. Tu reputación aumentó +100 pts.',
    'badge',
    '/profile'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_skill_validation_awarded ON skill_validations;
CREATE TRIGGER trg_skill_validation_awarded
AFTER INSERT ON skill_validations
FOR EACH ROW EXECUTE FUNCTION trg_fn_skill_validation_awarded();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 6 – TRIGGER: notify student when a company views their profile
-- Rate-limited: max 1 notification per (viewer, viewed) per 24 hours.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_profile_view_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_viewer_role  TEXT;
  v_company_name TEXT;
  v_recent_count INT;
BEGIN
  IF NEW.viewer_id IS NULL THEN RETURN NEW; END IF;

  SELECT role INTO v_viewer_role FROM profiles WHERE id = NEW.viewer_id;
  IF v_viewer_role IS DISTINCT FROM 'Empresa' THEN RETURN NEW; END IF;

  -- Rate-limit: one notification per pair per 24 h
  SELECT COUNT(*) INTO v_recent_count
  FROM notifications
  WHERE user_id    = NEW.viewed_id
    AND type       = 'info'
    AND link       = '/profile'
    AND created_at > NOW() - INTERVAL '24 hours'
    AND body       LIKE '%' || NEW.viewer_id::TEXT || '%';

  IF v_recent_count > 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(company_name, name, 'Una empresa') INTO v_company_name
  FROM profiles WHERE id = NEW.viewer_id;

  INSERT INTO notifications (user_id, title, body, type, link)
  VALUES (
    NEW.viewed_id,
    'Tu perfil fue visto',
    v_company_name || ' (' || NEW.viewer_id::TEXT || ') ha visitado tu perfil. ¡Puede estar interesada en tu talento!',
    'info',
    '/profile'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_view_notify ON profile_views;
CREATE TRIGGER trg_profile_view_notify
AFTER INSERT ON profile_views
FOR EACH ROW EXECUTE FUNCTION trg_fn_profile_view_notify();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 7 – TRIGGER: notify matching students when a job is posted
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_job_posted_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_company_name TEXT;
  v_student      RECORD;
BEGIN
  IF NEW.specialty IS NULL OR NEW.specialty = '' THEN RETURN NEW; END IF;
  IF NOT NEW.active THEN RETURN NEW; END IF;

  SELECT COALESCE(company_name, name, 'Una empresa') INTO v_company_name
  FROM profiles WHERE id = NEW.company_id;

  FOR v_student IN
    SELECT id FROM profiles
    WHERE role         IN ('Estudiante', 'Egresado')
      AND specialty    = NEW.specialty
      AND availability = 'Disponible'
    LIMIT 50
  LOOP
    INSERT INTO notifications (user_id, title, body, type, link)
    VALUES (
      v_student.id,
      'Nueva vacante que coincide contigo',
      v_company_name || ' publicó una vacante para ' || NEW.specialty || ': "' || NEW.title || '". ¡Postúlate ahora!',
      'application',
      '/empleos'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_posted_notify ON job_postings;
CREATE TRIGGER trg_job_posted_notify
AFTER INSERT ON job_postings
FOR EACH ROW EXECUTE FUNCTION trg_fn_job_posted_notify();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 8 – TRIGGER: reputation bump when application is accepted
-- Uses applicant_id (column name in the live DB per 20260410000003).
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_application_accepted_rep()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_applicant_id UUID;
  v_job_title    TEXT;
BEGIN
  IF NEW.status <> 'accepted' OR OLD.status = 'accepted' THEN RETURN NEW; END IF;

  -- Column is applicant_id (renamed from student_id in full_reset / audit_fixes)
  BEGIN
    v_applicant_id := NEW.applicant_id;
  EXCEPTION WHEN undefined_column THEN
    -- Fallback for installs still using student_id
    v_applicant_id := NEW.student_id;
  END;

  IF v_applicant_id IS NULL THEN RETURN NEW; END IF;

  SELECT title INTO v_job_title FROM job_postings WHERE id = NEW.job_id;

  PERFORM award_badge_if_missing(v_applicant_id, 'Top Postulante', NEW.id);

  INSERT INTO reputation_events (student_id, type, points, source_id, note)
  VALUES (v_applicant_id, 'applied_accepted', 50, NEW.id, COALESCE(v_job_title, 'Vacante'));

  UPDATE profiles SET reputation_score = reputation_score + 50 WHERE id = v_applicant_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_accepted_rep ON job_applications;
CREATE TRIGGER trg_application_accepted_rep
AFTER UPDATE OF status ON job_applications
FOR EACH ROW EXECUTE FUNCTION trg_fn_application_accepted_rep();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 9 – Reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
