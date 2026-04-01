import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import os from 'os'
import fs from 'fs'
import type { ShotResult } from './shotAnalysis'
import {
    type MusicConfig,
    type MusicTrack,
    DEFAULT_MUSIC_CONFIG,
    autoSelectTrack,
    getTrackUrl,
    computeBeatTimestamps,
} from './musicLibrary'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Template de montage vidéo */
export type HighlightTemplate = 'cinema' | 'espn' | 'tiktok'

/** Export format profile */
export type ExportProfile = 'tiktok_9x16' | 'instagram_4x5' | 'landscape_16x9'

/** CV-engine event (from Python pipeline) */
export interface CVHighlightEvent {
    event_type: string
    timestamp_sec: number
    end_sec: number
    confidence: number
    score: number
    zone?: string | null
    description: string
    metadata?: Record<string, unknown>
}

/** Clip individuel avec score */
export interface HighlightClip {
    timestamp: string
    startSec: number
    endSec: number
    score: number
    description: string
    action: string
    /** Slow motion factor (1.0 = normal, 0.6 = 60% speed) */
    slowMo?: number
    /** Text overlay label (e.g. "3PT", "DUNK") */
    overlayLabel?: string
}

/** Résultat du montage */
export interface HighlightResult {
    outputPath: string
    clips: HighlightClip[]
    durationSec: number
    template: HighlightTemplate
    /** Music track used (null if no music) */
    music: MusicTrack | null
    /** Export profile used */
    exportProfile: ExportProfile
    /** Final file size in bytes */
    fileSizeBytes?: number
}

// ═══════════════════════════════════════════════════════════════
// EXPORT PROFILES
// ═══════════════════════════════════════════════════════════════

interface ExportSettings {
    width: number
    height: number
    maxBitrate: string    // e.g. "4M"
    maxFileSizeMB: number
    crf: number
    scaleFilter: string
    padFilter: string
}

