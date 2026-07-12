import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createDrillSchema, getZodErrorMessage } from '@/lib/validations';
import { rateLimit } from '@/lib/rate-limit';
import { cacheInvalidatePattern } from '@/lib/cache';
import { trackError } from '@/lib/monitoring';

// POST /api/drills/create — Create a custom drill owned by the current user
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser()
    if (_error || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const rateResult = rateLimit(`drills:create:${user.email}`, 20, 15 * 60 * 1000)
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
        playerId: user.id,
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

    // Invalidate drills cache
    cacheInvalidatePattern('drills:')

    return NextResponse.json({ drill }, { status: 201 })
  } catch (error) {
    trackError('POST /api/drills/create', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}