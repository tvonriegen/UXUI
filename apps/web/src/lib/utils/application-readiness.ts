// ──────────────────────────────────────────────────────────────────
// Application Readiness – transparent, non-blocking pre-apply check.
//
// Design principles:
//   • Only hard blockers prevent apply: auth, missing/inactive job,
//     already applied, or a request already in flight.
//   • Missing profile data (specialty, skills, bio, availability,
//     portfolio, certifications) is shown as recommendations, never
//     as blockers.
//   • If a complementary data source fails to load, we surface an
//     informational/unknown item instead of assuming absence.
//   • The compatibility score is always informational.
//   • Language is non-judgmental and explains what the student can do
//     and what TalentHub is doing with the data.
// ──────────────────────────────────────────────────────────────────

export const APPLICATION_READINESS_MODEL_VERSION = "1.0.0";

export type ReadinessSourceStatus = "loading" | "loaded" | "error";

export interface ApplicationReadinessInput {
  isAuthenticated: boolean;
  profile: {
    status: ReadinessSourceStatus;
    specialty?: string | null;
    bio?: string | null;
    availability?: string | null;
  };
  skills: {
    status: ReadinessSourceStatus;
    names?: string[];
  };
  evidence: {
    status: ReadinessSourceStatus;
    portfolioCount?: number;
    certificationCount?: number;
  };
  opportunity: {
    id?: string | null;
    active?: boolean | null;
    title?: string | null;
  };
  application: {
    hasApplied: boolean;
    isApplying: boolean;
  };
  match?: {
    score: number;
    label: string;
    missingSkills?: string[];
    structuredRequirements?: boolean;
  };
}

export type ReadinessItemType =
  | "complete"
  | "recommended"
  | "blocking"
  | "informational";

export type ReadinessItemStatus =
  | "ok"
  | "warning"
  | "error"
  | "info"
  | "unknown";

export interface ReadinessItem {
  id: string;
  type: ReadinessItemType;
  status: ReadinessItemStatus;
  title: string;
  explanation: string;
  actionLabel?: string;
}

export type ReadinessOverallState =
  | "blocked"
  | "ready"
  | "recommended"
  | "checking";

export interface ApplicationReadinessResult {
  modelVersion: string;
  overallState: ReadinessOverallState;
  items: ReadinessItem[];
  blockingIssues: ReadinessItem[];
  recommendations: ReadinessItem[];
  completedItems: ReadinessItem[];
  summary: string;
  canApply: boolean;
  transparencyNote: string;
}

const TRANSPARENCY_NOTE =
  "Este resumen es orientativo. TalentHub no decide quién es contratado: la empresa evalúa tu postulación con sus propios criterios.";

