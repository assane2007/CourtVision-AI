import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password, name } = parsed.data

    const existing = await db.player.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const player = await db.player.create({
      data: {
        email,
        password: hashedPassword,
        name,
      }
    })

    return NextResponse.json({
      id: player.id,
      email: player.email,
      name: player.name,
      onboarding: player.onboarding,
    }, { status: 201 })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}