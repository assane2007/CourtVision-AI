"use client";

import { useI18n } from "@/lib/i18n/language-provider";
import { getDrillById } from "@/lib/player/plan-generator";
import { SKILL_META, type SkillKey } from "@/lib/player/iq-engine";
import type { ApiWorkout } from "@/lib/api-client";
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
  Check,
  X,
  Clock,
  Dumbbell,
  Zap,
  Flame,
  Target,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  workout: ApiWorkout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function intensityLabel(level: number, isEn: boolean) {
  if (level === 1) return isEn ? "Low" : "Faible";
  if (level === 2) return isEn ? "Medium" : "Moyen";
  return isEn ? "High" : "Eleve";
}

function intensityColor(level: number) {
  if (level === 1) return "text-cv-teal bg-cv-teal/10 border-cv-teal/20";
  if (level === 2) return "text-cv-warning bg-[#f59e0b]/10 border-[#f59e0b]/20";
  return "text-red-400 bg-red-400/10 border-red-400/20";
}

export function WorkoutDetailDialog({ workout, open, onOpenChange }: Props) {
  const { lang } = useI18n();
  const isEn = lang === "en";

  if (!workout) return null;

  const completedCount = workout.drillData.filter((d) => d.completed).length;
  const totalCount = workout.drillData.length;

  // Collect skill gains
  const skillGainEntries = Object.entries(workout.skillGains)
    .filter(([, v]) => typeof v === "number" && v > 0)
    .map(([k, v]) => ({
      key: k as SkillKey,
      value: v as number,
    }));

  const dateStr = new Date(workout.date).toLocaleDateString(
    isEn ? "en-US" : "fr-FR",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cv-surface border-cv-border rounded-2xl p-0 max-w-lg max-h-[85vh] overflow-hidden sm:max-w-md [&>button]:top-3 [&>button]:right-3">
        <ScrollArea className="max-h-[85vh]">
          <div className="p-6">
            {/* Header */}
            <DialogHeader className="mb-4 text-left">
              <DialogTitle className="text-cv-text text-lg font-bold leading-tight">
                {workout.planTitle}
              </DialogTitle>
              <DialogDescription className="text-cv-text-muted text-xs mt-1">
                {dateStr}
              </DialogDescription>
            </DialogHeader>

            {/* Meta badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <Badge
                variant="outline"
                className="bg-cv-subtle border-cv-border-hover text-cv-text-secondary text-[10px] px-2 py-0.5 rounded-full"
              >
                <Dumbbell className="w-3 h-3 mr-1" />
                {workout.planType}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 rounded-full ${intensityColor(workout.intensity)}`}
              >
                <Flame className="w-3 h-3 mr-1" />
                {intensityLabel(workout.intensity, isEn)}
              </Badge>
              <Badge
                variant="outline"
                className="bg-cv-subtle border-cv-border-hover text-cv-text-secondary text-[10px] px-2 py-0.5 rounded-full"
              >
                <Clock className="w-3 h-3 mr-1" />
                {workout.durationMin} min
              </Badge>
            </div>

            {/* Drill completion summary */}
            <div className="flex items-center justify-between bg-cv-bg rounded-lg p-3 mb-5">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cv-lime" />
                <span className="text-cv-text-secondary text-xs">
                  {isEn ? "Drills completed" : "Exercices completes"}
                </span>
              </div>
              <span className="text-cv-text text-sm font-bold">
                {completedCount}/{totalCount}
              </span>
            </div>

            {/* Drill list */}
            <div className="flex flex-col gap-2 mb-5">
              {workout.drillData.map((drill, i) => {
                const drillInfo = getDrillById(drill.drillId);
                const drillName = drillInfo
                  ? isEn
                    ? drillInfo.name.en
                    : drillInfo.name.fr
                  : drill.drillId;

                return (
                  <motion.div
                    key={drill.drillId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                    className="bg-cv-bg border border-cv-border rounded-lg p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          drill.completed
                            ? "bg-cv-lime/15"
                            : "bg-cv-subtle-hover"
                        }`}
                      >
                        {drill.completed ? (
                          <Check className="w-3 h-3 text-cv-lime" />
                        ) : (
                          <X className="w-3 h-3 text-cv-text-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium leading-tight ${
                            drill.completed
                              ? "text-cv-text"
                              : "text-cv-text-muted"
                          }`}
                        >
                          {drillName}
                        </p>

                        {/* Sets info */}
                        {drill.sets.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {drill.sets.map((set, si) => (
                              <span
                                key={si}
                                className="text-[10px] text-cv-text-secondary bg-cv-subtle rounded px-1.5 py-0.5"
                              >
                                {isEn ? "Set" : "Serie"} {si + 1}:{" "}
                                {set.reps}
                                {set.made !== undefined
                                  ? ` / ${set.made} ${isEn ? "made" : "reussis"}`
                                  : ` ${isEn ? "reps" : "reps"}`}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Notes */}
                        {drill.notes && (
                          <div className="mt-2 flex items-start gap-1.5">
                            <MessageSquare className="w-3 h-3 text-cv-text-muted shrink-0 mt-0.5" />
                            <p className="text-[11px] text-cv-text-muted leading-relaxed">
                              {drill.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* XP and skill gains */}
            <div className="bg-gradient-to-br from-cv-lime/[0.06] to-cv-teal/[0.04] border border-cv-lime/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cv-lime" />
                  <span className="text-cv-text text-sm font-semibold">
                    {isEn ? "XP Earned" : "XP gagne"}
                  </span>
                </div>
                <span className="text-cv-lime text-lg font-bold">
                  +{workout.xpEarned}
                </span>
              </div>

              {skillGainEntries.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {skillGainEntries.map(({ key, value }) => {
                    const meta = SKILL_META[key];
                    return (
                      <span
                        key={key}
                        className="text-[10px] font-medium text-cv-teal bg-cv-teal/10 rounded-full px-2 py-0.5"
                      >
                        +{value} {isEn ? meta.label.en : meta.label.fr}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}