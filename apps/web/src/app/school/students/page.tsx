import { redirect } from "next/navigation";
import { requireAccountType } from "@/lib/auth-server";

export default async function SchoolStudentsRoute() {
  await requireAccountType("school");
  redirect("/administracion");
}
