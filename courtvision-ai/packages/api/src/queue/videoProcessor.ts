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
    // V5 Apex AI modules
    ShotDNAEngine,
    AdvancedAnalyticsEngine,
    PredictiveEngine,
    type ShotDNAProfile,
    type AdvancedAnalyticsResult,
    type ShotResult,
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
let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
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
            // 0. Update status to analyzing
            await getSupabase().from('sessions').update({ status: 'analyzing' }).eq('id', sessionId)

            // 1. Download video from Supabase Storage / URL to local temp file
            localVideoPath = await downloadVideo(videoUrl)
            await job.updateProgress(5)

            // 2. Prétraitement vidéo (local file path)
            const prepRes = await preprocessVideo(localVideoPath, calibration)
            await job.updateProgress(10)

            // 3. Tracking (MediaPipe + YOLOv8 + ByteTrack)
            const trackingRes = await runTracking(prepRes.framesDir)
            await job.updateProgress(25)

            // 4. Reconstruction 3D
            const reconRes = await reconstruct3DSpace(
                trackingRes,
                prepRes.homographyMatrix,
                prepRes.resolution,
                prepRes.fps
            )
            await job.updateProgress(35)

            // 5. Analyse des tirs
            const shotsRes = await analyzeShots(trackingRes, reconRes)
            await job.updateProgress(45)

            // 6. Analyse psychologique
            const mentalRes = await analyzeMentality(trackingRes, shotsRes)
            await job.updateProgress(55)

            // ── V5 APEX: Shot DNA™ ──────────────────────────
            // Fetch historical signature for drift detection
            const { data: existingDna } = await getSupabase()
                .from('shot_dna')
                .select('*')
                .eq('user_id', userId)
                .single()

            const historicalSignature = existingDna ? {
                avgElbowAngle: existingDna.avg_elbow_angle,
                avgReleaseHeight: existingDna.avg_release_height,
                avgReleaseTime: existingDna.avg_release_time,
                followThroughPct: existingDna.follow_through_pct,
                dominantHand: existingDna.dominant_hand as 'right' | 'left',
                elbowStdDev: 0,
                releaseHeightStdDev: 0,
            } : undefined

            const shotDnaProfile: ShotDNAProfile = ShotDNAEngine.buildProfile(shotsRes, historicalSignature)
            await job.updateProgress(62)

            // Compute shot quality for each individual shot
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

            // Upsert Shot DNA profile
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
                optimal_zone: Object.entries(shotDnaProfile.zoneEfficiency)
                    .sort(([, a], [, b]) => (b as any).pct - (a as any).pct)[0]?.[0] || 'midrange',
                mechanical_drift: shotDnaProfile.mechanicalDrift,
                total_shots_analyzed: shotDnaProfile.totalShotsAnalyzed + (existingDna?.total_shots_analyzed || 0),
                last_updated: new Date().toISOString(),
            }, { onConflict: 'user_id' })

            // Insert individual shot signatures
            if (shotSignatures.length > 0) {
                await getSupabase().from('shot_signatures').insert(shotSignatures)
            }
            await job.updateProgress(68)

            // ── V5 APEX: Advanced Analytics ─────────────────
            const sessionDurationSec = prepRes.fps > 0 ? (trackingRes.length || 0) / prepRes.fps : 600
            const advancedAnalytics: AdvancedAnalyticsResult = AdvancedAnalyticsEngine.compute(
                shotsRes,
                mentalRes,
                sessionDurationSec
            )

            await getSupabase().from('advanced_analytics').insert({
                user_id: userId,
                session_id: sessionId,
                shot_quality_avg: advancedAnalytics.shotQualityAvg,
                clutch_rating: advancedAnalytics.clutchRating,
                court_balance_index: advancedAnalytics.courtBalanceIndex,
                offensive_rating: advancedAnalytics.offensiveRating,
                true_shooting_pct: advancedAnalytics.trueShooting,
                effective_fg_pct: advancedAnalytics.effectiveFG,
                longest_make_streak: advancedAnalytics.longestMakeStreak,
                longest_miss_streak: advancedAnalytics.longestMissStreak,
                hot_zones: advancedAnalytics.hotZones,
                cold_zones: advancedAnalytics.coldZones,
                momentum_shifts: advancedAnalytics.momentumShifts,
                peak_performance_window: advancedAnalytics.peakPerformanceWindow,
            })
            await job.updateProgress(75)

            // ── V5 APEX: Validate Prediction (if exists) ────
            const { data: pendingPrediction } = await getSupabase()
                .from('predictions')
                .select('*')
                .eq('user_id', userId)
                .eq('validated', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (pendingPrediction) {
                const actualFGPct = shotsRes.length > 0
                    ? (shotsRes.filter((s: ShotResult) => s.outcome === 'made').length / shotsRes.length) * 100
                    : 0
                const accuracy = PredictiveEngine.validatePrediction(
                    {
                        predictedFGPct: pendingPrediction.predicted_fg_pct,
                        predictedMentalScore: pendingPrediction.predicted_mental_score,
                    } as any,
                    { fgPct: actualFGPct, mentalScore: mentalRes.bodyLanguageScore || 60 }
                )
                await getSupabase().from('predictions').update({
                    actual_fg_pct: actualFGPct,
                    actual_mental_score: mentalRes.bodyLanguageScore || 60,
                    prediction_accuracy: accuracy,
                    validated: true,
                }).eq('id', pendingPrediction.id)
            }
            await job.updateProgress(78)

            // ── V5 APEX: Quest Progress ─────────────────────
            await updateQuestProgress(userId, shotsRes, mentalRes)
            await job.updateProgress(82)

            // 7. Rapport IA + Programme 7 jours
            const report = await createAiReport({
                tracking: trackingRes,
                reconstruction: reconRes,
                shots: shotsRes,
                mental: mentalRes
            })
            await job.updateProgress(88)

            // 8. Highlight Reel
            const highlight = await createHighlightReel(videoUrl, shotsRes, 'espn')
            await job.updateProgress(93)

            // 9. Sauvegarder toutes les données dans la table analyses
            const { error: analysisError } = await getSupabase().from('analyses').insert({
                session_id: sessionId,
                shot_attempts: shotsRes.length,
                shot_made: shotsRes.filter((s: ShotResult) => s.outcome === 'made').length,
                shot_zones: shotsRes.map((s: ShotResult) => ({ zone: s.zone, outcome: s.outcome, posture: s.posture })),
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
                    trainingProgram: report.trainingProgram,
                    // V5 enriched data
                    shotDna: {
                        purityScore: shotDnaProfile.purityScore,
                        closestNBA: shotDnaProfile.closestNBAPlayer,
                        nbaSimilarity: shotDnaProfile.nbaSimilarity,
                        avgShotQuality: shotDnaProfile.avgShotQuality,
                        mechanicalDrift: shotDnaProfile.mechanicalDrift,
                    },
                    advancedAnalytics: {
                        offensiveRating: advancedAnalytics.offensiveRating,
                        overallGrade: advancedAnalytics.overallGrade,
                        clutchRating: advancedAnalytics.clutchRating,
                        trueShooting: advancedAnalytics.trueShooting,
                        hotZones: advancedAnalytics.hotZones,
                        coldZones: advancedAnalytics.coldZones,
                    },
                })
            })

            if (analysisError) {
                throw new Error(`Failed to save analysis: ${analysisError.message}`)
            }

            // 10. Update session status
            await getSupabase().from('sessions').update({ status: 'complete' }).eq('id', sessionId)

            // 11. Emit V5 session complete event for crew notifications
            await emitSessionComplete(userId, sessionId, {
                shotsAttempted: shotsRes.length,
                shotsMade: shotsRes.filter((s: ShotResult) => s.outcome === 'made').length,
                mentalScore: mentalRes.bodyLanguageScore || 60,
                offensiveRating: advancedAnalytics.offensiveRating,
                shotDnaPurity: shotDnaProfile.purityScore,
            })

            await job.updateProgress(100)

            return { success: true, version: 'v5-apex' }
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

