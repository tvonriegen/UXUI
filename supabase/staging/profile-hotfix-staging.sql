-- TalentHub S1 profile hotfix for the confirmed disposable staging project only.
-- Target: staging project uwkigsomnkhwjcfrgdts; never production.
-- Order: apply profile-runtime-baseline.sql first, then this artifact.
-- This compact artifact assumes every table and baseline helper referenced below
-- already exists. It intentionally contains no fixtures, Auth users, S2 objects,
-- production references, BEGIN, or COMMIT; the runner owns atomicity.

-- Keep the API surface fail-closed before recreating the final S1 policies.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_authenticated_compat ON public.profiles;
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_public_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_select_authenticated_directory ON public.profiles;
CREATE POLICY profiles_select_owner ON public.profiles
  FOR SELECT TO authenticated USING (id = (select auth.uid()));
CREATE POLICY profiles_select_authenticated_directory ON public.profiles
  FOR SELECT TO authenticated
  USING (account_type = 'student' AND account_status = 'active' AND EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.profile_id = profiles.id AND sp.public_visibility
  ));

REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE INSERT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, name, role, avatar, bio, location, specialty, title, xp, level, streak,
  availability, years_experience, company_name, industry, website,
  employee_count, benefits, tech_stack, reputation_score, account_type,
  account_status
) ON public.profiles TO authenticated;
GRANT UPDATE (
  name, bio, location, specialty, title, availability, website, industry,
  avatar, banner_url, theme_color, soft_skills, benefits, tech_stack, updated_at
) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_school_student ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));
CREATE POLICY profiles_update_school_student ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.school_can_manage_student(id))
  WITH CHECK (public.school_can_manage_student(id));

-- Owner-only sensitive profile read; no arbitrary profile id is accepted.
CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS TABLE (profile jsonb)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
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
    'account_status', p.account_status,
    'student_stage', CASE WHEN p.account_type = 'student' THEN (
      SELECT sp.student_stage FROM public.student_profiles sp
      WHERE sp.profile_id = p.id LIMIT 1
    ) ELSE NULL END
  )
  FROM public.profiles p WHERE p.id = (select auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_own_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;

-- School authorization and allowlisted dashboard/roster RPCs.
CREATE OR REPLACE FUNCTION public.school_can_manage_student(p_student_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.schools school ON school.id = sp.school_id
    LEFT JOIN public.profiles school_profile ON school_profile.id = school.profile_id
    JOIN public.profiles student ON student.id = sp.profile_id
    JOIN public.profiles actor ON actor.id = (select auth.uid())
    WHERE sp.profile_id = p_student_id AND school.status = 'active'
      AND school_profile.account_type = 'school'
      AND school_profile.account_status = 'active'
      AND actor.account_type = 'school' AND actor.account_status = 'active'
      AND student.account_type = 'student' AND student.account_status = 'active'
      AND (school.profile_id = (select auth.uid()) OR EXISTS (
        SELECT 1 FROM public.school_members sm
        WHERE sm.school_id = school.id AND sm.profile_id = (select auth.uid())
          AND sm.status = 'active'
          AND sm.member_role IN ('owner', 'admin', 'teacher', 'reviewer')
      ))
  );
$$;
REVOKE ALL ON FUNCTION public.school_can_manage_student(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_can_manage_student(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_school_dashboard()
RETURNS TABLE (school_name TEXT, location TEXT, student_count BIGINT,
  alliance_count INTEGER, employability_rate NUMERIC, specialties JSONB)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog STABLE
AS $$
  WITH actor_school AS (
    SELECT s.id, s.name, p.location, p.alliance_count, p.employability_rate
    FROM public.schools s JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.status = 'active' AND p.id = (select auth.uid())
      AND p.account_type = 'school' AND p.account_status = 'active'
    UNION
    SELECT s.id, s.name, p.location, p.alliance_count, p.employability_rate
    FROM public.schools s JOIN public.school_members sm ON sm.school_id = s.id
    JOIN public.profiles actor ON actor.id = sm.profile_id
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.status = 'active' AND sm.profile_id = (select auth.uid())
      AND sm.status = 'active' AND sm.member_role IN ('owner','admin','teacher','reviewer')
      AND actor.account_type = 'school' AND actor.account_status = 'active'
      AND p.account_type = 'school' AND p.account_status = 'active'
  ), valid_actor_school AS (
    SELECT (array_agg(id))[1] AS id FROM actor_school HAVING count(*) = 1
  ), scoped_students AS (
    SELECT sp.profile_id, sp.specialty
    FROM public.student_profiles sp JOIN public.profiles student ON student.id = sp.profile_id
    JOIN valid_actor_school a ON a.id = sp.school_id
    WHERE student.account_type = 'student' AND student.account_status = 'active'
  )
  SELECT a.name, a.location, COUNT(ss.profile_id), a.alliance_count,
    a.employability_rate,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('specialty', specialty, 'count', count)
      ORDER BY count DESC, specialty) FROM (
        SELECT COALESCE(specialty, 'Sin especialidad') AS specialty, COUNT(*) AS count
        FROM scoped_students GROUP BY 1
      ) grouped), '[]'::jsonb)
  FROM actor_school a LEFT JOIN scoped_students ss ON TRUE
  GROUP BY a.id, a.name, a.location, a.alliance_count, a.employability_rate;
