"use client";

import { useEffect, useRef } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    if (typeof window !== "undefined" && (window as any).__sentry__) {
      console.error("[TalentHub Global Error]", error);
    }
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <main className="flex min-h-screen items-center justify-center p-4">
          <section
            aria-labelledby="global-error-title"
            className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-lg"
          >
            <div aria-hidden="true" className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
              !
            </div>
            <div role="alert" aria-live="assertive">
              <h1 ref={headingRef} id="global-error-title" tabIndex={-1} className="mb-2 text-xl font-extrabold outline-none">
                Ups, estamos solucionándolo
              </h1>
              <p className="mb-6 text-sm leading-relaxed text-slate-600">
                TalentHub encontró un problema inesperado. No necesitas realizar ninguna acción técnica.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-xl bg-sky-700 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-sky-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
              >
                Intentar nuevamente
              </button>
              <a href="/" className="rounded-xl px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2">
                Volver al inicio
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
