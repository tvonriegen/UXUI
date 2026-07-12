-- ═══════════════════════════════════════════════════════════════════
-- TalentHub – Complete Database Schema  (v2 – idempotent, re-runnable)
-- ═══════════════════════════════════════════════════════════════════
-- HOW TO APPLY
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file and click RUN
--   3. Auth → Providers → Email → disable "Confirm email" (for dev)
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- SECTION 1 – CORE PROFILES
-- One row per auth user; stores role-specific data as nullable cols
-- so we don't need separate tables for each archetype.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL DEFAULT '',
  name         TEXT        NOT NULL DEFAULT 'Usuario',
  role         TEXT        NOT NULL DEFAULT 'Estudiante'
                           CHECK (role IN ('Estudiante','Egresado','Empresa','Colegio')),
  avatar       TEXT        NOT NULL DEFAULT '',
  bio          TEXT        NOT NULL DEFAULT '',
  location     TEXT        NOT NULL DEFAULT '',

  -- ── Student / Graduate fields ──────────────────────────────────
  school_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL, -- which Colegio they belong to
  specialty    TEXT        NOT NULL DEFAULT '',
  title        TEXT        NOT NULL DEFAULT '',
  xp           INT         NOT NULL DEFAULT 0,
  level        INT         NOT NULL DEFAULT 1,
  streak       INT         NOT NULL DEFAULT 0,
  gpa          NUMERIC(5,2),
  availability TEXT        NOT NULL DEFAULT 'Disponible'
                           CHECK (availability IN ('Disponible','En prácticas','No disponible')),
  years_experience INT     NOT NULL DEFAULT 0,
  age          INT,

  -- ── Company fields ─────────────────────────────────────────────
  company_name   TEXT      NOT NULL DEFAULT '',
  industry       TEXT      NOT NULL DEFAULT '',
  employee_count TEXT      NOT NULL DEFAULT '',   -- "50-200", "500+" etc.
  website        TEXT      NOT NULL DEFAULT '',
  open_positions INT       NOT NULL DEFAULT 0,

  -- ── School fields ──────────────────────────────────────────────
  school_name         TEXT      NOT NULL DEFAULT '',
  student_count       INT,
  alliance_count      INT       NOT NULL DEFAULT 0,
  employability_rate  NUMERIC(5,2),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 2 – SKILLS & CERTIFICATIONS
-- Normalised so we can query "all students who know PLC Siemens"
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skills (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'General'
);

