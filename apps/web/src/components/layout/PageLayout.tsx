"use client";
// ──────────────────────────────────────────────────────────
// PageLayout – Authenticated page shell
// ──────────────────────────────────────────────────────────
// Wraps all authenticated pages. Checks that the user is
// logged in — if not, redirects to /login.
//
// Layout structure:
//  ┌─────────────────────────────────────────────────┐
//  │  TopNavBar (h-16, fixed, z-50)                  │
//  ├───────────┬─────────────────────────────────────┤
//  │ SideNavBar│  <main>                             │
//  │ (lg only) │  animate-fade-in-up on each route   │
//  ├───────────┴─────────────────────────────────────┤
//  │  BottomMobileNav (lg:hidden)                    │
//  └─────────────────────────────────────────────────┘
// ──────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth }   from "@/lib/auth-context";
import TopNavBar      from "./TopNavBar";
import SideNavBar     from "./SideNavBar";
import BottomMobileNav from "./BottomMobileNav";

interface PageLayoutProps {
  children: React.ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Guard: redirect unauthenticated visitors to the login page
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  // Show nothing while determining auth state (avoids flash of content)
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cl-surface">
        <div className="flex flex-col items-center gap-3">
          {/* Animated brand logo placeholder */}
          <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center animate-pulse">
            <span className="text-white font-black text-sm">CL</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cl-surface">
      <TopNavBar />
      <SideNavBar />
      {/*
        NOTE: animate-fade-in-up keeps transform:translateY(0) via
        fill-mode:both, which would break position:fixed descendants.
        Modal.tsx uses createPortal to escape this stacking context.
      */}
      <main className="flex-1 lg:ml-56 pt-16 pb-24 lg:pb-6 flex flex-col animate-fade-in-up">
        {children}
      </main>
      <BottomMobileNav />
    </div>
  );
}