// ── V5 Quest Progress Tracker ────────────────────────────────

/**
 * Update quest progress after session processing.
 * Checks all active quests for the user and increments progress.
 */
async function updateQuestProgress(userId: string, shotsRes: ShotResult[], mentalRes: any): Promise<void> {
    try {
        const supabase = getSupabase()

        // Get active quests for this user
        const { data: activeQuests } = await supabase
            .from('user_quests')
            .select('*, quest:quests(*)')
            .eq('user_id', userId)
            .eq('status', 'active')

        if (!activeQuests || activeQuests.length === 0) return

        const shotsMade = shotsRes.filter((s: ShotResult) => s.outcome === 'made').length
        const mentalScore = mentalRes.bodyLanguageScore || 60

        for (const uq of activeQuests) {
            const quest = uq.quest
            if (!quest) continue

            let newValue = uq.current_value
            let completed = false

            switch (quest.condition_type) {
                case 'sessions_today':
                case 'sessions_week':
                case 'sessions_count':
                    newValue += 1
                    break
                case 'shots_today':
                case 'shots_week':
                case 'shots_month':
                case 'total_shots':
                    newValue += shotsRes.length
                    break
                case 'mental_score_above':
                    if (mentalScore >= quest.condition_value) newValue = mentalScore
                    break
                case 'avg_mental_month':
                    // Rolling average (simplified)
                    newValue = (newValue + mentalScore) / 2
                    break
            }

            const progressPct = Math.min(100, (newValue / uq.target_value) * 100)
            completed = newValue >= uq.target_value

            await supabase.from('user_quests').update({
                current_value: newValue,
                progress_pct: progressPct,
                status: completed ? 'completed' : 'active',
                completed_at: completed ? new Date().toISOString() : null,
            }).eq('id', uq.id)

            // Award XP if quest completed
            if (completed && quest.xp_reward) {
                await awardXP(userId, quest.xp_reward, `quest_${quest.slug}`)
            }
        }
    } catch (error) {
        console.warn('[V5 Quests] Quest progress update failed (non-critical):', error)
    }
}

