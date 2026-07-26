-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Tech Radar — personalised weekly skill intelligence
-- Date: 2026-04-24
-- Idempotent: safe to re-run.
--
-- Concept:
--   For each student, surface the top trending skills in their specialty
--   (derived from live job posting requirements + portfolio tags +
--   follows), compute the gap vs their own skill set, and recommend
--   learning quests. Refreshed weekly (or on-demand via RPC).
-- ═══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1 – tech_radar_entries (materialised weekly aggregate)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tech_radar_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start   DATE        NOT NULL,
  specialty    TEXT        NOT NULL DEFAULT '',
  skill        TEXT        NOT NULL,
  heat_score   INT         NOT NULL DEFAULT 0,
  demand_count INT         NOT NULL DEFAULT 0,
  supply_count INT         NOT NULL DEFAULT 0,
  trend        TEXT        NOT NULL DEFAULT 'stable'
                           CHECK (trend IN ('rising','stable','falling','new')),
  source       TEXT        NOT NULL DEFAULT 'jobs',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (week_start, specialty, skill)
);

ALTER TABLE tech_radar_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "radar_select" ON tech_radar_entries;
CREATE POLICY "radar_select" ON tech_radar_entries FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_radar_specialty_week
  ON tech_radar_entries(specialty, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_radar_heat
  ON tech_radar_entries(heat_score DESC);


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2 – user_radar_snapshots (one per student per week)
-- Stores the personalized delta + recommendations.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_radar_snapshots (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start       DATE        NOT NULL,
  specialty        TEXT        NOT NULL DEFAULT '',
  matched_skills   TEXT[]      NOT NULL DEFAULT '{}',
  gap_skills       TEXT[]      NOT NULL DEFAULT '{}',
  emerging_skills  TEXT[]      NOT NULL DEFAULT '{}',
  radar_score      INT         NOT NULL DEFAULT 0,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE user_radar_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "urs_select_own" ON user_radar_snapshots;
CREATE POLICY "urs_select_own" ON user_radar_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_urs_user_week
  ON user_radar_snapshots(user_id, week_start DESC);


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 3 – refresh_tech_radar(week): rebuilds the weekly aggregate
-- Sources:
--   1. Skills mentioned in active job_postings.description/requirements
--      (matched against the skills catalog by case-insensitive substring)
--   2. Trending portfolio_tags (co-occurrence with specialty)
--   3. Explicit user_skills counts (supply side)
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_tech_radar(p_week_start DATE DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_week      DATE := COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::DATE);
  v_prev_week DATE := v_week - INTERVAL '7 days';
BEGIN
  -- Clear this week's entries for a clean rebuild
  DELETE FROM tech_radar_entries WHERE week_start = v_week;

  -- ── DEMAND: count skill mentions across active job postings per specialty ──
  WITH skill_hits AS (
    SELECT
      COALESCE(NULLIF(jp.specialty, ''), 'General') AS specialty,
      s.name                                        AS skill,
      COUNT(*)                                      AS demand
    FROM job_postings jp
    JOIN skills s
      ON LOWER(jp.description || ' ' || COALESCE(jp.requirements, ''))
         ILIKE '%' || LOWER(s.name) || '%'
    WHERE jp.active = TRUE
    GROUP BY 1, 2
  ),
  -- ── SUPPLY: count students who already have each skill ───────────────
  skill_supply AS (
    SELECT
      COALESCE(NULLIF(p.specialty, ''), 'General') AS specialty,
      s.name                                        AS skill,
      COUNT(DISTINCT us.user_id)                    AS supply
    FROM user_skills us
    JOIN profiles p ON p.id = us.user_id
    JOIN skills s   ON s.id = us.skill_id
    WHERE p.role IN ('Estudiante','Egresado')
    GROUP BY 1, 2
  ),
  combined AS (
    SELECT
      COALESCE(d.specialty, s.specialty)               AS specialty,
      COALESCE(d.skill, s.skill)                        AS skill,
      COALESCE(d.demand, 0)                             AS demand,
      COALESCE(s.supply, 0)                             AS supply
    FROM skill_hits d
    FULL OUTER JOIN skill_supply s
      ON d.specialty = s.specialty AND d.skill = s.skill
    WHERE COALESCE(d.demand, 0) > 0
  )
  INSERT INTO tech_radar_entries
    (week_start, specialty, skill, heat_score, demand_count, supply_count, trend, source)
  SELECT
    v_week,
    c.specialty,
    c.skill,
    -- heat = demand weighted heavily, normalised by supply+1 to favour gaps
    GREATEST(0, ROUND((c.demand * 10.0) / (c.supply + 1)))::INT,
    c.demand,
    c.supply,
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM tech_radar_entries prev
        WHERE prev.week_start = v_prev_week
          AND prev.specialty  = c.specialty
          AND prev.skill      = c.skill
      ) THEN 'new'
      WHEN (SELECT heat_score FROM tech_radar_entries prev
            WHERE prev.week_start = v_prev_week AND prev.specialty = c.specialty AND prev.skill = c.skill)
           < GREATEST(0, ROUND((c.demand * 10.0) / (c.supply + 1)))::INT
      THEN 'rising'
      WHEN (SELECT heat_score FROM tech_radar_entries prev
            WHERE prev.week_start = v_prev_week AND prev.specialty = c.specialty AND prev.skill = c.skill)
           > GREATEST(0, ROUND((c.demand * 10.0) / (c.supply + 1)))::INT
      THEN 'falling'
      ELSE 'stable'
    END,
    'jobs'
  FROM combined c
  ON CONFLICT (week_start, specialty, skill) DO UPDATE
    SET heat_score   = EXCLUDED.heat_score,
        demand_count = EXCLUDED.demand_count,
        supply_count = EXCLUDED.supply_count,
        trend        = EXCLUDED.trend;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 4 – compute_user_radar(user, week): personalised snapshot
-- Uses the student's specialty + their user_skills to compute
-- matched / gap / emerging sets and a radar_score 0–100.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_user_radar(p_user_id UUID, p_week_start DATE DEFAULT NULL)
RETURNS user_radar_snapshots
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_week       DATE := COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::DATE);
  v_specialty  TEXT;
  v_my_skills  TEXT[];
  v_matched    TEXT[];
  v_gap        TEXT[];
  v_emerging   TEXT[];
  v_score      INT;
  v_row        user_radar_snapshots;
