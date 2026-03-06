import { initShadowLeagueWorker } from './shadowLeague.worker';
import { initSpatialWorker } from './nerf.worker';

// For existing components (assumed placeholder to expose them later)
// import { initVideoProcessorWorker } from './videoProcessor';

export function initializeQueues() {
    if (!process.env.REDIS_URL || process.env.REDIS_URL.trim() === '') {
        console.log('[Queue] REDIS_URL missing. Skipping BullMQ initialization.');
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
