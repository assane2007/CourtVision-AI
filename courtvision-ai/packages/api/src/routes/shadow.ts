import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { shadowQueue } from '../queue/shadowLeague.worker';
import { DigitalTwin } from '../services/simulation.service';

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
                })
            }
        }
    }, async (request, reply) => {
        const { playerA, playerB } = request.body as any; // Type handled by Zod

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

};

export default shadowRoutes;
