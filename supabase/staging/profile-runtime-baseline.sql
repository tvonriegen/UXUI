-- TalentHub S1 profile-boundary staging baseline.
-- Target: disposable staging project uwkigsomnkhwjcfrgdts only.
-- This provisioning artifact is intentionally outside supabase/migrations.
-- Apply it first, then apply 20260810000001_harden_authenticated_profiles.sql.
-- No Auth users, fixtures, organizations, backfills, or production data are
-- created here. S2 opportunity/contact/feed runtime is deliberately absent.

BEGIN;

-- Fail closed on every baseline-owned object. Auth/system schemas are not
-- inspected: auth.users is the only external dependency used by profiles.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'private')
     OR EXISTS (
       SELECT 1
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
     )
     OR EXISTS (
       SELECT 1
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
     )
     OR EXISTS (
       SELECT 1
       FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'public'
         AND t.typtype IN ('b', 'c', 'd', 'e', 'r', 'm')
     ) THEN
    RAISE EXCEPTION 'S1 profile baseline requires empty public/private schemas; drift detected';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- S1 identity boundary. school_id is retained only as the legacy adapter
-- consumed by school_can_manage_student; it is never part of a public view.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT 'Usuario',
  role TEXT NOT NULL DEFAULT 'Estudiante' CHECK (role IN ('Estudiante','Egresado','Empresa','Colegio','Externo')),
  account_type TEXT NOT NULL DEFAULT 'student' CHECK (account_type IN ('student','company','school','external')),
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','pending','suspended','disabled')),
  avatar TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
  school_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  specialty TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1, streak INT NOT NULL DEFAULT 0, gpa NUMERIC(5,2),
  availability TEXT NOT NULL DEFAULT 'Disponible' CHECK (availability IN ('Disponible','En prácticas','No disponible')),
  years_experience INT NOT NULL DEFAULT 0, age INT, company_name TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '', employee_count TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
  open_positions INT NOT NULL DEFAULT 0, school_name TEXT NOT NULL DEFAULT '', student_count INT,
  alliance_count INT NOT NULL DEFAULT 0, employability_rate NUMERIC(5,2),
  banner_url TEXT NOT NULL DEFAULT '', theme_color TEXT NOT NULL DEFAULT '',
  soft_skills JSONB NOT NULL DEFAULT '[]'::jsonb, benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb, gender TEXT, cellphone TEXT, class_name TEXT,
  rut TEXT, last_active_date DATE, longest_streak INT NOT NULL DEFAULT 0,
  xp_tier TEXT NOT NULL DEFAULT 'novato', reputation_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade TEXT, attendance NUMERIC(5,2), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL, institutional_identifier TEXT, contact_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','suspended','disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.school_members (
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL CHECK (member_role IN ('owner','admin','teacher','reviewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','suspended','disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, profile_id)
);
CREATE TABLE public.student_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  student_stage TEXT NOT NULL DEFAULT 'enrolled' CHECK (student_stage IN ('enrolled','internship','graduated')),
  specialty TEXT NOT NULL DEFAULT '', availability TEXT NOT NULL DEFAULT 'Disponible' CHECK (availability IN ('Disponible','En prácticas','No disponible')),
  bio TEXT NOT NULL DEFAULT '', public_visibility BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.company_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '', industry TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.external_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  public_name TEXT NOT NULL DEFAULT '', client_type TEXT NOT NULL DEFAULT 'individual' CHECK (client_type IN ('individual','entrepreneur','small_business')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE FUNCTION private.is_active_school_member(p_school_id UUID, p_profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
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
  )
$$;

-- Minimum evidence graph needed by public_student_profiles.
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE, category TEXT NOT NULL DEFAULT 'General'
);
CREATE TABLE public.user_skills (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, skill_id)
);
CREATE TABLE public.skill_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  validator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'validated' CHECK (status IN ('pending','validated','rejected')),
  comment TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, skill_id, validator_id)
);
CREATE TABLE public.profile_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('project','certificate','course','award','document','other')),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160), description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '', issuer TEXT NOT NULL DEFAULT '', issued_at DATE, expires_at DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft','pending','verified','rejected','expired')),
  validation_note TEXT NOT NULL DEFAULT '', reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ, submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profile_evidence ALTER COLUMN owner_id SET DEFAULT auth.uid();

