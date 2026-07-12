import { NextResponse } from 'next/server'
import { PUBLIC_FLAGS, getFeatureFlags } from '@/lib/feature-flags'

/**
 * GET /api/feature-flags/public
 * Unauthenticated. Returns only the flags safe for public client consumption.
 * Used by the `useFeatureFlag` hook to get DB-backed values.
 *
 * Query params:
 *   - ?flags=flag1,flag2  (optional, returns all public flags if omitted)
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const flagsParam = url.searchParams.get('flags')

  const requestedFlags = flagsParam
    ? (flagsParam.split(',').filter((f) => PUBLIC_FLAGS.includes(f as never)) as typeof PUBLIC_FLAGS)
    : PUBLIC_FLAGS

  const resolved = await getFeatureFlags(requestedFlags)

  // Return only the flags the client asked for (or all public)
  const flags: Record<string, boolean> = {}
  for (const flag of requestedFlags) {
    flags[flag] = resolved[flag]
  }

  // Set cache headers — short cache since we have server cache
  return NextResponse.json(
    { flags },
    {
      headers: {
        'Cache-Control': 'public, max-age=120, stale-while-revalidate=60',
      },
    },
  )
}