"use client";
// ──────────────────────────────────────────────────────────
// Change Password Page — /change-password
// ──────────────────────────────────────────────────────────
// Shown to students who log in for the first time after being
// created by their school. They MUST set a new password before
// accessing any other page. The must_change_password flag lives
// in app_metadata and is cleared by a Server Action after success.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { clearMustChangePassword } from "@/app/actions/school";
import { Eye, EyeOff, KeyRound, AlertCircle, CheckCircle } from "lucide-react";

const MIN_LENGTH = 8;

function getStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= MIN_LENGTH) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  const labels = ["Muy débil", "Débil", "Regular", "Fuerte", "Muy fuerte"];
  const colors = ["bg-red-400", "bg-orange-400", "bg-amber-400", "bg-lime-500", "bg-emerald-500"];
  return { score, label: labels[score] ?? "Muy fuerte", color: colors[score] ?? "bg-emerald-500" };
}

export default function ChangePasswordPage() {
  const router = useRouter();

  const [newPassword,  setNewPassword]  = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = getStrength(newPassword);
  const mismatch = confirm.length > 0 && newPassword !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (newPassword !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Update password via the shared SSR-aware client (session is inherited from cookies)
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        setError(updateErr.message);
        setIsSubmitting(false);
        return;
      }

      // Clear the server-side flag (updates app_metadata via admin API)
      const result = await clearMustChangePassword();
      if ("error" in result && result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Force a session refresh so onAuthStateChange re-reads app_metadata
      // with must_change_password=false, unmounting the popup permanently.
      await supabase.auth.refreshSession();

      setSuccess(true);
      setTimeout(() => router.replace("/"), 1500);
    } catch {
      setError("Ocurrió un error inesperado.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden">

        {/* Header */}
        <div className="primary-gradient px-8 pt-8 pb-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 hero-pattern" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-black text-base">CL</span>
              </div>
              <span className="text-white font-bold text-xl tracking-tight">ClassLink</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Establece tu contraseña
            </h1>
            <p className="text-cyan-100 text-sm mt-1">
              Por seguridad, debes crear una nueva contraseña antes de continuar.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">

          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200/60 text-red-600 px-4 py-3 rounded-xl text-sm">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200/60 text-emerald-700 px-4 py-3 rounded-xl text-sm">
              <CheckCircle size={16} className="shrink-0" />
              ¡Contraseña actualizada! Redirigiendo…
            </div>
          )}

          {/* New password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                placeholder={`Mín. ${MIN_LENGTH} caracteres`}
                className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {/* Strength bar */}
            {newPassword.length > 0 && (
              <div className="space-y-1 pt-0.5">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${i < strength.score ? strength.color : "bg-slate-200"}`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">{strength.label}</p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Confirmar contraseña
            </label>
            <input
              type={showPass ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              placeholder="Repite tu contraseña"
              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none transition-all ${
                mismatch ? "border-red-300 bg-red-50" : "border-slate-200"
              }`}
            />
            {mismatch && (
              <p className="text-[11px] text-red-500">Las contraseñas no coinciden</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || success || !newPassword || !confirm || mismatch}
            className="w-full primary-gradient text-white py-3.5 rounded-xl font-bold text-sm hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-cyan-200/40 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Guardando…
              </>
            ) : (
              <>
                <KeyRound size={16} /> Establecer contraseña
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
