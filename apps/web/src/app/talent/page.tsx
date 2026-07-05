"use client";
import { useState, useEffect, useCallback } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { useRole } from "@/lib/role-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { TP_SPECIALTIES } from "@/lib/specialties";
import SkillAssessmentActivity from "@/components/talent/SkillAssessmentActivity";
import TechQuizActivity       from "@/components/talent/TechQuizActivity";
import CareerMatchActivity    from "@/components/talent/CareerMatchActivity";
import {
  Search, SlidersHorizontal, MapPin, Award, Star,
  CheckCircle, Clock, XCircle, ChevronDown, X,
  Loader2, MessageCircle, Zap, Trophy, Flame, Lock,
  BookOpen, Code, Wrench, Lightbulb, Target, Shield, Brain, Compass, Cpu,
  type LucideIcon,
} from "lucide-react";

// ── Activities Playground (Student view) ──────────────────

const ACTIVITY_CATEGORIES = [
  { id: "tech",    label: "Técnico",       icon: Code,      color: "cyan" },
  { id: "soft",    label: "Blandas",       icon: Lightbulb, color: "amber" },
  { id: "project", label: "Proyectos",     icon: Wrench,    color: "violet" },
  { id: "career",  label: "Carrera",       icon: Target,    color: "emerald" },
] as const;

const ACTIVITIES = [
  { id: "a1", category: "tech",    title: "Completa tu perfil técnico",      xp: 50,  done: false, description: "Agrega al menos 5 habilidades técnicas a tu perfil.", icon: Code },
  { id: "a2", category: "soft",    title: "Registra habilidades blandas",    xp: 30,  done: false, description: "Agrega 3 habilidades blandas a tu perfil.", icon: Lightbulb },
  { id: "a3", category: "project", title: "Sube tu primer proyecto",         xp: 100, done: false, description: "Añade un proyecto a tu portafolio con imagen y descripción.", icon: Wrench },
  { id: "a4", category: "career",  title: "Postúlate a una práctica",        xp: 50,  done: false, description: "Envía tu primera postulación a una vacante en Empleos.", icon: Target },
  { id: "a5", category: "tech",    title: "Alcanza el Nivel 2",              xp: 0,   done: false, description: "Acumula suficiente XP para subir de nivel.", icon: Star },
  { id: "a6", category: "career",  title: "Descarga tu CV",                  xp: 20,  done: false, description: "Genera y descarga tu CV desde tu perfil.", icon: BookOpen },
  { id: "a7", category: "soft",    title: "Mantén una racha de 7 días",      xp: 70,  done: false, description: "Accede a ClassLink durante 7 días consecutivos.", icon: Flame },
  { id: "a8", category: "project", title: "Agrega 3 proyectos al portafolio",xp: 150, done: false, description: "Construye un portafolio sólido con múltiples proyectos.", icon: Trophy },
] as const;

