import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { sendEmail, getEmailTemplate } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

// POST /api/email/send
// Generic email send endpoint (admin/internal use)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const body = await request.json()
    const { to, template, params = {} } = body

    if (!to || !template) {
      return NextResponse.json({ error: 'Destinataire et template requis' }, { status: 400 })
    }

    // Rate limit email sending
    const rl = rateLimit(`email:${session.user.id}`, 10, 60 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop d\'emails envoyés. Réessayez plus tard.' }, { status: 429 })
    }

    const emailContent = getEmailTemplate(template, params)
    const result = await sendEmail({
      to,
      ...emailContent,
      template,
    })

    return NextResponse.json({ message: 'Email envoyé', messageId: result.messageId })
  } catch (error) {
    trackError('POST /api/email/send', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}