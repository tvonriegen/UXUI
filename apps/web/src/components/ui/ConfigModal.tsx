"use client";
// ──────────────────────────────────────────────────────────
// ConfigModal – Application configuration center
// ──────────────────────────────────────────────────────────
// Opens when the "Configuración" button in the sidebar is clicked.
// Settings are persisted in localStorage under "classlink_config".
//
// Sections:
//  - Apariencia  : Dark mode, Compact view
//  - Idioma      : Language selector (cosmetic for now)
//  - Desarrollador : Admin mode, debug overlay
//  - Cuenta      : Current user info + logout
// ──────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth-context";
import {
  X, Moon, Sun, Globe, ShieldCheck, Zap, LogOut,
  Monitor, ChevronRight, Info,
} from "lucide-react";

// ── Persisted config shape ────────────────────────────────

interface AppConfig {
  darkMode:    boolean;
  compactView: boolean;
  language:    "es" | "en";
  adminMode:   boolean;
  debugInfo:   boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  darkMode:    false,
  compactView: false,
  language:    "es",
  adminMode:   false,
  debugInfo:   false,
};

const STORAGE_KEY = "classlink_config";

function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(cfg: AppConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// Apply dark mode class to <html> and expose config globally
function applyDarkMode(enabled: boolean) {
  if (enabled) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function applyCompactView(enabled: boolean) {
  if (enabled) {
    document.documentElement.classList.add("compact");
  } else {
    document.documentElement.classList.remove("compact");
  }
}

// ── Public helper to check admin mode ────────────────────

export function isAdminMode(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return JSON.parse(raw)?.adminMode === true;
  } catch {
    return false;
  }
}

// ── Toggle component ──────────────────────────────────────

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 ${
        checked ? "bg-cyan-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Section header ────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 mt-5 first:mt-0">
      {label}
    </p>
  );
}

// ── Setting row ───────────────────────────────────────────

function SettingRow({
  icon,
  label,
  sub,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3 px-1 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

interface ConfigModalProps {
  open:    boolean;
  onClose: () => void;
}

export default function ConfigModal({ open, onClose }: ConfigModalProps) {
  const { user, logout } = useAuth();
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // Load config from localStorage on mount
  useEffect(() => {
    const cfg = loadConfig();
    setConfig(cfg);
    applyDarkMode(cfg.darkMode);
    applyCompactView(cfg.compactView);
  }, []);

  // Body scroll lock
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else       document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const update = useCallback(<K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      saveConfig(next);

      // Side effects
      if (key === "darkMode")    applyDarkMode(value as boolean);
      if (key === "compactView") applyCompactView(value as boolean);

      // Expose admin mode globally for other components
      if (key === "adminMode") {
        if (value) {
          document.documentElement.dataset.admin = "true";
        } else {
          delete document.documentElement.dataset.admin;
        }
      }

      return next;
    });
  }, []);

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Configuración</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">ClassLink · Ajustes de la app</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors btn-press"
            aria-label="Cerrar"
          >
            <X size={17} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto thin-scrollbar px-6 py-4">

          {/* ── Apariencia ── */}
          <SectionHeader label="Apariencia" />

          <SettingRow
            icon={config.darkMode
              ? <Moon size={16} className="text-slate-600" />
              : <Sun  size={16} className="text-amber-500" />
            }
            label="Modo oscuro"
            sub={config.darkMode ? "Activado" : "Desactivado"}
            right={
              <Toggle
                id="darkMode"
                checked={config.darkMode}
                onChange={(v) => update("darkMode", v)}
              />
            }
          />

          <SettingRow
            icon={<Monitor size={16} className="text-slate-500" />}
            label="Vista compacta"
            sub="Reduce el espaciado y tamaño de texto"
            right={
              <Toggle
                id="compactView"
                checked={config.compactView}
                onChange={(v) => update("compactView", v)}
              />
            }
          />

          {/* ── Idioma ── */}
          <SectionHeader label="Idioma" />

          <SettingRow
            icon={<Globe size={16} className="text-cyan-500" />}
            label="Idioma de la app"
            sub="Español / English"
            right={
              <select
                value={config.language}
                onChange={(e) => update("language", e.target.value as "es" | "en")}
                className="text-sm border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-cyan-200 bg-white"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            }
          />

          {/* ── Desarrollador ── */}
          <SectionHeader label="Desarrollador" />

          <SettingRow
            icon={<ShieldCheck size={16} className={config.adminMode ? "text-violet-600" : "text-slate-400"} />}
            label="Modo administrador"
            sub={config.adminMode
              ? "Acceso de administrador activado"
              : "Habilita funciones de administración"
            }
            right={
              <Toggle
                id="adminMode"
                checked={config.adminMode}
                onChange={(v) => update("adminMode", v)}
              />
            }
          />

          <SettingRow
            icon={<Zap size={16} className={config.debugInfo ? "text-amber-500" : "text-slate-400"} />}
            label="Información de debug"
            sub="Muestra datos técnicos en consola"
            right={
              <Toggle
                id="debugInfo"
                checked={config.debugInfo}
                onChange={(v) => update("debugInfo", v)}
              />
            }
          />

          {config.adminMode && (
            <div className="mt-3 p-3 rounded-xl bg-violet-50 border border-violet-100 flex items-start gap-2">
              <Info size={14} className="text-violet-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-violet-700 leading-relaxed">
                <strong>Admin activo.</strong> Puedes ver todos los perfiles en Talento, acceder a funciones de moderación y ver datos extra en el dashboard. Solo para uso en desarrollo.
              </p>
            </div>
          )}

          {/* ── Cuenta ── */}
          <SectionHeader label="Cuenta" />

          {user && (
            <div className="flex items-center gap-3 py-3 px-1 mb-1">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                <span className="text-[10px] bg-cyan-50 text-cyan-700 px-1.5 py-0.5 rounded font-medium">
                  {user.role}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 transition-colors text-red-600 font-semibold text-sm mt-2"
          >
            <LogOut size={16} />
            Cerrar sesión
            <ChevronRight size={14} className="ml-auto opacity-50" />
          </button>

          <p className="text-center text-[10px] text-slate-300 mt-6 mb-2">
            ClassLink · v0.9.0 dev · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
