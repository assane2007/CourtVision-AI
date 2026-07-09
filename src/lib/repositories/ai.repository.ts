/**
 * AI repository — data access layer for AI-related models.
 * Covers: AIChatMessage, FormAnalysis, Prediction, VoiceSession, GeneratedWorkout.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db'
import { BaseRepository } from './base.repository'

// ── AI Chat Repository ──────────────────────────────────────────────────────────

export class AiChatRepository extends BaseRepository<'AIChatMessage', any> {
  constructor() {
    super(db.aiChatMessage as any, 'AIChatMessage')
  }

  /**
   * Get recent chat history for a player (last N messages for context).
   */
  async getRecentHistory(playerId: string, limit = 20) {
    return db.aIChatMessage.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    })
  }

  /**
   * Save a new chat message.
   */
  async saveMessage(data: {
    playerId: string
    role: 'user' | 'assistant'
    content: string
  }) {
    return db.aIChatMessage.create({
      data: {
        playerId: data.playerId,
        role: data.role,
        content: data.content,
      },
    })
  }
}

// ── Form Analysis Repository ────────────────────────────────────────────────────

export class FormAnalysisRepository extends BaseRepository<'FormAnalysis', any> {
  constructor() {
    super(db.formAnalysis as any, 'FormAnalysis')
  }

  /**
   * Get form analysis history for a player.
   */
  async getHistory(playerId: string, params?: { cursor?: string; limit?: number }) {
    const { cursor, limit = 20 } = params ?? {}

    const where: any = { playerId }
    const cursorWhere = cursor
      ? { AND: [where, { id: { gt: cursor } }] }
      : where

    const analyses = await db.formAnalysis.findMany({
      where: cursorWhere,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    const hasMore = analyses.length > limit
    const pageAnalyses = hasMore ? analyses.slice(0, limit) : analyses
    const nextCursor = hasMore ? pageAnalyses[pageAnalyses.length - 1].id : null

    return { analyses: pageAnalyses, nextCursor, hasMore, count: pageAnalyses.length }
  }
}

// ── Prediction Repository ───────────────────────────────────────────────────────

export class PredictionRepository extends BaseRepository<'Prediction', any> {
  constructor() {
    super(db.prediction as any, 'Prediction')
  }

  /**
   * Get prediction history for a player.
   */
  async getHistory(playerId: string, params?: { cursor?: string; limit?: number }) {
    const { cursor, limit = 20 } = params ?? {}

    const where: any = { playerId }
    const cursorWhere = cursor
      ? { AND: [where, { id: { gt: cursor } }] }
      : where

    const predictions = await db.prediction.findMany({
      where: cursorWhere,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    const hasMore = predictions.length > limit
    const page = hasMore ? predictions.slice(0, limit) : predictions
    const nextCursor = hasMore ? page[page.length - 1].id : null

    return { predictions: page, nextCursor, hasMore, count: page.length }
  }
}

// ── Voice Session Repository ────────────────────────────────────────────────────

export class VoiceSessionRepository extends BaseRepository<'VoiceSession', any> {
  constructor() {
    super(db.voiceSession as any, 'VoiceSession')
  }
}

// ── Generated Workout Repository ────────────────────────────────────────────────

export class GeneratedWorkoutRepository extends BaseRepository<'GeneratedWorkout', any> {
  constructor() {
    super(db.generatedWorkout as any, 'GeneratedWorkout')
  }

  /**
   * Get saved/generated workouts for a player.
   */
  async getPlayerWorkouts(playerId: string, params?: { cursor?: string; limit?: number }) {
    const { cursor, limit = 20 } = params ?? {}

    const where: any = { playerId }
    const cursorWhere = cursor
      ? { AND: [where, { id: { gt: cursor } }] }
      : where

    const workouts = await db.generatedWorkout.findMany({
      where: cursorWhere,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    const hasMore = workouts.length > limit
    const page = hasMore ? workouts.slice(0, limit) : workouts
    const nextCursor = hasMore ? page[page.length - 1].id : null

    return { workouts: page, nextCursor, hasMore, count: page.length }
  }
}

// ── Singletons ──────────────────────────────────────────────────────────────────

export const aiChatRepository = new AiChatRepository()
export const formAnalysisRepository = new FormAnalysisRepository()
export const predictionRepository = new PredictionRepository()
export const voiceSessionRepository = new VoiceSessionRepository()
export const generatedWorkoutRepository = new GeneratedWorkoutRepository()