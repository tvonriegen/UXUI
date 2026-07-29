import Link from "next/link";
import { cookies } from "next/headers";
import { requireAccountType } from "@/lib/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { updateExternalProfileFromForm } from "@/app/actions/external";
import PageLayout from "@/components/layout/PageLayout";

export default async function ExternalProfilePage({ searchParams }: { searchParams?: { error?: string; saved?: string } }) {
  const account = await requireAccountType("external");
  const supabase = createServerSupabaseClient(await cookies() as any); // eslint-disable-line
  const { data: profile } = await supabase.from("profiles").select("name, bio, location").eq("id", account.id).single();
  const { data: externalProfile } = await supabase.from("external_profiles").select("client_type").eq("profile_id", account.id).single();

  return (
    <PageLayout><section className="min-h-full bg-cl-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl"><Link href="/external/dashboard" className="text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700">Volver al espacio externo</Link><div className="mt-6"><p className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-600">Cuenta</p><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Perfil de {account.name}</h1><p className="mt-1 text-sm text-slate-500">Este perfil acompaña tus encargos y ayuda a los estudiantes a entender el contexto del cliente.</p></div>
        {searchParams?.saved && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Perfil actualizado.</p>}
        {searchParams?.error && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{searchParams.error}</p>}
        <form action={updateExternalProfileFromForm} className="mt-6 grid gap-5 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm sm:p-6">
          <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">Nombre<input name="name" required defaultValue={profile?.name ?? account.name} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
          <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">Descripción<textarea name="bio" rows={5} maxLength={1000} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100">{profile?.bio ?? ""}</textarea></label>
          <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">Ubicación<input name="location" defaultValue={profile?.location ?? ""} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
          <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de cliente<select name="clientType" defaultValue={externalProfile?.client_type ?? "individual"} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100"><option value="individual">Persona</option><option value="entrepreneur">Emprendimiento</option><option value="small_business">Pequeña empresa</option></select></label>
          <button type="submit" className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-700">Guardar perfil</button>
        </form>
      </div>
    </section></PageLayout>
  );
}
