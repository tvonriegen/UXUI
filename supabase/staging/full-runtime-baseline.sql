-- FULL_RUNTIME_BASELINE_METADATA
-- purpose: temporary local/future Full Staging QA only
-- source_commit_sha: 66ad32c0698fb3bd6fc91342754e0b3dfc79c6c3
-- schema_contract_version: 1
-- cutoff_commit_sha: 66ad32c0698fb3bd6fc91342754e0b3dfc79c6c3
-- baseline_includes_migrations: 20260810000001_harden_authenticated_profiles.sql,20260811000002_contact_security_gate.sql
-- latest_delta_folded_into_baseline: supabase/migrations/20260811000002_contact_security_gate.sql
-- post_baseline_delta_allowlist: []
-- not_production_migration_history: true
-- public_application_table_count: 44
-- Apply only to an empty disposable local/future Full Staging QA database.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, email text NOT NULL DEFAULT '',
 name text NOT NULL DEFAULT 'Usuario', role text NOT NULL DEFAULT 'Estudiante' CHECK (role IN ('Estudiante','Egresado','Empresa','Colegio','Externo')),
 account_type text NOT NULL DEFAULT 'student' CHECK (account_type IN ('student','company','school','external')),
 account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','pending','suspended','disabled')),
 avatar text NOT NULL DEFAULT '', bio text NOT NULL DEFAULT '', location text NOT NULL DEFAULT '', school_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 specialty text NOT NULL DEFAULT '', title text NOT NULL DEFAULT '', xp int NOT NULL DEFAULT 0, level int NOT NULL DEFAULT 1, streak int NOT NULL DEFAULT 0,
 gpa numeric(5,2), availability text NOT NULL DEFAULT 'Disponible' CHECK (availability IN ('Disponible','En prácticas','No disponible')), years_experience int NOT NULL DEFAULT 0,
 age int, company_name text NOT NULL DEFAULT '', industry text NOT NULL DEFAULT '', employee_count text NOT NULL DEFAULT '', website text NOT NULL DEFAULT '', open_positions int NOT NULL DEFAULT 0,
 school_name text NOT NULL DEFAULT '', student_count int, alliance_count int NOT NULL DEFAULT 0, employability_rate numeric(5,2), banner_url text NOT NULL DEFAULT '', theme_color text NOT NULL DEFAULT '',
 soft_skills jsonb NOT NULL DEFAULT '[]', benefits jsonb NOT NULL DEFAULT '[]', tech_stack jsonb NOT NULL DEFAULT '[]', gender text, cellphone text, class_name text, rut text, last_active_date date,
 longest_streak int NOT NULL DEFAULT 0, xp_tier text NOT NULL DEFAULT 'novato', reputation_score numeric(5,2) NOT NULL DEFAULT 0, grade text NOT NULL DEFAULT '', attendance numeric(5,2),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.schools (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL, name text NOT NULL, institutional_identifier text, contact_data jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','pending','suspended','disabled')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.school_members (school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE, profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, member_role text NOT NULL CHECK(member_role IN ('owner','admin','teacher','reviewer')), status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','invited','suspended','disabled')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(school_id,profile_id));
 CREATE TABLE public.student_profiles (profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL, student_stage text NOT NULL DEFAULT 'enrolled' CHECK(student_stage IN ('enrolled','internship','graduated')), specialty text NOT NULL DEFAULT '', availability text NOT NULL DEFAULT 'Disponible' CHECK(availability IN ('Disponible','En prácticas','No disponible')), bio text NOT NULL DEFAULT '', public_visibility boolean NOT NULL DEFAULT false, school_name text, validated_skills jsonb NOT NULL DEFAULT '[]'::jsonb, has_verified_evidence boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.company_profiles (profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, company_name text NOT NULL DEFAULT '', industry text NOT NULL DEFAULT '', website text NOT NULL DEFAULT '', verification_status text NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','verified','rejected','suspended')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.external_profiles (profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, public_name text NOT NULL DEFAULT '', client_type text NOT NULL DEFAULT 'individual' CHECK(client_type IN ('individual','entrepreneur','small_business')), verification_status text NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','verified','rejected','suspended')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.skills (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, category text NOT NULL DEFAULT 'General');
CREATE TABLE public.user_skills (user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE, PRIMARY KEY(user_id,skill_id));
CREATE TABLE public.skill_validations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE, validator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'validated' CHECK(status IN ('pending','validated','rejected')), comment text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(student_id,skill_id,validator_id));
CREATE TABLE public.certifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, name text NOT NULL, issued_by text NOT NULL DEFAULT '', issued_date date, expiry_date date, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.portfolio_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, title text NOT NULL, description text NOT NULL DEFAULT '', image text NOT NULL DEFAULT '', link text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.portfolio_tags (item_id uuid NOT NULL REFERENCES public.portfolio_items(id) ON DELETE CASCADE, tag text NOT NULL, PRIMARY KEY(item_id,tag));
CREATE TABLE public.profile_evidence (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE, evidence_type text NOT NULL CHECK(evidence_type IN ('project','certificate','course','award','document','other')), title text NOT NULL CHECK(char_length(trim(title)) BETWEEN 2 AND 160), description text NOT NULL DEFAULT '', url text NOT NULL DEFAULT '', issuer text NOT NULL DEFAULT '', issued_at date, expires_at date, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('draft','pending','verified','rejected','expired')), validation_note text NOT NULL DEFAULT '', reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, reviewed_at timestamptz, submitted_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.profile_evidence_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), evidence_id uuid NOT NULL REFERENCES public.profile_evidence(id) ON DELETE CASCADE, actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, from_status text, to_status text NOT NULL, note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.posts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text NOT NULL DEFAULT '', content text NOT NULL DEFAULT '', author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, image text NOT NULL DEFAULT '', tag text NOT NULL DEFAULT '', likes_count int NOT NULL DEFAULT 0, comments_count int NOT NULL DEFAULT 0, views_count int NOT NULL DEFAULT 0, category text NOT NULL DEFAULT 'publicacion' CHECK(category IN ('publicacion','portafolio')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.post_likes (post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(post_id,user_id));
CREATE TABLE public.post_comments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE, author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, content text NOT NULL CHECK(char_length(trim(content)) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.job_postings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, title text NOT NULL, description text NOT NULL DEFAULT '', specialty text NOT NULL DEFAULT '', location text NOT NULL DEFAULT '', type text NOT NULL DEFAULT 'practicas' CHECK(type IN ('practicas','empleo','proyecto')), slots int NOT NULL DEFAULT 1, is_open boolean NOT NULL DEFAULT true, requirements text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz);
CREATE TABLE public.internship_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, school_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, title text NOT NULL, description text NOT NULL DEFAULT '', specialty text NOT NULL DEFAULT '', slots int NOT NULL DEFAULT 1, status text NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente','aprobado','rechazado')), urgent boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.opportunities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), publisher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, publisher_type text NOT NULL CHECK(publisher_type IN ('company','external')), opportunity_type text NOT NULL CHECK(opportunity_type IN ('internship','job','company_project','freelance')), title text NOT NULL, description text NOT NULL DEFAULT '', specialty text NOT NULL DEFAULT '', location text NOT NULL DEFAULT '', compensation_min int, compensation_max int, max_candidates int, views_count int NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'open' CHECK(status IN ('draft','open','closed','expired')), closes_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(compensation_min IS NULL OR compensation_max IS NULL OR compensation_min <= compensation_max));
CREATE TABLE public.opportunity_legacy_links (opportunity_id uuid PRIMARY KEY REFERENCES public.opportunities(id) ON DELETE CASCADE, legacy_source text NOT NULL CHECK(legacy_source IN ('job_postings','internship_requests')), legacy_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(legacy_source,legacy_id));
CREATE TABLE public.job_applications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid REFERENCES public.job_postings(id) ON DELETE CASCADE, opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE, student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, applicant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','pendiente','reviewing','en_revision','interviewing','accepted','aceptado','rejected','rechazado','hired')), cover_letter text NOT NULL DEFAULT '', readiness_snapshot jsonb, readiness_model_version text, readiness_checked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(job_id,student_id));
CREATE TABLE public.opportunity_proposals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE, applicant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, cover_letter text NOT NULL DEFAULT '', proposed_amount int CHECK(proposed_amount IS NULL OR proposed_amount >= 0), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','withdrawn')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(opportunity_id,applicant_id));
CREATE TABLE public.application_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE, event_type text NOT NULL, actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, note text NOT NULL DEFAULT '', metadata jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.interviews (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE, company_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, proposed_at timestamptz NOT NULL, duration_mins int NOT NULL DEFAULT 30, modality text NOT NULL DEFAULT 'video', location text NOT NULL DEFAULT '', meeting_link text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'proposed', notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.alliances (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, school_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente','activa','inactiva')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,school_id));
CREATE TABLE public.school_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, school_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, period text NOT NULL, summary text NOT NULL DEFAULT '', teacher_comment text NOT NULL DEFAULT '', behavior_note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(student_id,period));
CREATE TABLE public.recommendation_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, target_type text NOT NULL CHECK(target_type IN ('colegio','empresa')), message text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.company_follows (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, company_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(student_id,company_id));
CREATE TABLE public.conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user1_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, user2_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, last_message_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user1_id,user2_id));
CREATE TABLE public.messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE, sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, content text NOT NULL CHECK(char_length(trim(content)) BETWEEN 1 AND 10000), kind text NOT NULL DEFAULT 'text', metadata jsonb, read boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, title text NOT NULL, body text NOT NULL DEFAULT '', type text NOT NULL DEFAULT 'info', read boolean NOT NULL DEFAULT false, link text NOT NULL DEFAULT '', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.contact_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, school_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')), message text NOT NULL DEFAULT '', reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, reviewed_at timestamptz, rejection_reason text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.profile_views (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, viewed_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), CHECK(viewer_id <> viewed_id));
CREATE TABLE public.badges (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, icon text NOT NULL DEFAULT 'award', description text NOT NULL DEFAULT '', requirement text NOT NULL DEFAULT '', is_institutional boolean NOT NULL DEFAULT false);
CREATE TABLE public.user_badges (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE, earned_at timestamptz NOT NULL DEFAULT now(), issued_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, UNIQUE(user_id,badge_id));
CREATE TABLE public.xp_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, type text NOT NULL DEFAULT 'general', xp_amount int NOT NULL DEFAULT 0 CHECK(xp_amount >= 0), metadata jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.activity_results (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, activity_id text NOT NULL, score int NOT NULL DEFAULT 0 CHECK(score BETWEEN 0 AND 100), skill_scores jsonb NOT NULL DEFAULT '{}', answers jsonb NOT NULL DEFAULT '[]', completed_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,activity_id));
CREATE TABLE public.reputation_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, type text NOT NULL CHECK(type IN ('skill_validated','internship_review','badge_earned','portfolio_item','applied_accepted')), points int NOT NULL DEFAULT 0, source_id uuid, note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.saved_posts (user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,post_id));
CREATE TABLE public.quest_templates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, title text NOT NULL, description text NOT NULL DEFAULT '', icon text NOT NULL DEFAULT 'target', target_count int NOT NULL DEFAULT 1 CHECK(target_count > 0), xp_reward int NOT NULL DEFAULT 25 CHECK(xp_reward >= 0), category text NOT NULL DEFAULT 'engagement' CHECK(category IN ('engagement','learning','social','career')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.user_daily_progress (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, template_code text NOT NULL REFERENCES public.quest_templates(code) ON DELETE CASCADE, quest_date date NOT NULL DEFAULT current_date, current_count int NOT NULL DEFAULT 0 CHECK(current_count >= 0), completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,template_code,quest_date));
CREATE TABLE public.tech_radar_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), week_start date NOT NULL, specialty text NOT NULL DEFAULT '', skill text NOT NULL, heat_score int NOT NULL DEFAULT 0, demand_count int NOT NULL DEFAULT 0, supply_count int NOT NULL DEFAULT 0, trend text NOT NULL DEFAULT 'stable' CHECK(trend IN ('rising','stable','falling','new')), source text NOT NULL DEFAULT 'jobs', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(week_start,specialty,skill));
CREATE TABLE public.user_radar_snapshots (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, week_start date NOT NULL, specialty text NOT NULL DEFAULT '', matched_skills text[] NOT NULL DEFAULT '{}', gap_skills text[] NOT NULL DEFAULT '{}', emerging_skills text[] NOT NULL DEFAULT '{}', radar_score int NOT NULL DEFAULT 0 CHECK(radar_score BETWEEN 0 AND 100), computed_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,week_start));

