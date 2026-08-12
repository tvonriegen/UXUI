import type { SupabaseRlsClient } from "@/lib/services/conversations";

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

export type ContactAuthorizationDecision = "ALLOW" | "MEDIATED" | "DENY";

type ContactAuthorizationRow = {
  decision: ContactAuthorizationDecision;
  contact_request_id: string | null;
  conversation_id: string | null;
  school_id: string | null;
};

export function mapContactAuthorization(row: ContactAuthorizationRow | null): RequestContactWithTalentResult {
  if (!row || row.decision === "DENY") return { error: "No tienes autorización para contactar este perfil." };
  if (row.decision === "MEDIATED" && row.contact_request_id) {
    return { success: true, contactRequestId: row.contact_request_id, requiresSchoolApproval: true };
  }
  if (row.decision === "ALLOW" && row.conversation_id) {
    return { success: true, conversationId: row.conversation_id, requiresSchoolApproval: false };
  }
  return { error: "No se pudo resolver la autorización de contacto." };
}

export async function requestContactWithTalentService(
  supabase: SupabaseRlsClient,
  _user: { id: string },
  talentId: string,
  message = "",
): Promise<RequestContactWithTalentResult> {
  const { data, error } = await supabase.rpc("can_request_student_contact", {
    p_student_id: talentId,
    p_message: message,
  });

  if (error) return { error: "No se pudo resolver la autorización de contacto." };
  const row = (Array.isArray(data) ? data[0] : data) as ContactAuthorizationRow | null;
  return mapContactAuthorization(row);
}
