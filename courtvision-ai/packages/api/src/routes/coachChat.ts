import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
    CoachChatEngine,
    type CoachChatMessage,
    type ConversationContext,
    type PlayerContext,
} from '@courtvision/ai'

/**
 * AI Coach Chat Routes — Coach IA Conversationnel
 *
 * Un vrai coach IA qui parle basketball, analyse les données du joueur,
 * propose des exercices, prépare les matchs, et motive.
 *
 * AUCUNE app de basket n'a ça. HomeCourt = 0 conversationnel.
 * Ici = coach personnel IA disponible 24/7.
 *
 * Inspiré par :
 * - ChatGPT (conversation naturelle)
 * - Apple Intelligence (contextualisation personnelle)
 * - Phil Jackson + Steve Kerr coaching wisdom
 *
 * Endpoints :
 * - POST /message             → Envoyer un message, recevoir la réponse du coach
 * - GET  /conversations       → Liste des conversations
 * - GET  /conversations/:id   → Historique d'une conversation
 * - POST /conversations       → Créer une nouvelle conversation
 * - DELETE /conversations/:id → Supprimer une conversation
 * - GET  /suggestions         → Suggestions contextuelles
 * - POST /film-room           → Analyse IA d'un highlight/session
 * - POST /pre-game            → Préparation mentale pré-match
 */

const messageSchema = z.object({
    conversationId: z.string().uuid(),
    message: z.string().min(1).max(2000),
    context: z.enum(['general', 'session_review', 'training', 'pre_game', 'film_room', 'technique']).default('general'),
    sessionId: z.string().uuid().optional(),
})

const newConversationSchema = z.object({
    title: z.string().max(100).optional(),
    context: z.enum(['general', 'session_review', 'training', 'pre_game', 'film_room', 'technique']).default('general'),
    sessionId: z.string().uuid().optional(),
    initialMessage: z.string().min(1).max(2000).optional(),
})

const filmRoomSchema = z.object({
    sessionId: z.string().uuid(),
    highlightIndex: z.number().min(0).optional(),
    question: z.string().max(500).optional(),
})

const preGameSchema = z.object({
    opponentName: z.string().optional(),
    matchType: z.enum(['league', 'pickup', 'tournament', 'practice']).default('pickup'),
    nervousLevel: z.number().min(1).max(10).default(5),
    goals: z.array(z.string()).optional(),
})

