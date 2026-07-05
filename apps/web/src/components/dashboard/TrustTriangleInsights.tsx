"use client";
// ──────────────────────────────────────────────────────────
// TrustTriangleInsights
// Live metrics that demonstrate ClassLink's core value prop:
// the three-way trust relationship between Students, Schools,
// and Companies that no generic job board can offer.
//
// Usage
//   <TrustTriangleInsights role="Empresa" companyId={user.id} />
//   <TrustTriangleInsights role="Estudiante" studentId={user.id} />
// ──────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShieldCheck, Building2, GraduationCap, Briefcase,
  TrendingUp, Users, Award, Loader2,
} from "lucide-react";

// ── Company view ──────────────────────────────────────────

interface CompanyInsights {
  totalTalent:           number;
  institutionallyBacked: number;
  skillValidated:        number;
  topSpecialties:        { specialty: string; count: number }[];
  avgReputationScore:    number;
}

// ── Student view ──────────────────────────────────────────

interface StudentInsights {
  reputationScore:    number;
  platformAvgScore:   number;
  validatedSkills:    number;
  earnedBadges:       number;
  companyViewsLast30: number;
}

// ── Small metric tile ─────────────────────────────────────

function MetricTile({
  label, value, sub, icon, color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`rounded-2xl p-4 border ${color} flex items-start gap-3`}>
      <div className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center shrink-0 shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-extrabold leading-tight">{value}</p>
        <p className="text-xs font-bold leading-snug mt-0.5">{label}</p>
        {sub && <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Bar chart row ─────────────────────────────────────────

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((count / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-slate-600 w-36 truncate shrink-0">{label}</p>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-bold text-slate-500 w-7 text-right shrink-0">{count}</p>
    </div>
  );
}

// ── COMPANY component ─────────────────────────────────────

function CompanyView({ companyId }: { companyId: string }) {
  const [data,    setData]    = useState<CompanyInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      // Total talent pool
      supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["Estudiante", "Egresado"]),
      // Institutionally backed (has a school_id)
      supabase.from("profiles").select("id", { count: "exact", head: true })
        .in("role", ["Estudiante", "Egresado"])
        .not("school_id", "is", null),
      // Skill-validated (at least 1 skill_validation row)
      supabase.from("skill_validations").select("student_id"),
      // Top specialties
      supabase.from("profiles").select("specialty").in("role", ["Estudiante", "Egresado"]),
      // Avg reputation score
      supabase.from("profiles").select("reputation_score").in("role", ["Estudiante", "Egresado"]),
    ]).then(([total, backed, sv, spec, rep]) => {
      const totalN   = total.count ?? 0;
      const backedN  = backed.count ?? 0;
      const svIds    = new Set((sv.data ?? []).map((r: any) => r.student_id));
      const skillN   = svIds.size;

      // Top specialties
      const specMap: Record<string, number> = {};
      (spec.data ?? []).forEach((r: any) => {
        if (r.specialty) specMap[r.specialty] = (specMap[r.specialty] ?? 0) + 1;
      });
      const topSpec = Object.entries(specMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([specialty, count]) => ({ specialty, count }));

      // Avg reputation
      const repScores = (rep.data ?? []).map((r: any) => r.reputation_score ?? 0);
      const avgRep    = repScores.length > 0
        ? Math.round(repScores.reduce((s: number, n: number) => s + n, 0) / repScores.length)
        : 0;

      setData({ totalTalent: totalN, institutionallyBacked: backedN, skillValidated: skillN, topSpecialties: topSpec, avgReputationScore: avgRep });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [companyId]);

  if (loading) return (
    <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-violet-400" /></div>
  );
  if (!data) return null;

  const backedPct  = data.totalTalent > 0 ? Math.round((data.institutionallyBacked / data.totalTalent) * 100) : 0;
  const validPct   = data.totalTalent > 0 ? Math.round((data.skillValidated / data.totalTalent) * 100) : 0;
  const maxSpec    = data.topSpecialties[0]?.count ?? 1;

  return (
    <div className="space-y-5">
      {/* Triangle explanation */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={16} className="text-violet-600" />
          <p className="text-sm font-bold text-violet-800">El Triángulo de Confianza ClassLink</p>
        </div>
        <p className="text-xs text-violet-700 leading-relaxed">
          Cada estudiante en esta plataforma tiene un historial verificado por su institución educativa.
          Usted puede evaluar candidatos con métricas reales, no solo un CV.
        </p>
        <div className="flex items-center justify-between mt-4">
          {[
            { icon: <GraduationCap size={18} className="text-cyan-600" />, label: "Estudiantes", color: "bg-cyan-50 border-cyan-200" },
            { icon: <Building2 size={18} className="text-amber-600" />,    label: "Colegios",    color: "bg-amber-50 border-amber-200" },
            { icon: <Briefcase size={18} className="text-violet-600" />,   label: "Empresas",    color: "bg-violet-50 border-violet-200" },
          ].map(({ icon, label, color }, i, arr) => (
            <div key={label} className="flex items-center">
              <div className={`flex flex-col items-center border rounded-xl p-3 ${color}`}>
                {icon}
                <p className="text-[10px] font-bold text-slate-600 mt-1">{label}</p>
              </div>
              {i < arr.length - 1 && (
                <div className="w-8 h-px bg-violet-200 mx-1 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricTile
          label="Talento con Aval Institucional"
          value={`${backedPct}%`}
          sub={`${data.institutionallyBacked} de ${data.totalTalent} perfiles`}
          icon={<ShieldCheck size={18} className="text-amber-600" />}
          color="bg-amber-50 border-amber-100 text-amber-900"
        />
        <MetricTile
          label="Con habilidades validadas"
          value={`${validPct}%`}
          sub={`${data.skillValidated} perfiles verificados`}
          icon={<Award size={18} className="text-cyan-600" />}
          color="bg-cyan-50 border-cyan-100 text-cyan-900"
        />
        <MetricTile
          label="Talento disponible"
          value={data.totalTalent}
          sub="en la plataforma"
          icon={<Users size={18} className="text-emerald-600" />}
          color="bg-emerald-50 border-emerald-100 text-emerald-900"
        />
        <MetricTile
          label="Reputación promedio"
          value={`${data.avgReputationScore} pts`}
          sub="del talento en ClassLink"
          icon={<TrendingUp size={18} className="text-violet-600" />}
          color="bg-violet-50 border-violet-100 text-violet-900"
        />
      </div>

      {/* Specialty breakdown */}
      {data.topSpecialties.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/60">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Especialidades más disponibles</p>
          <div className="space-y-2">
            {data.topSpecialties.map((s) => (
              <BarRow key={s.specialty} label={s.specialty} count={s.count} max={maxSpec} color="bg-violet-500" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── STUDENT component ─────────────────────────────────────

function StudentView({ studentId }: { studentId: string }) {
  const [data,    setData]    = useState<StudentInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    Promise.all([
      supabase.from("profiles").select("reputation_score").eq("id", studentId).single(),
      supabase.from("profiles").select("reputation_score").in("role", ["Estudiante", "Egresado"]),
      supabase.from("skill_validations").select("id", { count: "exact", head: true }).eq("student_id", studentId),
      supabase.from("user_badges").select("id", { count: "exact", head: true }).eq("user_id", studentId),
      supabase.from("profile_views").select("id", { count: "exact", head: true })
        .eq("viewed_id", studentId)
        .gte("created_at", thirtyDaysAgo),
    ]).then(([me, all, sv, ub, pv]) => {
      const myScore   = (me.data as any)?.reputation_score ?? 0;
      const allScores = (all.data ?? []).map((r: any) => r.reputation_score ?? 0);
      const avgScore  = allScores.length > 0
        ? Math.round(allScores.reduce((s: number, n: number) => s + n, 0) / allScores.length)
        : 0;
      setData({
        reputationScore:    myScore,
        platformAvgScore:   avgScore,
        validatedSkills:    sv.count ?? 0,
        earnedBadges:       ub.count ?? 0,
        companyViewsLast30: pv.count ?? 0,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [studentId]);

  if (loading) return (
    <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-cyan-400" /></div>
  );
  if (!data) return null;

  const scoreDiff = data.reputationScore - data.platformAvgScore;
  const maxScore  = Math.max(data.reputationScore, data.platformAvgScore, 1);

  return (
    <div className="space-y-5">
      {/* Score comparison */}
      <div className="bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-cyan-600" />
          <p className="text-sm font-bold text-cyan-800">Tu Reputación vs. la Plataforma</p>
        </div>
        <div className="space-y-3">
          <BarRow label="Tu puntuación" count={data.reputationScore} max={maxScore} color="bg-cyan-500" />
          <BarRow label="Promedio plataforma" count={data.platformAvgScore} max={maxScore} color="bg-slate-300" />
        </div>
        {scoreDiff !== 0 && (
          <p className={`text-xs font-bold mt-3 ${scoreDiff > 0 ? "text-emerald-600" : "text-red-500"}`}>
            {scoreDiff > 0
              ? `Estás ${scoreDiff} pts por encima del promedio. ¡Sigue así!`
              : `Estás ${Math.abs(scoreDiff)} pts por debajo del promedio. Pide a tu colegio que valide tus habilidades.`
            }
          </p>
        )}
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricTile
          label="Habilidades validadas"
          value={data.validatedSkills}
          sub="por tu institución"
          icon={<ShieldCheck size={18} className="text-amber-600" />}
          color="bg-amber-50 border-amber-100 text-amber-900"
        />
        <MetricTile
          label="Insignias ganadas"
          value={data.earnedBadges}
          sub="en ClassLink"
          icon={<Award size={18} className="text-cyan-600" />}
          color="bg-cyan-50 border-cyan-100 text-cyan-900"
        />
        <MetricTile
          label="Vistas de empresas"
          value={data.companyViewsLast30}
          sub="últimos 30 días"
          icon={<Building2 size={18} className="text-violet-600" />}
          color="bg-violet-50 border-violet-100 text-violet-900"
        />
        <MetricTile
          label="Puntuación total"
          value={`${data.reputationScore} pts`}
          sub="reputación ClassLink"
          icon={<TrendingUp size={18} className="text-emerald-600" />}
          color="bg-emerald-50 border-emerald-100 text-emerald-900"
        />
      </div>

      {/* CTA for unvalidated students */}
      {data.validatedSkills === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <ShieldCheck size={28} className="mx-auto mb-2 text-amber-400" />
          <p className="text-sm font-bold text-amber-800">Solicita validación a tu colegio</p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            Un aval institucional te diferencia del 90% de los candidatos en plataformas genéricas.
            Contacta a tu coordinador para que valide tus habilidades técnicas.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Exported wrapper ──────────────────────────────────────

interface Props {
  role:       "Empresa" | "Estudiante" | "Egresado";
  companyId?:  string;
  studentId?:  string;
}

export default function TrustTriangleInsights({ role, companyId, studentId }: Props) {
  const isCompany = role === "Empresa";
  const id        = isCompany ? companyId : studentId;
  if (!id) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
      <div className={`px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 ${isCompany ? "bg-violet-50/60" : "bg-cyan-50/60"}`}>
        <ShieldCheck size={15} className={isCompany ? "text-violet-600" : "text-cyan-600"} />
        <p className="text-sm font-bold text-slate-700">
          {isCompany ? "Insights del Ecosistema ClassLink" : "Tu Posicionamiento en ClassLink"}
        </p>
      </div>
      <div className="p-5">
        {isCompany
          ? <CompanyView companyId={id} />
          : <StudentView studentId={id} />
        }
      </div>
    </div>
  );
}
