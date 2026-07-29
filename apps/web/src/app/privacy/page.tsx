import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-sky-700">TalentHub</Link>
        <h1 className="mt-20 text-4xl font-black">Privacidad</h1>
        <div className="mt-6 space-y-5 leading-8 text-slate-600">
          <p>
            TalentHub aplica privacidad por diseno. Los perfiles publicos muestran solo informacion
            autorizada; RUT, contacto personal, edad exacta, informes academicos y observaciones
            privadas no son publicos.
          </p>
          <p>
            Con tu consentimiento, usamos Google Analytics 4 para medir de forma agregada las visitas,
            navegacion y acciones principales del servicio. No enviamos a Google nombres, correos,
            RUT, identificadores de usuario, identificadores de perfiles, texto de busquedas ni datos
            de menores.
          </p>
          <p>
            Puedes aceptar o rechazar la analitica en el aviso de privacidad. Tambien puedes cambiar
            tu eleccion desde el boton de preferencias situado en la esquina inferior izquierda.
          </p>
        </div>
      </div>
    </main>
  );
}
