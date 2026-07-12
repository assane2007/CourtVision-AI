import { db } from '@/lib/db';

type AuditAction = 'login' | 'logout' | 'signup' | 'password_reset' | 'profile_update' | 'data_delete' | 'admin_action' | 'payment' | 'subscription_change' | 'settings_update'

interface AuditEntry {
  playerId: string
  action: AuditAction
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        playerId: entry.playerId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        timestamp: new Date(),
      }
    })
  } catch (error) {
    console.warn('[Audit] Failed to write audit log:', error)
  }
}

export type { AuditAction, AuditEntry }