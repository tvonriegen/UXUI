-- Reconcile student identities created before public Student registration was restored.
-- External client routes remain reserved; this only repairs profiles already marked as students.

INSERT INTO public.student_profiles (
  profile_id,
  school_id,
  student_stage,
  specialty,
  availability,
  bio,
  public_visibility
)
SELECT
  p.id,
  CASE
    WHEN EXISTS (SELECT 1 FROM public.schools s WHERE s.id = p.school_id) THEN p.school_id
    ELSE NULL
  END,
  CASE
    WHEN p.role = 'Egresado' THEN 'graduated'
    WHEN p.availability = 'En prácticas' THEN 'internship'
    ELSE 'enrolled'
  END,
  COALESCE(p.specialty, ''),
  CASE
    WHEN p.availability IN ('Disponible', 'En prácticas', 'No disponible') THEN p.availability
    ELSE 'Disponible'
  END,
  COALESCE(p.bio, ''),
  FALSE
FROM public.profiles p
WHERE p.account_type = 'student'
  AND NOT EXISTS (
    SELECT 1
    FROM public.student_profiles sp
    WHERE sp.profile_id = p.id
  )
ON CONFLICT (profile_id) DO NOTHING;

-- Remove orphaned external-client detail rows only when they have no client-owned
-- opportunities or proposals that would need a separate data migration.
DELETE FROM public.external_profiles ep
USING public.profiles p
WHERE p.id = ep.profile_id
  AND p.account_type = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM public.opportunities o WHERE o.publisher_id = p.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.opportunity_proposals op WHERE op.applicant_id = p.id
  );
