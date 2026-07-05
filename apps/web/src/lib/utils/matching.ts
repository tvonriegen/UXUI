// ──────────────────────────────────────────────────────────────────
// Smart Matching – compares a student's profile against job postings
// to produce a 0-100 compatibility score.
//
// Logic (no ML required — pure relational scoring):
//   40 pts  Specialty match  (student specialty vs job specialty)
//   50 pts  Skill overlap    (10 pts per matched skill, capped)
//   10 pts  Availability     (job explicitly needs interns/práctica)
// ──────────────────────────────────────────────────────────────────

/** Strip accents so "Mecatrónica" === "Mecatronica" in comparisons */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface JobForMatch {
  id:           string;
  title:        string;
  description:  string;
  specialty:    string;
  requirements?: string;
  type?:        string;
}

/**
 * Returns an integer 0–100 representing how well the student matches the job.
 * @param studentSkills  Array of skill names the student has (from user_skills)
 * @param studentSpecialty  Student's primary specialty (from profiles.specialty)
 * @param job  The job posting to score against
 */
export function computeMatchScore(
  studentSkills: string[],
  studentSpecialty: string,
  job: JobForMatch
): number {
  let score = 0;

  // ── Specialty match → up to 40 pts ──────────────────────────────
  if (studentSpecialty && job.specialty) {
    const sSpec = normalize(studentSpecialty);
    const jSpec = normalize(job.specialty);
    // Full match or either contains the first word of the other
    if (
      sSpec === jSpec ||
      jSpec.includes(normalize(sSpec.split(" ")[0])) ||
      sSpec.includes(normalize(jSpec.split(" ")[0]))
    ) {
      score += 40;
    }
  }

  // ── Skill overlap → up to 50 pts (10 per skill) ─────────────────
  const jobText = normalize(
    `${job.title} ${job.description} ${job.specialty} ${job.requirements ?? ""}`
  );
  const matchingSkills = studentSkills.filter((skill) =>
    jobText.includes(normalize(skill))
  );
  score += Math.min(matchingSkills.length * 10, 50);

  // ── Práctica / intern boost → 10 pts ─────────────────────────────
  if (
    jobText.includes("practic") ||
    jobText.includes("intern") ||
    normalize(job.type ?? "").includes("practic")
  ) {
    score += 10;
  }

  return Math.min(score, 100);
}

/** Human-readable label for a match score */
export function getMatchLabel(score: number): string {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bueno";
  if (score >= 40) return "Regular";
  return "Bajo";
}

/**
 * Tailwind colour token for a score.
 * Use as: `text-${getMatchColor(score)}-600` etc.
 */
export function getMatchColor(score: number): "emerald" | "cyan" | "amber" | "slate" {
  if (score >= 80) return "emerald";
  if (score >= 60) return "cyan";
  if (score >= 40) return "amber";
  return "slate";
}
