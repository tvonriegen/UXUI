import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260726000011_common_opportunities.sql"),
  "utf8",
);
const action = fs.readFileSync(
  path.join(root, "apps/web/src/app/actions/opportunities.ts"),
  "utf8",
);

const requiredMigration = [
  "CREATE TABLE IF NOT EXISTS opportunities",
  "CREATE TABLE IF NOT EXISTS opportunity_legacy_links",
  "publisher_type",
  "opportunity_type",
  "job_applications_opportunity_applicant_key",
  "opportunities_insert_publisher",
  "opportunities_select_public",
  "applications_insert_opportunity",
  "ALTER COLUMN job_id DROP NOT NULL",
];
const requiredAction = [
  "createOpportunity",
  "createOpportunityFromForm",
  "closeOpportunity",
  "applyToOpportunity",
  "opportunityTypeAllowed",
];

const missingMigration = requiredMigration.filter((fragment) => !migration.includes(fragment));
const missingAction = requiredAction.filter((fragment) => !action.includes(fragment));

if (missingMigration.length || missingAction.length) {
  console.error("verify:opportunities failed.");
  for (const fragment of missingMigration) console.error(`- migration: ${fragment}`);
  for (const fragment of missingAction) console.error(`- action: ${fragment}`);
  process.exit(1);
}

console.log("verify:opportunities passed: common opportunity model and server actions found.");
