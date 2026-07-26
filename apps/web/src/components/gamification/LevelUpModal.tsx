"use client";
// ──────────────────────────────────────────────────────────
// LevelUpModal – Celebration dialog when user gains a level,
// completes a quest, or unlocks a tier.
// ──────────────────────────────────────────────────────────

import Modal from "@/components/ui/Modal";
import Confetti from "./Confetti";
import TierBadge, { type XpTier } from "./TierBadge";
import { Sparkles, Star, Zap, Trophy } from "lucide-react";

interface LevelUpModalProps {
  open:     boolean;
  onClose:  () => void;
  kind:     "quest" | "level" | "tier";
  title:    string;
  subtitle?: string;
  xpGained?: number;
  tier?:     XpTier;
  level?:    number;
}

export default function LevelUpModal({
  open, onClose, kind, title, subtitle, xpGained, tier, level,
}: LevelUpModalProps) {
  const Icon = kind === "quest" ? Sparkles : kind === "level" ? Star : Trophy;

  return (
    <>
      <Confetti show={open} pieces={kind === "tier" ? 120 : 80} />
      <Modal open={open} onClose={onClose} title="">
        <div className="text-center py-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 flex items-center justify-center shadow-lg animate-quest-complete">
            <Icon size={38} className="text-white" strokeWidth={2.5} />
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight mb-1">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}

          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            {xpGained !== undefined && xpGained > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-cyan-50 text-cyan-700 px-4 py-2 rounded-full font-extrabold text-base">
                <Zap size={16} strokeWidth={2.5} /> +{xpGained} XP
              </span>
            )}
            {level !== undefined && (
              <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 px-4 py-2 rounded-full font-extrabold text-base">
                <Star size={16} strokeWidth={2.5} /> Nivel {level}
              </span>
            )}
            {tier && <TierBadge tier={tier} size="lg" />}
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full bg-cyan-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-cyan-700 transition-colors btn-press"
          >
            ¡Seguir!
          </button>
        </div>
      </Modal>
    </>
  );
}
