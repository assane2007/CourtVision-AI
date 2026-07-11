/**
 * GET /api/admin/stats
 *
 * Admin-only endpoint returning dashboard statistics:
 * - Overview cards (total users, active today, MRR, AI calls)
 * - User signups over 30 days (line chart data)
 * - AI usage by type (bar chart data)
 * - Subscription distribution (pie chart data)
 * - Recent signups table
 * - System health metrics
 */

import { NextResponse } from 'next/server'
import { withAdminGuard } from '@/lib/guards/admin.guard'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AdminStats {
  overview: {
    totalUsers: number
    activeToday: number
    mrr: number
    aiCallsToday: number
  }
  signups30d: { date: string; count: number }[]
  aiUsageByType: { type: string; calls: number }[]
  subscriptionDist: { plan: string; count: number }[]
  recentSignups: { email: string; date: string; plan: string }[]
  systemHealth: {
    dbConnections: number
    queueDepth: number
    errorRate: number
  }
}

// ── Mock data generators ───────────────────────────────────────────────────────

function generateMockStats(): AdminStats {
  const now = new Date()

  // Generate 30 days of signup data
  const signups30d = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (29 - i))
    return {
      date: d.toISOString().slice(0, 10),
      count: Math.floor(Math.random() * 20) + 2,
    }
  })

  // AI usage by type
  const aiUsageByType = [
    { type: 'coach', calls: Math.floor(Math.random() * 500) + 200 },
    { type: 'scouting', calls: Math.floor(Math.random() * 300) + 100 },
    { type: 'reaction', calls: Math.floor(Math.random() * 800) + 400 },
    { type: 'predictions', calls: Math.floor(Math.random() * 150) + 50 },
    { type: 'workout_gen', calls: Math.floor(Math.random() * 100) + 30 },
  ]

  // Subscription distribution
  const subscriptionDist = [
    { plan: 'free', count: Math.floor(Math.random() * 200) + 300 },
    { plan: 'pro', count: Math.floor(Math.random() * 100) + 50 },
  ]

  // Recent signups
  const recentSignups = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(now)
    d.setHours(d.getHours() - i * 3)
    return {
      email: `player${i + 1}@example.com`,
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
    },
    signups30d,
    aiUsageByType,
    subscriptionDist,
    recentSignups,
    systemHealth: {
      dbConnections: Math.floor(Math.random() * 10) + 3,
      queueDepth: Math.floor(Math.random() * 5),
      errorRate: Math.round(Math.random() * 200) / 1000, // 0% – 0.2%
    },
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export const GET = withAdminGuard(async () => {
  const stats = generateMockStats()
  return NextResponse.json(stats)
})