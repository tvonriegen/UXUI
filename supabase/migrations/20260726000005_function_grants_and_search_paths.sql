-- =====================================================================
-- Migration: Explicit function grants and immutable search paths
-- Date: 2026-07-26
-- Idempotent: safe to re-run.
-- =====================================================================

ALTER FUNCTION public.bulk_upsert_student_profiles(JSONB) SET search_path = public;
ALTER FUNCTION public.can_converse(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.is_minor_profile(TEXT, INTEGER) SET search_path = public;
ALTER FUNCTION public.compute_xp_tier(INTEGER) SET search_path = public;
ALTER FUNCTION public.profile_evidence_school_reviewer(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.bulk_upsert_student_profiles(JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bulk_upsert_student_profiles(JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bulk_upsert_student_profiles(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_converse(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_minor_profile(TEXT, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.profile_evidence_school_reviewer(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_fn_contact_request_notify() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_contact_request_approve_conversation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_profile_evidence_guard() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_profile_evidence_audit() FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.bulk_upsert_student_profiles(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_converse(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_minor_profile(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_evidence_school_reviewer(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
