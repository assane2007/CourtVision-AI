/**
 * GET /api/v1/health
 *
 * Versioned health check endpoint.
 * Proxied via Next.js rewrite → /api/health (original logic).
 * This route file exists as a named anchor; the rewrite in next.config.ts
 * forwards /api/v1/:path* → /api/:path* so all existing routes
 * are automatically accessible under /api/v1/.
 */

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { runHealthChecks, type HealthCheckResult } from '@/lib/monitoring/health'
import { evaluateAlerts } from '@/lib/monitoring/alerts'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const detailed = searchParams.get('detailed') === 'true'

  const healthResult = await runHealthChecks()

  if (!detailed) {
    const isHealthy = healthResult.status !== 'unhealthy'
    return NextResponse.json(
      {
        status: isHealthy ? 'ok' : 'error',
        timestamp: healthResult.timestamp,
        uptime: healthResult.uptime,
        version: healthResult.version,
        db: healthResult.checks.database?.status === 'healthy' ? 'connected' : 'error',
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          'Cache-Control': 'no-store',
          'X-API-Version': 'v1',
          'X-API-Deprecated': 'false',
        },
      },
    )
  }

  const alerts = evaluateAlerts()

  const detailedResponse: HealthCheckResult & {
    alerts: ReturnType<typeof evaluateAlerts>
  } = {
    ...healthResult,
    alerts,
  }

  const httpStatus = healthResult.status === 'unhealthy' ? 503
    : healthResult.status === 'degraded' ? 200
    : 200

  return NextResponse.json(detailedResponse, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store',
      'X-API-Version': 'v1',
      'X-API-Deprecated': 'false',
    },
  })
}