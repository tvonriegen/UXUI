import { isMinorProfile } from "@/lib/utils/is-minor";

export type ContactRole = "Estudiante" | "Egresado" | "Empresa" | "Colegio";

export type ContactPolicyInput = {
  callerId: string;
  callerRole: string | null | undefined;
  talentId: string;
  talentRole: string | null | undefined;
  talentAge: number | null | undefined;
  talentSchoolId: string | null | undefined;
};

export type ContactPathDecision =
  | { kind: "direct" }
  | { kind: "needs_school_approval"; schoolId: string }
  | { kind: "self" }
  | { kind: "missing_school" }
  | { kind: "unknown_role"; role: string | null | undefined }
  | { kind: "not_allowed" };

const knownRoles = new Set<string>(["Estudiante", "Egresado", "Empresa", "Colegio"]);

export function decideContactPath(input: ContactPolicyInput): ContactPathDecision {
  if (input.callerId === input.talentId) return { kind: "self" };

  if (!input.callerRole || !knownRoles.has(input.callerRole)) {
    return { kind: "unknown_role", role: input.callerRole };
  }

  if (!input.talentRole || !knownRoles.has(input.talentRole)) {
    return { kind: "unknown_role", role: input.talentRole };
  }

  if (input.callerRole === "Empresa") {
    if (isMinorProfile(input.talentRole, input.talentAge)) {
      if (!input.talentSchoolId) return { kind: "missing_school" };
      return { kind: "needs_school_approval", schoolId: input.talentSchoolId };
    }

    if (input.talentRole === "Egresado" || input.talentRole === "Estudiante") {
      return { kind: "direct" };
    }
  }

  if (
    input.callerRole === "Colegio" &&
    input.talentRole === "Estudiante" &&
    input.talentSchoolId === input.callerId
  ) {
    return { kind: "direct" };
  }

  return { kind: "not_allowed" };
}
