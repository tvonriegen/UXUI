import Link from "next/link";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";

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
    <main className="min-h-screen bg-amber-50 px-6 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-bold text-amber-800">TalentHub</Link>
        <div className="mt-20 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">Encargos freelance</p>
          <h1 className="mt-4 text-5xl font-black tracking-tight">Servicios tecnicos para necesidades reales.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">Encargos publicados por clientes externos con alcance, especialidad y condiciones claras.</p>
          <div className="mt-8 flex gap-3"><Link href="/register" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Registrarme como Externo</Link><Link href="/explore/students" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold">Explorar talento</Link></div>
        </div>
        <div className="mt-16 grid gap-4 md:grid-cols-2">
          {opportunities.map((opportunity) => (
            <Link key={opportunity.id} href={`/freelance/${opportunity.id}`} className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">{opportunity.specialty || "Servicio técnico"}</p>
              <h2 className="mt-3 text-2xl font-black">{opportunity.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{opportunity.description}</p>
              <p className="mt-5 text-sm font-bold text-slate-900">{opportunity.location || "Remoto"}</p>
            </Link>
          ))}
          {!opportunities.length && <p className="rounded-3xl border border-dashed border-amber-300 p-8 text-slate-600">Aún no hay encargos publicados.</p>}
        </div>
      </div>
    </main>
  );
}
