import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/player/db-helpers";
import {
  calcWorkoutXP,
  calcWorkoutSkillGains,
  calcNewStreak,
  applySkillGains,
  checkNewAchievements,
} from "@/lib/player/xp-engine";
import { ACHIEVEMENTS } from "@/lib/player/iq-engine";
import type { PlanType } from "@/lib/player/iq-engine";
import { trackError } from "@/lib/monitoring";

const workoutSchema = z.object({
  planId: z.string().optional(),
  planType: z.enum(["shooting", "handling", "finishing", "footwork", "defense", "conditioning"]),
  planTitle: z.string().min(1).max(200),
  date: z.string().min(1),
  durationMin: z.int().min(1).max(600),
  drillData: z.array(
    z.object({
      drillId: z.string(),
      completed: z.boolean(),
      sets: z.array(z.object({ reps: z.int().min(0), made: z.int().optional() })),
      notes: z.string().optional(),
    })
  ),
  intensity: z.int().min(1).max(3),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const playerId = session?.user?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = workoutSchema.parse(body);
    const player = await requirePlayer(playerId);

    // Determine base XP from active plan
    let baseXP = 50;
    if (player.activePlanJson) {
      try {
        const plan = JSON.parse(player.activePlanJson);
        if (plan.xpReward) baseXP = plan.xpReward;
      } catch {
        // ignore parse errors, use default
      }
    }

    // Calculate XP
    const drillCompletions = parsed.drillData.map((d) => ({ completed: d.completed }));
    const xpEarned = calcWorkoutXP(baseXP, parsed.intensity as 1 | 2 | 3, drillCompletions);

    // Calculate skill gains
    const skillGains = calcWorkoutSkillGains(
      parsed.planType as PlanType,
      parsed.intensity as 1 | 2 | 3,
      drillCompletions
    );

    // Apply skill gains to DNA
    const newDNA = applySkillGains(player, skillGains);

    // Calculate new streak (convert Date to string for the function)
    const { streak } = calcNewStreak(
      player.lastActivityDate?.toDateString() ?? null,
      player.currentStreak
    );

    // Compute drill summary stats for WorkoutSession
    const totalReps = parsed.drillData.reduce(
      (sum, d) => sum + d.sets.reduce((s, set) => s + set.reps, 0),
      0
    );
    const madeShots = parsed.drillData.reduce(
      (sum, d) => sum + d.sets.reduce((s, set) => s + (set.made ?? 0), 0),
      0
    );
    const avgScore = totalReps > 0 ? Math.round((madeShots / totalReps) * 100) : 0;

    // Store legacy fields in notes for backward compatibility
    const sessionNotes = JSON.stringify({
      planType: parsed.planType,
      planTitle: parsed.planTitle,
      planId: parsed.planId ?? null,
      intensity: parsed.intensity,
      skillGains,
      drillData: parsed.drillData,
      xpEarned,
    });

    // Create WorkoutSession
    const workoutSession = await db.workoutSession.create({
      data: {
        playerId: player.id,
        startedAt: new Date(parsed.date),
        endedAt: new Date(new Date(parsed.date).getTime() + parsed.durationMin * 60000),
        totalDurationSec: parsed.durationMin * 60,
        totalScore: madeShots,
        totalReps,
        totalDrills: parsed.drillData.length,
        avgScore,
        notes: sessionNotes,
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
    const [allWorkouts, existingAchievements] = await Promise.all([
      db.workoutSession.count({ where: { playerId: player.id } }),
      db.achievement.findMany({
        where: { playerId: player.id },
        select: { type: true },
      }),
    ]);
    const unlockedIds = existingAchievements.map((a) => a.type);

    const totalXP = player.xp + xpEarned;

    // MatchLog model removed — pass 0 for match count
    const allMatches = 0;

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
          id: workoutSession.id,
          playerId: workoutSession.playerId,
          startedAt: workoutSession.startedAt,
          endedAt: workoutSession.endedAt,
          totalDurationSec: workoutSession.totalDurationSec,
          totalScore: workoutSession.totalScore,
          totalReps: workoutSession.totalReps,
          totalDrills: workoutSession.totalDrills,
          avgScore: workoutSession.avgScore,
          notes: workoutSession.notes,
          createdAt: workoutSession.createdAt,
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
    trackError("[player/workouts POST] error", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const playerId = session?.user?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const player = await requirePlayer(playerId);
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

    const [totalCount, workouts] = await Promise.all([
      db.workoutSession.count({
        where: { playerId: player.id },
      }),
      db.workoutSession.findMany({
        where: { playerId: player.id },
        orderBy: { startedAt: "desc" },
        take: Math.min(limit, 200),
      }),
    ]);

    return NextResponse.json({
      totalCount,
      sessions: workouts.map((w) => ({
        id: w.id,
        playerId: w.playerId,
        startedAt: w.startedAt,
        endedAt: w.endedAt,
        totalDurationSec: w.totalDurationSec,
        totalScore: w.totalScore,
        totalReps: w.totalReps,
        totalDrills: w.totalDrills,
        avgScore: w.avgScore,
        notes: w.notes,
        createdAt: w.createdAt,
      })),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    trackError("[player/workouts GET] error", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}