import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/streak/touch — marks the current user as active today and
// returns the updated streak value. Idempotent within the same day.
export async function POST() {
  const cookieStore = await cookies();
  const supabaseServer = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = rateLimit({ key: `streak:${user.id}`, limit: 10, windowMs: 60_000 });
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("touch_streak", { p_user_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, streak: data });
}
