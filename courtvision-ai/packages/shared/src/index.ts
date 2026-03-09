/**
 * @courtvision/shared — Types et constantes partagés entre les packages
 */

// ==========================================
// Cross-cutting concerns (errors, logging, feature flags)
// ==========================================
export * from './errors'
export { logger } from './logger'
export type { LogLevel } from './logger'
export { FEATURES, isFeatureEnabled } from './featureFlags'
export type { FeatureName } from './featureFlags'

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
    /** Base64-encoded JPEG frame from the camera (for CV Engine analysis) */
    frameBase64?: string
    /** File URI of the captured frame (native only) */
    frameUri?: string
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

// ==========================================
// V6.0 — Arena (Challenge Multi-joueurs Temps Réel)
// ==========================================

export const ARENA_MODES = ['shootout', 'accuracy', 'speed', 'clutch', 'knockout'] as const
export type ArenaMode = (typeof ARENA_MODES)[number]

export const ARENA_STATUSES = ['waiting', 'countdown', 'live', 'finished', 'cancelled'] as const
export type ArenaStatus = (typeof ARENA_STATUSES)[number]

export interface ArenaConfig {
    mode: ArenaMode
    maxPlayers: number
    roundDurationSec: number
    totalRounds: number
    shotsPerRound: number
    allowedZones?: string[]
    minLevel?: number
}

export interface ArenaMatch {
    id: string
    hostId: string
    hostUsername: string
    mode: ArenaMode
    status: ArenaStatus
    config: ArenaConfig
    players: ArenaPlayer[]
    currentRound: number
    startedAt: string | null
    endedAt: string | null
    createdAt: string
}

export interface ArenaPlayer {
    userId: string
    username: string
    avatarUrl?: string
    position?: Position
    level: number
    isReady: boolean
    score: number
    shotsMade: number
    shotsTotal: number
    accuracy: number
    streak: number
    isEliminated: boolean
}

export interface ArenaScoreboard {
    matchId: string
    mode: ArenaMode
    round: number
    totalRounds: number
    timeRemainingSec: number
    players: ArenaPlayer[]
    status: ArenaStatus
    lastEvent?: ArenaShotEvent
}

export interface ArenaShotEvent {
    userId: string
    username: string
    result: 'made' | 'missed'
    zone: string
    timestamp: number
    newScore: number
    streak: number
}

export interface ArenaLeaderboardEntry {
    rank: number
    userId: string
    username: string
    avatarUrl?: string
    wins: number
    losses: number
    winRate: number
    avgAccuracy: number
    eloRating: number
    bestStreak: number
}

// ==========================================
// V6.0 — HORSE IA
// ==========================================

export const HORSE_DIFFICULTIES = ['rookie', 'pro', 'allstar', 'legend'] as const
export type HorseDifficulty = (typeof HORSE_DIFFICULTIES)[number]

export const HORSE_CHALLENGE_TYPES = [
    'zone_shot', 'fadeaway', 'stepback', 'bank_shot', 'swish_only',
    'off_dribble', 'catch_and_shoot', 'turnaround', 'floater', 'logo_shot'
] as const
export type HorseChallengeType = (typeof HORSE_CHALLENGE_TYPES)[number]

export interface HorseGame {
    id: string
    userId: string
    difficulty: HorseDifficulty
    status: 'active' | 'won' | 'lost' | 'abandoned'
    letters: string        // e.g. "HOR" = 3 lettres
    maxLetters: number     // 5 = HORSE
    currentRound: number
    score: number
    challenges: HorseChallenge[]
    startedAt: string
    endedAt?: string
}

export interface HorseChallenge {
    id: string
    gameId: string
    round: number
    challengeType: HorseChallengeType
    targetZone: string
    targetTechnique: string
    nbaInspiration?: string
    description: string
    difficulty: number
    timeoutSec: number
    attempt?: HorseAttempt
}

export interface HorseAttempt {
    id: string
    challengeId: string
    userId: string
    success: boolean
    similarityScore: number  // 0-100 biomechanical match
    shotData?: Record<string, any>
    timestamp: string
}

export interface HorseGameState {
    game: HorseGame
    currentChallenge: HorseChallenge | null
    playerLetters: string
    aiLetters: string
    round: number
    isPlayerTurn: boolean
    message: string
}

