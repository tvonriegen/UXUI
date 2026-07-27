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
    <PageLayout><section className="min-h-full bg-slate-950 px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-3xl"><Link href="/external/dashboard" className="text-sm font-bold text-sky-300">Volver al espacio externo</Link><h1 className="mt-16 text-4xl font-black">Perfil de {account.name}</h1><p className="mt-4 text-slate-300">Este perfil acompaña tus encargos y ayuda a los estudiantes a entender el contexto del cliente.</p>
        {searchParams?.saved && <p className="mt-6 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">Perfil actualizado.</p>}
        {searchParams?.error && <p className="mt-6 rounded-2xl bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300">{searchParams.error}</p>}
        <form action={updateExternalProfileFromForm} className="mt-10 grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <label className="grid gap-2 text-sm font-bold">Nombre<input name="name" required defaultValue={profile?.name ?? account.name} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-normal outline-none focus:border-sky-400" /></label>
          <label className="grid gap-2 text-sm font-bold">Descripción<textarea name="bio" rows={5} maxLength={1000} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-normal outline-none focus:border-sky-400">{profile?.bio ?? ""}</textarea></label>
          <label className="grid gap-2 text-sm font-bold">Ubicación<input name="location" defaultValue={profile?.location ?? ""} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-normal outline-none focus:border-sky-400" /></label>
          <label className="grid gap-2 text-sm font-bold">Tipo de cliente<select name="clientType" defaultValue={externalProfile?.client_type ?? "individual"} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-normal outline-none focus:border-sky-400"><option value="individual">Persona</option><option value="entrepreneur">Emprendimiento</option><option value="small_business">Pequeña empresa</option></select></label>
          <button type="submit" className="rounded-xl bg-sky-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-sky-300">Guardar perfil</button>
        </form>
      </div>
    </section></PageLayout>
  );
}
