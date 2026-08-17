-- Give an opportunity owner the skills needed to calculate the same match
-- score shown to applicants, without exposing the global user_skills table.

CREATE OR REPLACE FUNCTION public.get_opportunity_applicant_skills(
  p_opportunity_id UUID
)
RETURNS TABLE(user_id UUID, name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH authorized_opportunity AS (
    SELECT p_opportunity_id AS id
    WHERE EXISTS (
      SELECT 1
      FROM public.opportunities o
      WHERE o.id = p_opportunity_id
        AND o.publisher_type = 'company'
        AND o.publisher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.job_postings jp
      WHERE jp.id = p_opportunity_id
        AND jp.company_id = auth.uid()
    )
  ), applicants AS (
    SELECT DISTINCT ja.applicant_id AS user_id
    FROM public.job_applications ja
    JOIN authorized_opportunity authorized ON TRUE
    WHERE ja.opportunity_id = authorized.id OR ja.job_id = authorized.id
  ), combined_skills AS (
    SELECT applicants.user_id, sk.name
    FROM applicants
    JOIN public.user_skills us ON us.user_id = applicants.user_id
    JOIN public.skills sk ON sk.id = us.skill_id
    UNION
    SELECT applicants.user_id, custom.name
    FROM applicants
    JOIN public.user_custom_skills custom ON custom.user_id = applicants.user_id
  )
  SELECT combined_skills.user_id, combined_skills.name
  FROM combined_skills
  ORDER BY combined_skills.user_id, combined_skills.name;
$$;

REVOKE ALL ON FUNCTION public.get_opportunity_applicant_skills(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_opportunity_applicant_skills(UUID)
  TO authenticated;

NOTIFY pgrst, 'reload schema';

