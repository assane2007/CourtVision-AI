/**
 * useRealtimeAI — Hook React pour l'analyse IA en temps réel.
 *
 * Fournit :
 * - Cycle de vie complet (init → start → frame processing → end)
 * - État réactif pour l'UI (stats, feedbacks, phase de tir)
 * - AR overlay data pour le composant visuel
 * - Gestion automatique des ressources
 *
 * Usage :
 *   const ai = useRealtimeAI()
 *   await ai.init()
 *   ai.startSession()
 *   // Dans la boucle de frame de la caméra :
 *   await ai.processFrame(frameData, index, timestamp, width, height)
 *   // UI accède à ai.stats, ai.lastFeedback, ai.arFrame, etc.
 *   ai.endSession()
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Vibration, Platform } from 'react-native'
import {
    RealtimeAIService,
    type RealtimeAIConfig,
    type FrameProcessingResult,
    type SessionRealtimeStats,
    type DetectedShot,
    type AROverlayFrame,
    type ARFeedback,
    type PipelineEvent,
} from '../lib/realtimeAIService'
import { SessionStorageService } from '../lib/sessionStorage'

// ==========================================
// Types
// ==========================================

export type AIPhase = 'uninitialized' | 'ready' | 'active' | 'ended' | 'error'

export interface UseRealtimeAIState {
    /** Phase actuelle du service IA */
    phase: AIPhase
    /** Session ID active */
    sessionId: string | null
    /** Nombre de tirs détectés */
    shotCount: number
    /** Tirs réussis */
    madeCount: number
    /** Tirs ratés */
    missCount: number
    /** % de réussite */
    shootingPct: number
    /** Phase actuelle du détecteur de tir */
    shotPhase: string
    /** Dernier feedback AR */
    lastFeedback: ARFeedback | null
    /** Dernière frame AR overlay */
    lastARFrame: AROverlayFrame | null
    /** Dernière biomécanique détectée */
    lastBiomechanics: {
        elbowAngle: number
        releaseHeight: number
        releaseTime: number
        postureQuality: number
    } | null
    /** FPS actuel du pipeline */
    currentFps: number
    /** Temps de traitement moyen (ms) */
    avgProcessingMs: number
    /** Nombre total de frames traitées */
    frameCount: number
    /** Durée de la session (secondes) */
    sessionDuration: number
    /** Historique des tirs */
    shots: DetectedShot[]
    /** Statistiques complètes de la session */
    stats: SessionRealtimeStats | null
    /** Score de consistance mécanique */
    mechanicConsistency: number
    /** Tendances détectées */
    trends: Array<{
        metric: string
        direction: 'improving' | 'declining' | 'stable'
        description: string
    }>
    /** Erreur éventuelle */
    error: string | null
}

export interface UseRealtimeAIActions {
    /** Initialiser le service IA (charger les modèles) */
    init: (config?: Partial<RealtimeAIConfig>) => Promise<void>
    /** Démarrer une session de capture */
    startSession: (config?: Partial<RealtimeAIConfig>) => void
    /** Traiter une frame capturée */
    processFrame: (
        frameData: string | Uint8Array,
        frameIndex: number,
        timestamp: number,
        frameWidth: number,
        frameHeight: number,
    ) => Promise<FrameProcessingResult | null>
    /** Enregistrer un tir manuellement */
    recordShot: (outcome: 'made' | 'missed', zone?: string) => void
    /** Terminer la session */
    endSession: () => SessionRealtimeStats | null
    /** Reset complet */
    reset: () => void
}

export type UseRealtimeAIReturn = UseRealtimeAIState & UseRealtimeAIActions

// ==========================================
// Constantes
// ==========================================

const HAPTIC_SHOT_DETECTED = Platform.OS === 'ios' ? [50] : [0, 50]
const HAPTIC_FEEDBACK_SUCCESS = Platform.OS === 'ios' ? [30, 20, 30] : [0, 30, 20, 30]
const HAPTIC_FEEDBACK_WARNING = Platform.OS === 'ios' ? [100] : [0, 100]