const EXPORT_PROFILES: Record<ExportProfile, ExportSettings> = {
    tiktok_9x16: {
        width: 1080, height: 1920,
        maxBitrate: '4M', maxFileSizeMB: 50, crf: 24,
        scaleFilter: 'scale=1080:1920:force_original_aspect_ratio=decrease',
        padFilter: 'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
    },
    instagram_4x5: {
        width: 1080, height: 1350,
        maxBitrate: '5M', maxFileSizeMB: 50, crf: 23,
        scaleFilter: 'scale=1080:1350:force_original_aspect_ratio=decrease',
        padFilter: 'pad=1080:1350:(ow-iw)/2:(oh-ih)/2:black',
    },
    landscape_16x9: {
        width: 1920, height: 1080,
        maxBitrate: '6M', maxFileSizeMB: 100, crf: 22,
        scaleFilter: 'scale=1920:1080:force_original_aspect_ratio=decrease',
        padFilter: 'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
    },
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE CONFIG
// ═══════════════════════════════════════════════════════════════

/** Configuration par template */
const TEMPLATE_CONFIG: Record<HighlightTemplate, {
    transitionDuration: number
    preClipSec: number
    postClipSec: number
    maxClips: number
    targetDuration: number
    overlayStyle: string
    defaultExportProfile: ExportProfile
}> = {
    cinema: {
        transitionDuration: 1.0,
        preClipSec: 2.0,
        postClipSec: 1.5,
        maxClips: 10,
        targetDuration: 60,
        overlayStyle: 'cinematic',
        defaultExportProfile: 'landscape_16x9',
    },
    espn: {
        transitionDuration: 0.5,
        preClipSec: 1.5,
        postClipSec: 1.0,
        maxClips: 15,
        targetDuration: 90,
        overlayStyle: 'broadcast',
        defaultExportProfile: 'landscape_16x9',
    },
    tiktok: {
        transitionDuration: 0.3,
        preClipSec: 1.0,
        postClipSec: 0.5,
        maxClips: 8,
        targetDuration: 30,
        overlayStyle: 'hype',
        defaultExportProfile: 'tiktok_9x16',
    },
}

// ═══════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Score shot-analysis results into highlight clips.
 */
function scoreActions(shots: ShotResult[]): HighlightClip[] {
    const clips: HighlightClip[] = []

    for (const shot of shots) {
        let score = 0
        let description = ''
        let action = ''
        let slowMo: number | undefined
        let overlayLabel: string | undefined

        switch (shot.outcome) {
            case 'made':
                action = 'Panier'
                switch (shot.zone) {
                    case 'corner3':
                        score = 15
                        description = 'Corner 3 points'
                        overlayLabel = '3PT'
                        break
                    case 'wing3':
                    case 'top3':
                        score = 12
                        description = `3 points depuis ${shot.zone === 'wing3' ? "l'aile" : 'le top'}`
                        overlayLabel = '3PT'
                        break
                    case 'midrange':
                        score = 8
                        description = 'Mi-distance clutch'
                        overlayLabel = 'BUCKET'
                        break
                    case 'paint':
                        score = 6
                        description = 'Finition dans la raquette'
                        overlayLabel = 'BUCKET'
                        break
                    case 'restricted':
                        score = 7
                        description = 'Layup / Finition au cercle'
                        overlayLabel = 'BUCKET'
                        break
                }
                if (shot.nbaComparison.similarity > 70) {
                    score += 3
                    description += ` (style ${shot.nbaComparison.closestPlayer})`
                }
                break

            case 'blocked':
                score = 10
                action = 'Contre'
                description = 'Contre defensif'
                overlayLabel = 'BLOCK'
                slowMo = 0.6
                break

            case 'missed':
                if (shot.posture.followThrough) {
                    score = 3
                    action = 'Bonne tentative'
                    description = `Tentative depuis ${shot.zone} — bonne mecanique`
                } else {
                    score = 0
                }
                break
        }

        if (score > 0) {
            const parts = shot.timestamp.split(':')
            const startSec = parseInt(parts[0]) * 60 + parseInt(parts[1])
            clips.push({
                timestamp: shot.timestamp,
                startSec,
                endSec: startSec + 3,
                score,
                description,
                action,
                slowMo,
                overlayLabel,
            })
        }
    }

    return clips.sort((a, b) => b.score - a.score)
}

/**
 * Convert CV-engine highlight events (from Python pipeline) into HighlightClips.
 * These already have timestamps and scores from the AI detection.
 */
function cvEventsToClips(events: CVHighlightEvent[]): HighlightClip[] {
    return events.map((ev) => {
        let slowMo: number | undefined
        let overlayLabel: string | undefined

        switch (ev.event_type) {
            case 'dunk':
                slowMo = 0.6
                overlayLabel = 'DUNK'
                break
            case 'three_pointer':
                overlayLabel = '3PT'
                break
            case 'shot_made':
                overlayLabel = 'BUCKET'
                break
            case 'block':
                slowMo = 0.6
                overlayLabel = 'BLOCK'
                break
            case 'crowd_reaction':
                overlayLabel = 'HYPE'
                break
        }

        const mins = Math.floor(ev.timestamp_sec / 60)
        const secs = Math.floor(ev.timestamp_sec % 60)
        const ts = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

        return {
            timestamp: ts,
            startSec: ev.timestamp_sec,
            endSec: ev.end_sec,
            score: ev.score,
            description: ev.description,
            action: ev.event_type,
            slowMo,
            overlayLabel,
        }
    }).sort((a, b) => b.score - a.score)
}

// ═══════════════════════════════════════════════════════════════
// TTS (OPTIONAL)
// ═══════════════════════════════════════════════════════════════

async function generateTTS(text: string, outputPath: string): Promise<string> {
    const ttsUrl = process.env.COQUI_TTS_URL || 'http://localhost:5002'
    try {
        const response = await fetch(`${ttsUrl}/api/tts?text=${encodeURIComponent(text)}`)
        if (response.ok) {
            const audioBuffer = await response.arrayBuffer()
            const ttsPath = outputPath.replace('.mp4', '_tts.wav')
            fs.writeFileSync(ttsPath, Buffer.from(audioBuffer))
            return ttsPath
        }
    } catch {
        // TTS unavailable
    }
    return ''
}

// ═══════════════════════════════════════════════════════════════
// FFMPEG PRIMITIVES
// ═══════════════════════════════════════════════════════════════

/**
 * Extract a clip with optional slow-motion, overlay text, and export profile formatting.
 */
function extractClip(
    videoPath: string,
    clip: HighlightClip,
    outputPath: string,
    template: HighlightTemplate,
    exportProfile: ExportProfile,
    playerName: string,
): Promise<void> {
    const tplCfg = TEMPLATE_CONFIG[template]
    const expCfg = EXPORT_PROFILES[exportProfile]
    const actualStart = Math.max(0, clip.startSec - tplCfg.preClipSec)
    const duration = (clip.endSec + tplCfg.postClipSec) - actualStart

    return new Promise((resolve, reject) => {
        const filters: string[] = []

        // 1. Slow motion (via setpts + atempo)
        const slowFactor = clip.slowMo ?? 1.0
        if (slowFactor < 1.0) {
            const ptsMult = (1 / slowFactor).toFixed(3)
            filters.push(`setpts=${ptsMult}*PTS`)
        }

        // 2. Template color grading
        if (template === 'cinema') {
            filters.push('colorbalance=rs=0.1:gs=-0.05:bs=0.1')
        }

        // 3. Export profile scaling
        filters.push(expCfg.scaleFilter, expCfg.padFilter)

        // 4. Overlay label (e.g. "3PT", "DUNK")
        if (clip.overlayLabel) {
            const fontSize = exportProfile === 'tiktok_9x16' ? 72 : 56
            const overlayEsc = clip.overlayLabel.replace(/'/g, "\\'")
            filters.push(
                `drawtext=text='${overlayEsc}':fontsize=${fontSize}:fontcolor=white:` +
                `borderw=3:bordercolor=black:x=(w-tw)/2:y=h*0.12:enable='between(t,0.3,2.5)'`,
            )
        }

        // 5. Player name lower-third
        if (playerName && playerName !== 'Player') {
            const nameEsc = playerName.replace(/'/g, "\\'")
            const nameFontSize = exportProfile === 'tiktok_9x16' ? 36 : 28
            filters.push(
                `drawtext=text='${nameEsc}':fontsize=${nameFontSize}:fontcolor=white@0.85:` +
                `borderw=2:bordercolor=black@0.6:x=20:y=h-60:enable='between(t,0.5,3.0)'`,
            )
        }

        // 6. CourtVision AI watermark (always)
        filters.push(
            "drawtext=text='CourtVision AI':fontsize=20:fontcolor=white@0.4:" +
            'borderw=1:bordercolor=black@0.3:x=w-tw-15:y=h-th-15',
        )

        let command = ffmpeg(videoPath)
            .setStartTime(actualStart)
            .setDuration(slowFactor < 1.0 ? duration / slowFactor : duration)
            .videoFilters(filters)
            .outputOptions([
                '-c:v libx264',
                `-crf ${expCfg.crf}`,
                '-preset fast',
                `-maxrate ${expCfg.maxBitrate}`,
                `-bufsize ${parseInt(expCfg.maxBitrate) * 2}M`,
                '-pix_fmt yuv420p',
            ])

        // Audio: slow-mo needs atempo
        if (slowFactor < 1.0) {
            command = command.audioFilters([`atempo=${slowFactor}`])
        }

        command
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err))
            .run()
    })
}

/**
 * Concatenate clips via FFmpeg concat demuxer.
 */
function concatenateClips(clipPaths: string[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const listPath = outputPath.replace('.mp4', '_list.txt')
        const listContent = clipPaths.map((p) => `file '${p}'`).join('\n')
        fs.writeFileSync(listPath, listContent)

        ffmpeg()
            .input(listPath)
            .inputOptions(['-f concat', '-safe 0'])
            .outputOptions(['-c copy'])
            .output(outputPath)
            .on('end', () => {
                try { fs.unlinkSync(listPath) } catch { /* ignore */ }
                resolve()
            })
            .on('error', (err: Error) => reject(err))
            .run()
    })
}

