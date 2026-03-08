import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import pino from 'pino'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
})

export interface TikTokConfig {
    accessToken: string
    openId: string
}

export class TikTokService {
    private supabase: SupabaseClient

    constructor() {
        const url = process.env.SUPABASE_URL!
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
        this.supabase = createClient(url, key)
    }

    /**
     * Publishes a highlight reel to TikTok.
     * Requires the user to have linked their TikTok account.
     */
    async publishHighlight(userId: string, videoUrl: string, caption: string) {
        logger.info({ userId, videoUrl }, '[TikTok] Attempting to publish highlight')

        try {
            // 1. Fetch user's TikTok credentials from DB
            const { data: credentials, error: credError } = await this.supabase
                .from('user_integrations')
                .select('*')
                .eq('user_id', userId)
                .eq('provider', 'tiktok')
                .single()

            if (credError || !credentials) {
                logger.warn({ userId }, '[TikTok] No linked TikTok account found')
                return { success: false, error: 'NO_LINKED_ACCOUNT' }
            }

            // TikTok Business API integration
            // Requires TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET env vars
            const tiktokClientKey = process.env.TIKTOK_CLIENT_KEY
            if (!tiktokClientKey) {
                logger.warn('[TikTok] TikTok integration not configured — TIKTOK_CLIENT_KEY missing')
                return {
                    success: false,
                    error: 'TIKTOK_NOT_CONFIGURED',
                    tiktok_available: false,
                    reason: 'pending_approval',
                    message: 'TikTok sharing requires Business API approval. Feature coming soon.'
                }
            }

            // Initiate TikTok Video Upload via Content Posting API
            const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${credentials.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    post_info: {
                        title: caption.slice(0, 150),
                        privacy_level: 'SELF_ONLY', // Safe default, user can change on TikTok
                        disable_duet: false,
                        disable_comment: false,
                        disable_stitch: false,
                    },
                    source_info: {
                        source: 'PULL_FROM_URL',
                        video_url: videoUrl,
                    }
                })
            })

            if (!initResponse.ok) {
                const errBody = await initResponse.json().catch(() => ({}))
                logger.error({ errBody, status: initResponse.status }, '[TikTok] Upload init failed')
                return { success: false, error: 'UPLOAD_INIT_FAILED', details: errBody }
            }

            const initData = await initResponse.json()
            const publishId = initData?.data?.publish_id

            // 3. Log the activity
            await this.supabase.from('activity_feed').insert({
                user_id: userId,
                type: 'viral_share',
                title: 'Viral Highlight Shared!',
                description: 'Your session highlight was posted to TikTok.',
                metadata: { video_url: videoUrl, platform: 'tiktok', publish_id: publishId }
            })

            return { success: true, postId: publishId || `tt_${Date.now()}` }
        } catch (err) {
            logger.error({ err, userId }, '[TikTok] Publish failed')
            return { success: false, error: 'PUBLISH_FAILED' }
        }
    }

    /**
     * Prepares a video for TikTok's vertical format.
     * Uses FFmpeg to crop and scale to 1080x1920.
     */
    async transcodeForTikTok(localPath: string): Promise<string> {
        const outputPath = localPath.replace('.mp4', '_tiktok.mp4')

        logger.info({ localPath, outputPath }, '[TikTok] Starting 9:16 vertical transcoding...')

        return new Promise((resolve, reject) => {
            ffmpeg(localPath)
                // Center-crop to 9:16 ratio
                // formula: crop=H*9/16:H:(W-H*9/16)/2:0
                .videoFilters([
                    'crop=ih*9/16:ih:(iw-ih*9/16)/2:0',
                    'scale=1080:1920'
                ])
                .outputOptions([
                    '-c:v libx264',
                    '-preset fast',
                    '-crf 23',
                    '-c:a copy'
                ])
                .on('start', (cmd) => logger.debug({ cmd }, '[TikTok] FFmpeg started'))
                .on('progress', (progress) => {
                    logger.debug({ percent: progress.percent }, '[TikTok] Transcoding progress')
                })
                .on('error', (err) => {
                    logger.error({ err }, '[TikTok] FFmpeg error')
                    reject(err)
                })
                .on('end', () => {
                    logger.info({ outputPath }, '[TikTok] Transcoding complete')
                    resolve(outputPath)
                })
                .save(outputPath)
        })
    }
}

export const tiktokService = new TikTokService()
