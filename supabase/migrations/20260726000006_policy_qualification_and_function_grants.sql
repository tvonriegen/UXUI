-- =====================================================================
-- Migration: Qualify policy columns and close inherited RPC grants
-- Date: 2026-07-26
-- Idempotent: safe to re-run.
-- =====================================================================

DROP POLICY IF EXISTS "contact_requests_insert_company" ON contact_requests;
CREATE POLICY "contact_requests_insert_company" ON contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = company_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND COALESCE(rejection_reason, '') = ''
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = contact_requests.company_id AND p.role = 'Empresa')
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = contact_requests.school_id AND p.role = 'Colegio')
    AND EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = contact_requests.student_id
        AND p.role = 'Estudiante'
        AND p.school_id = contact_requests.school_id
        AND is_minor_profile(p.role, p.age)
    )
  );

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
      WHERE ja.id = interviews.application_id
        AND ja.applicant_id = interviews.student_id
        AND jp.company_id = (select auth.uid())
        AND jp.company_id = interviews.company_id
    )
    AND can_converse(company_id, student_id)
  );

REVOKE EXECUTE ON FUNCTION public.bulk_upsert_student_profiles(JSONB) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
NOTIFY pgrst, 'reload schema';
