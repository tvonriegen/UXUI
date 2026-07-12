import type { createServerSupabaseClient } from "@/lib/supabase-server";

export type SupabaseRlsClient = ReturnType<typeof createServerSupabaseClient>;

export async function ensureConversation(supabase: SupabaseRlsClient, a: string, b: string) {
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
