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
    calibration?: {
        topLeft: { x: number; y: number }
        topRight: { x: number; y: number }
        bottomLeft: { x: number; y: number }
        bottomRight: { x: number; y: number }
    }
}

export const initWorker = () => {
    const worker = new Worker('video-processing', async (job: Job<VideoProcessingJobData>) => {
        const { sessionId, videoUrl, userId, calibration } = job.data

        try {
            // 1. Update status to analyzing
            await supabase.from('sessions').update({ status: 'analyzing' }).eq('id', sessionId)

            // 2. Étape 1 — Prétraitement vidéo
            const prepRes = await preprocessVideo(videoUrl, calibration)
            await job.updateProgress(15)

            // 3. Étape 2 — Tracking (MediaPipe + YOLOv8 + ByteTrack)
            const trackingRes = await runTracking(prepRes.framesDir)
            await job.updateProgress(30)

            // 4. Étape 3 — Reconstruction 3D
            const reconRes = await reconstruct3DSpace(
                trackingRes,
                prepRes.homographyMatrix,
                prepRes.resolution,
                prepRes.fps
            )
            await job.updateProgress(45)

            // 5. Étape 4 — Analyse des tirs
            const shotsRes = await analyzeShots(trackingRes, reconRes)
            await job.updateProgress(60)

            // 6. Étape 5 — Analyse psychologique
            const mentalRes = await analyzeMentality(trackingRes, shotsRes)
            await job.updateProgress(75)

            // 7. Étape 6 — Rapport IA + Programme 7 jours
            const report = await createAiReport({
                tracking: trackingRes,
                reconstruction: reconRes,
                shots: shotsRes,
                mental: mentalRes
            })
            await job.updateProgress(85)

            // 8. Étape 7 — Highlight Reel
            const highlight = await createHighlightReel(videoUrl, shotsRes, 'espn')
            await job.updateProgress(95)

            // 9. Sauvegarder toutes les données dans la table analyses
            const { error: analysisError } = await supabase.from('analyses').insert({
                session_id: sessionId,
                shot_attempts: shotsRes.length,
                shot_made: shotsRes.filter((s) => s.outcome === 'made').length,
                shot_zones: shotsRes.map((s) => ({ zone: s.zone, outcome: s.outcome, posture: s.posture })),
                heatmap_data: reconRes.heatmapData,
                mental_score: mentalRes.mentalFragilityScore,
                body_language: {
                    patterns: mentalRes.detectedPatterns,
                    insights: mentalRes.insights,
                    timeline: mentalRes.timeline,
                    quarterComparison: mentalRes.quarterComparison,
                    fatigueIndex: mentalRes.fatigueIndex,
                    bodyLanguageScore: mentalRes.bodyLanguageScore
                },
                highlights: {
                    url: highlight.outputPath,
                    clips: highlight.clips,
                    duration: highlight.durationSec,
                    template: highlight.template
                },
                ai_report: JSON.stringify({
                    text: report.reportText,
                    trainingProgram: report.trainingProgram
                })
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
