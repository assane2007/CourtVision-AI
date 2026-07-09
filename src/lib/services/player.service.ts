/**
 * Player service — business logic for player CRUD, profiles, stats, and leaderboards.
 * Uses PlayerRepository for data access. All methods are server-only.
 */

import { db } from '@/lib/db'
import { playerRepository } from '@/lib/repositories/player.repository'
import { sessionRepository } from '@/lib/repositories/training.repository'
import { socialRepository } from '@/lib/repositories/social.repository'
import { AppError, ErrorCode } from '@/lib/middleware/error-handler'
import { levelFromXP } from '@/lib/player/iq-engine'
import type { SkillKey } from '@/lib/player/iq-engine'
import { logger } from '@/lib/logger'
import type {
  PlayerProfileData,
  PlayerStatsData,
  LeaderboardEntry,
  LeaderboardResult,
  RecentActivity,
  Timeframe,
} from '@/lib/types/service.types'
import type { PlayerPosition } from '@/lib/types/api.types'
import { VALID_POSITIONS, VALID_LEVELS, VALID_GOALS } from '@/lib/validations'

// ── Profile ─────────────────────────────────────────────────────────────────────

/**
 * Get a player's full profile, including stats, achievements, and recent sessions.
 * Returns null for non-existent or deleted players (does not throw).
 */
export async function getPlayerProfile(
  playerId: string,
): Promise<PlayerProfileData | null> {
  const profile = await playerRepository.findProfile(playerId)
  return profile
}

/**
 * Get a public-facing player profile (strips sensitive data).
 */
export async function getPublicProfile(playerId: string) {
  const profile = await playerRepository.findProfile(playerId)
  if (!profile || !profile.profilePublic) return null

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { email, subscriptionStatus, subscriptionExpiresAt, ...publicProfile } = profile
  return publicProfile
}

/**
 * Update a player's profile with validation.
 * Only allows updating whitelisted fields.
 */
export async function updateProfile(
  playerId: string,
  data: {
    name?: string
    bio?: string
    position?: string
    level?: string
    goals?: string
    avatar?: string | null
    age?: number | null
    weightKg?: number | null
    heightCm?: number | null
    yearsExp?: number | null
  },
): Promise<PlayerProfileData> {
  // Verify player exists
  const existing = await playerRepository.findProfile(playerId)
  if (!existing) {
    throw new AppError(ErrorCode.PLAYER_NOT_FOUND, 'Joueur introuvable')
  }

  // Validate fields
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 50) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Le nom doit contenir entre 2 et 50 caractères')
    }
    updateData.name = data.name.trim()
  }

  if (data.bio !== undefined) {
    if (typeof data.bio === 'string' && data.bio.length > 500) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'La bio ne doit pas dépasser 500 caractères')
    }
    updateData.bio = data.bio
  }

  if (data.position !== undefined) {
    if (!VALID_POSITIONS.includes(data.position)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Position invalide')
    }
    updateData.position = data.position
  }

  if (data.level !== undefined) {
    if (!VALID_LEVELS.includes(data.level)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Niveau invalide')
    }
    updateData.level = data.level
  }

  if (data.goals !== undefined) {
    if (!VALID_GOALS.includes(data.goals)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Objectif invalide')
    }
    updateData.goals = data.goals
  }

  if (data.avatar !== undefined) {
    if (data.avatar !== null && typeof data.avatar === 'string' && data.avatar.length > 500) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'URL de l\'avatar trop longue')
    }
    updateData.avatar = data.avatar
  }

  if (data.age !== undefined) {
    updateData.age = data.age
  }

  if (data.weightKg !== undefined) {
    updateData.weightKg = data.weightKg
  }

  if (data.heightCm !== undefined) {
    updateData.heightCm = data.heightCm
  }

  if (data.yearsExp !== undefined) {
    updateData.yearsExp = data.yearsExp
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Aucun champ valide à mettre à jour')
  }

  await db.player.update({
    where: { id: playerId },
    data: updateData,
  })

  const profile = await playerRepository.findProfile(playerId)
  if (!profile) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Erreur lors de la mise à jour du profil')
  }

  logger.info('Player profile updated', 'player.service', { playerId, fields: Object.keys(updateData) })
  return profile
}

// ── Stats ───────────────────────────────────────────────────────────────────────

/**
 * Get aggregated player stats including XP, level, skill DNA, and recent activity.
 */
export async function getPlayerStats(playerId: string): Promise<PlayerStatsData> {
  const player = await playerRepository.findProfile(playerId)
  if (!player) {
    throw new AppError(ErrorCode.PLAYER_NOT_FOUND, 'Joueur introuvable')
  }

  const [totalWorkouts] = await Promise.all([
    sessionRepository.countForPlayer(playerId),
    db.achievement.count({ where: { playerId } }),
  ])

  const totalXP = player.xp
  const levelInfo = levelFromXP(totalXP)

  const skillDNA: Record<SkillKey, number> = {
    shooting: player.shooting,
    handling: player.handling,
    finishing: player.finishing,
    defense: player.defense,
    iq: player.iq,
  }

  const recentWorkouts = await sessionRepository.getRecentSummaries(playerId, 10)

  const recentActivity: RecentActivity[] = recentWorkouts.map((w) => ({
    type: 'workout' as const,
    id: w.id,
    date: w.startedAt.toISOString(),
    totalDurationSec: w.totalDurationSec ?? undefined as number | undefined,
    totalScore: w.totalScore ?? undefined as number | undefined,
    avgScore: w.avgScore ?? undefined as number | undefined,
    totalDrills: w.totalDrills,
    notes: w.notes,
  }))

  return {
    totalXP,
    level: levelInfo,
    streak: player.currentStreak,
    skillDNA,
    totalWorkouts,
    totalMatches: 0, // MatchLog model removed
    winRate: 0,
    recentActivity,
  }
}

