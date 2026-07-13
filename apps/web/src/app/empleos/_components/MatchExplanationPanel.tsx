"use client";

import {
  Sparkles,
  GraduationCap,
  Wrench,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  getMatchColor,
  type ExplainableMatchResult,
  type ExplainableMatchFactor,
} from "@/lib/utils/matching";

interface MatchExplanationPanelProps {
  explanation: ExplainableMatchResult;
}

const factorMeta = {
  specialty: {
    icon: GraduationCap,
    title: "Especialidad",
    max: 40,
    ariaLabel: "puntos por especialidad",
  },
  skills: {
    icon: Wrench,
    title: "Competencias",
    max: 50,
    ariaLabel: "puntos por competencias",
  },
  practice: {
    icon: Briefcase,
    title: "Práctica / Pasantía",
    max: 10,
    ariaLabel: "puntos por práctica o pasantía",
  },
} as const;

type FactorMeta = (typeof factorMeta)[keyof typeof factorMeta];

const scoreColorMap: Record<
  ReturnType<typeof getMatchColor>,
  {
    border: string;
    bg: string;
    iconBg: string;
    text: string;
    bar: string;
  }
> = {
  emerald: {
    border: "border-emerald-100",
    bg: "bg-emerald-50/40",
    iconBg: "bg-emerald-100",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
  },
  cyan: {
    border: "border-cyan-100",
    bg: "bg-cyan-50/40",
    iconBg: "bg-cyan-100",
    text: "text-cyan-700",
    bar: "bg-cyan-500",
  },
  amber: {
    border: "border-amber-100",
    bg: "bg-amber-50/40",
    iconBg: "bg-amber-100",
    text: "text-amber-700",
    bar: "bg-amber-500",
  },
  slate: {
    border: "border-slate-100",
    bg: "bg-slate-50/40",
    iconBg: "bg-slate-100",
    text: "text-slate-700",
    bar: "bg-slate-400",
  },
};

const statusColorMap: Record<
  ExplainableMatchFactor["status"],
  {
    iconBg: string;
    iconText: string;
    border: string;
    bar: string;
  }
> = {
  matched: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    border: "border-emerald-100",
    bar: "bg-emerald-500",
  },
  partial: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    border: "border-amber-100",
    bar: "bg-amber-500",
  },
  missing: {
    iconBg: "bg-slate-100",
    iconText: "text-slate-500",
    border: "border-slate-100",
    bar: "bg-slate-300",
  },
};

