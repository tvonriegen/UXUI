"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const externalProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  bio: z.string().trim().max(1000),
  location: z.string().trim().max(160),
  clientType: z.enum(["individual", "entrepreneur", "small_business"]),
});

export async function updateExternalProfileFromForm(formData: FormData) {
  const parsed = externalProfileSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio"),
    location: formData.get("location"),
    clientType: formData.get("clientType"),
  });
  if (!parsed.success) redirect(`/external/profile?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Perfil inválido")}`);

  const supabase = createServerSupabaseClient(await cookies() as any); // eslint-disable-line
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", user.id).single();
  if (profile?.account_type !== "external") redirect("/login?error=account_type");

  const { error: profileError } = await supabase.from("profiles").update({
    name: parsed.data.name,
    bio: parsed.data.bio,
    location: parsed.data.location,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);
  if (profileError) redirect(`/external/profile?error=${encodeURIComponent(profileError.message)}`);

  const { error: detailError } = await supabase.from("external_profiles").update({
    public_name: parsed.data.name,
    client_type: parsed.data.clientType,
    updated_at: new Date().toISOString(),
  }).eq("profile_id", user.id);
  if (detailError) redirect(`/external/profile?error=${encodeURIComponent(detailError.message)}`);

  redirect("/external/profile?saved=1");
}
