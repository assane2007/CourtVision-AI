/**
 * Player repository — data access layer for the Player model.
 * Extends BaseRepository with player-specific queries.
 */

import { db } from '@/lib/db'
import { BaseRepository, type PrismaModelDelegate } from './base.repository'
import type { PlayerProfileData } from '@/lib/types/service.types'

export class PlayerRepository extends BaseRepository<'Player', PlayerProfileData> {
  constructor() {
    super(db.player as unknown as PrismaModelDelegate<PlayerProfileData>, 'Player')
  }

  /**
   * Find a player with full profile data including achievements and recent sessions.
   */
  async findProfile(playerId: string): Promise<PlayerProfileData | null> {
    return db.player.findUnique({
      where: { id: playerId, accountDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        position: true,
        level: true,
        goals: true,
        isOnboarded: true,
        xp: true,
        xpLevel: true,
        currentStreak: true,
        lastActivityDate: true,
        shooting: true,
        handling: true,
        finishing: true,
        defense: true,
        iq: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        profilePublic: true,
        showOnLeaderboard: true,
        friendsCount: true,
        followersCount: true,
        followingCount: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as unknown as PlayerProfileData | null
  }

  /**
   * Get player's skill ratings (shooting, handling, finishing, defense, iq).
   */
  async getSkillRatings(playerId: string): Promise<{
    shooting: number
    handling: number
    finishing: number
    defense: number
    iq: number
  } | null> {
    return db.player.findUnique({
      where: { id: playerId, accountDeleted: false },
      select: { shooting: true, handling: true, finishing: true, defense: true, iq: true },
    })
  }

  /**
   * Get player's subscription info.
   */
  async getSubscription(playerId: string): Promise<{
    subscriptionStatus: string
    subscriptionExpiresAt: Date | null
    stripeCustomerId: string | null
  } | null> {
    return db.player.findUnique({
      where: { id: playerId },
      select: {
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        stripeCustomerId: true,
      },
    })
  }

  /**
   * Update player's skill ratings.
   */
  async updateSkillRatings(
    playerId: string,
    skills: Partial<{
      shooting: number
      handling: number
      finishing: number
      defense: number
      iq: number
    }>,
  ): Promise<void> {
    await db.player.update({
      where: { id: playerId },
      data: skills,
    })
  }

  /**
   * Find players ordered by XP (for leaderboard).
   * Supports period-based filtering via sessions.
   */
  async findTopByXp(params: {
    teamMemberIds?: string[]
    period?: 'week' | 'month' | 'all'
    take: number
  }) {
    const periodFilter = getPeriodDate(params.period)

    return db.player.findMany({
      where: params.teamMemberIds
        ? { id: { in: params.teamMemberIds } }
        : undefined,
      take: params.take,
      orderBy: { xp: 'desc' },
      select: {
        id: true,
        name: true,
        xp: true,
        xpLevel: true,
        position: true,
        sessions: {
          select: {
            totalScore: true,
            totalReps: true,
            totalDrills: true,
            startedAt: true,
          },
          where: periodFilter ? { startedAt: { gte: periodFilter } } : undefined,
          orderBy: { totalScore: 'desc' },
          take: 100,
        },
      },
    })
  }

  /**
   * Count total active players (for leaderboard total).
   */
  async countActive(): Promise<number> {
    return db.player.count({
      where: { accountDeleted: false },
    })
  }

  /**
   * Get player's XP for rank calculation.
   */
  async getXp(playerId: string): Promise<number | null> {
    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { xp: true },
    })
    return player?.xp ?? null
  }

  /**
   * Count players with more XP than the given value (for rank calculation).
   */
  async countPlayersWithMoreXp(xp: number): Promise<number> {
    return db.player.count({
      where: { xp: { gt: xp } },
    })
  }

  /**
   * Search players by name (for friend search, team invites, etc.)
   */
  async searchByName(query: string, excludePlayerId?: string, take = 20) {
    return db.player.findMany({
      where: {
        AND: [
          { accountDeleted: false },
          {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
            ],
          },
          ...(excludePlayerId ? [{ id: { not: excludePlayerId } }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        position: true,
        xp: true,
        xpLevel: true,
        friendsCount: true,
      },
      take,
      orderBy: { name: 'asc' },
    })
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function getPeriodDate(period?: string): Date | undefined {
  if (!period || period === 'all') return undefined

  const now = new Date()
  if (period === 'week') {
    now.setDate(now.getDate() - 7)
    return now
  }
  if (period === 'month') {
    now.setMonth(now.getMonth() - 1)
    return now
  }
  return undefined
}

// Singleton
export const playerRepository = new PlayerRepository()