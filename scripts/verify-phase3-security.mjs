import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260726000003_phase3_security_alignment.sql"),
  "utf8",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const requiredFragments = [
  "SET search_path = public",
  "only authenticated schools may import students",
  "REVOKE ALL ON FUNCTION bulk_upsert_student_profiles(JSONB) FROM PUBLIC",
  "GRANT EXECUTE ON FUNCTION bulk_upsert_student_profiles(JSONB) TO authenticated",
  "FOR INSERT TO authenticated",
  "AND can_converse(company_id, student_id)",
  "status = 'proposed'",
  "DROP POLICY IF EXISTS \"avatars_public_select\" ON storage.objects",
  "DROP POLICY IF EXISTS \"post_media_public_select\" ON storage.objects",
];

for (const fragment of requiredFragments) {
  assert(migration.includes(fragment), `phase 3 security invariant missing: ${fragment}`);
}

assert(!migration.includes("GRANT EXECUTE ON FUNCTION bulk_upsert_student_profiles(JSONB) TO anon"), "bulk importer must not be executable by anon");
console.log(`verify:phase3-security passed: ${requiredFragments.length} security invariants.`);
