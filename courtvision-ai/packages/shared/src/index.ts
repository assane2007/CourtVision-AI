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
    overall_rating: number
    pose_data?: Record<string, any>
    play_style?: Record<string, any>
    attribute_categories?: Record<string, any>[]
    strengths: string[]
    weaknesses: string[]
    nba_comparisons?: Record<string, any>[]
    comfort_zones?: Record<string, any>[]
    evolution?: Record<string, any>[]
    mental_profile?: Record<string, any>
    pose_signature?: Record<string, any>
    twin_profile?: Record<string, any> // Profil complet sérialisé
    ai_insights?: string
    session_count: number
    updated_at: string
}

/** Play styles disponibles */
export const PLAY_STYLES = [
    'sharpshooter', 'shot_creator', 'slasher', 'playmaker',
    'two_way', 'stretch_big', 'paint_beast', 'balanced'
] as const
export type PlayStyleType = (typeof PLAY_STYLES)[number]

/** Réponse API du Digital Twin */
export interface TwinResponse {
    twin: DigitalTwin
    profile: Record<string, any> // TwinProfile complet
    insights: string
}

/** Réponse de simulation de match-up */
export interface TwinSimulationResponse {
    opponent: string
    winProbability: number
    advantages: string[]
    vulnerabilities: string[]
    gameplan: string[]
    predictedScore: { player: number; opponent: number }
    keyMatchups: { area: string; edge: 'player' | 'opponent' | 'even' }[]
}

