import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/player/db-helpers";
import {
  calcMatchXP,
  calcMatchSkillGains,
  calcNewStreak,
  applySkillGains,
  checkNewAchievements,
  calcTotalXP,
} from "@/lib/player/xp-engine";

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
    const session = await getServerSession(authOptions);
    const playerId = (session?.user as { id?: string })?.id;
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

    // Calculate new streak
    const { streak, todayStr } = calcNewStreak(player.lastActivityDate, player.currentStreak);

    // Create match log
    const match = await db.matchLog.create({
      data: {
        playerId: player.id,
        date: parsed.date,
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
        notes: parsed.notes,
        xpEarned,
      },
    });

    // Update player DNA, streak, and lastActivityDate
    await db.player.update({
      where: { id: player.id },
      data: {
        shooting: newDNA.shooting,
        handling: newDNA.handling,
        finishing: newDNA.finishing,
        defense: newDNA.defense,
        iq: newDNA.iq,
        currentStreak: streak,
        lastActivityDate: todayStr,
      },
    });

    // Check achievements
    const allWorkouts = await db.workoutLog.count({ where: { playerId: player.id } });
    const allMatches = await db.matchLog.count({ where: { playerId: player.id } });
    const allAchievements = await db.playerAchievement.findMany({
      where: { playerId: player.id },
      select: { achievementId: true },
    });
    const unlockedIds = allAchievements.map((a) => a.achievementId);

    const workoutsXP = await db.workoutLog.aggregate({
      where: { playerId: player.id },
      _sum: { xpEarned: true },
    });
    const matchesXP = await db.matchLog.aggregate({
      where: { playerId: player.id },
      _sum: { xpEarned: true },
    });

    const totalXP = calcTotalXP(
      workoutsXP._sum.xpEarned ?? 0,
      matchesXP._sum.xpEarned ?? 0,
      unlockedIds.length
    );

    const newAchivementIds = checkNewAchievements(
      allWorkouts,
      allMatches,
      streak,
      totalXP,
      unlockedIds
    );

    if (newAchivementIds.length > 0) {
      await db.playerAchievement.createMany({
        data: newAchivementIds.map((achievementId) => ({
          playerId: player.id,
          achievementId,
        })),
      });
    }

    return NextResponse.json({
      match: {
        id: match.id,
        playerId: match.playerId,
        date: match.date,
        opponent: match.opponent,
        result: match.result,
        teamScore: match.teamScore,
        oppScore: match.oppScore,
        minutes: match.minutes,
        points: match.points,
        rebounds: match.rebounds,
        assists: match.assists,
        steals: match.steals,
        blocks: match.blocks,
        turnovers: match.turnovers,
        fgMade: match.fgMade,
        fgAttempts: match.fgAttempts,
        tpMade: match.tpMade,
        tpAttempts: match.tpAttempts,
        notes: match.notes,
        xpEarned: match.xpEarned,
        createdAt: match.createdAt,
      },
      newAchievements: newAchivementIds,
    }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json({ error: "Validation failed", details: (err as { issues: unknown }).issues }, { status: 400 });
    }
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    console.error("[player/matches POST] error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const playerId = (session?.user as { id?: string })?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const player = await requirePlayer(playerId);
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

    const totalCount = await db.matchLog.count({
      where: { playerId: player.id },
    });

    const matches = await db.matchLog.findMany({
      where: { playerId: player.id },
      orderBy: { date: "desc" },
      take: Math.min(limit, 200),
    });

    return NextResponse.json({ totalCount, matches });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    console.error("[player/matches GET] error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}