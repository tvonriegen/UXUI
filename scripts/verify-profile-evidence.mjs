import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("../apps/web/node_modules/typescript");
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadTsModule(filePath) {
  const source = readFileSync(filePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function (exports, require, module) { ${output}\n})`, { console })(module.exports, require, module);
  return module.exports;
}

const { computeProfileCompleteness } = loadTsModule(
  resolve(rootDir, "apps/web/src/lib/utils/profile-completeness.ts"),
);
const migration = readFileSync(
  resolve(rootDir, "supabase/migrations/20260726000004_verified_profile_evidence.sql"),
  "utf8",
);
const profileHotfix = readFileSync(
  resolve(rootDir, "supabase/migrations/20260810000001_harden_authenticated_profiles.sql"),
  "utf8",
);
const baseline = readFileSync(
  resolve(rootDir, "supabase/staging/profile-runtime-baseline.sql"),
  "utf8",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const complete = computeProfileCompleteness({
  bio: "Técnico en automatización",
  location: "Santiago",
  specialty: "Informática",
  availability: "Disponible",
  gpa: 6.2,
  skillsCount: 3,
  softSkillsCount: 2,
  evidence: [{ status: "verified" }],
  portfolioCount: 2,
  schoolReportPresent: true,
});
assert(complete.percentage === 100, `complete profile should reach 100, got ${complete.percentage}`);
assert(complete.verifiedEvidenceCount === 1, "verified evidence count mismatch");

const pending = computeProfileCompleteness({
  bio: "Perfil",
  location: null,
  specialty: "Informática",
  availability: null,
  gpa: null,
  skillsCount: 1,
  softSkillsCount: 0,
  evidence: [{ status: "pending" }],
  portfolioCount: 0,
  schoolReportPresent: false,
});
assert(pending.pendingEvidenceCount === 1, "pending evidence count mismatch");
assert(pending.verifiedEvidenceCount === 0, "pending evidence must not count as verified");
assert(pending.items.find((item) => item.id === "evidence")?.guidance.includes("pendiente"), "pending guidance missing");

const rejected = computeProfileCompleteness({
  bio: null,
  location: null,
  specialty: null,
  availability: null,
  gpa: null,
  skillsCount: 0,
  softSkillsCount: 0,
  evidence: [{ status: "rejected" }],
  portfolioCount: 0,
  schoolReportPresent: false,
});
assert(rejected.items.some((item) => !item.done && item.id === "evidence"), "rejected evidence should need a new verified item");

for (const fragment of [
  "CREATE TABLE IF NOT EXISTS profile_evidence",
  "CREATE TABLE IF NOT EXISTS profile_evidence_events",
  "profile_evidence_school_reviewer",
  "profile_evidence_update_owner",
  "profile_evidence_review_school",
  "trg_profile_evidence_audit_upd",
  "REVOKE ALL ON TABLE profile_evidence, profile_evidence_events FROM anon",
]) {
  assert(migration.includes(fragment), `migration invariant missing: ${fragment}`);
}

for (const fragment of [
  "CREATE OR REPLACE FUNCTION private.profile_evidence_school_reviewer",
  "private.profile_evidence_school_reviewer(owner_id, (select auth.uid()))",
  'DROP POLICY IF EXISTS "profile_evidence_select"',
  'DROP POLICY IF EXISTS "profile_evidence_review_school"',
  'DROP POLICY IF EXISTS "profile_evidence_events_select"',
  "CREATE OR REPLACE FUNCTION public.trg_fn_profile_evidence_guard()",
  "DROP TRIGGER IF EXISTS trg_profile_evidence_guard",
  "DROP FUNCTION IF EXISTS public.profile_evidence_school_reviewer(UUID, UUID)",
  "OLD.status = 'rejected' AND NEW.status = 'pending'",
  "rejected evidence resubmission must clear review metadata",
]) {
  assert(profileHotfix.includes(fragment), `profile hotfix invariant missing: ${fragment}`);
}

assert(!/GRANT\s+SELECT\s*\([^)]*validation_note[^)]*\)\s+ON\s+public\.profile_evidence\s+TO\s+authenticated/i.test(`${baseline}\n${profileHotfix}`), "validation_note must not be selectable by authenticated");
assert(/NEW\.reviewed_by IS NOT NULL OR NEW\.reviewed_at IS NOT NULL/i.test(profileHotfix), "rejected resubmit must clear reviewer identity and timestamp");
assert(!/GRANT\s+(?:SELECT|ALL)\s+ON\s+public\.profile_evidence_events\s+TO\s+authenticated/i.test(`${baseline}\n${profileHotfix}`), "evidence events must not be exposed to authenticated");
assert(!/GRANT\s+(?:SELECT|ALL)\s+ON\s+public\.profile_evidence\s+TO\s+authenticated/i.test(`${baseline}\n${profileHotfix}`), "profile_evidence must not receive a table-wide authenticated grant");
assert(/REVOKE SELECT\s*\(school_id\)\s+ON\s+public\.student_profiles\s+FROM\s+authenticated/i.test(profileHotfix), "student_profiles.school_id authenticated grant must be revoked");
assert(!/GRANT\s+SELECT\s*\([^)]*school_id[^)]*\)\s+ON\s+public\.student_profiles\s+TO\s+authenticated/i.test(`${baseline}\n${profileHotfix}`), "student_profiles.school_id must not be granted to authenticated");
for (const relation of ["user_skills", "skill_validations"]) {
  assert(!new RegExp(`GRANT\\s+(?:SELECT|ALL)[^;]*ON\\s+public\\.${relation}\\s+TO\\s+(?:anon|authenticated)`, "i").test(`${baseline}\n${profileHotfix}`), `${relation} base rows must not be granted to API roles`);
}
assert(/private\.public_validated_skills\(sp\.profile_id\)/i.test(`${baseline}\n${profileHotfix}`), "validated skills projection must use private aggregate");
assert(/private\.public_has_verified_evidence\(sp\.profile_id\)/i.test(`${baseline}\n${profileHotfix}`), "evidence projection must use private aggregate");

const dropReviewer = profileHotfix.indexOf(
  "DROP FUNCTION IF EXISTS public.profile_evidence_school_reviewer(UUID, UUID)",
);
const rewriteEventsPolicy = profileHotfix.indexOf(
  'DROP POLICY IF EXISTS "profile_evidence_events_select"',
);
assert(
  dropReviewer > rewriteEventsPolicy,
  "public reviewer must be dropped after all evidence policy dependencies are rewritten",
);

console.log("verify:profile-evidence passed: 3 completeness cases and evidence dependency invariants.");
