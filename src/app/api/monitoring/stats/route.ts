/**
 * GET /api/monitoring/stats
 *
 * Admin-only endpoint returning:
 * - Request counts by endpoint
 * - Average response times
 * - Error rates
 * - Active users (approximate from performance data)
 * - System resources
 *
 * Supports ?period=1h|24h|7d
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard } from '@/lib/guards/admin.guard'
import { getPerformanceStats } from '@/lib/monitoring/performance'
import { evaluateAlerts } from '@/lib/monitoring/alerts'
import { getMetrics } from '@/lib/monitoring'

type Period = '1h' | '24h' | '7d'

const VALID_PERIODS = new Set<Period>(['1h', '24h', '7d'])

export const GET = withAdminGuard(async (req: NextRequest) => {
  try {
    const { searchParams } = req.nextUrl
    const periodParam = searchParams.get('period') ?? '1h'
    const period: Period = VALID_PERIODS.has(periodParam as Period)
      ? (periodParam as Period)
      : '1h'

    // Gather all stats
    const perfStats = getPerformanceStats(period)
    const alerts = evaluateAlerts()
    const monitoringMetrics = getMetrics()

    // System resources
    const mem = process.memoryUsage()
    const systemResources = {
      memory: {
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        rssMb: Math.round(mem.rss / 1024 / 1024),
        usagePercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
      },
      cpu: {
        // Node.js doesn't expose CPU usage directly without a baseline.
        // We provide uptime as a proxy.
        uptimeSeconds: Math.round(process.uptime()),
      },
      eventLoop: {
        // Number of queued microtasks is not directly accessible,
        // but we can provide the libuv metrics if available
        note: 'Detailed CPU/event-loop metrics require process monitoring (e.g., prom-client)',
      },
    }

    return NextResponse.json({
      period,
      timestamp: new Date().toISOString(),
      performance: perfStats,
      alerts: alerts.length > 0 ? alerts : undefined,
      system: systemResources,
      monitoring: {
        totalErrors: monitoringMetrics.totalErrors,
        lastErrorTime: monitoringMetrics.lastErrorTime,
        recentErrors: monitoringMetrics.recentErrors,
        recentEvents: monitoringMetrics.recentEvents,
      },
    })
  } catch (error) {
    console.error('[monitoring/stats] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})