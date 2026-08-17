import { redirect } from "next/navigation";
import { requireAccountType } from "@/lib/auth-server";

export default async function SchoolImportRoute() {
  await requireAccountType("school");
  redirect("/administracion?tab=importar");
}
