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
    <PageLayout><section className="min-h-full bg-cl-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/external/dashboard" className="text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700">Volver al espacio externo</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-sky-600">Oportunidades</p><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Mis encargos</h1><p className="mt-1 text-sm text-slate-500">Publicaciones freelance asociadas a tu cuenta.</p></div>
          <Link href="/external/jobs/new" className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-700">Publicar encargo</Link>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {opportunities.map((opportunity) => (
            <article key={opportunity.id} className="card-interactive rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-700">{opportunity.status}</span><span className="text-xs text-slate-400">{opportunity.location}</span></div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">{opportunity.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{opportunity.description}</p>
            </article>
          ))}
          {!opportunities.length && <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-400">Todavía no tienes encargos publicados.</p>}
        </div>
      </div>
    </section></PageLayout>
  );
}
