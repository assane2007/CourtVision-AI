import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { trackError } from '@/lib/monitoring'
import { signupSchema, getZodErrorMessage } from '@/lib/validations'

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

    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // Create user via Supabase Admin API
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true, // Auto-confirm email for direct signup
    })

    if (error) {
      // Handle duplicate email
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Impossible de créer le compte. Veuillez réessayer.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: error.message || 'Erreur lors de la création du compte' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name || name,
    }, { status: 201 })
  } catch (error) {
    trackError('POST /api/auth/signup', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}