/**
 * Download a music file from URL to local temp path.
 */
async function downloadMusicFile(url: string, tempDir: string): Promise<string> {
    const musicPath = path.join(tempDir, `music_${Date.now()}.mp3`)
    try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const buffer = Buffer.from(await response.arrayBuffer())
        fs.writeFileSync(musicPath, buffer)
        return musicPath
    } catch {
        return ''
    }
}

/**
 * Mix background music onto video.
 * Loops music, ducks volume, fades in/out, mixes with original audio.
 */
function mixMusicTrack(
    videoPath: string,
    musicPath: string,
    outputPath: string,
    config: MusicConfig,
    videoDurationSec: number,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const { volume, fadeInSec, fadeOutSec } = config
        const fadeOutStart = Math.max(0, videoDurationSec - fadeOutSec)

        const audioFilter = [
            `[1:a]aloop=loop=-1:size=2e+09,atrim=0:${videoDurationSec},` +
            `volume=${volume},` +
            `afade=t=in:st=0:d=${fadeInSec},` +
            `afade=t=out:st=${fadeOutStart}:d=${fadeOutSec}[music]`,
            '[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[out]',
        ].join(';')

        ffmpeg()
            .input(videoPath)
            .input(musicPath)
            .complexFilter(audioFilter, 'out')
            .outputOptions(['-c:v copy', '-c:a aac', '-b:a 192k', '-map 0:v:0', '-map [out]', '-shortest'])
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err))
            .run()
    })
}

