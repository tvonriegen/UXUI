import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { createClient } = require(resolve(import.meta.dirname, "..", "apps/web/node_modules/@supabase/supabase-js"));
const url = process.env.RUNTIME_SUPABASE_URL;
const anonKey = process.env.RUNTIME_SUPABASE_ANON_KEY;
const serviceKey = process.env.RUNTIME_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("auth-readiness:missing-runtime-credentials");

const deadline = Date.now() + 45_000;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sanitized = (value) => String(value || "")
  .replace(/https?:\/\/\S+|(?:anon|service[_-]?role|api)[_-]?key\s*[=:]\s*\S+|password\s*[=:]\s*\S+|[A-Za-z0-9_-]{24,}/gi, "[redacted]")
  .replace(/\s+/g, " ").trim().slice(0, 180);
const status = (response) => `http-${response.status}`;

async function checkHttp(path, headers, label) {
  let attempt = 0;
  while (Date.now() < deadline) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(5_000, Math.max(1_000, deadline - Date.now())));
    try {
      const response = await fetch(`${url}${path}`, { headers, signal: controller.signal });
      if (response.status === 200) return;
      if (![429, 500, 502, 503, 504].includes(response.status)) throw new Error(`${label}:${status(response)}`);
      if (Date.now() >= deadline) throw new Error(`${label}:${status(response)}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith(`${label}:http-`)) throw error;
      if (Date.now() >= deadline) throw new Error(`${label}:network-timeout`);
    } finally { clearTimeout(timer); }
    await wait(Math.min(2_000, 250 * (2 ** Math.min(attempt++, 3))));
  }
  throw new Error(`${label}:timeout`);
}

async function checkAdmin() {
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  let attempt = 0;
  while (Date.now() < deadline) {
    try {
      const result = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (!result.error) return;
      const code = result.error.status;
      if (![429, 500, 502, 503, 504].includes(code)) throw new Error(`admin-list-users:http-${code || "error"}`);
    } catch (error) {
      if (Date.now() >= deadline) throw new Error("admin-list-users:network-timeout");
      if (error instanceof Error && error.message.startsWith("admin-list-users:http-")) throw error;
    }
    await wait(Math.min(2_000, 250 * (2 ** Math.min(attempt++, 3))));
  }
  throw new Error("admin-list-users:timeout");
}

try {
  await checkHttp("/auth/v1/health", { apikey: anonKey }, "gotrue-health");
  await checkHttp("/auth/v1/settings", { apikey: anonKey }, "gotrue-settings");
  await checkAdmin();
  console.log("auth-readiness:passed health=settings=admin-read");
} catch (error) {
  console.error(`auth-readiness:failed ${sanitized(error.message) || "unavailable"}`);
  process.exitCode = 1;
}
