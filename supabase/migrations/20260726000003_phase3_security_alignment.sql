-- =====================================================================
-- Migration: Phase 3 remote security and schema alignment
-- Date: 2026-07-26
-- Idempotent: safe to re-run after the Phase 3 migrations.
--
-- This migration narrows the exposed authorization surface after the
-- contact-routing, interview and readiness migrations are installed.
-- =====================================================================

-- The bulk importer is only an internal server action. It must not be an
-- anonymous RPC and it must only write profiles owned by the caller's school.
CREATE OR REPLACE FUNCTION bulk_upsert_student_profiles(students JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s          JSONB;
  n          INT := 0;
  caller_id  UUID := auth.uid();
BEGIN
  IF caller_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = caller_id
      AND role = 'Colegio'
  ) THEN
    RAISE EXCEPTION 'only authenticated schools may import students';
  END IF;

  IF jsonb_typeof(students) <> 'array' THEN
    RAISE EXCEPTION 'students must be a JSON array';
  END IF;

  FOR s IN SELECT jsonb_array_elements(students) LOOP
    IF (s->>'school_id')::UUID IS DISTINCT FROM caller_id THEN
      RAISE EXCEPTION 'student school does not match the authenticated school';
    END IF;

    INSERT INTO profiles (
      id, name, email, role, specialty, school_id, avatar, bio, location
    ) VALUES (
      (s->>'id')::UUID,
      s->>'name',
      s->>'email',
      'Estudiante',
      COALESCE(s->>'specialty', ''),
      caller_id,
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

REVOKE ALL ON FUNCTION bulk_upsert_student_profiles(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bulk_upsert_student_profiles(JSONB) TO authenticated;

-- Avoid the deprecated auth.role() helper in the profile identity guard.
CREATE OR REPLACE FUNCTION trg_fn_profiles_guard_role_age()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.age IS DISTINCT FROM OLD.age)
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'role and age changes require a trusted server action';
  END IF;

  RETURN NEW;
END;
$$;

-- Use authenticated-only policies for the sensitive Phase 3 paths and wrap
-- auth.uid() in a scalar SELECT so PostgreSQL evaluates it once per query.
DROP POLICY IF EXISTS "contact_requests_select_company_school" ON contact_requests;
CREATE POLICY "contact_requests_select_company_school" ON contact_requests
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = company_id OR (select auth.uid()) = school_id);

DROP POLICY IF EXISTS "contact_requests_insert_company" ON contact_requests;
CREATE POLICY "contact_requests_insert_company" ON contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = company_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND COALESCE(rejection_reason, '') = ''
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = company_id AND p.role = 'Empresa')
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = contact_requests.school_id AND p.role = 'Colegio')
    AND EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = student_id
        AND p.role = 'Estudiante'
        AND p.school_id = contact_requests.school_id
        AND is_minor_profile(p.role, p.age)
    )
  );

DROP POLICY IF EXISTS "contact_requests_company_cancel" ON contact_requests;
CREATE POLICY "contact_requests_company_cancel" ON contact_requests
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = company_id AND status = 'pending')
  WITH CHECK ((select auth.uid()) = company_id AND status = 'cancelled');

DROP POLICY IF EXISTS "contact_requests_school_review" ON contact_requests;
CREATE POLICY "contact_requests_school_review" ON contact_requests
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = school_id AND status = 'pending')
  WITH CHECK ((select auth.uid()) = school_id AND status IN ('approved','rejected'));

DROP POLICY IF EXISTS "contact_requests_delete_denied" ON contact_requests;
CREATE POLICY "contact_requests_delete_denied" ON contact_requests
  FOR DELETE TO authenticated USING (FALSE);

DROP POLICY IF EXISTS "conversations_insert_participant" ON conversations;
CREATE POLICY "conversations_insert_participant" ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id)
    AND can_converse(user1_id, user2_id)
  );

DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
CREATE POLICY "conversations_select_participant" ON conversations
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id);

DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = sender_id
    AND EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = (select auth.uid()) OR c.user2_id = (select auth.uid()))
        AND can_converse(c.user1_id, c.user2_id)
    )
  );

DROP POLICY IF EXISTS "messages_select_participants" ON messages;
CREATE POLICY "messages_select_participants" ON messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = conversation_id
      AND (c.user1_id = (select auth.uid()) OR c.user2_id = (select auth.uid()))
  ));

DROP POLICY IF EXISTS "interviews_insert_company" ON interviews;
CREATE POLICY "interviews_insert_company" ON interviews
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = company_id
    AND status = 'proposed'
    AND EXISTS (
      SELECT 1
      FROM job_applications ja
      JOIN job_postings jp ON jp.id = ja.job_id
      WHERE ja.id = application_id
        AND ja.applicant_id = interviews.student_id
        AND jp.company_id = (select auth.uid())
        AND jp.company_id = interviews.company_id
    )
    AND can_converse(company_id, student_id)
  );

DROP POLICY IF EXISTS "interviews_select" ON interviews;
CREATE POLICY "interviews_select" ON interviews
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = company_id OR (select auth.uid()) = student_id);

DROP POLICY IF EXISTS "interviews_update_participant" ON interviews;
CREATE POLICY "interviews_update_participant" ON interviews
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = company_id OR (select auth.uid()) = student_id)
  WITH CHECK ((select auth.uid()) = company_id OR (select auth.uid()) = student_id);

DROP POLICY IF EXISTS "applications_insert" ON job_applications;
CREATE POLICY "applications_insert" ON job_applications
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = applicant_id);

DROP POLICY IF EXISTS "applications_select" ON job_applications;
CREATE POLICY "applications_select" ON job_applications
  FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = applicant_id
    OR EXISTS (
      SELECT 1 FROM job_postings jp
      WHERE jp.id = job_id AND jp.company_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "applications_update" ON job_applications;
DROP POLICY IF EXISTS "job_applications_update_company" ON job_applications;
CREATE POLICY "applications_update" ON job_applications
  FOR UPDATE TO authenticated
  USING (
    (select auth.uid()) = applicant_id
    OR EXISTS (
      SELECT 1 FROM job_postings jp
      WHERE jp.id = job_id AND jp.company_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (select auth.uid()) = applicant_id
    OR EXISTS (
      SELECT 1 FROM job_postings jp
      WHERE jp.id = job_id AND jp.company_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "app_events_insert" ON application_events;
CREATE POLICY "app_events_insert" ON application_events
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = actor_id);

DROP POLICY IF EXISTS "app_events_select" ON application_events;
CREATE POLICY "app_events_select" ON application_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_applications a
      WHERE a.id = application_id AND a.applicant_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM job_applications a
      JOIN job_postings jp ON jp.id = a.job_id
      WHERE a.id = application_id AND jp.company_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "notif_select" ON notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notif_select" ON notifications
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "notif_update" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notif_update" ON notifications
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Public buckets still serve public object URLs, but clients should not be
-- able to enumerate every object in them.
DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
DROP POLICY IF EXISTS "banners_public_read" ON storage.objects;
DROP POLICY IF EXISTS "post_media_public_select" ON storage.objects;

NOTIFY pgrst, 'reload schema';
