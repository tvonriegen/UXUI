"use client";
// ──────────────────────────────────────────────────────────
// StatCard – Shared Metric Tile
// ──────────────────────────────────────────────────────────
// Used across all four dashboards and the profile page to
// display a single KPI metric in a consistent, animated card.
//
// Props:
//  label   – Descriptive text shown below the value (e.g. "Nivel Actual")
//  value   – The metric to display (number or string)
//  icon    – A Lucide icon element pre-sized and coloured by the caller
//  bg      – Tailwind background class for the icon pill (e.g. "bg-cyan-50")
//  delay   – Stagger index (1–6) for sequential entrance animations in grids
//  className – Additional Tailwind classes if needed
// ──────────────────────────────────────────────────────────

import React from "react";

interface StatCardProps {
  label: string;
  value: string | number | undefined;
  icon: React.ReactNode;
  bg: string;
  delay?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export default function StatCard({
  label,
  value,
  icon,
  bg,
  delay,
  className = "",
}: StatCardProps) {
  // Map the delay prop to the corresponding CSS stagger class defined in globals.css.
  // This creates a cascading entrance effect when multiple StatCards share a grid.
  const staggerClass = delay ? `stagger-${delay}` : "";

  return (
    <div
      className={`
        bg-white rounded-2xl p-5
        border border-slate-200/60
        card-interactive
        animate-fade-in-up ${staggerClass}
        ${className}
      `}
    >
      {/* Coloured icon pill — bg colour is passed as a Tailwind class by the parent */}
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        {icon}
      </div>

      {/* Primary metric value — falls back to an em-dash if undefined */}
      <p className="text-2xl font-extrabold text-cl-on-surface">
        {value ?? "–"}
      </p>

      {/* Metric label — subdued secondary text */}
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
