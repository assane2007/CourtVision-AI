"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Zap, Trophy, Star, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/utils";
import { getLevelInfo } from "@/lib/xp";

/* ─── Types ─── */
interface XPData {
  xp: number;
  level: number;
  logs: unknown[];
}

/* ─── Level Title System ─── */
function getLevelTitle(level: number): string {
  if (level >= 20) return "MVP";
  if (level >= 15) return "Légende";
  if (level >= 10) return "Élite";
  if (level >= 7) return "Avancé";
  if (level >= 4) return "Intermédiaire";
  return "Débutant";
}

function LevelIcon({ level }: { level: number }) {
  const cls = "w-3.5 h-3.5 text-orange-500";
  if (level >= 20) return <Flame className={cls} />;
  if (level >= 15) return <Trophy className={cls} />;
  if (level >= 10) return <Star className={cls} />;
  return <Zap className={cls} />;
}

/* ─── Subtle Confetti Burst ─── */
function XPConfettiBurst() {
  const particles = Array.from({ length: 16 }).map((_, i) => ({
    id: i,
    x: 30 + Math.random() * 40,
    y: 10 + Math.random() * 15,
    color: ["#f97316", "#fb923c", "#fbbf24", "#fdba74", "#fff"][i % 5],
    size: 2 + Math.random() * 3,
    delay: Math.random() * 0.3,
  }));

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
          }}
          initial={{ y: 0, opacity: 0, scale: 0, rotate: 0 }}
          animate={{
            y: 20 + Math.random() * 30,
            opacity: [0, 1, 1, 0],
            scale: [0, 1.2, 1, 0.6],
            rotate: 90 + Math.random() * 270,
          }}
          transition={{
            duration: 1.2 + Math.random() * 0.6,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Shimmer overlay for progress bar ─── */
function ShimmerOverlay() {
  return (
    <motion.div
      className="absolute inset-0 rounded-full overflow-hidden"
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 -translate-x-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
        }}
        animate={{ translateX: ["-100%", "100%"] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 1.5,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}

/* ─── Loading Skeleton ─── */
function XPProgressBarSkeleton() {
  return (
    <Card className="p-5 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-500/0">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
      </div>
    </Card>
  );
}

/* ─── Main Component ─── */
export function XPProgressBar() {
  const [showConfetti, setShowConfetti] = useState(false);

  const { data, isLoading } = useQuery<XPData>({
    queryKey: ["player-xp"],
    queryFn: () => apiFetch<XPData>("/api/xp"),
  });

  /* Subtle confetti burst on first data load */
  useEffect(() => {
    if (data && !isLoading) {
      queueMicrotask(() => setShowConfetti(true));
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [data, isLoading]);

  if (isLoading) return <XPProgressBarSkeleton />;

  if (!data) return null;

  const totalXP = data.xp;
  const level = data.level;
  const levelInfo = getLevelInfo(totalXP);
  const progressPercent = levelInfo.progress * 100;
  const title = getLevelTitle(level);
  const xpToNext = levelInfo.xpNeededForNextLevel != null ? levelInfo.xpNeededForNextLevel - levelInfo.xpInCurrentLevel : 0;

  return (
    <section aria-label="Progression XP" className="relative overflow-hidden">
      <Card className="relative p-5 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-500/0 overflow-hidden">
        <AnimatePresence>
          {showConfetti && <XPConfettiBurst />}
        </AnimatePresence>

        {/* Decorative glow behind the level number */}
        <div
          className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-20 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)",
          }}
        />

        <div className="relative flex items-center gap-4">
          {/* Left: Level badge */}
          <motion.div
            className="relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 shrink-0"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400/80 leading-none">
              Niveau
            </span>
            <motion.span
              className="text-3xl font-extrabold leading-none bg-gradient-to-b from-orange-400 to-orange-600 bg-clip-text text-transparent"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
                delay: 0.15,
              }}
            >
              {level}
            </motion.span>
          </motion.div>

          {/* Right: Details */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-1.5 mb-1">
              <LevelIcon level={level} />
              <span className="text-sm font-bold text-orange-500">{title}</span>
            </div>

            {/* Total XP */}
            <p className="text-xs text-muted-foreground mb-2.5">
              <span className="font-semibold text-foreground">
                {totalXP.toLocaleString("fr-FR")}
              </span>{" "}
              XP au total
            </p>

            {/* Progress bar */}
            <div
              className="w-full h-3 bg-muted/80 rounded-full overflow-hidden relative"
              role="progressbar"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${Math.round(progressPercent)}% vers le niveau ${level + 1}`}
            >
              {/* Glow behind the bar */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.05) ${progressPercent}%, transparent ${progressPercent}%)`,
                  width: "100%",
                }}
                aria-hidden="true"
              />

              {/* Bar */}
              <motion.div
                className="relative h-full rounded-full overflow-hidden"
                style={{
                  background: "linear-gradient(90deg, #f97316, #fb923c)",
                  boxShadow:
                    progressPercent > 0
                      ? "0 0 12px rgba(249,115,22,0.4), 0 0 4px rgba(249,115,22,0.6)"
                      : "none",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              >
                <ShimmerOverlay />
              </motion.div>
            </div>

            {/* XP to next level */}
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-[11px] text-muted-foreground">
                {levelInfo.xpInCurrentLevel.toLocaleString("fr-FR")} /{" "}
                {levelInfo.xpNeededForNextLevel != null ? levelInfo.xpNeededForNextLevel.toLocaleString("fr-FR") : "∞"} XP
              </span>
              <span className="text-[11px] font-medium text-orange-500/70">
                {xpToNext.toLocaleString("fr-FR")} XP restants
              </span>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
