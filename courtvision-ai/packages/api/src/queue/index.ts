import { initShadowLeagueWorker } from './shadowLeague.worker';
import { initSpatialWorker } from './nerf.worker';

// For existing components (assumed placeholder to expose them later)
// import { initVideoProcessorWorker } from './videoProcessor';

export function initializeQueues() {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;
    const hasRedis = (redisUrl && redisUrl.trim() !== '') || (redisHost && redisHost.trim() !== '');

    if (!hasRedis) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('[Queue] REDIS_URL/REDIS_HOST missing. Skipping BullMQ initialization.');
        }
        return null;
    }

    console.log('[Queue] Initializing all BullMQ Workers...');

    try {
        const shadowWorker = initShadowLeagueWorker();
        const spatialWorker = initSpatialWorker();

        console.log('[Queue] All asynchronous workers are listening for jobs.');

        return {
            shadowWorker,
            spatialWorker
        };
    } catch (e: any) {
        console.error('[Queue Error]', e.message);
        return null;
    }
}
