"use client";
// ──────────────────────────────────────────────────────────────────
// TechQuizActivity – Timed Technical Knowledge Quiz
// ──────────────────────────────────────────────────────────────────
// 8 questions covering electronics, programming, automation, welding.
// Each question has a 20-second countdown. Correct/wrong feedback
// is shown immediately after answering. XP is based on final score.
// ──────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  X, Zap, CheckCircle, XCircle, Clock, Trophy,
  RotateCcw, ChevronRight, Loader2, Cpu,
} from "lucide-react";

const ACTIVITY_ID  = "tech-quiz-v1";
const TIME_PER_Q   = 20; // seconds

interface QuizQuestion {
  id:      string;
  text:    string;
  choices: { id: string; text: string }[];
  correct: string;
  hint:    string;   // shown after answering
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    text: "¿Cuál es la función principal de un fusible en un circuito eléctrico?",
    choices: [
      { id: "a", text: "Aumentar la tensión del circuito" },
      { id: "b", text: "Proteger el circuito ante sobrecargas de corriente" },
      { id: "c", text: "Reducir la potencia del motor" },
      { id: "d", text: "Almacenar energía eléctrica" },
    ],
    correct: "b",
    hint: "El fusible interrumpe el circuito cuando la corriente supera un límite seguro.",
  },
  {
    id: "q2",
    text: "En programación, ¿qué hace un bucle while?",
    choices: [
      { id: "a", text: "Ejecuta el código solo una vez" },
      { id: "b", text: "Define una función reutilizable" },
      { id: "c", text: "Repite el código mientras una condición sea verdadera" },
      { id: "d", text: "Declara una variable de tipo entero" },
    ],
    correct: "c",
    hint: "while evalúa la condición antes de cada iteración — si es falsa desde el inicio, no ejecuta nada.",
  },
  {
    id: "q3",
    text: "¿Qué significa 'GND' en un esquema eléctrico?",
    choices: [
      { id: "a", text: "Gran Nodo Digital" },
      { id: "b", text: "Generador No Definido" },
      { id: "c", text: "Grabación de Datos" },
      { id: "d", text: "Tierra / Masa (Ground)" },
    ],
    correct: "d",
    hint: "GND es el punto de referencia de 0 V en el circuito. Todo voltaje se mide respecto a él.",
  },
  {
    id: "q4",
    text: "En mecatrónica, ¿qué tipo de sensor detecta objetos metálicos sin contacto físico?",
    choices: [
      { id: "a", text: "Sensor de temperatura" },
      { id: "b", text: "Sensor inductivo" },
      { id: "c", text: "Sensor de presión" },
      { id: "d", text: "Sensor de nivel ultrasónico" },
    ],
    correct: "b",
    hint: "El sensor inductivo genera un campo magnético y detecta perturbaciones causadas por metales cercanos.",
  },
  {
    id: "q5",
    text: "En una base de datos, ¿qué instrucción SQL se usa para consultar datos?",
    choices: [
      { id: "a", text: "INSERT" },
      { id: "b", text: "DELETE" },
      { id: "c", text: "SELECT" },
      { id: "d", text: "CREATE" },
    ],
    correct: "c",
    hint: "SELECT es la instrucción de lectura. Las otras modifican o eliminan datos.",
  },
  {
    id: "q6",
    text: "¿Qué es un PLC en automatización industrial?",
    choices: [
      { id: "a", text: "Panel de Limitación de Corriente" },
      { id: "b", text: "Procesador de Lógica Combinacional" },
      { id: "c", text: "Controlador Lógico Programable" },
      { id: "d", text: "Protocolo de Línea de Control" },
    ],
    correct: "c",
    hint: "El PLC es el cerebro de la mayoría de las líneas de producción industriales automatizadas.",
  },
  {
    id: "q7",
    text: "El electrodo de soldadura E7018 se caracteriza por:",
    choices: [
      { id: "a", text: "Ser un electrodo TIG para soldadura de aluminio" },
      { id: "b", text: "Ser un electrodo de corte por plasma" },
      { id: "c", text: "Ser un electrodo básico de alta resistencia para acero" },
      { id: "d", text: "Usarse exclusivamente en soldadura subacuática" },
    ],
    correct: "c",
    hint: "El '70' indica resistencia mínima de 70.000 PSI. El '18' indica revestimiento básico bajo hidrógeno.",
  },
  {
    id: "q8",
    text: "¿Cuál es la diferencia clave entre corriente AC y corriente DC?",
    choices: [
      { id: "a", text: "AC es más rápida que DC en todos los casos" },
      { id: "b", text: "AC alterna su dirección periódicamente; DC fluye en una sola dirección" },
      { id: "c", text: "DC es peligrosa, AC es completamente segura" },
      { id: "d", text: "No hay diferencia práctica entre ambas" },
    ],
    correct: "b",
    hint: "La corriente de red eléctrica domiciliaria es AC (~50 Hz en Chile). Las baterías generan DC.",
  },
];