// ==========================================
// Hook
// ==========================================

export function useRealtimeAI(): UseRealtimeAIReturn {
    // ---- State ----
    const [phase, setPhase] = useState<AIPhase>('uninitialized')
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [shotCount, setShotCount] = useState(0)
    const [madeCount, setMadeCount] = useState(0)
    const [missCount, setMissCount] = useState(0)
    const [shotPhase, setShotPhase] = useState('idle')
    const [lastFeedback, setLastFeedback] = useState<ARFeedback | null>(null)
    const [lastARFrame, setLastARFrame] = useState<AROverlayFrame | null>(null)
    const [lastBiomechanics, setLastBiomechanics] = useState<UseRealtimeAIState['lastBiomechanics']>(null)
    const [currentFps, setCurrentFps] = useState(0)
    const [avgProcessingMs, setAvgProcessingMs] = useState(0)
    const [frameCount, setFrameCount] = useState(0)
    const [sessionDuration, setSessionDuration] = useState(0)
    const [shots, setShots] = useState<DetectedShot[]>([])
    const [stats, setStats] = useState<SessionRealtimeStats | null>(null)
    const [mechanicConsistency, setMechanicConsistency] = useState(50)
    const [trends, setTrends] = useState<UseRealtimeAIState['trends']>([])
    const [error, setError] = useState<string | null>(null)

    // ---- Refs ----
    const serviceRef = useRef<RealtimeAIService | null>(null)
    const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const demoLoopRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const configRef = useRef<Partial<RealtimeAIConfig>>({})

    // ---- Cleanup ----
    useEffect(() => {
        return () => {
            if (durationTimerRef.current) clearInterval(durationTimerRef.current)
            if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
            if (demoLoopRef.current) clearInterval(demoLoopRef.current)
            serviceRef.current?.dispose()
        }
    }, [])

    // ---- Pipeline Event Handler ----
    const handlePipelineEvent = useCallback((event: PipelineEvent) => {
        switch (event.type) {
            case 'shot_detected':
                setShotCount(prev => prev + 1)
                if (event.shot.outcome === 'made') {
                    setMadeCount(prev => prev + 1)
                } else if (event.shot.outcome === 'missed') {
                    setMissCount(prev => prev + 1)
                }
                setShots(prev => [...prev, event.shot])

                // Haptic feedback pour tir détecté
                if (configRef.current.enableHaptics !== false) {
                    Vibration.vibrate(HAPTIC_SHOT_DETECTED)
                }
                break

            case 'feedback':
                setLastFeedback(event.feedback)
                // Haptic feedback selon le type
                if (configRef.current.enableHaptics !== false) {
                    if (event.feedback.type === 'success') {
                        Vibration.vibrate(HAPTIC_FEEDBACK_SUCCESS)
                    } else if (event.feedback.type === 'warning' || event.feedback.type === 'error') {
                        Vibration.vibrate(HAPTIC_FEEDBACK_WARNING)
                    }
                }
                // Auto-clear feedback après durée
                if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
                feedbackTimeoutRef.current = setTimeout(() => {
                    setLastFeedback(null)
                }, event.feedback.duration)
                break

            case 'error':
                setError(event.message)
                break
        }
    }, [])

    // ---- Actions ----

    const init = useCallback(async (config?: Partial<RealtimeAIConfig>) => {
        try {
            const service = RealtimeAIService.getInstance()
            serviceRef.current = service
            configRef.current = config ?? {}

            await service.initialize({
                ...config,
                onPipelineEvent: handlePipelineEvent,
                onShotDetected: (shot) => {
                    // Mettre à jour la biomécanique visible
                    setLastBiomechanics({
                        elbowAngle: shot.releaseBiomechanics.elbowAngle,
                        releaseHeight: shot.releaseBiomechanics.releaseHeightRatio,
                        releaseTime: shot.releaseTime,
                        postureQuality: shot.releaseBiomechanics.postureQuality,
                    })
                },
            })

            setPhase('ready')
            setError(null)
        } catch (err) {
            setPhase('error')
            setError(err instanceof Error ? err.message : 'Failed to initialize AI')
        }
    }, [handlePipelineEvent])

    const startSession = useCallback((config?: Partial<RealtimeAIConfig>) => {
        if (!serviceRef.current) {
            setError('Service not initialized')
            return
        }

        try {
            const id = serviceRef.current.startSession(config)
            setSessionId(id)
            setPhase('active')
            setShotCount(0)
            setMadeCount(0)
            setMissCount(0)
            setShots([])
            setStats(null)
            setLastFeedback(null)
            setLastARFrame(null)
            setLastBiomechanics(null)
            setSessionDuration(0)
            setFrameCount(0)
            setMechanicConsistency(50)
            setTrends([])
            setError(null)

            // Timer pour la durée de session
            durationTimerRef.current = setInterval(() => {
                setSessionDuration(prev => prev + 1)
            }, 1000)

            // Mode démo : lancer une boucle automatique de frames simulées
            if (configRef.current.enableDemoMode) {
                let demoFrameIndex = 0
                demoLoopRef.current = setInterval(async () => {
                    if (!serviceRef.current) return
                    demoFrameIndex++
                    try {
                        const result = await serviceRef.current.processFrame(
                            '', demoFrameIndex, demoFrameIndex / 30, 1080, 1920
                        )

                        setFrameCount(serviceRef.current.getFrameCount())
                        setCurrentFps(result.currentFps)
                        setShotPhase(result.shotPhase)

                        if (result.arFrame) {
                            setLastARFrame(result.arFrame)
                        }

                        if (result.instantFeedback) {
                            setLastFeedback(result.instantFeedback)
                            // Auto-clear feedback
                            if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
                            feedbackTimeoutRef.current = setTimeout(() => {
                                setLastFeedback(null)
                            }, result.instantFeedback.duration)
                        }

                        if (result.biomechanics) {
                            setLastBiomechanics({
                                elbowAngle: result.biomechanics.elbowAngle,
                                releaseHeight: result.biomechanics.releaseHeightRatio,
                                releaseTime: 0,
                                postureQuality: result.biomechanics.postureQuality,
                            })
                        }

                        if (result.detectedShot) {
                            const shot = result.detectedShot
                            setShotCount(prev => prev + 1)
                            if (shot.outcome === 'made') setMadeCount(prev => prev + 1)
                            else if (shot.outcome === 'missed') setMissCount(prev => prev + 1)
                            setShots(serviceRef.current.getShots())

                            setLastBiomechanics({
                                elbowAngle: shot.releaseBiomechanics.elbowAngle,
                                releaseHeight: shot.releaseBiomechanics.releaseHeightRatio,
                                releaseTime: shot.releaseTime,
                                postureQuality: shot.releaseBiomechanics.postureQuality,
                            })

                            if (configRef.current.enableHaptics !== false) {
                                Vibration.vibrate(HAPTIC_SHOT_DETECTED)
                            }
                        }

                        // Mise à jour stats périodiques
                        if (demoFrameIndex % 60 === 0) {
                            const currentStats = serviceRef.current.getCurrentStats()
                            setMechanicConsistency(currentStats.mechanicConsistency)
                            setTrends(currentStats.trends)
                            setAvgProcessingMs(currentStats.avgProcessingTimeMs)
                        }
                    } catch (err) {
                        console.warn('[useRealtimeAI] demo frame error:', err)
                    }
                }, 33) // ~30fps
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start session')
        }
    }, [])

    const processFrame = useCallback(async (
        frameData: string | Uint8Array,
        frameIndex: number,
        timestamp: number,
        frameWidth: number,
        frameHeight: number,
    ): Promise<FrameProcessingResult | null> => {
        if (!serviceRef.current || phase !== 'active') return null

        try {
            const result = await serviceRef.current.processFrame(
                frameData, frameIndex, timestamp, frameWidth, frameHeight
            )

            // Mettre à jour l'état UI
            setFrameCount(result.processingTimeMs > 0 ? serviceRef.current.getFrameCount() : 0)
            setCurrentFps(result.currentFps)
            setShotPhase(result.shotPhase)

            if (result.arFrame) {
                setLastARFrame(result.arFrame)
            }

            if (result.instantFeedback) {
                setLastFeedback(result.instantFeedback)
            }

            if (result.biomechanics) {
                setLastBiomechanics({
                    elbowAngle: result.biomechanics.elbowAngle,
                    releaseHeight: result.biomechanics.releaseHeightRatio,
                    releaseTime: 0,
                    postureQuality: result.biomechanics.postureQuality,
                })
            }

            // Mise à jour des stats périodiques (tous les 30 frames)
            if (serviceRef.current.getFrameCount() % 30 === 0) {
                const currentStats = serviceRef.current.getCurrentStats()
                setMechanicConsistency(currentStats.mechanicConsistency)
                setTrends(currentStats.trends)
                setAvgProcessingMs(currentStats.avgProcessingTimeMs)
            }

            return result
        } catch (err) {
            console.warn('[useRealtimeAI] processFrame error:', err)
            return null
        }
    }, [phase])

    const recordShot = useCallback((outcome: 'made' | 'missed', zone?: string) => {
        if (!serviceRef.current || phase !== 'active') return

        serviceRef.current.recordManualShot(outcome, zone)
        setShotCount(prev => prev + 1)
        if (outcome === 'made') {
            setMadeCount(prev => prev + 1)
        } else {
            setMissCount(prev => prev + 1)
        }
        setShots(serviceRef.current.getShots())

        // Haptic
        if (configRef.current.enableHaptics !== false) {
            Vibration.vibrate(HAPTIC_SHOT_DETECTED)
        }
    }, [phase])

    const endSession = useCallback((): SessionRealtimeStats | null => {
        if (!serviceRef.current || phase !== 'active') return null

        try {
            if (durationTimerRef.current) {
                clearInterval(durationTimerRef.current)
                durationTimerRef.current = null
            }
            if (demoLoopRef.current) {
                clearInterval(demoLoopRef.current)
                demoLoopRef.current = null
            }

            const sessionStats = serviceRef.current.endSession()
            setStats(sessionStats)
            setPhase('ended')

            // Sauvegarder la session localement et syncer avec le cloud
            const storage = SessionStorageService.getInstance()
            storage.saveSession(
                sessionStats,
                serviceRef.current.getShots(),
            ).catch(err => console.warn('[useRealtimeAI] Failed to save session:', err))

            return sessionStats
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to end session')
            return null
        }
    }, [phase])

    const reset = useCallback(() => {
        if (durationTimerRef.current) {
            clearInterval(durationTimerRef.current)
            durationTimerRef.current = null
        }
        if (demoLoopRef.current) {
            clearInterval(demoLoopRef.current)
            demoLoopRef.current = null
        }

        setPhase(serviceRef.current ? 'ready' : 'uninitialized')
        setSessionId(null)
        setShotCount(0)
        setMadeCount(0)
        setMissCount(0)
        setShotPhase('idle')
        setLastFeedback(null)
        setLastARFrame(null)
        setLastBiomechanics(null)
        setCurrentFps(0)
        setAvgProcessingMs(0)
        setFrameCount(0)
        setSessionDuration(0)
        setShots([])
        setStats(null)
        setMechanicConsistency(50)
        setTrends([])
        setError(null)
    }, [])

    // ---- Computed ----
    const shootingPct = shotCount > 0 ? Math.round((madeCount / shotCount) * 1000) / 10 : 0

    return {
        // State
        phase,
        sessionId,
        shotCount,
        madeCount,
        missCount,
        shootingPct,
        shotPhase,
        lastFeedback,
        lastARFrame,
        lastBiomechanics,
        currentFps,
        avgProcessingMs,
        frameCount,
        sessionDuration,
        shots,
        stats,
        mechanicConsistency,
        trends,
        error,
        // Actions
        init,
        startSession,
        processFrame,
        recordShot,
        endSession,
        reset,
    }
}
