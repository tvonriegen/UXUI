-- TalentHub S1 staging-only follow-up for observed profile-boundary grants.
-- Apply only after profile-runtime-baseline.sql and the S1 profile hotfix have
-- been applied to the disposable staging project. This is forward-only:
-- it contains no fixtures, S2 objects, production references, or rollback SQL.
-- No explicit transaction is used; the staging runner owns atomicity.

-- Student projection: school_id and student_stage are intentionally absent.
REVOKE ALL ON public.student_profiles FROM anon, authenticated;
GRANT SELECT (profile_id, specialty, bio, availability, public_visibility)
  ON public.student_profiles TO anon, authenticated;

-- S1 school/name consumers need only the non-sensitive directory columns. RLS
-- remains the row boundary; no institutional_identifier or contact_data grant
-- is restored.
REVOKE ALL ON public.schools FROM anon, authenticated;
GRANT SELECT (id, name) ON public.schools TO anon, authenticated;

-- These relations are implementation details of private projection helpers,
-- never generic PostgREST resources.
REVOKE ALL ON public.company_profiles, public.external_profiles,
  public.user_skills, public.skills, public.skill_validations
  FROM anon, authenticated;

-- Reaffirm the safe profile projections. In particular, there is no email,
-- school_id, gpa, rut, age, cellphone, gender or student_stage grant here.
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, name, avatar, bio, location, specialty, title, availability,
  role, account_type, account_status, company_name, industry, employee_count,
  website, benefits, tech_stack
) ON public.profiles TO anon;
GRANT SELECT (
  id, name, role, avatar, bio, location, specialty, title, xp, level, streak,
  availability, years_experience, company_name, industry, website,
  employee_count, benefits, tech_stack, reputation_score,
  account_type, account_status
) ON public.profiles TO authenticated;
GRANT UPDATE (
  name, bio, location, specialty, title, availability, website, industry,
  avatar, banner_url, theme_color, soft_skills, benefits, tech_stack, updated_at
) ON public.profiles TO authenticated;

-- Keep the company directory an explicit public projection. The invoker view
-- also needs its predicate columns on the base table, but no other profile
-- columns are exposed to anon.
REVOKE ALL ON public.company_profile_directory FROM PUBLIC, anon;
GRANT SELECT (
  id, name, company_name, bio, avatar, location, industry, employee_count,
  website, benefits, tech_stack
) ON public.company_profile_directory TO anon;

-- Evidence remains owner/reviewer scoped. These ALTER POLICY statements
-- reaffirm the already-created S1 policies without widening their rows.
ALTER POLICY "profile_evidence_select" ON public.profile_evidence
  USING (
    owner_id = (select auth.uid())
    OR private.profile_evidence_school_reviewer(owner_id, (select auth.uid()))
  );
ALTER POLICY "profile_evidence_insert_owner" ON public.profile_evidence
  WITH CHECK (
    owner_id = (select auth.uid())
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid())
        AND p.account_type = 'student'
        AND p.account_status = 'active'
    )
  );
ALTER POLICY "profile_evidence_update_owner" ON public.profile_evidence
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));
ALTER POLICY "profile_evidence_review_school" ON public.profile_evidence
  USING (private.profile_evidence_school_reviewer(owner_id, (select auth.uid())))
  WITH CHECK (private.profile_evidence_school_reviewer(owner_id, (select auth.uid())));
ALTER POLICY "profile_evidence_delete_owner" ON public.profile_evidence
  USING (owner_id = (select auth.uid()) AND status IN ('draft', 'pending', 'rejected'));
ALTER POLICY "profile_evidence_events_select" ON public.profile_evidence_events
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_evidence e
      WHERE e.id = evidence_id
        AND (e.owner_id = (select auth.uid())
          OR private.profile_evidence_school_reviewer(e.owner_id, (select auth.uid())))
    )
  );

REVOKE ALL ON public.profile_evidence, public.profile_evidence_events
  FROM anon, authenticated;
GRANT SELECT (id, evidence_type, title, description, url, issuer, status,
  reviewed_at, created_at, owner_id) ON public.profile_evidence TO authenticated;
GRANT INSERT (evidence_type, title, description, url, issuer, issued_at, expires_at)
  ON public.profile_evidence TO authenticated;
GRANT UPDATE (status, validation_note, reviewed_by, reviewed_at, updated_at)
  ON public.profile_evidence TO authenticated;
GRANT DELETE ON public.profile_evidence TO authenticated;

-- Minimum FK lookup indexes used by the S1 school/evidence authorization
-- paths. Do not expand this into a general indexing pass.
CREATE INDEX IF NOT EXISTS student_profiles_school_id_idx
  ON public.student_profiles (school_id);
CREATE INDEX IF NOT EXISTS school_members_profile_id_idx
  ON public.school_members (profile_id);
CREATE INDEX IF NOT EXISTS profile_evidence_owner_status_idx
  ON public.profile_evidence (owner_id, status, updated_at DESC);

NOTIFY pgrst, 'reload schema';
