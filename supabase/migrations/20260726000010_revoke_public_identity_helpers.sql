-- These helpers are used by authenticated RLS policies, not as anonymous RPCs.
REVOKE EXECUTE ON FUNCTION public.is_active_school_member(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_school_admin(UUID, UUID) FROM anon;
