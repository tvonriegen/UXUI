// ──────────────────────────────────────────────────────────
// Next.js Middleware – server-side auth guard
// Runs before every matching route, so no content flash.
// ──────────────────────────────────────────────────────────
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that are publicly accessible without a session
const PUBLIC_ROUTES = ["/login", "/register", "/api/health", "/api/seed"];

// Routes the user can visit even while must_change_password is active
const CHANGE_PASSWORD_ALLOWED = ["/change-password", "/api/health"];

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
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Redirect unauthenticated users away from protected routes
  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login/register
  if (session && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Force password change for students created by a school
  if (session) {
    const mustChange = session.user.app_metadata?.must_change_password === true;
    const onAllowedRoute = CHANGE_PASSWORD_ALLOWED.some((r) => pathname.startsWith(r));
    if (mustChange && !onAllowedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next internals and all static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
