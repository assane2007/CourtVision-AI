/**
 * GET  /api/admin/feature-flags  — Read current feature flags (DB-backed)
 * POST /api/admin/feature-flags  — Write feature flag overrides (DB-backed)
 *
 * This is the legacy admin route. The canonical admin route is now at
 * /api/feature-flags (GET + PATCH). This file is kept for backward
 * compatibility and delegates to the new DB-backed system.
 */

import { NextResponse } from 'next/server'
import { withAdminGuard } from '@/lib/guards/admin.guard'
import {
  ALL_FLAGS,
  FEATURE_DEFAULTS,
  FEATURE_LABELS,
  type FeatureFlag,
} from '@/lib/feature-flags'
import { db } from '@/lib/db'

// ── GET: Return all feature flags with current state ────────────────────────────

export const GET = withAdminGuard(async () => {
  try {
    const dbRows = await db.featureFlag.findMany()
    const dbMap = new Map<string, boolean>()
    for (const row of dbRows) {
      dbMap.set(row.name, row.enabled)
    }

    const flags = ALL_FLAGS.map((name) => {
      const dbValue = dbMap.get(name) ?? null
      const envKey = `NEXT_PUBLIC_FF_${name.toUpperCase()}`
      const envValue = process.env[envKey]
      const envOverride =
        envValue !== undefined && envValue !== ''
          ? envValue === 'true' || envValue === '1'
          : null
      const currentValue =
        envOverride ?? (dbValue ?? FEATURE_DEFAULTS[name])

      return {
        key: name,
        label: FEATURE_LABELS[name],
        defaultValue: FEATURE_DEFAULTS[name],
        currentValue,
        isOverridden: dbValue !== null || envOverride !== null,
      }
    })

    return NextResponse.json({ flags })
  } catch (error) {
    console.error('[admin/feature-flags] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

// ── POST: Set a feature flag override ───────────────────────────────────────────

export const POST = withAdminGuard(async (req) => {
  try {
    const body = await req.json()
    const { flag, enabled } = body as { flag: FeatureFlag; enabled: boolean }

    if (!flag || !ALL_FLAGS.includes(flag)) {
      return NextResponse.json({ error: 'Invalid feature flag' }, { status: 400 })
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }

    await db.featureFlag.upsert({
      where: { name: flag },
      update: { enabled },
      create: { name: flag, enabled },
    })

    // Invalidate in-memory cache
    const { invalidateFlagCache } = await import('@/lib/feature-flags')
    invalidateFlagCache(flag)

    const isOverridden = enabled !== FEATURE_DEFAULTS[flag]

    return NextResponse.json({
      key: flag,
      defaultValue: FEATURE_DEFAULTS[flag],
      currentValue: enabled,
      isOverridden,
    })
  } catch (error) {
    console.error('[admin/feature-flags] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})