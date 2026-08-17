import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const xpSchema = z.object({
  // user_id from the body is IGNORED — we use the authenticated session user
  type:      z.enum(["activity", "job_apply"]),
  xp_amount: z.number().int().positive().max(1000),
  metadata:  z.record(z.string(), z.unknown()).optional(),
});

const ACTIVITY_REWARDS: Record<string, number> = {
  a1: 50,
  a2: 30,
  a3: 100,
  a4: 50,
  a7: 70,
  a8: 150,
  "career-match-v1": 40,
};

async function resolveReward(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  type: "activity" | "job_apply",
  metadata: Record<string, unknown>,
): Promise<{ amount: number; dedupField: string; dedupValue: string } | null> {
  if (type === "job_apply") {
    const opportunityId = String(metadata.job_id ?? "");
    if (!opportunityId) return null;
    const { count } = await admin
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("applicant_id", userId)
      .or(`opportunity_id.eq.${opportunityId},job_id.eq.${opportunityId}`);
    return (count ?? 0) > 0
      ? { amount: 50, dedupField: "job_id", dedupValue: opportunityId }
      : null;
  }

  const activityId = String(metadata.activity_id ?? "");
  if (!activityId) return null;

  if (activityId === "soft-skills-v1" || activityId === "tech-quiz-v1" || activityId === "career-match-v1") {
    const { data: result } = await admin
      .from("activity_results")
      .select("score")
      .eq("user_id", userId)
      .eq("activity_id", activityId)
      .maybeSingle();
    if (!result) return null;
    const score = Number(result.score) || 0;
    const amount = activityId === "soft-skills-v1"
      ? score >= 60 ? 50 : score >= 40 ? 30 : 10
      : activityId === "tech-quiz-v1"
        ? score >= 88 ? 60 : score >= 63 ? 40 : score >= 38 ? 20 : 10
        : 40;
    return { amount, dedupField: "activity_id", dedupValue: activityId };
  }

  const expectedAmount = ACTIVITY_REWARDS[activityId];
  if (!expectedAmount) return null;

  let eligible = false;
  if (activityId === "a1") {
    const { count } = await admin.from("user_skills").select("skill_id", { count: "exact", head: true }).eq("user_id", userId);
    eligible = (count ?? 0) >= 5;
  } else if (activityId === "a2" || activityId === "a7") {
    const { data: profile } = await admin.from("profiles").select("soft_skills, streak").eq("id", userId).maybeSingle();
    eligible = activityId === "a2"
      ? Array.isArray(profile?.soft_skills) && profile.soft_skills.length >= 3
      : Number(profile?.streak ?? 0) >= 7;
  } else if (activityId === "a3" || activityId === "a8") {
    const { count } = await admin.from("portfolio_items").select("id", { count: "exact", head: true }).eq("user_id", userId);
    eligible = (count ?? 0) >= (activityId === "a8" ? 3 : 1);
  } else if (activityId === "a4") {
    const { count } = await admin.from("job_applications").select("id", { count: "exact", head: true }).eq("applicant_id", userId);
    eligible = (count ?? 0) >= 1;
  }

  return eligible
    ? { amount: expectedAmount, dedupField: "activity_id", dedupValue: activityId }
    : null;
}

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

  const reward = await resolveReward(
    admin,
    user.id,
    parsed.data.type,
    parsed.data.metadata ?? {},
  );
  if (!reward) {
    return NextResponse.json({ error: "Reward requirements are not satisfied" }, { status: 400 });
  }

  // ── 4. Dedup: prevent duplicate XP claims ───────────────────────────
  const { count } = await admin
    .from("xp_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("type", parsed.data.type)
    .filter(`metadata->>${reward.dedupField}`, "eq", reward.dedupValue);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ ok: true, skipped: true, xp_awarded: 0 });
  }

  // ── 5. Insert — use session user.id, never the client-supplied value ─
  const { error } = await admin.from("xp_events").insert({
    user_id:   user.id,
    type:      parsed.data.type,
    xp_amount: reward.amount,
    metadata:  parsed.data.metadata ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, xp_awarded: reward.amount });
}
