import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/player/db-helpers";
import { trackError } from "@/lib/monitoring";

const chatSchema = z.object({
  role: z.enum(["user", "coach"]),
  content: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const playerId = (session?.user as { id?: string })?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = chatSchema.parse(body);
    const player = await requirePlayer(playerId);

    const message = await db.chatMessage.create({
      data: {
        playerId: player.id,
        role: parsed.role,
        content: parsed.content,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        playerId: message.playerId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        createdAt: message.createdAt,
      },
    }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json({ error: "Validation failed", details: (err as { issues: unknown }).issues }, { status: 400 });
    }
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    trackError("[player/chat POST] error", err instanceof Error ? err.message : err);
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

    const messages = await db.chatMessage.findMany({
      where: { playerId: player.id },
      orderBy: { timestamp: "asc" },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        createdAt: m.createdAt,
      })),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    trackError("[player/chat GET] error", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}