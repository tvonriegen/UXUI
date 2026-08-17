import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260726000005_function_grants_and_search_paths.sql"),
  "utf8",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const fragment of [
  "REVOKE EXECUTE ON FUNCTION public.bulk_upsert_student_profiles(JSONB) FROM anon",
  "REVOKE EXECUTE ON FUNCTION public.can_converse(UUID, UUID) FROM anon",
  "REVOKE EXECUTE ON FUNCTION public.profile_evidence_school_reviewer(UUID, UUID) FROM anon",
  "REVOKE EXECUTE ON FUNCTION public.trg_fn_profile_evidence_guard() FROM anon, authenticated",
  "ALTER FUNCTION public.compute_xp_tier(INTEGER) SET search_path = public",
  "GRANT EXECUTE ON FUNCTION public.bulk_upsert_student_profiles(JSONB) TO authenticated",
]) {
  assert(migration.includes(fragment), `function grant invariant missing: ${fragment}`);
}

console.log("verify:function-grants passed: 6 privilege and search_path invariants.");
