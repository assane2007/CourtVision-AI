import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/player/db-helpers";
import { trackError } from "@/lib/monitoring";

const videoAnalysisSchema = z.object({
  phase: z.string().max(50),
  overallScore: z.int().min(0).max(100),
  phaseBreakdown: z.string(),
  aiSummary: z.string().max(5000),
  insights: z.string().max(3000),
  recommendations: z.string().max(3000),
  date: z.string().min(1),
  durationSec: z.int().min(0),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const playerId = (session?.user as { id?: string })?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = videoAnalysisSchema.parse(body);
    const player = await requirePlayer(playerId);

    const videoAnalysis = await db.formAnalysis.create({
      data: {
        playerId: player.id,
        overallScore: parsed.overallScore,
        rating: 0,
        feedback: JSON.stringify({
          phase: parsed.phase,
          phaseBreakdown: parsed.phaseBreakdown,
          aiSummary: parsed.aiSummary,
          insights: parsed.insights,
          recommendations: parsed.recommendations,
          durationSec: parsed.durationSec,
        }),
        date: parsed.date,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    return NextResponse.json(
      {
        videoAnalysis: {
          id: videoAnalysis.id,
          playerId: videoAnalysis.playerId,
          phase: parsed.phase,
          overallScore: videoAnalysis.overallScore,
          phaseBreakdown: parsed.phaseBreakdown,
          aiSummary: parsed.aiSummary,
          insights: parsed.insights,
          recommendations: parsed.recommendations,
          date: videoAnalysis.date,
          durationSec: parsed.durationSec,
          createdAt: videoAnalysis.createdAt,
        },
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
    trackError("[player/video-analysis POST] error", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);

    const videoAnalyses = await db.formAnalysis.findMany({
      where: { playerId: player.id },
      orderBy: { date: "desc" },
      take: Math.min(limit, 200),
    });

    return NextResponse.json({ videoAnalyses });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    trackError("[player/video-analysis GET] error", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}