-- =====================================================================
-- Migration: Canonical account identity and initial access boundaries
-- Date: 2026-07-26
-- Idempotent: safe to re-run after the historical role migrations.
--
-- This migration is additive. Legacy profiles.role, job_postings and
-- application aliases remain available until the staged data migration is
-- verified in Supabase staging.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Canonical account identity on the existing profile record
-- ---------------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT,
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('Estudiante', 'Egresado', 'Empresa', 'Colegio', 'Externo'));

UPDATE profiles
SET account_type = CASE role
  WHEN 'Empresa' THEN 'company'
  WHEN 'Colegio' THEN 'school'
  WHEN 'Externo' THEN 'external'
  WHEN 'Egresado' THEN 'student'
  ELSE 'student'
END
WHERE account_type IS NULL;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IN ('student', 'company', 'school', 'external'));

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('active', 'pending', 'suspended', 'disabled'));

ALTER TABLE profiles
  ALTER COLUMN account_type SET DEFAULT 'student',
  ALTER COLUMN account_type SET NOT NULL;

-- ---------------------------------------------------------------------
-- 2. Institution and membership model
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS schools (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id               UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  name                     TEXT NOT NULL,
  institutional_identifier TEXT,
  contact_data             JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                   TEXT NOT NULL DEFAULT 'active',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT schools_status_check CHECK (status IN ('active', 'pending', 'suspended', 'disabled'))
);

CREATE TABLE IF NOT EXISTS school_members (
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_role  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, profile_id),
  CONSTRAINT school_members_role_check CHECK (member_role IN ('owner', 'admin', 'teacher', 'reviewer')),
  CONSTRAINT school_members_status_check CHECK (status IN ('active', 'invited', 'suspended', 'disabled'))
);

-- Preserve legacy school profile IDs as school IDs so existing school_id
-- relationships remain reversible and do not need an opaque mapping table.
INSERT INTO schools (id, profile_id, name, status)
SELECT p.id, p.id, COALESCE(NULLIF(p.school_name, ''), p.name), 'active'
FROM profiles p
WHERE p.account_type = 'school'
ON CONFLICT (id) DO UPDATE
SET profile_id = EXCLUDED.profile_id,
    name = EXCLUDED.name,
    updated_at = now();

INSERT INTO school_members (school_id, profile_id, member_role, status)
SELECT s.id, s.profile_id, 'owner', 'active'
FROM schools s
WHERE s.profile_id IS NOT NULL
ON CONFLICT (school_id, profile_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Persona profile tables
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS student_profiles (
  profile_id        UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  school_id         UUID REFERENCES schools(id) ON DELETE SET NULL,
  student_stage     TEXT NOT NULL DEFAULT 'enrolled',
  specialty         TEXT NOT NULL DEFAULT '',
  availability      TEXT NOT NULL DEFAULT 'Disponible',
  bio               TEXT NOT NULL DEFAULT '',
  public_visibility  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT student_profiles_stage_check CHECK (student_stage IN ('enrolled', 'internship', 'graduated')),
  CONSTRAINT student_profiles_availability_check CHECK (availability IN ('Disponible', 'En prácticas', 'No disponible'))
);

INSERT INTO student_profiles (profile_id, school_id, student_stage, specialty, availability, bio)
SELECT p.id,
       s.id,
       CASE
         WHEN p.role = 'Egresado' THEN 'graduated'
         WHEN p.availability = 'En prácticas' THEN 'internship'
         ELSE 'enrolled'
       END,
       p.specialty,
       p.availability,
       p.bio
FROM profiles p
LEFT JOIN schools s ON s.id = p.school_id
WHERE p.account_type = 'student'
ON CONFLICT (profile_id) DO UPDATE
SET school_id = EXCLUDED.school_id,
    student_stage = EXCLUDED.student_stage,
    specialty = EXCLUDED.specialty,
    availability = EXCLUDED.availability,
    bio = EXCLUDED.bio,
    updated_at = now();

CREATE TABLE IF NOT EXISTS company_profiles (
  profile_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company_name        TEXT NOT NULL DEFAULT '',
  industry            TEXT NOT NULL DEFAULT '',
  website             TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT company_profiles_verification_check CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended'))
);

INSERT INTO company_profiles (profile_id, company_name, industry, website)
SELECT p.id, p.company_name, p.industry, p.website
FROM profiles p
WHERE p.account_type = 'company'
ON CONFLICT (profile_id) DO UPDATE
SET company_name = EXCLUDED.company_name,
    industry = EXCLUDED.industry,
    website = EXCLUDED.website,
    updated_at = now();

CREATE TABLE IF NOT EXISTS external_profiles (
  profile_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  public_name         TEXT NOT NULL DEFAULT '',
  client_type         TEXT NOT NULL DEFAULT 'individual',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT external_profiles_client_type_check CHECK (client_type IN ('individual', 'entrepreneur', 'small_business')),
  CONSTRAINT external_profiles_verification_check CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended'))
);

-- ---------------------------------------------------------------------
-- 4. Trusted identity guards and Auth profile creation
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_fn_profiles_guard_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.account_type IS DISTINCT FROM OLD.account_type
      OR NEW.account_status IS DISTINCT FROM OLD.account_status)
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'account type and account status require a trusted server action';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_identity ON profiles;
CREATE TRIGGER trg_profiles_guard_identity
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_profiles_guard_identity();

