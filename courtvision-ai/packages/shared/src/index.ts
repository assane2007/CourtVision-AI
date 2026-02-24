/**
 * @courtvision/shared — Types et constantes partagés entre les packages
 */

// ==========================================
// Enums & Constants
// ==========================================

export const SESSION_TYPES = ['match', 'training', 'shootaround'] as const
export type SessionType = (typeof SESSION_TYPES)[number]

export const SESSION_STATUSES = ['processing', 'analyzing', 'live', 'complete', 'failed'] as const
export type SessionStatus = (typeof SESSION_STATUSES)[number]

export const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const
export type Position = (typeof POSITIONS)[number]

export const PLANS = ['free', 'player', 'coach', 'academy'] as const
export type Plan = (typeof PLANS)[number]

// ==========================================
// User
// ==========================================

export interface User {
    id: string
    email: string
    username: string
    full_name?: string
    avatar_url?: string
    position?: Position
    height_cm?: number
    weight_kg?: number
    plan: Plan
    stripe_customer_id?: string
    created_at: string
}

// ==========================================
// Session
// ==========================================

export interface Session {
    id: string
    user_id: string
    type: SessionType
    video_url: string
    duration_sec?: number
    status: SessionStatus
    created_at: string
}

// ==========================================
// Analysis
// ==========================================

export interface Analysis {
    id: string
    session_id: string
    shot_attempts: number
    shot_made: number
    shot_zones?: ShotZoneData[]
    heatmap_data?: HeatmapData
    mental_score?: number
    body_language?: BodyLanguageData
    highlights?: HighlightData
    ai_report?: string
    created_at: string
}

export interface ShotZoneData {
    zone: string
    outcome: 'made' | 'missed'
    posture?: string
}

export interface HeatmapData {
    points: { x: number; y: number; intensity: number }[]
    resolution: { width: number; height: number }
}

export interface BodyLanguageData {
    patterns: string[]
    insights: string[]
    timeline: { timestamp: number; score: number }[]
    quarterComparison?: Record<number, number>
    fatigueIndex?: number
    bodyLanguageScore?: number
}

export interface HighlightData {
    url: string
    clips: { start: number; end: number; label: string }[]
    duration: number
    template: string
}

// ==========================================
// Digital Twin
// ==========================================

export interface DigitalTwin {
    id: string
    user_id: string
    model_version: string
    pose_data?: Record<string, any>
    play_style?: Record<string, any>
    strengths: string[]
    weaknesses: string[]
    updated_at: string
}

// ==========================================
// Subscription
// ==========================================

export interface Subscription {
    id: string
    user_id: string
    stripe_subscription_id: string
    plan: Plan
    status: string
    current_period_end?: string
    created_at: string
}

// ==========================================
// Community
// ==========================================

export interface Challenge {
    id: string
    title: string
    description?: string
    metric: string
    reward?: string
    created_at: string
    end_at: string
}

export interface ChallengeSubmission {
    id: string
    challenge_id: string
    user_id: string
    value: number
    metric: string
    submitted_at: string
}

// ==========================================
// API Response helpers
// ==========================================

export interface ApiResponse<T = unknown> {
    data?: T
    error?: string | { message: string }[]
    success?: boolean
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
    total: number
    page: number
    pageSize: number
}
