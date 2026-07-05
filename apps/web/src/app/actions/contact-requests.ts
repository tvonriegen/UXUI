"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isMinorProfile } from "@/lib/utils/is-minor";

type SupabaseServerClient = ReturnType<typeof createServerSupabaseClient>;

async function getServerClient() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

async function ensureConversation(supabase: SupabaseServerClient, a: string, b: string) {
  const [user1_id, user2_id] = a < b ? [a, b] : [b, a];

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(`and(user1_id.eq.${user1_id},user2_id.eq.${user2_id}),and(user1_id.eq.${user2_id},user2_id.eq.${user1_id})`)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ user1_id, user2_id, last_message_at: new Date().toISOString() })
    .select("id")
    .single();

  if (!error && created?.id) return created.id as string;

  const { data: raced } = await supabase
    .from("conversations")
    .select("id")
    .or(`and(user1_id.eq.${user1_id},user2_id.eq.${user2_id}),and(user1_id.eq.${user2_id},user2_id.eq.${user1_id})`)
    .maybeSingle();

  return raced?.id as string | undefined;
}

export async function requestContactWithTalent(talentId: string, message = "") {
  if (!talentId) return { error: "Perfil inválido." };

  const { supabase, user } = await getServerClient();
  if (!user) return { error: "No autenticado." };
  if (user.id === talentId) return { error: "No puedes contactarte a ti mismo." };

  const { data: caller } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const { data: talent } = await supabase
    .from("profiles")
    .select("id, role, age, school_id")
    .eq("id", talentId)
    .single();

  if (!caller || !talent) return { error: "Perfil no encontrado." };

  if (caller.role === "Empresa" && isMinorProfile(talent.role, talent.age)) {
    if (!talent.school_id) {
      return { error: "El perfil requiere mediación escolar, pero no tiene colegio asignado." };
    }

    const { data: existing } = await supabase
      .from("contact_requests")
      .select("id, status")
      .eq("company_id", user.id)
      .eq("student_id", talentId)
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.status === "approved") {
      const conversationId = await ensureConversation(supabase, user.id, talentId);
      if (!conversationId) return { error: "No se pudo abrir la conversación aprobada." };
      return { success: true, conversationId, requiresSchoolApproval: false as const };
    }

    if (existing?.id) {
      return { success: true, contactRequestId: existing.id as string, requiresSchoolApproval: true as const };
    }

    const { data: created, error } = await supabase
      .from("contact_requests")
      .insert({
        company_id: user.id,
        student_id: talentId,
        school_id: talent.school_id,
        message,
      })
      .select("id")
      .single();

    if (error || !created) return { error: error?.message ?? "No se pudo crear la solicitud." };
    revalidatePath("/dashboard");
    return { success: true, contactRequestId: created.id as string, requiresSchoolApproval: true as const };
  }

  const conversationId = await ensureConversation(supabase, user.id, talentId);
  if (!conversationId) return { error: "No se pudo abrir la conversación." };
  return { success: true, conversationId, requiresSchoolApproval: false as const };
}

export async function approveContactRequest(contactRequestId: string) {
  if (!contactRequestId) return { error: "Solicitud inválida." };
  const { supabase, user } = await getServerClient();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("contact_requests")
    .update({ status: "approved" })
    .eq("id", contactRequestId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectContactRequest(contactRequestId: string, rejectionReason = "") {
  if (!contactRequestId) return { error: "Solicitud inválida." };
  const { supabase, user } = await getServerClient();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("contact_requests")
    .update({ status: "rejected", rejection_reason: rejectionReason })
    .eq("id", contactRequestId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function cancelContactRequest(contactRequestId: string) {
  if (!contactRequestId) return { error: "Solicitud inválida." };
  const { supabase, user } = await getServerClient();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("contact_requests")
    .update({ status: "cancelled" })
    .eq("id", contactRequestId);

  if (error) return { error: error.message };
  revalidatePath("/talent");
  return { success: true };
}
