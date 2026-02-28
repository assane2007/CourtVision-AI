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
import { Vibration, AppState, AppStateStatus } from 'react-native'
import { LiveCoachService } from '../lib/liveCoachService'
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
                    { id: `d-${now}-1`, type: 'form' as any, message: 'Keep your elbow tucked on release', severity: 'info' as AlertSeverity, emoji: '💪', vibrate: false, vibrationPattern: [], timestamp: now },
                    { id: `d-${now}-2`, type: 'form' as any, message: 'Great follow-through on last shot!', severity: 'info' as AlertSeverity, emoji: '✅', vibrate: false, vibrationPattern: [], timestamp: now },
                    { id: `d-${now}-3`, type: 'fatigue' as any, message: 'Fatigue detected — slow your pace', severity: 'warning' as AlertSeverity, emoji: '⚠️', vibrate: true, vibrationPattern: [0, 200, 100, 200], timestamp: now },
                    { id: `d-${now}-4`, type: 'form' as any, message: 'Shot arc too flat — aim higher', severity: 'warning' as AlertSeverity, emoji: '📐', vibrate: false, vibrationPattern: [], timestamp: now },
                    { id: `d-${now}-5`, type: 'mental' as any, message: 'Excellent court vision!', severity: 'info' as AlertSeverity, emoji: '👁️', vibrate: false, vibrationPattern: [], timestamp: now },
                    { id: `d-${now}-6`, type: 'posture' as any, message: 'Balance shifting left — center up', severity: 'info' as AlertSeverity, emoji: '⚖️', vibrate: false, vibrationPattern: [], timestamp: now },
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
            const demoReport = {
                mentalScore,
                shootingPct: (makeCount + missCount) > 0 ? Math.round((makeCount / (makeCount + missCount)) * 100) : 0,
                makes: makeCount,
                attempts: makeCount + missCount,
                quarter,
                recommendations: generateLocalRecommendations(),
                stats: null,
                mentalTimeline: mentalHistory,
            } as any
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
    }, [clearTimers, makeCount, missCount, mentalScore, fatigueIndex])

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
