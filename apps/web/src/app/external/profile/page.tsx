import Link from "next/link";
import { requireAccountType } from "@/lib/auth-server";

export default async function ExternalProfilePage() {
  const account = await requireAccountType("external");
  return <main className="min-h-screen bg-slate-950 px-6 py-10 text-white"><div className="mx-auto max-w-3xl"><Link href="/external/dashboard" className="text-sm font-bold text-sky-300">Volver al espacio externo</Link><h1 className="mt-16 text-4xl font-black">Perfil de {account.name}</h1><p className="mt-5 text-slate-300">La edicion del perfil externo se habilitara junto con la publicacion freelance.</p></div></main>;
}
