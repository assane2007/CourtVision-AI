/**
 * Coaching Service
 * AI coaching conversation pipeline with full player context awareness.
 * Orchestrates: context loading → history loading → prompt building → LLM call → DB storage.
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError, ErrorCode } from '@/lib/middleware/error-handler';
import { checkAndTrack } from '../rate-limiter';
import { chat, trimHistory } from '../providers/language.provider';
import {
  getCoachSystemPrompt,
  getPositionalPrompt,
  getSkillAnalysisPrompt,
  getMotivationalPrompt,
  SECURITY_GUARD_FR,
  SECURITY_GUARD_EN,
} from '../prompts/coaching-prompts';
import { classifyArchetype, detectWeaknesses, type SkillKey } from '@/lib/player/iq-engine';
import type { CoachingContext, CoachingResult, ChatMessage, SubscriptionTier, Lang } from '../types';

// ── Main Coaching Pipeline ─────────────────────────────────────────────────────

/**
 * Send a message to the AI coach and get a response.
 * Full pipeline: context → history → prompt → LLM → save → return.
 */
export async function coachReply(
  playerId: string,
  message: string,
  tier: SubscriptionTier = 'free',
  playerLang?: string,
): Promise<CoachingResult> {
  const lang: Lang = (playerLang === 'en' ? 'en' : 'fr')

  // 1. Validate input
  if (!message || message.trim().length === 0) {
    throw new AppError(ErrorCode.MISSING_REQUIRED_FIELD, 'Message requis')
  }
  if (message.length > 2000) {
    throw new AppError(ErrorCode.INVALID_PARAMS, 'Message trop long (max 2000 caractères)')
  }

  // 2. Check rate limit
  const rateResult = await checkAndTrack(playerId, 'coaching', tier)
  if (!rateResult.allowed) {
    throw new AppError(
      ErrorCode.RATE_LIMITED,
      lang === 'fr'
        ? `Trop de messages. Réessayez dans ${Math.ceil(rateResult.retryAfterMs / 60000)} min.`
        : `Too many messages. Try again in ${Math.ceil(rateResult.retryAfterMs / 60000)} min.`,
    )
  }

  // 3. Load player context in parallel
  const [player, recentSessions, chatHistory] = await Promise.all([
    loadPlayerProfile(playerId),
    loadRecentSessions(playerId, 5),
    loadChatHistory(playerId, 20),
  ])

  if (!player) {
    throw new AppError(ErrorCode.PLAYER_NOT_FOUND, 'Joueur non trouvé')
  }

  // 4. Build coaching context
  const context = buildCoachingContext(player, recentSessions, lang)

  // 5. Build system prompt with full context
  let systemPrompt = getCoachSystemPrompt(context)
  systemPrompt += getPositionalPrompt(player.position || 'guard', lang)
  systemPrompt += getSkillAnalysisPrompt(context.skills.strengths, context.skills.weaknesses, lang)
  systemPrompt += getMotivationalPrompt(context.stats.currentStreak, player.xpLevel, lang)
  systemPrompt += '\n\n' + (lang === 'fr' ? SECURITY_GUARD_FR : SECURITY_GUARD_EN)

  // 6. Build messages array
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    // Add conversation history (already in chronological order from DB)
    ...trimHistory(chatHistory, 20),
    { role: 'user', content: message.trim() },
  ]

  // 7. Call language provider
  let reply: string
  let tokensUsed: CoachingResult['tokensUsed']
  try {
    const result = await chat(messages, {
      model: 'gpt-4o-mini',
      temperature: 0.8,
      maxTokens: 500,
    })
    reply = result.content
    tokensUsed = result.tokenUsage
  } catch (err) {
    logger.error('Coaching LLM call failed', 'ai.coaching', {
      playerId,
      error: err instanceof Error ? err.message : String(err),
    })
    throw new AppError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      lang === 'fr' ? 'Erreur du coach IA. Réessayez.' : 'AI coach error. Try again.',
    )
  }

  // 8. Save both messages to DB
  try {
    await Promise.all([
      db.aIChatMessage.create({
        data: { playerId, role: 'user', content: message.trim() },
      }),
      db.aIChatMessage.create({
        data: { playerId, role: 'assistant', content: reply },
      }),
    ])
  } catch (dbErr) {
    logger.error('Failed to save coaching messages', 'ai.coaching', {
      playerId,
      error: dbErr instanceof Error ? dbErr.message : String(dbErr),
    })
  }

  logger.info(
    `Coaching reply: player=${playerId}, msg_len=${message.length}, reply_len=${reply.length}, tokens=${tokensUsed?.totalTokens ?? 0}`,
    'ai.coaching',
  )

  return { reply, tokensUsed }
}

