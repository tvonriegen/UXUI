import Link from "next/link";
import { requireAccountType } from "@/lib/auth-server";
import { createOpportunityFromForm } from "@/app/actions/opportunities";
import PageLayout from "@/components/layout/PageLayout";

export default async function NewExternalJobPage() {
  await requireAccountType("external");

  return (
    <PageLayout><section className="min-h-full bg-cl-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/external/jobs" className="text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700">Volver a mis encargos</Link>
        <div className="mt-6"><p className="mb-1 text-xs font-bold uppercase tracking-widest text-sky-600">Oportunidades</p><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Publicar encargo freelance</h1><p className="mt-1 text-sm text-slate-500">Comparte el resultado que necesitas. La publicación quedará asociada a tu cuenta externa.</p></div>
        <form action={createOpportunityFromForm} className="mt-6 grid gap-5 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm sm:p-6">
          <input type="hidden" name="opportunityType" value="freelance" />
          <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">Título<input name="title" required maxLength={160} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder="Ej. Automatizar reportes de inventario" /></label>
          <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">Descripción<textarea name="description" required minLength={20} maxLength={5000} rows={6} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder="Describe el alcance, entregables y contexto." /></label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">Especialidad<input name="specialty" maxLength={100} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder="Mecatrónica, software..." /></label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">Ubicación<input name="location" defaultValue="Remoto" maxLength={160} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">Mínimo<input name="compensationMin" type="number" min="0" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">Máximo<input name="compensationMax" type="number" min="0" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">Cierre<input name="closesAt" type="date" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
          </div>
          <button type="submit" className="mt-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-700">Publicar encargo</button>
        </form>
      </div>
    </section></PageLayout>
  );
}
