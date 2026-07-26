"use client";
// ──────────────────────────────────────────────────────────
// Confetti – Lightweight CSS-only confetti burst
// ──────────────────────────────────────────────────────────
// Renders N coloured pieces that fall from the top once.
// Unmount or set show=false to stop.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const COLORS = ["#f59e0b", "#10b981", "#06b6d4", "#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e"];

export default function Confetti({ show, pieces = 80 }: { show: boolean; pieces?: number }) {
  const [mounted, setMounted] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  // Re-trigger by bumping key each time `show` flips to true
  useEffect(() => { if (show) setKey((k) => k + 1); }, [show]);

  if (!mounted || !show) return null;

  const nodes = Array.from({ length: pieces }).map((_, i) => {
    const left      = Math.random() * 100;
    const delay     = Math.random() * 0.4;
    const duration  = 2 + Math.random() * 1.4;
    const color     = COLORS[i % COLORS.length];
    const rotateInit = Math.random() * 180 - 90;
    return (
      <span
        key={`${key}-${i}`}
        className="confetti-piece"
        style={{
          left:               `${left}vw`,
          background:         color,
          animationDelay:     `${delay}s`,
          animationDuration:  `${duration}s`,
          transform:          `rotate(${rotateInit}deg)`,
        }}
      />
    );
  });

  return createPortal(<>{nodes}</>, document.body);
}
