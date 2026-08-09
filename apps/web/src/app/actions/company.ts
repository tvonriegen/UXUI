"use server";
// ──────────────────────────────────────────────────────────
// Company Server Actions
// ──────────────────────────────────────────────────────────

import { cookies } from "next/headers";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase-server";

/** Full ATS pipeline status values (mirrors DB constraint) */
export type AtsStatus =
  | "pending"
  | "reviewing"
  | "interviewing"
  | "accepted"
  | "rejected"
  | "hired";

/** Human-readable labels + notification copy per status */
const ATS_NOTIF: Record<AtsStatus, { title: string; body: (company: string, job: string) => string } | null> = {
  pending:      null,   // No notification when reverting to pending
  reviewing:    {
    title: "Postulación en revisión 👀",
    body:  (c, j) => `${c} está revisando tu postulación para "${j}". Estamos al pendiente.`,
  },
  interviewing: {
    title: "¡Avanzaste a entrevistas! 🎤",
    body:  (c, j) => `${c} te ha seleccionado para una entrevista para "${j}". ¡Prepárate!`,
  },
  accepted: {
    title: "¡Postulación aceptada! 🎉",
    body:  (c, j) => `${c} aceptó tu postulación para "${j}". ¡Felicidades!`,
  },
  rejected: {
    title: "Postulación revisada",
    body:  (c, j) => `${c} revisó tu postulación para "${j}" y no continuará con tu candidatura. ¡Gracias por aplicar!`,
  },
  hired: {
    title: "¡Fuiste contratado! 🏆",
    body:  (c, j) => `${c} te ha contratado para el puesto "${j}". ¡Bienvenido al equipo!`,
  },
};

// ── Helper: resolve caller as a company profile ──────────
async function getCallerCompany(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, account_type, account_status, name, company_name")
    .eq("id", caller.id)
    .single();
  if (!data || data.account_type !== "company" || data.account_status !== "active") return null;
  return { ...data, userId: caller.id };
}

type AuthorizedApplication = {
  id: string;
  applicant_id: string;
  job_id: string;
  job_postings: { company_id: string; title: string; max_candidates: number | null } | null;
};

/** Resolve the application and posting under the authenticated caller's authority. */
async function getAuthorizedApplication(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  companyId: string,
  applicationId: string,
  jobId?: string,
) {
  let query = supabase
    .from("job_applications")
    .select("id, applicant_id, job_id, job_postings!inner(company_id, title, max_candidates)")
    .eq("id", applicationId)
    .eq("job_postings.company_id", companyId);
  if (jobId) query = query.eq("job_id", jobId);

  const { data } = await query.single();
  const app = data as AuthorizedApplication | null;
  if (!app || app.job_postings?.company_id !== companyId) return null;
  return app;
}

const ATS_STATUSES: readonly AtsStatus[] = [
  "pending", "reviewing", "interviewing", "accepted", "rejected", "hired",
];

function isAtsStatus(value: unknown): value is AtsStatus {
  return typeof value === "string" && ATS_STATUSES.includes(value as AtsStatus);
}

// ── updateApplicationStatus (legacy: accept/reject only) ─
// Kept for backwards compatibility with any callers that still pass studentId + jobTitle.
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: "accepted" | "rejected",
  studentId:     string,
  jobTitle:      string
) {
  if (!applicationId || !isAtsStatus(newStatus) || !["accepted", "rejected"].includes(newStatus)) {
    return { error: "Parámetros inválidos." };
  }

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const company = await getCallerCompany(supabase);
  if (!company) return { error: "Acceso denegado." };

  const app = await getAuthorizedApplication(supabase, company.userId, applicationId);
  if (!app) return { error: "Aplicación no encontrada o acceso denegado." };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: updatedRows, error: updateErr } = await supabase
    .from("job_applications")
    .update({ status: newStatus, updated_at: now })
    .eq("id", applicationId)
    .eq("job_id", app.job_id)
    .select("id");

  if (updateErr) return { error: updateErr.message };
  if (!updatedRows || updatedRows.length !== 1) return { error: "No se pudo actualizar la aplicación." };

  const display = company.company_name || company.name || "La empresa";
  const notifCopy = ATS_NOTIF[newStatus];
  if (notifCopy) {
    await admin.from("notifications").insert({
      user_id:    app.applicant_id,
      title:      notifCopy.title,
      body:       notifCopy.body(display, app.job_postings?.title ?? "la vacante"),
      type:       "application",
      link:       "/empleos",
      created_at: now,
    });
  }

  return { success: true };
}

