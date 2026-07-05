"use client";
// ──────────────────────────────────────────────────────────
// useSound – Centralized sound effect manager
// ──────────────────────────────────────────────────────────
// Generates tones via Web Audio API oscillators.
// No external audio files are loaded.
// Mute preference is persisted in localStorage.
// ──────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from "react";

export function useSound() {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("classlink_muted") === "true";
  });

  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        )();
      } catch {
        return null;
      }
    }
    return ctxRef.current;
  }, []);

  /** Schedule a single oscillator tone (non-blocking). */
  const beep = useCallback(
    (freq: number, startDelay: number, duration: number, vol = 0.12, type: OscillatorType = "sine") => {
      if (muted) return;
      const ctx = getCtx();
      if (!ctx) return;
      try {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
        gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startDelay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startDelay + duration);
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + duration + 0.01);
      } catch { /* Audio API unavailable — silent fail */ }
    },
    [muted, getCtx]
  );

  /** Short upward double-tone — fired when liking a post */
  const playLike = useCallback(() => {
    beep(523, 0,    0.10); // C5
    beep(659, 0.08, 0.12); // E5
  }, [beep]);

  /** Gentle pop — fired after a comment is successfully posted */
  const playComment = useCallback(() => {
    beep(440, 0,    0.08); // A4
    beep(880, 0.05, 0.14); // A5 (octave jump)
  }, [beep]);

  /** Three-note success chord — fired after a new post is created */
  const playPost = useCallback(() => {
    beep(523, 0,    0.10); // C5
    beep(659, 0.10, 0.10); // E5
    beep(784, 0.20, 0.18); // G5
  }, [beep]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("classlink_muted", String(next));
      }
      return next;
    });
  }, []);

  return { muted, toggleMute, playLike, playComment, playPost };
}
