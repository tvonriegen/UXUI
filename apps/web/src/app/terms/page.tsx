import Link from "next/link";
import PublicShell from "@/components/layout/PublicShell";

export default function TermsPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Link href="/" className="text-sm font-bold text-sky-700 hover:text-sky-800">Volver al inicio</Link>
        <h1 className="mt-8 text-4xl font-black tracking-tight text-slate-900">Términos de uso</h1>
        <div className="mt-8 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm sm:p-8">
          <p className="leading-8 text-slate-600">El acceso y las interacciones deben respetar la identidad de cada cuenta, la propiedad de los recursos y las reglas de mediación para estudiantes menores de edad.</p>
        </div>
      </section>
    </PublicShell>
  );
}
