import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signupSchema, getZodErrorMessage } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // Check content-length before parsing body
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > 1_000_000) {
      return NextResponse.json({ error: 'Requête trop volumineuse' }, { status: 413 })
    }

    const body = await req.json()

    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      )
    }

    const { email, password, name } = parsed.data

    const rateResult = rateLimit(email)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
        { status: 429 }
      )
    }

    // Check duplicate email after rate limiting and validation (prevents enumeration)
    const existing = await db.player.findUnique({ where: { email } })
    if (existing) {
      // Generic message to prevent email enumeration
      return NextResponse.json(
        { error: 'Impossible de créer le compte. Veuillez réessayer.' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const player = await db.$transaction(async (tx) => {
      const newPlayer = await tx.player.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      })

      // Auto-grant first_login achievement
      await tx.achievement.create({
        data: {
          playerId: newPlayer.id,
          type: 'first_login',
          title: 'Premier Pas',
          description: 'Vous avez créé votre compte',
          icon: '🏀',
        },
      })

      return newPlayer
    })

    return NextResponse.json({
      id: player.id,
      email: player.email,
      name: player.name,
      onboarding: player.onboarding,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/auth/signup]', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}