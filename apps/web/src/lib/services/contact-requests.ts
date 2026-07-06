import type { User } from "@supabase/supabase-js";
import { decideContactPath } from "@/lib/services/contact-policy";
import { ensureConversation, type SupabaseRlsClient } from "@/lib/services/conversations";

type ContactProfile = {
  id: string;
  role: string | null;
};

type ContactTalentProfile = ContactProfile & {
  age: number | null;
  school_id: string | null;
};

export type RequestContactWithTalentResult =
  | {
      error: string;
      success?: false;
      conversationId?: undefined;
      contactRequestId?: undefined;
      requiresSchoolApproval?: undefined;
    }
  | {
      success: true;
      conversationId: string;
      requiresSchoolApproval: false;
      error?: undefined;
      contactRequestId?: undefined;
    }
  | {
      success: true;
      contactRequestId: string;
      requiresSchoolApproval: true;
      error?: undefined;
      conversationId?: undefined;
    };

export async function requestContactWithTalentService(
  supabase: SupabaseRlsClient,
  user: User,
  talentId: string,
  message = "",
): Promise<RequestContactWithTalentResult> {
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

  const contactPath = decideContactPath({
    callerId: user.id,
    callerRole: (caller as ContactProfile).role,
    talentId,
    talentRole: (talent as ContactTalentProfile).role,
    talentAge: (talent as ContactTalentProfile).age,
    talentSchoolId: (talent as ContactTalentProfile).school_id,
  });

  if (contactPath.kind === "self") return { error: "No puedes contactarte a ti mismo." };

  if (contactPath.kind === "missing_school") {
    return { error: "El perfil requiere mediación escolar, pero no tiene colegio asignado." };
  }

  if (contactPath.kind === "needs_school_approval") {
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
        school_id: contactPath.schoolId,
        message,
      })
      .select("id")
      .single();

    if (error || !created) return { error: error?.message ?? "No se pudo crear la solicitud." };
    return { success: true, contactRequestId: created.id as string, requiresSchoolApproval: true as const };
  }

  // Preserve the previous server-action behavior: non-mediated paths attempt the
  // conversation insert and leave allow/deny enforcement to RLS.
  const conversationId = await ensureConversation(supabase, user.id, talentId);
  if (!conversationId) return { error: "No se pudo abrir la conversación." };
  return { success: true, conversationId, requiresSchoolApproval: false as const };
}
