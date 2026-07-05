import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { createPlanSchema, getZodErrorMessage } from '@/lib/validations'

// GET /api/plans — List user's training plans
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const plans = await db.trainingPlan.findMany({
      where: { playerId: session.user.id },
      include: {
        drills: {
          include: {
            drill: { select: { id: true, nameFr: true, icon: true, category: true, difficulty: true, durationSec: true } },
          },
          orderBy: { order: 'asc' },
        },
        _count: { select: { drills: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('[GET /api/plans]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/plans — Create a training plan
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createPlanSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      )
    }

    const { name, description, isPublic, drillIds } = parsed.data

    // Verify all drill IDs exist and are accessible
    let validDrillIds: string[] = []
    if (drillIds && drillIds.length > 0) {
      const drills = await db.drill.findMany({
        where: {
          id: { in: drillIds },
          isActive: true,
          OR: [
            { playerId: null },
            { playerId: session.user.id },
          ],
        },
        select: { id: true },
      })
      validDrillIds = drills.map(d => d.id)
    }

    const plan = await db.trainingPlan.create({
      data: {
        playerId: session.user.id,
        name,
        description,
        isPublic: isPublic ?? false,
        drills: {
          create: validDrillIds.map((drillId, index) => ({
            drillId,
            order: index,
          })),
        },
      },
      include: {
        drills: {
          include: {
            drill: { select: { id: true, nameFr: true, icon: true, category: true } },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/plans]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}