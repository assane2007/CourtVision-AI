import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { TwinProfile } from '@courtvision/ai'

// ==========================================
// Schemas
// ==========================================

const shareCardSchema = z.object({
    type: z.enum(['twin_card', 'highlight_reel', 'session_recap', 'badge', 'challenge_win']),
    format: z.enum(['image', 'video', 'link']).default('link'),
    platform: z.enum(['tiktok', 'instagram', 'twitter', 'generic']).default('generic'),
    sessionId: z.string().uuid().optional(),
    badgeSlug: z.string().optional(),
    challengeId: z.string().uuid().optional(),
    customMessage: z.string().max(280).optional(),
})

const getCardSchema = z.object({
    shareId: z.string()
})

// ==========================================
// Helpers — Génération de contenu partageable
// ==========================================

/**
 * Génère le JSON d'une Twin Card (statique, rendu côté client).
 * La card contient toutes les données nécessaires pour un rendu visuel.
 */
function buildTwinCardData(profile: TwinProfile, user: any): TwinCardData {
    const topCategory = [...(profile.attributeCategories || [])]
        .sort((a, b) => b.overallScore - a.overallScore)[0]

    const topNBA = profile.nbaComparisons?.[0] ?? null

    return {
        // Identity
        username: user.username,
        fullName: user.full_name ?? user.username,
        avatarUrl: user.avatar_url ?? null,
        position: user.position ?? null,

        // Core stats
        overallRating: profile.overallRating,
        playStyle: profile.playStyle.primary,
        playStyleLabel: formatPlayStyle(profile.playStyle.primary),
        playStyleDescription: profile.playStyle.description,
        nbaArchetype: profile.playStyle.nbaArchetype,

        // Top category
        topCategoryName: topCategory?.category ?? 'N/A',
        topCategoryEmoji: topCategory?.emoji ?? '🏀',
        topCategoryScore: topCategory?.overallScore ?? 0,

        // NBA comparison
        nbaCompPlayer: topNBA?.playerName ?? null,
        nbaCompSimilarity: topNBA?.similarity ?? 0,
        nbaCompTraits: topNBA?.matchingTraits ?? [],

        // Key attributes (top 4)
        keyAttributes: extractTopAttributes(profile, 4),

        // Mental
        mentalResilience: profile.mentalProfile.resilience,
        clutchFactor: profile.mentalProfile.clutchFactor,
        pressureResponse: profile.mentalProfile.pressureResponse,

        // Strengths
        strengths: profile.strengths.slice(0, 3).map((s: any) => s.label),
        weaknesses: profile.weaknesses.slice(0, 2).map((w: any) => w.label),

        // Meta
        modelVersion: profile.modelVersion,
        sessionCount: profile.sessionCount,
        generatedAt: new Date().toISOString(),
    }
}

function formatPlayStyle(style: string): string {
    const map: Record<string, string> = {
        sharpshooter: 'Sharpshooter',
        shot_creator: 'Shot Creator',
        slasher: 'Slasher',
        playmaker: 'Playmaker',
        two_way: 'Two-Way',
        stretch_big: 'Stretch Big',
        paint_beast: 'Paint Beast',
        balanced: 'Balanced',
    }
    return map[style] ?? style
}

function extractTopAttributes(profile: TwinProfile, count: number): { name: string; value: number; emoji: string }[] {
    const all: { name: string; value: number; emoji: string }[] = []
    for (const cat of profile.attributeCategories ?? []) {
        for (const attr of cat.attributes ?? []) {
            all.push({ name: attr.name, value: attr.value, emoji: cat.emoji })
        }
    }
    return all.sort((a, b) => b.value - a.value).slice(0, count)
}

/**
 * Génère un caption/message optimisé pour chaque plateforme.
 */
