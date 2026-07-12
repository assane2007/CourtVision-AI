/**
 * Admin-only guard.
 * Verifies the player has the 'admin' role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/middleware/error-handler';
import { AppError, ErrorCode } from '@/lib/middleware/error-handler';
import { requireAuth } from './auth.guard';
import type { AuthContext } from '@/lib/types/service.types';

type RouteContext = { params: Promise<Record<string, string>> }

type AdminHandler = (
  req: NextRequest,
  auth: AuthContext,
  context: RouteContext,
) => Promise<NextResponse>

/**
 * Wraps a route handler with admin authentication.
 * Requires the player to have role === 'admin'.
 *
 * @example
 * export const GET = withAdminGuard(async (req, auth) => {
 *   const allPlayers = await db.player.findMany()
 *   return NextResponse.json({ players: allPlayers })
 * })
 */
export function withAdminGuard(
  handler: AdminHandler,
): (req: NextRequest, context: RouteContext) => Promise<NextResponse> {
  return async (req, context) => {
    try {
      const auth = await requireAuth()

      if (auth.role !== 'admin') {
        throw new AppError(ErrorCode.ADMIN_ONLY, 'Accès non autorisé. Droits administrateur requis.')
      }

      return handler(req, auth, context)
    } catch (error) {
      return toErrorResponse(error, 'admin-guard')
    }
  }
}

/**
 * Check if a player is an admin. Use in services that need admin checks.
 */
export async function requireAdmin(auth: AuthContext): Promise<void> {
  if (auth.role !== 'admin') {
    throw new AppError(ErrorCode.ADMIN_ONLY, 'Accès non autorisé. Droits administrateur requis.')
  }
}