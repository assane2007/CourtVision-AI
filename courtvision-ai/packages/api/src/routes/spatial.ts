import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { spatialQueue } from '../queue/nerf.worker';

const reconstructBodySchema = z.object({
    videoId: z.string(),
    videoUrl: z.string().url()
});

const spatialRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
    // Protect all Spatial routes — GPU-intensive jobs, prevent unauthenticated DoS
    app.addHook('preValidation', app.authenticate)

    app.post('/reconstruct', {
        schema: {
            tags: ['Spatial Architecture'],
            summary: 'Upload an event video to be reconstructed into 3D using Gaussian Splatting',
            body: reconstructBodySchema,
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
        const { videoId, videoUrl } = request.body as any; // Type handled by Zod

        if (!spatialQueue) {
            return reply.status(503).send({
                success: false,
                message: 'Spatial queue is currently unavailable.'
            });
        }

        // Add 3D generation to the asynchronous BullMQ queue
        const job = await spatialQueue.add(`nerf_gen_${videoId}`, {
            videoId,
            videoUrl
        }, {
            removeOnComplete: true, // Fire and forget for prototype
            removeOnFail: 10
        });

        reply.status(202).send({
            success: true,
            jobId: job.id as string,
            message: 'Video added to Spatial processing queue. This generally takes 2-5 minutes.'
        });
    });

    // Endpoint for mobile to poll for progress
    app.get('/status/:jobId', {
        schema: {
            tags: ['Spatial Architecture'],
            summary: 'Poll status of a 3D reconstruction',
            params: z.object({
                jobId: z.string()
            }),
            response: {
                200: z.object({
                    success: z.boolean(),
                    state: z.string(),
                    progress: z.number().nullable()
                }),
                404: z.object({
                    success: z.boolean(),
                    state: z.string(),
                    progress: z.number().nullable()
                }),
                503: z.object({
                    success: z.boolean(),
                    state: z.string(),
                    progress: z.number().nullable()
                })
            }
        }
    }, async (request, reply) => {
        const { jobId } = request.params as any;
        if (!spatialQueue) {
            return reply.status(503).send({ success: false, state: 'queue_unavailable', progress: null });
        }

        const job = await spatialQueue.getJob(jobId);

        if (!job) {
            return reply.status(404).send({ success: false, state: 'not_found', progress: null });
        }

        const state = await job.getState();
        const progress = typeof job.progress === 'number' ? job.progress : null;

        reply.status(200).send({
            success: true,
            state,
            progress
        });
    });
};

export default spatialRoutes;
