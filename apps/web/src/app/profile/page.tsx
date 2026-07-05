"use client";
import { useState, useEffect, useCallback } from "react";
import PageLayout from "@/components/layout/PageLayout";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { profileEditSchema, THEME_COLORS, type ThemeColor } from "@/lib/schemas";
import { createStudent, graduateStudent, updateStudentProfile, upsertSchoolReport } from "@/app/actions/school";
import { updateApplicationStatus, updateInternshipRequest, createInternshipRequest } from "@/app/actions/company";
import type { Vacancy, JobApplicant } from "@/lib/types";
import { PortfolioGrid } from "./_components/PortfolioGrid";
import { BadgesGrid }    from "./_components/BadgesGrid";
import ReputationCard    from "@/components/profile/ReputationCard";
import { useToast }      from "@/components/ui/Toast";
import { useConfirm }    from "@/components/ui/ConfirmDialog";
import {
  MapPin, Mail, Edit, Loader2, Camera, Award, ExternalLink,
  GraduationCap, Lock, Globe, Building2, Users, TrendingUp,
  Heart, Send, Circle, CheckCircle, FileText, User, Download,
  Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Plus,
  Search, ChevronRight,
} from "lucide-react";

type Role = "Estudiante" | "Egresado" | "Empresa" | "Colegio";

interface Profile {
  id: string; name: string; email: string; role: Role;
  avatar: string; bio: string; location: string;
  specialty: string; title: string; xp: number; level: number;
  streak: number; gpa: number | null; availability: string;
  years_experience: number;
  company_name: string; industry: string; employee_count: string;
  website: string; open_positions: number;
  school_name: string; student_count: number | null;
  alliance_count: number; employability_rate: number | null;
  // Step 1 additions
  soft_skills: string[] | null;
  attendance: number | null;
  rut: string | null;
  // Metadata
  created_at: string;
  // Institutional backing (student)
  school_id: string | null;
  // Reputation
  reputation_score: number;
  // Personalization
  banner_url: string | null;
  theme_color: ThemeColor | null;
}

interface DbSchoolReport {
  id: string; period: string; summary: string;
  teacher_comment: string; behavior_note: string;
}

interface PortfolioItem {
  id: string; title: string; description: string; image: string; link: string;
}

interface UserBadge {
  id: string; name: string; icon: string; description: string;
  earned: boolean; earned_at: string | null;
}

interface SchoolProfileData {
  id: string;
  name: string;
  avatar: string;
  school_name: string;
  location: string;
}

