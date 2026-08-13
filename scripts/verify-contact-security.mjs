import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260811000002_contact_security_gate.sql"), "utf8");
const actions = readFileSync(resolve(root, "apps/web/src/app/actions/contact-requests.ts"), "utf8");
const helper = migration.match(/CREATE OR REPLACE FUNCTION private\.can_review_contact_request\([\s\S]*?\$\$;/i)?.[0] || "";
if (!/LANGUAGE\s+sql\s+STABLE\s+SECURITY\s+DEFINER/i.test(helper)
  || !/SET\s+search_path\s*=\s*public\s*,\s*pg_catalog/i.test(helper)
  || !/RETURNS\s+boolean/i.test(helper)) throw new Error("contact reviewer helper must be private, SQL, boolean, stable, and fixed SECURITY DEFINER");
if (!/REVOKE EXECUTE ON FUNCTION private\.can_review_contact_request\(UUID\) FROM PUBLIC, anon, authenticated/i.test(migration)
  || !/GRANT EXECUTE ON FUNCTION private\.can_review_contact_request\(UUID\) TO authenticated/i.test(migration)) throw new Error("contact reviewer helper grants are not fail-closed");
for (const policy of migration.match(/CREATE POLICY [\s\S]*?;/gi) || []) {
  if (/contact_requests/i.test(policy) && /FOR\s+(?:SELECT|UPDATE)/i.test(policy) && /\bschools\b/i.test(policy)) throw new Error("contact policy directly references schools");
}
if (/GRANT\s+SELECT(?:\s*\([^)]*\))?\s+ON\s+public\.schools\s+TO\s+authenticated/i.test(migration)) throw new Error("authenticated must not receive SELECT on schools");
const checks = [
  [/REVOKE INSERT ON public\.contact_requests FROM PUBLIC, authenticated, anon/, "direct contact insert is revoked for every role"],
  [/DROP POLICY IF EXISTS "contact_requests_insert_company"/, "direct insert policy is removed"],
  [/s\.status = 'active'/, "school status is checked"],
  [/sm\.status = 'active'/, "member status is checked"],
  [/sm\.member_role IN \('owner', 'admin', 'teacher', 'reviewer'\)/, "reviewer roles are constrained"],
  [/school_profile\.account_type = 'school'/, "school account type is checked"],
  [/school_profile\.account_status = 'active'/, "account status is checked"],
  [/WITH CHECK \(\s*status IN \('approved', 'rejected'\)[\s\S]*?private\.can_review_contact_request/, "review writes require the same authorized school member"],
  [/\.select\("id"\)/g, "actions inspect affected rows"],
];
for (const [pattern, label] of checks) {
  const source = pattern.source.includes("select") ? actions : migration;
  if (!pattern.test(source)) throw new Error(`contact security structural check failed: ${label}`);
}
console.log("verify:contact-security passed structural gate checks.");
