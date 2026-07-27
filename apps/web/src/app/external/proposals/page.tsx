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
    <PageLayout><section className="min-h-full bg-slate-950 px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/external/dashboard" className="text-sm font-bold text-sky-300">Volver al espacio externo</Link>
        <h1 className="mt-16 text-4xl font-black">Propuestas recibidas</h1>
        <div className="mt-10 grid gap-4">
          {(data ?? []).map((proposal: any) => (
            <article key={proposal.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">{proposal.opportunities?.title ?? "Encargo"}</h2><span className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">{proposal.status}</span></div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">{proposal.cover_letter}</p>
              {proposal.proposed_amount != null && <p className="mt-4 text-sm font-bold text-slate-200">Monto propuesto: {proposal.proposed_amount}</p>}
              {proposal.status === "pending" && <div className="mt-6 flex gap-3"><form action={updateProposalStatusFromForm}><input type="hidden" name="proposalId" value={proposal.id} /><input type="hidden" name="status" value="accepted" /><button className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950">Aceptar</button></form><form action={updateProposalStatusFromForm}><input type="hidden" name="proposalId" value={proposal.id} /><input type="hidden" name="status" value="rejected" /><button className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold">Rechazar</button></form></div>}
            </article>
          ))}
          {!data?.length && <p className="rounded-3xl border border-dashed border-white/20 p-8 text-slate-400">Todavía no has recibido propuestas.</p>}
        </div>
      </div>
    </section></PageLayout>
  );
}
