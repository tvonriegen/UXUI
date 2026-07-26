"use client";
// ──────────────────────────────────────────────────────────
// DashboardEgresado – Alumni home dashboard (live data)
// ──────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase";
import {
  Eye, Mail, Award, Edit, Share2, MessageCircle, ArrowRight,
  Star, Users, Bell, Clock, ChevronRight, Loader2,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";

interface DashProfile {
  name: string; avatar: string; specialty: string; level: number; xp: number;
  years_experience: number; availability: string;
}

interface DashPost {
  id: string; authorName: string; authorAvatar: string;
  description: string; content: string; createdAt: string;
}

interface DashPeer {
  id: string; name: string; avatar: string; specialty: string;
}

export default function DashboardEgresado() {
  const { user } = useAuth();
  const { notifications } = useRole();

  const [profile, setProfile] = useState<DashProfile | null>(null);
  const [posts,   setPosts]   = useState<DashPost[]>([]);
  const [peers,   setPeers]   = useState<DashPeer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    Promise.all([
      supabase
        .from("profiles")
        .select("name, avatar, specialty, level, xp, years_experience, availability")
        .eq("id", user.id)
        .single(),
      supabase
        .from("posts")
        .select("id, description, content, created_at, profiles!author_id(name, avatar)")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("profiles")
        .select("id, name, avatar, specialty")
        .in("role", ["Estudiante", "Egresado"])
        .neq("id", user.id)
        .limit(4),
    ]).then(([pRes, postsRes, peersRes]) => {
      if (pRes.data) setProfile(pRes.data as DashProfile);

      setPosts(
        (postsRes.data ?? []).map((p: any) => ({
          id: p.id,
          authorName:   (p.profiles as any)?.name   ?? "Usuario",
          authorAvatar: (p.profiles as any)?.avatar ?? "",
          description:  p.description ?? "",
          content:      p.content ?? "",
          createdAt:    (p.created_at ?? "").split("T")[0],
        }))
      );

      setPeers(peersRes.data ?? []);
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
          <div className="lg:col-span-2 skeleton rounded-2xl h-56" />
          <div className="skeleton rounded-2xl h-40" />
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

  const displayName  = user?.name ?? profile.name;
  const recentNotifs = notifications.slice(0, 4);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden animate-fade-in-up">
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
            <p className="text-emerald-100 text-sm font-medium mb-1">Red Alumni</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Hola, {displayName.split(" ")[0]}
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Egresado{profile.specialty ? ` — ${profile.specialty}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-extrabold">{profile.level ?? 1}</p>
              <p className="text-xs text-emerald-100">nivel</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-extrabold">{profile.years_experience ?? 0}</p>
              <p className="text-xs text-emerald-100">años exp.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Nivel" value={profile.level ?? 1} icon={<Star size={20} className="text-emerald-500" />} bg="bg-emerald-50" delay={1} />
        <StatCard label="Mensajes" value={notifications.filter((n) => !n.read).length} icon={<Mail size={20} className="text-cyan-500" />} bg="bg-cyan-50" delay={2} />
        <StatCard label="Experiencia" value={`${profile.years_experience ?? 0} años`} icon={<Award size={20} className="text-amber-500" />} bg="bg-amber-50" delay={3} />
        <StatCard label="Conexiones" value={peers.length} icon={<Users size={20} className="text-violet-500" />} bg="bg-violet-50" delay={4} />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Suggested actions */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 animate-fade-in-up stagger-2">
            <h3 className="font-bold text-base mb-5">Acciones Sugeridas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { href: "/profile", icon: <Edit size={18} className="text-emerald-500" />, bg: "bg-emerald-50", border: "border-emerald-100", title: "Actualiza tu perfil", sub: "Agrega tu último proyecto" },
                { href: "/muro",    icon: <Share2 size={18} className="text-cyan-500" />,    bg: "bg-cyan-50",    border: "border-cyan-100",    title: "Comparte experiencia",   sub: "Publica en El Muro" },
                { href: "/messages",icon: <MessageCircle size={18} className="text-violet-500" />, bg: "bg-violet-50", border: "border-violet-100", title: "Mensajes pendientes", sub: `${notifications.filter((n) => !n.read).length} sin leer` },
                { href: "/talent",  icon: <Users size={18} className="text-amber-500" />,    bg: "bg-amber-50",   border: "border-amber-100",    title: "Red de contactos",       sub: "Conecta con la comunidad" },
              ].map((a, i) => (
                <Link
                  key={a.title}
                  href={a.href}
                  className={`p-4 ${a.bg} rounded-xl border ${a.border} flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group animate-fade-in-up stagger-${Math.min(i + 1, 4)}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.sub}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent posts */}
          {posts.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 animate-fade-in-up stagger-3">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-base">Actividad Reciente</h3>
                <Link href="/muro" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                  Ver El Muro <ChevronRight size={12} />
                </Link>
              </div>
              <div className="space-y-1">
                {posts.map((post) => (
                  <div key={post.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50/80 transition-colors">
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                        {post.authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{post.authorName}</p>
                      <p className="text-xs text-slate-500 truncate">{(post.content || post.description).substring(0, 60)}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{post.createdAt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested connections */}
          {peers.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 animate-fade-in-up stagger-4">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-base">Conexiones Sugeridas</h3>
                <Link href="/talent" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {peers.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all card-interactive">
                    {t.avatar ? (
                      <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold shrink-0">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{t.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{t.specialty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white animate-fade-in-up stagger-1">
            <Eye size={28} className="mb-2 opacity-80" />
            <p className="text-3xl font-extrabold">{profile.xp ?? 0}</p>
            <p className="text-sm opacity-90 mt-1">Puntos XP</p>
            <p className="text-xs opacity-70 mt-0.5">Nivel {profile.level ?? 1}</p>
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
                  <div key={n.id} className={`p-3 rounded-lg text-xs ${n.read ? "bg-slate-50/50" : "bg-emerald-50/50 border border-emerald-100/50"}`}>
                    <p className="font-semibold text-slate-700 mb-0.5">{n.title}</p>
                    <p className="text-slate-500">{n.description.substring(0, 60)}</p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Clock size={9} /> {n.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
