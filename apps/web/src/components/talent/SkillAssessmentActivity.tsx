"use client";
// ──────────────────────────────────────────────────────────────────
// SkillAssessmentActivity – Interactive Workplace Scenario Assessment
// ──────────────────────────────────────────────────────────────────
// A 5-question scenario-based assessment that measures soft skills
// relevant to technical-vocational careers.
// Results are written to the `activity_results` table and XP is
// awarded via the /api/xp endpoint — no hardcoded outcomes.
// ──────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  X, ChevronRight, Zap, CheckCircle, Brain,
  Users, MessageSquare, Lightbulb, Wrench, Loader2,
} from "lucide-react";

// ── Question data ─────────────────────────────────────────────────
// Each choice has a `score` 1–4 (4 = ideal response).
// Primary competency being assessed is tagged per question.

interface Choice { id: string; text: string; score: number; }
interface Question {
  id:           string;
  competency:   string;
  CompIcon:     React.ElementType;
  scenario:     string;
  context:      string;   // short setting description
  choices:      Choice[];
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    competency: "Comunicación",
    CompIcon: MessageSquare,
    context: "Taller de Mecatrónica",
    scenario:
      "Estás reparando una máquina CNC. Tu compañero te da instrucciones que parecen incorrectas según lo que aprendiste. El plazo de entrega es ajustado.",
    choices: [
      { id: "a", score: 1, text: "Seguir las instrucciones sin cuestionar para no retrasar el trabajo." },
      { id: "b", score: 4, text: "Pedir una explicación calmada antes de continuar." },
      { id: "c", score: 2, text: "Ignorar las instrucciones y actuar según tu propio criterio." },
      { id: "d", score: 1, text: "Ir directamente con el supervisor sin hablar primero con tu compañero." },
    ],
  },
  {
    id: "q2",
    competency: "Liderazgo",
    CompIcon: Users,
    context: "Proyecto en equipo",
    scenario:
      "Tu equipo debe entregar un proyecto esta tarde, pero aparece un problema técnico inesperado. Tú eres el integrante con más experiencia en el área.",
    choices: [
      { id: "a", score: 2, text: "Trabajar solo en silencio para no alarmar al equipo." },
      { id: "b", score: 4, text: "Informar a todos, evaluar opciones y proponer una solución alternativa." },
      { id: "c", score: 1, text: "Señalar quién cometió el error antes de buscar soluciones." },
      { id: "d", score: 1, text: "Esperar que alguien más tome la iniciativa." },
    ],
  },
  {
    id: "q3",
    competency: "Empatía",
    CompIcon: Lightbulb,
    context: "Primer día de un compañero",
    scenario:
      "Un compañero recién incorporado está teniendo dificultades con una tarea técnica básica y está atrasando al equipo. El supervisor aún no lo sabe.",
    choices: [
      { id: "a", score: 1, text: "Continuar con tu propio trabajo sin involucrarte." },
      { id: "b", score: 1, text: "Señalar el error frente a todos para que aprenda rápido." },
      { id: "c", score: 4, text: "Ofrecerle ayuda discreta y explicarle el procedimiento correcto en privado." },
      { id: "d", score: 2, text: "Reportar la situación al supervisor inmediatamente." },
    ],
  },
  {
    id: "q4",
    competency: "Resolución de Problemas",
    CompIcon: Wrench,
    context: "Área de soldadura",
    scenario:
      "Durante una soldadura de precisión detectas un defecto en el material que podría comprometer la pieza. La entrega es hoy y no hay material de reemplazo visible.",
    choices: [
      { id: "a", score: 1, text: "Continuar y esperar que el defecto no afecte el resultado final." },
      { id: "b", score: 4, text: "Detener el trabajo, documentar el defecto y comunicarlo al supervisor con una propuesta de acción." },
      { id: "c", score: 1, text: "Intentar cubrir el defecto con acabado superficial." },
      { id: "d", score: 2, text: "Solicitar material nuevo sin consultar el impacto en costos ni al supervisor." },
    ],
  },
  {
    id: "q5",
    competency: "Trabajo en Equipo",
    CompIcon: Brain,
    context: "Cierre de turno",
    scenario:
      "Al finalizar tu turno notas que tu compañero no pudo completar su parte del trabajo. Tú ya cumpliste tu cuota y el trabajo pendiente afectará al equipo mañana.",
    choices: [
      { id: "a", score: 1, text: "Irte porque ya cumpliste tu cuota." },
      { id: "b", score: 2, text: "Quedarte a ayudar en silencio sin informar a nadie." },
      { id: "c", score: 4, text: "Consultar a tu compañero si necesita apoyo y coordinar con el supervisor para redistribuir la carga." },
      { id: "d", score: 1, text: "Reportar que tu compañero no terminó su parte." },
    ],
  },
];