$$;
REVOKE ALL ON FUNCTION public.get_school_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_school_dashboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_school_students()
RETURNS TABLE (id UUID, name TEXT, avatar TEXT, specialty TEXT, grade TEXT,
  attendance NUMERIC, availability TEXT, soft_skills JSONB, rut TEXT,
  gender TEXT, cellphone TEXT, class_name TEXT, age INTEGER)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog STABLE
AS $$
  WITH actor_school AS (
    SELECT s.id FROM public.schools s JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.status = 'active' AND p.id = (select auth.uid())
      AND p.account_type = 'school' AND p.account_status = 'active'
    UNION
    SELECT s.id FROM public.schools s JOIN public.school_members sm ON sm.school_id = s.id
    JOIN public.profiles actor ON actor.id = sm.profile_id
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.status = 'active' AND sm.profile_id = (select auth.uid())
      AND sm.status = 'active' AND sm.member_role IN ('owner','admin','teacher','reviewer')
      AND actor.account_type = 'school' AND actor.account_status = 'active'
      AND p.account_type = 'school' AND p.account_status = 'active'
  ), valid_actor_school AS (
    SELECT (array_agg(id))[1] AS id FROM actor_school HAVING count(*) = 1
  )
  SELECT p.id, p.name, p.avatar, p.specialty, p.grade, p.attendance,
    p.availability, p.soft_skills, p.rut, p.gender, p.cellphone, p.class_name, p.age
  FROM public.profiles p JOIN public.student_profiles sp ON sp.profile_id = p.id
  JOIN valid_actor_school a ON a.id = sp.school_id
  WHERE p.account_type = 'student' AND p.account_status = 'active' ORDER BY p.name;