CREATE TABLE public.profile_evidence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES public.profile_evidence(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  from_status TEXT CHECK (from_status IS NULL OR from_status IN ('draft','pending','verified','rejected','expired')),
  to_status TEXT NOT NULL CHECK (to_status IN ('draft','pending','verified','rejected','expired')),
  note TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profile_evidence_events_evidence_idx
  ON public.profile_evidence_events(evidence_id, created_at DESC);

-- View-only predicates stay private. They are not callable through PostgREST
-- and use a fixed, fully-qualified search path.
CREATE FUNCTION private.public_validated_skills(p_student_id UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT COALESCE((SELECT jsonb_agg(DISTINCT sk.name ORDER BY sk.name)
    FROM public.user_skills us JOIN public.skills sk ON sk.id = us.skill_id
    JOIN public.skill_validations sv ON sv.student_id = us.user_id AND sv.skill_id = us.skill_id
    WHERE us.user_id = p_student_id AND sv.status = 'validated'), '[]'::jsonb)
$$;
CREATE FUNCTION private.public_has_verified_evidence(p_student_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.profile_evidence pe
    WHERE pe.owner_id = p_student_id AND pe.status = 'verified')
$$;
CREATE FUNCTION private.public_school_name(p_profile_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT s.name
  FROM public.student_profiles sp
  JOIN public.schools s ON s.id = sp.school_id
  WHERE sp.profile_id = p_profile_id AND s.status = 'active'
  LIMIT 1
$$;
CREATE FUNCTION private.public_student_visible(p_profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p JOIN public.student_profiles sp ON sp.profile_id = p.id
    WHERE p.id = p_profile_id AND p.account_type = 'student' AND p.account_status = 'active'
      AND sp.public_visibility)
$$;
CREATE FUNCTION private.public_school_visible(p_school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.student_profiles sp
    WHERE sp.school_id = p_school_id AND private.public_student_visible(sp.profile_id))
$$;
CREATE FUNCTION public.school_can_manage_student(p_student_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_profiles sp
    JOIN public.profiles student ON student.id = sp.profile_id
    JOIN public.schools school ON school.id = sp.school_id
    LEFT JOIN public.profiles school_profile ON school_profile.id = school.profile_id
    JOIN public.profiles actor ON actor.id = (select auth.uid())
    WHERE sp.profile_id = p_student_id
      AND school.status = 'active' AND school_profile.account_type = 'school'
      AND school_profile.account_status = 'active'
      AND actor.account_status = 'active' AND actor.account_type = 'school'
      AND student.account_type = 'student' AND student.account_status = 'active'
      AND (school.profile_id = (select auth.uid()) OR EXISTS (
        SELECT 1 FROM public.school_members sm
        WHERE sm.school_id = school.id AND sm.profile_id = (select auth.uid())
          AND sm.status = 'active' AND sm.member_role IN ('owner','admin','teacher','reviewer')
      ))
  )
$$;

CREATE FUNCTION public.trg_fn_profile_evidence_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.profile_evidence_events (evidence_id, actor_id, from_status, to_status, note)
    VALUES (NEW.id, auth.uid(), NULL, NEW.status, NEW.validation_note);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.profile_evidence_events (evidence_id, actor_id, from_status, to_status, note)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, NEW.validation_note);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.trg_fn_profile_evidence_audit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_profile_evidence_audit_ins AFTER INSERT ON public.profile_evidence
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_profile_evidence_audit();
CREATE TRIGGER trg_profile_evidence_audit_upd AFTER UPDATE OF status ON public.profile_evidence
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_profile_evidence_audit();

CREATE FUNCTION public.trg_fn_profile_evidence_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'evidence ownership and creation time are immutable';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.trg_fn_profile_evidence_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_profile_evidence_guard BEFORE UPDATE ON public.profile_evidence
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_profile_evidence_guard();

CREATE VIEW public.public_student_profiles
  WITH (security_invoker = true, security_barrier = true) AS
SELECT sp.profile_id AS id, p.name, p.avatar, sp.specialty, sp.bio, sp.availability,
  private.public_school_name(sp.profile_id) AS school_name,
  private.public_validated_skills(sp.profile_id) AS validated_skills,
  private.public_has_verified_evidence(sp.profile_id) AS has_verified_evidence
FROM public.student_profiles sp JOIN public.profiles p ON p.id = sp.profile_id
WHERE p.account_type = 'student' AND p.account_status = 'active' AND sp.public_visibility = TRUE;

-- Default deny. In particular, profiles has no public/authenticated SELECT or
-- INSERT grant; the hotfix adds only the intended authenticated allowlists.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_evidence_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.public_student_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_student_profiles TO anon, authenticated;
REVOKE ALL ON public.profile_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.profile_evidence_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.company_profiles, public.external_profiles TO authenticated;
GRANT UPDATE (name, bio, location, specialty, title, availability, website, industry,
  avatar, banner_url, theme_color, soft_skills, benefits, tech_stack, updated_at)
  ON public.profiles TO authenticated;

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));
CREATE POLICY profiles_update_school_student ON public.profiles FOR UPDATE TO authenticated
  USING (public.school_can_manage_student(id)) WITH CHECK (public.school_can_manage_student(id));
