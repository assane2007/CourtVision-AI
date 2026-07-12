/**
 * Audit logging service.
 *
 * Records auditable actions (login, data changes, admin operations) to the
 * database for compliance and security review.  Errors are caught and logged
 * so audit failures never break the caller.
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// ── Types ────────────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'login'
  | 'logout'
  | 'signup'
  | 'password_reset'
  | 'email_verified'
  | 'profile_update'
  | 'data_export'
  | 'data_delete'
  | 'admin_action'
  | 'subscription_change'
  | 'role_change'
  | 'settings_update'

export interface AuditLogEntry {
  playerId: string
  action: AuditAction
  resource?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}

// ── Core Function ────────────────────────────────────────────────────────────────

/**
 * Log an auditable event to the database.
 * Errors are caught and logged — audit failures must never break callers.
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        playerId: entry.playerId,
        action: entry.action,
        resource: entry.resource ?? '',
        resourceId: entry.resourceId ?? null,
        metadata: entry.metadata ?? {},
        ipAddress: entry.ipAddress ?? null,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error(`Audit log failed: ${message}`, 'audit')
  }
}