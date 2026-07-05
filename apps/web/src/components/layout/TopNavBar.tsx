"use client";
// ──────────────────────────────────────────────────────────
// TopNavBar – Fixed top navigation bar
// ──────────────────────────────────────────────────────────
// Additions over original:
//  1. Global search bar (desktop only, ⌘K hint)
//     — submits to /talent with ?q= param
//  2. "Publicar" primary button (desktop only)
//     — links to El Muro with ?compose=1 for the post composer
//  3. Notifications bell links to /notifications page
//  4. Rest of existing functionality preserved
// ──────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import Link        from "next/link";
import { useRouter } from "next/navigation";
import { useRole } from "@/lib/role-context";
import { useAuth } from "@/lib/auth-context";
import { Bell, X, LogOut, User as UserIcon, Search, Plus } from "lucide-react";

export default function TopNavBar() {
  const { notifications, unreadCount, markRead, markAllRead } = useRole();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [notifOpen,  setNotifOpen]  = useState(false);
  const [userDdOpen, setUserDdOpen] = useState(false);
  const [searchQ,    setSearchQ]    = useState("");

  const notifRef  = useRef<HTMLDivElement>(null);
  const userDdRef = useRef<HTMLDivElement>(null);

  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current  && !notifRef.current.contains(e.target as Node))  setNotifOpen(false);
      if (userDdRef.current && !userDdRef.current.contains(e.target as Node)) setUserDdOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ⌘K / Ctrl+K → focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) {
      router.push(`/talent?q=${encodeURIComponent(searchQ.trim())}`);
      setSearchQ("");
    }
  };

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
      <div className="flex items-center px-4 sm:px-6 h-16 gap-3">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
            <span className="text-white font-black text-sm">CL</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 hidden sm:block">
            Class<span className="text-cyan-600">Link</span>
          </span>
        </Link>

        {/* ── Search bar (desktop) ── */}
        <form
          onSubmit={handleSearch}
          className="hidden lg:flex flex-1 max-w-md items-center gap-2 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-300 rounded-full px-4 py-2 transition-all duration-200 mx-4"
        >
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            id="global-search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Buscar personas, empleos, empresas…"
            className="flex-1 bg-transparent border-none outline-none text-[13.5px] text-slate-700 placeholder-slate-400"
          />
          <span className="text-[10px] text-slate-400 font-semibold px-1.5 py-0.5 border border-slate-300/60 rounded bg-white shrink-0 hidden xl:block">
            ⌘K
          </span>
        </form>

        {/* ── Right controls ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">

          {/* Publicar button (desktop only) */}
          <Link
            href="/muro?compose=1"
            className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white text-[13px] font-semibold shadow-sm transition-all duration-150"
          >
            <Plus size={15} strokeWidth={2.5} />
            Publicar
          </Link>

          {/* ══ Notifications Bell → /notifications ════════ */}
          <div ref={notifRef} className="relative">
            {/* Bell links to full page + opens dropdown on click */}
            <button
              onClick={() => { setNotifOpen(!notifOpen); setUserDdOpen(false); }}
              className="relative p-2 hover:bg-slate-100 active:bg-slate-200 rounded-full transition-all duration-150"
              title="Notificaciones"
            >
              <Bell
                size={20}
                className={`text-slate-500 ${unreadCount > 0 ? "animate-ring" : ""}`}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-pop-in shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Quick-view dropdown */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl shadow-slate-200/80 border border-slate-100/80 z-50 max-h-96 overflow-hidden flex flex-col animate-fade-in-down">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                  <p className="text-xs font-bold text-slate-700 tracking-wide">Notificaciones</p>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] font-bold text-cyan-600 hover:underline">
                        Marcar todo leído
                      </button>
                    )}
                    <Link
                      href="/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="text-[10px] font-bold text-slate-400 hover:text-cyan-600"
                    >
                      Ver todas →
                    </Link>
                    <button onClick={() => setNotifOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                      <X size={13} className="text-slate-400" />
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto thin-scrollbar">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-400">Sin notificaciones</p>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`w-full text-left px-4 py-3.5 flex gap-3 transition-colors hover:bg-slate-50/80 ${n.read ? "opacity-50" : ""}`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-slate-300" : "bg-red-500 animate-pulse-dot"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{n.title}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{n.description}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ══ User Avatar Dropdown ═══════════════════════ */}
          <div ref={userDdRef} className="relative">
            <button
              onClick={() => { setUserDdOpen(!userDdOpen); setNotifOpen(false); }}
              className="flex items-center gap-2 group"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-sm group-hover:ring-cyan-200 transition-all overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            </button>

            {userDdOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl shadow-slate-200/80 border border-slate-100/80 py-1.5 z-50 animate-fade-in-down">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.email}</p>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setUserDdOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <UserIcon size={15} className="text-slate-400" />
                  Mi Perfil
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setUserDdOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <UserIcon size={15} className="text-slate-400" />
                  Ajustes
                </Link>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} className="text-red-500" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
