-- Contact security gate hardening.
-- Forward-only: apply through the normal staging migration flow; this change
-- intentionally does not execute SQL against a remote project.

-- Contact requests are created only by can_request_student_contact(), which
-- derives company, student and school identities from protected records.
REVOKE INSERT ON public.contact_requests FROM PUBLIC, authenticated, anon;
DROP POLICY IF EXISTS "contact_requests_insert_company" ON public.contact_requests;

-- Keep school visibility and review fail-closed. contact_requests.school_id is
-- the school's profile id, while school_members.school_id is schools.id.
DROP POLICY IF EXISTS "contact_requests_select_company_school" ON public.contact_requests;
CREATE OR REPLACE FUNCTION private.can_review_contact_request(p_school_profile_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM schools s
    JOIN profiles school_profile ON school_profile.id = s.profile_id
    JOIN school_members sm ON sm.school_id = s.id AND sm.profile_id = (select auth.uid())
    JOIN profiles member_profile ON member_profile.id = sm.profile_id
    WHERE s.profile_id = p_school_profile_id
      AND s.status = 'active'
      AND school_profile.account_type = 'school'
      AND school_profile.role = 'Colegio'
      AND school_profile.account_status = 'active'
      AND sm.status = 'active'
      AND sm.member_role IN ('owner', 'admin', 'teacher', 'reviewer')
      AND member_profile.account_type = 'school'
      AND member_profile.role = 'Colegio'
      AND member_profile.account_status = 'active'
  );
