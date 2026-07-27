import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-4xl"><Link href="/" className="text-sm font-bold text-sky-700">TalentHub</Link><h1 className="mt-20 text-5xl font-black tracking-tight">Como funciona</h1><div className="mt-10 grid gap-5 md:grid-cols-3"><div className="rounded-3xl bg-slate-100 p-6"><b>1. Construye</b><p className="mt-3 text-sm leading-6 text-slate-600">Presenta tus habilidades, proyectos y evidencias.</p></div><div className="rounded-3xl bg-slate-100 p-6"><b>2. Valida</b><p className="mt-3 text-sm leading-6 text-slate-600">Tu colegio puede respaldar competencias y evidencias.</p></div><div className="rounded-3xl bg-slate-100 p-6"><b>3. Conecta</b><p className="mt-3 text-sm leading-6 text-slate-600">Explora oportunidades y aplica con recomendaciones claras.</p></div></div></div>
    </main>
  );
}
