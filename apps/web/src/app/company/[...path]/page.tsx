import { redirect } from "next/navigation";
import { requireAccountType } from "@/lib/auth-server";

const LEGACY_ROUTES: Record<string, string> = {
  profile: "/profile",
  talent: "/talent",
  jobs: "/empleos",
  applicants: "/empleos?view=applicants",
  interviews: "/empleos?view=interviews",
  messages: "/messages",
  notifications: "/notifications",
  settings: "/settings",
};

export default async function CompanyLegacyRoute({ params }: { params: { path: string[] } }) {
  await requireAccountType("company");
  const key = params.path.join("/");
  redirect(LEGACY_ROUTES[key] ?? (key.startsWith("jobs/") ? "/empleos" : "/company/dashboard"));
}
