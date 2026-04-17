import type { Job } from 'bullmq';
import { Queue, Worker } from 'bullmq';
// Logging disabled/swapped to console for MVP
import type { DigitalTwin } from '../services/simulation.service';
import { SimulationService } from '../services/simulation.service';

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const hasRedis = (redisUrl && redisUrl.trim() !== '') || (redisHost && redisHost.trim() !== '');

const redisConnection = hasRedis ? {
    host: redisHost || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
} : null;

export const shadowQueue = redisConnection ? new Queue('ShadowLeagueQueue', {
    connection: redisConnection as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
    },
}) : null;

export interface ShadowLeagueJobData {
    playerA: DigitalTwin;
    playerB: DigitalTwin;
}

export const initShadowLeagueWorker = () => {
    if (!redisConnection) {
        console.warn('[Shadow League Worker] ⚠️ Redis not available — worker not started');
        return null;
    }

    const worker = new Worker<ShadowLeagueJobData>(
        'ShadowLeagueQueue',
        async (job: Job) => {
            console.log(`[Shadow League Worker] Processing match ${job.id}`);
            try {
                // To display progress dynamically
                await job.updateProgress(10);

                const result = await SimulationService.simulateShadowMatch(job.data.playerA, job.data.playerB);

                await job.updateProgress(100);
                return result;
            } catch (error: any) {
                console.error(`[Shadow League Worker] Match failed: ${error.message}`);
                throw error;
            }
        },
        {
            connection: redisConnection as any,
            concurrency: 5 // Run up to 5 simulations in parallel
        }
    );

    worker.on('completed', (job) => {
        console.log(`[Shadow League Worker] Match ${job.id} successfully processed!`);
        // Here we could notify WebSockets of the result in a real app
    });

    worker.on('failed', (job, err) => {
        console.error(`[Shadow League Worker] Match ${job?.id} failed with error: ${err.message}`);
    });

    console.log('[Shadow League Worker] Listening for matchmaking jobs...');
    return worker;
};
