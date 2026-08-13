import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { chmodSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { createClient } = require(resolve(import.meta.dirname, "..", "apps/web/node_modules/@supabase/supabase-js"));
const MAX_BCRYPT_PASSWORD_BYTES = 72;
const normalizeEmail = (email) => String(email).trim().toLowerCase();
const passwordByteLength = (password) => Buffer.byteLength(password, "utf8");
const fixturePassword = () => `TH-${randomBytes(32).toString("base64url")}-aA1!`;
const required = (name) => { if (!process.env[name]) throw new Error(`Missing ${name}`); return process.env[name]; };
const safeMessage = (value) => String(value || "error")
  // Keep the diagnostic prefixes (actor/operation/fixture) while removing
  // values that can identify or authenticate against the local/staging stack.
  .replace(/https?:\/\/[^\s"'<>]+/gi, "[redacted-url]")
  .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-jwt]")
  .replace(/(\b(?:anon|service[_-]?role|api)[_-]?key\s*[=:]\s*)["']?[^\s,"']+/gi, "$1[redacted-key]")
  .replace(/(\b(?:password|token|secret)\s*[=:]\s*)["']?[^\s,"']+/gi, "$1[redacted-secret]")
  .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
  .replace(/(\b(?:RUNTIME_FIXTURES_OUTPUT|(?:fixture|contract)[_-]?(?:path|file))\s*[=:]\s*)["']?[^\s,"']+/gi, "$1[redacted-path]")
  .replace(/\s+/g, " ").trim().slice(0, 240);
const safeOperation = (value) => String(value || "operation").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]");
const safeDiagnostic = (value, fallback) => safeOperation(value).replace(/[^a-zA-Z0-9 _=./:[\]-]/g, "_").slice(0, 160) || fallback;
if (process.argv.includes("--self-test")) {
  let maxBytes = 0;
  const cache = new Map();
  for (let index = 0; index < 32; index += 1) {
    const password = fixturePassword();
    maxBytes = Math.max(maxBytes, passwordByteLength(password));
    if (passwordByteLength(password) > MAX_BCRYPT_PASSWORD_BYTES || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) throw new Error("fixture password/cache self-test failed");
  }
  cache.set(normalizeEmail("Fixture@staging.invalid"), { id: "first" });
  if (cache.get(normalizeEmail("fixture@STAGING.invalid"))?.id !== "first") throw new Error("Auth cache self-test failed");
  cache.clear();
  if (cache.get("fixture@staging.invalid")) throw new Error("Auth cache invalidation self-test failed");
  console.log(`SELF-TEST runtime-full password/cache passed (max UTF-8 password bytes=${maxBytes})`);
  process.exit(0);
}
async function main() {
const url = required("RUNTIME_SUPABASE_URL");
const anonKey = required("RUNTIME_SUPABASE_ANON_KEY");
const serviceKey = required("RUNTIME_SUPABASE_SERVICE_ROLE_KEY");
const parsedUrl = new URL(url);
const local = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
const staging = parsedUrl.hostname.endsWith(".supabase.co") || parsedUrl.hostname.endsWith(".supabase.in");
if (process.env.GITHUB_ACTIONS === "true" || process.env.RUNTIME_SUPABASE_STAGING_CONFIRMATION !== "staging-only") throw new Error("operator-only staging confirmation required");
if (!local && !staging) throw new Error("fixture provisioning only permits explicit local or Supabase staging URLs");
if (!local && process.env.RUNTIME_SUPABASE_STAGING_URL !== url) throw new Error("staging provisioning requires an explicit RUNTIME_SUPABASE_STAGING_URL allowlist entry");
if (/prod|production|uwkigsomnkhwjcfrgdts/i.test(url) || process.env.RUNTIME_SUPABASE_CANARY === "true") throw new Error("refusing production/canary fixture provisioning");

const AUTH_DEADLINE_MS = 60_000;
const AUTH_REQUEST_TIMEOUT_MS = 12_000;
const fetchWithTimeout = async (input, init = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: fetchWithTimeout } });
const marker = "talenthub-runtime-full";
const actors = [
  ["student-adult-a", "student", "Egresado", 24], ["student-minor-a", "student", "Estudiante", 16], ["student-school-b", "student", "Estudiante", 17],
  ["school-a", "school", "Colegio", null], ["school-b", "school", "Colegio", null], ["company-a", "company", "Empresa", null],
  ["company-b", "company", "Empresa", null], ["external-a", "external", "Externo", null], ["suspended", "student", "Estudiante", 17], ["student-missing-enrollment", "student", "Estudiante", 17],
];
const authError = (actor, operation, error, retryable = false) => {
   const result = new Error(`actor=${safeDiagnostic(actor, "actor")} operation=${safeDiagnostic(operation, "operation")}: ${safeMessage(error?.message || error)}`);
   result.actor = safeDiagnostic(actor, "actor"); result.operation = safeDiagnostic(operation, "operation");
   result.status = Number.isInteger(error?.status) ? error.status : undefined;
   result.code = typeof error?.code === "string" ? safeDiagnostic(error.code, "error") : undefined;
   result.name = typeof error?.name === "string" ? safeDiagnostic(error.name, "AuthFixtureError") : "AuthFixtureError";
  result.retryable = retryable;
  return result;
};
const assertFixturePassword = (actor, operation, password) => {
  if (passwordByteLength(password) > MAX_BCRYPT_PASSWORD_BYTES) throw authError(actor, operation, `fixture password exceeds bcrypt limit (${MAX_BCRYPT_PASSWORD_BYTES} UTF-8 bytes)`);
};
class AuthUserCache {
  constructor() { this.users = new Map(); }
  clear() { this.users.clear(); }
  set(user) { if (user?.email) this.users.set(normalizeEmail(user.email), user); return user; }
  get(email) { return this.users.get(normalizeEmail(email)); }
}
const runSelfTest = () => {
  let maxBytes = 0;
  for (let index = 0; index < 32; index += 1) { const password = fixturePassword(); maxBytes = Math.max(maxBytes, passwordByteLength(password)); assertFixturePassword("self-test", "password generation", password); if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) throw new Error("fixture password complexity self-test failed"); }
  const cache = new AuthUserCache(); cache.set({ id: "first", email: "Fixture@staging.invalid" }); if (cache.get("fixture@STAGING.invalid")?.id !== "first") throw new Error("Auth cache self-test failed"); cache.clear(); if (cache.get("fixture@staging.invalid")) throw new Error("Auth cache invalidation self-test failed");
  console.log(`SELF-TEST runtime-full password/cache passed (max UTF-8 password bytes=${maxBytes})`);
};
const ok = async (promise, actor, operation) => { const result = await promise; if (result.error) throw authError(actor, operation || actor, result.error); return result.data; };
const db = (promise, operation) => ok(promise, "service_role", operation);
const transientStatuses = new Set([429, 500, 502, 503, 504]);
const transientCodes = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"]);
const isTransient = (error) => error?.retryable === true || error?.status === 0 || transientStatuses.has(error?.status) || transientCodes.has(error?.code) || error?.name === "AuthRetryableFetchError" || error?.name === "AbortError" || error?.name === "TypeError";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function authAdmin(actor, operation, request, validate) {
  const deadline = Date.now() + AUTH_DEADLINE_MS;
  let lastError;
  for (let attempt = 0; Date.now() < deadline; attempt += 1) {
    try {
      const result = await Promise.race([
        request(),
        wait(Math.min(AUTH_REQUEST_TIMEOUT_MS, Math.max(1, deadline - Date.now()))).then(() => { throw Object.assign(new Error("request timeout"), { name: "AbortError", status: 0 }); }),
      ]);
      if (!result || typeof result !== "object" || !Object.hasOwn(result, "error") || !Object.hasOwn(result, "data")) throw authError("service_role", operation, "malformed Supabase response");
      const status = result.error?.status;
      if (!result.error) {
        const value = validate(result.data);
        return value;
      }
      if (!isTransient(result.error)) throw authError(actor, operation, result.error);
      lastError = authError(actor, operation, result.error, true);
    } catch (error) {
      if (error?.message?.startsWith("actor=") && !isTransient(error)) throw error;
      if (!isTransient(error)) throw authError(actor, operation, error);
      lastError = authError(actor, operation, error, true);
    }
    if (Date.now() >= deadline) throw lastError;
    const backoff = Math.min(8_000, 250 * (2 ** Math.min(attempt, 5))) + Math.floor(Math.random() * 250);
    await wait(Math.min(backoff, deadline - Date.now()));
  }
  throw lastError || authError(actor, operation, "bounded retry timeout", true);
}
const ids = {}; const credentials = {};
const userData = (data, operation) => {
  if (!data?.user?.id) throw authError("service_role", operation, "malformed Supabase response: data.user.id missing");
  return data.user;
};
const usersData = (data, operation) => {
  if (!Array.isArray(data?.users)) throw authError("service_role", operation, "malformed Supabase response: data.users missing");
  return data.users;
};
async function findUser(email) {
  for (let page = 1; page <= 100; page += 1) { const users = await authAdmin("service_role", `list Auth users page=${page}`, () => admin.auth.admin.listUsers({ page, perPage: 1000 }), (data) => usersData(data, `list Auth users page=${page}`)); const user = users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase()); if (user || users.length < 1000) return user; }
  return undefined;
}
const userCache = new AuthUserCache();
async function loadUsers() {
  userCache.clear();
  for (let page = 1; page <= 100; page += 1) {
    const users = await authAdmin("service_role", `list Auth users page=${page}`, () => admin.auth.admin.listUsers({ page, perPage: 1000 }), (data) => usersData(data, `list Auth users page=${page}`));
    for (const user of users) userCache.set(user);
    if (users.length < 1000) return;
  }
  throw authError("service_role", "list Auth users", "Auth user pagination exceeded 100 pages");
}
async function refreshUsers() { await loadUsers(); }
await loadUsers();
for (const [name, accountType, role, age] of actors) {
   const email = `${name}+${marker}@staging.invalid`; const password = fixturePassword(); assertFixturePassword(name, `generate fixture password actor=${name}`, password); const found = userCache.get(email);
  if (found && found.user_metadata?.runtime_marker !== marker) throw authError(name, `validate existing Auth user email=${email}`, "fixture marker mismatch; refusing to modify password");
  const metadata = { runtime_marker: marker, name };
  const validateFixtureUser = (data, operation) => {
    const user = userData(data, operation);
    if (user.email?.toLowerCase() !== email.toLowerCase() || user.user_metadata?.runtime_marker !== marker) throw authError(name, operation, "Auth user email/marker mismatch; refusing to continue");
    return user;
  };
  let user;
   if (found) {
     user = await authAdmin(name, `update Auth user actor=${name}`, () => admin.auth.admin.updateUserById(found.id, { password, email_confirm: true, app_metadata: { ...found.app_metadata, account_type: accountType }, user_metadata: { ...found.user_metadata, ...metadata } }), (data) => validateFixtureUser(data, `update Auth user actor=${name}`));
     userCache.set(user);
   }
   else {
    // Every attempt searches first. Thus a 500/timeout after Auth committed the
    // row reuses that row on the next attempt instead of issuing a duplicate POST.
     let refreshed = false;
     const refreshOnce = async () => { if (!refreshed) { refreshed = true; await refreshUsers(); } };
     user = await authAdmin(name, `create Auth user actor=${name}`, async () => {
       const raced = userCache.get(email);
      if (raced) {
        if (raced.user_metadata?.runtime_marker !== marker) throw authError(name, `validate existing Auth user actor=${name}`, "fixture marker mismatch; refusing to modify password");
        return admin.auth.admin.updateUserById(raced.id, { password, email_confirm: true, app_metadata: { ...raced.app_metadata, account_type: accountType }, user_metadata: { ...raced.user_metadata, ...metadata } });
      }
      try {
        const result = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { account_type: accountType }, user_metadata: metadata });
        if (!result.error) return result;
         if (!isTransient(result.error)) return result;
         await refreshOnce();
         const afterError = userCache.get(email);
        if (!afterError) return result;
        if (afterError.user_metadata?.runtime_marker !== marker) throw authError(name, `validate existing Auth user actor=${name}`, "fixture marker mismatch; refusing to modify password");
        return admin.auth.admin.updateUserById(afterError.id, { password, email_confirm: true, app_metadata: { ...afterError.app_metadata, account_type: accountType }, user_metadata: { ...afterError.user_metadata, ...metadata } });
      } catch (error) {
        // A network/timeout failure can happen after GoTrue committed the row.
        // Reconcile it before authAdmin decides whether another attempt is safe.
         if (!isTransient(error)) throw error;
         await refreshOnce();
         const afterError = userCache.get(email);
        if (!afterError) throw error;
        if (afterError.user_metadata?.runtime_marker !== marker) throw authError(name, `validate existing Auth user actor=${name}`, "fixture marker mismatch; refusing to modify password");
        return admin.auth.admin.updateUserById(afterError.id, { password, email_confirm: true, app_metadata: { ...afterError.app_metadata, account_type: accountType }, user_metadata: { ...afterError.user_metadata, ...metadata } });
     userCache.set(user);
   }
    }, (data) => validateFixtureUser(data, `create Auth user actor=${name}`));
  }
  ids[name] = user.id; credentials[name] = { email, password };
  await db(admin.from("profiles").upsert({ id: user.id, email, name: `Synthetic ${name}`, role, account_type: accountType, account_status: name === "suspended" ? "suspended" : "active", age }, { onConflict: "id" }), `upsert profile actor=${name}`);
  await wait(100 + Math.floor(Math.random() * 150));
}
const schoolA = await ok(admin.from("schools").upsert({ profile_id: ids["school-a"], name: "Synthetic Runtime School A", status: "active" }, { onConflict: "profile_id" }).select("id,profile_id").single(), "school A");
const schoolB = await ok(admin.from("schools").upsert({ profile_id: ids["school-b"], name: "Synthetic Runtime School B", status: "active" }, { onConflict: "profile_id" }).select("id,profile_id").single(), "school B");
const assertSchoolProfile = (school, schoolProfileId, actor, fixture) => {
  if (!school || school.profile_id !== schoolProfileId) throw authError(actor, `validate school profile fixture=${fixture}`, "school profile mapping mismatch");
};
assertSchoolProfile(schoolA, ids["school-a"], "service_role", "school-a");
assertSchoolProfile(schoolB, ids["school-b"], "service_role", "school-b");
const schoolIdA = schoolA.id; const schoolIdB = schoolB.id;
await ok(admin.from("school_members").upsert([{ school_id: schoolIdA, profile_id: ids["school-a"], member_role: "owner", status: "active" }, { school_id: schoolIdB, profile_id: ids["school-b"], member_role: "owner", status: "active" }], { onConflict: "school_id,profile_id" }), "school memberships");
await ok(admin.from("student_profiles").upsert([{ profile_id: ids["student-adult-a"], school_id: schoolIdA, student_stage: "enrolled", public_visibility: true }, { profile_id: ids["student-minor-a"], school_id: schoolIdA, student_stage: "enrolled", public_visibility: true }, { profile_id: ids["student-school-b"], school_id: schoolIdB, student_stage: "enrolled", public_visibility: true }], { onConflict: "profile_id" }), "student profiles");
const studentSchoolRows = await db(admin.from("student_profiles").select("profile_id,school_id").in("profile_id", [ids["student-adult-a"], ids["student-minor-a"], ids["student-school-b"]]), "validate student school mappings");
for (const [studentId, expectedSchoolId, fixture] of [[ids["student-adult-a"], schoolIdA, "student-adult-a"], [ids["student-minor-a"], schoolIdA, "student-minor-a"], [ids["student-school-b"], schoolIdB, "student-school-b"]]) {
  if (studentSchoolRows.find((row) => row.profile_id === studentId)?.school_id !== expectedSchoolId) throw authError("service_role", `validate student school fixture=${fixture}`, "student school mapping mismatch");
}
await ok(admin.from("company_profiles").upsert([{ profile_id: ids["company-a"], company_name: "Synthetic Company A", verification_status: "verified" }, { profile_id: ids["company-b"], company_name: "Synthetic Company B", verification_status: "verified" }], { onConflict: "profile_id" }), "company profiles");
await ok(admin.from("external_profiles").upsert({ profile_id: ids["external-a"], public_name: "Synthetic External A", verification_status: "verified" }, { onConflict: "profile_id" }), "external profile");
const existingPost = await ok(admin.from("posts").select("id").eq("author_id", ids["student-adult-a"]).eq("title", "Synthetic runtime post").maybeSingle(), "find post");
const post = existingPost || await ok(admin.from("posts").insert({ author_id: ids["student-adult-a"], title: "Synthetic runtime post", content: "fixture" }).select("id").single(), "post");
async function opportunity(publisherId, publisherType, type, title) { const existing = await ok(admin.from("opportunities").select("id").eq("publisher_id", publisherId).eq("title", title).maybeSingle(), `find ${title}`); return existing || ok(admin.from("opportunities").insert({ publisher_id: publisherId, publisher_type: publisherType, opportunity_type: type, title, status: "open" }).select("id").single(), `create ${title}`); }
const own = await opportunity(ids["company-a"], "company", "job", "Synthetic own opportunity");
const foreign = await opportunity(ids["company-b"], "company", "job", "Synthetic foreign opportunity");
const freelance = await opportunity(ids["external-a"], "external", "freelance", "Synthetic freelance opportunity");
async function application(opportunityId, studentId) { const existing = await ok(admin.from("job_applications").select("id").eq("opportunity_id", opportunityId).eq("student_id", studentId).maybeSingle(), "find application"); return existing || ok(admin.from("job_applications").insert({ opportunity_id: opportunityId, applicant_id: studentId, student_id: studentId, status: "pending" }).select("id").single(), "create application"); }
async function evidence(ownerId, status, title) {
  const existing = await ok(admin.from("profile_evidence").select("id,status").eq("owner_id", ownerId).eq("title", title).maybeSingle(), "find evidence");
  if (existing) return existing;
  return ok(admin.from("profile_evidence").insert({ owner_id: ownerId, evidence_type: "certificate", title, description: "Synthetic runtime evidence", issuer: "TalentHub staging", status, validation_note: status === "rejected" ? "Synthetic rejection" : "" }).select("id,status").single(), "create evidence");
}
const adultApplication = await application(own.id, ids["student-adult-a"]); const minorApplication = await application(own.id, ids["student-minor-a"]); const missingEnrollmentApplication = await application(own.id, ids["student-missing-enrollment"]); const unrelatedApplication = await application(foreign.id, ids["student-school-b"]);
const evidenceIds = {
  minor: (await evidence(ids["student-minor-a"], "verified", "Synthetic runtime minor evidence")).id,
  adult: (await evidence(ids["student-adult-a"], "pending", "Synthetic runtime adult evidence")).id,
  schoolB: (await evidence(ids["student-school-b"], "rejected", "Synthetic runtime School B evidence")).id,
};
await ok(admin.from("opportunity_proposals").upsert([{ opportunity_id: freelance.id, applicant_id: ids["student-adult-a"], status: "accepted" }, { opportunity_id: freelance.id, applicant_id: ids["student-school-b"], status: "pending" }], { onConflict: "opportunity_id,applicant_id" }), "proposals");
async function contact(companyId, studentId, schoolProfileId, fixture) {
  const existing = await ok(admin.from("contact_requests").select("id,status,company_id,student_id,school_id,message").eq("company_id", companyId).eq("student_id", studentId).maybeSingle(), `find contact fixture=${fixture}`);
  if (existing) {
    if (existing.company_id !== companyId || existing.student_id !== studentId || existing.school_id !== schoolProfileId || ![marker, "runtime fixture"].includes(existing.message)) throw authError("service_role", `reconcile contact fixture=${fixture}`, "existing contact is not this fixture; refusing to mutate");
    if (existing.status !== "pending") throw authError("service_role", `reconcile contact fixture=${fixture}`, "fixture contact status cannot be reconciled without an invalid transition");
    return existing;
  }
  return ok(admin.from("contact_requests").insert({ company_id: companyId, student_id: studentId, school_id: schoolProfileId, status: "pending", message: marker }).select("id,status,company_id,student_id,school_id,message").single(), `create contact fixture=${fixture}`);
}
// These are service-role-only fixtures: the public API has no INSERT grant.
const mediatedPending = await contact(ids["company-a"], ids["student-minor-a"], ids["school-a"], "company-mediated-pending");
const schoolPending = await contact(ids["company-b"], ids["student-minor-a"], ids["school-a"], "school-pending");
// Do not preseed the cross-school pair: the verifier must exercise the RPC's
// real INSERT and then prove school A cannot approve a school B request.
const crossSchoolExisting = await ok(admin.from("contact_requests").select("id,message").eq("company_id", ids["company-b"]).eq("student_id", ids["student-school-b"]).maybeSingle(), "find cross-school contact fixture");
if (crossSchoolExisting && ![marker, "runtime fixture"].includes(crossSchoolExisting.message)) throw authError("service_role", "reset cross-school contact fixture", "existing contact is not this fixture; refusing to mutate");
if (crossSchoolExisting) await ok(admin.from("contact_requests").delete().eq("id", crossSchoolExisting.id), "reset cross-school contact fixture");
const externalPending = await contact(ids["external-a"], ids["student-school-b"], ids["school-b"], "external-pending");
const env = { RUNTIME_SUPABASE_URL: url, RUNTIME_SUPABASE_ANON_KEY: anonKey, RUNTIME_FULL_FIXTURES_READY: "1" };
for (const [name, value] of Object.entries(credentials)) {
  const alias = name.toUpperCase().replaceAll("-", "_");
  env[`RUNTIME_${alias}_EMAIL`] = value.email;
  env[`RUNTIME_${alias}_PASSWORD`] = value.password;
  env[`RUNTIME_${alias}_ID`] = ids[name];
}
// These are the canonical aliases consumed by the existing runtime verifiers.
for (const [alias, actor] of [["STUDENT", "student-adult-a"], ["SCHOOL", "school-a"], ["COMPANY", "company-a"], ["EXTERNAL", "external-a"]]) {
  env[`RUNTIME_${alias}_EMAIL`] = credentials[actor].email;
  env[`RUNTIME_${alias}_PASSWORD`] = credentials[actor].password;
  env[`RUNTIME_${alias}_ID`] = ids[actor];
}
env.RUNTIME_CONTACT_COMPANY_EMAIL = credentials["company-a"].email; env.RUNTIME_CONTACT_COMPANY_PASSWORD = credentials["company-a"].password;
env.RUNTIME_CONTACT_SCHOOL_EMAIL = credentials["school-a"].email; env.RUNTIME_CONTACT_SCHOOL_PASSWORD = credentials["school-a"].password;
env.RUNTIME_CONTACT_SUSPENDED_EMAIL = credentials.suspended.email; env.RUNTIME_CONTACT_SUSPENDED_PASSWORD = credentials.suspended.password;
env.RUNTIME_CONTACT_EXTERNAL_EMAIL = credentials["external-a"].email; env.RUNTIME_CONTACT_EXTERNAL_PASSWORD = credentials["external-a"].password;
env.RUNTIME_CONTACT_COMPANY_B_EMAIL = credentials["company-b"].email; env.RUNTIME_CONTACT_COMPANY_B_PASSWORD = credentials["company-b"].password;
Object.assign(env, { RUNTIME_CONTACT_ADULT_ID: ids["student-adult-a"], RUNTIME_CONTACT_MINOR_ID: ids["student-minor-a"], RUNTIME_CONTACT_FOREIGN_STUDENT_ID: ids["student-school-b"], RUNTIME_CONTACT_MISSING_RELATION_ID: ids["student-school-b"], RUNTIME_CONTACT_MISSING_ENROLLMENT_ID: ids["student-missing-enrollment"], RUNTIME_CONTACT_COMPANY_MEDIATED_PENDING_ID: mediatedPending.id, RUNTIME_CONTACT_SCHOOL_PENDING_ID: schoolPending.id, RUNTIME_CONTACT_EXTERNAL_ID: ids["external-a"], RUNTIME_CONTACT_EXTERNAL_OPPORTUNITY_ID: freelance.id, RUNTIME_CONTACT_EXTERNAL_STUDENT_ID: ids["student-adult-a"], RUNTIME_CONTACT_EXTERNAL_UNRELATED_STUDENT_ID: ids["student-school-b"], RUNTIME_CONTACT_EXTERNAL_PENDING_ID: externalPending.id, RUNTIME_CONTACT_SCHOOL_A_ID: ids["school-a"], RUNTIME_CONTACT_SCHOOL_B_ID: ids["school-b"] });
env.RUNTIME_FULL_APPLICATION_ID = adultApplication.id;
env.RUNTIME_FULL_UNRELATED_APPLICATION_ID = unrelatedApplication.id;
env.RUNTIME_FULL_POST_ID = post.id;
env.RUNTIME_PENDING_CONTACT_REQUEST_ID = mediatedPending.id;
const contract = { version: 1, marker, generatedAt: new Date().toISOString(), ids: { ...ids, schoolAId: schoolIdA, schoolBId: schoolIdB, schoolAProfileId: ids["school-a"], schoolBProfileId: ids["school-b"], ownOpportunityId: own.id, foreignOpportunityId: foreign.id, freelanceOpportunityId: freelance.id, adultApplicationId: adultApplication.id, minorApplicationId: minorApplication.id, missingEnrollmentApplicationId: missingEnrollmentApplication.id, unrelatedApplicationId: unrelatedApplication.id, postId: post.id }, evidence: evidenceIds, credentials, env };
if (!process.env.RUNTIME_FIXTURES_OUTPUT) throw new Error("RUNTIME_FIXTURES_OUTPUT is required; refusing to print a secret contract");
writeFileSync(process.env.RUNTIME_FIXTURES_OUTPUT, `${JSON.stringify(contract, null, 2)}\n`, { mode: 0o600 }); chmodSync(process.env.RUNTIME_FIXTURES_OUTPUT, 0o600);
console.log(`provision:runtime-full wrote protected contract for ${Object.keys(credentials).length} actors`);
}
main().catch((error) => {
  const message = safeMessage(error?.message || error);
  console.error(`provision:runtime-full failed actor=${error?.actor || "provisioner"} operation=${error?.operation || "main"}: ${message}`);
  process.exitCode = 1;
});
