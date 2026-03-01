/**
 * musicLibrary — Royalty-free music catalog for highlight reels.
 *
 * Each track is tagged by mood, BPM, genre, and compatible templates.
 * Tracks are stored in Supabase Storage (bucket: `music`) and loaded
 * at URL `{SUPABASE_URL}/storage/v1/object/public/music/{filename}`.
 *
 * The library auto-selects the best track based on template, or
 * the user can pick one manually from the mobile Music Picker.
 */

import type { HighlightTemplate } from './highlightEditor'

// ── Types ─────────────────────────────────────────────────────

export type MusicMood = 'hype' | 'chill' | 'cinematic' | 'dark' | 'motivational' | 'trap'
export type MusicGenre = 'hip-hop' | 'electronic' | 'orchestral' | 'lo-fi' | 'trap' | 'pop'

export interface MusicTrack {
    /** Unique track ID (slug) */
    id: string
    /** Display title */
    title: string
    /** Artist credit */
    artist: string
    /** Filename in Supabase Storage `music` bucket */
    filename: string
    /** Duration in seconds */
    durationSec: number
    /** BPM (beats per minute) — used for beat-synced cuts */
    bpm: number
    /** Primary mood */
    mood: MusicMood
    /** Genre tag */
    genre: MusicGenre
    /** Compatible highlight templates */
    templates: HighlightTemplate[]
    /** Preview URL (first 15 sec — cached on CDN) */
    previewUrl?: string
    /** Cover art thumbnail (optional) */
    coverUrl?: string
    /** Whether the track supports beat-synced editing */
    beatSyncable: boolean
}

export interface MusicConfig {
    /** Selected track (null = no music) */
    track: MusicTrack | null
    /** Volume 0..1 (default 0.35 — music should stay behind audio/TTS) */
    volume: number
    /** Fade-in duration in seconds */
    fadeInSec: number
    /** Fade-out duration in seconds */
    fadeOutSec: number
    /** Enable beat-synced clip transitions */
    beatSync: boolean
}

// ── Default config ────────────────────────────────────────────

export const DEFAULT_MUSIC_CONFIG: MusicConfig = {
    track: null,
    volume: 0.35,
    fadeInSec: 1.5,
    fadeOutSec: 2.0,
    beatSync: false,
}

// ── Track Catalog ─────────────────────────────────────────────
// All tracks are royalty-free / Creative Commons Zero or custom licensed.
// Filenames match files uploaded to the Supabase `music` bucket.

