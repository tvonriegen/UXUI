-- ═══════════════════════════════════════════════════════════════════════
-- Migration: PR 1 privacy contact routing
-- Date: 2026-07-05
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1 – notifications metadata + contact_request type
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE notifications
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

ALTER TABLE notifications
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info','badge','message','application','alliance','practica','contact_request'));


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2 – shared predicates
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_minor_profile(profile_role TEXT, profile_age INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT profile_role = 'Estudiante' AND (profile_age IS NULL OR profile_age < 18);
$$;

REVOKE ALL ON FUNCTION is_minor_profile(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_minor_profile(TEXT, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION trg_fn_profiles_guard_role_age()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.age IS DISTINCT FROM OLD.age)
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'role and age changes require a trusted server action';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_role_age ON profiles;
CREATE TRIGGER trg_profiles_guard_role_age
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trg_fn_profiles_guard_role_age();

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS contact_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected','cancelled')),
  message          TEXT        NOT NULL DEFAULT '',
  reviewed_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_school_status
  ON contact_requests(school_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_requests_company_status
  ON contact_requests(company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_requests_student
  ON contact_requests(student_id);

CREATE INDEX IF NOT EXISTS idx_contact_requests_pair_status
  ON contact_requests(company_id, student_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_requests_active_pair
  ON contact_requests(company_id, student_id)
  WHERE status IN ('pending','approved');

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_canonical
  ON conversations(LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

CREATE OR REPLACE FUNCTION can_converse(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  left_profile  profiles%ROWTYPE;
  right_profile profiles%ROWTYPE;
  company_id    UUID;
  student_id    UUID;
BEGIN
  IF a IS NULL OR b IS NULL OR a = b THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO left_profile FROM profiles WHERE id = a;
  SELECT * INTO right_profile FROM profiles WHERE id = b;

  IF left_profile.id IS NULL OR right_profile.id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF left_profile.role = 'Empresa' AND right_profile.role IN ('Estudiante','Egresado') THEN
    company_id := left_profile.id;
    student_id := right_profile.id;
  ELSIF right_profile.role = 'Empresa' AND left_profile.role IN ('Estudiante','Egresado') THEN
    company_id := right_profile.id;
    student_id := left_profile.id;
  ELSE
    company_id := NULL;
    student_id := NULL;
  END IF;

  IF company_id IS NOT NULL THEN
    IF (CASE WHEN left_profile.id = student_id THEN left_profile.role ELSE right_profile.role END) = 'Egresado' THEN
      RETURN TRUE;
    END IF;

    IF NOT is_minor_profile(
      CASE WHEN left_profile.id = student_id THEN left_profile.role ELSE right_profile.role END,
      CASE WHEN left_profile.id = student_id THEN left_profile.age ELSE right_profile.age END
    ) THEN
      RETURN TRUE;
    END IF;

    RETURN EXISTS (
      SELECT 1
      FROM contact_requests cr
      WHERE cr.company_id = company_id
        AND cr.student_id = student_id
        AND cr.status = 'approved'
    );
  END IF;

  IF left_profile.role = 'Colegio'
     AND right_profile.role = 'Estudiante'
     AND right_profile.school_id = left_profile.id THEN
    RETURN TRUE;
  END IF;

  IF right_profile.role = 'Colegio'
     AND left_profile.role = 'Estudiante'
     AND left_profile.school_id = right_profile.id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION can_converse(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION can_converse(UUID, UUID) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 3 – contact_requests RLS
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_requests_select_company_school" ON contact_requests;
CREATE POLICY "contact_requests_select_company_school" ON contact_requests
  FOR SELECT USING (auth.uid() = company_id OR auth.uid() = school_id);

DROP POLICY IF EXISTS "contact_requests_insert_company" ON contact_requests;
CREATE POLICY "contact_requests_insert_company" ON contact_requests
  FOR INSERT WITH CHECK (
    auth.uid() = company_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND COALESCE(rejection_reason, '') = ''
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = company_id AND p.role = 'Empresa')
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = school_id AND p.role = 'Colegio')
    AND EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = student_id
        AND p.role = 'Estudiante'
        AND p.school_id = school_id
        AND is_minor_profile(p.role, p.age)
    )
  );

DROP POLICY IF EXISTS "contact_requests_company_cancel" ON contact_requests;
CREATE POLICY "contact_requests_company_cancel" ON contact_requests
  FOR UPDATE
  USING (auth.uid() = company_id AND status = 'pending')
  WITH CHECK (auth.uid() = company_id AND status = 'cancelled');

DROP POLICY IF EXISTS "contact_requests_school_review" ON contact_requests;
CREATE POLICY "contact_requests_school_review" ON contact_requests
  FOR UPDATE
  USING (auth.uid() = school_id AND status = 'pending')
  WITH CHECK (auth.uid() = school_id AND status IN ('approved','rejected'));

DROP POLICY IF EXISTS "contact_requests_delete_denied" ON contact_requests;
CREATE POLICY "contact_requests_delete_denied" ON contact_requests
  FOR DELETE USING (FALSE);


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 4 – guarded updates, notifications, approval conversation
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_contact_requests_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.school_id IS DISTINCT FROM OLD.school_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'contact request identities are immutable';
  END IF;

  IF OLD.status <> 'pending' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'only pending contact requests can change status';
  END IF;

  IF NEW.status IN ('approved','rejected') AND OLD.status = 'pending' THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, NOW());
    IF NEW.status = 'approved' THEN
      NEW.rejection_reason := '';
    END IF;
  ELSIF NEW.status = 'cancelled' THEN
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.rejection_reason := '';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_requests_guard ON contact_requests;
CREATE TRIGGER trg_contact_requests_guard
  BEFORE UPDATE ON contact_requests
  FOR EACH ROW EXECUTE FUNCTION trg_fn_contact_requests_guard();

CREATE OR REPLACE FUNCTION trg_fn_contact_request_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_name TEXT;
  v_student_name TEXT;
  v_recipient    UUID;
  v_title        TEXT;
  v_body         TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(company_name, name, 'La empresa') INTO v_company_name FROM profiles WHERE id = NEW.company_id;
  SELECT COALESCE(name, 'el/la estudiante') INTO v_student_name FROM profiles WHERE id = NEW.student_id;

  IF TG_OP = 'INSERT' THEN
    v_recipient := NEW.school_id;
    v_title := 'Solicitud de contacto pendiente';
    v_body := v_company_name || ' solicitó contactar a ' || v_student_name || '.';
  ELSIF NEW.status = 'approved' THEN
    v_recipient := NEW.company_id;
    v_title := 'Solicitud de contacto aprobada';
    v_body := 'El colegio aprobó el contacto con ' || v_student_name || '.';
  ELSIF NEW.status = 'rejected' THEN
    v_recipient := NEW.company_id;
    v_title := 'Solicitud de contacto rechazada';
    v_body := 'El colegio rechazó el contacto con ' || v_student_name || '.';
  ELSIF NEW.status = 'cancelled' THEN
    v_recipient := NEW.school_id;
    v_title := 'Solicitud de contacto cancelada';
    v_body := v_company_name || ' canceló la solicitud de contacto con ' || v_student_name || '.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, title, body, type, link, metadata)
  VALUES (
    v_recipient,
    v_title,
    v_body,
    'contact_request',
    CASE WHEN NEW.status = 'approved' THEN '/messages' ELSE '/dashboard' END,
    jsonb_build_object(
      'contact_request_id', NEW.id,
      'status', NEW.status,
      'company_id', NEW.company_id,
      'student_id', NEW.student_id,
      'school_id', NEW.school_id
    )
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION trg_fn_contact_request_notify() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_contact_request_notify_ins ON contact_requests;
CREATE TRIGGER trg_contact_request_notify_ins
  AFTER INSERT ON contact_requests
  FOR EACH ROW EXECUTE FUNCTION trg_fn_contact_request_notify();

DROP TRIGGER IF EXISTS trg_contact_request_notify_upd ON contact_requests;
CREATE TRIGGER trg_contact_request_notify_upd
  AFTER UPDATE OF status ON contact_requests
  FOR EACH ROW EXECUTE FUNCTION trg_fn_contact_request_notify();

CREATE OR REPLACE FUNCTION trg_fn_contact_request_approve_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_a UUID;
  user_b UUID;
BEGIN
  IF NEW.status <> 'approved' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  user_a := LEAST(NEW.company_id, NEW.student_id);
  user_b := GREATEST(NEW.company_id, NEW.student_id);

  IF NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE LEAST(c.user1_id, c.user2_id) = user_a
      AND GREATEST(c.user1_id, c.user2_id) = user_b
  ) THEN
    INSERT INTO conversations (user1_id, user2_id, last_message_at)
    VALUES (user_a, user_b, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION trg_fn_contact_request_approve_conversation() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_contact_request_approve_conversation ON contact_requests;
CREATE TRIGGER trg_contact_request_approve_conversation
  AFTER UPDATE OF status ON contact_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trg_fn_contact_request_approve_conversation();


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 5 – conversation/message RLS gates
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "conv_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_participant" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_auth" ON conversations;
DROP POLICY IF EXISTS "conversations_school_init" ON conversations;

CREATE POLICY "conversations_insert_participant" ON conversations
  FOR INSERT WITH CHECK (
    (auth.uid() = user1_id OR auth.uid() = user2_id)
    AND can_converse(user1_id, user2_id)
  );

DROP POLICY IF EXISTS "msg_insert" ON messages;
DROP POLICY IF EXISTS "messages_insert_participant" ON messages;

CREATE POLICY "messages_insert_participant" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        AND can_converse(c.user1_id, c.user2_id)
    )
  );

NOTIFY pgrst, 'reload schema';