/**
 * Award XP to a user and handle level-up logic.
 */
async function awardXP(userId: string, amount: number, source: string): Promise<void> {
    try {
        const supabase = getSupabase()

        // Get current XP from public_profiles
        const { data: profile } = await supabase
            .from('public_profiles')
            .select('xp, level')
            .eq('user_id', userId)
            .single()

        if (!profile) return

        const newXP = (profile.xp || 0) + amount
        const newLevel = Math.floor(newXP / 500) + 1 // 500 XP per level

        const updates: any = { xp: newXP }
        if (newLevel > (profile.level || 1)) {
            updates.level = newLevel
        }

        await supabase.from('public_profiles').update(updates).eq('user_id', userId)

        // Update season progress if active season
        const { data: activeSeason } = await supabase
            .from('seasons')
            .select('id')
            .eq('active', true)
            .single()

        if (activeSeason) {
            try {
                await supabase.rpc('increment_season_xp', {
                    p_user_id: userId,
                    p_season_id: activeSeason.id,
                    p_xp: amount,
                })
            } catch {
                // Silently fail if RPC doesn't exist yet
            }
        }

        console.log(`[V5 XP] +${amount} XP for ${userId} (source: ${source}) → Level ${newLevel}`)
    } catch (error) {
        console.warn('[V5 XP] XP award failed (non-critical):', error)
    }
}

// ── V5 Session Complete Event Emitter ────────────────────────

interface SessionCompletePayload {
    shotsAttempted: number
    shotsMade: number
    mentalScore: number
    offensiveRating: number
    shotDnaPurity: number
}

/**
 * Emit session complete event for:
 * - Crew notifications
 * - Activity feed
 * - Leaderboard updates
 * - Push notifications
 */
