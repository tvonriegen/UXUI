-- Keep the anonymous projection usable without exposing the base profile tables.
-- The view selects only public fields and enforces visibility/status itself.
DROP VIEW IF EXISTS public.public_student_profiles;

CREATE VIEW public.public_student_profiles
WITH (security_barrier = true)
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

REVOKE ALL ON public.public_student_profiles FROM PUBLIC;
GRANT SELECT ON public.public_student_profiles TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
