import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { createClient } = require(resolve(rootDir, "apps/web/node_modules/@supabase/supabase-js"));

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required runtime smoke variable: ${name}`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const supabaseUrl = required("RUNTIME_SUPABASE_URL");
const anonKey = required("RUNTIME_SUPABASE_ANON_KEY");
const pendingContactRequestId = required("RUNTIME_PENDING_CONTACT_REQUEST_ID");

const accountConfig = [
  { key: "company", accountType: "company" },
  { key: "school", accountType: "school" },
  { key: "student", accountType: "student" },
  { key: "external", accountType: "external" },
];

async function signIn(account) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: required(`RUNTIME_${account.key.toUpperCase()}_EMAIL`),
    password: required(`RUNTIME_${account.key.toUpperCase()}_PASSWORD`),
  });
  if (error || !data.user) {
    throw new Error(`Could not authenticate runtime fixture: ${account.key}`);
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, account_type, account_status, age, school_id")
    .eq("id", data.user.id)
    .single();
  if (profileError || !profile) {
    throw new Error(`Could not load runtime profile: ${account.key}`);
  }

  assert(profile.account_type === account.accountType, `${account.key} fixture has unexpected account type`);
  assert(profile.account_status === "active", `${account.key} fixture is not active`);

  let studentProfile = null;
  if (account.key === "student") {
    const { data: studentData, error } = await client
      .from("student_profiles")
      .select("school_id, student_stage")
      .eq("profile_id", data.user.id)
      .single();
    if (error || !studentData) throw new Error("Could not load canonical student fixture");
    studentProfile = studentData;
  }

  return { client, profile, studentProfile };
}

async function checkHealth() {
  const appUrl = process.env.RUNTIME_APP_URL;
  if (!appUrl) return false;

  const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/health`);
  const body = await response.text();
  assert(response.ok, `Health endpoint returned HTTP ${response.status}`);
  assert(body.toLowerCase().includes("ok"), "Health endpoint did not return an ok response");
  return true;
}

const accounts = Object.fromEntries(
  await Promise.all(accountConfig.map(async (account) => [account.key, await signIn(account)])),
);

const { client: companyClient, profile: company } = accounts.company;
const { client: schoolClient, profile: school } = accounts.school;
const { client: studentClient, profile: student, studentProfile } = accounts.student;

assert(student.age === null || student.age < 18, "student fixture must represent a minor student");
assert(studentProfile?.school_id === school.id, "student fixture must belong to the school fixture");
assert(["enrolled", "internship", "graduated"].includes(studentProfile?.student_stage), "student fixture has an invalid student stage");

const { data: companyRequest, error: companyRequestError } = await companyClient
  .from("contact_requests")
  .select("id, status, company_id, school_id, student_id")
  .eq("id", pendingContactRequestId)
  .single();
assert(!companyRequestError && companyRequest, "company cannot read the pending contact request");
assert(companyRequest.status === "pending", "contact request fixture must be pending");
assert(companyRequest.company_id === company.id, "contact request is outside the company fixture scope");

const { data: schoolRequest, error: schoolRequestError } = await schoolClient
  .from("contact_requests")
  .select("id, status, company_id, school_id, student_id")
  .eq("id", pendingContactRequestId)
  .single();
assert(!schoolRequestError && schoolRequest, "school cannot read the pending contact request");
assert(schoolRequest.school_id === school.id, "contact request is outside the school fixture scope");
assert(schoolRequest.student_id === student.id, "contact request is outside the student fixture scope");

const { error: evidenceSchemaError } = await schoolClient
  .from("profile_evidence")
  .select("id")
  .limit(1);
assert(!evidenceSchemaError, "profile evidence schema is not available in staging");

const { data: studentPendingRequests, error: studentRequestError } = await studentClient
  .from("contact_requests")
  .select("id")
  .eq("id", pendingContactRequestId)
  .eq("status", "pending");
assert(!studentRequestError, "student contact request query failed unexpectedly");
assert(studentPendingRequests.length === 0, "student can see a pending contact request");

const healthChecked = await checkHealth();
console.log(
  `verify:runtime-supabase passed: ${accountConfig.length} account types, contact-request RLS scope, minor pending visibility${healthChecked ? ", and health endpoint" : ""}.`,
);