export default async function coachChatRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    // ==========================================
    // POST /message — Envoyer un message
    // ==========================================
    fastify.post('/message', async (request, reply) => {
        try {
            const user = request.user!
            const body = messageSchema.parse(request.body)

            // Vérifier que la conversation appartient au joueur
            const { data: conv, error: convError } = await fastify.supabase
                .from('coach_conversations')
                .select('id, context, messages')
                .eq('id', body.conversationId)
                .eq('user_id', user.id)
                .single()

            if (convError || !conv) {
                return reply.code(404).send({ error: 'Conversation not found' })
            }

            // Construire le contexte du joueur
            const playerContext = await buildPlayerContext(fastify, user.id)

            // Si session_review, enrichir avec les données de la session
            let sessionContext = ''
            if (body.sessionId) {
                sessionContext = await buildSessionContext(fastify, body.sessionId)
            }

            // Historique de la conversation
            const history: CoachChatMessage[] = conv.messages || []

            // Ajouter le message du joueur
            const userMessage: CoachChatMessage = {
                role: 'user',
                content: body.message,
            }
            history.push(userMessage)

            // Générer la réponse du coach
            const engine = new CoachChatEngine()
            const response = await engine.chat(
                history,
                playerContext,
                (body.context || conv.context) as ConversationContext,
                sessionContext,
            )

            // Ajouter la réponse à l'historique
            const assistantMessage: CoachChatMessage = {
                role: 'assistant',
                content: response.message,
                attachments: response.attachments,
                suggestedActions: response.suggestedActions,
            }
            history.push(assistantMessage)

            // Sauvegarder la conversation mise à jour
            await fastify.supabase.from('coach_conversations').update({
                messages: history,
                last_message_at: new Date().toISOString(),
                message_count: history.filter(m => m.role !== 'system').length,
            }).eq('id', body.conversationId)

            // Award XP pour engagement
            if (history.length <= 6) {
                await fastify.supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 3 })
            }

            return {
                data: {
                    message: response.message,
                    attachments: response.attachments,
                    suggestedActions: response.suggestedActions,
                    tokensUsed: response.tokensUsed,
                    model: response.model,
                }
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /conversations — Liste des conversations
    // ==========================================
    fastify.get('/conversations', async (request, reply) => {
        try {
            const user = request.user!
            const query = request.query as any
            const limit = Math.min(parseInt(query.limit) || 20, 50)

            const { data, error } = await fastify.supabase
                .from('coach_conversations')
                .select('id, title, context, message_count, last_message_at, created_at')
                .eq('user_id', user.id)
                .order('last_message_at', { ascending: false })
                .limit(limit)

            if (error) throw error

            return { data: data || [] }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /conversations/:id — Historique d'une conversation
    // ==========================================
    fastify.get('/conversations/:id', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = request.params as { id: string }

            const { data, error } = await fastify.supabase
                .from('coach_conversations')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single()

            if (error || !data) {
                return reply.code(404).send({ error: 'Conversation not found' })
            }

            return {
                data: {
                    id: data.id,
                    title: data.title,
                    context: data.context,
                    messages: (data.messages || []).filter((m: any) => m.role !== 'system'),
                    messageCount: data.message_count,
                    createdAt: data.created_at,
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /conversations — Nouvelle conversation
    // ==========================================
    fastify.post('/conversations', async (request, reply) => {
        try {
            const user = request.user!
            const body = newConversationSchema.parse(request.body)

            const messages: CoachChatMessage[] = []

            // Si un message initial est fourni, le traiter
            let response = null
            if (body.initialMessage) {
                messages.push({ role: 'user', content: body.initialMessage })

                const playerContext = await buildPlayerContext(fastify, user.id)
                let sessionContext = ''
                if (body.sessionId) {
                    sessionContext = await buildSessionContext(fastify, body.sessionId)
                }

                const engine = new CoachChatEngine()
                response = await engine.chat(
                    messages,
                    playerContext,
                    body.context as ConversationContext,
                    sessionContext,
                )

                messages.push({
                    role: 'assistant',
                    content: response.message,
                    attachments: response.attachments,
                    suggestedActions: response.suggestedActions,
                })
            }

            const title = body.title || generateTitle(body.context, body.initialMessage)

            const { data: conv, error } = await fastify.supabase
                .from('coach_conversations')
                .insert({
                    user_id: user.id,
                    title,
                    context: body.context,
                    session_id: body.sessionId,
                    messages,
                    message_count: messages.filter(m => m.role !== 'system').length,
                    last_message_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                })
                .select('id')
                .single()

            if (error) throw error

            return {
                data: {
                    conversationId: conv?.id,
                    title,
                    response: response ? {
                        message: response.message,
                        attachments: response.attachments,
                        suggestedActions: response.suggestedActions,
                    } : null,
                }
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // DELETE /conversations/:id
    // ==========================================
    fastify.delete('/conversations/:id', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = request.params as { id: string }

            const { error } = await fastify.supabase
                .from('coach_conversations')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id)

            if (error) throw error
            return { success: true }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /suggestions — Suggestions contextuelles
    // ==========================================
    fastify.get('/suggestions', async (request, reply) => {
        try {
            const user = request.user!

            // Récupérer le contexte pour personnaliser les suggestions
            const [lastSessionRes, twinRes, recoveryRes] = await Promise.all([
                fastify.supabase.from('sessions')
                    .select('type, analyses(shot_attempts, shot_made, mental_score)')
                    .eq('user_id', user.id).eq('status', 'complete')
                    .order('created_at', { ascending: false }).limit(1).single(),
                fastify.supabase.from('digital_twins')
                    .select('twin_profile').eq('user_id', user.id).single(),
                fastify.supabase.from('recovery_logs')
                    .select('overall_score').eq('user_id', user.id)
                    .order('logged_at', { ascending: false }).limit(1).single(),
            ])

            const suggestions = []

            // Suggestion basée sur la dernière session
            const lastAnalysis = lastSessionRes.data?.analyses
            const analysis = Array.isArray(lastAnalysis) ? lastAnalysis[0] : lastAnalysis
            if (analysis) {
                const fgPct = analysis.shot_attempts > 0
                    ? Math.round((analysis.shot_made / analysis.shot_attempts) * 100)
                    : 0
                if (fgPct < 40) {
                    suggestions.push({
                        emoji: '🎯',
                        text: 'Review my last session — my shooting was off',
                        context: 'session_review' as const,
                    })
                }
                if ((analysis.mental_score ?? 100) < 60) {
                    suggestions.push({
                        emoji: '🧠',
                        text: 'Help me work on my mental game',
                        context: 'technique' as const,
                    })
                }
            }

            // Suggestion de préparation
            suggestions.push({
                emoji: '🏀',
                text: 'Prepare me for my next game',
                context: 'pre_game' as const,
            })

            // Suggestion d'entraînement
            suggestions.push({
                emoji: '💪',
                text: 'What should I work on today?',
                context: 'training' as const,
            })

            // Suggestion technique
            const twin = twinRes.data?.twin_profile
            if (twin?.weaknesses?.length > 0) {
                const weakness = twin.weaknesses[0]
                suggestions.push({
                    emoji: '🔧',
                    text: `How can I improve my ${weakness.label || 'weak areas'}?`,
                    context: 'technique' as const,
                })
            }

            // Récupération
            const recovery = recoveryRes.data
            if (recovery && recovery.overall_score < 60) {
                suggestions.push({
                    emoji: '🧘',
                    text: 'I feel tired — should I rest or train light?',
                    context: 'training' as const,
                })
            }

            return {
                data: suggestions.slice(0, 6)
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /film-room — Analyse IA d'un highlight
    // ==========================================
    fastify.post('/film-room', async (request, reply) => {
        try {
            const user = request.user!
            const body = filmRoomSchema.parse(request.body)

            // Récupérer les données de la session
            const { data: analysis } = await fastify.supabase
                .from('analyses')
                .select('*')
                .eq('session_id', body.sessionId)
                .single()

            if (!analysis) {
                return reply.code(404).send({ error: 'Session analysis not found' })
            }

            const playerContext = await buildPlayerContext(fastify, user.id)
            const sessionContext = await buildSessionContext(fastify, body.sessionId)

            const question = body.question || 'Break down this session for me — what did I do well and what needs work?'

            const engine = new CoachChatEngine()
            const response = await engine.chat(
                [{ role: 'user', content: question }],
                playerContext,
                'film_room',
                sessionContext,
            )

            // Auto-create a film room conversation
            await fastify.supabase.from('coach_conversations').insert({
                user_id: user.id,
                title: `Film Room: Session ${body.sessionId.slice(0, 8)}`,
                context: 'film_room',
                session_id: body.sessionId,
                messages: [
                    { role: 'user', content: question },
                    { role: 'assistant', content: response.message, attachments: response.attachments, suggestedActions: response.suggestedActions },
                ],
                message_count: 2,
                last_message_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            })

            return {
                data: {
                    message: response.message,
                    attachments: response.attachments,
                    suggestedActions: response.suggestedActions,
                }
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /pre-game — Préparation mentale
    // ==========================================
    fastify.post('/pre-game', async (request, reply) => {
        try {
            const user = request.user!
            const body = preGameSchema.parse(request.body)

            const playerContext = await buildPlayerContext(fastify, user.id)

            const prompt = buildPreGamePrompt(body, playerContext)

            const engine = new CoachChatEngine()
            const response = await engine.chat(
                [{ role: 'user', content: prompt }],
                playerContext,
                'pre_game',
            )

            // Sauvegarder comme conversation
            await fastify.supabase.from('coach_conversations').insert({
                user_id: user.id,
                title: body.opponentName ? `Pre-Game: vs ${body.opponentName}` : 'Pre-Game Prep',
                context: 'pre_game',
                messages: [
                    { role: 'user', content: prompt },
                    { role: 'assistant', content: response.message, attachments: response.attachments },
                ],
                message_count: 2,
                last_message_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            })

            return {
                data: {
                    message: response.message,
                    attachments: response.attachments,
                    suggestedActions: response.suggestedActions,
                },
                message: "You're locked in 🔒"
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })
}

// ==========================================
// Helpers
// ==========================================

async function buildPlayerContext(fastify: FastifyInstance, userId: string): Promise<PlayerContext> {
    const [userRes, twinRes, dnaRes, sessionsRes] = await Promise.all([
        fastify.supabase.from('users').select('username, position').eq('id', userId).single(),
        fastify.supabase.from('digital_twins').select('twin_profile').eq('user_id', userId).single(),
        fastify.supabase.from('shot_dna_profiles').select('profile').eq('user_id', userId).single(),
        fastify.supabase.from('sessions')
            .select('created_at, type, analyses(shot_attempts, shot_made, mental_score)')
            .eq('user_id', userId).eq('status', 'complete')
            .order('created_at', { ascending: false }).limit(5),
    ])

    const twin = twinRes.data?.twin_profile
    const dna = dnaRes.data?.profile

    const recentSessions = (sessionsRes.data || []).map((s: any) => {
        const a = Array.isArray(s.analyses) ? s.analyses[0] : s.analyses
        const att = a?.shot_attempts ?? 0
        const made = a?.shot_made ?? 0
        return {
            date: s.created_at,
            type: s.type,
            fgPct: att > 0 ? Math.round((made / att) * 100) : 0,
            mentalScore: a?.mental_score ?? 50,
            shotsAttempted: att,
        }
    })

    return {
        username: userRes.data?.username || 'Player',
        position: userRes.data?.position ?? twin?.position,
        overallRating: twin?.overallRating,
        playStyle: twin?.playStyle?.primary,
        strengths: twin?.strengths?.map((s: any) => s.label) ?? [],
        weaknesses: twin?.weaknesses?.map((w: any) => w.label) ?? [],
        recentSessions,
        mentalProfile: twin?.mentalProfile ? {
            resilience: twin.mentalProfile.resilience,
            clutchFactor: twin.mentalProfile.clutchFactor,
            pressureResponse: twin.mentalProfile.pressureResponse,
        } : undefined,
        shotDNA: dna ? {
            purityScore: dna.purityScore,
            closestNBA: dna.closestNBAPlayer,
            avgShotQuality: dna.avgShotQuality,
        } : undefined,
    }
}

async function buildSessionContext(fastify: FastifyInstance, sessionId: string): Promise<string> {
    const { data } = await fastify.supabase
        .from('analyses')
        .select('*')
        .eq('session_id', sessionId)
        .single()

    if (!data) return ''

    const att = data.shot_attempts ?? 0
    const made = data.shot_made ?? 0
    const fgPct = att > 0 ? Math.round((made / att) * 100) : 0

    const parts = [
        `Session data: ${att} shots attempted, ${made} made (${fgPct}% FG)`,
        `Mental score: ${data.mental_score ?? 'N/A'}`,
    ]

    if (data.ai_report) {
        try {
            const report = typeof data.ai_report === 'string' ? JSON.parse(data.ai_report) : data.ai_report
            if (report.text) parts.push(`AI Report: ${report.text.slice(0, 500)}`)
        } catch { /* ignore */ }
    }

    if (data.body_language) {
        const bl = data.body_language
        if (bl.fatigueIndex) parts.push(`Fatigue index: ${bl.fatigueIndex}`)
        if (bl.bodyLanguageScore) parts.push(`Body language score: ${bl.bodyLanguageScore}`)
    }

    return parts.join('\n')
}

function generateTitle(context: string, message?: string): string {
    const contextTitles: Record<string, string> = {
        general: 'Chat with Coach V',
        session_review: 'Session Review',
        training: 'Training Questions',
        pre_game: 'Pre-Game Prep',
        film_room: 'Film Room',
        technique: 'Technique Work',
    }

    if (message && message.length > 0) {
        return message.slice(0, 50) + (message.length > 50 ? '…' : '')
    }
    return contextTitles[context] || 'New Chat'
}

function buildPreGamePrompt(body: any, player: PlayerContext): string {
    let prompt = 'I have a game coming up.'
    if (body.opponentName) prompt += ` I'm playing against ${body.opponentName}.`
    prompt += ` It's a ${body.matchType} game.`
    if (body.nervousLevel >= 7) prompt += ` I'm pretty nervous (${body.nervousLevel}/10).`
    else if (body.nervousLevel <= 3) prompt += ` I'm feeling confident.`
    if (body.goals?.length > 0) prompt += ` My goals: ${body.goals.join(', ')}.`
    prompt += ' Give me a full pre-game mental prep routine, tactical advice based on my strengths, and a pump-up message.'
    return prompt
}
