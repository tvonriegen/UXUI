import PageLayout from "@/components/layout/PageLayout";
import DashboardEmpresa from "@/components/dashboard/DashboardEmpresa";
import { requireAccountType } from "@/lib/auth-server";

export default async function CompanyDashboardPage() {
  await requireAccountType("company");
  return <PageLayout><DashboardEmpresa /></PageLayout>;
}
