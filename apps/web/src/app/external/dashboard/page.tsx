import Link from "next/link";
import { requireAccountType } from "@/lib/auth-server";
import PageLayout from "@/components/layout/PageLayout";

export default async function ExternalDashboardPage() {
  const account = await requireAccountType("external");
  return (
    <PageLayout><section className="min-h-full bg-slate-950 px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">Espacio externo</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Hola, {account.name}</h1>
        <p className="mt-4 max-w-xl text-slate-300">Publica encargos freelance, conserva el control de tus oportunidades y recibe propuestas de talento técnico.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/external/jobs/new" className="rounded-full bg-sky-400 px-5 py-3 text-sm font-bold text-slate-950">Publicar encargo</Link>
          <Link href="/external/jobs" className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold">Mis encargos</Link>
          <Link href="/external/proposals" className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold">Propuestas</Link>
        </div>
      </div>
    </section></PageLayout>
  );
}
