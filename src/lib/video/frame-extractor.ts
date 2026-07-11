/**
 * Extracts frames from a video file at specified intervals.
 * Works with local files and base64-encoded videos.
 * Uses ffmpeg via child_process if available, falls back gracefully.
 *
 * Server-only module.
 */

import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export interface ExtractedFrame {
  index: number
  timestampMs: number
  base64: string // JPEG base64 (without data: prefix)
  width: number
  height: number
}

export interface FrameExtractionOptions {
  videoBuffer: Buffer
  maxFrames?: number // default 20
  intervalMs?: number // default 1000 (1 fps)
}

/**
 * Check whether ffmpeg is available on the system PATH.
 * Result is cached for the lifetime of the process.
 */
let ffmpegAvailable: boolean | null = null

export function isFfmpegAvailable(): boolean {
  if (ffmpegAvailable !== null) return ffmpegAvailable
  try {
    execSync('which ffmpeg', { stdio: 'pipe' })
    ffmpegAvailable = true
  } catch {
    ffmpegAvailable = false
  }
  return ffmpegAvailable
}

/**
 * Extract frames from a video buffer using ffmpeg.
 *
 * Strategy:
 * 1. Check ffmpeg availability (cached).
 * 2. Write video buffer to a temp file.
 * 3. Probe video duration with ffprobe (or ffmpeg).
 * 4. Compute frame timestamps based on intervalMs / maxFrames.
 * 5. Extract each frame as a JPEG using ffmpeg.
 * 6. Read, base64-encode, and return.
 * 7. Clean up temp files.
 *
 * If ffmpeg is NOT available, returns an empty array and logs
 * a clear message explaining what is needed.
 */
