-- Decision B / rollout posture D: authenticated profile reads are blocked until
-- this migration has been reviewed and applied in disposable staging.
-- Do not promote this migration to production from this change.
-- Supabase applies each migration atomically; explicit BEGIN/COMMIT is omitted
-- so this file remains compatible with the migration runner.

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
REVOKE INSERT ON public.profiles FROM anon, authenticated;
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
  availability, years_experience, company_name, industry, website,
  employee_count, benefits, tech_stack, reputation_score,
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
     'account_status', p.account_status,
     'student_stage', CASE WHEN p.account_type = 'student' THEN (
       SELECT sp.student_stage
       FROM public.student_profiles sp
       WHERE sp.profile_id = p.id
       LIMIT 1
     ) ELSE NULL END
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
    FROM public.student_profiles sp
    JOIN public.schools school ON school.id = sp.school_id
    LEFT JOIN public.profiles school_profile ON school_profile.id = school.profile_id
    JOIN public.profiles student ON student.id = sp.profile_id
    JOIN public.profiles actor ON actor.id = (select auth.uid())
    WHERE sp.profile_id = p_student_id
       AND school.status = 'active'
       AND school_profile.account_type = 'school'
       AND school_profile.account_status = 'active'
       AND actor.account_type = 'school'
       AND actor.account_status = 'active'
       AND student.account_type = 'student'
       AND student.account_status = 'active'
       AND (
         school.profile_id = (select auth.uid())
         OR EXISTS (
           SELECT 1 FROM public.school_members sm
           WHERE sm.school_id = school.id
             AND sm.profile_id = (select auth.uid())
             AND sm.status = 'active'
             AND sm.member_role IN ('owner', 'admin', 'teacher', 'reviewer')
         )
       )
   );
$$;

