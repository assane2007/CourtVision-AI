import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PdfReportService } from '../services/pdfReportService'

const reportParamsSchema = z.object({
    sessionId: z.string().uuid(),
})

export default async function reportRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    const pdfService = new PdfReportService(fastify.supabase)

    /**
     * GET /reports/:sessionId
     * Generate a full session report (JSON payload for client-side PDF rendering)
     */
    fastify.get('/:sessionId', async (request, reply) => {
        try {
            const { sessionId } = reportParamsSchema.parse(request.params)
            const user = request.user!

            const report = await pdfService.generateSessionReport(sessionId, user.id)

            return {
                success: true,
                data: report,
            }
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
}
