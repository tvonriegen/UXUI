import Link from "next/link";
import { getCurrentAccount } from "@/lib/auth-server";
import { ArrowRight, BriefcaseBusiness, ShieldCheck, Users } from "lucide-react";

export default async function HomePage() {
  const account = await getCurrentAccount();
  if (account) {
    const { redirect } = await import("next/navigation");
    redirect(account.dashboardPath);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-6 py-8 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">Talent<span className="text-sky-400">Hub</span></Link>
          <Link href="/login" className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10">Ingresar</Link>
        </header>

        <div className="grid gap-12 py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.24em] text-sky-300">ImpulsaTec</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-tight sm:text-7xl">
              Talento tecnico con respaldo real.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              TalentHub conecta estudiantes, colegios, empresas y clientes externos con evidencia verificable y privacidad por diseno.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/explore" className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-sky-300">
                Explorar talento <ArrowRight size={16} />
              </Link>
              <Link href="/how-it-works" className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold hover:bg-white/10">Como funciona</Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6"><Users className="mb-6 text-sky-300" /><h2 className="font-bold">Perfiles con evidencia</h2><p className="mt-2 text-sm leading-6 text-slate-400">Competencias y proyectos con validacion institucional.</p></div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6"><BriefcaseBusiness className="mb-6 text-emerald-300" /><h2 className="font-bold">Oportunidades claras</h2><p className="mt-2 text-sm leading-6 text-slate-400">Empleos, practicas y encargos con matching explicable.</p></div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6"><ShieldCheck className="mb-6 text-amber-300" /><h2 className="font-bold">Privacidad por diseno</h2><p className="mt-2 text-sm leading-6 text-slate-400">La mediacion escolar protege especialmente a menores.</p></div>
          </div>
        </div>

        <footer className="flex flex-wrap gap-5 border-t border-white/10 pt-6 text-xs text-slate-500">
          <Link href="/privacy" className="hover:text-white">Privacidad</Link>
          <Link href="/terms" className="hover:text-white">Terminos</Link>
          <Link href="/freelance" className="hover:text-white">Encargos freelance</Link>
        </footer>
      </section>
    </main>
  );
}
