import Link from "next/link";
import type { ReactNode } from "react";

interface PublicShellProps {
  children: ReactNode;
  contentClassName?: string;
}

export default function PublicShell({
  children,
  contentClassName = "",
}: PublicShellProps) {
  return (
    <div className="min-h-screen bg-cl-surface text-slate-900">
      <header className="relative z-10 border-b border-slate-200/60 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-5 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-black text-white shadow-sm transition-transform group-hover:scale-105">
              TH
            </span>
            <span className="hidden text-lg font-bold tracking-tight text-slate-900 sm:block">
              Talent<span className="text-indigo-600">Hub</span>
            </span>
          </Link>

          <nav aria-label="Navegación pública" className="hidden items-center gap-1 md:flex">
            <Link href="/explore" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800">
              Explorar talento
            </Link>
            <Link href="/freelance" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800">
              Encargos
            </Link>
            <Link href="/how-it-works" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800">
              Cómo funciona
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
              Ingresar
            </Link>
            <Link href="/register" className="hidden items-center rounded-xl bg-sky-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-600 sm:inline-flex">
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      <main className={contentClassName}>{children}</main>

      <footer className="border-t border-slate-200/60 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-slate-400 sm:px-6 lg:px-8">
          <span>TalentHub © 2026</span>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="transition-colors hover:text-sky-600">Privacidad</Link>
            <Link href="/terms" className="transition-colors hover:text-sky-600">Términos</Link>
            <Link href="/how-it-works" className="transition-colors hover:text-sky-600">Cómo funciona</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
