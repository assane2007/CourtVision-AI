import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'

export async function GET() {
  const transactionId = Math.random().toString(36).substring(2, 10)

  Sentry.withScope((scope) => {
    scope.setTag('test', 'manual-trigger')
    scope.setTag('transaction_id', transactionId)
    scope.setLevel('error')
    Sentry.captureMessage(
      `[Sentry Test] Manual error from dashboard check — id: ${transactionId}`,
      'error',
    )
  })

  return NextResponse.json({
    ok: true,
    message: 'Test error sent to Sentry',
    transactionId,
    hint: 'Check your Sentry dashboard for this event',
  })
}