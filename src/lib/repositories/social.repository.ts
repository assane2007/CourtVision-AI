/**
 * Social repository — data access layer for Friendship, Team, Post, and Message models.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { BaseRepository } from './base.repository'
import type { FriendData } from '@/lib/types/service.types'

// ── Friendship Repository ───────────────────────────────────────────────────────

export class SocialRepository extends BaseRepository<'Friendship', any> {
  constructor() {
    super(db.friendship as any, 'Friendship')
  }

  /**
   * Get accepted friend IDs for a player.
   */
  async getAcceptedFriendIds(playerId: string): Promise<Set<string>> {
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { requesterId: playerId, status: 'accepted' },
          { recipientId: playerId, status: 'accepted' },
        ],
      },
      select: { requesterId: true, recipientId: true },
    })

    const ids = new Set<string>()
    for (const f of friendships) {
      if (f.requesterId !== playerId) ids.add(f.requesterId)
      if (f.recipientId !== playerId) ids.add(f.recipientId)
    }
    return ids
  }

  /**
   * Get friend list with player details.
   */
  async getFriends(playerId: string, status: 'accepted' | 'pending' = 'accepted') {
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { requesterId: playerId, status },
          { recipientId: playerId, status },
        ],
      },
      include: {
        requester: {
          select: { id: true, name: true, avatar: true, position: true, xp: true, xpLevel: true },
        },
        recipient: {
          select: { id: true, name: true, avatar: true, position: true, xp: true, xpLevel: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return friendships.map((f): FriendData => {
      const isRequester = f.requesterId === playerId
      const other = isRequester ? f.recipient : f.requester
      return {
        id: f.id,
        name: other.name,
        avatar: other.avatar,
        position: other.position,
        xp: other.xp,
        xpLevel: other.xpLevel,
        status: f.status as 'pending' | 'accepted' | 'rejected',
        requestDate: f.createdAt,
      }
    })
  }

  /**
   * Check if a friendship exists between two players.
   */
  async findFriendship(playerA: string, playerB: string) {
    return db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: playerA, recipientId: playerB },
          { requesterId: playerB, recipientId: playerA },
        ],
      },
    })
  }

  /**
   * Get friend players with their session data (for leaderboard).
   */
  async getFriendsWithSessions(
    friendIds: string[],
    periodFilter?: Date,
  ) {
    if (friendIds.length === 0) return []

    return db.player.findMany({
      where: { id: { in: Array.from(friendIds) } },
      select: {
        id: true,
        name: true,
        xp: true,
        xpLevel: true,
        position: true,
        sessions: {
          select: { totalScore: true },
          where: periodFilter ? { startedAt: { gte: periodFilter } } : undefined,
          take: 100,
        },
      },
    })
  }
}

// ── Team Repository ─────────────────────────────────────────────────────────────

export class TeamRepository extends BaseRepository<'Team', any> {
  constructor() {
    super(db.team as any, 'Team')
  }

  /**
   * Find a team with member count and member IDs.
   */
  async findWithMembers(teamId: string, playerId?: string) {
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: { playerId: true, role: true, joinedAt: true },
          orderBy: { joinedAt: 'asc' },
        },
        ...(playerId ? {
          _count: {
            select: { members: true },
          },
        } : {}),
      },
    })

    return team ? {
      ...team,
      memberCount: team.members.length,
      memberIds: team.members.map((m) => m.playerId),
      isMember: playerId ? team.members.some((m) => m.playerId === playerId) : false,
    } : null
  }

  /**
   * Get team member IDs.
   */
  async getMemberIds(teamId: string): Promise<string[]> {
    const members = await db.teamMember.findMany({
      where: { teamId },
      select: { playerId: true },
    })
    return members.map((m) => m.playerId)
  }
}

// ── Feed / Post Repository ─────────────────────────────────────────────────────

export class FeedRepository extends BaseRepository<'FeedPost', any> {
  constructor() {
    super(db.feedPost as any, 'FeedPost')
  }

  /**
   * Get feed posts with author info, like count, and comment count.
   */
  async getFeed(params: {
    playerId?: string
    cursor?: string
    limit?: number
    friendIds?: Set<string>
  }) {
    const { playerId, cursor, limit = 20, friendIds } = params

    // Build where clause: own posts + friends' posts
    const where: Prisma.FeedPostWhereInput = {
      OR: [
        ...(playerId ? [{ authorId: playerId }] : []),
        ...(friendIds && friendIds.size > 0 ? [{ authorId: { in: Array.from(friendIds) } }] : []),
        // Public posts from anyone
        { isPublic: true },
      ],
    }

    const cursorWhere = cursor
      ? { AND: [where, { id: { gt: cursor } }] as Prisma.FeedPostWhereInput[] }
      : where

    const posts = await db.feedPost.findMany({
      where: cursorWhere,
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    const hasMore = posts.length > limit
    const pagePosts = hasMore ? posts.slice(0, limit) : posts
    const nextCursor = hasMore ? pagePosts[pagePosts.length - 1].id : null

    const data: FeedPostData[] = pagePosts.map((p: any) => ({
      id: p.id,
      content: p.content,
      mediaUrl: p.imageUrls,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      createdAt: p.createdAt,
      author: {
        id: p.author.id,
        name: p.author.name,
        avatar: p.author.avatar,
      },
    }))

    return { posts: data, nextCursor, hasMore, count: data.length }
  }
}

// ── Singletons ──────────────────────────────────────────────────────────────────

export const socialRepository = new SocialRepository()
export const teamRepository = new TeamRepository()
export const feedRepository = new FeedRepository()