/**
 * useLiveCoach — Hook React pour le Coach Live.
 *
 * Gère :
 * - Cycle de vie complet de la session (start → frame → shot → quarter → end)
 * - SSE pour alertes push
 * - Timer d'envoi de frames automatique
 * - État réactif pour l'UI
 * - Vibrations contextuelles
 * - Reconnexion automatique
 *
 * Usage :
 *   const live = useLiveCoach(sessionId)
 *   live.start()
 *   live.recordShot('made')
 *   live.endQuarter()
 *   live.end()
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import type { AppStateStatus } from 'react-native';
import { Vibration, AppState } from 'react-native'
import { LiveCoachService } from '../lib/liveCoachService'
import { analyzeFrame, analyzeFrameFromUri, isCVEngineAvailable, type CVFrameResult } from '../lib/cvEngineService'
import { isDemoMode } from '../lib/supabase'
import { toast } from '../lib/toast'
import { useStore } from '../lib/store'
import type {
    LiveAlertPayload,
    LiveStatsPayload,
    LiveFramePayload,
    LiveSSEEvent,
    LiveEndResponse,
    ShotOutcome,
    ShotZone,
    AlertSeverity,
} from '@courtvision/shared'

// ==========================================
// Types du hook
// ==========================================

export type LivePhase = 'idle' | 'connecting' | 'active' | 'break' | 'ended' | 'error'

export interface UseLiveCoachState {
    /** Phase actuelle */
    phase: LivePhase
    /** Quart-temps en cours */
    quarter: number
    /** Score mental instantané */
    mentalScore: number
    /** Index de fatigue */
    fatigueIndex: number
    /** Score de posture */
    postureScore: number
    /** Confiance de l'analyse */
    confidence: number
    /** Nombre de tirs réussis */
    makeCount: number
    /** Nombre de tirs ratés */
    missCount: number
    /** Pourcentage de réussite */
    shootingPct: number
    /** Alertes reçues (plus récentes en premier) */
    alerts: LiveAlertPayload[]
    /** Stats cumulées du serveur */
    stats: LiveStatsPayload | null
    /** Historique du score mental */
    mentalHistory: number[]
    /** Recommandations de fin de match */
    recommendations: string[]
    /** Temps écoulé en secondes */
    elapsedTime: number
    /** Erreur éventuelle */
    error: string | null
    /** Rapport de fin de match */
    endReport: LiveEndResponse | null
    /** Connexion SSE active */
    sseConnected: boolean
    /** Tracked player detections from CV engine */
    detections: Detection[]
    /** Frames per second from CV engine */
    fps: number
}

export interface Detection {
    x: number
    y: number
    width?: number
    height?: number
    player?: number
    speed?: number
}

export interface UseLiveCoachActions {
    /** Démarrer le Coach Live */
    start: (config?: Record<string, any>) => Promise<void>
    /** Envoyer une frame manuellement (si pas de caméra auto) */
    sendFrame: (payload: LiveFramePayload) => Promise<void>
    /** Enregistrer un tir */
    recordShot: (outcome: ShotOutcome, zone?: ShotZone) => Promise<void>
    /** Terminer le quart-temps */
    endQuarter: () => Promise<void>
    /** Passer au quart suivant */
    nextQuarter: () => Promise<void>
    /** Terminer le match */
    end: () => Promise<void>
    /** Reset complet (nouveau match) */
    reset: () => void
}

export type UseLiveCoachReturn = UseLiveCoachState & UseLiveCoachActions

// ==========================================
// Constantes
// ==========================================

const MAX_ALERTS = 12
const FRAME_INTERVAL_MS = 3000
const INITIAL_MENTAL = 65

const VIBRATION_PATTERNS: Record<AlertSeverity, number | number[]> = {
    info: 100,
    warning: [0, 200, 100, 200],
    critical: [0, 400, 200, 400],
}

// ==========================================
// Hook
// ==========================================