function pushUniqueId(items: ReadinessItem[], item: ReadinessItem) {
  // Guard against duplicate ids while keeping a deterministic order.
  if (!items.some((i) => i.id === item.id)) {
    items.push(item);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUnavailable(value: unknown): boolean {
  if (!isNonEmptyString(value)) return true;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized === "no disponible";
}

function buildBlockers(input: ApplicationReadinessInput): ReadinessItem[] {
  const blockers: ReadinessItem[] = [];

  if (!input.isAuthenticated) {
    blockers.push({
      id: "auth",
      type: "blocking",
      status: "error",
      title: "Inicia sesión para postularte",
      explanation:
        "Necesitamos saber quién eres antes de enviar tu postulación.",
      actionLabel: "Iniciar sesión",
    });
  }

  if (!isNonEmptyString(input.opportunity.id)) {
    blockers.push({
      id: "opportunity-id",
      type: "blocking",
      status: "error",
      title: "Oportunidad no disponible",
      explanation: "No encontramos el identificador de esta oportunidad.",
    });
  } else if (input.opportunity.active === false) {
    blockers.push({
      id: "opportunity-inactive",
      type: "blocking",
      status: "error",
      title: "Oportunidad cerrada",
      explanation:
        "Esta oportunidad ya no acepta nuevas postulaciones.",
    });
  }

  if (input.application.hasApplied) {
    blockers.push({
      id: "already-applied",
      type: "blocking",
      status: "error",
      title: "Ya postulaste",
      explanation: "Ya enviaste tu postulación a esta oportunidad.",
    });
  }

  if (input.application.isApplying) {
    blockers.push({
      id: "applying",
      type: "blocking",
      status: "error",
      title: "Enviando postulación",
      explanation: "Tu solicitud está en proceso. Espera un momento.",
    });
  }

  return blockers;
}

function buildProfileItems(input: ApplicationReadinessInput): ReadinessItem[] {
  const { profile } = input;
  const items: ReadinessItem[] = [];

  if (profile.status === "loading") {
    pushUniqueId(items, {
      id: "profile-loading",
      type: "informational",
      status: "unknown",
      title: "Verificando tu perfil",
      explanation: "Estamos cargando la información básica de tu perfil.",
    });
    return items;
  }

  if (profile.status === "error") {
    pushUniqueId(items, {
      id: "profile-error",
      type: "informational",
      status: "unknown",
      title: "No pudimos verificar tu perfil",
      explanation:
        "Hubo un problema al cargar tu perfil. Puedes seguir, pero te recomendamos revisar /profile más tarde.",
      actionLabel: "Ir a perfil",
    });
    return items;
  }

  // Specialty
  if (isNonEmptyString(profile.specialty)) {
    pushUniqueId(items, {
      id: "specialty-complete",
      type: "complete",
      status: "ok",
      title: "Especialidad registrada",
      explanation: `Tu especialidad es ${profile.specialty.trim()}.`,
    });
  } else {
    pushUniqueId(items, {
      id: "specialty-recommended",
      type: "recommended",
      status: "warning",
      title: "Añade tu especialidad",
      explanation:
        "Indicar tu especialidad ayuda a las empresas a entender tu perfil académico.",
      actionLabel: "Completar especialidad",
    });
  }

  // Bio
  if (isNonEmptyString(profile.bio)) {
    pushUniqueId(items, {
      id: "bio-complete",
      type: "complete",
      status: "ok",
      title: "Biografía presente",
      explanation: "Tu perfil incluye una biografía.",
    });
  } else {
    pushUniqueId(items, {
      id: "bio-recommended",
      type: "recommended",
      status: "warning",
      title: "Añade una biografía",
      explanation:
        "Una breve biografía ayuda a contextualizar tu experiencia e intereses.",
      actionLabel: "Completar biografía",
    });
  }

  // Availability
  if (!isUnavailable(profile.availability)) {
    pushUniqueId(items, {
      id: "availability-complete",
      type: "complete",
      status: "ok",
      title: "Disponibilidad registrada",
      explanation: `Tu disponibilidad indicada es: ${profile.availability!.trim()}.`,
    });
  } else {
    pushUniqueId(items, {
      id: "availability-recommended",
      type: "recommended",
      status: "warning",
      title: "Actualiza tu disponibilidad",
      explanation:
        "Puedes actualizar tu disponibilidad horaria para facilitar el contacto de la empresa.",
      actionLabel: "Actualizar disponibilidad",
    });
  }

  return items;
}

function buildSkillsItem(input: ApplicationReadinessInput): ReadinessItem {
  const { skills } = input;

  if (skills.status === "loading") {
    return {
      id: "skills-loading",
      type: "informational",
      status: "unknown",
      title: "Verificando competencias",
      explanation: "Estamos cargando las competencias de tu perfil.",
    };
  }

  if (skills.status === "error") {
    return {
      id: "skills-error",
      type: "informational",
      status: "unknown",
      title: "No pudimos verificar tus competencias",
      explanation:
        "Hubo un problema al cargar tus competencias. Puedes seguir con la postulación.",
      actionLabel: "Ir a perfil",
    };
  }

  const names = skills.names ?? [];
  if (names.length > 0) {
    return {
      id: "skills-complete",
      type: "complete",
      status: "ok",
      title: "Competencias registradas",
      explanation:
        names.length === 1
          ? `Tienes 1 competencia registrada.`
          : `Tienes ${names.length} competencias registradas.`,
    };
  }

  return {
    id: "skills-recommended",
    type: "recommended",
    status: "warning",
    title: "Añade competencias",
    explanation:
      "Registrar competencias relacionadas mejora cómo las empresas encuentran tu perfil.",
    actionLabel: "Añadir competencias",
  };
}

function buildEvidenceItem(input: ApplicationReadinessInput): ReadinessItem {
  const { evidence } = input;

  if (evidence.status === "loading") {
    return {
      id: "evidence-loading",
      type: "informational",
      status: "unknown",
      title: "Verificando evidencia",
      explanation:
        "Estamos cargando tus proyectos y certificaciones.",
    };
  }

  if (evidence.status === "error") {
    return {
      id: "evidence-error",
      type: "informational",
      status: "unknown",
      title: "No pudimos verificar tu evidencia",
      explanation:
        "Hubo un problema al cargar tus proyectos y certificaciones. Puedes seguir con la postulación.",
      actionLabel: "Ir a perfil",
    };
  }

  const portfolioCount = evidence.portfolioCount ?? 0;
  const certificationCount = evidence.certificationCount ?? 0;
  const total = portfolioCount + certificationCount;

  if (total > 0) {
    const parts: string[] = [];
    if (portfolioCount > 0) {
      parts.push(
        portfolioCount === 1
          ? "1 proyecto"
          : `${portfolioCount} proyectos`
      );
    }
    if (certificationCount > 0) {
      parts.push(
        certificationCount === 1
          ? "1 certificación"
          : `${certificationCount} certificaciones`
      );
    }
    return {
      id: "evidence-complete",
      type: "complete",
      status: "ok",
      title: "Evidencia registrada",
      explanation: `Tienes ${parts.join(" y ")} en tu perfil.`,
    };
  }

  return {
    id: "evidence-recommended",
    type: "recommended",
    status: "warning",
    title: "Añade evidencia de tu trabajo",
    explanation:
      "Proyectos o certificaciones ayudan a las empresas a conocer tus habilidades prácticas.",
    actionLabel: "Añadir evidencia",
  };
}

function buildMatchItem(input: ApplicationReadinessInput): ReadinessItem {
  if (input.match) {
    if (input.match.missingSkills?.length) {
      return {
        id: "match-skills-recommended",
        type: "recommended",
        status: "warning",
        title: "Fortalece competencias para esta vacante",
        explanation: `Compatibilidad estimada: ${input.match.score}% (${input.match.label}). La vacante solicita además: ${input.match.missingSkills.join(", ")}. Añádelas solo si realmente las tienes o incorpora evidencia cuando las desarrolles.`,
        actionLabel: "Revisar mis competencias",
      };
    }
    return {
      id: "match-info",
      type: "informational",
      status: "info",
      title: "Compatibilidad orientativa",
      explanation: `Tu perfil tiene una compatibilidad estimada de ${input.match.score}% (${input.match.label}). Este puntaje no bloquea la postulación.`,
    };
  }
  return {
    id: "match-unavailable",
    type: "informational",
    status: "info",
    title: "Compatibilidad no calculada",
    explanation:
      "No pudimos calcular una compatibilidad orientativa en este momento.",
  };
}

function buildSummary(
  state: ReadinessOverallState,
  blockers: ReadinessItem[],
  recommendations: ReadinessItem[],
  completed: ReadinessItem[],
  hasLoading: boolean
): string {
  if (state === "blocked") {
    const first = blockers[0];
    return first
      ? `Existe un bloqueo que impide postularse: ${first.title.toLowerCase()}.`
      : "Existe un bloqueo que impide postularse en este momento.";
  }

  if (state === "checking" || hasLoading) {
    return "Estamos verificando algunos datos de tu perfil. Puedes postularte mientras tanto.";
  }

  if (state === "ready") {
    return "Tu perfil está listo. Revisa el resumen y postúlate cuando quieras.";
  }

  if (recommendations.length === 1) {
    return `Tienes 1 recomendación para fortalecer tu postulación.`;
  }
  return `Tienes ${recommendations.length} recomendaciones para fortalecer tu postulación.`;
}

/**
 * Computes a transparent, ordered readiness assessment for applying to a job.
 * The result intentionally separates hard blockers from recommendations so the
 * UI can guide students without gating them on incomplete optional data.
 */
export function computeApplicationReadiness(
  input: ApplicationReadinessInput
): ApplicationReadinessResult {
  const blockers = buildBlockers(input);
  const profileItems = buildProfileItems(input);
  const skillsItem = buildSkillsItem(input);
  const evidenceItem = buildEvidenceItem(input);
  const matchItem = buildMatchItem(input);

  const items: ReadinessItem[] = [];

  // 1. Hard blockers first.
  for (const blocker of blockers) {
    pushUniqueId(items, blocker);
  }

  // 2. Profile completeness.
  for (const item of profileItems) {
    pushUniqueId(items, item);
  }

  // 3. Skills.
  pushUniqueId(items, skillsItem);

  // 4. Evidence.
  pushUniqueId(items, evidenceItem);

  // 5. Match score (informational, never blocking).
  pushUniqueId(items, matchItem);

  const blockingIssues = items.filter((i) => i.type === "blocking");
  const recommendations = items.filter((i) => i.type === "recommended");
  const completedItems = items.filter((i) => i.type === "complete");

  const hasLoading =
    input.profile.status === "loading" ||
    input.skills.status === "loading" ||
    input.evidence.status === "loading";

  let overallState: ReadinessOverallState;
  if (blockingIssues.length > 0) {
    overallState = "blocked";
  } else if (hasLoading) {
    overallState = "checking";
  } else if (recommendations.length === 0) {
    overallState = "ready";
  } else {
    overallState = "recommended";
  }

  const canApply = blockingIssues.length === 0;

  const summary = buildSummary(
    overallState,
    blockingIssues,
    recommendations,
    completedItems,
    hasLoading
  );

  return {
    modelVersion: APPLICATION_READINESS_MODEL_VERSION,
    overallState,
    items,
    blockingIssues,
    recommendations,
    completedItems,
    summary,
    canApply,
    transparencyNote: TRANSPARENCY_NOTE,
  };
}
