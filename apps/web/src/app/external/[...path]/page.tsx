import { redirect } from "next/navigation";
import { requireAccountType } from "@/lib/auth-server";

const LEGACY_ROUTES: Record<string, string> = {
  messages: "/messages",
  settings: "/settings",
};

export default async function ExternalLegacyRoute({ params }: { params: { path: string[] } }) {
  await requireAccountType("external");
  const key = params.path.join("/");
  redirect(LEGACY_ROUTES[key] ?? (key.startsWith("jobs/") ? "/external/jobs" : "/external/dashboard"));
}
