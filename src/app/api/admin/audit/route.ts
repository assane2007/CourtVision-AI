/**
 * GET /api/admin/audit
 *
 * Admin-only endpoint returning paginated audit logs.
 * Query params:
 *   - action: filter by action type (e.g. "login")
 *   - limit:  number of records per page (default 50, max 100)
 *   - cursor: pagination cursor (ID of the last record)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard } from '@/lib/guards/admin.guard'
import { db } from '@/lib/db'

export const GET = withAdminGuard(async (req) => {
  const { searchParams } = req.nextUrl

  const action = searchParams.get('action') || undefined
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 100)
  const cursor = searchParams.get('cursor') || undefined

  const where = action ? { action } : {}

  const logs = await db.auditLog.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { timestamp: 'desc' },
    include: {
      player: {
        select: { id: true, email: true, name: true },
      },
    },
  })

  const hasMore = logs.length > limit
  const data = hasMore ? logs.slice(0, limit) : logs
  const nextCursor = hasMore ? data[data.length - 1].id : null

  return NextResponse.json({
    data,
    pagination: {
      nextCursor,
      hasMore,
      limit,
    },
  })
})