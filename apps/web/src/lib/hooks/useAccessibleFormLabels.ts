"use client";

import { useEffect } from "react";

/**
 * Associates legacy visual labels with their nearby form controls. New code
 * should still use htmlFor/id directly; this bridge also covers portalled
 * modals and older role-specific forms while they are progressively migrated.
 */
export function useAccessibleFormLabels() {
  useEffect(() => {
    let sequence = 0;

    const associateLabels = (root: ParentNode) => {
      root.querySelectorAll<HTMLLabelElement>("label:not([for])").forEach((label) => {
        if (label.querySelector("input, select, textarea")) return;
        const container = label.parentElement;
        if (!container) return;
        const controls = container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          "input:not([type='hidden']), select, textarea",
        );
        if (controls.length !== 1) return;
        const control = controls[0];
        if (!control.id) {
          sequence += 1;
          control.id = `accessible-field-${sequence}`;
        }
        label.htmlFor = control.id;
      });
    };

    associateLabels(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) associateLabels(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
