import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/player/db-helpers";
import { trackError } from "@/lib/monitoring";

function dateRange(offsetDays: number) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - offsetDays);
  return { start, end };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser();
    const playerId = user?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const player = await requirePlayer(playerId);

    const thisWeek = dateRange(7);
    const prevWeek = dateRange(14);
    prevWeek.end = new Date(thisWeek.start);

    // Fetch this week and previous week workout sessions in parallel
    const [thisWeekWorkouts, prevWeekWorkouts] = await Promise.all([
      db.workoutSession.findMany({
        where: {
          playerId: player.id,
          startedAt: { gte: thisWeek.start, lte: thisWeek.end },
        },
        orderBy: { startedAt: "desc" },
      }),
      db.workoutSession.findMany({
        where: {
          playerId: player.id,
          startedAt: { gte: prevWeek.start, lt: prevWeek.end },
        },
      }),
    ]);

    // Aggregate this week
    const thisTotalWorkouts = thisWeekWorkouts.length;
    const thisTotalSeconds = thisWeekWorkouts.reduce((s, w) => s + w.totalDurationSec, 0);
    const thisTotalMinutes = Math.round(thisTotalSeconds / 60);
    const thisAvgScore = thisTotalWorkouts > 0
      ? Math.round((thisWeekWorkouts.reduce((s, w) => s + w.avgScore, 0) / thisTotalWorkouts) * 10) / 10
      : 0;

    // Aggregate previous week
    const prevTotalWorkouts = prevWeekWorkouts.length;
    const prevTotalSeconds = prevWeekWorkouts.reduce((s, w) => s + w.totalDurationSec, 0);
    const prevTotalMinutes = Math.round(prevTotalSeconds / 60);

    return NextResponse.json({
      weekStart: thisWeek.start.toISOString().slice(0, 10),
      weekEnd: thisWeek.end.toISOString().slice(0, 10),
      thisWeek: {
        totalWorkouts: thisTotalWorkouts,
        totalMinutes: thisTotalMinutes,
        totalXP: 0,
        avgIntensity: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        avgPoints: 0,
        avgRebounds: 0,
        avgAssists: 0,
        skillGains: [],
        avgScore: thisAvgScore,
      },
      prevWeek: {
        totalWorkouts: prevTotalWorkouts,
        totalMinutes: prevTotalMinutes,
        totalXP: 0,
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