import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/player/db-helpers";
import { trackError } from "@/lib/monitoring";
import {
  calcMatchXP,
  calcMatchSkillGains,
  calcNewStreak,
  applySkillGains,
  checkNewAchievements,
} from "@/lib/player/xp-engine";
import { ACHIEVEMENTS } from "@/lib/player/iq-engine";

const matchSchema = z.object({
  date: z.string().min(1),
  opponent: z.string().min(1).max(200),
  result: z.enum(["W", "L"]),
  teamScore: z.int().min(0),
  oppScore: z.int().min(0),
  minutes: z.int().min(0).max(200),
  points: z.int().min(0),
  rebounds: z.int().min(0),
  assists: z.int().min(0),
  steals: z.int().min(0),
  blocks: z.int().min(0),
  turnovers: z.int().min(0),
  fgMade: z.int().min(0),
  fgAttempts: z.int().min(0),
  tpMade: z.int().min(0),
  tpAttempts: z.int().min(0),
  notes: z.string().max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser();
    const playerId = user?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = matchSchema.parse(body);
    const player = await requirePlayer(playerId);

    // Calculate XP
    const xpEarned = calcMatchXP({
      result: parsed.result,
      points: parsed.points,
      rebounds: parsed.rebounds,
      assists: parsed.assists,
      steals: parsed.steals,
      blocks: parsed.blocks,
      turnovers: parsed.turnovers,
    });

    // Calculate skill gains
    const skillGains = calcMatchSkillGains({
      fgAttempts: parsed.fgAttempts,
      fgMade: parsed.fgMade,
      assists: parsed.assists,
      points: parsed.points,
      steals: parsed.steals,
      blocks: parsed.blocks,
      turnovers: parsed.turnovers,
    });

    // Apply skill gains to DNA
    const newDNA = applySkillGains(player, skillGains);

    // Calculate new streak (convert Date to string for the function)
    const { streak } = calcNewStreak(
      player.lastActivityDate?.toDateString() ?? null,
      player.currentStreak
    );

    // Store match data in notes JSON since MatchLog model was removed
    const matchNotes = JSON.stringify({
      isMatch: true,
      opponent: parsed.opponent,
      result: parsed.result,
      teamScore: parsed.teamScore,
      oppScore: parsed.oppScore,
      minutes: parsed.minutes,
      points: parsed.points,
      rebounds: parsed.rebounds,
      assists: parsed.assists,
      steals: parsed.steals,
      blocks: parsed.blocks,
      turnovers: parsed.turnovers,
      fgMade: parsed.fgMade,
      fgAttempts: parsed.fgAttempts,
      tpMade: parsed.tpMade,
      tpAttempts: parsed.tpAttempts,
      userNotes: parsed.notes,
      xpEarned,
      skillGains,
    });

    // Create as WorkoutSession (MatchLog model removed)
    const matchSession = await db.workoutSession.create({
      data: {
        playerId: player.id,
        startedAt: new Date(parsed.date),
        totalDurationSec: parsed.minutes * 60,
        totalScore: parsed.points,
        totalReps: parsed.fgAttempts,
        totalDrills: 1,
        avgScore: parsed.fgAttempts > 0 ? Math.round((parsed.fgMade / parsed.fgAttempts) * 100) : 0,
        notes: matchNotes,
      },
    });

    // Update player DNA, streak, XP, and lastActivityDate
    await db.player.update({
      where: { id: player.id },
      data: {
        shooting: newDNA.shooting,
        handling: newDNA.handling,
        finishing: newDNA.finishing,
        defense: newDNA.defense,
        iq: newDNA.iq,
        currentStreak: streak,
        lastActivityDate: new Date(),
        xp: { increment: xpEarned },
      },
    });

    // Check achievements using WorkoutSession and Achievement models
    const allWorkouts = await db.workoutSession.count({ where: { playerId: player.id } });
    const allMatches = 0; // MatchLog model removed

    const existingAchievements = await db.achievement.findMany({
      where: { playerId: player.id },
      select: { type: true },
    });
    const unlockedIds = existingAchievements.map((a) => a.type);

    const totalXP = player.xp + xpEarned;

    const newAchievementIds = checkNewAchievements(
      allWorkouts,
      allMatches,
      streak,
      totalXP,
      unlockedIds
    );

    if (newAchievementIds.length > 0) {
      await db.achievement.createMany({
        data: newAchievementIds.map((id) => {
          const def = ACHIEVEMENTS.find((a) => a.id === id);
          return {
            playerId: player.id,
            type: id,
            title: def?.name.en ?? id,
            description: def?.description.en ?? "",
            icon: def?.emoji ?? "\uD83C\uDFC6",
          };
        }),
      });
    }

    return NextResponse.json(
      {
        session: {
          id: matchSession.id,
          playerId: matchSession.playerId,
          startedAt: matchSession.startedAt,
          totalDurationSec: matchSession.totalDurationSec,
          totalScore: matchSession.totalScore,
          avgScore: matchSession.avgScore,
          notes: matchSession.notes,
          createdAt: matchSession.createdAt,
        },
        newAchievements: newAchievementIds,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json(
        { error: "Validation failed", details: (err as { issues: unknown }).issues },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    trackError("[player/matches POST] error", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser();
    const playerId = user?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const player = await requirePlayer(playerId);
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

    const totalCount = await db.workoutSession.count({
      where: { playerId: player.id },
    });

    // MatchLog model removed — return all workout sessions
    // Clients can filter by checking notes for isMatch: true
    const sessions = await db.workoutSession.findMany({
      where: { playerId: player.id },
      orderBy: { startedAt: "desc" },
      take: Math.min(limit, 200),
    });

    return NextResponse.json({ totalCount, sessions });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    trackError("[player/matches GET] error", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}