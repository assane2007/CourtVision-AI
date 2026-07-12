/**
 * Permission system for CourtVision.
 *
 * Provides resource-based access control with permission levels.
 * Supports owner-based permissions (owner can do everything, others
 * can only read if the resource is public).
 */

// ── Enums ────────────────────────────────────────────────────────────────────

export const Permission = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ADMIN: 'admin',
} as const
export type Permission = typeof Permission[keyof typeof Permission]

export const ResourceType = {
  PLAYER_PROFILE: 'player_profile',
  WORKOUT: 'workout',
  VIDEO: 'video',
  TEAM: 'team',
  CHALLENGE: 'challenge',
  FEED_POST: 'feed_post',
  COMMENT: 'comment',
  MESSAGE: 'message',
  DRILL: 'drill',
  TRAINING_PLAN: 'training_plan',
  ACHIEVEMENT: 'achievement',
  LEADERBOARD: 'leaderboard',
  SCOUTING_REPORT: 'scouting_report',
} as const
export type ResourceType = typeof ResourceType[keyof typeof ResourceType]

// ── Types ────────────────────────────────────────────────────────────────────

export interface ResourceContext {
  /** The player who owns the resource */
  ownerId: string
  /** Whether the resource is publicly visible */
  isPublic?: boolean
}

export interface PlayerContext {
  id: string
  role: string
}

// ── Permission Matrix ────────────────────────────────────────────────────────

/**
 * Default permission rules for each resource type.
 * - owner: permissions the owner always has
 * - public: permissions anyone (including unauthenticated) has on public resources
 * - authenticated: permissions any authenticated user has on public resources
 */
const PERMISSION_RULES: Record<ResourceType, {
  owner: Permission[]
  public: Permission[]
  authenticated: Permission[]
}> = {
  [ResourceType.PLAYER_PROFILE]: {
    owner: [Permission.READ, Permission.UPDATE, Permission.DELETE, Permission.ADMIN],
    public: [Permission.READ],
    authenticated: [Permission.READ],
  },
  [ResourceType.WORKOUT]: {
    owner: [Permission.READ, Permission.UPDATE, Permission.DELETE, Permission.ADMIN],
    public: [Permission.READ],
    authenticated: [Permission.READ],
  },
  [ResourceType.VIDEO]: {
    owner: [Permission.READ, Permission.UPDATE, Permission.DELETE, Permission.ADMIN],
    public: [Permission.READ],
    authenticated: [Permission.READ],
  },
  [ResourceType.TEAM]: {
    owner: [Permission.READ, Permission.UPDATE, Permission.DELETE, Permission.ADMIN],
    public: [Permission.READ],
    authenticated: [Permission.READ],
  },
  [ResourceType.CHALLENGE]: {
    owner: [Permission.READ, Permission.UPDATE, Permission.DELETE, Permission.ADMIN],
    public: [Permission.READ],
    authenticated: [Permission.READ, Permission.CREATE],
  },
  [ResourceType.FEED_POST]: {
    owner: [Permission.READ, Permission.UPDATE, Permission.DELETE],
    public: [Permission.READ],
    authenticated: [Permission.READ, Permission.CREATE],
  },
  [ResourceType.COMMENT]: {
    owner: [Permission.READ, Permission.UPDATE, Permission.DELETE],
    public: [Permission.READ],
    authenticated: [Permission.READ, Permission.CREATE],
  },
  [ResourceType.MESSAGE]: {
    owner: [Permission.READ, Permission.UPDATE, Permission.DELETE],
    public: [],
    authenticated: [Permission.READ, Permission.CREATE],
  },
  [ResourceType.DRILL]: {
    owner: [Permission.READ, Permission.UPDATE, Permission.DELETE, Permission.ADMIN],
    public: [Permission.READ],
    authenticated: [Permission.READ, Permission.CREATE],
  },
  [ResourceType.TRAINING_PLAN]: {
    owner: [Permission.READ, Permission.UPDATE, Permission.DELETE, Permission.ADMIN],
    public: [Permission.READ],
    authenticated: [Permission.READ],
  },
  [ResourceType.ACHIEVEMENT]: {
    owner: [Permission.READ, Permission.UPDATE],
    public: [Permission.READ],
    authenticated: [Permission.READ],
  },
  [ResourceType.LEADERBOARD]: {
    owner: [Permission.READ, Permission.UPDATE, Permission.ADMIN],
    public: [Permission.READ],
    authenticated: [Permission.READ],
  },
  [ResourceType.SCOUTING_REPORT]: {
    owner: [Permission.READ, Permission.UPDATE, Permission.DELETE, Permission.ADMIN],
    public: [],
    authenticated: [Permission.READ],
  },
}

// ── Permission Check ─────────────────────────────────────────────────────────

/**
 * Check if a player has the required permission on a resource.
 *
 * @param player - The player requesting access (null = unauthenticated)
 * @param resource - The resource type
 * @param permission - The required permission level
 * @param context - Resource context (owner, public status)
 * @returns true if access is allowed
 *
 * @example
 * ```ts
 * // Can the current user edit this video?
 * const canEdit = checkPermission(
 *   { id: session.user.id, role: 'user' },
 *   ResourceType.VIDEO,
 *   Permission.UPDATE,
 *   { ownerId: video.playerId, isPublic: true }
 * )
 * ```
 */
export function checkPermission(
  player: PlayerContext | null,
  resource: ResourceType,
  permission: Permission,
  context: ResourceContext,
): boolean {
  // Admin users have full access to everything
  if (player?.role === 'admin') {
    return true
  }

  // Owner can do anything on their own resources
  if (player && player.id === context.ownerId) {
    const rules = PERMISSION_RULES[resource]
    return rules.owner.includes(permission)
  }

  // Non-owner access
  const rules = PERMISSION_RULES[resource]

  // Unauthenticated users can only access public resources
  if (!player) {
    if (!context.isPublic) return false
    return rules.public.includes(permission)
  }

  // Authenticated non-owner users
  if (context.isPublic) {
    return rules.authenticated.includes(permission)
  }

  // Private resource, non-owner → no access
  return false
}

/**
 * Require a permission — throws or returns an error response if not allowed.
 * Useful in route handlers.
 *
 * @example
 * ```ts
 * const permissionError = requirePermission(session, ResourceType.VIDEO, Permission.UPDATE, {
 *   ownerId: video.playerId,
 * })
 * if (permissionError) return permissionError
 * ```
 */
export function requirePermission(
  player: PlayerContext | null,
  resource: ResourceType,
  permission: Permission,
  context: ResourceContext,
): { error: string; status: number } | null {
  if (checkPermission(player, resource, permission, context)) {
    return null
  }

  if (!player) {
    return { error: 'Authentication required', status: 401 }
  }

  if (player.role !== 'admin' && player.id !== context.ownerId) {
    // Check if it's a visibility issue or permission issue
    if (!context.isPublic) {
      return { error: 'Resource not found', status: 404 } // Don't reveal private resources exist
    }
    return { error: 'Insufficient permissions', status: 403 }
  }

  return { error: 'Insufficient permissions', status: 403 }
}