import PageLayout from "@/components/layout/PageLayout";
import SchoolContactRequestsPage from "@/components/contact-routing/SchoolContactRequestsPage";
import { requireAccountType } from "@/lib/auth-server";

export default async function SchoolContactRequestsRoute() {
  await requireAccountType("school");
  return <PageLayout><SchoolContactRequestsPage /></PageLayout>;
}
