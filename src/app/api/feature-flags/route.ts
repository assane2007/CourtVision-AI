import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard } from '@/lib/guards/admin.guard'
import {
  ALL_FLAGS,
  FEATURE_DEFAULTS,
  FEATURE_LABELS,
  type FeatureFlag,
} from '@/lib/feature-flags'
import { db } from '@/lib/db'

// ── Route context type expected by withAdminGuard ─────────────────────────

type RouteContext = { params: Promise<Record<string, string>> }

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/feature-flags — Admin-only: fetch all flags
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withAdminGuard(async (_req, _auth, _ctx: RouteContext) => {
  const dbRows = await db.featureFlag.findMany()

  const dbMap = new Map<string, boolean>()
  for (const row of dbRows) {
    dbMap.set(row.name, row.enabled)
  }

  const flags = ALL_FLAGS.map((name) => {
    const envKey = `NEXT_PUBLIC_FF_${name.toUpperCase()}`
    const envValue = process.env[envKey]
    const envOverride =
      envValue !== undefined && envValue !== ''
        ? envValue === 'true' || envValue === '1'
        : null

    const dbValue = dbMap.get(name) ?? null
    const effective = envOverride ?? (dbValue ?? FEATURE_DEFAULTS[name])

    return {
      name,
      label: FEATURE_LABELS[name],
      defaultValue: FEATURE_DEFAULTS[name],
      dbValue,
      envOverride,
      envKey: envOverride !== null ? envKey : undefined,
      enabled: effective,
    }
  })

  return NextResponse.json({ flags })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/feature-flags — Admin-only: update a flag
// ═══════════════════════════════════════════════════════════════════════════════

export const PATCH = withAdminGuard(
  async (req: NextRequest, _auth, _ctx: RouteContext) => {
    const body = await req.json()
    const { name, enabled } = body as {
      name?: string
      enabled?: boolean
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "name" field' },
        { status: 400 },
      )
    }

    if (!ALL_FLAGS.includes(name as FeatureFlag)) {
      return NextResponse.json(
        { error: `Unknown flag: "${name}"` },
        { status: 400 },
      )
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid "enabled" field (must be boolean)' },
        { status: 400 },
      )
    }

    const flagName = name as FeatureFlag

    // Check if an env override is active — warn but still persist
    const envKey = `NEXT_PUBLIC_FF_${flagName.toUpperCase()}`
    const envValue = process.env[envKey]
    const envOverride =
      envValue !== undefined && envValue !== ''
        ? envValue === 'true' || envValue === '1'
        : null

    const row = await db.featureFlag.upsert({
      where: { name: flagName },
      update: { enabled },
      create: { name: flagName, enabled },
    })

    // Invalidate the in-memory cache for this flag
    const { invalidateFlagCache } = await import('@/lib/feature-flags')
    invalidateFlagCache(flagName)

    return NextResponse.json({
      flag: {
        name: row.name,
        enabled: row.enabled,
        updatedAt: row.updatedAt,
      },
      warning:
        envOverride !== null
          ? `Environment variable ${envKey}=${envValue} is set and will override this database value.`
          : undefined,
    })
  },
)