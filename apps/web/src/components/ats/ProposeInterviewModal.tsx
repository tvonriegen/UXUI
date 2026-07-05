"use client";
// ──────────────────────────────────────────────────────────
// ProposeInterviewModal – Company proposes an interview date
// ──────────────────────────────────────────────────────────

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { proposeInterview, type InterviewModality } from "@/app/actions/interviews";
import { CalendarClock, Loader2, Video, MapPin, Phone } from "lucide-react";

interface ProposeInterviewModalProps {
  open:          boolean;
  onClose:       () => void;
  applicationId: string;
  studentName:   string;
  jobTitle:      string;
  onSuccess?:    (interviewId: string) => void;
}

const MODALITIES: { value: InterviewModality; label: string; icon: typeof Video }[] = [
  { value: "video",       label: "Videollamada", icon: Video  },
  { value: "presencial",  label: "Presencial",   icon: MapPin },
  { value: "telefono",    label: "Teléfono",     icon: Phone  },
];

export default function ProposeInterviewModal({
  open, onClose, applicationId, studentName, jobTitle, onSuccess,
}: ProposeInterviewModalProps) {
  const { toast } = useToast();
  const [date,      setDate]      = useState("");
  const [time,      setTime]      = useState("");
  const [duration,  setDuration]  = useState(30);
  const [modality,  setModality]  = useState<InterviewModality>("video");
  const [location,  setLocation]  = useState("");
  const [link,      setLink]      = useState("");
  const [notes,     setNotes]     = useState("");
  const [saving,    setSaving]    = useState(false);

  const handleSubmit = async () => {
    if (!date || !time) {
      toast({ type: "warning", title: "Completa la fecha y hora" });
      return;
    }
    const proposedAt = new Date(`${date}T${time}:00`).toISOString();
    setSaving(true);

    const res = await proposeInterview({
      applicationId,
      proposedAt,
      durationMins: duration,
      modality,
      location:     location || undefined,
      meetingLink:  link     || undefined,
      notes:        notes    || undefined,
    });

    setSaving(false);

    if ("error" in res && res.error) {
      toast({ type: "error", title: "Error al proponer entrevista", description: res.error });
      return;
    }

    toast({
      type:        "success",
      title:       "Entrevista propuesta",
      description: `${studentName} recibirá una notificación y verá la propuesta en el chat.`,
    });

    onSuccess?.(res.interviewId as string);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Proponer entrevista">
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-xl p-3 text-sm">
          <p className="font-semibold text-slate-700">{studentName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{jobTitle}</p>
        </div>

        {/* Modality selector */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Modalidad</label>
          <div className="grid grid-cols-3 gap-2">
            {MODALITIES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  onClick={() => setModality(m.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all btn-press ${
                    modality === m.value
                      ? "border-violet-400 bg-violet-50 text-violet-700"
                      : "border-slate-200 text-slate-500 hover:border-violet-200"
                  }`}
                >
                  <Icon size={18} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date / time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Fecha</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Hora</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none"
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
            Duración: {duration} minutos
          </label>
          <input
            type="range" min={15} max={120} step={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-violet-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>15 min</span><span>30</span><span>45</span><span>60</span><span>75</span><span>90</span><span>120 min</span>
          </div>
        </div>

        {/* Conditional location / link */}
        {(modality === "video") && (
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Enlace de reunión (opcional)</label>
            <input
              type="url" value={link} onChange={(e) => setLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
            />
          </div>
        )}
        {(modality === "presencial") && (
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Dirección</label>
            <input
              type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="Edificio, calle, ciudad…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Notas para el candidato (opcional)</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Tema de la entrevista, preparación sugerida…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-200 outline-none resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || !date || !time}
          className="w-full bg-violet-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-violet-700 disabled:opacity-40 transition-colors btn-press flex items-center justify-center gap-2"
        >
          {saving
            ? <><Loader2 size={16} className="animate-spin" />Enviando…</>
            : <><CalendarClock size={16} />Proponer entrevista</>
          }
        </button>
      </div>
    </Modal>
  );
}