CREATE FUNCTION private.is_active_school_member(p_school_id uuid,p_profile_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM school_members sm JOIN schools s ON s.id=sm.school_id JOIN profiles a ON a.id=sm.profile_id JOIN profiles owner ON owner.id=s.profile_id WHERE sm.school_id=p_school_id AND sm.profile_id=p_profile_id AND sm.status='active' AND s.status='active' AND a.account_type='school' AND a.account_status='active' AND owner.account_type='school' AND owner.account_status='active') $$;
 CREATE FUNCTION private.profile_evidence_school_reviewer(p_owner_id uuid,p_actor_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM student_profiles sp JOIN schools s ON s.id=sp.school_id JOIN profiles school ON school.id=s.profile_id JOIN profiles actor ON actor.id=p_actor_id WHERE sp.profile_id=p_owner_id AND s.status='active' AND school.account_type='school' AND school.account_status='active' AND actor.account_type='school' AND actor.account_status='active' AND (s.profile_id=p_actor_id OR private.is_active_school_member(s.id,p_actor_id))) $$;
 CREATE FUNCTION private.public_school_name(p_profile_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_catalog AS $$ SELECT s.name FROM student_profiles sp JOIN schools s ON s.id=sp.school_id WHERE sp.profile_id=p_profile_id AND s.status='active' LIMIT 1 $$;
 CREATE FUNCTION private.public_validated_skills(p_student_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_catalog AS $$ SELECT coalesce((SELECT jsonb_agg(DISTINCT sk.name ORDER BY sk.name) FROM user_skills us JOIN skills sk ON sk.id=us.skill_id JOIN skill_validations sv ON sv.student_id=us.user_id AND sv.skill_id=us.skill_id WHERE us.user_id=p_student_id AND sv.status='validated'),'[]'::jsonb) $$;
 CREATE FUNCTION private.public_has_verified_evidence(p_student_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM profile_evidence pe WHERE pe.owner_id=p_student_id AND pe.status='verified') $$;
 GRANT USAGE ON SCHEMA private TO anon,authenticated;
 GRANT EXECUTE ON FUNCTION private.public_school_name(uuid),private.public_validated_skills(uuid),private.public_has_verified_evidence(uuid) TO anon,authenticated;
CREATE FUNCTION public.get_own_profile() RETURNS TABLE(profile jsonb) LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_catalog STABLE AS $$ SELECT jsonb_build_object('id',p.id,'email',p.email,'name',p.name,'role',p.role,'age',p.age,'account_type',p.account_type,'account_status',p.account_status,'school_id',p.school_id,'student_stage',(SELECT student_stage FROM student_profiles WHERE profile_id=p.id)) FROM profiles p WHERE p.id=auth.uid() $$;
CREATE FUNCTION public.school_can_manage_student(p_student_id uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_catalog STABLE AS $$ SELECT EXISTS(SELECT 1 FROM student_profiles sp JOIN schools s ON s.id=sp.school_id JOIN profiles actor ON actor.id=auth.uid() JOIN profiles student ON student.id=sp.profile_id WHERE sp.profile_id=p_student_id AND s.status='active' AND actor.account_type='school' AND actor.account_status='active' AND student.account_type='student' AND student.account_status='active' AND (s.profile_id=auth.uid() OR private.is_active_school_member(s.id,auth.uid()))) $$;
CREATE FUNCTION public.get_school_students() RETURNS TABLE(id uuid,name text,avatar text,specialty text,grade text,attendance numeric,availability text,soft_skills jsonb,rut text,gender text,cellphone text,class_name text,age int) LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_catalog STABLE AS $$ SELECT p.id,p.name,p.avatar,p.specialty,p.grade,p.attendance,p.availability,p.soft_skills,p.rut,p.gender,p.cellphone,p.class_name,p.age FROM profiles p JOIN student_profiles sp ON sp.profile_id=p.id WHERE school_can_manage_student(p.id) ORDER BY p.name $$;
CREATE FUNCTION public.get_school_dashboard() RETURNS TABLE(school_name text,location text,student_count bigint,alliance_count int,employability_rate numeric,specialties jsonb) LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_catalog STABLE AS $$ SELECT s.name,p.location,count(sp.profile_id),p.alliance_count,p.employability_rate,coalesce(jsonb_agg(distinct sp.specialty) FILTER(WHERE sp.specialty IS NOT NULL),'[]') FROM schools s JOIN profiles p ON p.id=s.profile_id JOIN student_profiles sp ON sp.school_id=s.id WHERE s.profile_id=auth.uid() OR private.is_active_school_member(s.id,auth.uid()) GROUP BY s.name,p.location,p.alliance_count,p.employability_rate $$;
CREATE FUNCTION public.get_profile_evidence_events(p_evidence_id uuid) RETURNS TABLE(id uuid,evidence_id uuid,actor_id uuid,from_status text,to_status text,note text,created_at timestamptz) LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_catalog STABLE AS $$ SELECT ev.* FROM profile_evidence_events ev JOIN profile_evidence e ON e.id=ev.evidence_id WHERE ev.evidence_id=p_evidence_id AND (e.owner_id=auth.uid() OR private.profile_evidence_school_reviewer(e.owner_id,auth.uid())) $$;
 CREATE FUNCTION public.trg_fn_profile_evidence_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
 DECLARE
   actor_id uuid := auth.uid();
   is_service_role boolean := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';
   is_school_reviewer boolean := private.profile_evidence_school_reviewer(OLD.owner_id, actor_id);
 BEGIN
   IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
     RAISE EXCEPTION 'evidence ownership and creation time are immutable';
   END IF;
   IF is_service_role THEN
     NEW.updated_at := now();
     RETURN NEW;
   END IF;
   IF actor_id = OLD.owner_id THEN
     IF OLD.status = 'rejected' AND NEW.status = 'pending' THEN
       IF NEW.validation_note IS DISTINCT FROM '' OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL THEN
         RAISE EXCEPTION 'rejected evidence resubmission must clear review metadata';
       END IF;
     ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
       RAISE EXCEPTION 'profile owners may only resubmit rejected evidence';
     ELSIF NEW.validation_note IS DISTINCT FROM OLD.validation_note
        OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
        OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
       RAISE EXCEPTION 'profile owners cannot change review metadata';
     END IF;
   ELSIF is_school_reviewer THEN
     IF NEW.evidence_type IS DISTINCT FROM OLD.evidence_type OR NEW.title IS DISTINCT FROM OLD.title
        OR NEW.description IS DISTINCT FROM OLD.description OR NEW.url IS DISTINCT FROM OLD.url
        OR NEW.issuer IS DISTINCT FROM OLD.issuer OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
        OR NEW.expires_at IS DISTINCT FROM OLD.expires_at OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
       RAISE EXCEPTION 'schools may only review evidence status and notes';
     END IF;
     IF OLD.status <> 'pending' OR NEW.status NOT IN ('verified', 'rejected') THEN
       RAISE EXCEPTION 'schools may only review pending evidence';
     END IF;
     NEW.reviewed_by := actor_id;
     NEW.reviewed_at := now();
   ELSE
     RAISE EXCEPTION 'only the owner school or service role may update evidence';
   END IF;
   NEW.updated_at := now();
   RETURN NEW;
  END;
  $$;
 REVOKE ALL ON FUNCTION public.trg_fn_profile_evidence_guard() FROM PUBLIC, anon, authenticated;
 CREATE FUNCTION public.trg_profile_evidence_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$ BEGIN IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO profile_evidence_events(evidence_id,actor_id,from_status,to_status,note) VALUES(NEW.id,auth.uid(),CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,NEW.validation_note); END IF; RETURN NEW; END $$;
CREATE TRIGGER trg_profile_evidence_guard BEFORE UPDATE ON public.profile_evidence FOR EACH ROW EXECUTE FUNCTION public.trg_fn_profile_evidence_guard();
CREATE TRIGGER profile_evidence_audit_insert AFTER INSERT ON public.profile_evidence FOR EACH ROW EXECUTE FUNCTION public.trg_profile_evidence_audit();
CREATE TRIGGER profile_evidence_audit_update AFTER UPDATE OF status ON public.profile_evidence FOR EACH ROW EXECUTE FUNCTION public.trg_profile_evidence_audit();
CREATE FUNCTION public.trg_post_comment_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$ BEGIN IF TG_OP='INSERT' THEN UPDATE posts SET comments_count=comments_count+1 WHERE id=NEW.post_id; ELSE UPDATE posts SET comments_count=GREATEST(comments_count-1,0) WHERE id=OLD.post_id; END IF; RETURN COALESCE(NEW,OLD); END $$;
CREATE TRIGGER post_comment_count_insert AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.trg_post_comment_count();
 CREATE VIEW public.public_student_profiles WITH (security_invoker=true,security_barrier=true) AS SELECT sp.profile_id AS id,p.name,p.avatar,sp.specialty,sp.bio,sp.availability,private.public_school_name(sp.profile_id) AS school_name,private.public_validated_skills(sp.profile_id) AS validated_skills,private.public_has_verified_evidence(sp.profile_id) AS has_verified_evidence FROM public.student_profiles sp JOIN public.profiles p ON p.id=sp.profile_id WHERE sp.public_visibility AND p.account_type='student' AND p.account_status='active';
 CREATE VIEW public.authenticated_profile_directory WITH (security_invoker=true,security_barrier=true) AS SELECT p.id,p.name,p.role,p.avatar,p.bio,p.location,p.specialty,p.title,p.xp,p.level,p.streak,p.availability,p.years_experience,p.reputation_score,p.account_type,p.account_status FROM public.profiles p JOIN public.student_profiles sp ON sp.profile_id=p.id WHERE p.account_type='student' AND p.account_status='active' AND sp.public_visibility;
 CREATE VIEW public.company_profile_directory WITH (security_invoker=true,security_barrier=true) AS SELECT p.id,p.name,p.company_name,p.bio,p.avatar,p.location,p.industry,p.employee_count,p.website,p.benefits,p.tech_stack FROM public.profiles p WHERE p.account_type='company' AND p.account_status='active' AND p.role='Empresa';
  REVOKE ALL ON public.profiles FROM anon, authenticated;
   GRANT SELECT (id,name,company_name,bio,avatar,location,industry,employee_count,website,benefits,tech_stack,role,account_type,account_status) ON public.profiles TO anon;
     GRANT SELECT (id,name,company_name,industry,employee_count,website,benefits,tech_stack,role,avatar,bio,location,specialty,title,xp,level,streak,availability,years_experience,reputation_score,account_type,account_status) ON public.profiles TO authenticated;
  GRANT UPDATE (name,bio,location,specialty,title,availability,website,industry,avatar,banner_url,theme_color,soft_skills,benefits,tech_stack,updated_at) ON public.profiles TO authenticated;
  REVOKE ALL ON public.student_profiles FROM anon, authenticated;
  GRANT SELECT (profile_id,specialty,bio,availability,public_visibility) ON public.student_profiles TO anon,authenticated;
  GRANT UPDATE (specialty,bio,availability,public_visibility,updated_at) ON public.student_profiles TO authenticated;

CREATE UNIQUE INDEX job_applications_opportunity_student_idx ON public.job_applications(opportunity_id,student_id) WHERE opportunity_id IS NOT NULL; CREATE INDEX application_events_application_created_idx ON public.application_events(application_id,created_at); CREATE INDEX profile_views_viewed_created_idx ON public.profile_views(viewed_id,created_at DESC); CREATE INDEX post_comments_post_created_idx ON public.post_comments(post_id,created_at); CREATE INDEX student_profiles_school_id_idx ON public.student_profiles(school_id); CREATE INDEX school_members_profile_id_idx ON public.school_members(profile_id); CREATE UNIQUE INDEX contact_requests_active_pair_idx ON public.contact_requests(company_id,student_id) WHERE status IN('pending','approved'); CREATE UNIQUE INDEX conversations_canonical_idx ON public.conversations(LEAST(user1_id,user2_id),GREATEST(user1_id,user2_id));
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['profiles','schools','school_members','student_profiles','company_profiles','external_profiles','skills','user_skills','skill_validations','certifications','portfolio_items','portfolio_tags','profile_evidence','profile_evidence_events','posts','post_likes','post_comments','job_postings','internship_requests','job_applications','application_events','interviews','opportunities','opportunity_legacy_links','opportunity_proposals','alliances','school_reports','recommendation_requests','company_follows','conversations','messages','notifications','contact_requests','profile_views'] LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t); END LOOP; END $$;
 CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (id=auth.uid());
  CREATE POLICY profiles_select_public_student_projection ON public.profiles FOR SELECT TO anon,authenticated USING (account_type='student' AND account_status='active' AND EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.profile_id=profiles.id AND sp.public_visibility));
   CREATE POLICY profiles_select_public_company_projection ON public.profiles FOR SELECT TO anon,authenticated USING (account_type='company' AND account_status='active' AND role='Empresa');
   CREATE POLICY company_profile_directory_select_active ON public.profiles FOR SELECT TO anon,authenticated USING (account_type='company' AND account_status='active' AND role='Empresa');
   CREATE POLICY profiles_own_update ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
 CREATE POLICY student_profiles_public_projection ON public.student_profiles FOR SELECT TO anon,authenticated USING (public_visibility);
 CREATE POLICY student_profiles_own_update ON public.student_profiles FOR UPDATE TO authenticated USING(profile_id=auth.uid()) WITH CHECK(profile_id=auth.uid());
CREATE POLICY application_events_participant ON public.application_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM job_applications a LEFT JOIN opportunities o ON o.id=a.opportunity_id WHERE a.id=application_id AND (a.applicant_id=auth.uid() OR o.publisher_id=auth.uid())));
CREATE POLICY application_events_actor ON public.application_events FOR INSERT TO authenticated WITH CHECK(actor_id=auth.uid() AND EXISTS(SELECT 1 FROM job_applications a LEFT JOIN opportunities o ON o.id=a.opportunity_id WHERE a.id=application_id AND (a.applicant_id=auth.uid() OR o.publisher_id=auth.uid())));
CREATE POLICY comments_read ON public.post_comments FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.posts p WHERE p.id=post_id)); CREATE POLICY comments_own_insert ON public.post_comments FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid()); CREATE POLICY profile_views_own_insert ON public.profile_views FOR INSERT TO authenticated WITH CHECK(viewer_id=auth.uid());
 CREATE POLICY evidence_owner_read ON public.profile_evidence FOR SELECT TO authenticated USING(owner_id=auth.uid() OR private.profile_evidence_school_reviewer(owner_id,auth.uid())); CREATE POLICY evidence_owner_insert ON public.profile_evidence FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid()); CREATE POLICY evidence_owner_update ON public.profile_evidence FOR UPDATE TO authenticated USING(owner_id=auth.uid() OR private.profile_evidence_school_reviewer(owner_id,auth.uid())) WITH CHECK(owner_id=auth.uid() OR private.profile_evidence_school_reviewer(owner_id,auth.uid())); CREATE POLICY evidence_owner_delete ON public.profile_evidence FOR DELETE TO authenticated USING(owner_id=auth.uid()); CREATE POLICY evidence_events_read ON public.profile_evidence_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM profile_evidence e WHERE e.id=evidence_id AND (e.owner_id=auth.uid() OR private.profile_evidence_school_reviewer(e.owner_id,auth.uid()))));
 REVOKE ALL ON public.profile_evidence FROM anon, authenticated;
 GRANT SELECT (id,owner_id,evidence_type,title,description,url,issuer,issued_at,expires_at,status,reviewed_by,reviewed_at,submitted_at,created_at,updated_at) ON public.profile_evidence TO authenticated;
 GRANT INSERT (owner_id,evidence_type,title,description,url,issuer,issued_at,expires_at,status,submitted_at) ON public.profile_evidence TO authenticated;
 GRANT UPDATE (evidence_type,title,description,url,issuer,issued_at,expires_at,status,validation_note,reviewed_by,reviewed_at,submitted_at,updated_at) ON public.profile_evidence TO authenticated;
 GRANT DELETE ON public.profile_evidence TO authenticated;
 REVOKE ALL ON public.profile_evidence_events, public.user_skills, public.skill_validations FROM anon, authenticated;
 CREATE POLICY badge_catalog_read ON public.badges FOR SELECT TO anon,authenticated USING(true); CREATE POLICY user_badges_read ON public.user_badges FOR SELECT TO authenticated USING(user_id=auth.uid()); CREATE POLICY xp_events_read ON public.xp_events FOR SELECT TO authenticated USING(user_id=auth.uid()); CREATE POLICY xp_events_insert ON public.xp_events FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid()); CREATE POLICY activity_results_own ON public.activity_results FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid()); CREATE POLICY reputation_events_own ON public.reputation_events FOR SELECT TO authenticated USING(student_id=auth.uid()); CREATE POLICY saved_posts_own ON public.saved_posts FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid()); CREATE POLICY quest_catalog_read ON public.quest_templates FOR SELECT TO anon,authenticated USING(true); CREATE POLICY daily_progress_own ON public.user_daily_progress FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid()); CREATE POLICY radar_catalog_read ON public.tech_radar_entries FOR SELECT TO anon,authenticated USING(true); CREATE POLICY radar_snapshot_own ON public.user_radar_snapshots FOR SELECT TO authenticated USING(user_id=auth.uid());
  REVOKE ALL ON public.contact_requests FROM PUBLIC,anon,authenticated; REVOKE ALL ON FUNCTION private.is_active_school_member(uuid,uuid),private.profile_evidence_school_reviewer(uuid,uuid),public.get_own_profile(),public.school_can_manage_student(uuid),public.get_school_students(),public.get_school_dashboard(),public.get_profile_evidence_events(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION private.is_active_school_member(uuid,uuid),private.profile_evidence_school_reviewer(uuid,uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_own_profile(),public.school_can_manage_student(uuid),public.get_school_students(),public.get_school_dashboard(),public.get_profile_evidence_events(uuid) TO authenticated;
 GRANT SELECT ON public.public_student_profiles TO anon,authenticated;
 REVOKE ALL ON public.authenticated_profile_directory, public.company_profile_directory FROM PUBLIC;
 GRANT SELECT ON public.authenticated_profile_directory TO authenticated;
 GRANT SELECT ON public.company_profile_directory TO anon,authenticated;
-- Runtime hardening: every baseline table is private by default.  The small
-- catalog exceptions below are deliberately explicit and do not grant write
-- access to the public API.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','schools','school_members','student_profiles','company_profiles','external_profiles','skills','user_skills','skill_validations','certifications','portfolio_items','portfolio_tags','profile_evidence','profile_evidence_events','posts','post_likes','post_comments','job_postings','internship_requests','job_applications','application_events','interviews','opportunities','opportunity_legacy_links','opportunity_proposals','alliances','school_reports','recommendation_requests','company_follows','conversations','messages','notifications','contact_requests','profile_views','badges','user_badges','xp_events','activity_results','reputation_events','saved_posts','quest_templates','user_daily_progress','tech_radar_entries','user_radar_snapshots'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

  CREATE OR REPLACE FUNCTION private.can_review_contact_request(p_school_profile_id uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM schools s
      JOIN profiles school_profile ON school_profile.id=s.profile_id
      JOIN school_members sm ON sm.school_id=s.id AND sm.profile_id=(select auth.uid())
      JOIN profiles member_profile ON member_profile.id=sm.profile_id
      WHERE s.profile_id=p_school_profile_id AND s.status='active'
        AND school_profile.account_type='school' AND school_profile.role='Colegio' AND school_profile.account_status='active'
        AND sm.status='active' AND sm.member_role IN ('owner','admin','teacher','reviewer')
        AND member_profile.account_type='school' AND member_profile.role='Colegio' AND member_profile.account_status='active');
  $$;
  REVOKE EXECUTE ON FUNCTION private.can_review_contact_request(uuid) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION private.can_review_contact_request(uuid) TO authenticated;
  DROP POLICY IF EXISTS contact_requests_school_review ON public.contact_requests;
  CREATE POLICY contact_requests_school_review ON public.contact_requests FOR UPDATE TO authenticated
    USING (status='pending' AND private.can_review_contact_request(contact_requests.school_id))
    WITH CHECK (status IN ('approved','rejected') AND private.can_review_contact_request(contact_requests.school_id));
 DROP POLICY IF EXISTS contact_requests_school_read ON public.contact_requests;
 CREATE POLICY contact_requests_school_read ON public.contact_requests FOR SELECT TO authenticated
    USING (private.can_review_contact_request(contact_requests.school_id));
DROP POLICY IF EXISTS opportunities_public_read ON public.opportunities;
CREATE POLICY opportunities_public_read ON public.opportunities FOR SELECT TO anon, authenticated
  USING (status='open');
DROP POLICY IF EXISTS opportunities_owner_write ON public.opportunities;
CREATE POLICY opportunities_owner_write ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (publisher_id=auth.uid() AND ((publisher_type='company' AND opportunity_type IN ('internship','job','company_project')) OR (publisher_type='external' AND opportunity_type='freelance')));
DROP POLICY IF EXISTS opportunities_owner_read ON public.opportunities;
CREATE POLICY opportunities_owner_read ON public.opportunities FOR SELECT TO authenticated
  USING (publisher_id=auth.uid() OR status='open');
GRANT SELECT ON public.opportunities TO anon, authenticated;
DROP POLICY IF EXISTS proposals_select_scope ON public.opportunity_proposals;
CREATE POLICY proposals_select_scope ON public.opportunity_proposals
FOR SELECT TO authenticated
USING (
  applicant_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.opportunities o
    WHERE o.id = opportunity_proposals.opportunity_id
      AND o.publisher_id = (select auth.uid())
  )
);
DROP POLICY IF EXISTS proposals_insert_student ON public.opportunity_proposals;
CREATE POLICY proposals_insert_student ON public.opportunity_proposals
FOR INSERT TO authenticated
WITH CHECK (
  applicant_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (select auth.uid())
      AND p.account_type = 'student'
      AND p.account_status = 'active'
  )
  AND EXISTS (
    SELECT 1 FROM public.opportunities o
    WHERE o.id = opportunity_proposals.opportunity_id
      AND o.opportunity_type = 'freelance'
      AND o.status = 'open'
      AND (o.closes_at IS NULL OR o.closes_at > now())
  )
  AND status = 'pending'
);
DROP POLICY IF EXISTS proposals_update_applicant ON public.opportunity_proposals;
CREATE POLICY proposals_update_applicant ON public.opportunity_proposals
FOR UPDATE TO authenticated
USING (applicant_id = (select auth.uid()) AND status = 'pending')
WITH CHECK (applicant_id = (select auth.uid()) AND status = 'withdrawn');
DROP POLICY IF EXISTS proposals_update_publisher ON public.opportunity_proposals;
CREATE POLICY proposals_update_publisher ON public.opportunity_proposals
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.opportunities o
    WHERE o.id = opportunity_proposals.opportunity_id
      AND o.publisher_id = (select auth.uid())
  )
)
WITH CHECK (
  status IN ('accepted', 'rejected')
  AND EXISTS (
    SELECT 1 FROM public.opportunities o
    WHERE o.id = opportunity_proposals.opportunity_id
      AND o.publisher_id = (select auth.uid())
  )
);
REVOKE ALL ON public.opportunity_proposals FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.opportunity_proposals TO authenticated;
DROP POLICY IF EXISTS applications_participant_read ON public.job_applications;
CREATE POLICY applications_participant_read ON public.job_applications FOR SELECT TO authenticated
  USING (student_id=auth.uid() OR EXISTS (SELECT 1 FROM opportunities o WHERE o.id=opportunity_id AND o.publisher_id=auth.uid()));
