"use client";
// ──────────────────────────────────────────────────────────
// Login Page – route: /login
// ──────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import Link       from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import CursorGlow  from "@/components/layout/CursorGlow";
import { Eye, EyeOff, LogIn, AlertCircle, Zap } from "lucide-react";
import { loginSchema } from "@/lib/schemas";

const DEMO_ACCOUNTS = [
  { label: "🏫 Colegio",    email: "colegio@demo.cr",  role: "Colegio"    },
  { label: "🎓 Estudiante", email: "alan@demo.cr",     role: "Estudiante" },
  { label: "🎓 Estudiante", email: "ian@demo.cr",      role: "Estudiante" },
  { label: "🏢 Empresa",    email: "google@demo.cr",   role: "Empresa"    },
] as const;

const DEMO_PASSWORD = "Demo1234!";

export default function LoginPage() {
  const { login, user } = useAuth();
  const router           = useRouter();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [error,        setError]        = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoLoading,  setDemoLoading]  = useState<string | null>(null);

  // Already authenticated → go to dashboard
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);

    const { error: authError } = await login(email.trim(), password);
    if (!authError) {
      router.replace("/");
    } else {
      setError("Correo o contraseña incorrectos.");
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError("");
    setDemoLoading(demoEmail);
    const { error: authError } = await login(demoEmail, DEMO_PASSWORD);
    if (!authError) {
      router.replace("/");
    } else {
      setError(`No se pudo acceder a la cuenta demo. Asegúrate de haber ejecutado /api/seed primero.`);
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-cl-surface flex items-center justify-center p-4 relative overflow-hidden">
      <CursorGlow />

      {/* Decorative blobs */}
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

      {/* Card */}
      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-200/60 overflow-hidden">

          {/* Gradient header */}
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
                Bienvenido de vuelta
              </h1>
              <p className="text-cyan-100 text-sm mt-1">
                Ingresa a tu cuenta para continuar
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">

            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200/60 text-red-600 px-4 py-3 rounded-xl text-sm animate-scale-in">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

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

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full primary-gradient text-white py-3.5 rounded-xl font-bold text-sm hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-cyan-200/40 flex items-center justify-center gap-2 btn-press"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Ingresando…
                </>
              ) : (
                <>
                  <LogIn size={16} /> Ingresar
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <div className="px-8 pb-5 text-center">
            <p className="text-sm text-slate-500">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="text-cyan-600 font-semibold hover:underline">
                Crear cuenta
              </Link>
            </p>
          </div>

          {/* ── Demo bypass section ── */}
          <div className="px-8 pb-8">
            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-amber-500" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Acceso rápido — Cuentas Demo
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleDemoLogin(acc.email)}
                    disabled={demoLoading !== null || isSubmitting}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {demoLoading === acc.email ? (
                      <svg className="animate-spin w-3.5 h-3.5 text-cyan-500 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    ) : null}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{acc.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">{acc.email}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Contraseña de todas: <span className="font-mono font-bold text-slate-500">Demo1234!</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          ClassLink © 2025 — Plataforma vocacional
        </p>
      </div>
    </div>
  );
}
