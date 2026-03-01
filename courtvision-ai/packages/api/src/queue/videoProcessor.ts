import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
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
    createHighlightReel,
    CoachChatEngine,
    // V5 Apex AI modules
    ShotDNAEngine,
    AdvancedAnalyticsEngine,
    PredictiveEngine,
    type ShotDNAProfile,
    type AdvancedAnalyticsResult,
    type ShotResult,
    type CVHighlightEvent,
} from '@courtvision/ai'
import pino from 'pino'

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty'
    } : undefined
})

// ── Redis connection ──────────────────────────────────────────
let redisConnection: Redis | null = null
let redisAvailable = false

try {
    redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null, // Critical for BullMQ
        retryStrategy(times) {
            return Math.min(times * 200, 5000)
        },
        lazyConnect: true,
        showFriendlyErrorStack: false,
    })
    redisConnection.on('connect', () => {
        redisAvailable = true
        logger.info('[Redis] ✅ Connected')
    })
    redisConnection.on('error', (err) => {
        if (redisAvailable) {
            logger.warn({ err }, '[Redis] Connection lost')
        }
        redisAvailable = false
    })
    redisConnection.connect().catch((err) => {
        logger.warn({ err }, '[Redis] ⚠️ Not available (dev mode)')
        redisAvailable = false
    })
} catch (err) {
    logger.error({ err }, '[Redis] ⚠️ Initialization failed')
}

// Supabase lazy client — C-4: fail-fast instead of placeholder credentials
let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
    if (!_supabase) {
        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('[Worker] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set — cannot process videos without database access')
        }
        _supabase = createClient(supabaseUrl, supabaseKey)
    }
    return _supabase
}

// Queue — H-7: proper job timeout, dead letter config, stalled detection
export const videoQueue = redisConnection
    ? new Queue('video-processing', {
        connection: redisConnection as any,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 500 },
            // H-7: Job timeout — 10 minutes max per video
            timeout: 600_000,
        }
    })
    : null

export async function addToQueue(jobName: string, data: VideoProcessingJobData) {
    if (videoQueue && redisAvailable) {
        const job = await videoQueue.add(jobName, data)
        logger.info({ jobId: job.id, sessionId: data.sessionId }, `[Queue] Job "${jobName}" added`)
    } else {
        logger.warn({ sessionId: data.sessionId }, `[Queue] Redis not available — job skipped`)
    }
}

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

