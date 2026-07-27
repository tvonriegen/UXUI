import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260726000011_common_opportunities.sql"),
  "utf8",
);
const proposalMigration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260726000013_freelance_proposals.sql"),
  "utf8",
);
const internshipMigration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260726000014_map_internship_requests.sql"),
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
const requiredProposalMigration = [
  "CREATE TABLE IF NOT EXISTS opportunity_proposals",
  "proposals_insert_student",
  "proposals_update_publisher",
  "UNIQUE (opportunity_id, applicant_id)",
];
const requiredInternshipMigration = [
  "internship_requests",
  "legacy_source",
  "CASE ir.status WHEN 'aprobado' THEN 'open'",
];
const requiredAction = [
  "createOpportunity",
  "createOpportunityFromForm",
  "closeOpportunity",
  "applyToOpportunity",
  "opportunityTypeAllowed",
  "submitProposal",
  "updateProposalStatus",
];

const missingMigration = requiredMigration.filter((fragment) => !migration.includes(fragment));
const missingProposalMigration = requiredProposalMigration.filter((fragment) => !proposalMigration.includes(fragment));
const missingInternshipMigration = requiredInternshipMigration.filter((fragment) => !internshipMigration.includes(fragment));
const missingAction = requiredAction.filter((fragment) => !action.includes(fragment));

if (missingMigration.length || missingProposalMigration.length || missingInternshipMigration.length || missingAction.length) {
  console.error("verify:opportunities failed.");
  for (const fragment of missingMigration) console.error(`- migration: ${fragment}`);
  for (const fragment of missingProposalMigration) console.error(`- proposals: ${fragment}`);
  for (const fragment of missingInternshipMigration) console.error(`- internships: ${fragment}`);
  for (const fragment of missingAction) console.error(`- action: ${fragment}`);
  process.exit(1);
}

console.log("verify:opportunities passed: common opportunity model and server actions found.");
