/**
 * Request Tracer
 *
 * Middleware utility that:
 * - Generates a unique request ID (X-Request-ID header)
 * - Starts a timer
 * - Attaches trace info to the request via AsyncLocalStorage
 * - Logs completion with timing
 * - Creates Sentry span for the request
 *
 * Usage:
 *   import { traceRequest } from '@/lib/monitoring/request-tracer';
 *   export async function GET(req: NextRequest) {
 *     return traceRequest(req, async (traceInfo) => {
 *       // ... your handler
 *       return NextResponse.json({ ok: true })
 *     })
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
 import * as Sentry from'@sentry/nextjs';
import { requestContextStorage, logger } from './logger';
import { trackApiCall } from './performance';
import { recordSuccess, recordFailure } from './alerts';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TraceInfo {
  requestId: string
  traceId: string
  startTime: number
}

type TracedHandler<T> = (traceInfo: TraceInfo) => Promise<T>

// ─── Request ID Generation ──────────────────────────────────────────────────

function generateRequestId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `req-${ts}-${rand}`
}

// ─── Core Tracing Function ──────────────────────────────────────────────────

/**
 * Wrap a route handler with request tracing.
 *
 * Generates a request ID, starts a Sentry span, runs the handler
 * inside an AsyncLocalStorage context, and logs the result with timing.
 *
 * @param req - The incoming NextRequest
 * @param handler - The route handler, receives TraceInfo
 * @returns The handler's NextResponse with X-Request-ID header attached
 *
 * @example
 * export const GET = (req: NextRequest) =>
 *   traceRequest(req, async (trace) => {
 *     const data = await someService.getData()
 *     return NextResponse.json({ data })
 *   })
 */
export function traceRequest(
  req: NextRequest,
  handler: TracedHandler<NextResponse>,
): Promise<NextResponse> {
  const requestId = generateRequestId()
  const traceId = generateRequestId()
  const startTime = performance.now()
  const method = req.method
  const { pathname } = req.nextUrl

  // Check for existing request ID header
  const existingRequestId = req.headers.get('x-request-id')
  const effectiveRequestId = existingRequestId ?? requestId

  const traceInfo: TraceInfo = {
    requestId: effectiveRequestId,
    traceId,
    startTime,
  }

  // Run the handler inside the async local storage context
  const handlerPromise = requestContextStorage.run(
    { requestId: effectiveRequestId, traceId },
    async () => {
      try {
        // Use Sentry startSpan (v10 API) to trace the request
        const response = await Sentry.startSpan(
          {
            name: `${method} ${pathname}`,
            op: 'http.server',
            attributes: {
              'http.request.method': method,
              'url': pathname,
              'http.request_id': effectiveRequestId,
            },
          },
          async () => {
            return handler(traceInfo)
          },
        )

        const durationMs = Math.round(performance.now() - startTime)
        const statusCode = response.status

        // Track performance
        trackApiCall(pathname, method, durationMs, statusCode)

        // Record success/failure for alerting
        if (statusCode >= 500) {
          recordFailure()
        } else {
          recordSuccess()
        }

        // Attach request ID to response
        response.headers.set('X-Request-ID', effectiveRequestId)

        // Log the completed request
        const logData: Record<string, unknown> = {
          method,
          path: pathname,
          statusCode,
          durationMs,
        }
        if (statusCode >= 400) {
          logger.warn(`${method} ${pathname} → ${statusCode}`, 'request', logData)
        } else {
          logger.info(`${method} ${pathname} → ${statusCode}`, 'request', logData)
        }

        return response
      } catch (error) {
        const durationMs = Math.round(performance.now() - startTime)

        // Track as error
        trackApiCall(pathname, method, durationMs, 500)
        recordFailure()

        logger.error(`${method} ${pathname} → 500 (unhandled)`, 'request', {
          method,
          path: pathname,
          durationMs,
          error: error instanceof Error ? error.message : String(error),
        })

        // Send to Sentry
        try {
          Sentry.captureException(error)
        } catch {
          // Sentry not available
        }

        // Return a generic error response
        return NextResponse.json(
          { error: 'Erreur serveur interne' },
          { status: 500, headers: { 'X-Request-ID': effectiveRequestId } },
        )
      }
    },
  )

  return handlerPromise
}