"use client";
// ──────────────────────────────────────────────────────────
// Icon – Dynamic Lucide icon loader
// ──────────────────────────────────────────────────────────
// Accepts an icon name as a kebab-case string (e.g. "star",
// "arrow-right") and dynamically renders the matching Lucide
// React component.
//
// Why this exists:
//   Data objects (like Badge in data.ts) store icon names as
//   strings. This component bridges the gap between the string
//   key and the actual imported React component, avoiding the
//   need to import every possible icon up front.
//
// Usage:
//   <Icon name="trophy"      size={24} className="text-amber-500" />
//   <Icon name="arrow-right" size={16} strokeWidth={2} />
//
// If the icon name doesn't match any Lucide icon, an invisible
// placeholder of the correct dimensions is rendered so layout
// isn't broken.
// ──────────────────────────────────────────────────────────

import { icons, type LucideIcon } from "lucide-react";

interface IconProps {
  /** Lucide icon name in kebab-case, e.g. "star", "arrow-right" */
  name: string;
  /** Pixel size for both width and height */
  size?: number;
  /** Tailwind or custom className for colour / spacing */
  className?: string;
  /** SVG stroke width (default 1.75 is slightly thinner than Lucide's default 2) */
  strokeWidth?: number;
}

export default function Icon({
  name,
  size        = 20,
  className   = "",
  strokeWidth = 1.75,
}: IconProps) {
  /**
   * Convert kebab-case → PascalCase so it matches the Lucide icons object keys.
   * Examples:
   *   "star"        → "Star"
   *   "arrow-right" → "ArrowRight"
   *   "trophy"      → "Trophy"
   */
  const pascalName = name
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("") as keyof typeof icons;

  // Look up the component in Lucide's full icon registry
  const LucideComponent: LucideIcon | undefined = icons[pascalName];

  // Graceful fallback: render an invisible block of the correct size
  if (!LucideComponent) {
    return (
      <span
        className={`inline-block ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <LucideComponent
      size={size}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}
