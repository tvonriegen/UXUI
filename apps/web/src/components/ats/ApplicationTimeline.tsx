"use client";
// ──────────────────────────────────────────────────────────
// ApplicationTimeline – Visual stepper for a job application
// ──────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Send, Eye, ClipboardList, Mic, Trophy, XCircle, CheckCircle2, Clock, Loader2,
} from "lucide-react";

export type AtsEventType =
  | "applied" | "viewed" | "reviewing" | "interviewing"
  | "accepted" | "rejected" | "hired" | "note";

interface TimelineProps {
  applicationId: string;
  compact?:      boolean;
}

interface EventRow {
  id:         string;
  event_type: AtsEventType;
  created_at: string;
  note:       string;
}

// Static classes so Tailwind JIT always includes them
const STEP_DONE_STYLE: Record<string, string> = {
  cyan:    "text-cyan-600 bg-cyan-50 border-cyan-200",
  sky:     "text-sky-600 bg-sky-50 border-sky-200",
  violet:  "text-violet-600 bg-violet-50 border-violet-200",
  emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
  amber:   "text-amber-600 bg-amber-50 border-amber-200",
};
const STEP_DONE_LABEL: Record<string, string> = {
  cyan:    "text-cyan-700",
  sky:     "text-sky-700",
  violet:  "text-violet-700",
  emerald: "text-emerald-700",
  amber:   "text-amber-700",
};
const STEP_LINE_ACTIVE: Record<string, string> = {
  cyan:    "bg-cyan-300",
  sky:     "bg-sky-300",
  violet:  "bg-violet-300",
  emerald: "bg-emerald-300",
  amber:   "bg-amber-300",
};

const STEPS: { type: AtsEventType; label: string; icon: typeof Send; tint: string }[] = [
  { type: "applied",      label: "Postulado",    icon: Send,          tint: "cyan"    },
  { type: "viewed",       label: "Visto",        icon: Eye,           tint: "sky"     },
  { type: "reviewing",    label: "En revisión",  icon: ClipboardList, tint: "sky"     },
  { type: "interviewing", label: "Entrevistando",icon: Mic,           tint: "violet"  },
  { type: "accepted",     label: "Aceptado",     icon: CheckCircle2,  tint: "emerald" },
  { type: "hired",        label: "Contratado",   icon: Trophy,        tint: "amber"   },
];

export default function ApplicationTimeline({ applicationId, compact = false }: TimelineProps) {
  const [events,  setEvents]  = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("application_events")
        .select("id, event_type, created_at, note")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setEvents((data ?? []) as EventRow[]);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`app_events:${applicationId}`)
      .on("postgres_changes", {
        event:  "INSERT",
        schema: "public",
        table:  "application_events",
        filter: `application_id=eq.${applicationId}`,
      }, (payload) => {
        const row = payload.new as EventRow;
        setEvents((prev) => prev.some((e) => e.id === row.id) ? prev : [...prev, row]);
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [applicationId]);

  const rejected = events.some((e) => e.event_type === "rejected");
  const eventMap = new Map(events.map((e) => [e.event_type, e]));

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Cargando estado…
      </div>
    );
  }

  return (
    <div className={compact ? "" : "bg-white rounded-2xl p-4 border border-slate-200/60"}>
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            Estado de postulación
          </p>
          {events.length > 0 && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock size={10} />
              {new Date(events[events.length - 1].created_at).toLocaleDateString("es-CR")}
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto thin-scrollbar">
        <div className="flex items-start gap-0 min-w-max pb-1">
          {STEPS.map((step, idx) => {
            const ev   = eventMap.get(step.type);
            const done = Boolean(ev);
            const Icon = step.icon;
            const iconStyle  = done
              ? (STEP_DONE_STYLE[step.tint]  ?? "text-slate-600 bg-slate-50 border-slate-200")
              : "text-slate-300 bg-slate-50 border-slate-200";
            const labelStyle = done
              ? (STEP_DONE_LABEL[step.tint]  ?? "text-slate-600")
              : "text-slate-400";
            const nextDone   = idx < STEPS.length - 1 && Boolean(eventMap.get(STEPS[idx + 1].type));
            const lineStyle  = done && nextDone
              ? (STEP_LINE_ACTIVE[step.tint] ?? "bg-slate-300")
              : done ? "bg-slate-200" : "bg-slate-100";

            return (
              <div key={step.type} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5 w-20">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${iconStyle}`}>
                    <Icon size={16} strokeWidth={2.25} />
                  </div>
                  <p className={`text-[10px] font-bold text-center ${labelStyle}`}>
                    {step.label}
                  </p>
                  {done && ev && (
                    <p className="text-[9px] text-slate-400">
                      {new Date(ev.created_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
                    </p>
                  )}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 w-6 rounded-full transition-all mt-[-22px] ${lineStyle}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {rejected && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs flex items-center gap-2">
          <XCircle size={14} className="shrink-0" />
          Postulación cerrada. ¡Sigue postulando a otras vacantes!
        </div>
      )}
    </div>
  );
}
