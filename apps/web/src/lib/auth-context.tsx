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
} from "react";
import { supabase } from "./supabase";
import type { AccountType, Role, StudentStage } from "./types";
import { resolveAuthRole } from "./auth-role";

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

  /**
   * Fetch the profile row for a given Supabase auth user ID
   * and store it in React state.
   */
  const loadProfile = useCallback(async (supabaseUserId: string) => {
    const [{ data }, { data: studentProfile }, { data: { session } }] = await Promise.all([
      supabase.rpc("get_own_profile"),
      supabase.from("student_profiles").select("student_stage").eq("profile_id", supabaseUserId).maybeSingle(),
      supabase.auth.getSession(),
    ]);

    const ownProfile = (data as { profile?: typeof data } | null)?.profile ?? data;
    if (ownProfile && (ownProfile.account_type === "student" || ownProfile.account_type === "company" || ownProfile.account_type === "school" || ownProfile.account_type === "external")) {
      const role = resolveAuthRole(ownProfile.account_type, studentProfile?.student_stage);
      const studentStage = ownProfile.account_type !== "student"
        ? null
        : studentProfile?.student_stage === "graduated"
          ? "graduated"
          : studentProfile?.student_stage === "internship" || ownProfile.availability === "En prácticas" ? "internship" : "enrolled";
      setUser({
        id:                 ownProfile.id,
        name:               ownProfile.name,
        email:              ownProfile.email ?? session?.user.email ?? "",
        role,
        accountType:        ownProfile.account_type,
        accountStatus:      ownProfile.account_status as AuthUser["accountStatus"],
        studentStage,
        avatar:             ownProfile.avatar ?? "",
        mustChangePassword: session?.user.app_metadata?.must_change_password === true,
      });
    }
  }, []);

  // ── Session bootstrap & listener ──────────────────────

  useEffect(() => {
    // Check for an existing session on first mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Keep state in sync with Supabase auth events (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
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
    await supabase.auth.signOut();
    setUser(null);
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
