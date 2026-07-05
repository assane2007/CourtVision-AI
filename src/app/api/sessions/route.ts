import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const { drillScores, totalReps, totalDurationMs, notes } = body

    const workoutSession = await db.workoutSession.create({
      data: {
        playerId: session.user.id,
        totalScore: drillScores?.reduce((sum: number, d: { score: number }) => sum + d.score, 0) || 0,
        totalReps: totalReps || 0,
        totalDrills: drillScores?.length || 0,
        notes,
        drills: drillScores ? {
          create: drillScores.map((d: { drillId: string; reps: number; score: number; durationMs: number; formFeedback: string }) => ({
            drillId: d.drillId,
            reps: d.reps,
            score: d.score,
            durationMs: d.durationMs,
            formFeedback: d.formFeedback || '{}',
          }))
        } : undefined,
      },
      include: { drills: true }
    })

    return NextResponse.json(workoutSession, { status: 201 })
  } catch (error) {
    console.error('Session save error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const sessions = await db.workoutSession.findMany({
      where: { playerId: session.user.id },
      include: {
        drills: { include: { drill: true } }
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Sessions fetch error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}