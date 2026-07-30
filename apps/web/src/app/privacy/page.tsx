import Link from "next/link";
import PublicShell from "@/components/layout/PublicShell";

export default function PrivacyPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Link href="/" className="text-sm font-bold text-sky-600 hover:text-sky-700">Volver al inicio</Link>
        <h1 className="mt-8 text-4xl font-black tracking-tight text-slate-900">Privacidad</h1>
        <div className="mt-8 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-5 leading-8 text-slate-600">
          <p>
            TalentHub aplica privacidad por diseño. Los perfiles públicos muestran solo información
            autorizada; RUT, contacto personal, edad exacta, informes académicos y observaciones
            privadas no son públicos.
          </p>
          <p>
            Con tu consentimiento, usamos Google Analytics 4 para medir de forma agregada las visitas,
            navegación y acciones principales del servicio. No enviamos a Google nombres, correos,
            RUT, identificadores de usuario, identificadores de perfiles, texto de búsquedas ni datos
            de menores.
          </p>
          <p>
            Puedes aceptar o rechazar la analítica en el aviso de privacidad. También puedes cambiar
            tu elección desde el botón de preferencias situado en la esquina inferior izquierda.
          </p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
