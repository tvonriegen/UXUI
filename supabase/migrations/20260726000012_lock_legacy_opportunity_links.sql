-- Make the intentional deny-by-default behavior explicit for advisors and
-- future maintainers. Service-role migrations can still read this mapping.
DROP POLICY IF EXISTS opportunity_legacy_links_deny_client ON opportunity_legacy_links;
CREATE POLICY opportunity_legacy_links_deny_client ON opportunity_legacy_links
FOR ALL TO anon, authenticated
USING (FALSE)
WITH CHECK (FALSE);
