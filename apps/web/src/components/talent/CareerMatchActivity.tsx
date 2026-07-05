"use client";
// ──────────────────────────────────────────────────────────────────
// CareerMatchActivity – Career Preference Discovery
// ──────────────────────────────────────────────────────────────────
// Shows 8 job profile cards one at a time. For each the student
// picks: "Me llama la atención" / "Es indiferente" / "No es lo mío".
// Responses are mapped to career clusters. The result screen shows
// the student's top career matches and a personalised insight.
// No right/wrong answers — this is a preference mapping activity.
// ──────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  X, Heart, Minus, ThumbsDown, Compass, Zap, CheckCircle,
  Cpu, Zap as ZapIcon, Wrench, Flame, Leaf, Building, ChefHat,
} from "lucide-react";

const ACTIVITY_ID = "career-match-v1";
const XP_REWARD   = 40;

type Cluster = "tech" | "electrical" | "mechanical" | "manufacturing" | "gastronomy" | "construction";

interface JobCard {
  id:       string;
  title:    string;
  icon:     React.ElementType;
  color:    string;       // Tailwind color name
  cluster:  Cluster[];
  what:     string;       // 1-line description
  traits:   string[];    // 3 short traits
  salary:   string;      // representative range
}

const CARDS: JobCard[] = [
  {
    id: "c1",
    title: "Técnico en Informática",
    icon: Cpu, color: "cyan",
    cluster: ["tech"],
    what: "Instala, configura y repara equipos y redes informáticas.",
    traits: ["Analítico", "Resolutivo", "Curioso"],
    salary: "$600K – $900K CLP",
  },
  {
    id: "c2",
    title: "Técnico Electricista",
    icon: ZapIcon, color: "amber",
    cluster: ["electrical"],
    what: "Diseña e instala sistemas eléctricos residenciales e industriales.",
    traits: ["Preciso", "Ordenado", "Responsable"],
    salary: "$650K – $950K CLP",
  },
  {
    id: "c3",
    title: "Mecatrónico Industrial",
    icon: Wrench, color: "violet",
    cluster: ["mechanical", "tech"],
    what: "Mantiene y programa robots y maquinaria automatizada de planta.",
    traits: ["Multidisciplinario", "Metódico", "Técnico"],
    salary: "$800K – $1.2M CLP",
  },
  {
    id: "c4",
    title: "Soldador Especializado",
    icon: Flame, color: "orange",
    cluster: ["manufacturing"],
    what: "Ejecuta uniones de metal con distintos procesos (MIG, TIG, SMAW).",
    traits: ["Preciso", "Paciente", "Detallista"],
    salary: "$600K – $1.1M CLP",
  },
  {
    id: "c5",
    title: "Cocinero / Chef",
    icon: ChefHat, color: "rose",
    cluster: ["gastronomy"],
    what: "Diseña menús, prepara alimentos y lidera brigadas de cocina.",
    traits: ["Creativo", "Rápido", "Organizado"],
    salary: "$500K – $900K CLP",
  },
  {
    id: "c6",
    title: "Técnico en Construcción",
    icon: Building, color: "slate",
    cluster: ["construction"],
    what: "Supervisa obras, lee planos y coordina cuadrillas en terreno.",
    traits: ["Liderazgo", "Planificador", "Resistente"],
    salary: "$650K – $1M CLP",
  },
  {
    id: "c7",
    title: "Desarrollador de Software",
    icon: Cpu, color: "teal",
    cluster: ["tech"],
    what: "Crea aplicaciones web y móviles para empresas y startups.",
    traits: ["Creativo", "Lógico", "Autónomo"],
    salary: "$900K – $2M CLP",
  },
  {
    id: "c8",
    title: "Técnico Automotriz",
    icon: Wrench, color: "emerald",
    cluster: ["mechanical"],
    what: "Diagnostica y repara vehículos usando herramientas y software.",
    traits: ["Práctico", "Curioso", "Sistemático"],
    salary: "$550K – $900K CLP",
  },
];

