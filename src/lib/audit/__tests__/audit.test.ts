import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    auditLog: {
      create: mockCreate,
    },
  },
}))

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }))

describe('audit logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({})
  })

  it('logAudit calls db.auditLog.create with correct shape', async () => {
    const { logAudit } = await import('@/lib/audit/audit')
    await logAudit({
      playerId: 'player-1',
      action: 'login',
      ipAddress: '127.0.0.1',
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        playerId: 'player-1',
        action: 'login',
        ipAddress: '127.0.0.1',
      }),
    })
  })

  it('handles database errors gracefully', async () => {
    mockCreate.mockRejectedValue(new Error('DB connection lost'))
    const { logAudit } = await import('@/lib/audit/audit')
    // Should not throw — audit failures must not break callers
    await expect(
      logAudit({ playerId: 'p1', action: 'signup' }),
    ).resolves.toBeUndefined()
  })

  it('valid AuditAction types are accepted', async () => {
    const { logAudit } = await import('@/lib/audit/audit')
    const actions = [
      'login', 'logout', 'signup', 'password_reset',
      'email_verified', 'profile_update', 'data_export',
      'data_delete', 'admin_action', 'subscription_change',
      'role_change', 'settings_update',
    ] as const
    for (const action of actions) {
      await expect(
        logAudit({ playerId: 'p1', action }),
      ).resolves.toBeUndefined()
    }
    expect(mockCreate).toHaveBeenCalledTimes(actions.length)
  })
})