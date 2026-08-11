import crypto from "node:crypto";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { createClient } = require(resolve(rootDir, "apps/web/node_modules/@supabase/supabase-js"));

const url = process.env.RUNTIME_SUPABASE_URL;
const serviceRoleKey = process.env.RUNTIME_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("Provisioning requires RUNTIME_SUPABASE_URL and RUNTIME_SUPABASE_SERVICE_ROLE_KEY");
}
if (process.env.GITHUB_ACTIONS === "true") {
  throw new Error("Fixture provisioning is operator-only and cannot run in GitHub Actions");
}
if (process.env.RUNTIME_SUPABASE_STAGING_CONFIRMATION !== "staging-only") {
  throw new Error("Set RUNTIME_SUPABASE_STAGING_CONFIRMATION=staging-only after confirming the disposable staging project");
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const marker = "talenthub-s1-profile-boundary";
const password = () => `S1-${crypto.randomBytes(24).toString("base64url")}`;

const fixtures = [
  { key: "STUDENT_MINOR_A", label: "StudentMinorA", type: "student", role: "Estudiante", name: "S1 Student Minor A", age: 16, school: "SCHOOL_A", stage: "enrolled" },
  { key: "STUDENT_ADULT_A", label: "StudentAdultA", type: "student", role: "Egresado", name: "S1 Student Adult A", age: 24, school: "SCHOOL_A", stage: "internship" },
  { key: "STUDENT_SCHOOL_B", label: "StudentSchoolB", type: "student", role: "Estudiante", name: "S1 Student School B", age: 17, school: "SCHOOL_B", stage: "enrolled" },
  { key: "SCHOOL_A", label: "SchoolA", type: "school", role: "Colegio", name: "S1 School A" },
  { key: "SCHOOL_B", label: "SchoolB", type: "school", role: "Colegio", name: "S1 School B" },
  { key: "COMPANY_A", label: "CompanyA", type: "company", role: "Empresa", name: "S1 Company A" },
  { key: "COMPANY_B", label: "CompanyB", type: "company", role: "Empresa", name: "S1 Company B" },
  { key: "EXTERNAL_A", label: "ExternalA", type: "external", role: "Externo", name: "S1 External A" },
  { key: "SUSPENDED", label: "Suspended", type: "student", role: "Estudiante", name: "S1 Suspended", age: 17, school: "SCHOOL_B", stage: "enrolled", status: "suspended" },
];

async function assertOk(result, operation) {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
  return result.data;
}

async function findMarkedUser(email) {
  for (let page = 1; page <= 20; page += 1) {
    const data = await assertOk(await admin.auth.admin.listUsers({ page, perPage: 1000 }), "list Auth users");
    const user = data.users.find((candidate) => candidate.email === email);
    if (user) return user;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function ensureAuth(fixture) {
  const email = `${fixture.key.toLowerCase()}+${marker}@staging.invalid`;
  const generatedPassword = password();
  const existing = await findMarkedUser(email);
  const authData = existing
    ? await assertOk(await admin.auth.admin.updateUserById(existing.id, {
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { ...existing.user_metadata, runtime_marker: marker, fixture: fixture.label },
    }), `refresh Auth user ${fixture.label}`)
    : await assertOk(await admin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { runtime_marker: marker, fixture: fixture.label },
    }), `create Auth user ${fixture.label}`);
  return { ...fixture, email, password: generatedPassword, userId: authData.user.id };
}

async function upsert(table, row, onConflict, operation) {
  return assertOk(await admin.from(table).upsert(row, { onConflict }).select().single(), operation);
}

async function ensureEvidence(ownerId, status, title) {
  const existing = await assertOk(await admin.from("profile_evidence").select("id").eq("owner_id", ownerId).eq("title", title).maybeSingle(), `find evidence ${title}`);
  if (existing) return existing.id;
  const row = await assertOk(await admin.from("profile_evidence").insert({
    owner_id: ownerId, evidence_type: "certificate", title, description: "Synthetic S1 fixture evidence", issuer: "TalentHub staging", status,
    validation_note: status === "rejected" ? "Synthetic rejection for resubmission check" : "",
  }).select("id").single(), `create evidence ${title}`);
  return row.id;
}

async function main() {
  const users = {};
  for (const fixture of fixtures) users[fixture.key] = await ensureAuth(fixture);

  const schools = {};
  for (const key of ["SCHOOL_A", "SCHOOL_B"]) {
    const fixture = users[key];
    await upsert("profiles", { id: fixture.userId, email: fixture.email, name: fixture.name, role: fixture.role, account_type: fixture.type, account_status: fixture.status ?? "active", location: "Staging" }, "id", `upsert profile ${fixture.label}`);
    schools[key] = await upsert("schools", { profile_id: fixture.userId, name: fixture.label, status: "active" }, "profile_id", `upsert school ${fixture.label}`);
  }

  for (const fixture of Object.values(users)) {
    await upsert("profiles", { id: fixture.userId, email: fixture.email, name: fixture.name, role: fixture.role, account_type: fixture.type, account_status: fixture.status ?? "active", age: fixture.age ?? null, location: "Staging" }, "id", `upsert profile ${fixture.label}`);
    if (fixture.type === "student") {
      const schoolId = schools[fixture.school].id;
      await upsert("student_profiles", { profile_id: fixture.userId, school_id: schoolId, student_stage: fixture.stage, specialty: "Informática", bio: `Synthetic ${fixture.label}`, public_visibility: fixture.status !== "suspended" }, "profile_id", `upsert student profile ${fixture.label}`);
    } else if (fixture.type === "company") {
      await upsert("company_profiles", { profile_id: fixture.userId, company_name: fixture.label, industry: "Tecnología", verification_status: "verified" }, "profile_id", `upsert company profile ${fixture.label}`);
    } else if (fixture.type === "external") {
      await upsert("external_profiles", { profile_id: fixture.userId, public_name: fixture.label, verification_status: "verified" }, "profile_id", `upsert external profile ${fixture.label}`);
    }
  }

  // SchoolB deliberately exercises the legacy owner relation without a
  // school_members row. SchoolA retains the membership path.
  for (const key of ["SCHOOL_A"]) {
    await upsert("school_members", { school_id: schools[key].id, profile_id: users[key].userId, member_role: "owner", status: "active" }, "school_id,profile_id", `upsert membership ${users[key].label}`);
  }
  await assertOk(await admin.from("school_members").delete().eq("school_id", schools.SCHOOL_B.id), "remove SchoolB membership fixture");
  const skill = await upsert("skills", { name: `${marker}-sql`, category: "S1" }, "name", "upsert synthetic skill");
  for (const key of ["STUDENT_MINOR_A", "STUDENT_ADULT_A", "STUDENT_SCHOOL_B"]) {
    await upsert("user_skills", { user_id: users[key].userId, skill_id: skill.id }, "user_id,skill_id", `upsert skill ${users[key].label}`);
    await upsert("skill_validations", { student_id: users[key].userId, skill_id: skill.id, validator_id: users[key].userId, status: "validated" }, "student_id,skill_id,validator_id", `upsert validation ${users[key].label}`);
  }
  await ensureEvidence(users.STUDENT_MINOR_A.userId, "verified", `${marker} minor verified`);
  await ensureEvidence(users.STUDENT_ADULT_A.userId, "pending", `${marker} adult pending`);
  await ensureEvidence(users.STUDENT_SCHOOL_B.userId, "rejected", `${marker} school B rejected`);

  process.stdout.write(`${JSON.stringify({ stagingUrl: url, marker, fixtures: Object.fromEntries(Object.values(users).map((fixture) => [fixture.label, { id: fixture.userId, email: fixture.email, password: fixture.password }])), schools: Object.fromEntries(Object.entries(schools).map(([key, school]) => [key, { id: school.id }])) }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`provision-runtime-profile-fixtures failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
