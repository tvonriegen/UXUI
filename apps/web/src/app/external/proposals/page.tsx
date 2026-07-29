import Link from "next/link";
import { cookies } from "next/headers";
import { requireAccountType } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { updateProposalStatusFromForm } from "@/app/actions/opportunities";
import PageLayout from "@/components/layout/PageLayout";

export default async function ExternalProposalsPage() {
  const account = await requireAccountType("external");
  const supabase = createServerSupabaseClient(await cookies() as any); // eslint-disable-line
  const { data } = await supabase
    .from("opportunity_proposals")
    .select("id, cover_letter, proposed_amount, status, created_at, applicant_id, opportunities!inner(id, title, publisher_id)")
    .eq("opportunities.publisher_id", account.id)
    .order("created_at", { ascending: false });

  return (
    <PageLayout><section className="min-h-full bg-cl-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/external/dashboard" className="text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700">Volver al espacio externo</Link>
        <div className="mt-6"><p className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-600">Postulaciones</p><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Propuestas recibidas</h1><p className="mt-1 text-sm text-slate-500">Revisa las propuestas enviadas a tus encargos.</p></div>
        <div className="mt-6 grid gap-5">
          {(data ?? []).map((proposal: any) => (
            <article key={proposal.id} className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">{proposal.opportunities?.title ?? "Encargo"}</h2><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-700">{proposal.status}</span></div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{proposal.cover_letter}</p>
              {proposal.proposed_amount != null && <p className="mt-3 text-sm font-bold text-slate-700">Monto propuesto: {proposal.proposed_amount}</p>}
              {proposal.status === "pending" && <div className="mt-5 flex gap-3"><form action={updateProposalStatusFromForm}><input type="hidden" name="proposalId" value={proposal.id} /><input type="hidden" name="status" value="accepted" /><button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700">Aceptar</button></form><form action={updateProposalStatusFromForm}><input type="hidden" name="proposalId" value={proposal.id} /><input type="hidden" name="status" value="rejected" /><button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">Rechazar</button></form></div>}
            </article>
          ))}
          {!data?.length && <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-400">Todavía no has recibido propuestas.</p>}
        </div>
      </div>
    </section></PageLayout>
  );
}