CREATE OR REPLACE FUNCTION public.trg_fn_student_profiles_guard_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.profile_id IS DISTINCT FROM OLD.profile_id
      OR NEW.school_id IS DISTINCT FROM OLD.school_id
      OR NEW.student_stage IS DISTINCT FROM OLD.student_stage)
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'student identity, school and stage require a trusted server action';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_profiles_guard_identity ON student_profiles;
CREATE TRIGGER trg_student_profiles_guard_identity
BEFORE UPDATE ON student_profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_student_profiles_guard_identity();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type TEXT := COALESCE(NEW.raw_app_meta_data ->> 'account_type', 'student');
  v_role TEXT;
BEGIN
  IF v_account_type NOT IN ('student', 'company', 'school', 'external') THEN
    v_account_type := 'student';
  END IF;

  v_role := CASE v_account_type
    WHEN 'company' THEN 'Empresa'
    WHEN 'school' THEN 'Colegio'
    WHEN 'external' THEN 'Externo'
    ELSE 'Estudiante'
  END;

  INSERT INTO public.profiles (id, email, name, role, account_type, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuario'),
    v_role,
    v_account_type,
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user() error for uid %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_user ON auth.users;
CREATE TRIGGER trg_new_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5. Initial server-side relationship helpers
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_school_member(p_school_id UUID, p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM school_members sm
    WHERE sm.school_id = p_school_id
      AND sm.profile_id = p_profile_id
      AND sm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_school_admin(p_school_id UUID, p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM school_members sm
    WHERE sm.school_id = p_school_id
      AND sm.profile_id = p_profile_id
      AND sm.status = 'active'
      AND sm.member_role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_school_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_school_admin(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_school_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_school_admin(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------
-- 6. Initial RLS boundaries for canonical tables
-- ---------------------------------------------------------------------

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schools_select_member ON schools;
CREATE POLICY schools_select_member ON schools
FOR SELECT TO authenticated
USING (profile_id = (select auth.uid()) OR is_active_school_member(id, (select auth.uid())));

DROP POLICY IF EXISTS school_members_select_scope ON school_members;
CREATE POLICY school_members_select_scope ON school_members
FOR SELECT TO authenticated
USING (
  profile_id = (select auth.uid())
  OR is_active_school_member(school_id, (select auth.uid()))
);

DROP POLICY IF EXISTS school_members_insert_admin ON school_members;
CREATE POLICY school_members_insert_admin ON school_members
FOR INSERT TO authenticated
WITH CHECK (is_school_admin(school_id, (select auth.uid())));

DROP POLICY IF EXISTS school_members_update_admin ON school_members;
CREATE POLICY school_members_update_admin ON school_members
FOR UPDATE TO authenticated
USING (is_school_admin(school_id, (select auth.uid())))
WITH CHECK (is_school_admin(school_id, (select auth.uid())));

DROP POLICY IF EXISTS school_members_delete_admin ON school_members;
CREATE POLICY school_members_delete_admin ON school_members
FOR DELETE TO authenticated
USING (is_school_admin(school_id, (select auth.uid())));

DROP POLICY IF EXISTS student_profiles_select_scope ON student_profiles;
CREATE POLICY student_profiles_select_scope ON student_profiles
FOR SELECT TO authenticated
USING (
  profile_id = (select auth.uid())
  OR public_visibility = TRUE
  OR (school_id IS NOT NULL AND is_active_school_member(school_id, (select auth.uid())))
);

DROP POLICY IF EXISTS student_profiles_update_owner ON student_profiles;
CREATE POLICY student_profiles_update_owner ON student_profiles
FOR UPDATE TO authenticated
USING (profile_id = (select auth.uid()))
WITH CHECK (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS student_profiles_update_school ON student_profiles;
CREATE POLICY student_profiles_update_school ON student_profiles
FOR UPDATE TO authenticated
USING (school_id IS NOT NULL AND is_active_school_member(school_id, (select auth.uid())))
WITH CHECK (school_id IS NOT NULL AND is_active_school_member(school_id, (select auth.uid())));

DROP POLICY IF EXISTS company_profiles_select_scope ON company_profiles;
CREATE POLICY company_profiles_select_scope ON company_profiles
FOR SELECT TO authenticated
USING (profile_id = (select auth.uid()) OR verification_status = 'verified');

DROP POLICY IF EXISTS company_profiles_update_owner ON company_profiles;
CREATE POLICY company_profiles_update_owner ON company_profiles
FOR UPDATE TO authenticated
USING (profile_id = (select auth.uid()))
WITH CHECK (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS external_profiles_select_scope ON external_profiles;
CREATE POLICY external_profiles_select_scope ON external_profiles
FOR SELECT TO authenticated
USING (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS external_profiles_update_owner ON external_profiles;
CREATE POLICY external_profiles_update_owner ON external_profiles
FOR UPDATE TO authenticated
USING (profile_id = (select auth.uid()))
WITH CHECK (profile_id = (select auth.uid()));

-- Keep existing authenticated reads working during the compatibility period;
-- anonymous clients must use the allowlisted view below instead of profiles.
DROP POLICY IF EXISTS profiles_select_all ON profiles;
DROP POLICY IF EXISTS profiles_public_select ON profiles;
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select_authenticated_compat ON profiles
FOR SELECT TO authenticated
USING (TRUE);

REVOKE ALL ON profiles FROM anon;
GRANT SELECT ON profiles TO authenticated;

-- ---------------------------------------------------------------------
-- 7. Safe anonymous student projection
-- ---------------------------------------------------------------------

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

GRANT SELECT ON schools, school_members, student_profiles, company_profiles, external_profiles TO authenticated;
REVOKE ALL ON schools, school_members, student_profiles, company_profiles, external_profiles FROM anon;

CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_schools_profile ON schools(profile_id);
CREATE INDEX IF NOT EXISTS idx_school_members_profile_status ON school_members(profile_id, status);
CREATE INDEX IF NOT EXISTS idx_student_profiles_school_stage ON student_profiles(school_id, student_stage);
CREATE INDEX IF NOT EXISTS idx_student_profiles_public ON student_profiles(public_visibility) WHERE public_visibility = TRUE;

NOTIFY pgrst, 'reload schema';
