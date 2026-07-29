-- This helper is used by profile-evidence RLS and does not need to bypass
-- row-level security. Keep it invoker-security so it cannot expose rows
-- through a callable SECURITY DEFINER endpoint.
ALTER FUNCTION public.profile_evidence_school_reviewer(UUID, UUID)
  SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.profile_evidence_school_reviewer(UUID, UUID)
  FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_evidence_school_reviewer(UUID, UUID)
  TO authenticated;
