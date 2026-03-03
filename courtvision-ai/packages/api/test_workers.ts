import { initializeQueues } from './src/queue';
import { shadowQueue } from './src/queue/shadowLeague.worker';
import { spatialQueue } from './src/queue/nerf.worker';

async function runTests() {
    console.log('--- STARTING BACKEND REVOLUTION LIFECYCLE TESTS ---');

    console.log('1. Initializing Workers...');
    const workers = initializeQueues();
    if (!workers) {
        console.error('Failed to initialize workers. Is Redis running locally?');
        process.exit(1);
    }

    console.log('2. Dispatching a Shadow League Matchmaking Job...');
    await shadowQueue.add('sim_demomatch', {
        playerA: {
            id: 'p1', name: 'User', speedRating: 85, releaseTimeMs: 400, accuracyFatigued: 0.7, jumpHeightCm: 80, defensiveContestSpeed: 70
        },
        playerB: {
            id: 'p2', name: 'Rival', speedRating: 82, releaseTimeMs: 430, accuracyFatigued: 0.65, jumpHeightCm: 76, defensiveContestSpeed: 75
        }
    });

    console.log('3. Dispatching a 3D Gaussian Splatting Reconstruction Job...');
    const spatialJob = await spatialQueue.add('nerf_demo', {
        videoId: 'vid_123',
        videoUrl: 'https://storage.courtvision.ai/raw/vid_123.mp4'
    });

    console.log('Jobs Dispatched. Waiting for background processors to complete...');

    // Poll the spatial job to show progress updates
    const interval = setInterval(async () => {
        const state = await spatialJob.getState();
        const progress = typeof spatialJob.progress === 'number' ? spatialJob.progress : 0;
        console.log(`[Main Thread] NeRF Job state: ${state} - Progress: ${progress}%`);

        if (state === 'completed' || state === 'failed') {
            clearInterval(interval);
            console.log('--- TESTS COMPLETE. CLOSING WORKERS ---');
            await workers.shadowWorker.close();
            await workers.spatialWorker.close();
            process.exit(0);
        }
    }, 2000);
}

runTests().catch(e => {
    console.error('Test script failed:', e.message);
    process.exit(1);
});