function generateShareCaption(
    cardData: TwinCardData,
    platform: string,
    customMessage?: string
): string {
    const base = customMessage
        ? customMessage
        : `Mon Digital Twin est noté ${cardData.overallRating}/100 🏀`

    const hashtags = '#CourtVisionAI #Basketball #DigitalTwin #HoopDreams'
    const cta = 'Crée le tien 👉 courtvision.ai'

    switch (platform) {
        case 'tiktok':
            return `${base} | Style : ${cardData.playStyleLabel} ${getPlayStyleEmoji(cardData.playStyle)} | ${hashtags} | ${cta}`
        case 'instagram':
            return `${base}\n\n🎯 Style : ${cardData.playStyleLabel}\n🏆 Top stat : ${cardData.topCategoryEmoji} ${cardData.topCategoryName} (${cardData.topCategoryScore})\n${cardData.nbaCompPlayer ? `🏀 Comparable à : ${cardData.nbaCompPlayer}` : ''}\n\n${hashtags}\n\n${cta}`
        case 'twitter':
            return `${base} | ${cardData.playStyleLabel} ${getPlayStyleEmoji(cardData.playStyle)} | ${cardData.nbaCompPlayer ? `Comparable à ${cardData.nbaCompPlayer}` : ''} | ${cta}`
        default:
            return `${base}\n\nStyle : ${cardData.playStyleLabel}\n${cta}`
    }
}

function getPlayStyleEmoji(style: string): string {
    const map: Record<string, string> = {
        sharpshooter: '🎯',
        shot_creator: '🪄',
        slasher: '⚡',
        playmaker: '🧠',
        two_way: '🛡️',
        stretch_big: '🏗️',
        paint_beast: '💥',
        balanced: '♾️',
    }
    return map[style] ?? '🏀'
}

/**
 * Génère les données d'un recap de session partageable.
 */
function buildSessionRecapData(analysis: any, session: any, user: any): SessionRecapData {
    const shotPct = analysis.shot_attempts > 0
        ? Math.round((analysis.shot_made / analysis.shot_attempts) * 100)
        : 0

    return {
        username: user.username,
        avatarUrl: user.avatar_url ?? null,
        sessionType: session.type,
        date: session.created_at,
        duration: session.duration_sec ?? 0,
        shotAttempts: analysis.shot_attempts,
        shotMade: analysis.shot_made,
        shootingPct: shotPct,
        mentalScore: analysis.mental_score ?? 0,
        highlights: analysis.highlights?.clips?.length ?? 0,
        aiInsight: analysis.ai_report?.slice(0, 120) ?? null,
        generatedAt: new Date().toISOString(),
    }
}

// ==========================================
// Types
// ==========================================

export interface TwinCardData {
    username: string
    fullName: string
    avatarUrl: string | null
    position: string | null
    overallRating: number
    playStyle: string
    playStyleLabel: string
    playStyleDescription: string
    nbaArchetype: string
    topCategoryName: string
    topCategoryEmoji: string
    topCategoryScore: number
    nbaCompPlayer: string | null
    nbaCompSimilarity: number
    nbaCompTraits: string[]
    keyAttributes: { name: string; value: number; emoji: string }[]
    mentalResilience: number
    clutchFactor: number
    pressureResponse: string
    strengths: string[]
    weaknesses: string[]
    modelVersion: string
    sessionCount: number
    generatedAt: string
}

export interface SessionRecapData {
    username: string
    avatarUrl: string | null
    sessionType: string
    date: string
    duration: number
    shotAttempts: number
    shotMade: number
    shootingPct: number
    mentalScore: number
    highlights: number
    aiInsight: string | null
    generatedAt: string
}

// ==========================================
// Routes
// ==========================================

/**
 * Viral Sharing Routes — Partage de Twin Cards, highlights et recaps.
 *
 * Endpoints :
 * - POST /generate       → Générer un lien/card partageable
 * - GET  /card/:shareId  → Récupérer les données d'une card partagée (public)
 * - GET  /my-shares      → Historique de mes partages
 * - POST /track-view     → Tracker une vue de card partagée (analytics)
 */
