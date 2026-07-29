"use client";
// ──────────────────────────────────────────────────────────
// BottomMobileNav – Fixed bottom navigation for mobile
// ──────────────────────────────────────────────────────────
// Visible only on screens below the lg breakpoint (<1024px).
// Five equally-spaced icon+label tabs, mirroring the sidebar.
//
// Active state:
//  - Icon gets cyan colour + heavier stroke weight
//  - Label switches to bold + cyan
//  - A small cyan pill/dot appears below the icon
//
// Unread badge floats on the Messages (Chat) tab.
// ──────────────────────────────────────────────────────────

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/role-context";
import { useAuth } from "@/lib/auth-context";
import type { AccountType } from "@/lib/types";
import { LayoutDashboard, Newspaper, Users, MessageCircle, User, LayoutGrid, Bell, Briefcase } from "lucide-react";

// All tabs — filtered per role below
const ALL_LINKS = [
  { path: "/student/dashboard", label: "Inicio", icon: LayoutDashboard, accountTypes: ["student"] as AccountType[], badge: false },
  { path: "/company/dashboard", label: "Inicio", icon: LayoutDashboard, accountTypes: ["company"] as AccountType[], badge: false },
  { path: "/school/dashboard", label: "Inicio", icon: LayoutDashboard, accountTypes: ["school"] as AccountType[], badge: false },
  { path: "/external/dashboard", label: "Inicio", icon: LayoutDashboard, accountTypes: ["external"] as AccountType[], badge: false },
  { path: "/external/jobs", label: "Encargos", icon: Briefcase, accountTypes: ["external"] as AccountType[], badge: false },
  { path: "/muro", label: "Muro", icon: Newspaper, accountTypes: ["student", "company", "school"] as AccountType[], badge: false },
  { path: "/administracion", label: "Admin", icon: LayoutGrid, accountTypes: ["school"] as AccountType[], badge: false },
  { path: "/talent", label: "Talento", icon: Users, accountTypes: ["company"] as AccountType[], badge: false },
  { path: "/empleos", label: "Empleos", icon: Briefcase, accountTypes: ["student", "company"] as AccountType[], badge: false },
  { path: "/external/proposals", label: "Propuestas", icon: Users, accountTypes: ["external"] as AccountType[], badge: false },
  { path: "/messages", label: "Chat", icon: MessageCircle, accountTypes: ["student", "company", "school", "external"] as AccountType[], badge: true },
  { path: "/notifications", label: "Avisos", icon: Bell, accountTypes: ["student", "company", "school", "external"] as AccountType[], badge: true },
  { path: "/profile", label: "Perfil", icon: User, accountTypes: ["student", "company", "school", "external"] as AccountType[], badge: false },
];

const CANONICAL_ROUTES: Record<string, Partial<Record<AccountType, string>>> = {
  "/muro": { student: "/student/feed" },
  "/talent": { company: "/company/talent" },
  "/empleos": { student: "/student/opportunities", company: "/company/jobs" },
  "/messages": { student: "/student/messages", company: "/company/messages", school: "/school/messages", external: "/external/messages" },
  "/notifications": { student: "/student/notifications", company: "/company/notifications", school: "/school/notifications", external: "/external/notifications" },
  "/profile": { student: "/student/profile", company: "/company/profile", school: "/school/profile", external: "/external/profile" },
};

function canonicalRoute(path: string, accountType: AccountType) {
  return CANONICAL_ROUTES[path]?.[accountType] ?? path;
}

export default function BottomMobileNav() {
  const pathname    = usePathname();
  const { unreadCount } = useRole();
  const { user } = useAuth();
  const accountType = user?.accountType ?? "student";

  const LINKS = ALL_LINKS.filter((l) => l.accountTypes.includes(accountType));

  return (
    // Frosted-glass bar pinned to the bottom of the viewport.
    // The bottom padding includes the iOS safe-area inset on notched devices.
    <nav aria-label="Navegación principal" className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 bg-white/92 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
      {LINKS.map((link) => {
        const target = canonicalRoute(link.path, accountType);
        const isActive = pathname === target;
        const IconComp = link.icon;

        return (
          <Link
            key={link.path}
            href={target}
            className={`
              flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl
              transition-all duration-200
              ${isActive ? "text-sky-600" : "text-slate-400 hover:text-slate-600"}
            `}
          >
            {/* Icon + unread badge container */}
            <span className="relative">
              <IconComp
                size={22}
                strokeWidth={isActive ? 2.25 : 1.5}
              />

              {/* Unread badge for messages / notifications */}
              {link.badge && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </span>

            {/* Active indicator dot below icon */}
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pop-in" />
            )}

            {/* Label text */}
            <span className={`text-[9px] ${isActive ? "font-bold" : "font-medium"}`}>
              {link.path === "/talent" && accountType === "student" ? "Actividades" : link.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
