import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const xpSchema = z.object({
  // user_id from the body is IGNORED — we use the authenticated session user
  type:      z.string().min(1).max(50),
  xp_amount: z.number().int().positive().max(1000),
  metadata:  z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  // ── 1. Auth — extract real user from session cookie ───────────────
  const cookieStore = await cookies();
  const supabaseServer = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Rate limit by authenticated user ID (not spoofable IP) ─────
  const { success } = rateLimit({ key: `xp:${user.id}`, limit: 30, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // ── 3. Validate body ───────────────────────────────────────────────
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = xpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── 4. Dedup: prevent duplicate activity XP claims ─────────────────
  // If the same activity_id has already been recorded for this user, skip.
  if (parsed.data.type === "activity" && parsed.data.metadata?.activity_id) {
    const activityId = String(parsed.data.metadata.activity_id);
    const { count } = await admin
      .from("xp_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "activity")
      .filter("metadata->>activity_id", "eq", activityId);

    if ((count ?? 0) > 0) {
      // Already claimed — return ok so the client doesn't treat it as an error
      return NextResponse.json({ ok: true, skipped: true });
    }
  }

  // ── 5. Insert — use session user.id, never the client-supplied value ─
  const { error } = await admin.from("xp_events").insert({
    user_id:   user.id,
    type:      parsed.data.type,
    xp_amount: parsed.data.xp_amount,
    metadata:  parsed.data.metadata ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
