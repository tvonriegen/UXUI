-- ═══════════════════════════════════════════════════════════════════
-- ClassLink – FULL SCHEMA RESET  (v3 – matches current app code)
-- ═══════════════════════════════════════════════════════════════════
-- HOW TO USE:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file and click RUN
--   3. Then call POST /api/seed (once deployed) to create demo accounts
--
-- ⚠️  WARNING: This drops ALL existing public tables and their data.
--     It does NOT touch auth.users.
-- ═══════════════════════════════════════════════════════════════════

-- ── Drop tables in reverse FK order ──────────────────────────────
DROP TABLE IF EXISTS profile_views       CASCADE;
DROP TABLE IF EXISTS notifications       CASCADE;
DROP TABLE IF EXISTS messages            CASCADE;
DROP TABLE IF EXISTS conversations       CASCADE;
DROP TABLE IF EXISTS xp_events          CASCADE;
DROP TABLE IF EXISTS user_badges         CASCADE;
DROP TABLE IF EXISTS badges              CASCADE;
DROP TABLE IF EXISTS internship_requests CASCADE;
DROP TABLE IF EXISTS alliances           CASCADE;
DROP TABLE IF EXISTS job_applications    CASCADE;
DROP TABLE IF EXISTS job_postings        CASCADE;
DROP TABLE IF EXISTS post_comments       CASCADE;
DROP TABLE IF EXISTS post_likes          CASCADE;
DROP TABLE IF EXISTS posts               CASCADE;
DROP TABLE IF EXISTS portfolio_tags      CASCADE;
DROP TABLE IF EXISTS portfolio_items     CASCADE;
DROP TABLE IF EXISTS certifications      CASCADE;
DROP TABLE IF EXISTS user_skills         CASCADE;
DROP TABLE IF EXISTS skills              CASCADE;
DROP TABLE IF EXISTS profiles            CASCADE;

-- ── Drop old trigger functions ────────────────────────────────────
DROP FUNCTION IF EXISTS handle_new_user()      CASCADE;
DROP FUNCTION IF EXISTS sync_likes_count()     CASCADE;
DROP FUNCTION IF EXISTS sync_comments_count()  CASCADE;
DROP FUNCTION IF EXISTS set_updated_at()       CASCADE;
DROP FUNCTION IF EXISTS sync_last_message()    CASCADE;
DROP FUNCTION IF EXISTS sync_user_xp()         CASCADE;


-- ─────────────────────────────────────────────────────────────────
-- SECTION 1 – PROFILES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL DEFAULT '',
  name         TEXT        NOT NULL DEFAULT 'Usuario',
  role         TEXT        NOT NULL DEFAULT 'Estudiante'
                           CHECK (role IN ('Estudiante','Egresado','Empresa','Colegio')),
  avatar       TEXT        NOT NULL DEFAULT '',
  bio          TEXT        NOT NULL DEFAULT '',
  location     TEXT        NOT NULL DEFAULT '',

  -- Student / Graduate
  school_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  specialty    TEXT        NOT NULL DEFAULT '',
  title        TEXT        NOT NULL DEFAULT '',
  xp           INT         NOT NULL DEFAULT 0,
  level        INT         NOT NULL DEFAULT 1,
  streak       INT         NOT NULL DEFAULT 0,
  gpa          NUMERIC(5,2),
  availability TEXT        NOT NULL DEFAULT 'Disponible'
                           CHECK (availability IN ('Disponible','En prácticas','No disponible')),
  years_experience INT     NOT NULL DEFAULT 0,

  -- Company
  company_name   TEXT      NOT NULL DEFAULT '',
  industry       TEXT      NOT NULL DEFAULT '',
  employee_count TEXT      NOT NULL DEFAULT '',
  website        TEXT      NOT NULL DEFAULT '',
  open_positions INT       NOT NULL DEFAULT 0,

  -- School
  school_name         TEXT      NOT NULL DEFAULT '',
  student_count       INT,
  alliance_count      INT       NOT NULL DEFAULT 0,
  employability_rate  NUMERIC(5,2),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- SECTION 2 – SKILLS & CERTIFICATIONS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE skills (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'General'
);

