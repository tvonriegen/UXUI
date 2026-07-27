"use server";

import { createAdminClient } from "@/lib/supabase-server";
import { registerSchema } from "@/lib/schemas";
import type { AccountType } from "@/lib/types";

const REGISTRABLE_TYPES = new Set<AccountType>(["company", "external"]);

function legacyRoleFor(accountType: AccountType): "Empresa" | "Externo" {
  return accountType === "company" ? "Empresa" : "Externo";
}

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType;
}) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Registro inválido." };
  if (!REGISTRABLE_TYPES.has(parsed.data.accountType)) {
    return { error: "Solo Empresa y Externo pueden registrarse públicamente." };
  }

  const admin = createAdminClient();
  const email = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name.trim();
  const accountType = parsed.data.accountType;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: false,
    app_metadata: { account_type: accountType },
    user_metadata: { name },
  });

  if (createError || !created.user) return { error: createError?.message ?? "No se pudo crear la cuenta." };

  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.user.id,
    email,
    name,
    role: legacyRoleFor(accountType),
    account_type: accountType,
    account_status: "active",
  }, { onConflict: "id" });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileError.message };
  }

  const detailTable = accountType === "company" ? "company_profiles" : "external_profiles";
  const detail = accountType === "company"
    ? { profile_id: created.user.id, company_name: name, verification_status: "pending" }
    : { profile_id: created.user.id, public_name: name, verification_status: "pending" };
  const { error: detailError } = await admin.from(detailTable).upsert(detail, { onConflict: "profile_id" });

  if (detailError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: detailError.message };
  }

  return { success: true, requiresEmailVerification: true };
}
