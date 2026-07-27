import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260726000007_canonical_identity_access.sql"),
  "utf8",
);

const required = [
  "account_type",
  "account_status",
  "student_stage",
  "CREATE TABLE IF NOT EXISTS schools",
  "CREATE TABLE IF NOT EXISTS school_members",
  "CREATE TABLE IF NOT EXISTS student_profiles",
  "CREATE TABLE IF NOT EXISTS company_profiles",
  "CREATE TABLE IF NOT EXISTS external_profiles",
  "is_active_school_member",
  "is_school_admin",
  "public_student_profiles",
  "profiles_select_authenticated_compat",
  "REVOKE ALL ON profiles FROM anon",
  "trg_profiles_guard_identity",
  "trg_student_profiles_guard_identity",
  "raw_app_meta_data",
];

const missing = required.filter((fragment) => !migration.includes(fragment));
if (missing.length > 0) {
  console.error("verify:identity-access failed. Missing invariants:");
  for (const fragment of missing) console.error(`- ${fragment}`);
  process.exit(1);
}

const forbidden = [
  "CREATE POLICY profiles_select_all",
  "CREATE POLICY profiles_public_select",
];
const stale = forbidden.filter((fragment) => migration.includes(fragment));
if (stale.length > 0) {
  console.error("verify:identity-access failed. Found stale public profile policy:");
  for (const fragment of stale) console.error(`- ${fragment}`);
  process.exit(1);
}

console.log("verify:identity-access passed: canonical identity and initial access invariants found.");
