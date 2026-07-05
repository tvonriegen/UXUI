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
    .select("id, role, name, company_name")
    .eq("id", caller.id)
    .single();
  if (!data || data.role !== "Empresa") return null;
  return { ...data, userId: caller.id };
}

// ── updateApplicationStatus (legacy: accept/reject only) ─
// Kept for backwards compatibility with any callers that still pass studentId + jobTitle.
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: "accepted" | "rejected",
  studentId:     string,
  jobTitle:      string
) {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const company = await getCallerCompany(supabase);
  if (!company) return { error: "Acceso denegado." };

  // Verify this application belongs to one of the company's job postings
  const { data: app } = await supabase
    .from("job_applications")
    .select("id, job_postings!inner(company_id)")
    .eq("id", applicationId)
    .single();

  if (!app) return { error: "Aplicación no encontrada." };
  // eslint-disable-next-line
  if ((app.job_postings as any)?.company_id !== company.userId) return { error: "Acceso denegado." };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: updateErr } = await admin
    .from("job_applications")
    .update({ status: newStatus, updated_at: now })
    .eq("id", applicationId);

  if (updateErr) return { error: updateErr.message };

  const display = company.company_name || company.name || "La empresa";
  const notifCopy = ATS_NOTIF[newStatus];
  if (notifCopy) {
    await admin.from("notifications").insert({
      user_id:    studentId,
      title:      notifCopy.title,
      body:       notifCopy.body(display, jobTitle),
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
  if (!applicationId || !jobId) return { error: "Parámetros inválidos." };

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const company = await getCallerCompany(supabase);
  if (!company) return { error: "Acceso denegado." };

  // Verify the job belongs to this company; fetch title + max_candidates
  const { data: posting } = await supabase
    .from("job_postings")
    .select("company_id, max_candidates, title")
    .eq("id", jobId)
    .eq("company_id", company.userId)
    .single();

  if (!posting) return { error: "Vacante no encontrada o acceso denegado." };

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

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Fetch applicant_id before updating (needed for notification)
  const { data: appRow } = await admin
    .from("job_applications")
    .select("applicant_id")
    .eq("id", applicationId)
    .single();

  const { error } = await admin
    .from("job_applications")
    .update({ status: newStatus, updated_at: now })
    .eq("id", applicationId);

  if (error) return { error: error.message };

  // Notify the student of every meaningful status transition
  if (appRow?.applicant_id) {
    const display   = company.company_name || company.name || "La empresa";
    const jobTitle  = (posting as any).title ?? "la vacante";
    const notifCopy = ATS_NOTIF[newStatus];

    if (notifCopy) {
      await admin.from("notifications").insert({
        user_id:    appRow.applicant_id,
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

  const { error } = await admin.from("internship_requests").insert({
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
  });

  if (error) return { error: error.message };

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
    .select("role")
    .eq("id", caller.id)
    .single();
  if (!callerProfile || callerProfile.role !== "Colegio") return { error: "Acceso denegado." };

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
