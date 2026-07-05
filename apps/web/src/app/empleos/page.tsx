"use client";
import { useState, useEffect, useCallback } from "react";
import PageLayout from "@/components/layout/PageLayout";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase";
import { jobPostingSchema } from "@/lib/schemas";
import { updateApplicationStatusSA, type AtsStatus } from "@/app/actions/company";
import { TP_SPECIALTIES } from "@/lib/specialties";
import {
  Briefcase, MapPin, Plus, Loader2, ChevronDown, Send, CheckCircle,
  Users, ArrowUp, ArrowDown, Sparkles, UserPlus, UserCheck,
  BarChart2, TrendingUp, Award, Eye, CalendarClock, ListChecks,
} from "lucide-react";
import { computeMatchScore, getMatchLabel, getMatchColor } from "@/lib/utils/matching";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useQuestProgress } from "@/lib/hooks/useQuestProgress";
import ProposeInterviewModal from "@/components/ats/ProposeInterviewModal";
import ApplicationTimeline from "@/components/ats/ApplicationTimeline";

// ── Types ─────────────────────────────────────────────────

interface JobPosting {
  id: string; title: string; description: string; location: string;
  type: string; specialty: string; salary_min: number | null;
  salary_max: number | null; active: boolean; created_at: string;
  company_id: string; max_candidates: number | null; views_count: number;
  company?: { name: string; avatar: string; };
}

interface Applicant {
  id: string; job_id: string; applicant_id: string;
  status: AtsStatus;
  priority: number; created_at: string;
  profile?: { id: string; name: string; avatar: string | null; specialty: string | null; };
  matchScore?: number;
}

interface CompanyStats {
  activeJobs: number;
  totalApplicants: number;
  interviewing: number;
  hired: number;
}

// ── ATS status display config ─────────────────────────────

const STATUS_LABELS: Record<AtsStatus, string> = {
  pending:      "Pendiente",
  reviewing:    "En revisión",
  interviewing: "Entrevistando",
  accepted:     "Aceptado",
  rejected:     "Rechazado",
  hired:        "Contratado",
};

const STATUS_STYLES: Record<AtsStatus, string> = {
  pending:      "bg-amber-50 text-amber-700 border-amber-200",
  reviewing:    "bg-sky-50 text-sky-700 border-sky-200",
  interviewing: "bg-purple-50 text-purple-700 border-purple-200",
  accepted:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:     "bg-red-50 text-red-500 border-red-200 opacity-60",
  hired:        "bg-violet-50 text-violet-700 border-violet-200",
};

const STATUS_ROW_BG: Record<AtsStatus, string> = {
  pending:      "border-slate-100 bg-white",
  reviewing:    "border-sky-100 bg-sky-50/20",
  interviewing: "border-purple-100 bg-purple-50/20",
  accepted:     "border-emerald-200 bg-emerald-50/20",
  rejected:     "border-red-100 bg-red-50/10 opacity-60",
  hired:        "border-violet-200 bg-violet-50/30",
};

// ── Main component ────────────────────────────────────────

