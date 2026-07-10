import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/player/db-helpers";
import { levelFromXP } from "@/lib/player/iq-engine";
import type { SkillKey } from "@/lib/player/iq-engine";
import { trackError } from "@/lib/monitoring";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser();
    const playerId = user?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const player = await requirePlayer(playerId);

    const [totalWorkouts, _totalAchievements] = await Promise.all([
      db.workoutSession.count({ where: { playerId: player.id } }),
      db.achievement.count({ where: { playerId: player.id } }),
    ]);

    // XP is now stored directly on the Player model
    const totalXP = player.xp;
    const levelInfo = levelFromXP(totalXP);

    const skillDNA: Record<SkillKey, number> = {
      shooting: player.shooting,
      handling: player.handling,
      finishing: player.finishing,
      defense: player.defense,
      iq: player.iq,
    };

    // Recent activity (workout sessions only — MatchLog model removed)
    const recentWorkouts = await db.workoutSession.findMany({
      where: { playerId: player.id },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: {
        id: true,
        startedAt: true,
        totalDurationSec: true,
        totalScore: true,
        avgScore: true,
        totalDrills: true,
        notes: true,
      },
    });

    const recentActivity = recentWorkouts.map((w) => ({
      type: "workout" as const,
      id: w.id,
      date: w.startedAt.toISOString(),
      totalDurationSec: w.totalDurationSec,
      totalScore: w.totalScore,
      avgScore: w.avgScore,
      totalDrills: w.totalDrills,
    }));

    return NextResponse.json({
      totalXP,
      level: levelInfo,
      streak: player.currentStreak,
      skillDNA,
      totalWorkouts,
      totalMatches: 0,
      winRate: 0,
      recentActivity,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    trackError("[player/stats GET] error", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}