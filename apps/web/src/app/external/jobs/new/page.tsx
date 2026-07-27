import Link from "next/link";
import { requireAccountType } from "@/lib/auth-server";
import { createOpportunityFromForm } from "@/app/actions/opportunities";

export default async function NewExternalJobPage() {
  await requireAccountType("external");

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/external/jobs" className="text-sm font-bold text-sky-300">Volver a mis encargos</Link>
        <h1 className="mt-16 text-4xl font-black">Publicar encargo freelance</h1>
        <p className="mt-4 text-slate-300">Comparte el resultado que necesitas. La publicación quedará asociada a tu cuenta externa.</p>
        <form action={createOpportunityFromForm} className="mt-10 grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <input type="hidden" name="opportunityType" value="freelance" />
          <label className="grid gap-2 text-sm font-semibold">Título<input name="title" required maxLength={160} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-normal outline-none focus:border-sky-400" placeholder="Ej. Automatizar reportes de inventario" /></label>
          <label className="grid gap-2 text-sm font-semibold">Descripción<textarea name="description" required minLength={20} maxLength={5000} rows={6} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-normal outline-none focus:border-sky-400" placeholder="Describe el alcance, entregables y contexto." /></label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">Especialidad<input name="specialty" maxLength={100} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-normal outline-none focus:border-sky-400" placeholder="Mecatrónica, software..." /></label>
            <label className="grid gap-2 text-sm font-semibold">Ubicación<input name="location" defaultValue="Remoto" maxLength={160} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-normal outline-none focus:border-sky-400" /></label>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold">Mínimo<input name="compensationMin" type="number" min="0" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-normal outline-none focus:border-sky-400" /></label>
            <label className="grid gap-2 text-sm font-semibold">Máximo<input name="compensationMax" type="number" min="0" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-normal outline-none focus:border-sky-400" /></label>
            <label className="grid gap-2 text-sm font-semibold">Cierre<input name="closesAt" type="date" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-normal outline-none focus:border-sky-400" /></label>
          </div>
          <button type="submit" className="mt-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-sky-300">Publicar encargo</button>
        </form>
      </div>
    </main>
  );
}
