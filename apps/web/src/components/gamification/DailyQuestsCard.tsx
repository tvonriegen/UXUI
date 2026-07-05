"use client";
// ──────────────────────────────────────────────────────────
// DailyQuestsCard – Student dashboard daily quests
// ──────────────────────────────────────────────────────────
// Fetches the 3 quests of the day + current progress via the
// `get_daily_quests(user, date)` Supabase RPC. Renders animated
// progress bars and a celebration when the user completes a quest.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import LevelUpModal from "./LevelUpModal";
import { Target, CheckCircle2, Loader2, ChevronRight } from "lucide-react";

export interface DailyQuest {
  template_code: string;
  title:         string;
  description:   string;
  icon:          string;
  target_count:  number;
  xp_reward:     number;
  category:      string;
  current_count: number;
  completed_at:  string | null;
}

const ROUTE_HINTS: Record<string, { href: string; label: string }> = {
  view_jobs_3:       { href: "/empleos",  label: "Ir a vacantes"    },
  apply_job:         { href: "/empleos",  label: "Postular ahora"   },
  update_skill:      { href: "/profile",  label: "Editar perfil"    },
  follow_company:    { href: "/empleos",  label: "Explorar empresas" },
  post_muro:         { href: "/muro",     label: "Escribir post"    },
  view_profile:      { href: "/profile",  label: "Abrir perfil"     },
  complete_activity: { href: "/talent",   label: "Ir a talento"     },
  like_posts_3:      { href: "/muro",     label: "Explorar el Muro" },
};

interface DailyQuestsCardProps {
  userId: string;
}

export default function DailyQuestsCard({ userId }: DailyQuestsCardProps) {
  const [quests,  setQuests]  = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ quest: DailyQuest } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("get_daily_quests", {
      p_user_id: userId,
      p_date:    new Date().toISOString().slice(0, 10),
    });
    if (err) {
      setError(err.message);
    } else if (data) {
      setQuests(data as DailyQuest[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { if (userId) load(); }, [userId, load]);

  // Listen for quest completions triggered elsewhere in the app
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ code: string; completed?: boolean; xp_reward?: number }>).detail;
      if (!detail) return;
      setQuests((prev) =>
        prev.map((q) =>
          q.template_code === detail.code
            ? {
                ...q,
                current_count: Math.min(q.target_count, q.current_count + 1),
                completed_at:  detail.completed ? new Date().toISOString() : q.completed_at,
              }
            : q
        )
      );
    };
    window.addEventListener("classlink:quest-progress", handler);
    return () => window.removeEventListener("classlink:quest-progress", handler);
  }, []);

  const totalXP    = useMemo(() => quests.reduce((s, q) => s + q.xp_reward, 0), [quests]);
  const earnedXP   = useMemo(() => quests.filter((q) => q.completed_at).reduce((s, q) => s + q.xp_reward, 0), [quests]);
  const completedN = quests.filter((q) => q.completed_at).length;

  // Sniff: if all completed and we haven't celebrated yet, show final
  useEffect(() => {
    if (loading) return;
    if (quests.length === 0) return;
    if (completedN === quests.length) {
      const last = quests.find((q) => q.completed_at);
      if (last) setCelebration({ quest: last });
    }
  }, [completedN, loading, quests]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/60 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
            <Target size={16} className="text-cyan-600" />
          </div>
          <div>
            <p className="font-bold text-base leading-tight">Misiones de hoy</p>
            <p className="text-[11px] text-slate-400">
              {completedN}/{quests.length} completadas · {earnedXP}/{totalXP} XP
            </p>
          </div>
        </div>
        {quests.length > 0 && (
          <div className="hidden sm:block w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full primary-gradient transition-all duration-700"
              style={{ width: `${quests.length ? (completedN / quests.length) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-xl skeleton skeleton-circle shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton skeleton-line w-2/3" />
                <div className="skeleton skeleton-line w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          No se pudieron cargar las misiones: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2.5">
          {quests.map((q) => {
            const pct   = Math.min(100, Math.round((q.current_count / q.target_count) * 100));
            const done  = Boolean(q.completed_at);
            const hint  = ROUTE_HINTS[q.template_code] ?? { href: "/muro", label: "Empezar" };

            return (
              <div
                key={q.template_code}
                className={`p-4 rounded-xl border transition-all ${
                  done
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-slate-200/70 bg-white hover:border-cyan-200 hover:bg-cyan-50/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    done ? "bg-emerald-100 text-emerald-600" : "bg-cyan-50 text-cyan-600"
                  }`}>
                    {done ? <CheckCircle2 size={20} strokeWidth={2.25} /> : <Icon name={q.icon} size={20} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm leading-tight">{q.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{q.description}</p>
                      </div>
                      <span className={`text-[10px] font-extrabold shrink-0 px-2 py-0.5 rounded-full ${
                        done ? "bg-emerald-100 text-emerald-700" : "bg-cyan-100 text-cyan-700"
                      }`}>
                        +{q.xp_reward} XP
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            done ? "bg-emerald-500" : "primary-gradient"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] font-semibold text-slate-400">
                          {q.current_count}/{q.target_count}
                        </span>
                        {!done && (
                          <Link
                            href={hint.href}
                            className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-0.5"
                          >
                            {hint.label}
                            <ChevronRight size={11} />
                          </Link>
                        )}
                        {done && (
                          <span className="text-[10px] font-bold text-emerald-600">Completada ✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && quests.length === 0 && (
        <div className="text-center py-6 text-sm text-slate-400">
          <Loader2 size={18} className="mx-auto mb-2 animate-spin" />
          Preparando tus misiones de hoy…
        </div>
      )}

      <LevelUpModal
        open={Boolean(celebration)}
        onClose={() => setCelebration(null)}
        kind="quest"
        title="¡Todas las misiones completadas!"
        subtitle="Buen trabajo — mantén la racha mañana."
        xpGained={earnedXP}
      />
    </div>
  );
}
