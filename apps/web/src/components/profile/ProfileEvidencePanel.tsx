"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, FileCheck2, Loader2, Plus, RotateCcw, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { submitProfileEvidence } from "@/app/actions/evidence";
import { computeProfileCompleteness, type ProfileCompletenessResult, type ProfileEvidenceStatus } from "@/lib/utils/profile-completeness";

export interface ProfileEvidenceRow {
  id: string;
  evidence_type: "project" | "certificate" | "course" | "award" | "document" | "other";
  title: string;
  description: string;
  url: string;
  issuer: string;
  status: ProfileEvidenceStatus;
  validation_note: string;
  reviewed_at: string | null;
  created_at: string;
}

interface ProfileEvidencePanelProps {
  profileId: string;
  isOwner: boolean;
  profile: {
    bio?: string | null;
    location?: string | null;
    specialty?: string | null;
    availability?: string | null;
    gpa?: number | null;
  };
  skillsCount: number;
  softSkillsCount: number;
  portfolioCount: number;
  schoolReportPresent: boolean;
}

const TYPE_LABELS: Record<ProfileEvidenceRow["evidence_type"], string> = {
  project: "Proyecto",
  certificate: "Certificado",
  course: "Curso",
  award: "Reconocimiento",
  document: "Documento",
  other: "Otro",
};

const STATUS_META: Record<ProfileEvidenceStatus, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "bg-slate-100 text-slate-600" },
  pending: { label: "Pendiente de revisión", className: "bg-amber-50 text-amber-700" },
  verified: { label: "Verificada", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Necesita ajustes", className: "bg-rose-50 text-rose-700" },
  expired: { label: "Expirada", className: "bg-slate-100 text-slate-500" },
};

function CompletenessSummary({ result }: { result: ProfileCompletenessResult }) {
  const color = result.percentage >= 80 ? "bg-emerald-500" : result.percentage >= 50 ? "bg-amber-500" : "bg-rose-500";
  const next = result.items.find((item) => !item.done);

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Perfil verificable</p>
          <p className="mt-1 text-sm text-slate-600">{result.verifiedEvidenceCount} evidencias verificadas</p>
        </div>
        <span className="text-2xl font-black text-sky-700">{result.percentage}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className={`h-full ${color} transition-all`} style={{ width: `${result.percentage}%` }} />
      </div>
      {next && <p className="mt-2 text-xs text-slate-500">Siguiente paso: {next.guidance}</p>}
      {result.pendingEvidenceCount > 0 && (
        <p className="mt-1 text-xs font-medium text-amber-700">Hay {result.pendingEvidenceCount} evidencia(s) esperando revisión institucional.</p>
      )}
    </div>
  );
}

export function ProfileEvidencePanel({
  profileId,
  isOwner,
  profile,
  skillsCount,
  softSkillsCount,
  portfolioCount,
  schoolReportPresent,
}: ProfileEvidencePanelProps) {
  const [evidence, setEvidence] = useState<ProfileEvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ProfileEvidenceRow["evidence_type"]>("project");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [issuer, setIssuer] = useState("");

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profile_evidence")
      .select("id, evidence_type, title, description, url, issuer, status, validation_note, reviewed_at, created_at")
      .eq("owner_id", profileId)
      .order("created_at", { ascending: false });
    setEvidence((data ?? []) as ProfileEvidenceRow[]);
    setLoading(false);
  }, [profileId]);

  useEffect(() => { loadEvidence(); }, [loadEvidence]);

  const completeness = computeProfileCompleteness({
    ...profile,
    skillsCount,
    softSkillsCount,
    evidence,
    portfolioCount,
    schoolReportPresent,
  });

  const resetForm = () => {
    setTitle(""); setDescription(""); setUrl(""); setIssuer(""); setType("project");
  };

  const handleSubmit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true); setMessage(null);
    const result = await submitProfileEvidence({
      evidence_type: type,
      title,
      description,
      url,
      issuer,
    });
    setSaving(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    resetForm(); setFormOpen(false); setMessage("Evidencia enviada para revisión institucional.");
    await loadEvidence();
  };

  return (
    <section id="profile-evidence" className="rounded-2xl border border-slate-200/60 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 size={17} className="text-sky-600" />
            <h3 className="text-sm font-bold text-slate-700">Evidencia y validación</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">Registra pruebas concretas de tus competencias. El colegio puede validarlas.</p>
        </div>
        {isOwner && (
          <button
            onClick={() => { setFormOpen((open) => !open); setMessage(null); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-sky-700"
          >
            <Plus size={13} /> Agregar evidencia
          </button>
        )}
      </div>

      <div className="mt-4">
        <CompletenessSummary result={completeness} />
      </div>

      {formOpen && isOwner && (
        <div className="mt-4 space-y-3 rounded-xl border border-sky-100 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">Título *
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400" placeholder="Ej: Sistema de riego automatizado" />
            </label>
            <label className="text-xs font-semibold text-slate-600">Tipo
              <select value={type} onChange={(e) => setType(e.target.value as ProfileEvidenceRow["evidence_type"])} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400">
                {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs font-semibold text-slate-600">Descripción
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400" placeholder="Qué hiciste, qué herramientas usaste y cuál fue el resultado." />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">Institución o fuente
              <input value={issuer} onChange={(e) => setIssuer(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400" placeholder="Ej: Colegio Técnico" />
            </label>
            <label className="text-xs font-semibold text-slate-600">Enlace
              <input value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400" placeholder="https://..." />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => { setFormOpen(false); resetForm(); }} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-white">Cancelar</button>
            <button onClick={handleSubmit} disabled={saving || !title.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <FileCheck2 size={13} />} Enviar a revisión
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{message}</p>}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
      ) : evidence.length === 0 ? (
        <div className="py-7 text-center text-xs text-slate-400">Todavía no hay evidencias registradas.</div>
      ) : (
        <div className="mt-4 space-y-2">
          {evidence.map((item) => {
            const status = STATUS_META[item.status];
            return (
              <article key={item.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 text-slate-400"><FileCheck2 size={15} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-sm font-bold text-slate-700">{item.title}</h4>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{TYPE_LABELS[item.evidence_type]}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className}`}>{status.label}</span>
                    </div>
                    {item.description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                      {item.issuer && <span>{item.issuer}</span>}
                      {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-600 hover:underline"><ExternalLink size={10} /> Ver enlace</a>}
                    </div>
                    {item.validation_note && <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700">{item.validation_note}</p>}
                  </div>
                  <div className="shrink-0">
                    {item.status === "verified" ? <CheckCircle2 size={16} className="text-emerald-500" />
                      : item.status === "rejected" ? <XCircle size={16} className="text-rose-500" />
                      : item.status === "pending" ? <Clock3 size={16} className="text-amber-500" />
                      : <RotateCcw size={16} className="text-slate-300" />}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
