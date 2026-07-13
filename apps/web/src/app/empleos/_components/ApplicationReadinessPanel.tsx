"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  Sparkles,
  ArrowLeft,
  Send,
  Loader2,
  UserCircle,
  UserCog,
} from "lucide-react";
import type {
  ApplicationReadinessResult,
  ReadinessItem,
} from "@/lib/utils/application-readiness";

interface ApplicationReadinessPanelProps {
  readiness: ApplicationReadinessResult;
  isApplying: boolean;
  onSubmit: () => void;
  onBack: () => void;
  autoFocusHeading?: boolean;
  matchScore?: number;
  matchLabel?: string;
}

const itemStyles: Record<
  ReadinessItem["type"],
  {
    container: string;
    iconBg: string;
    iconText: string;
  }
> = {
  complete: {
    container: "border-emerald-100 bg-emerald-50/40",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
  },
  recommended: {
    container: "border-amber-100 bg-amber-50/40",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
  },
  blocking: {
    container: "border-red-100 bg-red-50/40",
    iconBg: "bg-red-100",
    iconText: "text-red-600",
  },
  informational: {
    container: "border-slate-100 bg-slate-50/40",
    iconBg: "bg-slate-100",
    iconText: "text-slate-600",
  },
};

function ItemIcon({ type, status }: { type: ReadinessItem["type"]; status: ReadinessItem["status"] }) {
  if (type === "complete") {
    return <CheckCircle2 size={18} aria-hidden="true" />;
  }
  if (type === "blocking" || status === "error") {
    return <XCircle size={18} aria-hidden="true" />;
  }
  if (type === "recommended" || status === "warning") {
    return <AlertCircle size={18} aria-hidden="true" />;
  }
  if (status === "unknown") {
    return <Info size={18} aria-hidden="true" />;
  }
  return <Info size={18} aria-hidden="true" />;
}

function ReadinessListItem({ item }: { item: ReadinessItem }) {
  const styles = itemStyles[item.type];
  return (
    <li
      className={`flex items-start gap-3 rounded-xl border p-3 ${styles.container}`}
    >
      <div
        className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5 ${styles.iconBg} ${styles.iconText}`}
      >
        <ItemIcon type={item.type} status={item.status} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-700">{item.title}</p>
        <p className="text-xs text-slate-600 leading-snug mt-0.5">
          {item.explanation}
        </p>
        {item.actionLabel && item.type !== "blocking" && (
          <Link
            href="/profile"
            className="inline-flex mt-2 h-12 min-w-12 items-center justify-center px-3 text-xs font-bold text-cyan-700 hover:text-cyan-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded"
          >
            {item.actionLabel}
          </Link>
        )}
      </div>
    </li>
  );
}

export default function ApplicationReadinessPanel({
  readiness,
  isApplying,
  onSubmit,
  onBack,
  autoFocusHeading,
  matchScore,
  matchLabel,
}: ApplicationReadinessPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const score = matchScore;
  const label = matchLabel;

  useEffect(() => {
    if (autoFocusHeading && headingRef.current) {
      headingRef.current.focus();
    }
  }, [autoFocusHeading]);

  const hasBlockers = readiness.blockingIssues.length > 0;
  const hasRecommendations = readiness.recommendations.length > 0;
  const isApplyingBlocker = readiness.blockingIssues.some((item) => item.id === "applying");
  const canShowSubmit = !hasBlockers || isApplyingBlocker;

  return (
    <section
      className="rounded-2xl border border-slate-200/60 bg-white p-5 space-y-4 animate-fade-in-up motion-reduce:animate-none"
      aria-labelledby={headingId}
      aria-busy={isApplying}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
          <UserCircle size={22} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-extrabold text-slate-800 leading-snug outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 rounded"
          >
            Prepara tu postulación
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Revisa tu perfil antes de enviar tu solicitud.
          </p>
        </div>
      </div>

      {/* Live summary */}
      <div
        className={`rounded-xl border px-4 py-3 ${
          hasBlockers
            ? "bg-red-50 border-red-100"
            : readiness.overallState === "ready"
            ? "bg-emerald-50 border-emerald-100"
            : readiness.overallState === "checking"
            ? "bg-slate-50 border-slate-100"
            : "bg-amber-50 border-amber-100"
        }`}
        aria-live="polite"
        aria-atomic="true"
      >
        <p
          className={`text-sm font-semibold ${
            hasBlockers
              ? "text-red-700"
              : readiness.overallState === "ready"
              ? "text-emerald-700"
              : readiness.overallState === "checking"
              ? "text-slate-700"
              : "text-amber-700"
          }`}
        >
          {readiness.summary}
        </p>
      </div>

      {/* Optional match score */}
      {score !== undefined && label !== undefined && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-cyan-600">
            <Sparkles size={18} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">
              Compatibilidad orientativa
            </p>
            <p className="text-sm font-bold text-slate-700">
              {score}% · {label}
            </p>
          </div>
        </div>
      )}

      {/* Items list */}
      <ol className="space-y-2" aria-label="Detalle de preparación">
        {readiness.items.map((item) => (
          <ReadinessListItem key={item.id} item={item} />
        ))}
      </ol>

      {/* Recovery message for blockers */}
      {hasBlockers && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs text-red-700 leading-snug">
            Para continuar, resuelve el bloqueo indicado arriba. Si crees que es
            un error, vuelve al detalle y vuelve a intentarlo.
          </p>
        </div>
      )}

      {/* Transparency note */}
      <p className="text-[10px] text-slate-400 flex items-start gap-1.5">
        <Info size={12} className="shrink-0 mt-0.5" aria-hidden="true" />
        {readiness.transparencyNote}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="h-12 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al detalle
        </button>

        <Link
          href="/profile"
          className="h-12 px-4 py-2.5 rounded-xl text-sm font-bold text-cyan-700 bg-cyan-50 border border-cyan-100 hover:bg-cyan-100 hover:text-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 transition-colors flex items-center justify-center gap-2"
        >
          <UserCog size={16} aria-hidden="true" />
          Mejorar mi perfil
        </Link>

        {canShowSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isApplying || !readiness.canApply}
            aria-busy={isApplying}
            className="h-12 flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 transition-colors flex items-center justify-center gap-2"
          >
            {isApplying ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Enviando…
              </>
            ) : hasRecommendations ? (
              <>
                <Send size={16} aria-hidden="true" />
                Postular de todas formas
              </>
            ) : (
              <>
                <Send size={16} aria-hidden="true" />
                Postular
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
