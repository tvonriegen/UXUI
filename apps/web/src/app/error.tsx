"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    // Log to error tracking in production
    if (typeof window !== "undefined" && (window as any).__sentry__) {
      console.error("[TalentHub Error]", error);
    }
  }, [error]);

  return (
    <main className="min-h-screen bg-cl-surface flex items-center justify-center p-4">
      <section aria-labelledby="page-error-title" className="max-w-md w-full bg-white rounded-3xl border border-red-100 shadow-lg p-8 text-center animate-scale-in">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} className="text-red-500" />
        </div>
        <div role="alert" aria-live="assertive">
          <h1 ref={headingRef} id="page-error-title" tabIndex={-1} className="text-xl font-extrabold mb-2 outline-none">Ups, algo salió mal</h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Estamos trabajando para solucionarlo. Puedes intentar nuevamente sin perderte en detalles técnicos.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 bg-sky-700 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-sky-800 transition-colors btn-press focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
          >
            <RefreshCw size={16} /> Intentar nuevamente
          </button>
          <Link href="/" className="rounded-xl px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2">
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
