import { Loader2, MessageSquare } from "lucide-react";
import type { ContactRequestDecision, ContactRequestItem } from "@/components/contact-routing/types";

interface ContactRequestQueueProps {
  requests: ContactRequestItem[];
  reviewingId: string | null;
  error: string | null;
  onReview: (id: string, decision: ContactRequestDecision) => void;
}

export default function ContactRequestQueue({ requests, reviewingId, error, onReview }: ContactRequestQueueProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-amber-200/70 animate-fade-in-up stagger-3">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-base">Solicitudes de Contacto</h3>
        <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2.5 py-1 rounded-full">
          {requests.length} pendientes
        </span>
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare size={34} className="mx-auto mb-3 text-slate-200" />
          <p className="text-slate-400 text-sm">No hay solicitudes de contacto pendientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-amber-100 p-4 bg-amber-50/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <MessageSquare size={17} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{request.company}</p>
                  <p className="text-xs text-slate-500">Solicita contactar a {request.student} — {request.date}</p>
                  <p className="text-xs text-slate-600 mt-2">{request.message}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => onReview(request.id, "rejected")}
                  disabled={reviewingId === request.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => onReview(request.id, "approved")}
                  disabled={reviewingId === request.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                >
                  {reviewingId === request.id ? <Loader2 size={12} className="animate-spin" /> : "Aprobar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
