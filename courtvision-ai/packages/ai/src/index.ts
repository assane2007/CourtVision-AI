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
export * from './musicLibrary'

// ── V5 Apex AI Modules ──
export * from './shotDNA'
export * from './advancedAnalytics'
export * from './coachChat'
export * from './smartTraining'
export * from './predictiveEngine'
export * from './recoveryEngine'

// ── V6 Realtime Pipeline Modules ──
export * from './poseEstimation'
export * from './shotDetector'
export * from './ballTracker'
export * from './arOverlay'
export * from './realtimePipeline'

// ── Re-export des types importants pour l'API ──

// Core pipeline types
export type { PreprocessingResult, CalibrationPoints } from './preprocessing'
export type { TrackingResult, TrackedPlayer, Landmark, BallDetection } from './tracking'
export type { Reconstruction3DResult, PlayerPosition3D, HeatmapPoint, CourtZone } from './reconstruction3d'
export type { ShotResult, ShotStats, ShotZone } from './shotAnalysis'
export type { MentalAnalysisResult, MentalPattern, MentalTimeline } from './mentalAnalysis'
export type { LiveCoachConfig, LiveAlert, LiveAlertType, LiveFrameAnalysis, LiveCumulativeStats, LiveLandmarks } from './liveCoach'
export type { TwinProfile, TwinAttribute, TwinAttributeCategory, TwinTrait, PlayStyleProfile, NBAComparison, MatchupSimulation, SessionAnalysisData, ComfortZone, TwinEvolutionPoint, PlayStyle, TwinDrillRecommendation, TwinDrillRecommendationOptions, TwinDrillIntensity } from './digitalTwin'
export type { FullAnalysisData, AIReport, TrainingDay } from './reportGenerator'
export type { HighlightResult, HighlightClip, HighlightTemplate, CVHighlightEvent, ExportProfile } from './highlightEditor'
export type { MusicTrack, MusicConfig, MusicMood, MusicGenre } from './musicLibrary'

// V5 Apex types
export type { ShotDNASignature, ShotDNAProfile, ZoneEfficiencyData, MechanicalDrift, ShotQualityResult } from './shotDNA'
export type { AdvancedAnalyticsResult, ClutchShotData, MomentumShift, PerformanceWindow } from './advancedAnalytics'
export type { CoachChatMessage, ChatAttachment, SuggestedAction, ConversationContext, PlayerContext, CoachChatResponse } from './coachChat'
export type { TrainingPlanRequest, SmartTrainingPlan, TrainingPlanDay, DrillItem, PlanAdaptation } from './smartTraining'
export type { PredictionInput, HistoricalSession, PerformancePrediction, ZonePrediction, MomentumPoint, RiskFactor } from './predictiveEngine'
export type { RecoveryInput, RecoveryResult } from './recoveryEngine'

// V6 Realtime Pipeline types
export type { PoseEstimationConfig, PoseEstimationResult, NormalizedLandmark, BoundingBox, PoseEstimationState, BodyAngles, ShootingBiomechanics } from './poseEstimation'
export type { ShotDetectorConfig, DetectedShot, ShotDetectionPhase, ShotDetectorEvent } from './shotDetector'
export type { BallTrackerConfig, BallPosition, KalmanState, RimPosition, TrajectoryAnalysis, ShotOutcomeResult } from './ballTracker'
export type { AROverlayConfig, AROverlayFrame, SkeletonOverlay, ARJoint, ARBone, ShotArcOverlay, BioIndicator, ARFeedback } from './arOverlay'
export type { RealtimePipelineConfig, PipelineFrameResult, InstantFeedback, RealtimeSessionStats, PipelineMode, PipelineEvent } from './realtimePipeline'
