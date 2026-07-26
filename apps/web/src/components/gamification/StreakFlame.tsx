"use client";
// ──────────────────────────────────────────────────────────
// StreakFlame – Animated streak indicator
// ──────────────────────────────────────────────────────────
// Glowing flickering flame when active today, dim when frozen.
// Size scales via the `size` prop; colour intensifies with
// streak length (7+, 30+, 100+ tiers).

import { Flame } from "lucide-react";

interface StreakFlameProps {
  streak:    number;
  /** When the user was last active (ISO date). Dims the flame if not today. */
  lastActive?: string | null;
  size?:     number;
  showLabel?: boolean;
  className?: string;
}

export default function StreakFlame({
  streak,
  lastActive,
  size = 40,
  showLabel = true,
  className = "",
}: StreakFlameProps) {
  const active = isActiveToday(lastActive);
  const color  = streakColor(streak);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Flame
          size={size}
          strokeWidth={2}
          className={`${color} ${active ? "flame-flicker" : "flame-dim"}`}
        />
        {active && streak >= 7 && (
          <span className="absolute inset-0 rounded-full bg-orange-400/20 blur-md -z-10" />
        )}
      </div>
      {showLabel && (
        <div className="flex flex-col leading-none">
          <span className="text-lg font-extrabold">{streak}</span>
          <span className="text-[10px] text-slate-400 font-medium">
            {streak === 1 ? "día" : "días"}
          </span>
        </div>
      )}
    </div>
  );
}

function isActiveToday(iso?: string | null): boolean {
  if (!iso) return false;
  const today = new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10) === today;
}

function streakColor(streak: number): string {
  if (streak >= 100) return "text-rose-500";
  if (streak >= 30)  return "text-orange-500";
  if (streak >= 7)   return "text-amber-500";
  if (streak >= 1)   return "text-amber-400";
  return "text-slate-300";
}
