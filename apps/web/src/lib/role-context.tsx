"use client";
// ──────────────────────────────────────────────────────────
// TalentHub – Global Role Context
// Role is derived exclusively from the authenticated Supabase
// profile row — never from mutable client state.
// ──────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { Role, AppNotification } from "./types";
import { useAuth } from "./auth-context";
import { supabase } from "./supabase";

interface RoleContextValue {
  role: Role;
  // setRole intentionally omitted — role comes from the DB profile only
  notifications: AppNotification[];
  unreadCount: number;
  messageUnreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const role: Role = user?.role ?? "Estudiante";

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState({ matches: true, messages: true, badges: true, social: true, reminders: true });
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  const refreshMessageUnreadCount = useCallback(async () => {
    if (!user?.id) { setMessageUnreadCount(0); return; }
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    if (conversationsError) return;
    const ids = (conversations ?? []).map((conversation) => conversation.id);
    if (ids.length === 0) { setMessageUnreadCount(0); return; }
    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", ids)
      .eq("read", false)
      .neq("sender_id", user.id);
    if (!error) setMessageUnreadCount(count ?? 0);
  }, [user?.id]);

  useEffect(() => {
    refreshMessageUnreadCount();
    if (!user?.id) return;
    const channel = supabase
      .channel(`message-unread:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refreshMessageUnreadCount)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshMessageUnreadCount, user?.id]);

  // Fetch notifications from Supabase for the current user
  useEffect(() => {
    if (!user?.id) { setNotifications([]); return; }

    Promise.resolve(supabase
      .from("notifications")
      .select("id, title, body, read, created_at, type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error || !data) {
          setNotifications([]);
          return;
        }
        setNotifications(
          data.map((n) => ({
            id:          n.id,
            title:       n.title,
            description: n.body ?? "",
            time:        new Date(n.created_at).toLocaleString("es-CR"),
            read:        n.read ?? false,
            forRoles:    [role], // these are already user-specific
            type:        n.type,
          }))
        );
      }))
      .catch(() => setNotifications([]));

    // Real-time new notifications
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = payload.new as {
          id: string; title: string; body: string;
          read: boolean; created_at: string; type: string;
        };
        setNotifications((prev) => [{
          id:          n.id,
          title:       n.title,
          description: n.body ?? "",
          time:        new Date(n.created_at).toLocaleString("es-CR"),
          read:        false,
          forRoles:    [role],
          type:        n.type,
        }, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user?.id) return;
    const loadPreferences = () => {
      supabase.from("user_preferences")
        .select("notify_matches, notify_messages, notify_badges, notify_social, notify_reminders")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setNotificationPrefs({
            matches: data.notify_matches ?? true,
            messages: data.notify_messages ?? true,
            badges: data.notify_badges ?? true,
            social: data.notify_social ?? false,
            reminders: data.notify_reminders ?? true,
          });
        });
    };
    loadPreferences();
    window.addEventListener("talenthub-preferences-updated", loadPreferences);
    return () => window.removeEventListener("talenthub-preferences-updated", loadPreferences);
  }, [user?.id]);

  const visibleNotifications = useMemo(() => notifications.filter((notification) => {
    const type = notification.type ?? "";
    if (["match", "job"].includes(type)) return notificationPrefs.matches;
    if (type === "message") return notificationPrefs.messages;
    if (type === "badge") return notificationPrefs.badges;
    if (type === "social") return notificationPrefs.social;
    if (["event", "practica"].includes(type)) return notificationPrefs.reminders;
    return true;
  }), [notificationPrefs, notifications]);

  const unreadCount = useMemo(
    () => visibleNotifications.filter((n) => !n.read && !readIds.has(n.id)).length,
    [visibleNotifications, readIds]
  );

  const markRead = useCallback(async (id: string) => {
    const previousRead = notifications.find((notification) => notification.id === id)?.read ?? false;
    setReadIds((prev) => new Set(prev).add(id));
    setNotifications((prev) => prev.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification
    ));
    if (user?.id) {
      const { error } = await Promise.resolve(supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id)
        .eq("user_id", user.id));
      if (error) {
        setReadIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
        setNotifications((prev) => prev.map((notification) =>
          notification.id === id ? { ...notification, read: previousRead } : notification
        ));
      }
    }
  }, [notifications, user?.id]);

  const markAllRead = useCallback(async () => {
    const ids = notifications.map((n) => n.id);
    const previousReadState = new Map(notifications.map((notification) => [notification.id, notification.read]));
    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
    if (user?.id) {
      const { error } = await Promise.resolve(supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id));
      if (error) {
        setReadIds(new Set());
        setNotifications((prev) => prev.map((notification) =>
          ids.includes(notification.id)
            ? { ...notification, read: previousReadState.get(notification.id) ?? notification.read }
            : notification
        ));
      }
    }
  }, [notifications, user?.id]);

  return (
    <RoleContext.Provider value={{ role, notifications: visibleNotifications, unreadCount, messageUnreadCount, markRead, markAllRead }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
