"use client";
// ──────────────────────────────────────────────────────────
// DashboardEstudiante – Student home dashboard (live data + gamification)
// ──────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase";
import {
  Star, Trophy, Zap, ArrowRight, BookOpen, Briefcase,
  Bell, MessageSquare, ChevronRight, Clock, Lock, Flame,
} from "lucide-react";
import Icon                  from "@/components/ui/Icon";
import StatCard              from "@/components/ui/StatCard";
import TrustTriangleInsights from "@/components/dashboard/TrustTriangleInsights";
import TrustTriangle         from "@/components/ui/TrustTriangle";
import StreakFlame           from "@/components/gamification/StreakFlame";
import TierBadge, { tierFromXp, nextTierInfo, type XpTier } from "@/components/gamification/TierBadge";
import DailyQuestsCard       from "@/components/gamification/DailyQuestsCard";
import LevelUpModal          from "@/components/gamification/LevelUpModal";
import TechRadarCard         from "@/components/radar/TechRadarCard";

interface DashProfile {
  name: string; avatar: string; level: number; xp: number;
  streak: number; gpa: number | null; specialty: string;
  reputation_score: number;
  attendance: number | null;
  xp_tier: XpTier;
  longest_streak: number;
  last_active_date: string | null;
}

interface DashBadge {
  id: string; name: string; icon: string; earned: boolean; earned_at: string | null;
}

interface DashPost {
  id: string; title: string; description: string; content: string;
  authorName: string; authorAvatar: string; createdAt: string;
}

