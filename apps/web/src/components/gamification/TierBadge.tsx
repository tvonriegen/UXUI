"use client";
// ──────────────────────────────────────────────────────────
// TierBadge – XP tier chip (Bronce → Diamante)
// ──────────────────────────────────────────────────────────

import { Gem, Crown, Medal, Star, Shield } from "lucide-react";

export type XpTier = "Bronce" | "Plata" | "Oro" | "Platino" | "Diamante";

const TIER_META: Record<XpTier, { cls: string; icon: typeof Gem; min: number }> = {
  Bronce:   { cls: "tier-bronce",   icon: Shield, min: 0     },
  Plata:    { cls: "tier-plata",    icon: Medal,  min: 500   },
  Oro:      { cls: "tier-oro",      icon: Star,   min: 2000  },
  Platino:  { cls: "tier-platino",  icon: Crown,  min: 5000  },
  Diamante: { cls: "tier-diamante", icon: Gem,    min: 10000 },
};

export function tierFromXp(xp: number): XpTier {
  if (xp >= 10000) return "Diamante";
  if (xp >= 5000)  return "Platino";
  if (xp >= 2000)  return "Oro";
  if (xp >= 500)   return "Plata";
  return "Bronce";
}

export function nextTierInfo(xp: number): { next: XpTier | null; remaining: number; pct: number; currentMin: number; nextMin: number } {
  const current = tierFromXp(xp);
  const order: XpTier[] = ["Bronce", "Plata", "Oro", "Platino", "Diamante"];
  const idx = order.indexOf(current);
  const next = idx === order.length - 1 ? null : order[idx + 1];
  const currentMin = TIER_META[current].min;
  const nextMin    = next ? TIER_META[next].min : currentMin;
  const remaining  = next ? Math.max(0, nextMin - xp) : 0;
  const pct        = next
    ? Math.min(100, Math.round(((xp - currentMin) / (nextMin - currentMin)) * 100))
    : 100;
  return { next, remaining, pct, currentMin, nextMin };
}

interface TierBadgeProps {
  tier: XpTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export default function TierBadge({ tier, size = "md", showLabel = true, className = "" }: TierBadgeProps) {
  const meta = TIER_META[tier];
  const Icon = meta.icon;
  const sizeCls = size === "sm" ? "text-[10px] px-2 py-0.5 gap-1"
               : size === "lg" ? "text-sm px-3.5 py-1.5 gap-2"
               :                 "text-xs px-2.5 py-1 gap-1.5";
  const iconSize = size === "sm" ? 10 : size === "lg" ? 14 : 12;

  return (
    <span
      className={`inline-flex items-center ${sizeCls} rounded-full font-extrabold ${meta.cls} ${className}`}
      aria-label={`Rango ${tier}`}
    >
      <Icon size={iconSize} strokeWidth={2.5} />
      {showLabel && <span>{tier}</span>}
    </span>
  );
}
