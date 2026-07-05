"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to error tracking in production
    if (typeof window !== "undefined" && (window as any).__sentry__) {
      console.error("[ClassLink Error]", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-cl-surface flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-red-100 shadow-lg p-8 text-center animate-scale-in">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} className="text-red-500" />
        </div>
        <h1 className="text-xl font-extrabold mb-2">Algo salió mal</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Ocurrió un error inesperado. Por favor, intenta de nuevo. Si el problema persiste, contacta soporte.
        </p>
        {process.env.NODE_ENV === "development" && (
          <details className="text-left mb-4">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">Detalle técnico</summary>
            <pre className="text-xs text-red-600 bg-red-50 p-3 rounded-lg mt-2 overflow-auto max-h-32 whitespace-pre-wrap">{error.message}</pre>
          </details>
        )}
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto bg-cyan-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-cyan-700 transition-colors btn-press"
        >
          <RefreshCw size={16} /> Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
