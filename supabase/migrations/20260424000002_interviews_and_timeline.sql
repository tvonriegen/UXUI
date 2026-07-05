-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Interviews + Application Timeline + Message Kinds
-- Date: 2026-04-24
-- Idempotent: safe to re-run.
--
-- Introduces:
--   1. application_events (immutable audit log for ATS timeline)
--   2. interviews table (proposed, accepted, declined, completed, cancelled)
--   3. messages.kind column ('text' default, 'interview_proposal', 'system')
--   4. messages.metadata jsonb for structured message payloads
--   5. Triggers to auto-log events on status change + application insert
-- ═══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1 – application_events (audit log)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS application_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID        NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  event_type     TEXT        NOT NULL
                             CHECK (event_type IN (
                               'applied','viewed','reviewing','interviewing',
                               'accepted','rejected','hired','note'
                             )),
  actor_id       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  note           TEXT        NOT NULL DEFAULT '',
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_events_select" ON application_events;
CREATE POLICY "app_events_select" ON application_events FOR SELECT USING (
  -- Applicant can read their own history
  EXISTS (
    SELECT 1 FROM job_applications a
    WHERE a.id = application_id AND a.applicant_id = auth.uid()
  )
  OR
  -- Owning company can read
  EXISTS (
    SELECT 1 FROM job_applications a
    JOIN job_postings jp ON jp.id = a.job_id
    WHERE a.id = application_id AND jp.company_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "app_events_insert" ON application_events;
CREATE POLICY "app_events_insert" ON application_events FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

CREATE INDEX IF NOT EXISTS idx_app_events_app
  ON application_events(application_id, created_at);


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2 – Auto-log event on application create
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_log_application_created()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO application_events (application_id, event_type, actor_id, note)
  VALUES (NEW.id, 'applied', NEW.applicant_id, 'Postulación enviada.');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_application_created ON job_applications;
CREATE TRIGGER trg_log_application_created
  AFTER INSERT ON job_applications
  FOR EACH ROW EXECUTE FUNCTION trg_fn_log_application_created();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 3 – Auto-log event on status change
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_log_application_status()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_evt   TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  -- Derive event_type from new status; status check guarantees valid value
  v_evt := NEW.status;
  IF v_evt NOT IN ('reviewing','interviewing','accepted','rejected','hired') THEN
    RETURN NEW;
  END IF;

  -- Actor: try auth.uid() (set when company triggers via server action)
  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  INSERT INTO application_events (application_id, event_type, actor_id, note)
  VALUES (NEW.id, v_evt, v_actor, '');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_application_status ON job_applications;
CREATE TRIGGER trg_log_application_status
  AFTER UPDATE OF status ON job_applications
  FOR EACH ROW EXECUTE FUNCTION trg_fn_log_application_status();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 4 – interviews table
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interviews (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID        NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  company_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_at    TIMESTAMPTZ NOT NULL,
  duration_mins  INT         NOT NULL DEFAULT 30,
  modality       TEXT        NOT NULL DEFAULT 'video'
                             CHECK (modality IN ('video','presencial','telefono')),
  location       TEXT        NOT NULL DEFAULT '',
  meeting_link   TEXT        NOT NULL DEFAULT '',
  status         TEXT        NOT NULL DEFAULT 'proposed'
                             CHECK (status IN ('proposed','accepted','declined','completed','cancelled','rescheduled')),
  notes          TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interviews_select" ON interviews;
CREATE POLICY "interviews_select" ON interviews FOR SELECT
  USING (auth.uid() = company_id OR auth.uid() = student_id);

DROP POLICY IF EXISTS "interviews_insert_company" ON interviews;
CREATE POLICY "interviews_insert_company" ON interviews FOR INSERT
  WITH CHECK (auth.uid() = company_id);

DROP POLICY IF EXISTS "interviews_update_participant" ON interviews;
CREATE POLICY "interviews_update_participant" ON interviews FOR UPDATE
  USING (auth.uid() = company_id OR auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS idx_interviews_app
  ON interviews(application_id, proposed_at);

CREATE INDEX IF NOT EXISTS idx_interviews_participants
  ON interviews(student_id, company_id);


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 5 – messages.kind + metadata
-- Allows the chat pane to render interview proposal bubbles natively.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS kind     TEXT NOT NULL DEFAULT 'text'
    CHECK (kind IN ('text','interview_proposal','system')),
  ADD COLUMN IF NOT EXISTS metadata JSONB;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 6 – notify participants on interview status changes
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_interview_notify()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_student_name TEXT;
  v_company_name TEXT;
  v_title        TEXT;
  v_body         TEXT;
  v_recipient    UUID;
BEGIN
  SELECT COALESCE(name, 'el/la candidato/a')                INTO v_student_name FROM profiles WHERE id = NEW.student_id;
  SELECT COALESCE(company_name, name, 'La empresa')          INTO v_company_name FROM profiles WHERE id = NEW.company_id;

  IF TG_OP = 'INSERT' THEN
    v_title     := 'Nueva propuesta de entrevista';
    v_body      := v_company_name || ' te propuso una entrevista el ' ||
                   to_char(NEW.proposed_at AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI') || '.';
    v_recipient := NEW.student_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' THEN
      v_title     := v_student_name || ' aceptó la entrevista';
      v_body      := 'La entrevista del ' || to_char(NEW.proposed_at AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI') || ' fue confirmada.';
      v_recipient := NEW.company_id;
    ELSIF NEW.status = 'declined' THEN
      v_title     := v_student_name || ' declinó la entrevista';
      v_body      := 'La entrevista propuesta fue rechazada.';
      v_recipient := NEW.company_id;
    ELSIF NEW.status = 'cancelled' THEN
      v_title     := 'Entrevista cancelada';
      v_body      := 'La entrevista fue cancelada.';
      v_recipient := CASE WHEN NEW.student_id = OLD.student_id THEN NEW.student_id ELSE NEW.company_id END;
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, title, body, type, link)
  VALUES (v_recipient, v_title, v_body, 'application', '/messages');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_interview_notify_ins ON interviews;
CREATE TRIGGER trg_interview_notify_ins
  AFTER INSERT ON interviews
  FOR EACH ROW EXECUTE FUNCTION trg_fn_interview_notify();

DROP TRIGGER IF EXISTS trg_interview_notify_upd ON interviews;
CREATE TRIGGER trg_interview_notify_upd
  AFTER UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION trg_fn_interview_notify();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 7 – keep interviews.updated_at fresh
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_interviews_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_interviews_updated_at ON interviews;
CREATE TRIGGER trg_interviews_updated_at
  BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION trg_fn_interviews_updated_at();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 8 – Reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
