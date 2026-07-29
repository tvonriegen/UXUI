import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const migration = readFileSync(
  resolve(rootDir, "supabase/migrations/20260726000002_application_readiness_timeline.sql"),
  "utf8",
);
const jobsPage = readFileSync(
  resolve(rootDir, "apps/web/src/components/opportunities/OpportunitiesPage.tsx"),
  "utf8",
);
const timeline = readFileSync(
  resolve(rootDir, "apps/web/src/components/ats/ApplicationTimeline.tsx"),
  "utf8",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const checks = [
  [migration, "readiness_snapshot", "migration must persist the readiness snapshot"],
  [migration, "readiness_model_version", "migration must persist the readiness model version"],
  [migration, "readiness_checked_at", "migration must persist the readiness check timestamp"],
  [migration, "'readiness_checked'", "migration must define the readiness timeline event"],
  [migration, "NEW.readiness_snapshot ->> 'summary'", "trigger must copy the readiness summary"],
  [jobsPage, "readiness_snapshot: readinessSnapshot", "application insert must include the readiness snapshot"],
  [jobsPage, "readiness_checked_at: readinessCheckedAt", "application insert must include the check timestamp"],
  [timeline, '"readiness_checked"', "timeline must render the readiness event"],
  [timeline, "Perfil revisado", "timeline must explain the readiness step"],
];

for (const [source, needle, message] of checks) {
  assert(source.includes(needle), `${message}: missing ${needle}`);
}

console.log(`verify:readiness-timeline passed ${checks.length} invariants.`);
