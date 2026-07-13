import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { runHealthChecks, type HealthCheckResult } from '@/lib/monitoring/health';
import { evaluateAlerts } from '@/lib/monitoring/alerts';

// GET /api/health — Unauthenticated health check endpoint
// Supports ?detailed=true for full diagnostics including alerts
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const detailed = searchParams.get('detailed') === 'true'

  const healthResult = await runHealthChecks()

  // Build the response based on detail level
  if (!detailed) {
    // Simple response for load balancers / uptime checks
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
        },
      },
    )
  }

  // Detailed response includes all checks and alerts
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
    },
  })
}