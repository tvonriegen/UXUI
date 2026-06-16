"use client";
// ──────────────────────────────────────────────────────────────────
// ChatWidget — floating AI assistant (all authenticated roles)
// Epic 3: Context-Aware Agentic Chatbot
// ──────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, X, Send, Loader2, Bot, Sparkles, ChevronDown,
} from "lucide-react";
import { useRole } from "@/lib/role-context";
import { useAuth } from "@/lib/auth-context";

// ── Types ─────────────────────────────────────────────────────────

interface ChatMessage {
  id:       string;
  role:     "user" | "assistant";
  content:  string;
  pending?: boolean;
  tool?:    string;
}

// ── Per-role config ───────────────────────────────────────────────

const ROLE_CONFIG: Record<string, {
  accent: string; hover: string; bubble: string;
  tools: string[]; tagline: string;
}> = {
  Empresa: {
    accent: "bg-violet-600", hover: "hover:bg-violet-700", bubble: "bg-violet-600 text-white",
    tagline: "Consulta vacantes, postulantes y estadísticas de reclutamiento.",
    tools: [
      "Listar y analizar tus vacantes publicadas",
      "Ver postulantes por vacante y estado",
      "Obtener el perfil completo de un candidato",
      "Estadísticas globales de reclutamiento",
    ],
  },
  Colegio: {
    accent: "bg-cyan-600", hover: "hover:bg-cyan-700", bubble: "bg-cyan-600 text-white",
    tagline: "Consulta estudiantes, solicitudes de práctica y datos del colegio.",
    tools: [
      "Listar y filtrar tus estudiantes activos",
      "Ver perfil completo de un estudiante",
      "Consultar solicitudes de prácticas entrantes",
    ],
  },
  Estudiante: {
    accent: "bg-indigo-600", hover: "hover:bg-indigo-700", bubble: "bg-indigo-600 text-white",
    tagline: "Explora vacantes, consulta postulaciones y prepárate para entrevistas.",
    tools: [
      "Explorar vacantes de práctica disponibles",
      "Consultar el estado de tus postulaciones",
      "Prepararte para entrevistas con IA",
      "Obtener orientación profesional personalizada",
    ],
  },
  Egresado: {
    accent: "bg-emerald-600", hover: "hover:bg-emerald-700", bubble: "bg-emerald-600 text-white",
    tagline: "Busca oportunidades, mejora tu CV y obtén recomendaciones personalizadas.",
    tools: [
      "Buscar vacantes compatibles con tu perfil",
      "Revisar y mejorar tu CV con IA",
      "Obtener recomendaciones de empresas",
      "Analizar brechas de habilidades",
    ],
  },
};

const FALLBACK_CONFIG = ROLE_CONFIG.Estudiante;

// ── Component ─────────────────────────────────────────────────────

export default function ChatWidget() {
  const { role } = useRole();
  const { user }  = useAuth();

  const [open, setOpen]           = useState(false);
  const [input, setInput]         = useState("");
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // All hooks before any early return
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streaming]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const clearHistory = useCallback(() => setMessages([]), []);

  const aiEnabled = process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === "true";

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: ChatMessage      = { id: `u-${Date.now()}`, role: "user", content: text };
    const placeholderId             = `a-${Date.now()}`;
    const placeholder: ChatMessage  = { id: placeholderId, role: "assistant", content: "", pending: true };

    setMessages((prev) => [...prev, userMsg, placeholder]);
    setStreaming(true);

    // ── Mock path (AI not yet enabled) ───────────────────────────
    if (!aiEnabled) {
      await new Promise((r) => setTimeout(r, 1400));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content: "¡Hola! Soy el Asistente ClassLink. Todavía estoy en desarrollo, pero muy pronto podré ayudarte con todo lo que necesites. ¡Mantente al tanto! 🚀",
                pending: false,
              }
            : m
        )
      );
      setStreaming(false);
      return;
    }

    // ── Live path (AI enabled) ────────────────────────────────────
    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === "text") {
              assembled += parsed.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId ? { ...m, content: assembled, pending: false, tool: undefined } : m
                )
              );
            } else if (parsed.type === "tool_call") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId ? { ...m, tool: parsed.tool } : m
                )
              );
            } else if (parsed.type === "error") {
              assembled = `Lo siento, ocurrió un error: ${parsed.message}`;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId ? { ...m, content: assembled, pending: false, tool: undefined } : m
                )
              );
            }
          } catch { /* malformed JSON — skip */ }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId ? { ...m, content: assembled || "…", pending: false, tool: undefined } : m
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId ? { ...m, content: `Error: ${msg}`, pending: false } : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, aiEnabled]);

  // Only render for authenticated users
  if (!user) return null;

  const cfg       = ROLE_CONFIG[role] ?? FALLBACK_CONFIG;
  const { accent: accentCls, hover: hoverCls, bubble: bubbleCls } = cfg;

  // ── Render ────────────────────────────────────────────────────

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir asistente IA"
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 p-3.5 rounded-full shadow-lg ${accentCls} ${hoverCls} text-white transition-all hover:scale-105 active:scale-95 flex items-center justify-center`}
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-36 right-4 md:bottom-20 md:right-6 z-40 w-[calc(100vw-2rem)] max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className={`${accentCls} px-4 py-3 flex items-center gap-2.5 shrink-0`}>
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">Asistente ClassLink</p>
              <p className="text-[10px] text-white/70">{role} · IA con herramientas</p>
            </div>
            <div className="flex items-center gap-1.5">
              {messages.length > 0 && (
                <button onClick={clearHistory} className="text-white/60 hover:text-white text-[10px] underline">
                  Limpiar
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 thin-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-2">
                <div className={`w-14 h-14 rounded-2xl ${accentCls} flex items-center justify-center`}>
                  <Sparkles size={24} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">Asistente IA — Próximamente</p>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{cfg.tagline}</p>
                </div>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] text-slate-400 space-y-1 text-left">
                  <p className="font-semibold text-slate-500 mb-1">Herramientas en desarrollo:</p>
                  {cfg.tools.map((t) => (
                    <p key={t}>· {t}</p>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className={`w-6 h-6 rounded-full ${accentCls} flex items-center justify-center shrink-0 mr-2 mt-0.5`}>
                      <Bot size={11} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    isUser ? `${bubbleCls} rounded-br-sm` : "bg-slate-100 text-slate-700 rounded-bl-sm"
                  }`}>
                    {m.pending && m.tool && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1.5">
                        <Loader2 size={10} className="animate-spin" />
                        Consultando {m.tool}…
                      </div>
                    )}
                    {m.pending && !m.content && (
                      <div className="flex gap-1 items-center py-0.5">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    )}
                    {m.content && <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-100 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={aiEnabled ? "Escribe tu pregunta…" : "Prueba el asistente…"}
              disabled={streaming}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              className={`${accentCls} ${hoverCls} text-white p-2.5 rounded-full disabled:opacity-40 transition-colors shrink-0`}
            >
              {streaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
