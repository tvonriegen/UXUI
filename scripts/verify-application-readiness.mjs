import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("../apps/web/node_modules/typescript");
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadTsModule(filePath) {
  const source = readFileSync(filePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function (exports, require, module) { ${output}\n})`, { console })(
    module.exports,
    require,
    module,
  );
  return module.exports;
}

const readinessModule = loadTsModule(
  resolve(rootDir, "apps/web/src/lib/utils/application-readiness.ts"),
);
const { computeApplicationReadiness, APPLICATION_READINESS_MODEL_VERSION } = readinessModule;

function baseInput(overrides = {}) {
  return {
    isAuthenticated: true,
    profile: { status: "loaded", specialty: "Informática", bio: "Soy desarrollador.", availability: "Inmediata" },
    skills: { status: "loaded", names: ["react", "nodejs"] },
    evidence: { status: "loaded", portfolioCount: 2, certificationCount: 1 },
    opportunity: { id: "job-1", active: true, title: "Desarrollador Web" },
    application: { hasApplied: false, isApplying: false },
    match: { score: 85, label: "Excelente" },
    ...overrides,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(`${message}: expected to include "${needle}", got "${haystack}"`);
  }
}

const cases = [
  {
    label: "perfil completo permite postular",
    input: baseInput(),
    checks: (result) => {
      assert(result.canApply, "canApply must be true");
      assert(result.overallState === "ready", `expected ready, got ${result.overallState}`);
      assert(result.recommendations.length === 0, "no recommendations expected");
      assert(result.blockingIssues.length === 0, "no blockers expected");
    },
  },
  {
    label: "sin especialidad no bloquea",
    input: baseInput({ profile: { status: "loaded", specialty: null, bio: "Soy desarrollador.", availability: "Inmediata" } }),
    checks: (result) => {
      assert(result.canApply, "canApply must be true");
      assert(result.overallState === "recommended", `expected recommended, got ${result.overallState}`);
      assert(result.items.some((i) => i.id === "specialty-recommended"), "specialty recommendation missing");
    },
  },
  {
    label: "sin competencias no bloquea",
    input: baseInput({ skills: { status: "loaded", names: [] } }),
    checks: (result) => {
      assert(result.canApply, "canApply must be true");
      assert(result.overallState === "recommended", `expected recommended, got ${result.overallState}`);
      assert(result.items.some((i) => i.id === "skills-recommended"), "skills recommendation missing");
    },
  },
  {
    label: "sin evidencia no bloquea",
    input: baseInput({ evidence: { status: "loaded", portfolioCount: 0, certificationCount: 0 } }),
    checks: (result) => {
      assert(result.canApply, "canApply must be true");
      assert(result.overallState === "recommended", `expected recommended, got ${result.overallState}`);
      assert(result.items.some((i) => i.id === "evidence-recommended"), "evidence recommendation missing");
    },
  },
  {
    label: "sin bio no bloquea",
    input: baseInput({ profile: { status: "loaded", specialty: "Informática", bio: null, availability: "Inmediata" } }),
    checks: (result) => {
      assert(result.canApply, "canApply must be true");
      assert(result.items.some((i) => i.id === "bio-recommended"), "bio recommendation missing");
    },
  },
  {
    label: "disponibilidad no actualizada no bloquea",
    input: baseInput({ profile: { status: "loaded", specialty: "Informática", bio: "Soy desarrollador.", availability: null } }),
    checks: (result) => {
      assert(result.canApply, "canApply must be true");
      assert(result.items.some((i) => i.id === "availability-recommended"), "availability recommendation missing");
    },
  },
  {
    label: "score bajo no bloquea",
    input: baseInput({ match: { score: 15, label: "Bajo" } }),
    checks: (result) => {
      assert(result.canApply, "canApply must be true");
      assert(result.overallState === "ready", `expected ready, got ${result.overallState}`);
      assert(result.items.some((i) => i.id === "match-info" && i.type === "informational"), "match must be informational");
    },
  },
  {
    label: "oportunidad cerrada bloquea",
    input: baseInput({ opportunity: { id: "job-1", active: false, title: "Desarrollador Web" } }),
    checks: (result) => {
      assert(!result.canApply, "canApply must be false");
      assert(result.overallState === "blocked", `expected blocked, got ${result.overallState}`);
      assert(result.items.some((i) => i.id === "opportunity-inactive"), "inactive blocker missing");
    },
  },
  {
    label: "ya postulado bloquea",
    input: baseInput({ application: { hasApplied: true, isApplying: false } }),
    checks: (result) => {
      assert(!result.canApply, "canApply must be false");
      assert(result.overallState === "blocked", `expected blocked, got ${result.overallState}`);
      assert(result.items.some((i) => i.id === "already-applied"), "already-applied blocker missing");
    },
  },
  {
    label: "request en curso bloquea doble envio",
    input: baseInput({ application: { hasApplied: false, isApplying: true } }),
    checks: (result) => {
      assert(!result.canApply, "canApply must be false");
      assert(result.overallState === "blocked", `expected blocked, got ${result.overallState}`);
      assert(result.items.some((i) => i.id === "applying"), "applying blocker missing");
    },
  },
  {
    label: "error de carga de perfil no asume ausencia falsa",
    input: baseInput({
      profile: { status: "error", specialty: null, bio: null, availability: null },
    }),
    checks: (result) => {
      assert(result.canApply, "canApply must be true (no real blockers)");
      assert(result.items.some((i) => i.id === "profile-error" && i.type === "informational"), "profile error informational missing");
      assert(!result.items.some((i) => i.id === "specialty-recommended"), "must not assume missing specialty on profile error");
      assert(!result.items.some((i) => i.id === "bio-recommended"), "must not assume missing bio on profile error");
      assert(!result.items.some((i) => i.id === "availability-recommended"), "must not assume missing availability on profile error");
    },
  },
  {
    label: "error de carga complementaria produce informational",
    input: baseInput({
      evidence: { status: "error", portfolioCount: 0, certificationCount: 0 },
      skills: { status: "error", names: [] },
    }),
    checks: (result) => {
      assert(result.canApply, "canApply must be true (no real blockers)");
      assert(result.items.some((i) => i.id === "evidence-error" && i.type === "informational"), "evidence error informational missing");
      assert(result.items.some((i) => i.id === "skills-error" && i.type === "informational"), "skills error informational missing");
      assert(!result.items.some((i) => i.id === "evidence-recommended"), "must not assume missing evidence on error");
      assert(!result.items.some((i) => i.id === "skills-recommended"), "must not assume missing skills on error");
    },
  },
  {
    label: "varias recomendaciones permiten postular de todas formas",
    input: baseInput({
      profile: { status: "loaded", specialty: null, bio: null, availability: null },
      skills: { status: "loaded", names: [] },
      evidence: { status: "loaded", portfolioCount: 0, certificationCount: 0 },
    }),
    checks: (result) => {
      assert(result.canApply, "canApply must be true");
      assert(result.overallState === "recommended", `expected recommended, got ${result.overallState}`);
      assert(result.recommendations.length >= 4, `expected several recommendations, got ${result.recommendations.length}`);
      assert(result.completedItems.length === 0, "no completed items expected");
    },
  },
  {
    label: "disponibilidad explicita No disponible no bloquea y genera recomendacion",
    input: baseInput({ profile: { status: "loaded", specialty: "Informática", bio: "Soy desarrollador.", availability: "No disponible" } }),
    checks: (result) => {
      assert(result.canApply, "canApply must be true");
      assert(result.overallState === "recommended", `expected recommended, got ${result.overallState}`);
      assert(result.items.some((i) => i.id === "availability-recommended"), "availability recommendation missing");
      assertIncludes(result.items.find((i) => i.id === "availability-recommended")?.explanation ?? "", "Puedes actualizar", "explanation should suggest updating");
    },
  },
  {
    label: "suma resumen estable y determinista",
    input: baseInput(),
    checks: (result) => {
      const ids = result.items.map((i) => i.id).join(",");
      const ids2 = computeApplicationReadiness(baseInput()).items.map((i) => i.id).join(",");
      assert(ids === ids2, `item order must be deterministic: ${ids} vs ${ids2}`);
      assertIncludes(result.summary, "listo", "summary should mention ready state");
      assert(result.modelVersion === APPLICATION_READINESS_MODEL_VERSION, "modelVersion mismatch");
    },
  },
];

let passed = 0;
for (const testCase of cases) {
  const result = computeApplicationReadiness(testCase.input);
  testCase.checks(result);
  passed++;
}

console.log(`verify:application-readiness passed ${passed} cases.`);
