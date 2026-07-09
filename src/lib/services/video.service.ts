/**
 * Video service — business logic for video upload, annotations, highlights, and exports.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from '@/lib/db'
import { videoRepository, annotationRepository, videoExportRepository } from '@/lib/repositories/video.repository'
import { AppError, ErrorCode } from '@/lib/middleware/error-handler'
import { logger } from '@/lib/logger'
import type { VideoData, AnnotationData } from '@/lib/types/service.types'

// ── Video CRUD ─────────────────────────────────────────────────────────────────

/**
 * Upload/register a new video.
 * In production, this would handle file upload to cloud storage.
 * Currently stores a reference URL.
 */
export async function createVideo(
  playerId: string,
  data: {
    title: string
    storageUrl: string
    thumbnailUrl?: string
    durationSec?: number
    isPublic?: boolean
  },
): Promise<VideoData> {
  const video = await db.video.create({
    data: {
      playerId,
      title: data.title,
      storageUrl: data.storageUrl,
      thumbnailUrl: data.thumbnailUrl ?? null,
      durationSec: data.durationSec ?? null,
      isPublic: data.isPublic ?? false,
    },
  })

  // Update denormalized count
  await db.player.update({
    where: { id: playerId },
    data: { videosCount: { increment: 1 } },
  })

  logger.info('Video created', 'video.service', { playerId, videoId: video.id })

  return {
    id: video.id,
    title: video.title,
    storageUrl: video.storageUrl,
    thumbnailUrl: video.thumbnailUrl,
    durationSec: video.durationSec,
    isPublic: video.isPublic,
    viewsCount: 0,
    annotationsCount: 0,
    createdAt: video.createdAt,
  }
}

/**
 * Get a video with its annotations.
 */
export async function getVideo(
  videoId: string,
  playerId: string,
) {
  const video = await videoRepository.findWithAnnotations(videoId, playerId)

  if (!video) {
    throw new AppError(ErrorCode.VIDEO_NOT_FOUND, 'Vidéo introuvable')
  }

  return video
}

/**
 * Get paginated videos for a player.
 */
export async function getPlayerVideos(
  playerId: string,
  params?: { cursor?: string; limit?: number; isPublic?: boolean },
) {
  return videoRepository.findForPlayer(playerId, params)
}

/**
 * Delete a video and its related data.
 */
export async function deleteVideo(
  videoId: string,
  playerId: string,
): Promise<void> {
  const video = await videoRepository.findWithAnnotations(videoId, playerId)
  if (!video) {
    throw new AppError(ErrorCode.VIDEO_NOT_FOUND, 'Vidéo introuvable')
  }

  // Delete in order: exports → annotations → video
  await db.videoExport.deleteMany({ where: { videoId } })
  await db.videoAnnotation.deleteMany({ where: { videoId } })
  await db.video.delete({ where: { id: videoId } })

  // Update denormalized count
  await db.player.update({
    where: { id: playerId },
    data: { videosCount: { decrement: 1 } },
  })

  logger.info('Video deleted', 'video.service', { videoId, playerId })
}

// ── Annotations ─────────────────────────────────────────────────────────────────

/**
 * Add an annotation to a video.
 */
export async function addAnnotation(
  videoId: string,
  playerId: string,
  data: {
    type: string
    timestampMs: number
    annotationData: unknown
  },
): Promise<AnnotationData> {
  // Verify ownership
  const video = await videoRepository.findOptionalById(videoId)
  if (!video || (video as any).playerId !== playerId) {
    throw new AppError(ErrorCode.VIDEO_NOT_FOUND, 'Vidéo introuvable')
  }

  const annotation = await annotationRepository.createForVideo(videoId, {
    type: data.type,
    timestampMs: data.timestampMs,
    annotationData: data.annotationData,
    playerId,
  })

  return {
    id: annotation.id,
    type: annotation.type,
    timestampMs: annotation.timestampMs,
    data: annotation.data,
    createdAt: annotation.createdAt,
  }
}

/**
 * Get all annotations for a video.
 */
export async function getAnnotations(videoId: string, playerId: string): Promise<AnnotationData[]> {
  const video = await videoRepository.findOptionalById(videoId)
  if (!video || (video as any).playerId !== playerId) {
    throw new AppError(ErrorCode.VIDEO_NOT_FOUND, 'Vidéo introuvable')
  }

  const annotations = await annotationRepository.getForVideo(videoId)

  return annotations.map((a) => ({
    id: a.id,
    type: a.type,
    timestampMs: a.timestampMs,
    data: a.data,
    createdAt: a.createdAt,
  }))
}

/**
 * Delete an annotation.
 */
export async function deleteAnnotation(
  annotationId: string,
  playerId: string,
): Promise<void> {
  const annotation = await db.videoAnnotation.findUnique({
    where: { id: annotationId },
    select: { playerId: true, videoId: true },
  })

  if (!annotation) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Annotation introuvable')
  }

  if (annotation.playerId !== playerId) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Vous ne pouvez pas supprimer cette annotation')
  }

  await db.videoAnnotation.delete({ where: { id: annotationId } })
}

// ── Highlights ──────────────────────────────────────────────────────────────────

/**
 * Generate AI highlights for a video.
 * This would use VLM to identify key moments.
 */
export async function generateHighlights(
  videoId: string,
  playerId: string,
): Promise<AnnotationData[]> {
  const video = await videoRepository.findWithAnnotations(videoId, playerId)
  if (!video) {
    throw new AppError(ErrorCode.VIDEO_NOT_FOUND, 'Vidéo introuvable')
  }

  // Mark existing highlights as regenerated
  await db.videoAnnotation.updateMany({
    where: { videoId, type: 'highlight' },
    data: { isDeleted: true },
  })

  // In production, this would call a VLM to analyze video frames
  // For now, return existing highlights
  const highlights = await db.videoAnnotation.findMany({
    where: { videoId, type: 'highlight' },
    orderBy: { timestampMs: 'asc' },
  })

  return highlights.map((h) => ({
    id: h.id,
    type: h.type,
    timestampMs: h.timestampMs,
    data: h.data,
    createdAt: h.createdAt,
  }))
}

// ── Exports ────────────────────────────────────────────────────────────────────

/**
 * Create an export job for a video.
 */
export async function createExport(
  videoId: string,
  playerId: string,
  format: string,
  options?: Record<string, unknown>,
) {
  const video = await videoRepository.findOptionalById(videoId)
  if (!video || (video as any).playerId !== playerId) {
    throw new AppError(ErrorCode.VIDEO_NOT_FOUND, 'Vidéo introuvable')
  }

  return videoExportRepository.createExport(videoId, {
    format,
    playerId,
    options,
  })
}

/**
 * Get export status for a video.
 */
export async function getExports(videoId: string, playerId: string) {
  const video = await videoRepository.findOptionalById(videoId)
  if (!video || (video as any).playerId !== playerId) {
    throw new AppError(ErrorCode.VIDEO_NOT_FOUND, 'Vidéo introuvable')
  }

  return videoExportRepository.getForVideo(videoId)
}