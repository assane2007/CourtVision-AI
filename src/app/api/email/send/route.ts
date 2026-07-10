import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { trackError } from '@/lib/monitoring'
import { sendEmail, getEmailTemplate } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db'

const ALLOWED_TEMPLATES = ['reset_password', 'email_verification', 'invitation', 'weekly_report', 'achievement_unlocked']
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/email/send
// Generic email send endpoint (admin/internal use)
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser()
    if (_error || !user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    // Admin-only check
    const player = await db.player.findUnique({ where: { id: user.id }, select: { role: true } })
    if (!player || player.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { to, template, params = {} } = body

    if (!to || !template) {
      return NextResponse.json({ error: 'Destinataire et template requis' }, { status: 400 })
    }

    // Template whitelist
    if (!ALLOWED_TEMPLATES.includes(template)) {
      return NextResponse.json({ error: 'Template non autorisé' }, { status: 400 })
    }

    // Email format validation
    if (!emailRegex.test(to)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    // Rate limit email sending
    const rl = rateLimit(`email:${user.id}`, 10, 60 * 60 * 1000)
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