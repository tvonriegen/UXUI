"use client";
// ──────────────────────────────────────────────────────────
// Modal – Reusable dialog overlay
// ──────────────────────────────────────────────────────────
// Renders a centered modal card over a frosted-glass backdrop.
// Handles:
//  - Body scroll lock when open (prevents background scrolling)
//  - Click-outside-to-close via the overlay ref
//  - Entrance animations (overlay fade + card slide-up)
//  - Accessible close button in the header
//
// Usage:
//   <Modal open={isOpen} onClose={() => setIsOpen(false)} title="...">
//     {/* content */}
//   </Modal>
//
// WHY createPortal?
//  PageLayout's <main> uses `animate-fade-in-up` which keeps
//  `transform: translateY(0)` via animation-fill-mode:both after the
//  animation ends. Any CSS transform on an ancestor creates a new
//  containing block for `position:fixed` descendants, breaking their
//  viewport-relative positioning. Portaling into <body> escapes that
//  stacking context entirely so the overlay covers the full screen.
//
// Returning null when closed means the component leaves the
// DOM entirely, which resets all internal form state automatically.
// ──────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { createPortal }      from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Called when the user closes the modal (X button or backdrop click) */
  onClose: () => void;
  /** Title displayed in the modal header */
  title: string;
  /** Modal body content */
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  // Ref on the overlay div so we can detect clicks that land directly on it
  // (not on the modal card itself) to trigger close-on-backdrop-click.
  const overlayRef = useRef<HTMLDivElement>(null);

  /**
   * Lock body scroll while the modal is open to prevent the page behind
   * from scrolling. Cleans up on unmount or when `open` becomes false.
   */
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else       document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Fully remove from DOM when closed — this also resets child state
  if (!open) return null;

  // Portal into <body> so the overlay isn't constrained by any ancestor
  // transform (see WHY createPortal comment at the top of this file).
  return createPortal(
    /* Backdrop overlay — semi-transparent + blur */
    <div
      ref={overlayRef}
      className="modal-overlay fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        // Only close if the click target is the overlay itself, not the card
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Modal card */}
      <div className="modal-content bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-full transition-colors btn-press"
            aria-label="Cerrar"
          >
            <X size={17} className="text-slate-500" />
          </button>
        </div>

        {/* ── Body — scrollable if content overflows ── */}
        <div className="flex-1 overflow-y-auto thin-scrollbar p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
