-- Allow interview proposals for both legacy job_postings and canonical
-- opportunities while preserving the private contact/age boundary.

DROP POLICY IF EXISTS interviews_insert_company ON public.interviews;
CREATE POLICY interviews_insert_company ON public.interviews
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = company_id
    AND status = 'proposed'
    AND EXISTS (
      SELECT 1
      FROM public.job_applications ja
      WHERE ja.id = interviews.application_id
        AND ja.applicant_id = interviews.student_id
        AND (
          EXISTS (
            SELECT 1
            FROM public.job_postings jp
            WHERE jp.id = ja.job_id
              AND jp.company_id = (select auth.uid())
              AND jp.company_id = interviews.company_id
          )
          OR EXISTS (
            SELECT 1
            FROM public.opportunities o
            WHERE o.id = ja.opportunity_id
              AND o.publisher_type = 'company'
              AND o.publisher_id = (select auth.uid())
              AND o.publisher_id = interviews.company_id
          )
        )
    )
    AND private.can_converse(company_id, student_id)
  );

NOTIFY pgrst, 'reload schema';
