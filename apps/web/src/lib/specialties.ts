// ─── Chilean Technical-Professional (TP) Specialties ──────────────────────────
// Single source of truth for all specialty dropdowns and filters across the app.
// Matches the values stored in the `specialty` column of `profiles` and
// `job_postings`, and the `tag` column of `posts`.
//
// Sorted alphabetically (Spanish locale).
// ──────────────────────────────────────────────────────────────────────────────

export const TP_SPECIALTIES = [
  "Administración",
  "Agronomía",
  "Construcción",
  "Contabilidad",
  "Ebanistería",
  "Electricidad",
  "Electrónica",
  "Gastronomía",
  "Mecánica Automotriz",
  "Mecánica Industrial",
  "Mecatrónica",
  "Programación",
  "Refrigeración y Climatización",
  "Salud",
  "Soldadura",
  "Telecomunicaciones",
] as const;

export type TpSpecialty = (typeof TP_SPECIALTIES)[number];

// Tags that can be applied to posts — specialties plus non-specialty labels.
export const POST_TAGS = [
  ...TP_SPECIALTIES,
  "Evento",
  "Oferta Laboral",
] as const;

export type PostTag = (typeof POST_TAGS)[number];

// Filter list for the muro feed — includes the "Todos" sentinel at position 0.
export const TAG_FILTERS = ["Todos", ...POST_TAGS] as const;

// Soft-skills recognised by the platform for filtering profiles and offers.
export const SOFT_SKILLS = [
  "Comunicación",
  "Liderazgo",
  "Trabajo en equipo",
  "Resolución de problemas",
  "Puntualidad",
  "Responsabilidad",
  "Creatividad",
  "Adaptabilidad",
  "Iniciativa",
  "Proactividad",
] as const;

export type SoftSkill = (typeof SOFT_SKILLS)[number];
