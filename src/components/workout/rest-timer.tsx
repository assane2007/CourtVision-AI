"use client";

import { motion } from "framer-motion";
import { SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/types";
import { useTranslation } from '@/components/providers/language-provider';

interface RestTimerProps {
  restCount: number;
  onSkip: () => void;
  totalRest: number;
  activePlan: Plan | null;
  activePlanIndex: number;
}

/**
 * Rest period overlay with countdown and skip button.
 */
export function RestTimer({
  restCount,
  onSkip,
  totalRest,
  activePlan,
  activePlanIndex,
}: RestTimerProps) {
  const { td } = useTranslation()
  const circumference = 2 * Math.PI * 40; // radius 40
  const progress = ((totalRest - restCount) / totalRest) * circumference;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
      <div className="text-center">
        <p className="text-white/80 text-lg mb-4">{td('Repos', 'Rest')}</p>

        {/* Circular countdown */}
        <svg
          width="100"
          height="100"
          viewBox="0 0 100 100"
          role="img"
          aria-label={td(`Temps de repos : ${restCount} secondes`, `Rest time: ${restCount} seconds`)}
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="4"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#f97316"
            strokeWidth="4"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className="transition-all duration-1000"
          />
        </svg>

        <div className="-mt-16 mb-4">
          <motion.span
            key={restCount}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl font-bold text-orange-500 inline-block"
          >
            {restCount}
          </motion.span>
        </div>

        <p className="text-white/50 text-sm mt-2">
          {activePlan && activePlan.drills
            ? td(`${activePlanIndex + 1}/${activePlan.drills.length} exercices`, `${activePlanIndex + 1}/${activePlan.drills.length} exercises`)
            : td('Prochain exercice...', 'Next exercise...')}
        </p>
        <Button
          variant="outline"
          onClick={onSkip}
          aria-label={td('Passer le temps de repos', 'Skip rest time')}
          className="mt-4 border-white/30 text-white hover:bg-white/10 min-h-[44px]"
        >
          <SkipForward className="mr-2 h-4 w-4" />
          {td('Passer', 'Skip')}
        </Button>
      </div>
    </div>
  );
}