export async function extractFramesFromVideo(
  options: FrameExtractionOptions,
): Promise<ExtractedFrame[]> {
  const { videoBuffer, maxFrames = 20, intervalMs = 1000 } = options

  if (!isFfmpegAvailable()) {
    console.warn(
      '[frame-extractor] ffmpeg is not available on this system. ' +
        'Video frame extraction requires ffmpeg to be installed. ' +
        'Install it via: apt-get install ffmpeg (Debian/Ubuntu), ' +
        'brew install ffmpeg (macOS), or add it to your Docker image.',
    )
    return []
  }

  if (!videoBuffer || videoBuffer.length === 0) {
    console.warn('[frame-extractor] Empty video buffer provided')
    return []
  }

  // Create a temp working directory
  const workDir = join(tmpdir(), `cv-frames-${randomUUID()}`)
  let videoPath = ''
  const framePaths: string[] = []

  try {
    mkdirSync(workDir, { recursive: true })

    // Write video buffer to a temp file
    videoPath = join(workDir, 'input.mp4')
    writeFileSync(videoPath, videoBuffer)

    // Get video duration using ffprobe (or ffmpeg)
    const durationMs = await getVideoDurationMs(videoPath)
    if (durationMs <= 0) {
      console.warn('[frame-extractor] Could not determine video duration')
      return []
    }

    // Determine how many frames to extract and at what intervals
    const effectiveInterval = Math.max(intervalMs, Math.floor(durationMs / maxFrames))
    const timestamps: number[] = []

    for (let ts = 0; ts < durationMs && timestamps.length < maxFrames; ts += effectiveInterval) {
      timestamps.push(ts)
    }

    if (timestamps.length === 0) {
      console.warn('[frame-extractor] No timestamps to extract (video too short?)')
      return []
    }

    console.warn(
      `[frame-extractor] Extracting ${timestamps.length} frames from ${Math.round(durationMs)}ms video (interval=${effectiveInterval}ms)`,
    )

    // Extract each frame as JPEG
    const frames: ExtractedFrame[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const tsSec = timestamps[i] / 1000
      const framePath = join(workDir, `frame_${String(i).padStart(4, '0')}.jpg`)

      try {
        await runFfmpegExtract(videoPath, framePath, tsSec)
        framePaths.push(framePath)

        // Read the extracted frame
        if (!existsSync(framePath)) {
          console.warn(`[frame-extractor] Frame ${i} at ${tsSec}s was not created`)
          continue
        }

        const frameBuf = readFileSync(framePath)
        if (frameBuf.length === 0) {
          console.warn(`[frame-extractor] Frame ${i} at ${tsSec}s is empty`)
          continue
        }

        // Get frame dimensions (parse from ffmpeg output or JPEG header)
        const dimensions = getJpegDimensions(frameBuf) ?? { width: 0, height: 0 }

        frames.push({
          index: i,
          timestampMs: timestamps[i],
          base64: frameBuf.toString('base64'),
          width: dimensions.width,
          height: dimensions.height,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[frame-extractor] Failed to extract frame ${i} at ${tsSec}s: ${msg}`)
      }
    }

    console.warn(`[frame-extractor] Successfully extracted ${frames.length}/${timestamps.length} frames`)
    return frames
  } finally {
    // Clean up temp directory
    try {
      rmSync(workDir, { recursive: true, force: true })
    } catch {
      // Best-effort cleanup
    }
  }
}

// ── Internal Helpers ──────────────────────────────────────────────────────────

/**
 * Get video duration in milliseconds using ffprobe (preferred) or ffmpeg.
 */
function getVideoDurationMs(videoPath: string): Promise<number> {
  return new Promise((resolve) => {
    // Try ffprobe first (more reliable for duration)
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath,
    ])

    let output = ''

    ffprobe.stdout.on('data', (data: Buffer) => {
      output += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code === 0 && output.trim()) {
        const durSec = parseFloat(output.trim())
        if (!isNaN(durSec) && durSec > 0) {
          resolve(Math.round(durSec * 1000))
          return
        }
      }

      // Fallback: try ffmpeg
      const ffmpeg = spawn('ffmpeg', ['-i', videoPath, '-f', 'null', '-'])
      let stderr = ''

      ffmpeg.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (_code2) => {
        // Parse "Duration: HH:MM:SS.xx" from stderr
        const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
        if (match) {
          const h = parseInt(match[1], 10)
          const m = parseInt(match[2], 10)
          const s = parseInt(match[3], 10)
          const cs = parseInt(match[4], 10)
          resolve(h * 3600000 + m * 60000 + s * 1000 + cs * 10)
        } else {
          resolve(0)
        }
      })

      ffmpeg.on('error', () => resolve(0))
    })

    ffprobe.on('error', () => {
      // ffprobe not found, try ffmpeg fallback
      const ffmpeg = spawn('ffmpeg', ['-i', videoPath, '-f', 'null', '-'])
      let stderr = ''

      ffmpeg.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (_code3) => {
        const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
        if (match) {
          const h = parseInt(match[1], 10)
          const m = parseInt(match[2], 10)
          const s = parseInt(match[3], 10)
          const cs = parseInt(match[4], 10)
          resolve(h * 3600000 + m * 60000 + s * 1000 + cs * 10)
        } else {
          resolve(0)
        }
      })

      ffmpeg.on('error', () => resolve(0))
    })
  })
}

/**
 * Extract a single frame at the given timestamp (seconds) as JPEG.
 */
function runFfmpegExtract(
  inputPath: string,
  outputPath: string,
  timestampSec: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-ss', String(timestampSec),
      '-i', inputPath,
      '-vframes', '1',
      '-q:v', '2', // high quality JPEG
      '-y', // overwrite output
      outputPath,
    ])

    let stderr = ''
    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-200)}`))
      }
    })

    proc.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Parse JPEG dimensions from the SOF0/SOF2 marker.
 * Returns null if the JPEG header is malformed or too small.
 */
function getJpegDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 10) return null
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null

  let offset = 2
  while (offset < buf.length - 1) {
    if (buf[offset] !== 0xff) return null
    const marker = buf[offset + 1]

    // SOF0 (0xC0) or SOF2 (0xC2)
    if (marker === 0xc0 || marker === 0xc2) {
      if (offset + 9 > buf.length) return null
      const height = (buf[offset + 5] << 8) | buf[offset + 6]
      const width = (buf[offset + 7] << 8) | buf[offset + 8]
      return { width, height }
    }

    // Skip marker segment
    if (offset + 3 > buf.length) return null
    const segLen = (buf[offset + 2] << 8) | buf[offset + 3]
    offset += 2 + segLen
  }

  return null
}