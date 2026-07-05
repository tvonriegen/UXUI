"use client";
// ──────────────────────────────────────────────────────────
// ConfirmDialog – Promise-based window.confirm() replacement
// ──────────────────────────────────────────────────────────
// Usage inside any component:
//   const confirmFn = useConfirm();
//   const ok = await confirmFn({ title: "¿Eliminar?", body: "..." });
//   if (!ok) return;
//
// Mount <ConfirmProvider> near the root (below ToastProvider).

import {
  createContext, useCallback, useContext, useMemo, useRef, useState,
} from "react";
import Modal from "./Modal";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmOpts {
  title:   string;
  body?:   string;
  confirmLabel?: string;
  cancelLabel?:  string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOpts) => Promise<boolean>;

const Ctx = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open,   setOpen]   = useState(false);
  const [opts,   setOpts]   = useState<ConfirmOpts | null>(null);
  const [busy,   setBusy]   = useState(false);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirmFn = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    setOpen(true);
    return new Promise<boolean>((resolve) => { resolverRef.current = resolve; });
  }, []);

  const finish = (value: boolean) => {
    if (busy) return;
    setBusy(true);
    window.setTimeout(() => {
      resolverRef.current?.(value);
      resolverRef.current = null;
      setOpen(false);
      setBusy(false);
    }, 80);
  };

  const value = useMemo(() => confirmFn, [confirmFn]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Modal open={open} onClose={() => finish(false)} title={opts?.title ?? "Confirmar"}>
        <div className="space-y-5">
          {opts?.danger && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 leading-relaxed">
                {opts.body ?? "Esta acción es irreversible."}
              </p>
            </div>
          )}
          {!opts?.danger && opts?.body && (
            <p className="text-sm text-slate-600 leading-relaxed">{opts.body}</p>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => finish(false)}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 btn-press disabled:opacity-40"
            >
              {opts?.cancelLabel ?? "Cancelar"}
            </button>
            <button
              onClick={() => finish(true)}
              disabled={busy}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white btn-press disabled:opacity-40 flex items-center gap-1.5 ${
                opts?.danger ? "bg-red-600 hover:bg-red-700" : "bg-cyan-600 hover:bg-cyan-700"
              }`}
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              {opts?.confirmLabel ?? "Confirmar"}
            </button>
          </div>
        </div>
      </Modal>
    </Ctx.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback to native confirm if provider missing
    return async (opts) => window.confirm(`${opts.title}\n${opts.body ?? ""}`);
  }
  return ctx;
}
