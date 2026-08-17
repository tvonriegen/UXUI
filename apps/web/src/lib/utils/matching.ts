// ──────────────────────────────────────────────────────────────────
// Smart Matching – compares a student's profile against job postings
// to produce a 0-100 compatibility score.
//
// Logic (no ML required — pure relational scoring):
//   40 pts  Specialty relevance
//   50 pts  Required/preferred skill coverage
//   10 pts  Student availability
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
  requiredSkills?: string[];
  preferredSkills?: string[];
  minimumExperienceYears?: number | null;
  workMode?: "onsite" | "hybrid" | "remote" | null;
}

export interface StudentForMatch {
  availability?: string | null;
  yearsExperience?: number | null;
  location?: string | null;
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
      missingSkills: string[];
      isStructured: boolean;
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
    missingSkills: string[];
    isStructured: boolean;
    matchedSkills: { name: string; count: number }[];
    capped: boolean;
  };
  practice: {
    max: 10; awarded: number; matched: boolean; known: boolean;
    availabilityMatched: boolean; experienceRequired: number | null; experienceMatched: boolean | null;
  };
}

function scoreSpecialty(studentSpecialty: string, jobSpecialty: string): MatchBreakdown["specialty"] {
  if (!studentSpecialty || !jobSpecialty) {
    return { max: 40, awarded: 0, matched: false };
  }
  const sSpec = normalize(studentSpecialty);
  const jSpec = normalize(jobSpecialty);
  const sTokens = new Set(sSpec.split(/\s+/).filter((token) => token.length > 3));
  const jTokens = new Set(jSpec.split(/\s+/).filter((token) => token.length > 3));
  const overlap = Array.from(sTokens).filter((token) => jTokens.has(token)).length;
  const ratio = overlap / Math.max(sTokens.size, jTokens.size, 1);
  const awarded = sSpec === jSpec ? 40 : ratio >= 0.5 ? 30 : overlap > 0 ? 15 : 0;
  return { max: 40, awarded, matched: awarded === 40 };
}

function scoreSkills(studentSkills: string[], job: JobForMatch): MatchBreakdown["skills"] {
  const jobText = normalize(
    `${job.title} ${job.description} ${job.specialty} ${job.requirements ?? ""}`
  );
  const uniqueStudentSkills = Array.from(new Map(studentSkills.map((skill) => [normalize(skill.trim()), skill.trim()])).values())
    .filter(Boolean);
  const requiredSkills = Array.from(new Map((job.requiredSkills ?? []).map((skill) => [normalize(skill.trim()), skill.trim()])).values()).filter(Boolean);
  const preferredSkills = Array.from(new Map((job.preferredSkills ?? []).map((skill) => [normalize(skill.trim()), skill.trim()])).values()).filter(Boolean);
  const structuredSkills = [...requiredSkills, ...preferredSkills];
  const isStructured = structuredSkills.length > 0;
  const requestedSkills = Array.from(new Map(structuredSkills.map((skill) => [normalize(skill), skill])).values());
  const skillsMatch = (studentSkill: string, requestedSkill: string) => {
    const student = normalize(studentSkill);
    const requested = normalize(requestedSkill);
    return student === requested || (student.length >= 4 && requested.includes(student)) || (requested.length >= 4 && student.includes(requested));
  };
  const rawMatched = isStructured
    ? requestedSkills.filter((required) => uniqueStudentSkills.some((skill) => skillsMatch(skill, required)))
    : uniqueStudentSkills.filter((skill) => normalize(skill).length >= 3 && jobText.includes(normalize(skill)));
  const missingSkills = isStructured
    ? requestedSkills.filter((required) => !uniqueStudentSkills.some((skill) => skillsMatch(skill, required)))
    : [];
  const matchedRequired = requiredSkills.filter((required) => uniqueStudentSkills.some((skill) => skillsMatch(skill, required))).length;
  const matchedPreferred = preferredSkills.filter((preferred) => uniqueStudentSkills.some((skill) => skillsMatch(skill, preferred))).length;
  const awarded = isStructured
    ? requiredSkills.length > 0 && preferredSkills.length > 0
      ? Math.round((matchedRequired / requiredSkills.length) * 40 + (matchedPreferred / preferredSkills.length) * 10)
      : Math.round((rawMatched.length / requestedSkills.length) * 50)
    : Math.min(rawMatched.length * 10, 50);

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
    missingSkills,
    isStructured,
    matchedSkills,
    capped: rawMatched.length > 5,
  };
}

