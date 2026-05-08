"use client";
// ──────────────────────────────────────────────────────────
// Notifications Page – /notifications
// ──────────────────────────────────────────────────────────

import { useState } from "react";
import PageLayout   from "@/components/layout/PageLayout";
import { useRole }  from "@/lib/role-context";
import { useAuth }  from "@/lib/auth-context";
import {
  Briefcase, MessageCircle, Trophy, CheckCircle,
  Heart, Calendar, Bell, MoreHorizontal, Clock,
  Users, Zap, Star, FileText, TrendingUp, Sparkles,
  GraduationCap, Building2, BookOpen,
} from "lucide-react";

// Map notification type → icon + colour
const KIND_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  match:   { icon: Briefcase,      color: "#0e7490", bg: "#ecfeff"  },
  message: { icon: MessageCircle,  color: "#8b5cf6", bg: "#f5f3ff"  },
  badge:   { icon: Trophy,         color: "#f59e0b", bg: "#fffbeb"  },
  system:  { icon: CheckCircle,    color: "#10b981", bg: "#ecfdf5"  },
  social:  { icon: Heart,          color: "#ef4444", bg: "#fef2f2"  },
  event:   { icon: Calendar,       color: "#0e7490", bg: "#ecfeff"  },
  job:     { icon: Briefcase,      color: "#7c3aed", bg: "#f5f3ff"  },
  xp:      { icon: Zap,            color: "#f59e0b", bg: "#fffbeb"  },
  review:  { icon: Star,           color: "#f59e0b", bg: "#fffbeb"  },
  report:  { icon: FileText,       color: "#6366f1", bg: "#eef2ff"  },
  talent:  { icon: Users,          color: "#0891b2", bg: "#e0f2fe"  },
};

const DEFAULT_META = { icon: Bell, color: "#94a3b8", bg: "#f1f5f9" };

// Role-specific suggestions shown when notification list is empty
type Role = "Estudiante" | "Egresado" | "Empresa" | "Colegio";

const ROLE_SUGGESTIONS: Record<Role, { icon: React.ElementType; title: string; desc: string; color: string; bg: string }[]> = {
  Estudiante: [
    { icon: BookOpen,     title: "Completa tu perfil",        desc: "Agrega habilidades, una biografía y foto para mejorar tu visibilidad.",          color: "#0e7490", bg: "#ecfeff" },
    { icon: Briefcase,    title: "Explora ofertas laborales", desc: "Hay empresas buscando estudiantes con tu especialidad en la sección Empleos.",    color: "#7c3aed", bg: "#f5f3ff" },
    { icon: Trophy,       title: "Gana insignias",            desc: "Completa actividades diarias para desbloquear logros y subir de nivel.",          color: "#f59e0b", bg: "#fffbeb" },
    { icon: Users,        title: "Conecta con otros",         desc: "Visita El Muro para ver proyectos y publicaciones de tu comunidad.",              color: "#10b981", bg: "#ecfdf5" },
  ],
  Egresado: [
    { icon: TrendingUp,   title: "Actualiza tu perfil",       desc: "Incluye tu experiencia laboral y habilidades actualizadas.",                      color: "#0e7490", bg: "#ecfeff" },
    { icon: Briefcase,    title: "Busca oportunidades",       desc: "Las empresas están publicando vacantes. Revisa la sección Empleos.",               color: "#7c3aed", bg: "#f5f3ff" },
    { icon: Star,         title: "Comparte tu trayectoria",   desc: "Publica proyectos en El Muro para que empresas puedan conocer tu trabajo.",       color: "#f59e0b", bg: "#fffbeb" },
    { icon: MessageCircle,title: "Responde mensajes",         desc: "Revisa tu bandeja de mensajes para nuevas conversaciones con empresas.",           color: "#8b5cf6", bg: "#f5f3ff" },
  ],
  Empresa: [
    { icon: Sparkles,     title: "Publica una vacante",       desc: "Crea una oferta laboral para que los estudiantes y egresados puedan postular.",   color: "#7c3aed", bg: "#f5f3ff" },
    { icon: Users,        title: "Explora el Talento",        desc: "Descubre perfiles de estudiantes y egresados disponibles en la sección Talento.", color: "#0e7490", bg: "#ecfeff" },
    { icon: MessageCircle,title: "Inicia conversaciones",     desc: "Contacta directamente a candidatos interesantes a través de la mensajería.",      color: "#8b5cf6", bg: "#f5f3ff" },
    { icon: Building2,    title: "Solicita alumnos",          desc: "Coordina prácticas con colegios técnicos asociados a tu empresa.",                 color: "#10b981", bg: "#ecfdf5" },
  ],
  Colegio: [
    { icon: GraduationCap,title: "Gestiona tus estudiantes", desc: "Revisa el avance, asistencia y habilidades de cada alumno en Administración.",    color: "#0e7490", bg: "#ecfeff" },
    { icon: Briefcase,    title: "Revisa solicitudes",        desc: "Empresas pueden enviar solicitudes de práctica para tus alumnos.",                 color: "#7c3aed", bg: "#f5f3ff" },
    { icon: Trophy,       title: "Valida habilidades",        desc: "Avala las habilidades técnicas de tus estudiantes destacados.",                    color: "#f59e0b", bg: "#fffbeb" },
    { icon: Users,        title: "Conecta con empresas",      desc: "Usa el Muro para ver qué empresas están buscando talento de tu institución.",     color: "#10b981", bg: "#ecfdf5" },
  ],
};

