import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/health — Unauthenticated health check endpoint
export async function GET() {
  let dbStatus: 'connected' | 'error' = 'connected'

  try {
    // Simple Prisma query to verify DB connection
    await db.player.count({ take: 1 })
  } catch {
    dbStatus = 'error'
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    db: dbStatus,
  })
}