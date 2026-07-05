"use client";
// ──────────────────────────────────────────────────────────
// DashboardEmpresa – Company home dashboard (live data)
// ──────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase";
import {
  Briefcase, Users, TrendingUp, Eye, Search, ArrowRight, Building2,
  Bell, Clock, ChevronRight, MessageSquare, Star, Globe, Loader2,
} from "lucide-react";
import StatCard              from "@/components/ui/StatCard";
import TrustTriangleInsights from "@/components/dashboard/TrustTriangleInsights";

interface DashProfile {
  name: string; avatar: string; industry: string;
  employee_count: string; website: string; open_positions: number;
  company_name: string;
}

interface TalentRow {
  id: string; name: string; avatar: string; title: string; specialty: string;
}

export default function DashboardEmpresa() {
  const { user } = useAuth();
  const { notifications } = useRole();

  const [profile,  setProfile]  = useState<DashProfile | null>(null);
  const [talent,   setTalent]   = useState<TalentRow[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    Promise.all([
      supabase
        .from("profiles")
        .select("name, avatar, industry, employee_count, website, open_positions, company_name")
        .eq("id", user.id)
        .single(),
      supabase
        .from("profiles")
        .select("id, name, avatar, title, specialty")
        .in("role", ["Estudiante", "Egresado"])
        .limit(5),
    ]).then(([pRes, tRes]) => {
      if (pRes.data) setProfile(pRes.data as DashProfile);
      setTalent(tRes.data ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6 animate-fade-in">
        <div className="skeleton rounded-2xl h-36" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton rounded-2xl h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton rounded-2xl h-48" />
          </div>
          <div className="space-y-4">
            <div className="skeleton rounded-2xl h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-slate-400 text-sm">No se pudo cargar el perfil.</p>
      </div>
    );
  }

  const recentNotifs = notifications.slice(0, 4);
  const displayName  = profile.company_name || profile.name || user?.name || "";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-violet-700 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden animate-fade-in-up">
        <div className="absolute inset-0 opacity-10 hero-pattern" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          {profile.avatar ? (
            <img src={profile.avatar} alt={displayName} className="w-16 h-16 rounded-2xl border-2 border-white/30 object-cover shadow-lg" />
          ) : (
            <div className="w-16 h-16 rounded-2xl border-2 border-white/30 bg-white/20 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-2xl">{displayName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1">
            <p className="text-violet-100 text-sm font-medium mb-1">Panel Empresarial</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{displayName}</h1>
            {profile.industry && <p className="text-white/70 text-sm mt-1">{profile.industry}</p>}
          </div>
          <Link
            href="/talent"
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-white/30 transition-colors btn-press"
          >
            <Search size={16} /> Buscar Talento
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Vacantes Abiertas"
          value={profile.open_positions ?? 0}
          icon={<Briefcase size={20} className="text-violet-500" />}
          bg="bg-violet-50"
          delay={1}
        />
        <StatCard
          label="Empleados"
          value={profile.employee_count ?? "—"}
          icon={<Users size={20} className="text-cyan-500" />}
          bg="bg-cyan-50"
          delay={2}
        />
        <StatCard
          label="Talento disponible"
          value={talent.length}
          icon={<Eye size={20} className="text-emerald-500" />}
          bg="bg-emerald-50"
          delay={3}
        />
        <StatCard
          label="Industria"
          value={profile.industry ? profile.industry.split(" ")[0] : "—"}
          icon={<TrendingUp size={20} className="text-amber-500" />}
          bg="bg-amber-50"
          delay={4}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2 space-y-5">

          {/* Top talent */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base">Perfiles de Talento</h3>
              <Link href="/talent" className="text-xs text-violet-600 font-semibold hover:underline flex items-center gap-1">
                Ver todos <ChevronRight size={12} />
              </Link>
            </div>

            {talent.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                No hay perfiles de talento disponibles aún.
              </p>
            ) : (
              <div className="space-y-3">
                {talent.map((t, i) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/30 transition-all card-interactive animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}
                  >
                    {t.avatar ? (
                      <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{t.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {[t.title, t.specialty].filter(Boolean).join(" — ")}
                      </p>
                    </div>
                    <Link href="/talent" className="text-xs text-violet-600 font-semibold hover:underline">
                      Ver perfil
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active vacantes — placeholder until jobs table exists */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 animate-fade-in-up stagger-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Vacantes Activas</h3>
              <Link href="/empleos" className="text-xs text-violet-600 font-semibold hover:underline flex items-center gap-1">
                Ver empleos <ChevronRight size={12} />
              </Link>
            </div>
            {profile.open_positions > 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-50 border border-violet-100">
                <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                  <Briefcase size={20} className="text-violet-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-violet-700">{profile.open_positions} vacante{profile.open_positions > 1 ? "s" : ""} abierta{profile.open_positions > 1 ? "s" : ""}</p>
                  <p className="text-xs text-slate-500">Gestiona tus ofertas en la sección Empleos</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">No hay vacantes activas.</p>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">

          {/* Company info */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-2">
            <h3 className="font-bold text-sm mb-4">Tu Empresa</h3>
            <div className="space-y-3">
              {[
                { icon: <Building2 size={15} className="text-slate-400" />, label: "Industria", value: profile.industry },
                { icon: <Users     size={15} className="text-slate-400" />, label: "Empleados", value: profile.employee_count },
                { icon: <Globe     size={15} className="text-slate-400" />, label: "Web",       value: profile.website },
              ].map((item) => item.value ? (
                <div key={item.label} className="flex items-center gap-3">
                  {item.icon}
                  <div>
                    <p className="text-[11px] text-slate-400">{item.label}</p>
                    <p className="text-sm font-medium text-slate-700">{item.value}</p>
                  </div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-slate-500" />
                <span className="font-bold text-sm">Notificaciones</span>
              </div>
              {recentNotifs.filter((n) => !n.read).length > 0 && (
                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
                  {recentNotifs.filter((n) => !n.read).length}
                </span>
              )}
            </div>
            {recentNotifs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Sin notificaciones.</p>
            ) : (
              <div className="space-y-2.5">
                {recentNotifs.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg text-xs ${n.read ? "bg-slate-50/50" : "bg-violet-50/50 border border-violet-100/50"}`}
                  >
                    <p className="font-semibold text-slate-700 mb-0.5">{n.title}</p>
                    <p className="text-slate-500">{n.description.substring(0, 60)}</p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={9} /> {n.time}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Trust Triangle Insights ── */}
          <div className="animate-fade-in-up stagger-4">
            <TrustTriangleInsights role="Empresa" companyId={user?.id} />
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-4">
            <h3 className="font-bold text-sm mb-4">Acciones</h3>
            <div className="space-y-1">
              {[
                { href: "/talent",   icon: <Search        size={16} className="text-violet-500" />, bg: "bg-violet-50",  label: "Buscar Talento" },
                { href: "/profile",  icon: <Building2     size={16} className="text-cyan-500" />,   bg: "bg-cyan-50",    label: "Editar Perfil"  },
                { href: "/messages", icon: <MessageSquare size={16} className="text-emerald-500" />, bg: "bg-emerald-50", label: "Mensajes"       },
                { href: "/muro",     icon: <Star          size={16} className="text-amber-500" />,   bg: "bg-amber-50",   label: "El Muro"        },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50/80 transition-colors group"
                >
                  <div className={`w-9 h-9 ${a.bg} rounded-lg flex items-center justify-center shrink-0`}>{a.icon}</div>
                  <span className="text-sm font-semibold flex-1">{a.label}</span>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
