/**
 * Ownership guard — verifies the authenticated player owns a requested resource.
 *
 * Usage in routes:
 *   export const DELETE = requireOwnership('session', async (req, auth) => { ... })
 *
 * Usage in services:
 *   await verifyOwnership(auth.playerId, 'video', videoId)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toErrorResponse, AppError, ErrorCode } from '@/lib/middleware/error-handler'
import { requireAuth } from './auth.guard'
import type { AuthContext, ResourceType } from '@/lib/types/service.types'
import { logger } from '@/lib/logger'

// ── Resource → Model Mapping ───────────────────────────────────────────────────

interface ResourceConfig {
  /** Prisma model name (singular, PascalCase) */
  model: string
  /** The field on the model that references the player */
  playerField: string
  /** The primary key field (defaults to 'id') */
  idField: string
}

const RESOURCE_CONFIGS: Record<ResourceType, ResourceConfig> = {
  session: { model: 'workoutSession', playerField: 'playerId', idField: 'id' },
  video: { model: 'video', playerField: 'playerId', idField: 'id' },
  plan: { model: 'trainingPlan', playerField: 'playerId', idField: 'id' },
  team: { model: 'team', playerField: 'creatorId', idField: 'id' },
  post: { model: 'post', playerField: 'authorId', idField: 'id' },
  challenge: { model: 'challenge', playerField: 'creatorId', idField: 'id' },
  message: { model: 'message', playerField: 'senderId', idField: 'id' },
}

// ── Core Verification ──────────────────────────────────────────────────────────

/**
 * Verify that the given player owns the specified resource.
 * Throws NOT_FOUND if resource doesn't exist, FORBIDDEN if not owned.
 *
 * @example
 * // In a service:
 * await verifyOwnership(playerId, 'video', 'video123')
 */
export async function verifyOwnership(
  playerId: string,
  resourceType: ResourceType,
  resourceId: string,
): Promise<void> {
  const config = RESOURCE_CONFIGS[resourceType]
  if (!config) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Type de ressource inconnu: ${resourceType}`,
    )
  }

  // Use dynamic model access via Record key
  const modelDelegate = (db as Record<string, { findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null> }>)[config.model]
  if (!modelDelegate) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, `Type de ressource inconnu: ${resourceType}`)
  }
  const resource = await modelDelegate.findUnique({
    where: { [config.idField]: resourceId },
    select: { [config.playerField]: true },
  })

  if (!resource) {
    throw new AppError(ErrorCode.NOT_FOUND, `${resourceType} introuvable`)
  }

  if (resource[config.playerField] !== playerId) {
    logger.warn('Ownership check failed', 'ownership-guard', {
      playerId,
      resourceType,
      resourceId,
      ownerPlayerId: resource[config.playerField],
    })
    throw new AppError(ErrorCode.FORBIDDEN, 'Vous n\'êtes pas autorisé à modifier cette ressource')
  }
}

/**
 * Get the owner ID of a resource (or null if not found).
 * Does not throw — returns null for missing resources.
 */
export async function getResourceOwnerId(
  resourceType: ResourceType,
  resourceId: string,
): Promise<string | null> {
  const config = RESOURCE_CONFIGS[resourceType]
  if (!config) return null

  try {
    const modelDelegate = (db as Record<string, { findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null> }>)[config.model]
    if (!modelDelegate) return null
    const resource = await modelDelegate.findUnique({
      where: { [config.idField]: resourceId },
      select: { [config.playerField]: true },
    })
    return resource?.[config.playerField] ?? null
  } catch {
    return null
  }
}

// ── Route Wrapper ───────────────────────────────────────────────────────────────

type OwnershipHandler = (
  req: NextRequest,
  auth: AuthContext,
  resourceId: string,
) => Promise<NextResponse>

/**
 * Maps resource types to the URL param names used in their API routes,
 * and to route path patterns for ID extraction from the URL pathname.
 */
const RESOURCE_PARAM_MAP: Record<ResourceType, string[]> = {
  session: ['id', 'sessionId'],
  video: ['id', 'videoId'],
  plan: ['id', 'planId'],
  team: ['id', 'teamId'],
  post: ['id', 'postId'],
  challenge: ['id', 'challengeId'],
  message: ['id', 'messageId'],
}

/** Route patterns: maps resource type to the API route prefix used for path extraction */
const RESOURCE_ROUTE_PREFIXES: Record<ResourceType, string[]> = {
  session: ['/api/sessions/'],
  video: ['/api/videos/'],
  plan: ['/api/plans/'],
  team: ['/api/teams/'],
  post: ['/api/posts/', '/api/feed/'],
  challenge: ['/api/challenges/'],
  message: ['/api/messages/'],
}

/**
 * Wraps a route handler with ownership verification.
 * Expects the resource ID to be available in the URL or request context.
 *
 * @example
 * // Dynamic route /api/videos/[id]
 * export const DELETE = requireOwnership('video', async (req, auth, resourceId) => {
 *   // At this point, auth.playerId owns the video
 *   await db.video.delete({ where: { id: resourceId } })
 *   return NextResponse.json({ success: true })
 * })
 */
export function requireOwnership(
  resourceType: ResourceType,
  handler: OwnershipHandler,
): (req: NextRequest, context?: { params: Promise<{ id: string }> }) => Promise<NextResponse> {
  return async (req, context) => {
    try {
      const auth = await requireAuth()

      let resourceId: string | undefined

      // 1. Try to extract from dynamic route params (context.params.id)
      if (context && 'params' in context) {
        const params = await (context as { params: Promise<Record<string, string>> }).params
        // Check for the resource-specific param names first, then generic 'id'
        const paramNames = RESOURCE_PARAM_MAP[resourceType]
        for (const paramName of paramNames) {
          if (params[paramName]) {
            resourceId = params[paramName]
            break
          }
        }
      }

      // 2. Try to extract from URL search params (query string)
      if (!resourceId) {
        const url = new URL(req.url)
        const paramNames = RESOURCE_PARAM_MAP[resourceType]
        for (const paramName of paramNames) {
          const value = url.searchParams.get(paramName)
          if (value) {
            resourceId = value
            break
          }
        }
      }

      // 3. Try to extract from the URL pathname using route-specific patterns
      if (!resourceId) {
        const url = new URL(req.url)
        const prefixes = RESOURCE_ROUTE_PREFIXES[resourceType]
        for (const prefix of prefixes) {
          const idx = url.pathname.indexOf(prefix)
          if (idx !== -1) {
            const after = url.pathname.slice(idx + prefix.length)
            // The ID is the next path segment (up to the next '/' or end of string)
            const match = after.match(/^([^/]+)/)
            if (match) {
              resourceId = match[1]
              break
            }
          }
        }
      }

      if (!resourceId) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'ID de ressource manquant')
      }

      await verifyOwnership(auth.playerId, resourceType, resourceId)

      return handler(req, auth, resourceId)
    } catch (error) {
      return toErrorResponse(error, 'ownership-guard')
    }
  }
}