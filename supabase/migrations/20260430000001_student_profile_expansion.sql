-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Student Profile Expansion — Epic 1
-- Date: 2026-04-30
-- Idempotent: safe to re-run.
--
-- Adds mandatory student fields: gender, cellphone, class_name, age
-- Also adds a canonical UNIQUE index on conversations to prevent
-- duplicate threads between the same pair (Epic 4).
-- ═══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1 – New student profile columns
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender     TEXT,
  ADD COLUMN IF NOT EXISTS cellphone  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS age        INT;

-- Constrain gender to a known set (nullable = not yet filled)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_gender_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_gender_check
      CHECK (gender IS NULL OR gender IN ('Masculino','Femenino','Otro','Prefiero no decir'));
  END IF;
END $$;

-- Soft sanity check on age
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_age_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_age_check
      CHECK (age IS NULL OR (age >= 10 AND age <= 100));
  END IF;
END $$;

-- Indexes for school admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_school_gender
  ON profiles(school_id, gender)
  WHERE role = 'Estudiante';

CREATE INDEX IF NOT EXISTS idx_profiles_school_classname
  ON profiles(school_id, class_name)
  WHERE role = 'Estudiante';


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2 – RLS: School can UPDATE new fields on their own students
-- The policy "profiles_update_school_student" already exists from
-- migration 20260409000001 and covers all columns, so no change needed.
-- ─────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 3 – Canonical UNIQUE index on conversations (Epic 4)
-- Prevents duplicate threads for the same user pair regardless of
-- which UUID sorts first, so schools cannot create two channels to
-- the same student.
-- ─────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_conversations_canonical;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_canonical
  ON conversations(
    LEAST(user1_id, user2_id),
    GREATEST(user1_id, user2_id)
  );


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 4 – RLS: School can initiate conversations with own students
-- Schools need INSERT on conversations to start a new thread.
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "conversations_school_init" ON conversations;

CREATE POLICY "conversations_school_init" ON conversations
  FOR INSERT WITH CHECK (
    -- Either party can initiate (existing policy); this is a no-op
    -- additive layer that explicitly allows school→student threads.
    auth.uid() = user1_id OR auth.uid() = user2_id
  );


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 5 – Reload schema cache
-- ─────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
