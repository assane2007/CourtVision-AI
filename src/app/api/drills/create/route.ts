import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/drills/create — Create a custom drill
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { name, nameFr, category, difficulty, description, descriptionFr, instructions, instructionsFr, durationSec, targetReps, icon } = body

    if (!nameFr || !category || !difficulty) {
      return NextResponse.json({ error: 'Champs requis manquants (nom, catégorie, difficulté)' }, { status: 400 })
    }

    const validCategories = ['pocket_ball', 'shifty', 'ball_handling', 'speed_change', 'defense', 'shooting', 'footwork', 'finishing', 'conditioning']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 })
    }

    const validDifficulties = ['beginner', 'intermediate', 'advanced']
    if (!validDifficulties.includes(difficulty)) {
      return NextResponse.json({ error: 'Difficulté invalide' }, { status: 400 })
    }

    const drill = await db.drill.create({
      data: {
        name: name || nameFr,
        nameFr,
        category,
        difficulty,
        description: description || descriptionFr || '',
        descriptionFr: descriptionFr || description || '',
        instructions: instructions || instructionsFr || '',
        instructionsFr: instructionsFr || instructions || '',
        durationSec: Math.max(10, Math.min(300, durationSec || 30)),
        targetReps: Math.max(1, Math.min(100, targetReps || 10)),
        icon: icon || '🏀',
        isActive: true,
        isCustom: true,
      },
    })

    return NextResponse.json({ drill })
  } catch (error) {
    console.error('Failed to create drill:', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}