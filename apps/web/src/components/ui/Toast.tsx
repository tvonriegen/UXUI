"use client";
// ──────────────────────────────────────────────────────────
// Toast – Ephemeral notification system
// ──────────────────────────────────────────────────────────
// Provides a global `useToast()` hook + <ToastViewport /> renderer.
// Replaces alert() / window.confirm() for non-blocking feedback.
//
// Usage:
//   const { toast } = useToast();
//   toast({ title: "Guardado", description: "...", type: "success" });
//
// Mount <ToastProvider> at the root; <ToastViewport> renders the stack.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastPayload {
  id?:          string;
  title:        string;
  description?: string;
  type?:        ToastType;
  /** Auto-dismiss after ms. 0 = sticky. Default 4500. */
  duration?:    number;
}

interface ToastInternal extends Required<Omit<ToastPayload, "id" | "description">> {
  id:           string;
  description?: string;
}

interface ToastCtx {
  toast:   (payload: ToastPayload) => string;
  dismiss: (id: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);
  const seqRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((payload: ToastPayload) => {
    const id       = payload.id ?? `t-${Date.now()}-${seqRef.current++}`;
    const duration = payload.duration ?? 4500;
    const entry: ToastInternal = {
      id,
      title:       payload.title,
      description: payload.description,
      type:        payload.type ?? "info",
      duration,
    };
    setToasts((prev) => [...prev, entry]);
    if (duration > 0) {
      window.setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback: no-op so non-provider callers don't crash
    return {
      toast: (p) => { console.warn("useToast called outside ToastProvider:", p.title); return ""; },
      dismiss: () => {},
    };
  }
  return ctx;
}

// ─── Viewport (portal to body) ──────────────────────────────

function ToastViewport({ toasts, onDismiss }: { toasts: ToastInternal[]; onDismiss: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100vw-2rem)] sm:w-96">
      {toasts.map((t) => <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />)}
    </div>,
    document.body
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastInternal; onDismiss: () => void }) {
  const style = STYLES[toast.type];
  const Icon  = style.icon;
  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm animate-fade-in-up ${style.wrapper}`}
    >
      <Icon size={18} className={`${style.iconColor} shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight">{toast.title}</p>
        {toast.description && <p className="text-xs opacity-80 mt-0.5">{toast.description}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-700 shrink-0 mt-0.5"
        aria-label="Cerrar notificación"
      >
        <X size={14} />
      </button>
    </div>
  );
}

const STYLES: Record<ToastType, { wrapper: string; iconColor: string; icon: typeof CheckCircle2 }> = {
  success: { wrapper: "bg-emerald-50/95 border-emerald-200 text-emerald-900", iconColor: "text-emerald-600", icon: CheckCircle2 },
  error:   { wrapper: "bg-red-50/95 border-red-200 text-red-900",             iconColor: "text-red-600",     icon: AlertCircle  },
  warning: { wrapper: "bg-amber-50/95 border-amber-200 text-amber-900",       iconColor: "text-amber-600",   icon: AlertCircle  },
  info:    { wrapper: "bg-white/95 border-slate-200 text-slate-800",          iconColor: "text-cyan-600",    icon: Info         },
};
