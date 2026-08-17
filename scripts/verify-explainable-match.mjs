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

const matchingModule = loadTsModule(resolve(rootDir, "apps/web/src/lib/utils/matching.ts"));
const { computeMatchScore, computeExplainableMatch } = matchingModule;

function baseJob(overrides = {}) {
  return {
    id: "job-1",
    title: "Desarrollador Web",
    description: "Buscamos desarrollador con experiencia en react y nodejs",
    specialty: "Informática",
    requirements: "",
    type: "full-time",
    ...overrides,
  };
}

const cases = [
  {
    label: "exact formula parity with full match",
    job: baseJob(),
    specialty: "Informática",
    skills: ["react", "nodejs"],
    expectedTotal: computeMatchScore(["react", "nodejs"], "Informática", baseJob()),
  },
  {
    label: "specialty mismatch and no skills",
    job: baseJob(),
    specialty: "Mecatrónica",
    skills: [],
    expectedTotal: computeMatchScore([], "Mecatrónica", baseJob()),
  },
  {
    label: "skills capped at 50",
    job: baseJob({ description: "react nodejs javascript typescript html css python sql aws docker" }),
    specialty: "Otra",
    skills: ["react", "nodejs", "javascript", "typescript", "html", "css", "python"],
    expectedTotal: computeMatchScore(
      ["react", "nodejs", "javascript", "typescript", "html", "css", "python"],
      "Otra",
      baseJob({ description: "react nodejs javascript typescript html css python sql aws docker" })
    ),
  },
  {
    label: "accent and case normalization",
    job: baseJob({ specialty: "Mecatrónica", description: "práctica profesional" }),
    specialty: "mecatronica",
    skills: [],
    expectedTotal: computeMatchScore([], "mecatronica", baseJob({ specialty: "Mecatrónica", description: "práctica profesional" })),
  },
  {
    label: "internship/practice 10-point branch",
    job: baseJob({ type: "pasantia", description: "Buscamos practicante" }),
    specialty: "Informática",
    skills: ["react"],
    expectedTotal: computeMatchScore(["react"], "Informática", baseJob({ type: "pasantia", description: "Buscamos practicante" })),
  },
  {
    label: "duplicate user skills counted up to cap",
    job: baseJob(),
    specialty: "Informática",
    skills: ["react", "react", "react", "react", "react", "react"],
    expectedTotal: computeMatchScore(["react", "react", "react", "react", "react", "react"], "Informática", baseJob()),
  },
  {
    label: "empty inputs",
    job: baseJob(),
    specialty: "",
    skills: [],
    expectedTotal: computeMatchScore([], "", baseJob()),
  },
  {
    label: "total capped at 100",
    job: baseJob({
      specialty: "Informática",
      description: "react nodejs javascript typescript html css python sql aws docker práctica",
      type: "pasantia",
    }),
    specialty: "Informática",
    skills: ["react", "nodejs", "javascript", "typescript", "html", "css", "python", "sql", "aws", "docker"],
    student: { availability: "Disponible" },
    expectedTotal: 100,
  },
  {
    label: "profile without specialty or skills still explained",
    job: baseJob(),
    specialty: "",
    skills: [],
    expectedTotal: 0,
  },
];

let passed = 0;
for (const testCase of cases) {
  const explanation = computeExplainableMatch(testCase.job, testCase.specialty, testCase.skills, testCase.student);
  const legacyScore = computeMatchScore(testCase.skills, testCase.specialty, testCase.job, testCase.student);

  if (explanation.total !== testCase.expectedTotal) {
    throw new Error(
      `${testCase.label}: expected total ${testCase.expectedTotal}, received ${explanation.total}`,
    );
  }
  if (explanation.total !== legacyScore) {
    throw new Error(
      `${testCase.label}: explainable total ${explanation.total} differs from legacy computeMatchScore ${legacyScore}`,
    );
  }

  // Structural sanity checks
  if (explanation.total !== explanation.factors.specialty.awarded + explanation.factors.skills.awarded + explanation.factors.practice.awarded) {
    // capped at 100 can make this differ; only enforce for totals <= 100
    if (explanation.total < 100) {
      throw new Error(`${testCase.label}: factor sum does not equal total`);
    }
  }

  if (explanation.factors.specialty.max !== 40) {
    throw new Error(`${testCase.label}: specialty max must be 40`);
  }
  if (explanation.factors.skills.max !== 50) {
    throw new Error(`${testCase.label}: skills max must be 50`);
  }
  if (explanation.factors.practice.max !== 10) {
    throw new Error(`${testCase.label}: practice max must be 10`);
  }

  passed++;
}

console.log(`verify:explainable-match passed ${passed} canonical cases.`);
