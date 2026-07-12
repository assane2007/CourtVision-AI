/**
 * Typed dispatch helpers for Inngest events.
 *
 * Usage:
 *   import { dispatchVideoProcessing } from '@/lib/inngest/dispatch';
 *   await dispatchVideoProcessing(videoId, playerId)
 */

import { inngest } from './client';

export async function dispatchVideoProcessing(
  videoId: string,
  playerId: string,
  sessionId?: string,
) {
  return inngest.send({
    name: 'video.processing.requested',
    data: { videoId, playerId, sessionId },
  })
}

export async function dispatchFormAnalysis(
  videoId: string,
  playerId: string,
  options?: { frameData?: string; drillName?: string; category?: string },
) {
  return inngest.send({
    name: 'form.analysis.requested',
    data: { videoId, playerId, ...options },
  })
}

export async function dispatchNotification(
  playerId: string,
  title: string,
  body: string,
  type: 'push' | 'in_app' | 'email',
  data?: Record<string, string | number | boolean>,
) {
  return inngest.send({
    name: 'notification.send',
    data: { playerId, title, body, type, data },
  })
}

export async function dispatchExportGeneration(
  videoId: string,
  playerId: string,
  format: 'mp4' | 'gif' | 'webm',
  quality: 'low' | 'medium' | 'high',
  annotations?: boolean,
) {
  return inngest.send({
    name: 'export.generation.requested',
    data: { videoId, playerId, format, quality, annotations },
  })
}

export async function dispatchInsightRefresh(
  playerId: string,
  force?: boolean,
  insights?: string[],
) {
  return inngest.send({
    name: 'insight.refresh.requested',
    data: { playerId, force, insights },
  })
}

export async function dispatchPlayerWelcome(
  playerId: string,
  email: string,
  name: string,
) {
  return inngest.send({
    name: 'player.welcome',
    data: { playerId, email, name },
  })
}