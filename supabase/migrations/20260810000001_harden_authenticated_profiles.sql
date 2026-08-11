-- Decision B / rollout posture D: authenticated profile reads are blocked until
-- this migration has been reviewed and applied in disposable staging.
-- Do not promote this migration to production from this change.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_authenticated_compat ON public.profiles;
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_public_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_select_authenticated_directory ON public.profiles;

CREATE POLICY profiles_select_owner ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

-- This is deliberately a separate row policy. It is not a frontend filter and
-- it cannot expose companies, schools or external accounts through the view.
CREATE POLICY profiles_select_authenticated_directory ON public.profiles
  FOR SELECT TO authenticated
  USING (
    account_type = 'student'
    AND account_status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.profile_id = profiles.id
        AND sp.public_visibility = TRUE
    )
  );

REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM authenticated;

-- Preserve legitimate self-service/school-mediated writes after the table-wide
-- revoke. These are the only profile columns written by the existing profile
-- flows; identity authority, ownership, status and sensitive fields stay out.
-- Existing UPDATE policies (profiles_update_own and
-- profiles_update_school_student) remain the row-level authorization boundary.
GRANT UPDATE (
  name, bio, location, specialty, title, availability, website, industry,
  avatar, banner_url, theme_color, soft_skills, benefits, tech_stack, updated_at
) ON public.profiles TO authenticated;

-- Safe authenticated projection allowlist. Sensitive identity and
-- institution-linking fields are intentionally absent (including any field
-- not explicitly listed here).
GRANT SELECT (
  id, name, role, avatar, bio, location, specialty, title, xp, level, streak,
  availability, years_experience, gpa, company_name, industry, website,
  open_positions, school_name, student_count, alliance_count,
  employability_rate, created_at, updated_at, banner_url, theme_color,
  longest_streak, xp_tier, reputation_score, grade, soft_skills, attendance,
  account_type, account_status
) ON public.profiles TO authenticated;

-- Owner-only sensitive self-service. The target is implicit: there is no
-- arbitrary profile getter and auth.uid() is checked inside the definer.
CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS TABLE (profile jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', p.id, 'email', p.email, 'name', p.name, 'role', p.role,
    'avatar', p.avatar, 'bio', p.bio, 'location', p.location,
    'specialty', p.specialty, 'title', p.title, 'xp', p.xp, 'level', p.level,
    'streak', p.streak, 'gpa', p.gpa, 'availability', p.availability,
    'years_experience', p.years_experience, 'company_name', p.company_name,
    'industry', p.industry, 'employee_count', p.employee_count,
    'website', p.website, 'open_positions', p.open_positions,
    'school_name', p.school_name, 'student_count', p.student_count,
    'alliance_count', p.alliance_count,
    'employability_rate', p.employability_rate, 'created_at', p.created_at,
    'updated_at', p.updated_at, 'gender', p.gender, 'cellphone', p.cellphone,
    'class_name', p.class_name, 'age', p.age, 'banner_url', p.banner_url,
    'theme_color', p.theme_color, 'last_active_date', p.last_active_date,
    'longest_streak', p.longest_streak, 'xp_tier', p.xp_tier,
    'reputation_score', p.reputation_score, 'grade', p.grade,
    'soft_skills', p.soft_skills, 'attendance', p.attendance, 'rut', p.rut,
    'school_id', p.school_id, 'account_type', p.account_type,
    'account_status', p.account_status
  )
  FROM public.profiles p
  WHERE p.id = (select auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_own_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;

-- School-scoped authorization adapter. This intentionally returns only a
-- boolean: callers must not learn another student's school_id. The relation
-- currently uses student_profiles.school_id as a legacy adapter; migrate this
-- predicate to the canonical enrollment relation when enrollments land.
CREATE OR REPLACE FUNCTION public.school_can_manage_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_members sm
    JOIN public.student_profiles sp ON sp.school_id = sm.school_id
    JOIN public.profiles student ON student.id = sp.profile_id
    WHERE sm.profile_id = (select auth.uid())
      AND sm.status = 'active'
      AND sm.member_role IN ('owner', 'admin', 'teacher', 'reviewer')
      AND sp.profile_id = p_student_id
      AND student.account_type = 'student'
  );
$$;

REVOKE ALL ON FUNCTION public.school_can_manage_student(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_can_manage_student(UUID) TO authenticated;

DROP VIEW IF EXISTS public.authenticated_profile_directory;
CREATE VIEW public.authenticated_profile_directory
  WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  p.id, p.name, p.role, p.avatar, p.bio, p.location, p.specialty, p.title,
  p.xp, p.level, p.streak, p.gpa, p.availability, p.years_experience,
  p.reputation_score, p.account_type, p.account_status
FROM public.profiles AS p
JOIN public.student_profiles AS sp ON sp.profile_id = p.id
WHERE p.account_type = 'student'
  AND p.account_status = 'active'
  AND sp.public_visibility = TRUE;

REVOKE ALL ON public.authenticated_profile_directory FROM PUBLIC, anon;
GRANT SELECT ON public.authenticated_profile_directory TO authenticated;

-- Company profile projection for the public company page. This is an
-- allowlist, not a generic profile getter: it omits email, rut, age,
-- cellphone, school_id and all other identity-linking fields. The database
-- predicate, not the frontend role, limits rows to active companies.
DROP VIEW IF EXISTS public.company_profile_directory;
CREATE VIEW public.company_profile_directory
  WITH (security_barrier = true)
AS
SELECT
  p.id, p.name, p.company_name, p.bio, p.avatar, p.location, p.industry,
  p.employee_count, p.website, p.benefits, p.tech_stack
FROM public.profiles AS p
WHERE p.account_type = 'company'
  AND p.account_status = 'active'
  AND p.role = 'Empresa';

REVOKE ALL ON public.company_profile_directory FROM PUBLIC;
GRANT SELECT ON public.company_profile_directory TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
