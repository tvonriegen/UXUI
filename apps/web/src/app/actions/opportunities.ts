"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { opportunitySchema } from "@/lib/schemas";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase-server";

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
    required_skills: parsed.data.requiredSkills,
    preferred_skills: parsed.data.preferredSkills,
    minimum_experience_years: parsed.data.minimumExperienceYears ?? null,
    work_mode: parsed.data.workMode ?? null,
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

export async function updateOpportunity(opportunityId: string, input: unknown) {
  if (!z.string().uuid().safeParse(opportunityId).success) return { error: "Oportunidad inválida." };
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
    return { error: "Esta cuenta no puede editar este tipo de oportunidad." };
  }

  const { data, error } = await auth.supabase
    .from("opportunities")
    .update({
      opportunity_type: parsed.data.opportunityType,
      title: parsed.data.title,
      description: parsed.data.description,
      specialty: parsed.data.specialty,
      location: parsed.data.location,
      compensation_min: parsed.data.compensationMin ?? null,
      compensation_max: parsed.data.compensationMax ?? null,
      max_candidates: parsed.data.maxCandidates ?? null,
      required_skills: parsed.data.requiredSkills,
      preferred_skills: parsed.data.preferredSkills,
      minimum_experience_years: parsed.data.minimumExperienceYears ?? null,
      work_mode: parsed.data.workMode ?? null,
      closes_at: parsed.data.closesAt || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opportunityId)
    .eq("publisher_id", auth.user.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  return data ? { success: true } : { error: "Oportunidad no encontrada o acceso denegado." };
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

const proposalInputSchema = z.object({
  opportunityId: z.string().uuid(),
  coverLetter: z.string().trim().min(20, "Explica tu propuesta con al menos 20 caracteres.").max(5000),
  proposedAmount: z.coerce.number().int().min(0).optional(),
});

export async function submitProposal(input: unknown) {
  const parsed = proposalInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Propuesta inválida." };
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return auth;

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_type, account_status")
    .eq("id", auth.user.id)
    .single();
  if (!profile || profile.account_type !== "student" || profile.account_status !== "active") {
    return { error: "Solo una cuenta de estudiante activa puede enviar propuestas." };
  }

  const { error } = await auth.supabase.from("opportunity_proposals").insert({
    opportunity_id: parsed.data.opportunityId,
    applicant_id: auth.user.id,
    cover_letter: parsed.data.coverLetter,
    proposed_amount: parsed.data.proposedAmount ?? null,
    status: "pending",
  });
  return error ? { error: error.message } : { success: true };
}

export async function submitProposalFromForm(formData: FormData) {
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const result = await submitProposal({
    opportunityId,
    coverLetter: String(formData.get("coverLetter") ?? ""),
    proposedAmount: formData.get("proposedAmount") || undefined,
  });
  if (result.error) redirect(`/freelance/${opportunityId}?error=${encodeURIComponent(result.error)}`);
  redirect(`/freelance/${opportunityId}?submitted=1`);
}

export async function updateProposalStatus(proposalId: string, status: "accepted" | "rejected") {
  if (!z.string().uuid().safeParse(proposalId).success) return { error: "Propuesta inválida." };
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return auth;

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_type, account_status")
    .eq("id", auth.user.id)
    .single();
  if (!profile || profile.account_type !== "external" || profile.account_status !== "active") {
    return { error: "Solo el cliente externo puede revisar esta propuesta." };
  }

  if (status === "accepted") {
    const { data, error } = await auth.supabase.rpc("accept_freelance_proposal", { p_proposal_id: proposalId });
    if (error) return { error: error.message };
    const result = data as { success?: boolean; error?: string } | null;
    return result?.success ? { success: true } : { error: result?.error ?? "No se pudo aceptar la propuesta." };
  }

  const { data: proposal } = await auth.supabase
    .from("opportunity_proposals")
    .select("id, applicant_id, opportunities!inner(title, publisher_id)")
    .eq("id", proposalId)
    .eq("status", "pending")
    .maybeSingle();
  const opportunity = proposal?.opportunities as unknown as { title?: string; publisher_id?: string } | null;
  if (!proposal || opportunity?.publisher_id !== auth.user.id) return { error: "Propuesta no disponible o acceso denegado." };

  const { data: updated, error } = await auth.supabase
    .from("opportunity_proposals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("status", "pending")
    .select("id");
  if (error) return { error: error.message };
  if (!updated?.length) return { error: "La propuesta ya fue procesada." };
  await createAdminClient().from("notifications").insert({
    user_id: proposal.applicant_id,
    title: "Propuesta revisada",
    body: `Tu propuesta para "${opportunity?.title ?? "el encargo"}" no fue seleccionada.`,
    type: "application",
    link: "/freelance",
  });
  return { success: true };
}

export async function updateProposalStatusFromForm(formData: FormData) {
  const proposalId = String(formData.get("proposalId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "accepted" && status !== "rejected") redirect("/external/proposals?error=Estado%20inválido");
  const result = await updateProposalStatus(proposalId, status);
  if (result.error) redirect(`/external/proposals?error=${encodeURIComponent(result.error)}`);
  redirect("/external/proposals");
}

export async function withdrawProposal(proposalId: string) {
  if (!z.string().uuid().safeParse(proposalId).success) return { error: "Propuesta inválida." };
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return auth;
  const { data, error } = await auth.supabase
    .from("opportunity_proposals")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("applicant_id", auth.user.id)
    .eq("status", "pending")
    .select("id");
  if (error) return { error: error.message };
  return data?.length ? { success: true } : { error: "La propuesta ya no se puede retirar." };
}

export async function closeOpportunityFromForm(formData: FormData) {
  const result = await closeOpportunity(String(formData.get("opportunityId") ?? ""));
  if (result.error) redirect(`/external/jobs?error=${encodeURIComponent(result.error)}`);
  redirect("/external/jobs?closed=1");
}

export async function withdrawProposalFromForm(formData: FormData) {
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const result = await withdrawProposal(String(formData.get("proposalId") ?? ""));
  if (result.error) redirect(`/freelance/${opportunityId}?error=${encodeURIComponent(result.error)}`);
  redirect(`/freelance/${opportunityId}?withdrawn=1`);
}