export default function ProfilePage() {
  const { user }    = useAuth();
  const { toast }   = useToast();
  const confirmFn   = useConfirm();
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [badges, setBadges]     = useState<UserBadge[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfileData | null>(null);
  const [tab, setTab]           = useState("Resumen");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [editName,         setEditName]         = useState("");
  const [editBio,          setEditBio]          = useState("");
  const [editLocation,     setEditLocation]     = useState("");
  const [editSpecialty,    setEditSpecialty]    = useState("");
  const [editTitle,        setEditTitle]        = useState("");
  const [editAvailability, setEditAvailability] = useState("Disponible");
  const [editWebsite,      setEditWebsite]      = useState("");
  const [editIndustry,     setEditIndustry]     = useState("");
  const [editThemeColor,   setEditThemeColor]   = useState<ThemeColor | "">("");

  // Inline edit mode (student)
  const [isEditing,        setIsEditing]        = useState(false);
  const [editSkills,       setEditSkills]       = useState("");
  const [editSoftSkillsStr,setEditSoftSkillsStr]= useState("");
  const [editBioInline,    setEditBioInline]    = useState("");
  const [editLocationInline,setEditLocationInline] = useState("");

  // Local student-specific data (populated from DB profile after load)
  const [localSoftSkills,  setLocalSoftSkills]  = useState<string[]>([]);
  const [localSkills,      setLocalSkills]      = useState<string[]>([]);
  const [localBio,         setLocalBio]         = useState<string | null>(null);
  const [localLocation,    setLocalLocation]    = useState<string | null>(null);

  // School report (student)
  const [schoolReport,     setSchoolReport]     = useState<DbSchoolReport | null>(null);

  // Company vacancies (fetched from DB)
  const [localVacancies,   setLocalVacancies]   = useState<Vacancy[]>([]);
  const [expandedVacancy,  setExpandedVacancy]  = useState<string | null>(null);
  const [applicantStatuses,setApplicantStatuses]= useState<Record<string, "pending"|"reviewing"|"interviewing"|"accepted"|"rejected"|"hired">>({});
  const [applicantStudentIds,setApplicantStudentIds]= useState<Record<string, string>>({});
  const [updatingApp,        setUpdatingApp]        = useState<string|null>(null);
  const [addVacancyOpen,   setAddVacancyOpen]   = useState(false);
  const [newVacTitle,      setNewVacTitle]      = useState("");
  const [newVacDept,       setNewVacDept]       = useState("");
  const [newVacType,       setNewVacType]       = useState<"Pasantia"|"Tiempo completo"|"Part-time">("Pasantia");
  const [newVacDuration,   setNewVacDuration]   = useState("");
  const [newVacPaid,       setNewVacPaid]       = useState(true);
  const [newVacSalary,     setNewVacSalary]     = useState("");
  const [newVacDesc,       setNewVacDesc]       = useState("");

  // Welcome onboarding popup
  const [showOnboarding,   setShowOnboarding]   = useState(false);

  // School students tab
  const [schoolSearch,     setSchoolSearch]     = useState("");
  const [schoolSpecialty,  setSchoolSpecialty]  = useState("Todos");

  // DB-fetched students (Colegio role)
  interface DbStudent {
    id: string; name: string; email: string; avatar: string | null;
    specialty: string | null; grade: string | null;
    attendance: number | null; availability: string | null;
    soft_skills: string[] | null;
  }
  const [dbStudents,       setDbStudents]       = useState<DbStudent[]>([]);
  const [studentsLoading,  setStudentsLoading]  = useState(false);

  // Add Student modal
  const [addStudentOpen,   setAddStudentOpen]   = useState(false);
  const [newStFirstName,   setNewStFirstName]   = useState("");
  const [newStLastName,    setNewStLastName]     = useState("");
  const [newStEmail,       setNewStEmail]       = useState("");
  const [newStPassword,    setNewStPassword]    = useState("");
  const [newStRut,         setNewStRut]         = useState("");
  const [newStGender,      setNewStGender]      = useState("");
  const [newStCellphone,   setNewStCellphone]   = useState("");
  const [newStClassName,   setNewStClassName]   = useState("");
  const [newStAge,         setNewStAge]         = useState<number | "">("");
  const [newStSpecialty,   setNewStSpecialty]   = useState("");
  const [newStGrade,       setNewStGrade]       = useState("");
  const [addStudentErr,    setAddStudentErr]    = useState<string|null>(null);
  const [addStudentOk,     setAddStudentOk]     = useState(false);
  const [addStudentBusy,   setAddStudentBusy]   = useState(false);

  // Graduate action
  const [graduatingId,     setGraduatingId]     = useState<string|null>(null);

  // Student management panel (per-student inline editing)
  const [managingId,       setManagingId]       = useState<string|null>(null);
  const [mgmtAtt,          setMgmtAtt]          = useState(0);
  const [mgmtSkillsStr,    setMgmtSkillsStr]    = useState("");
  const [mgmtPeriod,       setMgmtPeriod]       = useState("");
  const [mgmtSummary,      setMgmtSummary]      = useState("");
  const [mgmtTeacher,      setMgmtTeacher]      = useState("");
  const [mgmtBehavior,     setMgmtBehavior]     = useState("");
  const [mgmtReportLoaded, setMgmtReportLoaded] = useState(false);
  const [mgmtSaving,       setMgmtSaving]       = useState<"att"|"skills"|"report"|null>(null);
  const [mgmtMsg,          setMgmtMsg]          = useState<{type:"ok"|"err"; text:string}|null>(null);

  // Recommendation form
  const [recFormTarget,    setRecFormTarget]    = useState<"colegio"|"empresa"|null>(null);
  const [recMessage,       setRecMessage]       = useState("");

  // Internship requests (Colegio — Solicitudes tab)
  interface DbInternshipRequest {
    id: string; company_id: string; title: string;
    description: string | null; specialty: string | null;
    slots: number; urgent: boolean;
    status: "pendiente" | "aprobado" | "rechazado";
    created_at: string;
    profiles?: { name: string; company_name: string | null; avatar: string | null } | null;
  }
  const [internshipReqs,   setInternshipReqs]   = useState<DbInternshipRequest[]>([]);
  const [reqsLoading,      setReqsLoading]      = useState(false);
  const [updatingReq,      setUpdatingReq]      = useState<string|null>(null);

  // Company — Solicitar Alumnos modal
  const [solicitarOpen,    setSolicitarOpen]    = useState(false);
  const [solTitle,         setSolTitle]         = useState("");
  const [solDesc,          setSolDesc]          = useState("");
  const [solSpecialty,     setSolSpecialty]     = useState("");
  const [solSlots,         setSolSlots]         = useState(1);
  const [solUrgent,        setSolUrgent]        = useState(false);
  const [solSchoolId,      setSolSchoolId]      = useState("");
  const [solSchools,       setSolSchools]       = useState<{ id: string; name: string }[]>([]);
  const [solErr,           setSolErr]           = useState<string|null>(null);
  const [solOk,            setSolOk]            = useState(false);
  const [solBusy,          setSolBusy]          = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (err || !data) { setError("No se pudo cargar el perfil."); setLoading(false); return; }
    setProfile(data as Profile);
    setLoading(false);
  }, [user?.id]);

  const fetchPortfolio = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("portfolio_items")
      .select("id, title, description, image, link")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPortfolio(data ?? []);
  }, [user?.id]);

  const fetchBadges = useCallback(async () => {
    if (!user?.id) return;
    const [{ data: userBadges }, { data: allBadges }, { data: svData }] = await Promise.all([
      supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", user.id),
      supabase.from("badges").select("id, name, icon, description"),
      supabase
        .from("skill_validations")
        .select("skills!skill_validations_skill_id_fkey(name)")
        .eq("student_id", user.id),
    ]);
    type BadgeRow  = { id: string; name: string; icon: string; description: string };
    type EarnedRow = { badge_id: string; earned_at: string | null };
    const earned     = new Map((userBadges ?? []).map((r: EarnedRow) => [r.badge_id, r.earned_at]));
    const skillNames = new Set(
      (svData ?? []).map((r: any) => (r.skills as { name?: string } | null)?.name ?? "").filter(Boolean)
    );
    const VALIDATED_BADGE_NAMES = new Set(["Habilidad Técnica Validada", "Aval Institucional"]);
    setBadges(
      (allBadges ?? []).map((b: BadgeRow) => ({
        id: b.id, name: b.name, icon: b.icon, description: b.description,
        earned: earned.has(b.id),
        earned_at: earned.get(b.id) ?? null,
        verified: earned.has(b.id) && VALIDATED_BADGE_NAMES.has(b.name),
        skill_name: VALIDATED_BADGE_NAMES.has(b.name) && skillNames.size > 0
          ? Array.from(skillNames).join(", ")
          : undefined,
      }))
    );
  }, [user?.id]);

  const fetchStudents = useCallback(async () => {
    if (!user?.id) return;
    setStudentsLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, avatar, specialty, grade, attendance, availability, soft_skills")
      .eq("school_id", user.id)
      .eq("role", "Estudiante")
      .order("name");
    setDbStudents((data ?? []) as DbStudent[]);
    setStudentsLoading(false);
  }, [user?.id]);

  const fetchVacancies = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("job_postings")
      .select(`
        id, title, description, type, specialty, location, active,
        department, duration, paid, salary,
        job_applications (
          id, status,
          profiles!job_applications_applicant_id_fkey (id, name, avatar, specialty)
        )
      `)
      .eq("company_id", user.id)
      .order("created_at", { ascending: false });

    if (!data) return;
    const mapped: Vacancy[] = (data as unknown[]).map((raw: unknown) => {
      const r = raw as {
        id: string; title: string; description: string; type: string;
        active: boolean; department?: string; duration?: string;
        paid?: boolean; salary?: string;
        job_applications?: { id: string; status: string; profiles?: { id: string; name: string; avatar: string | null; specialty: string | null } | null }[];
      };
      const applicants = (r.job_applications ?? []).map((a) => ({
        id: a.id,
        name: a.profiles?.name ?? "Estudiante",
        avatar: a.profiles?.avatar ?? "",
        specialty: a.profiles?.specialty ?? "",
        status: (["pending","accepted","rejected"].includes(a.status) ? a.status : "pending") as "pending"|"accepted"|"rejected",
        matchScore: 0,
      }));
      return {
        id: r.id,
        title: r.title,
        description: r.description ?? "",
        type: (r.type ?? "Pasantia") as Vacancy["type"],
        department: r.department ?? "",
        duration: r.duration ?? "",
        paid: r.paid ?? false,
        salary: r.salary ?? "",
        status: r.active ? "Abierta" : "Cerrada",
        applicants,
      } as Vacancy;
    });
    setLocalVacancies(mapped);
    // Sync applicant statuses + student IDs
    const statuses: Record<string, "pending"|"reviewing"|"interviewing"|"accepted"|"rejected"|"hired"> = {};
    const studentIds: Record<string, string> = {};
    mapped.forEach((v) => v.applicants.forEach((a) => {
      statuses[a.id] = a.status;
    }));
    // Also build studentId map from raw data
    (data as unknown[]).forEach((raw: unknown) => {
      const r = raw as { job_applications?: { id: string; profiles?: { id?: string } | null }[] };
      (r.job_applications ?? []).forEach((a) => {
        if (a.profiles?.id) studentIds[a.id] = a.profiles.id;
      });
    });
    setApplicantStatuses(statuses);
    setApplicantStudentIds(studentIds);
  }, [user?.id]);

  const fetchSchoolReport = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("school_reports")
      .select("id, period, summary, teacher_comment, behavior_note")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    setSchoolReport((data as DbSchoolReport | null) ?? null);
  }, [user?.id]);

  const fetchUserSkills = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("user_skills")
      .select("skills(name)")
      .eq("user_id", user.id);
    const names = (data ?? []).map((row: unknown) => {
      const r = row as { skills?: { name?: string } | null };
      return r.skills?.name ?? "";
    }).filter(Boolean);
    setLocalSkills(names);
  }, [user?.id]);

  // Fetch the origin school data for a student profile (Aval Institucional)
  const fetchSchoolProfile = useCallback(async (schoolId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, avatar, school_name, location")
      .eq("id", schoolId)
      .single();
    setSchoolProfile((data as SchoolProfileData | null) ?? null);
  }, []);

  const fetchInternshipRequests = useCallback(async () => {
    if (!user?.id) return;
    setReqsLoading(true);
    const { data } = await supabase
      .from("internship_requests")
      .select("id, company_id, title, description, specialty, slots, urgent, status, created_at, profiles!internship_requests_company_id_fkey(name, company_name, avatar)")
      .eq("school_id", user.id)
      .order("created_at", { ascending: false });
    setInternshipReqs((data ?? []) as unknown as DbInternshipRequest[]);
    setReqsLoading(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSchoolsForSolicitar = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("role", "Colegio")
      .order("name");
    setSolSchools((data ?? []) as { id: string; name: string }[]);
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchPortfolio();
    fetchBadges();
  }, [fetchProfile, fetchPortfolio, fetchBadges]);

  // Fetch students when school tab is first viewed
  useEffect(() => {
    if (tab === "Mis Estudiantes" && user?.role === "Colegio") fetchStudents();
  }, [tab, fetchStudents, user?.role]);

  // Fetch internship requests when Solicitudes tab is active
  useEffect(() => {
    if (tab === "Solicitudes" && user?.role === "Colegio") fetchInternshipRequests();
  }, [tab, fetchInternshipRequests, user?.role]);

  // Populate local state from profile once loaded
  useEffect(() => {
    if (!profile) return;
    if (profile.soft_skills) setLocalSoftSkills(profile.soft_skills);
    if (profile.role === "Empresa") fetchVacancies();
    if (profile.role === "Estudiante" || profile.role === "Egresado") {
      fetchSchoolReport();
      fetchUserSkills();
      if (profile.school_id) fetchSchoolProfile(profile.school_id);
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Welcome popup — only shown to students whose account is at least 1 hour old.
  // Brand-new users are exempt so they can explore freely before being prompted.
  useEffect(() => {
    if (profile?.role === "Estudiante" && !localStorage.getItem("cl_onboarded")) {
      const ageMs   = profile.created_at ? Date.now() - new Date(profile.created_at).getTime() : 0;
      const ageHrs  = ageMs / (1000 * 60 * 60);
      if (ageHrs >= 1) setShowOnboarding(true);
    }
  }, [profile?.role, profile?.created_at]);

  const openEdit = () => {
    if (!profile) return;
    setEditName(profile.name ?? "");
    setEditBio(profile.bio ?? "");
    setEditLocation(profile.location ?? "");
    setEditSpecialty(profile.specialty ?? "");
    setEditTitle(profile.title ?? "");
    setEditAvailability(profile.availability ?? "Disponible");
    setEditWebsite(profile.website ?? "");
    setEditIndustry(profile.industry ?? "");
    setEditThemeColor((profile.theme_color ?? "") as ThemeColor | "");
    setSaveError(null);
    setSaveSuccess(false);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!user?.id || !profile) return;
    setSaving(true); setSaveError(null); setSaveSuccess(false);

    const parsed = profileEditSchema.safeParse({
      name:         editName,
      bio:          editBio         || undefined,
      location:     editLocation    || undefined,
      specialty:    editSpecialty   || undefined,
      title:        editTitle       || undefined,
      availability: editAvailability || undefined,
      website:      editWebsite     || undefined,
      theme_color:  editThemeColor  || undefined,
    });

    if (!parsed.success) {
      setSaveError(parsed.error.issues[0]?.message ?? "Error de validación");
      setSaving(false);
      return;
    }

    try {
      const updatePayload: Record<string, string | number | boolean | null | undefined> = {
        name:        editName.trim(),
        bio:         editBio.trim(),
        location:    editLocation.trim(),
        theme_color: editThemeColor || null,
        updated_at:  new Date().toISOString(),
      };

      const isStudent = profile.role === "Estudiante" || profile.role === "Egresado";
      const isCompany = profile.role === "Empresa";

      if (isStudent) {
        updatePayload.specialty    = editSpecialty.trim();
        updatePayload.title        = editTitle.trim();
        updatePayload.availability = editAvailability || null;
      }
      if (isCompany) {
        updatePayload.website  = editWebsite.trim();
        updatePayload.industry = editIndustry.trim();
      }

      const { error: err } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id);

      if (err) { setSaveError(err.message); setSaving(false); return; }

      setProfile((prev) => prev ? { ...prev, ...updatePayload } : prev);
      setSaveSuccess(true);
      setSaving(false);
      setTimeout(() => { setEditOpen(false); setSaveSuccess(false); }, 1200);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Error inesperado al guardar");
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 5 * 1024 * 1024) { setError("La imagen debe ser menor a 5MB."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Solo se permiten imágenes JPEG, PNG o WebP."); return;
    }
    setUploadingAvatar(true);
    const ext  = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar: publicUrl }).eq("id", user.id);
      setProfile((prev) => prev ? { ...prev, avatar: publicUrl } : prev);
    } else {
      setError("No se pudo subir la foto de perfil.");
    }
    setUploadingAvatar(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 5 * 1024 * 1024) { setError("La imagen debe ser menor a 5MB."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Solo se permiten imágenes JPEG, PNG o WebP."); return;
    }
    setUploadingBanner(true);
    const ext  = file.name.split(".").pop();
    const path = `${user.id}/banner.${ext}`;
    const { error: upErr } = await supabase.storage.from("banners").upload(path, file, { upsert: true });
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(path);
      await supabase.from("profiles").update({ banner_url: publicUrl }).eq("id", user.id);
      setProfile((prev) => prev ? { ...prev, banner_url: publicUrl } : prev);
    } else {
      setError("No se pudo subir la imagen del banner.");
    }
    setUploadingBanner(false);
  };

  // ── CV Download (student / graduate) ─────────────────────────
  const handleDownloadCV = () => {
    if (!profile) return;
    const skills = localSkills.join(", ") || "—";
    const softSk = localSoftSkills.join(", ") || "—";
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>CV – ${profile.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color:#1e293b; background:#f8fafc; padding:40px; }
  .card { background:#fff; border-radius:16px; padding:40px; max-width:720px; margin:0 auto; box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .header { display:flex; align-items:center; gap:24px; border-bottom:2px solid #e2e8f0; padding-bottom:24px; margin-bottom:24px; }
  .avatar { width:80px; height:80px; border-radius:12px; background:linear-gradient(135deg,#06b6d4,#0891b2); display:flex; align-items:center; justify-content:center; color:#fff; font-size:32px; font-weight:800; overflow:hidden; flex-shrink:0; }
  .avatar img { width:100%; height:100%; object-fit:cover; }
  h1 { font-size:26px; font-weight:800; }
  .subtitle { color:#64748b; font-size:14px; margin-top:4px; }
  .badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; background:#e0f2fe; color:#0369a1; margin-top:8px; }
  .section { margin-bottom:20px; }
  h2 { font-size:13px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:6px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .info-item { font-size:14px; }
  .info-label { font-size:11px; color:#94a3b8; font-weight:700; margin-bottom:2px; }
  .chip { display:inline-block; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:600; background:#f1f5f9; color:#475569; margin:3px 3px 0 0; }
  .chip.teal { background:#ccfbf1; color:#0f766e; }
  .footer { margin-top:32px; text-align:center; font-size:11px; color:#cbd5e1; }
  @media print { body { background:#fff; padding:20px; } .card { box-shadow:none; } }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="avatar">
      ${profile.avatar ? `<img src="${profile.avatar}" alt="${profile.name}"/>` : profile.name.charAt(0).toUpperCase()}
    </div>
    <div>
      <h1>${profile.name}</h1>
      ${profile.title ? `<div class="subtitle">${profile.title}</div>` : ""}
      ${profile.specialty ? `<span class="badge">${profile.specialty}</span>` : ""}
    </div>
  </div>

  <div class="section">
    <h2>Información de Contacto</h2>
    <div class="grid">
      <div class="info-item"><div class="info-label">Correo</div>${profile.email || "—"}</div>
      <div class="info-item"><div class="info-label">Ubicación</div>${profile.location || "—"}</div>
      <div class="info-item"><div class="info-label">Disponibilidad</div>${profile.availability || "—"}</div>
      <div class="info-item"><div class="info-label">Nivel / XP</div>Niv. ${profile.level ?? 1} · ${profile.xp ?? 0} XP</div>
    </div>
  </div>

  ${profile.bio ? `<div class="section"><h2>Sobre mí</h2><p style="font-size:14px;line-height:1.6;color:#475569;">${profile.bio}</p></div>` : ""}

  <div class="section">
    <h2>Datos Académicos</h2>
    <div class="grid">
      ${profile.gpa != null ? `<div class="info-item"><div class="info-label">Promedio GPA</div>${profile.gpa.toFixed(2)}</div>` : ""}
      ${profile.attendance != null ? `<div class="info-item"><div class="info-label">Asistencia</div>${profile.attendance}%</div>` : ""}
      ${profile.years_experience > 0 ? `<div class="info-item"><div class="info-label">Experiencia</div>${profile.years_experience} año${profile.years_experience !== 1 ? "s" : ""}</div>` : ""}
    </div>
  </div>

  <div class="section">
    <h2>Habilidades Técnicas</h2>
    <div>${skills.split(",").map((s) => `<span class="chip">${s.trim()}</span>`).join("")}</div>
  </div>

  <div class="section">
    <h2>Habilidades Blandas</h2>
    <div>${softSk.split(",").map((s) => `<span class="chip teal">${s.trim()}</span>`).join("")}</div>
  </div>

  ${portfolio.length > 0 ? `
  <div class="section">
    <h2>Portafolio (${portfolio.length} proyecto${portfolio.length !== 1 ? "s" : ""})</h2>
    ${portfolio.map((p) => `<div style="margin-bottom:10px;"><strong style="font-size:14px;">${p.title}</strong>${p.description ? `<p style="font-size:13px;color:#64748b;margin-top:2px;">${p.description}</p>` : ""}${p.link ? `<a href="${p.link}" style="font-size:12px;color:#0891b2;">${p.link}</a>` : ""}</div>`).join("")}
  </div>` : ""}

  <div class="footer">Generado por ClassLink · ${new Date().toLocaleDateString("es-CR")}</div>
</div>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  if (loading) return (
    <PageLayout>
      <div className="flex items-center justify-center min-h-64">
        <Loader2 size={32} className="animate-spin text-cyan-400" />
      </div>
    </PageLayout>
  );

  if (error || !profile) return (
    <PageLayout>
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-red-500 font-medium">{error ?? "Error al cargar el perfil."}</p>
          <button onClick={fetchProfile} className="mt-3 text-sm text-cyan-600 hover:underline">Reintentar</button>
        </div>
      </div>
    </PageLayout>
  );

  const role      = profile.role;
  const isStudent = role === "Estudiante" || role === "Egresado";
  const isCompany = role === "Empresa";
  const isSchool  = role === "Colegio";

  const getTabs = () => {
    if (isStudent) return ["Resumen", "Portafolio", "Insignias"];
    if (isCompany) return ["Resumen", "Vacantes", "Candidatos"];
    return ["Resumen"]; // School admin tabs migrated to /administracion
  };

  const THEME_PALETTE: Record<string, { gradient: string; btn: string; active: string; text: string; swatch: string; label: string }> = {
    cyan:    { gradient: "from-cyan-500 via-teal-500 to-cyan-700",         btn: "bg-cyan-600 hover:bg-cyan-700",         active: "bg-cyan-50 text-cyan-700 shadow-sm",         text: "text-cyan-600",    swatch: "bg-cyan-500",    label: "Cian" },
    violet:  { gradient: "from-violet-500 via-purple-500 to-violet-700",   btn: "bg-violet-600 hover:bg-violet-700",     active: "bg-violet-50 text-violet-700 shadow-sm",   text: "text-violet-600",  swatch: "bg-violet-500",  label: "Violeta" },
    amber:   { gradient: "from-amber-500 via-orange-500 to-amber-700",     btn: "bg-amber-600 hover:bg-amber-700",       active: "bg-amber-50 text-amber-700 shadow-sm",     text: "text-amber-600",   swatch: "bg-amber-500",   label: "Ámbar" },
    rose:    { gradient: "from-rose-500 via-pink-500 to-rose-700",         btn: "bg-rose-600 hover:bg-rose-700",         active: "bg-rose-50 text-rose-700 shadow-sm",       text: "text-rose-600",    swatch: "bg-rose-500",    label: "Rosa" },
    emerald: { gradient: "from-emerald-500 via-green-500 to-emerald-700",  btn: "bg-emerald-600 hover:bg-emerald-700",   active: "bg-emerald-50 text-emerald-700 shadow-sm", text: "text-emerald-600", swatch: "bg-emerald-500", label: "Esmeralda" },
    blue:    { gradient: "from-blue-500 via-indigo-500 to-blue-700",       btn: "bg-blue-600 hover:bg-blue-700",         active: "bg-blue-50 text-blue-700 shadow-sm",       text: "text-blue-600",    swatch: "bg-blue-500",    label: "Azul" },
    fuchsia: { gradient: "from-fuchsia-500 via-purple-500 to-fuchsia-700", btn: "bg-fuchsia-600 hover:bg-fuchsia-700",   active: "bg-fuchsia-50 text-fuchsia-700 shadow-sm", text: "text-fuchsia-600", swatch: "bg-fuchsia-500", label: "Fucsia" },
    slate:   { gradient: "from-slate-600 via-slate-500 to-slate-700",      btn: "bg-slate-600 hover:bg-slate-700",       active: "bg-slate-100 text-slate-700 shadow-sm",    text: "text-slate-600",   swatch: "bg-slate-500",   label: "Gris" },
  };

  const roleDefaultTheme = isCompany ? "violet" : isSchool ? "amber" : "cyan";
  const activeTheme = (profile.theme_color && THEME_PALETTE[profile.theme_color])
    ? profile.theme_color
    : roleDefaultTheme;
  const themePalette = THEME_PALETTE[activeTheme];

  const gradientClass  = themePalette.gradient;
  const btnClass       = themePalette.btn;
  const activeTabClass = themePalette.active;
  const accentText     = themePalette.text;

  const xpPct = profile.xp && profile.level
    ? Math.min(100, Math.round(((profile.xp % 500) / 500) * 100))
    : 0;

  // ── Profile Completion (student) ──────────────────────────
  const displayBio      = localBio      ?? profile.bio;
  const displayLocation = localLocation ?? profile.location;
  const displaySkills   = localSkills;

  const completionItems = isStudent ? [
    { label: "Foto de perfil",     done: !!profile.avatar,         weight: 0 },
    { label: "Biografía",          done: !!displayBio,             weight: 15 },
    { label: "Habilidades",        done: displaySkills.length > 0, weight: 15 },
    { label: "Habilidades blandas",done: localSoftSkills.length > 0, weight: 15 },
    { label: "Certificaciones",    done: (portfolio.length > 0),   weight: 10 },
    { label: "Portafolio",         done: portfolio.length > 0,     weight: 20 },
    { label: "Asistencia",         done: true,                     weight: 10 },
    { label: "Promedio GPA",       done: profile.gpa != null,      weight: 15 },
  ] : [];
  const completionPct = isStudent
    ? completionItems.reduce((acc, item) => acc + (item.done ? item.weight : 0), 0)
    : 0;
  const completionCircumference = 2 * Math.PI * 40; // r=40
  const completionOffset = completionCircumference - (completionPct / 100) * completionCircumference;

  // Inline edit helpers
  const startInlineEdit = () => {
    setEditBioInline(displayBio ?? "");
    setEditLocationInline(displayLocation ?? "");
    setEditSkills(displaySkills.join(", "));
    setEditSoftSkillsStr(localSoftSkills.join(", "));
    setIsEditing(true);
  };
  const saveInlineEdit = () => {
    if (editBioInline !== displayBio)             setLocalBio(editBioInline);
    if (editLocationInline !== displayLocation)   setLocalLocation(editLocationInline);
    const parsedSkills = editSkills.split(",").map((s) => s.trim()).filter(Boolean);
    const parsedSoft   = editSoftSkillsStr.split(",").map((s) => s.trim()).filter(Boolean);
    setLocalSkills(parsedSkills);
    setLocalSoftSkills(parsedSoft);
    setIsEditing(false);
  };

  // Add vacancy helper
  const addVacancy = () => {
    if (!newVacTitle.trim()) return;
    const v: Vacancy = {
      id: `v-new-${Date.now()}`,
      title: newVacTitle.trim(),
      department: newVacDept.trim() || "General",
      type: newVacType,
      status: "Activa",
      duration: newVacDuration.trim() || undefined,
      paid: newVacPaid,
      salary: newVacPaid && newVacSalary.trim() ? newVacSalary.trim() : undefined,
      description: newVacDesc.trim() || undefined,
      applicants: [],
    };
    setLocalVacancies((prev) => [v, ...prev]);
    setNewVacTitle(""); setNewVacDept(""); setNewVacDuration("");
    setNewVacSalary(""); setNewVacDesc("");
    setAddVacancyOpen(false);
  };

  // School students filter (from DB)
  const filteredStudents = dbStudents.filter((s) => {
    const matchSearch = schoolSearch === "" ||
      s.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
      (s.specialty ?? "").toLowerCase().includes(schoolSearch.toLowerCase());
    const matchSpec = schoolSpecialty === "Todos" || s.specialty === schoolSpecialty;
    return matchSearch && matchSpec;
  });
  const avgAttendance = dbStudents.length === 0 ? 0 :
    Math.round(dbStudents.reduce((a, s) => a + (s.attendance ?? 0), 0) / dbStudents.length);
  const inPractice    = dbStudents.filter((s) => s.availability === "En prácticas").length;

  // Handlers
  const handleAddStudent = async () => {
    setAddStudentErr(null);
    setAddStudentBusy(true);
    const result = await createStudent({
      firstName:    newStFirstName,
      lastName:     newStLastName,
      email:        newStEmail,
      tempPassword: newStPassword,
      rut:          newStRut,
      gender:       newStGender,
      cellphone:    newStCellphone,
      class_name:   newStClassName,
      age:          Number(newStAge) || 16,
      specialty:    newStSpecialty || undefined,
      grade:        newStGrade || undefined,
    });
    setAddStudentBusy(false);
    if ("error" in result && result.error) {
      setAddStudentErr(result.error);
    } else {
      setAddStudentOk(true);
      setNewStFirstName(""); setNewStLastName(""); setNewStEmail("");
      setNewStPassword(""); setNewStSpecialty(""); setNewStGrade("");
      setTimeout(() => { setAddStudentOpen(false); setAddStudentOk(false); fetchStudents(); }, 1200);
    }
  };

  const handleGraduate = async (studentId: string) => {
    const ok = await confirmFn({
      title: "¿Graduar este estudiante?",
      body:  "Su rol cambiará a Egresado. Esta acción no se puede deshacer.",
      confirmLabel: "Graduar",
    });
    if (!ok) return;
    setGraduatingId(studentId);
    const result = await graduateStudent(studentId);
    setGraduatingId(null);
    if ("error" in result && result.error) {
      toast({ type: "error", title: "Error al graduar", description: result.error });
    } else {
      toast({ type: "success", title: "Estudiante graduado correctamente" });
      fetchStudents();
    }
  };

  const openManageStudent = async (s: DbStudent) => {
    setManagingId(s.id);
    setMgmtAtt(s.attendance ?? 0);
    setMgmtSkillsStr(Array.isArray(s.soft_skills) ? (s.soft_skills as string[]).join(", ") : "");
    setMgmtMsg(null);
    setMgmtReportLoaded(false);
    setMgmtPeriod(""); setMgmtSummary(""); setMgmtTeacher(""); setMgmtBehavior("");
    // Fetch latest report for this student
    const { data } = await supabase
      .from("school_reports")
      .select("period, summary, teacher_comment, behavior_note")
      .eq("student_id", s.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data) {
      setMgmtPeriod(data.period ?? "");
      setMgmtSummary(data.summary ?? "");
      setMgmtTeacher(data.teacher_comment ?? "");
      setMgmtBehavior(data.behavior_note ?? "");
    }
    setMgmtReportLoaded(true);
  };

  const handleSaveAtt = async () => {
    if (!managingId) return;
    setMgmtSaving("att"); setMgmtMsg(null);
    const res = await updateStudentProfile(managingId, { attendance: mgmtAtt });
    setMgmtSaving(null);
    if ("error" in res && res.error) { setMgmtMsg({ type: "err", text: res.error }); return; }
    setMgmtMsg({ type: "ok", text: "Asistencia guardada." });
    setDbStudents((prev) => prev.map((s) => s.id === managingId ? { ...s, attendance: mgmtAtt } : s));
  };

  const handleSaveSkills = async () => {
    if (!managingId) return;
    const skills = mgmtSkillsStr.split(",").map((s) => s.trim()).filter(Boolean);
    setMgmtSaving("skills"); setMgmtMsg(null);
    const res = await updateStudentProfile(managingId, { soft_skills: skills });
    setMgmtSaving(null);
    if ("error" in res && res.error) { setMgmtMsg({ type: "err", text: res.error }); return; }
    setMgmtMsg({ type: "ok", text: "Habilidades guardadas." });
    setDbStudents((prev) => prev.map((s) => s.id === managingId ? { ...s, soft_skills: skills } : s));
  };

  const handleSaveReport = async () => {
    if (!managingId) return;
    setMgmtSaving("report"); setMgmtMsg(null);
    const res = await upsertSchoolReport(managingId, {
      period: mgmtPeriod, summary: mgmtSummary,
      teacher_comment: mgmtTeacher, behavior_note: mgmtBehavior,
    });
    setMgmtSaving(null);
    if ("error" in res && res.error) { setMgmtMsg({ type: "err", text: res.error }); return; }
    setMgmtMsg({ type: "ok", text: "Reporte guardado." });
  };

  // Handle Accept/Reject application (company) — persists to DB + notifies student
  const handleUpdateApplication = async (
    applicationId: string,
    newStatus: "accepted" | "rejected",
    jobTitle: string
  ) => {
    const studentId = applicantStudentIds[applicationId];
    if (!studentId) return;
    setUpdatingApp(applicationId);
    const res = await updateApplicationStatus(applicationId, newStatus, studentId, jobTitle);
    setUpdatingApp(null);
    if ("error" in res && res.error) {
      toast({ type: "error", title: "Error al actualizar postulación", description: res.error });
      return;
    }
    setApplicantStatuses((p) => ({ ...p, [applicationId]: newStatus }));
  };

  // Handle approve/reject internship request (school)
  const handleUpdateReq = async (reqId: string, status: "aprobado" | "rechazado") => {
    setUpdatingReq(reqId);
    const res = await updateInternshipRequest(reqId, status);
    setUpdatingReq(null);
    if ("error" in res && res.error) {
      toast({ type: "error", title: "Error al procesar solicitud", description: res.error });
      return;
    }
    toast({ type: "success", title: status === "aprobado" ? "Solicitud aprobada" : "Solicitud rechazada" });
    setInternshipReqs((prev) => prev.map((r) => r.id === reqId ? { ...r, status } : r));
  };

  // Handle company solicitar alumnos submission
  const handleSolicitar = async () => {
    setSolErr(null); setSolBusy(true);
    const res = await createInternshipRequest(solSchoolId, {
      title: solTitle, description: solDesc,
      specialty: solSpecialty, slots: solSlots, urgent: solUrgent,
    });
    setSolBusy(false);
    if ("error" in res && res.error) { setSolErr(res.error); return; }
    setSolOk(true);
    setTimeout(() => {
      setSolicitarOpen(false); setSolOk(false);
      setSolTitle(""); setSolDesc(""); setSolSpecialty(""); setSolSlots(1); setSolUrgent(false); setSolSchoolId("");
    }, 1500);
  };

  return (
    <PageLayout>
      <div className="w-full px-4 md:px-6 lg:px-10 py-6 space-y-6">

        {/* ── Profile Header Card ──────────────────────────────────────────
            Desktop layout: avatar centered on banner bottom edge (absolute),
            name/info sits to the RIGHT via md:pl-48.

            Measurements:
            · Banner  h-44 (176px) → md:h-60 (240px)
            · Avatar  w-24 h-24 (96px)  top-32 (128px) → center = 128+48 = 176 ✓
                      md:w-32 h-32 (128px) md:top-40 (160px) → center = 160+64 = 224... wait
                      md:h-60=240px; md:top-44=176px; center=176+64=240 ✓
            · Content mobile  pt-14 (56px): starts at 176+56=232 > avatar bottom (224) ✓
            · Content desktop pt-8  pl-48 : starts at 240+32=272px beside avatar (176-304px range) ✓
        ──────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/60 animate-fade-in-up relative">

          {/* Cover Banner */}
          <div className={`h-44 md:h-80 rounded-t-2xl overflow-hidden relative group/banner ${!profile.banner_url ? `bg-gradient-to-r ${gradientClass}` : ""}`}>
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt="Banner"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 hero-pattern opacity-20" />
            )}

            {/* Banner upload overlay */}
            <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/banner:opacity-100 transition-opacity cursor-pointer z-10">
              {uploadingBanner
                ? <Loader2 size={28} className="text-white animate-spin" />
                : (
                  <span className="flex flex-col items-center gap-1 text-white">
                    <Camera size={28} />
                    <span className="text-xs font-semibold">Cambiar banner</span>
                  </span>
                )
              }
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleBannerUpload}
                disabled={uploadingBanner}
              />
            </label>

            {isStudent ? (
              isEditing ? (
                <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                  <button
                    onClick={saveInlineEdit}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
                  >
                    <CheckCircle2 size={14} /> Guardar Cambios
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1.5 bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={startInlineEdit}
                  className={`absolute top-4 right-4 flex items-center gap-1.5 ${btnClass} text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm btn-press z-20`}
                >
                  <Edit size={14} /> Editar perfil
                </button>
              )
            ) : (
              <button
                onClick={openEdit}
                className={`absolute top-4 right-4 flex items-center gap-1.5 ${btnClass} text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm btn-press z-20`}
              >
                <Edit size={14} /> Editar perfil
              </button>
            )}
          </div>

          {/* Avatar — centered on the banner's bottom edge (absolute) */}
          {/* top-32 mobile: banner=176px, avatar=96px, center=128+48=176 ✓
              md:top-60 desktop: banner=320px, avatar=160px, center=240+80=320 ✓ */}
          <div className="absolute left-6 top-32 md:left-10 md:top-60 z-10">
            <div className="relative group">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-24 h-24 md:w-40 md:h-40 rounded-2xl border-4 border-white object-cover shadow-xl"
                />
              ) : (
                <div className={`w-24 h-24 md:w-40 md:h-40 rounded-2xl border-4 border-white bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-xl`}>
                  <span className="text-white font-black text-3xl md:text-5xl">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {uploadingAvatar
                  ? <Loader2 size={20} className="text-white animate-spin" />
                  : <Camera size={20} className="text-white" />
                }
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
          </div>

          {/* Name / title / chips
              Mobile : pt-14 clears avatar (avatar bottom = 224px; banner = 176px; protrudes 48px)
              Desktop: pt-8 pl-56 — text beside avatar (avatar right = 200px, pl=224px, 24px gap) */}
          <div className="px-8 pb-8 pt-14 md:pt-8 md:pl-56">
            <h1 className="text-2xl md:text-4xl font-extrabold leading-tight tracking-tight">
              {profile.name}
            </h1>
            {profile.title && (
              <p className="text-sm md:text-lg text-slate-500 mt-1.5">{profile.title}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm md:text-base text-slate-400">
              {profile.location && (
                <span className="flex items-center gap-1.5"><MapPin size={16} />{displayLocation || profile.location}</span>
              )}
              {isCompany ? (
                <span className="flex items-center gap-1.5">
                  <Building2 size={16} />
                  <span className="font-semibold text-slate-600">RUT Empresa:</span>&nbsp;
                  {profile.rut ?? profile.email}
                </span>
              ) : (
                <span className="flex items-center gap-1.5"><Mail size={16} />{profile.email}</span>
              )}
              {isStudent && profile.specialty && (
                <span className="flex items-center gap-1.5"><GraduationCap size={16} />{profile.specialty}</span>
              )}
              {isCompany && profile.website && (
                <a
                  href={`https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 ${accentText} hover:underline`}
                >
                  <Globe size={16} />{profile.website}
                </a>
              )}
              {isSchool && profile.school_name && (
                <span className="flex items-center gap-1.5"><Building2 size={16} />{profile.school_name}</span>
              )}
            </div>
            {/* CV Download button — students & graduates */}
            {isStudent && (
              <button
                onClick={handleDownloadCV}
                className="mt-4 inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                <Download size={15} /> Descargar CV
              </button>
            )}
          </div>
        </div>

        {/* ── Body: Persistent left sidebar + Tabbed main content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 animate-fade-in-up stagger-2">

          {/* ── Left Sidebar (always visible, not tab-dependent) ── */}
          <div className="space-y-4">

            {profile.bio && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                <h3 className="text-sm font-bold mb-2 text-slate-700">Acerca de</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
              <h3 className="text-sm font-bold mb-3 text-slate-700">Información</h3>
              <div className="space-y-3">
                {isStudent && (
                  <>
                    {profile.availability && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Disponibilidad</p>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          profile.availability === "Disponible"  ? "bg-emerald-50 text-emerald-700"
                          : profile.availability === "En prácticas" ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                        }`}>{profile.availability}</span>
                      </div>
                    )}
                    {profile.gpa != null && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Promedio</p>
                        <p className="text-sm font-semibold text-slate-700">{profile.gpa.toFixed(1)}</p>
                      </div>
                    )}
                    {profile.years_experience > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Experiencia</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {profile.years_experience} {profile.years_experience === 1 ? "año" : "años"}
                        </p>
                      </div>
                    )}
                    {profile.streak > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Racha</p>
                        <p className="text-sm font-semibold text-slate-700">{profile.streak} días 🔥</p>
                      </div>
                    )}
                  </>
                )}
                {isCompany && (
                  <>
                    {profile.industry && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Industria</p>
                        <p className="text-sm font-semibold text-slate-700">{profile.industry}</p>
                      </div>
                    )}
                    {profile.employee_count && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Empleados</p>
                        <p className="text-sm font-semibold text-slate-700">{profile.employee_count}</p>
                      </div>
                    )}
                    {profile.open_positions > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Vacantes abiertas</p>
                        <p className="text-sm font-semibold text-slate-700">{profile.open_positions}</p>
                      </div>
                    )}
                  </>
                )}
                {isSchool && (
                  <>
                    {profile.alliance_count > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Alianzas empresariales</p>
                        <p className="text-sm font-semibold text-slate-700">{profile.alliance_count}</p>
                      </div>
                    )}
                    {profile.location && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Ubicación</p>
                        <p className="text-sm font-semibold text-slate-700">{profile.location}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {isStudent && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                <h3 className="text-sm font-bold mb-3 text-slate-700">Completitud del Perfil</h3>
                <div className="flex justify-center mb-3">
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke={completionPct >= 80 ? "#10b981" : completionPct >= 50 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={completionCircumference}
                      strokeDashoffset={completionOffset}
                      transform="rotate(-90 50 50)"
                      style={{ transition: "stroke-dashoffset 0.5s ease" }}
                    />
                    <text x="50" y="55" textAnchor="middle" className="text-lg font-bold" fontSize="18" fontWeight="800" fill="#1e293b">
                      {completionPct}%
                    </text>
                  </svg>
                </div>
                <div className="space-y-1.5">
                  {completionItems.slice(0, 5).map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-xs">
                      {item.done
                        ? <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                        : <Circle size={13} className="text-slate-300 shrink-0" />
                      }
                      <span className={item.done ? "text-slate-600" : "text-slate-400"}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── School Sidebar: Employability Ring ── */}
            {isSchool && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                <h3 className="text-sm font-bold mb-4 text-slate-700">Tasa de Empleabilidad</h3>
                {(() => {
                  const rate = profile.employability_rate ?? 0;
                  const r = 42, circ = 2 * Math.PI * r;
                  const offset = circ - (rate / 100) * circ;
                  const color = rate >= 80 ? "#10b981" : rate >= 60 ? "#f59e0b" : "#ef4444";
                  const label = rate >= 80 ? "Excelente" : rate >= 60 ? "Buena" : rate > 0 ? "En desarrollo" : "Sin datos";
                  return (
                    <div className="flex flex-col items-center gap-3">
                      <svg width="110" height="110" viewBox="0 0 110 110">
                        <circle cx="55" cy="55" r={r} fill="none" stroke="#f1f5f9" strokeWidth="11" />
                        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="11"
                          strokeLinecap="round"
                          strokeDasharray={circ} strokeDashoffset={offset}
                          transform="rotate(-90 55 55)"
                          style={{ transition: "stroke-dashoffset 0.6s ease" }}
                        />
                        <text x="55" y="51" textAnchor="middle" fontSize="20" fontWeight="800" fill="#1e293b">{rate}%</text>
                        <text x="55" y="66" textAnchor="middle" fontSize="9" fill="#94a3b8">empleabilidad</text>
                      </svg>
                      <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: `${color}18`, color }}>{label}</span>
                      {profile.student_count != null && (
                        <p className="text-[11px] text-slate-400 text-center">{profile.student_count} estudiantes matriculados</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── School Sidebar: Live Student Stats ── */}
            {isSchool && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-700">Estudiantes</h3>
                  {dbStudents.length === 0 && (
                    <button onClick={fetchStudents} className="text-[10px] text-amber-600 hover:underline font-semibold">cargar</button>
                  )}
                </div>
                {studentsLoading ? (
                  <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-slate-300" /></div>
                ) : dbStudents.length === 0 ? (
                  <div className="text-center py-3">
                    <GraduationCap size={28} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-[11px] text-slate-400">Sin estudiantes aún.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Avg attendance bar */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-500">Asistencia promedio</span>
                        <span className={`font-bold ${avgAttendance >= 90 ? "text-emerald-600" : avgAttendance >= 75 ? "text-amber-600" : "text-red-500"}`}>{avgAttendance}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${avgAttendance >= 90 ? "bg-emerald-500" : avgAttendance >= 75 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${avgAttendance}%` }}
                        />
                      </div>
                    </div>
                    {/* Quick stat pills */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-amber-50 rounded-xl p-2.5 text-center border border-amber-100">
                        <p className="text-lg font-extrabold text-amber-600">{dbStudents.length}</p>
                        <p className="text-[10px] text-amber-700 font-medium">Matriculados</p>
                      </div>
                      <div className="bg-violet-50 rounded-xl p-2.5 text-center border border-violet-100">
                        <p className="text-lg font-extrabold text-violet-600">{inPractice}</p>
                        <p className="text-[10px] text-violet-700 font-medium">En práctica</p>
                      </div>
                    </div>
                    {/* Top attendance student */}
                    {(() => {
                      const top = [...dbStudents].sort((a, b) => (b.attendance ?? 0) - (a.attendance ?? 0))[0];
                      if (!top) return null;
                      return (
                        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                          <p className="text-[10px] text-emerald-700 font-bold mb-1">Mejor asistencia</p>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                              {top.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate text-slate-700">{top.name}</p>
                              <p className="text-[10px] text-emerald-600 font-semibold">{top.attendance ?? 0}% asistencia</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ── School Sidebar: Link to Administración ── */}
            {isSchool && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                <h3 className="text-sm font-bold mb-3 text-slate-700">Panel Administrativo</h3>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  Gestiona estudiantes, estadísticas y solicitudes de práctica desde el panel dedicado.
                </p>
                <a
                  href="/administracion"
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors text-sm font-bold"
                >
                  <span>Ir a Administración</span>
                  <ChevronRight size={16} />
                </a>
              </div>
            )}

            {/* ── Aval Institucional (students & graduates who belong to a school) ── */}
            {isStudent && schoolProfile && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60 overflow-hidden relative">
                {/* subtle gradient top bar */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-t-2xl" />
                <div className="flex items-center gap-2 mb-3 mt-1">
                  <Award size={15} className="text-amber-500 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-700">Aval Institucional</h3>
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    <CheckCircle size={10} /> Verificado
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {schoolProfile.avatar ? (
                    <img
                      src={schoolProfile.avatar}
                      alt={schoolProfile.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm">
                      {(schoolProfile.school_name || schoolProfile.name).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate leading-tight">
                      {schoolProfile.school_name || schoolProfile.name}
                    </p>
                    {profile.specialty && (
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <GraduationCap size={10} className="shrink-0" />
                        {profile.specialty}
                      </p>
                    )}
                    {schoolProfile.location && (
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin size={10} className="shrink-0" />
                        {schoolProfile.location}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed border-t border-slate-100 pt-3">
                  Este estudiante cuenta con el respaldo de su institución educativa, lo que valida su formación técnica y trayectoria académica.
                </p>
              </div>
            )}

            {/* ── Reputation Card (students) ── */}
            {isStudent && (
              <ReputationCard
                studentId={profile.id}
                studentName={profile.name}
                reputationScore={profile.reputation_score ?? 0}
              />
            )}

            {isStudent && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                <h3 className="text-sm font-bold mb-3 text-slate-700">Progreso XP</h3>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-semibold">Nivel {profile.level ?? 1}</span>
                  <span>{profile.xp ?? 0} XP</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-teal-500 rounded-full transition-all duration-700"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 text-right">{xpPct}% al siguiente nivel</p>
              </div>
            )}
          </div>

          {/* ── Main Content (Tabs + Content) ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Tabs */}
            <div className="flex gap-1.5 bg-white border border-slate-200/60 rounded-xl p-1.5 w-fit">
              {getTabs().map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    tab === t ? activeTabClass : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* ── Resumen ── */}
            {tab === "Resumen" && (
              <div className="space-y-4">

                {/* ── Inline Edit Form (student only) ── */}
                {isStudent && isEditing && (
                  <div className="bg-white rounded-2xl p-5 border border-cyan-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-sm text-cyan-700 flex items-center gap-2"><Edit size={14} /> Editando Perfil</h3>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Biografía</label>
                      <textarea
                        value={editBioInline}
                        onChange={(e) => setEditBioInline(e.target.value)}
                        rows={3}
                        maxLength={500}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Ubicación</label>
                      <input
                        value={editLocationInline}
                        onChange={(e) => setEditLocationInline(e.target.value)}
                        placeholder="Ej: Santiago, Chile"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Habilidades Técnicas (separadas por coma)</label>
                      <input
                        value={editSkills}
                        onChange={(e) => setEditSkills(e.target.value)}
                        placeholder="Arduino, Python, Soldadura TIG..."
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Habilidades Blandas (separadas por coma)</label>
                      <input
                        value={editSoftSkillsStr}
                        onChange={(e) => setEditSoftSkillsStr(e.target.value)}
                        placeholder="Trabajo en equipo, Puntualidad..."
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button onClick={saveInlineEdit} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                        <CheckCircle2 size={15} /> Guardar Cambios
                      </button>
                      <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 rounded-xl font-bold text-sm transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {isStudent && badges.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-sm">Insignias</h3>
                      <button
                        onClick={() => setTab("Insignias")}
                        className={`text-xs ${accentText} font-semibold hover:underline`}
                      >
                        Ver todas
                      </button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                      {badges.slice(0, 16).map((b) => (
                        <div
                          key={b.id}
                          title={b.name}
                          className={`p-2.5 rounded-xl text-center ${b.earned ? "bg-cyan-50 border border-cyan-100" : "bg-slate-50 opacity-40"}`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-1.5 ${b.earned ? "bg-cyan-100" : "bg-slate-200"}`}>
                            {b.earned
                              ? <Award size={16} className="text-cyan-600" />
                              : <Lock size={13} className="text-slate-400" />
                            }
                          </div>
                          <p className="text-[9px] font-bold leading-tight truncate">{b.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isStudent && portfolio.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-sm">Portafolio reciente</h3>
                      <button
                        onClick={() => setTab("Portafolio")}
                        className={`text-xs ${accentText} font-semibold hover:underline`}
                      >
                        Ver todo
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {portfolio.slice(0, 3).map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-100 overflow-hidden hover:shadow-sm transition-shadow">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-full h-32 object-cover" />
                          ) : (
                            <div className="w-full h-32 bg-slate-100 flex items-center justify-center">
                              <ExternalLink size={20} className="text-slate-300" />
                            </div>
                          )}
                          <div className="p-3">
                            <p className="text-xs font-bold truncate">{item.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Student Habilidades Blandas ── */}
                {isStudent && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart size={15} className="text-rose-500" />
                      <h3 className="font-bold text-sm">Habilidades Blandas</h3>
                    </div>
                    {localSoftSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {localSoftSkills.map((s) => (
                          <span key={s} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No hay habilidades blandas registradas.</p>
                    )}
                  </div>
                )}

                {/* ── Attendance Ring ── */}
                {isStudent && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                    <h3 className="font-bold text-sm mb-4">Asistencia al Taller</h3>
                    {(() => {
                      const att = profile?.attendance ?? 0;
                      const attColor = att >= 90 ? "#10b981" : att >= 75 ? "#f59e0b" : "#ef4444";
                      const r = 40;
                      const circ = 2 * Math.PI * r;
                      const offset = circ - (att / 100) * circ;
                      return (
                        <div className="flex items-center gap-6">
                          <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
                            <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                            <circle cx="50" cy="50" r={r} fill="none" stroke={attColor} strokeWidth="10"
                              strokeLinecap="round"
                              strokeDasharray={circ} strokeDashoffset={offset}
                              transform="rotate(-90 50 50)"
                              style={{ transition: "stroke-dashoffset 0.5s ease" }}
                            />
                            <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="800" fill="#1e293b">
                              {att}%
                            </text>
                          </svg>
                          <div>
                            <p className="text-2xl font-extrabold" style={{ color: attColor }}>{att}%</p>
                            <p className="text-xs text-slate-500 mt-0.5">Asistencia al Taller</p>
                            <p className="text-[11px] mt-2 font-medium" style={{ color: attColor }}>
                              {att >= 90 ? "Excelente asistencia" : att >= 75 ? "Asistencia regular" : "Asistencia baja"}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── School Report ── */}
                {isStudent && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={15} className="text-slate-500" />
                      <h3 className="font-bold text-sm">Reporte del Colegio</h3>
                    </div>
                    {schoolReport ? (
                      <>
                        <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full mb-3">
                          {schoolReport.period}
                        </span>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-bold text-slate-600 mb-1">Resumen</p>
                            <p className="text-sm text-slate-500 leading-relaxed">{schoolReport.summary}</p>
                          </div>
                          <div className="border-l-4 border-amber-400 pl-4 bg-amber-50/40 py-2 rounded-r-xl">
                            <p className="text-xs font-bold text-slate-600 mb-1">Comentario del Docente</p>
                            <p className="text-sm text-slate-600 italic leading-relaxed">{schoolReport.teacher_comment}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-600 mb-1">Nota de Conducta</p>
                            <p className="text-sm text-slate-500 leading-relaxed">{schoolReport.behavior_note}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">El colegio aún no ha emitido un reporte.</p>
                    )}
                  </div>
                )}

                {/* ── Recommendation Request ── */}
                {isStudent && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-4">
                      <Send size={15} className="text-cyan-500" />
                      <h3 className="font-bold text-sm">Solicitar Recomendación</h3>
                    </div>
                    <div className="flex gap-3 mb-4">
                      <button
                        onClick={() => setRecFormTarget(recFormTarget === "colegio" ? null : "colegio")}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-colors ${recFormTarget === "colegio" ? "border-cyan-500 text-cyan-700 bg-cyan-50" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                      >
                        Pedir al Colegio
                      </button>
                      <button
                        onClick={() => setRecFormTarget(recFormTarget === "empresa" ? null : "empresa")}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-colors ${recFormTarget === "empresa" ? "border-violet-500 text-violet-700 bg-violet-50" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                      >
                        Pedir a una Empresa
                      </button>
                    </div>
                    {recFormTarget && (
                      <div className="space-y-3">
                        <textarea
                          value={recMessage}
                          onChange={(e) => setRecMessage(e.target.value)}
                          rows={3}
                          placeholder={`Escribe tu mensaje para ${recFormTarget === "colegio" ? "el colegio" : "la empresa"}...`}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none resize-none"
                        />
                        <button
                          onClick={() => { setRecMessage(""); setRecFormTarget(null); }}
                          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
                        >
                          Enviar Solicitud
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isCompany && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                    <h3 className="font-bold text-sm mb-4">Vacantes Activas</h3>
                    {profile.open_positions > 0 ? (
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-violet-50 border border-violet-100">
                        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                          <Users size={22} className="text-violet-600" />
                        </div>
                        <div>
                          <p className="font-bold text-violet-700">
                            {profile.open_positions} vacante{profile.open_positions > 1 ? "s" : ""} abierta{profile.open_positions > 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">Gestiona tus ofertas en la sección Vacantes</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 text-center py-6">No hay vacantes activas.</p>
                    )}
                  </div>
                )}

                {isSchool && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                    <h3 className="font-bold text-sm mb-4">Estadísticas del Centro</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {profile.student_count != null && (
                        <div className="bg-amber-50 rounded-xl p-5 text-center">
                          <p className="text-3xl font-extrabold text-amber-600">{profile.student_count}</p>
                          <p className="text-xs text-slate-500 mt-1">Estudiantes</p>
                        </div>
                      )}
                      {profile.alliance_count > 0 && (
                        <div className="bg-violet-50 rounded-xl p-5 text-center">
                          <p className="text-3xl font-extrabold text-violet-600">{profile.alliance_count}</p>
                          <p className="text-xs text-slate-500 mt-1">Alianzas</p>
                        </div>
                      )}
                      {profile.employability_rate != null && (
                        <div className="bg-emerald-50 rounded-xl p-5 text-center">
                          <p className="text-3xl font-extrabold text-emerald-600">{profile.employability_rate}%</p>
                          <p className="text-xs text-slate-500 mt-1">Empleabilidad</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isStudent && !isCompany && !isSchool && (
                  <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/60">
                    <p className="text-slate-400">Información del perfil.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Portafolio ── */}
            {tab === "Portafolio" && isStudent && (
              <PortfolioGrid portfolio={portfolio} accentText={accentText} />
            )}

            {/* ── Insignias ── */}
            {tab === "Insignias" && isStudent && (
              <BadgesGrid badges={badges} showShare profileName={profile.name} />
            )}

            {/* ── Vacantes (Empresa) ── */}
            {tab === "Vacantes" && isCompany && (
              <div className="space-y-4">
                {/* Header + Add button */}
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-700">Gestión de Vacantes</h3>
                  <button
                    onClick={() => setAddVacancyOpen(true)}
                    className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                  >
                    <Plus size={14} /> Agregar Vacante
                  </button>
                </div>

                {/* Vacancy list */}
                {localVacancies.map((v) => {
                  const isExpanded = expandedVacancy === v.id;
                  const pendingCount = v.applicants.filter((a) => (applicantStatuses[a.id] ?? a.status) === "pending").length;
                  return (
                    <div key={v.id} className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
                      {/* Collapsed header */}
                      <button
                        onClick={() => setExpandedVacancy(isExpanded ? null : v.id)}
                        className="w-full text-left p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h4 className="font-bold text-sm">{v.title}</h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.status === "Activa" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                {v.status}
                              </span>
                              <span className="text-[10px] font-semibold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">{v.type}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              <span className="font-medium">{v.department}</span>
                              {v.duration && (
                                <span className="flex items-center gap-1"><Clock size={10} />{v.duration}</span>
                              )}
                              <span className={`flex items-center gap-1 font-semibold ${v.paid ? "text-emerald-600" : "text-amber-600"}`}>
                                {v.paid ? `Remunerada${v.salary ? ` · ${v.salary}` : ""}` : "No remunerada"}
                              </span>
                              <span className="bg-slate-100 px-2 py-0.5 rounded-full">{v.applicants.length} postulantes</span>
                              {pendingCount > 0 && (
                                <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full">{pendingCount} pendientes</span>
                              )}
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp size={16} className="text-slate-400 shrink-0 mt-1" /> : <ChevronDown size={16} className="text-slate-400 shrink-0 mt-1" />}
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 p-5 space-y-4">
                          {v.description && (
                            <div className="bg-slate-50 rounded-xl p-4">
                              <p className="text-xs font-bold text-slate-600 mb-1.5">Descripción</p>
                              <p className="text-sm text-slate-500 leading-relaxed">{v.description}</p>
                              <div className="flex flex-wrap gap-3 mt-3 text-[11px]">
                                {v.duration && <span className="flex items-center gap-1 font-semibold text-slate-600"><Clock size={11} /> {v.duration}</span>}
                                <span className={`font-semibold ${v.paid ? "text-emerald-600" : "text-amber-600"}`}>
                                  {v.paid ? `Remunerada${v.salary ? ` · ${v.salary}` : ""}` : "No remunerada"}
                                </span>
                              </div>
                            </div>
                          )}

                          <div>
                            <h5 className="font-bold text-sm mb-3">Postulantes</h5>
                            {v.applicants.length === 0 ? (
                              <p className="text-sm text-slate-400">No hay postulantes aún.</p>
                            ) : (
                              <div className="space-y-3">
                                {v.applicants.map((a) => {
                                  const status = applicantStatuses[a.id] ?? a.status;
                                  return (
                                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                      {a.avatar ? (
                                        <img src={a.avatar} alt={a.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                          {a.name.charAt(0)}
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate">{a.name}</p>
                                        <p className="text-[11px] text-slate-400">{a.specialty}</p>
                                      </div>
                                      {/* Match score ring */}
                                      <div className="shrink-0">
                                        <svg width="40" height="40" viewBox="0 0 40 40">
                                          <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                                          <circle cx="20" cy="20" r="16" fill="none"
                                            stroke={a.matchScore >= 85 ? "#10b981" : a.matchScore >= 70 ? "#f59e0b" : "#94a3b8"}
                                            strokeWidth="4" strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 16}
                                            strokeDashoffset={2 * Math.PI * 16 - (a.matchScore / 100) * 2 * Math.PI * 16}
                                            transform="rotate(-90 20 20)"
                                          />
                                          <text x="20" y="20" textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="800" fill="#1e293b">
                                            {a.matchScore}%
                                          </text>
                                        </svg>
                                      </div>
                                      {/* Action buttons / status badge */}
                                      {status === "pending" ? (
                                        <div className="flex gap-2 shrink-0">
                                          <button
                                            onClick={() => handleUpdateApplication(a.id, "accepted", v.title)}
                                            disabled={updatingApp === a.id}
                                            className="flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                          >
                                            {updatingApp === a.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={12} />} Aceptar
                                          </button>
                                          <button
                                            onClick={() => handleUpdateApplication(a.id, "rejected", v.title)}
                                            disabled={updatingApp === a.id}
                                            className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                          >
                                            {updatingApp === a.id ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={12} />} Rechazar
                                          </button>
                                        </div>
                                      ) : status === "accepted" ? (
                                        <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full shrink-0">Aceptado</span>
                                      ) : (
                                        <span className="text-[11px] font-bold bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full shrink-0">Rechazado</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {localVacancies.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/60">
                    <Users size={44} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 font-medium">No hay vacantes. Agrega una nueva.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Candidatos (Empresa) — full applications portal ── */}
            {tab === "Candidatos" && isCompany && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-800">Portal de Candidatos</h3>
                  <button
                    onClick={() => { fetchSchoolsForSolicitar(); setSolErr(null); setSolOk(false); setSolicitarOpen(true); }}
                    className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                  >
                    <Plus size={14} /> Solicitar Alumnos
                  </button>
                </div>

                {/* Summary metrics */}
                {(() => {
                  const allApplicants = localVacancies.flatMap((v) => v.applicants);
                  const pending  = allApplicants.filter((a) => (applicantStatuses[a.id] ?? a.status) === "pending").length;
                  const accepted = allApplicants.filter((a) => (applicantStatuses[a.id] ?? a.status) === "accepted").length;
                  const rejected = allApplicants.filter((a) => (applicantStatuses[a.id] ?? a.status) === "rejected").length;
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-extrabold text-amber-600">{pending}</p>
                        <p className="text-xs text-slate-500 mt-1">Pendientes</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-extrabold text-emerald-600">{accepted}</p>
                        <p className="text-xs text-slate-500 mt-1">Aceptados</p>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-extrabold text-red-500">{rejected}</p>
                        <p className="text-xs text-slate-500 mt-1">Rechazados</p>
                      </div>
                    </div>
                  );
                })()}

                {localVacancies.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/60">
                    <Users size={44} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 font-medium">No hay vacantes publicadas aún.</p>
                  </div>
                ) : localVacancies.map((v) => {
                  const pendingApplicants = v.applicants.filter((a) => (applicantStatuses[a.id] ?? a.status) === "pending");
                  const otherApplicants   = v.applicants.filter((a) => (applicantStatuses[a.id] ?? a.status) !== "pending");
                  if (v.applicants.length === 0) return null;
                  return (
                    <div key={v.id} className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
                      {/* Vacancy header */}
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                          <Users size={16} className="text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{v.title}</p>
                          <p className="text-[11px] text-slate-400">{v.applicants.length} postulante{v.applicants.length !== 1 ? "s" : ""}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.status === "Activa" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {v.status}
                        </span>
                      </div>

                      {/* Applicant rows */}
                      <div className="divide-y divide-slate-50">
                        {/* Pending first */}
                        {pendingApplicants.map((a) => (
                          <div key={a.id} className="flex items-center gap-3 px-5 py-3 bg-amber-50/30">
                            {a.avatar ? (
                              <img src={a.avatar} alt={a.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                {a.name.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{a.name}</p>
                              <p className="text-[11px] text-slate-400">{a.specialty || "Sin especialidad"}</p>
                            </div>
                            <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">Pendiente</span>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleUpdateApplication(a.id, "accepted", v.title)}
                                disabled={updatingApp === a.id}
                                className="flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {updatingApp === a.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={12} />} Aceptar
                              </button>
                              <button
                                onClick={() => handleUpdateApplication(a.id, "rejected", v.title)}
                                disabled={updatingApp === a.id}
                                className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {updatingApp === a.id ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={12} />} Rechazar
                              </button>
                            </div>
                          </div>
                        ))}
                        {/* Resolved applicants */}
                        {otherApplicants.map((a) => {
                          const status = applicantStatuses[a.id] ?? a.status;
                          return (
                            <div key={a.id} className="flex items-center gap-3 px-5 py-3 opacity-70">
                              {a.avatar ? (
                                <img src={a.avatar} alt={a.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                  {a.name.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">{a.name}</p>
                                <p className="text-[11px] text-slate-400">{a.specialty || "Sin especialidad"}</p>
                              </div>
                              {status === "accepted" ? (
                                <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full shrink-0">Aceptado</span>
                              ) : (
                                <span className="text-[11px] font-bold bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full shrink-0">Rechazado</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Mis Estudiantes (Colegio) ── */}
            {tab === "Mis Estudiantes" && isSchool && (
              <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-800">Mis Estudiantes</h3>
                  <button
                    onClick={() => { setAddStudentErr(null); setAddStudentOk(false); setAddStudentOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                  >
                    <Plus size={14} /> Agregar Alumno
                  </button>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/60 text-center">
                    <p className="text-2xl font-extrabold text-amber-600">{dbStudents.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Total estudiantes</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/60 text-center">
                    <p className="text-2xl font-extrabold text-emerald-600">{avgAttendance}%</p>
                    <p className="text-xs text-slate-500 mt-1">Asistencia promedio</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/60 text-center">
                    <p className="text-2xl font-extrabold text-violet-600">{inPractice}</p>
                    <p className="text-xs text-slate-500 mt-1">En práctica</p>
                  </div>
                </div>

                {/* Search + specialty filter */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/60 space-y-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={schoolSearch}
                      onChange={(e) => setSchoolSearch(e.target.value)}
                      placeholder="Buscar por nombre o especialidad..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["Todos", "Mecatronica", "Electricidad", "Soldadura", "Ebanisteria"].map((sp) => (
                      <button
                        key={sp}
                        onClick={() => setSchoolSpecialty(sp)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${schoolSpecialty === sp ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Student list */}
                {studentsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-amber-400" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredStudents.map((s) => {
                      const att = s.attendance ?? 0;
                      const attColor = att >= 90 ? "bg-emerald-500" : att >= 75 ? "bg-amber-400" : "bg-red-400";
                      const availColor = s.availability === "Disponible" ? "bg-emerald-50 text-emerald-700" : s.availability === "En prácticas" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500";
                      const isManaging = managingId === s.id;
                      return (
                        <div key={s.id} className={`bg-white rounded-2xl border transition-all ${isManaging ? "border-amber-300 shadow-md" : "border-slate-200/60"}`}>
                          {/* ── Student summary row ── */}
                          <div className="p-4 flex items-center gap-4">
                            {s.avatar ? (
                              <img src={s.avatar} alt={s.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                                {s.name.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <p className="text-sm font-bold truncate">{s.name}</p>
                                {s.grade && <span className="text-[10px] text-slate-500">{s.grade}</span>}
                                {s.specialty && (
                                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">{s.specialty}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                                  <div className={`h-full ${attColor} rounded-full transition-all`} style={{ width: `${att}%` }} />
                                </div>
                                <span className="text-[10px] text-slate-500">{att}% asistencia</span>
                              </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1.5">
                              {s.availability && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${availColor}`}>{s.availability}</span>
                              )}
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => isManaging ? setManagingId(null) : openManageStudent(s)}
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${isManaging ? "bg-amber-100 text-amber-700" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`}
                                >
                                  {isManaging ? "Cerrar" : "Gestionar"}
                                </button>
                                <button
                                  onClick={() => handleGraduate(s.id)}
                                  disabled={graduatingId === s.id}
                                  className="text-[10px] font-bold px-2.5 py-1 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {graduatingId === s.id ? "..." : "Graduar"}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* ── Inline management panel ── */}
                          {isManaging && (
                            <div className="border-t border-amber-100 p-5 space-y-6 bg-amber-50/30">

                              {/* Global feedback message */}
                              {mgmtMsg && (
                                <div className={`text-xs font-semibold px-3 py-2 rounded-lg ${mgmtMsg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                                  {mgmtMsg.text}
                                </div>
                              )}

                              {/* ── Asistencia ── */}
                              <div className="bg-white rounded-xl p-4 border border-slate-200/60">
                                <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Asistencia al Taller</h5>
                                <div className="flex items-center gap-4">
                                  <input
                                    type="range" min={0} max={100} value={mgmtAtt}
                                    onChange={(e) => setMgmtAtt(Number(e.target.value))}
                                    className="flex-1 accent-amber-500"
                                  />
                                  <div className="flex items-center gap-2 shrink-0">
                                    <input
                                      type="number" min={0} max={100} value={mgmtAtt}
                                      onChange={(e) => setMgmtAtt(Math.min(100, Math.max(0, Number(e.target.value))))}
                                      className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center focus:ring-2 focus:ring-amber-200 outline-none"
                                    />
                                    <span className="text-sm font-bold text-slate-500">%</span>
                                  </div>
                                </div>
                                <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${mgmtAtt >= 90 ? "bg-emerald-500" : mgmtAtt >= 75 ? "bg-amber-400" : "bg-red-400"}`}
                                    style={{ width: `${mgmtAtt}%` }}
                                  />
                                </div>
                                <button
                                  onClick={handleSaveAtt}
                                  disabled={mgmtSaving === "att"}
                                  className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                  {mgmtSaving === "att" ? <><Loader2 size={12} className="animate-spin" /> Guardando…</> : "Guardar asistencia"}
                                </button>
                              </div>

                              {/* ── Habilidades Blandas ── */}
                              <div className="bg-white rounded-xl p-4 border border-slate-200/60">
                                <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Habilidades Blandas</h5>
                                <input
                                  type="text"
                                  value={mgmtSkillsStr}
                                  onChange={(e) => setMgmtSkillsStr(e.target.value)}
                                  placeholder="Trabajo en equipo, Liderazgo, Comunicación…"
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Separa las habilidades con comas.</p>
                                {mgmtSkillsStr.trim() && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {mgmtSkillsStr.split(",").map((sk) => sk.trim()).filter(Boolean).map((sk) => (
                                      <span key={sk} className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-[11px] font-semibold">{sk}</span>
                                    ))}
                                  </div>
                                )}
                                <button
                                  onClick={handleSaveSkills}
                                  disabled={mgmtSaving === "skills"}
                                  className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                  {mgmtSaving === "skills" ? <><Loader2 size={12} className="animate-spin" /> Guardando…</> : "Guardar habilidades"}
                                </button>
                              </div>

                              {/* ── Reporte del Colegio ── */}
                              <div className="bg-white rounded-xl p-4 border border-slate-200/60">
                                <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Reporte del Colegio</h5>
                                {!mgmtReportLoaded ? (
                                  <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
                                ) : (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="text-[11px] font-bold text-slate-500 mb-1 block">Período *</label>
                                      <input
                                        type="text" value={mgmtPeriod}
                                        onChange={(e) => setMgmtPeriod(e.target.value)}
                                        placeholder="Ej: I Semestre 2026"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[11px] font-bold text-slate-500 mb-1 block">Resumen</label>
                                      <textarea
                                        value={mgmtSummary} rows={2}
                                        onChange={(e) => setMgmtSummary(e.target.value)}
                                        placeholder="Rendimiento general del estudiante…"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[11px] font-bold text-slate-500 mb-1 block">Comentario del Docente</label>
                                      <textarea
                                        value={mgmtTeacher} rows={2}
                                        onChange={(e) => setMgmtTeacher(e.target.value)}
                                        placeholder="Observaciones del docente…"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[11px] font-bold text-slate-500 mb-1 block">Nota de Conducta</label>
                                      <textarea
                                        value={mgmtBehavior} rows={2}
                                        onChange={(e) => setMgmtBehavior(e.target.value)}
                                        placeholder="Comportamiento y actitud…"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none"
                                      />
                                    </div>
                                    <button
                                      onClick={handleSaveReport}
                                      disabled={mgmtSaving === "report" || !mgmtPeriod.trim()}
                                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                      {mgmtSaving === "report" ? <><Loader2 size={12} className="animate-spin" /> Guardando…</> : "Guardar reporte"}
                                    </button>
                                  </div>
                                )}
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
                    {filteredStudents.length === 0 && !studentsLoading && (
                      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/60">
                        <GraduationCap size={40} className="mx-auto mb-3 text-slate-200" />
                        <p className="text-slate-400 font-medium">No hay estudiantes registrados.</p>
                        <p className="text-xs text-slate-400 mt-1">Usa &ldquo;Agregar Alumno&rdquo; para crear el primer estudiante.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Estadísticas (Colegio) — live stats from dbStudents ── */}
            {tab === "Estadísticas" && isSchool && (
              <div className="space-y-4">
                <h3 className="font-bold text-base text-slate-800">Estadísticas del Centro</h3>

                {dbStudents.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/60">
                    <TrendingUp size={44} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 font-medium">Carga los estudiantes primero.</p>
                    <button onClick={fetchStudents} className="mt-3 text-xs text-amber-600 hover:underline font-semibold">Cargar datos</button>
                  </div>
                ) : (
                  <>
                    {/* ── Overview KPIs ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Total alumnos",    value: dbStudents.length,           color: "amber" },
                        { label: "Asistencia prom.", value: `${avgAttendance}%`,          color: "emerald" },
                        { label: "En práctica",      value: inPractice,                   color: "violet" },
                        { label: "Disponibles",      value: dbStudents.filter((s) => s.availability === "Disponible").length, color: "cyan" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-2xl p-4 text-center`}>
                          <p className={`text-2xl font-extrabold text-${color}-600`}>{value}</p>
                          <p className="text-xs text-slate-500 mt-1">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* ── Attendance distribution ── */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                      <h4 className="font-bold text-sm mb-4 text-slate-700">Distribución de Asistencia</h4>
                      {(() => {
                        const buckets = [
                          { label: "90-100%", count: dbStudents.filter((s) => (s.attendance ?? 0) >= 90).length, color: "#10b981" },
                          { label: "75-89%",  count: dbStudents.filter((s) => { const a = s.attendance ?? 0; return a >= 75 && a < 90; }).length, color: "#f59e0b" },
                          { label: "60-74%",  count: dbStudents.filter((s) => { const a = s.attendance ?? 0; return a >= 60 && a < 75; }).length, color: "#f97316" },
                          { label: "< 60%",   count: dbStudents.filter((s) => (s.attendance ?? 0) < 60).length, color: "#ef4444" },
                        ];
                        const maxCount = Math.max(...buckets.map((b) => b.count), 1);
                        return (
                          <div className="space-y-3">
                            {buckets.map((b) => (
                              <div key={b.label}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-semibold text-slate-600">{b.label}</span>
                                  <span className="font-bold" style={{ color: b.color }}>{b.count} alumnos</span>
                                </div>
                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${(b.count / maxCount) * 100}%`, background: b.color }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* ── Specialty distribution ── */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                      <h4 className="font-bold text-sm mb-4 text-slate-700">Distribución por Especialidad</h4>
                      {(() => {
                        const specMap: Record<string, number> = {};
                        dbStudents.forEach((s) => {
                          const sp = s.specialty || "Sin especialidad";
                          specMap[sp] = (specMap[sp] ?? 0) + 1;
                        });
                        const specs = Object.entries(specMap).sort((a, b) => b[1] - a[1]);
                        const maxCount = Math.max(...specs.map(([, c]) => c), 1);
                        const specColors = ["#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#9333ea"];
                        return specs.length === 0 ? (
                          <p className="text-sm text-slate-400">Sin datos de especialidad.</p>
                        ) : (
                          <div className="space-y-3">
                            {specs.map(([sp, count], i) => (
                              <div key={sp}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-semibold text-slate-600 truncate max-w-[65%]">{sp}</span>
                                  <span className="font-bold" style={{ color: specColors[i % specColors.length] }}>{count}</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${(count / maxCount) * 100}%`, background: specColors[i % specColors.length] }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* ── Availability breakdown ── */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                      <h4 className="font-bold text-sm mb-4 text-slate-700">Disponibilidad de Alumnos</h4>
                      {(() => {
                        const avail = [
                          { label: "Disponible",    count: dbStudents.filter((s) => s.availability === "Disponible").length,    color: "#10b981", bg: "bg-emerald-50" },
                          { label: "En prácticas",  count: dbStudents.filter((s) => s.availability === "En prácticas").length,  color: "#7c3aed", bg: "bg-violet-50" },
                          { label: "No disponible", count: dbStudents.filter((s) => s.availability === "No disponible" || !s.availability).length, color: "#94a3b8", bg: "bg-slate-50" },
                        ];
                        const total = dbStudents.length;
                        return (
                          <div className="grid grid-cols-3 gap-3">
                            {avail.map(({ label, count, color, bg }) => (
                              <div key={label} className={`${bg} rounded-xl p-4 text-center border`} style={{ borderColor: `${color}33` }}>
                                <p className="text-2xl font-extrabold" style={{ color }}>{count}</p>
                                <p className="text-[10px] text-slate-500 mt-1">{label}</p>
                                <p className="text-[10px] font-semibold mt-1" style={{ color }}>{total > 0 ? Math.round((count / total) * 100) : 0}%</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* ── Top performers ── */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/60">
                      <h4 className="font-bold text-sm mb-4 text-slate-700">Top Alumnos por Asistencia</h4>
                      <div className="space-y-2">
                        {[...dbStudents]
                          .sort((a, b) => (b.attendance ?? 0) - (a.attendance ?? 0))
                          .slice(0, 5)
                          .map((s, i) => (
                            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                                i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-white" : "bg-slate-100 text-slate-500"
                              }`}>
                                {i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{s.name}</p>
                                {s.specialty && <p className="text-[10px] text-slate-400">{s.specialty}</p>}
                              </div>
                              <span className={`text-xs font-extrabold ${(s.attendance ?? 0) >= 90 ? "text-emerald-600" : (s.attendance ?? 0) >= 75 ? "text-amber-600" : "text-red-500"}`}>
                                {s.attendance ?? 0}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Solicitudes (Colegio) — real internship_requests ── */}
            {tab === "Solicitudes" && isSchool && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-800">Solicitudes de Empresas</h3>
                  <button onClick={fetchInternshipRequests} className="text-xs text-amber-600 hover:underline font-semibold flex items-center gap-1">
                    <Loader2 size={10} className={reqsLoading ? "animate-spin" : "hidden"} /> Actualizar
                  </button>
                </div>

                {reqsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-amber-400" /></div>
                ) : internshipReqs.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/60">
                    <Building2 size={44} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 font-medium">No hay solicitudes de empresas.</p>
                    <p className="text-xs text-slate-400 mt-1">Cuando una empresa solicite alumnos, aparecerá aquí.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {internshipReqs.map((req) => {
                      const companyName = req.profiles?.company_name || req.profiles?.name || "Empresa";
                      const statusBadge = req.status === "aprobado"
                        ? { label: "Aprobada", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" }
                        : req.status === "rechazado"
                        ? { label: "Rechazada", cls: "bg-red-50 text-red-600 border-red-100" }
                        : { label: "Pendiente", cls: "bg-amber-50 text-amber-700 border-amber-100" };
                      return (
                        <div key={req.id} className={`bg-white rounded-2xl border overflow-hidden ${req.urgent ? "border-orange-200" : "border-slate-200/60"}`}>
                          {req.urgent && (
                            <div className="bg-orange-500 text-white text-[11px] font-bold px-4 py-1.5 flex items-center gap-2">
                              <span>⚠️</span> Solicitud Urgente
                            </div>
                          )}
                          <div className="p-5">
                            <div className="flex items-start gap-4">
                              {/* Company avatar */}
                              {req.profiles?.avatar ? (
                                <img src={req.profiles.avatar} alt={companyName}
                                  className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-100" />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                                  <Building2 size={20} className="text-violet-500" />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <p className="font-bold text-sm">{req.title}</p>
                                  <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full ${statusBadge.cls}`}>{statusBadge.label}</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mb-2">{companyName}</p>

                                <div className="flex flex-wrap gap-2 text-[11px] mb-2">
                                  <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                                    {req.slots} alumno{req.slots !== 1 ? "s" : ""}
                                  </span>
                                  {req.specialty && (
                                    <span className="bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full">{req.specialty}</span>
                                  )}
                                  <span className="text-slate-400">
                                    {new Date(req.created_at).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                </div>

                                {req.description && (
                                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{req.description}</p>
                                )}
                              </div>
                            </div>

                            {/* Action buttons (only if pendiente) */}
                            {req.status === "pendiente" && (
                              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                                <button
                                  onClick={() => handleUpdateReq(req.id, "aprobado")}
                                  disabled={updatingReq === req.id}
                                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
                                >
                                  {updatingReq === req.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                  Aprobar Solicitud
                                </button>
                                <button
                                  onClick={() => handleUpdateReq(req.id, "rechazado")}
                                  disabled={updatingReq === req.id}
                                  className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-xs font-bold py-2.5 rounded-xl border border-red-100 transition-colors"
                                >
                                  {updatingReq === req.id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                                  Rechazar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      <Modal
        open={editOpen}
        onClose={() => { setEditOpen(false); setSaveError(null); setSaveSuccess(false); }}
        title="Editar Perfil"
      >
        <div className="space-y-4">
          {saveError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              ¡Guardado con éxito!
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Nombre</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Biografía</label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none resize-none"
            />
            <p className="text-[10px] text-slate-400 text-right mt-1">{editBio.length}/500</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Ubicación</label>
            <input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              placeholder="Ej: Santiago, Chile"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none"
            />
          </div>

          {isStudent && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Especialidad</label>
                <input
                  value={editSpecialty}
                  onChange={(e) => setEditSpecialty(e.target.value)}
                  placeholder="Ej: Mecatrónica"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Título / Cargo</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Ej: Estudiante de Mecatrónica"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Disponibilidad</label>
                <select
                  value={editAvailability}
                  onChange={(e) => setEditAvailability(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 outline-none bg-white"
                >
                  <option>Disponible</option>
                  <option>En prácticas</option>
                  <option>No disponible</option>
                </select>
              </div>
            </>
          )}

          {isCompany && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Industria</label>
                <input
                  value={editIndustry}
                  onChange={(e) => setEditIndustry(e.target.value)}
                  placeholder="Ej: Automatización Industrial"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Sitio web</label>
                <input
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="ejemplo.com"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-2 block">Color del perfil</label>
            <div className="flex flex-wrap gap-2">
              {THEME_COLORS.map((color) => {
                const p = THEME_PALETTE[color];
                const selected = (editThemeColor || roleDefaultTheme) === color;
                return (
                  <button
                    key={color}
                    type="button"
                    title={p.label}
                    onClick={() => setEditThemeColor(color)}
                    className={`w-8 h-8 rounded-full ${p.swatch} transition-transform hover:scale-110 focus:outline-none ${selected ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : ""}`}
                  />
                );
              })}
            </div>
            {editThemeColor && (
              <p className="text-[11px] text-slate-400 mt-1.5">
                Seleccionado: <span className={`font-semibold ${THEME_PALETTE[editThemeColor]?.text ?? ""}`}>{THEME_PALETTE[editThemeColor]?.label}</span>
              </p>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full ${btnClass} text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-colors btn-press flex items-center justify-center gap-2`}
          >
            {saving
              ? <><Loader2 size={16} className="animate-spin" />Guardando…</>
              : "Guardar cambios"
            }
          </button>
        </div>
      </Modal>

      {/* ── Add Vacancy Modal ── */}
      <Modal open={addVacancyOpen} onClose={() => setAddVacancyOpen(false)} title="Agregar Vacante">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Título del cargo</label>
            <input value={newVacTitle} onChange={(e) => setNewVacTitle(e.target.value)} placeholder="Ej: Pasante Soldadura TIG"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Departamento</label>
              <input value={newVacDept} onChange={(e) => setNewVacDept(e.target.value)} placeholder="Ej: Producción"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tipo</label>
              <select value={newVacType} onChange={(e) => setNewVacType(e.target.value as Vacancy["type"])}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 outline-none bg-white">
                <option value="Pasantia">Pasantía</option>
                <option value="Tiempo completo">Tiempo completo</option>
                <option value="Part-time">Part-time</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Duración</label>
            <input value={newVacDuration} onChange={(e) => setNewVacDuration(e.target.value)} placeholder="Ej: 3 meses"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Remuneración</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setNewVacPaid(true)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${newVacPaid ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-500 border-slate-200"}`}>Sí</button>
              <button type="button" onClick={() => setNewVacPaid(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${!newVacPaid ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-500 border-slate-200"}`}>No</button>
            </div>
          </div>
          {newVacPaid && (
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Salario</label>
              <input value={newVacSalary} onChange={(e) => setNewVacSalary(e.target.value)} placeholder="Ej: $400.000/mes"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Descripción</label>
            <textarea value={newVacDesc} onChange={(e) => setNewVacDesc(e.target.value)} rows={3} placeholder="Describe el rol..."
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none resize-none" />
          </div>
          <button onClick={addVacancy} disabled={!newVacTitle.trim()}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white py-3 rounded-xl font-bold text-sm transition-colors">
            Agregar Vacante
          </button>
        </div>
      </Modal>

      {/* ── Add Student Modal ── */}
      {isSchool && (
        <Modal open={addStudentOpen} onClose={() => setAddStudentOpen(false)} title="Agregar Nuevo Alumno">
          <div className="space-y-4">
            {addStudentErr && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{addStudentErr}</div>
            )}
            {addStudentOk && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">Alumno creado con éxito.</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre *</label>
                <input value={newStFirstName} onChange={(e) => setNewStFirstName(e.target.value)}
                  placeholder="Felipe" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Apellido *</label>
                <input value={newStLastName} onChange={(e) => setNewStLastName(e.target.value)}
                  placeholder="Castro" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Correo electrónico *</label>
              <input type="email" value={newStEmail} onChange={(e) => setNewStEmail(e.target.value)}
                placeholder="felipe@colegio.cr" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Contraseña temporal *</label>
              <input type="password" value={newStPassword} onChange={(e) => setNewStPassword(e.target.value)}
                placeholder="Mín. 8 caracteres" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 outline-none" />
              <p className="text-[10px] text-slate-400 mt-1">El alumno deberá cambiarla en su primer inicio de sesión.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Especialidad</label>
                <input value={newStSpecialty} onChange={(e) => setNewStSpecialty(e.target.value)}
                  placeholder="Mecatronica" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Nivel/Año</label>
                <input value={newStGrade} onChange={(e) => setNewStGrade(e.target.value)}
                  placeholder="3° Medio" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 outline-none" />
              </div>
            </div>
            <button
              onClick={handleAddStudent}
              disabled={addStudentBusy || !newStFirstName || !newStLastName || !newStEmail || !newStPassword}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {addStudentBusy ? <><Loader2 size={15} className="animate-spin" /> Creando…</> : <><Plus size={15} /> Crear Alumno</>}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Welcome Onboarding Modal ── */}
      {role === "Estudiante" && (
        <Modal open={showOnboarding} onClose={() => { localStorage.setItem("cl_onboarded", "1"); setShowOnboarding(false); }} title="Bienvenido a ClassLink">
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                { num: 1, label: "Completa tu perfil", icon: <User size={20} className="text-cyan-600" /> },
                { num: 2, label: "Gana tu primera insignia", icon: <Award size={20} className="text-amber-500" /> },
                { num: 3, label: "Descarga tu CV público", icon: <Download size={20} className="text-violet-600" /> },
              ].map((step) => (
                <div key={step.num} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-sm font-extrabold text-cyan-700 shrink-0">
                    {step.num}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{step.label}</p>
                  </div>
                  {step.icon}
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-700 font-medium">
                ⚠️ Recuerda cambiar tu contraseña temporal antes de continuar.
              </p>
            </div>
            <button
              onClick={() => { localStorage.setItem("cl_onboarded", "1"); setShowOnboarding(false); }}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-xl font-bold text-sm transition-colors"
            >
              Empezar
            </button>
          </div>
        </Modal>
      )}

      {/* ── Solicitar Alumnos Modal (Empresa) ── */}
      {isCompany && (
        <Modal open={solicitarOpen} onClose={() => setSolicitarOpen(false)} title="Solicitar Alumnos a Colegio">
          <div className="space-y-4">
            {solErr && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{solErr}</div>
            )}
            {solOk && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">Solicitud enviada correctamente.</div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Título de la solicitud *</label>
              <input value={solTitle} onChange={(e) => setSolTitle(e.target.value)}
                placeholder="Ej: Pasantes en soldadura TIG"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Centro educativo *</label>
              <select value={solSchoolId} onChange={(e) => setSolSchoolId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 outline-none bg-white">
                <option value="">Seleccionar colegio…</option>
                {solSchools.map((sc) => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Especialidad</label>
                <input value={solSpecialty} onChange={(e) => setSolSpecialty(e.target.value)}
                  placeholder="Ej: Mecatronica"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Número de alumnos</label>
                <input type="number" min={1} max={50} value={solSlots} onChange={(e) => setSolSlots(Math.max(1, Number(e.target.value)))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Descripción / detalles</label>
              <textarea value={solDesc} onChange={(e) => setSolDesc(e.target.value)} rows={3}
                placeholder="Explica el tipo de práctica, horarios, requisitos…"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 outline-none resize-none" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100 cursor-pointer" onClick={() => setSolUrgent(!solUrgent)}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${solUrgent ? "bg-orange-500 border-orange-500" : "border-slate-300"}`}>
                {solUrgent && <CheckCircle2 size={12} className="text-white" />}
              </div>
              <div>
                <p className="text-xs font-bold text-orange-800">Solicitud urgente</p>
                <p className="text-[10px] text-orange-600">El colegio recibirá una notificación prioritaria</p>
              </div>
            </div>
            <button
              onClick={handleSolicitar}
              disabled={solBusy || !solTitle.trim() || !solSchoolId}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {solBusy ? <><Loader2 size={15} className="animate-spin" /> Enviando…</> : "Enviar Solicitud"}
            </button>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}
