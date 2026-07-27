import { redirect } from "next/navigation";
import { requireAccountType } from "@/lib/auth-server";

const LEGACY_ROUTES: Record<string, string> = {
  profile: "/profile",
  feed: "/muro",
  opportunities: "/empleos",
  applications: "/empleos?view=applications",
  activities: "/talent",
  messages: "/messages",
  notifications: "/notifications",
  settings: "/settings",
};

export default async function StudentLegacyRoute({ params }: { params: { path: string[] } }) {
  await requireAccountType("student");
  redirect(LEGACY_ROUTES[params.path.join("/")] ?? "/student/dashboard");
}
