#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, cpSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const baseline = resolve(root, "supabase/staging/full-runtime-baseline.sql");
const config = resolve(root, "supabase/config.toml");
const countArg = process.argv.indexOf("--run-count");
const runCount = countArg === -1 ? 1 : Number(process.argv[countArg + 1]);
if (!Number.isInteger(runCount) || runCount < 1) throw new Error("--run-count must be a positive integer");

const sql = readFileSync(baseline, "utf8");
const metadata = (key) => sql.match(new RegExp(`^-- ${key}:\\s*(.+)$`, "m"))?.[1]?.trim();
if (metadata("purpose") !== "temporary local/future Full Staging QA only" || metadata("not_production_migration_history") !== "true") throw new Error("baseline metadata is not staging-only");
if (metadata("post_baseline_delta_allowlist") !== "[]") throw new Error("post-baseline delta allowlist must be explicit and empty for this folded baseline");
if (metadata("latest_delta_folded_into_baseline") !== "supabase/migrations/20260811000002_contact_security_gate.sql") throw new Error("unexpected baseline delta metadata");
if (Number(metadata("public_application_table_count")) !== 44) throw new Error("Full baseline must declare 44 public application tables");

const inherited = ["PATH", "HOME", "USER", "LOGNAME", "TMPDIR", "LANG", "LC_ALL", "CI", "npm_config_user_agent"];
const baseEnv = Object.fromEntries(inherited.filter((name) => process.env[name] !== undefined).map((name) => [name, process.env[name]]));
const sha = createHash("sha256").update(sql).digest("hex");
const activeLocks = new Set();
const allocatorRoot = join(tmpdir(), "talenthub-runtime-port-blocks-v1");
const portBlockSize = 64;
const portBlockStart = 45000;
const projectIds = new Set();
let activeWorkspace = null;
let receivedSignal = null;

const portSpecs = [
  ["api", "port"], ["db", "port"], ["db", "shadow_port"], ["studio", "port"],
  ["local_smtp", "port"], ["local_smtp", "smtp_port"], ["local_smtp", "pop3_port"],
  ["analytics", "port"], ["analytics", "vector_port"], ["edge_runtime", "inspector_port"],
  ["db.pooler", "port"],
];

function sectionOf(line) { return line.match(/^\[([^\]]+)\]\s*$/)?.[1] ?? null; }

