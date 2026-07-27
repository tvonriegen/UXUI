import PageLayout from "@/components/layout/PageLayout";
import DashboardEstudiante from "@/components/dashboard/DashboardEstudiante";
import { requireAccountType } from "@/lib/auth-server";

export default async function StudentDashboardPage() {
  await requireAccountType("student");
  return <PageLayout><DashboardEstudiante /></PageLayout>;
}
