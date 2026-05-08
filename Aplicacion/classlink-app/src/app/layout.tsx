// ──────────────────────────────────────────────────────────
// Root Layout – Next.js App Router root
// ──────────────────────────────────────────────────────────
// Outermost layout — mounted once, persists across all routes.
//
// Provider hierarchy (outermost → innermost):
//   AuthProvider   – user session (login / logout)
//     RoleProvider – active simulated role (within a session)
//
// CursorGlow is rendered here (outside page content) so the
// ambient effect works on every page including /login.
// ──────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider }    from "@/lib/auth-context";
import { RoleProvider }    from "@/lib/role-context";
import { ToastProvider }   from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import CursorGlow          from "@/components/layout/CursorGlow";

export const metadata: Metadata = {
  title:       "ClassLink – Vocational Excellence",
  description: "Connecting vocational students with local companies",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="light">
      <body className="bg-cl-surface text-cl-on-surface font-manrope min-h-screen antialiased">
        {/* Ambient cursor-tracking gradient — sits at z-0 behind all content */}
        <CursorGlow />

        {/*
          AuthProvider must wrap RoleProvider so role-switching
          can eventually be tied to the authenticated user's role.
        */}
        <AuthProvider>
          <RoleProvider>
            <ToastProvider>
              <ConfirmProvider>
                {children}
              </ConfirmProvider>
            </ToastProvider>
          </RoleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