$$;
REVOKE ALL ON FUNCTION public.get_school_students() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_school_students() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_own_school_profile()
RETURNS TABLE (name TEXT, avatar TEXT, location TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog STABLE
AS $$
  SELECT s.name, school_profile.avatar, school_profile.location
  FROM public.student_profiles sp JOIN public.schools s ON s.id = sp.school_id
  JOIN public.profiles school_profile ON school_profile.id = s.profile_id
  JOIN public.profiles actor ON actor.id = (select auth.uid())
  WHERE sp.profile_id = (select auth.uid()) AND actor.account_type = 'student'
    AND actor.account_status = 'active' AND s.status = 'active'
    AND school_profile.account_type = 'school'
    AND school_profile.account_status = 'active';
$$;
REVOKE ALL ON FUNCTION public.get_own_school_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_school_profile() TO authenticated;

-- Private evidence reviewer and event accessor. Evidence rows/events remain
-- unavailable as generic PostgREST resources.
CREATE OR REPLACE FUNCTION private.profile_evidence_school_reviewer(p_owner_id UUID, p_actor_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.schools school ON school.id = sp.school_id
    JOIN public.profiles student ON student.id = sp.profile_id
    JOIN public.profiles actor ON actor.id = p_actor_id
    LEFT JOIN public.profiles school_profile ON school_profile.id = school.profile_id
    WHERE sp.profile_id = p_owner_id AND school.status = 'active'
      AND school_profile.account_type = 'school' AND school_profile.account_status = 'active'
      AND actor.account_type = 'school' AND actor.account_status = 'active'
      AND student.account_type = 'student' AND student.account_status = 'active'
      AND (school.profile_id = p_actor_id OR EXISTS (
        SELECT 1 FROM public.school_members sm WHERE sm.school_id = school.id
          AND sm.profile_id = p_actor_id AND sm.status = 'active'
          AND sm.member_role IN ('owner','admin','teacher','reviewer')
      ))
  );
$$;
REVOKE ALL ON FUNCTION private.profile_evidence_school_reviewer(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.profile_evidence_school_reviewer(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_evidence_events(p_evidence_id UUID)
RETURNS TABLE (id UUID, evidence_id UUID, actor_id UUID, from_status TEXT,
  to_status TEXT, note TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog STABLE
AS $$
  SELECT ev.id, ev.evidence_id, ev.actor_id, ev.from_status, ev.to_status,
    ev.note, ev.created_at
  FROM public.profile_evidence_events ev JOIN public.profile_evidence e ON e.id = ev.evidence_id
  WHERE ev.evidence_id = p_evidence_id
    AND (e.owner_id = (select auth.uid())
      OR private.profile_evidence_school_reviewer(e.owner_id, (select auth.uid())));
$$;
REVOKE ALL ON FUNCTION public.get_profile_evidence_events(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_evidence_events(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION private.is_active_school_member(p_school_id UUID, p_profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members sm JOIN public.schools school ON school.id = sm.school_id
    JOIN public.profiles school_profile ON school_profile.id = school.profile_id
    JOIN public.profiles actor ON actor.id = sm.profile_id
    WHERE sm.school_id = p_school_id AND sm.profile_id = p_profile_id
      AND sm.status = 'active' AND school.status = 'active'
      AND school_profile.account_type = 'school' AND school_profile.account_status = 'active'
      AND actor.account_type = 'school' AND actor.account_status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION private.is_active_school_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_active_school_member(UUID, UUID) TO authenticated;

-- Evidence owner/reviewer guard; the baseline audit trigger remains attached to
-- profile_evidence and records every insert/status transition in its event table.
CREATE OR REPLACE FUNCTION public.trg_fn_profile_evidence_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  actor_id UUID := auth.uid();
  is_service_role BOOLEAN := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';
  is_school_reviewer BOOLEAN := private.profile_evidence_school_reviewer(OLD.owner_id, actor_id);
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'evidence ownership and creation time are immutable';
  END IF;
  IF is_service_role THEN NEW.updated_at := now(); RETURN NEW; END IF;
  IF actor_id = OLD.owner_id THEN
    IF OLD.status = 'rejected' AND NEW.status = 'pending' THEN
      IF NEW.validation_note IS DISTINCT FROM '' OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL THEN
        RAISE EXCEPTION 'rejected evidence resubmission must clear review metadata';
      END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'profile owners may only resubmit rejected evidence';
    ELSIF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.validation_note IS DISTINCT FROM OLD.validation_note THEN
      RAISE EXCEPTION 'profile owners cannot change review metadata';
    END IF;
  ELSIF is_school_reviewer THEN
    IF NEW.evidence_type IS DISTINCT FROM OLD.evidence_type OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description OR NEW.url IS DISTINCT FROM OLD.url
       OR NEW.issuer IS DISTINCT FROM OLD.issuer OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
       OR NEW.expires_at IS DISTINCT FROM OLD.expires_at OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
      RAISE EXCEPTION 'schools may only review evidence status and notes';
    END IF;
    IF OLD.status <> 'pending' OR NEW.status NOT IN ('verified','rejected') THEN
      RAISE EXCEPTION 'schools may only review pending evidence';
    END IF;
    NEW.reviewed_by := actor_id; NEW.reviewed_at := now();
  ELSE
    RAISE EXCEPTION 'only the owner school or service role may update evidence';
  END IF;
  NEW.updated_at := now(); RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.trg_fn_profile_evidence_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_profile_evidence_guard ON public.profile_evidence;
CREATE TRIGGER trg_profile_evidence_guard BEFORE UPDATE ON public.profile_evidence
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_profile_evidence_guard();

DROP POLICY IF EXISTS "profile_evidence_select" ON public.profile_evidence;
CREATE POLICY "profile_evidence_select" ON public.profile_evidence FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid())
    OR private.profile_evidence_school_reviewer(owner_id, (select auth.uid())));
DROP POLICY IF EXISTS "profile_evidence_review_school" ON public.profile_evidence;
CREATE POLICY "profile_evidence_review_school" ON public.profile_evidence FOR UPDATE TO authenticated
  USING (private.profile_evidence_school_reviewer(owner_id, (select auth.uid())))
  WITH CHECK (private.profile_evidence_school_reviewer(owner_id, (select auth.uid())));
DROP POLICY IF EXISTS "profile_evidence_events_select" ON public.profile_evidence_events;
CREATE POLICY "profile_evidence_events_select" ON public.profile_evidence_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profile_evidence e WHERE e.id = evidence_id
    AND (e.owner_id = (select auth.uid())
      OR private.profile_evidence_school_reviewer(e.owner_id, (select auth.uid())))));
DROP POLICY IF EXISTS school_members_scope_read ON public.school_members;
CREATE POLICY school_members_scope_read ON public.school_members FOR SELECT TO authenticated
  USING (profile_id = (select auth.uid())
    OR private.is_active_school_member(school_id, (select auth.uid())));
DROP POLICY IF EXISTS student_profiles_scope_read ON public.student_profiles;
CREATE POLICY student_profiles_scope_read ON public.student_profiles FOR SELECT TO authenticated
  USING (profile_id = (select auth.uid()) OR public_visibility
    OR private.is_active_school_member(school_id, (select auth.uid())));

REVOKE ALL ON public.profile_evidence, public.profile_evidence_events FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, evidence_type, title, description, url, issuer, status,
  reviewed_at, created_at, owner_id) ON public.profile_evidence TO authenticated;
GRANT INSERT (evidence_type, title, description, url, issuer, issued_at, expires_at)
  ON public.profile_evidence TO authenticated;
GRANT UPDATE (status, validation_note, reviewed_by, reviewed_at, updated_at)
  ON public.profile_evidence TO authenticated;
GRANT DELETE ON public.profile_evidence TO authenticated;
ALTER TABLE public.profile_evidence ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- Public student and company projections are invoker/barrier views. Sensitive
-- fields (email, rut, age, cellphone, gender, school_id, gpa) are excluded.
DROP VIEW IF EXISTS public.public_student_profiles;
CREATE VIEW public.public_student_profiles WITH (security_invoker = true, security_barrier = true) AS
SELECT sp.profile_id AS id, p.name, p.avatar, sp.specialty, sp.bio, sp.availability,
  private.public_school_name(sp.profile_id) AS school_name,
  private.public_validated_skills(sp.profile_id) AS validated_skills,
  private.public_has_verified_evidence(sp.profile_id) AS has_verified_evidence
FROM public.student_profiles sp JOIN public.profiles p ON p.id = sp.profile_id
WHERE p.account_type = 'student' AND p.account_status = 'active' AND sp.public_visibility;
REVOKE ALL ON public.public_student_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_student_profiles TO anon, authenticated;

DROP VIEW IF EXISTS public.authenticated_profile_directory;
CREATE VIEW public.authenticated_profile_directory
  WITH (security_invoker = true, security_barrier = true) AS
SELECT p.id, p.name, p.role, p.avatar, p.bio, p.location, p.specialty, p.title,
  p.xp, p.level, p.streak, p.availability, p.years_experience,
  p.reputation_score, p.account_type, p.account_status
FROM public.profiles p JOIN public.student_profiles sp ON sp.profile_id = p.id
WHERE p.account_type = 'student' AND p.account_status = 'active' AND sp.public_visibility;
REVOKE ALL ON public.authenticated_profile_directory FROM PUBLIC, anon;
GRANT SELECT ON public.authenticated_profile_directory TO authenticated;

DROP VIEW IF EXISTS public.company_profile_directory;
CREATE VIEW public.company_profile_directory
  WITH (security_invoker = true, security_barrier = true) AS
SELECT p.id, p.name, p.company_name, p.bio, p.avatar, p.location, p.industry,
  p.employee_count, p.website, p.benefits, p.tech_stack
FROM public.profiles p
WHERE p.account_type = 'company' AND p.account_status = 'active' AND p.role = 'Empresa';
REVOKE ALL ON public.company_profile_directory FROM PUBLIC;
GRANT SELECT ON public.company_profile_directory TO anon, authenticated;

-- Base privileges needed by invoker views, with no sensitive or institution-link
-- columns. The private projection helpers are callable only by the views/RLS.
GRANT SELECT (id, name, avatar, bio, location, specialty, title, availability,
  role, account_type, account_status) ON public.profiles TO anon;
GRANT SELECT (id, name, company_name, bio, avatar, location, industry,
  employee_count, website, benefits, tech_stack, role, account_type,
  account_status) ON public.profiles TO anon, authenticated;
GRANT SELECT (profile_id, specialty, bio, availability, public_visibility)
  ON public.student_profiles TO anon, authenticated;
REVOKE SELECT (school_id) ON public.student_profiles FROM anon, authenticated, public;
REVOKE ALL ON public.user_skills, public.skills, public.skill_validations FROM anon, authenticated;
REVOKE ALL ON FUNCTION private.public_school_name(UUID), private.public_validated_skills(UUID),
  private.public_has_verified_evidence(UUID) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.public_school_name(UUID), private.public_validated_skills(UUID),
  private.public_has_verified_evidence(UUID) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
