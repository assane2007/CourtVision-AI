import type { Job } from 'bullmq';
import { Queue, Worker } from 'bullmq';
import type { SpatialJobResult } from '../services/spatial.service';
import { SpatialService } from '../services/spatial.service';

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const hasRedis = (redisUrl && redisUrl.trim() !== '') || (redisHost && redisHost.trim() !== '');

const redisConnection = hasRedis ? {
    host: redisHost || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
} : null;

export const spatialQueue = redisConnection ? new Queue('SpatialReconstructionQueue', { connection: redisConnection as any }) : null;

export interface SpatialJobData {
    videoId: string;
    videoUrl: string;
}

export const initSpatialWorker = () => {
    if (!redisConnection) {
        console.warn('[Spatial Worker] ⚠️ Redis not available — worker not started');
        return null;
    }

    const worker = new Worker<SpatialJobData, SpatialJobResult>(
        'SpatialReconstructionQueue',
        async (job: Job) => {
            console.log(`[Spatial Worker] Processing NeRF job ${job.id} for video ${job.data.videoId}`);
            try {
                // Update progress proxy function
                const updateProgress = async (progress: number) => {
                    await job.updateProgress(progress);
                };

                const result = await SpatialService.reconstruct3DScene(job.id!, job.data.videoUrl, updateProgress);
                return result;
            } catch (error: any) {
                console.error(`[Spatial Worker] NeRF job failed: ${error.message}`);
                throw error;
            }
        },
        {
            connection: redisConnection as any,
            concurrency: 1 // Gaussian splatting requires heavy GPU compute, limit locally
        }
    );

    worker.on('completed', (job) => {
        console.log(`[Spatial Worker] Job ${job.id} completely finished creating 3D scene!`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[Spatial Worker] Job ${job?.id} failed with error: ${err.message}`);
    });

    console.log('[Spatial Worker] Listening for 3D Reconstruction jobs...');
    return worker;
};
