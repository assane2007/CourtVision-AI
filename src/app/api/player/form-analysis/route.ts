import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/player/db-helpers";
import type { SkillKey } from "@/lib/player/iq-engine";
import { trackError } from "@/lib/monitoring";

const formAnalysisSchema = z.object({
  overallScore: z.int().min(0).max(100),
  rating: z.enum(["excellent", "good", "average", "needs_work"]),
  elbowScore: z.int().min(0).max(100),
  kneeScore: z.int().min(0).max(100),
  alignmentScore: z.int().min(0).max(100),
  balanceScore: z.int().min(0).max(100),
  trunkScore: z.int().min(0).max(100),
  feedback: z.string().max(2000),
  date: z.string().min(1),
});

/**
 * Map form breakdown scores to DNA skills.
 * Weak areas (score < 40) nudge the corresponding skill down by 1-2 points.
 */
function formToSkillNudges(data: {
  elbowScore: number;
  kneeScore: number;
  alignmentScore: number;
  balanceScore: number;
  trunkScore: number;
}): Partial<Record<SkillKey, number>> {
  const nudges: Partial<Record<SkillKey, number>> = {};
  const threshold = 40;
  const mappings: { score: number; skills: SkillKey[] }[] = [
    { score: data.elbowScore, skills: ["shooting"] },
    { score: data.kneeScore, skills: ["finishing"] },
    { score: data.alignmentScore, skills: ["defense"] },
    { score: data.balanceScore, skills: ["iq"] },
    { score: data.trunkScore, skills: ["handling"] },
  ];

  for (const { score, skills } of mappings) {
    if (score < threshold) {
      const nudge = score < 20 ? -2 : -1;
      for (const sk of skills) {
        nudges[sk] = (nudges[sk] ?? 0) + nudge;
      }
    }
  }
  return nudges;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const playerId = session?.user?.id;
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = formAnalysisSchema.parse(body);
    const player = await requirePlayer(playerId);

    const formAnalysis = await db.formAnalysis.create({
      data: {
        playerId: player.id,
        overallScore: parsed.overallScore,
        rating: parsed.rating === 'excellent' ? 4 : parsed.rating === 'good' ? 3 : parsed.rating === 'average' ? 2 : 1,
        elbowScore: parsed.elbowScore,
        kneeScore: parsed.kneeScore,
        alignmentScore: parsed.alignmentScore,
        balanceScore: parsed.balanceScore,
        trunkScore: parsed.trunkScore,
        feedback: parsed.feedback,
        categories: '{}',
        date: new Date(parsed.date),
      },
    });

    // If overall score suggests poor form, nudge relevant skills down
    if (parsed.overallScore < 50) {
      const nudges = formToSkillNudges({
        elbowScore: parsed.elbowScore,
        kneeScore: parsed.kneeScore,
        alignmentScore: parsed.alignmentScore,
        balanceScore: parsed.balanceScore,
        trunkScore: parsed.trunkScore,
      });

      const updateData: Partial<Record<SkillKey, number>> = {};
      const skillMap: Record<SkillKey, number> = {
        shooting: player.shooting as number,
        handling: player.handling as number,
        finishing: player.finishing as number,
        defense: player.defense as number,
        iq: player.iq as number,
      };
      for (const [sk, nudge] of Object.entries(nudges)) {
        const current = skillMap[sk as SkillKey];
        const clamped = Math.max(1, current + (nudge ?? 0));
        updateData[sk as SkillKey] = clamped;
      }

      if (Object.keys(updateData).length > 0) {
        await db.player.update({
          where: { id: player.id },
          data: updateData,
        });
      }
    }

    return NextResponse.json(
      {
        formAnalysis: {
          id: formAnalysis.id,
          playerId: formAnalysis.playerId,
          overallScore: formAnalysis.overallScore,
          rating: formAnalysis.rating,
          elbowScore: formAnalysis.elbowScore,
          kneeScore: formAnalysis.kneeScore,
          alignmentScore: formAnalysis.alignmentScore,
          balanceScore: formAnalysis.balanceScore,
          trunkScore: formAnalysis.trunkScore,
          feedback: formAnalysis.feedback,
          date: formAnalysis.date,
          createdAt: formAnalysis.createdAt,
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
    trackError("[player/form-analysis POST] error", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);

    const formAnalyses = await db.formAnalysis.findMany({
      where: { playerId: player.id },
      orderBy: { date: "desc" },
      take: Math.min(limit, 200),
    });

    return NextResponse.json({ formAnalyses });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NO_PLAYER") {
      return NextResponse.json({ error: "No player found" }, { status: 404 });
    }
    trackError("[player/form-analysis GET] error", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}