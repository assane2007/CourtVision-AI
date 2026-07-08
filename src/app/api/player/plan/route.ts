import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/player/db-helpers";
import { trackError } from "@/lib/monitoring";

const planSchema = z.object({
  plan: z.record(z.unknown()),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const playerId = (session?.user as { id?: string })?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { plan } = planSchema.parse(body);
    const player = await requirePlayer(playerId);

    await db.player.update({
      where: { id: player.id },
      data: {
        activePlanJson: JSON.stringify(plan),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    trackError("[player/plan POST] error", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const playerId = (session?.user as { id?: string })?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const player = await requirePlayer(playerId);

    if (!player.activePlanJson) {
      return NextResponse.json({ plan: null });
    }

    return NextResponse.json({ plan: JSON.parse(player.activePlanJson) });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    trackError("[player/plan GET] error", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}