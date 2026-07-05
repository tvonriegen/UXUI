/* ════════════════════════════════════════════════════════
   ClassLink – Tailwind CSS Configuration
   ════════════════════════════════════════════════════════

   This file extends the default Tailwind theme with:
   - ClassLink brand colour palette (cl-* prefix)
   - Manrope font family
   - Custom border-radius scale
   - Custom keyframes & animation utilities (used alongside
     the manual .animate-* classes defined in globals.css)
   ════════════════════════════════════════════════════════ */

import type { Config } from "tailwindcss";

const config: Config = {
  // Enable dark mode via the `dark` class on <html>
  darkMode: "class",

  // ── Content Paths ────────────────────────────────────
  // Tailwind scans these files to build its purge list.
  // Any class not found here will be stripped from the bundle.
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      // ── Brand Colour Palette ──────────────────────────
      // Based on Material Design 3 colour roles.
      // Primary:   deep teal  (#00687a)
      // Secondary: slate-blue (#545f73)
      // Tertiary:  rose       (#a93349)
      // Surface:   off-white  (#f9f9ff) variants
      colors: {
        /* Primary — main actions, active states, links */
        "cl-primary":           "#00687a",
        "cl-primary-light":     "#06b6d4",
        "cl-primary-container": "#acedff",

        /* Secondary — supporting text, subtle backgrounds */
        "cl-secondary":           "#545f73",
        "cl-secondary-container": "#d5e0f8",

        /* Tertiary — accents, alerts, highlights */
        "cl-tertiary":           "#a93349",
        "cl-tertiary-container": "#ff7e8f",

        /* Error states */
        "cl-error":           "#ba1a1a",
        "cl-error-container": "#ffdad6",

        /* Surface variants — background tiers from lightest to darkest */
        "cl-surface":           "#f9f9ff",  /* page background */
        "cl-surface-dim":       "#cfdaf2",
        "cl-surface-low":       "#f0f3ff",
        "cl-surface-container": "#e7eeff",
        "cl-surface-high":      "#dee8ff",
        "cl-surface-highest":   "#d8e3fb",

        /* Text on surfaces */
        "cl-on-surface":         "#111c2d",
        "cl-on-surface-variant": "#3d494c",

        /* Dividers and borders */
        "cl-outline":         "#6d797d",
        "cl-outline-variant": "#bcc9cd",
      },

      // ── Font Family ───────────────────────────────────
      // font-manrope → uses "Manrope" loaded in globals.css
      fontFamily: {
        manrope: ["Manrope", "system-ui", "sans-serif"],
      },

      // ── Border Radius Scale ───────────────────────────
      // Overrides Tailwind defaults to match the design system
      borderRadius: {
        DEFAULT: "0.5rem",  /* rounded    → 8px  */
        lg:      "0.75rem", /* rounded-lg → 12px */
        xl:      "1rem",    /* rounded-xl → 16px */
        "2xl":   "1.25rem", /* rounded-2xl→ 20px */
      },

      // ── Custom Keyframes ──────────────────────────────
      // These power the `animate-*` Tailwind utilities below.
      // The same animations are also used via manual CSS classes
      // in globals.css for components that need more control.
      keyframes: {
        /* Fade + translate up — general purpose entrance */
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        /* Fade + translate down — dropdowns / top-anchored panels */
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        /* Scale from slightly smaller — popup cards */
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        /* Elastic pop — badges, notification counts */
        "pop-in": {
          "0%":   { transform: "scale(0.75)", opacity: "0" },
          "65%":  { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)",    opacity: "1" },
        },
        /* Horizontal shimmer sweep for skeleton loaders */
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
      },

      // ── Animation Utilities ───────────────────────────
      // Gives access to `animate-fade-in-up`, etc. in JSX className strings.
      animation: {
        "fade-in-up":   "fade-in-up   420ms cubic-bezier(0.16,1,0.3,1) both",
        "fade-in-down": "fade-in-down 280ms cubic-bezier(0.16,1,0.3,1) both",
        "scale-in":     "scale-in     320ms cubic-bezier(0.16,1,0.3,1) both",
        "pop-in":       "pop-in       460ms cubic-bezier(0.34,1.56,0.64,1) both",
        "shimmer":      "shimmer      1.6s  linear infinite",
      },
    },
  },

  plugins: [],
};

export default config;
