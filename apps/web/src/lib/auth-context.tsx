"use client";
// ──────────────────────────────────────────────────────────
// ClassLink – Authentication Context (Supabase)
// ──────────────────────────────────────────────────────────
// Wraps Supabase Auth so the rest of the app keeps the same
// AuthUser shape and useAuth() hook it already relies on.
//
// What it manages:
//  user         – the logged-in user object (from the profiles table), or null
//  isLoading    – true while waiting for the initial session check
//  login()      – sign in with email + password via Supabase Auth
//  logout()     – sign out and clear user state
//  register()   – create a new account + matching profile row
// ──────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "./supabase";
import type { Role } from "./types";

// ── Shapes ────────────────────────────────────────────────

export interface AuthUser {
  id:                  string;
  name:                string;
  email:               string;
  role:                Role;
  avatar:              string;
  mustChangePassword:  boolean;
}

interface AuthContextValue {
  user:      AuthUser | null;
  isLoading: boolean;
  /** Returns null on success, an error message string on failure */
  login:    (email: string, password: string) => Promise<{ error: string | null }>;
  logout:   () => Promise<void>;
  /** Create a new account and profile row */
  register: (
    email:    string,
    password: string,
    name:     string,
    role:     Role
  ) => Promise<{ error: string | null }>;
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
    const [{ data }, { data: { session } }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, role, avatar").eq("id", supabaseUserId).single(),
      supabase.auth.getSession(),
    ]);

    if (data) {
      setUser({
        id:                 data.id,
        name:               data.name,
        email:              data.email,
        role:               data.role as Role,
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

  const register = useCallback(
    async (
      email:    string,
      password: string,
      name:     string,
      role:     Role
    ): Promise<{ error: string | null }> => {
      // Create the Supabase auth user (metadata is picked up by the DB trigger)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } },
      });
      if (error) return { error: error.message };

      // The DB trigger (trg_new_user) handles profile creation automatically.
      // A client-side upsert here fails when email confirmation is enabled
      // because auth.uid() is null until the session is confirmed.
      return { error: null };
    },
    []
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
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