type Vote = 2 | 1 | 0;   // 2=interested, 1=neutral, 0=no

const CLUSTER_LABELS: Record<Cluster, string> = {
  tech:         "Tecnología & Informática",
  electrical:   "Electricidad & Electrónica",
  mechanical:   "Mecánica & Automotriz",
  manufacturing:"Manufactura & Soldadura",
  gastronomy:   "Gastronomía & Cocina",
  construction: "Construcción & Obras",
};

interface Props {
  userId:     string;
  onClose:    () => void;
  onXPEarned: (xp: number) => void;
}

type Phase = "intro" | "swiping" | "result" | "already_done";

export default function CareerMatchActivity({ userId, onClose, onXPEarned }: Props) {
  const [phase,     setPhase]     = useState<Phase>("intro");
  const [cardIndex, setCardIndex] = useState(0);
  const [votes,     setVotes]     = useState<Vote[]>([]);
  const [exiting,   setExiting]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [prevDone,  setPrevDone]  = useState(false);

  useEffect(() => {
    supabase
      .from("activity_results")
      .select("id")
      .eq("user_id", userId)
      .eq("activity_id", ACTIVITY_ID)
      .maybeSingle()
      .then(({ data }) => { if (data) setPrevDone(true); });
  }, [userId]);

  const start = () => {
    setCardIndex(0);
    setVotes([]);
    setPhase("swiping");
  };

  const vote = (v: Vote) => {
    if (exiting || saving) return;
    setExiting(true);
    const newVotes = [...votes, v];

    setTimeout(async () => {
      if (cardIndex < CARDS.length - 1) {
        setVotes(newVotes);
        setCardIndex((i) => i + 1);
        setExiting(false);
      } else {
        // Done — save and show results
        setSaving(true);
        const clusterScores: Record<string, number> = {};
        newVotes.forEach((vote, i) => {
          CARDS[i].cluster.forEach((cl) => {
            clusterScores[cl] = (clusterScores[cl] ?? 0) + vote;
          });
        });

        await supabase.from("activity_results").upsert({
          user_id:      userId,
          activity_id:  ACTIVITY_ID,
          score:        100,
          skill_scores: clusterScores,
          answers:      newVotes,
          completed_at: new Date().toISOString(),
        }, { onConflict: "user_id,activity_id" });

        await fetch("/api/xp", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ user_id: userId, type: "activity", xp_amount: XP_REWARD, metadata: { activity_id: ACTIVITY_ID } }),
        }).catch(() => {});

        setSaving(false);
        setVotes(newVotes);
        onXPEarned(XP_REWARD);
        setExiting(false);
        setPhase("result");
      }
    }, 260);
  };

  // Compute ranked clusters for results
  const clusterTotals = (() => {
    const scores: Record<string, number> = {};
    votes.forEach((v, i) => {
      CARDS[i]?.cluster.forEach((cl) => {
        scores[cl] = (scores[cl] ?? 0) + v;
      });
    });
    return (Object.entries(scores) as [Cluster, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  })();

  const card = CARDS[cardIndex];
  const CardIcon = card?.icon;

  const progressPct = ((cardIndex) / CARDS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 pt-5 pb-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Compass size={18} />
              <span className="font-bold text-sm">Descubre tu Perfil</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <X size={14} />
            </button>
          </div>
          {phase === "swiping" && (
            <div className="mt-2 h-1 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          )}
        </div>

        <div className="p-6">

          {/* ── INTRO ─────────────────────────────────────── */}
          {phase === "intro" && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
                <Compass size={32} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold mb-2">¿Cuál es tu camino?</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Te mostraremos 8 perfiles de carrera. Para cada uno indica tu nivel de interés.
                  Al final verás qué áreas se alinean más contigo.
                </p>
              </div>
              <div className="flex justify-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Heart size={13} className="text-rose-500" /> Me interesa</span>
                <span className="flex items-center gap-1"><Minus size={13} className="text-slate-400" /> Indiferente</span>
                <span className="flex items-center gap-1"><ThumbsDown size={13} className="text-slate-400" /> No es lo mío</span>
              </div>
              <button
                onClick={prevDone ? undefined : start}
                className={`w-full py-3.5 font-bold rounded-2xl transition-colors ${prevDone ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
              >
                {prevDone ? "Ya completaste esta actividad" : "Empezar"}
              </button>
            </div>
          )}

          {/* ── ALREADY DONE (fallback) ────────────────────── */}
          {phase === "already_done" && (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="mx-auto text-emerald-500" />
              <h2 className="text-xl font-extrabold">Ya completaste esta actividad</h2>
              <button onClick={onClose} className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors">
                Cerrar
              </button>
            </div>
          )}

          {/* ── SWIPING ───────────────────────────────────── */}
          {phase === "swiping" && card && (
            <div className={`space-y-5 transition-all duration-260 ${exiting ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>

              {/* Card */}
              <div className={`bg-${card.color}-50 border-2 border-${card.color}-100 rounded-2xl p-5 text-center`}>
                <div className={`w-14 h-14 rounded-2xl bg-${card.color}-100 flex items-center justify-center mx-auto mb-3`}>
                  <CardIcon size={28} className={`text-${card.color}-600`} />
                </div>
                <h3 className="font-extrabold text-base mb-1">{card.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-3">{card.what}</p>
                <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                  {card.traits.map((t) => (
                    <span key={t} className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-${card.color}-100 text-${card.color}-700`}>{t}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-400">Rango salarial aprox.: <strong className="text-slate-600">{card.salary}</strong></p>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => vote(0)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all"
                >
                  <ThumbsDown size={20} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400">No es lo mío</span>
                </button>
                <button
                  onClick={() => vote(1)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all"
                >
                  <Minus size={20} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400">Indiferente</span>
                </button>
                <button
                  onClick={() => vote(2)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 transition-all"
                >
                  <Heart size={20} className="text-rose-500" />
                  <span className="text-[10px] font-bold text-rose-500">Me interesa</span>
                </button>
              </div>

              <p className="text-center text-xs text-slate-400">{cardIndex + 1} de {CARDS.length}</p>
            </div>
          )}

          {/* ── RESULT ────────────────────────────────────── */}
          {phase === "result" && (
            <div className="space-y-5">
              <div className="text-center">
                <Compass size={44} className="mx-auto text-emerald-500 mb-3" />
                <h2 className="text-xl font-extrabold">Tu perfil de carrera</h2>
                <p className="text-slate-500 text-sm mt-1">Basado en tus preferencias, estas áreas te llaman más:</p>
              </div>

              <div className="space-y-3">
                {clusterTotals.map(([cluster, score], rank) => {
                  const maxScore = CARDS.filter((c) => c.cluster.includes(cluster)).length * 2;
                  const pct      = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                  const colors   = ["emerald", "cyan", "violet"];
                  const col      = colors[rank] ?? "slate";

                  return (
                    <div key={cluster}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className={`font-bold text-${col}-700`}>
                          {rank === 0 && "🥇 "}{rank === 1 && "🥈 "}{rank === 2 && "🥉 "}
                          {CLUSTER_LABELS[cluster as Cluster]}
                        </span>
                        <span className="text-slate-400 font-medium">{pct}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-${col}-500 rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-center">
                <p className="text-sm font-bold text-amber-700">
                  <Zap size={14} className="inline mr-1 mb-0.5" />
                  +{XP_REWARD} XP ganados
                </p>
              </div>

              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Estos resultados reflejan tus preferencias declaradas. Compártelos con tu colegio o tutor para orientar tu plan de carrera.
              </p>

              <button onClick={onClose} className="w-full py-3 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-700 transition-colors">
                Cerrar
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