function xpForCorrect(count: number): number {
  if (count >= 7) return 60;
  if (count >= 5) return 40;
  if (count >= 3) return 20;
  return 10;
}

interface Props {
  userId:     string;
  onClose:    () => void;
  onXPEarned: (xp: number) => void;
}

type Phase = "intro" | "question" | "result" | "already_done";

export default function TechQuizActivity({ userId, onClose, onXPEarned }: Props) {
  const [phase,      setPhase]      = useState<Phase>("intro");
  const [qIndex,     setQIndex]     = useState(0);
  const [selected,   setSelected]   = useState<string | null>(null);
  const [revealed,   setRevealed]   = useState(false);   // show correct/wrong
  const [timeLeft,   setTimeLeft]   = useState(TIME_PER_Q);
  const [correctIds, setCorrectIds] = useState<Set<number>>(new Set());
  const [saving,     setSaving]     = useState(false);
  const [prevScore,  setPrevScore]  = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check previous completion
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

  // Countdown timer (only during question phase, before reveal)
  useEffect(() => {
    if (phase !== "question" || revealed) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          // Time's up — reveal without selection
          setRevealed(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase, revealed, qIndex]);

  const startQuiz = () => {
    setQIndex(0);
    setSelected(null);
    setRevealed(false);
    setTimeLeft(TIME_PER_Q);
    setCorrectIds(new Set());
    setPhase("question");
  };

  const handleSelect = (choiceId: string) => {
    if (revealed) return;
    clearInterval(timerRef.current!);
    setSelected(choiceId);
    setRevealed(true);
  };

  const handleNext = useCallback(async () => {
    const isCorrect = selected === QUESTIONS[qIndex].correct;
    const newCorrect = new Set(correctIds);
    if (isCorrect) newCorrect.add(qIndex);

    if (qIndex < QUESTIONS.length - 1) {
      setCorrectIds(newCorrect);
      setQIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
      setTimeLeft(TIME_PER_Q);
    } else {
      // Final question
      setSaving(true);
      const count = newCorrect.size;
      const xp    = xpForCorrect(count);
      const pct   = Math.round((count / QUESTIONS.length) * 100);

      await supabase.from("activity_results").upsert({
        user_id:     userId,
        activity_id: ACTIVITY_ID,
        score:       pct,
        skill_scores: { correct: count, total: QUESTIONS.length },
        answers:     [],
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,activity_id" });

      await fetch("/api/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, type: "activity", xp_amount: xp, metadata: { activity_id: ACTIVITY_ID } }),
      }).catch(() => {});

      setSaving(false);
      setCorrectIds(newCorrect);
      onXPEarned(xp);
      setPhase("result");
    }
  }, [selected, qIndex, correctIds, userId, onXPEarned]);

  const q = QUESTIONS[qIndex];
  const timerPct = (timeLeft / TIME_PER_Q) * 100;
  const timerColor = timeLeft > 10 ? "bg-cyan-500" : timeLeft > 5 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-teal-600 px-6 pt-5 pb-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Cpu size={18} />
              <span className="font-bold text-sm">Quiz Técnico</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <X size={14} />
            </button>
          </div>
          {phase === "question" && (
            <p className="text-cyan-100 text-xs">{qIndex + 1} / {QUESTIONS.length}</p>
          )}
        </div>

        <div className="p-6">

          {/* ── INTRO ─────────────────────────────────────── */}
          {phase === "intro" && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mx-auto">
                <Cpu size={32} className="text-cyan-600" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold mb-2">Quiz de Conocimiento Técnico</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  8 preguntas sobre electricidad, programación, automatización y más.<br />
                  Tienes <strong>20 segundos</strong> por pregunta. Sabrás si acertaste al instante.
                </p>
              </div>
              <div className="flex justify-center gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Clock size={14} className="text-cyan-500" /> 20 seg / pregunta</span>
                <span className="flex items-center gap-1.5"><Zap size={14} className="text-amber-500" /> Hasta 60 XP</span>
              </div>
              <button
                onClick={startQuiz}
                className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl transition-colors"
              >
                Comenzar Quiz
              </button>
            </div>
          )}

          {/* ── ALREADY DONE ──────────────────────────────── */}
          {phase === "already_done" && (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="mx-auto text-emerald-500" />
              <h2 className="text-xl font-extrabold">Ya completaste este quiz</h2>
              <p className="text-slate-500 text-sm">Tu puntuación anterior: <strong>{prevScore}%</strong></p>
              <button onClick={onClose} className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors">
                Cerrar
              </button>
            </div>
          )}

          {/* ── QUESTION ──────────────────────────────────── */}
          {phase === "question" && (
            <div className="space-y-5">
              {/* Timer bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-500">Tiempo restante</span>
                  <span className={`font-bold ${timeLeft <= 5 ? "text-red-500" : "text-slate-600"}`}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${timerColor} rounded-full transition-all duration-1000`}
                    style={{ width: `${timerPct}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="bg-slate-50 rounded-2xl p-5">
                <p className="font-bold text-sm leading-relaxed text-slate-800">{q.text}</p>
              </div>

              {/* Choices */}
              <div className="space-y-2.5">
                {q.choices.map((c) => {
                  const isCorrect  = c.id === q.correct;
                  const isSelected = c.id === selected;

                  let style = "border-slate-200 bg-white hover:bg-slate-50 hover:border-cyan-300";
                  if (revealed) {
                    if (isCorrect)             style = "border-emerald-400 bg-emerald-50 text-emerald-800";
                    else if (isSelected)       style = "border-red-400 bg-red-50 text-red-800";
                    else                       style = "border-slate-100 bg-white text-slate-400";
                  }

                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c.id)}
                      disabled={revealed}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-between gap-3 ${style}`}
                    >
                      <span>{c.text}</span>
                      {revealed && isCorrect  && <CheckCircle size={16} className="shrink-0 text-emerald-600" />}
                      {revealed && isSelected && !isCorrect && <XCircle size={16} className="shrink-0 text-red-500" />}
                    </button>
                  );
                })}
              </div>

              {/* Hint + Next */}
              {revealed && (
                <div className="space-y-3 animate-fade-in-up">
                  <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 leading-relaxed">
                    <strong className="text-blue-700">Dato:</strong> {q.hint}
                  </p>
                  <button
                    onClick={handleNext}
                    disabled={saving}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : (
                      <>{qIndex < QUESTIONS.length - 1 ? "Siguiente pregunta" : "Ver resultados"} <ChevronRight size={16} /></>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── RESULT ────────────────────────────────────── */}
          {phase === "result" && (
            <div className="text-center space-y-5">
              <div>
                {correctIds.size >= 6
                  ? <Trophy size={48} className="mx-auto text-amber-500" />
                  : <Cpu size={48} className="mx-auto text-cyan-400" />}
              </div>
              <div>
                <h2 className="text-xl font-extrabold mb-1">Quiz completado</h2>
                <p className="text-4xl font-black text-cyan-600 my-3">{correctIds.size} / {QUESTIONS.length}</p>
                <p className="text-slate-500 text-sm">
                  {correctIds.size >= 7 && "¡Resultado sobresaliente! Dominas los conceptos técnicos."}
                  {correctIds.size >= 5 && correctIds.size < 7 && "Buen resultado. Sigue reforzando los temas que fallaste."}
                  {correctIds.size >= 3 && correctIds.size < 5 && "Resultado aceptable. Hay áreas con potencial de mejora."}
                  {correctIds.size < 3 && "Hay oportunidades de mejora. Estudia los conceptos y vuelve a intentarlo."}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 inline-block">
                <p className="text-sm font-bold text-amber-700">
                  <Zap size={14} className="inline mr-1 mb-0.5" />
                  +{xpForCorrect(correctIds.size)} XP ganados
                </p>
              </div>

              {/* Per-question breakdown */}
              <div className="grid grid-cols-8 gap-1.5 max-w-xs mx-auto">
                {QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 rounded-full ${correctIds.has(i) ? "bg-emerald-400" : "bg-red-300"}`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400">Respuestas correctas (verde) e incorrectas (rojo)</p>

              <button onClick={onClose} className="px-10 py-3 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-700 transition-colors">
                Cerrar
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
