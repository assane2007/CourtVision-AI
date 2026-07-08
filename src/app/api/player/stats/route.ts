import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/player/db-helpers";
import { levelFromXP } from "@/lib/player/iq-engine";
import { calcTotalXP } from "@/lib/player/xp-engine";
import type { SkillKey } from "@/lib/player/iq-engine";
import { trackError } from "@/lib/monitoring";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const playerId = (session?.user as { id?: string })?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const player = await requirePlayer(playerId);

    // Aggregate XP (use Number() to convert BigInt from SQLite)
    const [workoutXPResult, matchXPResult] = await Promise.all([
      db.workoutLog.aggregate({
        where: { playerId: player.id },
        _sum: { xpEarned: true },
      }),
      db.matchLog.aggregate({
        where: { playerId: player.id },
        _sum: { xpEarned: true },
      }),
    ]);

    const [totalWorkouts, totalMatches, totalAchievements, wins] = await Promise.all([
      db.workoutLog.count({ where: { playerId: player.id } }),
      db.matchLog.count({ where: { playerId: player.id } }),
      db.playerAchievement.count({ where: { playerId: player.id } }),
      db.matchLog.count({ where: { playerId: player.id, result: "W" } }),
    ]);

    const workoutXP = Number(workoutXPResult._sum.xpEarned ?? 0);
    const matchXP = Number(matchXPResult._sum.xpEarned ?? 0);
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    const totalXP = calcTotalXP(workoutXP, matchXP, totalAchievements);
    const levelInfo = levelFromXP(totalXP);

    const skillDNA: Record<SkillKey, number> = {
      shooting: player.shooting,
      handling: player.handling,
      finishing: player.finishing,
      defense: player.defense,
      iq: player.iq,
    };

    // Recent activity
    const [recentWorkouts, recentMatches] = await Promise.all([
      db.workoutLog.findMany({
        where: { playerId: player.id },
        orderBy: { date: "desc" },
        take: 5,
        select: { id: true, planType: true, planTitle: true, date: true, xpEarned: true, durationMin: true },
      }),
      db.matchLog.findMany({
        where: { playerId: player.id },
        orderBy: { date: "desc" },
        take: 5,
        select: { id: true, date: true, opponent: true, result: true, points: true, xpEarned: true },
      }),
    ]);

    const recentActivity = [
      ...recentWorkouts.map((w) => ({ type: "workout" as const, ...w })),
      ...recentMatches.map((m) => ({ type: "match" as const, ...m })),
    ].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0)).slice(0, 10);

    return NextResponse.json({
      totalXP,
      level: levelInfo,
      streak: player.currentStreak,
      skillDNA,
      totalWorkouts,
      totalMatches,
      winRate,
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