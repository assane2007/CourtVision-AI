import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { createClient } from '@supabase/supabase-js'
import {
    preprocessVideo,
    runTracking,
    reconstruct3DSpace,
    analyzeShots,
    analyzeMentality,
    createAiReport,
    createHighlightReel
} from '@courtvision/ai'

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// Initialisation de Supabase (worker-side)
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Queue
export const videoQueue = new Queue('video-processing', { connection: redisConnection as any })

// Job Interface
export interface VideoProcessingJobData {
    sessionId: string
    videoUrl: string
    userId: string
}

export const initWorker = () => {
    const worker = new Worker('video-processing', async (job: Job<VideoProcessingJobData>) => {
        const { sessionId, videoUrl, userId } = job.data

        try {
            // 1. Update status to analyzing
            await supabase.from('sessions').update({ status: 'analyzing' }).eq('id', sessionId)

            // 2. Etape 1 - Pretraitement
            const prepRes = await preprocessVideo(videoUrl)
            await job.updateProgress(15)

            // 3. Etape 2 - Tracking
            const trackingRes = await runTracking(prepRes.framesDir)
            await job.updateProgress(30)

            // 4. Etape 3 - 3D Recon
            const reconRes = await reconstruct3DSpace(trackingRes)
            await job.updateProgress(45)

            // 5. Etape 4 - Shot Analysis
            const shotsRes = await analyzeShots(trackingRes, reconRes)
            await job.updateProgress(60)

            // 6. Etape 5 - Mental Analysis
            const mentalRes = await analyzeMentality(trackingRes)
            await job.updateProgress(75)

            // 7. Etape 6 - AI Report
            const reportStr = await createAiReport({
                tracking: trackingRes,
                reconstruction: reconRes,
                shots: shotsRes,
                mental: mentalRes
            })
            await job.updateProgress(85)

            // 8. Etape 7 - Highlight Reel
            const highlightUrl = await createHighlightReel(videoUrl, shotsRes)
            await job.updateProgress(95)

            // 9. Save all data to the analyses table
            const { error: analysisError } = await supabase.from('analyses').insert({
                session_id: sessionId,
                shot_attempts: shotsRes.length,
                shot_made: shotsRes.filter((s: any) => s.outcome === 'made').length,
                shot_zones: shotsRes.map((s: any) => s.zone), // simplified
                heatmap_data: reconRes.heatmapData,
                mental_score: mentalRes.mentalFragilityScore,
                body_language: mentalRes.detectedPatterns,
                highlights: { url: highlightUrl }, // simplified
                ai_report: reportStr
            })

            if (analysisError) {
                throw new Error(`Failed to save analysis: ${analysisError.message}`)
            }

            // 10. Update session status
            await supabase.from('sessions').update({ status: 'complete' }).eq('id', sessionId)
            await job.updateProgress(100)

            return { success: true }
        } catch (error: any) {
            console.error(`Error processing job ${job.id}:`, error)
            await supabase.from('sessions').update({ status: 'failed' }).eq('id', sessionId)
            throw error
        }
    }, { connection: redisConnection as any })

    worker.on('failed', (job: Job | undefined, err: Error) => {
        console.error(`Job ${job?.id} failed:`, err)
    })

    return worker
}
