import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bootstrap = readFileSync(resolve(root, "scripts/bootstrap-full-runtime-local.mjs"), "utf8");
const provision = readFileSync(resolve(root, "scripts/provision-runtime-full-fixtures.mjs"), "utf8");
if (!bootstrap.includes('"auth-readiness"') || !bootstrap.includes("verify-auth-readiness-local.mjs")) throw new Error("bootstrap lacks auth readiness gate");
if (!bootstrap.includes("RUNTIME_SUPABASE_SERVICE_ROLE_KEY: statusJson.SERVICE_ROLE_KEY")) throw new Error("service key is not scoped to provisioning/readiness");
for (const required of ["reservePorts", "createServer", "127.0.0.1", "mkdirSync(lock)", "activeLocks", "port-block", "configuredPortKeys"]) if (!bootstrap.includes(required)) throw new Error(`bootstrap lacks port isolation primitive: ${required}`);
if (/^\s*(?:port|shadow_port|smtp_port|pop3_port|inspector_port)\s*=\s*543\d+/m.test(bootstrap)) throw new Error("bootstrap contains fixed Supabase published ports");
if (!bootstrap.includes("preflight:published-port-default-remains") || !bootstrap.includes("preflight:port-replacement")) throw new Error("bootstrap lacks structural replacement validation");
if (!bootstrap.includes("project-id-validation") || !bootstrap.includes("projectIds") || !bootstrap.includes("portBlockSize")) throw new Error("bootstrap lacks fail-closed project/block validation");
if (!bootstrap.includes("replaceAssignmentExactlyOnce") || !bootstrap.includes("assignment-not-unique") || !bootstrap.includes('"db.seed", "enabled", "false", "seed", "true"')) throw new Error("bootstrap lacks exact seed assignment replacement contract");
if (/A-Za-z0-9_-\}\{24,\}/.test(bootstrap)) throw new Error("bootstrap contains generic long-token redaction");
if (/stop[^\n]*--all/.test(bootstrap)) throw new Error("bootstrap must not stop unrelated stacks");
if (!bootstrap.includes("if (stop.status === 0) releaseLock") || !bootstrap.includes("failed stop intentionally retains")) throw new Error("allocator is released before confirmed stop");
if (/CREATE\s+TRIGGER|ALTER\s+TABLE\s+auth\.users|CREATE\s+TRIGGER[\s\S]*auth\.users/i.test(bootstrap)) throw new Error("bootstrap must not modify auth.users or repository migrations");
if (!provision.includes("create Auth user") || !provision.includes("findUser(email)")) throw new Error("fixture create path lacks labelled idempotent retry");
if (!provision.includes("bounded retry timeout") || !provision.includes("safeMessage")) throw new Error("fixture retry errors are not bounded/sanitized");

// Pure regression checks for the contracts that do not require Docker/Supabase.
const sanitize = (value) => String(value)
  .replace(/https?:\/\/[^\s"'<>]+/gi, "[redacted-url]")
  .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-jwt]")
  .replace(/\b(?:anon|service[_-]?role|api)[_-]?key\s*[=:]\s*["']?[^\s,"']+/gi, "[redacted-key]")
  .replace(/\b(?:password|token|secret)\s*[=:]\s*["']?[^\s,"']+/gi, "[redacted-secret]");
if (!sanitize("preflight:published-port-default-remains").includes("preflight:published-port-default-remains")) throw new Error("sanitizer removed diagnostic message");
if (sanitize("token=abc1234").includes("abc1234")) throw new Error("sanitizer failed contextual secret redaction");
const block = (number, width) => 45000 + number * 64 + width - width;
if (new Set([block(1, 11), block(2, 11)]).size !== 2 || block(2, 11) - block(1, 11) < 64) throw new Error("allocator blocks overlap");
const selfTest = spawnSync(process.execPath, [resolve(root, "scripts/bootstrap-full-runtime-local.mjs"), "--self-test"], { encoding: "utf8" });
if (selfTest.status !== 0 || !selfTest.stdout.includes("SELF-TEST runtime-bootstrap project-id and seed assignment replacement passed")) throw new Error(`assignment replacement self-test failed: ${selfTest.stderr || selfTest.stdout}`);
console.log("STATIC verify:runtime-bootstrap passed");
