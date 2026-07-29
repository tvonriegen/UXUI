-- Allow trusted backend requests authenticated with either legacy JWT keys or
-- modern secret keys. Both execute as the service_role database role, but the
-- modern key does not populate the legacy JWT claim setting.

CREATE OR REPLACE FUNCTION public.trg_fn_profiles_guard_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.account_type IS DISTINCT FROM OLD.account_type
      OR NEW.account_status IS DISTINCT FROM OLD.account_status)
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'account type and account status require a trusted server action';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fn_profiles_guard_role_age()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.age IS DISTINCT FROM OLD.age)
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'role and age changes require a trusted server action';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fn_student_profiles_guard_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.profile_id IS DISTINCT FROM OLD.profile_id
      OR NEW.school_id IS DISTINCT FROM OLD.school_id
      OR NEW.student_stage IS DISTINCT FROM OLD.student_stage)
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'student identity, school and stage require a trusted server action';
  END IF;
  RETURN NEW;
END;
$$;
