import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/player/db-helpers";
import { trackError } from "@/lib/monitoring";

const onboardSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email().max(200),
  age: z.int().min(10).max(80),
  position: z.enum(["PG", "SG", "SF", "PF", "C"]),
  heightCm: z.int().min(100).max(250),
  weightKg: z.int().min(30).max(200),
  yearsExp: z.int().min(0).max(50),
  shooting: z.int().min(0).max(100),
  handling: z.int().min(0).max(100),
  finishing: z.int().min(0).max(100),
  defense: z.int().min(0).max(100),
  iq: z.int().min(0).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const playerId = session?.user?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = onboardSchema.parse(body);

    const player = await requirePlayer(playerId);

    // Update the existing player (created during signup) with onboarding data
    const updated = await db.player.update({
      where: { id: player.id },
      data: {
        name: parsed.name,
        email: parsed.email,
        age: parsed.age,
        position: parsed.position,
        heightCm: parsed.heightCm,
        weightKg: parsed.weightKg,
        yearsExp: parsed.yearsExp,
        shooting: parsed.shooting,
        handling: parsed.handling,
        finishing: parsed.finishing,
        defense: parsed.defense,
        iq: parsed.iq,
        isOnboarded: true,
      },
    });

    return NextResponse.json({ player: updated });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json({ error: "Validation failed", details: (err as { issues: unknown }).issues }, { status: 400 });
    }
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    trackError("[onboard] error", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}