export default async function shareRoutes(fastify: FastifyInstance) {

    // ──────────────────────────────────
    // POST /api/share/generate — Créer un partage
    // ──────────────────────────────────
    fastify.post('/generate', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!
            const body = shareCardSchema.parse(request.body)

            let cardData: any = null
            let caption = ''
            let shareUrl = ''

            // ── Twin Card ──
            if (body.type === 'twin_card') {
                const { data: twin, error } = await fastify.supabase
                    .from('digital_twins')
                    .select('twin_profile')
                    .eq('user_id', user.id)
                    .single()

                if (error || !twin?.twin_profile) {
                    return reply.code(404).send({ error: 'Digital Twin non trouvé. Analyse au moins une session.' })
                }

                const { data: userData } = await fastify.supabase
                    .from('users')
                    .select('username, full_name, avatar_url, position')
                    .eq('id', user.id)
                    .single()

                const profile = twin.twin_profile as TwinProfile
                cardData = buildTwinCardData(profile, { ...userData, id: user.id })
                caption = generateShareCaption(cardData, body.platform, body.customMessage)
            }

            // ── Session Recap ──
            else if (body.type === 'session_recap' && body.sessionId) {
                const { data: session } = await fastify.supabase
                    .from('sessions')
                    .select('*')
                    .eq('id', body.sessionId)
                    .eq('user_id', user.id)
                    .single()

                if (!session) {
                    return reply.code(404).send({ error: 'Session non trouvée' })
                }

                const { data: analysis } = await fastify.supabase
                    .from('analyses')
                    .select('*')
                    .eq('session_id', body.sessionId)
                    .single()

                const { data: userData } = await fastify.supabase
                    .from('users')
                    .select('username, avatar_url')
                    .eq('id', user.id)
                    .single()

                cardData = buildSessionRecapData(analysis ?? {}, session, userData ?? { username: 'Player' })
                caption = body.customMessage ?? `Session ${session.type} terminée ! ${analysis?.shot_made ?? 0}/${analysis?.shot_attempts ?? 0} tirs 🎯 #CourtVisionAI`
            }

            // ── Highlight Reel ──
            else if (body.type === 'highlight_reel' && body.sessionId) {
                const { data: analysis } = await fastify.supabase
                    .from('analyses')
                    .select('highlights')
                    .eq('session_id', body.sessionId)
                    .single()

                if (!analysis?.highlights) {
                    return reply.code(404).send({ error: 'Aucun highlight trouvé pour cette session' })
                }

                cardData = {
                    type: 'highlight_reel',
                    sessionId: body.sessionId,
                    highlights: analysis.highlights,
                }
                caption = body.customMessage ?? 'Mes meilleurs moments 🏀🔥 #CourtVisionAI #Highlights'
            }

            // ── Badge ──
            else if (body.type === 'badge' && body.badgeSlug) {
                const { data: badge } = await fastify.supabase
                    .from('badges')
                    .select('*')
                    .eq('slug', body.badgeSlug)
                    .single()

                if (!badge) {
                    return reply.code(404).send({ error: 'Badge non trouvé' })
                }

                const { data: userData } = await fastify.supabase
                    .from('users')
                    .select('username')
                    .eq('id', user.id)
                    .single()

                cardData = {
                    type: 'badge',
                    badge,
                    username: userData?.username ?? 'Player',
                }
                caption = body.customMessage ?? `${badge.emoji} Je viens de débloquer le badge "${badge.name}" ! #CourtVisionAI`
            }

            // ── Challenge Win ──
            else if (body.type === 'challenge_win' && body.challengeId) {
                const { data: challenge } = await fastify.supabase
                    .from('community_challenges')
                    .select('*')
                    .eq('id', body.challengeId)
                    .single()

                if (!challenge) {
                    return reply.code(404).send({ error: 'Défi non trouvé' })
                }

                const { data: userData } = await fastify.supabase
                    .from('users')
                    .select('username')
                    .eq('id', user.id)
                    .single()

                cardData = {
                    type: 'challenge_win',
                    challenge,
                    username: userData?.username ?? 'Player',
                }
                caption = body.customMessage ?? `🏆 J'ai gagné le défi "${challenge.title}" ! #CourtVisionAI`
            }

            if (!cardData) {
                return reply.code(400).send({ error: 'Type de partage invalide ou données manquantes' })
            }

            // Générer un share ID unique
            const shareId = generateShareId()

            // Sauvegarder dans la DB
            const { data: share, error: shareError } = await fastify.supabase
                .from('shared_cards')
                .insert({
                    share_id: shareId,
                    user_id: user.id,
                    type: body.type,
                    platform: body.platform,
                    card_data: cardData,
                    caption,
                    views_count: 0,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single()

            if (shareError) throw shareError

            // URL publique de la card
            shareUrl = `https://courtvision.ai/s/${shareId}`

            // Enregistrer dans le feed d'activité
            await fastify.supabase
                .from('activity_feed')
                .insert({
                    user_id: user.id,
                    type: 'highlight_shared',
                    title: `A partagé ${body.type === 'twin_card' ? 'sa Twin Card' : body.type === 'session_recap' ? 'un récap de session' : body.type === 'badge' ? 'un badge' : 'du contenu'}`,
                    metadata: { share_id: shareId, type: body.type, platform: body.platform },
                })

            // XP bonus pour partage
            await addShareXp(fastify, user.id)

            return {
                data: {
                    shareId,
                    shareUrl,
                    caption,
                    cardData,
                    platform: body.platform,
                    deepLink: `courtvision://share/${shareId}`,
                }
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // GET /api/share/card/:shareId — Vue publique d'une card partagée
    // ──────────────────────────────────
    fastify.get('/card/:shareId', async (request, reply) => {
        try {
            const { shareId } = request.params as { shareId: string }

            const { data: share, error } = await fastify.supabase
                .from('shared_cards')
                .select('*')
                .eq('share_id', shareId)
                .single()

            if (error || !share) {
                return reply.code(404).send({ error: 'Card non trouvée' })
            }

            // Atomic increment — avoids read-then-write race condition
            const { data: newCount } = await fastify.supabase
                .rpc('increment_views_count', { card_share_id: shareId })

            return {
                data: {
                    shareId: share.share_id,
                    type: share.type,
                    cardData: share.card_data,
                    caption: share.caption,
                    viewsCount: newCount ?? (share.views_count || 0) + 1,
                    createdAt: share.created_at,
                    downloadUrl: `https://courtvision.ai/s/${shareId}`,
                    ctaUrl: 'https://courtvision.ai',
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // GET /api/share/my-shares — Historique de mes partages
    // ──────────────────────────────────
    fastify.get('/my-shares', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!
            const query = request.query as any
            const limit = Math.min(parseInt(query.limit) || 20, 50)

            const { data, error } = await fastify.supabase
                .from('shared_cards')
                .select('share_id, type, platform, caption, views_count, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error

            return {
                data: (data || []).map((s: any) => ({
                    shareId: s.share_id,
                    type: s.type,
                    platform: s.platform,
                    caption: s.caption,
                    viewsCount: s.views_count,
                    createdAt: s.created_at,
                    shareUrl: `https://courtvision.ai/s/${s.share_id}`,
                }))
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // POST /api/share/track-view — Analytics de visibilité
    // ──────────────────────────────────
    fastify.post('/track-view', async (request, reply) => {
        try {
            const body = getCardSchema.parse(request.body)

            const { data: card } = await fastify.supabase
                .from('shared_cards')
                .select('views_count')
                .eq('share_id', body.shareId)
                .single()

            if (card) {
                // Atomic increment — avoids read-then-write race condition
                await fastify.supabase
                    .rpc('increment_views_count', { card_share_id: body.shareId })
            }

            return { success: true }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })
}

// ==========================================
// Helpers
// ==========================================

function generateShareId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let id = ''
    for (let i = 0; i < 10; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return id
}

async function addShareXp(fastify: FastifyInstance, userId: string) {
    try {
        const XP_FOR_SHARE = 10
        const { data: profile } = await fastify.supabase
            .from('public_profiles')
            .select('xp, level')
            .eq('user_id', userId)
            .single()

        if (profile) {
            const newXp = (profile.xp || 0) + XP_FOR_SHARE
            const newLevel = Math.floor(newXp / 100) + 1

            await fastify.supabase
                .from('public_profiles')
                .update({ xp: newXp, level: newLevel })
                .eq('user_id', userId)
        }
    } catch {
        // Non-blocking
    }
}
