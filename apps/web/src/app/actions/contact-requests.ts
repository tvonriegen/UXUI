"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requestContactWithTalentService } from "@/lib/services/contact-requests";

async function getServerClient() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function requestContactWithTalent(talentId: string, message = "") {
  if (!talentId) return { error: "Perfil inválido." };

  const { supabase, user } = await getServerClient();
  if (!user) return { error: "No autenticado." };
  if (user.id === talentId) return { error: "No puedes contactarte a ti mismo." };
  const result = await requestContactWithTalentService(supabase, user, talentId, message);
  if (result.success && result.requiresSchoolApproval) revalidatePath("/dashboard");
  return result;
}

export async function approveContactRequest(contactRequestId: string) {
  if (!contactRequestId) return { error: "Solicitud inválida." };
  const { supabase, user } = await getServerClient();
  if (!user) return { error: "No autenticado." };

  const { data, error } = await supabase
    .from("contact_requests")
    .update({ status: "approved" })
    .eq("id", contactRequestId)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length !== 1) return { error: "La solicitud no está disponible para aprobar." };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectContactRequest(contactRequestId: string, rejectionReason = "") {
  if (!contactRequestId) return { error: "Solicitud inválida." };
  const { supabase, user } = await getServerClient();
  if (!user) return { error: "No autenticado." };

  const { data, error } = await supabase
    .from("contact_requests")
    .update({ status: "rejected", rejection_reason: rejectionReason })
    .eq("id", contactRequestId)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length !== 1) return { error: "La solicitud no está disponible para rechazar." };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function cancelContactRequest(contactRequestId: string) {
  if (!contactRequestId) return { error: "Solicitud inválida." };
  const { supabase, user } = await getServerClient();
  if (!user) return { error: "No autenticado." };

  const { data, error } = await supabase
    .from("contact_requests")
    .update({ status: "cancelled" })
    .eq("id", contactRequestId)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length !== 1) return { error: "La solicitud no está disponible para cancelar." };
  revalidatePath("/talent");
  return { success: true };
}