CREATE POLICY profiles_select_public_student_projection ON public.profiles FOR SELECT TO anon
  USING (account_type = 'student' AND account_status = 'active' AND EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.profile_id = profiles.id AND sp.public_visibility
  ));
CREATE POLICY profiles_select_public_company_projection ON public.profiles FOR SELECT TO anon, authenticated
  USING (account_type = 'company' AND account_status = 'active' AND role = 'Empresa');
CREATE POLICY schools_member_read ON public.schools FOR SELECT TO authenticated
  USING (profile_id = (select auth.uid()) OR private.is_active_school_member(id, (select auth.uid())));
CREATE POLICY school_members_scope_read ON public.school_members FOR SELECT TO authenticated
  USING (profile_id = (select auth.uid()) OR private.is_active_school_member(school_id, (select auth.uid())));
CREATE POLICY student_profiles_scope_read ON public.student_profiles FOR SELECT TO authenticated
  USING (profile_id = (select auth.uid()) OR public_visibility OR private.is_active_school_member(school_id, (select auth.uid())));
CREATE POLICY student_profiles_public_projection ON public.student_profiles FOR SELECT TO anon
  USING (public_visibility);
CREATE POLICY schools_public_projection ON public.schools FOR SELECT TO anon
  USING (status = 'active' AND EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.school_id = schools.id AND sp.public_visibility
  ));
CREATE POLICY student_profiles_owner_update ON public.student_profiles FOR UPDATE TO authenticated
  USING (profile_id = (select auth.uid())) WITH CHECK (profile_id = (select auth.uid()));
CREATE POLICY "profile_evidence_select" ON public.profile_evidence FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM public.student_profiles sp JOIN public.schools s ON s.id = sp.school_id
    WHERE sp.profile_id = profile_evidence.owner_id AND s.status = 'active' AND
      (EXISTS (SELECT 1 FROM public.profiles actor WHERE actor.id = (select auth.uid())
        AND actor.account_type = 'school' AND actor.account_status = 'active' AND s.profile_id = actor.id)
        OR (private.is_active_school_member(s.id, (select auth.uid()))
        AND EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = s.id
          AND sm.profile_id = (select auth.uid()) AND sm.member_role IN ('owner','admin','teacher','reviewer'))))
  ));
CREATE POLICY "profile_evidence_insert_owner" ON public.profile_evidence FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()) AND status = 'pending' AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid())
      AND p.account_type = 'student' AND p.account_status = 'active'
  ));