/**
 * Nudge clip cut-points to the nearest beat timestamp for rhythmic editing.
 * Only adjusts within ±0.3s to avoid large timing shifts.
 */
function beatSyncClips(clips: HighlightClip[], beats: number[]): HighlightClip[] {
    if (!beats.length) return clips
    const MAX_SHIFT = 0.3

    return clips.map((clip) => {
        // Find nearest beat to clip start
        let bestStart = clip.startSec
        let bestDist = Infinity
        for (const b of beats) {
            const d = Math.abs(b - clip.startSec)
            if (d < bestDist && d <= MAX_SHIFT) {
                bestDist = d
                bestStart = b
            }
        }
        return { ...clip, startSec: bestStart }
    })
}

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Create a highlight reel from shot analysis OR CV-engine events.
 *
 * Features:
 * - Slow motion for dunks & blocks (0.6x)
 * - Visual overlays: event labels, player name lower-third, watermark
 * - Export profiles: TikTok 9:16, Instagram 4:5, landscape 16:9
 * - Bitrate optimization targeting <50MB output
 * - Beat-sync clip cutting when music is enabled
 * - Background music mixing with ducking & fade
 *
 * @param videoPath   Local file path to source video
 * @param shots       Shot analysis results (traditional pipeline)
 * @param template    Editing template (cinema / espn / tiktok)
 * @param playerName  Player name for overlay
 * @param musicConfig null = auto-select, undefined = no music
 * @param cvEvents    CV-engine highlight events (overrides shots if provided)
 * @param exportProfile  Export format (overrides template default if provided)
 */
