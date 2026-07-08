"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ACHIEVEMENTS, type Achievement } from "@/lib/player/iq-engine";

const TIER_COLORS: Record<Achievement["tier"], string> = {
  bronze: "text-amber-600",
  silver: "text-cv-text-secondary",
  gold: "text-[#eab308]",
  platinum: "text-cv-lime",
};

const TIER_BORDER: Record<Achievement["tier"], string> = {
  bronze: "border-amber-600/30",
  silver: "border-white/[0.12]",
  gold: "border-[#eab308]/30",
  platinum: "border-cv-lime/30",
};

const TIER_BG: Record<Achievement["tier"], string> = {
  bronze: "bg-amber-600/5",
  silver: "bg-white/[0.03]",
  gold: "bg-[#eab308]/5",
  platinum: "bg-cv-lime/5",
};

function AchievementToastContent({
  achievement,
  lang,
}: {
  achievement: Achievement;
  lang: "fr" | "en";
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-3.5 min-w-[280px] max-w-[340px] ${TIER_BG[achievement.tier]} ${TIER_BORDER[achievement.tier]}`}
    >
      {/* Achievement icon */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cv-lime/10 border border-cv-lime/20 text-lg`}
      >
        {achievement.emoji}
      </motion.div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Sparkles className={`w-3 h-3 ${TIER_COLORS[achievement.tier]}`} />
          <span
            className={`text-[9px] font-bold uppercase tracking-widest ${TIER_COLORS[achievement.tier]}`}
          >
            {achievement.tier === "platinum"
              ? lang === "fr" ? "Platine" : "Platinum"
              : achievement.tier === "gold"
              ? lang === "fr" ? "Or" : "Gold"
              : achievement.tier === "silver"
              ? lang === "fr" ? "Argent" : "Silver"
              : lang === "fr" ? "Bronze" : "Bronze"}
          </span>
        </div>
        <p className="text-sm font-bold text-cv-text leading-tight">
          {achievement.name[lang]}
        </p>
        <p className="text-[11px] text-cv-text-secondary mt-0.5 leading-snug">
          {achievement.description[lang]}
        </p>
      </div>
    </div>
  );
}

/**
 * Show achievement unlock toasts for each new achievement ID.
 * Uses sonner's toast with a custom component.
 */
export function showAchievementToasts(
  achievementIds: string[],
  lang: "fr" | "en"
) {
  for (let i = 0; i < achievementIds.length; i++) {
    const ach = ACHIEVEMENTS.find((a) => a.id === achievementIds[i]);
    if (!ach) continue;

    // Stagger the toasts so they don't all appear at once
    setTimeout(() => {
      toast.custom(
        () => <AchievementToastContent achievement={ach} lang={lang} />,
        {
          duration: 4500,
          position: "top-center",
          unstyled: true,
          className: "bg-transparent border-0 p-0 shadow-none",
        }
      );
    }, i * 600);
  }
}