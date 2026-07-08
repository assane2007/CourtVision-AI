"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n/language-provider";
import type { ApiMatch } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy,
  Clock,
  Zap,
  Target,
  TrendingUp,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  match: ApiMatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function pct(made: number, att: number): string {
  if (att === 0) return "0.0";
  return ((made / att) * 100).toFixed(1);
}

export function MatchDetailDialog({ match, open, onOpenChange }: Props) {
  const { lang } = useI18n();
  const isEn = lang === "en";

  const advanced = useMemo(() => {
    if (!match) return null;
    const fgPct = pct(match.fgMade, match.fgAttempts);
    const tpPct = pct(match.tpMade, match.tpAttempts);
    const ppg =
      match.minutes > 0
        ? (match.points / match.minutes) * 48
        : 0;
    const rpg =
      match.minutes > 0
        ? (match.rebounds / match.minutes) * 48
        : 0;
    const apg =
      match.minutes > 0
        ? (match.assists / match.minutes) * 48
        : 0;
    // Simplified PER-like rating
    const per =
      match.minutes > 0
        ? (
            (match.points +
              match.rebounds * 1.2 +
              match.assists * 1.5 +
              match.steals * 2 +
              match.blocks * 2 -
              match.turnovers * 1.5) /
            match.minutes
          ).toFixed(1)
        : "0.0";

    return { fgPct, tpPct, ppg: ppg.toFixed(1), rpg: rpg.toFixed(1), apg: apg.toFixed(1), per };
  }, [match]);

  if (!match || !advanced) return null;

  const dateStr = new Date(match.date).toLocaleDateString(
    isEn ? "en-US" : "fr-FR",
    { day: "numeric", month: "long", year: "numeric" },
  );

  const isWin = match.result === "W";

  const stats = [
    { label: isEn ? "Points" : "Points", value: match.points, icon: Target },
    { label: isEn ? "Rebounds" : "Rebonds", value: match.rebounds, icon: BarChart3 },
    { label: isEn ? "Assists" : "Passes D.", value: match.assists, icon: TrendingUp },
    { label: isEn ? "Steals" : "Interceptions", value: match.steals, icon: Zap },
    { label: isEn ? "Blocks" : "Contres", value: match.blocks, icon: BarChart3 },
    { label: isEn ? "Turnovers" : "Pertes", value: match.turnovers, icon: TrendingUp },
  ];

  const advancedStats = [
    { label: isEn ? "FG%" : "Tir %", value: `${advanced.fgPct}%` },
    { label: isEn ? "3P%" : "3P %", value: `${advanced.tpPct}%` },
    { label: "PPG", value: advanced.ppg },
    { label: "RPG", value: advanced.rpg },
    { label: "APG", value: advanced.apg },
    { label: "PER", value: advanced.per },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cv-surface border-cv-border rounded-2xl p-0 max-w-lg max-h-[85vh] overflow-hidden sm:max-w-md [&>button]:top-3 [&>button]:right-3">
        <ScrollArea className="max-h-[85vh]">
          <div className="p-6">
            {/* Header */}
            <DialogHeader className="mb-4 text-left">
              <DialogTitle className="text-cv-text text-lg font-bold leading-tight">
                {isEn ? "vs" : "vs"} {match.opponent}
              </DialogTitle>
              <DialogDescription className="text-cv-text-muted text-xs mt-1">
                {dateStr}
              </DialogDescription>
            </DialogHeader>

            {/* Result badge + score */}
            <div className="flex items-center gap-3 mb-5">
              <Badge
                className={`text-sm font-bold px-3 py-1 rounded-lg border ${
                  isWin
                    ? "bg-cv-lime/15 text-cv-lime border-cv-lime/20"
                    : "bg-red-400/15 text-red-400 border-red-400/20"
                }`}
              >
                <Trophy className="w-3.5 h-3.5 mr-1.5" />
                {isWin
                  ? isEn
                    ? "WIN"
                    : "VICTOIRE"
                  : isEn
                    ? "LOSS"
                    : "DEFAITE"}
              </Badge>
              <span className="text-cv-text text-lg font-bold">
                {match.teamScore} - {match.oppScore}
              </span>
              <Badge
                variant="outline"
                className="bg-cv-subtle border-cv-border-hover text-cv-text-secondary text-[10px] px-2 py-0.5 rounded-full ml-auto"
              >
                <Clock className="w-3 h-3 mr-1" />
                {match.minutes} min
              </Badge>
            </div>

            {/* Basic stats grid */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="bg-cv-bg border border-cv-border rounded-lg p-3 flex flex-col items-center gap-1"
                >
                  <stat.icon className="w-3.5 h-3.5 text-cv-text-muted" />
                  <span className="text-cv-text text-lg font-bold leading-none">
                    {stat.value}
                  </span>
                  <span className="text-cv-text-muted text-[10px]">
                    {stat.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Advanced stats */}
            <div className="mb-5">
              <h4 className="text-cv-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                {isEn ? "Advanced Stats" : "Stats avancees"}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {advancedStats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.04, duration: 0.2 }}
                    className="bg-cv-bg border border-cv-border rounded-lg p-3 flex flex-col items-center gap-1"
                  >
                    <span className="text-cv-teal text-base font-bold leading-none">
                      {stat.value}
                    </span>
                    <span className="text-cv-text-muted text-[10px]">
                      {stat.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Shot breakdown */}
            <div className="bg-cv-bg border border-cv-border rounded-lg p-4 mb-5">
              <h4 className="text-cv-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                {isEn ? "Shot Breakdown" : "Detail des tirs"}
              </h4>
              <div className="flex items-center justify-between text-sm">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-cv-text font-bold">
                    {match.fgMade}/{match.fgAttempts}
                  </span>
                  <span className="text-cv-text-muted text-[10px]">
                    {isEn ? "FG" : "Tir"}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-cv-text font-bold">
                    {match.tpMade}/{match.tpAttempts}
                  </span>
                  <span className="text-cv-text-muted text-[10px]">3P</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-cv-text font-bold">
                    {match.fgMade - match.tpMade}/
                    {match.fgAttempts - match.tpAttempts}
                  </span>
                  <span className="text-cv-text-muted text-[10px]">
                    {isEn ? "2P" : "2 pts"}
                  </span>
                </div>
              </div>
            </div>

            {/* XP earned */}
            <div className="bg-gradient-to-br from-cv-lime/[0.06] to-cv-teal/[0.04] border border-cv-lime/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cv-lime" />
                  <span className="text-cv-text text-sm font-semibold">
                    {isEn ? "XP Earned" : "XP gagne"}
                  </span>
                </div>
                <span className="text-cv-lime text-lg font-bold">
                  +{match.xpEarned}
                </span>
              </div>
            </div>

            {/* Notes */}
            {match.notes && (
              <div className="mt-4 bg-cv-bg border border-cv-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-cv-text-muted" />
                  <span className="text-cv-text-secondary text-xs font-semibold uppercase tracking-wider">
                    {isEn ? "Notes" : "Notes"}
                  </span>
                </div>
                <p className="text-cv-text-secondary text-sm leading-relaxed">
                  {match.notes}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}