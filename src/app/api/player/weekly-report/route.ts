import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/player/db-helpers";
import { trackError } from "@/lib/monitoring";

function dateRange(offsetDays: number) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - offsetDays);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const playerId = (session?.user as { id?: string })?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const player = await requirePlayer(playerId);

    const thisWeek = dateRange(7);
    const prevWeek = dateRange(14);
    prevWeek.end = thisWeek.start;

    // Fetch this week data
    const [thisWeekWorkouts, thisWeekMatches] = await Promise.all([
      db.workoutLog.findMany({
        where: {
          playerId: player.id,
          date: { gte: thisWeek.start, lte: thisWeek.end },
        },
        orderBy: { date: "desc" },
      }),
      db.matchLog.findMany({
        where: {
          playerId: player.id,
          date: { gte: thisWeek.start, lte: thisWeek.end },
        },
        orderBy: { date: "desc" },
      }),
    ]);

    // Fetch previous week data for comparison
    const [prevWeekWorkouts, prevWeekMatches] = await Promise.all([
      db.workoutLog.findMany({
        where: {
          playerId: player.id,
          date: { gte: prevWeek.start, lt: prevWeek.end },
        },
      }),
      db.matchLog.findMany({
        where: {
          playerId: player.id,
          date: { gte: prevWeek.start, lt: prevWeek.end },
        },
      }),
    ]);

    // Aggregate this week
    const thisTotalWorkouts = thisWeekWorkouts.length;
    const thisTotalMinutes = thisWeekWorkouts.reduce((s, w) => s + w.durationMin, 0);
    const thisTotalXP = thisWeekWorkouts.reduce((s, w) => s + w.xpEarned, 0)
      + thisWeekMatches.reduce((s, m) => s + m.xpEarned, 0);
    const thisAvgIntensity = thisTotalWorkouts > 0
      ? Math.round((thisWeekWorkouts.reduce((s, w) => s + w.intensity, 0) / thisTotalWorkouts) * 10) / 10
      : 0;

    // Match results
    const thisWins = thisWeekMatches.filter((m) => m.result === "W").length;
    const thisLosses = thisWeekMatches.filter((m) => m.result === "L").length;
    const thisTotalMatches = thisWeekMatches.length;
    const avgPoints = thisTotalMatches > 0
      ? Math.round(thisWeekMatches.reduce((s, m) => s + m.points, 0) / thisTotalMatches)
      : 0;
    const avgRebounds = thisTotalMatches > 0
      ? Math.round(thisWeekMatches.reduce((s, m) => s + m.rebounds, 0) / thisTotalMatches)
      : 0;
    const avgAssists = thisTotalMatches > 0
      ? Math.round(thisWeekMatches.reduce((s, m) => s + m.assists, 0) / thisTotalMatches)
      : 0;

    // Skill gains breakdown (top 5)
    const skillGainsMap: Record<string, number> = {};
    for (const w of thisWeekWorkouts) {
      let gains: Record<string, number> = {};
      try {
        gains = typeof w.skillGains === "string" ? JSON.parse(w.skillGains) : (w.skillGains as Record<string, number>);
      } catch {
        // skip malformed
      }
      for (const [skill, val] of Object.entries(gains)) {
        if (typeof val === "number") {
          skillGainsMap[skill] = (skillGainsMap[skill] ?? 0) + val;
        }
      }
    }
    const skillGains = Object.entries(skillGainsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, gain]) => ({ skill, gain: Math.round(gain * 100) / 100 }));

    // Previous week aggregates for comparison
    const prevTotalWorkouts = prevWeekWorkouts.length;
    const prevTotalMinutes = prevWeekWorkouts.reduce((s, w) => s + w.durationMin, 0);
    const prevTotalXP = prevWeekWorkouts.reduce((s, w) => s + w.xpEarned, 0)
      + prevWeekMatches.reduce((s, m) => s + m.xpEarned, 0);

    return NextResponse.json({
      weekStart: thisWeek.start,
      weekEnd: thisWeek.end,
      thisWeek: {
        totalWorkouts: thisTotalWorkouts,
        totalMinutes: thisTotalMinutes,
        totalXP: thisTotalXP,
        avgIntensity: thisAvgIntensity,
        totalMatches: thisTotalMatches,
        wins: thisWins,
        losses: thisLosses,
        avgPoints,
        avgRebounds,
        avgAssists,
        skillGains,
      },
      prevWeek: {
        totalWorkouts: prevTotalWorkouts,
        totalMinutes: prevTotalMinutes,
        totalXP: prevTotalXP,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    trackError("[player/weekly-report GET] error", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}