function configuredPortKeys(text) {
  let section = null;
  const keys = [];
  const seen = new Set();
  for (const line of text.split("\n")) {
    section = sectionOf(line) ?? section;
    const match = line.match(/^\s*([A-Za-z_]+)\s*=\s*(\d+)\s*(?:#.*)?$/);
    if (!match) continue;
    if (portSpecs.some(([expectedSection, key]) => expectedSection === section && key === match[1])) {
      const identity = `${section}.${match[1]}`;
      if (seen.has(identity)) throw new Error(`preflight:ambiguous-supported-port:${identity}`);
      seen.add(identity);
      keys.push([section, match[1], Number(match[2])]);
    }
  }
  return keys;
}

function occurrences(text, pattern) {
  const globalPattern = pattern.flags.includes("g") ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
  return [...text.matchAll(globalPattern)].length;
}

function replaceExactlyOnce(text, pattern, replacement, label) {
  if (occurrences(text, pattern) !== 1) throw new Error(`preflight:${label}-replacement`);
  const result = text.replace(pattern, replacement);
  if (occurrences(result, pattern) !== 0) throw new Error(`preflight:${label}-replacement-not-unique`);
  return result;
}

function replaceAssignmentExactlyOnce(text, section, key, replacement, label, expectedOriginal = null) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const assignment = new RegExp(`^(\\s*${escapedKey}\\s*=\\s*)([^#\\r\\n]*?)(\\s*(?:#.*)?)$`);
  const lines = text.split("\n");
  let currentSection = null;
  const matches = [];
  for (const [index, line] of lines.entries()) {
    currentSection = sectionOf(line) ?? currentSection;
    const match = line.match(assignment);
    if (match && currentSection === section) matches.push({ index, match, originalValue: match[2].trim() });
  }
  if (matches.length !== 1) throw new Error(`preflight:${label}-assignment`);
  const { index, match, originalValue } = matches[0];
  if (expectedOriginal !== null && originalValue !== expectedOriginal) throw new Error(`preflight:${label}-original-value`);
  lines[index] = `${match[1]}${replacement}${match[3]}`;

  currentSection = null;
  const finalValues = [];
  for (const line of lines) {
    currentSection = sectionOf(line) ?? currentSection;
    const finalMatch = line.match(assignment);
    if (finalMatch && currentSection === section) finalValues.push(finalMatch[2].trim());
  }
  if (finalValues.length !== 1 || finalValues[0] !== replacement || finalValues.includes(originalValue) || (expectedOriginal !== null && finalValues.includes(expectedOriginal))) {
    throw new Error(`preflight:${label}-assignment-not-unique`);
  }
  return lines.join("\n");
}

function portAvailable(port) {
  return new Promise((resolveAvailability) => {
    const server = createServer();
    server.once("error", () => resolveAvailability(false));
    server.listen({ host: "127.0.0.1", port }, () => server.close(() => resolveAvailability(true)));
  });
}

function blockPorts(blockNumber, width) {
  if (!Number.isInteger(blockNumber) || !Number.isInteger(width) || width < 1 || width >= portBlockSize) throw new Error("ports:invalid-block");
  const base = portBlockStart + blockNumber * portBlockSize;
  return Array.from({ length: width }, (_, index) => base + index);
}

function replaceSupportedAssignment(text, section, key, original, replacement) {
  const lines = text.split("\n");
  let currentSection = null;
  const matches = [];
  lines.forEach((line, index) => {
    currentSection = sectionOf(line) ?? currentSection;
    if (currentSection === section && new RegExp(`^\\s*${key}\\s*=\\s*${original}\\s*(?:#.*)?$`).test(line)) matches.push(index);
  });
  if (matches.length !== 1) throw new Error(`preflight:port-replacement:${section}.${key}`);
  lines[matches[0]] = lines[matches[0]].replace(new RegExp(`(\\s*${key}\\s*=\\s*)${original}(\\s*(?:#.*)?)$`), `$1${replacement}$2`);
  currentSection = null;
  const finalValues = [];
  lines.forEach((line) => {
    currentSection = sectionOf(line) ?? currentSection;
    const match = line.match(new RegExp(`^\\s*${key}\\s*=\\s*([^#\\s]+)\\s*(?:#.*)?$`));
    if (match && currentSection === section) finalValues.push(match[1]);
  });
  if (finalValues.length !== 1 || finalValues[0] !== String(replacement) || finalValues.includes(String(original))) throw new Error(`preflight:port-replacement-not-unique:${section}.${key}`);
  return lines.join("\n");
}

if (process.argv.includes("--self-test")) {
  const source = 'project_id = "original-project"\n[db.seed]\nenabled = true\n[api]\nport = 54321\n';
  const dynamicProjectId = `self-test-project-${process.pid}-${Date.now()}`;
  let result = replaceAssignmentExactlyOnce(source, null, "project_id", `"${dynamicProjectId}"`, "project-id");
  result = replaceAssignmentExactlyOnce(result, "db.seed", "enabled", "false", "seed", "true");
  if (!new RegExp(`^project_id\\s*=\\s*"${dynamicProjectId}"\\s*$`, "m").test(result) || result.includes('"original-project"')) throw new Error("self-test:project-id-replacement");
  if (!/^enabled\s*=\s*false\s*$/m.test(result) || /^enabled\s*=\s*true\s*$/m.test(result)) throw new Error("self-test:seed-replacement");
  console.log("SELF-TEST runtime-bootstrap project-id and seed assignment replacement passed");
  process.exit(0);
}

async function reservePorts(source, runNumber) {
  const configured = configuredPortKeys(source);
  if (configured.length === 0) throw new Error("ports: no-supported-published-ports");
  const width = configured.length;
  mkdirSync(allocatorRoot, { recursive: true });
  for (let blockNumber = 0; blockNumber < 140; blockNumber += 1) {
    const base = portBlockStart + blockNumber * portBlockSize;
    const ports = blockPorts(blockNumber, width);
    const lock = join(allocatorRoot, `block-${blockNumber}`);
    try { mkdirSync(lock); } catch { continue; }
    activeLocks.add(lock);
    const available = (await Promise.all(ports.map(portAvailable))).every(Boolean);
    if (available) {
      const replacements = new Map(configured.map(([section, key], index) => [`${section}.${key}`, ports[index]]));
      writeFileSync(join(lock, "reservation"), `${process.pid}\n${runNumber}\n`);
      return { lock, base, ports, configured, replacements };
    }
    rmSync(lock, { recursive: true, force: true });
    activeLocks.delete(lock);
  }
  throw new Error("ports:unable-to-reserve-free-block");
}

function releaseLock(lock) {
  if (!lock) return;
  rmSync(lock, { recursive: true, force: true });
  activeLocks.delete(lock);
}

process.on("SIGINT", () => { receivedSignal = "SIGINT"; });
process.on("SIGTERM", () => { receivedSignal = "SIGTERM"; });

function execute(args, cwd, env) {
  const result = spawnSync("npx", ["supabase", ...args], { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return { status: result.status, signal: result.signal, error: result.error, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function child(script, cwd, env) {
  const result = spawnSync(process.execPath, [resolve(root, `scripts/${script}`)], { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return { status: result.status, signal: result.signal, error: result.error, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function failure(result) {
  return result.error ? "process-error" : result.signal ? `signal:${result.signal}` : `exit:${result.status ?? 1}`;
}

function sanitizeMessage(value) {
  return String(value || "")
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[redacted-url]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-jwt]")
    .replace(/\b(?:anon|service[_-]?role|api)[_-]?key\s*[=:]\s*["']?[^\s,"']+/gi, "[redacted-key]")
    .replace(/\b(?:password|token|secret)\s*[=:]\s*["']?[^\s,"']+/gi, "[redacted-secret]")
    .replace(/\b(?:RUNTIME_FIXTURES_OUTPUT|(?:fixture|contract)[_-]?(?:path|file))\s*[=:]\s*["']?[^\s,"']+/gi, "[redacted-path]")
    .replace(/\s+/g, " ").trim().slice(0, 180);
}

function safeError(result) {
  return sanitizeMessage(result.error?.message || result.stderr) || failure(result);
}

async function runOne(runNumber, workspace) {
  const started = Date.now();
  const record = { run: runNumber, phase: "workspace", status: "failed", exitCode: null, signal: null, durationMs: 0, cleanup: "pending", phases: {}, ports: null };
  let portReservation;
  try {
    workspace ??= mkdtempSync(join(tmpdir(), "talenthub-full-runtime-"));
    activeWorkspace = workspace;
    const supabaseDir = join(workspace, "supabase");
    const migrationsDir = join(supabaseDir, "migrations");
    mkdirSync(migrationsDir, { recursive: true });
    cpSync(config, join(supabaseDir, "config.toml"));
    const sourceConfig = readFileSync(join(supabaseDir, "config.toml"), "utf8");
    portReservation = await reservePorts(sourceConfig, runNumber);
    const projectAssignment = sourceConfig.match(/^project_id\s*=\s*"([^"]+)"\s*$/m);
    if (!projectAssignment || occurrences(sourceConfig, /^project_id\s*=.*$/gm) !== 1) throw new Error("preflight:project-id-assignment-ambiguous");
    const projectId = `talenthub-full-runtime-${process.pid}-${runNumber}-${Date.now()}-${createHash("sha256").update(`${process.pid}:${runNumber}:${Date.now()}`).digest("hex").slice(0, 8)}`;
    if (!/^talenthub-full-runtime-\d+-\d+-\d+-[a-f0-9]{8}$/.test(projectId) || projectId.length < 20 || projectId.length > 63 || projectIds.has(projectId)) throw new Error("preflight:project-id-invalid");
    projectIds.add(projectId);
    let generatedConfig = replaceAssignmentExactlyOnce(sourceConfig, null, "project_id", `"${projectId}"`, "project-id");
    if (occurrences(generatedConfig, /^project_id\s*=.*$/gm) !== 1 || !new RegExp(`^project_id\\s*=\\s*"${projectId}"\\s*$`, "m").test(generatedConfig) || generatedConfig.includes(`"${projectAssignment[1]}"`)) throw new Error("preflight:project-id-validation");
    generatedConfig = replaceAssignmentExactlyOnce(generatedConfig, "db.seed", "enabled", "false", "seed", "true");
    for (const [section, key, original] of portReservation.configured) {
      const replacement = portReservation.replacements.get(`${section}.${key}`);
      generatedConfig = replaceSupportedAssignment(generatedConfig, section, key, original, replacement);
    }
    const sourceValues = new Map(portReservation.configured.map(([section, key, value]) => [`${section}.${key}`, value]));
    const generatedValues = new Map(configuredPortKeys(generatedConfig).map(([section, key, value]) => [`${section}.${key}`, value]));
    const remainingDefaults = [...sourceValues].some(([identity, value]) => generatedValues.get(identity) === value);
    if (remainingDefaults) throw new Error("preflight:published-port-default-remains");
    writeFileSync(join(supabaseDir, "config.toml"), generatedConfig);
    record.ports = { block: portReservation.base, values: portReservation.ports };
    writeFileSync(join(migrationsDir, "00000000000000_full_runtime_baseline.sql"), sql);

    const workspaceBaseline = join(migrationsDir, "00000000000000_full_runtime_baseline.sql");
    const copiedSql = readFileSync(workspaceBaseline, "utf8");
    if (createHash("sha256").update(copiedSql).digest("hex") !== sha || copiedSql !== sql) throw new Error("preflight:baseline-copy-mismatch");
    for (const [key, expected] of [["purpose", "temporary local/future Full Staging QA only"], ["not_production_migration_history", "true"], ["post_baseline_delta_allowlist", "[]"]]) {
      if (metadata(key) !== expected || !new RegExp(`^-- ${key}:\\s*${expected.replace(/[.[\]\\]/g, "\\$&")}$`, "m").test(copiedSql)) throw new Error(`preflight:baseline-metadata:${key}`);
    }
    record.phases.preflight = { status: "passed" };

    const step = (phase, args, env = baseEnv, runner = execute) => {
      record.phase = phase;
      const result = runner(args, root, env);
      record.phases[phase] = { status: result.status === 0 ? "passed" : "failed", exitCode: result.status, signal: result.signal, error: result.status === 0 ? null : safeError(result) };
      if (result.status !== 0) {
        record.exitCode = result.status;
        record.signal = result.signal;
        throw new Error(`${phase}:${failure(result)}`);
      }
      return result;
    };
    step("start", ["start", "--workdir", workspace]);
    step("reset", ["db", "reset", "--workdir", workspace, "--no-seed", "--yes"]);
    record.phase = "status";
    const statusResult = execute(["status", "--workdir", workspace, "-o", "json"], root, baseEnv);
    record.phases.status = { status: statusResult.status === 0 ? "passed" : "failed", exitCode: statusResult.status, signal: statusResult.signal, error: statusResult.status === 0 ? null : safeError(statusResult) };
    if (statusResult.status !== 0) throw new Error(`status:${safeError(statusResult)}`);
    const statusJson = JSON.parse(statusResult.stdout ?? "{}");
    if (!statusJson.DB_URL || !statusJson.API_URL || !statusJson.ANON_KEY || !statusJson.SERVICE_ROLE_KEY) throw new Error("status:missing-required-local-endpoints");
    const commonEnv = { ...baseEnv, STAGING_BASELINE_PATH: join(migrationsDir, "00000000000000_full_runtime_baseline.sql"), STAGING_DATABASE_URL: statusJson.DB_URL, STAGING_DATABASE_SSL: "false", RUNTIME_SUPABASE_URL: statusJson.API_URL, RUNTIME_SUPABASE_ANON_KEY: statusJson.ANON_KEY, RUNTIME_SUPABASE_STAGING_URL: statusJson.API_URL, RUNTIME_SUPABASE_STAGING_CONFIRMATION: "staging-only", RUNTIME_FIXTURES_OUTPUT: join(workspace, "fixtures.json") };
    const provisionEnv = { ...commonEnv, RUNTIME_SUPABASE_SERVICE_ROLE_KEY: statusJson.SERVICE_ROLE_KEY };
    record.phase = "auth-readiness";
    const readiness = child("verify-auth-readiness-local.mjs", root, provisionEnv);
    record.phases["auth-readiness"] = { status: readiness.status === 0 ? "passed" : "failed", exitCode: readiness.status, signal: readiness.signal, error: readiness.status === 0 ? null : safeError(readiness) };
    if (readiness.status !== 0) { record.exitCode = readiness.status; record.signal = readiness.signal; throw new Error(`auth-readiness:${safeError(readiness)}`); }
    record.phase = "db-verifier";
    const check = child("verify-staging-bootstrap.mjs", root, commonEnv);
    record.phases["db-verifier"] = { status: check.status === 0 ? "passed" : "failed", exitCode: check.status, signal: check.signal, error: check.status === 0 ? null : safeError(check) };
    if (check.status !== 0) { record.exitCode = check.status; record.signal = check.signal; throw new Error(`db-verifier:${safeError(check)}`); }
    record.phase = "provision-1";
    const provision = child("provision-runtime-full-fixtures.mjs", root, provisionEnv);
    record.phases["provision-1"] = { status: provision.status === 0 ? "passed" : "failed", exitCode: provision.status, signal: provision.signal, error: provision.status === 0 ? null : safeError(provision) };
    if (provision.status !== 0) { record.exitCode = provision.status; record.signal = provision.signal; throw new Error(`provision-1:${safeError(provision)}`); }
    let contract;
    for (const phase of ["provision-2"]) { record.phase = phase; const rerun = child("provision-runtime-full-fixtures.mjs", root, provisionEnv); record.phases[phase] = { status: rerun.status === 0 ? "passed" : "failed", exitCode: rerun.status, signal: rerun.signal, error: rerun.status === 0 ? null : safeError(rerun) }; if (rerun.status !== 0) { record.exitCode = rerun.status; record.signal = rerun.signal; throw new Error(`${phase}:${safeError(rerun)}`); } }
    try { contract = JSON.parse(readFileSync(commonEnv.RUNTIME_FIXTURES_OUTPUT, "utf8")); if (!contract.env || contract.version !== 1) throw new Error("invalid-contract"); } catch (error) { throw new Error(`provision-2:${error.message}`); }
    record.phase = "runtime";
    const runtime = child("verify-runtime-full.mjs", root, { ...baseEnv, RUNTIME_SUPABASE_URL: commonEnv.RUNTIME_SUPABASE_URL, RUNTIME_SUPABASE_ANON_KEY: commonEnv.RUNTIME_SUPABASE_ANON_KEY, RUNTIME_FIXTURES_OUTPUT: commonEnv.RUNTIME_FIXTURES_OUTPUT, ...contract.env });
    record.phases.runtime = { status: runtime.status === 0 ? "passed" : "failed", exitCode: runtime.status, signal: runtime.signal, error: runtime.status === 0 ? null : safeError(runtime) };
    if (runtime.status !== 0) { record.exitCode = runtime.status; record.signal = runtime.signal; throw new Error(`runtime:${safeError(runtime)}`); }
    record.phase = "complete";
    record.status = "passed";
  } catch (error) {
    record.status = "failed";
    record.message = sanitizeMessage(error instanceof Error ? error.message : "run-failed") || "run-failed";
  } finally {
    record.phase = record.status === "passed" ? "cleanup" : record.phase;
    if (workspace) {
      const stop = execute(["stop", "--workdir", workspace, "--no-backup"], root, baseEnv);
      record.phases.cleanup = { status: stop.status === 0 ? "passed" : "failed", exitCode: stop.status, signal: stop.signal, error: stop.status === 0 ? null : safeError(stop) };
      record.cleanup = stop.status === 0 ? "passed" : `failed:${failure(stop)}`;
      // The allocator is released only after a confirmed stop: if (stop.status === 0) releaseLock.
      if (stop.status === 0) {
        try {
          rmSync(workspace, { recursive: true, force: true });
          releaseLock(portReservation?.lock);
        } catch (error) {
          record.cleanup = `failed:quarantined:${sanitizeMessage(error?.message) || "workspace-removal-failed"}`;
          record.phases.cleanup.error = record.cleanup;
        }
      }
      if (stop.status !== 0) record.cleanup = `failed:quarantined:${failure(stop)}`;
    } else record.cleanup = "failed:no-workspace";
    // A failed stop intentionally retains the reservation as a quarantine marker.
    activeWorkspace = null;
    record.durationMs = Date.now() - started;
  }
  return record;
}

console.log(`bootstrap:runtime-full mode=cold-${runCount} baseline_sha256=${sha} runs=${runCount} ports=isolated port-block=allocated`);
const results = [];
  for (let runNumber = 1; runNumber <= runCount; runNumber += 1) results.push(await runOne(runNumber));
for (const result of results) {
  const detail = result.message ? ` message=${result.message}` : "";
  console.log(`bootstrap:runtime-full run=${result.run} phase=${result.phase} status=${result.status} exitCode=${result.exitCode ?? "none"} signal=${result.signal ?? "none"} durationMs=${result.durationMs} cleanup=${result.cleanup} ports=${result.ports ? "isolated" : "none"} port-block=${result.ports?.block ?? "none"}${detail}`);
}
// Successful reservations are released after a confirmed stop. Failed stops remain
// quarantined on disk so a later runner cannot reuse potentially-live ports.
if (receivedSignal) process.exitCode = receivedSignal === "SIGINT" ? 130 : 143;
if (results.some((result) => result.status !== "passed" || result.cleanup !== "passed")) process.exitCode = 1;
