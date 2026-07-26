"use server";
// ──────────────────────────────────────────────────────────
// School Server Actions — only callable by authenticated Colegio users
// ──────────────────────────────────────────────────────────

import { cookies } from "next/headers";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { createStudentSchema, editStudentSchema, isValidRut, formatRut } from "@/lib/schemas";

// ── createStudent ────────────────────────────────────────
// Creates a student Auth user + profile row owned by the calling school.
// Sets must_change_password in app_metadata so the student is forced
// to change their temp password on first login.
export async function createStudent(formData: {
  firstName:    string;
  lastName:     string;
  email:        string;
  tempPassword: string;
  rut:          string;
  gender:       string;
  cellphone:    string;
  class_name:   string;
  age:          number;
  specialty?:   string;
  grade?:       string;
}) {
  // 1. Validate input
  const parsed = createStudentSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // 2. Verify caller is an authenticated Colegio
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user: caller }, error: sessionErr } = await supabase.auth.getUser();

  if (sessionErr || !caller) {
    return { error: "No autenticado." };
  }

  const { data: callerProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("role, id")
    .eq("id", caller.id)
    .single();

  if (profileErr || !callerProfile) {
    return { error: "Perfil no encontrado." };
  }
  if (callerProfile.role !== "Colegio") {
    return { error: "Solo un Colegio puede crear estudiantes." };
  }

  const schoolId = callerProfile.id;

  // 3. Create the Auth user via admin client
  const admin = createAdminClient();
  const fullName = `${parsed.data.firstName.trim()} ${parsed.data.lastName.trim()}`;

  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email:          parsed.data.email.trim(),
    password:       parsed.data.tempPassword,
    email_confirm:  true, // skip email confirmation for school-created accounts
    app_metadata: {
      role:                 "Estudiante",
      must_change_password: true,
    },
    user_metadata: {
      name: fullName,
    },
  });

  if (createErr || !newUser.user) {
    const msg = createErr?.message ?? "Error al crear usuario.";
    return { error: msg };
  }

  // 4. Upsert profile row.
  // Supabase may fire an on_auth_user_created trigger that pre-inserts a row,
  // so we use upsert (ON CONFLICT DO UPDATE) to avoid the profiles_pkey
  // duplicate-key violation that would otherwise occur.
  const { error: insertErr } = await admin
    .from("profiles")
    .upsert(
      {
        id:         newUser.user.id,
        name:       fullName,
        email:      parsed.data.email.trim(),
        role:       "Estudiante",
        school_id:  schoolId,
        rut:        formatRut(parsed.data.rut),
        gender:     parsed.data.gender,
        cellphone:  parsed.data.cellphone.trim(),
        class_name: parsed.data.class_name.trim(),
        age:        parsed.data.age,
        specialty:  parsed.data.specialty ?? null,
        grade:      parsed.data.grade ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (insertErr) {
    // Roll back: delete the auth user we just created
    await admin.auth.admin.deleteUser(newUser.user.id);
    return { error: insertErr.message };
  }

  return { success: true, userId: newUser.user.id };
}

// ── clearMustChangePassword ──────────────────────────────
// Called after student successfully sets their new password.
// Removes the must_change_password flag from app_metadata.
export async function clearMustChangePassword() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user }, error: sessionErr } = await supabase.auth.getUser();

  if (sessionErr || !user) return { error: "No autenticado." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      must_change_password: false,
    },
  });

  if (error) return { error: error.message };
  return { success: true };
}

// ── graduateStudent ──────────────────────────────────────
// Promotes a student to Egresado. Only the owning school may call this.
export async function graduateStudent(studentId: string) {
  if (!studentId) return { error: "ID inválido." };

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user: caller }, error: sessionErr } = await supabase.auth.getUser();

  if (sessionErr || !caller) return { error: "No autenticado." };

  // Verify caller is a Colegio and owns the student
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, id")
    .eq("id", caller.id)
    .single();

  if (!callerProfile || callerProfile.role !== "Colegio") {
    return { error: "Solo un Colegio puede graduar estudiantes." };
  }

  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", studentId)
    .single();

  if (!studentProfile || studentProfile.school_id !== callerProfile.id) {
    return { error: "Estudiante no pertenece a este centro." };
  }
  if (studentProfile.role !== "Estudiante") {
    return { error: "Este perfil ya no es Estudiante." };
  }

  const admin = createAdminClient();

  // Update profile row
  const { error: updateErr } = await admin
    .from("profiles")
    .update({ role: "Egresado", updated_at: new Date().toISOString() })
    .eq("id", studentId);

  if (updateErr) return { error: updateErr.message };

  // Update auth app_metadata role
  await admin.auth.admin.updateUserById(studentId, {
    app_metadata: { role: "Egresado" },
  });

  return { success: true };
}

