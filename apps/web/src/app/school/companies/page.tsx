import { redirect } from "next/navigation";
import { requireAccountType } from "@/lib/auth-server";

export default async function SchoolCompaniesRoute() {
  await requireAccountType("school");
  redirect("/school/contact-requests");
}
