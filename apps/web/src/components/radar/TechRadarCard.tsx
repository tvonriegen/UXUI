"use client";
// ──────────────────────────────────────────────────────────
// TechRadarCard – Student-facing Tech Radar
// ──────────────────────────────────────────────────────────
// Shows the student's personalised weekly radar snapshot:
//   - radar score 0–100
//   - top emerging skills (new / rising in their specialty)
//   - gap skills they don't have yet (highest weekly demand)
//   - matched skills they already have
//
// Uses:
//   supabase.rpc('compute_user_radar', { p_user_id, p_week_start })
//   supabase.rpc('refresh_tech_radar',   { p_week_start })

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { Sparkles, Target, TrendingUp, RefreshCw, CheckCircle2, Flame, Loader2 } from "lucide-react";

interface UserRadarSnapshot {
  specialty:       string;
  matched_skills:  string[];
  gap_skills:      string[];
  emerging_skills: string[];
  radar_score:     number;
  computed_at:     string;
}

interface TechRadarCardProps {
  userId:    string;
  specialty: string;
}

function isoWeekStart(d = new Date()): string {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // Mon = 0
  copy.setDate(copy.getDate() - day);
  return copy.toISOString().slice(0, 10);
}

export default function TechRadarCard({ userId }: TechRadarCardProps) {
  const { toast } = useToast();
  const [snapshot,   setSnapshot]   = useState<UserRadarSnapshot | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const week = useMemo(() => isoWeekStart(), []);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    // First: check for an existing snapshot this week
    const { data: existing } = await supabase
      .from("user_radar_snapshots")
      .select("specialty, matched_skills, gap_skills, emerging_skills, radar_score, computed_at")
      .eq("user_id", userId)
      .eq("week_start", week)
      .maybeSingle();

    if (existing) {
      setSnapshot(existing as UserRadarSnapshot);
      setLoading(false);
      return;
    }

    // None yet → compute one now
    const { data, error } = await supabase.rpc("compute_user_radar", {
      p_user_id:     userId,
      p_week_start:  week,
    });
    if (error) {
      // Radar data might be empty (never refreshed); treat as OK, just empty.
      setSnapshot(null);
    } else if (data) {
      setSnapshot(data as UserRadarSnapshot);
    }
    setLoading(false);
  }, [userId, week]);

  useEffect(() => { loadSnapshot(); }, [loadSnapshot]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    // Step 1: refresh aggregate (idempotent; fine to call from any signed-in user).
    await supabase.rpc("refresh_tech_radar", { p_week_start: week });
    // Step 2: recompute the user's personalised snapshot
    const { error } = await supabase.rpc("compute_user_radar", {
      p_user_id:    userId,
      p_week_start: week,
    });
    if (error) {
      toast({ type: "error", title: "No se pudo actualizar el Radar", description: error.message });
    } else {
      await loadSnapshot();
      toast({ type: "success", title: "Tech Radar actualizado", description: "Datos de la semana recomputados." });
    }
    setRefreshing(false);
  }, [loadSnapshot, toast, userId, week]);

  const score        = snapshot?.radar_score ?? 0;
  const matched      = snapshot?.matched_skills  ?? [];
  const gaps         = snapshot?.gap_skills      ?? [];
  const emerging     = snapshot?.emerging_skills ?? [];
  const empty        = !loading && matched.length + gaps.length === 0;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/60 animate-fade-in-up stagger-2">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white">
            <Sparkles size={15} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-bold text-base leading-tight">Tech Radar</p>
            <p className="text-[11px] text-slate-400">
              Semana del {new Date(week).toLocaleDateString("es-CR")}
              {snapshot?.specialty ? ` · ${snapshot.specialty}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg disabled:opacity-50 btn-press"
        >
          {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refrescar
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton rounded-xl h-24" />
          <div className="skeleton rounded-xl h-16" />
        </div>
      ) : empty ? (
        <div className="text-center py-8">
          <Target size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500 font-semibold">Aún no hay datos de mercado para tu especialidad.</p>
          <p className="text-xs text-slate-400 mt-1">Pulsa <span className="font-bold">Refrescar</span> para generar tu primer radar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Score hero */}
          <div className="flex items-center gap-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-100 rounded-xl p-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="#e9d5ff" strokeWidth="6" fill="none" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="url(#rad)"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${(score / 100) * 176} 176`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="rad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#8b5cf6" />
                    <stop offset="1" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-extrabold text-violet-700">{score}%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-violet-900 leading-tight">Tu alineación con el mercado</p>
              <p className="text-xs text-violet-700 mt-0.5">
                Cubres <span className="font-extrabold">{matched.length}</span> de las top skills de tu especialidad esta semana.
              </p>
            </div>
          </div>

          {/* Gaps — highest priority */}
          {gaps.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingUp size={11} /> Skills a ganar ({gaps.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {gaps.slice(0, 8).map((s) => (
                  <span
                    key={s}
                    className="text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Emerging — rising or new */}
          {emerging.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Flame size={11} /> Emergentes ({emerging.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {emerging.slice(0, 6).map((s) => (
                  <span
                    key={s}
                    className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matched — what you already have */}
          {matched.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={11} /> Ya dominas ({matched.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matched.slice(0, 8).map((s) => (
                  <span
                    key={s}
                    className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