CREATE TABLE IF NOT EXISTS user_skills (
  user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id)   ON DELETE CASCADE,
  PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS certifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  issued_by   TEXT        NOT NULL DEFAULT '',
  issued_date DATE,
  expiry_date DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 3 – PORTFOLIO
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portfolio_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  image       TEXT        NOT NULL DEFAULT '',
  link        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_tags (
  item_id UUID NOT NULL REFERENCES portfolio_items(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY (item_id, tag)
);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 4 – GAMIFICATION
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  icon        TEXT NOT NULL DEFAULT 'award',   -- lucide icon name
  description TEXT NOT NULL DEFAULT '',
  requirement TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS user_badges (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id  UUID        NOT NULL REFERENCES badges(id)   ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS xp_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount     INT         NOT NULL,
  reason     TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 5 – COMMUNITY FEED (El Muro)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS posts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT        NOT NULL,
  description    TEXT        NOT NULL DEFAULT '',
  content        TEXT        NOT NULL DEFAULT '',
  author_id      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  image          TEXT        NOT NULL DEFAULT '',
  tag            TEXT        NOT NULL DEFAULT '',
  likes_count    INT         NOT NULL DEFAULT 0,
  comments_count INT         NOT NULL DEFAULT 0,
  views_count    INT         NOT NULL DEFAULT 0,
  category       TEXT        NOT NULL DEFAULT 'publicacion'
                             CHECK (category IN ('publicacion','portafolio')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id    UUID NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
  author_id  UUID        REFERENCES profiles(id)          ON DELETE SET NULL,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 6 – JOB POSTINGS & APPLICATIONS (Vacantes / Prácticas)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_postings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS job_applications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID        NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  student_id   UUID        NOT NULL REFERENCES profiles(id)     ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pendiente'
                           CHECK (status IN ('pendiente','en_revision','aceptado','rechazado')),
  cover_letter TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, student_id)
);

-- Runtime canonical column for the applicant. Historical migrations use
-- applicant_id, while the snapshot above still uses student_id as the alias.
-- Add applicant_id so the hardened interviews policy can reference it.
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

UPDATE job_applications
  SET applicant_id = student_id
  WHERE applicant_id IS NULL AND student_id IS NOT NULL;

ALTER TABLE job_applications
  ALTER COLUMN applicant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_student   ON job_applications(student_id);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 6B – INTERVIEWS
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interviews (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID        NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  company_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_at    TIMESTAMPTZ NOT NULL,
  duration_mins  INT         NOT NULL DEFAULT 30,
  modality       TEXT        NOT NULL DEFAULT 'video'
                             CHECK (modality IN ('video','presencial','telefono')),
  location       TEXT        NOT NULL DEFAULT '',
  meeting_link   TEXT        NOT NULL DEFAULT '',
  status         TEXT        NOT NULL DEFAULT 'proposed'
                             CHECK (status IN ('proposed','accepted','declined','completed','cancelled','rescheduled')),
  notes          TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_app
  ON interviews(application_id, proposed_at);

CREATE INDEX IF NOT EXISTS idx_interviews_participants
  ON interviews(student_id, company_id);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 7 – INTERNSHIP REQUESTS (school admin queue)
-- Company → requests internship slots from a school
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS internship_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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


-- ─────────────────────────────────────────────────────────────────
-- SECTION 8 – ALLIANCES (school ↔ company partnerships)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alliances (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'pendiente'
                         CHECK (status IN ('pendiente','activa','inactiva')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, school_id)
);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 9 – MESSAGING
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  kind            TEXT        NOT NULL DEFAULT 'text'
                               CHECK (kind IN ('text','interview_proposal','system')),
  metadata        JSONB,
  read            BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 10 – NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL DEFAULT '',
  type       TEXT        NOT NULL DEFAULT 'info'
                         CHECK (type IN ('info','badge','message','application','alliance','practica','contact_request')),
  read       BOOLEAN     NOT NULL DEFAULT FALSE,
  link       TEXT        NOT NULL DEFAULT '',
  metadata   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected','cancelled')),
  message          TEXT        NOT NULL DEFAULT '',
  reviewed_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 11 – PROFILE VIEWS (analytics)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profile_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_canonical
  ON conversations(LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

CREATE INDEX IF NOT EXISTS idx_contact_requests_school_status
  ON contact_requests(school_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_company_status
  ON contact_requests(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_student
  ON contact_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_pair_status
  ON contact_requests(company_id, student_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_requests_active_pair
  ON contact_requests(company_id, student_id)
  WHERE status IN ('pending','approved');

CREATE OR REPLACE FUNCTION is_minor_profile(profile_role TEXT, profile_age INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT profile_role = 'Estudiante' AND (profile_age IS NULL OR profile_age < 18);
$$;

CREATE OR REPLACE FUNCTION can_converse(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  left_profile  profiles%ROWTYPE;
  right_profile profiles%ROWTYPE;
  company_id    UUID;
  student_id    UUID;
BEGIN
  IF a IS NULL OR b IS NULL OR a = b THEN RETURN FALSE; END IF;

  SELECT * INTO left_profile FROM profiles WHERE id = a;
  SELECT * INTO right_profile FROM profiles WHERE id = b;
  IF left_profile.id IS NULL OR right_profile.id IS NULL THEN RETURN FALSE; END IF;

  IF left_profile.role = 'Empresa' AND right_profile.role IN ('Estudiante','Egresado') THEN
    company_id := left_profile.id; student_id := right_profile.id;
  ELSIF right_profile.role = 'Empresa' AND left_profile.role IN ('Estudiante','Egresado') THEN
    company_id := right_profile.id; student_id := left_profile.id;
  END IF;

  IF company_id IS NOT NULL THEN
    IF (CASE WHEN left_profile.id = student_id THEN left_profile.role ELSE right_profile.role END) = 'Egresado' THEN RETURN TRUE; END IF;
    IF NOT is_minor_profile(
      CASE WHEN left_profile.id = student_id THEN left_profile.role ELSE right_profile.role END,
      CASE WHEN left_profile.id = student_id THEN left_profile.age ELSE right_profile.age END
    ) THEN RETURN TRUE; END IF;
    RETURN EXISTS (
      SELECT 1 FROM contact_requests cr
      WHERE cr.company_id = company_id AND cr.student_id = student_id AND cr.status = 'approved'
    );
  END IF;

  IF left_profile.role = 'Colegio' AND right_profile.role = 'Estudiante' AND right_profile.school_id = left_profile.id THEN RETURN TRUE; END IF;
  IF right_profile.role = 'Colegio' AND left_profile.role = 'Estudiante' AND left_profile.school_id = right_profile.id THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;


-- ─────────────────────────────────────────────────────────────────
-- SECTION 12 – ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_tags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews         ENABLE ROW LEVEL SECURITY;
ALTER TABLE internship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views      ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies before recreating (makes script re-runnable)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- profiles
CREATE POLICY "profiles_select"  ON profiles FOR SELECT  USING (true);
CREATE POLICY "profiles_insert"  ON profiles FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update"  ON profiles FOR UPDATE  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- skills (read-only for everyone, no user writes needed from client)
CREATE POLICY "skills_select"    ON skills    FOR SELECT USING (true);

-- user_skills
CREATE POLICY "user_skills_select" ON user_skills FOR SELECT USING (true);
CREATE POLICY "user_skills_insert" ON user_skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_skills_delete" ON user_skills FOR DELETE USING (auth.uid() = user_id);

-- certifications
CREATE POLICY "certs_select" ON certifications FOR SELECT USING (true);
CREATE POLICY "certs_insert" ON certifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "certs_update" ON certifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "certs_delete" ON certifications FOR DELETE USING (auth.uid() = user_id);

-- portfolio
CREATE POLICY "portfolio_select" ON portfolio_items FOR SELECT USING (true);
CREATE POLICY "portfolio_insert" ON portfolio_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolio_update" ON portfolio_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "portfolio_delete" ON portfolio_items FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "portfolio_tags_select" ON portfolio_tags FOR SELECT USING (true);
CREATE POLICY "portfolio_tags_insert" ON portfolio_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolio_items WHERE id = item_id AND user_id = auth.uid()));
CREATE POLICY "portfolio_tags_delete" ON portfolio_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolio_items WHERE id = item_id AND user_id = auth.uid()));

-- badges
CREATE POLICY "badges_select"      ON badges      FOR SELECT USING (true);
CREATE POLICY "user_badges_select" ON user_badges FOR SELECT USING (true);

-- xp_events
CREATE POLICY "xp_events_select" ON xp_events FOR SELECT USING (auth.uid() = user_id);

-- posts
CREATE POLICY "posts_select" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "posts_update" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (auth.uid() = author_id);

-- post_likes
CREATE POLICY "likes_select" ON post_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- post_comments
CREATE POLICY "comments_select" ON post_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON post_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "comments_delete" ON post_comments FOR DELETE USING (auth.uid() = author_id);

-- job_postings
CREATE POLICY "jobs_select" ON job_postings FOR SELECT USING (true);
CREATE POLICY "jobs_insert" ON job_postings FOR INSERT WITH CHECK (auth.uid() = company_id);
CREATE POLICY "jobs_update" ON job_postings FOR UPDATE USING (auth.uid() = company_id);
CREATE POLICY "jobs_delete" ON job_postings FOR DELETE USING (auth.uid() = company_id);

-- job_applications
CREATE POLICY "applications_select" ON job_applications FOR SELECT
  USING (auth.uid() = student_id OR
         EXISTS (SELECT 1 FROM job_postings WHERE id = job_id AND company_id = auth.uid()));
CREATE POLICY "applications_insert" ON job_applications FOR INSERT
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "applications_update" ON job_applications FOR UPDATE
  USING (auth.uid() = student_id OR
         EXISTS (SELECT 1 FROM job_postings WHERE id = job_id AND company_id = auth.uid()));

-- internship_requests
CREATE POLICY "internship_select" ON internship_requests FOR SELECT
  USING (auth.uid() = company_id OR auth.uid() = school_id);
CREATE POLICY "internship_insert" ON internship_requests FOR INSERT
  WITH CHECK (auth.uid() = company_id);
CREATE POLICY "internship_update" ON internship_requests FOR UPDATE
  USING (auth.uid() = school_id OR auth.uid() = company_id);

-- alliances
CREATE POLICY "alliances_select" ON alliances FOR SELECT USING (true);
CREATE POLICY "alliances_insert" ON alliances FOR INSERT WITH CHECK (auth.uid() = company_id);
CREATE POLICY "alliances_update" ON alliances FOR UPDATE
  USING (auth.uid() = school_id OR auth.uid() = company_id);

-- conversations
CREATE POLICY "conv_select" ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "conversations_insert_participant" ON conversations FOR INSERT
  WITH CHECK ((auth.uid() = user1_id OR auth.uid() = user2_id) AND can_converse(user1_id, user2_id));

-- messages
CREATE POLICY "msg_select" ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ));
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        AND can_converse(c.user1_id, c.user2_id)
    )
  );
