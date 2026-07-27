import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { createClient } = require(resolve(rootDir, "apps/web/node_modules/@supabase/supabase-js"));

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing runtime security variable: ${name}`);
  return value;
}

function optional(name) {
  return process.env[name] || null;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const url = required("RUNTIME_SUPABASE_URL");
const anonKey = required("RUNTIME_SUPABASE_ANON_KEY");

function makeClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(key) {
  const client = makeClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: required(`RUNTIME_${key.toUpperCase()}_EMAIL`),
    password: required(`RUNTIME_${key.toUpperCase()}_PASSWORD`),
  });
  if (error || !data.user) throw new Error(`Could not authenticate ${key} fixture`);

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, account_type, account_status, school_id, age")
    .eq("id", data.user.id)
    .single();
  if (profileError || !profile) throw new Error(`Could not load ${key} canonical profile`);
  assert(profile.account_type === key, `${key} fixture has account_type=${profile.account_type}`);
  assert(profile.account_status === "active", `${key} fixture is not active`);
  return { client, user: data.user, profile };
}

async function expectError(promise, message) {
  const { error } = await promise;
  assert(error, message);
}

async function run() {
  const anonymous = makeClient();
  const [student, company, school, external] = await Promise.all([
    signIn("student"),
    signIn("company"),
    signIn("school"),
    signIn("external"),
  ]);

  const { data: publicStudents, error: publicStudentsError } = await anonymous
    .from("public_student_profiles")
    .select("id, name, specialty, bio, availability, school_name, validated_skills, has_verified_evidence")
    .limit(25);
  assert(!publicStudentsError, "anonymous public student projection is unavailable");
  for (const row of publicStudents ?? []) {
    for (const forbidden of ["email", "rut", "cellphone", "age", "gender", "school_id"]) {
      assert(!(forbidden in row), `public projection leaked ${forbidden}`);
    }
  }

  await expectError(
    anonymous.from("profiles").select("email").limit(1),
    "anonymous client can select private profile email",
  );

  await expectError(
    student.client.from("profiles").update({ account_type: "company" }).eq("id", student.user.id),
    "student can mutate canonical account_type",
  );
  await expectError(
    student.client.from("student_profiles").update({ student_stage: "graduated" }).eq("profile_id", student.user.id),
    "student can mutate protected student_stage",
  );

  const { data: publicOpportunities, error: publicOpportunitiesError } = await anonymous
    .from("opportunities")
    .select("id, publisher_type, opportunity_type, status")
    .eq("status", "open");
  assert(!publicOpportunitiesError && (publicOpportunities?.length ?? 0) > 0, "public opportunities are unavailable");

  await expectError(
    company.client.from("opportunities").insert({
      publisher_id: company.user.id,
      publisher_type: "external",
      opportunity_type: "freelance",
      title: "Invalid company boundary",
      description: "This insert must be rejected.",
      status: "open",
    }),
    "company can publish an external freelance opportunity",
  );
  await expectError(
    external.client.from("opportunities").insert({
      publisher_id: external.user.id,
      publisher_type: "external",
      opportunity_type: "job",
      title: "Invalid external boundary",
      description: "This insert must be rejected.",
      status: "open",
    }),
    "external can publish a non-freelance opportunity",
  );

  const { data: externalOpportunities, error: externalOpportunityError } = await external.client
    .from("opportunities")
    .select("id, publisher_type, opportunity_type")
    .eq("publisher_id", external.user.id);
  assert(!externalOpportunityError, "external cannot read own opportunities");
  assert((externalOpportunities ?? []).every((row) => row.publisher_type === "external" && row.opportunity_type === "freelance"), "external owns a non-freelance opportunity");

  await expectError(
    anonymous.from("opportunity_proposals").select("id").limit(1),
    "anonymous client can read proposals",
  );
  const { error: studentProposalReadError } = await student.client.from("opportunity_proposals").select("id").eq("applicant_id", student.user.id);
  assert(!studentProposalReadError, "student cannot read own proposals");
  const { error: externalProposalReadError } = await external.client.from("opportunity_proposals").select("id");
  assert(!externalProposalReadError, "external cannot read proposals for own opportunities");

  const secondSchoolEmail = optional("RUNTIME_SECOND_SCHOOL_EMAIL");
  const secondSchoolPassword = optional("RUNTIME_SECOND_SCHOOL_PASSWORD");
  const secondStudentEmail = optional("RUNTIME_SECOND_STUDENT_EMAIL");
  const secondStudentPassword = optional("RUNTIME_SECOND_STUDENT_PASSWORD");
  if (secondSchoolEmail && secondSchoolPassword && secondStudentEmail && secondStudentPassword) {
    const secondSchool = await signInWithCredentials(secondSchoolEmail, secondSchoolPassword, "second school");
    const secondStudent = await signInWithCredentials(secondStudentEmail, secondStudentPassword, "second student");
    const { data: crossStudentRows, error: crossStudentError } = await school.client
      .from("student_profiles")
      .select("profile_id")
      .eq("profile_id", secondStudent.profile.id);
    assert(!crossStudentError && (crossStudentRows?.length ?? 0) === 0, "school can read a student outside its membership");
    assert(secondSchool.profile.account_type === "school", "second school fixture is not a school");
  }

  const pendingContactRequestId = optional("RUNTIME_PENDING_CONTACT_REQUEST_ID");
  if (pendingContactRequestId) {
    const { data: minorRows, error: minorError } = await student.client
      .from("contact_requests")
      .select("id")
      .eq("id", pendingContactRequestId)
      .eq("status", "pending");
    assert(!minorError && (minorRows?.length ?? 0) === 0, "student can see a pending contact request");
  }

  console.log("verify:runtime-security passed: canonical identity, public privacy, opportunity boundaries, proposal scope and configured school isolation.");
}

async function signInWithCredentials(email, password, label) {
  const client = makeClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Could not authenticate ${label} fixture`);
  const { data: profile, error: profileError } = await client.from("profiles").select("id, account_type, account_status, school_id, age").eq("id", data.user.id).single();
  if (profileError || !profile) throw new Error(`Could not load ${label} profile`);
  return { client, user: data.user, profile };
}

run().catch((error) => {
  console.error(`verify:runtime-security failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