/**
 * Get player stats for a specific time period.
 */
export async function getPlayerStatsByPeriod(
  playerId: string,
  _period: Timeframe,
) {
  // Future: aggregate session scores within the period
  // For now, return the full stats
  return getPlayerStats(playerId)
}

// ── Leaderboard ─────────────────────────────────────────────────────────────────

/**
 * Get leaderboard data: global ranking, friends ranking, and player's rank.
 *
 * @param position - Filter by position (optional)
 * @param timeframe - Period filter: 'week', 'month', or 'all'
 * @param limit - Number of top players to return
 * @param playerId - Current player's ID (for rank calculation and highlighting)
 * @param teamId - Optional team ID (show only team members)
 */
export async function getPlayerLeaderboard(
  playerId: string,
  params: {
    position?: PlayerPosition
    timeframe?: Timeframe
    limit?: number
    teamId?: string
  } = {},
): Promise<LeaderboardResult> {
  const { timeframe = 'all', limit = 20, teamId } = params

  // Team filter
  let teamMemberIds: string[] | undefined
  if (teamId) {
    teamMemberIds = await (await import('@/lib/repositories/social.repository')).teamRepository.getMemberIds(teamId)
    if (teamMemberIds.length === 0) {
      return {
        leaderboard: [],
        friends: [],
        playerRank: null,
        totalPlayers: 0,
        teamName: null,
      }
    }
  }

  // Date filter based on timeframe
  let periodFilter: Date | undefined
  if (timeframe === 'week') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    periodFilter = d
  } else if (timeframe === 'month') {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    periodFilter = d
  }

  // Fetch top players
  const players = await playerRepository.findTopByXp({
    teamMemberIds,
    period: timeframe,
    take: limit,
  })

  // Process leaderboard entries
  const leaderboard = players
    .map((p) => {
      const sessions = p.sessions
      const totalSessions = sessions.length
      const totalScore = sessions.reduce((s, ses) => s + ses.totalScore, 0)
      const avgScore = totalSessions > 0 ? Math.round((totalScore / totalSessions) * 10) / 10 : 0

      let sortXp = p.xp
      if (timeframe !== 'all') {
        sortXp = Math.round(totalScore)
      }

      return {
        playerId: p.id,
        name: p.name,
        xp: p.xp,
        xpLevel: p.xpLevel,
        totalSessions,
        avgScore,
        position: p.position,
        sortXp,
      }
    })
    .sort((a, b) => b.sortXp - a.sortXp)
    .map((p, i) => ({ ...p, rank: i + 1 }))

  // Total players count
  const totalPlayers = teamMemberIds
    ? teamMemberIds.length
    : await playerRepository.countActive()

  // Team name
  let teamName: string | null = null
  if (teamId) {
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { name: true },
    })
    teamName = team?.name ?? null
  }

  // Player rank
  let playerRank: number | null = null
  const currentPlayerRanked = leaderboard.find((p) => p.playerId === playerId)
  if (currentPlayerRanked) {
    playerRank = currentPlayerRanked.rank
  } else {
    const currentPlayerXp = await playerRepository.getXp(playerId)
    if (currentPlayerXp !== null) {
      playerRank = (await playerRepository.countPlayersWithMoreXp(currentPlayerXp)) + 1
    }
  }

  // Friends section
  const friendIds = await socialRepository.getAcceptedFriendIds(playerId)
  const friends = await buildFriendsLeaderboard(
    friendIds,
    playerId,
    currentPlayerRanked,
    periodFilter,
  )

  // Anonymize global leaderboard (first name only for others)
  const anonymized = leaderboard.map((p) => ({
    rank: p.rank,
    name: p.playerId === playerId ? p.name : p.name.split(' ')[0] || 'Joueur',
    xp: p.xp,
    xpLevel: p.xpLevel,
    totalSessions: p.totalSessions,
    avgScore: p.avgScore,
    position: p.position,
    isCurrentUser: p.playerId === playerId,
  }))

  return {
    leaderboard: anonymized,
    friends,
    playerRank,
    totalPlayers,
    teamName,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

async function buildFriendsLeaderboard(
  friendIds: Set<string>,
  playerId: string,
  currentPlayerRanked: LeaderboardEntry | undefined,
  periodFilter?: Date,
): Promise<LeaderboardEntry[]> {
  const friendPlayers = await socialRepository.getFriendsWithSessions(
    Array.from(friendIds),
    periodFilter,
  )

  let friends: LeaderboardEntry[] = friendPlayers
    .map((p) => {
      const totalScore = p.sessions.reduce((s, ses) => s + ses.totalScore, 0)
      const avgScore = p.sessions.length > 0
        ? Math.round((totalScore / p.sessions.length) * 10) / 10
        : 0
      return {
        rank: 0,
        playerId: p.id,
        name: p.name,
        xp: p.xp,
        xpLevel: p.xpLevel,
        totalSessions: p.sessions.length,
        avgScore,
        position: p.position,
        sortXp: p.xp,
        isCurrentUser: false,
      }
    })
    .sort((a, b) => b.xp - a.xp)
    .map((p, i) => ({ ...p, rank: i + 1 }))

  // Insert current player
  if (currentPlayerRanked) {
    const me: LeaderboardEntry = {
      ...currentPlayerRanked,
      isCurrentUser: true,
    }
    friends.push(me)
    friends.sort((a, b) => b.xp - a.xp)
    friends = friends.map((p, i) => ({ ...p, rank: i + 1 }))
  } else if (friends.length === 0) {
    // No friends yet, just show self if on leaderboard
    // (handled implicitly)
  }

  return friends
}