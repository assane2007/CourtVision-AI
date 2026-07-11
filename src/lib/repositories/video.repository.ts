/**
 * Video repository — data access layer for Video, VideoAnnotation, and VideoExport models.
 */

import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { BaseRepository, type PrismaModelDelegate } from './base.repository'
import type { VideoData } from '@/lib/types/service.types'

export class VideoRepository extends BaseRepository<'Video', Prisma.Video> {
  constructor() {
    super(db.video as unknown as PrismaModelDelegate<Prisma.Video>, 'Video')
  }

  /**
   * Find videos for a player with annotation and export counts.
   */
  async findForPlayer(
    playerId: string,
    params?: { cursor?: string; limit?: number; isPublic?: boolean },
  ) {
    const { cursor, limit = 20, isPublic } = params ?? {}

    const where: Prisma.VideoWhereInput = { playerId }
    if (isPublic !== undefined) where.isPublic = isPublic

    const cursorWhere = cursor
      ? { AND: [where, { id: { gt: cursor } }] as Prisma.VideoWhereInput[] }
      : where

    const videos = await db.video.findMany({
      where: cursorWhere,
      include: {
        _count: {
          select: {
            annotations: true,
            exports: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    const hasMore = videos.length > limit
    const pageVideos = hasMore ? videos.slice(0, limit) : videos
    const nextCursor = hasMore ? pageVideos[pageVideos.length - 1].id : null

    const data: VideoData[] = pageVideos.map((v) => ({
      id: v.id,
      title: v.title,
      storageUrl: v.url,
      thumbnailUrl: v.thumbnailUrl,
      durationSec: v.durationSec,
      isPublic: v.isPublic,
      viewsCount: v.viewCount ?? 0,
      annotationsCount: v._count.annotations,
      createdAt: v.createdAt,
    }))

    return { videos: data, nextCursor, hasMore, count: data.length }
  }

  /**
   * Find a video with annotations (ownership check included).
   */
  async findWithAnnotations(videoId: string, playerId: string) {
    return db.video.findFirst({
      where: { id: videoId, playerId },
      include: {
        annotations: {
          orderBy: { timestampMs: 'asc' },
        },
        _count: {
          select: {
            annotations: true,
            exports: true,
          },
        },
      },
    })
  }

  /**
   * Increment view count.
   */
  async incrementViews(videoId: string): Promise<void> {
    await db.video.update({
      where: { id: videoId },
      data: { viewCount: { increment: 1 } },
    })
  }
}

// ── Annotation Repository ───────────────────────────────────────────────────────

export class AnnotationRepository extends BaseRepository<'VideoAnnotation', Prisma.VideoAnnotation> {
  constructor() {
    super(db.videoAnnotation as unknown as PrismaModelDelegate<Prisma.VideoAnnotation>, 'VideoAnnotation')
  }

  /**
   * Get annotations for a video.
   */
  async getForVideo(videoId: string) {
    return db.videoAnnotation.findMany({
      where: { videoId },
      orderBy: { timestampMs: 'asc' },
    })
  }

  /**
   * Create an annotation for a video.
   */
  async createForVideo(videoId: string, data: {
    type: string
    timestampMs: number
    annotationData: unknown
    playerId: string
  }) {
    return db.videoAnnotation.create({
      data: {
        videoId,
        type: data.type,
        timestampMs: data.timestampMs,
        data: data.annotationData as string,
        playerId: data.playerId,
      },
    })
  }
}

// ── Export Repository ───────────────────────────────────────────────────────────

export class VideoExportRepository extends BaseRepository<'VideoExport', Prisma.VideoExport> {
  constructor() {
    super(db.videoExport as unknown as PrismaModelDelegate<Prisma.VideoExport>, 'VideoExport')
  }

  /**
   * Get exports for a video.
   */
  async getForVideo(videoId: string) {
    return db.videoExport.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Create an export job for a video.
   */
  async createExport(videoId: string, data: {
    format: string
    playerId: string
    options?: Record<string, unknown>
  }) {
    return db.videoExport.create({
      data: {
        videoId,
        format: data.format,
        status: 'pending',
        playerId: data.playerId,
      },
    })
  }
}

// ── Singletons ──────────────────────────────────────────────────────────────────

export const videoRepository = new VideoRepository()
export const annotationRepository = new AnnotationRepository()
export const videoExportRepository = new VideoExportRepository()