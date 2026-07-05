"use client";
// ──────────────────────────────────────────────────────────
// Dashboard Page – route: /
// ──────────────────────────────────────────────────────────
// The home page of ClassLink.
// Reads the current role from the global context and renders
// the matching dashboard component inside the shared page shell.
//
// Each dashboard is a self-contained component:
//  DashboardEstudiante – student view (XP, badges, feed)
//  DashboardColegio    – school admin view (KPIs, request queue)
//  DashboardEmpresa    – company view (talent pipeline, vacantes)
//  DashboardEgresado   – alumni view (profile views, connections)
//
// Switching roles in the TopNavBar instantly re-renders this
// page with the appropriate dashboard.
// ──────────────────────────────────────────────────────────

import PageLayout           from "@/components/layout/PageLayout";
import { useRole }          from "@/lib/role-context";
import DashboardColegio     from "@/components/dashboard/DashboardColegio";
import DashboardEstudiante  from "@/components/dashboard/DashboardEstudiante";
import DashboardEmpresa     from "@/components/dashboard/DashboardEmpresa";
import DashboardEgresado    from "@/components/dashboard/DashboardEgresado";

export default function DashboardPage() {
  const { role } = useRole();

  // Map each role to its dashboard component.
  // Using an object lookup instead of if/else keeps this clean
  // and easy to extend if new roles are added later.
  const dashboards: Record<typeof role, React.ReactNode> = {
    Colegio:    <DashboardColegio />,
    Estudiante: <DashboardEstudiante />,
    Empresa:    <DashboardEmpresa />,
    Egresado:   <DashboardEgresado />,
  };

  return (
    // PageLayout supplies the top nav, sidebar, and bottom mobile nav
    <PageLayout>{dashboards[role]}</PageLayout>
  );
}
