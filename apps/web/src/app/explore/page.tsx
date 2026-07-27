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
          <Link href="/explore/students" className="mt-8 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Explorar estudiantes</Link>
        </div>
      </div>
    </main>
  );
}
