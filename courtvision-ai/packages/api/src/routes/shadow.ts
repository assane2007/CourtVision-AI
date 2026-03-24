import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { shadowQueue } from '../queue/shadowLeague.worker';
import { DigitalTwin } from '../services/simulation.service';
import { V5Orchestrator } from '../services/v5Orchestrator';

const simulateBodySchema = z.object({
    playerA: z.object({
        id: z.string(),
        name: z.string(),
        speedRating: z.number(),
        releaseTimeMs: z.number(),
        accuracyFatigued: z.number(),
        jumpHeightCm: z.number(),
        defensiveContestSpeed: z.number()
    }),
    playerB: z.object({
        id: z.string(),
        name: z.string(),
        speedRating: z.number(),
        releaseTimeMs: z.number(),
        accuracyFatigued: z.number(),
        jumpHeightCm: z.number(),
        defensiveContestSpeed: z.number()
    })
});

const shadowRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
    // Protect all Shadow League routes — prevents queue flooding DoS
    app.addHook('preValidation', app.authenticate)

    app.post('/simulate', {
        schema: {
            tags: ['Shadow League'],
            summary: 'Run a 1v1 multi-agent simulation',
            body: simulateBodySchema,
            response: {
                202: z.object({
                    success: z.boolean(),
                    jobId: z.string(),
                    message: z.string()
                }),
                503: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const { playerA, playerB } = request.body as any; // Type handled by Zod

        if (!shadowQueue) {
            return reply.status(503).send({
                success: false,
                message: 'Simulation queue is currently unavailable.'
            });
        }

        // Enqueue the heavy job taking the simulation off the main event loop
        const job = await shadowQueue.add(`sim_${playerA.id}_vs_${playerB.id}`, {
            playerA,
            playerB
        }, {
            removeOnComplete: true, // Fire and forget for the prototype
            removeOnFail: 10
        });

        reply.status(202).send({
            success: true,
            jobId: job.id as string,
            message: 'Simulation added to The Shadow League queue. Results will be ready soon.'
        });
    });

    app.get('/dashboard', { preHandler: [app.authenticate] }, async (request, reply) => {
        const userId = request.user?.id
        if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

        try {
            const dashboard = await V5Orchestrator.buildDashboard(userId)
            return reply.send({
                success: true,
                data: dashboard,
                version: 'v5-apex',
                isShadow: true,
                generatedAt: new Date().toISOString(),
            })
        } catch (error: any) {
            request.log.error({ err: error }, '[Shadow Dashboard] Error building v5 dashboard')
            return reply.status(500).send({ error: 'Failed to build dashboard' })
        }
    });

};

export default shadowRoutes;
