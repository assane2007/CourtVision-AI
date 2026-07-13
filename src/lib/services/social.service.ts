/**
 * Social service — business logic for friends, teams, feed, and messaging.
 */

import { db } from '@/lib/db';
import { socialRepository, teamRepository, feedRepository } from '@/lib/repositories/social.repository';
import { AppError, ErrorCode } from '@/lib/middleware/error-handler';
import { logger } from '@/lib/logger';
import type { FriendData } from '@/lib/types/service.types';

// ── Friends ────────────────────────────────────────────────────────────────────

/**
 * Get friends list (accepted or pending).
 */
export async function getFriends(
  playerId: string,
  status: 'accepted' | 'pending' = 'accepted',
): Promise<FriendData[]> {
  return socialRepository.getFriends(playerId, status)
}

/**
 * Send a friend request.
 */
export async function sendFriendRequest(
  requesterId: string,
  recipientId: string,
): Promise<FriendData> {
  if (requesterId === recipientId) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Vous ne pouvez pas vous ajouter vous-même')
  }

  // Check recipient exists
  const recipient = await db.player.findUnique({
    where: { id: recipientId, accountDeleted: false },
    select: { id: true },
  })
  if (!recipient) {
    throw new AppError(ErrorCode.PLAYER_NOT_FOUND, 'Joueur introuvable')
  }

  // Check existing friendship
  const existing = await socialRepository.findFriendship(requesterId, recipientId)
  if (existing) {
    if (existing.status === 'accepted') {
      throw new AppError(ErrorCode.CONFLICT, 'Vous êtes déjà amis')
    }
    if (existing.status === 'pending') {
      throw new AppError(ErrorCode.FRIEND_REQUEST_EXISTS, 'Une demande d\'ami est déjà en attente')
    }
    // 'rejected' — allow re-sending
  }

  const friendship = await db.friendship.create({
    data: {
      requesterId,
      recipientId,
      status: 'pending',
    },
    include: {
      recipient: {
        select: { id: true, name: true, avatar: true, position: true, xp: true, xpLevel: true },
      },
    },
  })

  // Update denormalized counts
  await db.player.update({
    where: { id: requesterId },
    data: { friendsCount: { increment: 1 } },
  })

  logger.info('Friend request sent', 'social.service', { requesterId, recipientId })

  return {
    id: friendship.id,
    name: friendship.recipient.name,
    avatar: friendship.recipient.avatar,
    position: friendship.recipient.position,
    xp: friendship.recipient.xp,
    xpLevel: friendship.recipient.xpLevel,
    status: 'pending',
    requestDate: friendship.createdAt,
  }
}

/**
 * Accept a friend request.
 */
export async function acceptFriendRequest(
  playerId: string,
  friendshipId: string,
): Promise<void> {
  const friendship = await db.friendship.findUnique({
    where: { id: friendshipId },
  })

  if (!friendship) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Demande d\'ami introuvable')
  }

  if (friendship.recipientId !== playerId) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Vous ne pouvez pas accepter cette demande')
  }

  if (friendship.status !== 'pending') {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Cette demande n\'est plus en attente')
  }

  await db.friendship.update({
    where: { id: friendshipId },
    data: { status: 'accepted' },
  })

  // Update denormalized counts
  await Promise.all([
    db.player.update({ where: { id: friendship.requesterId }, data: { friendsCount: { increment: 1 } } }),
    db.player.update({ where: { id: friendship.recipientId }, data: { friendsCount: { increment: 1 } } }),
  ])

  logger.info('Friend request accepted', 'social.service', { friendshipId, playerId })
}

/**
 * Remove a friend (or reject a request).
 */
export async function removeFriend(
  playerId: string,
  friendshipId: string,
): Promise<void> {
  const friendship = await db.friendship.findUnique({
    where: { id: friendshipId },
  })

  if (!friendship) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Amitié introuvable')
  }

  if (friendship.requesterId !== playerId && friendship.recipientId !== playerId) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Vous ne pouvez pas supprimer cette amitié')
  }

  const wasAccepted = friendship.status === 'accepted'

  await db.friendship.delete({ where: { id: friendshipId } })

  if (wasAccepted) {
    await Promise.all([
      db.player.update({ where: { id: friendship.requesterId }, data: { friendsCount: { decrement: 1 } } }),
      db.player.update({ where: { id: friendship.recipientId }, data: { friendsCount: { decrement: 1 } } }),
    ])
  }

  logger.info('Friend removed', 'social.service', { friendshipId, playerId })
}

// ── Teams ───────────────────────────────────────────────────────────────────────

/**
 * Create a team.
 */
export async function createTeam(
  creatorId: string,
  data: {
    name: string
    description?: string
    logo?: string
    isPublic?: boolean
  },
) {
  const team = await db.team.create({
    data: {
      ownerId: creatorId,
      name: data.name,
      description: data.description ?? null,
      logo: data.logo ?? null,
      isPublic: data.isPublic ?? true,
      members: {
        create: {
          playerId: creatorId,
          role: 'admin',
        },
      },
    },
  })

  logger.info('Team created', 'social.service', { teamId: team.id, creatorId })
  return team
}

/**
 * Get a team with members.
 */
export async function getTeam(teamId: string, playerId?: string) {
  return teamRepository.findWithMembers(teamId, playerId)
}

/**
 * Add a member to a team.
 */
export async function addTeamMember(
  teamId: string,
  playerId: string,
  role: 'admin' | 'member' = 'member',
  inviterId: string,
): Promise<void> {
  const team = await teamRepository.findWithMembers(teamId)
  if (!team) {
    throw new AppError(ErrorCode.TEAM_NOT_FOUND, 'Équipe introuvable')
  }

  if (team.isMember && !team.members.some((m) => m.role === 'admin')) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Seuls les administrateurs peuvent ajouter des membres')
  }

  if (team.memberIds.includes(playerId)) {
    throw new AppError(ErrorCode.CONFLICT, 'Ce joueur est déjà dans l\'équipe')
  }

  await db.teamMember.create({
    data: { teamId, playerId, role },
  })

  logger.info('Team member added', 'social.service', { teamId, playerId, inviterId })
}

// ── Feed ────────────────────────────────────────────────────────────────────────

/**
 * Get the social feed (own posts + friends' posts).
 */
export async function getFeed(
  playerId: string,
  params?: { cursor?: string; limit?: number },
) {
  const friendIds = await socialRepository.getAcceptedFriendIds(playerId)

  return feedRepository.getFeed({
    playerId,
    friendIds,
    cursor: params?.cursor,
    limit: params?.limit,
  })
}

/**
 * Create a post.
 */
export async function createPost(
  authorId: string,
  data: {
    content: string
    mediaUrl?: string
    isPublic?: boolean
  },
) {
  const post = await db.feedPost.create({
    data: {
      authorId,
      content: data.content,
      mediaUrl: data.mediaUrl ?? null,
      isPublic: data.isPublic ?? true,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
  })

  // Update post count
  await db.player.update({
    where: { id: authorId },
    data: { postsCount: { increment: 1 } },
  })

  return post
}

/**
 * Like/unlike a post.
 */
export async function togglePostLike(playerId: string, postId: string): Promise<boolean> {
  const existing = await db.feedPostLike.findUnique({
    where: { playerId_postId: { playerId, postId } },
  })

  if (existing) {
    await db.feedPostLike.delete({ where: { playerId_postId: { playerId, postId } } })
    return false // unliked
  }

  await db.feedPostLike.create({ data: { playerId, postId } })
  return true // liked
}