// Group notifications by date
function groupByDate(notifications: { id: string; read: boolean; time: string; type?: string; title: string; description?: string }[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const groups: { label: string; items: typeof notifications }[] = [
    { label: "Hoy", items: [] },
    { label: "Ayer", items: [] },
    { label: "Esta semana", items: [] },
    { label: "Anteriores", items: [] },
  ];

  for (const n of notifications) {
    const date = new Date(n.time);
    const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) groups[0].items.push(n);
    else if (diffDays === 1) groups[1].items.push(n);
    else if (diffDays <= 7) groups[2].items.push(n);
    else groups[3].items.push(n);
  }

  return groups.filter((g) => g.items.length > 0);
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useRole();
  const { user } = useAuth();
  const [tab, setTab] = useState<"todas" | "sin-leer">("todas");

  const role = (user?.role ?? "Estudiante") as Role;
  const displayed =
    tab === "sin-leer" ? notifications.filter((n) => !n.read) : notifications;

  const grouped = groupByDate(displayed);
  const suggestions = ROLE_SUGGESTIONS[role] ?? ROLE_SUGGESTIONS.Estudiante;

  return (
    <PageLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto w-full space-y-6">

        {/* ── Header ── */}
        <div className="flex items-end justify-between gap-4 flex-wrap animate-fade-in-up">
          <div>
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1">Actividad</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Notificaciones
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Lo que tu red, empresas y colegio hicieron recientemente.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <span className="text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full">
                {unreadCount} sin leer
              </span>
            )}
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>
        </div>

        {/* ── Tab Filter Pills ── */}
        <div className="flex gap-2">
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

        {/* ── Notification List or Empty State ── */}
        {displayed.length === 0 ? (
          <div className="space-y-4 animate-fade-in-up">
            {/* Empty state message */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Bell size={28} className="text-slate-300" />
              </div>
              <p className="text-base font-semibold text-slate-700 mb-1">
                {tab === "sin-leer" ? "No tienes notificaciones sin leer." : "Sin notificaciones todavía."}
              </p>
              <p className="text-sm text-slate-400">
                {tab === "sin-leer"
                  ? "Todas tus notificaciones están al día."
                  : "Cuando haya actividad en tu cuenta, aparecerá aquí."}
              </p>
            </div>

            {/* Role-specific suggestions */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                Mientras tanto, puedes…
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestions.map((s) => {
                  const IconComp = s.icon;
                  return (
                    <div
                      key={s.title}
                      className="bg-white rounded-2xl border border-slate-200/60 p-4 flex items-start gap-3 hover:shadow-sm transition-shadow"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: s.bg, color: s.color }}
                      >
                        <IconComp size={17} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">{s.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in-up">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                  {group.label}
                </p>
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {group.items.map((n, i) => {
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
                            ${!n.read ? "bg-cyan-50/30" : ""}
                          `}
                          style={{ animationDelay: `${i * 40}ms` }}
                        >
                          {/* Unread accent bar */}
                          {!n.read && (
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-l-none" />
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
                              className={`text-[13.5px] mb-0.5 ${
                                n.read ? "font-semibold text-slate-700" : "font-bold text-slate-900"
                              }`}
                            >
                              {n.title}
                            </p>
                            {n.description && (
                              <p className="text-xs text-slate-500 leading-relaxed">{n.description}</p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                              <Clock size={10} /> {n.time}
                            </p>
                          </div>

                          {/* Unread indicator dot */}
                          {!n.read && (
                            <div className="shrink-0 self-center">
                              <span className="w-2 h-2 rounded-full bg-cyan-500 block" />
                            </div>
                          )}

                          {n.read && (
                            <div className="shrink-0 self-start mt-1">
                              <MoreHorizontal size={16} className="text-slate-300" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
