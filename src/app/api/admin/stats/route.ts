/**
 * GET /api/admin/stats
 *
 * Admin-only endpoint returning dashboard statistics:
 * - Overview cards (total users, active today, MRR, AI calls, videos, workouts, AI analyses)
 * - User signups over 30 days (line chart data)
 * - Video uploads per day (bar chart data)
 * - AI usage by type (pie chart data)
 * - Subscription distribution (pie chart data)
 * - Recent signups table
 * - System health metrics
 */

import { NextResponse } from 'next/server';
import { withAdminGuard } from '@/lib/guards/admin.guard';
import { db } from '@/lib/db';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AdminStats {
  overview: {
    totalUsers: number
    activeToday: number
    mrr: number
    aiCallsToday: number
    totalVideos: number
    totalWorkouts: number
    totalAIAnalyses: number
    activeSubscriptions: number
  }
  signups30d: { date: string; count: number }[]
  videoUploads30d: { date: string; count: number }[]
  aiUsageByType: { type: string; calls: number }[]
  subscriptionDist: { plan: string; count: number }[]
  recentSignups: { id: string; email: string; name: string; date: string; plan: string }[]
  systemHealth: {
    dbConnections: number
    queueDepth: number
    errorRate: number
    cacheHitRate: number
    rateLimitTotal: number
    rateLimitBlocked: number
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

// ── Route handler ──────────────────────────────────────────────────────────────

export const GET = withAdminGuard(async () => {
  try {
    const today = todayStart()
    const thirtyDaysAgo = daysAgo(29)

    // ── Parallel queries ──────────────────────────────────────────────────
    const [
      totalUsers,
      activeToday,
      activeSubscriptions,
      totalVideos,
      totalWorkouts,
      totalFormAnalyses,
      totalPredictions,
      totalInsights,
      subscriptionGroups,
      recentSignups,
      signupsByDay,
      videosByDay,
    ] = await Promise.all([
      // Total users
      db.player.count({ where: { accountDeleted: false } }),

      // Active today (players with a DailyLogin today)
      db.dailyLogin.count({
        where: { date: { gte: today } },
      }),

      // Active subscriptions
      db.player.count({
        where: {
          accountDeleted: false,
          subscriptionStatus: { in: ['pro', 'elite'] },
          subscriptionExpiresAt: { gt: new Date() },
        },
      }),

      // Total videos
      db.video.count(),

      // Total workout sessions
      db.workoutSession.count(),

      // AI analyses counts
      db.formAnalysis.count(),
      db.prediction.count(),
      db.playerInsight.count(),

      // Subscription distribution
      db.player.groupBy({
        by: ['subscriptionStatus'],
        where: { accountDeleted: false },
        _count: { subscriptionStatus: true },
      }),

      // Recent 10 signups
      db.player.findMany({
        where: { accountDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          subscriptionStatus: true,
        },
      }),

      // Signups per day (last 30 days)
      db.player.groupBy({
        by: ['createdAt'],
        where: {
          accountDeleted: false,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { id: true },
      }),

      // Videos per day (last 30 days)
      db.video.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }),
    ])

    // ── Process signups chart data ────────────────────────────────────────
    const signupMap = new Map<string, number>()
    for (const s of signupsByDay) {
      const day = s.createdAt.toISOString().slice(0, 10)
      signupMap.set(day, (signupMap.get(day) || 0) + s._count.id)
    }
    const signups30d: { date: string; count: number }[] = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      signups30d.push({ date: key, count: signupMap.get(key) || 0 })
    }

    // ── Process video uploads chart data ──────────────────────────────────
    const videoMap = new Map<string, number>()
    for (const v of videosByDay) {
      const day = v.createdAt.toISOString().slice(0, 10)
      videoMap.set(day, (videoMap.get(day) || 0) + v._count.id)
    }
    const videoUploads30d: { date: string; count: number }[] = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      videoUploads30d.push({ date: key, count: videoMap.get(key) || 0 })
    }

    // ── AI usage by type (aggregate from AI tables) ──────────────────────
    const aiUsageByType = [
      { type: 'form_analysis', calls: totalFormAnalyses },
      { type: 'predictions', calls: totalPredictions },
      { type: 'insights', calls: totalInsights },
    ]

    // ── Subscription distribution ─────────────────────────────────────────
    const subscriptionDist = subscriptionGroups.map((g) => ({
      plan: g.subscriptionStatus,
      count: g._count.subscriptionStatus,
    }))

    // ── Recent signups ────────────────────────────────────────────────────
    const recentSignupsFormatted = recentSignups.map((p) => ({
      id: p.id,
      email: p.email,
      name: p.name,
      date: p.createdAt.toISOString(),
      plan: p.subscriptionStatus,
    }))

    // ── MRR estimate (pro: €15/mo, elite: €30/mo) ────────────────────────
    const mrr = subscriptionGroups.reduce((sum, g) => {
      if (g.subscriptionStatus === 'pro') return sum + g._count.subscriptionStatus * 15
      if (g.subscriptionStatus === 'elite') return sum + g._count.subscriptionStatus * 30
      return sum
    }, 0)

    // ── System health (best-effort from DB) ───────────────────────────────
    const systemHealth = {
      dbConnections: 1,
      queueDepth: 0,
      errorRate: 0,
      cacheHitRate: 0,
      rateLimitTotal: 0,
      rateLimitBlocked: 0,
    }

    // Try to get recent audit log counts for error rate
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const [totalAudit, errorAudit] = await Promise.all([
        db.auditLog.count({ where: { timestamp: { gte: twentyFourHoursAgo } } }),
        db.auditLog.count({
          where: { timestamp: { gte: twentyFourHoursAgo }, action: { startsWith: 'error' } },
        }),
      ])
      systemHealth.errorRate = totalAudit > 0 ? Math.round((errorAudit / totalAudit) * 10000) / 100 : 0
      systemHealth.rateLimitTotal = totalAudit
    } catch {
      // Non-critical
    }

    const stats: AdminStats = {
      overview: {
        totalUsers,
        activeToday,
        mrr,
        aiCallsToday: totalFormAnalyses + totalPredictions + totalInsights,
        totalVideos,
        totalWorkouts,
        totalAIAnalyses: totalFormAnalyses + totalPredictions + totalInsights,
        activeSubscriptions,
      },
      signups30d,
      videoUploads30d,
      aiUsageByType,
      subscriptionDist,
      recentSignups: recentSignupsFormatted,
      systemHealth,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('[admin/stats] DB error, falling back to mock data:', error)
    return NextResponse.json({ ...generateMockStats(), isMock: true })
  }
})