async function emitSessionComplete(
    userId: string,
    sessionId: string,
    payload: SessionCompletePayload
): Promise<void> {
    try {
        const supabase = getSupabase()
        const fgPct = payload.shotsAttempted > 0
            ? Math.round((payload.shotsMade / payload.shotsAttempted) * 1000) / 10
            : 0

        // 1. Add to activity feed
        try {
            await supabase.from('activity_feed').insert({
                user_id: userId,
                type: 'session_complete',
                title: `Session terminée — ${fgPct}% au tir`,
                description: `${payload.shotsAttempted} tirs | Mental ${payload.mentalScore} | Rating ${payload.offensiveRating}`,
                metadata: {
                    session_id: sessionId,
                    ...payload,
                    fg_pct: fgPct,
                },
            })
        } catch { /* non-critical */ }

        // 2. Update public profile stats
        try {
            await supabase.rpc('update_profile_stats', {
                p_user_id: userId,
                p_shots: payload.shotsAttempted,
                p_made: payload.shotsMade,
                p_mental: payload.mentalScore,
            })
        } catch { /* non-critical, RPC may not exist */ }

        // 3. Notify crew members
        const { data: crewMembership } = await supabase
            .from('crew_members')
            .select('crew_id')
            .eq('user_id', userId)
            .limit(1)
            .single()

        if (crewMembership) {
            // Update crew total sessions
            try {
                await supabase.rpc('increment_crew_sessions', {
                    p_crew_id: crewMembership.crew_id,
                })
            } catch { /* non-critical */ }

            // Get user info for notification
            const { data: user } = await supabase
                .from('users')
                .select('username')
                .eq('id', userId)
                .single()

            if (user) {
                // Insert crew notification for other members
                const { data: crewMembers } = await supabase
                    .from('crew_members')
                    .select('user_id')
                    .eq('crew_id', crewMembership.crew_id)
                    .neq('user_id', userId)

                if (crewMembers && crewMembers.length > 0) {
                    const notifications = crewMembers.map(m => ({
                        user_id: m.user_id,
                        type: 'crew',
                        title: `${user.username} a terminé une session!`,
                        body: `${fgPct}% au tir | Offensive Rating: ${payload.offensiveRating}`,
                        metadata: { session_id: sessionId, crew_id: crewMembership.crew_id },
                        read: false,
                    }))
                    try {
                        await supabase.from('notifications').insert(notifications)
                    } catch { /* non-critical */ }
                }
            }
        }

        // 4. Check for milestone badges
        await checkMilestoneBadges(userId, payload)

        console.log(`[V5 Events] Session complete event emitted for ${userId}`)
    } catch (error) {
        console.warn('[V5 Events] Session complete event failed (non-critical):', error)
    }
}

/**
 * Check and award milestone badges based on cumulative stats.
 */
async function checkMilestoneBadges(userId: string, payload: SessionCompletePayload): Promise<void> {
    try {
        const supabase = getSupabase()

        // Get user's cumulative stats
        const { data: profile } = await supabase
            .from('public_profiles')
            .select('total_shots, total_sessions, avg_shooting_pct, avg_mental_score')
            .eq('user_id', userId)
            .single()

        if (!profile) return

        const badgesToCheck: { slug: string; condition: boolean }[] = [
            { slug: 'first_session', condition: (profile.total_sessions || 0) >= 1 },
            { slug: 'session_10', condition: (profile.total_sessions || 0) >= 10 },
            { slug: 'session_50', condition: (profile.total_sessions || 0) >= 50 },
            { slug: 'session_100', condition: (profile.total_sessions || 0) >= 100 },
            { slug: 'shots_1000', condition: (profile.total_shots || 0) >= 1000 },
            { slug: 'shots_5000', condition: (profile.total_shots || 0) >= 5000 },
            { slug: 'sniper_60', condition: payload.shotsMade > 0 && (payload.shotsMade / payload.shotsAttempted) >= 0.6 },
            { slug: 'mental_90', condition: payload.mentalScore >= 90 },
            { slug: 'purity_85', condition: payload.shotDnaPurity >= 85 },
            { slug: 'offensive_rating_90', condition: payload.offensiveRating >= 90 },
        ]

        for (const badge of badgesToCheck) {
            if (!badge.condition) continue

            // Check if badge exists and not already earned
            const { data: badgeData } = await supabase
                .from('badges')
                .select('id, xp_reward')
                .eq('slug', badge.slug)
                .single()

            if (!badgeData) continue

            const { data: existing } = await supabase
                .from('user_badges')
                .select('id')
                .eq('user_id', userId)
                .eq('badge_id', badgeData.id)
                .single()

            if (!existing) {
                await supabase.from('user_badges').insert({
                    user_id: userId,
                    badge_id: badgeData.id,
                })

                if (badgeData.xp_reward) {
                    await awardXP(userId, badgeData.xp_reward, `badge_${badge.slug}`)
                }

                console.log(`[V5 Badges] 🏆 Badge "${badge.slug}" earned by ${userId}`)
            }
        }
    } catch (error) {
        console.warn('[V5 Badges] Badge check failed (non-critical):', error)
    }
}
