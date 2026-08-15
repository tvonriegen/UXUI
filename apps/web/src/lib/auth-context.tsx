"use client";
// ──────────────────────────────────────────────────────────
// TalentHub – Authentication Context (Supabase)
// ──────────────────────────────────────────────────────────
// Wraps Supabase Auth so the rest of the app keeps the same
// AuthUser shape and useAuth() hook it already relies on.
//
// What it manages:
//  user         – the logged-in user object (from the profiles table), or null
//  isLoading    – true while waiting for the initial session check
//  login()      – sign in with email + password via Supabase Auth
//  logout()     – sign out and clear user state
//  accountType – canonical server-resolved account type
// ──────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "./supabase";
import type { AccountType, Role, StudentStage } from "./types";
import { resolveAuthRole } from "./auth-role";
import { fetchOwnProfile, type OwnProfile } from "./own-profile-query";

// ── Shapes ────────────────────────────────────────────────

export interface AuthUser {
  id:                  string;
  name:                string;
  email:               string;
  role:                Role;
  accountType:        AccountType;
  accountStatus:       "active" | "pending" | "suspended" | "disabled";
  studentStage:        StudentStage | null;
  avatar:              string;
  mustChangePassword:  boolean;
}

interface AuthContextValue {
  user:      AuthUser | null;
  isLoading: boolean;
  /** Returns null on success, an error message string on failure */
  login:    (email: string, password: string) => Promise<{ error: string | null }>;
  logout:   () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionVersion = useRef(0);
  const activeSessionId = useRef<string | null>(null);
  const activeLoad = useRef<{ id: string; version: number; promise: Promise<void> } | null>(null);

  /**
   * Fetch the profile row for a given Supabase auth user ID
   * and store it in React state.
   */
  const loadProfile = useCallback(async (supabaseUserId: string) => {
    const version = sessionVersion.current;
    const existingLoad = activeLoad.current;
    if (existingLoad?.id === supabaseUserId && existingLoad.version === version) {
      return existingLoad.promise;
    }

    const promise = (async () => {
      const [{ profile: ownProfile, error: profileError }, { data: { session } }] = await Promise.all([
        fetchOwnProfile(supabase, supabaseUserId),
        supabase.auth.getSession(),
      ]);

      // A profile response may finish after logout (or after another account
      // has logged in). Never let that stale response restore the old user.
      if (version !== sessionVersion.current || session?.user?.id !== supabaseUserId) return;

      if (ownProfile && (ownProfile.account_type === "student" || ownProfile.account_type === "company" || ownProfile.account_type === "school" || ownProfile.account_type === "external")) {
        const canonicalStage = ownProfile.student_stage
          ?? (ownProfile.role === "Egresado" ? "graduated" : null);
        const role = resolveAuthRole(ownProfile.account_type, canonicalStage);
        const studentStage = ownProfile.account_type !== "student"
          ? null
          : canonicalStage === "graduated"
            ? "graduated"
            : canonicalStage === "internship" || ownProfile.availability === "En prácticas" ? "internship" : "enrolled";
        setUser({
          id:                 ownProfile.id,
          name:               ownProfile.name ?? "Usuario",
          email:              ownProfile.email ?? session?.user.email ?? "",
          role,
          accountType:        ownProfile.account_type,
          accountStatus:      ownProfile.account_status ?? "pending",
          studentStage,
          avatar:             ownProfile.avatar ?? "",
          mustChangePassword: session?.user.app_metadata?.must_change_password === true,
        });
      } else {
        if (profileError) console.error("Unable to load authenticated profile", profileError);
        setUser(null);
      }
    })();

    activeLoad.current = { id: supabaseUserId, version, promise };
    try {
      await promise;
    } finally {
      if (activeLoad.current?.promise === promise) activeLoad.current = null;
    }
  }, []);

  // ── Session bootstrap & listener ──────────────────────

  useEffect(() => {
    // Check for an existing session on first mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        activeSessionId.current = session.user.id;
        loadProfile(session.user.id).finally(() => setIsLoading(false));
      } else {
        activeSessionId.current = null;
        setIsLoading(false);
      }
    });

    // Keep state in sync with Supabase auth events (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          // Bootstrap and auth events can report the same session. The
          // session ref prevents a second profile request; logout clears it
          // before a later login can reuse the same auth user id.
          if (activeSessionId.current === session.user.id) return;
          activeSessionId.current = session.user.id;
          loadProfile(session.user.id);
        } else {
          sessionVersion.current += 1;
          activeSessionId.current = null;
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // ── Auth actions ──────────────────────────────────────

  const login = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    },
    []
  );

  const logout = useCallback(async () => {
    sessionVersion.current += 1;
    activeSessionId.current = null;
    setUser(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed", error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