REVOKE ALL ON FUNCTION public.school_can_manage_student(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_can_manage_student(UUID) TO authenticated;

-- Allowlisted school dashboard aggregate. It authenticates the actor and
-- resolves the school through an active membership; no private student row or
-- identity field is returned.
CREATE OR REPLACE FUNCTION public.get_school_dashboard()
RETURNS TABLE (school_name TEXT, location TEXT, student_count BIGINT,
  alliance_count INTEGER, employability_rate NUMERIC, specialties JSONB)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog STABLE
AS $$
  WITH actor_school AS (
    SELECT s.id, s.name, school_profile.location,
      school_profile.alliance_count, school_profile.employability_rate
    FROM public.schools s
    JOIN public.profiles school_profile ON school_profile.id = s.profile_id
    WHERE s.status = 'active' AND school_profile.id = (select auth.uid())
      AND school_profile.account_type = 'school'
      AND school_profile.account_status = 'active'
     UNION
    SELECT s.id, s.name, school_profile.location,
      school_profile.alliance_count, school_profile.employability_rate
    FROM public.schools s
    JOIN public.school_members sm ON sm.school_id = s.id
    JOIN public.profiles actor ON actor.id = sm.profile_id
    JOIN public.profiles school_profile ON school_profile.id = s.profile_id
    WHERE s.status = 'active' AND sm.profile_id = (select auth.uid())
      AND sm.status = 'active' AND sm.member_role IN ('owner','admin','teacher','reviewer')
      AND actor.account_type = 'school' AND actor.account_status = 'active'
      AND school_profile.account_type = 'school' AND school_profile.account_status = 'active'
   ), valid_actor_school AS (
     SELECT (array_agg(id))[1] AS id
     FROM actor_school
     HAVING count(*) = 1
   ), scoped_students AS (
    SELECT sp.profile_id, sp.specialty
    FROM public.student_profiles sp
    JOIN public.profiles student ON student.id = sp.profile_id
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

-- School-scoped roster projection for S1 consumers. Sensitive student fields
-- are available only through this actor-bound, allowlisted RPC; school_id and
-- student_stage are intentionally absent.
CREATE OR REPLACE FUNCTION public.get_school_students()
RETURNS TABLE (
  id UUID, name TEXT, avatar TEXT, specialty TEXT, grade TEXT,
  attendance NUMERIC, availability TEXT, soft_skills JSONB,
  rut TEXT, gender TEXT, cellphone TEXT, class_name TEXT, age INTEGER
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog STABLE
AS $$
  WITH actor_school AS (
    SELECT s.id
    FROM public.schools s
    JOIN public.profiles school_profile ON school_profile.id = s.profile_id
    WHERE s.status = 'active' AND school_profile.id = (select auth.uid())
      AND school_profile.account_type = 'school'
      AND school_profile.account_status = 'active'
    UNION
    SELECT s.id
    FROM public.schools s
    JOIN public.school_members sm ON sm.school_id = s.id
    JOIN public.profiles actor ON actor.id = sm.profile_id
    JOIN public.profiles school_profile ON school_profile.id = s.profile_id
    WHERE s.status = 'active' AND sm.profile_id = (select auth.uid())
      AND sm.status = 'active' AND sm.member_role IN ('owner','admin','teacher','reviewer')
      AND actor.account_type = 'school' AND actor.account_status = 'active'
      AND school_profile.account_type = 'school' AND school_profile.account_status = 'active'
  ), valid_actor_school AS (
    SELECT (array_agg(id))[1] AS id FROM actor_school HAVING count(*) = 1
  )
  SELECT p.id, p.name, p.avatar, p.specialty, p.grade, p.attendance,
    p.availability, p.soft_skills, p.rut, p.gender, p.cellphone, p.class_name, p.age
  FROM public.profiles p
  JOIN public.student_profiles sp ON sp.profile_id = p.id
  JOIN valid_actor_school a ON a.id = sp.school_id
  WHERE p.account_type = 'student' AND p.account_status = 'active'
  ORDER BY p.name;
$$;
REVOKE ALL ON FUNCTION public.get_school_students() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_school_students() TO authenticated;

-- Owner-scoped school directory for a student's own profile. The school id is
-- resolved inside the definer and is never accepted from or returned to the client.
CREATE OR REPLACE FUNCTION public.get_own_school_profile()
RETURNS TABLE (name TEXT, avatar TEXT, location TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog STABLE
AS $$
  SELECT s.name, school_profile.avatar, school_profile.location
  FROM public.student_profiles sp
  JOIN public.schools s ON s.id = sp.school_id
  JOIN public.profiles school_profile ON school_profile.id = s.profile_id
  JOIN public.profiles actor ON actor.id = (select auth.uid())
  WHERE sp.profile_id = (select auth.uid())
    AND actor.account_type = 'student' AND actor.account_status = 'active'
    AND s.status = 'active'
    AND school_profile.account_type = 'school'
    AND school_profile.account_status = 'active';
$$;
REVOKE ALL ON FUNCTION public.get_own_school_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_school_profile() TO authenticated;

-- The legacy public reviewer is referenced by policies and the update guard
-- created by 20260726000004. Replace every dependency before removing the
-- public symbol; otherwise PostgreSQL rejects the DROP and leaves the hotfix
-- half-applied. The private helper is still SECURITY DEFINER so RLS can use
-- it as a predicate, but it is not an API function in the exposed schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.profile_evidence_school_reviewer(
  p_owner_id UUID,
  p_actor_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_profiles sp
    JOIN public.schools school ON school.id = sp.school_id
    JOIN public.profiles student ON student.id = sp.profile_id
    JOIN public.profiles actor ON actor.id = p_actor_id
    LEFT JOIN public.profiles school_profile ON school_profile.id = school.profile_id
    WHERE sp.profile_id = p_owner_id
      AND school.status = 'active'
      AND school_profile.account_type = 'school'
      AND school_profile.account_status = 'active'
      AND actor.account_type = 'school'
      AND actor.account_status = 'active'
       AND student.account_type = 'student'
       AND student.account_status = 'active'
       AND (
         school.profile_id = p_actor_id
         OR EXISTS (
           SELECT 1 FROM public.school_members sm
           WHERE sm.school_id = school.id
             AND sm.profile_id = p_actor_id
             AND sm.status = 'active'
             AND sm.member_role IN ('owner', 'admin', 'teacher', 'reviewer')
         )
       )
  );
$$;

REVOKE ALL ON FUNCTION private.profile_evidence_school_reviewer(UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.profile_evidence_school_reviewer(UUID, UUID)
  TO authenticated;

-- Audit verification is exposed only for evidence the caller may already
-- inspect; the base audit table remains unavailable through PostgREST.
CREATE OR REPLACE FUNCTION public.get_profile_evidence_events(p_evidence_id UUID)
RETURNS TABLE (id UUID, evidence_id UUID, actor_id UUID, from_status TEXT,
  to_status TEXT, note TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog STABLE
AS $$
  SELECT ev.id, ev.evidence_id, ev.actor_id, ev.from_status, ev.to_status,
    ev.note, ev.created_at
  FROM public.profile_evidence_events ev
  JOIN public.profile_evidence e ON e.id = ev.evidence_id
  WHERE ev.evidence_id = p_evidence_id
    AND (e.owner_id = (select auth.uid())
      OR private.profile_evidence_school_reviewer(e.owner_id, (select auth.uid())));
$$;
REVOKE ALL ON FUNCTION public.get_profile_evidence_events(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_evidence_events(UUID) TO authenticated;

-- RLS policies must not inspect school_members through its own policy. This
-- private boolean adapter runs with the definer's row privileges and exposes
-- no membership rows through PostgREST.
CREATE OR REPLACE FUNCTION private.is_active_school_member(
  p_school_id UUID,
  p_profile_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_members sm
    JOIN public.schools school ON school.id = sm.school_id
    JOIN public.profiles school_profile ON school_profile.id = school.profile_id
    JOIN public.profiles actor ON actor.id = sm.profile_id
    WHERE sm.school_id = p_school_id
      AND sm.profile_id = p_profile_id
      AND sm.status = 'active'
      AND school.status = 'active'
      AND school_profile.account_type = 'school'
      AND school_profile.account_status = 'active'
      AND actor.account_type = 'school'
      AND actor.account_status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION private.is_active_school_member(UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_active_school_member(UUID, UUID)
  TO authenticated;

CREATE OR REPLACE FUNCTION private.public_school_name(p_profile_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT s.name
  FROM public.student_profiles sp
  JOIN public.schools s ON s.id = sp.school_id
  WHERE sp.profile_id = p_profile_id AND s.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.public_validated_skills(p_student_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE((
    SELECT jsonb_agg(DISTINCT sk.name ORDER BY sk.name)
    FROM public.user_skills us
    JOIN public.skills sk ON sk.id = us.skill_id
    JOIN public.skill_validations sv
      ON sv.student_id = us.user_id AND sv.skill_id = us.skill_id
    WHERE us.user_id = p_student_id AND sv.status = 'validated'
  ), '[]'::jsonb);
$$;

CREATE OR REPLACE FUNCTION private.public_has_verified_evidence(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_evidence pe
    WHERE pe.owner_id = p_student_id AND pe.status = 'verified'
  );
$$;

REVOKE ALL ON FUNCTION private.public_school_name(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.public_validated_skills(UUID), private.public_has_verified_evidence(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.public_school_name(UUID),
  private.public_validated_skills(UUID), private.public_has_verified_evidence(UUID)
  TO anon, authenticated;

-- Recreate the trigger function while the old public helper still exists.
CREATE OR REPLACE FUNCTION public.trg_fn_profile_evidence_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  actor_id UUID := auth.uid();
  is_service_role BOOLEAN := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';
  is_school_reviewer BOOLEAN := private.profile_evidence_school_reviewer(OLD.owner_id, actor_id);
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
     IF OLD.status = 'rejected' AND NEW.status = 'pending' THEN
       IF NEW.validation_note IS DISTINCT FROM ''
          OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL THEN
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

REVOKE ALL ON FUNCTION public.trg_fn_profile_evidence_guard() FROM PUBLIC, anon, authenticated;

-- Point all RLS dependencies at the private helper before dropping the
-- obsolete public function. The names are kept stable for policy consumers.
DROP POLICY IF EXISTS "profile_evidence_select" ON public.profile_evidence;
CREATE POLICY "profile_evidence_select" ON public.profile_evidence
  FOR SELECT TO authenticated
  USING (
    owner_id = (select auth.uid())
    OR private.profile_evidence_school_reviewer(owner_id, (select auth.uid()))
  );

DROP POLICY IF EXISTS "profile_evidence_review_school" ON public.profile_evidence;
CREATE POLICY "profile_evidence_review_school" ON public.profile_evidence
  FOR UPDATE TO authenticated
  USING (private.profile_evidence_school_reviewer(owner_id, (select auth.uid())))
  WITH CHECK (private.profile_evidence_school_reviewer(owner_id, (select auth.uid())));

DROP POLICY IF EXISTS "profile_evidence_events_select" ON public.profile_evidence_events;
CREATE POLICY "profile_evidence_events_select" ON public.profile_evidence_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profile_evidence e
      WHERE e.id = evidence_id
        AND (
          e.owner_id = (select auth.uid())
          OR private.profile_evidence_school_reviewer(e.owner_id, (select auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS school_members_scope_read ON public.school_members;
CREATE POLICY school_members_scope_read ON public.school_members
  FOR SELECT TO authenticated
  USING (
    profile_id = (select auth.uid())
    OR private.is_active_school_member(school_id, (select auth.uid()))
  );

DROP POLICY IF EXISTS student_profiles_scope_read ON public.student_profiles;
CREATE POLICY student_profiles_scope_read ON public.student_profiles
  FOR SELECT TO authenticated
  USING (
    profile_id = (select auth.uid())
    OR public_visibility
    OR private.is_active_school_member(school_id, (select auth.uid()))
  );

DROP TRIGGER IF EXISTS trg_profile_evidence_guard ON public.profile_evidence;
CREATE TRIGGER trg_profile_evidence_guard
  BEFORE UPDATE ON public.profile_evidence
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_profile_evidence_guard();

-- No policy, trigger or API role references this symbol anymore, so the drop
-- is dependency-safe and cannot leave an executable public reviewer behind.
DROP FUNCTION IF EXISTS public.profile_evidence_school_reviewer(UUID, UUID);

DROP VIEW IF EXISTS public.public_student_profiles;
CREATE VIEW public.public_student_profiles
  WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  sp.profile_id AS id,
  p.name,
  p.avatar,
  sp.specialty,
  sp.bio,
  sp.availability,
  private.public_school_name(sp.profile_id) AS school_name,
  private.public_validated_skills(sp.profile_id) AS validated_skills,
  private.public_has_verified_evidence(sp.profile_id) AS has_verified_evidence
FROM public.student_profiles sp
JOIN public.profiles p ON p.id = sp.profile_id
WHERE p.account_type = 'student'
  AND p.account_status = 'active'
  AND sp.public_visibility = TRUE;

REVOKE ALL ON public.public_student_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_student_profiles TO anon, authenticated;

DROP VIEW IF EXISTS public.authenticated_profile_directory;
CREATE VIEW public.authenticated_profile_directory
  WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  p.id, p.name, p.role, p.avatar, p.bio, p.location, p.specialty, p.title,
  p.xp, p.level, p.streak, p.availability, p.years_experience,
  p.reputation_score, p.account_type, p.account_status
FROM public.profiles AS p
JOIN public.student_profiles AS sp ON sp.profile_id = p.id
WHERE p.account_type = 'student'
  AND p.account_status = 'active'
  AND sp.public_visibility = TRUE;

REVOKE ALL ON public.authenticated_profile_directory FROM PUBLIC, anon;
GRANT SELECT ON public.authenticated_profile_directory TO authenticated;
-- security_invoker makes the directory use the caller's underlying table
-- privileges; grant only the columns required to evaluate this projection.
GRANT SELECT (profile_id, specialty, bio, availability, public_visibility)
  ON public.student_profiles TO authenticated;
REVOKE SELECT (school_id) ON public.student_profiles FROM authenticated;
REVOKE SELECT (school_id) ON public.student_profiles FROM anon, public;

-- Evidence is never a table-wide API. Keep only the columns used by the
-- owner/reviewer flows; the S1 baseline owns the audit/event relation.
REVOKE ALL ON public.profile_evidence FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, evidence_type, title, description, url, issuer, status,
  reviewed_at, created_at, owner_id) ON public.profile_evidence TO authenticated;
-- owner_id and status are database-controlled (auth.uid() / pending default).
ALTER TABLE public.profile_evidence ALTER COLUMN owner_id SET DEFAULT auth.uid();
GRANT INSERT (evidence_type, title, description, url, issuer, issued_at, expires_at)
  ON public.profile_evidence TO authenticated;
GRANT UPDATE (status, validation_note, reviewed_by, reviewed_at, updated_at)
  ON public.profile_evidence TO authenticated;
GRANT DELETE ON public.profile_evidence TO authenticated;
REVOKE ALL ON public.profile_evidence_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.user_skills, public.skill_validations FROM anon, authenticated;

-- Company profile projection for the public company page. This is an
-- allowlist, not a generic profile getter: it omits email, rut, age,
-- cellphone, school_id and all other identity-linking fields. The database
-- predicate, not the frontend role, limits rows to active companies.
DROP VIEW IF EXISTS public.company_profile_directory;
CREATE VIEW public.company_profile_directory
  WITH (security_invoker = true, security_barrier = true)
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

-- The hotfix revokes the table-wide profile grant above, so restore only the
-- safe columns required by the two invoker views. RLS policies in S1 still
-- constrain rows to public students or active companies.
GRANT SELECT (id, name, company_name, bio, avatar, location, industry,
  employee_count, website, benefits, tech_stack, role, account_type,
  account_status) ON public.profiles
  TO anon, authenticated;

-- security_invoker also evaluates the public student view's profile and
-- evidence predicates as anon. Restore only the non-sensitive base columns
-- required by those predicates and projection; never email/rut/age/phone,
-- school_id, gpa or validation_note.
GRANT SELECT (id, name, avatar, bio, location, specialty, title, availability,
  role, account_type, account_status) ON public.profiles TO anon;
REVOKE SELECT ON public.profile_evidence FROM anon;

-- These helpers were never intended to be an API. Remove them from public;
-- policies use the private membership adapter and only school_can_manage_student
-- remains the cross-tenant authorization RPC in the public schema.
DROP FUNCTION IF EXISTS public.is_active_school_member(UUID, UUID);
NOTIFY pgrst, 'reload schema';