export default function EmpleosPage() {
  const { user } = useAuth();
  const { role } = useRole();
  const isCompany = role === "Empresa";
  const { toast }          = useToast();
  const confirmFn          = useConfirm();
  const trackQuest         = useQuestProgress();

  const [jobs,          setJobs]          = useState<JobPosting[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [appliedIds,    setAppliedIds]    = useState<Set<string>>(new Set());
  const [applying,      setApplying]      = useState<string | null>(null);
  const [followedIds,   setFollowedIds]   = useState<Set<string>>(new Set());
  const [followingId,   setFollowingId]   = useState<string | null>(null);
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editJob,       setEditJob]       = useState<JobPosting | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [companyStats,  setCompanyStats]  = useState<CompanyStats | null>(null);

  // Interview proposal state (company view)
  const [proposeFor, setProposeFor] = useState<{
    applicationId: string; studentName: string; jobTitle: string;
  } | null>(null);

  // Student view: show applications with timelines
  const [showApplications, setShowApplications] = useState(false);
  const [myApplications,   setMyApplications]   = useState<{
    id: string; job_id: string; status: AtsStatus; job_title: string; company_name: string; created_at: string;
  }[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Form state
  const [fTitle,         setFTitle]         = useState("");
  const [fDesc,          setFDesc]          = useState("");
  const [fLocation,      setFLocation]      = useState("");
  const [fType,          setFType]          = useState("full-time");
  const [fSpecialty,     setFSpecialty]     = useState("");
  const [fMaxCandidates, setFMaxCandidates] = useState<number | "">(10);

  // Applicant management (company view)
  const [applicantMap,      setApplicantMap]      = useState<Record<string, Applicant[]>>({});
  const [loadingApplicants, setLoadingApplicants] = useState<string | null>(null);
  const [updatingApp,       setUpdatingApp]       = useState<string | null>(null);

  // Smart matching — student profile data
  const [mySkills,    setMySkills]    = useState<string[]>([]);
  const [mySpecialty, setMySpecialty] = useState("");

  // ── Data fetchers ────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    setLoading(true); setError(null);
    let query;

    if (isCompany && user?.id) {
      query = supabase
        .from("job_postings")
        .select("*, company:profiles!job_postings_company_id_fkey(name,avatar)")
        .eq("company_id", user.id)
        .order("created_at", { ascending: false });
    } else {
      query = supabase
        .from("job_postings")
        .select("*, company:profiles!job_postings_company_id_fkey(name,avatar)")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(50);
    }

    const { data, error: err } = await query;
    if (err) { setError("No se pudieron cargar las vacantes."); }
    else { setJobs(data as JobPosting[]); }
    setLoading(false);
  }, [isCompany, user?.id]);

  const fetchMyApplications = useCallback(async () => {
    if (!user?.id || isCompany) return;
    const { data } = await supabase
      .from("job_applications")
      .select("job_id")
      .eq("applicant_id", user.id);
    setAppliedIds(new Set((data ?? []).map((a: any) => a.job_id)));
  }, [user?.id, isCompany]);

  const fetchMyFollows = useCallback(async () => {
    if (!user?.id || isCompany) return;
    const { data } = await supabase
      .from("company_follows")
      .select("company_id")
      .eq("student_id", user.id);
    setFollowedIds(new Set((data ?? []).map((r: any) => r.company_id)));
  }, [user?.id, isCompany]);

  const fetchMyProfile = useCallback(async () => {
    if (!user?.id || isCompany) return;
    const [{ data: prof }, { data: skillsData }] = await Promise.all([
      supabase.from("profiles").select("specialty").eq("id", user.id).single(),
      supabase.from("user_skills").select("skills(name)").eq("user_id", user.id),
    ]);
    if (prof) setMySpecialty((prof as { specialty?: string | null }).specialty ?? "");
    if (skillsData) setMySkills((skillsData as { skills?: { name?: string } | null }[]).map((s) => s.skills?.name ?? ""));
  }, [user?.id, isCompany]);

  const fetchCompanyStats = useCallback(async () => {
    if (!isCompany || !user?.id) return;
    const { data: jobRows } = await supabase
      .from("job_postings")
      .select("id, active")
      .eq("company_id", user.id);

    if (!jobRows?.length) {
      setCompanyStats({ activeJobs: 0, totalApplicants: 0, interviewing: 0, hired: 0 });
      return;
    }

    const ids        = jobRows.map((j) => j.id);
    const activeJobs = jobRows.filter((j) => j.active).length;

    const [totalRes, interviewingRes, hiredRes] = await Promise.all([
      supabase.from("job_applications").select("id", { count: "exact", head: true }).in("job_id", ids),
      supabase.from("job_applications").select("id", { count: "exact", head: true }).in("job_id", ids).eq("status", "interviewing"),
      supabase.from("job_applications").select("id", { count: "exact", head: true }).in("job_id", ids).eq("status", "hired"),
    ]);

    setCompanyStats({
      activeJobs,
      totalApplicants: totalRes.count ?? 0,
      interviewing:    interviewingRes.count ?? 0,
      hired:           hiredRes.count ?? 0,
    });
  }, [isCompany, user?.id]);

  useEffect(() => {
    fetchJobs();
    fetchMyApplications();
    fetchMyFollows();
    fetchMyProfile();
    fetchCompanyStats();
  }, [fetchJobs, fetchMyApplications, fetchMyFollows, fetchMyProfile, fetchCompanyStats]);

  // ── Form helpers ─────────────────────────────────────────

  const openCreate = () => {
    setEditJob(null);
    setFTitle(""); setFDesc(""); setFLocation(""); setFType("full-time");
    setFSpecialty(""); setFMaxCandidates(10);
    setSaveError(null);
    setCreateOpen(true);
  };

  const openEdit = (job: JobPosting) => {
    setEditJob(job);
    setFTitle(job.title); setFDesc(job.description); setFLocation(job.location ?? "");
    setFType(job.type); setFSpecialty(job.specialty ?? "");
    setFMaxCandidates(job.max_candidates ?? 10);
    setSaveError(null);
    setCreateOpen(true);
  };

  // ── Fetch applicants for a job (company only) ─────────────
  // Batch-fetches skills for all applicants and computes match scores.
  const fetchApplicants = async (jobId: string) => {
    if (applicantMap[jobId]) {
      setExpandedId((prev) => (prev === jobId ? null : jobId));
      return;
    }
    setLoadingApplicants(jobId);

    const { data } = await supabase
      .from("job_applications")
      .select("id, job_id, applicant_id, status, created_at, profiles!job_applications_student_id_fkey(id, name, avatar, specialty)")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });

    const raw = data ?? [];

    // Batch-fetch skills for all applicants in one query
    const applicantIds = raw.map((r: any) => r.applicant_id).filter(Boolean);
    const skillsByUser: Record<string, string[]> = {};

    if (applicantIds.length > 0) {
      const { data: skillsRows } = await supabase
        .from("user_skills")
        .select("user_id, skills(name)")
        .in("user_id", applicantIds);

      for (const row of skillsRows ?? []) {
        const uid  = (row as { user_id: string; skills?: { name?: string } | null }).user_id;
        const name = (row as { skills?: { name?: string } | null }).skills?.name ?? "";
        if (name) {
          skillsByUser[uid] = skillsByUser[uid] ?? [];
          skillsByUser[uid].push(name);
        }
      }
    }

    const job = jobs.find((j) => j.id === jobId);

    const mapped: Applicant[] = raw.map((r: any, idx: number) => {
      const specialty = r.profiles?.specialty ?? "";
      const skills    = skillsByUser[r.applicant_id] ?? [];
      const matchScore = job
        ? computeMatchScore(skills, specialty, {
            id: jobId, title: job.title,
            description: job.description, specialty: job.specialty ?? "",
            requirements: "",
          })
        : 0;

      return {
        id:           r.id,
        job_id:       r.job_id,
        applicant_id: r.applicant_id,
        status:       (["pending", "reviewing", "interviewing", "accepted", "rejected", "hired"].includes(r.status)
          ? r.status : "pending") as AtsStatus,
        priority:     idx + 1,
        created_at:   r.created_at,
        profile:      r.profiles
          ? { id: r.profiles.id, name: r.profiles.name, avatar: r.profiles.avatar, specialty: r.profiles.specialty }
          : undefined,
        matchScore,
      };
    });

    setApplicantMap((prev) => ({ ...prev, [jobId]: mapped }));
    setLoadingApplicants(null);
    setExpandedId(jobId);
  };

  const updateApplicantStatus = async (jobId: string, appId: string, newStatus: AtsStatus) => {
    setUpdatingApp(appId);
    const res = await updateApplicationStatusSA(appId, jobId, newStatus);
    setUpdatingApp(null);
    if ("error" in res && res.error) {
      toast({ type: "error", title: "Error al actualizar estado", description: res.error });
      return;
    }
    setApplicantMap((prev) => ({
      ...prev,
      [jobId]: (prev[jobId] ?? []).map((a) => a.id === appId ? { ...a, status: newStatus } : a),
    }));
    toast({ type: "success", title: "Estado actualizado" });
  };

  const movePriority = async (jobId: string, appId: string, direction: "up" | "down") => {
    const list = [...(applicantMap[jobId] ?? [])];
    const idx  = list.findIndex((a) => a.id === appId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
    const updated = list.map((a, i) => ({ ...a, priority: i + 1 }));
    setApplicantMap((prev) => ({ ...prev, [jobId]: updated }));
    Promise.all(
      updated.map((a) => supabase.from("job_applications").update({ priority: a.priority }).eq("id", a.id))
    ).catch(() => {});
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true); setSaveError(null);

    const parsed = jobPostingSchema.safeParse({
      title: fTitle, description: fDesc, location: fLocation,
      type: fType, specialty: fSpecialty,
    });
    if (!parsed.success) {
      setSaveError(parsed.error.issues[0]?.message ?? "Error de validación");
      setSaving(false); return;
    }

    const maxCand = fMaxCandidates === "" ? null : Number(fMaxCandidates);
    if (editJob) {
      const { error: err } = await supabase
        .from("job_postings")
        .update({ title: fTitle, description: fDesc, location: fLocation, type: fType, specialty: fSpecialty, max_candidates: maxCand })
        .eq("id", editJob.id)
        .eq("company_id", user.id);
      if (err) { setSaveError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase
        .from("job_postings")
        .insert({ title: fTitle, description: fDesc, location: fLocation, type: fType, specialty: fSpecialty, company_id: user.id, active: true, max_candidates: maxCand });
      if (err) { setSaveError(err.message); setSaving(false); return; }
    }

    await fetchJobs();
    await fetchCompanyStats();
    setCreateOpen(false);
    setSaving(false);
  };

  const handleDelete = async (jobId: string) => {
    const ok = await confirmFn({
      title:        "¿Eliminar esta vacante?",
      body:         "Se eliminarán también todas las postulaciones asociadas. Esta acción es irreversible.",
      danger:       true,
      confirmLabel: "Eliminar",
    });
    if (!ok) return;
    await supabase.from("job_postings").delete().eq("id", jobId).eq("company_id", user?.id ?? "");
    await fetchJobs();
    await fetchCompanyStats();
    toast({ type: "success", title: "Vacante eliminada" });
  };

  const fetchMyApplicationsWithTimeline = useCallback(async () => {
    if (!user?.id || isCompany) return;
    setLoadingApps(true);
    const { data } = await supabase
      .from("job_applications")
      .select("id, job_id, status, created_at, job_postings!inner(title, profiles!job_postings_company_id_fkey(name))")
      .eq("applicant_id", user.id)
      .order("created_at", { ascending: false });
    setMyApplications(
      (data ?? []).map((a) => ({
        id:           a.id as string,
        job_id:       a.job_id as string,
        status:       a.status as AtsStatus,
        created_at:   a.created_at as string,
        job_title:    (a.job_postings as { title?: string; profiles?: { name?: string } | null } | null)?.title ?? "Vacante",
        company_name: (a.job_postings as { title?: string; profiles?: { name?: string } | null } | null)?.profiles?.name ?? "Empresa",
      }))
    );
    setLoadingApps(false);
  }, [user?.id, isCompany]);

  const handleApply = async (jobId: string) => {
    if (!user?.id) return;
    setApplying(jobId);
    const { error: err } = await supabase
      .from("job_applications")
      .insert({ job_id: jobId, applicant_id: user.id, student_id: user.id, status: "pending" });
    if (!err) {
      setAppliedIds((prev) => new Set(prev).add(jobId));
      // XP reward for applying
      fetch("/api/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "job_apply", xp_amount: 50, metadata: { job_id: jobId } }),
      }).catch(() => {});
      // Quest progress: apply_job
      trackQuest("apply_job");
      toast({ type: "success", title: "¡Postulación enviada!", description: "+50 XP" });
    } else {
      toast({ type: "error", title: "No se pudo postular", description: err.message });
    }
    setApplying(null);
  };

  const toggleFollow = async (companyId: string) => {
    if (!user?.id || isCompany) return;
    setFollowingId(companyId);
    const isFollowing = followedIds.has(companyId);
    if (isFollowing) {
      await supabase.from("company_follows").delete().eq("student_id", user.id).eq("company_id", companyId);
      setFollowedIds((prev) => { const next = new Set(prev); next.delete(companyId); return next; });
    } else {
      await supabase.from("company_follows").insert({ student_id: user.id, company_id: companyId });
      setFollowedIds((prev) => new Set(prev).add(companyId));
    }
    setFollowingId(null);
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? jobs[0] ?? null;

  // ── Render ────────────────────────────────────────────────

  return (
    <PageLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-5">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between animate-fade-in-up">
          <div>
            <p className="text-sm text-cyan-600 font-semibold mb-1">Oportunidades</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {isCompany ? "Mis Vacantes" : "Empleos y Pasantías"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isCompany ? "Gestiona tus publicaciones y candidatos" : "Encuentra tu próxima oportunidad"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isCompany && (
              <button
                onClick={() => {
                  setShowApplications((v) => !v);
                  if (!myApplications.length) fetchMyApplicationsWithTimeline();
                }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors btn-press ${
                  showApplications
                    ? "bg-cyan-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-cyan-300"
                }`}
              >
                <ListChecks size={16} />
                Mis postulaciones
              </button>
            )}
            {isCompany && (
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm btn-press"
              >
                <Plus size={16} /> Nueva vacante
              </button>
            )}
          </div>
        </div>

        {/* ── Student: My applications + timelines ── */}
        {!isCompany && showApplications && (
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 space-y-4 animate-fade-in-up">
            <h3 className="font-bold text-base">Mis postulaciones</h3>
            {loadingApps && <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-cyan-400" /></div>}
            {!loadingApps && myApplications.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Aún no tienes postulaciones.</p>
            )}
            <div className="space-y-4">
              {myApplications.map((app) => (
                <div key={app.id} className="border border-slate-200/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{app.job_title}</p>
                      <p className="text-xs text-slate-400">{app.company_name}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(app.created_at).toLocaleDateString("es-CR")}</span>
                  </div>
                  <ApplicationTimeline applicationId={app.id} compact />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Company Analytics Dashboard ── */}
        {isCompany && companyStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up stagger-1">
            {[
              { label: "Vacantes activas", value: companyStats.activeJobs,      icon: <Briefcase  size={16} />, color: "cyan"    },
              { label: "Total candidatos", value: companyStats.totalApplicants, icon: <Users      size={16} />, color: "violet"  },
              { label: "En entrevistas",   value: companyStats.interviewing,    icon: <TrendingUp size={16} />, color: "purple"  },
              { label: "Contratados",      value: companyStats.hired,           icon: <Award      size={16} />, color: "emerald" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-3"
              >
                <div className={`w-9 h-9 rounded-xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 shrink-0`}>
                  {stat.icon}
                </div>
                <div>
                  <p className={`text-2xl font-extrabold text-${stat.color}-600 leading-none`}>{stat.value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
        )}
        {loading && (
          <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-cyan-400" /></div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/60">
            <Briefcase size={48} className="mx-auto mb-4 text-slate-200" />
            <p className="text-slate-400 font-medium">{isCompany ? "Aún no has publicado vacantes." : "No hay vacantes disponibles."}</p>
            {isCompany && (
              <button onClick={openCreate} className="mt-3 text-sm text-violet-600 font-semibold hover:underline">
                Publicar primera vacante
              </button>
            )}
          </div>
        )}

        {/* ── Desktop split-view wrapper ── */}
        <div className={!isCompany && jobs.length > 0 ? "xl:grid xl:grid-cols-[1fr_1.5fr] xl:gap-5 xl:items-start" : ""}>

          {/* ── Job list ── */}
          <div className="space-y-4">
            {jobs.map((job, i) => {
              const isExpanded       = expandedId === job.id;
              const isSelectedDesktop = !isCompany && job.id === (selectedJobId ?? jobs[0]?.id);
              const hasApplied       = appliedIds.has(job.id);
              const jobApplicants    = applicantMap[job.id] ?? [];
              const acceptedCount    = jobApplicants.filter((a) => a.status === "accepted" || a.status === "hired").length;
              const maxReached       = job.max_candidates != null && acceptedCount >= job.max_candidates;

              // Pipeline counts for the expanded company view
              const pipelineCounts = {
                pending:      jobApplicants.filter((a) => a.status === "pending").length,
                reviewing:    jobApplicants.filter((a) => a.status === "reviewing").length,
                interviewing: jobApplicants.filter((a) => a.status === "interviewing").length,
                accepted:     jobApplicants.filter((a) => a.status === "accepted").length,
                rejected:     jobApplicants.filter((a) => a.status === "rejected").length,
                hired:        jobApplicants.filter((a) => a.status === "hired").length,
              };

              return (
                <article
                  key={job.id}
                  onClick={() => { if (!isCompany) setSelectedJobId(job.id); }}
                  className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-all animate-fade-in-up stagger-${Math.min(i + 1, 6)} ${
                    !isCompany ? "cursor-pointer" : ""
                  } ${
                    isSelectedDesktop ? "border-cyan-400 shadow-md xl:border-2" : "border-slate-200/60"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      {job.company?.avatar ? (
                        <img src={job.company.avatar} alt={job.company.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                          <Briefcase size={20} className="text-violet-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base">{job.title}</h3>
                        <p className="text-sm text-slate-500">{job.company?.name ?? "Empresa"}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                          {job.location && <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>}
                          <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded-md font-semibold capitalize">{job.type}</span>
                          {job.specialty && <span className="bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md font-semibold">{job.specialty}</span>}
                          {isCompany && job.max_candidates != null && (
                            <span className={`px-2 py-0.5 rounded-md font-semibold ${maxReached ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>
                              {acceptedCount}/{job.max_candidates} cupos
                            </span>
                          )}
                          {isCompany && job.views_count > 0 && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Eye size={10} /> {job.views_count}
                            </span>
                          )}
                          {!job.active && <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded-md font-semibold">Cerrada</span>}
                          {/* Smart match score — student/egresado only */}
                          {!isCompany && (mySkills.length > 0 || mySpecialty) && (() => {
                            const score = computeMatchScore(mySkills, mySpecialty, {
                              id: job.id, title: job.title,
                              description: job.description, specialty: job.specialty ?? "",
                              requirements: "",
                            });
                            const color = getMatchColor(score);
                            return (
                              <span className={`flex items-center gap-1 text-${color}-600 bg-${color}-50 border border-${color}-100 px-2 py-0.5 rounded-md font-bold`}>
                                <Sparkles size={10} /> {score}% · {getMatchLabel(score)}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Description (non-company, mobile only) */}
                    {isExpanded && !isCompany && (
                      <div className="xl:hidden mt-4 pt-4 border-t border-slate-100 animate-fade-in-up">
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
                      </div>
                    )}

                    {/* ── ATS Applicant Management Panel (company only) ── */}
                    {isExpanded && isCompany && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-fade-in-up">

                        {/* Job description */}
                        {job.description && (
                          <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-xs font-bold text-slate-500 mb-1.5">Descripción del puesto</p>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
                          </div>
                        )}

                        {/* ATS pipeline overview */}
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <BarChart2 size={12} /> Pipeline de candidatos
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {(Object.entries(pipelineCounts) as [AtsStatus, number][]).map(([s, n]) => (
                              <div key={s} className={`rounded-xl p-2.5 text-center border ${STATUS_STYLES[s].replace("opacity-60", "")}`}>
                                <p className="text-lg font-extrabold leading-none">{n}</p>
                                <p className="text-[9px] font-semibold mt-0.5 leading-tight">{STATUS_LABELS[s]}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {maxReached && (
                          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-red-600">
                            Límite de candidatos alcanzado ({job.max_candidates}). Rechaza alguno para aceptar nuevos.
                          </div>
                        )}

                        {/* Applicant list */}
                        <div>
                          <h4 className="font-bold text-sm text-slate-700 mb-3">
                            Postulantes
                            {jobApplicants.length > 0 && (
                              <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                {jobApplicants.length}
                              </span>
                            )}
                          </h4>
                          {loadingApplicants === job.id ? (
                            <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-violet-400" /></div>
                          ) : jobApplicants.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-xl">
                              <Users size={32} className="mx-auto mb-2 text-slate-200" />
                              <p className="text-sm text-slate-400">Aún no hay postulantes.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {jobApplicants.map((app, idx) => {
                                const isTopMatch = (app.matchScore ?? 0) >= 80;
                                const matchColor = getMatchColor(app.matchScore ?? 0);

                                return (
                                  <div
                                    key={app.id}
                                    className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${STATUS_ROW_BG[app.status]}`}
                                  >
                                    {/* Priority # */}
                                    <span className="text-[10px] font-extrabold text-slate-400 w-4 text-center shrink-0">
                                      #{app.priority}
                                    </span>

                                    {/* Avatar */}
                                    {app.profile?.avatar ? (
                                      <img src={app.profile.avatar} alt={app.profile.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                        {(app.profile?.name ?? "?").charAt(0)}
                                      </div>
                                    )}

                                    {/* Name + specialty + match badge */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-sm font-bold truncate">{app.profile?.name ?? "Candidato"}</p>
                                        {isTopMatch && (
                                          <span className="flex items-center gap-0.5 text-[9px] font-extrabold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0">
                                            <Sparkles size={8} /> TOP
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <p className="text-[11px] text-slate-400">{app.profile?.specialty ?? "Sin especialidad"}</p>
                                        {app.matchScore !== undefined && (
                                          <span className={`text-[10px] font-bold text-${matchColor}-600`}>
                                            {app.matchScore}% match
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Priority arrows */}
                                    <div className="flex flex-col gap-0.5 shrink-0">
                                      <button
                                        onClick={() => movePriority(job.id, app.id, "up")}
                                        disabled={idx === 0}
                                        className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20"
                                      >
                                        <ArrowUp size={11} />
                                      </button>
                                      <button
                                        onClick={() => movePriority(job.id, app.id, "down")}
                                        disabled={idx === jobApplicants.length - 1}
                                        className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20"
                                      >
                                        <ArrowDown size={11} />
                                      </button>
                                    </div>

                                    {/* ATS status dropdown */}
                                    <div className="shrink-0 relative">
                                      {updatingApp === app.id ? (
                                        <Loader2 size={14} className="animate-spin text-violet-400" />
                                      ) : (
                                        <select
                                          value={app.status}
                                          onChange={(e) => updateApplicantStatus(job.id, app.id, e.target.value as AtsStatus)}
                                          disabled={updatingApp !== null}
                                          className={`text-[11px] font-bold rounded-lg border px-2 py-1.5 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-400 transition-colors pr-5 ${STATUS_STYLES[app.status]}`}
                                          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2020/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 4px center", backgroundSize: "12px" }}
                                        >
                                          {(Object.entries(STATUS_LABELS) as [AtsStatus, string][]).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                          ))}
                                        </select>
                                      )}
                                    </div>

                                    {/* Propose interview (available once reviewing/interviewing) */}
                                    {(app.status === "reviewing" || app.status === "interviewing") && (
                                      <button
                                        title="Proponer entrevista"
                                        onClick={() => setProposeFor({
                                          applicationId: app.id,
                                          studentName:   app.profile?.name ?? "Candidato",
                                          jobTitle:      job.title,
                                        })}
                                        className="shrink-0 p-1.5 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-lg transition-colors"
                                      >
                                        <CalendarClock size={14} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Card footer ── */}
                    <div className={`flex items-center justify-between mt-4 pt-3 border-t border-slate-100 ${!isCompany ? "xl:hidden" : ""}`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          isCompany ? fetchApplicants(job.id) : setExpandedId(isExpanded ? null : job.id);
                        }}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 font-medium"
                      >
                        {loadingApplicants === job.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        }
                        {isCompany
                          ? isExpanded ? "Cerrar" : "Ver postulantes"
                          : isExpanded ? "Menos" : "Ver descripción"
                        }
                      </button>

                      <div className="flex items-center gap-2">
                        {isCompany ? (
                          <>
                            <button
                              onClick={() => {
                                const text = encodeURIComponent(`Vacante: ${job.title}${job.specialty ? " — " + job.specialty : ""}${job.location ? " · " + job.location : ""}. ¡Aplica en ClassLink!`);
                                const url  = encodeURIComponent(window.location.href);
                                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, "_blank", "noopener,noreferrer,width=600,height=500");
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#0077B5] bg-[#e8f4fb] hover:bg-[#0077B5] hover:text-white transition-all"
                            >
                              LinkedIn
                            </button>
                            <button onClick={() => openEdit(job)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors">Editar</button>
                            <button onClick={() => handleDelete(job.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors">Eliminar</button>
                          </>
                        ) : (
                          <>
                            {job.company_id && (
                              <button
                                onClick={() => toggleFollow(job.company_id)}
                                disabled={followingId === job.company_id}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all btn-press disabled:opacity-50 ${
                                  followedIds.has(job.company_id)
                                    ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500"
                                    : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200"
                                }`}
                              >
                                {followingId === job.company_id
                                  ? <Loader2 size={12} className="animate-spin" />
                                  : followedIds.has(job.company_id)
                                  ? <UserCheck size={12} />
                                  : <UserPlus size={12} />
                                }
                                {followedIds.has(job.company_id) ? "Siguiendo" : "Seguir"}
                              </button>
                            )}
                            <button
                              onClick={() => handleApply(job.id)}
                              disabled={hasApplied || applying === job.id || !job.active}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all btn-press disabled:opacity-50 ${
                                hasApplied ? "bg-emerald-500" : "bg-cyan-600 hover:bg-cyan-700"
                              }`}
                            >
                              {applying === job.id ? <Loader2 size={12} className="animate-spin" /> :
                               hasApplied ? <><CheckCircle size={12} />Postulado</> :
                               <><Send size={12} />Postularse</>}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ── Desktop detail panel (student/egresado only) ── */}
          {!isCompany && selectedJob && (
            <div className="hidden xl:block">
              <div className="sticky top-20 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-slate-100">
                  <div className="flex gap-4 items-start">
                    {selectedJob.company?.avatar ? (
                      <img src={selectedJob.company.avatar} alt={selectedJob.company.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                        <Briefcase size={22} className="text-violet-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-cyan-600 mb-1">{selectedJob.company?.name ?? "Empresa"}</p>
                      <h2 className="text-xl font-extrabold tracking-tight leading-snug">{selectedJob.title}</h2>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedJob.location && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin size={11} />{selectedJob.location}
                          </span>
                        )}
                        <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-lg font-semibold capitalize">{selectedJob.type}</span>
                        {selectedJob.specialty && (
                          <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-lg font-semibold">{selectedJob.specialty}</span>
                        )}
                        {(mySkills.length > 0 || mySpecialty) && (() => {
                          const score = computeMatchScore(mySkills, mySpecialty, {
                            id: selectedJob.id, title: selectedJob.title,
                            description: selectedJob.description, specialty: selectedJob.specialty ?? "",
                            requirements: "",
                          });
                          const color = getMatchColor(score);
                          return (
                            <span className={`flex items-center gap-1 text-${color}-600 bg-${color}-50 border border-${color}-100 px-2 py-0.5 rounded-lg text-xs font-bold`}>
                              <Sparkles size={10} /> {score}% match
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 flex gap-3 border-b border-slate-100">
                  <button
                    onClick={() => handleApply(selectedJob.id)}
                    disabled={appliedIds.has(selectedJob.id) || applying === selectedJob.id || !selectedJob.active}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all btn-press disabled:opacity-50 ${
                      appliedIds.has(selectedJob.id) ? "bg-emerald-500" : "bg-cyan-600 hover:bg-cyan-700"
                    }`}
                  >
                    {applying === selectedJob.id ? <Loader2 size={14} className="animate-spin" /> :
                     appliedIds.has(selectedJob.id) ? <><CheckCircle size={14} /> Postulado</> :
                     <><Send size={14} /> Postularse</>}
                  </button>
                  {selectedJob.company_id && (
                    <button
                      onClick={() => toggleFollow(selectedJob.company_id)}
                      disabled={followingId === selectedJob.company_id}
                      className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition-all btn-press ${
                        followedIds.has(selectedJob.company_id)
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600"
                      }`}
                    >
                      {followedIds.has(selectedJob.company_id) ? <UserCheck size={16} /> : <UserPlus size={16} />}
                    </button>
                  )}
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto thin-scrollbar">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sobre la oportunidad</p>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedJob.description || "Sin descripción disponible."}
                  </p>
                  {selectedJob.created_at && (
                    <p className="text-xs text-slate-400 mt-4">
                      Publicado el {new Date(selectedJob.created_at).toLocaleDateString("es-CR")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>{/* end split-view wrapper */}
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={editJob ? "Editar Vacante" : "Nueva Vacante"}>
        <div className="space-y-4">
          {saveError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</div>}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Título del puesto</label>
            <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none" placeholder="Ej: Técnico en Mecatrónica" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Descripción</label>
            <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={4} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none resize-none" placeholder="Describe el puesto, requisitos y beneficios..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tipo</label>
              <select value={fType} onChange={(e) => setFType(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 outline-none bg-white">
                <option value="full-time">Tiempo completo</option>
                <option value="part-time">Medio tiempo</option>
                <option value="pasantia">Pasantía</option>
                <option value="contrato">Contrato</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Especialidad</label>
              <select value={fSpecialty} onChange={(e) => setFSpecialty(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 outline-none bg-white">
                <option value="">Todas</option>
                {TP_SPECIALTIES.map((sp) => <option key={sp} value={sp}>{sp}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Ubicación</label>
            <input value={fLocation} onChange={(e) => setFLocation(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none" placeholder="Ej: San José, Costa Rica" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Límite máximo de candidatos aceptados</label>
            <input
              type="number" min={1} max={999}
              value={fMaxCandidates}
              onChange={(e) => setFMaxCandidates(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none"
              placeholder="Ej: 5"
            />
            <p className="text-[11px] text-slate-400 mt-1">El sistema bloqueará aceptar más candidatos cuando se alcance este límite.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !fTitle.trim() || !fDesc.trim()}
            className="w-full bg-violet-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-violet-700 disabled:opacity-40 transition-colors btn-press flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" />Guardando…</> : editJob ? "Guardar cambios" : "Publicar vacante"}
          </button>
        </div>
      </Modal>

      {/* ── Propose Interview Modal (company) ── */}
      {proposeFor && (
        <ProposeInterviewModal
          open
          onClose={() => setProposeFor(null)}
          applicationId={proposeFor.applicationId}
          studentName={proposeFor.studentName}
          jobTitle={proposeFor.jobTitle}
        />
      )}
    </PageLayout>
  );
}
