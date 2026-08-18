"use client";
// ──────────────────────────────────────────────────────────
// Login Page – route: /login
// ──────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import Link       from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import PublicShell from "@/components/layout/PublicShell";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { loginSchema } from "@/lib/schemas";
import { trackAnalyticsEvent } from "@/lib/analytics";

const LOGIN_ROUTE_ERRORS: Record<string, string> = {
  profile: "Tu cuenta no tiene un perfil válido. Contacta al administrador para recuperar el acceso.",
  account_status: "Esta cuenta está suspendida o deshabilitada. Contacta al administrador.",
};

export default function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  const { login, user } = useAuth();
  const router           = useRouter();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [error,        setError]        = useState(() =>
    searchParams?.error ? LOGIN_ROUTE_ERRORS[searchParams.error] ?? "No se pudo validar la cuenta." : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      trackAnalyticsEvent("login", { method: "password" });
      router.replace("/");
      return;
    } else {
      setError("Correo o contraseña incorrectos.");
      setIsSubmitting(false);
    }
  };

  return (
    <PublicShell contentClassName="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:py-14">

      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle, #4f46e5, transparent)" }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-200/60 overflow-hidden">

          {/* Gradient header */}
          <div className="primary-gradient px-8 py-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 hero-pattern" />
            <div className="relative">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Bienvenido de vuelta
              </h1>
              <p className="text-sky-100 text-sm mt-1">
                Ingresa a tu cuenta para continuar
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">

            {error && (
              <div role="alert" className="flex items-center gap-2.5 bg-red-50 border border-red-200/60 text-red-600 px-4 py-3 rounded-xl text-sm animate-scale-in">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
               <label htmlFor="login-email" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Correo electrónico
              </label>
              <input
                type="email"
                id="login-email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="tu@correo.cr"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-200 focus:border-sky-400 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
               <label htmlFor="login-password" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  id="login-password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-200 focus:border-sky-400 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 rounded"
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full primary-gradient text-white py-3.5 rounded-xl font-bold text-sm hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-sky-200/40 flex items-center justify-center gap-2 btn-press"
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
              <Link href="/register" className="text-sky-700 font-semibold hover:underline">
                Crear cuenta
              </Link>
            </p>
          </div>

        </div>

      </div>
    </PublicShell>
  );
}
