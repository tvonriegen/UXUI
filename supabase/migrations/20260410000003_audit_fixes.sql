-- ═══════════════════════════════════════════════════════════
-- Migration: Audit fixes — schema drift, constraints, security
-- Date: 2026-04-10
-- Idempotent: safe to run on both schema.sql and full_reset.sql bases
-- ═══════════════════════════════════════════════════════════

-- ─── C-1: xp_events column rename (schema.sql had amount/reason) ───
-- full_reset.sql already has xp_amount/type/metadata — skip if correct
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xp_events' AND column_name = 'amount'
  ) THEN
    ALTER TABLE xp_events RENAME COLUMN amount TO xp_amount;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xp_events' AND column_name = 'reason'
  ) THEN
    ALTER TABLE xp_events RENAME COLUMN reason TO type;
  END IF;
END $$;

ALTER TABLE xp_events
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Ensure type column has a sensible default
DO $$ BEGIN
  ALTER TABLE xp_events ALTER COLUMN type SET DEFAULT 'general';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Update trigger to use the authoritative column name xp_amount
CREATE OR REPLACE FUNCTION sync_user_xp()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET xp    = xp + NEW.xp_amount,
      level = GREATEST(1, FLOOR((xp + NEW.xp_amount) / 200) + 1)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Recreate trigger in case it was bound to the old function signature
DROP TRIGGER IF EXISTS trg_sync_xp ON xp_events;
CREATE TRIGGER trg_sync_xp
AFTER INSERT ON xp_events
FOR EACH ROW EXECUTE FUNCTION sync_user_xp();

-- ─── C-2: job_postings type constraint (schema.sql had wrong values) ─
-- Drop the wrong constraint if it exists; full_reset.sql has no constraint
ALTER TABLE job_postings DROP CONSTRAINT IF EXISTS job_postings_type_check;

-- ─── C-3: is_open → active (schema.sql had is_open) ─────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_postings' AND column_name = 'is_open'
  ) THEN
    ALTER TABLE job_postings RENAME COLUMN is_open TO active;
  END IF;
END $$;

-- Ensure active column exists regardless
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

DROP INDEX IF EXISTS idx_job_postings_active;
CREATE INDEX IF NOT EXISTS idx_job_postings_active ON job_postings(active);

-- ─── H-1: conversations participant_a/b → user1_id/user2_id ──────────
-- messages/page.tsx and full_reset.sql use user1_id/user2_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'participant_a'
  ) THEN
    ALTER TABLE conversations RENAME COLUMN participant_a TO user1_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'participant_b'
  ) THEN
    ALTER TABLE conversations RENAME COLUMN participant_b TO user2_id;
  END IF;
END $$;

-- Fix RLS policies on conversations (drop all variants, recreate canonical)
DROP POLICY IF EXISTS "conv_select"                        ON conversations;
DROP POLICY IF EXISTS "conv_insert"                        ON conversations;
DROP POLICY IF EXISTS "conversations_select_participant"   ON conversations;
DROP POLICY IF EXISTS "conversations_insert_auth"          ON conversations;
DROP POLICY IF EXISTS "conversations_insert_participant"   ON conversations;

CREATE POLICY "conversations_select_participant" ON conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "conversations_insert_participant" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Fix RLS policies on messages to use corrected column names
DROP POLICY IF EXISTS "msg_select"                     ON messages;
DROP POLICY IF EXISTS "msg_insert"                     ON messages;
DROP POLICY IF EXISTS "msg_update"                     ON messages;
DROP POLICY IF EXISTS "messages_select_participants"   ON messages;
DROP POLICY IF EXISTS "messages_insert_participant"    ON messages;
DROP POLICY IF EXISTS "messages_delete_own"            ON messages;

CREATE POLICY "messages_select_participants" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert_participant" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "messages_delete_own" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Fix conversation indexes
DROP INDEX IF EXISTS idx_conversations_user1;
DROP INDEX IF EXISTS idx_conversations_user2;
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);

-- ─── H-2: job_applications — fix RLS to use applicant_id (full_reset) ─
-- Drop any policies that reference the wrong column name
DROP POLICY IF EXISTS "applications_select" ON job_applications;
DROP POLICY IF EXISTS "applications_insert" ON job_applications;
DROP POLICY IF EXISTS "applications_update" ON job_applications;
DROP POLICY IF EXISTS "job_applications_select" ON job_applications;
DROP POLICY IF EXISTS "job_applications_insert_own" ON job_applications;

CREATE POLICY "applications_select" ON job_applications
  FOR SELECT USING (
    auth.uid() = applicant_id
    OR EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = job_id AND jp.company_id = auth.uid())
  );

CREATE POLICY "applications_insert" ON job_applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "applications_update" ON job_applications
  FOR UPDATE USING (
    auth.uid() = applicant_id
    OR EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = job_id AND jp.company_id = auth.uid())
  );

-- Ensure index exists on applicant_id
DROP INDEX IF EXISTS idx_job_applications_applicant;
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_id);

-- ─── H-3: posts category constraint — add oferta and evento ──────────
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_check;
ALTER TABLE posts
  ADD CONSTRAINT posts_category_check
  CHECK (category IN ('publicacion', 'portafolio', 'evento', 'oferta'));

-- ─── C-4 safety: ensure job_applications status accepts English values ─
-- Migration 20260410000002 should have done this; this is a safety net.
ALTER TABLE job_applications
  DROP CONSTRAINT IF EXISTS job_applications_status_check;

ALTER TABLE job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'hired'));

-- ─── Reload PostgREST schema cache ───────────────────────────────────
NOTIFY pgrst, 'reload schema';
