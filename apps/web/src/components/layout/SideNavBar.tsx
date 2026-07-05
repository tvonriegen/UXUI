"use client";
// ──────────────────────────────────────────────────────────
// SideNavBar – Desktop left sidebar navigation
// ──────────────────────────────────────────────────────────
// Improvements over the original:
//  - Notifications link added (routes to /notifications)
//  - Settings link now routes to /settings page
//  - User profile mini-card at bottom (name + level/XP)
//  - Role subtitle under logo
//  - Animated entry per link
// ──────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import Link        from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/role-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Role } from "@/lib/types";
import {
  LayoutDashboard, Newspaper, Users, MessageCircle, User,
  Settings, Briefcase, LayoutGrid, Bell, Zap,
} from "lucide-react";

const LINKS = [
  {
    path: "/",
    label: "Inicio",
    icon: LayoutDashboard,
    visibleFor: ["Estudiante", "Egresado", "Empresa", "Colegio"] as Role[],
  },
  {
    path: "/muro",
    label: "El Muro",
    icon: Newspaper,
    visibleFor: ["Estudiante", "Egresado", "Empresa", "Colegio"] as Role[],
  },
  {
    path: "/administracion",
    label: "Administración",
    icon: LayoutGrid,
    visibleFor: ["Colegio"] as Role[],
  },
  {
    path: "/talent",
    label: "Talento",
    icon: Users,
    visibleFor: ["Estudiante", "Egresado", "Empresa"] as Role[],
  },
  {
    path: "/empleos",
    label: "Empleos",
    icon: Briefcase,
    visibleFor: ["Estudiante", "Egresado", "Empresa"] as Role[],
  },
  {
    path: "/messages",
    label: "Mensajes",
    icon: MessageCircle,
    visibleFor: ["Estudiante", "Egresado", "Empresa", "Colegio"] as Role[],
  },
  {
    path: "/notifications",
    label: "Notificaciones",
    icon: Bell,
    visibleFor: ["Estudiante", "Egresado", "Empresa", "Colegio"] as Role[],
  },
  {
    path: "/profile",
    label: "Mi Perfil",
    icon: User,
    visibleFor: ["Estudiante", "Egresado", "Empresa", "Colegio"] as Role[],
  },
];

const ROLE_SUB: Record<Role, string> = {
  Estudiante: "Networker",
  Egresado:   "Alumni",
  Empresa:    "Talent searcher",
  Colegio:    "Student manager",
};

export default function SideNavBar() {
  const pathname              = usePathname();
  const { role, unreadCount } = useRole();
  const { user }              = useAuth();

  const [level, setLevel] = useState<number | null>(null);
  const [xp,    setXp]    = useState<number | null>(null);

  // Load user level/XP for the profile footer card
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("level, xp")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setLevel((data as any).level ?? 1);
          setXp((data as any).xp ?? 0);
        }
      });
  }, [user?.id]);

  const filtered = LINKS.filter((l) => l.visibleFor.includes(role));

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 hidden lg:flex flex-col bg-white border-r border-slate-200/60 pt-16 z-40">

      {/* ── Brand strip ── */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
          <span className="text-white font-black text-xs">CL</span>
        </div>
        <div>
          <span className="text-[15px] font-extrabold tracking-tight text-slate-900">
            Class<span className="text-cyan-600">Link</span>
          </span>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[.08em] -mt-0.5">
            {ROLE_SUB[role]}
          </p>
        </div>
      </div>

      {/* ── Navigation Links ── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {filtered.map((link, idx) => {
          const isActive = pathname === link.path;
          const IconComp = link.icon;

          return (
            <Link
              key={link.path}
              href={link.path}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200 text-[13px] font-medium
                animate-slide-in-left stagger-${Math.min(idx + 1, 6)}
                ${isActive
                  ? "text-cyan-700 bg-cyan-50/80 font-semibold border-l-2 border-cyan-500 pl-[10px]"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-l-2 border-transparent"
                }
              `}
            >
              <span className="relative shrink-0">
                <IconComp
                  size={20}
                  strokeWidth={isActive ? 2.25 : 1.5}
                  className={isActive ? "text-cyan-600" : ""}
                />
                {/* Unread badge dot */}
                {(link.path === "/messages" || link.path === "/notifications") && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse-dot" />
                )}
              </span>

              <span>{link.label}</span>

              {link.path === "/messages" && unreadCount > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3 space-y-1.5">
        <Link
          href="/settings"
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            transition-all duration-200 text-[13px] font-medium
            ${pathname === "/settings"
              ? "text-cyan-700 bg-cyan-50/80 font-semibold"
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }
          `}
        >
          <Settings size={18} strokeWidth={1.5} />
          <span>Configuración</span>
        </Link>

        {/* User mini-card */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-white">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-slate-800 truncate leading-tight">
              {user?.name?.split(" ")[0] ?? "Usuario"}
            </p>
            {level !== null && (
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Zap size={9} className="text-cyan-500" />
                Niv.&nbsp;{level} · {(xp ?? 0).toLocaleString()} XP
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
