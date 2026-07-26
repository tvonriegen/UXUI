"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/lib/role-context";
import { ArrowLeft, Send, Search, Loader2, Trash2, MoreVertical, Check, CheckCheck, Users } from "lucide-react";
import InterviewProposalBubble from "@/components/ats/InterviewProposalBubble";

interface Participant {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface ConversationRow {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  other: Participant;
  lastPreview: string;
  lastSenderId: string;
  unread: number;
}

interface MessageRow {
  id:              string;
  conversation_id: string;
  sender_id:       string;
  content:         string;
  read:            boolean;
  created_at:      string;
  kind?:           "text" | "interview_proposal" | "system";
  metadata?:       Record<string, unknown> | null;
}

interface StudentDirectoryEntry {
  id:       string;
  name:     string;
  avatar:   string | null;
  specialty: string | null;
  class_name: string | null;
}

// ── Timestamp helpers ────────────────────────────────────

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hrs   = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)  return "Ahora";
  if (mins < 60) return `${mins}m`;
  if (hrs  < 24) return `${hrs}h`;
  if (days < 7)  return `${days}d`;
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { role } = useRole();
  const [convos, setConvos] = useState<ConversationRow[]>([]);
  const [activeConvo, setActiveConvo] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Student directory (Colegio only) ──────────────────────────
  const [leftTab, setLeftTab] = useState<"convos" | "students">("convos");
  const [students, setStudents] = useState<StudentDirectoryEntry[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [startingConvo, setStartingConvo] = useState<string | null>(null);

  // Fetch conversations + enrich with unread count + last message preview
  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoadingConvos(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("conversations")
        .select(`
          id, user1_id, user2_id, last_message_at,
          user1:profiles!conversations_user1_id_fkey(id, name, avatar, role),
          user2:profiles!conversations_user2_id_fkey(id, name, avatar, role)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (err) throw err;

      const baseRows: ConversationRow[] = (data ?? []).map((c: any) => {
        const other: Participant = c.user1_id === user.id ? c.user2 : c.user1;
        return {
          id: c.id,
          user1_id: c.user1_id,
          user2_id: c.user2_id,
          last_message_at: c.last_message_at,
          other: other ?? { id: "", name: "Usuario", avatar: "", role: "" },
          lastPreview: "",
          lastSenderId: "",
          unread: 0,
        };
      });

      if (baseRows.length === 0) { setConvos([]); setLoadingConvos(false); return; }

      const convoIds = baseRows.map((r) => r.id);

      // Parallel: last messages + unread counts
      const [{ data: lastMsgData }, { data: unreadData }] = await Promise.all([
        supabase
          .from("messages")
          .select("conversation_id, content, sender_id, read, created_at")
          .in("conversation_id", convoIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("messages")
          .select("conversation_id, id")
          .in("conversation_id", convoIds)
          .eq("read", false)
          .neq("sender_id", user.id),
      ]);

      // Build last-message map (first occurrence per convo since sorted desc)
      const lastMsgMap: Record<string, { content: string; sender_id: string; read: boolean }> = {};
      (lastMsgData ?? []).forEach((m: any) => {
        if (!lastMsgMap[m.conversation_id]) {
          lastMsgMap[m.conversation_id] = {
            content: m.content,
            sender_id: m.sender_id,
            read: m.read,
          };
        }
      });

      // Build unread count map
      const unreadMap: Record<string, number> = {};
      (unreadData ?? []).forEach((m: any) => {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] ?? 0) + 1;
      });

      const enriched = baseRows.map((r) => ({
        ...r,
        lastPreview:  lastMsgMap[r.id]?.content   ?? "",
        lastSenderId: lastMsgMap[r.id]?.sender_id ?? "",
        unread:       unreadMap[r.id]             ?? 0,
      }));

      setConvos(enriched);
    } catch {
      setError("No se pudieron cargar las conversaciones.");
    } finally {
      setLoadingConvos(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Student directory fetch (Colegio only) ────────────────────
  const fetchStudents = useCallback(async () => {
    if (!user?.id || role !== "Colegio") return;
    setLoadingStudents(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, name, avatar, specialty, class_name")
      .eq("school_id", user.id)
      .eq("role", "Estudiante")
      .order("name");
    setStudents((data ?? []) as StudentDirectoryEntry[]);
    setLoadingStudents(false);
  }, [user?.id, role]);

  useEffect(() => {
    if (leftTab === "students") fetchStudents();
  }, [leftTab, fetchStudents]);

  // Open (or resume) a DM between this school and a student
  const openStudentConvo = useCallback(async (student: StudentDirectoryEntry) => {
    if (!user?.id) return;
    setStartingConvo(student.id);

    // Find or create a canonical conversation (sorted pair)
    const a = user.id < student.id ? user.id : student.id;
    const b = user.id < student.id ? student.id : user.id;

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("id, user1_id, user2_id, last_message_at")
      .or(`user1_id.eq.${a},user2_id.eq.${a}`)
      .or(`user1_id.eq.${b},user2_id.eq.${b}`)
      .limit(10);

    const found = (existing ?? []).find(
      (c: { user1_id: string; user2_id: string }) =>
        (c.user1_id === a && c.user2_id === b) || (c.user1_id === b && c.user2_id === a)
    );

    let convoId: string;
    if (found) {
      convoId = found.id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from("conversations")
        .insert({ user1_id: a, user2_id: b })
        .select("id")
        .single();
      if (createErr || !created) {
        setStartingConvo(null);
        return;
      }
      convoId = created.id;
    }

    // Build a ConversationRow and activate it
    const convoRow: ConversationRow = {
      id:              convoId,
      user1_id:        a,
      user2_id:        b,
      last_message_at: found?.last_message_at ?? new Date().toISOString(),
      other: {
        id:     student.id,
        name:   student.name,
        avatar: student.avatar ?? "",
        role:   "Estudiante",
      },
      lastPreview:  "",
      lastSenderId: "",
      unread:       0,
    };

    setConvos((prev) => {
      const exists = prev.find((c) => c.id === convoId);
      return exists ? prev : [convoRow, ...prev];
    });
    setActiveConvo(convoRow);
    setLeftTab("convos");
    setStartingConvo(null);
  }, [user?.id]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (convoId: string) => {
    setLoadingMsgs(true);
    const { data, error: err } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, read, created_at, kind, metadata")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (!err && data) {
      setMessages(data as MessageRow[]);
      // Mark received unread messages as read
      const unreadIds = (data as MessageRow[])
        .filter((m) => !m.read && m.sender_id !== user?.id)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase.from("messages").update({ read: true }).in("id", unreadIds);
        // Reflect cleared badge in conversation list
        setConvos((prev) =>
          prev.map((c) => (c.id === convoId ? { ...c, unread: 0 } : c))
        );
      }
    }
    setLoadingMsgs(false);
  }, [user?.id]);

  useEffect(() => {
    if (!activeConvo) return;
    fetchMessages(activeConvo.id);

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${activeConvo.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConvo.id}`,
      }, (payload) => {
        const incoming = payload.new as MessageRow;
        setMessages((prev) => {
          // Skip if we already have this message (optimistic or prior fetch)
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
        // Mark as read if from other person
        if (incoming.sender_id !== user?.id) {
          supabase.from("messages").update({ read: true }).eq("id", incoming.id);
        }
        // Update last preview in sidebar
        setConvos((prev) =>
          prev.map((c) =>
            c.id === activeConvo.id
              ? { ...c, lastPreview: incoming.content, lastSenderId: incoming.sender_id, last_message_at: incoming.created_at }
              : c
          )
        );
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConvo.id}`,
      }, (payload) => {
        const updated = payload.new as MessageRow;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConvo.id}`,
      }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== (payload.old as MessageRow).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvo?.id, fetchMessages, user?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!input.trim() || !activeConvo || !user) return;
    setSending(true);
    const text = input.trim();
    setInput("");

    // Optimistic insert — message appears immediately
    const tempId = `opt-${Date.now()}`;
    const optimistic: MessageRow = {
      id: tempId,
      conversation_id: activeConvo.id,
      sender_id: user.id,
      content: text,
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error: err } = await supabase
      .from("messages")
      .insert({ conversation_id: activeConvo.id, sender_id: user.id, content: text, read: false })
      .select("id, conversation_id, sender_id, content, read, created_at")
      .single();

    if (err) {
      setError("No se pudo enviar el mensaje.");
      // Roll back optimistic message and restore input so user can retry
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
    } else if (data) {
      // Replace optimistic entry with the real DB record
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? (data as MessageRow) : m)
      );
      // Update last preview in sidebar
      setConvos((prev) =>
        prev.map((c) =>
          c.id === activeConvo.id
            ? { ...c, lastPreview: text, lastSenderId: user.id, last_message_at: (data as MessageRow).created_at }
            : c
        )
      );
    }
    setSending(false);
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from("messages").delete().eq("id", msgId).eq("sender_id", user?.id ?? "");
  };

  const openConvo = (c: ConversationRow) => {
    setActiveConvo(c);
    // Immediately clear local unread badge
    setConvos((prev) => prev.map((x) => x.id === c.id ? { ...x, unread: 0 } : x));
  };

  const filtered = convos.filter((c) =>
    c.other.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = convos.reduce((sum, c) => sum + c.unread, 0);

  return (
    <PageLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

        {/* ── Left pane: conversation list (+ student directory for Colegio) ── */}
        <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-slate-200/60 flex flex-col shrink-0 ${activeConvo ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold flex-1">Mensajes</h2>
              {totalUnread > 0 && (
                <span className="bg-cyan-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>

            {/* Tab switcher — only for Colegio */}
            {role === "Colegio" && (
              <div className="flex rounded-xl bg-slate-100 p-0.5 mb-3">
                <button
                  onClick={() => setLeftTab("convos")}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${
                    leftTab === "convos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Chats
                </button>
                <button
                  onClick={() => setLeftTab("students")}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${
                    leftTab === "students" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <Users size={12} /> Directorio
                </button>
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {leftTab === "convos" ? (
                <input
                  type="text" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar conversación..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
                />
              ) : (
                <input
                  type="text" value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Buscar estudiante..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
                />
              )}
            </div>
          </div>

          {/* ── Student directory panel ── */}
          {leftTab === "students" && role === "Colegio" && (
            <div className="flex-1 overflow-y-auto thin-scrollbar divide-y divide-slate-100">
              {loadingStudents && (
                <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-cyan-400" /></div>
              )}
              {!loadingStudents && students.filter((s) =>
                s.name.toLowerCase().includes(studentSearch.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-10 text-sm text-slate-400">No hay estudiantes.</div>
              )}
              {students
                .filter((s) => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openStudentConvo(s)}
                    disabled={startingConvo === s.id}
                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-50/80 transition-colors text-left disabled:opacity-60"
                  >
                    <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-sm font-bold text-cyan-700 shrink-0">
                      {s.avatar
                        ? <img src={s.avatar} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                        : s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {[s.class_name, s.specialty].filter(Boolean).join(" · ") || "Estudiante"}
                      </p>
                    </div>
                    {startingConvo === s.id && <Loader2 size={14} className="animate-spin text-cyan-500 shrink-0" />}
                  </button>
                ))}
            </div>
          )}

          {/* ── Conversations list ── */}
          {leftTab === "convos" && (
          <div className="flex-1 overflow-y-auto thin-scrollbar divide-y divide-slate-100">
            {loadingConvos && (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-cyan-400" /></div>
            )}
            {!loadingConvos && filtered.length === 0 && (
              <div className="text-center py-10 text-sm text-slate-400">No hay conversaciones aún.</div>
            )}
            {filtered.map((c) => (
              <button key={c.id} onClick={() => openConvo(c)}
                className={`w-full flex items-center gap-3 p-4 transition-colors text-left ${
                  activeConvo?.id === c.id
                    ? "bg-cyan-50/60"
                    : c.unread > 0
                    ? "bg-white hover:bg-slate-50/80"
                    : "hover:bg-slate-50/80"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {c.other.avatar ? (
                    <img src={c.other.avatar} alt={c.other.name} className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-cyan-100 flex items-center justify-center text-sm font-bold text-cyan-700">
                      {c.other.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className={`text-sm truncate ${c.unread > 0 ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                      {c.other.name}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {c.last_message_at ? fmtRelative(c.last_message_at) : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className={`text-xs truncate ${c.unread > 0 ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                      {c.lastSenderId === user?.id && (
                        <span className="mr-0.5 inline-flex items-center">
                          <CheckCheck size={11} className="text-cyan-500" />
                        </span>
                      )}
                      {c.lastPreview || <span className="italic">Sin mensajes</span>}
                    </p>
                    {c.unread > 0 && (
                      <span className="bg-cyan-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          )}
        </div>

        {/* ── Right pane: active conversation ── */}
        <div className={`flex-1 flex flex-col bg-slate-50/80 ${!activeConvo ? "hidden md:flex" : "flex"}`}>
          {activeConvo ? (
            <>
              {/* Header */}
              <div className="bg-white border-b border-slate-200/60 px-4 py-3 flex items-center gap-3 shrink-0">
                <button onClick={() => setActiveConvo(null)} className="md:hidden text-slate-400 hover:text-slate-600">
                  <ArrowLeft size={20} />
                </button>
                {activeConvo.other.avatar ? (
                  <img src={activeConvo.other.avatar} alt={activeConvo.other.name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center text-sm font-bold text-cyan-700">
                    {activeConvo.other.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{activeConvo.other.name}</p>
                  <p className="text-[11px] text-slate-400">{activeConvo.other.role}</p>
                </div>
                <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
              </div>

              {error && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-sm text-red-600">{error}</div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 thin-scrollbar">
                {loadingMsgs && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-cyan-400" /></div>}
                {!loadingMsgs && messages.length === 0 && (
                  <div className="text-center py-10 text-sm text-slate-400">No hay mensajes aún. ¡Envía el primero!</div>
                )}
                {messages.map((m) => {
                  const isMe         = m.sender_id === user?.id;
                  const isOptimistic = m.id.startsWith("opt-");
                  const isProposal   = m.kind === "interview_proposal";

                  if (isProposal && m.metadata) {
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[85%]">
                          <InterviewProposalBubble
                            metadata={m.metadata as unknown as Parameters<typeof InterviewProposalBubble>[0]["metadata"]}
                            isFromMe={isMe}
                            initialStatus={((m.metadata as Record<string, unknown>).status as "proposed" | "accepted" | "declined") ?? "proposed"}
                          />
                          <p className={`text-[9px] mt-1 ${isMe ? "text-right text-slate-400" : "text-slate-400"}`}>
                            {fmtTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                      <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm relative ${
                        isMe
                          ? "bg-cyan-600 text-white rounded-br-sm shadow-sm"
                          : "bg-white border border-slate-200/80 text-slate-700 rounded-bl-sm shadow-sm"
                      }`}>
                        {m.content}
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? "text-cyan-200" : "text-slate-400"}`}>
                          <span className="text-[10px]">{fmtTime(m.created_at)}</span>
                          {isMe && (
                            isOptimistic
                              ? <Check size={11} className="opacity-60" />
                              : m.read
                              ? <CheckCheck size={11} className="text-white" />
                              : <Check size={11} className="opacity-80" />
                          )}
                        </div>
                        {isMe && !isOptimistic && (
                          <button
                            onClick={() => deleteMessage(m.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-slate-200/60 px-4 py-3 flex items-center gap-2 shrink-0">
                <input
                  type="text" value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
                />
                <button onClick={send} disabled={!input.trim() || sending}
                  className="bg-cyan-600 text-white p-2.5 rounded-full hover:bg-cyan-700 active:bg-cyan-800 disabled:opacity-40 transition-colors btn-press"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search size={24} className="text-slate-300" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Selecciona una conversación</p>
                <p className="text-xs text-slate-300 mt-1">Elige un chat de la lista para empezar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
