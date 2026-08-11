import type { AccountType, Role, StudentStage } from "./types";

export function resolveAuthRole(
  accountType: AccountType,
  studentStage: StudentStage | null | undefined,
): Role {
  if (accountType === "company") return "Empresa";
  if (accountType === "school") return "Colegio";
  if (accountType === "external") return "Externo";
  return studentStage === "graduated" ? "Egresado" : "Estudiante";
}
