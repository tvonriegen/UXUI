-- ═══════════════════════════════════════════════════════════════════
-- ClassLink – Complete Database Schema  (v2 – idempotent, re-runnable)
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
  participant_a   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_b   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_a, participant_b)
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  content         TEXT        NOT NULL,
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
                         CHECK (type IN ('info','badge','message','application','alliance','practica')),
  read       BOOLEAN     NOT NULL DEFAULT FALSE,
  link       TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
ALTER TABLE internship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "profiles_update"  ON profiles FOR UPDATE  USING (auth.uid() = id);

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
  USING (auth.uid() = participant_a OR auth.uid() = participant_b);
CREATE POLICY "conv_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

-- messages
CREATE POLICY "msg_select" ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
      AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
  ));
CREATE POLICY "msg_insert" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "msg_update" ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- notifications
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- profile_views
CREATE POLICY "pv_select" ON profile_views FOR SELECT
  USING (auth.uid() = viewer_id OR auth.uid() = viewed_id);
CREATE POLICY "pv_insert" ON profile_views FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 13 – TRIGGERS & FUNCTIONS
-- ─────────────────────────────────────────────────────────────────

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
