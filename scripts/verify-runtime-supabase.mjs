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
  { key: "company", role: "Empresa" },
  { key: "school", role: "Colegio" },
  { key: "minor", role: "Estudiante" },
  { key: "graduate", role: "Egresado" },
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
    .select("id, role, age, school_id")
    .eq("id", data.user.id)
    .single();
  if (profileError || !profile) {
    throw new Error(`Could not load runtime profile: ${account.key}`);
  }

  assert(profile.role === account.role, `${account.key} fixture has unexpected role`);
  return { client, profile };
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
const { client: minorClient, profile: minor } = accounts.minor;

assert(minor.age === null || minor.age < 18, "minor fixture must represent a minor student");
assert(minor.school_id === school.id, "minor fixture must belong to the school fixture");

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
assert(schoolRequest.student_id === minor.id, "contact request is outside the minor fixture scope");

const { error: evidenceSchemaError } = await schoolClient
  .from("profile_evidence")
  .select("id")
  .limit(1);
assert(!evidenceSchemaError, "profile evidence schema is not available in staging");

const { data: minorPendingRequests, error: minorRequestError } = await minorClient
  .from("contact_requests")
  .select("id")
  .eq("id", pendingContactRequestId)
  .eq("status", "pending");
assert(!minorRequestError, "minor contact request query failed unexpectedly");
assert(minorPendingRequests.length === 0, "minor student can see a pending contact request");

const healthChecked = await checkHealth();
console.log(
  `verify:runtime-supabase passed: ${accountConfig.length} roles, contact-request RLS scope, minor pending visibility${healthChecked ? ", and health endpoint" : ""}.`,
);
