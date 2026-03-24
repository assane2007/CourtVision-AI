/**
 * V5 Dashboard API — The One-Call-Gets-All Endpoint
 *
 * GET  /api/dashboard          → Full V5 dashboard payload
 * GET  /api/dashboard/apex     → Apex Score only
 * GET  /api/dashboard/digest   → Weekly digest
 * GET  /api/dashboard/percentiles → Percentile rankings
 *
 * Conçu pour la performance : un seul appel = toutes les données
 * nécessaires pour le home screen de l'app mobile.
 */

import { FastifyInstance } from 'fastify'
import { V5Orchestrator } from '../services/v5Orchestrator'
import { ArenaService } from '../services/arena.service'
import { HorseService } from '../services/horse.service'
import { WearableService } from '../services/wearable.service'

export default async function dashboardRoutes(app: FastifyInstance) {

    // ── Legacy V4 Dashboard ────────────────────────────────────
    app.get('/', {
        preHandler: [app.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id
        if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

        try {
            const [{ data: topPlays }, { data: stats }] = await Promise.all([
                request.server.supabase.from('highlights').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(6),
                request.server.supabase.from('public_profiles').select('total_sessions, avg_shooting_pct, total_shots').eq('user_id', userId).single()
            ])
            const highlights = (topPlays || []).map((h: any) => ({
                id: h.id,
                url: h.video_url,
                thumbnail_url: h.thumbnail_url ?? null,
                label: h.label ?? `Match ${new Date(h.created_at).toLocaleDateString()}`
            }))
            return reply.send({
                success: true,
                data: {
                    stats,
                    highlights,
                },
                version: 'v4',
                generatedAt: new Date().toISOString(),
            })
        } catch (error: any) {
            request.log.error({ err: error }, '[Dashboard] Error building legacy dashboard')
            return reply.status(500).send({ error: 'Failed to build dashboard' })
        }
    })

    // ── Batch Init (Reduces 3 Mobile requests down to 1) ─────
    app.get('/init', {
        preHandler: [app.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id
        if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

        try {
            const since = new Date()
            since.setDate(since.getDate() - 6)

            // Execute all three primary home queries in parallel
            const [
                { data: profile },
                { data: weeklySessions },
                { data: highlightSessions }
            ] = await Promise.all([
                request.server.supabase.from('public_profiles').select('*').eq('user_id', userId).single(),
                request.server.supabase.from('sessions').select('created_at, analyses(shot_attempts, shot_made, mental_score)').eq('user_id', userId).eq('status', 'complete').gte('created_at', since.toISOString()).order('created_at', { ascending: true }),
                request.server.supabase.from('sessions').select('id, created_at, analyses(highlights)').eq('user_id', userId).eq('status', 'complete').order('created_at', { ascending: false }).limit(10)
            ])

            // Build Weekly Format
            const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
            const weeklyData = days.map((day, i) => {
                const d = new Date(since)
                d.setDate(d.getDate() + i)
                const dateStr = d.toISOString().slice(0, 10)
                const s = (weeklySessions ?? []).filter((s: any) => s.created_at.slice(0, 10) === dateStr)
                if (s.length === 0) return { day, mental: 0, shooting: 0, hasSession: false }
                const latest = s[s.length - 1] as any
                const analysis = Array.isArray(latest.analyses) ? latest.analyses[0] : latest.analyses
                const attempts = analysis?.shot_attempts ?? 0
                const made = analysis?.shot_made ?? 0
                return {
                    day,
                    mental: analysis?.mental_score ?? 0,
                    shooting: Math.round(attempts > 0 ? (made / attempts) * 100 : 0),
                    hasSession: true,
                }
            })

            // Build Highlights (Prioritize best highlights from last 10 sessions)
            const now = Date.now()
            const highlights = (highlightSessions ?? []).flatMap((session: any) => {
                const analysis = Array.isArray(session.analyses) ? session.analyses[0] : session.analyses
                const hs: any[] = analysis?.highlights ?? []
                
                // Pick the "best" highlight from this session (highest points or first labeled)
                const sortedHs = [...hs].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
                const topH = sortedHs[0]

                if (!topH) return []

                return [{
                    id: topH.id ?? session.id,
                    label: topH.label ?? `Match ${new Date(session.created_at).toLocaleDateString('fr')}`,
                    pts: topH.pts ?? `${topH.points ?? '--'} Pts`,
                    daysAgo: Math.round((now - new Date(session.created_at).getTime()) / 86_400_000),
                    thumbnail_url: topH.thumbnail_url ?? null,
                }]
            }).slice(0, 6)

            return reply.send({
                success: true,
                data: {
                    profile,
                    weeklyData,
                    highlights
                }
            })
        } catch (error: any) {
            request.log.error({ err: error }, '[Dashboard] Error fetching mobile init payload')
            return reply.status(500).send({ error: 'Failed to initialize app payload' })
        }
    })

    // ── Apex Score Only (lightweight) ────────────────────────
    app.get('/apex', {
        preHandler: [app.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id
        if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

        try {
            const apexScore = await V5Orchestrator.computeApexScore(userId)
            return reply.send({
                success: true,
                data: apexScore,
            })
        } catch (error: any) {
            request.log.error({ err: error }, '[Dashboard] Error computing apex score')
            return reply.status(500).send({ error: 'Failed to compute apex score' })
        }
    })

    // ── Weekly Digest ────────────────────────────────────────
    app.get('/digest', {
        preHandler: [app.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id
        if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

        try {
            const digest = await V5Orchestrator.generateWeeklyDigest(userId)
            return reply.send({
                success: true,
                data: digest,
            })
        } catch (error: any) {
            request.log.error({ err: error }, '[Dashboard] Error generating weekly digest')
            return reply.status(500).send({ error: 'Failed to generate weekly digest' })
        }
    })

    // ── Percentile Rankings ──────────────────────────────────
    app.get('/percentiles', {
        preHandler: [app.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id
        if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

        try {
            const percentiles = await V5Orchestrator.computePercentiles(userId)
            return reply.send({
                success: true,
                data: percentiles,
            })
        } catch (error: any) {
            request.log.error({ err: error }, '[Dashboard] Error computing percentiles')
            return reply.status(500).send({ error: 'Failed to compute percentiles' })
        }
    })

    // ── V6 Dashboard — Enriched with Arena, HORSE & Wearable ─
    app.get('/v6', {
        preHandler: [app.authenticate],
    }, async (request, reply) => {
        const userId = request.user?.id
        if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

        try {
            const arenaService = new ArenaService(app.supabase)
            const horseService = new HorseService(app.supabase)
            const wearableService = new WearableService(app.supabase)

            // Fire all queries in parallel for maximum speed
            const [v5Dashboard, arenaStats, horseStats, wearableReadiness, wearableDevice] = await Promise.allSettled([
                V5Orchestrator.buildDashboard(userId),
                arenaService.getPlayerStats(userId),
                horseService.getPlayerStats(userId),
                wearableService.getReadiness(userId),
                wearableService.getDevices(userId),
            ])

            const base = v5Dashboard.status === 'fulfilled' ? v5Dashboard.value : null

            const arena = arenaStats.status === 'fulfilled' && arenaStats.value.totalMatches > 0
                ? {
                    eloRating: arenaStats.value.eloRating,
                    wins: arenaStats.value.wins,
                    losses: arenaStats.value.losses,
                    winRate: arenaStats.value.winRate,
                    currentWinStreak: arenaStats.value.currentWinStreak,
                    rank: arenaStats.value.rank,
                }
                : null

            const horse = horseStats.status === 'fulfilled' && horseStats.value.totalGames > 0
                ? {
                    gamesPlayed: horseStats.value.totalGames,
                    gamesWon: horseStats.value.gamesWon,
                    winRate: horseStats.value.winRate,
                    bestScore: horseStats.value.bestScore,
                }
                : null

            const devices = wearableDevice.status === 'fulfilled' ? wearableDevice.value : []
            const hasActiveDevice = devices.some(d => d.isActive)
            const readiness = wearableReadiness.status === 'fulfilled' ? wearableReadiness.value : null

            const wearable = hasActiveDevice
                ? {
                    connected: true,
                    readinessScore: readiness?.score ?? null,
                    readinessGrade: readiness?.grade ?? null,
                    trainingIntensity: readiness?.trainingIntensity ?? null,
                    hrvCurrent: readiness?.hrvCurrent ?? null,
                    restingHR: readiness?.restingHRCurrent ?? null,
                }
                : { connected: false, readinessScore: null, readinessGrade: null, trainingIntensity: null, hrvCurrent: null, restingHR: null }

            return reply.send({
                success: true,
                data: {
                    ...base,
                    arena,
                    horse,
                    wearable,
                },
                version: 'v6-arena',
                generatedAt: new Date().toISOString(),
            })
        } catch (error: any) {
            request.log.error({ err: error }, '[Dashboard] Error building V6 dashboard')
            return reply.status(500).send({ error: 'Failed to build V6 dashboard' })
        }
    })
}