BEGIN
  SELECT COALESCE(NULLIF(specialty, ''), 'General')
    INTO v_specialty
  FROM profiles WHERE id = p_user_id;

  SELECT COALESCE(ARRAY_AGG(LOWER(s.name)), '{}')
    INTO v_my_skills
  FROM user_skills us
  JOIN skills s ON s.id = us.skill_id
  WHERE us.user_id = p_user_id;

  -- Top-10 demand skills for this specialty this week
  WITH top_demand AS (
    SELECT skill, heat_score, trend
    FROM tech_radar_entries
    WHERE week_start = v_week AND specialty = v_specialty
    ORDER BY heat_score DESC
    LIMIT 10
  )
  SELECT
    COALESCE(ARRAY_AGG(skill) FILTER (WHERE LOWER(skill) = ANY(v_my_skills)),  '{}'),
    COALESCE(ARRAY_AGG(skill) FILTER (WHERE LOWER(skill) <> ALL(v_my_skills)), '{}'),
    COALESCE(ARRAY_AGG(skill) FILTER (WHERE trend IN ('new','rising')),        '{}')
  INTO v_matched, v_gap, v_emerging
  FROM top_demand;

  -- Score: proportion of top-10 skills the user already has
  v_score := CASE
    WHEN COALESCE(array_length(v_matched, 1), 0) + COALESCE(array_length(v_gap, 1), 0) = 0 THEN 0
    ELSE ROUND(
      (COALESCE(array_length(v_matched, 1), 0) * 100.0) /
      (COALESCE(array_length(v_matched, 1), 0) + COALESCE(array_length(v_gap, 1), 0))
    )::INT
  END;

  INSERT INTO user_radar_snapshots
    (user_id, week_start, specialty, matched_skills, gap_skills, emerging_skills, radar_score)
  VALUES
    (p_user_id, v_week, v_specialty, v_matched, v_gap, v_emerging, v_score)
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    specialty       = EXCLUDED.specialty,
    matched_skills  = EXCLUDED.matched_skills,
    gap_skills      = EXCLUDED.gap_skills,
    emerging_skills = EXCLUDED.emerging_skills,
    radar_score     = EXCLUDED.radar_score,
    computed_at     = NOW()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 5 – Reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
