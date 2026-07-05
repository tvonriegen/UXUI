"use client";
// ──────────────────────────────────────────────────────────
// DashboardColegio – School admin home dashboard (live data)
// ──────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase";
import {
  GraduationCap, Users, Handshake, TrendingUp, FileText, ArrowRight,
  Bell, Clock, ChevronRight, Briefcase, Search, MessageSquare, Building2,
  AlertTriangle, Loader2,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";

interface DashProfile {
  name: string; avatar: string; school_name: string; location: string;
  student_count: number | null; alliance_count: number;
  employability_rate: number | null;
}

interface QueueItem {
  id: string; title: string; author: string; urgent: boolean; date: string;
}

interface SpecialtyStat {
  specialty: string | null; count: number;
}

export default function DashboardColegio() {
  const { user } = useAuth();
  const { notifications } = useRole();

  const [profile,       setProfile]      = useState<DashProfile | null>(null);
  const [queue,         setQueue]        = useState<QueueItem[]>([]);
  const [specialties,   setSpecialties]  = useState<SpecialtyStat[]>([]);
  const [loading,       setLoading]      = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const profilePromise = supabase
      .from("profiles")
      .select("name, avatar, school_name, location, student_count, alliance_count, employability_rate")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as DashProfile);
      });

    const queuePromise = supabase
      .from("internship_requests")
      .select("id, title, urgent, created_at, profiles!internship_requests_company_id_fkey(company_name, name)")
      .eq("school_id", user.id)
      .order("urgent", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setQueue(
          (data ?? []).map((r: any) => ({
            id:     r.id,
            title:  r.title,
            author: r.profiles?.company_name || r.profiles?.name || "Empresa",
            urgent: r.urgent,
            date:   new Date(r.created_at).toLocaleDateString("es-CR"),
          }))
        );
      });

    const specialtyPromise = supabase
      .from("profiles")
      .select("specialty")
      .eq("school_id", user.id)
      .eq("role", "Estudiante")
      .then(({ data }: { data: { specialty: string | null }[] | null }) => {
        const counts: Record<string, number> = {};
        (data ?? []).forEach((r: { specialty: string | null }) => {
          const key = r.specialty ?? "Sin especialidad";
          counts[key] = (counts[key] ?? 0) + 1;
        });
        setSpecialties(
          Object.entries(counts)
            .map(([specialty, count]) => ({ specialty, count }))
            .sort((a, b) => b.count - a.count)
        );
      });

    Promise.allSettled([profilePromise, queuePromise, specialtyPromise]).then(() => setLoading(false));
  }, [user?.id]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6 animate-fade-in">
        <div className="skeleton rounded-2xl h-36" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton rounded-2xl h-24" />)}
        </div>
        <div className="skeleton rounded-2xl h-64" />
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

  const recentNotifs   = notifications.slice(0, 4);
  const urgentRequests = queue.filter((r) => r.urgent);
  const displayName    = profile.school_name || profile.name || user?.name || "";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden animate-fade-in-up">
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
            <p className="text-amber-100 text-sm font-medium mb-1">Panel del Centro Educativo</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{displayName}</h1>
            {profile.location && <p className="text-white/70 text-sm mt-1">{profile.location}</p>}
          </div>
          <div className="flex items-center gap-4">
            {profile.employability_rate != null && (
              <>
                <div className="text-center">
                  <p className="text-3xl font-extrabold">{profile.employability_rate}%</p>
                  <p className="text-xs text-amber-100">empleabilidad</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
              </>
            )}
            <div className="text-center">
              <p className="text-3xl font-extrabold">{profile.alliance_count ?? 0}</p>
              <p className="text-xs text-amber-100">alianzas</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Empleabilidad"
          value={profile.employability_rate != null ? `${profile.employability_rate}%` : "—"}
          icon={<TrendingUp  size={20} className="text-emerald-500" />}
          bg="bg-emerald-50"
          delay={1}
        />
        <StatCard
          label="Estudiantes"
          value={profile.student_count ?? "—"}
          icon={<GraduationCap size={20} className="text-cyan-500" />}
          bg="bg-cyan-50"
          delay={2}
        />
        <StatCard
          label="Alianzas"
          value={profile.alliance_count ?? 0}
          icon={<Handshake size={20} className="text-violet-500" />}
          bg="bg-violet-50"
          delay={3}
        />
        <StatCard
          label="Solicitudes"
          value={queue.length}
          icon={<Briefcase size={20} className="text-amber-500" />}
          bg="bg-amber-50"
          delay={4}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Urgent requests */}
          {urgentRequests.length > 0 && (
            <div className="bg-red-50/60 rounded-2xl p-5 border border-red-200/60 animate-scale-in">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-red-500" />
                <h3 className="font-bold text-sm text-red-700">Solicitudes Urgentes</h3>
                <span className="ml-auto text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                  {urgentRequests.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {urgentRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-xl p-4 flex items-center gap-3 border border-red-100 hover:border-red-200 transition-colors">
                    <FileText size={16} className="text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{req.title}</p>
                      <p className="text-xs text-slate-500">{req.author} — {req.date}</p>
                    </div>
                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold shrink-0">Urgente</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full queue */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base">Cola de Solicitudes</h3>
              <span className="text-xs text-slate-400 font-semibold bg-slate-100 px-2.5 py-1 rounded-full">
                {queue.length} pendientes
              </span>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-10">
                <FileText size={36} className="mx-auto mb-3 text-slate-200" />
                <p className="text-slate-400 text-sm">No hay solicitudes pendientes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((req, i) => (
                  <div
                    key={req.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all animate-fade-in-up stagger-${Math.min(i + 1, 6)} ${
                      req.urgent ? "border-red-200/60 hover:bg-red-50/30" : "border-slate-100 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${req.urgent ? "bg-red-50" : "bg-amber-50"}`}>
                      <FileText size={18} className={req.urgent ? "text-red-500" : "text-amber-500"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{req.title}</p>
                      <p className="text-xs text-slate-500">{req.author} — {req.date}</p>
                    </div>
                    {req.urgent && (
                      <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full font-bold shrink-0">Urgente</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Specialty breakdown */}
          {specialties.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 animate-fade-in-up stagger-3">
              <h3 className="font-bold text-base mb-5">Estudiantes por Especialidad</h3>
              <div className="space-y-4">
                {specialties.map((spec, i) => {
                  const maxCount = specialties[0]?.count ?? 1;
                  const pct = Math.round((spec.count / maxCount) * 100);
                  return (
                    <div key={spec.specialty} className={`animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold text-slate-700">{spec.specialty}</span>
                        <span className="font-bold text-amber-600">{spec.count} estudiante{spec.count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-1000 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white animate-fade-in-up stagger-1">
            <TrendingUp size={28} className="mb-2 opacity-80" />
            <p className="text-3xl font-extrabold">
              {profile.employability_rate != null ? `${profile.employability_rate}%` : "—"}
            </p>
            <p className="text-sm opacity-90 mt-1">Tasa de Empleabilidad</p>
            <p className="text-xs opacity-70 mt-0.5">Datos del perfil del centro</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-2">
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
                  <div key={n.id} className={`p-3 rounded-lg text-xs ${n.read ? "bg-slate-50/50" : "bg-amber-50/50 border border-amber-100/50"}`}>
                    <p className="font-semibold text-slate-700 mb-0.5">{n.title}</p>
                    <p className="text-slate-500">{n.description.substring(0, 60)}</p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Clock size={9} /> {n.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-3">
            <h3 className="font-bold text-sm mb-4">Acciones</h3>
            <div className="space-y-1">
              {[
                { href: "/talent",   icon: <Search        size={16} className="text-amber-500" />,   bg: "bg-amber-50",   label: "Explorar Talento"  },
                { href: "/profile",  icon: <Building2     size={16} className="text-cyan-500" />,     bg: "bg-cyan-50",    label: "Perfil del Centro" },
                { href: "/messages", icon: <MessageSquare size={16} className="text-emerald-500" />,  bg: "bg-emerald-50", label: "Mensajes"           },
                { href: "/muro",     icon: <GraduationCap size={16} className="text-violet-500" />,   bg: "bg-violet-50",  label: "El Muro"            },
              ].map((a) => (
                <Link key={a.label} href={a.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50/80 transition-colors group">
                  <div className={`w-9 h-9 ${a.bg} rounded-lg flex items-center justify-center shrink-0`}>{a.icon}</div>
                  <span className="text-sm font-semibold flex-1">{a.label}</span>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
