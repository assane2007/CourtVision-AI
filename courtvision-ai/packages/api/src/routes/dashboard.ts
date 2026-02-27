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

export default async function dashboardRoutes(app: FastifyInstance) {

    // ── Full V5 Dashboard ────────────────────────────────────
    app.get('/', {
        preHandler: [app.authenticate],
    }, async (request, reply) => {
        const userId = (request as any).userId
        if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

        try {
            const dashboard = await V5Orchestrator.buildDashboard(userId)
            return reply.send({
                success: true,
                data: dashboard,
                version: 'v5-apex',
                generatedAt: new Date().toISOString(),
            })
        } catch (error: any) {
            console.error('[Dashboard] Error:', error)
            return reply.status(500).send({ error: 'Failed to build dashboard', details: error.message })
        }
    })

    // ── Apex Score Only (lightweight) ────────────────────────
    app.get('/apex', {
        preHandler: [app.authenticate],
    }, async (request, reply) => {
        const userId = (request as any).userId
        if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

        try {
            const apexScore = await V5Orchestrator.computeApexScore(userId)
            return reply.send({
                success: true,
                data: apexScore,
            })
        } catch (error: any) {
            return reply.status(500).send({ error: 'Failed to compute apex score' })
        }
    })

    // ── Weekly Digest ────────────────────────────────────────
    app.get('/digest', {
        preHandler: [app.authenticate],
    }, async (request, reply) => {
        const userId = (request as any).userId
        if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

        try {
            const digest = await V5Orchestrator.generateWeeklyDigest(userId)
            return reply.send({
                success: true,
                data: digest,
            })
        } catch (error: any) {
            return reply.status(500).send({ error: 'Failed to generate weekly digest' })
        }
    })

    // ── Percentile Rankings ──────────────────────────────────
    app.get('/percentiles', {
        preHandler: [app.authenticate],
    }, async (request, reply) => {
        const userId = (request as any).userId
        if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

        try {
            const percentiles = await V5Orchestrator.computePercentiles(userId)
            return reply.send({
                success: true,
                data: percentiles,
            })
        } catch (error: any) {
            return reply.status(500).send({ error: 'Failed to compute percentiles' })
        }
    })
}
