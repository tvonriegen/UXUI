-- =====================================================================
-- Migration: Common opportunities with staged legacy compatibility
-- Date: 2026-07-26
-- =====================================================================

CREATE TABLE IF NOT EXISTS opportunities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  publisher_type  TEXT NOT NULL,
  opportunity_type TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  specialty       TEXT NOT NULL DEFAULT '',
  location        TEXT NOT NULL DEFAULT '',
  compensation_min INTEGER,
  compensation_max INTEGER,
  max_candidates  INTEGER,
  views_count     INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'open',
  closes_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT opportunities_publisher_type_check
    CHECK (publisher_type IN ('company', 'external')),
  CONSTRAINT opportunities_type_check
    CHECK (opportunity_type IN ('internship', 'job', 'company_project', 'freelance')),
  CONSTRAINT opportunities_status_check
    CHECK (status IN ('draft', 'open', 'closed', 'expired')),
  CONSTRAINT opportunities_compensation_check
    CHECK (compensation_min IS NULL OR compensation_max IS NULL OR compensation_min <= compensation_max),
  CONSTRAINT opportunities_candidates_check
    CHECK (max_candidates IS NULL OR max_candidates > 0)
);

CREATE TABLE IF NOT EXISTS opportunity_legacy_links (
  opportunity_id UUID PRIMARY KEY REFERENCES opportunities(id) ON DELETE CASCADE,
  legacy_source  TEXT NOT NULL,
  legacy_id      UUID NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_legacy_source_check
    CHECK (legacy_source IN ('job_postings', 'internship_requests')),
  UNIQUE (legacy_source, legacy_id)
);

-- Preserve the existing job posting IDs as canonical opportunity IDs so the
-- application and timeline history remain reversible during dual reads.
INSERT INTO opportunities (
  id, publisher_id, publisher_type, opportunity_type, title, description,
  specialty, location, compensation_min, compensation_max, max_candidates,
  views_count, status, created_at, updated_at
)
SELECT
  jp.id,
  jp.company_id,
  'company',
  CASE WHEN jp.type = 'pasantia' THEN 'internship' ELSE 'job' END,
  jp.title,
  jp.description,
  jp.specialty,
  jp.location,
  jp.salary_min,
  jp.salary_max,
  jp.max_candidates,
  COALESCE(jp.views_count, 0),
  CASE WHEN jp.active THEN 'open' ELSE 'closed' END,
  jp.created_at,
  jp.created_at
FROM job_postings jp
ON CONFLICT (id) DO NOTHING;

INSERT INTO opportunity_legacy_links (opportunity_id, legacy_source, legacy_id)
SELECT jp.id, 'job_postings', jp.id
FROM job_postings jp
ON CONFLICT (legacy_source, legacy_id) DO NOTHING;

ALTER TABLE job_applications
  ALTER COLUMN job_id DROP NOT NULL;

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE;

UPDATE job_applications ja
SET opportunity_id = oll.opportunity_id
FROM opportunity_legacy_links oll
WHERE oll.legacy_source = 'job_postings'
  AND oll.legacy_id = ja.job_id
  AND ja.opportunity_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS job_applications_opportunity_applicant_key
  ON job_applications (opportunity_id, applicant_id)
  WHERE opportunity_id IS NOT NULL;

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_legacy_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS opportunities_select_public ON opportunities;
CREATE POLICY opportunities_select_public ON opportunities
FOR SELECT TO anon, authenticated
USING (
  publisher_id = (select auth.uid())
  OR (
    status = 'open'
    AND (closes_at IS NULL OR closes_at > now())
  )
);

DROP POLICY IF EXISTS opportunities_insert_publisher ON opportunities;
CREATE POLICY opportunities_insert_publisher ON opportunities
FOR INSERT TO authenticated
WITH CHECK (
  publisher_id = (select auth.uid())
  AND (
    (
      publisher_type = 'company'
      AND opportunity_type IN ('internship', 'job', 'company_project')
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = (select auth.uid()) AND p.account_type = 'company'
      )
    )
    OR (
      publisher_type = 'external'
      AND opportunity_type = 'freelance'
      AND (auth.jwt() ->> 'email_confirmed_at') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = (select auth.uid()) AND p.account_type = 'external'
      )
    )
  )
);

DROP POLICY IF EXISTS opportunities_update_publisher ON opportunities;
CREATE POLICY opportunities_update_publisher ON opportunities
FOR UPDATE TO authenticated
USING (publisher_id = (select auth.uid()))
WITH CHECK (
  publisher_id = (select auth.uid())
  AND (
    (publisher_type = 'company' AND opportunity_type IN ('internship', 'job', 'company_project'))
    OR (publisher_type = 'external' AND opportunity_type = 'freelance')
  )
);

DROP POLICY IF EXISTS opportunities_delete_publisher ON opportunities;
CREATE POLICY opportunities_delete_publisher ON opportunities
FOR DELETE TO authenticated
USING (publisher_id = (select auth.uid()));

-- Legacy links are an internal migration aid; no client role can read them.
REVOKE ALL ON opportunity_legacy_links FROM anon, authenticated, PUBLIC;

DROP POLICY IF EXISTS applications_insert ON job_applications;
DROP POLICY IF EXISTS applications_select ON job_applications;
DROP POLICY IF EXISTS applications_update ON job_applications;
DROP POLICY IF EXISTS applications_insert_opportunity ON job_applications;
CREATE POLICY applications_insert_opportunity ON job_applications
FOR INSERT TO authenticated
WITH CHECK (
  applicant_id = (select auth.uid())
  AND (
    (
      opportunity_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM opportunities o
        WHERE o.id = job_applications.opportunity_id
          AND o.status = 'open'
          AND (o.closes_at IS NULL OR o.closes_at > now())
      )
    )
    OR (
      opportunity_id IS NULL
      AND job_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM job_postings jp
        WHERE jp.id = job_applications.job_id AND jp.active = TRUE
      )
    )
  )
);

DROP POLICY IF EXISTS applications_select_opportunity ON job_applications;
CREATE POLICY applications_select_opportunity ON job_applications
FOR SELECT TO authenticated
USING (
  applicant_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM job_postings jp
    WHERE jp.id = job_applications.job_id AND jp.company_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = job_applications.opportunity_id AND o.publisher_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS applications_update_opportunity ON job_applications;
CREATE POLICY applications_update_opportunity ON job_applications
FOR UPDATE TO authenticated
USING (
  applicant_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM job_postings jp
    WHERE jp.id = job_applications.job_id AND jp.company_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = job_applications.opportunity_id AND o.publisher_id = (select auth.uid())
  )
)
WITH CHECK (
  applicant_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM job_postings jp
    WHERE jp.id = job_applications.job_id AND jp.company_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = job_applications.opportunity_id AND o.publisher_id = (select auth.uid())
  )
);

GRANT SELECT ON opportunities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON opportunities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON job_applications TO authenticated;

CREATE INDEX IF NOT EXISTS idx_opportunities_public_listing
  ON opportunities (publisher_type, opportunity_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_publisher
  ON opportunities (publisher_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunity_legacy_links_legacy
  ON opportunity_legacy_links (legacy_source, legacy_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_opportunity
  ON job_applications (opportunity_id)
  WHERE opportunity_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
