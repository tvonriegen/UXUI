import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentAccount, requireAccountType } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import PageLayout from "@/components/layout/PageLayout";

export default async function ExternalJobsPage() {
  await requireAccountType("external");
  const account = await getCurrentAccount();
  if (!account) return null;
  const supabase = createServerSupabaseClient(await cookies() as any); // eslint-disable-line
  const { data } = await supabase.from("opportunities").select("*").eq("publisher_id", account.id).order("created_at", { ascending: false });
  const opportunities = (data ?? []) as Opportunity[];

  return (
    <PageLayout><section className="min-h-full bg-slate-950 px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/external/dashboard" className="text-sm font-bold text-sky-300">Volver al espacio externo</Link>
        <div className="mt-16 flex flex-wrap items-end justify-between gap-5">
          <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">Oportunidades</p><h1 className="mt-3 text-4xl font-black">Mis encargos</h1></div>
          <Link href="/external/jobs/new" className="rounded-full bg-sky-400 px-5 py-3 text-sm font-bold text-slate-950">Publicar encargo</Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {opportunities.map((opportunity) => (
            <article key={opportunity.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">{opportunity.status}</span><span className="text-xs text-slate-400">{opportunity.location}</span></div>
              <h2 className="mt-4 text-2xl font-black">{opportunity.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">{opportunity.description}</p>
            </article>
          ))}
          {!opportunities.length && <p className="rounded-3xl border border-dashed border-white/20 p-8 text-slate-400">Todavía no tienes encargos publicados.</p>}
        </div>
      </div>
    </section></PageLayout>
  );
}