export interface HorseLeaderboardEntry {
    rank: number
    userId: string
    username: string
    avatarUrl?: string
    gamesPlayed: number
    gamesWon: number
    winRate: number
    bestScore: number
    avgSimilarity: number
    longestWinStreak: number
}

// ==========================================
// V6.0 — Scout Report PDF
// ==========================================

export const REPORT_TEMPLATES = ['scout', 'session', 'season', 'player_card', 'custom'] as const
export type ReportTemplate = (typeof REPORT_TEMPLATES)[number]

export const REPORT_FORMATS = ['pdf', 'json', 'html'] as const
export type ReportExportFormat = (typeof REPORT_FORMATS)[number]

export interface ScoutReport {
    reportId: string
    template: ReportTemplate
    format: ReportExportFormat
    generatedAt: string
    player: {
        userId: string
        name: string
        position: string | null
        avatarUrl: string | null
        age?: number
        height?: string
        weight?: string
        team?: string
    }
    apexScore: ApexScore | null
    shotDna: ShotDNASummary | null
    seasonStats: {
        totalSessions: number
        totalShots: number
        avgFGPct: number
        avgThreePct: number
        avgMentalScore: number
        bestGame: { date: string; fgPct: number; mentalScore: number } | null
        consistencyRating: number
    }
    strengths: string[]
    weaknesses: string[]
    nbaComparisons: { player: string; similarity: number; reason: string }[]
    scoutGrade: string
    scoutNotes: string[]
    projections: {
        ceiling: string
        floor: string
        timeline: string
        keyDevelopmentAreas: string[]
    }
    sections: ScoutReportSection[]
}

export interface ScoutReportSection {
    title: string
    type: 'stats' | 'chart' | 'text' | 'heatmap' | 'comparison' | 'grade'
    data: Record<string, any>
}

export interface ScoutReportConfig {
    template: ReportTemplate
    format: ReportExportFormat
    includeShotDna: boolean
    includeHeatmaps: boolean
    includeVideo: boolean
    includeProjections: boolean
    sessionsRange?: { from: string; to: string }
    branding?: { logo?: string; teamName?: string; scoutName?: string }
}

export interface PlayerCardData {
    userId: string
    username: string
    fullName: string
    avatarUrl: string | null
    position: string | null
    overallRating: number
    playStyle: string
    topAttributes: { name: string; value: number; emoji: string }[]
    seasonAvg: { fgPct: number; threePct: number; mentalScore: number }
    badges: Badge[]
    nbaComp: string | null
    qrCodeUrl: string
}

// ==========================================
// V6.0 — Apple Watch / Wearable HRV
// ==========================================

export const WEARABLE_PLATFORMS = ['apple_watch', 'garmin', 'fitbit', 'whoop', 'samsung', 'other'] as const
export type WearablePlatform = (typeof WEARABLE_PLATFORMS)[number]

export const WEARABLE_DATA_TYPES = [
    'heart_rate', 'hrv', 'resting_hr', 'vo2max', 'calories',
    'steps', 'sleep', 'blood_oxygen', 'respiratory_rate', 'body_temperature'
] as const
export type WearableDataType = (typeof WEARABLE_DATA_TYPES)[number]

export interface WearableDevice {
    id: string
    userId: string
    platform: WearablePlatform
    deviceName: string
    model?: string
    lastSyncAt: string | null
    isActive: boolean
    connectedAt: string
}

export interface WearableSyncPayload {
    deviceId: string
    platform: WearablePlatform
    readings: WearableReading[]
    syncedAt: string
}

export interface WearableReading {
    type: WearableDataType
    value: number
    unit: string
    recordedAt: string
    metadata?: Record<string, any>
}

export interface HRVReading {
    id: string
    userId: string
    rmssd: number          // Root Mean Square of Successive Differences (ms)
    sdnn: number           // Standard Deviation of NN intervals (ms)
    lnRmssd: number        // Natural log of RMSSD
    restingHR: number      // bpm
    recordedAt: string
}

export interface WearableDashboard {
    device: WearableDevice | null
    lastSync: string | null
    today: {
        restingHR: number | null
        hrv: number | null
        vo2max: number | null
        caloriesBurned: number | null
        steps: number | null
        sleepHours: number | null
        sleepQuality: number | null
    }
    readiness: ReadinessEnhanced
    trends: {
        hrv7Day: { date: string; value: number }[]
        restingHR7Day: { date: string; value: number }[]
        sleepQuality7Day: { date: string; value: number }[]
    }
}

