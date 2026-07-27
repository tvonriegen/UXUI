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
      supabase.from("profiles").select("id, name, email, role, avatar, account_type, account_status, availability").eq("id", supabaseUserId).single(),
      supabase.from("student_profiles").select("student_stage").eq("profile_id", supabaseUserId).maybeSingle(),
      supabase.auth.getSession(),
    ]);

    if (data && (data.account_type === "student" || data.account_type === "company" || data.account_type === "school" || data.account_type === "external")) {
      const role = data.account_type === "company"
        ? "Empresa"
        : data.account_type === "school"
          ? "Colegio"
          : data.account_type === "external"
            ? "Externo"
          : studentProfile?.student_stage === "graduated" ? "Egresado" : "Estudiante";
      const studentStage = data.account_type !== "student"
        ? null
        : studentProfile?.student_stage === "graduated"
          ? "graduated"
          : studentProfile?.student_stage === "internship" || data.availability === "En prácticas" ? "internship" : "enrolled";
      setUser({
        id:                 data.id,
        name:               data.name,
        email:              data.email,
        role:               role as Role,
        accountType:        data.account_type,
        accountStatus:      data.account_status as AuthUser["accountStatus"],
        studentStage,
        avatar:             data.avatar ?? "",
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