CREATE POLICY "msg_update" ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- notifications
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- contact_requests
CREATE POLICY "contact_requests_select_company_school" ON contact_requests FOR SELECT
  USING (auth.uid() = company_id OR auth.uid() = school_id);
CREATE POLICY "contact_requests_insert_company" ON contact_requests FOR INSERT
  WITH CHECK (
    auth.uid() = company_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND COALESCE(rejection_reason, '') = ''
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = company_id AND p.role = 'Empresa')
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = school_id AND p.role = 'Colegio')
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = student_id
        AND p.role = 'Estudiante'
        AND p.school_id = school_id
        AND is_minor_profile(p.role, p.age)
    )
  );
CREATE POLICY "contact_requests_company_cancel" ON contact_requests FOR UPDATE
  USING (auth.uid() = company_id AND status = 'pending')
  WITH CHECK (auth.uid() = company_id AND status = 'cancelled');
CREATE POLICY "contact_requests_school_review" ON contact_requests FOR UPDATE
  USING (auth.uid() = school_id AND status = 'pending')
  WITH CHECK (auth.uid() = school_id AND status IN ('approved','rejected'));
CREATE POLICY "contact_requests_delete_denied" ON contact_requests FOR DELETE USING (FALSE);

-- interviews
CREATE POLICY "interviews_select" ON interviews FOR SELECT
  USING (auth.uid() = company_id OR auth.uid() = student_id);
