/**
 * Service layer types.
 * Defines interfaces for all services, repositories, and shared types
 * used across the service layer architecture.
 */

import type { Prisma } from '@prisma/client'
import type {
  PaginationMeta,
  PlayerPosition,
  SkillKey,
  SubscriptionTier,
} from './api.types'

// ── Generic Query Parameters ────────────────────────────────────────────────────

/** Base filter interface for repository queries */
export interface QueryParams {
  where?: Prisma.WhereInput
  orderBy?: Prisma.OrderByWithRelationInput
  include?: Prisma.IncludeScalarFilter
}

/** Cursor-based pagination params */
export interface CursorParams {
  cursor?: string
  take: number
}

/** Offset-based pagination params */
export interface OffsetParams {
  page: number
  limit: number
}

/** Combined pagination params (one of cursor or offset) */
export type PaginationParams = CursorParams | OffsetParams

/** Full query with pagination */
export interface FindAllParams extends QueryParams {
  cursor?: string
  take?: number
  skip?: number
  page?: number
  limit?: number
}

// ── Repository Result Types ─────────────────────────────────────────────────────

/** Result from a paginated findMany query */
export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
}

/** Result from a non-paginated findMany query */
export interface ListResult<T> {
  data: T[]
  total: number
}

// ── Player Types ────────────────────────────────────────────────────────────────

export interface PlayerProfileData {
  id: string
  name: string
  email: string
  avatar: string | null
  bio: string
  position: PlayerPosition
  level: PlayerLevel
  goals: string
  isOnboarded: boolean
  xp: number
  xpLevel: number
  currentStreak: number
  lastActivityDate: Date | null
  shooting: number
  handling: number
  finishing: number
  defense: number
  iq: number
  subscriptionStatus: SubscriptionTier
  subscriptionExpiresAt: Date | null
  profilePublic: boolean
  showOnLeaderboard: boolean
  friendsCount: number
  followersCount: number
  followingCount: number
  createdAt: Date
  updatedAt: Date
}

export interface PlayerStatsData {
  totalXP: number
  level: { level: number; title: string; currentXp: number; xpToNext: number }
  streak: number
  skillDNA: Record<SkillKey, number>
  totalWorkouts: number
  totalMatches: number
  winRate: number
  recentActivity: RecentActivity[]
}

export interface RecentActivity {
  type: 'workout' | 'match' | 'achievement'
  id: string
  date: string
  totalDurationSec?: number
  totalScore?: number
  avgScore?: number
  totalDrills?: number
  notes?: string | null
}

export interface LeaderboardEntry {
  rank: number
  playerId: string
  name: string
  xp: number
  xpLevel: number
  totalSessions: number
  avgScore: number
  position: string
  sortXp: number
  isCurrentUser?: boolean
}

export interface LeaderboardResult {
  leaderboard: Omit<LeaderboardEntry, 'playerId' | 'sortXp'>[]
  friends: LeaderboardEntry[]
  playerRank: number | null
  totalPlayers: number
  teamName: string | null
}

// ── Training Types ──────────────────────────────────────────────────────────────

export interface DrillData {
  id: string
  name: string
  nameFr: string
  category: string
  difficulty: string
  description: string | null
  descriptionFr: string | null
  instructions: string | null
  instructionsFr: string | null
  durationSec: number | null
  targetReps: number | null
  icon: string | null
  isCustom: boolean
  isFavorite: boolean
  isActive: boolean
}

export interface DrillFilters {
  category?: string
  difficulty?: string
  search?: string
  favoritesOnly?: boolean
  customOnly?: boolean
}

export interface SessionDrillResult {
  drillId: string
  reps: number
  score: number
  durationMs: number
  formFeedback?: string
}

export interface CreateSessionInput {
  drillScores: SessionDrillResult[]
  totalReps?: number
  totalDurationMs?: number
  notes?: string
}

export interface SessionData {
  id: string
  playerId: string
  totalScore: number
  totalReps: number
  totalDrills: number
  totalDurationSec: number | null
  avgScore: number | null
  notes: string | null
  startedAt: Date
  endedAt: Date | null
  drills: SessionDrillData[]
}

export interface SessionDrillData {
  id: string
  drillId: string
  reps: number
  score: number
  durationMs: number
  formFeedback: string | null
  drill?: {
    id: string
    nameFr: string
    icon: string | null
    category: string
    difficulty: string
  }
}

export interface CreateSessionResult {
  session: SessionData
  xpAwarded: {
    xpGained: number
    leveledUp: boolean
    newLevel: number
  } | null
}

// ── Social Types ────────────────────────────────────────────────────────────────

export interface FriendData {
  id: string
  name: string
  avatar: string | null
  position: string
  xp: number
  xpLevel: number
  status: 'pending' | 'accepted' | 'rejected'
  requestDate: Date
}

export interface TeamData {
  id: string
  name: string
  description: string | null
  logo: string | null
  isPublic: boolean
  memberCount: number
  createdAt: Date
}

export interface FeedPostData {
  id: string
  content: string
  mediaUrl: string | null
  likeCount: number
  commentCount: number
  createdAt: Date
  author: {
    id: string
    name: string
    avatar: string | null
  }
}

// ── Video Types ─────────────────────────────────────────────────────────────────

export interface VideoData {
  id: string
  title: string
  storageUrl: string
  thumbnailUrl: string | null
  durationSec: number | null
  isPublic: boolean
  viewsCount: number
  annotationsCount: number
  createdAt: Date
}

export interface AnnotationData {
  id: string
  type: string
  timestampMs: number
  data: unknown
  createdAt: Date
}

// ── AI Types ────────────────────────────────────────────────────────────────────

export interface FormCheckResult {
  score: number
  feedback: string
  issues: string[]
  goodPoints: string[]
}

export interface AiInsight {
  id: string
  type: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
}

// ── Auth Context ────────────────────────────────────────────────────────────────

export type AuthLevel = 'basic' | 'verified' | '2fa'

export interface AuthContext {
  playerId: string
  email: string
  name: string
  role: string
  authLevel: AuthLevel
}

// ── Ownership Check Config ──────────────────────────────────────────────────────

export type ResourceType =
  | 'session'
  | 'video'
  | 'plan'
  | 'team'
  | 'post'
  | 'challenge'
  | 'message'

export interface OwnershipConfig {
  resourceType: ResourceType
  /** Custom ID field name on the resource (defaults to 'id') */
  idField?: string
  /** Custom player FK field name (defaults to 'playerId') */
  playerField?: string
}