function scoreAvailability(job: JobForMatch, student?: StudentForMatch): MatchBreakdown["practice"] {
  const value = normalize(student?.availability ?? "").trim();
  const availabilityMatched = Boolean(value) && value !== "no disponible";
  const experienceRequired = job.minimumExperienceYears ?? null;
  const experienceKnown = student?.yearsExperience != null;
  const experienceMatched = experienceRequired == null ? null : experienceKnown ? student!.yearsExperience! >= experienceRequired : false;
  const awarded = experienceRequired == null
    ? availabilityMatched ? 10 : 0
    : (availabilityMatched ? 5 : 0) + (experienceMatched ? 5 : 0);
  return {
    max: 10,
    awarded,
    matched: awarded === 10,
    known: Boolean(value) && (experienceRequired == null || experienceKnown),
    availabilityMatched,
    experienceRequired,
    experienceMatched,
  };
}

function buildMatchBreakdown(
  studentSkills: string[],
  studentSpecialty: string,
  job: JobForMatch,
  student?: StudentForMatch,
): MatchBreakdown {
  const specialty = scoreSpecialty(studentSpecialty, job.specialty);
  const skills = scoreSkills(studentSkills, job);
  const practice = scoreAvailability(job, student);
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
  job: JobForMatch,
  student?: StudentForMatch,
): number {
  return buildMatchBreakdown(studentSkills, studentSpecialty, job, student).total;
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
  userSkillNames: string[],
  student?: StudentForMatch,
): ExplainableMatchResult {
  const breakdown = buildMatchBreakdown(userSkillNames, profileSpecialty, job, student);
  const total = breakdown.total;

  const specialtyFactor: ExplainableMatchResult["factors"]["specialty"] = {
    max: breakdown.specialty.max,
    awarded: breakdown.specialty.awarded,
    status: breakdown.specialty.awarded === 40 ? "matched" : breakdown.specialty.awarded > 0 ? "partial" : profileSpecialty && job.specialty ? "missing" : "partial",
    label: breakdown.specialty.matched
      ? "Coincide"
      : breakdown.specialty.awarded > 0
      ? "Relacionada"
      : profileSpecialty && job.specialty
      ? "Sin coincidencia"
      : "No disponible",
    explanation: breakdown.specialty.matched
      ? `Tu especialidad (${profileSpecialty}) coincide con la especialidad solicitada (${job.specialty}).`
      : breakdown.specialty.awarded > 0
      ? `Tu especialidad (${profileSpecialty}) está relacionada parcialmente con la solicitada (${job.specialty}). Revisa el contenido técnico del cargo.`
      : profileSpecialty && job.specialty
      ? `No encontramos coincidencias de especialidad con la información disponible: tu perfil indica ${profileSpecialty} y la vacante indica ${job.specialty}.`
      : "No hay especialidad disponible en el perfil o en la vacante para comparar.",
  };

  const skillsFactor: ExplainableMatchResult["factors"]["skills"] = {
    max: breakdown.skills.max,
    awarded: breakdown.skills.awarded,
    status: breakdown.skills.awarded === 50 ? "matched" : breakdown.skills.awarded > 0 ? "partial" : "missing",
    label: breakdown.skills.awarded > 0
      ? breakdown.skills.awarded === 50 ? "Coincidencia completa" : "Coincidencia parcial"
      : "No coincide",
    explanation: breakdown.skills.awarded > 0
      ? breakdown.skills.isStructured
        ? `Cumples ${breakdown.skills.rawMatched.length} de ${breakdown.skills.rawMatched.length + breakdown.skills.missingSkills.length} competencias indicadas.`
        : `${breakdown.skills.rawMatched.length} de tus habilidades aparecen explícitamente en la vacante.`
      : "No encontramos competencias de tu perfil en la información disponible de esta vacante.",
    matchedCount: breakdown.skills.rawMatched.length,
    matchedSkills: breakdown.skills.matchedSkills,
    missingSkills: breakdown.skills.missingSkills,
    isStructured: breakdown.skills.isStructured,
    capped: breakdown.skills.capped,
  };

  const practiceFactor: ExplainableMatchResult["factors"]["practice"] = {
    max: breakdown.practice.max,
    awarded: breakdown.practice.awarded,
    status: breakdown.practice.matched ? "matched" : breakdown.practice.awarded > 0 ? "partial" : breakdown.practice.known ? "missing" : "partial",
    label: breakdown.practice.matched ? "Compatible" : breakdown.practice.awarded > 0 ? "Parcial" : "Revisar perfil",
    explanation: [
      breakdown.practice.availabilityMatched
        ? "Tu perfil indica disponibilidad."
        : "Actualiza tu disponibilidad si puedes asumir una nueva oportunidad.",
      breakdown.practice.experienceRequired == null
        ? "La vacante no exige experiencia mínima."
        : breakdown.practice.experienceMatched
        ? `Cumples los ${breakdown.practice.experienceRequired} año(s) de experiencia solicitados.`
        : `La vacante solicita ${breakdown.practice.experienceRequired} año(s) de experiencia; registra experiencia o evidencia relacionada si la tienes.`,
    ].join(" "),
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