CREATE POLICY "interviews_insert_company" ON interviews FOR INSERT
  WITH CHECK (
    auth.uid() = company_id
    AND status = 'proposed'
    AND EXISTS (
      SELECT 1
      FROM job_applications ja
      JOIN job_postings jp ON jp.id = ja.job_id
      WHERE ja.id = application_id
        AND ja.applicant_id = student_id
        AND jp.company_id = auth.uid()
        AND jp.company_id = company_id
    )
    AND can_converse(company_id, student_id)
  );
CREATE POLICY "interviews_update_participant" ON interviews FOR UPDATE
  USING (auth.uid() = company_id OR auth.uid() = student_id);

-- profile_views
CREATE POLICY "pv_select" ON profile_views FOR SELECT
  USING (auth.uid() = viewer_id OR auth.uid() = viewed_id);
CREATE POLICY "pv_insert" ON profile_views FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 13 – TRIGGERS & FUNCTIONS
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_contact_requests_guard()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.school_id IS DISTINCT FROM OLD.school_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'contact request identities are immutable';
  END IF;
  IF OLD.status <> 'pending' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'only pending contact requests can change status';
  END IF;
  IF NEW.status IN ('approved','rejected') AND OLD.status = 'pending' THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, NOW());
    IF NEW.status = 'approved' THEN NEW.rejection_reason := ''; END IF;
  ELSIF NEW.status = 'cancelled' THEN
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.rejection_reason := '';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_requests_guard ON contact_requests;
CREATE TRIGGER trg_contact_requests_guard
  BEFORE UPDATE ON contact_requests
  FOR EACH ROW EXECUTE FUNCTION trg_fn_contact_requests_guard();

CREATE OR REPLACE FUNCTION trg_fn_contact_request_approve_conversation()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_a UUID;
  user_b UUID;
BEGIN
  IF NEW.status <> 'approved' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  user_a := LEAST(NEW.company_id, NEW.student_id);
  user_b := GREATEST(NEW.company_id, NEW.student_id);
  INSERT INTO conversations (user1_id, user2_id, last_message_at)
  SELECT user_a, user_b, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE LEAST(c.user1_id, c.user2_id) = user_a
      AND GREATEST(c.user1_id, c.user2_id) = user_b
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_request_approve_conversation ON contact_requests;
CREATE TRIGGER trg_contact_request_approve_conversation
  AFTER UPDATE OF status ON contact_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trg_fn_contact_request_approve_conversation();

