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
import { LayoutDashboard, Newspaper, Users, MessageCircle, User, LayoutGrid, Bell } from "lucide-react";

// All tabs — filtered per role below
const ALL_LINKS = [
  { path: "/muro",           label: "Muro",    icon: Newspaper,       roles: ["Estudiante", "Egresado", "Empresa", "Colegio"], badge: false },
  { path: "/administracion", label: "Admin",   icon: LayoutGrid,      roles: ["Colegio"],                                       badge: false },
  { path: "/talent",         label: "Talento", icon: Users,           roles: ["Estudiante", "Egresado", "Empresa"],              badge: false },
  { path: "/",               label: "Home",    icon: LayoutDashboard, roles: ["Estudiante", "Egresado", "Empresa", "Colegio"], badge: false },
  { path: "/messages",       label: "Chat",    icon: MessageCircle,   roles: ["Estudiante", "Egresado", "Empresa", "Colegio"], badge: true  },
  { path: "/notifications",  label: "Avisos",  icon: Bell,            roles: ["Estudiante", "Egresado", "Empresa", "Colegio"], badge: true  },
  { path: "/profile",        label: "Perfil",  icon: User,            roles: ["Estudiante", "Egresado", "Empresa", "Colegio"], badge: false },
];

export default function BottomMobileNav() {
  const pathname    = usePathname();
  const { unreadCount, role } = useRole();

  const LINKS = ALL_LINKS.filter((l) => l.roles.includes(role));

  return (
    // Frosted-glass bar pinned to the bottom of the viewport.
    // pb-5 accounts for iOS safe-area inset on notched devices.
    <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-1 pb-5 pt-2 bg-white/92 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
      {LINKS.map((link) => {
        const isActive = pathname === link.path;
        const IconComp = link.icon;

        return (
          <Link
            key={link.path}
            href={link.path}
            className={`
              flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl
              transition-all duration-200
              ${isActive ? "text-cyan-600" : "text-slate-400 hover:text-slate-600"}
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
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pop-in" />
            )}

            {/* Label text */}
            <span className={`text-[9px] ${isActive ? "font-bold" : "font-medium"}`}>
              {link.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
