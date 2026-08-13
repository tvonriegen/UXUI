import Link from "next/link";
import { ArrowRight, CheckCircle2, GraduationCap, ShieldCheck } from "lucide-react";
import PublicShell from "@/components/layout/PublicShell";

export default function ExplorePage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl animate-fade-in-up">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">Explorar</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Conoce talento técnico con respaldo.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-500">Revisa perfiles públicos, especialidades y evidencias verificadas sin acceder a datos privados.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/explore/students" className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-800">Explorar estudiantes <ArrowRight size={16} /></Link>
            <Link href="/freelance" className="inline-flex rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-sky-200 hover:text-sky-700">Ver encargos freelance</Link>
          </div>
        </div>
        <section className="mt-14 grid gap-4 md:grid-cols-3" aria-label="Cómo funciona TalentHub">
          <article className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up stagger-1"><GraduationCap className="text-sky-700" /><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">01</p><h2 className="mt-2 text-xl font-extrabold">Talento visible</h2><p className="mt-2 text-sm leading-6 text-slate-500">Los estudiantes deciden qué mostrar y pueden respaldar sus competencias con evidencia.</p></article>
          <article className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up stagger-2"><CheckCircle2 className="text-emerald-700" /><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">02</p><h2 className="mt-2 text-xl font-extrabold">Oportunidades claras</h2><p className="mt-2 text-sm leading-6 text-slate-500">Empresas y clientes publican necesidades con alcance, especialidad y condiciones concretas.</p></article>
          <article className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up stagger-3"><ShieldCheck className="text-amber-700" /><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">03</p><h2 className="mt-2 text-xl font-extrabold">Acompañamiento</h2><p className="mt-2 text-sm leading-6 text-slate-500">Los colegios acompañan las experiencias de sus estudiantes cuando la relación lo requiere.</p></article>
        </section>
      </section>
    </PublicShell>
  );
}
