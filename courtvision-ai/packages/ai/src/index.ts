// ── Core Pipeline Modules ──
export * from './preprocessing'
export * from './tracking'
export * from './reconstruction3d'
export * from './shotAnalysis'
export * from './mentalAnalysis'
export * from './liveCoach'
export * from './digitalTwin'
export * from './llm'
export * from './reportGenerator'
export * from './highlightEditor'

// ── V5 Apex AI Modules ──
export * from './shotDNA'
export * from './advancedAnalytics'
export * from './coachChat'
export * from './smartTraining'
export * from './predictiveEngine'
export * from './recoveryEngine'

// ── Re-export des types importants pour l'API ──

// Core pipeline types
export type { PreprocessingResult, CalibrationPoints } from './preprocessing'
export type { TrackingResult, TrackedPlayer, Landmark, BallDetection } from './tracking'
export type { Reconstruction3DResult, PlayerPosition3D, HeatmapPoint, CourtZone } from './reconstruction3d'
export type { ShotResult, ShotStats, ShotZone } from './shotAnalysis'
export type { MentalAnalysisResult, MentalPattern, MentalTimeline } from './mentalAnalysis'
export type { LiveCoachConfig, LiveAlert, LiveAlertType, LiveFrameAnalysis, LiveCumulativeStats, LiveLandmarks } from './liveCoach'
export type { TwinProfile, TwinAttribute, TwinAttributeCategory, TwinTrait, PlayStyleProfile, NBAComparison, MatchupSimulation, SessionAnalysisData, ComfortZone, TwinEvolutionPoint, PlayStyle } from './digitalTwin'
export type { FullAnalysisData, AIReport, TrainingDay } from './reportGenerator'
export type { HighlightResult, HighlightClip, HighlightTemplate } from './highlightEditor'

// V5 Apex types
export type { ShotDNASignature, ShotDNAProfile, ZoneEfficiencyData, MechanicalDrift, ShotQualityResult } from './shotDNA'
export type { AdvancedAnalyticsResult, ClutchShotData, MomentumShift, PerformanceWindow } from './advancedAnalytics'
export type { CoachChatMessage, ChatAttachment, SuggestedAction, ConversationContext, PlayerContext, CoachChatResponse } from './coachChat'
export type { TrainingPlanRequest, SmartTrainingPlan, TrainingPlanDay, DrillItem, PlanAdaptation } from './smartTraining'
export type { PredictionInput, HistoricalSession, PerformancePrediction, ZonePrediction, MomentumPoint, RiskFactor } from './predictiveEngine'
export type { RecoveryInput, RecoveryResult } from './recoveryEngine'
