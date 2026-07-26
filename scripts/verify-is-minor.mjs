const cases = [
  { role: "Estudiante", age: null, expected: true, label: "student with unknown age is treated as minor" },
  { role: "Estudiante", age: 17, expected: true, label: "student under 18 is minor" },
  { role: "Estudiante", age: 18, expected: false, label: "student age 18 is not minor" },
  { role: "Estudiante", age: 25, expected: false, label: "adult student is not minor" },
  { role: "Egresado", age: 17, expected: false, label: "graduate is not minor-routed" },
  { role: "Empresa", age: null, expected: false, label: "company is not minor-routed" },
  { role: "Colegio", age: null, expected: false, label: "school is not minor-routed" },
];

function isMinorProfile(role, age) {
  return role === "Estudiante" && (age == null || age < 18);
}

for (const testCase of cases) {
  const actual = isMinorProfile(testCase.role, testCase.age);
  if (actual !== testCase.expected) {
    throw new Error(`${testCase.label}: expected ${testCase.expected}, received ${actual}`);
  }
}

console.log(`verify:is-minor passed ${cases.length} canonical cases.`);
