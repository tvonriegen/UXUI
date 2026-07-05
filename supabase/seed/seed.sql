-- ═══════════════════════════════════════════════════════════════════
-- ClassLink – Seed Data (v1)
-- ═══════════════════════════════════════════════════════════════════
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → New query → Paste & Run
--   Safe to re-run: uses ON CONFLICT DO NOTHING / DO UPDATE
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- SECTION 0 – ENSURE ALL COLUMNS EXIST ON profiles
-- Safe to run even if columns already exist (IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_id        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS specialty        TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title            TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS xp              INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level           INT         NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak          INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gpa             NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS availability    TEXT        NOT NULL DEFAULT 'Disponible',
  ADD COLUMN IF NOT EXISTS years_experience INT        NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS company_name    TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS industry        TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS employee_count  TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website         TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS open_positions  INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS school_name     TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS student_count   INT,
  ADD COLUMN IF NOT EXISTS alliance_count  INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employability_rate NUMERIC(5,2);

-- Add the availability CHECK constraint only if it doesn't already exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_availability_check' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_availability_check
      CHECK (availability IN ('Disponible','En prácticas','No disponible'));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- SECTION 0.5 – CREATE ALL TABLES (IF NOT EXISTS)
-- Mirrors supabase_schema.sql so seed.sql is fully self-contained.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.skills (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'General'
);

CREATE TABLE IF NOT EXISTS public.user_skills (
  user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id)   ON DELETE CASCADE,
  PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.certifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  issued_by   TEXT        NOT NULL DEFAULT '',
  issued_date DATE,
  expiry_date DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  image       TEXT        NOT NULL DEFAULT '',
  link        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portfolio_tags (
  item_id UUID NOT NULL REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY (item_id, tag)
);

CREATE TABLE IF NOT EXISTS public.badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  icon        TEXT NOT NULL DEFAULT 'award',
  description TEXT NOT NULL DEFAULT '',
  requirement TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id  UUID        NOT NULL REFERENCES public.badges(id)   ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS public.xp_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount     INT         NOT NULL,
  reason     TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.posts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT        NOT NULL,
  description    TEXT        NOT NULL DEFAULT '',
  content        TEXT        NOT NULL DEFAULT '',
  author_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  image          TEXT        NOT NULL DEFAULT '',
  tag            TEXT        NOT NULL DEFAULT '',
  likes_count    INT         NOT NULL DEFAULT 0,
  comments_count INT         NOT NULL DEFAULT 0,
  views_count    INT         NOT NULL DEFAULT 0,
  category       TEXT        NOT NULL DEFAULT 'publicacion'
                             CHECK (category IN ('publicacion','portafolio')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id    UUID NOT NULL REFERENCES public.posts(id)    ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES public.posts(id)    ON DELETE CASCADE,
  author_id  UUID        REFERENCES public.profiles(id)          ON DELETE SET NULL,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_postings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT        NOT NULL DEFAULT '',
  specialty    TEXT        NOT NULL DEFAULT '',
  location     TEXT        NOT NULL DEFAULT '',
  type         TEXT        NOT NULL DEFAULT 'practicas'
                           CHECK (type IN ('practicas','empleo','proyecto')),
  slots        INT         NOT NULL DEFAULT 1,
  is_open      BOOLEAN     NOT NULL DEFAULT TRUE,
  requirements TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.job_applications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID        NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  student_id   UUID        NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pendiente'
                           CHECK (status IN ('pendiente','en_revision','aceptado','rechazado')),
  cover_letter TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.internship_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  specialty   TEXT        NOT NULL DEFAULT '',
  slots       INT         NOT NULL DEFAULT 1,
  status      TEXT        NOT NULL DEFAULT 'pendiente'
                          CHECK (status IN ('pendiente','aprobado','rechazado')),
  urgent      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alliances (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'pendiente'
                         CHECK (status IN ('pendiente','activa','inactiva')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, school_id)
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_b   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_a, participant_b)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  read            BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL DEFAULT '',
  type       TEXT        NOT NULL DEFAULT 'info'
                         CHECK (type IN ('info','badge','message','application','alliance','practica')),
  read       BOOLEAN     NOT NULL DEFAULT FALSE,
  link       TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profile_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.skills             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_tags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views      ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first so re-runs are safe)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "skills_select"         ON public.skills            FOR SELECT USING (true);
CREATE POLICY "user_skills_select"    ON public.user_skills       FOR SELECT USING (true);
CREATE POLICY "user_skills_insert"    ON public.user_skills       FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_skills_delete"    ON public.user_skills       FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "certs_select"          ON public.certifications    FOR SELECT USING (true);
CREATE POLICY "certs_insert"          ON public.certifications    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "certs_update"          ON public.certifications    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "certs_delete"          ON public.certifications    FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "portfolio_select"      ON public.portfolio_items   FOR SELECT USING (true);
CREATE POLICY "portfolio_insert"      ON public.portfolio_items   FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolio_update"      ON public.portfolio_items   FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "portfolio_delete"      ON public.portfolio_items   FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "portfolio_tags_select" ON public.portfolio_tags    FOR SELECT USING (true);
CREATE POLICY "portfolio_tags_insert" ON public.portfolio_tags    FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolio_items WHERE id = item_id AND user_id = auth.uid()));
CREATE POLICY "portfolio_tags_delete" ON public.portfolio_tags    FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.portfolio_items WHERE id = item_id AND user_id = auth.uid()));
CREATE POLICY "badges_select"         ON public.badges            FOR SELECT USING (true);
CREATE POLICY "user_badges_select"    ON public.user_badges       FOR SELECT USING (true);
CREATE POLICY "xp_events_select"      ON public.xp_events         FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "posts_select"          ON public.posts             FOR SELECT USING (true);
CREATE POLICY "posts_insert"          ON public.posts             FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "posts_update"          ON public.posts             FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "posts_delete"          ON public.posts             FOR DELETE USING (auth.uid() = author_id);
CREATE POLICY "likes_select"          ON public.post_likes        FOR SELECT USING (true);
CREATE POLICY "likes_insert"          ON public.post_likes        FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete"          ON public.post_likes        FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "comments_select"       ON public.post_comments     FOR SELECT USING (true);
CREATE POLICY "comments_insert"       ON public.post_comments     FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "comments_delete"       ON public.post_comments     FOR DELETE USING (auth.uid() = author_id);
CREATE POLICY "jobs_select"           ON public.job_postings      FOR SELECT USING (true);
CREATE POLICY "jobs_insert"           ON public.job_postings      FOR INSERT WITH CHECK (auth.uid() = company_id);
CREATE POLICY "jobs_update"           ON public.job_postings      FOR UPDATE USING (auth.uid() = company_id);
CREATE POLICY "jobs_delete"           ON public.job_postings      FOR DELETE USING (auth.uid() = company_id);
CREATE POLICY "applications_select"   ON public.job_applications  FOR SELECT
  USING (auth.uid() = student_id OR
         EXISTS (SELECT 1 FROM public.job_postings WHERE id = job_id AND company_id = auth.uid()));
CREATE POLICY "applications_insert"   ON public.job_applications  FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "applications_update"   ON public.job_applications  FOR UPDATE
  USING (auth.uid() = student_id OR
         EXISTS (SELECT 1 FROM public.job_postings WHERE id = job_id AND company_id = auth.uid()));
CREATE POLICY "internship_select"     ON public.internship_requests FOR SELECT
  USING (auth.uid() = company_id OR auth.uid() = school_id);
CREATE POLICY "internship_insert"     ON public.internship_requests FOR INSERT WITH CHECK (auth.uid() = company_id);
CREATE POLICY "internship_update"     ON public.internship_requests FOR UPDATE
  USING (auth.uid() = school_id OR auth.uid() = company_id);
CREATE POLICY "alliances_select"      ON public.alliances         FOR SELECT USING (true);
CREATE POLICY "alliances_insert"      ON public.alliances         FOR INSERT WITH CHECK (auth.uid() = company_id);
CREATE POLICY "alliances_update"      ON public.alliances         FOR UPDATE
  USING (auth.uid() = school_id OR auth.uid() = company_id);
CREATE POLICY "conv_select"           ON public.conversations     FOR SELECT
  USING (auth.uid() = participant_a OR auth.uid() = participant_b);
CREATE POLICY "conv_insert"           ON public.conversations     FOR INSERT
  WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);
CREATE POLICY "msg_select"            ON public.messages          FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())));
CREATE POLICY "msg_insert"            ON public.messages          FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "msg_update"            ON public.messages          FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "notif_select"          ON public.notifications     FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update"          ON public.notifications     FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pv_select"             ON public.profile_views     FOR SELECT
  USING (auth.uid() = viewer_id OR auth.uid() = viewed_id);
CREATE POLICY "pv_insert"             ON public.profile_views     FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Disable FK checks and triggers so we can insert profiles
-- without needing real auth.users rows behind each one.
SET session_replication_role = 'replica';

-- ─────────────────────────────────────────────────────────────────
-- SECTION A – AUTH USERS
-- Creates login-able accounts. Password for all seeds: ClassLink2024!
-- ─────────────────────────────────────────────────────────────────

