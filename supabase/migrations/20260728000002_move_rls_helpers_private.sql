-- RLS predicates need SECURITY DEFINER to inspect rows protected by the
-- policies they help evaluate, but they are not application RPC endpoints.
-- Keep them in a non-exposed schema and point policies at the private copies.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.can_converse(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, private
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

CREATE OR REPLACE FUNCTION private.is_active_school_member(p_school_id UUID, p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM school_members sm
    WHERE sm.school_id = p_school_id
      AND sm.profile_id = p_profile_id
      AND sm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION private.is_school_admin(p_school_id UUID, p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM school_members sm
    WHERE sm.school_id = p_school_id
      AND sm.profile_id = p_profile_id
      AND sm.status = 'active'
      AND sm.member_role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION private.can_converse(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_active_school_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_school_admin(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_converse(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_active_school_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_school_admin(UUID, UUID) TO authenticated;

ALTER POLICY conversations_insert_participant ON public.conversations
  WITH CHECK (((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id)
    AND private.can_converse(user1_id, user2_id));

ALTER POLICY interviews_insert_company ON public.interviews
  WITH CHECK (
    (select auth.uid()) = company_id
    AND status = 'proposed'
    AND EXISTS (
      SELECT 1
      FROM job_applications ja
      JOIN job_postings jp ON jp.id = ja.job_id
      WHERE ja.id = interviews.application_id
        AND ja.applicant_id = interviews.student_id
        AND jp.company_id = (select auth.uid())
        AND jp.company_id = interviews.company_id
    )
    AND private.can_converse(company_id, student_id)
  );

ALTER POLICY messages_insert_participant ON public.messages
  WITH CHECK (
    (select auth.uid()) = sender_id
    AND EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user1_id = (select auth.uid()) OR c.user2_id = (select auth.uid()))
        AND private.can_converse(c.user1_id, c.user2_id)
    )
  );

ALTER POLICY school_members_delete_admin ON public.school_members
  USING (private.is_school_admin(school_id, (select auth.uid())));
ALTER POLICY school_members_insert_admin ON public.school_members
  WITH CHECK (private.is_school_admin(school_id, (select auth.uid())));
ALTER POLICY school_members_select_scope ON public.school_members
  USING (profile_id = (select auth.uid())
    OR private.is_active_school_member(school_id, (select auth.uid())));
ALTER POLICY school_members_update_admin ON public.school_members
  USING (private.is_school_admin(school_id, (select auth.uid())))
  WITH CHECK (private.is_school_admin(school_id, (select auth.uid())));

ALTER POLICY schools_select_member ON public.schools
  USING (profile_id = (select auth.uid())
    OR private.is_active_school_member(id, (select auth.uid())));

ALTER POLICY student_profiles_select_scope ON public.student_profiles
  USING (profile_id = (select auth.uid())
    OR public_visibility = TRUE
    OR (school_id IS NOT NULL
      AND private.is_active_school_member(school_id, (select auth.uid()))));
ALTER POLICY student_profiles_update_school ON public.student_profiles
  USING (school_id IS NOT NULL
    AND private.is_active_school_member(school_id, (select auth.uid())))
  WITH CHECK (school_id IS NOT NULL
    AND private.is_active_school_member(school_id, (select auth.uid())));

-- Leave compatibility symbols unavailable as direct RPCs. Existing policies
-- now reference the private copies above.
ALTER FUNCTION public.can_converse(UUID, UUID) SECURITY INVOKER;
ALTER FUNCTION public.is_active_school_member(UUID, UUID) SECURITY INVOKER;
ALTER FUNCTION public.is_school_admin(UUID, UUID) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.can_converse(UUID, UUID) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_school_member(UUID, UUID) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.is_school_admin(UUID, UUID) FROM anon, authenticated, PUBLIC;

NOTIFY pgrst, 'reload schema';