/** Réponse de comparaison de twins */
export interface TwinComparisonResponse {
    myTwin: DigitalTwin
    opponentTwin: DigitalTwin
    comparison: {
        categories: { category: string; playerScore: number; opponentScore: number; edge: string }[]
        advantage: string
        summary: string
    }
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

/** Profil public d'un joueur */
export interface PublicProfile {
    user_id: string
    username: string
    full_name?: string
    avatar_url?: string
    position?: Position
    bio: string
    location: string
    team: string
    xp: number
    level: number
    total_sessions: number
    total_shots: number
    avg_shooting_pct: number
    avg_mental_score: number
    best_mental_score: number
    best_shooting_pct: number
    win_streak: number
    challenges_won: number
    followers_count: number
    following_count: number
    is_public: boolean
    badges: Badge[]
    is_following?: boolean
    updated_at: string
}

/** Badge */
export const BADGE_RARITIES = ['common', 'rare', 'epic', 'legendary'] as const
export type BadgeRarity = (typeof BADGE_RARITIES)[number]

export const BADGE_CATEGORIES = ['shooting', 'mental', 'consistency', 'social', 'challenge', 'milestone'] as const
export type BadgeCategory = (typeof BADGE_CATEGORIES)[number]

export interface Badge {
    id: string
    slug: string
    name: string
    description: string
    emoji: string
    category: BadgeCategory
    rarity: BadgeRarity
    xp_reward: number
    earned_at?: string
}

/** Entrée du fil d'activité */
export const ACTIVITY_TYPES = [
    'session_complete', 'badge_earned', 'challenge_won', 'challenge_joined',
    'follow', 'highlight_shared', 'level_up', 'new_record'
] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export interface ActivityFeedItem {
    id: string
    user_id: string
    username: string
    avatar_url?: string
    type: ActivityType
    title: string
    description?: string
    metadata: Record<string, any>
    created_at: string
}

/** Notification */
export interface Notification {
    id: string
    type: 'badge' | 'challenge' | 'follow' | 'leaderboard' | 'system'
    title: string
    body?: string
    metadata: Record<string, any>
    read: boolean
    created_at: string
}

/** Leaderboard entry */
export interface LeaderboardEntry {
    rank: number
    user_id: string
    username: string
    full_name?: string
    avatar_url?: string
    position?: Position
    score: number
    trend: 'up' | 'down' | 'stable'
    level: number
    is_me: boolean
}

/** Leaderboard response */
export interface LeaderboardResponse {
    entries: LeaderboardEntry[]
    metric: string
    scope: string
    myRank?: number
    totalPlayers: number
}

/** Challenge avec classement */
export interface ChallengeWithRanking extends Challenge {
    participants_count: number
    my_rank?: number
    my_value?: number
    leader_name?: string
    leader_value?: number
    submissions?: ChallengeSubmission[]
}

/** Réponse de recherche de joueurs */
export interface PlayerSearchResult {
    user_id: string
    username: string
    full_name?: string
    avatar_url?: string
    position?: Position
    level: number
    xp: number
    is_following: boolean
}

/** Réponse du feed d'activité */
export interface ActivityFeedResponse {
    items: ActivityFeedItem[]
    hasMore: boolean
    nextCursor?: string
}

// ==========================================
// Viral Sharing
// ==========================================

export const SHARE_TYPES = ['twin_card', 'highlight_reel', 'session_recap', 'badge', 'challenge_win'] as const
export type ShareType = (typeof SHARE_TYPES)[number]

export const SHARE_PLATFORMS = ['tiktok', 'instagram', 'twitter', 'generic'] as const
export type SharePlatform = (typeof SHARE_PLATFORMS)[number]

export interface SharedCard {
    id: string
    share_id: string
    user_id: string
    type: ShareType
    platform: SharePlatform
    card_data: Record<string, any>
    caption: string
    views_count: number
    created_at: string
}

export interface TwinCardShareData {
    username: string
    fullName: string
    avatarUrl: string | null
    position: string | null
    overallRating: number
    playStyle: string
    playStyleLabel: string
    nbaArchetype: string
    topCategoryName: string
    topCategoryScore: number
    nbaCompPlayer: string | null
    nbaCompSimilarity: number
    keyAttributes: { name: string; value: number; emoji: string }[]
    strengths: string[]
    weaknesses: string[]
    sessionCount: number
    generatedAt: string
}

export interface ShareGenerateResponse {
    shareId: string
    shareUrl: string
    caption: string
    cardData: TwinCardShareData | Record<string, any>
    platform: SharePlatform
    deepLink: string
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

// ==========================================
// Coach Live Types (partagés mobile ↔ API)
// ==========================================

export const ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number]

export const ALERT_TYPES = [
    'fatigue', 'posture', 'shooting_cold', 'shooting_hot',
    'mental_drop', 'mental_recovery', 'rhythm', 'hydration',
    'defensive_intensity', 'shot_selection', 'momentum', 'quarter_summary'
] as const
export type LiveAlertType = (typeof ALERT_TYPES)[number]

export const SHOT_ZONES = ['paint', 'midrange', 'corner3', 'wing3', 'top3', 'restricted'] as const
export type ShotZone = (typeof SHOT_ZONES)[number]

export const SHOT_OUTCOMES = ['made', 'missed'] as const
export type ShotOutcome = (typeof SHOT_OUTCOMES)[number]

/** Config envoyée au serveur pour démarrer une session live */
export interface LiveSessionConfig {
    frameInterval?: number
    alertSensitivity?: 'low' | 'medium' | 'high'
    fatigueAlerts?: boolean
    shotPostureAlerts?: boolean
    mentalAlerts?: boolean
    maxAlertsPerQuarter?: number
}

/** Alerte Coach Live reçue par le mobile */
export interface LiveAlertPayload {
    id: string
    type: LiveAlertType
    severity: AlertSeverity
    message: string
    emoji: string
    vibrate: boolean
    vibrationPattern: number[]
    timestamp: number
    data?: Record<string, any>
}

/** Réponse de démarrage de session live */
export interface LiveStartResponse {
    liveSessionId: string
    status: 'live'
    config: LiveSessionConfig
    message: string
    endpoints: {
        sendFrame: string
        recordShot: string
        endQuarter: string
        endSession: string
        status: string
        stream: string
    }
}

/** Payload envoyé pour chaque frame */
export interface LiveFramePayload {
    timestamp: number
    quarter: number
    landmarks?: Array<{ x: number; y: number; z: number; visibility: number }>
    ballDetected?: boolean
    ballPosition?: { x: number; y: number }
    manualShotMade?: boolean
    manualShotMissed?: boolean
}

/** Réponse de l'analyse d'une frame */
export interface LiveFrameResponse {
    sessionId: string
    timestamp: number
    quarter: number
    mentalScore: number
    fatigueIndex: number
    postureScore: number
    speed: number
    alerts: LiveAlertPayload[]
    vibrate: boolean
    vibrationPattern: number[]
    stats: LiveStatsPayload
    confidence: number
}

/** Stats cumulées renvoyées par l'API */
export interface LiveStatsPayload {
    playTime: number
    shotsDetected: number
    shotsMade: number
    shootingPct: number
    avgMentalScore: number
    mentalByQuarter: Record<number, number[]>
    distanceCovered: number
    alertsSent: number
    peakMoment: { quarter: number; timestamp: number; score: number } | null
    lowMoment: { quarter: number; timestamp: number; score: number } | null
}

/** Réponse d'enregistrement de tir */
export interface LiveShotResponse {
    recorded: boolean
    outcome: ShotOutcome
    zone: string
    currentStats: {
        shotsMade: number
        shotsDetected: number
        shootingPct: number
    }
    alerts: LiveAlertPayload[]
}

/** Réponse de fin de quart-temps */
export interface LiveQuarterResponse {
    sessionId: string
    quarter: number
    summary: LiveAlertPayload
    nextQuarter: number | null
    message: string
}

/** Réponse de fin de match */
export interface LiveEndResponse {
    sessionId: string
    status: 'complete'
    summary: LiveAlertPayload
    stats: LiveStatsPayload
    mentalTimeline: number[]
    recommendations: string[]
    message: string
}

/** Réponse du status live */
export interface LiveStatusResponse {
    sessionId: string
    active: boolean
    quarter: number
    stats: LiveStatsPayload
}

/** Events SSE reçus par le mobile */
export type LiveSSEEvent =
    | { type: 'connected'; sessionId: string; state: { active: boolean; quarter: number; stats: LiveStatsPayload } }
    | { type: 'alerts'; alerts: LiveAlertPayload[]; mentalScore: number; fatigueIndex: number }
    | { type: 'quarter_end'; quarter: number; summary: LiveAlertPayload }
    | { type: 'session_end'; result: LiveEndResponse }
    | { type: 'biomechanic_fault'; fault: string; severity: 'low' | 'medium' | 'high' }
    | { type: 'heartbeat'; time: number }

// ==========================================
// V5 Apex Types
// ==========================================

/** Apex Score — the ONE number that represents the player */
export interface ApexScore {
    overall: number
    shooting: number
    mental: number
    consistency: number
    clutch: number
    improvement: number
    grade: string
    rank?: number
    percentile?: number
    trend: 'rising' | 'stable' | 'declining'
}

/** Shot DNA™ — Biomechanical fingerprint */
export interface ShotDNASummary {
    purityScore: number
    closestNBA: string
    nbaSimilarity: number
    avgShotQuality: number
    mechanicalDriftCount: number
    optimalZone: string
}

/** Predictive Engine — Pre-game prediction */
export interface PredictionSummary {
    predictedFGPct: number
    readinessScore: number
    readinessGrade: string
    riskFactors: { type: string; severity: string; description: string }[]
    preGameTips: string[]
    confidence: number
}

/** Smart Training Plan summary */
export interface TrainingPlanSummary {
    id: string
    name: string
    objective: string
    completionPct: number
    daysRemaining: number
    todayFocus: string | null
    difficultyLevel: number
    isActive: boolean
}

/** Coach Chat Message (for mobile rendering) */
export interface CoachChatMessagePayload {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    attachments: {
        type: 'chart' | 'drill' | 'highlight' | 'shot_data' | 'zone_map' | 'comparison'
        title: string
        data: Record<string, any>
    }[]
    suggestedActions: {
        label: string
        emoji: string
        action: string
        params?: Record<string, any>
    }[]
    createdAt: string
}

/** Recovery & Wellness */
export interface RecoveryLogPayload {
    date: string
    sleepHours: number
    sleepQuality: number
    energyLevel: number
    muscleSoreness: number
    stressLevel: number
    hrv?: number
    restingHR?: number
    hydrationLiters?: number
    mealsQuality?: number
    mood?: number
}

export interface RecoveryScoreResponse {
    recoveryScore: number
    readinessScore: number
    grade: string
    recommendation: string
    trainingIntensity: 'rest' | 'light' | 'moderate' | 'normal' | 'push'
    tips: string[]
    riskFactors: string[]
}

/** Quest / Gamification */
export interface QuestPayload {
    id: string
    slug: string
    title: string
    description: string
    emoji: string
    questType: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'legendary'
    category: string
    xpReward: number
    difficulty: number
    progress: {
        currentValue: number
        targetValue: number
        progressPct: number
        status: 'active' | 'completed' | 'expired' | 'claimed'
    }
}

/** Skill Tree Node */
export interface SkillTreeNode {
    id: string
    slug: string
    name: string
    description: string
    emoji: string
    category: 'shooting' | 'mental' | 'physical' | 'tactical' | 'leadership'
    tier: number
    unlocked: boolean
    unlockedAt?: string
    prerequisites: string[]
}

/** Crew / Social Team */
export interface CrewPayload {
    id: string
    name: string
    tag: string
    description?: string
    avatarUrl?: string
    totalXP: number
    avgRating: number
    totalSessions: number
    memberCount: number
    maxMembers: number
    isPublic: boolean
    myRole?: string
    members: CrewMemberPayload[]
}

export interface CrewMemberPayload {
    userId: string
    username: string
    avatarUrl?: string
    role: 'captain' | 'co-captain' | 'member'
    overallRating: number
    joinedAt: string
}

/** Season */
export interface SeasonPayload {
    id: string
    name: string
    theme?: string
    startsAt: string
    endsAt: string
    myProgress: {
        seasonXP: number
        seasonLevel: number
        tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'elite'
        rank?: number
    } | null
}

/** V5 Dashboard — Single API call payload for home screen */
export interface V5DashboardPayload {
    apexScore: ApexScore
    shotDna: ShotDNASummary | null
    predictions: PredictionSummary | null
    training: TrainingPlanSummary | null
    streaks: {
        currentStreak: number
        longestStreak: number
        sessionThisWeek: number
        shotsThisWeek: number
    }
    quests: {
        activeCount: number
        completedToday: number
        nextReward: string | null
    }
    recovery: RecoveryScoreResponse | null
    crew: {
        name: string | null
        tag: string | null
        role: string | null
        rankInCrew: number | null
    } | null
}

/** Advanced Analytics Session Result */
export interface AdvancedAnalyticsPayload {
    trueShooting: number
    effectiveFG: number
    shotQualityAvg: number
    clutchRating: number
    courtBalanceIndex: number
    offensiveRating: number
    overallGrade: string
    longestMakeStreak: number
    longestMissStreak: number
    hotZones: string[]
    coldZones: string[]
    momentumShifts: {
        minute: number
        direction: 'up' | 'down'
        trigger: string
    }[]
    peakPerformanceWindow: {
        startMinute: number
        endMinute: number
        fgPct: number
        mentalScore: number
    } | null
}

/** Weekly Digest for push notification */
export interface WeeklyDigestPayload {
    period: string
    sessions: number
    totalShots: number
    avgFGPct: number
    avgMentalScore: number
    improvement: {
        fgPctDelta: number
        mentalDelta: number
        bestZoneImproved: string | null
    }
    highlights: string[]
    apexScore: ApexScore
    nextWeekFocus: string[]
}
