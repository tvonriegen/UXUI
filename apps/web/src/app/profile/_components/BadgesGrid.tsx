"use client";
// ──────────────────────────────────────────────────────────
// BadgesGrid – Student achievement badge display
// Visually distinguishes three tiers:
//  1. Verified   – awarded by school validation (gold, ShieldCheck)
//  2. Earned     – standard XP / activity badges (cyan, Award)
//  3. Locked     – not yet earned (slate, Lock)
// ──────────────────────────────────────────────────────────

import { Award, Lock, ShieldCheck, Share2 } from "lucide-react";

export interface UserBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  earned_at: string | null;
  /** True when this badge was awarded via a school skill validation */
  verified?: boolean;
  /** The validated skill name, if applicable */
  skill_name?: string;
}

interface BadgesGridProps {
  badges: UserBadge[];
  /** When true, show a LinkedIn share button on verified badges */
  showShare?: boolean;
  profileName?: string;
}

function shareToLinkedIn(badge: UserBadge, profileName?: string) {
  const text = encodeURIComponent(
    `${profileName ?? "Estudiante"} ha obtenido la insignia "${badge.name}" en ClassLink` +
    (badge.skill_name ? ` por la habilidad técnica validada: ${badge.skill_name}` : "") +
    ". ¡Perfil institucional verificado!"
  );
  const url  = encodeURIComponent(window.location.origin + "/profile");
  window.open(
    `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`,
    "_blank",
    "noopener,noreferrer,width=600,height=500"
  );
}

function BadgeTier({ badge, showShare, profileName }: { badge: UserBadge; showShare?: boolean; profileName?: string }) {
  const isVerified = badge.earned && badge.verified;
  const isEarned   = badge.earned && !badge.verified;

  return (
    <div
      className={`bg-white rounded-2xl p-5 border text-center transition-all relative group ${
        isVerified ? "border-amber-300 shadow-md shadow-amber-100/60"
        : isEarned  ? "border-cyan-200 shadow-sm"
        :             "border-slate-200/60 opacity-50"
      }`}
    >
      {/* Tier label */}
      {isVerified && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            <ShieldCheck size={9} /> Validado
          </span>
        </div>
      )}

      {/* Icon area */}
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 mt-1 ${
          isVerified ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-inner"
          : isEarned  ? "bg-cyan-50"
          :             "bg-slate-100"
        }`}
      >
        {isVerified
          ? <ShieldCheck size={28} className="text-white" />
          : isEarned
          ? <Award size={28} className="text-cyan-600" />
          : <Lock size={22} className="text-slate-300" />
        }
      </div>

      <p className={`text-sm font-bold leading-tight ${isVerified ? "text-amber-800" : "text-slate-800"}`}>
        {badge.name}
      </p>

      {badge.skill_name && (
        <p className="text-[10px] font-bold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 mt-1.5 inline-block border border-amber-200">
          {badge.skill_name}
        </p>
      )}

      <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">{badge.description}</p>

      {badge.earned && badge.earned_at && (
        <p className={`text-[10px] mt-2 font-medium ${isVerified ? "text-amber-500" : "text-cyan-500"}`}>
          {new Date(badge.earned_at).toLocaleDateString("es-CL")}
        </p>
      )}

      {/* LinkedIn share button (verified only) */}
      {isVerified && showShare && (
        <button
          onClick={() => shareToLinkedIn(badge, profileName)}
          className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-[#0077B5] bg-[#e8f4fb] hover:bg-[#0077B5] hover:text-white px-3 py-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          title="Compartir en LinkedIn"
        >
          <Share2 size={10} /> LinkedIn
        </button>
      )}
    </div>
  );
}

export function BadgesGrid({ badges, showShare, profileName }: BadgesGridProps) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/60">
        <Award size={40} className="mx-auto mb-3 text-slate-200" />
        <p className="text-slate-400 font-medium">No se encontraron insignias.</p>
        <p className="text-xs text-slate-300 mt-1">Las insignias se asignan desde la base de datos.</p>
      </div>
    );
  }

  const verified = badges.filter((b) => b.earned && b.verified);
  const earned   = badges.filter((b) => b.earned && !b.verified);
  const locked   = badges.filter((b) => !b.earned);

  return (
    <div className="space-y-6">
      {verified.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={14} className="text-amber-500" />
            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Validadas por institución ({verified.length})
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {verified.map((b) => (
              <BadgeTier key={b.id} badge={b} showShare={showShare} profileName={profileName} />
            ))}
          </div>
        </section>
      )}

      {earned.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Award size={14} className="text-cyan-500" />
            <h4 className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
              Logros obtenidos ({earned.length})
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {earned.map((b) => (
              <BadgeTier key={b.id} badge={b} showShare={showShare} profileName={profileName} />
            ))}
          </div>
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Lock size={14} className="text-slate-400" />
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Bloqueadas ({locked.length})
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {locked.map((b) => (
              <BadgeTier key={b.id} badge={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