function FactorRow({
  meta,
  factor,
  skills,
}: {
  meta: FactorMeta;
  factor: ExplainableMatchFactor;
  skills?: ExplainableMatchResult["factors"]["skills"];
}) {
  const hasDuplicate = skills?.matchedSkills.some((s) => s.count > 1) ?? false;
  const Icon = meta.icon;
  const colors = statusColorMap[factor.status];
  const percentage = Math.min((factor.awarded / meta.max) * 100, 100);

  return (
    <div
      className={`flex items-start gap-3 bg-white/70 rounded-xl border p-3 ${colors.border}`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colors.iconBg} ${colors.iconText}`}
      >
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-700">{meta.title}</p>
          <span className="text-[11px] font-extrabold text-slate-600 shrink-0">
            +{factor.awarded}/{meta.max}
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={meta.max}
          aria-valuenow={factor.awarded}
          aria-label={`${meta.title}: ${factor.awarded} de ${meta.max} ${meta.ariaLabel}`}
          className="h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5"
        >
          <div
            className={`h-full ${colors.bar}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className="text-[11px] text-slate-500 leading-snug mt-1.5">
          {factor.explanation}
        </p>

        {skills && skills.matchedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {skills.matchedSkills.map((skill) => (
              <span
                key={skill.name}
                className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full"
              >
                {skill.name}
                {skill.count > 1 && ` ×${skill.count}`}
              </span>
            ))}
            {hasDuplicate && (
              <span className="text-[10px] text-slate-400 italic self-center">
                Algunas habilidades aparecen más de una vez en tu perfil; se
                contaron hasta el tope de puntos.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MatchExplanationPanel({
  explanation,
}: MatchExplanationPanelProps) {
  const { total, label, factors, guidance } = explanation;
  const colors = scoreColorMap[getMatchColor(total)];

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (factors.specialty.status === "matched") {
    strengths.push("Tu especialidad coincide con lo que busca la vacante.");
  } else if (factors.specialty.status === "partial") {
    improvements.push(factors.specialty.explanation);
  } else {
    improvements.push(
      "Completa tu especialidad en el perfil para recibir una comparación más precisa."
    );
  }

  if (factors.skills.status === "matched") {
    strengths.push(
      `${factors.skills.matchedCount} competencias de tu perfil se reconocen en esta vacante.`
    );
  } else if (factors.skills.status === "partial") {
    improvements.push(
      "Alcanzaste el tope de puntos por competencias; añadir más no subirá este puntaje."
    );
  } else {
    improvements.push(
      "Puedes fortalecer tu candidatura añadiendo competencias relacionadas con la vacante."
    );
  }

  if (factors.practice.status === "matched") {
    strengths.push("La vacante menciona práctica profesional o pasantía.");
  } else {
    improvements.push(
      "La vacante no indica práctica o pasantía; revisa la descripción para más detalles."
    );
  }

  return (
    <div
      className={`rounded-2xl border p-5 space-y-4 ${colors.border} ${colors.bg}`}
    >
      {/* Score + meaning */}
      <div className="flex items-center gap-3">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${colors.iconBg} ${colors.text}`}
        >
          <Sparkles size={22} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold leading-none ${colors.text}`}>
              {total}
            </span>
            <span className="text-sm font-semibold text-slate-500">/ 100</span>
          </div>
          <p className={`text-sm font-bold mt-0.5 ${colors.text}`}>{label}</p>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            {guidance}
          </p>
        </div>
      </div>

      {/* Total progress bar */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={total}
        aria-label={`Compatibilidad total: ${total} de 100 puntos, nivel ${label}`}
        className="h-2.5 bg-white/60 rounded-full overflow-hidden"
      >
        <div
          className={`h-full ${colors.bar}`}
          style={{ width: `${Math.min(total, 100)}%` }}
        />
      </div>

      {/* Factor rows */}
      <div className="space-y-2">
        <FactorRow meta={factorMeta.specialty} factor={factors.specialty} />
        <FactorRow
          meta={factorMeta.skills}
          factor={factors.skills}
          skills={factors.skills}
        />
        <FactorRow meta={factorMeta.practice} factor={factors.practice} />
      </div>

      {/* Strengths / improvements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {strengths.length > 0 && (
          <div className="bg-white/60 rounded-xl border border-emerald-100 p-3">
            <p className="text-[11px] font-bold text-emerald-700 mb-1.5 flex items-center gap-1">
              <CheckCircle2 size={12} aria-hidden="true" /> Fortalezas
            </p>
            <ul className="space-y-1">
              {strengths.map((item, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-slate-600 leading-snug flex items-start gap-1.5"
                >
                  <span className="text-emerald-500 mt-0.5" aria-hidden="true">
                    •
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {improvements.length > 0 && (
          <div className="bg-white/60 rounded-xl border border-amber-100 p-3">
            <p className="text-[11px] font-bold text-amber-700 mb-1.5 flex items-center gap-1">
              <AlertCircle size={12} aria-hidden="true" /> Puedes fortalecer
            </p>
            <ul className="space-y-1">
              {improvements.map((item, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-slate-600 leading-snug flex items-start gap-1.5"
                >
                  <span className="text-amber-500 mt-0.5" aria-hidden="true">
                    •
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Transparency note */}
      <p className="text-[10px] text-slate-400 flex items-start gap-1.5">
        <Info size={12} className="shrink-0 mt-0.5" aria-hidden="true" />
        Este porcentaje es orientativo. La empresa evalúa otros antecedentes y
        criterios propios al revisar tu postulación.
      </p>
    </div>
  );
}