// ── bulkCreateStudents ───────────────────────────────────
// Creates multiple student Auth users + profiles in one call.
// Called by the SmartImporter component after CSV validation.
// Returns a summary of successes and per-row errors.
export async function bulkCreateStudents(students: Array<{
  name:        string;
  email:       string;
  password:    string;
  rut:         string;
  gender:      string;
  cellphone:   string;
  class_name:  string;
  age:         number;
  specialty?:  string;
  grade?:      string;
}>) {
  if (!Array.isArray(students) || students.length === 0) {
    return { error: "Lista vacía." };
  }

  // Verify caller is an authenticated Colegio
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user: caller }, error: sessionErr } = await supabase.auth.getUser();

  if (sessionErr || !caller) return { error: "No autenticado." };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, id")
    .eq("id", caller.id)
    .single();

  if (!callerProfile || callerProfile.role !== "Colegio") {
    return { error: "Solo un Colegio puede importar estudiantes." };
  }

  const schoolId = callerProfile.id;
  const admin    = createAdminClient();

  let created = 0;
  const errors: Array<{ index: number; email: string; message: string }> = [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];

    // Per-row RUT validation — skip row and report, do not abort the batch
    if (!isValidRut(s.rut)) {
      errors.push({ index: i, email: s.email, message: `RUT inválido: ${s.rut}` });
      continue;
    }

    // Create Auth user
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email:         s.email.trim(),
      password:      s.password,
      email_confirm: true,
      app_metadata:  { role: "Estudiante", must_change_password: true },
      user_metadata: { name: s.name.trim() },
    });

    if (createErr || !newUser.user) {
      errors.push({ index: i, email: s.email, message: createErr?.message ?? "Error al crear usuario." });
      continue;
    }

    // Upsert profile (trigger may pre-insert a row)
    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id:         newUser.user.id,
        name:       s.name.trim(),
        email:      s.email.trim(),
        role:       "Estudiante",
        school_id:  schoolId,
        rut:        formatRut(s.rut),
        gender:     s.gender   || null,
        cellphone:  s.cellphone.trim(),
        class_name: s.class_name.trim(),
        age:        s.age      || null,
        specialty:  s.specialty ?? null,
        grade:      s.grade     ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileErr) {
      // Roll back auth user to keep DB consistent
      await admin.auth.admin.deleteUser(newUser.user.id);
      errors.push({ index: i, email: s.email, message: profileErr.message });
      continue;
    }

    created++;
  }

  return { created, errors };
}

// ── Internal helper ──────────────────────────────────────
async function verifySchoolOwnsStudent(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  studentId: string
): Promise<{ schoolId: string } | { error: string }> {
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return { error: "No autenticado." };

  const { data: school } = await supabase
    .from("profiles").select("role, id").eq("id", caller.id).single();
  if (!school || school.role !== "Colegio") return { error: "Acceso denegado." };

  const { data: student } = await supabase
    .from("profiles").select("school_id").eq("id", studentId).single();
  if (!student || student.school_id !== school.id) return { error: "Estudiante no pertenece a este centro." };

  return { schoolId: school.id };
}

// ── updateStudentProfile ─────────────────────────────────
// Updates attendance and/or soft_skills for a student owned by the school.
export async function updateStudentProfile(
  studentId: string,
  data: { attendance?: number; soft_skills?: string[] }
) {
  if (!studentId) return { error: "ID inválido." };

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const check = await verifySchoolOwnsStudent(supabase, studentId);
  if ("error" in check) return check;

  const admin = createAdminClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.attendance !== undefined) {
    if (data.attendance < 0 || data.attendance > 100) return { error: "Asistencia debe estar entre 0 y 100." };
    update.attendance = data.attendance;
  }
  if (data.soft_skills !== undefined) update.soft_skills = data.soft_skills;

  const { error } = await admin.from("profiles").update(update).eq("id", studentId);
  if (error) return { error: error.message };
  return { success: true };
}

