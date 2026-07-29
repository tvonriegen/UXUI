import Link from "next/link";
import { requireAccountType } from "@/lib/auth-server";
import PageLayout from "@/components/layout/PageLayout";

export default async function ExternalDashboardPage() {
  const account = await requireAccountType("external");
  return (
    <PageLayout><section className="min-h-full bg-cl-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-sky-700 p-6 text-white shadow-sm animate-fade-in-up md:p-8">
          <div className="hero-pattern absolute inset-0 opacity-10" />
          <div className="relative">
            <p className="mb-1 text-sm font-medium text-sky-100">Espacio externo</p>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Hola, {account.name}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">Publica encargos freelance, conserva el control de tus oportunidades y recibe propuestas de talento técnico.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/external/jobs/new" className="rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/30">Publicar encargo</Link>
              <Link href="/external/jobs" className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10">Mis encargos</Link>
              <Link href="/external/proposals" className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10">Propuestas</Link>
            </div>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Link href="/external/jobs" className="card-interactive rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-600">Oportunidades</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">Mis encargos</h2>
            <p className="mt-1 text-sm text-slate-500">Revisa y administra tus publicaciones.</p>
          </Link>
          <Link href="/external/proposals" className="card-interactive rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-600">Postulaciones</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">Propuestas recibidas</h2>
            <p className="mt-1 text-sm text-slate-500">Evalúa el talento interesado en tus encargos.</p>
          </Link>
          <Link href="/external/profile" className="card-interactive rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Cuenta</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">Tu perfil</h2>
            <p className="mt-1 text-sm text-slate-500">Mantén actualizado el contexto de tu cuenta.</p>
          </Link>
        </div>
      </div>
    </section></PageLayout>
  );
}