// ── Get Coaching Context (for external use) ─────────────────────────────────────

/**
 * Load and build the full coaching context for a player.
 * Can be used by other services that need player context.
 */
export async function getCoachingContext(playerId: string, lang: Lang = 'fr'): Promise<CoachingContext> {
  const [player, recentSessions] = await Promise.all([
    loadPlayerProfile(playerId),
    loadRecentSessions(playerId, 10),
  ])

  if (!player) {
    throw new AppError(ErrorCode.PLAYER_NOT_FOUND, 'Joueur non trouvé')
  }

  return buildCoachingContext(player, recentSessions, lang)
}

// ── Data Loading ────────────────────────────────────────────────────────────────

async function loadPlayerProfile(playerId: string) {
  return db.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      name: true,
      position: true,
      level: true,
      xpLevel: true,
      xp: true,
      goals: true,
      createdAt: true,
      // Skill DNA
      shooting: true,
      handling: true,
      finishing: true,
      defense: true,
      iq: true,
      // Gamification
      currentStreak: true,
    },
  })
}

async function loadRecentSessions(playerId: string, limit: number) {
  return db.workoutSession.findMany({
    where: { playerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      totalScore: true,
      totalDrills: true,
      totalDurationSec: true,
      createdAt: true,
    },
  })
}

async function loadChatHistory(playerId: string, limit: number): Promise<ChatMessage[]> {
  const messages = await db.aIChatMessage.findMany({
    where: { playerId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      role: true,
      content: true,
    },
  })

  return messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
}

// ── Context Building ────────────────────────────────────────────────────────────

function buildCoachingContext(
  player: NonNullable<Awaited<ReturnType<typeof loadPlayerProfile>>>,
  recentSessions: Awaited<ReturnType<typeof loadRecentSessions>>,
  lang: Lang,
): CoachingContext {
  const skillDNA: Record<SkillKey, number> = {
    shooting: player.shooting,
    handling: player.handling,
    finishing: player.finishing,
    defense: player.defense,
    iq: player.iq,
  }

  const archetype = classifyArchetype(skillDNA)
  const weaknesses = detectWeaknesses(skillDNA)

  const sessionScores = recentSessions.map((s) => s.totalScore)
  const avgScore = sessionScores.length > 0
    ? Math.round(sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length)
    : 0

  return {
    playerProfile: {
      name: player.name,
      age: null, // Not stored in current schema
      position: player.position,
      heightCm: null,
      weightKg: null,
      yearsExperience: player.createdAt
        ? Math.round((Date.now() - player.createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null,
      level: player.level,
      xpLevel: player.xpLevel,
      goals: player.goals,
    },
    recentSessions: recentSessions.map((s) => ({
      date: s.createdAt.toISOString(),
      score: s.totalScore,
      drills: s.totalDrills,
      durationMin: Math.round((s.totalDurationSec ?? 0) / 60),
    })),
    stats: {
      skillDNA,
      totalSessions: recentSessions.length, // Approximate from recent data
      avgScore,
      currentStreak: player.currentStreak,
      totalXP: player.xp,
    },
    skills: {
      strengths: archetype.strengths,
      weaknesses: weaknesses.map((w) => w.skill),
    },
    lang,
  }
}
function coachingService(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: coachingService is not implemented yet.', args);
  return null;
}

export default coachingService;