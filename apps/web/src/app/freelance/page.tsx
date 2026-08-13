import Link from "next/link";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import PublicShell from "@/components/layout/PublicShell";

export default async function FreelancePage() {
  const supabase = createServerSupabaseClient(await cookies() as any); // eslint-disable-line
  const { data } = await supabase
    .from("opportunities")
    .select("*")
    .eq("publisher_type", "external")
    .eq("opportunity_type", "freelance")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  const opportunities = (data ?? []) as Opportunity[];

  return (
    <PublicShell>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl animate-fade-in-up">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">Encargos freelance</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Servicios técnicos para necesidades reales.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-500">Encargos publicados por clientes externos con alcance, especialidad y condiciones claras.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-800">Registrarme como Externo</Link><Link href="/explore/students" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-sky-200 hover:text-sky-700">Explorar talento</Link></div>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {opportunities.map((opportunity, index) => (
            <Link key={opportunity.id} href={`/freelance/${opportunity.id}`} className={`rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">{opportunity.specialty || "Servicio técnico"}</p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">{opportunity.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{opportunity.description}</p>
              <p className="mt-5 text-sm font-bold text-slate-700">{opportunity.location || "Remoto"}</p>
            </Link>
          ))}
          {!opportunities.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-500">Aún no hay encargos publicados.</p>}
        </div>
      </section>
    </PublicShell>
  );
}
