import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { submitProposalFromForm, withdrawProposalFromForm } from "@/app/actions/opportunities";
import { getCurrentAccount } from "@/lib/auth-server";
import type { Opportunity } from "@/lib/types";
import TrackAnalyticsEvent from "@/components/analytics/TrackAnalyticsEvent";
import PublicShell from "@/components/layout/PublicShell";

export default async function FreelanceDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { error?: string; submitted?: string; withdrawn?: string } }) {
  const supabase = createServerSupabaseClient(await cookies() as any); // eslint-disable-line
  const { data } = await supabase.from("opportunities").select("*").eq("id", params.id).eq("publisher_type", "external").single();
  if (!data) notFound();
  const opportunity = data as Opportunity;
  const account = await getCurrentAccount();
  const { data: existingProposal } = account?.accountType === "student"
    ? await supabase.from("opportunity_proposals").select("id,status").eq("opportunity_id", opportunity.id).eq("applicant_id", account.id).maybeSingle()
    : { data: null };

  return (
    <PublicShell>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Link href="/freelance" className="text-sm font-bold text-amber-700 hover:text-amber-800">Volver a encargos</Link>
        <article className="mt-8 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">{opportunity.specialty || "Encargo freelance"}</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">{opportunity.title}</h1>
          <p className="mt-5 leading-7 text-slate-600">{opportunity.description}</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-slate-700"><span className="rounded-full bg-amber-50 px-4 py-2 text-amber-700">{opportunity.location || "Remoto"}</span>{opportunity.compensation_max != null && <span className="rounded-full bg-amber-50 px-4 py-2 text-amber-700">Hasta {opportunity.compensation_max}</span>}</div>
          {searchParams?.submitted && <TrackAnalyticsEvent eventName="submit_proposal" />}
          {searchParams?.submitted && <p className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Tu propuesta fue enviada.</p>}
          {searchParams?.withdrawn && <p role="status" className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">Tu propuesta fue retirada.</p>}
          {searchParams?.error && <p className="mt-8 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{searchParams.error}</p>}
          {opportunity.status !== "open" ? (
            <p className="mt-10 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">Este encargo está cerrado y ya no recibe propuestas.</p>
          ) : account?.accountType === "student" && !existingProposal ? (
            <form action={submitProposalFromForm} className="mt-10 grid gap-4 border-t border-slate-100 pt-8">
              <input type="hidden" name="opportunityId" value={opportunity.id} />
              <label className="grid gap-2 text-sm font-bold text-slate-700">Tu propuesta<textarea name="coverLetter" required minLength={20} maxLength={5000} rows={5} className="rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100" placeholder="Cuenta cómo resolverías el encargo y qué entregarías." /></label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Monto propuesto<input name="proposedAmount" type="number" min="0" className="rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100" /></label>
              <button type="submit" className="w-fit rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-800">Enviar propuesta</button>
            </form>
          ) : account?.accountType === "student" && existingProposal ? (
            <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-700">Ya enviaste una propuesta. Estado: {existingProposal.status === "pending" ? "Pendiente" : existingProposal.status === "accepted" ? "Aceptada" : existingProposal.status === "rejected" ? "Rechazada" : "Retirada"}.</p>
              {existingProposal.status === "pending" && (
                <form action={withdrawProposalFromForm} className="mt-3">
                  <input type="hidden" name="proposalId" value={existingProposal.id} />
                  <input type="hidden" name="opportunityId" value={opportunity.id} />
                  <button type="submit" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">Retirar propuesta</button>
                </form>
              )}
            </div>
          ) : account ? (
            <p className="mt-10 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Solo las cuentas de estudiante pueden enviar propuestas.</p>
          ) : (
            <div className="mt-10 flex flex-wrap gap-3"><Link href="/login" className="rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-800">Ingresar para postular</Link><Link href="/register" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-sky-200 hover:text-sky-700">Crear cuenta</Link></div>
          )}
        </article>
      </section>
    </PublicShell>
  );
}