CREATE POLICY "profile_evidence_update_owner" ON public.profile_evidence FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));
CREATE POLICY "profile_evidence_review_school" ON public.profile_evidence FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_profiles sp JOIN public.schools s ON s.id = sp.school_id
    WHERE sp.profile_id = profile_evidence.owner_id AND s.status = 'active' AND
      EXISTS (SELECT 1 FROM public.profiles actor WHERE actor.id = (select auth.uid())
        AND actor.account_type = 'school' AND actor.account_status = 'active') AND
      (s.profile_id = (select auth.uid()) OR (private.is_active_school_member(s.id, (select auth.uid()))
        AND EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = s.id
          AND sm.profile_id = (select auth.uid()) AND sm.member_role IN ('owner','admin','teacher','reviewer'))))
  )) WITH CHECK (status IN ('verified', 'rejected'));
CREATE POLICY "profile_evidence_delete_owner" ON public.profile_evidence FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()) AND status IN ('draft', 'pending', 'rejected'));

REVOKE ALL ON FUNCTION private.public_validated_skills(UUID), private.public_has_verified_evidence(UUID),
  private.public_school_name(UUID), private.public_student_visible(UUID), private.public_school_visible(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_active_school_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_active_school_member(UUID, UUID) TO authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.public_validated_skills(UUID),
  private.public_has_verified_evidence(UUID), private.public_school_name(UUID)
  TO anon, authenticated;
REVOKE ALL ON FUNCTION public.school_can_manage_student(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_can_manage_student(UUID) TO authenticated;

GRANT SELECT (id, name, avatar, bio, location, specialty, title, availability,
  company_name, industry, employee_count, website, benefits, tech_stack, role,
  account_type, account_status) ON public.profiles TO anon;
GRANT SELECT (profile_id, specialty, bio, availability, public_visibility)
  ON public.student_profiles TO anon, authenticated;
REVOKE ALL ON public.schools FROM anon;
REVOKE ALL ON public.schools FROM authenticated;
REVOKE SELECT (school_id) ON public.student_profiles FROM authenticated;
GRANT SELECT (profile_id, public_visibility) ON public.student_profiles TO authenticated;
REVOKE ALL ON public.user_skills FROM anon, authenticated;
REVOKE ALL ON public.skills FROM anon, authenticated;
REVOKE ALL ON public.skill_validations FROM anon, authenticated;
REVOKE SELECT ON public.profile_evidence FROM anon;
REVOKE ALL ON public.profile_evidence_events FROM authenticated;

-- security_invoker requires authenticated to hold the minimum privileges for
-- every base relation used by public_student_profiles. The view deliberately
-- has no school dependency, so school_id is not part of this allowlist.
GRANT SELECT (id, name, avatar, specialty, bio, availability,
  account_type, account_status) ON public.profiles TO authenticated;
REVOKE SELECT ON public.profile_evidence FROM anon, authenticated;

CREATE POLICY "profile_evidence_events_select" ON public.profile_evidence_events FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profile_evidence e WHERE e.id = evidence_id AND
      (e.owner_id = (select auth.uid()) OR EXISTS (
        SELECT 1 FROM public.student_profiles sp JOIN public.schools s ON s.id = sp.school_id
        JOIN public.school_members sm ON sm.school_id = s.id
        WHERE sp.profile_id = e.owner_id AND s.status = 'active'
          AND private.is_active_school_member(s.id, (select auth.uid()))
          AND sm.profile_id = (select auth.uid()) AND sm.member_role IN ('owner','admin','teacher','reviewer')))));

GRANT SELECT (id, evidence_type, title, description, url, issuer, status,
  reviewed_at, created_at, owner_id) ON public.profile_evidence TO authenticated;
GRANT INSERT (evidence_type, title, description, url, issuer, issued_at, expires_at)
  ON public.profile_evidence TO authenticated;
GRANT UPDATE (status, validation_note, reviewed_by, reviewed_at, updated_at)
  ON public.profile_evidence TO authenticated;
GRANT DELETE ON public.profile_evidence TO authenticated;

COMMIT;
