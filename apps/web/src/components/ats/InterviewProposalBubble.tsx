"use client";
// ──────────────────────────────────────────────────────────
// InterviewProposalBubble – Structured chat message for
// interview proposals. Appears inline in the messages pane
// when message.kind === "interview_proposal".
// ──────────────────────────────────────────────────────────

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { respondInterview } from "@/app/actions/interviews";
import {
  CalendarClock, Video, MapPin, Phone, Check, X, Loader2, Clock,
} from "lucide-react";

interface ProposalMetadata {
  interview_id:   string;
  application_id: string;
  proposed_at:    string;   // ISO
  duration_mins:  number;
  modality:       "video" | "presencial" | "telefono";
  location?:      string;
  meeting_link?:  string;
}

interface InterviewProposalBubbleProps {
  metadata:    ProposalMetadata;
  isFromMe:    boolean;          // true = company sent, false = student receiving
  initialStatus?: "proposed" | "accepted" | "declined";
}

const MODALITY_ICON = {
  video:      Video,
  presencial: MapPin,
  telefono:   Phone,
};

const MODALITY_LABEL = {
  video:      "Videollamada",
  presencial: "Presencial",
  telefono:   "Teléfono",
};

export default function InterviewProposalBubble({
  metadata, isFromMe, initialStatus = "proposed",
}: InterviewProposalBubbleProps) {
  const { toast }   = useToast();
  const [status,    setStatus]    = useState(initialStatus);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const proposedDate = new Date(metadata.proposed_at);
  const ModalityIcon = MODALITY_ICON[metadata.modality] ?? Video;

  const respond = async (r: "accepted" | "declined") => {
    if (r === "accepted") setAccepting(true); else setDeclining(true);

    const res = await respondInterview(metadata.interview_id, r);

    setAccepting(false);
    setDeclining(false);

    if ("error" in res && res.error) {
      toast({ type: "error", title: "Error", description: res.error });
      return;
    }
    setStatus(r);
    toast({
      type:  "success",
      title: r === "accepted" ? "Entrevista aceptada ✓" : "Entrevista rechazada",
    });
  };

  const statusBanner = status === "accepted"
    ? <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Aceptada</div>
    : status === "declined"
    ? <div className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Rechazada</div>
    : null;

  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-3 max-w-xs w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <CalendarClock size={14} className="text-violet-600" />
          <span className="text-xs font-extrabold text-violet-700">Propuesta de entrevista</span>
        </div>
        {statusBanner}
      </div>

      {/* Date/time */}
      <div className="bg-white rounded-xl border border-violet-100 px-3 py-2 mb-2">
        <p className="text-sm font-extrabold text-slate-900">
          {proposedDate.toLocaleDateString("es-CR", { weekday: "short", day: "2-digit", month: "long" })}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock size={10} />
            {proposedDate.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
            {metadata.duration_mins && ` · ${metadata.duration_mins} min`}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <ModalityIcon size={10} />
            {MODALITY_LABEL[metadata.modality]}
          </span>
        </div>
        {metadata.meeting_link && (
          <a
            href={metadata.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-violet-600 font-semibold underline mt-1 block truncate"
          >
            {metadata.meeting_link}
          </a>
        )}
        {metadata.location && (
          <p className="text-[11px] text-slate-400 mt-1 truncate">{metadata.location}</p>
        )}
      </div>

      {/* Actions — shown only to the student (receiver) when pending */}
      {!isFromMe && status === "proposed" && (
        <div className="flex gap-2">
          <button
            onClick={() => respond("declined")}
            disabled={accepting || declining}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 btn-press"
          >
            {declining ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
            Rechazar
          </button>
          <button
            onClick={() => respond("accepted")}
            disabled={accepting || declining}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 btn-press"
          >
            {accepting ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Aceptar
          </button>
        </div>
      )}

      {isFromMe && status === "proposed" && (
        <p className="text-[10px] text-slate-400 text-center">Esperando respuesta del candidato…</p>
      )}
    </div>
  );
}
