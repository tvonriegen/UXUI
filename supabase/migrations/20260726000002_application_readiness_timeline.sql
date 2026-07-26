-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Persist assisted-application readiness in the ATS timeline
-- Date: 2026-07-26
-- Idempotent: safe to re-run.
--
-- Stores a small, non-sensitive readiness snapshot on the application and
-- records it as an immutable timeline event before the applied event.
-- The snapshot is explanatory only; it never decides hiring outcomes.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS readiness_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS readiness_model_version TEXT,
  ADD COLUMN IF NOT EXISTS readiness_checked_at TIMESTAMPTZ;

ALTER TABLE application_events
  DROP CONSTRAINT IF EXISTS application_events_event_type_check;

ALTER TABLE application_events
  ADD CONSTRAINT application_events_event_type_check
  CHECK (event_type IN (
    'readiness_checked','applied','viewed','reviewing','interviewing',
    'accepted','rejected','hired','note'
  ));

CREATE OR REPLACE FUNCTION trg_fn_log_application_created()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.readiness_snapshot IS NOT NULL THEN
    INSERT INTO application_events (
      application_id, event_type, actor_id, note, metadata
    )
    VALUES (
      NEW.id,
      'readiness_checked',
      NEW.applicant_id,
      COALESCE(
        NEW.readiness_snapshot ->> 'summary',
        'Perfil revisado antes de enviar la postulación.'
      ),
      NEW.readiness_snapshot
    );
  END IF;

  INSERT INTO application_events (application_id, event_type, actor_id, note)
  VALUES (NEW.id, 'applied', NEW.applicant_id, 'Postulación enviada.');
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