async function downloadVideo(videoUrl: string): Promise<string> {
    const tmpDir = path.join(os.tmpdir(), 'courtvision-videos')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const ext = path.extname(new URL(videoUrl).pathname) || '.mp4'
    const localPath = path.join(tmpDir, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)

    const response = await fetch(videoUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${videoUrl}`)

    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(localPath, buffer)
    logger.info({ bytes: buffer.length, path: localPath }, '[Worker] Downloaded video')
    return localPath
}

function cleanupTempFile(filePath: string): void {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            logger.debug({ path: filePath }, '[Worker] Cleaned up temp file')
        }
    } catch (err) {
        logger.warn({ err, path: filePath }, '[Worker] Failed to cleanup temp file')
    }
}

export const initWorker = () => {
    if (!redisConnection || !redisAvailable) {
        logger.warn('[Worker] ⚠️ Redis not available — worker not started')
        return { close: async () => { } }
    }

    const worker = new Worker('video-processing', async (job: Job<VideoProcessingJobData>) => {
        const { sessionId, videoUrl, userId, calibration } = job.data
        let localVideoPath: string | null = null

        logger.info({ jobId: job.id, session_id: sessionId, attempt: job.attemptsMade + 1 }, '[Worker] Starting processing')

        try {
            // Update status
            await getSupabase().from('sessions').update({ status: 'analyzing' }).eq('id', sessionId)

            // 1. Download
            localVideoPath = await downloadVideo(videoUrl)
            await job.updateProgress(5)

            // 2. Pipeline execution
            const prepRes = await preprocessVideo(localVideoPath, calibration)
            await job.updateProgress(10)

            const trackingRes = await runTracking(prepRes.framesDir)
            await job.updateProgress(25)

            const reconRes = await reconstruct3DSpace(trackingRes, prepRes.homographyMatrix, prepRes.resolution, prepRes.fps)
            await job.updateProgress(35)

            const shotsRes = await analyzeShots(trackingRes, reconRes)
            await job.updateProgress(45)

            const mentalRes = await analyzeMentality(trackingRes, shotsRes)
            await job.updateProgress(55)

            // Shot DNA
            const { data: existingDna } = await getSupabase().from('shot_dna').select('*').eq('user_id', userId).single()
            const historicalSignature = existingDna ? {
                avgElbowAngle: existingDna.avg_elbow_angle,
                avgReleaseHeight: existingDna.avg_release_height,
                avgReleaseTime: existingDna.avg_release_time,
                followThroughPct: existingDna.follow_through_pct,
                dominantHand: existingDna.dominant_hand as 'right' | 'left',
                elbowStdDev: 0,
                releaseHeightStdDev: 0,
            } : undefined

            const shotDnaProfile = ShotDNAEngine.buildProfile(shotsRes, historicalSignature)

            // Build signs
            const shotSignatures = shotsRes.map((shot: ShotResult, index: number) => {
                const quality = ShotDNAEngine.computeShotQuality(shot, shotDnaProfile.signature, {
                    fatigueLevel: mentalRes.fatigueIndex,
                    mentalScore: mentalRes.bodyLanguageScore,
                    isClutch: false,
                    isContested: false,
                })
                return {
                    user_id: userId,
                    session_id: sessionId,
                    zone: shot.zone,
                    outcome: shot.outcome,
                    elbow_angle: shot.posture.elbowAngle,
                    release_height: shot.posture.releaseHeight,
                    release_time: shot.posture.releaseTime,
                    follow_through: shot.posture.followThrough,
                    shot_quality_score: quality.expectedMakePct,
                    closest_nba: shotDnaProfile.closestNBAPlayer,
                    timestamp_sec: index,
                    fatigue_level: mentalRes.fatigueIndex,
                    mental_state: mentalRes.bodyLanguageScore,
                }
            })

            // Persistence
            await getSupabase().from('shot_dna').upsert({
                user_id: userId,
                avg_elbow_angle: shotDnaProfile.signature.avgElbowAngle,
                avg_release_height: shotDnaProfile.signature.avgReleaseHeight,
                avg_release_time: shotDnaProfile.signature.avgReleaseTime,
                follow_through_pct: shotDnaProfile.signature.followThroughPct,
                dominant_hand: shotDnaProfile.signature.dominantHand,
                dna_purity_score: shotDnaProfile.purityScore,
                dna_nba_similarity: shotDnaProfile.nbaSimilarity,
                closest_nba_player: shotDnaProfile.closestNBAPlayer,
                optimal_zone: Object.entries(shotDnaProfile.zoneEfficiency).sort(([, a], [, b]) => (b as any).pct - (a as any).pct)[0]?.[0] || 'midrange',
                mechanical_drift: shotDnaProfile.mechanicalDrift,
                total_shots_analyzed: shotDnaProfile.totalShotsAnalyzed + (existingDna?.total_shots_analyzed || 0),
                last_updated: new Date().toISOString(),
            }, { onConflict: 'user_id' })

            if (shotSignatures.length > 0) await getSupabase().from('shot_signatures').insert(shotSignatures)

            const sessionDurationSec = prepRes.fps > 0 ? (trackingRes.length || 0) / prepRes.fps : 600
            const analytics = AdvancedAnalyticsEngine.compute(shotsRes, mentalRes, sessionDurationSec)

            await getSupabase().from('advanced_analytics').insert({
                user_id: userId,
                session_id: sessionId,
                shot_quality_avg: analytics.shotQualityAvg,
                clutch_rating: analytics.clutchRating,
                court_balance_index: analytics.courtBalanceIndex,
                offensive_rating: analytics.offensiveRating,
                hot_zones: analytics.hotZones,
                cold_zones: analytics.coldZones,
            })

            // Prediction Validation
            const { data: prediction } = await getSupabase().from('predictions').select('*').eq('user_id', userId).eq('validated', false).order('created_at', { ascending: false }).limit(1).single()
            if (prediction) {
                const actualFGPct = shotsRes.length > 0 ? (shotsRes.filter((s: ShotResult) => s.outcome === 'made').length / shotsRes.length) * 100 : 0
                const accuracy = PredictiveEngine.validatePrediction({ predictedFGPct: prediction.predicted_fg_pct, predictedMentalScore: prediction.predicted_mental_score } as any, { fgPct: actualFGPct, mentalScore: mentalRes.bodyLanguageScore || 60 })
                await getSupabase().from('predictions').update({ actual_fg_pct: actualFGPct, actual_mental_score: mentalRes.bodyLanguageScore || 60, prediction_accuracy: accuracy, validated: true }).eq('id', prediction.id)
            }

            await updateQuestProgress(userId, shotsRes, mentalRes)
            const report = await createAiReport({
                tracking: trackingRes,
                reconstruction: reconRes,
                shots: shotsRes,
                mental: mentalRes,
                shotDna: shotDnaProfile,
                analytics: analytics
            })

            await CoachChatEngine.storeSessionMemory(getSupabase(), userId, sessionId, report.reportText, {
                fgPct: (shotsRes.filter((s: ShotResult) => s.outcome === 'made').length / Math.max(shotsRes.length, 1)) * 100,
                mentalScore: mentalRes.bodyLanguageScore,
                date: new Date().toISOString()
            })

            // Resolve player name for highlight overlay
            const { data: playerProfile } = await getSupabase().from('public_profiles').select('display_name').eq('user_id', userId).single()
            const playerName = playerProfile?.display_name || 'Player'

            // ── CV Engine highlight detection ──────────────────────
            let cvEvents: CVHighlightEvent[] = []
            try {
                const cvEngineUrl = process.env.CV_ENGINE_URL || 'http://localhost:8000'
                const formData = new FormData()
                const videoBuffer = fs.readFileSync(localVideoPath!)
                formData.append('video_file', new Blob([videoBuffer]), 'video.mp4')

                const cvResp = await fetch(`${cvEngineUrl}/detect/highlights?frame_skip=2&enable_audio=true`, {
                    method: 'POST',
                    body: formData,
                })

                if (cvResp.ok) {
                    const { job_id: cvJobId } = await cvResp.json() as { job_id: string }
                    logger.info({ cvJobId }, '[Worker] CV engine highlight detection started')

                    // Poll for completion (max 5 minutes)
                    const deadline = Date.now() + 300_000
                    while (Date.now() < deadline) {
                        await new Promise((r) => setTimeout(r, 3000))
                        const statusResp = await fetch(`${cvEngineUrl}/job/${cvJobId}/status`)
                        if (!statusResp.ok) break
                        const status = await statusResp.json() as { status: string; progress: number }
                        if (status.status === 'completed') {
                            const resultResp = await fetch(`${cvEngineUrl}/job/${cvJobId}/result`)
                            if (resultResp.ok) {
                                const result = await resultResp.json() as { events: CVHighlightEvent[] }
                                cvEvents = result.events || []
                                logger.info({ count: cvEvents.length }, '[Worker] CV engine highlights received')
                            }
                            break
                        }
                        if (status.status === 'failed') {
                            logger.warn('[Worker] CV engine highlight detection failed')
                            break
                        }
                    }
                }
            } catch (cvErr) {
                logger.warn({ err: cvErr }, '[Worker] CV engine highlight detection unavailable')
            }

            // BUG FIX: Use local file path (not remote URL) for FFmpeg highlight creation
            const highlight = await createHighlightReel(
                localVideoPath!,
                shotsRes,
                'espn',
                playerName,
                null,       // auto-select music
                cvEvents.length > 0 ? cvEvents : undefined,
            )

            await getSupabase().from('analyses').insert({
                session_id: sessionId,
                shot_attempts: shotsRes.length,
                shot_made: shotsRes.filter((s: ShotResult) => s.outcome === 'made').length,
                shot_zones: shotsRes.map((s: ShotResult) => ({ zone: s.zone, outcome: s.outcome, posture: s.posture })),
                heatmap_data: reconRes.heatmapData,
                mental_score: mentalRes.mentalFragilityScore,
                body_language: {
                    fatigueIndex: mentalRes.fatigueIndex,
                    bodyLanguageScore: mentalRes.bodyLanguageScore
                },
                highlights: {
                    url: highlight.outputPath,
                    clips: highlight.clips,
                    duration: highlight.durationSec,
                    template: highlight.template,
                    exportProfile: highlight.exportProfile,
                    fileSizeBytes: highlight.fileSizeBytes,
                    cvEventsCount: cvEvents.length,
                    music: highlight.music ? {
                        id: highlight.music.id,
                        title: highlight.music.title,
                        artist: highlight.music.artist,
                    } : null,
                },
                ai_report: JSON.stringify({
                    text: report.reportText,
                    trainingProgram: report.trainingProgram,
                    shotDna: {
                        purityScore: shotDnaProfile.purityScore,
                        closestNBA: shotDnaProfile.closestNBAPlayer,
                        nbaSimilarity: shotDnaProfile.nbaSimilarity,
                        mechanicalDrift: shotDnaProfile.mechanicalDrift
                    },
                    advancedAnalytics: {
                        offensiveRating: analytics.offensiveRating,
                        overallGrade: analytics.overallGrade,
                        clutchRating: analytics.clutchRating,
                        trueShooting: analytics.trueShooting
                    },
                })
            })

            await getSupabase().from('sessions').update({ status: 'complete' }).eq('id', sessionId)
            await emitSessionComplete(userId, sessionId, {
                shotsAttempted: shotsRes.length,
                shotsMade: shotsRes.filter((s: ShotResult) => s.outcome === 'made').length,
                mentalScore: mentalRes.bodyLanguageScore || 60,
                offensiveRating: analytics.offensiveRating,
                shotDnaPurity: shotDnaProfile.purityScore,
            })

            await job.updateProgress(100)
            logger.info({ jobId: job.id, session_id: sessionId }, '[Worker] Processing successful')
            return { success: true }
        } catch (error: any) {
            logger.error({ err: error, jobId: job.id, attempt: job.attemptsMade + 1 }, '[Worker] Error')

            // Only update session status on final attempt
            if (job.attemptsMade + 1 >= (job.opts.attempts || 1)) {
                await getSupabase().from('sessions').update({ status: 'failed' }).eq('id', sessionId)
                logger.error({ session_id: sessionId }, '[Worker] Job failed permanently')
            }
            throw error
        } finally {
            if (localVideoPath) cleanupTempFile(localVideoPath)
        }
    }, {
        connection: redisConnection as any,
        // H-8: Reduce default concurrency (video processing is CPU/memory-heavy)
        concurrency: process.env.WORKER_CONCURRENCY ? parseInt(process.env.WORKER_CONCURRENCY) : 2,
        // H-7: Stalled job detection every 2 min, lock for 5 min (video jobs are long)
        stalledInterval: 120_000,
        lockDuration: 300_000,
    })

    worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, err }, '[Worker] Job failed event')
    })

    return worker
}

// Helper: updateQuestProgress
async function updateQuestProgress(userId: string, shotsRes: ShotResult[], mentalRes: any): Promise<void> {
    try {
        const supabase = getSupabase()
        const { data: activeQuests } = await supabase.from('user_quests').select('*, quest:quests(*)').eq('user_id', userId).eq('status', 'active')
        if (!activeQuests || activeQuests.length === 0) return

        const mentalScore = mentalRes.bodyLanguageScore || 60

        for (const uq of activeQuests) {
            const quest = uq.quest
            if (!quest) continue

            let newValue = uq.current_value
            switch (quest.condition_type) {
                case 'sessions_count': newValue += 1; break;
                case 'total_shots': newValue += shotsRes.length; break;
                case 'mental_score_above': if (mentalScore >= quest.condition_value) newValue = mentalScore; break;
            }

            const completed = newValue >= uq.target_value
            await supabase.from('user_quests').update({
                current_value: newValue,
                progress_pct: Math.min(100, (newValue / uq.target_value) * 100),
                status: completed ? 'completed' : 'active',
                completed_at: completed ? new Date().toISOString() : null,
            }).eq('id', uq.id)

            if (completed && quest.xp_reward) await awardXP(userId, quest.xp_reward, `quest_${quest.slug}`)
        }
    } catch (err) { logger.warn({ err }, '[Worker] Quest update failed') }
}

// Helper: awardXP
async function awardXP(userId: string, amount: number, source: string): Promise<void> {
    try {
        const supabase = getSupabase()
        const { data: profile } = await supabase.from('public_profiles').select('xp, level').eq('user_id', userId).single()
        if (!profile) return

        const newXP = (profile.xp || 0) + amount
        const newLevel = Math.floor(newXP / 500) + 1
        const updates: any = { xp: newXP }
        if (newLevel > (profile.level || 1)) updates.level = newLevel

        await supabase.from('public_profiles').update(updates).eq('user_id', userId)
        logger.info({ userId, amount, source, newLevel }, '[Worker] XP awarded')
    } catch (err) { logger.warn({ err }, '[Worker] XP award failed') }
}

// Helper: emitSessionComplete
interface SessionCompletePayload {
    shotsAttempted: number
    shotsMade: number
    mentalScore: number
    offensiveRating: number
    shotDnaPurity: number
}

async function emitSessionComplete(userId: string, sessionId: string, payload: SessionCompletePayload): Promise<void> {
    try {
        const supabase = getSupabase()
        const fgPct = payload.shotsAttempted > 0 ? Math.round((payload.shotsMade / payload.shotsAttempted) * 1000) / 10 : 0

        await supabase.from('activity_feed').insert({
            user_id: userId,
            type: 'session_complete',
            title: `Session terminée — ${fgPct}% au tir`,
            description: `${payload.shotsAttempted} tirs | Rating ${payload.offensiveRating}`,
            metadata: { session_id: sessionId, ...payload, fg_pct: fgPct },
        })

        logger.info({ userId, sessionId }, '[Worker] Session complete event emitted')
    } catch (err) { logger.warn({ err }, '[Worker] Event emission failed') }
}
