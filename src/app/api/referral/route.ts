import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { awardXp } from '@/lib/award-xp'

function generateReferralCode(name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8)
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${clean}${random}`
}

export const GET = withAuth(async (req, session) => {
  const rl = rateLimit(session.user.id, 20, 60_000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  const player = await db.player.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true, id: true },
  })

  if (!player) {
    return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
  }

  // Count how many players were referred by this player
  const referredCount = await db.player.count({
    where: { referredBy: player.referralCode },
  })

  return NextResponse.json({
    referralCode: player.referralCode,
    referredCount,
    referralLink: player.referralCode
      ? `https://courtvision.ai/ref/${player.referralCode}`
      : null,
  })
})

export const POST = withAuth(async (req, session) => {
  const rl = rateLimit(session.user.id, 10, 60_000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  const player = await db.player.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true, name: true, referredBy: true, id: true },
  })

  if (!player) {
    return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
  }

  // Generate a referral code if the player doesn't have one
  if (!player.referralCode) {
    const code = generateReferralCode(player.name)
    await db.player.update({
      where: { id: player.id },
      data: { referralCode: code },
    })
    return NextResponse.json({
      referralCode: code,
      referralLink: `https://courtvision.ai/ref/${code}`,
      referredCount: 0,
    })
  }

  // Optionally handle a referral claim (referredBy)
  const body = await req.json().catch(() => null)
  if (body?.referralCode && !player.referredBy) {
    // Validate the referral code exists
    const referrer = await db.player.findFirst({
      where: { referralCode: body.referralCode },
    })
    if (referrer && referrer.id !== player.id) {
      await db.player.update({
        where: { id: player.id },
        data: { referredBy: body.referralCode },
      })

      // Award bonus XP to both referrer and referred
      await awardXp(referrer.id, [{ amount: 50, source: 'bonus', description: 'Récompense parrainage' }])
      await awardXp(session.user.id, [{ amount: 25, source: 'bonus', description: 'Bonus inscription via parrainage' }])

      return NextResponse.json({
        referralCode: player.referralCode,
        referralLink: `https://courtvision.ai/ref/${player.referralCode}`,
        referredCount: await db.player.count({
          where: { referredBy: player.referralCode },
        }),
        claimed: true,
      })
    }
  }

  const referredCount = await db.player.count({
    where: { referredBy: player.referralCode },
  })

  return NextResponse.json({
    referralCode: player.referralCode,
    referralLink: `https://courtvision.ai/ref/${player.referralCode}`,
    referredCount,
  })
})