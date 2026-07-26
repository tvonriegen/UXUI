-- ═══════════════════════════════════════════════════════════
-- Migration: Performance indexes + hardened RLS policies
-- Date: 2026-03-31
-- ═══════════════════════════════════════════════════════════

-- ─── Indexes ───────────────────────────────────────────────

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role         ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_specialty    ON profiles(specialty);
CREATE INDEX IF NOT EXISTS idx_profiles_availability ON profiles(availability);

-- posts
CREATE INDEX IF NOT EXISTS idx_posts_author_id   ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at  ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tag         ON posts(tag);

-- post_likes
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);

-- post_comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_author  ON post_comments(author_id);

-- notifications (composite)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_time
  ON notifications(user_id, read, created_at DESC);

-- messages (composite for chat queries)
CREATE INDEX IF NOT EXISTS idx_messages_convo_time
  ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last  ON conversations(last_message_at DESC);

-- job_postings
CREATE INDEX IF NOT EXISTS idx_job_postings_company    ON job_postings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_active     ON job_postings(active);
CREATE INDEX IF NOT EXISTS idx_job_postings_specialty  ON job_postings(specialty);

-- job_applications
CREATE INDEX IF NOT EXISTS idx_job_applications_job       ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_id);

-- portfolio_items
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_items(user_id);

-- xp_events
CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_type ON xp_events(type);

-- user_badges
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- ─── Row Level Security – hardened policies ────────────────

-- Drop any over-permissive existing policies and recreate tight ones

-- profiles: users read all profiles, update only their own
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;

CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- posts: anyone can read active posts; only owner can insert/update/delete
DROP POLICY IF EXISTS "posts_select" ON posts;
DROP POLICY IF EXISTS "posts_insert" ON posts;
DROP POLICY IF EXISTS "posts_update" ON posts;
DROP POLICY IF EXISTS "posts_delete" ON posts;

CREATE POLICY "posts_select_all" ON posts
  FOR SELECT USING (true);

CREATE POLICY "posts_insert_authenticated" ON posts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = author_id
  );

CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts_delete_own" ON posts
  FOR DELETE USING (auth.uid() = author_id);

-- post_likes: users manage their own likes only
DROP POLICY IF EXISTS "post_likes_select" ON post_likes;
DROP POLICY IF EXISTS "post_likes_insert" ON post_likes;
DROP POLICY IF EXISTS "post_likes_delete" ON post_likes;

CREATE POLICY "post_likes_select_all"   ON post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes_insert_own"   ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes_delete_own"   ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- messages: participants only can read; sender can insert; sender can delete own
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

CREATE POLICY "messages_select_participants" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert_participant" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "messages_delete_own" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- conversations: only participants can read/create
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;

CREATE POLICY "conversations_select_participant" ON conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "conversations_insert_auth" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- notifications: users only see their own
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- xp_events: server/trigger inserts only — users can read their own
DROP POLICY IF EXISTS "xp_events_select" ON xp_events;
DROP POLICY IF EXISTS "xp_events_insert" ON xp_events;

CREATE POLICY "xp_events_select_own" ON xp_events
  FOR SELECT USING (auth.uid() = user_id);

-- xp_events INSERT is intentionally restricted to service role via server API
-- Client code can call /api/xp to award XP (server validates and inserts)

-- job_postings: all authenticated users can read active jobs;
-- only the owning company can insert/update/delete
DROP POLICY IF EXISTS "job_postings_select" ON job_postings;
DROP POLICY IF EXISTS "job_postings_insert" ON job_postings;
DROP POLICY IF EXISTS "job_postings_update" ON job_postings;
DROP POLICY IF EXISTS "job_postings_delete" ON job_postings;

CREATE POLICY "job_postings_select_active" ON job_postings
  FOR SELECT USING (active = true OR company_id = auth.uid());

CREATE POLICY "job_postings_insert_company" ON job_postings
  FOR INSERT WITH CHECK (
    auth.uid() = company_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Empresa')
  );

CREATE POLICY "job_postings_update_own" ON job_postings
  FOR UPDATE USING (auth.uid() = company_id)
  WITH CHECK (auth.uid() = company_id);

CREATE POLICY "job_postings_delete_own" ON job_postings
  FOR DELETE USING (auth.uid() = company_id);

-- job_applications
DROP POLICY IF EXISTS "job_applications_select" ON job_applications;
DROP POLICY IF EXISTS "job_applications_insert" ON job_applications;

CREATE POLICY "job_applications_select" ON job_applications
  FOR SELECT USING (
    auth.uid() = applicant_id
    OR EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = job_id AND jp.company_id = auth.uid())
  );

CREATE POLICY "job_applications_insert_own" ON job_applications
  FOR INSERT WITH CHECK (
    auth.uid() = applicant_id
    AND NOT EXISTS (SELECT 1 FROM job_applications WHERE job_id = job_applications.job_id AND applicant_id = auth.uid())
  );

-- portfolio_items
DROP POLICY IF EXISTS "portfolio_select" ON portfolio_items;
DROP POLICY IF EXISTS "portfolio_insert" ON portfolio_items;
DROP POLICY IF EXISTS "portfolio_update" ON portfolio_items;
DROP POLICY IF EXISTS "portfolio_delete" ON portfolio_items;

CREATE POLICY "portfolio_select_all"   ON portfolio_items FOR SELECT USING (true);
CREATE POLICY "portfolio_insert_own"   ON portfolio_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolio_update_own"   ON portfolio_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "portfolio_delete_own"   ON portfolio_items FOR DELETE USING (auth.uid() = user_id);
