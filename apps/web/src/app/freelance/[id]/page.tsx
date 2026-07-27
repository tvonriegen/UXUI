import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";

export default async function FreelanceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient(await cookies() as any); // eslint-disable-line
  const { data } = await supabase.from("opportunities").select("*").eq("id", params.id).eq("publisher_type", "external").single();
  if (!data) notFound();
  const opportunity = data as Opportunity;

  return (
    <main className="min-h-screen bg-amber-50 px-6 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/freelance" className="text-sm font-bold text-amber-800">Volver a encargos</Link>
        <div className="mt-16 rounded-[2rem] border border-amber-200 bg-white p-8 sm:p-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">{opportunity.specialty || "Encargo freelance"}</p>
          <h1 className="mt-4 text-4xl font-black">{opportunity.title}</h1>
          <p className="mt-5 leading-7 text-slate-600">{opportunity.description}</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-slate-700"><span className="rounded-full bg-amber-100 px-4 py-2">{opportunity.location || "Remoto"}</span>{opportunity.compensation_max != null && <span className="rounded-full bg-amber-100 px-4 py-2">Hasta {opportunity.compensation_max}</span>}</div>
          <div className="mt-10 flex flex-wrap gap-3"><Link href="/login" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Ingresar para postular</Link><Link href="/register" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold">Crear cuenta</Link></div>
        </div>
      </div>
    </main>
  );
}