GRANT SELECT (id, job_id, opportunity_id, applicant_id, student_id, status, cover_letter, readiness_snapshot, readiness_model_version, readiness_checked_at, created_at, updated_at)
  ON public.job_applications TO authenticated;
DROP POLICY IF EXISTS posts_public_read ON public.posts;
CREATE POLICY posts_public_read ON public.posts FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE, SELECT ON public.contact_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.can_request_student_contact(p_student_id uuid, p_message text DEFAULT '')
RETURNS TABLE(decision text, contact_request_id uuid, conversation_id uuid, school_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE actor uuid := auth.uid(); student_school uuid; school_profile_id uuid; request_id uuid; request_status text; conversation uuid; user_a uuid; user_b uuid; is_minor boolean;
BEGIN
  IF actor IS NULL OR actor = p_student_id
      OR NOT EXISTS (SELECT 1 FROM profiles WHERE id=actor AND account_status='active' AND account_type IN ('company','external') AND role IN ('Empresa','Externo'))
      OR NOT EXISTS (SELECT 1 FROM profiles WHERE id=p_student_id AND account_status='active' AND account_type='student' AND role IN ('Estudiante','Egresado')) THEN
    RETURN QUERY SELECT 'DENY'::text,NULL::uuid,NULL::uuid,NULL::uuid; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id=actor AND account_type='external') THEN
    IF NOT EXISTS (SELECT 1 FROM opportunities o JOIN opportunity_proposals p ON p.opportunity_id=o.id
      WHERE o.publisher_id=actor AND o.publisher_type='external' AND o.opportunity_type='freelance'
         AND o.status IN ('open','closed','expired') AND p.applicant_id=p_student_id AND p.status='accepted') THEN
      RETURN QUERY SELECT 'DENY'::text,NULL::uuid,NULL::uuid,NULL::uuid; RETURN;
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM job_applications a LEFT JOIN job_postings j ON j.id=a.job_id
      LEFT JOIN opportunities o ON o.id=a.opportunity_id
      WHERE a.applicant_id=p_student_id AND ((j.company_id=actor) OR (o.publisher_id=actor AND o.publisher_type='company'))) THEN
      RETURN QUERY SELECT 'DENY'::text,NULL::uuid,NULL::uuid,NULL::uuid; RETURN;
    END IF;
  END IF;
  SELECT sp.school_id, (p.role='Estudiante' AND (p.age IS NULL OR p.age<18)) INTO student_school,is_minor FROM profiles p LEFT JOIN student_profiles sp ON sp.profile_id=p.id WHERE p.id=p_student_id;
  IF NOT is_minor THEN
    user_a:=LEAST(actor,p_student_id); user_b:=GREATEST(actor,p_student_id);
    INSERT INTO conversations(user1_id,user2_id) VALUES (user_a,user_b) ON CONFLICT DO NOTHING;
    SELECT id INTO conversation FROM conversations WHERE user1_id=user_a AND user2_id=user_b;
    RETURN QUERY SELECT 'ALLOW'::text,NULL::uuid,conversation,NULL::uuid; RETURN;
  END IF;
    SELECT s.profile_id INTO school_profile_id FROM schools s JOIN profiles owner ON owner.id=s.profile_id
        WHERE s.id=student_school AND s.status='active' AND owner.account_type='school' AND owner.role='Colegio' AND owner.account_status='active'
          AND EXISTS (SELECT 1 FROM school_members sm JOIN profiles mediator ON mediator.id=sm.profile_id
            WHERE sm.school_id=s.id AND sm.status='active' AND sm.member_role IN ('owner','admin','teacher','reviewer')
              AND mediator.account_type='school' AND mediator.account_status='active');
   IF student_school IS NULL OR school_profile_id IS NULL THEN RETURN QUERY SELECT 'DENY'::text,NULL::uuid,NULL::uuid,NULL::uuid; RETURN; END IF;
    INSERT INTO contact_requests(company_id,student_id,school_id,message) VALUES(actor,p_student_id,school_profile_id,left(coalesce(p_message,''),2000))
    ON CONFLICT (company_id,student_id) WHERE status IN ('pending','approved') DO NOTHING RETURNING id INTO request_id;
   IF request_id IS NULL THEN SELECT id,status INTO request_id,request_status FROM contact_requests WHERE company_id=actor AND student_id=p_student_id AND status IN ('pending','approved') ORDER BY created_at DESC LIMIT 1; END IF;
   RETURN QUERY SELECT CASE WHEN request_status='approved' THEN 'ALLOW' ELSE 'MEDIATED' END::text,request_id,NULL::uuid,school_profile_id;
