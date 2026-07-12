/**
 * Inngest API route — serves as the webhook endpoint for the Inngest
 * service to communicate with this application.
 *
 * When `INNGEST_EVENT_KEY` is not configured the route returns a 503
 * response so Inngest won't attempt to deliver events to an unconfigured
 * instance.
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import {
  formAnalysis,
  videoProcessing,
  notificationSend,
  exportGeneration,
  insightRefresh,
  playerWelcome,
} from '@/lib/inngest/functions';
import {
  weeklyPlayerReport,
  staleSessionCleanup,
} from '@/lib/inngest/functions/recurring';

const isConfigured = Boolean(process.env.INNGEST_EVENT_KEY)

const handler = isConfigured
  ? serve({
      client: inngest,
      signingKey: process.env.INNGEST_SIGNING_KEY,
      functions: [
        formAnalysis,
        videoProcessing,
        notificationSend,
        exportGeneration,
        insightRefresh,
        playerWelcome,
        weeklyPlayerReport,
        staleSessionCleanup,
      ],
    })
  : null

function notConfiguredResponse() {
  return new Response(
    JSON.stringify({
      error: 'Inngest is not configured. Set INNGEST_EVENT_KEY in your environment.',
    }),
    { status: 503, headers: { 'Content-Type': 'application/json' } },
  )
}

export async function GET(request: Request) {
  if (!handler) return notConfiguredResponse()
  return handler.GET(request)
}

export async function POST(request: Request) {
  if (!handler) return notConfiguredResponse()
  return handler.POST(request)
}

export async function PUT(request: Request) {
  if (!handler) return notConfiguredResponse()
  return handler.PUT(request)
}