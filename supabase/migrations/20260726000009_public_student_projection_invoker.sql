-- Make the public projection obey base-table RLS while keeping the base
-- tables column-restricted for anonymous clients.

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
  s.name AS school_name,
  COALESCE(
    (
      SELECT jsonb_agg(DISTINCT sk.name ORDER BY sk.name)
      FROM user_skills us
      JOIN skills sk ON sk.id = us.skill_id
      JOIN skill_validations sv
        ON sv.student_id = us.user_id
       AND sv.skill_id = us.skill_id
      WHERE us.user_id = sp.profile_id
    ),
    '[]'::jsonb
  ) AS validated_skills,
  EXISTS (
    SELECT 1 FROM profile_evidence pe
    WHERE pe.owner_id = sp.profile_id AND pe.status = 'verified'
  ) AS has_verified_evidence
FROM student_profiles sp
JOIN profiles p ON p.id = sp.profile_id
LEFT JOIN schools s ON s.id = sp.school_id
WHERE p.account_type = 'student'
  AND p.account_status = 'active'
  AND sp.public_visibility = TRUE;

DROP POLICY IF EXISTS profiles_select_public_projection ON profiles;
CREATE POLICY profiles_select_public_projection ON profiles
FOR SELECT TO anon
USING (
  account_type = 'student'
  AND account_status = 'active'
  AND EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.profile_id = profiles.id AND sp.public_visibility = TRUE
  )
);

DROP POLICY IF EXISTS student_profiles_select_public_projection ON student_profiles;
CREATE POLICY student_profiles_select_public_projection ON student_profiles
FOR SELECT TO anon
USING (public_visibility = TRUE);

DROP POLICY IF EXISTS schools_select_public_projection ON schools;
CREATE POLICY schools_select_public_projection ON schools
FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.school_id = schools.id AND sp.public_visibility = TRUE
  )
);

DROP POLICY IF EXISTS profile_evidence_select_public_projection ON profile_evidence;
CREATE POLICY profile_evidence_select_public_projection ON profile_evidence
FOR SELECT TO anon
USING (
  status = 'verified'
  AND EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.profile_id = profile_evidence.owner_id AND sp.public_visibility = TRUE
  )
);

GRANT SELECT (id, name, avatar, account_type, account_status) ON profiles TO anon;
GRANT SELECT (profile_id, specialty, bio, availability, school_id, public_visibility) ON student_profiles TO anon;
GRANT SELECT (id, name) ON schools TO anon;
GRANT SELECT (user_id, skill_id) ON user_skills TO anon;
GRANT SELECT (id, name) ON skills TO anon;
GRANT SELECT (student_id, skill_id) ON skill_validations TO anon;
GRANT SELECT (owner_id, status) ON profile_evidence TO anon;

REVOKE ALL ON public.public_student_profiles FROM PUBLIC;
GRANT SELECT ON public.public_student_profiles TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
