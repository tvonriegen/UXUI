"use client";
// ──────────────────────────────────────────────────────────
// useQuestProgress – helper to bump a daily quest from any
// feature page (empleos, muro, talent, profile). Fires a DOM
// event so DailyQuestsCard can live-update without refetching.
// ──────────────────────────────────────────────────────────

import { useCallback } from "react";

export function useQuestProgress() {
  return useCallback(async (code: string) => {
    try {
      const res = await fetch("/api/quests/progress", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code }),
      });
      if (!res.ok) return { ok: false };
      const data = await res.json();
      window.dispatchEvent(
        new CustomEvent("classlink:quest-progress", {
          detail: {
            code,
            completed: Boolean(data?.completed),
            xp_reward: Number(data?.xp_reward) || 0,
          },
        })
      );
      return { ok: true, ...data };
    } catch {
      return { ok: false };
    }
  }, []);
}
