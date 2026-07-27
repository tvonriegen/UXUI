-- Map institutional internship requests without removing school approval.
-- Pending requests remain draft and rejected requests remain closed.

INSERT INTO opportunities (
  id, publisher_id, publisher_type, opportunity_type, title, description,
  specialty, max_candidates, status, created_at, updated_at
)
SELECT
  ir.id,
  ir.company_id,
  'company',
  'internship',
  ir.title,
  ir.description,
  ir.specialty,
  ir.slots,
  CASE ir.status WHEN 'aprobado' THEN 'open' WHEN 'rechazado' THEN 'closed' ELSE 'draft' END,
  ir.created_at,
  ir.updated_at
FROM internship_requests ir
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  specialty = EXCLUDED.specialty,
  max_candidates = EXCLUDED.max_candidates,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

INSERT INTO opportunity_legacy_links (opportunity_id, legacy_source, legacy_id)
SELECT ir.id, 'internship_requests', ir.id
FROM internship_requests ir
ON CONFLICT (legacy_source, legacy_id) DO UPDATE SET opportunity_id = EXCLUDED.opportunity_id;
