"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Clock, Loader2, MessageSquare, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { approveContactRequest, rejectContactRequest } from "@/app/actions/contact-requests";
import { useToast } from "@/components/ui/Toast";

type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
type ContactRequest = {
  id: string;
  message: string;
  rejection_reason: string | null;
  status: RequestStatus;
  created_at: string;
  company: { name: string; company_name: string | null; avatar: string | null } | null;
  student: { name: string; avatar: string | null } | null;
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

export default function SchoolContactRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [filter, setFilter] = useState<"pending" | "history">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const loadRequests = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from("contact_requests")
      .select("id, message, rejection_reason, status, created_at, company:profiles!contact_requests_company_id_fkey(name, company_name, avatar), student:profiles!contact_requests_student_id_fkey(name, avatar)")
      .eq("school_id", user.id)
      .order("created_at", { ascending: false });
    if (loadError) setError("No se pudieron cargar las solicitudes de contacto.");
    else setRequests((data ?? []) as unknown as ContactRequest[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`school-contact-requests:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_requests", filter: `school_id=eq.${user.id}` }, loadRequests)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadRequests, user?.id]);

  const visible = useMemo(() => requests.filter((request) =>
    filter === "pending" ? request.status === "pending" : request.status !== "pending"
  ), [filter, requests]);
  const pendingCount = requests.filter((request) => request.status === "pending").length;

  const review = async (request: ContactRequest, decision: "approved" | "rejected") => {
    setReviewingId(request.id);
    const result = decision === "approved"
      ? await approveContactRequest(request.id)
      : await rejectContactRequest(request.id, reason);
    setReviewingId(null);
    if (result.error) {
      toast({ type: "error", title: "No se pudo resolver la solicitud", description: result.error });
      return;
    }
    setRequests((prev) => prev.map((item) => item.id === request.id
      ? { ...item, status: decision, rejection_reason: decision === "rejected" ? reason : item.rejection_reason }
      : item));
    setRejectingId(null);
    setReason("");
    toast({ type: "success", title: decision === "approved" ? "Contacto aprobado" : "Solicitud rechazada" });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Mediación escolar</p>
        <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-slate-900">Solicitudes de contacto</h1>
        <p className="mt-1 text-sm text-slate-600">Autoriza o rechaza el contacto de empresas con estudiantes que requieren mediación.</p>
      </header>

      <div role="group" aria-label="Filtrar solicitudes" className="flex gap-2">
        <button type="button" onClick={() => setFilter("pending")} aria-pressed={filter === "pending"}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === "pending" ? "border-amber-600 bg-amber-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
          Pendientes{pendingCount ? ` (${pendingCount})` : ""}
        </button>
        <button type="button" onClick={() => setFilter("history")} aria-pressed={filter === "history"}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === "history" ? "border-amber-600 bg-amber-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
          Historial
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span><button type="button" onClick={loadRequests} className="font-bold underline">Reintentar</button>
        </div>
      )}
      {loading && <div role="status" className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-600" aria-label="Cargando solicitudes" /></div>}
      {!loading && !error && visible.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <MessageSquare size={38} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-700">No hay solicitudes en esta sección.</p>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((request) => (
          <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-amber-100 flex items-center justify-center" aria-hidden="true"><Building2 className="text-amber-700" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-slate-900">{request.company?.company_name || request.company?.name || "Empresa"}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${request.status === "approved" ? "bg-emerald-50 text-emerald-700" : request.status === "rejected" ? "bg-red-50 text-red-700" : request.status === "cancelled" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800"}`}>
                    {STATUS_LABEL[request.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">Solicita contactar a <strong>{request.student?.name ?? "estudiante"}</strong>.</p>
                {request.message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{request.message}</p>}
                {request.rejection_reason && <p className="mt-2 text-xs text-red-700">Motivo: {request.rejection_reason}</p>}
                <p className="mt-3 flex items-center gap-1 text-xs text-slate-400"><Clock size={12} />{new Date(request.created_at).toLocaleString("es-CL")}</p>
              </div>
            </div>

            {request.status === "pending" && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                {rejectingId === request.id && (
                  <div className="mb-3">
                    <label htmlFor={`reason-${request.id}`} className="mb-1 block text-xs font-semibold text-slate-700">Motivo del rechazo (opcional)</label>
                    <textarea id={`reason-${request.id}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={2}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                  </div>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  {rejectingId === request.id ? (
                    <>
                      <button type="button" onClick={() => { setRejectingId(null); setReason(""); }} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">Volver</button>
                      <button type="button" onClick={() => review(request, "rejected")} disabled={reviewingId === request.id} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                        {reviewingId === request.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Confirmar rechazo
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => setRejectingId(request.id)} disabled={reviewingId !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"><XCircle size={14} /> Rechazar</button>
                      <button type="button" onClick={() => review(request, "approved")} disabled={reviewingId !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                        {reviewingId === request.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Aprobar contacto
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
