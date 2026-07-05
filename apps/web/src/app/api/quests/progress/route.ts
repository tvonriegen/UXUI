import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// Body: { code: string }  – increment progress for one quest template
// Uses the authenticated session user (never trusts the body for user_id).
const bodySchema = z.object({
  code: z.string().min(1).max(64),
});

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabaseServer = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = rateLimit({ key: `quest:${user.id}`, limit: 60, windowMs: 60_000 });
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("increment_quest_progress", {
    p_user_id: user.id,
    p_code:    parsed.data.code,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, ...(data as object) });
}