export function useLiveCoach(sessionId: string): UseLiveCoachReturn {
    // ---- State ----
    const [phase, setPhase] = useState<LivePhase>('idle')
    const [quarter, setQuarter] = useState(1)
    const [mentalScore, setMentalScore] = useState(INITIAL_MENTAL)
    const [fatigueIndex, setFatigueIndex] = useState(0)
    const [postureScore, setPostureScore] = useState(0.5)
    const [confidence, setConfidence] = useState(0)
    const [makeCount, setMakeCount] = useState(0)
    const [missCount, setMissCount] = useState(0)
    const [alerts, setAlerts] = useState<LiveAlertPayload[]>([])
    const [stats, setStats] = useState<LiveStatsPayload | null>(null)
    const [mentalHistory, setMentalHistory] = useState<number[]>([INITIAL_MENTAL])
    const [recommendations, setRecommendations] = useState<string[]>([])
    const [elapsedTime, setElapsedTime] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [endReport, setEndReport] = useState<LiveEndResponse | null>(null)
    const [sseConnected, setSseConnected] = useState(false)
    const [detections, setDetections] = useState<Detection[]>([])
    const [fps, setFps] = useState(0)
    const cvAvailableRef = useRef<boolean | null>(null)
    const lastElbowAngles = useRef<number[]>([])
    const lastKneeAngles = useRef<number[]>([])
    const shotPhaseRef = useRef<'idle' | 'cocking' | 'releasing'>('idle')

    // ---- Refs ----
    const serviceRef = useRef<LiveCoachService | null>(null)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const startTimeRef = useRef<number>(0)

    // ---- Computed ----
    const shootingPct = (makeCount + missCount) > 0
        ? Math.round((makeCount / (makeCount + missCount)) * 100)
        : 0

    // ---- Service init ----
    useEffect(() => {
        serviceRef.current = new LiveCoachService(sessionId)
        return () => {
            serviceRef.current?.destroy()
            clearTimers()
        }
    }, [sessionId])

    // ---- App state (pause quand app en background) ----
    useEffect(() => {
        const handleAppState = (state: AppStateStatus) => {
            if (state === 'background' && phase === 'active') {
                // Arrêter le timer de frames quand l'app est en background
                if (frameTimerRef.current) {
                    clearInterval(frameTimerRef.current)
                    frameTimerRef.current = null
                }
            } else if (state === 'active' && phase === 'active') {
                // Reprendre le timer de frames
                startFrameTimer()
            }
        }
        const sub = AppState.addEventListener('change', handleAppState)
        return () => sub.remove()
    }, [phase])

    // ---- Timer helpers ----
    const clearTimers = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        if (frameTimerRef.current) { clearInterval(frameTimerRef.current); frameTimerRef.current = null }
    }, [])

    const startElapsedTimer = useCallback(() => {
        startTimeRef.current = Date.now()
        timerRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }, 1000)
    }, [])

    const startFrameTimer = useCallback(() => {
        if (frameTimerRef.current) clearInterval(frameTimerRef.current)
        frameTimerRef.current = setInterval(async () => {
            try {
                // Envoyer une frame « heartbeat » sans landmarks
                // En production, on enverrait les landmarks de la caméra ici
                const elapsed = (Date.now() - startTimeRef.current) / 1000
                await serviceRef.current?.sendFrame({
                    timestamp: elapsed,
                    quarter,
                })
            } catch {
                // Ignorer les erreurs de frame individuelles
            }
        }, FRAME_INTERVAL_MS)
    }, [quarter])

    // ---- Vibration helper ----
    const vibrateForAlert = useCallback((alert: LiveAlertPayload) => {
        if (!alert.vibrate) return
        if (alert.vibrationPattern && alert.vibrationPattern.length > 0) {
            Vibration.vibrate(alert.vibrationPattern)
        } else {
            Vibration.vibrate(VIBRATION_PATTERNS[alert.severity] || 100)
        }
        // Toast pour les alertes critiques ou importantes
        if (alert.severity === 'critical') {
            toast.error(alert.message, undefined, 4000)
        } else if (alert.severity === 'warning') {
            toast.warning(alert.message, undefined, 3000)
        }
    }, [])

    // ---- SSE handler ----
    const handleSSEEvent = useCallback((event: LiveSSEEvent) => {
        switch (event.type) {
            case 'connected':
                setSseConnected(true)
                break

            case 'alerts':
                setMentalScore(event.mentalScore)
                setFatigueIndex(event.fatigueIndex)
                setMentalHistory(prev => [...prev, event.mentalScore])
                for (const alert of event.alerts) {
                    setAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS))
                    vibrateForAlert(alert)
                }
                break

            case 'quarter_end':
                // Handled by the endQuarter action
                break

            case 'session_end':
                setPhase('ended')
                setEndReport(event.result)
                setRecommendations(event.result.recommendations)
                clearTimers()
                break

            case 'heartbeat':
                // SSE keepalive
                break
        }
    }, [vibrateForAlert, clearTimers])

    // ==========================================
    // Actions
    // ==========================================

    const start = useCallback(async (config?: Record<string, any>) => {
        setPhase('connecting')
        setError(null)

        // ── Demo mode: simulate live coach locally ──
        if (isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 800)) // fake connection delay
            setPhase('active')
            setAlerts([])
            setElapsedTime(0)
            setMentalHistory([INITIAL_MENTAL])
            setMentalScore(INITIAL_MENTAL)
            setFatigueIndex(0)
            setSseConnected(true)
            startElapsedTimer()

            // Simulate periodic AI alerts in demo mode
            frameTimerRef.current = setInterval(() => {
                const now = Date.now()
                const demoAlerts: LiveAlertPayload[] = [
                    { id: `d-${now}-1`, type: 'posture', message: 'Keep your elbow tucked on release', severity: 'info', emoji: '💪', vibrate: false, vibrationPattern: [], timestamp: now },
                    { id: `d-${now}-2`, type: 'shooting_hot', message: 'Great follow-through on last shot!', severity: 'info', emoji: '✅', vibrate: false, vibrationPattern: [], timestamp: now },
                    { id: `d-${now}-3`, type: 'fatigue', message: 'Fatigue detected — slow your pace', severity: 'warning', emoji: '⚠️', vibrate: true, vibrationPattern: [0, 200, 100, 200], timestamp: now },
                    { id: `d-${now}-4`, type: 'shot_selection', message: 'Shot arc too flat — aim higher', severity: 'warning', emoji: '📐', vibrate: false, vibrationPattern: [], timestamp: now },
                    { id: `d-${now}-5`, type: 'mental_recovery', message: 'Excellent court vision!', severity: 'info', emoji: '👁️', vibrate: false, vibrationPattern: [], timestamp: now },
                    { id: `d-${now}-6`, type: 'posture', message: 'Balance shifting left — center up', severity: 'info', emoji: '⚖️', vibrate: false, vibrationPattern: [], timestamp: now },
                ]
                const alert = demoAlerts[Math.floor(Math.random() * demoAlerts.length)]
                setAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS))
                setMentalScore(prev => {
                    const delta = Math.floor(Math.random() * 7) - 3 // -3 to +3
                    const next = Math.max(30, Math.min(100, prev + delta))
                    setMentalHistory(h => [...h, next])
                    return next
                })
                setFatigueIndex(prev => Math.min(100, prev + Math.random() * 2))
                setPostureScore(0.5 + Math.random() * 0.4)
                setConfidence(0.6 + Math.random() * 0.3)
            }, FRAME_INTERVAL_MS)

            toast.success('Live Coach started', 'Demo — real-time analysis active')
            return
        }

        if (!serviceRef.current) return

        try {
            const response = await serviceRef.current.start(config)

            setPhase('active')
            setAlerts([])
            setElapsedTime(0)
            setMentalHistory([INITIAL_MENTAL])
            setMentalScore(INITIAL_MENTAL)
            setFatigueIndex(0)

            // Démarrer les timers
            startElapsedTimer()
            startFrameTimer()

            // Connecter SSE pour les alertes push
            serviceRef.current.connectSSE(handleSSEEvent)

            toast.success('Live Coach started', 'Real-time analysis active')
        } catch (err: any) {
            setPhase('error')
            const msg = err.message || 'Unable to start Live Coach'
            setError(msg)
            toast.error('Connection error', msg)
        }
    }, [handleSSEEvent, startElapsedTimer, startFrameTimer])

    const sendFrame = useCallback(async (payload: LiveFramePayload) => {
        if (phase !== 'active') return
        // In demo mode, frames are simulated by the interval timer in start()
        if (isDemoMode) return

        // ── CV Engine path: send real image data for pose estimation ──
        const hasFrame = payload.frameBase64 || payload.frameUri
        if (hasFrame) {
            // Check CV Engine availability (cached for 30s)
            if (cvAvailableRef.current === null) {
                cvAvailableRef.current = await isCVEngineAvailable()
                if (cvAvailableRef.current) {
                    console.log('[LiveCoach] CV Engine connected — real AI analysis active')
                }
            }

            if (cvAvailableRef.current) {
                try {
                    let cvResult: CVFrameResult
                    if (payload.frameBase64) {
                        cvResult = await analyzeFrame(payload.frameBase64)
                    } else {
                        cvResult = await analyzeFrameFromUri(payload.frameUri!)
                    }

                    // Map CV Engine result to hook state
                    if (cvResult.success) {
                        // Update posture score from real biomechanics
                        const elbow = cvResult.elbow_angle
                        const knee = cvResult.knee_angle

                        if (elbow !== null) {
                            lastElbowAngles.current.push(elbow)
                            if (lastElbowAngles.current.length > 20) lastElbowAngles.current.shift()
                        }
                        if (knee !== null) {
                            lastKneeAngles.current.push(knee)
                            if (lastKneeAngles.current.length > 20) lastKneeAngles.current.shift()
                        }

                        // Compute posture quality from elbow alignment
                        // NBA ideal elbow angle during shot: 90-100°
                        const postureFromElbow = elbow !== null
                            ? Math.max(0, 1 - Math.abs(elbow - 95) / 45)
                            : 0.5
                        setPostureScore(postureFromElbow)

                        // Confidence from CV Engine success + landmark quality
                        const lmCount = cvResult.landmarks_3d?.length ?? 0
                        setConfidence(cvResult.success ? Math.min(0.95, 0.5 + lmCount / 66) : 0.1)

                        // Player detections
                        if (cvResult.players.length > 0) {
                            setDetections(cvResult.players.map(p => ({
                                x: p.x1, y: p.y1,
                                width: p.x2 - p.x1, height: p.y2 - p.y1,
                                player: p.track_id ?? undefined,
                            })))
                        }

                        // FPS from inference time
                        if (cvResult.inference_ms > 0) {
                            setFps(Math.round(1000 / cvResult.inference_ms))
                        }

                        // Shot detection via elbow angle change heuristic
                        // Cocking: elbow bends (angle decreasing rapidly)
                        // Release: elbow extends (angle increasing rapidly) past 90°
                        if (elbow !== null && lastElbowAngles.current.length >= 3) {
                            const recent = lastElbowAngles.current
                            const prev = recent[recent.length - 2]
                            const delta = elbow - prev

                            if (shotPhaseRef.current === 'idle' && delta < -8) {
                                shotPhaseRef.current = 'cocking'
                            } else if (shotPhaseRef.current === 'cocking' && delta > 12 && elbow > 85) {
                                shotPhaseRef.current = 'releasing'
                            } else if (shotPhaseRef.current === 'releasing') {
                                // Shot completed — record it with real biomechanics
                                shotPhaseRef.current = 'idle'

                                const avgKnee = lastKneeAngles.current.length > 0
                                    ? lastKneeAngles.current.reduce((a, b) => a + b) / lastKneeAngles.current.length
                                    : 130

                                // Determine outcome heuristic: if wrist ends above shoulder = good follow-through
                                const skel = cvResult.skeleton
                                const wristAbove = skel?.right_wrist && skel?.right_shoulder
                                    ? skel.right_wrist.y < skel.right_shoulder.y
                                    : false

                                // This doesn't mean made/missed — we can't detect that from pose alone
                                // Mark as null and let manual recording or ball tracking decide
                                setMakeCount(p => wristAbove ? p : p)

                                const alert: LiveAlertPayload = {
                                    id: `cv-${Date.now()}`,
                                    type: 'posture',
                                    message: elbow >= 88 && elbow <= 100
                                        ? `Great release! Elbow ${Math.round(elbow)}°`
                                        : `Elbow ${Math.round(elbow)}° — aim for 90-100°`,
                                    severity: elbow >= 85 && elbow <= 105 ? 'info' : 'warning',
                                    emoji: elbow >= 88 && elbow <= 100 ? '✅' : '📐',
                                    vibrate: elbow < 85 || elbow > 105,
                                    vibrationPattern: [],
                                    timestamp: Date.now(),
                                }
                                setAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS))
                                vibrateForAlert(alert)
                            }
                        }
                    }

                    // Update mental score based on consistency of recent angles
                    if (lastElbowAngles.current.length >= 5) {
                        const angles = lastElbowAngles.current.slice(-10)
                        const mean = angles.reduce((a, b) => a + b) / angles.length
                        const variance = angles.reduce((a, b) => a + (b - mean) ** 2, 0) / angles.length
                        const std = Math.sqrt(variance)
                        // Lower std = more consistent = higher mental score
                        const consistency = Math.max(30, Math.min(100, 100 - std * 3))
                        setMentalScore(Math.round(consistency))
                        setMentalHistory(prev => [...prev, Math.round(consistency)])
                    }

                    return // CV Engine handled this frame
                } catch (err) {
                    console.warn('[LiveCoach] CV Engine frame error:', (err as Error)?.message)
                    // Fall through to API-based path
                }
            }
        }

        // ── Fallback: API-based processing (no frame data) ──
        if (!serviceRef.current) return

        try {
            const response = await serviceRef.current.sendFrame(payload)

            setMentalScore(response.mentalScore)
            setFatigueIndex(response.fatigueIndex)
            setPostureScore(response.postureScore)
            setConfidence(response.confidence)
            setMentalHistory(prev => [...prev, response.mentalScore])

            if (response.stats) {
                setStats(response.stats)
            }

            // Traiter les alertes
            for (const alert of response.alerts) {
                setAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS))
                vibrateForAlert(alert)
            }
        } catch (err: any) {
            // Ignorer les erreurs de frame individuelles (réseau intermittent)
            console.warn('[LiveCoach] Frame error:', err.message)
        }
    }, [phase, vibrateForAlert])

    const recordShot = useCallback(async (outcome: ShotOutcome, zone?: ShotZone) => {
        if (phase !== 'active') return

        // Update local immédiatement (optimistic)
        if (outcome === 'made') {
            setMakeCount(p => p + 1)
            Vibration.vibrate(80) // petit feedback positif
        } else {
            setMissCount(p => p + 1)
        }

        // In demo mode, just keep optimistic state
        if (isDemoMode) return

        if (!serviceRef.current) return

        try {
            const response = await serviceRef.current.recordShot(outcome, zone)

            // Sync avec le serveur
            if (response.currentStats) {
                setMakeCount(response.currentStats.shotsMade)
                setMissCount(response.currentStats.shotsDetected - response.currentStats.shotsMade)
            }

            // Traiter les alertes de tir
            for (const alert of response.alerts) {
                setAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS))
                vibrateForAlert(alert)
            }
        } catch {
            // L'update optimistic reste en place
        }
    }, [phase, vibrateForAlert])

    const endQuarter = useCallback(async () => {
        clearTimers()

        // Demo mode: local quarter end
        if (isDemoMode) {
            if (quarter < 4) {
                setPhase('break')
            } else {
                await end()
            }
            return
        }

        if (!serviceRef.current) return

        try {
            const response = await serviceRef.current.endQuarter(quarter)

            if (response.nextQuarter) {
                setPhase('break')
            } else {
                // Dernier quart — fin du match
                await end()
            }
        } catch (err: any) {
            // Fallback local en cas d'erreur réseau
            if (quarter < 4) {
                setPhase('break')
            } else {
                setPhase('ended')
            }
        }
    }, [quarter, clearTimers])

    const nextQuarter = useCallback(async () => {
        if (!serviceRef.current) return
        const nextQ = quarter + 1
        setQuarter(nextQ)
        setElapsedTime(0)
        startTimeRef.current = Date.now()
        setPhase('active')
        startElapsedTimer()
        startFrameTimer()
    }, [quarter, startElapsedTimer, startFrameTimer])

    const end = useCallback(async () => {
        clearTimers()

        // Demo mode: generate local report
        if (isDemoMode) {
            const recs = generateLocalRecommendations()
            const pct = (makeCount + missCount) > 0 ? Math.round((makeCount / (makeCount + missCount)) * 100) : 0
            const demoReport: LiveEndResponse = {
                sessionId,
                status: 'complete',
                summary: {
                    id: `end-${Date.now()}`,
                    type: 'quarter_summary',
                    severity: 'info',
                    message: `Session complete — ${pct}% shooting`,
                    emoji: '🏁',
                    vibrate: false,
                    vibrationPattern: [],
                    timestamp: Date.now(),
                },
                stats: {
                    playTime: elapsedTime,
                    shotsDetected: makeCount + missCount,
                    shotsMade: makeCount,
                    shootingPct: pct,
                    avgMentalScore: mentalScore,
                    mentalByQuarter: { [quarter]: mentalHistory },
                    distanceCovered: 0,
                    alertsSent: alerts.length,
                    peakMoment: null,
                    lowMoment: null,
                },
                mentalTimeline: mentalHistory,
                recommendations: recs,
                message: 'Demo session complete',
            }
            setPhase('ended')
            setEndReport(demoReport)
            setRecommendations(demoReport.recommendations)
            setSseConnected(false)
            toast.success('Game over!', 'Demo — AI report generated', 4000)
            return
        }

        if (!serviceRef.current) return

        try {
            const response = await serviceRef.current.endSession()
            setPhase('ended')
            setEndReport(response)
            setStats(response.stats)
            setRecommendations(response.recommendations)
            if (response.mentalTimeline) {
                setMentalHistory(response.mentalTimeline)
            }
            toast.success('Game over!', 'AI report being generated', 4000)
        } catch (err: any) {
            // Fin locale en cas d'erreur réseau
            setPhase('ended')
            setRecommendations(generateLocalRecommendations())
            toast.warning('Offline report', 'Reconnect for full analysis')
        }
    }, [clearTimers, makeCount, missCount, mentalScore, fatigueIndex, sessionId, elapsedTime, quarter, mentalHistory, alerts])

    const reset = useCallback(() => {
        clearTimers()
        serviceRef.current?.destroy()
        serviceRef.current = new LiveCoachService(sessionId)
        setPhase('idle')
        setQuarter(1)
        setMakeCount(0)
        setMissCount(0)
        setAlerts([])
        setMentalHistory([INITIAL_MENTAL])
        setMentalScore(INITIAL_MENTAL)
        setFatigueIndex(0)
        setPostureScore(0.5)
        setConfidence(0)
        setStats(null)
        setRecommendations([])
        setElapsedTime(0)
        setError(null)
        setEndReport(null)
        setSseConnected(false)
        setDetections([])
        setFps(0)
    }, [sessionId, clearTimers])

    // ---- Local recommendations fallback ----
    const generateLocalRecommendations = (): string[] => {
        const recs: string[] = []
        const total = makeCount + missCount
        const pct = total > 0 ? Math.round((makeCount / total) * 100) : 0

        if (pct >= 50) recs.push(`Great shooting (${pct}%)! Work on consistency.`)
        else if (pct >= 35) recs.push(`Decent shooting (${pct}%). Add 50 mid-range shots.`)
        else if (total > 0) recs.push(`Shooting struggles (${pct}%). Focus on mechanics.`)

        if (mentalScore < 45) recs.push('Weak mental game — work on your pre-shot routine.')
        else if (mentalScore >= 75) recs.push('Excellent mental strength!')

        if (fatigueIndex > 50) recs.push(`High fatigue (${Math.round(fatigueIndex)}%) — add HIIT training.`)

        if (recs.length === 0) recs.push('Analyze the full video for a detailed AI report.')
        return recs
    }

    return {
        // State
        phase,
        quarter,
        mentalScore,
        fatigueIndex,
        postureScore,
        confidence,
        makeCount,
        missCount,
        shootingPct,
        alerts,
        stats,
        mentalHistory,
        recommendations,
        elapsedTime,
        error,
        endReport,
        sseConnected,
        detections,
        fps,
        // Actions
        start,
        sendFrame,
        recordShot,
        endQuarter,
        nextQuarter,
        end,
        reset,
    }
}
