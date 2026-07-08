import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import bcrypt from 'bcryptjs'

// DELETE /api/account — Soft delete (set accountDeleted=true, anonymize data)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = session.user.id

    // Rate limit: 1 per hour
    const rl = rateLimit(`account-delete:${playerId}`, 1, 60 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans une heure.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { password, hardDelete } = body

    // Verify password
    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { id: true, password: true, name: true, email: true, accountDeleted: true, deletedAt: true },
    })

    if (!player) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
    }

    const isPasswordValid = await bcrypt.compare(password || '', player.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 400 })
    }

    // Hard delete: permanently remove all data
    if (hardDelete) {
      await db.$transaction(async (tx) => {
        await tx.xpLog.deleteMany({ where: { playerId } })
        await tx.aIChatMessage.deleteMany({ where: { playerId } })
        await tx.reactionScore.deleteMany({ where: { playerId } })
        await tx.achievement.deleteMany({ where: { playerId } })
        const workoutSessions = await tx.workoutSession.findMany({ where: { playerId }, select: { id: true } })
        if (workoutSessions.length > 0) {
          await tx.workoutSessionDrill.deleteMany({ where: { sessionId: { in: workoutSessions.map(s => s.id) } } })
        }
        await tx.workoutSession.deleteMany({ where: { playerId } })
        await tx.drillFavorite.deleteMany({ where: { playerId } })
        const trainingPlans = await tx.trainingPlan.findMany({ where: { playerId }, select: { id: true } })
        if (trainingPlans.length > 0) {
          await tx.trainingPlanDrill.deleteMany({ where: { planId: { in: trainingPlans.map(p => p.id) } } })
        }
        await tx.trainingPlan.deleteMany({ where: { playerId } })
        await tx.drill.deleteMany({ where: { playerId, isCustom: true } })
        await tx.device.deleteMany({ where: { playerId } })
        await tx.emailVerificationToken.deleteMany({ where: { playerId } })
        await tx.twoFactorBackupCode.deleteMany({ where: { playerId } })
        await tx.offlineAction.deleteMany({ where: { playerId } })
        await tx.player.delete({ where: { id: playerId } })
      })
      return NextResponse.json({ message: 'Compte et toutes les données supprimés définitivement.' })
    }

    // Soft delete: anonymize and mark as deleted
    const anonymousEmail = `deleted-${playerId.slice(0, 8)}@anonymized.courtvision.ai`
    const anonymizedName = `Utilisateur supprimé`

    await db.player.update({
      where: { id: playerId },
      data: {
        accountDeleted: true,
        deletedAt: new Date(),
        name: anonymizedName,
        email: anonymousEmail,
        bio: '',
        avatar: null,
        coverPhoto: null,
        city: null,
        country: '',
        profilePublic: false,
        showOnLeaderboard: false,
        showActivity: false,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    })

    return NextResponse.json({
      message: 'Compte désactivé. Il sera définitivement supprimé dans 30 jours.',
      deletedAt: new Date().toISOString(),
      gracePeriodDays: 30,
    })
  } catch (error) {
    trackError('[DELETE /api/account]', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// PATCH /api/account — Reactivate a soft-deleted account
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = session.user.id
    const body = await request.json()
    const { action } = body

    if (action !== 'reactivate') {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { id: true, accountDeleted: true, deletedAt: true, email: true },
    })

    if (!player) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
    }

    if (!player.accountDeleted) {
      return NextResponse.json({ message: 'Le compte est déjà actif.' })
    }

    // Check if within 30-day grace period
    if (player.deletedAt) {
      const daysSinceDeletion = (Date.now() - player.deletedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDeletion > 30) {
        return NextResponse.json(
          { error: 'La période de grâce de 30 jours est expirée. Contactez le support.' },
          { status: 400 },
        )
      }
    }

    // Restore the account — we can't recover the original email/name after anonymization,
    // so keep the current anonymized data. In production, store original data in a separate field.
    await db.player.update({
      where: { id: playerId },
      data: {
        accountDeleted: false,
        deletedAt: null,
      },
    })

    return NextResponse.json({ message: 'Compte réactivé avec succès.' })
  } catch (error) {
    trackError('[PATCH /api/account]', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}