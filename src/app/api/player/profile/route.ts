import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlayer, requirePlayer } from "@/lib/player/db-helpers";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const playerId = (session?.user as { id?: string })?.id;

    // Special: return null player if no session (so frontend shows auth screen)
    if (!playerId) {
      return NextResponse.json({ player: null });
    }

    const player = await getPlayer(playerId);
    if (!player) {
      return NextResponse.json({ player: null });
    }

    return NextResponse.json({
      player: {
        id: player.id,
        name: player.name,
        email: player.email,
        age: player.age,
        position: player.position,
        heightCm: player.heightCm,
        weightKg: player.weightKg,
        yearsExp: player.yearsExp,
        isOnboarded: player.isOnboarded,
        shooting: player.shooting,
        handling: player.handling,
        finishing: player.finishing,
        defense: player.defense,
        iq: player.iq,
        lastActivityDate: player.lastActivityDate,
        currentStreak: player.currentStreak,
        activePlanJson: player.activePlanJson,
        createdAt: player.createdAt,
        updatedAt: player.updatedAt,
      },
    });
  } catch (err: unknown) {
    console.error("[player/profile GET] error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const playerId = (session?.user as { id?: string })?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const player = await requirePlayer(playerId);

    // Build update data from allowed fields
    const allowedFields = [
      "name", "email", "age", "position", "heightCm", "weightKg", "yearsExp",
      "shooting", "handling", "finishing", "defense", "iq", "isOnboarded",
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await db.player.update({
      where: { id: player.id },
      data: updateData,
    });

    return NextResponse.json({
      player: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        age: updated.age,
        position: updated.position,
        heightCm: updated.heightCm,
        weightKg: updated.weightKg,
        yearsExp: updated.yearsExp,
        isOnboarded: updated.isOnboarded,
        shooting: updated.shooting,
        handling: updated.handling,
        finishing: updated.finishing,
        defense: updated.defense,
        iq: updated.iq,
        lastActivityDate: updated.lastActivityDate,
        currentStreak: updated.currentStreak,
        activePlanJson: updated.activePlanJson,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    console.error("[player/profile PATCH] error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}