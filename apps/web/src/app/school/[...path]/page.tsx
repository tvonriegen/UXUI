import { redirect } from "next/navigation";
import { requireAccountType } from "@/lib/auth-server";

const LEGACY_ROUTES: Record<string, string> = {
  students: "/administracion",
  import: "/administracion?tab=import",
  validations: "/administracion?tab=validaciones",
  "contact-requests": "/administracion?tab=solicitudes",
  internships: "/administracion?tab=solicitudes",
  companies: "/administracion?tab=alianzas",
  metrics: "/administracion?tab=metricas",
  feed: "/muro",
  settings: "/settings",
};

export default async function SchoolLegacyRoute({ params }: { params: { path: string[] } }) {
  await requireAccountType("school");
  const key = params.path.join("/");
  redirect(LEGACY_ROUTES[key] ?? (key.startsWith("students/") ? "/administracion" : "/school/dashboard"));
}
