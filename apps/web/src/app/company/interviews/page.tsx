import PageLayout from "@/components/layout/PageLayout";
import CompanyInterviewsPage from "@/components/ats/CompanyInterviewsPage";
import { requireAccountType } from "@/lib/auth-server";

export default async function CompanyInterviewsRoute() {
  await requireAccountType("company");
  return <PageLayout><CompanyInterviewsPage /></PageLayout>;
}
