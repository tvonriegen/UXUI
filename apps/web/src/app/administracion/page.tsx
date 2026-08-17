import AdministrationPage from "@/components/school/AdministrationPage";
import { requireAccountType } from "@/lib/auth-server";

interface AdministrationRouteProps {
  searchParams?: { tab?: string };
}

export default async function AdministrationRoute({ searchParams }: AdministrationRouteProps) {
  await requireAccountType("school");
  return <AdministrationPage initialSection={searchParams?.tab} />;
}
