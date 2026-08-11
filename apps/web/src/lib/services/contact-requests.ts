import type { User } from "@supabase/supabase-js";
import type { SupabaseRlsClient } from "@/lib/services/conversations";

type ContactProfile = {
  id: string;
  account_type: string | null;
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
    .select("id, account_type")
    .eq("id", user.id)
    .single();

  const { data: talent } = await supabase
    .from("authenticated_profile_directory")
    .select("id, account_type, role")
    .eq("id", talentId)
    .single();

  if (!caller || !talent) return { error: "Perfil no encontrado." };

  // Age and school ownership are intentionally not client-readable. Until the
  // domain authorization RPC is present in staging, do not guess either value
  // or create a conversation/contact request on an unverified path.
  return { error: "El contacto requiere autorización de dominio en staging." };
}
