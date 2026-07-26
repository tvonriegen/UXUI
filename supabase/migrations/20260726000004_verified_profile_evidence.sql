-- =====================================================================
-- Migration: Verified student evidence model and audit trail
-- Date: 2026-07-26
-- Idempotent: safe to re-run.
-- =====================================================================

CREATE TABLE IF NOT EXISTS profile_evidence (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evidence_type    TEXT NOT NULL CHECK (evidence_type IN (
    'project','certificate','course','award','document','other'
  )),
  title            TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160),
  description      TEXT NOT NULL DEFAULT '',
  url              TEXT NOT NULL DEFAULT '',
  issuer           TEXT NOT NULL DEFAULT '',
  issued_at        DATE,
  expires_at       DATE,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'draft','pending','verified','rejected','expired'
  )),
  validation_note  TEXT NOT NULL DEFAULT '',
  reviewed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_evidence_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id    UUID NOT NULL REFERENCES profile_evidence(id) ON DELETE CASCADE,
  actor_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  from_status    TEXT,
  to_status      TEXT NOT NULL,
  note           TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_evidence_owner_status
  ON profile_evidence(owner_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_evidence_school_queue
  ON profile_evidence(owner_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_evidence_events_evidence
  ON profile_evidence_events(evidence_id, created_at DESC);

ALTER TABLE profile_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_evidence_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION profile_evidence_school_reviewer(p_owner_id UUID, p_actor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles student
    JOIN profiles school ON school.id = student.school_id
    WHERE student.id = p_owner_id
      AND school.id = p_actor_id
      AND school.role = 'Colegio'
  );
$$;

REVOKE ALL ON FUNCTION profile_evidence_school_reviewer(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION profile_evidence_school_reviewer(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION trg_fn_profile_evidence_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  is_service_role BOOLEAN := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';
  is_school_reviewer BOOLEAN := profile_evidence_school_reviewer(OLD.owner_id, actor_id);
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'evidence ownership and creation time are immutable';
  END IF;

  IF is_service_role THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF actor_id = OLD.owner_id THEN
    IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR (
         NEW.validation_note IS DISTINCT FROM OLD.validation_note
         AND NOT (OLD.status = 'rejected' AND NEW.status = 'pending' AND NEW.validation_note = '')
       ) THEN
      RAISE EXCEPTION 'profile owners cannot change review metadata';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status IN ('draft','rejected') AND NEW.status = 'pending') THEN
      RAISE EXCEPTION 'profile owners may only resubmit rejected evidence';
    END IF;
  ELSIF is_school_reviewer THEN
    IF NEW.evidence_type IS DISTINCT FROM OLD.evidence_type
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.url IS DISTINCT FROM OLD.url
       OR NEW.issuer IS DISTINCT FROM OLD.issuer
       OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
       OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
       OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
      RAISE EXCEPTION 'schools may only review evidence status and notes';
    END IF;
    IF OLD.status <> 'pending' OR NEW.status NOT IN ('verified','rejected') THEN
      RAISE EXCEPTION 'schools may only review pending evidence';
    END IF;
    NEW.reviewed_by := actor_id;
    NEW.reviewed_at := now();
  ELSE
    RAISE EXCEPTION 'only the owner school or service role may update evidence';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_evidence_guard ON profile_evidence;
CREATE TRIGGER trg_profile_evidence_guard
  BEFORE UPDATE ON profile_evidence
  FOR EACH ROW EXECUTE FUNCTION trg_fn_profile_evidence_guard();

CREATE OR REPLACE FUNCTION trg_fn_profile_evidence_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO profile_evidence_events (evidence_id, actor_id, from_status, to_status, note)
    VALUES (NEW.id, auth.uid(), NULL, NEW.status, NEW.validation_note);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO profile_evidence_events (evidence_id, actor_id, from_status, to_status, note)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, NEW.validation_note);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION trg_fn_profile_evidence_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION trg_fn_profile_evidence_audit() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_profile_evidence_audit_ins ON profile_evidence;
CREATE TRIGGER trg_profile_evidence_audit_ins
  AFTER INSERT ON profile_evidence
  FOR EACH ROW EXECUTE FUNCTION trg_fn_profile_evidence_audit();

DROP TRIGGER IF EXISTS trg_profile_evidence_audit_upd ON profile_evidence;
CREATE TRIGGER trg_profile_evidence_audit_upd
  AFTER UPDATE OF status ON profile_evidence
  FOR EACH ROW EXECUTE FUNCTION trg_fn_profile_evidence_audit();

DROP POLICY IF EXISTS "profile_evidence_select" ON profile_evidence;
CREATE POLICY "profile_evidence_select" ON profile_evidence
  FOR SELECT TO authenticated
  USING (
    owner_id = (select auth.uid())
    OR status = 'verified'
    OR profile_evidence_school_reviewer(owner_id, (select auth.uid()))
  );

DROP POLICY IF EXISTS "profile_evidence_insert_owner" ON profile_evidence;
CREATE POLICY "profile_evidence_insert_owner" ON profile_evidence
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (select auth.uid())
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid())
        AND p.role IN ('Estudiante','Egresado')
    )
  );

DROP POLICY IF EXISTS "profile_evidence_update_owner" ON profile_evidence;
CREATE POLICY "profile_evidence_update_owner" ON profile_evidence
  FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "profile_evidence_review_school" ON profile_evidence;
CREATE POLICY "profile_evidence_review_school" ON profile_evidence
  FOR UPDATE TO authenticated
  USING (profile_evidence_school_reviewer(owner_id, (select auth.uid())))
  WITH CHECK (profile_evidence_school_reviewer(owner_id, (select auth.uid())));

DROP POLICY IF EXISTS "profile_evidence_delete_owner" ON profile_evidence;
CREATE POLICY "profile_evidence_delete_owner" ON profile_evidence
  FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()) AND status IN ('draft','pending','rejected'));

DROP POLICY IF EXISTS "profile_evidence_events_select" ON profile_evidence_events;
CREATE POLICY "profile_evidence_events_select" ON profile_evidence_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile_evidence e
      WHERE e.id = evidence_id
        AND (
          e.owner_id = (select auth.uid())
          OR profile_evidence_school_reviewer(e.owner_id, (select auth.uid()))
        )
    )
  );

REVOKE ALL ON TABLE profile_evidence, profile_evidence_events FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE profile_evidence TO authenticated;
GRANT SELECT ON TABLE profile_evidence_events TO authenticated;

NOTIFY pgrst, 'reload schema';
