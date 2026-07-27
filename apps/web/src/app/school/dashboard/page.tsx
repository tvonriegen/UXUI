import PageLayout from "@/components/layout/PageLayout";
import DashboardColegio from "@/components/dashboard/DashboardColegio";
import { requireAccountType } from "@/lib/auth-server";

export default async function SchoolDashboardPage() {
  await requireAccountType("school");
  return <PageLayout><DashboardColegio /></PageLayout>;
}
