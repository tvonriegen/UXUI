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

/** Factor-level detail returned by the explainable API. */
export interface ExplainableMatchFactor {
  max: number;
  awarded: number;
  status: "matched" | "partial" | "missing";
  label: string;
  explanation: string;
}

/** Full explainable match result (serializable, UI-safe). */
export interface ExplainableMatchResult {
  total: number;
  label: string;
  factors: {
    specialty: ExplainableMatchFactor;
    skills: ExplainableMatchFactor & {
      matchedCount: number;
      matchedSkills: { name: string; count: number }[];
      capped: boolean;
    };
    practice: ExplainableMatchFactor;
  };
  guidance: string;
}

/** Internal, shared scoring breakdown. Kept private to keep the public surface small. */
interface MatchBreakdown {
  total: number;
  specialty: { max: 40; awarded: number; matched: boolean };
  skills: {
    max: 50;
    awarded: number;
    rawMatched: string[];
    matchedSkills: { name: string; count: number }[];
    capped: boolean;
  };
  practice: { max: 10; awarded: number; matched: boolean };
}

function scoreSpecialty(studentSpecialty: string, jobSpecialty: string): MatchBreakdown["specialty"] {
  if (!studentSpecialty || !jobSpecialty) {
    return { max: 40, awarded: 0, matched: false };
  }
  const sSpec = normalize(studentSpecialty);
  const jSpec = normalize(jobSpecialty);
  const matched =
    sSpec === jSpec ||
    jSpec.includes(normalize(sSpec.split(" ")[0])) ||
    sSpec.includes(normalize(jSpec.split(" ")[0]));
  return { max: 40, awarded: matched ? 40 : 0, matched };
}

function scoreSkills(studentSkills: string[], job: JobForMatch): MatchBreakdown["skills"] {
  const jobText = normalize(
    `${job.title} ${job.description} ${job.specialty} ${job.requirements ?? ""}`
  );
  const rawMatched = studentSkills.filter((skill) =>
    jobText.includes(normalize(skill))
  );
  const awarded = Math.min(rawMatched.length * 10, 50);

  // Preserve raw count for parity, but deduplicate for the UI and surface counts
  // so duplicate skills are transparent without inflating the listed skill names.
  const counts = new Map<string, { name: string; count: number }>();
  for (const skill of rawMatched) {
    const key = normalize(skill);
    const current = counts.get(key);
    if (current) {
      current.count += 1;
    } else {
      counts.set(key, { name: skill, count: 1 });
    }
  }
  const matchedSkills = Array.from(counts.values());

  return {
    max: 50,
    awarded,
    rawMatched,
    matchedSkills,
    capped: rawMatched.length > 5,
  };
}

function scorePractice(job: JobForMatch): MatchBreakdown["practice"] {
  const jobText = normalize(
    `${job.title} ${job.description} ${job.specialty} ${job.requirements ?? ""}`
  );
  const matched =
    jobText.includes("practic") ||
    jobText.includes("intern") ||
    normalize(job.type ?? "").includes("practic");
  return { max: 10, awarded: matched ? 10 : 0, matched };
}

function buildMatchBreakdown(
  studentSkills: string[],
  studentSpecialty: string,
  job: JobForMatch
): MatchBreakdown {
  const specialty = scoreSpecialty(studentSpecialty, job.specialty);
  const skills = scoreSkills(studentSkills, job);
  const practice = scorePractice(job);
  const total = Math.min(specialty.awarded + skills.awarded + practice.awarded, 100);
  return { total, specialty, skills, practice };
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
  return buildMatchBreakdown(studentSkills, studentSpecialty, job).total;
}

/**
 * Explainable version of {@link computeMatchScore}.
 * Returns the same total score plus a transparent factor breakdown.
 *
 * @param job  The job posting to score against
 * @param profileSpecialty  Student's primary specialty (from profiles.specialty)
 * @param userSkillNames  Array of skill names the student has (from user_skills)
 */
export function computeExplainableMatch(
  job: JobForMatch,
  profileSpecialty: string,
  userSkillNames: string[]
): ExplainableMatchResult {
  const breakdown = buildMatchBreakdown(userSkillNames, profileSpecialty, job);
  const total = breakdown.total;

  const specialtyFactor: ExplainableMatchResult["factors"]["specialty"] = {
    max: breakdown.specialty.max,
    awarded: breakdown.specialty.awarded,
    status: breakdown.specialty.matched ? "matched" : profileSpecialty && job.specialty ? "missing" : "partial",
    label: breakdown.specialty.matched
      ? "Coincide"
      : profileSpecialty && job.specialty
      ? "Sin coincidencia"
      : "No disponible",
    explanation: breakdown.specialty.matched
      ? `Tu especialidad (${profileSpecialty}) coincide con la especialidad solicitada (${job.specialty}).`
      : profileSpecialty && job.specialty
      ? `No encontramos coincidencias de especialidad con la información disponible: tu perfil indica ${profileSpecialty} y la vacante indica ${job.specialty}.`
      : "No hay especialidad disponible en el perfil o en la vacante para comparar.",
  };

  const skillsFactor: ExplainableMatchResult["factors"]["skills"] = {
    max: breakdown.skills.max,
    awarded: breakdown.skills.awarded,
    status: breakdown.skills.awarded > 0 ? (breakdown.skills.capped ? "partial" : "matched") : "missing",
    label: breakdown.skills.awarded > 0
      ? breakdown.skills.capped
        ? "Parcial (tope alcanzado)"
        : "Coincide"
      : "No coincide",
    explanation: breakdown.skills.awarded > 0
      ? `${breakdown.skills.rawMatched.length} de tus habilidades aparecen en la vacante${
          breakdown.skills.capped ? ", alcanzando el tope de 50 puntos" : ""
        }.`
      : "No encontramos competencias de tu perfil en la información disponible de esta vacante.",
    matchedCount: breakdown.skills.rawMatched.length,
    matchedSkills: breakdown.skills.matchedSkills,
    capped: breakdown.skills.capped,
  };

  const practiceFactor: ExplainableMatchResult["factors"]["practice"] = {
    max: breakdown.practice.max,
    awarded: breakdown.practice.awarded,
    status: breakdown.practice.matched ? "matched" : "missing",
    label: breakdown.practice.matched ? "Aplica" : "No aplica",
    explanation: breakdown.practice.matched
      ? "La vacante menciona práctica profesional o pasantía."
      : "La vacante no menciona práctica profesional o pasantía.",
  };

  return {
    total,
    label: getMatchLabel(total),
    factors: {
      specialty: specialtyFactor,
      skills: skillsFactor,
      practice: practiceFactor,
    },
    guidance:
      "Este puntaje es una orientación de compatibilidad y no una decisión de selección. La empresa evalúa cada postulación según sus propios criterios.",
  };
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
