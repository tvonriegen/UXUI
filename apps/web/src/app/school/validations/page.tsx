import { redirect } from "next/navigation";
import { requireAccountType } from "@/lib/auth-server";

export default async function SchoolValidationsRoute() {
  await requireAccountType("school");
  redirect("/administracion?tab=validaciones");
}
