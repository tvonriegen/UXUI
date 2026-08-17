"use client";
// ──────────────────────────────────────────────────────────
// Settings Page – /settings
// ──────────────────────────────────────────────────────────
// Full-page settings with tabbed navigation matching the design.
// Tabs: Cuenta · Privacidad · Notificaciones · Apariencia · Ayuda
//
// Connects to:
//  - useAuth() for current user info
//  - localStorage "talenthub_config" for dark/compact toggles
//  - role-context for notification preferences
// ──────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useRouter }    from "next/navigation";
import PageLayout       from "@/components/layout/PageLayout";
import { useAuth }      from "@/lib/auth-context";
import { useRole }      from "@/lib/role-context";
import { supabase }     from "@/lib/supabase";
import { useToast }     from "@/components/ui/Toast";
import Link             from "next/link";
import {
  User, Shield, Bell, Sparkles, BookOpen,
  ChevronRight, Moon, Sun, Monitor, LogOut,
} from "lucide-react";

// ── Config helpers (mirror ConfigModal logic) ─────────────
const STORAGE_KEY = "talenthub_config";

interface AppConfig {
  theme:       "light" | "dark" | "system";
  compactView: boolean;
}
const DEFAULT_CFG: AppConfig = { theme: "system", compactView: false };

function loadCfg(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CFG;
    const parsed = JSON.parse(raw);
    return {
      theme: parsed.theme ?? (parsed.darkMode === true ? "dark" : "system"),
      compactView: parsed.compactView ?? false,
    };
  } catch {
    return DEFAULT_CFG;
  }
}
function saveCfg(c: AppConfig) {
  let existing: Record<string, unknown> = {};
  try { existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { existing = {}; }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...existing,
    ...c,
    darkMode: c.theme === "dark",
  }));
}

// ── Tabs ─────────────────────────────────────────────────

