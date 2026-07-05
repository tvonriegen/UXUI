-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Gamification Overhaul (Duolingo-style)
-- Date: 2026-04-24
-- Idempotent: safe to re-run.
--
-- Introduces:
--   1. profiles.last_active_date, longest_streak, xp_tier
--   2. daily_quests catalog + user_daily_progress tracker
--   3. quest_templates (seeded) and daily rotation (quest_of_day view)
--   4. Streak tracking RPC (touch_streak)
--   5. Tier derivation function (compute_xp_tier)
-- ═══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1 – profiles: streak / tier columns
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_active_date DATE,
  ADD COLUMN IF NOT EXISTS longest_streak   INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_tier          TEXT NOT NULL DEFAULT 'Bronce'
    CHECK (xp_tier IN ('Bronce','Plata','Oro','Platino','Diamante'));


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2 – Tier derivation from XP
-- Thresholds: Bronce 0 / Plata 500 / Oro 2000 / Platino 5000 / Diamante 10000
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_xp_tier(p_xp INT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN COALESCE(p_xp, 0) >= 10000 THEN 'Diamante'
    WHEN COALESCE(p_xp, 0) >=  5000 THEN 'Platino'
    WHEN COALESCE(p_xp, 0) >=  2000 THEN 'Oro'
    WHEN COALESCE(p_xp, 0) >=   500 THEN 'Plata'
    ELSE 'Bronce'
  END;
$$;

-- Hook into XP sync trigger: also update xp_tier on every xp_events insert.
CREATE OR REPLACE FUNCTION sync_user_xp()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new_xp  INT;
BEGIN
  UPDATE public.profiles
  SET xp      = xp + NEW.xp_amount,
      level   = GREATEST(1, FLOOR((xp + NEW.xp_amount) / 200) + 1)
  WHERE id = NEW.user_id
  RETURNING xp INTO v_new_xp;

  UPDATE public.profiles
  SET xp_tier = compute_xp_tier(v_new_xp)
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- Backfill existing xp_tier values once
UPDATE profiles SET xp_tier = compute_xp_tier(xp);


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 3 – quest_templates (static catalog)
-- Types of daily quests students can see.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quest_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT        NOT NULL UNIQUE,
  title        TEXT        NOT NULL,
  description  TEXT        NOT NULL DEFAULT '',
  icon         TEXT        NOT NULL DEFAULT 'target',
  target_count INT         NOT NULL DEFAULT 1,
  xp_reward    INT         NOT NULL DEFAULT 25,
  category     TEXT        NOT NULL DEFAULT 'engagement'
                           CHECK (category IN ('engagement','learning','social','career')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE quest_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quest_templates_select" ON quest_templates;
CREATE POLICY "quest_templates_select" ON quest_templates FOR SELECT USING (true);

INSERT INTO quest_templates (code, title, description, icon, target_count, xp_reward, category) VALUES
  ('view_jobs_3',       'Explora 3 vacantes',       'Revisa al menos 3 publicaciones de empleos hoy.',         'briefcase',    3, 30, 'career'),
  ('update_skill',      'Actualiza una habilidad',  'Añade o edita una habilidad técnica en tu perfil.',       'sparkles',     1, 40, 'learning'),
  ('follow_company',    'Sigue una empresa',        'Comienza a seguir al menos una empresa nueva.',           'user-plus',    1, 25, 'social'),
  ('apply_job',         'Postula a una vacante',    'Envía una postulación a una vacante abierta.',            'send',         1, 60, 'career'),
  ('post_muro',         'Publica en el Muro',       'Comparte una actualización o proyecto con la comunidad.', 'megaphone',    1, 35, 'social'),
  ('view_profile',      'Mejora tu perfil',         'Visita tu perfil y actualiza algún dato relevante.',      'user',         1, 20, 'engagement'),
  ('complete_activity', 'Completa una actividad',   'Termina una actividad del centro de talento.',            'target',       1, 50, 'learning'),
  ('like_posts_3',      'Apoya 3 publicaciones',    'Da like a 3 publicaciones del muro.',                     'heart',        3, 20, 'social')
ON CONFLICT (code) DO UPDATE SET
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  icon         = EXCLUDED.icon,
  target_count = EXCLUDED.target_count,
  xp_reward    = EXCLUDED.xp_reward,
  category     = EXCLUDED.category;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 4 – user_daily_progress (one row per user per quest per day)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_daily_progress (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_code   TEXT        NOT NULL REFERENCES quest_templates(code) ON DELETE CASCADE,
  quest_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  current_count   INT         NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, template_code, quest_date)
);

ALTER TABLE user_daily_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "udp_select_own" ON user_daily_progress;
DROP POLICY IF EXISTS "udp_insert_own" ON user_daily_progress;
DROP POLICY IF EXISTS "udp_update_own" ON user_daily_progress;

CREATE POLICY "udp_select_own" ON user_daily_progress FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "udp_insert_own" ON user_daily_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "udp_update_own" ON user_daily_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_udp_user_date
  ON user_daily_progress(user_id, quest_date DESC);


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 5 – get_daily_quests(user, date) RPC
-- Returns 3 quests selected deterministically by user+date hash,
-- joined with the user's current progress.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_daily_quests(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  template_code TEXT,
  title         TEXT,
  description   TEXT,
  icon          TEXT,
  target_count  INT,
  xp_reward     INT,
  category      TEXT,
  current_count INT,
  completed_at  TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ordered AS (
    SELECT qt.code,
           qt.title,
           qt.description,
           qt.icon,
           qt.target_count,
           qt.xp_reward,
           qt.category,
           hashtextextended(qt.code || '|' || p_user_id::TEXT || '|' || p_date::TEXT, 0) AS h
    FROM quest_templates qt
  ),
  picked AS (
    SELECT *
    FROM ordered
    ORDER BY h
    LIMIT 3
  )
  SELECT
    p.code,
    p.title,
    p.description,
    p.icon,
    p.target_count,
    p.xp_reward,
    p.category,
    COALESCE(prog.current_count, 0),
    prog.completed_at
  FROM picked p
  LEFT JOIN user_daily_progress prog
    ON prog.user_id       = p_user_id
   AND prog.template_code = p.code
   AND prog.quest_date    = p_date;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 6 – touch_streak(user): called on login / meaningful activity.
-- Handles:
--   - first-ever activity (streak = 1)
--   - same-day activity (no change)
--   - next-day activity (streak + 1)
--   - gap > 1 day (streak reset to 1)
-- Returns new streak value.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_streak(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_last        DATE;
  v_streak      INT;
  v_longest     INT;
  v_new_streak  INT;
  v_today       DATE := CURRENT_DATE;
BEGIN
  SELECT last_active_date, streak, longest_streak
    INTO v_last, v_streak, v_longest
  FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_last IS NULL THEN
    v_new_streak := 1;
  ELSIF v_last = v_today THEN
    v_new_streak := COALESCE(v_streak, 1);
  ELSIF v_last = v_today - INTERVAL '1 day' THEN
    v_new_streak := COALESCE(v_streak, 0) + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  UPDATE profiles
  SET streak           = v_new_streak,
      longest_streak   = GREATEST(COALESCE(v_longest, 0), v_new_streak),
      last_active_date = v_today
  WHERE id = p_user_id;

  -- Auto-award streak badges (best-effort; idempotent)
  IF v_new_streak >= 7  THEN PERFORM award_badge_if_missing(p_user_id, 'Racha de 7 Días',  NULL); END IF;
  IF v_new_streak >= 30 THEN PERFORM award_badge_if_missing(p_user_id, 'Racha de 30 Días', NULL); END IF;

  RETURN v_new_streak;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 7 – increment_quest_progress(user, code)
-- Bumps the daily counter; when target reached, awards XP + marks complete.
-- Idempotent — further calls after completion are no-ops.
-- Returns JSON { completed, xp_awarded, current, target }.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_quest_progress(p_user_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_template    quest_templates%ROWTYPE;
  v_progress    user_daily_progress%ROWTYPE;
  v_completed   BOOLEAN := FALSE;
  v_today       DATE    := CURRENT_DATE;
BEGIN
  SELECT * INTO v_template FROM quest_templates WHERE code = p_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'quest_not_found');
  END IF;

  -- Upsert progress row
  INSERT INTO user_daily_progress (user_id, template_code, quest_date, current_count)
  VALUES (p_user_id, p_code, v_today, 1)
  ON CONFLICT (user_id, template_code, quest_date) DO UPDATE
    SET current_count = user_daily_progress.current_count +
        CASE WHEN user_daily_progress.completed_at IS NULL THEN 1 ELSE 0 END
  RETURNING * INTO v_progress;

  -- Mark complete + award XP if threshold crossed for the first time
  IF v_progress.completed_at IS NULL AND v_progress.current_count >= v_template.target_count THEN
    UPDATE user_daily_progress
      SET completed_at = NOW()
      WHERE id = v_progress.id;

    INSERT INTO xp_events (user_id, xp_amount, type, metadata)
    VALUES (p_user_id, v_template.xp_reward, 'daily_quest',
            jsonb_build_object('quest_code', p_code, 'quest_date', v_today));

    v_completed := TRUE;
  END IF;

  RETURN jsonb_build_object(
    'completed',   v_completed,
    'already_done', v_progress.completed_at IS NOT NULL,
    'current',     v_progress.current_count,
    'target',      v_template.target_count,
    'xp_reward',   v_template.xp_reward
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 8 – Reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
