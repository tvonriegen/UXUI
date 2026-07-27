import Link from "next/link";

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-bold text-sky-700">TalentHub</Link>
        <div className="mt-16 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-600">Explorar</p>
          <h1 className="mt-4 text-5xl font-black tracking-tight">Conoce talento tecnico con respaldo.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">Revisa perfiles publicos, especialidades y evidencias verificadas sin acceder a datos privados.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/explore/students" className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Explorar estudiantes</Link><Link href="/freelance" className="inline-flex rounded-full border border-slate-300 px-5 py-3 text-sm font-bold">Ver encargos freelance</Link></div>
        </div>
        <section className="mt-20 grid gap-4 md:grid-cols-3" aria-label="Cómo funciona TalentHub">
          <article className="rounded-3xl border border-slate-200 bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600">01</p><h2 className="mt-4 text-xl font-black">Talento visible</h2><p className="mt-2 text-sm leading-6 text-slate-600">Los estudiantes deciden qué mostrar y pueden respaldar sus competencias con evidencia.</p></article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">02</p><h2 className="mt-4 text-xl font-black">Oportunidades claras</h2><p className="mt-2 text-sm leading-6 text-slate-600">Empresas y clientes publican necesidades con alcance, especialidad y condiciones concretas.</p></article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">03</p><h2 className="mt-4 text-xl font-black">Acompañamiento</h2><p className="mt-2 text-sm leading-6 text-slate-600">Los colegios acompañan las experiencias de sus estudiantes cuando la relación lo requiere.</p></article>
        </section>
      </div>
    </main>
  );
}
