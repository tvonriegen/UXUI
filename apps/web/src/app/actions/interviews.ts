"use server";
// ──────────────────────────────────────────────────────────
// Interview Server Actions (Phase 2 ATS upgrade)
// ──────────────────────────────────────────────────────────

import { cookies } from "next/headers";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { isMinorProfile } from "@/lib/utils/is-minor";

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

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return { error: "No autenticado." };

  // Authorize: caller must be the owning company of the application's job posting
  const { data: app } = await supabase
    .from("job_applications")
    .select("id, applicant_id, job_id, job_postings!inner(company_id, title)")
    .eq("id", args.applicationId)
    .single();

  if (!app) return { error: "Postulación no encontrada." };
  const jobPosting = app.job_postings as { company_id?: string; title?: string } | null;
  if (jobPosting?.company_id !== caller.id) {
    return { error: "Acceso denegado." };
  }

  const { data: applicant } = await supabase
    .from("profiles")
    .select("id, role, age, school_id")
    .eq("id", app.applicant_id)
    .single();

  if (!applicant) return { error: "Perfil del postulante no encontrado." };

  if (isMinorProfile(applicant.role, applicant.age)) {
    if (!applicant.school_id) {
      return { error: "El postulante requiere mediación escolar, pero no tiene colegio asignado." };
    }

    const { data: existingRequest } = await supabase
      .from("contact_requests")
      .select("id, status")
      .eq("company_id", caller.id)
      .eq("student_id", app.applicant_id)
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRequest?.status !== "approved") {
      if (existingRequest?.id) {
        return {
          success: true,
          requiresSchoolApproval: true,
          contactRequestId: existingRequest.id as string,
        };
      }

      const { data: createdRequest, error: requestErr } = await supabase
        .from("contact_requests")
        .insert({
          company_id: caller.id,
          student_id: app.applicant_id,
          school_id: applicant.school_id,
          message: `Solicitud para proponer entrevista por "${jobPosting?.title ?? "la vacante"}".`,
        })
        .select("id")
        .single();

      if (requestErr || !createdRequest) {
        return { error: requestErr?.message ?? "No se pudo crear la solicitud de contacto." };
      }

      return {
        success: true,
        requiresSchoolApproval: true,
        contactRequestId: createdRequest.id as string,
      };
    }
  }

  // Ensure a conversation exists between company and student using RLS.
  const convoId = await ensureConversation(supabase, caller.id, app.applicant_id);
  if (!convoId) return { error: "No se pudo abrir la conversación con el postulante." };

  // Insert the interview row
  const { data: interview, error: iErr } = await supabase
    .from("interviews")
    .insert({
      application_id: args.applicationId,
      company_id:     caller.id,
      student_id:     app.applicant_id,
      proposed_at:    args.proposedAt,
      duration_mins:  args.durationMins ?? 30,
      modality:       args.modality,
      location:       args.location ?? "",
      meeting_link:   args.meetingLink ?? "",
      notes:          args.notes ?? "",
      status:         "proposed",
    })
    .select("id")
    .single();

  if (iErr || !interview) return { error: iErr?.message ?? "No se pudo crear la entrevista." };

  const { error: msgErr } = await supabase.from("messages").insert({
    conversation_id: convoId,
    sender_id:       caller.id,
    content:         `Propuesta de entrevista para "${jobPosting?.title ?? "la vacante"}".`,
    kind:            "interview_proposal",
    metadata: {
      interview_id:   interview.id,
      application_id: args.applicationId,
      proposed_at:    args.proposedAt,
      duration_mins:  args.durationMins ?? 30,
      modality:       args.modality,
      location:       args.location ?? "",
      meeting_link:   args.meetingLink ?? "",
    },
    read: false,
  });

  if (msgErr) return { error: msgErr.message };

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

  const admin = createAdminClient();
  const { error } = await admin
    .from("interviews")
    .update({ status: response, updated_at: new Date().toISOString() })
    .eq("id", interviewId);

  if (error) return { error: error.message };

  // Log into the application event timeline
  await admin.from("application_events").insert({
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

  const admin = createAdminClient();
  const { error } = await admin
    .from("interviews")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", interviewId);

  if (error) return { error: error.message };
  return { success: true };
}