CREATE TABLE user_skills (
  user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id)   ON DELETE CASCADE,
  PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE certifications (
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
CREATE TABLE portfolio_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  image       TEXT        NOT NULL DEFAULT '',
  link        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE portfolio_tags (
  item_id UUID NOT NULL REFERENCES portfolio_items(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY (item_id, tag)
);

-- ─────────────────────────────────────────────────────────────────
-- SECTION 4 – GAMIFICATION
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  icon        TEXT NOT NULL DEFAULT 'award',
  description TEXT NOT NULL DEFAULT '',
  requirement TEXT NOT NULL DEFAULT ''
);

CREATE TABLE user_badges (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id  UUID        NOT NULL REFERENCES badges(id)   ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE xp_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL DEFAULT 'general',
  xp_amount  INT         NOT NULL DEFAULT 0,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- SECTION 5 – COMMUNITY FEED
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE posts (
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

CREATE TABLE post_likes (
  post_id    UUID NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE post_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
  author_id  UUID        REFERENCES profiles(id)          ON DELETE SET NULL,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- SECTION 6 – JOB POSTINGS & APPLICATIONS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE job_postings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT        NOT NULL DEFAULT '',
  specialty    TEXT        NOT NULL DEFAULT '',
  location     TEXT        NOT NULL DEFAULT '',
  type         TEXT        NOT NULL DEFAULT 'full-time',
  salary_min   INT,
  salary_max   INT,
  active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_applications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID        NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  applicant_id UUID        NOT NULL REFERENCES profiles(id)     ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending',
  cover_letter TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, applicant_id)
);

-- ─────────────────────────────────────────────────────────────────
-- SECTION 7 – INTERNSHIP REQUESTS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE internship_requests (
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
-- SECTION 8 – ALLIANCES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE alliances (
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
-- Uses user1_id / user2_id (matches app code)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user1_id, user2_id)
);

CREATE TABLE messages (
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
CREATE TABLE notifications (
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
-- SECTION 11 – PROFILE VIEWS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE profile_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 12 – INDEXES
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_role         ON profiles(role);
CREATE INDEX idx_profiles_specialty    ON profiles(specialty);
CREATE INDEX idx_profiles_availability ON profiles(availability);
CREATE INDEX idx_posts_author_id       ON posts(author_id);
CREATE INDEX idx_posts_created_at      ON posts(created_at DESC);
CREATE INDEX idx_posts_tag             ON posts(tag);
CREATE INDEX idx_post_likes_user_id    ON post_likes(user_id);
CREATE INDEX idx_post_likes_post_id    ON post_likes(post_id);
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_notifications_user    ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_messages_convo        ON messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_sender       ON messages(sender_id);
CREATE INDEX idx_conversations_user1   ON conversations(user1_id);
CREATE INDEX idx_conversations_user2   ON conversations(user2_id);
CREATE INDEX idx_conversations_last    ON conversations(last_message_at DESC);
CREATE INDEX idx_job_postings_company  ON job_postings(company_id);
CREATE INDEX idx_job_postings_active   ON job_postings(active);
CREATE INDEX idx_job_applications_job  ON job_applications(job_id);
CREATE INDEX idx_job_applications_user ON job_applications(applicant_id);
CREATE INDEX idx_portfolio_user        ON portfolio_items(user_id);
CREATE INDEX idx_xp_events_user        ON xp_events(user_id);
CREATE INDEX idx_user_badges_user      ON user_badges(user_id);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 13 – ROW LEVEL SECURITY
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

-- profiles
CREATE POLICY "profiles_select"  ON profiles FOR SELECT  USING (true);
CREATE POLICY "profiles_insert"  ON profiles FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update"  ON profiles FOR UPDATE  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- skills
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

-- xp_events (service-role insert via /api/xp; users read own)
CREATE POLICY "xp_events_select" ON xp_events FOR SELECT USING (auth.uid() = user_id);

-- posts
CREATE POLICY "posts_select" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);
CREATE POLICY "posts_update" ON posts FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
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
CREATE POLICY "jobs_select" ON job_postings FOR SELECT USING (active = true OR company_id = auth.uid());
CREATE POLICY "jobs_insert" ON job_postings FOR INSERT
  WITH CHECK (auth.uid() = company_id AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Empresa'));
CREATE POLICY "jobs_update" ON job_postings FOR UPDATE USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);
CREATE POLICY "jobs_delete" ON job_postings FOR DELETE USING (auth.uid() = company_id);

-- job_applications
CREATE POLICY "applications_select" ON job_applications FOR SELECT
  USING (auth.uid() = applicant_id OR
         EXISTS (SELECT 1 FROM job_postings WHERE id = job_id AND company_id = auth.uid()));
CREATE POLICY "applications_insert" ON job_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "applications_update" ON job_applications FOR UPDATE
  USING (auth.uid() = applicant_id OR
         EXISTS (SELECT 1 FROM job_postings WHERE id = job_id AND company_id = auth.uid()));

-- internship_requests
CREATE POLICY "internship_select" ON internship_requests FOR SELECT
  USING (auth.uid() = company_id OR auth.uid() = school_id);
CREATE POLICY "internship_insert" ON internship_requests FOR INSERT WITH CHECK (auth.uid() = company_id);
CREATE POLICY "internship_update" ON internship_requests FOR UPDATE
  USING (auth.uid() = school_id OR auth.uid() = company_id);

-- alliances
CREATE POLICY "alliances_select" ON alliances FOR SELECT USING (true);
CREATE POLICY "alliances_insert" ON alliances FOR INSERT WITH CHECK (auth.uid() = company_id);
CREATE POLICY "alliances_update" ON alliances FOR UPDATE
  USING (auth.uid() = school_id OR auth.uid() = company_id);

-- conversations (user1_id / user2_id)
CREATE POLICY "conv_select" ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "conv_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- messages
CREATE POLICY "msg_select" ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ));
CREATE POLICY "msg_insert" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ));
CREATE POLICY "msg_update" ON messages FOR UPDATE USING (auth.uid() = sender_id);

-- notifications
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- profile_views
CREATE POLICY "pv_select" ON profile_views FOR SELECT
  USING (auth.uid() = viewer_id OR auth.uid() = viewed_id);
CREATE POLICY "pv_insert" ON profile_views FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ─────────────────────────────────────────────────────────────────
-- SECTION 14 – TRIGGERS & FUNCTIONS
-- ─────────────────────────────────────────────────────────────────

-- Auto-create profile on signup
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
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_user ON auth.users;
CREATE TRIGGER trg_new_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Keep likes_count in sync
CREATE OR REPLACE FUNCTION sync_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_likes ON post_likes;
CREATE TRIGGER trg_sync_likes AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION sync_likes_count();

-- Keep comments_count in sync
CREATE OR REPLACE FUNCTION sync_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_comments ON post_comments;
CREATE TRIGGER trg_sync_comments AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION sync_comments_count();

-- Keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Update conversation last_message_at
CREATE OR REPLACE FUNCTION sync_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_last_message ON messages;
CREATE TRIGGER trg_sync_last_message AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION sync_last_message();
