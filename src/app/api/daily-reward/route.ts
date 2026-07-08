import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { claimDailyLoginReward } from '@/lib/daily-reward'
import { trackError } from '@/lib/monitoring'

export const POST = withAuth(async (_req, session) => {
  try {
    const result = await claimDailyLoginReward(session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    trackError('POST /api/daily-reward', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})