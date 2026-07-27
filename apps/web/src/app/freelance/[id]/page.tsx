import Link from "next/link";

export default function FreelanceDetailPage() {
  return (
    <main className="min-h-screen bg-amber-50 px-6 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/freelance" className="text-sm font-bold text-amber-800">Volver a encargos</Link>
        <div className="mt-16 rounded-[2rem] border border-amber-200 bg-white p-8 sm:p-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">Encargo freelance</p>
          <h1 className="mt-4 text-4xl font-black">Detalle disponible proximamente</h1>
          <p className="mt-5 leading-7 text-slate-600">La publicacion de encargos y la recepcion de propuestas se habilitaran sobre el modelo comun de oportunidades.</p>
        </div>
      </div>
    </main>
  );
}