function ActivitiesPlayground() {
  const { user } = useAuth();
  const [profile, setProfile]   = useState<{ xp: number; level: number; streak: number; badges: number } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [catFilter, setCatFilter] = useState<string>("all");
  const [completedIds,   setCompletedIds]   = useState<Set<string>>(new Set());
  const [showActivity,   setShowActivity]   = useState(false);
  const [showTechQuiz,   setShowTechQuiz]   = useState(false);
  const [showCareerMatch, setShowCareerMatch] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from("profiles").select("xp, level, streak").eq("id", user.id).single(),
      supabase.from("user_badges").select("badge_id").eq("user_id", user.id),
    ]).then(([pRes, bRes]) => {
      if (pRes.data) {
        setProfile({
          xp:     pRes.data.xp     ?? 0,
          level:  pRes.data.level  ?? 1,
          streak: pRes.data.streak ?? 0,
          badges: (bRes.data ?? []).length,
        });
      }
      setLoading(false);
    });
  }, [user?.id]);

  const claimXP = async (activityId: string, xpAmount: number) => {
    if (!user?.id || completedIds.has(activityId)) return;
    if (xpAmount > 0) {
      await fetch("/api/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, type: "activity", xp_amount: xpAmount, metadata: { activity_id: activityId } }),
      }).catch(() => {});
    }
    setCompletedIds((prev) => new Set(prev).add(activityId));
    setProfile((p) => p ? { ...p, xp: p.xp + xpAmount } : p);
  };

  const displayed = catFilter === "all"
    ? [...ACTIVITIES]
    : ACTIVITIES.filter((a) => a.category === catFilter);

  const totalXPAvailable = ACTIVITIES.reduce((s, a) => s + a.xp, 0);
  const earnedXP = Array.from(completedIds).reduce((s, id) => {
    const a = ACTIVITIES.find((x) => x.id === id);
    return s + (a?.xp ?? 0);
  }, 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">

      {/* Header */}
      <div className="animate-fade-in-up">
        <p className="text-sm text-cyan-600 font-semibold mb-1">Tu Espacio</p>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Actividades & Logros</h1>
        <p className="text-slate-500 text-sm mt-1">Completa misiones, gana XP y mejora tu perfil.</p>
      </div>

      {/* Player stats */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-cyan-400" /></div>
      ) : profile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up stagger-1">
          {[
            { label: "Nivel",   value: profile.level,            icon: Star,   color: "cyan" },
            { label: "XP Total",value: `${profile.xp} XP`,       icon: Zap,    color: "amber" },
            { label: "Racha",   value: `${profile.streak} días`, icon: Flame,  color: "red" },
            { label: "Insignias",value: profile.badges,          icon: Trophy, color: "violet" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-2xl p-5 text-center`}>
              <Icon size={22} className={`text-${color}-500 mx-auto mb-2`} />
              <p className={`text-2xl font-extrabold text-${color}-600`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {completedIds.size > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-2">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-bold text-slate-700">Progreso de actividades</span>
            <span className="font-bold text-cyan-600">{earnedXP} / {totalXPAvailable} XP</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (earnedXP / totalXPAvailable) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">{completedIds.size} de {ACTIVITIES.length} actividades completadas esta sesión</p>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap animate-fade-in-up stagger-2">
        <button
          onClick={() => setCatFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${catFilter === "all" ? "bg-cyan-600 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
        >
          Todas
        </button>
        {ACTIVITY_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCatFilter(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${catFilter === cat.id ? `bg-${cat.color}-600 text-white` : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Activities grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── Skill Assessment card ───────────────────────── */}
        {(catFilter === "all" || catFilter === "soft") && (
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200/60 overflow-hidden hover:shadow-md transition-all animate-fade-in-up">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-violet-100">
                  <Brain size={22} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-sm leading-tight">Evaluación de Competencias</h3>
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">+80 XP</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    5 escenarios laborales reales. Evalúa comunicación, liderazgo, empatía y más.
                  </p>
                  <div className="mt-3">
                    <button
                      onClick={() => setShowActivity(true)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      Iniciar evaluación
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tech Quiz card ──────────────────────────────── */}
        {(catFilter === "all" || catFilter === "tech") && (
          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl border border-cyan-200/60 overflow-hidden hover:shadow-md transition-all animate-fade-in-up stagger-1">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-cyan-100">
                  <Cpu size={22} className="text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-sm leading-tight">Quiz Técnico Cronometrado</h3>
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">+60 XP</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    8 preguntas técnicas con 20 segundos por respuesta. Feedback inmediato en cada una.
                  </p>
                  <div className="mt-3">
                    <button
                      onClick={() => setShowTechQuiz(true)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      Iniciar quiz
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Career Match card ───────────────────────────── */}
        {(catFilter === "all" || catFilter === "career") && (
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200/60 overflow-hidden hover:shadow-md transition-all animate-fade-in-up stagger-2">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-100">
                  <Compass size={22} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-sm leading-tight">Descubre tu Perfil de Carrera</h3>
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">+40 XP</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    8 fichas de carrera. Marca tu nivel de interés y descubre qué áreas te atraen más.
                  </p>
                  <div className="mt-3">
                    <button
                      onClick={() => setShowCareerMatch(true)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Explorar carreras
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {displayed.map((act, i) => {
          const isDone = completedIds.has(act.id);
          const Icon   = act.icon;
          const catCfg = ACTIVITY_CATEGORIES.find((c) => c.id === act.category);
          const color  = catCfg?.color ?? "slate";

          return (
            <div
              key={act.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all animate-fade-in-up stagger-${Math.min(i + 1, 6)} ${
                isDone ? "border-emerald-200 opacity-80" : "border-slate-200/60 hover:shadow-md"
              }`}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-100" : `bg-${color}-50`}`}>
                    {isDone
                      ? <CheckCircle size={22} className="text-emerald-600" />
                      : <Icon size={22} className={`text-${color}-600`} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-bold text-sm leading-tight">{act.title}</h3>
                      {act.xp > 0 && (
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${isDone ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          +{act.xp} XP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{act.description}</p>
                    <div className="mt-3">
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <CheckCircle size={12} /> Completado
                        </span>
                      ) : (
                        <button
                          onClick={() => claimXP(act.id, act.xp)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all bg-${color}-600 hover:bg-${color}-700 text-white`}
                        >
                          Marcar como completada
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-200/60 rounded-2xl p-5 animate-fade-in-up">
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-cyan-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-cyan-800 mb-1">¿Cómo funciona?</p>
            <p className="text-xs text-cyan-700 leading-relaxed">
              Cada actividad que completes suma XP a tu perfil y mejora tu visibilidad ante empresas.
              Las insignias se otorgan automáticamente al cumplir requisitos desde el servidor.
              Tu racha diaria aumenta cada vez que accedes a la plataforma.
            </p>
          </div>
        </div>
      </div>

      {/* ── Activity overlays ─────────────────────────────── */}
      {showActivity && user?.id && (
        <SkillAssessmentActivity
          userId={user.id}
          onClose={() => setShowActivity(false)}
          onXPEarned={(xp) => setProfile((p) => p ? { ...p, xp: p.xp + xp } : p)}
        />
      )}
      {showTechQuiz && user?.id && (
        <TechQuizActivity
          userId={user.id}
          onClose={() => setShowTechQuiz(false)}
          onXPEarned={(xp) => setProfile((p) => p ? { ...p, xp: p.xp + xp } : p)}
        />
      )}
      {showCareerMatch && user?.id && (
        <CareerMatchActivity
          userId={user.id}
          onClose={() => setShowCareerMatch(false)}
          onXPEarned={(xp) => setProfile((p) => p ? { ...p, xp: p.xp + xp } : p)}
        />
      )}
    </div>
  );
}

const SPECIALTIES = ["Todas", ...TP_SPECIALTIES];
const ROLE_FILTERS = ["Todos", "Estudiante", "Egresado"] as const;
const AVAILABILITY_FILTERS = ["Todos", "Disponible", "En prácticas", "No disponible"] as const;
const SORT_OPTIONS = [
  { value: "level", label: "Mayor nivel" },
  { value: "name",  label: "Nombre A-Z" },
  { value: "gpa",   label: "Mayor promedio" },
] as const;

const AVAIL_CONFIG: Record<string, { color: string; icon: LucideIcon; bg: string }> = {
  "Disponible":    { color: "text-emerald-600", icon: CheckCircle, bg: "bg-emerald-50" },
  "En prácticas":  { color: "text-amber-600",   icon: Clock,       bg: "bg-amber-50" },
  "No disponible": { color: "text-red-500",      icon: XCircle,     bg: "bg-red-50" },
};

interface TalentProfile {
  id: string; name: string; role: string; avatar: string;
  bio: string; location: string; specialty: string; title: string;
  xp: number; level: number; gpa: number | null; availability: string;
  years_experience: number; email: string;
}

const PAGE_SIZE = 20;

export default function TalentPage() {
  const { role: viewerRole } = useRole();
  const { user } = useAuth();

  // All hooks must come before any conditional return
  const [profiles, setProfiles] = useState<TalentProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacting, setContacting] = useState<string | null>(null);
  const [contacted, setContacted] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("Todas");
  const [roleFilter, setRoleFilter] = useState<string>("Todos");
  const [availability, setAvailability] = useState<string>("Todos");
  const [sortBy, setSortBy] = useState<string>("level");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchProfiles = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    let query = supabase
      .from("profiles")
      .select("id,name,role,avatar,bio,location,specialty,title,xp,level,gpa,availability,years_experience,email", { count: "exact" })
      .in("role", ["Estudiante", "Egresado"])
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (specialty !== "Todas") query = query.eq("specialty", specialty);
    if (roleFilter !== "Todos") query = query.eq("role", roleFilter);
    if (availability !== "Todos") query = query.eq("availability", availability);
    if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);

    switch (sortBy) {
      case "level": query = query.order("level", { ascending: false }); break;
      case "name":  query = query.order("name", { ascending: true }); break;
      case "gpa":   query = query.order("gpa", { ascending: false, nullsFirst: false }); break;
    }

    const { data, error: err, count } = await query;
    if (err || !data) {
      setError("No se pudo cargar el directorio.");
    } else {
      setProfiles(append ? (prev) => [...prev, ...(data as TalentProfile[])] : (data as TalentProfile[]));
      setTotal(count ?? 0);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [specialty, roleFilter, availability, search, sortBy]);

  useEffect(() => { setPage(0); fetchProfiles(0, false); }, [fetchProfiles]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchProfiles(next, true);
  };

  const handleContact = async (talent: TalentProfile) => {
    if (!user?.id || !talent.id) return;
    setContacting(talent.id);
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${talent.id}),and(user1_id.eq.${talent.id},user2_id.eq.${user.id})`)
      .maybeSingle();

    if (!existing) {
      await supabase.from("conversations").insert({
        user1_id: user.id,
        user2_id: talent.id,
        last_message_at: new Date().toISOString(),
      });
    }
    setContacted((prev) => new Set(prev).add(talent.id));
    setContacting(null);
  };

  const activeFilterCount = [
    specialty !== "Todas", roleFilter !== "Todos", availability !== "Todos",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSpecialty("Todas"); setRoleFilter("Todos");
    setAvailability("Todos"); setSearch("");
  };

  const ctaLabel = viewerRole === "Empresa" ? "Solicitar Contacto"
                 : viewerRole === "Colegio" ? "Solicitar vía Colegio"
                 : "Contactar";
  const ctaClass = viewerRole === "Empresa" ? "bg-violet-600 hover:bg-violet-700"
                 : viewerRole === "Colegio" ? "bg-amber-600 hover:bg-amber-700"
                 : "bg-cyan-600 hover:bg-cyan-700";

  // Students get the Activities Playground instead of the talent directory
  // (after all hooks so Rules of Hooks are not violated)
  if (viewerRole === "Estudiante") {
    return (
      <PageLayout>
        <ActivitiesPlayground />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-5">
        <div className="animate-fade-in-up">
          <p className="text-sm text-cyan-600 font-semibold mb-1">Directorio Académico</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Buscador de Talento</h1>
          <p className="text-slate-500 text-sm mt-1">{total} perfiles en el sistema</p>
        </div>

        {/* Search + filter bar */}
        <div className="flex gap-3 animate-fade-in-up stagger-1">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, habilidad, especialidad..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none transition-shadow"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${showFilters || activeFilterCount > 0 ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
          >
            <SlidersHorizontal size={16} />
            Filtros
            {activeFilterCount > 0 && (
              <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${showFilters ? "bg-white text-cyan-600" : "bg-cyan-600 text-white"}`}>
                {activeFilterCount}
              </span>
            )}
          </button>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 focus:ring-2 focus:ring-cyan-200 outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {showFilters && (
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 grid grid-cols-1 md:grid-cols-3 gap-4 animate-scale-in">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block">Especialidad</label>
              <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 outline-none bg-white"
              >
                {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block">Tipo</label>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 outline-none bg-white"
              >
                {ROLE_FILTERS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block">Disponibilidad</label>
              <select value={availability} onChange={(e) => setAvailability(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 outline-none bg-white"
              >
                {AVAILABILITY_FILTERS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            {activeFilterCount > 0 && (
              <div className="md:col-span-3 flex justify-end">
                <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors">
                  <X size={14} /> Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error} <button onClick={() => fetchProfiles(0)} className="ml-2 underline hover:no-underline">Reintentar</button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-cyan-400" />
          </div>
        )}

        {!loading && profiles.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/60">
            <Search size={48} className="mx-auto mb-4 text-slate-200" />
            <p className="text-slate-400 text-base font-medium">No se encontraron perfiles.</p>
            <button onClick={clearFilters} className="mt-3 text-sm text-cyan-600 font-semibold hover:underline">Limpiar filtros</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((t, i) => {
            const avail = AVAIL_CONFIG[t.availability] ?? AVAIL_CONFIG["Disponible"];
            const AvailIcon = avail.icon;
            const isExpanded = expandedId === t.id;
            const hasContacted = contacted.has(t.id);

            return (
              <article key={t.id}
                className={`bg-white rounded-2xl border border-slate-200/60 overflow-hidden hover:shadow-md transition-all duration-200 animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-3.5">
                    {t.avatar ? (
                      <img src={t.avatar} alt={t.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shrink-0">
                        <span className="text-white font-black text-xl">{t.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base leading-tight">{t.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{t.title || t.specialty}</p>
                        </div>
                        <span className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${avail.bg} ${avail.color}`}>
                          <AvailIcon size={10} /> {t.availability}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        {t.location && <span className="flex items-center gap-1"><MapPin size={11} />{t.location}</span>}
                        <span className="flex items-center gap-1"><Star size={11} />Niv. {t.level}</span>
                        {t.gpa && <span className="flex items-center gap-1"><Award size={11} />{t.gpa.toFixed(1)}</span>}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5 animate-fade-in-up">
                      {t.bio && <p className="text-sm text-slate-600 leading-relaxed">{t.bio}</p>}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {t.specialty && <span className="bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-lg font-semibold">{t.specialty}</span>}
                        {t.years_experience > 0 && <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">{t.years_experience} {t.years_experience === 1 ? "año exp." : "años exp."}</span>}
                        {t.gpa && <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-semibold">Promedio {t.gpa.toFixed(1)}</span>}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <button onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                    >
                      <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      {isExpanded ? "Menos" : "Ver más"}
                    </button>
                    <button
                      onClick={() => handleContact(t)}
                      disabled={hasContacted || contacting === t.id || !user}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all btn-press disabled:opacity-50 ${hasContacted ? "bg-emerald-500" : ctaClass}`}
                    >
                      {contacting === t.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : hasContacted ? (
                        <><CheckCircle size={12} /> Contactado</>
                      ) : (
                        <><MessageCircle size={12} /> {ctaLabel}</>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!loading && profiles.length < total && (
          <div className="flex justify-center pt-4">
            <button onClick={loadMore} disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {loadingMore ? <Loader2 size={16} className="animate-spin" /> : null}
              Cargar más ({total - profiles.length} restantes)
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