export async function createHighlightReel(
    videoPath: string,
    shots: ShotResult[],
    template: HighlightTemplate = 'espn',
    playerName: string = 'Player',
    musicConfig?: MusicConfig | null,
    cvEvents?: CVHighlightEvent[],
    exportProfile?: ExportProfile,
): Promise<HighlightResult> {
    const tplCfg = TEMPLATE_CONFIG[template]
    const expProfile = exportProfile ?? tplCfg.defaultExportProfile
    const tempDir = path.join(os.tmpdir(), `cv_highlight_${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })

    // 1. Build clips from CV events (preferred) or shot analysis
    let allClips: HighlightClip[]
    if (cvEvents && cvEvents.length > 0) {
        allClips = cvEventsToClips(cvEvents)
    } else {
        allClips = scoreActions(shots)
    }

    const selectedClips = allClips.slice(0, tplCfg.maxClips)

    if (selectedClips.length === 0) {
        return {
            outputPath: videoPath,
            clips: [],
            durationSec: 0,
            template,
            music: null,
            exportProfile: expProfile,
        }
    }

    // 2. Sort chronologically
    selectedClips.sort((a, b) => a.startSec - b.startSec)

    // 3. Resolve music early (needed for beat-sync)
    const totalDurationEstimate = selectedClips.reduce((sum, c) => {
        const raw = (c.endSec - c.startSec) + tplCfg.preClipSec + tplCfg.postClipSec
        const factor = c.slowMo ?? 1.0
        return sum + (factor < 1.0 ? raw / factor : raw)
    }, 0)

    const resolvedMusic: MusicConfig = musicConfig === null
        ? { ...DEFAULT_MUSIC_CONFIG, track: autoSelectTrack(template, totalDurationEstimate) }
        : musicConfig ?? { ...DEFAULT_MUSIC_CONFIG, track: null }

    // 4. Beat-sync clip cuts if music enabled
    let clipsToRender = selectedClips
    if (resolvedMusic.track && resolvedMusic.beatSync && resolvedMusic.track.beatSyncable) {
        const beats = computeBeatTimestamps(resolvedMusic.track, totalDurationEstimate)
        clipsToRender = beatSyncClips(selectedClips, beats)
    }

    // 5. Extract each clip with slow-mo, overlays, export format
    const clipPaths: string[] = []
    for (let i = 0; i < clipsToRender.length; i++) {
        const clip = clipsToRender[i]
        const clipPath = path.join(tempDir, `clip_${i.toString().padStart(3, '0')}.mp4`)
        await extractClip(videoPath, clip, clipPath, template, expProfile, playerName)
        clipPaths.push(clipPath)
    }

    // 6. Concatenate
    const rawOutputPath = path.join(tempDir, 'highlight_raw.mp4')
    await concatenateClips(clipPaths, rawOutputPath)

    // 7. TTS on best action (optional)
    if (clipsToRender.length > 0) {
        const bestClip = allClips[0]
        const ttsText = `${bestClip.description}. ${playerName} en mode ${
            template === 'cinema' ? 'cinematique' : template === 'tiktok' ? 'viral' : 'broadcast'
        }.`
        await generateTTS(ttsText, rawOutputPath)
    }

    // 8. Mix background music
    let usedTrack: MusicTrack | null = null
    let finalOutputPath = rawOutputPath

    if (resolvedMusic.track) {
        const trackUrl = getTrackUrl(resolvedMusic.track)
        const musicLocalPath = await downloadMusicFile(trackUrl, tempDir)

        if (musicLocalPath) {
            const musicOutputPath = path.join(tempDir, `highlight_${template}_music_${Date.now()}.mp4`)
            try {
                await mixMusicTrack(rawOutputPath, musicLocalPath, musicOutputPath, resolvedMusic, totalDurationEstimate)
                finalOutputPath = musicOutputPath
                usedTrack = resolvedMusic.track
            } catch {
                // Music mixing failed — continue without
            }
            try { fs.unlinkSync(musicLocalPath) } catch { /* ignore */ }
        }
    }

    // 9. Cleanup temp clips
    for (const cp of clipPaths) {
        try { fs.unlinkSync(cp) } catch { /* ignore */ }
    }
    if (finalOutputPath !== rawOutputPath) {
        try { fs.unlinkSync(rawOutputPath) } catch { /* ignore */ }
    }

    // 10. Get file size
    let fileSizeBytes: number | undefined
    try {
        const stat = fs.statSync(finalOutputPath)
        fileSizeBytes = stat.size
    } catch {
        // ignore
    }

    return {
        outputPath: finalOutputPath,
        clips: clipsToRender,
        durationSec: Math.round(totalDurationEstimate),
        template,
        music: usedTrack,
        exportProfile: expProfile,
        fileSizeBytes,
    }
}
