"use server";
// ──────────────────────────────────────────────────────────
// Interview Server Actions (Phase 2 ATS upgrade)
// ──────────────────────────────────────────────────────────

import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export type InterviewModality = "video" | "presencial" | "telefono";
export type InterviewStatus   =
  | "proposed"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled"
  | "rescheduled";

interface ProposeArgs {
  applicationId: string;
  proposedAt:    string;        // ISO string
  durationMins?: number;
  modality:      InterviewModality;
  location?:     string;
  meetingLink?:  string;
  notes?:        string;
}

// ── Helper: get or create 1-to-1 conversation between two users ──
async function ensureConversation(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  a: string,
  b: string,
): Promise<string | null> {
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

  if (!error && created) return created.id as string;

  const { data: raced } = await supabase
    .from("conversations")
    .select("id")
    .or(`and(user1_id.eq.${user1_id},user2_id.eq.${user2_id}),and(user1_id.eq.${user2_id},user2_id.eq.${user1_id})`)
    .maybeSingle();

  return raced?.id as string | null;
}

// ── Propose an interview (company only) ──────────────────
export async function proposeInterview(args: ProposeArgs) {
  if (!args.applicationId || !args.proposedAt) {
    return { error: "Parámetros inválidos." };
  }
  const proposedAt = new Date(args.proposedAt);
  if (Number.isNaN(proposedAt.getTime()) || proposedAt.getTime() <= Date.now()) {
    return { error: "La entrevista debe programarse para una fecha futura." };
  }
  if (!(["video", "presencial", "telefono"] as const).includes(args.modality)) {
    return { error: "Modalidad inválida." };
  }
  const durationMins = args.durationMins ?? 30;
  if (!Number.isInteger(durationMins) || durationMins < 15 || durationMins > 120) {
    return { error: "La duración debe estar entre 15 y 120 minutos." };
  }
  if (args.meetingLink) {
    try {
      const meetingUrl = new URL(args.meetingLink);
      if (!["http:", "https:"].includes(meetingUrl.protocol)) return { error: "El enlace debe comenzar con http:// o https://." };
    } catch { return { error: "El enlace de reunión no es válido." }; }
  }

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return { error: "No autenticado." };

  // Authorize: caller must be the owning company of the application's job posting
  const { data: app } = await supabase
    .from("job_applications")
    .select("id, applicant_id, job_id, opportunity_id, job_postings(company_id, title), opportunities(publisher_id, title)")
    .eq("id", args.applicationId)
    .single();

  if (!app) return { error: "Postulación no encontrada." };
  const jobPosting = app.job_postings as { company_id?: string; title?: string } | null;
  const opportunity = app.opportunities as { publisher_id?: string; title?: string } | null;
  if (jobPosting?.company_id !== caller.id && opportunity?.publisher_id !== caller.id) {
    return { error: "Acceso denegado." };
  }

  // Ensure a conversation exists between company and student using RLS.
  const convoId = await ensureConversation(supabase, caller.id, app.applicant_id);
  if (!convoId) {
    return { error: "Aún no está autorizado el contacto con este postulante. Solicita primero la aprobación del colegio desde su perfil." };
  }

  // Insert the interview row
  const { data: interview, error: iErr } = await supabase
    .from("interviews")
    .insert({
      application_id: args.applicationId,
      company_id:     caller.id,
      student_id:     app.applicant_id,
      proposed_at:    args.proposedAt,
      duration_mins:  durationMins,
      modality:       args.modality,
      location:       (args.location ?? "").trim().slice(0, 500),
      meeting_link:   (args.meetingLink ?? "").trim().slice(0, 2000),
      notes:          (args.notes ?? "").trim().slice(0, 2000),
      status:         "proposed",
    })
    .select("id")
    .single();

  if (iErr || !interview) return { error: iErr?.message ?? "No se pudo crear la entrevista." };

  const { error: msgErr } = await supabase.from("messages").insert({
    conversation_id: convoId,
    sender_id:       caller.id,
    content:         `Propuesta de entrevista para "${jobPosting?.title ?? opportunity?.title ?? "la vacante"}".`,
    kind:            "interview_proposal",
    metadata: {
      interview_id:   interview.id,
      application_id: args.applicationId,
      proposed_at:    args.proposedAt,
      duration_mins:  durationMins,
      modality:       args.modality,
      location:       args.location ?? "",
      meeting_link:   args.meetingLink ?? "",
    },
    read: false,
  });

  if (msgErr) {
    await supabase.from("interviews").update({ status: "cancelled" }).eq("id", interview.id);
    return { error: "La entrevista no pudo enviarse al chat. Inténtalo nuevamente." };
  }

  // Also move the application to "interviewing" if not further along
  await supabase
    .from("job_applications")
    .update({ status: "interviewing", updated_at: new Date().toISOString() })
    .eq("id", args.applicationId)
    .in("status", ["pending", "reviewing"]);

  return { success: true, interviewId: interview.id, conversationId: convoId, requiresSchoolApproval: false };
}

// ── Student: respond to a proposal (accept / decline) ────
export async function respondInterview(interviewId: string, response: "accepted" | "declined") {
  if (!interviewId) return { error: "ID inválido." };

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return { error: "No autenticado." };

  const { data: iv } = await supabase
    .from("interviews")
    .select("id, student_id, company_id, status, application_id")
    .eq("id", interviewId)
    .single();

  if (!iv) return { error: "Entrevista no encontrada." };
  if (iv.student_id !== caller.id) return { error: "Acceso denegado." };
  if (iv.status !== "proposed") return { error: "Esta propuesta ya fue respondida." };

  const { data: updated, error } = await supabase
    .from("interviews")
    .update({ status: response, updated_at: new Date().toISOString() })
    .eq("id", interviewId)
    .eq("status", "proposed")
    .select("id");

  if (error) return { error: error.message };
  if (!updated?.length) return { error: "Esta propuesta ya fue respondida." };

  // Log into the application event timeline
  await supabase.from("application_events").insert({
    application_id: iv.application_id,
    event_type:     "note",
    actor_id:       caller.id,
    note:           response === "accepted" ? "Entrevista aceptada." : "Entrevista rechazada.",
    metadata:       { interview_id: interviewId, response },
  });

  return { success: true };
}

// ── Cancel or reschedule (either party) ──────────────────
export async function cancelInterview(interviewId: string) {
  if (!interviewId) return { error: "ID inválido." };

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return { error: "No autenticado." };

  const { data: iv } = await supabase
    .from("interviews")
    .select("id, student_id, company_id")
    .eq("id", interviewId)
    .single();
  if (!iv) return { error: "Entrevista no encontrada." };
  if (iv.student_id !== caller.id && iv.company_id !== caller.id) {
    return { error: "Acceso denegado." };
  }

  const { data: updated, error } = await supabase
    .from("interviews")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", interviewId)
    .in("status", ["proposed", "accepted", "rescheduled"])
    .select("id");

  if (error) return { error: error.message };
  if (!updated?.length) return { error: "La entrevista ya no se puede cancelar." };
  return { success: true };
}