// ── updateApplicationStatusSA ────────────────────────────
// Full ATS pipeline: supports all 6 statuses, enforces max_candidates,
// notifies the student on every transition.
export async function updateApplicationStatusSA(
  applicationId: string,
  jobId:         string,
  newStatus:     AtsStatus
) {
  if (!applicationId || !jobId || !isAtsStatus(newStatus)) return { error: "Parámetros inválidos." };

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const company = await getCallerCompany(supabase);
  if (!company) return { error: "Acceso denegado." };

  const app = await getAuthorizedApplication(supabase, company.userId, applicationId, jobId);
  if (!app || !app.job_postings) return { error: "Vacante no encontrada o acceso denegado." };
  const posting = app.job_postings;

  // Enforce max_candidates cap only when accepting
  if (newStatus === "accepted" && posting.max_candidates != null) {
    const { count } = await supabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .in("status", ["accepted", "hired"]);

    if ((count ?? 0) >= posting.max_candidates) {
      return {
        error: `Límite de ${posting.max_candidates} candidatos alcanzado. Rechaza alguno para aceptar nuevos.`,
      };
    }
  }

  const now = new Date().toISOString();

  const { data: updatedRows, error } = await supabase
    .from("job_applications")
    .update({ status: newStatus, updated_at: now })
    .eq("id", applicationId)
    .eq("job_id", jobId)
    .select("id");

  if (error) return { error: error.message };
  if (!updatedRows || updatedRows.length !== 1) return { error: "No se pudo actualizar la aplicación." };

  const admin = createAdminClient();

  // Notify the student of every meaningful status transition
  if (app.applicant_id) {
    const display   = company.company_name || company.name || "La empresa";
    const jobTitle  = posting.title ?? "la vacante";
    const notifCopy = ATS_NOTIF[newStatus];

    if (notifCopy) {
      await admin.from("notifications").insert({
        user_id:    app.applicant_id,
        title:      notifCopy.title,
        body:       notifCopy.body(display, jobTitle),
        type:       "application",
        link:       "/empleos",
        created_at: now,
      });
    }
  }

  return { success: true };
}

// ── createInternshipRequest ──────────────────────────────
// Company → School talent request. Appears in school's "Solicitudes".
export async function createInternshipRequest(
  schoolId: string,
  data: { title: string; description: string; specialty: string; slots: number; urgent: boolean }
) {
  if (!data.title.trim()) return { error: "El título es obligatorio." };
  if (!schoolId) return { error: "Debes seleccionar un colegio." };

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const company = await getCallerCompany(supabase);
  if (!company) return { error: "Solo Empresas pueden solicitar alumnos." };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: createdRequest, error } = await admin.from("internship_requests").insert({
    company_id:  company.userId,
    school_id:   schoolId,
    title:       data.title.trim(),
    description: data.description,
    specialty:   data.specialty,
    slots:       Math.max(1, data.slots),
    urgent:      data.urgent,
    status:      "pendiente",
    created_at:  now,
    updated_at:  now,
  }).select("id").single();

  if (error || !createdRequest?.id) return { error: error?.message ?? "No se pudo crear la solicitud." };

  await admin.from("opportunities").upsert({
    id: createdRequest.id,
    publisher_id: company.userId,
    publisher_type: "company",
    opportunity_type: "internship",
    title: data.title.trim(),
    description: data.description,
    specialty: data.specialty,
    max_candidates: Math.max(1, data.slots),
    status: "draft",
    created_at: now,
    updated_at: now,
  }, { onConflict: "id" });
  await admin.from("opportunity_legacy_links").upsert({
    opportunity_id: createdRequest.id,
    legacy_source: "internship_requests",
    legacy_id: createdRequest.id,
  }, { onConflict: "legacy_source,legacy_id" });

  const display = company.company_name || company.name || "Una empresa";
  await admin.from("notifications").insert({
    user_id:    schoolId,
    title:      data.urgent ? "⚠️ Solicitud urgente de empresa" : "Nueva solicitud de empresa",
    body:       `${display} solicita ${data.slots} alumno(s)${data.specialty ? ` de ${data.specialty}` : ""}. Revisa tus Solicitudes.`,
    type:       "practica",
    link:       "/administracion",
    created_at: now,
  });

  return { success: true };
}

// ── updateInternshipRequest ──────────────────────────────
// School approves or rejects a company's talent request.
export async function updateInternshipRequest(
  requestId: string,
  status: "aprobado" | "rechazado"
) {
  if (!requestId) return { error: "ID inválido." };

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return { error: "No autenticado." };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", caller.id)
    .single();
  if (!callerProfile || callerProfile.account_type !== "school") return { error: "Acceso denegado." };

  const { data: req } = await supabase
    .from("internship_requests")
    .select("school_id, company_id, title")
    .eq("id", requestId)
    .single();

  if (!req || req.school_id !== caller.id) return { error: "Acceso denegado." };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin
    .from("internship_requests")
    .update({ status, updated_at: now })
    .eq("id", requestId);
  if (error) return { error: error.message };

  await admin.from("opportunities").update({
    status: status === "aprobado" ? "open" : "closed",
    updated_at: now,
  }).eq("id", requestId);

  await admin.from("notifications").insert({
    user_id:    req.company_id,
    title:      status === "aprobado" ? "Solicitud aprobada ✓" : "Solicitud rechazada",
    body:       `Tu solicitud "${req.title}" fue ${status === "aprobado" ? "aprobada" : "rechazada"} por el centro educativo.`,
    type:       "alliance",
    link:       "/profile",
    created_at: now,
  });

  return { success: true };
}