INSERT INTO auth.users (
  id, instance_id,
  email, encrypted_password,
  email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES

-- ── COLEGIOS ──────────────────────────────────────────────────────

('11111111-1111-1111-1111-000000000001','00000000-0000-0000-0000-000000000000',
 'coordinacion@cecjmc.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"CECJMC","role":"Colegio"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('11111111-1111-1111-1111-000000000002','00000000-0000-0000-0000-000000000000',
 'secretaria@liceombb.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Liceo Barros Borgoño","role":"Colegio"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('11111111-1111-1111-1111-000000000003','00000000-0000-0000-0000-000000000000',
 'admin@ceiamaipu.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"CEIA Maipú","role":"Colegio"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('11111111-1111-1111-1111-000000000004','00000000-0000-0000-0000-000000000000',
 'coord@ctpsanalberto.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"CTP San Alberto Hurtado","role":"Colegio"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

-- ── EMPRESAS ──────────────────────────────────────────────────────

('22222222-2222-2222-2222-000000000001','00000000-0000-0000-0000-000000000000',
 'rrhh@metalchile.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"MetalChile S.A.","role":"Empresa"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('22222222-2222-2222-2222-000000000002','00000000-0000-0000-0000-000000000000',
 'rrhh@innovagreen.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Innova Green Ltda.","role":"Empresa"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('22222222-2222-2222-2222-000000000003','00000000-0000-0000-0000-000000000000',
 'contacto@autopartschile.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"AutoParts Chile","role":"Empresa"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('22222222-2222-2222-2222-000000000004','00000000-0000-0000-0000-000000000000',
 'rrhh@constructoraandina.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Constructora Andina SpA","role":"Empresa"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('22222222-2222-2222-2222-000000000005','00000000-0000-0000-0000-000000000000',
 'info@friodelsur.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Frío del Sur S.A.","role":"Empresa"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

-- ── ESTUDIANTES ───────────────────────────────────────────────────

('33333333-3333-3333-3333-000000000001','00000000-0000-0000-0000-000000000000',
 'marco.rivera@estudiante.cecjmc.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Marco Rivera","role":"Estudiante"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('33333333-3333-3333-3333-000000000002','00000000-0000-0000-0000-000000000000',
 'valentina.ruiz@estudiante.cecjmc.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Valentina Ruiz","role":"Estudiante"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('33333333-3333-3333-3333-000000000003','00000000-0000-0000-0000-000000000000',
 'pedro.sanchez@estudiante.cecjmc.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Pedro Sánchez","role":"Estudiante"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('33333333-3333-3333-3333-000000000004','00000000-0000-0000-0000-000000000000',
 'camila.ortiz@estudiante.cecjmc.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Camila Ortiz","role":"Estudiante"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('33333333-3333-3333-3333-000000000005','00000000-0000-0000-0000-000000000000',
 'sofia.vargas@estudiante.cecjmc.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Sofía Vargas","role":"Estudiante"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('33333333-3333-3333-3333-000000000006','00000000-0000-0000-0000-000000000000',
 'felipe.castro@estudiante.cecjmc.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Felipe Castro","role":"Estudiante"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('33333333-3333-3333-3333-000000000007','00000000-0000-0000-0000-000000000000',
 'javiera.munoz@estudiante.liceombb.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Javiera Muñoz","role":"Estudiante"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('33333333-3333-3333-3333-000000000008','00000000-0000-0000-0000-000000000000',
 'bastian.torres@estudiante.cecjmc.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Bastián Torres","role":"Estudiante"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('33333333-3333-3333-3333-000000000009','00000000-0000-0000-0000-000000000000',
 'lucas.espinoza@estudiante.ctpsanalberto.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Lucas Espinoza","role":"Estudiante"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

-- ── EGRESADOS ─────────────────────────────────────────────────────

('44444444-4444-4444-4444-000000000001','00000000-0000-0000-0000-000000000000',
 'alejandro.mendoza@classlink.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Alejandro Mendoza","role":"Egresado"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('44444444-4444-4444-4444-000000000002','00000000-0000-0000-0000-000000000000',
 'elena.rodriguez@classlink.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Elena Rodríguez","role":"Egresado"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('44444444-4444-4444-4444-000000000003','00000000-0000-0000-0000-000000000000',
 'diego.herrera@classlink.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Diego Herrera","role":"Egresado"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('44444444-4444-4444-4444-000000000004','00000000-0000-0000-0000-000000000000',
 'andres.lopez@classlink.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Andrés López","role":"Egresado"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('44444444-4444-4444-4444-000000000005','00000000-0000-0000-0000-000000000000',
 'carlos.mendez@classlink.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Carlos Méndez","role":"Egresado"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('44444444-4444-4444-4444-000000000006','00000000-0000-0000-0000-000000000000',
 'ana.beltran@classlink.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Ana Beltrán","role":"Egresado"}', 'authenticated','authenticated', NOW(),NOW(),'','','',''),

('44444444-4444-4444-4444-000000000007','00000000-0000-0000-0000-000000000000',
 'roberto.vasquez@classlink.cl', crypt('ClassLink2024!', gen_salt('bf')),
 NOW(), NOW(), '{"provider":"email","providers":["email"]}',
 '{"name":"Roberto Vásquez","role":"Egresado"}', 'authenticated','authenticated', NOW(),NOW(),'','','','')

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SECTION B – PROFILES (full data)
-- The handle_new_user trigger creates minimal rows on auth insert;
-- we upsert here to fill in all fields.
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.profiles (
  id, email, name, role, avatar, bio, location,
  school_id, specialty, title, xp, level, streak, gpa, availability, years_experience,
  company_name, industry, employee_count, website, open_positions,
  school_name, student_count, alliance_count, employability_rate
) VALUES

-- ── COLEGIOS ──────────────────────────────────────────────────────

('11111111-1111-1111-1111-000000000001',
 'coordinacion@cecjmc.cl', 'CECJMC', 'Colegio',
 'https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop',
 'Centro Educacional Cardenal José María Caro. Formación técnico-profesional de excelencia en Lo Espejo. Especialidades: Mecatrónica, Soldadura, Electricidad, Ebanistería, Informática y Refrigeración.',
 'Lo Espejo, Santiago',
 NULL,'','',0,1,0,NULL,'Disponible',0,'','','','',0,
 'Centro Educacional Cardenal José María Caro', 480, 18, 84.7),

('11111111-1111-1111-1111-000000000002',
 'secretaria@liceombb.cl', 'Liceo Manuel Barros Borgoño', 'Colegio',
 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&h=200&fit=crop',
 'Liceo técnico con más de 50 años de historia formando profesionales en electricidad, construcción y mecánica automotriz en Santiago Centro.',
 'Santiago Centro',
 NULL,'','',0,1,0,NULL,'Disponible',0,'','','','',0,
 'Liceo Técnico Manuel Barros Borgoño', 620, 24, 81.3),

('11111111-1111-1111-1111-000000000003',
 'admin@ceiamaipu.cl', 'CEIA Maipú', 'Colegio',
 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=200&h=200&fit=crop',
 'Centro de Educación Integral de Adultos. Programas flexibles para adultos que trabajan, con especialidades en electricidad, gastronomía y construcción.',
 'Maipú, Santiago',
 NULL,'','',0,1,0,NULL,'Disponible',0,'','','','',0,
 'CEIA Maipú', 210, 9, 78.5),

('11111111-1111-1111-1111-000000000004',
 'coord@ctpsanalberto.cl', 'CTP San Alberto Hurtado', 'Colegio',
 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=200&fit=crop',
 'Colegio Técnico Profesional con enfoque en inserción laboral y alianzas estratégicas con empresas de Pudahuel y Quilicura.',
 'Pudahuel, Santiago',
 NULL,'','',0,1,0,NULL,'Disponible',0,'','','','',0,
 'CTP San Alberto Hurtado', 345, 14, 80.2),

-- ── EMPRESAS ──────────────────────────────────────────────────────

('22222222-2222-2222-2222-000000000001',
 'rrhh@metalchile.cl', 'MetalChile S.A.', 'Empresa',
 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop',
 'Empresa líder en fabricación de estructuras metálicas, soldadura industrial y automatización de líneas de producción. Más de 200 colaboradores y 20 años de experiencia.',
 'Quilicura, Santiago',
 NULL,'','',0,1,0,NULL,'Disponible',0,
 'MetalChile S.A.','Fabricación Metálica e Industria','200-500','www.metalchile.cl',5,
 '',NULL,0,NULL),

('22222222-2222-2222-2222-000000000002',
 'rrhh@innovagreen.cl', 'Innova Green Ltda.', 'Empresa',
 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=200&fit=crop',
 'Empresa especializada en instalaciones eléctricas industriales y proyectos de energía solar fotovoltaica. Ejecutamos proyectos en todo Chile.',
 'Maipú, Santiago',
 NULL,'','',0,1,0,NULL,'Disponible',0,
 'Innova Green Ltda.','Energía Renovable y Electricidad','50-200','www.innovagreen.cl',4,
 '',NULL,0,NULL),

('22222222-2222-2222-2222-000000000003',
 'contacto@autopartschile.cl', 'AutoParts Chile', 'Empresa',
 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=200&h=200&fit=crop',
 'Taller de mecánica automotriz y centro de diagnóstico electrónico. Atendemos vehículos livianos y comerciales. Buscamos técnicos con habilidades en diagnóstico OBD.',
 'Pudahuel, Santiago',
 NULL,'','',0,1,0,NULL,'Disponible',0,
 'AutoParts Chile','Mecánica Automotriz y Diagnóstico','10-50','www.autopartschile.cl',3,
 '',NULL,0,NULL),

('22222222-2222-2222-2222-000000000004',
 'rrhh@constructoraandina.cl', 'Constructora Andina SpA', 'Empresa',
 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&h=200&fit=crop',
 'Empresa constructora con amplia experiencia en viviendas sociales, obras de infraestructura y proyectos habitacionales en la Región Metropolitana.',
 'San Bernardo, Santiago',
 NULL,'','',0,1,0,NULL,'Disponible',0,
 'Constructora Andina SpA','Construcción e Infraestructura','50-200','www.constructoraandina.cl',4,
 '',NULL,0,NULL),

('22222222-2222-2222-2222-000000000005',
 'info@friodelsur.cl', 'Frío del Sur S.A.', 'Empresa',
 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=200&h=200&fit=crop',
 'Empresa de refrigeración industrial y comercial con servicios de instalación, mantenimiento y reparación de equipos HVAC en todo Santiago y regiones.',
 'Pedro Aguirre Cerda, Santiago',
 NULL,'','',0,1,0,NULL,'Disponible',0,
 'Frío del Sur S.A.','Refrigeración e HVAC Industrial','50-200','www.friodelsur.cl',3,
 '',NULL,0,NULL),

-- ── ESTUDIANTES ───────────────────────────────────────────────────

('33333333-3333-3333-3333-000000000001',
 'marco.rivera@estudiante.cecjmc.cl', 'Marco Rivera', 'Estudiante',
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
 'Estudiante de 4to año de Soldadura en CECJMC. Especialización en TIG acero inoxidable y estructuras metálicas. Buscando prácticas en industria metalmecánica.',
 'Lo Espejo, Santiago',
 '11111111-1111-1111-1111-000000000001','Soldadura','Técnico en Soldadura',1350,7,5,88.0,'Disponible',0,
 '','','','',0,'',NULL,0,NULL),

('33333333-3333-3333-3333-000000000002',
 'valentina.ruiz@estudiante.cecjmc.cl', 'Valentina Ruiz', 'Estudiante',
 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
 'Estudiante de 3er año de Electricidad en CECJMC. Apasionada por las energías renovables, la domótica y las instalaciones solares. Disponible para prácticas.',
 'La Florida, Santiago',
 '11111111-1111-1111-1111-000000000001','Electricidad','Técnica en Electricidad',1800,9,8,90.0,'Disponible',0,
 '','','','',0,'',NULL,0,NULL),

('33333333-3333-3333-3333-000000000003',
 'pedro.sanchez@estudiante.cecjmc.cl', 'Pedro Sánchez', 'Estudiante',
 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop&crop=face',
 'Estudiante de Electricidad. Interés especial en instalaciones industriales y fotovoltaica. Participo en la feria técnica 2025 con proyecto de tablero inteligente.',
 'Lo Espejo, Santiago',
 '11111111-1111-1111-1111-000000000001','Electricidad','Técnico en Electricidad',780,4,3,83.0,'Disponible',0,
 '','','','',0,'',NULL,0,NULL),

('33333333-3333-3333-3333-000000000004',
 'camila.ortiz@estudiante.cecjmc.cl', 'Camila Ortiz', 'Estudiante',
 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
 'Estudiante de Ebanistería en CECJMC. Ganadora de feria técnica regional 2025. Apasionada por técnicas tradicionales y fabricación CNC. Portafolio activo.',
 'San Miguel, Santiago',
 '11111111-1111-1111-1111-000000000001','Ebanistería','Técnica en Ebanistería',1200,7,6,87.0,'Disponible',0,
 '','','','',0,'',NULL,0,NULL),

('33333333-3333-3333-3333-000000000005',
 'sofia.vargas@estudiante.cecjmc.cl', 'Sofía Vargas', 'Estudiante',
 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face',
 'Estudiante de 4to año de Soldadura, destacada en TIG aluminio. Actualmente en prácticas en MetalChile S.A. trabajando en celda de soldadura robotizada.',
 'Lo Prado, Santiago',
 '11111111-1111-1111-1111-000000000001','Soldadura','Técnica en Soldadura',1600,8,12,91.0,'En prácticas',0,
 '','','','',0,'',NULL,0,NULL),

('33333333-3333-3333-3333-000000000006',
 'felipe.castro@estudiante.cecjmc.cl', 'Felipe Castro', 'Estudiante',
 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&crop=face',
 'Estudiante de 3er año de Mecatrónica. Apasionado por robótica educativa, IoT y fabricación 3D. Creador del robot seguidor de línea premiado en competencia nacional.',
 'Lo Espejo, Santiago',
 '11111111-1111-1111-1111-000000000001','Mecatrónica','Técnico en Mecatrónica',980,5,4,86.0,'Disponible',0,
 '','','','',0,'',NULL,0,NULL),

('33333333-3333-3333-3333-000000000007',
 'javiera.munoz@estudiante.liceombb.cl', 'Javiera Muñoz', 'Estudiante',
 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
 'Técnica en Informática del Liceo Barros Borgoño. Desarrollo web con Python y gestión de redes LAN. Certificada en CCNA Intro y Google IT Support.',
 'Cerrillos, Santiago',
 '11111111-1111-1111-1111-000000000002','Informática','Técnica en Informática',1100,6,7,89.0,'Disponible',0,
 '','','','',0,'',NULL,0,NULL),

('33333333-3333-3333-3333-000000000008',
 'bastian.torres@estudiante.cecjmc.cl', 'Bastián Torres', 'Estudiante',
 'https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=200&h=200&fit=crop&crop=face',
 'Técnico en Refrigeración y Climatización. Con experiencia en instalación de cámaras frigoríficas y sistemas split. Actualmente en prácticas en empresa de retail.',
 'Pedro Aguirre Cerda, Santiago',
 '11111111-1111-1111-1111-000000000001','Refrigeración','Técnico en Refrigeración',950,5,3,85.0,'En prácticas',0,
 '','','','',0,'',NULL,0,NULL),

('33333333-3333-3333-3333-000000000009',
 'lucas.espinoza@estudiante.ctpsanalberto.cl', 'Lucas Espinoza', 'Estudiante',
 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=face',
 'Estudiante de Construcción Civil en CTP San Alberto. Sólidos conocimientos en AutoCAD, Revit BIM y gestión de proyectos. Participé en proyecto habitacional real.',
 'San Bernardo, Santiago',
 '11111111-1111-1111-1111-000000000004','Construcción','Técnico en Construcción',820,5,2,84.0,'Disponible',0,
 '','','','',0,'',NULL,0,NULL),

-- ── EGRESADOS ─────────────────────────────────────────────────────

('44444444-4444-4444-4444-000000000001',
 'alejandro.mendoza@classlink.cl', 'Alejandro Mendoza', 'Egresado',
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
 'Egresado de Mecatrónica CECJMC 2024. Especializado en automatización industrial con PLC Siemens S7 e IoT para manufactura. Disponible para proyecto o empleo.',
 'Lo Espejo, Santiago',
 '11111111-1111-1111-1111-000000000001','Mecatrónica','Técnico Mecatrónico',3600,15,10,92.5,'Disponible',1,
 '','','','',0,'',NULL,0,NULL),

('44444444-4444-4444-4444-000000000002',
 'elena.rodriguez@classlink.cl', 'Elena Rodríguez', 'Egresado',
 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
 'Técnica Electricista egresada 2023. 2 años de experiencia en instalaciones industriales y proyectos fotovoltaicos. Certificada NEC y AutoCAD Electrical.',
 'Maipú, Santiago',
 '11111111-1111-1111-1111-000000000001','Electricidad','Técnica Electricista Industrial',4200,18,15,95.0,'Disponible',2,
 '','','','',0,'',NULL,0,NULL),

('44444444-4444-4444-4444-000000000003',
 'diego.herrera@classlink.cl', 'Diego Herrera', 'Egresado',
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
 'Soldador certificado AWS D1.1 con 3 años de experiencia en estructuras metálicas, tuberías de presión y supervisión de soldaduras. Inspector CWI Level I.',
 'Pudahuel, Santiago',
 NULL,'Soldadura','Soldador Certificado AWS',5100,22,8,88.0,'En prácticas',3,
 '','','','',0,'',NULL,0,NULL),

('44444444-4444-4444-4444-000000000004',
 'andres.lopez@classlink.cl', 'Andrés López', 'Egresado',
 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
 'Técnico Mecatrónico Senior con 4 años en líneas de producción automotriz. Experto en PLC Allen Bradley, robots Fanuc y sistemas HMI/SCADA.',
 'Quilicura, Santiago',
 NULL,'Mecatrónica','Técnico Mecatrónico Sr.',6800,25,0,94.0,'No disponible',4,
 '','','','',0,'',NULL,0,NULL),

('44444444-4444-4444-4444-000000000005',
 'carlos.mendez@classlink.cl', 'Carlos Méndez', 'Egresado',
 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face',
 'Electricista Senior especializado en subestaciones de media tensión y sistemas de protección. 5 años en proyectos industriales de alta envergadura.',
 'Estación Central, Santiago',
 NULL,'Electricidad','Técnico Electricista Senior',7200,28,20,93.0,'Disponible',5,
 '','','','',0,'',NULL,0,NULL),

('44444444-4444-4444-4444-000000000006',
 'ana.beltran@classlink.cl', 'Ana Beltrán', 'Egresado',
 'https://images.unsplash.com/photo-1558203728-00f45181dd84?w=200&h=200&fit=crop&crop=face',
 'Técnica Automotriz egresada 2023 con 2 años en diagnóstico electrónico avanzado y mecánica preventiva. Manejo de scanner profesional VCDS y Bosch.',
 'Pudahuel, Santiago',
 NULL,'Automotriz','Técnica Automotriz',3200,14,9,88.5,'Disponible',2,
 '','','','',0,'',NULL,0,NULL),

('44444444-4444-4444-4444-000000000007',
 'roberto.vasquez@classlink.cl', 'Roberto Vásquez', 'Egresado',
 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=face',
 'Soldador Inspector AWS CWI con 4 años en proyectos oil & gas y plantas industriales. Certificado en END: Radiografía, Ultrasonido y Líquidos Penetrantes.',
 'Maipú, Santiago',
 NULL,'Soldadura','Soldador Inspector CWI',5800,24,6,90.0,'Disponible',4,
 '','','','',0,'',NULL,0,NULL)

ON CONFLICT (id) DO UPDATE SET
  email            = EXCLUDED.email,
  name             = EXCLUDED.name,
  role             = EXCLUDED.role,
  avatar           = EXCLUDED.avatar,
  bio              = EXCLUDED.bio,
  location         = EXCLUDED.location,
  school_id        = EXCLUDED.school_id,
  specialty        = EXCLUDED.specialty,
  title            = EXCLUDED.title,
  xp               = EXCLUDED.xp,
  level            = EXCLUDED.level,
  streak           = EXCLUDED.streak,
  gpa              = EXCLUDED.gpa,
  availability     = EXCLUDED.availability,
  years_experience = EXCLUDED.years_experience,
  company_name     = EXCLUDED.company_name,
  industry         = EXCLUDED.industry,
  employee_count   = EXCLUDED.employee_count,
  website          = EXCLUDED.website,
  open_positions   = EXCLUDED.open_positions,
  school_name      = EXCLUDED.school_name,
  student_count    = EXCLUDED.student_count,
  alliance_count   = EXCLUDED.alliance_count,
  employability_rate = EXCLUDED.employability_rate;

-- ─────────────────────────────────────────────────────────────────
-- SECTION C – SKILLS CATALOG
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.skills (id, name, category) VALUES
-- Mecatrónica
('sk-01','PLC Siemens S7','Mecatrónica'),
('sk-02','PLC Allen Bradley','Mecatrónica'),
('sk-03','Arduino','Mecatrónica'),
('sk-04','Raspberry Pi','Mecatrónica'),
('sk-05','SCADA WinCC','Mecatrónica'),
('sk-06','TIA Portal','Mecatrónica'),
('sk-07','HMI FactoryTalk','Mecatrónica'),
('sk-08','Robótica Fanuc','Mecatrónica'),
('sk-09','SolidWorks','Mecatrónica'),
('sk-10','Neumática Industrial','Mecatrónica'),
('sk-11','IoT Industrial','Mecatrónica'),
('sk-12','Python','Mecatrónica'),
('sk-13','Impresión 3D','Mecatrónica'),
('sk-14','MQTT','Mecatrónica'),
-- Electricidad
('sk-20','NEC 2020','Electricidad'),
('sk-21','Tableros Eléctricos','Electricidad'),
('sk-22','AutoCAD Electrical','Electricidad'),
('sk-23','ETAP','Electricidad'),
('sk-24','Alta Tensión SEC','Electricidad'),
('sk-25','Energía Solar FV','Electricidad'),
('sk-26','Domótica KNX','Electricidad'),
('sk-27','VFD / Variadores','Electricidad'),
('sk-28','Iluminación LED Industrial','Electricidad'),
-- Soldadura
('sk-30','Soldadura TIG','Soldadura'),
('sk-31','Soldadura MIG/MAG','Soldadura'),
('sk-32','Soldadura SMAW','Soldadura'),
('sk-33','Corte Plasma','Soldadura'),
('sk-34','AWS D1.1 Structural','Soldadura'),
('sk-35','ASME IX','Soldadura'),
('sk-36','Inspección CWI','Soldadura'),
('sk-37','Ensayos No Destructivos','Soldadura'),
('sk-38','Lectura de Planos','Soldadura'),
-- Ebanistería
('sk-40','CNC Router','Ebanistería'),
('sk-41','SketchUp 3D','Ebanistería'),
('sk-42','Fusion 360','Ebanistería'),
('sk-43','Lacado Industrial','Ebanistería'),
('sk-44','Tapizado Profesional','Ebanistería'),
('sk-45','Restauración de Muebles','Ebanistería'),
('sk-46','Cola de Milano','Ebanistería'),
('sk-47','Torneado en Madera','Ebanistería'),
-- Refrigeración
('sk-50','Sistemas Split','Refrigeración'),
('sk-51','Refrigeración Comercial','Refrigeración'),
('sk-52','Carga de Gas R410A','Refrigeración'),
('sk-53','Diagnóstico HVAC','Refrigeración'),
('sk-54','Bombas de Calor','Refrigeración'),
('sk-55','Recuperación de Refrigerantes','Refrigeración'),
-- Informática
('sk-60','JavaScript','Informática'),
('sk-61','HTML/CSS','Informática'),
('sk-62','SQL / MySQL','Informática'),
('sk-63','Redes TCP/IP','Informática'),
('sk-64','Windows Server','Informática'),
('sk-65','CCNA Networking','Informática'),
('sk-66','Soporte Técnico','Informática'),
-- Construcción
('sk-70','AutoCAD 2D/3D','Construcción'),
('sk-71','Revit BIM','Construcción'),
('sk-72','Hormigón Armado','Construcción'),
('sk-73','Instalaciones Sanitarias','Construcción'),
('sk-74','Topografía','Construcción'),
('sk-75','Cubicación y Presupuesto','Construcción'),
-- Automotriz
('sk-80','Diagnóstico OBD-II','Automotriz'),
('sk-81','Motor Combustión Interna','Automotriz'),
('sk-82','Frenos ABS / ESP','Automotriz'),
('sk-83','Suspensión y Dirección','Automotriz'),
('sk-84','Electricidad Automotriz','Automotriz'),
('sk-85','Scanner Profesional VCDS','Automotriz')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SECTION D – USER SKILLS
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.user_skills (user_id, skill_id)
SELECT p.id, s.id FROM (VALUES
  -- Marco Rivera – Soldadura
  ('33333333-3333-3333-3333-000000000001','sk-30'),
  ('33333333-3333-3333-3333-000000000001','sk-31'),
  ('33333333-3333-3333-3333-000000000001','sk-38'),
  ('33333333-3333-3333-3333-000000000001','sk-33'),
  -- Valentina Ruiz – Electricidad
  ('33333333-3333-3333-3333-000000000002','sk-20'),
  ('33333333-3333-3333-3333-000000000002','sk-21'),
  ('33333333-3333-3333-3333-000000000002','sk-25'),
  ('33333333-3333-3333-3333-000000000002','sk-26'),
  ('33333333-3333-3333-3333-000000000002','sk-28'),
  -- Pedro Sánchez – Electricidad
  ('33333333-3333-3333-3333-000000000003','sk-20'),
  ('33333333-3333-3333-3333-000000000003','sk-21'),
  ('33333333-3333-3333-3333-000000000003','sk-25'),
  -- Camila Ortiz – Ebanistería
  ('33333333-3333-3333-3333-000000000004','sk-40'),
  ('33333333-3333-3333-3333-000000000004','sk-41'),
  ('33333333-3333-3333-3333-000000000004','sk-43'),
  ('33333333-3333-3333-3333-000000000004','sk-46'),
  ('33333333-3333-3333-3333-000000000004','sk-47'),
  -- Sofía Vargas – Soldadura
  ('33333333-3333-3333-3333-000000000005','sk-30'),
  ('33333333-3333-3333-3333-000000000005','sk-31'),
  ('33333333-3333-3333-3333-000000000005','sk-38'),
  -- Felipe Castro – Mecatrónica
  ('33333333-3333-3333-3333-000000000006','sk-03'),
  ('33333333-3333-3333-3333-000000000006','sk-04'),
  ('33333333-3333-3333-3333-000000000006','sk-12'),
  ('33333333-3333-3333-3333-000000000006','sk-13'),
  ('33333333-3333-3333-3333-000000000006','sk-14'),
  -- Javiera Muñoz – Informática
  ('33333333-3333-3333-3333-000000000007','sk-12'),
  ('33333333-3333-3333-3333-000000000007','sk-60'),
  ('33333333-3333-3333-3333-000000000007','sk-61'),
  ('33333333-3333-3333-3333-000000000007','sk-62'),
  ('33333333-3333-3333-3333-000000000007','sk-63'),
  ('33333333-3333-3333-3333-000000000007','sk-65'),
  ('33333333-3333-3333-3333-000000000007','sk-66'),
  -- Bastián Torres – Refrigeración
  ('33333333-3333-3333-3333-000000000008','sk-50'),
  ('33333333-3333-3333-3333-000000000008','sk-51'),
  ('33333333-3333-3333-3333-000000000008','sk-52'),
  ('33333333-3333-3333-3333-000000000008','sk-53'),
  -- Lucas Espinoza – Construcción
  ('33333333-3333-3333-3333-000000000009','sk-70'),
  ('33333333-3333-3333-3333-000000000009','sk-71'),
  ('33333333-3333-3333-3333-000000000009','sk-72'),
  ('33333333-3333-3333-3333-000000000009','sk-73'),
  -- Alejandro Mendoza – Mecatrónica
  ('44444444-4444-4444-4444-000000000001','sk-01'),
  ('44444444-4444-4444-4444-000000000001','sk-03'),
  ('44444444-4444-4444-4444-000000000001','sk-05'),
  ('44444444-4444-4444-4444-000000000001','sk-06'),
  ('44444444-4444-4444-4444-000000000001','sk-09'),
  ('44444444-4444-4444-4444-000000000001','sk-11'),
  ('44444444-4444-4444-4444-000000000001','sk-12'),
  -- Elena Rodríguez – Electricidad
  ('44444444-4444-4444-4444-000000000002','sk-20'),
  ('44444444-4444-4444-4444-000000000002','sk-21'),
  ('44444444-4444-4444-4444-000000000002','sk-22'),
  ('44444444-4444-4444-4444-000000000002','sk-25'),
  ('44444444-4444-4444-4444-000000000002','sk-27'),
  ('44444444-4444-4444-4444-000000000002','sk-28'),
  -- Diego Herrera – Soldadura
  ('44444444-4444-4444-4444-000000000003','sk-30'),
  ('44444444-4444-4444-4444-000000000003','sk-31'),
  ('44444444-4444-4444-4444-000000000003','sk-32'),
  ('44444444-4444-4444-4444-000000000003','sk-34'),
  ('44444444-4444-4444-4444-000000000003','sk-36'),
  ('44444444-4444-4444-4444-000000000003','sk-38'),
  -- Andrés López – Mecatrónica
  ('44444444-4444-4444-4444-000000000004','sk-02'),
  ('44444444-4444-4444-4444-000000000004','sk-03'),
  ('44444444-4444-4444-4444-000000000004','sk-07'),
  ('44444444-4444-4444-4444-000000000004','sk-08'),
  ('44444444-4444-4444-4444-000000000004','sk-10'),
  -- Carlos Méndez – Electricidad
  ('44444444-4444-4444-4444-000000000005','sk-22'),
  ('44444444-4444-4444-4444-000000000005','sk-23'),
  ('44444444-4444-4444-4444-000000000005','sk-24'),
  ('44444444-4444-4444-4444-000000000005','sk-21'),
  -- Ana Beltrán – Automotriz
  ('44444444-4444-4444-4444-000000000006','sk-80'),
  ('44444444-4444-4444-4444-000000000006','sk-81'),
  ('44444444-4444-4444-4444-000000000006','sk-82'),
  ('44444444-4444-4444-4444-000000000006','sk-83'),
  ('44444444-4444-4444-4444-000000000006','sk-85'),
  -- Roberto Vásquez – Soldadura
  ('44444444-4444-4444-4444-000000000007','sk-30'),
  ('44444444-4444-4444-4444-000000000007','sk-35'),
  ('44444444-4444-4444-4444-000000000007','sk-36'),
  ('44444444-4444-4444-4444-000000000007','sk-37'),
  ('44444444-4444-4444-4444-000000000007','sk-38')
) AS v(uid, sid)
JOIN public.profiles p ON p.id::text = v.uid
JOIN public.skills   s ON s.id::text = v.sid
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SECTION E – CERTIFICATIONS
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.certifications (id, user_id, name, issued_by, issued_date) VALUES
('cert-001','44444444-4444-4444-4444-000000000001','Siemens S7-1200 Certified','Siemens AG','2024-06-15'),
('cert-002','44444444-4444-4444-4444-000000000001','Arduino Professional Developer','Arduino Foundation','2024-04-20'),
('cert-003','44444444-4444-4444-4444-000000000001','OSHA 30 General Industry','OSHA','2024-03-10'),
('cert-004','44444444-4444-4444-4444-000000000002','NEC 2020 Certified Electrician','NFPA','2023-09-01'),
('cert-005','44444444-4444-4444-4444-000000000002','AutoCAD Electrical Professional','Autodesk','2023-11-15'),
('cert-006','44444444-4444-4444-4444-000000000002','Instaladora Solar SEC Nivel II','SEC Chile','2024-02-20'),
('cert-007','44444444-4444-4444-4444-000000000003','AWS D1.1 Structural Welder','AWS','2022-07-10'),
('cert-008','44444444-4444-4444-4444-000000000003','CWI Level I Inspector','AWS','2023-03-25'),
('cert-009','44444444-4444-4444-4444-000000000003','OSHA 30 Construction','OSHA','2022-08-01'),
('cert-010','44444444-4444-4444-4444-000000000004','Rockwell Automation Studio 5000','Rockwell Automation','2021-09-15'),
('cert-011','44444444-4444-4444-4444-000000000004','Fanuc Robotics Level II','Fanuc','2022-04-10'),
('cert-012','44444444-4444-4444-4444-000000000004','Six Sigma Green Belt','ASQ','2023-01-20'),
('cert-013','44444444-4444-4444-4444-000000000005','ETAP Power Systems Certified','ETAP Software','2021-06-01'),
('cert-014','44444444-4444-4444-4444-000000000005','Alta Tensión Nivel III SEC','SEC Chile','2020-11-15'),
('cert-015','44444444-4444-4444-4444-000000000005','NEC Master Electrician','NFPA','2022-03-08'),
('cert-016','44444444-4444-4444-4444-000000000006','Mecánica Automotriz INACAP','INACAP','2023-07-15'),
('cert-017','44444444-4444-4444-4444-000000000006','Técnico Diagnóstico OBD Nivel II','Bosch Automotive','2024-01-10'),
('cert-018','44444444-4444-4444-4444-000000000007','AWS CWI Certified Welding Inspector','AWS','2022-05-20'),
('cert-019','44444444-4444-4444-4444-000000000007','ASME Sección IX','ASME','2021-12-01'),
('cert-020','44444444-4444-4444-4444-000000000007','Ensayos No Destructivos Nivel II RT','ASNT','2023-06-14'),
('cert-021','33333333-3333-3333-3333-000000000002','Electricidad Residencial Nivel I','SENCE','2025-11-20'),
('cert-022','33333333-3333-3333-3333-000000000004','Ebanistería Básica INACAP','INACAP','2025-08-15'),
('cert-023','33333333-3333-3333-3333-000000000007','CCNA Introduction to Networks','Cisco','2025-10-05'),
('cert-024','33333333-3333-3333-3333-000000000007','Google IT Support','Google / Coursera','2025-07-22')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SECTION F – PORTFOLIO ITEMS
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.portfolio_items (id, user_id, title, description, image, link) VALUES
-- Alejandro Mendoza
('pi-001','44444444-4444-4444-4444-000000000001','Sistema SCADA Planta Solar',
 'Monitoreo en tiempo real de 48 paneles solares usando ESP32 y dashboard React. Incluye alertas automáticas vía SMS.',
 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&h=400&fit=crop',''),
('pi-002','44444444-4444-4444-4444-000000000001','Brazo Robótico 6DOF',
 'Control cinemático inverso implementado en Python con visión artificial OpenCV para selección de piezas.',
 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=400&fit=crop',''),
('pi-003','44444444-4444-4444-4444-000000000001','Línea de Ensamble Automatizada',
 'Secuencias PLC Siemens S7-1200 para línea de producción de piezas automotrices. Tiempo de ciclo -30%.',
 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=600&h=400&fit=crop',''),
-- Elena Rodríguez
('pi-004','44444444-4444-4444-4444-000000000002','Planta Procesadora de Alimentos NEC',
 'Instalación eléctrica completa para fábrica de 2.400m². Tableros de distribución, motores y alumbrado de emergencia.',
 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop',''),
('pi-005','44444444-4444-4444-4444-000000000002','Sistema Fotovoltaico Residencial 10kW',
 'Diseño e instalación de sistema solar on-grid con respaldo de baterías LiFePO4 para vivienda unifamiliar.',
 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&h=400&fit=crop',''),
-- Diego Herrera
('pi-006','44444444-4444-4444-4444-000000000003','Estructura Puente Peatonal 30m',
 'Soldadura TIG en acero A36 para pasarela peatonal municipal. Pruebas de tintas penetrantes aprobadas.',
 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop',''),
('pi-007','44444444-4444-4444-4444-000000000003','Tanque de Agua 50m³ INOX 304',
 'Construcción y soldadura orbital de depósito de acero inoxidable 304 para planta de agua purificada.',
 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=600&h=400&fit=crop',''),
-- Andrés López
('pi-008','44444444-4444-4444-4444-000000000004','Celda Robótica Automotriz Fanuc',
 'Automatización con 4 robots Fanuc M-10iA para soldadura de puntos en carrocería de automóviles.',
 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=400&fit=crop',''),
('pi-009','44444444-4444-4444-4444-000000000004','Sistema HMI Planta de Alimentos',
 'Interfaz operador WinCC para línea de envasado. Registros históricos y alarmas integradas con ERP.',
 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&h=400&fit=crop',''),
-- Carlos Méndez
('pi-010','44444444-4444-4444-4444-000000000005','Subestación 34.5kV Maipú',
 'Diseño, montaje y comisionamiento completo de subestación industrial. Protecciones diferenciales y distancia.',
 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop',''),
-- Ana Beltrán
('pi-011','44444444-4444-4444-4444-000000000006','Diagnóstico Motor Common Rail TDI',
 'Análisis completo de inyectores y presión de riel con VCDS y Bosch FSA 740. Reporte técnico detallado.',
 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&h=400&fit=crop',''),
('pi-012','44444444-4444-4444-4444-000000000006','Protocolo Revisión Técnica 90 Puntos',
 'Diseño e implementación de checklist digital de 90 puntos para vehículos livianos en taller.',
 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&h=400&fit=crop',''),
-- Roberto Vásquez
('pi-013','44444444-4444-4444-4444-000000000007','Gasoducto DN200 API 5L Gr.B',
 'Supervisión y control de calidad en 4.2km de tubería de gas natural. 100% soldaduras aprobadas en radiografía.',
 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop',''),
-- Marco Rivera
('pi-014','33333333-3333-3333-3333-000000000001','Estructura Tubular Movilidad Sostenible',
 'Fabricación de estructura principal en acero inoxidable calibre 16 con soldadura TIG para prototipo.',
 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop',''),
-- Camila Ortiz
('pi-015','33333333-3333-3333-3333-000000000004','Mesa de Roble con Incrustaciones',
 'Ensamble tradicional cola de milano con incrustaciones de nogal. Acabado natural mate en 3 capas.',
 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop',''),
('pi-016','33333333-3333-3333-3333-000000000004','Armario Empotrado CNC en MDF',
 'Diseño paramétrico en SketchUp y fabricación en CNC router con acabado en melamina blanca.',
 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop',''),
-- Javiera Muñoz
('pi-017','33333333-3333-3333-3333-000000000007','Sistema Web Gestión Escolar',
 'Aplicación web completa en Python/Flask para control de asistencia, notas y reportes PDF.',
 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop',''),
-- Felipe Castro
('pi-018','33333333-3333-3333-3333-000000000006','Robot Seguidor de Línea PID',
 'Robot autónomo con sensores IR y control PID. Velocidad máx 0.8 m/s en pista de competencia.',
 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=400&fit=crop',''),
('pi-019','33333333-3333-3333-3333-000000000006','Estación Meteorológica IoT MQTT',
 'Monitoreo de temperatura, humedad y presión atmosférica. Dashboard en Node-RED vía MQTT.',
 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&h=400&fit=crop',''),
-- Bastián Torres
('pi-020','33333333-3333-3333-3333-000000000008','Cámara Frigorífica -18°C',
 'Instalación y puesta en marcha de cámara de congelados 40m³ con R404A para supermercado.',
 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop','')
ON CONFLICT DO NOTHING;

INSERT INTO public.portfolio_tags (item_id, tag) VALUES
('pi-001','SCADA'),('pi-001','IoT'),('pi-001','React'),('pi-001','ESP32'),
('pi-002','Robótica'),('pi-002','Python'),('pi-002','OpenCV'),
('pi-003','PLC'),('pi-003','Siemens'),('pi-003','TIA Portal'),
('pi-004','Industrial'),('pi-004','NEC'),('pi-004','Tableros'),
('pi-005','Solar'),('pi-005','Renovable'),('pi-005','LiFePO4'),
('pi-006','Estructural'),('pi-006','TIG'),('pi-006','A36'),
('pi-007','INOX 304'),('pi-007','TIG Orbital'),('pi-007','Presión'),
('pi-008','Fanuc'),('pi-008','Robótica'),('pi-008','PLC'),
('pi-009','HMI'),('pi-009','SCADA'),('pi-009','WinCC'),
('pi-010','34.5kV'),('pi-010','ETAP'),('pi-010','Subestación'),
('pi-011','OBD-II'),('pi-011','Diesel'),('pi-011','Common Rail'),
('pi-012','Preventivo'),('pi-012','Inspección'),
('pi-013','API 5L'),('pi-013','ASME'),('pi-013','Radiografía'),
('pi-014','TIG'),('pi-014','Estructural'),('pi-014','INOX'),
('pi-015','Roble'),('pi-015','Cola de Milano'),('pi-015','Artesanal'),
('pi-016','CNC'),('pi-016','SketchUp'),('pi-016','MDF'),
('pi-017','Python'),('pi-017','Flask'),('pi-017','MySQL'),
('pi-018','Arduino'),('pi-018','PID'),('pi-018','Robótica'),
('pi-019','IoT'),('pi-019','MQTT'),('pi-019','Node-RED'),
('pi-020','R404A'),('pi-020','Refrigeración'),('pi-020','Comercial')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SECTION G – BADGES
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.badges (id, name, icon, description, requirement) VALUES
('badge-01','Soldadura TIG Nivel I','flame','Aprobó el módulo básico de soldadura TIG','Completar módulo TIG con nota ≥ 70'),
('badge-02','Soldadura TIG Nivel II','flame','Soldadura TIG en aluminio y acero inoxidable','Completar módulo TIG avanzado y proyecto'),
('badge-03','Electricidad Residencial','zap','Instalaciones eléctricas residenciales NEC','Aprobar evaluación NEC residencial'),
('badge-04','Electricidad Industrial','zap','Instalaciones industriales y tableros de distribución','Proyecto real de instalación industrial'),
('badge-05','Ebanistería Básica','hammer','Técnicas básicas de carpintería y acabados','Completar módulo ebanistería básica'),
('badge-06','CNC Router Operador','cpu','Operación de router CNC para fabricación','Certificar operación CNC sin errores'),
('badge-07','Mecatrónica Arduino','cpu','Programación y montaje de proyectos Arduino','Proyecto IoT funcional con Arduino'),
('badge-08','PLC Siemens S7','cpu','Programación de PLC Siemens S7-1200','Proyecto PLC en TIA Portal aprobado'),
('badge-09','Seguridad Industrial','shield-check','Normas de seguridad OSHA y EPP','Aprobar evaluación de seguridad industrial'),
('badge-10','Proyecto Final','trophy','Presentó proyecto de graduación ante comité','Defensa de proyecto con nota ≥ 70'),
('badge-11','Pasantía Completada','briefcase','Completó 480 horas de práctica profesional','Informe final de práctica aprobado'),
('badge-12','Mentor Comunitario','users','Mentoreó a 3 o más estudiantes juniors','Registrar 3 sesiones de mentoría activa'),
('badge-13','AWS D1.1 Welder','award','Certificación de soldador estructural AWS D1.1','Prueba de calificación AWS D1.1'),
('badge-14','CCNA Networking','monitor','Fundamentos de redes Cisco CCNA','Aprobar examen Cisco Intro to Networks'),
('badge-15','HVAC Básico','thermometer','Sistemas de refrigeración y climatización','Completar módulo HVAC y prueba de gas'),
('badge-16','AutoCAD BIM','layers','Modelado en AutoCAD y Revit BIM','Entregar proyecto BIM completo')
ON CONFLICT (name) DO NOTHING;

-- Assign earned badges
INSERT INTO public.user_badges (id, user_id, badge_id, earned_at)
SELECT gen_random_uuid(), p.id, b.id, v.earned
FROM (VALUES
  ('44444444-4444-4444-4444-000000000001','badge-07','2024-04-10'::timestamptz),
  ('44444444-4444-4444-4444-000000000001','badge-08','2024-06-20'::timestamptz),
  ('44444444-4444-4444-4444-000000000001','badge-09','2024-03-15'::timestamptz),
  ('44444444-4444-4444-4444-000000000001','badge-11','2024-11-30'::timestamptz),
  ('44444444-4444-4444-4444-000000000002','badge-03','2023-08-10'::timestamptz),
  ('44444444-4444-4444-4444-000000000002','badge-04','2024-01-15'::timestamptz),
  ('44444444-4444-4444-4444-000000000002','badge-09','2023-07-20'::timestamptz),
  ('44444444-4444-4444-4444-000000000002','badge-11','2023-12-01'::timestamptz),
  ('44444444-4444-4444-4444-000000000003','badge-01','2022-06-01'::timestamptz),
  ('44444444-4444-4444-4444-000000000003','badge-02','2022-09-15'::timestamptz),
  ('44444444-4444-4444-4444-000000000003','badge-13','2022-07-10'::timestamptz),
  ('44444444-4444-4444-4444-000000000003','badge-09','2022-05-20'::timestamptz),
  ('44444444-4444-4444-4444-000000000004','badge-07','2021-08-10'::timestamptz),
  ('44444444-4444-4444-4444-000000000004','badge-08','2021-09-20'::timestamptz),
  ('44444444-4444-4444-4444-000000000004','badge-09','2021-07-15'::timestamptz),
  ('44444444-4444-4444-4444-000000000004','badge-10','2021-12-10'::timestamptz),
  ('44444444-4444-4444-4444-000000000004','badge-11','2022-04-01'::timestamptz),
  ('44444444-4444-4444-4444-000000000004','badge-12','2023-06-15'::timestamptz),
  ('44444444-4444-4444-4444-000000000005','badge-03','2020-06-01'::timestamptz),
  ('44444444-4444-4444-4444-000000000005','badge-04','2021-01-10'::timestamptz),
  ('44444444-4444-4444-4444-000000000005','badge-09','2020-05-15'::timestamptz),
  ('44444444-4444-4444-4444-000000000005','badge-10','2020-12-01'::timestamptz),
  ('44444444-4444-4444-4444-000000000005','badge-11','2021-03-20'::timestamptz),
  ('44444444-4444-4444-4444-000000000006','badge-09','2023-06-10'::timestamptz),
  ('44444444-4444-4444-4444-000000000006','badge-11','2023-11-15'::timestamptz),
  ('44444444-4444-4444-4444-000000000007','badge-01','2021-05-01'::timestamptz),
  ('44444444-4444-4444-4444-000000000007','badge-02','2022-03-10'::timestamptz),
  ('44444444-4444-4444-4444-000000000007','badge-13','2022-05-20'::timestamptz),
  ('44444444-4444-4444-4444-000000000007','badge-09','2021-04-15'::timestamptz),
  ('44444444-4444-4444-4444-000000000007','badge-11','2022-01-10'::timestamptz),
  ('33333333-3333-3333-3333-000000000001','badge-01','2025-11-10'::timestamptz),
  ('33333333-3333-3333-3333-000000000001','badge-09','2025-09-20'::timestamptz),
  ('33333333-3333-3333-3333-000000000002','badge-03','2025-11-20'::timestamptz),
  ('33333333-3333-3333-3333-000000000002','badge-09','2025-08-15'::timestamptz),
  ('33333333-3333-3333-3333-000000000004','badge-05','2025-08-15'::timestamptz),
  ('33333333-3333-3333-3333-000000000005','badge-01','2025-10-05'::timestamptz),
  ('33333333-3333-3333-3333-000000000007','badge-14','2025-10-05'::timestamptz),
  ('33333333-3333-3333-3333-000000000008','badge-15','2025-09-01'::timestamptz)
) AS v(uid, bid, earned)
JOIN public.profiles p ON p.id::text = v.uid
JOIN public.badges   b ON b.id::text = v.bid
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SECTION H – POSTS (Community Feed)
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.posts (id, title, description, content, author_id, image, tag, likes_count, comments_count, views_count, category, created_at) VALUES

('post-001','Estructura Tubular 400x en Acero Inoxidable',
 'Finalización de la estructura principal para prototipo de movilidad sostenible. Soldadura TIG calibre 16.',
 'Terminé la soldadura TIG de la estructura principal del prototipo! 48 horas de trabajo meticuloso en acero inoxidable 316L. Cada unión fue verificada con tintas penetrantes. Muy orgulloso del resultado.',
 '33333333-3333-3333-3333-000000000001',
 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop',
 'Soldadura TIG',24,8,142,'publicacion',NOW() - INTERVAL '9 days'),

('post-002','Ensamble Cola de Milano en Roble — Sin Cola ni Clavos',
 'Técnica de cola de milano realizada completamente a mano. Tres semanas de trabajo meticuloso en madera maciza.',
 'Terminé la mesa de roble con uniones cola de milano hechas a mano. Sin pegamento ni clavos, solo la perfección del ensamble mecánico. Acabado en aceite de linaza y cera de abeja.',
 '33333333-3333-3333-3333-000000000004',
 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop',
 'Ebanistería',18,5,98,'portafolio',NOW() - INTERVAL '8 days'),

('post-003','Sistema SCADA para Monitoreo de 48 Paneles Solares',
 'Monitoreo en tiempo real con ESP32 y dashboard React. Alertas automáticas por SMS.',
 'Presenté mi proyecto de titulación: sistema SCADA para planta solar domiciliaria. Usa ESP32 para medir voltaje, corriente y temperatura en tiempo real. Dashboard React con gráficos históricos. Alerta por SMS si hay falla.',
 '44444444-4444-4444-4444-000000000001',
 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&h=400&fit=crop',
 'Mecatrónica',31,12,210,'portafolio',NOW() - INTERVAL '7 days'),

('post-004','Diagnóstico Motor TDI — Fallo en Inyector #3',
 'Análisis de inyectores y presión de riel en motor TDI. Herramienta: VCDS + Bosch FSA 740.',
 'Caso interesante esta semana: motor TDI 2.0 con arranque difícil en frío. Con VCDS medimos el tiempo de corrección de cada inyector y encontramos que el #3 estaba fuera de especificación. Reemplazo + programación y listo.',
 '44444444-4444-4444-4444-000000000006',
 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&h=400&fit=crop',
 'Automotriz',14,4,87,'portafolio',NOW() - INTERVAL '6 days'),

('post-005','🎉 Feria Técnica CECJMC 2026 — ¡Inscríbete!',
 'Participa en la feria de innovación técnica del 15 al 18 de abril. Inscripciones abiertas.',
 '¡La Feria Técnica Anual 2026 ya tiene fecha! Del 15 al 18 de abril abrimos las puertas para que nuestros estudiantes muestren sus proyectos a empresas, universidades e instituciones públicas. ¡El año pasado tuvimos 40 proyectos y 12 empresas participantes!',
 '11111111-1111-1111-1111-000000000001',
 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
 'Evento',52,23,380,'publicacion',NOW() - INTERVAL '5 days'),

('post-006','Tablero de Distribución NEC — Vivienda 2 Pisos',
 'Cableado completo según norma NEC. Tablero 12 circuitos con diferencial e interruptor de falla a tierra.',
 'Proyecto final de módulo: instalación eléctrica completa para vivienda de 2 pisos. 12 circuitos, cableado #12 AWG THHN, tablero Square D QO con diferencial 63A. Todo conforme a NEC 2020.',
 '33333333-3333-3333-3333-000000000002',
 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop',
 'Electricidad',11,3,64,'portafolio',NOW() - INTERVAL '4 days'),

('post-007','Cámara Frigorífica -18°C Instalada y Funcionando',
 'Instalación y puesta en marcha de cámara de congelados 40m³ con R404A para supermercado.',
 'Terminé mis prácticas en la instalación de una cámara de congelados para una cadena de supermercados. Carga de 12kg de R404A, vacío de 500 micrones, prueba de estanqueidad a 25 bar. Temperatura de operación estable en -18°C ±1°C.',
 '33333333-3333-3333-3333-000000000008',
 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
 'Refrigeración',9,2,51,'portafolio',NOW() - INTERVAL '3 days'),

('post-008','Sistema de Gestión Escolar en Python/Flask',
 'Aplicación web para control de asistencia, notas y reportes PDF. Deploy en Linux.',
 'Presenté mi proyecto integrador: sistema web de gestión escolar en Python Flask con MySQL. Incluye control de asistencia con QR, cálculo automático de promedios, y generación de reportes PDF. Deploy en servidor Ubuntu con Nginx.',
 '33333333-3333-3333-3333-000000000007',
 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop',
 'Informática',16,6,93,'portafolio',NOW() - INTERVAL '2 days'),

('post-009','¡Iniciando Prácticas en MetalChile S.A.!',
 'Feliz de anunciar que inicié mis prácticas en MetalChile. Trabajando en celda de soldadura robotizada.',
 'Primera semana de prácticas en MetalChile S.A. Trabajando directamente con los robots de soldadura y aprendiendo sobre control de calidad. Increíble equipo humano. ¡Gracias CECJMC por prepararme tan bien!',
 '33333333-3333-3333-3333-000000000005',
 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=600&h=400&fit=crop',
 'Soldadura TIG',38,15,275,'publicacion',NOW() - INTERVAL '1 day'),

('post-010','Buscamos Técnico Electricista — Innova Green Ltda.',
 'Innova Green busca 2 técnicos electricistas con experiencia en solar. Postula ahora.',
 'En Innova Green seguimos creciendo. Buscamos 2 técnicos electricistas con al menos 1 año de experiencia en instalaciones industriales o fotovoltaicas. Postulaciones en nuestra web. ¡Excelentes beneficios!',
 '22222222-2222-2222-2222-000000000002',
 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&h=400&fit=crop',
 'Oferta Laboral',29,10,198,'publicacion',NOW() - INTERVAL '12 hours'),

('post-011','Planos BIM Proyecto Habitacional 24 Viviendas',
 'Modelado BIM en Revit para conjunto habitacional. Incluye instalaciones sanitarias y eléctricas.',
 'Proyecto de módulo: modelado completo en Revit de conjunto habitacional de 24 unidades en San Bernardo. Coordinación de disciplinas: arquitectura, estructura, sanitaria y eléctrica. Detección de interferencias con Navisworks.',
 '33333333-3333-3333-3333-000000000009',
 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=400&fit=crop',
 'Construcción',7,1,38,'portafolio',NOW() - INTERVAL '10 hours'),

('post-012','Inspector CWI en Gasoducto Maipú-Pudahuel',
 'Supervisando soldaduras en tubería API 5L. Ensayos RT y UT en proceso.',
 'Semana intensa supervisando las soldaduras de unión en el gasoducto de 4.2km. Tomamos 210 radiografías y todas aprobaron. El nivel de exigencia en proyectos de este tipo es increíble. Esto es lo que amo de mi trabajo.',
 '44444444-4444-4444-4444-000000000007',
 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop',
 'Soldadura TIG',22,7,145,'publicacion',NOW() - INTERVAL '8 hours'),

('post-013','Robot Seguidor de Línea con Control PID',
 'Robot autónomo premiado en competencia nacional. Velocidad máx 0.8 m/s.',
 'Mi robot seguidor de línea quedó en 2do lugar en la competencia regional! Usé Arduino Nano con 8 sensores IR y algoritmo PID para seguir la pista. 0.8 m/s en la recta. Para la siguiente versión quiero agregar visión artificial.',
 '33333333-3333-3333-3333-000000000006',
 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=400&fit=crop',
 'Mecatrónica',20,9,130,'portafolio',NOW() - INTERVAL '5 hours'),

('post-014','Alianza Estratégica con 3 Nuevas Empresas',
 'CECJMC anuncia nuevas alianzas con MetalChile, Constructora Andina y Frío del Sur.',
 'Nos complace anunciar nuevas alianzas estratégicas que abrirán más de 15 cupos de práctica para nuestros estudiantes. Estas alianzas son el resultado del trabajo conjunto entre coordinación académica y las empresas del sector. ¡Gran noticia para la comunidad!',
 '11111111-1111-1111-1111-000000000001',
 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
 'Evento',44,18,290,'publicacion',NOW() - INTERVAL '2 hours')

ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SECTION I – JOB POSTINGS
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.job_postings (id, company_id, title, description, specialty, location, type, slots, is_open, requirements, created_at, expires_at) VALUES

-- MetalChile S.A. (22222222-...-001)
('job-001','22222222-2222-2222-2222-000000000001',
 'Soldador TIG Junior — Prácticas',
 'Buscamos 2 estudiantes en práctica para incorporarse a nuestra línea de soldadura TIG. Trabajarán con soldadores senior en proyectos de estructura metálica y recipientes a presión.',
 'Soldadura','Quilicura, Santiago','practicas',2,TRUE,
 'Estar cursando 3ro o 4to año de Soldadura. Conocimientos básicos en TIG. Disponibilidad full time. Uniforme y EPP proporcionados.',
 NOW() - INTERVAL '5 days', NOW() + INTERVAL '30 days'),

('job-002','22222222-2222-2222-2222-000000000001',
 'Técnico Mecatrónico Industrial',
 'Posición de empleo permanente para técnico mecatrónico con experiencia en PLC y mantenimiento de equipos industriales. Bono de producción mensual.',
 'Mecatrónica','Quilicura, Santiago','empleo',1,TRUE,
 'Egresado de Mecatrónica. Experiencia mínima 1 año en PLC (Siemens o Allen Bradley). Conocimiento en neumática. Turno diurno.',
 NOW() - INTERVAL '3 days', NOW() + INTERVAL '45 days'),

('job-003','22222222-2222-2222-2222-000000000001',
 'Inspector de Soldadura — Proyecto Puente',
 'Proyecto de 3 meses para inspector de soldadura en construcción de pasarela metálica. Se requiere disponibilidad inmediata.',
 'Soldadura','San Bernardo, Santiago','proyecto',1,TRUE,
 'Certificación AWS CWI Level I o superior. Experiencia en estructuras metálicas. Conocimiento en ensayos no destructivos (PT/VT).',
 NOW() - INTERVAL '1 day', NOW() + INTERVAL '15 days'),

('job-004','22222222-2222-2222-2222-000000000001',
 'Operario CNC — Ebanistería Industrial',
 'Buscamos operario para router CNC en taller de fabricación de muebles de madera. Turno flexible.',
 'Ebanistería','Quilicura, Santiago','empleo',2,TRUE,
 'Experiencia en operación de CNC router. Lectura de planos. Conocimiento en materiales: MDF, melamina, madera maciza.',
 NOW() - INTERVAL '2 days', NOW() + INTERVAL '20 days'),

-- Innova Green Ltda. (22222222-...-002)
('job-005','22222222-2222-2222-2222-000000000002',
 'Técnico Electricista — Prácticas',
 'Incorporamos 3 técnicos en práctica para participar en instalaciones eléctricas residenciales e industriales. Pago mensual de beca.',
 'Electricidad','Maipú, Santiago','practicas',3,TRUE,
 'Estar cursando 3ro o 4to año de Electricidad. Conocimientos NEC básico. Disponibilidad lunes a viernes.',
 NOW() - INTERVAL '4 days', NOW() + INTERVAL '25 days'),

('job-006','22222222-2222-2222-2222-000000000002',
 'Instalador Solar Fotovoltaico',
 'Posición permanente para técnico con experiencia en instalación de paneles solares residenciales e industriales. Certificación SEC valorada.',
 'Electricidad','Santiago (Región Metropolitana)','empleo',2,TRUE,
 'Egresado de Electricidad. Experiencia en instalaciones fotovoltaicas. Certificación SEC instalador solar nivel I deseable. Licencia de conducir.',
 NOW() - INTERVAL '6 days', NOW() + INTERVAL '40 days'),

('job-007','22222222-2222-2222-2222-000000000002',
 'Técnico en Domótica — Proyecto Edificio Inteligente',
 'Proyecto de 4 meses para instalación de sistema KNX en edificio de 12 pisos en Providencia.',
 'Electricidad','Providencia, Santiago','proyecto',2,TRUE,
 'Conocimientos en KNX o sistemas BMS. Egresado de Electricidad. Experiencia en instalaciones civiles. Trabajo en altura certificado.',
 NOW() - INTERVAL '2 days', NOW() + INTERVAL '10 days'),

-- AutoParts Chile (22222222-...-003)
('job-008','22222222-2222-2222-2222-000000000003',
 'Mecánico Automotriz — Prácticas',
 'Recibimos 2 estudiantes en práctica para participar en revisiones técnicas, cambios de aceite, frenos y diagnóstico básico.',
 'Automotriz','Pudahuel, Santiago','practicas',2,TRUE,
 'Estar cursando 3ro o 4to año de Mecánica Automotriz. Trabajo en equipo. Disponibilidad lunes a sábado medio día.',
 NOW() - INTERVAL '7 days', NOW() + INTERVAL '30 days'),

('job-009','22222222-2222-2222-2222-000000000003',
 'Técnico en Diagnóstico Electrónico',
 'Posición permanente para técnico especializado en diagnóstico OBD-II y reparación de sistemas electrónicos automotrices.',
 'Automotriz','Pudahuel, Santiago','empleo',1,TRUE,
 'Egresado de Mecánica Automotriz. Manejo de scanner profesional (VCDS, Bosch, Launch). 1+ año de experiencia en diagnóstico electrónico.',
 NOW() - INTERVAL '3 days', NOW() + INTERVAL '30 days'),

-- Constructora Andina SpA (22222222-...-004)
('job-010','22222222-2222-2222-2222-000000000004',
 'Asistente de Obra — Prácticas',
 'Incorporamos 3 estudiantes en práctica para apoyo en obras de construcción. Participarán en topografía, cubicación y control de calidad.',
 'Construcción','San Bernardo, Santiago','practicas',3,TRUE,
 'Estar cursando Técnico en Construcción. Conocimientos básicos en AutoCAD. EPP proporcionado por la empresa.',
 NOW() - INTERVAL '5 days', NOW() + INTERVAL '35 days'),

('job-011','22222222-2222-2222-2222-000000000004',
 'Dibujante CAD/BIM',
 'Posición permanente para técnico en construcción con manejo de AutoCAD y Revit para elaboración de planos y modelos BIM.',
 'Construcción','San Bernardo, Santiago','empleo',1,TRUE,
 'Egresado de Construcción o Arquitectura. Manejo avanzado de AutoCAD 2D/3D y Revit. Experiencia en proyectos habitacionales o industriales.',
 NOW() - INTERVAL '8 days', NOW() + INTERVAL '20 days'),

('job-012','22222222-2222-2222-2222-000000000004',
 'Supervisor de Instalaciones Sanitarias — Proyecto',
 'Proyecto de 5 meses para supervisión de instalaciones sanitarias en conjunto habitacional de 80 viviendas.',
 'Construcción','Puente Alto, Santiago','proyecto',1,TRUE,
 'Egresado de Construcción Civil. Experiencia en instalaciones sanitarias. Lectura de planos. Trabajo en terreno.',
 NOW() - INTERVAL '1 day', NOW() + INTERVAL '20 days'),

-- Frío del Sur S.A. (22222222-...-005)
('job-013','22222222-2222-2222-2222-000000000005',
 'Técnico HVAC — Prácticas',
 'Buscamos 2 estudiantes en práctica para participar en instalación y mantención de equipos de climatización y refrigeración comercial.',
 'Refrigeración','Pedro Aguirre Cerda, Santiago','practicas',2,TRUE,
 'Estar cursando 3ro o 4to año de Refrigeración. Conocimiento básico en sistemas split y refrigeración comercial.',
 NOW() - INTERVAL '3 days', NOW() + INTERVAL '30 days'),

('job-014','22222222-2222-2222-2222-000000000005',
 'Refrigerista Comercial — Empleo',
 'Posición permanente para técnico en refrigeración con experiencia en mantenimiento correctivo y preventivo de equipos comerciales.',
 'Refrigeración','Santiago (Región Metropolitana)','empleo',1,TRUE,
 'Egresado de Refrigeración. Mínimo 1 año de experiencia en refrigeración comercial. Manejo de R410A y R404A. Certificación de manipulación de refrigerantes deseable.',
 NOW() - INTERVAL '5 days', NOW() + INTERVAL '40 days'),

('job-015','22222222-2222-2222-2222-000000000005',
 'Técnico en Cámaras Frigoríficas — Proyecto',
 'Proyecto de 3 meses para instalación de cámaras frigoríficas en nueva planta procesadora de alimentos.',
 'Refrigeración','Pudahuel, Santiago','proyecto',2,TRUE,
 'Egresado de Refrigeración. Experiencia en cámaras frigoríficas industriales. Conocimiento en R404A y amoniaco (NH3) deseable.',
 NOW() - INTERVAL '2 days', NOW() + INTERVAL '20 days')

ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SECTION J – INTERNSHIP REQUESTS & ALLIANCES
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.internship_requests (id, company_id, school_id, title, description, specialty, slots, status, urgent) VALUES
('ir-001','22222222-2222-2222-2222-000000000001','11111111-1111-1111-1111-000000000001',
 'Prácticas Soldadura TIG — Enero 2026',
 'Solicitamos 3 cupos de prácticas para estudiantes de Soldadura. Los alumnos trabajarán en nuestra línea de fabricación de estructuras metálicas bajo supervisión directa.',
 'Soldadura',3,'aprobado',FALSE),
('ir-002','22222222-2222-2222-2222-000000000002','11111111-1111-1111-1111-000000000001',
 'Prácticas Electricidad — Q1 2026',
 'Requerimos 2 practicantes de electricidad para proyectos de instalaciones solares residenciales en la Región Metropolitana.',
 'Electricidad',2,'pendiente',TRUE),
('ir-003','22222222-2222-2222-2222-000000000003','11111111-1111-1111-1111-000000000001',
 'Prácticas Mecatrónica — Primer Semestre',
 'Buscamos 2 estudiantes de Mecatrónica para área de diagnóstico automotriz avanzado.',
 'Mecatrónica',2,'pendiente',FALSE),
('ir-004','22222222-2222-2222-2222-000000000004','11111111-1111-1111-1111-000000000004',
 'Prácticas Construcción — Proyecto Maipú',
 'Necesitamos 3 estudiantes de Construcción para participar en proyecto habitacional en Maipú.',
 'Construcción',3,'aprobado',FALSE),
('ir-005','22222222-2222-2222-2222-000000000005','11111111-1111-1111-1111-000000000001',
 'Prácticas Refrigeración — Urgente',
 'Requerimos con urgencia 2 practicantes de refrigeración para proyecto de cámaras frigoríficas.',
 'Refrigeración',2,'pendiente',TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.alliances (id, company_id, school_id, status) VALUES
('al-001','22222222-2222-2222-2222-000000000001','11111111-1111-1111-1111-000000000001','activa'),
('al-002','22222222-2222-2222-2222-000000000002','11111111-1111-1111-1111-000000000001','activa'),
('al-003','22222222-2222-2222-2222-000000000003','11111111-1111-1111-1111-000000000001','pendiente'),
('al-004','22222222-2222-2222-2222-000000000004','11111111-1111-1111-1111-000000000004','activa'),
('al-005','22222222-2222-2222-2222-000000000005','11111111-1111-1111-1111-000000000001','activa'),
('al-006','22222222-2222-2222-2222-000000000001','11111111-1111-1111-1111-000000000002','activa'),
('al-007','22222222-2222-2222-2222-000000000002','11111111-1111-1111-1111-000000000003','pendiente')
ON CONFLICT DO NOTHING;

-- Update alliance_count in schools
UPDATE public.profiles SET alliance_count = 3 WHERE id = '11111111-1111-1111-1111-000000000001';
UPDATE public.profiles SET alliance_count = 1 WHERE id = '11111111-1111-1111-1111-000000000002';
UPDATE public.profiles SET alliance_count = 1 WHERE id = '11111111-1111-1111-1111-000000000003';
UPDATE public.profiles SET alliance_count = 1 WHERE id = '11111111-1111-1111-1111-000000000004';

-- Update open_positions counts for companies
UPDATE public.profiles SET open_positions = 4 WHERE id = '22222222-2222-2222-2222-000000000001';
UPDATE public.profiles SET open_positions = 3 WHERE id = '22222222-2222-2222-2222-000000000002';
UPDATE public.profiles SET open_positions = 2 WHERE id = '22222222-2222-2222-2222-000000000003';
UPDATE public.profiles SET open_positions = 3 WHERE id = '22222222-2222-2222-2222-000000000004';
UPDATE public.profiles SET open_positions = 3 WHERE id = '22222222-2222-2222-2222-000000000005';

-- ─────────────────────────────────────────────────────────────────
-- SECTION K – NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.notifications (id, user_id, title, body, type, read, link) VALUES
-- Para el colegio CECJMC
('notif-001','11111111-1111-1111-1111-000000000001','Solicitud de prácticas urgente',
 'Frío del Sur S.A. solicita 2 practicantes de Refrigeración con urgencia.','practica',FALSE,'/'),
('notif-002','11111111-1111-1111-1111-000000000001','Nueva alianza: AutoParts Chile',
 'AutoParts Chile solicita alianza para acceso al banco de talento de Mecatrónica.','alliance',FALSE,'/'),
('notif-003','11111111-1111-1111-1111-000000000001','Prácticas Soldadura aprobadas',
 'Las prácticas con MetalChile S.A. fueron aprobadas. 3 cupos confirmados.','practica',TRUE,'/'),
-- Para estudiante Marco Rivera
('notif-004','33333333-3333-3333-3333-000000000001','¡Insignia ganada!',
 'Ganaste la insignia Soldadura TIG Nivel I por tu excelente desempeño en el módulo.','badge',FALSE,'/'),
('notif-005','33333333-3333-3333-3333-000000000001','Empresa vio tu perfil',
 'MetalChile S.A. revisó tu portafolio y habilidades.','info',FALSE,'/'),
-- Para egresado Alejandro Mendoza
('notif-006','44444444-4444-4444-4444-000000000001','3 empresas vieron tu perfil',
 'Esta semana MetalChile, Innova Green y AutoParts revisaron tu perfil.','info',TRUE,'/'),
('notif-007','44444444-4444-4444-4444-000000000001','Nueva oferta de empleo',
 'MetalChile S.A. publicó una vacante de Técnico Mecatrónico que podría interesarte.','application',FALSE,'/'),
-- Para empresa MetalChile
('notif-008','22222222-2222-2222-2222-000000000001','Prácticas aprobadas por CECJMC',
 'CECJMC aprobó tu solicitud de 3 practicantes de Soldadura para enero 2026.','practica',FALSE,'/'),
('notif-009','22222222-2222-2222-2222-000000000001','Candidato destacado',
 'Diego Herrera cumple 96% de compatibilidad con tu búsqueda de Soldador TIG.','info',FALSE,'/'),
-- Para empresa Innova Green
('notif-010','22222222-2222-2222-2222-000000000002','Alianza activa con CECJMC',
 'Tu alianza con el CECJMC fue aprobada. Ya tienes acceso al banco de talento.','alliance',TRUE,'/'),
-- Para egresada Elena Rodríguez
('notif-011','44444444-4444-4444-4444-000000000002','Mensaje de reclutador',
 'Innova Green Ltda. te envió un mensaje sobre una oferta laboral.','message',FALSE,'/'),
('notif-012','44444444-4444-4444-4444-000000000002','Perfil visto x5',
 'Tu perfil fue visto por 5 empresas esta semana.','info',TRUE,'/')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- Re-enable normal FK and trigger behaviour
-- ─────────────────────────────────────────────────────────────────
SET session_replication_role = 'origin';

-- Sync XP manually (trigger won't fire on direct inserts above)
UPDATE public.profiles SET
  level = GREATEST(1, FLOOR(xp / 200) + 1)
WHERE role IN ('Estudiante','Egresado');

SELECT
  role,
  COUNT(*) AS total,
  STRING_AGG(name, ', ' ORDER BY name) AS names
FROM public.profiles
GROUP BY role
ORDER BY role;
