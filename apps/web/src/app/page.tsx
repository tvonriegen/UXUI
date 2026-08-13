import Link from "next/link";
import { getCurrentAccount } from "@/lib/auth-server";
import { ArrowRight, BriefcaseBusiness, ShieldCheck, Users } from "lucide-react";
import PublicShell from "@/components/layout/PublicShell";

export default async function HomePage() {
  const account = await getCurrentAccount();
  if (account) {
    const { redirect } = await import("next/navigation");
    redirect(account.dashboardPath);
  }

  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div className="animate-fade-in-up">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.24em] text-sky-700">ImpulsaTec</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-tight text-slate-900 sm:text-7xl">
              Talento técnico con respaldo real.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-500">
              TalentHub conecta estudiantes, colegios, empresas y clientes externos con evidencia verificable y privacidad por diseño.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/explore" className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-800">
                Explorar talento <ArrowRight size={16} />
              </Link>
              <Link href="/how-it-works" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-sky-200 hover:text-sky-700">
                Cómo funciona
              </Link>
            </div>
          </div>

          <div className="relative grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div aria-hidden="true" className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-100 blur-3xl" />
            <div className="relative rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up stagger-1">
              <Users className="mb-6 text-sky-500" />
              <h2 className="font-bold text-slate-900">Perfiles con evidencia</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Competencias y proyectos con validación institucional.</p>
            </div>
            <div className="relative rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up stagger-2">
              <BriefcaseBusiness className="mb-6 text-emerald-500" />
              <h2 className="font-bold text-slate-900">Oportunidades claras</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Empleos, prácticas y encargos con matching explicable.</p>
            </div>
            <div className="relative rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up stagger-3">
              <ShieldCheck className="mb-6 text-amber-500" />
              <h2 className="font-bold text-slate-900">Privacidad por diseño</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">La mediación escolar protege especialmente a menores.</p>
            </div>
          </div>
        </div>

        <div className="relative mt-16 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-700 via-indigo-700 to-sky-800 p-6 text-white shadow-lg shadow-sky-200/60 sm:p-8">
          <div className="hero-pattern absolute inset-0 opacity-10" aria-hidden="true" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-100">Un espacio para cada recorrido</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Construye, valida y conecta.</h2>
            </div>
            <Link href="/register" className="inline-flex w-fit rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 transition-colors hover:bg-sky-50">
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
