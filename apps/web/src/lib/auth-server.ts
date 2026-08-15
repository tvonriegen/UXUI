import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "./supabase-server";
import { fetchOwnProfile } from "./own-profile-query";
import type { AccountType, Role, StudentStage } from "./types";

export type AccountStatus = "active" | "pending" | "suspended" | "disabled";

export interface CurrentAccount {
  id: string;
  email: string;
  name: string;
  accountType: AccountType;
  accountStatus: AccountStatus;
  legacyRole: Role;
  studentStage: StudentStage | null;
  dashboardPath: string;
}

const DASHBOARD_PATHS: Record<AccountType, string> = {
  student: "/student/dashboard",
  company: "/company/dashboard",
  school: "/school/dashboard",
  external: "/external/dashboard",
};

function isAccountType(value: unknown): value is AccountType {
  return value === "student" || value === "company" || value === "school" || value === "external";
}

function isAccountStatus(value: unknown): value is AccountStatus {
  return value === "active" || value === "pending" || value === "suspended" || value === "disabled";
}

function toLegacyRole(accountType: AccountType, legacyRole: unknown): Role {
  if (accountType === "company") return "Empresa";
  if (accountType === "school") return "Colegio";
  if (accountType === "external") return "Externo";
  return legacyRole === "Egresado" ? "Egresado" : "Estudiante";
}

function toStudentStage(accountType: AccountType, canonicalStage: unknown, availability: unknown, legacyRole: unknown): StudentStage | null {
  if (accountType !== "student") return null;
  if (canonicalStage === "enrolled" || canonicalStage === "internship" || canonicalStage === "graduated") {
    return canonicalStage;
  }
  if (legacyRole === "Egresado") return "graduated";
  return availability === "En prácticas" ? "internship" : "enrolled";
}

export async function getCurrentAccount(): Promise<CurrentAccount | null> {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { profile, error } = await fetchOwnProfile(supabase, user.id);

  if (error) throw new Error("Unable to load authenticated account");
  if (!profile || !isAccountType(profile.account_type)) return null;

  const accountStatus = isAccountStatus(profile.account_status) ? profile.account_status : "pending";
  return {
    id: profile.id,
    email: profile.email ?? user.email ?? "",
    name: profile.name ?? "Usuario",
    accountType: profile.account_type,
    accountStatus,
    legacyRole: toLegacyRole(profile.account_type, profile.role),
    studentStage: toStudentStage(profile.account_type, profile.student_stage, profile.availability, profile.role),
    dashboardPath: DASHBOARD_PATHS[profile.account_type],
  };
}

export async function requireAccountType(expected: AccountType): Promise<CurrentAccount> {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");
  if (account.accountStatus !== "active") redirect("/login?error=account_status");
  if (account.accountType !== expected) redirect(account.dashboardPath);
  return account;
}

export function dashboardPathFor(accountType: AccountType): string {
  return DASHBOARD_PATHS[accountType];
}
