import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
    preprocessVideo,
    runTracking,
    reconstruct3DSpace,
    analyzeShots,
    analyzeMentality,
    createAiReport,
    createHighlightReel
} from '@courtvision/ai'

// ── Redis connection (graceful si non disponible) ─────────────
let redisConnection: Redis | null = null
let redisAvailable = false

try {
    redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 3) {
                console.warn('[Redis] Max retries reached — running without queue')
                return null // Stop retrying
            }
            return Math.min(times * 200, 2000)
        },
        lazyConnect: true,
        showFriendlyErrorStack: false,
    })
    redisConnection.on('connect', () => { redisAvailable = true; console.log('[Redis] ✅ Connected') })
    redisConnection.on('error', (err) => {
        // Silently degrade — no spam in console
        if (redisAvailable) {
            console.warn('[Redis] Connection lost — queue disabled')
        }
        redisAvailable = false
    })
    // Attempt connection (non-blocking)
    redisConnection.connect().catch(() => {
        console.warn('[Redis] ⚠️ Not available — queue disabled (dev mode)')
        redisAvailable = false
    })
} catch {
    console.warn('[Redis] ⚠️ Could not initialize — queue disabled')
}

// Initialisation de Supabase (lazy — appelé seulement quand nécessaire)
// Note: le client n'est pas typé avec le schéma DB — on utilise `any` pour les opérations CRUD
let _supabase: any | null = null
function getSupabase(): any {
    if (!_supabase) {
        const supabaseUrl = process.env.SUPABASE_URL || ''
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
        if (!supabaseUrl) {
            console.warn('[Worker] ⚠️ SUPABASE_URL not set — worker DB operations will fail')
        }
        _supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder')
    }
    return _supabase
}

// Queue (null-safe)
export const videoQueue = redisConnection
    ? new Queue('video-processing', { connection: redisConnection as any })
    : null

/** Safe queue add — no-op if Redis not available */
export async function addToQueue(jobName: string, data: VideoProcessingJobData) {
    if (videoQueue && redisAvailable) {
        await videoQueue.add(jobName, data)
        console.log(`[Queue] Job "${jobName}" added for session ${data.sessionId}`)
    } else {
        console.warn(`[Queue] Redis not available — job "${jobName}" skipped. Session: ${data.sessionId}`)
    }
}

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

/**
 * Download a video from a URL (Supabase Storage or external) to a local temp file.
 * Returns the local file path. Caller is responsible for cleanup.
 */
async function downloadVideo(videoUrl: string): Promise<string> {
    const tmpDir = path.join(os.tmpdir(), 'courtvision-videos')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const ext = path.extname(new URL(videoUrl).pathname) || '.mp4'
    const localPath = path.join(tmpDir, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)

    // Try Supabase Storage download first (signed URL or public bucket)
    const response = await fetch(videoUrl)
    if (!response.ok) {
        throw new Error(`Failed to download video: HTTP ${response.status} from ${videoUrl}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(localPath, buffer)
    console.log(`[Worker] Downloaded video (${(buffer.length / 1024 / 1024).toFixed(1)}MB) → ${localPath}`)
    return localPath
}

/** Clean up temp video file after processing */
function cleanupTempFile(filePath: string): void {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            console.log(`[Worker] Cleaned up temp file: ${filePath}`)
        }
    } catch {
        // Non-critical — temp file will be cleaned by OS eventually
    }
}

export const initWorker = () => {
    if (!redisConnection || !redisAvailable) {
        console.warn('[Worker] ⚠️ Redis not available — worker not started (dev mode)')
        // Return a mock worker with a close() method
        return { close: async () => {} }
    }

    const worker = new Worker('video-processing', async (job: Job<VideoProcessingJobData>) => {
        const { sessionId, videoUrl, userId, calibration } = job.data
        let localVideoPath: string | null = null

        try {
            // 1. Update status to analyzing
            await getSupabase().from('sessions').update({ status: 'analyzing' }).eq('id', sessionId)

            // 1.5 Download video from Supabase Storage / URL to local temp file
            localVideoPath = await downloadVideo(videoUrl)
            await job.updateProgress(5)

            // 2. Étape 1 — Prétraitement vidéo (local file path)
            const prepRes = await preprocessVideo(localVideoPath, calibration)
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
            const { error: analysisError } = await getSupabase().from('analyses').insert({
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
            await getSupabase().from('sessions').update({ status: 'complete' }).eq('id', sessionId)
            await job.updateProgress(100)

            return { success: true }
        } catch (error: any) {
            console.error(`Error processing job ${job.id}:`, error)
            await getSupabase().from('sessions').update({ status: 'failed' }).eq('id', sessionId)
            throw error
        } finally {
            // Always clean up the downloaded temp video
            if (localVideoPath) cleanupTempFile(localVideoPath)
        }
    }, { connection: redisConnection as any })

    worker.on('failed', (job: Job | undefined, err: Error) => {
        console.error(`Job ${job?.id} failed:`, err)
    })

    return worker
}