export const MUSIC_CATALOG: MusicTrack[] = [
    // ── Hype / Trap ──
    {
        id: 'on-fire',
        title: 'On Fire',
        artist: 'CourtVision Beats',
        filename: 'on-fire.mp3',
        durationSec: 92,
        bpm: 140,
        mood: 'hype',
        genre: 'trap',
        templates: ['tiktok', 'espn'],
        beatSyncable: true,
    },
    {
        id: 'no-mercy',
        title: 'No Mercy',
        artist: 'CourtVision Beats',
        filename: 'no-mercy.mp3',
        durationSec: 78,
        bpm: 150,
        mood: 'dark',
        genre: 'trap',
        templates: ['tiktok'],
        beatSyncable: true,
    },
    {
        id: 'run-it-up',
        title: 'Run It Up',
        artist: 'CourtVision Beats',
        filename: 'run-it-up.mp3',
        durationSec: 85,
        bpm: 130,
        mood: 'hype',
        genre: 'hip-hop',
        templates: ['tiktok', 'espn'],
        beatSyncable: true,
    },
    // ── Motivational ──
    {
        id: 'rise-above',
        title: 'Rise Above',
        artist: 'CourtVision Beats',
        filename: 'rise-above.mp3',
        durationSec: 120,
        bpm: 110,
        mood: 'motivational',
        genre: 'orchestral',
        templates: ['cinema', 'espn'],
        beatSyncable: false,
    },
    {
        id: 'champion-mindset',
        title: 'Champion Mindset',
        artist: 'CourtVision Beats',
        filename: 'champion-mindset.mp3',
        durationSec: 95,
        bpm: 100,
        mood: 'motivational',
        genre: 'electronic',
        templates: ['cinema', 'espn'],
        beatSyncable: false,
    },
    // ── Cinematic ──
    {
        id: 'golden-hour',
        title: 'Golden Hour',
        artist: 'CourtVision Beats',
        filename: 'golden-hour.mp3',
        durationSec: 135,
        bpm: 85,
        mood: 'cinematic',
        genre: 'orchestral',
        templates: ['cinema'],
        beatSyncable: false,
    },
    {
        id: 'legacy',
        title: 'Legacy',
        artist: 'CourtVision Beats',
        filename: 'legacy.mp3',
        durationSec: 110,
        bpm: 90,
        mood: 'cinematic',
        genre: 'orchestral',
        templates: ['cinema', 'espn'],
        beatSyncable: false,
    },
    // ── Chill / Lo-fi ──
    {
        id: 'smooth-operator',
        title: 'Smooth Operator',
        artist: 'CourtVision Beats',
        filename: 'smooth-operator.mp3',
        durationSec: 100,
        bpm: 80,
        mood: 'chill',
        genre: 'lo-fi',
        templates: ['cinema'],
        beatSyncable: false,
    },
    {
        id: 'late-night-gym',
        title: 'Late Night Gym',
        artist: 'CourtVision Beats',
        filename: 'late-night-gym.mp3',
        durationSec: 88,
        bpm: 75,
        mood: 'chill',
        genre: 'lo-fi',
        templates: ['cinema', 'espn'],
        beatSyncable: false,
    },
    // ── Electronic / Pop ──
    {
        id: 'crowd-goes-wild',
        title: 'Crowd Goes Wild',
        artist: 'CourtVision Beats',
        filename: 'crowd-goes-wild.mp3',
        durationSec: 72,
        bpm: 128,
        mood: 'hype',
        genre: 'electronic',
        templates: ['tiktok', 'espn'],
        beatSyncable: true,
    },
    {
        id: 'game-day',
        title: 'Game Day',
        artist: 'CourtVision Beats',
        filename: 'game-day.mp3',
        durationSec: 65,
        bpm: 125,
        mood: 'hype',
        genre: 'pop',
        templates: ['tiktok'],
        beatSyncable: true,
    },
    {
        id: 'highlights-only',
        title: 'Highlights Only',
        artist: 'CourtVision Beats',
        filename: 'highlights-only.mp3',
        durationSec: 80,
        bpm: 135,
        mood: 'motivational',
        genre: 'electronic',
        templates: ['tiktok', 'espn'],
        beatSyncable: true,
    },
]

// ── Selection helpers ─────────────────────────────────────────

/**
 * Returns tracks compatible with a given highlight template.
 */
export function getTracksForTemplate(template: HighlightTemplate): MusicTrack[] {
    return MUSIC_CATALOG.filter((t) => t.templates.includes(template))
}

/**
 * Returns tracks matching a given mood.
 */
export function getTracksByMood(mood: MusicMood): MusicTrack[] {
    return MUSIC_CATALOG.filter((t) => t.mood === mood)
}

/**
 * Auto-select the best track for a template.
 * Priority: beat-syncable > mood match > shortest above clip duration.
 */
export function autoSelectTrack(
    template: HighlightTemplate,
    clipDurationSec: number,
): MusicTrack {
    const candidates = getTracksForTemplate(template)

    // Prefer tracks long enough for the highlight
    const longEnough = candidates.filter((t) => t.durationSec >= clipDurationSec)
    const pool = longEnough.length > 0 ? longEnough : candidates

    // Template → preferred mood
    const moodPriority: Record<HighlightTemplate, MusicMood[]> = {
        tiktok: ['hype', 'dark', 'trap'],
        espn: ['motivational', 'hype', 'cinematic'],
        cinema: ['cinematic', 'motivational', 'chill'],
    }

    const moods = moodPriority[template]
    for (const mood of moods) {
        const match = pool.find((t) => t.mood === mood)
        if (match) return match
    }

    // Fallback: first available
    return pool[0] ?? MUSIC_CATALOG[0]
}

/**
 * Build the Supabase Storage URL for a track.
 */
export function getTrackUrl(track: MusicTrack, supabaseUrl?: string): string {
    const base = supabaseUrl || process.env.SUPABASE_URL || ''
    return `${base}/storage/v1/object/public/music/${track.filename}`
}

/**
 * Compute beat timestamps for a track (used for beat-synced clip transitions).
 * Returns an array of seconds where each beat lands.
 */
export function computeBeatTimestamps(track: MusicTrack, durationSec: number): number[] {
    if (!track.beatSyncable || track.bpm <= 0) return []

    const beatIntervalSec = 60 / track.bpm
    const beats: number[] = []
    let t = 0
    while (t < durationSec) {
        beats.push(t)
        t += beatIntervalSec
    }
    return beats
}