export interface ReadinessEnhanced {
    score: number            // 0-100
    grade: string            // A+ to F
    hrvBaseline: number      // Personal baseline
    hrvCurrent: number       // Current reading
    hrvDeviationPct: number  // % above/below baseline
    restingHRBaseline: number
    restingHRCurrent: number
    sleepScore: number
    recoveryScore: number
    recommendation: string
    trainingIntensity: 'rest' | 'light' | 'moderate' | 'normal' | 'push'
    riskFactors: string[]
    tips: string[]
}

export interface TrainingLoadPayload {
    userId: string
    date: string
    acuteLoad: number       // 7-day rolling avg
    chronicLoad: number     // 28-day rolling avg
    acwr: number            // Acute:Chronic Workload Ratio
    risk: 'low' | 'moderate' | 'high' | 'very_high'
    recommendation: string
    trend: 'increasing' | 'stable' | 'decreasing'
}

// ==========================================
// V6.0 — Marketplace de Drills
// ==========================================

export const DRILL_CATEGORIES = [
    'shooting', 'ball_handling', 'defense', 'conditioning',
    'footwork', 'mental', 'team', 'post_moves', 'passing', 'agility'
] as const
export type DrillCategory = (typeof DRILL_CATEGORIES)[number]

export const DRILL_DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'elite'] as const
export type DrillDifficulty = (typeof DRILL_DIFFICULTIES)[number]

export const DRILL_EQUIPMENT = [
    'basketball', 'cones', 'resistance_band', 'ladder',
    'weighted_ball', 'shooting_machine', 'none'
] as const
export type DrillEquipment = (typeof DRILL_EQUIPMENT)[number]

export const DRILL_PACK_STATUSES = ['draft', 'review', 'published', 'rejected', 'archived'] as const
export type DrillPackStatus = (typeof DRILL_PACK_STATUSES)[number]

export interface DrillPack {
    id: string
    creatorId: string
    creatorName: string
    creatorAvatarUrl?: string
    creatorVerified: boolean
    title: string
    description: string
    coverImageUrl?: string
    category: DrillCategory
    difficulty: DrillDifficulty
    equipment: DrillEquipment[]
    priceCents: number        // 0 = free
    currency: string
    rating: number            // 0-5
    reviewCount: number
    salesCount: number
    totalDuration: number     // minutes
    drillCount: number
    tags: string[]
    status: DrillPackStatus
    isPurchased?: boolean
    isFeatured: boolean
    createdAt: string
    updatedAt: string
}

export interface DrillPackItem {
    id: string
    packId: string
    title: string
    description: string
    instructions: string[]
    durationMin: number
    videoUrl?: string
    thumbnailUrl?: string
    difficulty: DrillDifficulty
    reps?: number
    sets?: number
    restSec?: number
    position: number
    tips: string[]
}

export interface DrillReview {
    id: string
    userId: string
    username: string
    avatarUrl?: string
    packId: string
    rating: number
    comment: string
    helpfulCount: number
    createdAt: string
}

export interface CreatorProfile {
    id: string
    userId: string
    displayName: string
    bio: string
    avatarUrl?: string
    verified: boolean
    totalEarnings: number
    totalSales: number
    publishedPacks: number
    avgRating: number
    followers: number
    specialties: DrillCategory[]
    credentials: string[]
    createdAt: string
}

export interface PurchaseRecord {
    id: string
    userId: string
    packId: string
    packTitle: string
    pricePaid: number
    currency: string
    stripePaymentId: string
    purchasedAt: string
}

export interface MarketplaceStats {
    totalPacks: number
    totalCreators: number
    featuredPacks: DrillPack[]
    trendingPacks: DrillPack[]
    topCreators: CreatorProfile[]
    categories: { name: DrillCategory; count: number }[]
}

export interface DrillPackCreatePayload {
    title: string
    description: string
    category: DrillCategory
    difficulty: DrillDifficulty
    equipment: DrillEquipment[]
    priceCents: number
    tags: string[]
    items: {
        title: string
        description: string
        instructions: string[]
        durationMin: number
        videoUrl?: string
        difficulty: DrillDifficulty
        reps?: number
        sets?: number
        restSec?: number
        tips: string[]
    }[]
}
