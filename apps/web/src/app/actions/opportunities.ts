"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { opportunitySchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase-server";

async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "No autenticado." } as const;
  return { supabase, user } as const;
}

function opportunityTypeAllowed(accountType: string, opportunityType: string) {
  if (accountType === "company") return ["internship", "job", "company_project"].includes(opportunityType);
  if (accountType === "external") return opportunityType === "freelance";
  return false;
}

export async function createOpportunity(input: unknown) {
  const parsed = opportunitySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Oportunidad inválida." };

  const auth = await getAuthenticatedClient();
  if ("error" in auth) return auth;

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_type, account_status")
    .eq("id", auth.user.id)
    .single();

  if (!profile || profile.account_status !== "active" || !opportunityTypeAllowed(profile.account_type, parsed.data.opportunityType)) {
    return { error: "Esta cuenta no puede publicar este tipo de oportunidad." };
  }
  if (profile.account_type === "external" && !auth.user.email_confirmed_at) {
    return { error: "Confirma tu correo antes de publicar un encargo." };
  }

  const { data, error } = await auth.supabase.from("opportunities").insert({
    publisher_id: auth.user.id,
    publisher_type: profile.account_type,
    opportunity_type: parsed.data.opportunityType,
    title: parsed.data.title,
    description: parsed.data.description,
    specialty: parsed.data.specialty,
    location: parsed.data.location,
    compensation_min: parsed.data.compensationMin ?? null,
    compensation_max: parsed.data.compensationMax ?? null,
    max_candidates: parsed.data.maxCandidates ?? null,
    closes_at: parsed.data.closesAt || null,
    status: "open",
  }).select("id").single();

  if (error) return { error: error.message };
  return { success: true, opportunityId: data.id };
}

export async function createOpportunityFromForm(formData: FormData) {
  const result = await createOpportunity({
    opportunityType: String(formData.get("opportunityType") ?? "freelance"),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    specialty: String(formData.get("specialty") ?? ""),
    location: String(formData.get("location") ?? "Remoto"),
    compensationMin: formData.get("compensationMin") || undefined,
    compensationMax: formData.get("compensationMax") || undefined,
    maxCandidates: formData.get("maxCandidates") || undefined,
    closesAt: String(formData.get("closesAt") ?? "") || undefined,
  });
  if (result.error) redirect(`/external/jobs/new?error=${encodeURIComponent(result.error)}`);
  redirect("/external/jobs");
}

export async function closeOpportunity(opportunityId: string) {
  if (!z.string().uuid().safeParse(opportunityId).success) return { error: "Oportunidad inválida." };
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return auth;

  const { error } = await auth.supabase
    .from("opportunities")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", opportunityId)
    .eq("publisher_id", auth.user.id);
  return error ? { error: error.message } : { success: true };
}

export async function applyToOpportunity(opportunityId: string, coverLetter = "") {
  if (!z.string().uuid().safeParse(opportunityId).success) return { error: "Oportunidad inválida." };
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return auth;

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_type, account_status")
    .eq("id", auth.user.id)
    .single();
  if (!profile || profile.account_type !== "student" || profile.account_status !== "active") {
    return { error: "Solo una cuenta de estudiante activa puede postular." };
  }

  const { error } = await auth.supabase.from("job_applications").insert({
    job_id: null,
    opportunity_id: opportunityId,
    applicant_id: auth.user.id,
    student_id: auth.user.id,
    cover_letter: coverLetter.trim().slice(0, 5000),
    status: "pending",
  });
  return error ? { error: error.message } : { success: true };
}
