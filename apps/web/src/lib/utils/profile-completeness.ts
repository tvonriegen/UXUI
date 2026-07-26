export type ProfileEvidenceStatus = "draft" | "pending" | "verified" | "rejected" | "expired";

export interface ProfileCompletenessInput {
  bio?: string | null;
  location?: string | null;
  specialty?: string | null;
  availability?: string | null;
  gpa?: number | null;
  skillsCount: number;
  softSkillsCount: number;
  evidence: Array<{ status: ProfileEvidenceStatus }>;
  portfolioCount: number;
  schoolReportPresent: boolean;
}

export interface ProfileCompletenessItem {
  id: string;
  label: string;
  done: boolean;
  weight: number;
  guidance: string;
}

export interface ProfileCompletenessResult {
  percentage: number;
  items: ProfileCompletenessItem[];
  verifiedEvidenceCount: number;
  pendingEvidenceCount: number;
}

export function computeProfileCompleteness(input: ProfileCompletenessInput): ProfileCompletenessResult {
  const verifiedEvidenceCount = input.evidence.filter((item) => item.status === "verified").length;
  const pendingEvidenceCount = input.evidence.filter((item) => item.status === "pending").length;
  const items: ProfileCompletenessItem[] = [
    {
      id: "bio",
      label: "Biografía",
      done: Boolean(input.bio?.trim()),
      weight: 15,
      guidance: "Cuenta qué te interesa y qué tipo de oportunidades buscas.",
    },
    {
      id: "location",
      label: "Ubicación",
      done: Boolean(input.location?.trim()),
      weight: 10,
      guidance: "Agrega tu comuna o ciudad para mejorar la pertinencia de las oportunidades.",
    },
    {
      id: "specialty",
      label: "Especialidad",
      done: Boolean(input.specialty?.trim()),
      weight: 15,
      guidance: "Selecciona tu especialidad técnica principal.",
    },
    {
      id: "skills",
      label: "Habilidades técnicas",
      done: input.skillsCount > 0,
      weight: 15,
      guidance: "Agrega competencias del catálogo para explicar mejor tu compatibilidad.",
    },
    {
      id: "soft-skills",
      label: "Habilidades blandas",
      done: input.softSkillsCount > 0,
      weight: 10,
      guidance: "Incluye fortalezas como comunicación, liderazgo o trabajo en equipo.",
    },
    {
      id: "evidence",
      label: "Evidencia verificada",
      done: verifiedEvidenceCount > 0,
      weight: 20,
      guidance: pendingEvidenceCount > 0
        ? "Tu evidencia está pendiente de validación institucional."
        : "Registra un proyecto, certificado o curso y solicita validación.",
    },
    {
      id: "portfolio",
      label: "Portafolio",
      done: input.portfolioCount > 0,
      weight: 10,
      guidance: "Muestra al menos un proyecto con una descripción clara.",
    },
    {
      id: "school-report",
      label: "Respaldo institucional",
      done: input.schoolReportPresent,
      weight: 5,
      guidance: "Pide a tu colegio que agregue o actualice tu reporte institucional.",
    },
  ];

  return {
    percentage: items.reduce((total, item) => total + (item.done ? item.weight : 0), 0),
    items,
    verifiedEvidenceCount,
    pendingEvidenceCount,
  };
}
