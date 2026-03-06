import pino from 'pino'

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
})

export interface ViralTrack {
    id: string
    title: string
    artist: string
    bpm: number
    duration: number
    genre: string[]
    energy: number // 0-1
}

/**
 * ViralMusicService — Automated high-energy track matching.
 */
export class ViralMusicService {
    // Curated high-performance tracks for basketball highlights
    private readonly library: ViralTrack[] = [
        { id: 'v1', title: 'Apex Peak', artist: 'CourtVision Audio', bpm: 128, duration: 15, genre: ['phonk', 'trap'], energy: 0.9 },
        { id: 'v2', title: 'Nuclear Swish', artist: 'V-Coach', bpm: 140, duration: 12, genre: ['hip-hop'], energy: 1.0 },
        { id: 'v3', title: 'Pure Void Rhythm', artist: 'Shadow League', bpm: 120, duration: 20, genre: ['lo-fi', 'drill'], energy: 0.7 },
        { id: 'v4', title: 'Clutch Time', artist: 'B-Ball Beats', bpm: 135, duration: 10, genre: ['cinematic'], energy: 0.85 }
    ]

    /**
     * Matches the best viral track based on highlight intensity.
     */
    async matchTrack(intensity: number): Promise<ViralTrack> {
        logger.info({ intensity }, '[Music] Recommending viral track...')

        // Find track with energy closest to target intensity
        const sorted = [...this.library].sort((a, b) =>
            Math.abs(a.energy - intensity) - Math.abs(b.energy - intensity)
        )

        const track = sorted[0]
        logger.info({ trackId: track.id }, '[Music] Viral match found')
        return track
    }

    /**
     * Internal: Simulates fetching trending TikTok audio metadata.
     */
    async getTikTokTrending() {
        return this.library.slice(0, 2)
    }
}

export const viralMusicService = new ViralMusicService()
