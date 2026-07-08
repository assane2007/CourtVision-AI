import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { claimDailyLoginReward } from '@/lib/daily-reward'
import { trackError } from '@/lib/monitoring'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const result = await claimDailyLoginReward(session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    trackError('POST /api/daily-reward', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}