"use client";
// ──────────────────────────────────────────────────────────
// ClassLink – Global Role Context
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
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const role: Role = user?.role ?? "Estudiante";

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Fetch notifications from Supabase for the current user
  useEffect(() => {
    if (!user?.id) { setNotifications([]); return; }

    supabase
      .from("notifications")
      .select("id, title, body, read, created_at, type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!data) return;
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
      });

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

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read && !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  const markRead = useCallback(async (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    if (user?.id) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id)
        .eq("user_id", user.id);
    }
  }, [user?.id]);

  const markAllRead = useCallback(async () => {
    const ids = notifications.map((n) => n.id);
    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    if (user?.id) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id);
    }
  }, [notifications, user?.id]);

  return (
    <RoleContext.Provider value={{ role, notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
