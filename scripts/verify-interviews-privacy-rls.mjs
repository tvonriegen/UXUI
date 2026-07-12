import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationPath = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260705000002_interviews_privacy_rls.sql"
);

const migration = await readFile(migrationPath, "utf-8");

const required = [
  { pattern: /DROP\s+POLICY\s+IF\s+EXISTS\s+"interviews_insert_company"\s+ON\s+interviews/i, label: "DROP POLICY interviews_insert_company" },
  { pattern: /CREATE\s+POLICY\s+"interviews_insert_company"\s+ON\s+interviews\s+FOR\s+INSERT\s+WITH\s+CHECK\s*\(/i, label: "CREATE POLICY interviews_insert_company FOR INSERT WITH CHECK" },
  { pattern: /auth\.uid\(\)\s*=\s*company_id/, label: "auth.uid() = company_id" },
  { pattern: /status\s*=\s*'proposed'/, label: "status = 'proposed'" },
  { pattern: /FROM\s+job_applications\s+ja/i, label: "job_applications alias ja" },
  { pattern: /JOIN\s+job_postings\s+jp\s+ON\s+jp\.id\s*=\s+ja\.job_id/i, label: "JOIN job_postings jp" },
  { pattern: /ja\.applicant_id\s*=\s*student_id/, label: "ja.applicant_id = student_id" },
  { pattern: /jp\.company_id\s*=\s*auth\.uid\(\)/, label: "jp.company_id = auth.uid()" },
  { pattern: /jp\.company_id\s*=\s*company_id/, label: "jp.company_id = company_id" },
  { pattern: /can_converse\s*\(\s*company_id\s*,\s*student_id\s*\)/, label: "can_converse(company_id, student_id)" },
  { pattern: /NOTIFY\s+pgrst\s*,\s*'reload schema'/i, label: "NOTIFY pgrst reload schema" },
  { pattern: /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+trg_fn_interviews_guard_immutable\s*\(\)/i, label: "immutable trigger function" },
  { pattern: /DROP\s+TRIGGER\s+IF\s+EXISTS\s+trg_interviews_guard_immutable\s+ON\s+interviews/i, label: "DROP TRIGGER trg_interviews_guard_immutable" },
  { pattern: /CREATE\s+TRIGGER\s+trg_interviews_guard_immutable\s+BEFORE\s+UPDATE\s+ON\s+interviews/i, label: "CREATE TRIGGER trg_interviews_guard_immutable" },
  { pattern: /application_id\s+IS\s+DISTINCT\s+FROM\s+OLD\.application_id/, label: "immutable application_id check" },
  { pattern: /company_id\s+IS\s+DISTINCT\s+FROM\s+OLD\.company_id/, label: "immutable company_id check" },
  { pattern: /student_id\s+IS\s+DISTINCT\s+FROM\s+OLD\.student_id/, label: "immutable student_id check" },
  { pattern: /created_at\s+IS\s+DISTINCT\s+FROM\s+OLD\.created_at/, label: "immutable created_at check" },
];

const missing = [];
for (const { pattern, label } of required) {
  if (!pattern.test(migration)) {
    missing.push(label);
  }
}

if (missing.length > 0) {
  throw new Error(
    `verify:interviews-privacy-rls failed: missing ${missing.length} invariant(s):\n  - ${missing.join("\n  - ")}`
  );
}

console.log(
  `verify:interviews-privacy-rls passed: all ${required.length} invariants found in migration.`
);
