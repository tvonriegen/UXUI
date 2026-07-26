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

console.log("verify:profile-evidence passed: 3 completeness cases and 7 migration invariants.");
