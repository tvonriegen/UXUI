import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentAccount, requireAccountType } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import PageLayout from "@/components/layout/PageLayout";
import { closeOpportunityFromForm } from "@/app/actions/opportunities";

const STATUS_LABEL = { draft: "Borrador", open: "Abierto", closed: "Cerrado", expired: "Expirado" } as const;

export default async function ExternalJobsPage({ searchParams }: { searchParams?: { error?: string; closed?: string } }) {
  await requireAccountType("external");
  const account = await getCurrentAccount();
  if (!account) return null;
  const supabase = createServerSupabaseClient(await cookies() as any); // eslint-disable-line
  const { data, error } = await supabase.from("opportunities").select("*, opportunity_proposals(count)").eq("publisher_id", account.id).order("created_at", { ascending: false });
  const opportunities = (data ?? []) as unknown as Array<Opportunity & { opportunity_proposals?: { count: number }[] }>;

  return (
    <PageLayout><section className="min-h-full bg-cl-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/external/dashboard" className="text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700">Volver al espacio externo</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-sky-600">Oportunidades</p><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Mis encargos</h1><p className="mt-1 text-sm text-slate-500">Publicaciones freelance asociadas a tu cuenta.</p></div>
          <Link href="/external/jobs/new" className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-700">Publicar encargo</Link>
        </div>
        {(error || searchParams?.error) && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{searchParams?.error ?? "No se pudieron cargar tus encargos."}</p>}
        {searchParams?.closed && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Encargo cerrado correctamente.</p>}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {opportunities.map((opportunity) => (
            <article key={opportunity.id} className="card-interactive rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-700">{STATUS_LABEL[opportunity.status]}</span><span className="text-xs text-slate-500">{opportunity.location}</span></div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">{opportunity.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{opportunity.description}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Link href="/external/proposals" className="text-sm font-bold text-violet-700 hover:underline">{opportunity.opportunity_proposals?.[0]?.count ?? 0} propuestas</Link>
                {opportunity.status === "open" && (
                  <form action={closeOpportunityFromForm}>
                    <input type="hidden" name="opportunityId" value={opportunity.id} />
                    <button type="submit" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">Cerrar encargo</button>
                  </form>
                )}
              </div>
            </article>
          ))}
          {!opportunities.length && <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-400">Todavía no tienes encargos publicados.</p>}
        </div>
      </div>
    </section></PageLayout>
  );
}
