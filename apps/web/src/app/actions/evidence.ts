"use server";

import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { profileEvidenceSchema } from "@/lib/schemas";

type EvidenceStatus = "verified" | "rejected";

async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "No autenticado." } as const;
  return { supabase, user } as const;
}

export async function submitProfileEvidence(input: {
  evidence_type: string;
  title: string;
  description?: string;
  url?: string;
  issuer?: string;
  issued_at?: string;
  expires_at?: string;
}) {
  const parsed = profileEvidenceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Evidencia inválida." };

  const auth = await getAuthenticatedClient();
  if ("error" in auth) return auth;

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_type")
    .eq("id", auth.user.id)
    .single();
  if (!profile || profile.account_type !== "student") {
    return { error: "Solo estudiantes y egresados pueden registrar evidencia." };
  }

  const { error } = await auth.supabase.from("profile_evidence").insert({
    ...parsed.data,
  });
  return error ? { error: error.message } : { success: true };
}

export async function resubmitProfileEvidence(evidenceId: string) {
  if (!evidenceId) return { error: "Evidencia inválida." };
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return auth;

  const { data, error } = await auth.supabase
    .from("profile_evidence")
    .update({ status: "pending", validation_note: "", reviewed_by: null, reviewed_at: null })
    .eq("id", evidenceId)
    .eq("owner_id", auth.user.id)
    .eq("status", "rejected")
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  return data ? { success: true } : { error: "La evidencia no existe o ya no puede reenviarse." };
}

export async function reviewProfileEvidence(
  evidenceId: string,
  status: EvidenceStatus,
  note = "",
) {
  if (!evidenceId || !["verified", "rejected"].includes(status)) {
    return { error: "Revisión inválida." };
  }
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return auth;

  const { data: reviewer } = await auth.supabase
    .from("profiles")
    .select("account_type")
    .eq("id", auth.user.id)
    .single();
  if (!reviewer || reviewer.account_type !== "school") return { error: "Solo un colegio puede revisar evidencia." };

  const { data, error } = await auth.supabase
    .from("profile_evidence")
    .update({ status, validation_note: note.trim().slice(0, 500) })
    .eq("id", evidenceId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  return data ? { success: true } : { error: "La evidencia ya fue revisada o no está disponible." };
}
