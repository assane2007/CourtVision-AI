import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PdfReportService } from '../services/pdfReportService'
import { ScoutReportService } from '../services/scoutReport.service'

const reportParamsSchema = z.object({
    sessionId: z.string().uuid(),
})

const userIdSchema = z.object({
    userId: z.string().uuid(),
})

const scoutConfigSchema = z.object({
    template: z.enum(['scout', 'session', 'season', 'player_card', 'custom']).default('scout'),
    format: z.enum(['pdf', 'json', 'html']).default('json'),
    includeShotDna: z.boolean().default(true),
    includeHeatmaps: z.boolean().default(true),
    includeVideo: z.boolean().default(false),
    includeProjections: z.boolean().default(true),
    sessionsRange: z.object({
        from: z.string(),
        to: z.string(),
    }).optional(),
    branding: z.object({
        logo: z.string().optional(),
        teamName: z.string().optional(),
        scoutName: z.string().optional(),
    }).optional(),
}).optional()

export default async function reportRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    const pdfService = new PdfReportService(fastify.supabase)
    const scoutService = new ScoutReportService(fastify.supabase)

    /**
     * GET /reports/session/:sessionId
     * Generate a full session report (JSON payload for client-side PDF rendering)
     */
    fastify.get('/session/:sessionId', async (request, reply) => {
        try {
            const { sessionId } = reportParamsSchema.parse(request.params)
            const user = request.user!

            const report = await pdfService.generateSessionReport(sessionId, user.id)
            return { success: true, data: report }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid session ID format' })
            }
            if (error.message === 'Session not found') {
                return reply.code(404).send({ error: 'Session not found' })
            }
            request.log.error({ err: error }, 'Failed to generate session report')
            return reply.code(500).send({ error: 'Failed to generate report' })
        }
    })

    /**
     * GET /reports/:sessionId (legacy — keep backward compatibility)
     */
    fastify.get('/:sessionId', async (request, reply) => {
        try {
            const { sessionId } = reportParamsSchema.parse(request.params)
            const user = request.user!

            const report = await pdfService.generateSessionReport(sessionId, user.id)
            return { success: true, data: report }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid session ID format' })
            }
            if (error.message === 'Session not found') {
                return reply.code(404).send({ error: 'Session not found' })
            }
            request.log.error({ err: error }, 'Failed to generate report')
            return reply.code(500).send({ error: 'Failed to generate report' })
        }
    })

    /**
     * GET /reports/scout/:userId
     * Generate a full Scout Report (V6.0)
     */
    fastify.get('/scout/:userId', async (request, reply) => {
        try {
            const { userId } = userIdSchema.parse(request.params)
            const config = scoutConfigSchema.parse(request.query)

            const report = await scoutService.generateScoutReport(userId, config)
            return { success: true, data: report }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid parameters', details: error.errors })
            }
            if (error.message === 'Player not found') {
                return reply.code(404).send({ error: 'Player not found' })
            }
            request.log.error({ err: error }, 'Failed to generate scout report')
            return reply.code(500).send({ error: 'Failed to generate scout report' })
        }
    })

    /**
     * GET /reports/season/:userId
     * Generate a Season Summary Report (V6.0)
     */
    fastify.get('/season/:userId', async (request, reply) => {
        try {
            const { userId } = userIdSchema.parse(request.params)

            const report = await scoutService.generateScoutReport(userId, { template: 'season' })
            return { success: true, data: report }
        } catch (error: any) {
            if (error.message === 'Player not found') {
                return reply.code(404).send({ error: 'Player not found' })
            }
            request.log.error({ err: error }, 'Failed to generate season report')
            return reply.code(500).send({ error: 'Failed to generate season report' })
        }
    })

    /**
     * GET /reports/player-card/:userId
     * Generate a Player Card (V6.0)
     */
    fastify.get('/player-card/:userId', async (request, reply) => {
        try {
            const { userId } = userIdSchema.parse(request.params)

            const card = await scoutService.generatePlayerCard(userId)
            return { success: true, data: card }
        } catch (error: any) {
            if (error.message === 'Player not found') {
                return reply.code(404).send({ error: 'Player not found' })
            }
            request.log.error({ err: error }, 'Failed to generate player card')
            return reply.code(500).send({ error: 'Failed to generate player card' })
        }
    })

    /**
     * POST /reports/custom
     * Generate a custom report with specific config (V6.0)
     */
    fastify.post('/custom', async (request, reply) => {
        try {
            const user = request.user!
            const config = scoutConfigSchema.parse(request.body)

            const report = await scoutService.generateScoutReport(user.id, config)
            return { success: true, data: report }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid config', details: error.errors })
            }
            request.log.error({ err: error }, 'Failed to generate custom report')
            return reply.code(500).send({ error: 'Failed to generate report' })
        }
    })

    /**
     * GET /reports/templates
     * List available report templates (V6.0)
     */
    fastify.get('/templates', async () => {
        const templates = scoutService.getTemplates()
        return { success: true, data: templates }
    })
}