CREATE OR REPLACE FUNCTION trg_fn_contact_request_notify()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_name TEXT;
  v_student_name TEXT;
  v_recipient UUID;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT COALESCE(company_name, name, 'La empresa') INTO v_company_name FROM profiles WHERE id = NEW.company_id;
  SELECT COALESCE(name, 'el/la estudiante') INTO v_student_name FROM profiles WHERE id = NEW.student_id;

  IF TG_OP = 'INSERT' THEN
    v_recipient := NEW.school_id;
    v_title := 'Solicitud de contacto pendiente';
    v_body := v_company_name || ' solicitó contactar a ' || v_student_name || '.';
  ELSIF NEW.status = 'approved' THEN
    v_recipient := NEW.company_id;
    v_title := 'Solicitud de contacto aprobada';
    v_body := 'El colegio aprobó el contacto con ' || v_student_name || '.';
  ELSIF NEW.status = 'rejected' THEN
    v_recipient := NEW.company_id;
    v_title := 'Solicitud de contacto rechazada';
    v_body := 'El colegio rechazó el contacto con ' || v_student_name || '.';
  ELSIF NEW.status = 'cancelled' THEN
    v_recipient := NEW.school_id;
    v_title := 'Solicitud de contacto cancelada';
    v_body := v_company_name || ' canceló la solicitud de contacto con ' || v_student_name || '.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, title, body, type, link, metadata)
  VALUES (
    v_recipient,
    v_title,
    v_body,
    'contact_request',
    CASE WHEN NEW.status = 'approved' THEN '/messages' ELSE '/dashboard' END,
    jsonb_build_object('contact_request_id', NEW.id, 'status', NEW.status, 'company_id', NEW.company_id, 'student_id', NEW.student_id, 'school_id', NEW.school_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_request_notify_ins ON contact_requests;
CREATE TRIGGER trg_contact_request_notify_ins
  AFTER INSERT ON contact_requests
  FOR EACH ROW EXECUTE FUNCTION trg_fn_contact_request_notify();

DROP TRIGGER IF EXISTS trg_contact_request_notify_upd ON contact_requests;
CREATE TRIGGER trg_contact_request_notify_upd
  AFTER UPDATE OF status ON contact_requests
  FOR EACH ROW EXECUTE FUNCTION trg_fn_contact_request_notify();

-- ── interviews: immutable identity columns on UPDATE ──────────────
CREATE OR REPLACE FUNCTION trg_fn_interviews_guard_immutable()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.application_id IS DISTINCT FROM OLD.application_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'interview identity fields (application_id, company_id, student_id, created_at) are immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_interviews_guard_immutable ON interviews;
CREATE TRIGGER trg_interviews_guard_immutable
  BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION trg_fn_interviews_guard_immutable();

-- ── keep likes_count in sync ──────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_likes ON post_likes;
CREATE TRIGGER trg_sync_likes
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION sync_likes_count();

-- ── keep comments_count in sync ───────────────────────────────────
CREATE OR REPLACE FUNCTION sync_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_comments ON post_comments;
CREATE TRIGGER trg_sync_comments
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION sync_comments_count();

-- ── keep profiles.updated_at current ─────────────────────────────
CREATE OR REPLACE FUNCTION trg_fn_profiles_guard_role_age()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.age IS DISTINCT FROM OLD.age)
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'role and age changes require a trusted server action';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_role_age ON profiles;
CREATE TRIGGER trg_profiles_guard_role_age
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION trg_fn_profiles_guard_role_age();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── auto-create profile on sign-up  ──────────────────────────────
-- CRITICAL: SET search_path = public ensures the function always
-- finds the profiles table regardless of the session search_path.
-- The EXCEPTION block guarantees a trigger failure NEVER blocks
-- the auth signup itself.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Estudiante')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user() error for uid %: %', NEW.id, SQLERRM;
    RETURN NEW;   -- never block the signup
END;
$$;

DROP TRIGGER IF EXISTS trg_new_user ON auth.users;
CREATE TRIGGER trg_new_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── update conversation.last_message_at on new message ───────────
CREATE OR REPLACE FUNCTION sync_last_message()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_last_message ON messages;
CREATE TRIGGER trg_sync_last_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION sync_last_message();

-- ── XP events → keep profiles.xp in sync ─────────────────────────
CREATE OR REPLACE FUNCTION sync_user_xp()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET xp    = xp + NEW.amount,
      level = GREATEST(1, FLOOR((xp + NEW.amount) / 200) + 1)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_xp ON xp_events;
CREATE TRIGGER trg_sync_xp
AFTER INSERT ON xp_events
FOR EACH ROW EXECUTE FUNCTION sync_user_xp();
