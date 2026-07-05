"use client";
// ──────────────────────────────────────────────────────────
// Register Page – route: /register
// ──────────────────────────────────────────────────────────
// Creates a new Supabase Auth user + a matching profile row.

import { useState, useEffect } from "react";
import Link        from "next/link";
import { useRouter } from "next/navigation";
import { useAuth }  from "@/lib/auth-context";
import CursorGlow   from "@/components/layout/CursorGlow";
import type { Role } from "@/lib/types";
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { registerSchema } from "@/lib/schemas";

// Only organizations can self-register.
// Students are created exclusively by their school via the admin panel.
const ROLES: { value: Role; label: string; emoji: string }[] = [
  { value: "Empresa", label: "Empresa", emoji: "🏢" },
  { value: "Colegio", label: "Colegio", emoji: "🏫" },
];

export default function RegisterPage() {
  const { register, user } = useAuth();
  const router              = useRouter();

  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [role,         setRole]         = useState<Role>("Empresa");
  const [showPass,     setShowPass]     = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already authenticated → go to dashboard
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = registerSchema.safeParse({ name, email, password, confirmPassword: confirm, role });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    const { error: regError } = await register(email.trim(), password, name.trim(), role);

    if (regError) {
      setError(regError);
      setIsSubmitting(false);
    } else {
      setSuccess(true);
      // Give Supabase a moment to persist the session, then redirect
      setTimeout(() => router.replace("/"), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-cl-surface flex items-center justify-center p-4 relative overflow-hidden">
      <CursorGlow />

      <div
        aria-hidden="true"
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle, #00687a, transparent)" }}
      />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-200/60 overflow-hidden">

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
                Registro de organización
              </h1>
              <p className="text-cyan-100 text-sm mt-1">
                Solo Empresas y Colegios pueden registrarse aquí
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-4">

            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200/60 text-red-600 px-4 py-3 rounded-xl text-sm animate-scale-in">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200/60 text-emerald-700 px-4 py-3 rounded-xl text-sm animate-scale-in">
                <CheckCircle size={16} className="shrink-0" />
                ¡Cuenta creada! Redirigiendo…
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="tu@correo.cr"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none transition-all"
              />
            </div>

            {/* Role selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Tipo de usuario
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                      ${role === r.value
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                      }
                    `}
                  >
                    <span>{r.emoji}</span> {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Mín. 12 car., 1 número, 1 especial"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || success || !name || !email || !password || !confirm}
              className="w-full primary-gradient text-white py-3.5 rounded-xl font-bold text-sm hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-cyan-200/40 flex items-center justify-center gap-2 btn-press"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Creando cuenta…
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Crear cuenta
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="px-8 pb-8 text-center">
            <p className="text-sm text-slate-500">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-cyan-600 font-semibold hover:underline">
                Ingresar
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          ClassLink © 2025 — Plataforma vocacional
        </p>
      </div>
    </div>
  );
}