export default function DashboardEstudiante() {
  const { user } = useAuth();
  const { notifications } = useRole();

  const [profile,  setProfile]  = useState<DashProfile | null>(null);
  const [badges,   setBadges]   = useState<DashBadge[]>([]);
  const [posts,    setPosts]    = useState<DashPost[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [celebration, setCelebration] =
    useState<{ kind: "level" | "tier"; title: string; subtitle?: string; level?: number; tier?: XpTier } | null>(null);

  // Track previous level/tier so we can detect a level-up between refetches
  const prevLevelRef = useRef<number | null>(null);
  const prevTierRef  = useRef<XpTier | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Fire-and-forget streak touch on mount (idempotent within the day)
    fetch("/api/streak/touch", { method: "POST" }).catch(() => {});

    const load = async () => {
      const [pRes, ubRes, bRes, postsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("name, avatar, level, xp, streak, gpa, specialty, reputation_score, attendance, xp_tier, longest_streak, last_active_date")
          .eq("id", user.id)
          .single(),
        supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", user.id),
        supabase.from("badges").select("id, name, icon, description"),
        supabase
          .from("posts")
          .select("id, title, description, content, created_at, profiles!author_id(name, avatar)")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      if (pRes.data) {
        const p = pRes.data as Partial<DashProfile>;
        const next: DashProfile = {
          name:             p.name ?? "",
          avatar:           p.avatar ?? "",
          level:            p.level ?? 1,
          xp:               p.xp ?? 0,
          streak:           p.streak ?? 0,
          gpa:              p.gpa ?? null,
          specialty:        p.specialty ?? "",
          reputation_score: p.reputation_score ?? 0,
          attendance:       p.attendance ?? null,
          xp_tier:          (p.xp_tier as XpTier) ?? tierFromXp(p.xp ?? 0),
          longest_streak:   p.longest_streak ?? 0,
          last_active_date: p.last_active_date ?? null,
        };
        // Level-up detection
        if (prevLevelRef.current != null && next.level > prevLevelRef.current) {
          setCelebration({
            kind: "level",
            title: `¡Nivel ${next.level}!`,
            subtitle: "Sigue acumulando XP completando misiones diarias.",
            level: next.level,
          });
        }
        // Tier-up detection
        if (prevTierRef.current != null && next.xp_tier !== prevTierRef.current) {
          setCelebration({
            kind: "tier",
            title: `¡Nuevo rango: ${next.xp_tier}!`,
            subtitle: "Tu trayectoria sube al siguiente nivel.",
            tier: next.xp_tier,
          });
        }
        prevLevelRef.current = next.level;
        prevTierRef.current  = next.xp_tier;
        setProfile(next);
      }

      const earnedMap = new Map(
        (ubRes.data ?? []).map((r) => [r.badge_id as string, r.earned_at as string | null])
      );
      setBadges(
        (bRes.data ?? []).map((b) => ({
          id: b.id as string,
          name: b.name as string,
          icon: b.icon as string,
          earned: earnedMap.has(b.id as string),
          earned_at: earnedMap.get(b.id as string) ?? null,
        }))
      );

      interface PostRow { id: string; title: string; description: string | null; content: string | null; created_at: string | null; profiles: { name: string; avatar: string } | null }
      setPosts(
        ((postsRes.data ?? []) as unknown as PostRow[]).map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description ?? "",
          content: p.content ?? "",
          authorName:   p.profiles?.name   ?? "Usuario",
          authorAvatar: p.profiles?.avatar ?? "",
          createdAt:    (p.created_at ?? "").split("T")[0],
        }))
      );

      setLoading(false);
    };

    load();

    // Refetch profile on xp_events INSERT so level/tier changes trigger celebration
    const channel = supabase
      .channel(`xp:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "xp_events",
        filter: `user_id=eq.${user.id}`,
      }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  if (loading) {
    return <StudentDashboardSkeleton />;
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-slate-400 text-sm">No se pudo cargar el perfil.</p>
      </div>
    );
  }

  const earnedBadges = badges.filter((b) => b.earned);
  const tier         = profile.xp_tier;
  const tierInfo     = nextTierInfo(profile.xp);
  const streak       = profile.streak ?? 0;
  const recentNotifs = notifications.slice(0, 4);
  const displayName  = user?.name ?? profile.name;

  const trustData = {
    academica:   Math.min(100, Math.round((profile.gpa ?? 0) * 10)),
    profesional: Math.min(100, Math.round((profile.reputation_score ?? 0) / 5)),
    social:      Math.min(100, earnedBadges.length * 12 + (profile.streak ?? 0) * 2),
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-br from-cyan-500 via-teal-500 to-cyan-700 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden animate-fade-in-up">
        <div className="absolute inset-0 opacity-10 hero-pattern" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          {/* Avatar */}
          {profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar}
              alt={displayName}
              className="w-16 h-16 rounded-2xl border-2 border-white/30 object-cover shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl border-2 border-white/30 bg-white/20 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-2xl">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex-1">
            <p className="text-cyan-100 text-sm font-medium mb-1">Bienvenido/a</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {displayName.split(" ")[0]}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-white/85 text-sm">
                Nivel {profile.level ?? 1}
                {profile.specialty ? ` — ${profile.specialty}` : ""}
              </span>
              <TierBadge tier={tier} size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2.5">
              <StreakFlame
                streak={streak}
                lastActive={profile.last_active_date}
                size={32}
                showLabel={false}
                className=""
              />
              <div className="text-left">
                <p className="text-2xl font-extrabold leading-none">{streak}</p>
                <p className="text-[10px] text-cyan-100 uppercase tracking-wide font-semibold">
                  racha
                </p>
              </div>
            </div>
            <div className="w-px h-10 bg-white/20 hidden md:block" />
            <div className="text-center hidden md:block">
              <p className="text-3xl font-extrabold">{earnedBadges.length}</p>
              <p className="text-xs text-cyan-100">insignias</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Nivel Actual"
          value={profile.level ?? 1}
          icon={<Star size={20} className="text-cyan-500" />}
          bg="bg-cyan-50"
          delay={1}
        />
        <StatCard
          label="Racha"
          value={`${streak} ${streak === 1 ? "día" : "días"}`}
          icon={<Flame size={20} className="text-amber-500" />}
          bg="bg-amber-50"
          delay={2}
        />
        <StatCard
          label="Insignias"
          value={`${earnedBadges.length}/${badges.length}`}
          icon={<Trophy size={20} className="text-emerald-500" />}
          bg="bg-emerald-50"
          delay={3}
        />
        <StatCard
          label="Mejor racha"
          value={profile.longest_streak}
          icon={<Flame size={20} className="text-rose-500" />}
          bg="bg-rose-50"
          delay={4}
        />
      </div>

      {/* ── Main two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Daily quests */}
          {user?.id && <DailyQuestsCard userId={user.id} />}

          {/* Tier progress */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-cyan-600" />
                <span className="font-bold">Puntos de Experiencia</span>
              </div>
              <TierBadge tier={tier} size="md" />
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-2">
              <div
                className="h-full rounded-full primary-gradient transition-all duration-1000 ease-out"
                style={{ width: `${tierInfo.pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{profile.xp.toLocaleString()} XP</span>
              <span>
                {tierInfo.next
                  ? <>Faltan <span className="font-bold text-cyan-600">{tierInfo.remaining.toLocaleString()} XP</span> para <span className="font-bold">{tierInfo.next}</span></>
                  : "¡Rango máximo alcanzado!"
                }
              </span>
            </div>
          </div>

          {/* Tech radar (novel feature) */}
          {user?.id && <TechRadarCard userId={user.id} specialty={profile.specialty} />}

          {/* Badges grid */}
          {badges.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 animate-fade-in-up stagger-3">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-base">Insignias Verificadas</h3>
                <Link
                  href="/profile"
                  className="text-xs text-cyan-600 font-semibold hover:underline flex items-center gap-1"
                >
                  Ver todas <ChevronRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {badges.slice(0, 8).map((badge, i) => (
                  <div
                    key={badge.id}
                    className={`
                      p-4 rounded-xl text-center transition-all
                      animate-scale-in stagger-${Math.min(i + 1, 6)}
                      ${badge.earned
                        ? "bg-amber-50/60 border border-amber-200/60 hover:shadow-md hover:-translate-y-0.5"
                        : "bg-slate-50 border border-slate-100 opacity-40"
                      }
                    `}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2.5 ${
                      badge.earned ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-400"
                    }`}>
                      {badge.earned
                        ? <Icon name={badge.icon} size={20} />
                        : <Lock size={16} />
                      }
                    </div>
                    <p className="text-xs font-bold truncate">{badge.name}</p>
                    {badge.earned && badge.earned_at && (
                      <p className="text-[10px] text-emerald-500 font-medium mt-1">
                        {new Date(badge.earned_at).toLocaleDateString("es-CR")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent feed */}
          {posts.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 animate-fade-in-up stagger-4">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-base">Actividad Reciente</h3>
                <Link
                  href="/muro"
                  className="text-xs text-cyan-600 font-semibold hover:underline flex items-center gap-1"
                >
                  Ver El Muro <ChevronRight size={12} />
                </Link>
              </div>
              <div className="space-y-1">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50/80 transition-colors"
                  >
                    {post.authorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.authorAvatar} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                        {post.authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{post.authorName}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {(post.content || post.description).substring(0, 60)}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{post.createdAt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">

          {/* Notifications */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-slate-500" />
                <span className="font-bold text-sm">Notificaciones</span>
              </div>
              {recentNotifs.length > 0 && (
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
                    className={`p-3 rounded-lg text-xs ${
                      n.read ? "bg-slate-50/50" : "bg-cyan-50/50 border border-cyan-100/50"
                    }`}
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

          {/* ── Trust Triangle Visual ── */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-3 flex flex-col items-center">
            <h3 className="font-bold text-sm mb-1 self-start">Trust Triangle</h3>
            <p className="text-[11px] text-slate-400 mb-4 self-start">Tu reputación en 3 dimensiones</p>
            <TrustTriangle data={trustData} size={200} />
          </div>

          {/* ── Trust Triangle Insights ── */}
          {user?.id && (
            <div className="animate-fade-in-up stagger-3">
              <TrustTriangleInsights role="Estudiante" studentId={user.id} />
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-3">
            <h3 className="font-bold text-sm mb-4">Acciones Rápidas</h3>
            <div className="space-y-1">
              {[
                { href: "/profile",  icon: <BookOpen     size={16} className="text-cyan-500" />,    bg: "bg-cyan-50",    label: "Mi Perfil",   sub: "Portafolio y logros" },
                { href: "/muro",     icon: <Flame        size={16} className="text-amber-500" />,   bg: "bg-amber-50",   label: "El Muro",     sub: "Proyectos y eventos" },
                { href: "/talent",   icon: <Briefcase    size={16} className="text-violet-500" />,  bg: "bg-violet-50",  label: "Talento",     sub: "Conecta y aprende" },
                { href: "/messages", icon: <MessageSquare size={16} className="text-emerald-500" />, bg: "bg-emerald-50", label: "Mensajes",    sub: "Conversaciones" },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50/80 transition-colors group"
                >
                  <div className={`w-9 h-9 ${a.bg} rounded-lg flex items-center justify-center shrink-0`}>
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{a.label}</p>
                    <p className="text-[11px] text-slate-400">{a.sub}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {celebration && (
        <LevelUpModal
          open
          onClose={() => setCelebration(null)}
          kind={celebration.kind}
          title={celebration.title}
          subtitle={celebration.subtitle}
          level={celebration.level}
          tier={celebration.tier}
        />
      )}
    </div>
  );
}

function StudentDashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="skeleton rounded-2xl h-36" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton rounded-2xl h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="skeleton rounded-2xl h-64" />
          <div className="skeleton rounded-2xl h-48" />
        </div>
        <div className="space-y-4">
          <div className="skeleton rounded-2xl h-40" />
          <div className="skeleton rounded-2xl h-56" />
        </div>
      </div>
    </div>
  );
}
