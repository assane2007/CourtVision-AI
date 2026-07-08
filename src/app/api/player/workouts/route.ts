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
  calcTotalXP,
} from "@/lib/player/xp-engine";
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
    const playerId = (session?.user as { id?: string })?.id;
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

    // Calculate new streak
    const { streak, todayStr } = calcNewStreak(player.lastActivityDate, player.currentStreak);

    // Create workout log
    const workout = await db.workoutLog.create({
      data: {
        playerId: player.id,
        planId: parsed.planId ?? null,
        planType: parsed.planType,
        planTitle: parsed.planTitle,
        date: parsed.date,
        durationMin: parsed.durationMin,
        drillData: JSON.stringify(parsed.drillData),
        xpEarned,
        intensity: parsed.intensity,
        skillGains: JSON.stringify(skillGains),
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
      workout: {
        id: workout.id,
        playerId: workout.playerId,
        planId: workout.planId,
        planType: workout.planType,
        planTitle: workout.planTitle,
        date: workout.date,
        durationMin: workout.durationMin,
        drillData: JSON.parse(workout.drillData),
        xpEarned: workout.xpEarned,
        intensity: workout.intensity,
        skillGains: JSON.parse(workout.skillGains),
        createdAt: workout.createdAt,
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
    trackError("[player/workouts POST] error", err instanceof Error ? err.message : err);
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

    const totalCount = await db.workoutLog.count({
      where: { playerId: player.id },
    });

    const workouts = await db.workoutLog.findMany({
      where: { playerId: player.id },
      orderBy: { date: "desc" },
      take: Math.min(limit, 200),
    });

    return NextResponse.json({
      totalCount,
      workouts: workouts.map((w) => ({
        id: w.id,
        playerId: w.playerId,
        planId: w.planId,
        planType: w.planType,
        planTitle: w.planTitle,
        date: w.date,
        durationMin: w.durationMin,
        drillData: JSON.parse(w.drillData),
        xpEarned: w.xpEarned,
        intensity: w.intensity,
        skillGains: JSON.parse(w.skillGains),
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