$$;
REVOKE EXECUTE ON FUNCTION private.can_review_contact_request(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_review_contact_request(UUID) TO authenticated;

CREATE POLICY "contact_requests_select_company_school" ON public.contact_requests
  FOR SELECT USING (
    (select auth.uid()) = company_id
    OR private.can_review_contact_request(contact_requests.school_id)
  );

DROP POLICY IF EXISTS "contact_requests_school_review" ON public.contact_requests;
CREATE POLICY "contact_requests_school_review" ON public.contact_requests
  FOR UPDATE
  USING (
    status = 'pending'
    AND private.can_review_contact_request(contact_requests.school_id)
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
    AND private.can_review_contact_request(contact_requests.school_id)
  );

-- Align the mediator check with the canonical school and active-member
-- predicates. The RPC remains the only write path for new requests.
CREATE OR REPLACE FUNCTION public.can_request_student_contact(
  p_student_id UUID,
  p_message TEXT DEFAULT ''
)
RETURNS TABLE (decision TEXT, contact_request_id UUID, conversation_id UUID, school_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_student_school UUID;
  v_school_profile_id UUID;
  v_is_minor BOOLEAN;
  v_request_id UUID;
  v_request_status TEXT;
  v_conversation_id UUID;
  v_user_a UUID;
  v_user_b UUID;
BEGIN
  IF v_caller IS NULL OR p_student_id IS NULL OR v_caller = p_student_id THEN
    RETURN QUERY SELECT 'DENY'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID; RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = p_student_id AND p.account_type = 'student' AND p.role IN ('Estudiante', 'Egresado') AND p.account_status = 'active') THEN
    RETURN QUERY SELECT 'DENY'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID; RETURN;
  END IF;

  -- External actors are authorized only by the canonical freelance model. The
  -- accepted proposal is the explicit consent state for direct contact; a
  -- draft opportunity, a proposal for another opportunity, or any other
  -- proposal status is fail-closed. An accepted proposal remains a valid
  -- relation after the opportunity closes/expires, so historical valid
  -- opportunities are included while drafts are excluded.
  IF EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = v_caller
      AND p.account_type = 'external'
      AND p.role = 'Externo'
      AND p.account_status = 'active'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM opportunities o
      JOIN opportunity_proposals op ON op.opportunity_id = o.id
      WHERE o.publisher_id = v_caller
        AND o.publisher_type = 'external'
        AND o.opportunity_type = 'freelance'
        AND o.status IN ('open', 'closed', 'expired')
        AND op.applicant_id = p_student_id
        AND op.status = 'accepted'
    ) THEN
      RETURN QUERY SELECT 'DENY'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID; RETURN;
    END IF;

    v_user_a := LEAST(v_caller, p_student_id);
    v_user_b := GREATEST(v_caller, p_student_id);
    SELECT c.id INTO v_conversation_id
    FROM conversations c
    WHERE c.user1_id = v_user_a AND c.user2_id = v_user_b;

    IF v_conversation_id IS NULL THEN
      INSERT INTO conversations (user1_id, user2_id, last_message_at)
      VALUES (v_user_a, v_user_b, NOW())
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_conversation_id;
      IF v_conversation_id IS NULL THEN
        SELECT c.id INTO v_conversation_id
        FROM conversations c
        WHERE c.user1_id = v_user_a AND c.user2_id = v_user_b;
      END IF;
    END IF;
    RETURN QUERY SELECT 'ALLOW'::TEXT, NULL::UUID, v_conversation_id, NULL::UUID; RETURN;
  END IF;

  -- Company paths below intentionally retain their existing legacy and
  -- canonical opportunity authorization rules.
  IF NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = v_caller AND p.account_type = 'company' AND p.role = 'Empresa' AND p.account_status = 'active') THEN
    RETURN QUERY SELECT 'DENY'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID; RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM job_applications ja JOIN job_postings jp ON jp.id = ja.job_id
    WHERE ja.applicant_id = p_student_id AND jp.company_id = v_caller
  ) AND NOT EXISTS (
    SELECT 1 FROM job_applications ja JOIN opportunities o ON o.id = ja.opportunity_id
    WHERE ja.applicant_id = p_student_id AND o.publisher_id = v_caller AND o.publisher_type = 'company'
  ) THEN
    RETURN QUERY SELECT 'DENY'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID; RETURN;
  END IF;

  SELECT sp.school_id, (p.role = 'Estudiante' AND (p.age IS NULL OR p.age < 18))
    INTO v_student_school, v_is_minor
  FROM profiles p LEFT JOIN student_profiles sp ON sp.profile_id = p.id WHERE p.id = p_student_id;

  IF v_is_minor THEN
    SELECT s.profile_id INTO v_school_profile_id
    FROM schools s JOIN profiles school_profile ON school_profile.id = s.profile_id
    WHERE s.id = v_student_school AND s.status = 'active'
      AND school_profile.account_type = 'school' AND school_profile.role = 'Colegio'
      AND school_profile.account_status = 'active'
      AND EXISTS (
        SELECT 1 FROM school_members sm JOIN profiles mediator ON mediator.id = sm.profile_id
        WHERE sm.school_id = s.id AND sm.status = 'active'
          AND sm.member_role IN ('owner', 'admin', 'teacher', 'reviewer')
          AND mediator.account_type = 'school' AND mediator.account_status = 'active'
      );

    IF v_student_school IS NULL OR v_school_profile_id IS NULL THEN
      RETURN QUERY SELECT 'DENY'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID; RETURN;
    END IF;

    INSERT INTO contact_requests (company_id, student_id, school_id, message)
    VALUES (v_caller, p_student_id, v_school_profile_id, LEFT(COALESCE(p_message, ''), 2000))
    ON CONFLICT (company_id, student_id) WHERE status IN ('pending', 'approved') DO NOTHING
    RETURNING id INTO v_request_id;

    IF v_request_id IS NULL THEN
      SELECT cr.id, cr.status INTO v_request_id, v_request_status
      FROM contact_requests cr WHERE cr.company_id = v_caller AND cr.student_id = p_student_id
        AND cr.status IN ('pending', 'approved') ORDER BY cr.created_at DESC LIMIT 1;
    ELSE v_request_status := 'pending'; END IF;

    IF v_request_status = 'approved' THEN
      v_user_a := LEAST(v_caller, p_student_id); v_user_b := GREATEST(v_caller, p_student_id);
      SELECT c.id INTO v_conversation_id FROM conversations c WHERE c.user1_id = v_user_a AND c.user2_id = v_user_b;
      IF v_conversation_id IS NULL THEN
        INSERT INTO conversations (user1_id, user2_id, last_message_at) VALUES (v_user_a, v_user_b, NOW())
          ON CONFLICT DO NOTHING RETURNING id INTO v_conversation_id;
      END IF;
      RETURN QUERY SELECT 'ALLOW'::TEXT, v_request_id, v_conversation_id, v_school_profile_id; RETURN;
    END IF;
    RETURN QUERY SELECT 'MEDIATED'::TEXT, v_request_id, NULL::UUID, v_school_profile_id; RETURN;
  END IF;

  v_user_a := LEAST(v_caller, p_student_id); v_user_b := GREATEST(v_caller, p_student_id);
  SELECT c.id INTO v_conversation_id FROM conversations c WHERE c.user1_id = v_user_a AND c.user2_id = v_user_b;
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (user1_id, user2_id, last_message_at) VALUES (v_user_a, v_user_b, NOW())
      ON CONFLICT DO NOTHING RETURNING id INTO v_conversation_id;
    IF v_conversation_id IS NULL THEN
      SELECT c.id INTO v_conversation_id FROM conversations c WHERE c.user1_id = v_user_a AND c.user2_id = v_user_b;
    END IF;
  END IF;
  RETURN QUERY SELECT 'ALLOW'::TEXT, NULL::UUID, v_conversation_id, NULL::UUID;
END;
$$;

REVOKE ALL ON FUNCTION public.can_request_student_contact(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_request_student_contact(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
