"use client";
// ──────────────────────────────────────────────────────────
// ReputationCard – Student reputation score widget
// Shows companies a trust-scored overview of the student's
// validated credentials and verified institutional backing.
// ──────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShieldCheck, Award, Briefcase, TrendingUp, Share2, Loader2,
} from "lucide-react";

interface ReputationEvent {
  type: string;
  points: number;
  note: string;
  created_at: string;
}

interface SkillValidation {
  created_at: string;
  skills: { name: string } | null;
  validator: { name: string; school_name: string } | null;
}

interface ReputationCardProps {
  studentId: string;
  studentName: string;
  reputationScore: number;
}

const TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  skill_validated:   { label: "Habilidad validada",       color: "text-amber-600 bg-amber-50",    icon: <ShieldCheck size={13} /> },
  badge_earned:      { label: "Insignia obtenida",        color: "text-cyan-600 bg-cyan-50",       icon: <Award size={13} />       },
  applied_accepted:  { label: "Postulación aceptada",     color: "text-emerald-600 bg-emerald-50", icon: <Briefcase size={13} />   },
  internship_review: { label: "Revisión de práctica",     color: "text-violet-600 bg-violet-50",   icon: <TrendingUp size={13} />  },
  portfolio_item:    { label: "Proyecto de portafolio",   color: "text-slate-600 bg-slate-100",    icon: <Award size={13} />       },
};

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 500) return { label: "Élite",       color: "text-amber-600" };
  if (score >= 300) return { label: "Destacado",   color: "text-cyan-600"  };
  if (score >= 150) return { label: "En ascenso",  color: "text-emerald-600" };
  if (score >= 50)  return { label: "Iniciando",   color: "text-slate-500" };
  return               { label: "Nuevo",           color: "text-slate-400" };
}

function shareLinkedIn(name: string, score: number) {
  const text = encodeURIComponent(
    `${name} tiene un Reputation Score de ${score} pts en ClassLink, la plataforma de empleabilidad técnica. ` +
    "Perfil institucional verificado y respaldado por colegio técnico."
  );
  const url  = encodeURIComponent(window.location.origin + "/talent");
  window.open(
    `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`,
    "_blank",
    "noopener,noreferrer,width=600,height=500"
  );
}

export default function ReputationCard({
  studentId, studentName, reputationScore,
}: ReputationCardProps) {
  const [events,      setEvents]     = useState<ReputationEvent[]>([]);
  const [validations, setValidations]= useState<SkillValidation[]>([]);
  const [loading,     setLoading]    = useState(true);

  const load = useCallback(async () => {
    const [evRes, svRes] = await Promise.all([
      supabase
        .from("reputation_events")
        .select("type, points, note, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("skill_validations")
        .select("created_at, skills!skill_validations_skill_id_fkey(name), validator:profiles!skill_validations_validator_id_fkey(name, school_name)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setEvents((evRes.data ?? []) as ReputationEvent[]);
    setValidations((svRes.data ?? []) as unknown as SkillValidation[]);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  // Score breakdown by category
  const byType = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + e.points;
    return acc;
  }, {});

  // Gauge: cap visual at 1000 pts for display
  const MAX_DISPLAY = 1000;
  const r = 46, circ = 2 * Math.PI * r;
  const pct    = Math.min(100, (reputationScore / MAX_DISPLAY) * 100);
  const offset = circ - (pct / 100) * circ;
  const { label: tierLabel, color: tierColor } = scoreLabel(reputationScore);
  const gaugeColor =
    reputationScore >= 500 ? "#f59e0b"
    : reputationScore >= 300 ? "#06b6d4"
    : reputationScore >= 150 ? "#10b981"
    : "#94a3b8";

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Puntuación de Reputación</p>
          <p className="text-white font-bold text-sm mt-0.5">Perfil Verificado ClassLink</p>
        </div>
        <button
          onClick={() => shareLinkedIn(studentName, reputationScore)}
          title="Compartir en LinkedIn"
          className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-[#0077B5]/80 hover:bg-[#0077B5] px-3 py-1.5 rounded-lg transition-colors"
        >
          <Share2 size={11} /> LinkedIn
        </button>
      </div>

      <div className="p-5 space-y-5">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
        ) : (
          <>
            {/* Gauge */}
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <svg width="110" height="110" viewBox="0 0 110 110">
                  <circle cx="55" cy="55" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                  <circle
                    cx="55" cy="55" r={r} fill="none"
                    stroke={gaugeColor} strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    transform="rotate(-90 55 55)"
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                  />
                  <text x="55" y="50" textAnchor="middle" fontSize="20" fontWeight="800" fill="#1e293b">
                    {reputationScore}
                  </text>
                  <text x="55" y="64" textAnchor="middle" fontSize="9" fill="#94a3b8">
                    pts
                  </text>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-lg font-extrabold ${tierColor}`}>{tierLabel}</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Puntuación calculada en base a validaciones institucionales, insignias y historial de actividad.
                </p>
                {/* Category breakdown pills */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {Object.entries(byType).map(([type, pts]) => {
                    const meta = TYPE_META[type] ?? { label: type, color: "text-slate-500 bg-slate-100", icon: null };
                    return (
                      <span key={type} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                        {meta.icon} +{pts}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Verified skills from school */}
            {validations.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <ShieldCheck size={13} className="text-amber-500" />
                  <p className="text-xs font-bold text-amber-700">Habilidades Validadas por Institución</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {validations.map((v, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                      <ShieldCheck size={11} className="text-amber-500 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-amber-800 leading-none">
                          {(v.skills as any)?.name ?? "Habilidad técnica"}
                        </p>
                        <p className="text-[9px] text-amber-600 mt-0.5">
                          {v.validator
                            ? ((v.validator as any).school_name || (v.validator as any).name)
                            : "Institución"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent reputation events */}
            {events.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">Actividad reciente</p>
                <div className="space-y-1.5">
                  {events.slice(0, 5).map((e, i) => {
                    const meta = TYPE_META[e.type] ?? { label: e.type, color: "text-slate-500 bg-slate-100", icon: null };
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full shrink-0 ${meta.color}`}>
                          {meta.icon} +{e.points}
                        </span>
                        <span className="text-slate-600 truncate">{e.note || meta.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {events.length === 0 && validations.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">
                Aún no hay eventos de reputación. Pide a tu colegio que valide tus habilidades.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
