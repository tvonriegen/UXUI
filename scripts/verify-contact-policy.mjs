import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("../apps/web/node_modules/typescript");
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadTsModule(filePath, requireMap = {}) {
  const source = readFileSync(filePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (requireMap[id]) return requireMap[id];
    return require(id);
  };

  vm.runInNewContext(`(function (exports, require, module) { ${output}\n})`, { console })(
    module.exports,
    localRequire,
    module,
  );
  return module.exports;
}

const isMinorModule = loadTsModule(resolve(rootDir, "apps/web/src/lib/utils/is-minor.ts"));
const contactPolicyModule = loadTsModule(resolve(rootDir, "apps/web/src/lib/services/contact-policy.ts"), {
  "@/lib/utils/is-minor": isMinorModule,
});

const { decideContactPath } = contactPolicyModule;

const cases = [
  {
    label: "self-contact is denied before role routing",
    input: {
      callerId: "user-1",
      callerRole: "Empresa",
      talentId: "user-1",
      talentRole: "Egresado",
      talentAge: 20,
      talentSchoolId: null,
    },
    expected: { kind: "self" },
  },
  {
    label: "company contacting minor student with school needs school approval",
    input: {
      callerId: "company-1",
      callerRole: "Empresa",
      talentId: "student-1",
      talentRole: "Estudiante",
      talentAge: 17,
      talentSchoolId: "school-1",
    },
    expected: { kind: "needs_school_approval", schoolId: "school-1" },
  },
  {
    label: "company contacting minor student without school is missing school",
    input: {
      callerId: "company-1",
      callerRole: "Empresa",
      talentId: "student-1",
      talentRole: "Estudiante",
      talentAge: null,
      talentSchoolId: null,
    },
    expected: { kind: "missing_school" },
  },
  {
    label: "company contacting graduate is direct",
    input: {
      callerId: "company-1",
      callerRole: "Empresa",
      talentId: "graduate-1",
      talentRole: "Egresado",
      talentAge: 17,
      talentSchoolId: null,
    },
    expected: { kind: "direct" },
  },
  {
    label: "company contacting non-minor student is direct",
    input: {
      callerId: "company-1",
      callerRole: "Empresa",
      talentId: "student-1",
      talentRole: "Estudiante",
      talentAge: 18,
      talentSchoolId: "school-1",
    },
    expected: { kind: "direct" },
  },
  {
    label: "school contacting own student is direct",
    input: {
      callerId: "school-1",
      callerRole: "Colegio",
      talentId: "student-1",
      talentRole: "Estudiante",
      talentAge: 16,
      talentSchoolId: "school-1",
    },
    expected: { kind: "direct" },
  },
  {
    label: "school contacting another school's student is not allowed",
    input: {
      callerId: "school-1",
      callerRole: "Colegio",
      talentId: "student-1",
      talentRole: "Estudiante",
      talentAge: 16,
      talentSchoolId: "school-2",
    },
    expected: { kind: "not_allowed" },
  },
  {
    label: "unknown caller role is unknown role",
    input: {
      callerId: "user-1",
      callerRole: "Admin",
      talentId: "student-1",
      talentRole: "Estudiante",
      talentAge: 16,
      talentSchoolId: "school-1",
    },
    expected: { kind: "unknown_role", role: "Admin" },
  },
];

for (const testCase of cases) {
  const actual = decideContactPath(testCase.input);
  if (JSON.stringify(actual) !== JSON.stringify(testCase.expected)) {
    throw new Error(
      `${testCase.label}: expected ${JSON.stringify(testCase.expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

console.log(`verify:contact-policy passed ${cases.length} canonical cases.`);
