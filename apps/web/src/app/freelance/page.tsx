import Link from "next/link";

export default function FreelancePage() {
  return (
    <main className="min-h-screen bg-amber-50 px-6 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-bold text-amber-800">TalentHub</Link>
        <div className="mt-20 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">Encargos freelance</p>
          <h1 className="mt-4 text-5xl font-black tracking-tight">Servicios tecnicos para necesidades reales.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">Los encargos freelance publicos formaran parte del modelo comun de oportunidades. Esta entrada ya esta disponible para visitantes y se conectara al flujo de propuestas en la Fase 6.</p>
          <div className="mt-8 flex gap-3"><Link href="/register" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Registrarme como Externo</Link><Link href="/explore/students" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold">Explorar talento</Link></div>
        </div>
      </div>
    </main>
  );
}
