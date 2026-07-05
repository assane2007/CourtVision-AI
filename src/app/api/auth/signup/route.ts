import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signupSchema, getZodErrorMessage } from '@/lib/validations'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Check duplicate email first (before full validation)
    const rawEmail = body?.email
    if (rawEmail && typeof rawEmail === 'string') {
      const existing = await db.player.findUnique({ where: { email: rawEmail } })
      if (existing) {
        return NextResponse.json(
          { error: 'Un compte avec cet email existe déjà' },
          { status: 409 }
        )
      }
    }

    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      )
    }

    const { email, password, name } = parsed.data

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