END $$;
REVOKE ALL ON FUNCTION public.can_request_student_contact(uuid,text) FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.can_request_student_contact(uuid,text) TO authenticated;

 CREATE FUNCTION public.trg_fn_contact_request_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$ DECLARE actor uuid := auth.uid(); is_service_role boolean := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'; is_reviewer boolean := private.profile_evidence_school_reviewer(NEW.student_id, actor); BEGIN IF NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.school_id IS DISTINCT FROM OLD.school_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'contact request identities and creation time are immutable'; END IF; IF is_service_role THEN NEW.updated_at := now(); RETURN NEW; END IF; IF NOT is_reviewer OR OLD.status <> 'pending' OR NEW.status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'only the assigned school may review pending contact requests'; END IF; NEW.reviewed_by := actor; NEW.reviewed_at := now(); NEW.updated_at := now(); RETURN NEW; END $$;
 REVOKE ALL ON FUNCTION public.trg_fn_contact_request_guard() FROM PUBLIC, anon, authenticated;
 CREATE FUNCTION public.trg_fn_contact_request_approval() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$ DECLARE user_a uuid := LEAST(NEW.company_id, NEW.student_id); user_b uuid := GREATEST(NEW.company_id, NEW.student_id); conversation_id uuid; BEGIN IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN INSERT INTO conversations (user1_id, user2_id, last_message_at) VALUES (user_a, user_b, now()) ON CONFLICT DO NOTHING; SELECT id INTO conversation_id FROM conversations WHERE user1_id=user_a AND user2_id=user_b; INSERT INTO notifications (user_id, title, body, type, link, metadata) VALUES (NEW.company_id, 'Contacto aprobado', 'La solicitud de contacto fue aprobada.', 'contact_request', '/messages', jsonb_build_object('contact_request_id', NEW.id, 'conversation_id', conversation_id)), (NEW.student_id, 'Contacto aprobado', 'La solicitud de contacto fue aprobada.', 'contact_request', '/messages', jsonb_build_object('contact_request_id', NEW.id, 'conversation_id', conversation_id)); END IF; RETURN NEW; END $$;
 REVOKE ALL ON FUNCTION public.trg_fn_contact_request_approval() FROM PUBLIC, anon, authenticated;
 CREATE TRIGGER trg_contact_request_guard BEFORE UPDATE ON public.contact_requests FOR EACH ROW EXECUTE FUNCTION public.trg_fn_contact_request_guard();
 CREATE TRIGGER trg_contact_request_approval AFTER UPDATE OF status ON public.contact_requests FOR EACH ROW EXECUTE FUNCTION public.trg_fn_contact_request_approval();
 REVOKE ALL ON FUNCTION private.is_active_school_member(uuid,uuid), private.profile_evidence_school_reviewer(uuid,uuid) FROM PUBLIC, anon;
 GRANT EXECUTE ON FUNCTION private.is_active_school_member(uuid,uuid), private.profile_evidence_school_reviewer(uuid,uuid) TO authenticated;

 -- The current contact-security delta is folded into this baseline. It is kept
 -- here (rather than replayed from migration history) so the overlay remains a
 -- single, deterministic schema contract.
  -- contact_requests.school_id stores schools.profile_id; the private helper
  -- performs the equivalent mapping without exposing schools to policy queries.
  -- The mapping is s.profile_id = contact_requests.school_id.
  -- INSERT INTO contact_requests(company_id,student_id,school_id,message)
  -- SELECT actor,p_student_id,s.profile_id,left(coalesce(p_message,''),2000) FROM schools s
REVOKE INSERT ON public.contact_requests FROM PUBLIC, authenticated, anon;
DROP POLICY IF EXISTS "contact_requests_insert_company" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_select_company_school" ON public.contact_requests;
  CREATE POLICY "contact_requests_select_company_school" ON public.contact_requests
    FOR SELECT TO authenticated USING ((select auth.uid()) = company_id OR private.can_review_contact_request(contact_requests.school_id));
DROP POLICY IF EXISTS "contact_requests_school_review" ON public.contact_requests;
  CREATE POLICY "contact_requests_school_review" ON public.contact_requests
    FOR UPDATE TO authenticated USING (status = 'pending' AND private.can_review_contact_request(contact_requests.school_id))
    WITH CHECK (status IN ('approved', 'rejected') AND private.can_review_contact_request(contact_requests.school_id));
-- PostgREST's service_role still needs object privileges in a fresh local database.
-- Keep this administrative channel explicit; anon/authenticated receive no broad grants.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;
NOTIFY pgrst, 'reload schema';

COMMIT;