// ── upsertSchoolReport ───────────────────────────────────
// Creates or updates the latest school report for a student.
export async function upsertSchoolReport(
  studentId: string,
  data: { period: string; summary: string; teacher_comment: string; behavior_note: string }
) {
  if (!studentId) return { error: "ID inválido." };
  if (!data.period.trim()) return { error: "El período es obligatorio." };

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const check = await verifySchoolOwnsStudent(supabase, studentId);
  if ("error" in check) return check;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("school_reports")
    .select("id")
    .eq("student_id", studentId)
    .eq("period", data.period.trim())
    .single();

  if (existing?.id) {
    const { error } = await admin.from("school_reports").update({
      summary:         data.summary,
      teacher_comment: data.teacher_comment,
      behavior_note:   data.behavior_note,
      updated_at:      now,
    }).eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("school_reports").insert({
      student_id:      studentId,
      school_id:       check.schoolId,
      period:          data.period.trim(),
      summary:         data.summary,
      teacher_comment: data.teacher_comment,
      behavior_note:   data.behavior_note,
      created_at:      now,
      updated_at:      now,
    });
    if (error) return { error: error.message };
  }

  return { success: true };
}


// ── editStudentBySchool ──────────────────────────────────
// Epic 2 — School RBAC: lets a Colegio backfill or correct mandatory
// student fields on profiles it owns.
export async function editStudentBySchool(
  studentId: string,
  data: {
    rut?:        string;
    gender?:     string;
    cellphone?:  string;
    class_name?: string;
    age?:        number;
    specialty?:  string;
    grade?:      string;
    attendance?: number;
    soft_skills?: string[];
  }
): Promise<{ success?: boolean; error?: string }> {
  if (!studentId) return { error: "ID inválido." };

  const parsed = editStudentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const check = await verifySchoolOwnsStudent(supabase, studentId);
  if ("error" in check) return check;

  const admin = createAdminClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const d = parsed.data;
  if (d.rut        !== undefined) update.rut        = formatRut(d.rut);
  if (d.gender     !== undefined) update.gender     = d.gender;
  if (d.cellphone  !== undefined) update.cellphone  = d.cellphone.trim();
  if (d.class_name !== undefined) update.class_name = d.class_name.trim();
  if (d.age        !== undefined) update.age        = d.age;
  if (d.specialty  !== undefined) update.specialty  = d.specialty;
  if (d.grade      !== undefined) update.grade      = d.grade;
  if (d.attendance !== undefined) {
    if (d.attendance < 0 || d.attendance > 100) return { error: "Asistencia debe estar entre 0 y 100." };
    update.attendance = d.attendance;
  }
  if (d.soft_skills !== undefined) update.soft_skills = d.soft_skills;

  const { error } = await admin.from("profiles").update(update).eq("id", studentId);
  if (error) return { error: error.message };
  return { success: true };
}

// ── validateStudentSkill ─────────────────────────────────
// Inserts a skill_validations row — the DB trigger then awards the badge,
// logs the reputation event, and notifies the student.
// Only the student's own school can validate.
export async function validateStudentSkill(
  studentId: string,
  skillId:   string,
  note?:     string
): Promise<{ success?: boolean; error?: string }> {
  const cookieStore = await cookies();
  const supabase    = createServerSupabaseClient(cookieStore as any); // eslint-disable-line

  const { data: { user: caller }, error: sessionErr } = await supabase.auth.getUser();
  if (sessionErr || !caller) return { error: "No autenticado." };

  const { data: schoolProfile } = await supabase
    .from("profiles")
    .select("role, id")
    .eq("id", caller.id)
    .single();

  if (!schoolProfile || schoolProfile.role !== "Colegio") {
    return { error: "Solo un Colegio puede validar habilidades." };
  }

  // Confirm the student belongs to this school
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", studentId)
    .single();

  if (!studentProfile || studentProfile.school_id !== schoolProfile.id) {
    return { error: "El estudiante no pertenece a este centro." };
  }

  // Insert validation — trigger handles badge + reputation + notification
  const { error: insertErr } = await supabase
    .from("skill_validations")
    .insert({
      student_id:   studentId,
      skill_id:     skillId,
      validator_id: schoolProfile.id,
      note:         note?.trim() ?? "",
    });

  if (insertErr) {
    // Unique violation = already validated
    if (insertErr.code === "23505") return { success: true };
    return { error: insertErr.message };
  }

  return { success: true };
}
