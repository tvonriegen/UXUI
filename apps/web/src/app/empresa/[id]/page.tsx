"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase";
import {
  Building2, Globe, Users, Briefcase, MapPin, ArrowLeft,
  Loader2, UserPlus, UserCheck, Clock, ChevronRight, Bell,
  GraduationCap, Zap, Code2, Gift, Pencil, Check, X, Plus,
} from "lucide-react";

interface CompanyProfile {
  id: string;
  name: string;
  company_name: string | null;
  bio: string | null;
  avatar: string | null;
  location: string | null;
  industry: string | null;
  employee_count: string | null;
  website: string | null;
  email: string;
  rut: string | null;
  benefits:   string[] | null;
  tech_stack: string[] | null;
}

interface JobPosting {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  type: string | null;
  specialty: string | null;
  created_at: string;
}

// ── Inline chip-list editor ───────────────────────────────
// Used by the company when viewing its own profile.
function ChipListEditor({
  items,
  onSave,
  placeholder,
}: {
  items: string[];
  onSave: (next: string[]) => Promise<void>;
  placeholder: string;
}) {
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState(items);
  const [newItem,  setNewItem]  = useState("");
  const [saving,   setSaving]   = useState(false);

  const commit = async () => {
    setSaving(true);
    await onSave(draft.filter(Boolean));
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(items);
    setNewItem("");
    setEditing(false);
  };

  const addItem = () => {
    const v = newItem.trim();
    if (v && !draft.includes(v)) setDraft((d) => [...d, v]);
    setNewItem("");
  };

  if (!editing) {
    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        {items.length === 0
          ? <span className="text-xs text-slate-300 italic">Sin definir</span>
          : items.map((item) => (
              <span key={item} className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                {item}
              </span>
            ))
        }
        <button
          onClick={() => setEditing(true)}
          className="ml-1 p-1 text-slate-300 hover:text-cyan-500 transition-colors"
          title="Editar"
        >
          <Pencil size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {draft.map((item, i) => (
          <span key={item} className="flex items-center gap-1 text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
            {item}
            <button onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 transition-colors">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
          placeholder={placeholder}
          className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-cyan-300"
        />
        <button onClick={addItem} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
          <Plus size={12} />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={commit}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Guardar
        </button>
        <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">
          <X size={11} /> Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export default function EmpresaProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { role } = useRole();

  const [company,       setCompany]       = useState<CompanyProfile | null>(null);
  const [jobs,          setJobs]          = useState<JobPosting[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing,   setIsFollowing]   = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [totalApplicants, setTotalApplicants] = useState(0);

  const isOwner = user?.id === id;

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const [profileRes, jobsRes, followersRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, company_name, bio, avatar, location, industry, employee_count, website, email, rut, benefits, tech_stack")
        .eq("id", id)
        .eq("role", "Empresa")
        .single(),
      supabase
        .from("job_postings")
        .select("id, title, description, location, type, specialty, created_at")
        .eq("company_id", id)
        .eq("active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("company_follows")
        .select("student_id", { count: "exact", head: true })
        .eq("company_id", id),
    ]);

    if (profileRes.error || !profileRes.data) {
      setError("No se encontró esta empresa.");
      setLoading(false);
      return;
    }

    setCompany(profileRes.data as CompanyProfile);
    setJobs((jobsRes.data ?? []) as JobPosting[]);
    setFollowerCount(followersRes.count ?? 0);

    // Check if current user follows this company
    if (user?.id) {
      const { data: followRow } = await supabase
        .from("company_follows")
        .select("student_id")
        .eq("company_id", id)
        .eq("student_id", user.id)
        .maybeSingle();
      setIsFollowing(!!followRow);
    }

    // Fetch total applicants if viewer is the company owner
    if (user?.id === id) {
      const jobIds = (jobsRes.data ?? []).map((j: any) => j.id);
      if (jobIds.length > 0) {
        const { count } = await supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .in("job_id", jobIds);
        setTotalApplicants(count ?? 0);
      }
    }

    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFollowToggle = async () => {
    if (!user?.id || !id) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from("company_follows").delete().eq("company_id", id).eq("student_id", user.id);
      setFollowerCount((c) => Math.max(0, c - 1));
      setIsFollowing(false);
    } else {
      await supabase.from("company_follows").insert({ company_id: id, student_id: user.id });
      setFollowerCount((c) => c + 1);
      setIsFollowing(true);
    }
    setFollowLoading(false);
  };

  const saveArrayField = async (field: "benefits" | "tech_stack", value: string[]) => {
    if (!id) return;
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", id);
    if (!error) setCompany((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  // ── Loading / error states ────────────────────────────────

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-64">
          <Loader2 size={28} className="animate-spin text-violet-400" />
        </div>
      </PageLayout>
    );
  }

  if (error || !company) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center min-h-64 gap-4">
          <Building2 size={48} className="text-slate-200" />
          <p className="text-slate-400 font-medium">{error ?? "Empresa no encontrada."}</p>
          <button
            onClick={() => router.back()}
            className="text-sm text-violet-600 hover:underline flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Volver
          </button>
        </div>
      </PageLayout>
    );
  }

  const displayName = company.company_name || company.name;
  const canFollow   = user && user.id !== id && (role === "Estudiante" || role === "Egresado");
  const websiteHref = company.website
    ? (company.website.startsWith("http") ? company.website : `https://${company.website}`)
    : null;

  const benefits  = company.benefits  ?? [];
  const techStack = company.tech_stack ?? [];

  return (
    <PageLayout>
      <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">

        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={15} /> Volver
        </button>

        {/* ── Company Header Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden animate-fade-in-up">

          {/* Banner */}
          <div className="h-32 md:h-44 bg-gradient-to-br from-violet-500 via-purple-500 to-violet-700 relative overflow-hidden">
            <div className="absolute inset-0 hero-pattern opacity-10" />
          </div>

          {/* Avatar + actions */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-10 mb-4">
              <div className="shrink-0">
                {company.avatar ? (
                  <img
                    src={company.avatar}
                    alt={displayName}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white object-cover shadow-lg bg-white"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-black text-3xl sm:text-4xl">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {canFollow && (
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
                    isFollowing
                      ? "bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200"
                      : "bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                  }`}
                >
                  {followLoading
                    ? <Loader2 size={15} className="animate-spin" />
                    : isFollowing
                    ? <><UserCheck size={15} /> Siguiendo</>
                    : <><UserPlus size={15} /> Seguir</>
                  }
                </button>
              )}

              {isOwner && (
                <Link
                  href="/empleos"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors border border-violet-200"
                >
                  <Briefcase size={15} /> Gestionar Vacantes
                </Link>
              )}
            </div>

            {/* Name + meta */}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{displayName}</h1>
              {company.industry && <p className="text-slate-500 text-sm mt-1">{company.industry}</p>}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-slate-400">
                {company.location && (
                  <span className="flex items-center gap-1.5"><MapPin size={14} />{company.location}</span>
                )}
                {company.employee_count && (
                  <span className="flex items-center gap-1.5"><Users size={14} />{company.employee_count} empleados</span>
                )}
                {websiteHref && (
                  <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-violet-600 hover:underline">
                    <Globe size={14} />{company.website}
                  </a>
                )}
                <span className="flex items-center gap-1.5">
                  <Bell size={14} />{followerCount} {followerCount === 1 ? "seguidor" : "seguidores"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Owner quick-stats bar ── */}
        {isOwner && (
          <div className="grid grid-cols-3 gap-3 animate-fade-in-up stagger-1">
            {[
              { icon: <Briefcase size={16} />, label: "Vacantes activas", value: jobs.length,     color: "violet"  },
              { icon: <Users     size={16} />, label: "Total candidatos", value: totalApplicants, color: "cyan"    },
              { icon: <Bell      size={16} />, label: "Seguidores",       value: followerCount,   color: "emerald" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 shrink-0`}>
                  {stat.icon}
                </div>
                <div>
                  <p className={`text-2xl font-extrabold text-${stat.color}-600 leading-none`}>{stat.value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Body Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: About + Info + Culture */}
          <div className="space-y-4">

            {company.bio && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-1">
                <h3 className="font-bold text-sm text-slate-700 mb-2">Acerca de</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{company.bio}</p>
              </div>
            )}

            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-2">
              <h3 className="font-bold text-sm text-slate-700 mb-4">Información</h3>
              <div className="space-y-3">
                {[
                  { icon: <Building2     size={15} className="text-slate-400" />, label: "Industria",  value: company.industry },
                  { icon: <Users         size={15} className="text-slate-400" />, label: "Empleados",  value: company.employee_count },
                  { icon: <Briefcase     size={15} className="text-slate-400" />, label: "Vacantes",   value: jobs.length > 0 ? `${jobs.length} abierta${jobs.length !== 1 ? "s" : ""}` : null },
                  { icon: <GraduationCap size={15} className="text-slate-400" />, label: "Seguidores", value: String(followerCount) },
                ].filter((item) => item.value).map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    {item.icon}
                    <div>
                      <p className="text-[11px] text-slate-400">{item.label}</p>
                      <p className="text-sm font-semibold text-slate-700">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Tech Stack card ── */}
            {(techStack.length > 0 || isOwner) && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-3">
                <h3 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-1.5">
                  <Code2 size={14} className="text-cyan-500" /> Stack Tecnológico
                </h3>
                {isOwner ? (
                  <ChipListEditor
                    items={techStack}
                    placeholder="Ej: React, Python…"
                    onSave={(v) => saveArrayField("tech_stack", v)}
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {techStack.map((t) => (
                      <span key={t} className="text-xs font-semibold bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Benefits card ── */}
            {(benefits.length > 0 || isOwner) && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60 animate-fade-in-up stagger-3">
                <h3 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-1.5">
                  <Gift size={14} className="text-violet-500" /> Beneficios y Perks
                </h3>
                {isOwner ? (
                  <ChipListEditor
                    items={benefits}
                    placeholder="Ej: CAJA, seguro médico…"
                    onSave={(v) => saveArrayField("benefits", v)}
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {benefits.map((b) => (
                      <span key={b} className="flex items-center gap-1 text-xs font-semibold bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full">
                        <Zap size={9} className="text-violet-400" />{b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CTA for students */}
            {(role === "Estudiante" || role === "Egresado") && jobs.length > 0 && (
              <Link
                href="/empleos"
                className="flex items-center justify-between gap-3 bg-violet-600 hover:bg-violet-700 text-white px-5 py-3.5 rounded-2xl font-bold text-sm transition-colors animate-fade-in-up stagger-4"
              >
                <span>Ver y postularte a vacantes</span>
                <ChevronRight size={16} />
              </Link>
            )}
          </div>

          {/* Right: Active job postings */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-bold text-base text-slate-800 animate-fade-in-up">
              Vacantes Activas
              {jobs.length > 0 && (
                <span className="ml-2 text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full">{jobs.length}</span>
              )}
            </h2>

            {jobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center animate-fade-in-up">
                <Briefcase size={40} className="mx-auto mb-3 text-slate-200" />
                <p className="text-slate-400 font-medium">Sin vacantes activas en este momento.</p>
                {isOwner && (
                  <Link href="/empleos" className="mt-3 inline-block text-sm text-violet-600 font-semibold hover:underline">
                    Publicar vacante →
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job, i) => (
                  <div
                    key={job.id}
                    className={`bg-white rounded-2xl border border-slate-200/60 p-5 hover:border-violet-200 hover:shadow-sm transition-all animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-slate-800">{job.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {job.type && (
                            <span className="text-[10px] font-bold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">{job.type}</span>
                          )}
                          {job.specialty && (
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{job.specialty}</span>
                          )}
                          {job.location && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <MapPin size={10} />{job.location}
                            </span>
                          )}
                        </div>
                        {job.description && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{job.description}</p>
                        )}
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock size={10} />
                          {new Date(job.created_at).toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
                        </span>
                        <Link
                          href="/empleos"
                          className="text-xs font-bold text-violet-600 hover:underline flex items-center gap-0.5"
                        >
                          Postular <ChevronRight size={11} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