// ── Mock fallback ──────────────────────────────────────────────────────────────

function generateMockStats(): AdminStats {
  const now = new Date()
  const signups30d = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (29 - i))
    return { date: d.toISOString().slice(0, 10), count: Math.floor(Math.random() * 20) + 2 }
  })
  const videoUploads30d = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (29 - i))
    return { date: d.toISOString().slice(0, 10), count: Math.floor(Math.random() * 8) + 1 }
  })
  const recentSignups = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(now)
    d.setHours(d.getHours() - i * 3)
    return {
      id: `mock-${i}`,
      email: `player${i + 1}@example.com`,
      name: `Player ${i + 1}`,
      date: d.toISOString(),
      plan: Math.random() > 0.8 ? 'pro' : 'free',
    }
  })
  return {
    overview: {
      totalUsers: Math.floor(Math.random() * 500) + 400,
      activeToday: Math.floor(Math.random() * 80) + 30,
      mrr: Math.floor(Math.random() * 2000) + 500,
      aiCallsToday: Math.floor(Math.random() * 1000) + 300,
      totalVideos: Math.floor(Math.random() * 200) + 50,
      totalWorkouts: Math.floor(Math.random() * 1000) + 200,
      totalAIAnalyses: Math.floor(Math.random() * 500) + 100,
      activeSubscriptions: Math.floor(Math.random() * 100) + 50,
    },
    signups30d,
    videoUploads30d,
    aiUsageByType: [
      { type: 'form_analysis', calls: Math.floor(Math.random() * 500) + 200 },
      { type: 'predictions', calls: Math.floor(Math.random() * 150) + 50 },
      { type: 'insights', calls: Math.floor(Math.random() * 300) + 100 },
    ],
    subscriptionDist: [
      { plan: 'free', count: Math.floor(Math.random() * 200) + 300 },
      { plan: 'pro', count: Math.floor(Math.random() * 100) + 50 },
    ],
    recentSignups,
    systemHealth: {
      dbConnections: Math.floor(Math.random() * 10) + 3,
      queueDepth: Math.floor(Math.random() * 5),
      errorRate: Math.round(Math.random() * 200) / 1000,
      cacheHitRate: Math.round(Math.random() * 30 + 70),
      rateLimitTotal: Math.floor(Math.random() * 5000) + 1000,
      rateLimitBlocked: Math.floor(Math.random() * 50),
    },
  }
}