const MAX_SCORE   = QUESTIONS.length * 4;            // 20
const ACTIVITY_ID = "soft-skills-v1";

function toPercent(raw: number) {
  return Math.round((raw / MAX_SCORE) * 100);
}

function scoreLabel(pct: number) {
  if (pct >= 80) return { label: "Avanzado",      color: "emerald" };
  if (pct >= 60) return { label: "Intermedio",    color: "cyan" };
  if (pct >= 40) return { label: "En Desarrollo", color: "amber" };
  return              { label: "Área de Mejora",  color: "slate" };
}

function xpForScore(pct: number) {
  if (pct >= 80) return 80;
  if (pct >= 60) return 50;
  if (pct >= 40) return 30;
  return 10;
}

// ── Props ─────────────────────────────────────────────────────────
interface Props {
  userId:   string;
  onClose:  () => void;
  onXPEarned: (xp: number) => void;
}

type Phase = "intro" | "question" | "result" | "already_done";

// ── Component ─────────────────────────────────────────────────────
export default function SkillAssessmentActivity({ userId, onClose, onXPEarned }: Props) {
  const [phase,     setPhase]     = useState<Phase>("intro");
  const [qIndex,    setQIndex]    = useState(0);
  const [answers,   setAnswers]   = useState<string[]>([]);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [prevScore, setPrevScore] = useState<number | null>(null);

  // Check if already completed
  useEffect(() => {
    supabase
      .from("activity_results")
      .select("score")
      .eq("user_id", userId)
      .eq("activity_id", ACTIVITY_ID)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setPrevScore(data.score); setPhase("already_done"); }
      });
  }, [userId]);

  const currentQ = QUESTIONS[qIndex];

  const handleChoice = (choiceId: string) => {
    if (animating || selected) return;
    setSelected(choiceId);
  };

  const handleNext = useCallback(async () => {
    if (!selected || animating) return;
    const newAnswers = [...answers, selected];

    if (qIndex < QUESTIONS.length - 1) {
      // Animate out, then advance
      setAnimating(true);
      setTimeout(() => {
        setAnswers(newAnswers);
        setQIndex((i) => i + 1);
        setSelected(null);
        setAnimating(false);
      }, 280);
    } else {
      // Last question — compute results and save
      setSaving(true);
      const rawScore = newAnswers.reduce((sum, choiceId, qi) => {
        const choice = QUESTIONS[qi].choices.find((c) => c.id === choiceId);
        return sum + (choice?.score ?? 0);
      }, 0);

      const pct = toPercent(rawScore);
      const xp  = xpForScore(pct);

      // Build per-competency scores (each question's score as %)
      const skillScores: Record<string, number> = {};
      newAnswers.forEach((cid, qi) => {
        const q = QUESTIONS[qi];
        const choice = q.choices.find((c) => c.id === cid);
        skillScores[q.competency] = Math.round(((choice?.score ?? 0) / 4) * 100);
      });

      // Upsert result to DB
      await supabase.from("activity_results").upsert(
        {
          user_id:      userId,
          activity_id:  ACTIVITY_ID,
          score:        pct,
          skill_scores: skillScores,
          answers:      newAnswers,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,activity_id" }
      );

      // Award XP
      await fetch("/api/xp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user_id: userId, type: "activity", xp_amount: xp, metadata: { activity_id: ACTIVITY_ID, score: pct } }),
      }).catch(() => {});

      setAnswers(newAnswers);
      setSaving(false);
      setPhase("result");
      onXPEarned(xp);
    }
  }, [selected, animating, answers, qIndex, userId, onXPEarned]);

  // ── Raw score for results ──────────────────────────────────────
  const rawScore = answers.reduce((sum, cid, qi) => {
    const choice = QUESTIONS[qi]?.choices.find((c) => c.id === cid);
    return sum + (choice?.score ?? 0);
  }, 0);
  const finalPct   = toPercent(rawScore);
  const { label: lvlLabel, color: lvlColor } = scoreLabel(finalPct);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
        >
          <X size={16} />
        </button>

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
              <Brain size={32} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">Evaluación de Competencias</h2>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                5 escenarios reales del mundo laboral técnico.
                Elige la respuesta que mejor refleje tu actitud profesional.
                No hay respuestas correctas universales, pero sí enfoques más efectivos.
              </p>
            </div>
            <div className="flex justify-center gap-3 text-xs text-slate-400">
              {QUESTIONS.map((q) => (
                <div key={q.id} className="flex flex-col items-center gap-1">
                  <q.CompIcon size={14} className="text-amber-500" />
                  <span>{q.competency}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setPhase("question")}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Comenzar evaluación
            </button>
          </div>
        )}

        {/* ── ALREADY DONE ── */}
        {phase === "already_done" && prevScore !== null && (
          <div className="p-8 text-center space-y-4">
            <CheckCircle size={40} className="text-emerald-500 mx-auto" />
            <h2 className="text-xl font-extrabold">Ya completaste esta evaluación</h2>
            <p className="text-slate-500 text-sm">Tu puntuación anterior: <span className="font-bold text-emerald-600">{prevScore}%</span></p>
            <p className="text-xs text-slate-400">Puedes volver a realizarla para actualizar tu resultado.</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold hover:bg-slate-50">
                Cerrar
              </button>
              <button
                onClick={() => { setPrevScore(null); setPhase("question"); setAnswers([]); setQIndex(0); setSelected(null); }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold"
              >
                Repetir
              </button>
            </div>
          </div>
        )}

        {/* ── QUESTION ── */}
        {phase === "question" && (
          <div className={`transition-all duration-300 ${animating ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}>
            {/* Progress bar */}
            <div className="h-1.5 bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 rounded-full"
                style={{ width: `${((qIndex) / QUESTIONS.length) * 100}%` }}
              />
            </div>

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <currentQ.CompIcon size={15} className="text-amber-500" />
                  <span className="text-xs font-bold text-amber-600">{currentQ.competency}</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {qIndex + 1} de {QUESTIONS.length}
                </span>
              </div>

              {/* Context chip */}
              <span className="inline-block text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-semibold">
                📍 {currentQ.context}
              </span>

              {/* Scenario */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                  {currentQ.scenario}
                </p>
              </div>

              {/* Choices */}
              <div className="space-y-2.5">
                {currentQ.choices.map((choice) => {
                  const isSelected = selected === choice.id;
                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleChoice(choice.id)}
                      disabled={!!selected}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 ${
                        isSelected
                          ? "border-amber-400 bg-amber-50 text-amber-800 font-semibold scale-[1.01] shadow-sm"
                          : selected
                          ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                          : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50 hover:shadow-sm active:scale-[0.99]"
                      }`}
                    >
                      <span className="font-bold mr-2 text-amber-500 text-xs">
                        {choice.id.toUpperCase()}.
                      </span>
                      {choice.text}
                    </button>
                  );
                })}
              </div>

              {/* Next */}
              <button
                onClick={handleNext}
                disabled={!selected || saving}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Guardando…</>
                ) : qIndex < QUESTIONS.length - 1 ? (
                  <>Siguiente <ChevronRight size={16} /></>
                ) : (
                  <>Ver resultados <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {phase === "result" && (
          <div className="p-6 space-y-5">
            {/* Score headline */}
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full bg-${lvlColor}-100 flex items-center justify-center mx-auto mb-3`}>
                <span className={`text-2xl font-extrabold text-${lvlColor}-600`}>{finalPct}%</span>
              </div>
              <h2 className="text-lg font-extrabold">{lvlLabel}</h2>
              <p className="text-xs text-slate-400 mt-1">Resultado de tu evaluación de habilidades blandas</p>
            </div>

            {/* XP earned */}
            <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-100 rounded-xl py-3">
              <Zap size={16} className="text-amber-500" />
              <span className="text-sm font-bold text-amber-700">+{xpForScore(finalPct)} XP ganados</span>
            </div>

            {/* Per-competency breakdown */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500">Desglose por competencia</p>
              {QUESTIONS.map((q, qi) => {
                const ans    = answers[qi];
                const choice = q.choices.find((c) => c.id === ans);
                const pct    = Math.round(((choice?.score ?? 0) / 4) * 100);
                const { color } = scoreLabel(pct);
                return (
                  <div key={q.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <q.CompIcon size={11} className={`text-${color}-500`} />
                        <span className="font-semibold text-slate-600">{q.competency}</span>
                      </div>
                      <span className={`font-bold text-${color}-600`}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-${color}-400 rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
