import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import PublicShell from "@/components/layout/PublicShell";

export default function HowItWorksPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl animate-fade-in-up">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">El recorrido TalentHub</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Construye una trayectoria visible y confiable.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-500">Cada paso combina autonomía, validación institucional y oportunidades concretas.</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up stagger-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Sparkles size={21} /></div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">01</p>
            <h2 className="mt-2 text-xl font-extrabold">Construye</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Presenta tus habilidades, proyectos y evidencias en un perfil que crece contigo.</p>
          </article>
          <article className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up stagger-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={21} /></div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">02</p>
            <h2 className="mt-2 text-xl font-extrabold">Valida</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Tu colegio puede respaldar competencias y evidencias para darles contexto real.</p>
          </article>
          <article className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up stagger-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><ShieldCheck size={21} /></div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-violet-600">03</p>
            <h2 className="mt-2 text-xl font-extrabold">Conecta</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Explora oportunidades y aplica con recomendaciones claras y privacidad por diseño.</p>
          </article>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/explore" className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-sky-800">Explorar talento <ArrowRight size={16} /></Link>
          <Link href="/register" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-sky-200 hover:text-sky-700">Crear cuenta</Link>
        </div>
      </section>
    </PublicShell>
  );
}
