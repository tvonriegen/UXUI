import { redirect } from "next/navigation";
import { requireAccountType } from "@/lib/auth-server";

const LEGACY_ROUTES: Record<string, string> = {
  students: "/administracion",
  import: "/administracion?tab=importar",
  validations: "/administracion?tab=validaciones",
  "contact-requests": "/school/contact-requests",
  internships: "/administracion?tab=practicas",
  companies: "/school/contact-requests",
  metrics: "/administracion?tab=metricas",
  feed: "/muro",
  settings: "/settings",
};

export default async function SchoolLegacyRoute({ params }: { params: { path: string[] } }) {
  await requireAccountType("school");
  const key = params.path.join("/");
  redirect(LEGACY_ROUTES[key] ?? (key.startsWith("students/") ? "/administracion" : "/school/dashboard"));
}
