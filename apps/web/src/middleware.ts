import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_EXACT = new Set(["/", "/login", "/register"]);
const PUBLIC_PREFIXES = [
  "/api/health",
  "/api/seed",
  "/explore",
  "/freelance",
  "/how-it-works",
  "/privacy",
  "/terms",
];
const CHANGE_PASSWORD_ALLOWED = ["/change-password", "/api/health"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((path) => pathname.startsWith(path));
}

function requiredAccountType(pathname: string): "student" | "company" | "school" | "external" | null {
  if (pathname.startsWith("/student")) return "student";
  if (pathname.startsWith("/company")) return "company";
  if (pathname.startsWith("/school")) return "school";
  if (pathname.startsWith("/external")) return "external";
  return null;
}

function legacyRouteAllowed(pathname: string, accountType: string): boolean {
  if (pathname.startsWith("/administracion")) return accountType === "school";
  if (pathname.startsWith("/empleos") || pathname.startsWith("/talent")) {
    return accountType === "student" || accountType === "company";
  }
  return true;
}

function dashboardPath(accountType: string): string {
  if (accountType === "company") return "/company/dashboard";
  if (accountType === "school") return "/school/dashboard";
  if (accountType === "external") return "/external/dashboard";
  return "/student/dashboard";
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  if (!user && !isPublic && pathname !== "/change-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (!user) return response;

  const mustChange = user.app_metadata?.must_change_password === true;
  const onAllowedRoute = CHANGE_PASSWORD_ALLOWED.some((route) => pathname.startsWith(route));
  if (mustChange && !onAllowedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/change-password";
    return NextResponse.redirect(url);
  }

  if (pathname === "/change-password") return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.account_type) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "profile");
    return NextResponse.redirect(url);
  }

  if (profile.account_status === "suspended" || profile.account_status === "disabled") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "account_status");
    return NextResponse.redirect(url);
  }

  const requiredType = requiredAccountType(pathname);
  if (requiredType && profile.account_type !== requiredType) {
    const url = request.nextUrl.clone();
    url.pathname = dashboardPath(profile.account_type);
    return NextResponse.redirect(url);
  }

  if (!requiredType && !legacyRouteAllowed(pathname, profile.account_type)) {
    const url = request.nextUrl.clone();
    url.pathname = dashboardPath(profile.account_type);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
