-- =====================================================================
-- Migration: Freelance proposals with student and external boundaries
-- Date: 2026-07-27
-- =====================================================================

CREATE TABLE IF NOT EXISTS opportunity_proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  applicant_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cover_letter    TEXT NOT NULL DEFAULT '',
  proposed_amount INTEGER,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_proposals_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  CONSTRAINT opportunity_proposals_amount_check
    CHECK (proposed_amount IS NULL OR proposed_amount >= 0),
  UNIQUE (opportunity_id, applicant_id)
);

ALTER TABLE opportunity_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proposals_select_scope ON opportunity_proposals;
CREATE POLICY proposals_select_scope ON opportunity_proposals
FOR SELECT TO authenticated
USING (
  applicant_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_proposals.opportunity_id
      AND o.publisher_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS proposals_insert_student ON opportunity_proposals;
CREATE POLICY proposals_insert_student ON opportunity_proposals
FOR INSERT TO authenticated
WITH CHECK (
  applicant_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = (select auth.uid())
      AND p.account_type = 'student'
      AND p.account_status = 'active'
  )
  AND EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_proposals.opportunity_id
      AND o.opportunity_type = 'freelance'
      AND o.status = 'open'
      AND (o.closes_at IS NULL OR o.closes_at > now())
  )
  AND status = 'pending'
);

DROP POLICY IF EXISTS proposals_update_applicant ON opportunity_proposals;
CREATE POLICY proposals_update_applicant ON opportunity_proposals
FOR UPDATE TO authenticated
USING (applicant_id = (select auth.uid()) AND status = 'pending')
WITH CHECK (applicant_id = (select auth.uid()) AND status = 'withdrawn');

DROP POLICY IF EXISTS proposals_update_publisher ON opportunity_proposals;
CREATE POLICY proposals_update_publisher ON opportunity_proposals
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_proposals.opportunity_id
      AND o.publisher_id = (select auth.uid())
  )
)
WITH CHECK (
  status IN ('accepted', 'rejected')
  AND EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_proposals.opportunity_id
      AND o.publisher_id = (select auth.uid())
  )
);

REVOKE ALL ON opportunity_proposals FROM anon;
GRANT SELECT, INSERT, UPDATE ON opportunity_proposals TO authenticated;

CREATE INDEX IF NOT EXISTS idx_opportunity_proposals_applicant
  ON opportunity_proposals (applicant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunity_proposals_opportunity
  ON opportunity_proposals (opportunity_id, status, created_at DESC);

NOTIFY pgrst, 'reload schema';
