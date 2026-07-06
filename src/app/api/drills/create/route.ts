import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { createDrillSchema, getZodErrorMessage } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'

// POST /api/drills/create — Create a custom drill owned by the current user
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const rateResult = rateLimit(`drills:create:${session.user.email}`, 20, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
        { status: 429 }
      )
    }

    // Check content-length before parsing body
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > 1_000_000) {
      return NextResponse.json({ error: 'Requête trop volumineuse' }, { status: 413 })
    }

    const body = await req.json()
    const parsed = createDrillSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      )
    }

    const { name, nameFr, category, difficulty, description, descriptionFr, instructions, instructionsFr, durationSec, targetReps, icon } = parsed.data

    const drill = await db.drill.create({
      data: {
        playerId: session.user.id,
        name: name || nameFr,
        nameFr,
        category,
        difficulty,
        description: description || descriptionFr || '',
        descriptionFr: descriptionFr || description || '',
        instructions: instructions || instructionsFr || '',
        instructionsFr: instructionsFr || instructions || '',
        durationSec: durationSec ?? 30,
        targetReps: targetReps ?? 10,
        icon: icon || '🏀',
        isActive: true,
        isCustom: true,
      },
    })

    return NextResponse.json({ drill }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/drills/create]', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}