"use client";
// ──────────────────────────────────────────────────────────
// CursorGlow – Ambient cursor-tracking background effect
// ──────────────────────────────────────────────────────────
// Renders a large radial gradient fixed behind all content
// that slowly follows the mouse cursor.
//
// How it works:
//  1. A `mousemove` listener updates two CSS custom properties
//     (--glow-x, --glow-y) on the document root in real time.
//  2. A fixed <div> uses those properties to position a radial
//     gradient via a CSS background expression.
//  3. A CSS `transition` on the background creates the lag /
//     "goo" trailing effect (the gradient catches up, not snaps).
//
// Design choices:
//  - Uses cl-primary (#00687a) and cl-primary-light (#06b6d4)
//    at 5–8% opacity so it's ambient, never distracting.
//  - pointer-events: none ensures it never blocks clicks.
//  - Only activates on devices that have a hover-capable pointer
//    (i.e. mouse, not touch) via the @media check.
//  - z-index: 0 puts it behind all page content.
// ──────────────────────────────────────────────────────────

import { useEffect } from "react";

export default function CursorGlow() {
  useEffect(() => {
    /**
     * Update the CSS custom properties that drive the gradient position.
     * We write directly to the root element for maximum performance —
     * no React state updates, no re-renders.
     */
    const handleMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--glow-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--glow-y", `${e.clientY}px`);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // The visual is entirely CSS-driven; this div just needs to exist in the DOM.
  return (
    <div
      className="cursor-glow"
      aria-hidden="true"    // decorative only — hide from screen readers
    />
  );
}
