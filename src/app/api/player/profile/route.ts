import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlayer, requirePlayer } from "@/lib/player/db-helpers";
import { trackError } from "@/lib/monitoring";
import { profilePatchSchema, getZodErrorMessage } from "@/lib/validations";
import { invalidateAuthCache } from "@/lib/guards/auth.guard";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser();
    const playerId = user?.id;

    // Require authentication — return 401 if no session
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    trackError("[player/profile GET] error", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser();
    const playerId = user?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate with Zod — email is intentionally NOT allowed here
    const parsed = profilePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 },
      );
    }

    const player = await requirePlayer(playerId);

    const updateData = { ...parsed.data };

    const updated = await db.player.update({
      where: { id: player.id },
      data: updateData,
    });

    // Invalidate auth cache so name/role changes take effect immediately
    invalidateAuthCache(player.id);

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
    trackError("[player/profile PATCH] error", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}