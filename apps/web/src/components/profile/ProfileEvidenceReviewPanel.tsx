"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileCheck2, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { reviewProfileEvidence } from "@/app/actions/evidence";
import type { ProfileEvidenceRow } from "./ProfileEvidencePanel";

interface ProfileEvidenceReviewPanelProps {
  studentId: string;
}

export function ProfileEvidenceReviewPanel({ studentId }: ProfileEvidenceReviewPanelProps) {
  const [items, setItems] = useState<ProfileEvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profile_evidence")
      .select("id, evidence_type, title, description, url, issuer, status, reviewed_at, created_at")
      .eq("owner_id", studentId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as ProfileEvidenceRow[]);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, status: "verified" | "rejected") => {
    setReviewingId(id); setMessage(null);
    const result = await reviewProfileEvidence(id, status, note[id] ?? "");
    setReviewingId(null);
    if (result.error) { setMessage(result.error); return; }
    setMessage(status === "verified" ? "Evidencia validada." : "Evidencia devuelta al estudiante.");
    await load();
  };

  return (
    <div className="rounded-xl border border-sky-200/70 bg-sky-50/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileCheck2 size={14} className="text-sky-600" />
        <h5 className="text-xs font-bold uppercase tracking-wider text-sky-700">Evidencias del perfil</h5>
      </div>
      {message && <p className="mb-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">{message}</p>}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
      ) : items.length === 0 ? (
        <p className="py-3 text-xs text-slate-400">El estudiante aún no ha enviado evidencia.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-white bg-white p-3">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  {item.status === "verified" ? <CheckCircle2 size={14} className="text-emerald-500" />
                    : item.status === "rejected" ? <XCircle size={14} className="text-rose-500" />
                    : <Clock3 size={14} className="text-amber-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-700">{item.title}</p>
                  {item.description && <p className="mt-1 text-[11px] text-slate-500">{item.description}</p>}
                  {item.issuer && <p className="mt-1 text-[10px] text-slate-400">Fuente: {item.issuer}</p>}
                  {item.status === "pending" && (
                    <>
                      <input
                        value={note[item.id] ?? ""}
                        onChange={(e) => setNote((previous) => ({ ...previous, [item.id]: e.target.value }))}
                        placeholder="Nota opcional para el estudiante"
                        className="mt-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] outline-none focus:border-sky-400"
                      />
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => review(item.id, "verified")} disabled={reviewingId === item.id} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Validar</button>
                        <button onClick={() => review(item.id, "rejected")} disabled={reviewingId === item.id} className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-700 disabled:opacity-50">Solicitar ajustes</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
