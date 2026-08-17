"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Clock, ExternalLink, Loader2, MapPin, MessageCircle, Phone, Video, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { cancelInterview, type InterviewModality, type InterviewStatus } from "@/app/actions/interviews";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

type InterviewRow = {
  id: string;
  application_id: string;
  student_id: string;
  proposed_at: string;
  duration_mins: number;
  modality: InterviewModality;
  location: string;
  meeting_link: string;
  status: InterviewStatus;
  notes: string;
  student: { name: string; avatar: string | null } | null;
  jobTitle?: string;
};

const STATUS_LABEL: Record<InterviewStatus, string> = {
  proposed: "Esperando respuesta",
  accepted: "Confirmada",
  declined: "Rechazada",
  completed: "Completada",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
};

const STATUS_STYLE: Record<InterviewStatus, string> = {
  proposed: "bg-amber-50 text-amber-800 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
  declined: "bg-red-50 text-red-700 border-red-200",
  completed: "bg-sky-50 text-sky-800 border-sky-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  rescheduled: "bg-violet-50 text-violet-800 border-violet-200",
};

const MODALITY = {
  video: { label: "Videollamada", icon: Video },
  presencial: { label: "Presencial", icon: MapPin },
  telefono: { label: "Teléfono", icon: Phone },
} satisfies Record<InterviewModality, { label: string; icon: typeof Video }>;

function safeMeetingLink(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function CompanyInterviewsPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"upcoming" | "history" | "all">("upcoming");
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadInterviews = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const { data, error: interviewError } = await supabase
      .from("interviews")
      .select("id, application_id, student_id, proposed_at, duration_mins, modality, location, meeting_link, status, notes, student:profiles!interviews_student_id_fkey(name, avatar)")
      .eq("company_id", user.id)
      .order("proposed_at", { ascending: true });
    if (interviewError) {
      setError("No se pudo cargar la agenda de entrevistas.");
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as InterviewRow[];
    const applicationIds = rows.map((row) => row.application_id);
    const { data: applications } = applicationIds.length
      ? await supabase
          .from("job_applications")
          .select("id, job_postings(title), opportunities(title)")
          .in("id", applicationIds)
      : { data: [] };
    const titles = new Map((applications ?? []).map((application: any) => [
      application.id,
      application.opportunities?.title ?? application.job_postings?.title ?? "Vacante",
    ]));
    setInterviews(rows.map((row) => ({ ...row, jobTitle: titles.get(row.application_id) })));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadInterviews(); }, [loadInterviews]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`company-interviews:${user.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "interviews", filter: `company_id=eq.${user.id}`,
      }, () => { loadInterviews(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadInterviews, user?.id]);

  const visible = useMemo(() => {
    const now = Date.now();
    return interviews.filter((interview) => {
      const future = new Date(interview.proposed_at).getTime() >= now;
      const active = !["declined", "cancelled", "completed"].includes(interview.status);
      if (filter === "upcoming") return future && active;
      if (filter === "history") return !future || !active;
      return true;
    });
  }, [filter, interviews]);

  const handleCancel = async (interview: InterviewRow) => {
    const accepted = await confirm({
      title: "¿Cancelar entrevista?",
      body: `Se notificará a ${interview.student?.name ?? "la persona candidata"}.`,
      confirmLabel: "Cancelar entrevista",
      danger: true,
    });
    if (!accepted) return;
    setCancelling(interview.id);
    const result = await cancelInterview(interview.id);
    setCancelling(null);
    if (result.error) {
      toast({ type: "error", title: "No se pudo cancelar", description: result.error });
      return;
    }
    setInterviews((prev) => prev.map((row) => row.id === interview.id ? { ...row, status: "cancelled" } : row));
    toast({ type: "success", title: "Entrevista cancelada" });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Proceso de selección</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-slate-900">Entrevistas</h1>
          <p className="mt-1 text-sm text-slate-600">Gestiona las propuestas y reuniones con tus candidatos.</p>
        </div>
        <Link href="/company/jobs" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
          Ver vacantes y candidatos
        </Link>
      </header>

      <div role="group" aria-label="Filtrar entrevistas" className="flex flex-wrap gap-2">
        {(["upcoming", "history", "all"] as const).map((value) => (
          <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === value ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            {value === "upcoming" ? "Próximas" : value === "history" ? "Historial" : "Todas"}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={loadInterviews} className="font-bold underline underline-offset-2 hover:no-underline">Reintentar</button>
        </div>
      )}
      {loading && <div role="status" className="flex justify-center py-16"><Loader2 className="animate-spin text-violet-600" aria-label="Cargando entrevistas" /></div>}

      {!loading && !error && visible.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <CalendarClock size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-700">No hay entrevistas en esta sección.</p>
          <p className="mt-1 text-sm text-slate-500">Puedes proponer una desde los candidatos de cada vacante.</p>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((interview) => {
          const date = new Date(interview.proposed_at);
          const mode = MODALITY[interview.modality];
          const ModeIcon = mode.icon;
          const cancellable = ["proposed", "accepted", "rescheduled"].includes(interview.status);
          const meetingLink = safeMeetingLink(interview.meeting_link);
          return (
            <article key={interview.id} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex items-center gap-3 sm:w-56">
                  {interview.student?.avatar ? (
                    <img src={interview.student.avatar} alt="" className="h-11 w-11 rounded-xl object-cover" />
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-violet-100 flex items-center justify-center font-bold text-violet-700" aria-hidden="true">
                      {(interview.student?.name ?? "C").charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate font-bold text-slate-900">{interview.student?.name ?? "Candidato"}</h2>
                    <p className="truncate text-xs text-slate-500">{interview.jobTitle ?? "Vacante"}</p>
                  </div>
                </div>

                <div className="flex-1 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <p className="flex items-center gap-2"><CalendarClock size={16} className="text-violet-600" />{date.toLocaleDateString("es-CL", { dateStyle: "medium" })}</p>
                  <p className="flex items-center gap-2"><Clock size={16} className="text-violet-600" />{date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })} · {interview.duration_mins} min</p>
                  <p className="flex items-center gap-2"><ModeIcon size={16} className="text-violet-600" />{mode.label}</p>
                  {interview.location && <p className="flex items-center gap-2"><MapPin size={16} className="text-violet-600" />{interview.location}</p>}
                </div>

                <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[interview.status]}`}>{STATUS_LABEL[interview.status]}</span>
              </div>

              {interview.notes && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{interview.notes}</p>}

              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                <Link href="/company/messages" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                  <MessageCircle size={14} /> Abrir chat
                </Link>
                {meetingLink && (
                  <a href={meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100">
                    <ExternalLink size={14} /> Abrir reunión
                  </a>
                )}
                {cancellable && (
                  <button type="button" onClick={() => handleCancel(interview)} disabled={cancelling === interview.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50">
                    {cancelling === interview.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Cancelar
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
