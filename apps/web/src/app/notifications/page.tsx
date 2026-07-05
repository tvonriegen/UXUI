"use client";
// ──────────────────────────────────────────────────────────
// Notifications Page – /notifications
// ──────────────────────────────────────────────────────────
// Full-page notifications list matching the design prototype.
// Features:
//  - All / Sin leer filter tabs (pill buttons)
//  - Unread indicator dot on the left edge
//  - Coloured icon per notification type
//  - "Marcar todas como leídas" action
//  - Connected to the global role-context notification stream
// ──────────────────────────────────────────────────────────

import { useState } from "react";
import PageLayout   from "@/components/layout/PageLayout";
import { useRole }  from "@/lib/role-context";
import {
  Briefcase, MessageCircle, Trophy, CheckCircle,
  Heart, Calendar, Bell, MoreHorizontal, Clock,
} from "lucide-react";

// Map notification type → icon + colour
const KIND_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  match:   { icon: Briefcase,      color: "#0e7490", bg: "#ecfeff"  },
  message: { icon: MessageCircle,  color: "#8b5cf6", bg: "#f5f3ff"  },
  badge:   { icon: Trophy,         color: "#f59e0b", bg: "#fffbeb"  },
  system:  { icon: CheckCircle,    color: "#10b981", bg: "#ecfdf5"  },
  social:  { icon: Heart,          color: "#ef4444", bg: "#fef2f2"  },
  event:   { icon: Calendar,       color: "#0e7490", bg: "#ecfeff"  },
  job:     { icon: Briefcase,      color: "#0e7490", bg: "#ecfeff"  },
};

const DEFAULT_META = { icon: Bell, color: "#94a3b8", bg: "#f1f5f9" };

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useRole();
  const [tab, setTab] = useState<"todas" | "sin-leer">("todas");

  const displayed =
    tab === "sin-leer" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <PageLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto w-full">

        {/* ── Header ── */}
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap animate-fade-in-up">
          <div>
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1">Actividad</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Notificaciones
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Lo que tu red, empresas y colegio hicieron recientemente.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        {/* ── Tab Filter Pills ── */}
        <div className="flex gap-2 mb-5">
          {(["todas", "sin-leer"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`
                px-4 py-2 rounded-full text-[13px] font-semibold border transition-all duration-200
                ${tab === t
                  ? "bg-cyan-500 text-white border-transparent shadow-md"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }
              `}
            >
              {t === "todas" ? "Todas" : `Sin leer${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
            </button>
          ))}
        </div>

        {/* ── Notification List ── */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden animate-fade-in-up">
          {displayed.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Bell size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {tab === "sin-leer" ? "No tienes notificaciones sin leer." : "Sin notificaciones todavía."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {displayed.map((n, i) => {
                const meta = KIND_META[n.type ?? ""] ?? DEFAULT_META;
                const IconComp = meta.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`
                      w-full text-left flex gap-4 px-5 py-4 transition-colors
                      hover:bg-slate-50/80 relative
                      animate-fade-in-up stagger-${Math.min(i + 1, 6)}
                    `}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {/* Unread dot on left edge */}
                    {!n.read && (
                      <span
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-500"
                      />
                    )}

                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      <IconComp size={18} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[13.5px] mb-1 ${
                          n.read ? "font-semibold text-slate-700" : "font-bold text-slate-900"
                        }`}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">{n.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <Clock size={10} /> {n.time}
                      </p>
                    </div>

                    {/* More options placeholder */}
                    <div className="shrink-0 self-start mt-1">
                      <MoreHorizontal size={16} className="text-slate-300" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