const TABS = [
  { id: "cuenta",       label: "Cuenta",         icon: User     },
  { id: "privacidad",   label: "Privacidad",      icon: Shield   },
  { id: "notifs",       label: "Notificaciones",  icon: Bell     },
  { id: "apariencia",   label: "Apariencia",      icon: Sparkles },
  { id: "ayuda",        label: "Ayuda",           icon: BookOpen },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Toggle component ──────────────────────────────────────

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1">
        <p className="text-[13.5px] font-semibold text-slate-800">{label}</p>
        {sub && <p className="text-[11.5px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-label={label}
        className={`relative w-10 h-6 rounded-full transition-all duration-200 ${
          checked ? "bg-sky-500" : "bg-slate-200"
        }`}
        aria-checked={checked}
        role="switch"
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ── Row component ─────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 mb-2.5">
      <div>
        <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-[13.5px] font-semibold text-slate-800">{value || "—"}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export default function SettingsPage() {
  const { user, logout }  = useAuth();
  const { role }          = useRole();
  const { toast }         = useToast();
  const router            = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("cuenta");
  const [cfg,       setCfg]       = useState<AppConfig>(DEFAULT_CFG);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Privacy toggles (UI only for now — no DB persistence yet)
  const [privVisible,   setPrivVisible]   = useState(true);
  const [privGpa,       setPrivGpa]       = useState(false);
  const [privMessages,  setPrivMessages]  = useState(true);
  const [privFeria,     setPrivFeria]     = useState(true);

  // Notification prefs (UI only)
  const [nMatch,   setNMatch]   = useState(true);
  const [nMsg,     setNMsg]     = useState(true);
  const [nBadge,   setNBadge]   = useState(true);
  const [nSocial,  setNSocial]  = useState(false);
  const [nReminder,setNReminder]= useState(true);
  const [nWeekly,  setNWeekly]  = useState(false);

  useEffect(() => {
    setCfg(loadCfg());
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      user.accountType === "student"
        ? supabase.from("student_profiles").select("public_visibility").eq("profile_id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]).then(([prefsResult, studentResult]) => {
      const prefs = prefsResult.data;
      if (prefs) {
        setPrivMessages(prefs.allow_direct_messages ?? true);
        setPrivGpa(prefs.show_gpa ?? false);
        setPrivFeria(prefs.internship_fair_visible ?? true);
        setNMatch(prefs.notify_matches ?? true);
        setNMsg(prefs.notify_messages ?? true);
        setNBadge(prefs.notify_badges ?? true);
        setNSocial(prefs.notify_social ?? false);
        setNReminder(prefs.notify_reminders ?? true);
        setNWeekly(prefs.weekly_email ?? false);
        setCfg({ theme: prefs.theme ?? "system", compactView: prefs.compact_view ?? false });
      }
      if (studentResult.data) setPrivVisible(studentResult.data.public_visibility ?? false);
      setLoadingPrefs(false);
    }).catch(() => {
      setLoadingPrefs(false);
      toast({ type: "error", title: "No se pudieron cargar las preferencias" });
    });
  }, [toast, user?.accountType, user?.id]);

  useEffect(() => {
    const dark = cfg.theme === "dark" || (cfg.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("compact", cfg.compactView);
    saveCfg(cfg);
  }, [cfg]);

  const setCfgKey = <K extends keyof AppConfig>(key: K, val: AppConfig[K]) => {
    const next = { ...cfg, [key]: val };
    setCfg(next);
    saveCfg(next);
  };

  const savePreferences = async () => {
    if (!user?.id) return;
    setSavingPrefs(true);
    const { error: preferencesError } = await supabase.from("user_preferences").upsert({
      user_id: user.id,
      allow_direct_messages: privMessages,
      show_gpa: privGpa,
      internship_fair_visible: privFeria,
      notify_matches: nMatch,
      notify_messages: nMsg,
      notify_badges: nBadge,
      notify_social: nSocial,
      notify_reminders: nReminder,
      weekly_email: nWeekly,
      theme: cfg.theme,
      compact_view: cfg.compactView,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    const { error: visibilityError } = user.accountType === "student"
      ? await supabase.from("student_profiles").update({ public_visibility: privVisible, updated_at: new Date().toISOString() }).eq("profile_id", user.id)
      : { error: null };
    setSavingPrefs(false);
    if (preferencesError || visibilityError) {
      toast({ type: "error", title: "No se pudieron guardar las preferencias", description: preferencesError?.message ?? visibilityError?.message });
      return;
    }
    window.dispatchEvent(new Event("talenthub-preferences-updated"));
    toast({ type: "success", title: "Preferencias guardadas" });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
    router.replace("/login");
  };

  return (
    <PageLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full">

        {/* ── Header ── */}
        <div className="mb-6 animate-fade-in-up">
          <p className="text-xs font-bold text-sky-600 uppercase tracking-widest mb-1">Configuración</p>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Ajustes</h1>
          <p className="text-sm text-slate-500 mt-1">Gestioná tu cuenta, privacidad y preferencias.</p>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 animate-fade-in-up stagger-2">

          {/* Sidebar nav */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-2 h-fit">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  aria-pressed={active}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                    text-[13px] font-medium text-left transition-all duration-150
                    ${active
                      ? "bg-sky-50 text-sky-700 font-semibold"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    }
                  `}
                >
                  <Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Content panel */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 md:p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-5 capitalize">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>

            {/* ── Cuenta ── */}
            {activeTab === "cuenta" && (
              <div>
                <Row label="Nombre"       value={user?.name  ?? ""} />
                <Row label="Correo"       value={user?.email ?? ""} />
                <Row label="Rol"          value={role} />
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-red-600 text-sm font-semibold hover:underline"
                  >
                    <LogOut size={15} /> Cerrar sesión
                  </button>
                  <Link href="/change-password" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:underline">
                    Cambiar contraseña
                  </Link>
                </div>
              </div>
            )}

            {/* ── Privacidad ── */}
            {activeTab === "privacidad" && (
              <div>
                {user?.accountType === "student" && <Toggle label="Perfil visible para empresas" sub="Aparecerás en búsquedas de talento verificado." checked={privVisible} onChange={setPrivVisible} />}
                {user?.accountType === "student" && <Toggle label="Mostrar promedio en el perfil" sub="Tu GPA visible a recruiters." checked={privGpa} onChange={setPrivGpa} />}
                <Toggle
                  label="Permitir mensajes directos"
                  sub="Cualquier usuario verificado puede escribirte."
                  checked={privMessages}
                  onChange={setPrivMessages}
                />
                {user?.accountType === "student" && <Toggle label="Aparecer en feria de práctica" sub="Empresas podrán pre-entrevistarte." checked={privFeria} onChange={setPrivFeria} />}
                <button type="button" onClick={savePreferences} disabled={savingPrefs || loadingPrefs} className="mt-5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50">{savingPrefs ? "Guardando…" : "Guardar privacidad"}</button>
              </div>
            )}

            {/* ── Notificaciones ── */}
            {activeTab === "notifs" && (
              <div>
                <Toggle label="Nuevas ofertas con match &gt; 80%"  checked={nMatch}    onChange={setNMatch}    />
                <Toggle label="Mensajes directos"                  checked={nMsg}      onChange={setNMsg}      />
                <Toggle label="Insignias desbloqueadas"            checked={nBadge}    onChange={setNBadge}    />
                <Toggle label="Actividad de tu red"                checked={nSocial}   onChange={setNSocial}   />
                <Toggle label="Recordatorios del colegio"          checked={nReminder} onChange={setNReminder} />
                <button type="button" onClick={savePreferences} disabled={savingPrefs || loadingPrefs} className="mt-5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50">{savingPrefs ? "Guardando…" : "Guardar notificaciones"}</button>
              </div>
            )}

            {/* ── Apariencia ── */}
            {activeTab === "apariencia" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tema</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Claro",    icon: Sun,     key: "light" },
                      { label: "Oscuro",   icon: Moon,    key: "dark"  },
                      { label: "Sistema",  icon: Monitor, key: "auto"  },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const active = opt.key === cfg.theme;
                      return (
                        <button
                          key={opt.key}
                          aria-pressed={active}
                          onClick={() => setCfgKey("theme", opt.key as AppConfig["theme"])}
                          className={`
                            flex flex-col items-center gap-2 p-4 rounded-xl border transition-all
                            ${active
                              ? "border-sky-500 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                            }
                          `}
                        >
                          <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                          <span className="text-xs font-semibold">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3">
                  <Toggle
                    label="Vista compacta"
                    sub="Reduce el espaciado para ver más contenido."
                    checked={cfg.compactView}
                    onChange={(v) => setCfgKey("compactView", v)}
                  />
                  <button type="button" onClick={savePreferences} disabled={savingPrefs || loadingPrefs} className="mt-5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50">{savingPrefs ? "Guardando…" : "Guardar apariencia"}</button>
                </div>
              </div>
            )}

            {/* ── Ayuda ── */}
            {activeTab === "ayuda" && (
              <div className="space-y-2">
                {[
                  { label: "Reportar un problema", href: "mailto:soporte@talenthub.cl" },
                  { label: "Términos y condiciones", href: "/terms" },
                  { label: "Política de privacidad", href: "/privacy" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="w-full flex justify-between items-center px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors text-left"
                  >
                    <span>{item.label}</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
