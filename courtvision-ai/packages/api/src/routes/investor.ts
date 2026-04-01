import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

export default async function investorRoutes(app: FastifyInstance) {
    // Protect all investor routes — business-critical KPIs
    app.addHook('preValidation', app.authenticate)

    /**
     * Get platform/user KPIs for investors
     */
    app.get('/kpis', {
        schema: {
            querystring: z.object({
                userId: z.string().optional()
            })
        }
    }, async (request, reply) => {
        const { userId } = request.query as { userId?: string }

        try {
            // In a real system, we'd run complex SQL aggregations here.
            // For now, we simulate the high-level metrics.

            const metrics = {
                growth: {
                    retentionRate: 68.5, // %
                    monthlyActiveUsers: 1240,
                    sessionIntensity: 4.2, // sessions per week
                },
                performance: {
                    avgSessionDuration: 42, // minutes
                    totalShotsAnalyzed: 450000,
                    avgBiomechanicImprovement: 12.4, // % improvement over 30 days
                },
                revenue: {
                    mrr: 15400, // Simulated MRR in $
                    conversionRate: 8.2, // Free -> Pro %
                }
            }

            return { success: true, data: metrics }
        } catch (err) {
            app.log.error(err)
            return reply.status(500).send({ error: 'Failed to aggregate KPIs' })
        }
    })

    /**
     * Get mechanical improvement curve data
     */
    app.get('/improvement-curve', {
        schema: {
            querystring: z.object({
                userId: z.string()
            })
        }
    }, async (request, reply) => {
        const { userId } = request.query as { userId: string }

        // Simulation of ELBOW accuracy improvement over time
        const curve = [
            { day: 1, accuracy: 45 },
            { day: 7, accuracy: 52 },
            { day: 14, accuracy: 58 },
            { day: 21, accuracy: 64 },
            { day: 30, accuracy: 72 },
        ]

        return { success: true, data: curve }
    })
}
