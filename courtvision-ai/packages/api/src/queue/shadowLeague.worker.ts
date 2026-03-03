import { Queue, Worker, Job } from 'bullmq';
// Logging disabled/swapped to console for MVP
import { SimulationService, DigitalTwin } from '../services/simulation.service';

const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export const shadowQueue = new Queue('ShadowLeagueQueue', { connection: redisConnection });

export interface ShadowLeagueJobData {
    playerA: DigitalTwin;
    playerB: DigitalTwin;
}

export const initShadowLeagueWorker = () => {
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
            connection: redisConnection,
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
