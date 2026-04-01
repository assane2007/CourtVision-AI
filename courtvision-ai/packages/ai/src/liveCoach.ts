import type { Landmark } from './tracking';
import { LANDMARKS, calculateAngle, calculateSpeed, getShoulderPosture } from './tracking'

/**
 * Coach Live — Moteur d'analyse temps réel pour feedback instantané.
 *
 * Ce module analyse des frames individuelles (ou petits bursts de frames)
 * envoyées par l'app mobile pendant un match en direct.
 * Il maintient un état accumulé de la session pour produire des alertes
 * contextuelles et intelligentes au fil du temps.
 *
 * Architecture :
 *   Mobile (caméra) → capture frame toutes les 2-5s → API → LiveCoachEngine → alertes + vibration
 *
 * L'analyse est volontairement légère (<50ms par frame) pour garantir
 * un feedback quasi-instantané sur du hardware mobile.
 */

// ==========================================
// Types
// ==========================================

/** Configuration du Coach Live */
export interface LiveCoachConfig {
    /** Intervalle d'envoi de frame en secondes (défaut: 3s) */
    frameInterval: number
    /** Sensibilité des alertes: 'low' | 'medium' | 'high' */
    alertSensitivity: 'low' | 'medium' | 'high'
    /** Activer les alertes de fatigue */
    fatigueAlerts: boolean
    /** Activer les alertes de posture de tir */
    shotPostureAlerts: boolean
    /** Activer les alertes mentales */
    mentalAlerts: boolean
    /** Nombre max d'alertes par quart-temps */
    maxAlertsPerQuarter: number
}

/** Alerte envoyée au joueur */
export interface LiveAlert {
    id: string
    type: LiveAlertType
    severity: 'info' | 'warning' | 'critical'
    message: string
    emoji: string
    /** Doit-on faire vibrer le téléphone ? */
    vibrate: boolean
    /** Durée de vibration en ms */
    vibrationPattern: number[]
    timestamp: number
    /** Données additionnelles pour l'UI */
    data?: Record<string, any>
}

export type LiveAlertType =
    | 'fatigue'
    | 'posture'
    | 'shooting_cold'
    | 'shooting_hot'
    | 'mental_drop'
    | 'mental_recovery'
    | 'rhythm'
    | 'hydration'
    | 'defensive_intensity'
    | 'shot_selection'
    | 'momentum'
    | 'quarter_summary'

/** Résultat d'analyse d'une frame live */
export interface LiveFrameAnalysis {
    /** Score mental instantané (0-100, 100 = confiant) */
    mentalScore: number
    /** Index de fatigue instantané (0-100, 100 = très fatigué) */
    fatigueIndex: number
    /** Posture globale (0-1, 1 = excellente) */
    postureScore: number
    /** Vitesse estimée (unités normalisées) */
    speed: number
    /** Alertes générées pour cette frame */
    alerts: LiveAlert[]
    /** Stats cumulées de la session */
    cumulativeStats: LiveCumulativeStats
    /** Confiance de l'analyse (0-1) */
    confidence: number
}

/** Stats cumulées pendant la session live */
export interface LiveCumulativeStats {
    /** Durée totale de jeu en secondes */
    playTime: number
    /** Nombre de tirs détectés */
    shotsDetected: number
    /** Tirs réussis (tracking basé sur les inputs manuels + IA) */
    shotsMade: number
    /** Pourcentage de réussite */
    shootingPct: number
    /** Score mental moyen */
    avgMentalScore: number
    /** Score mental par quart-temps */
    mentalByQuarter: Record<number, number[]>
    /** Distance estimée parcourue (unités) */
    distanceCovered: number
    /** Nombre d'alertes envoyées */
    alertsSent: number
    /** Pic de performance (meilleur moment) */
    peakMoment: { quarter: number; timestamp: number; score: number } | null
    /** Creux de performance */
    lowMoment: { quarter: number; timestamp: number; score: number } | null
}

/** Données de landmarks simplifiées envoyées par le mobile */
export interface LiveLandmarks {
    /** 33 landmarks MediaPipe [{x, y, z, visibility}] */
    landmarks: Landmark[]
    /** Balle détectée ? */
    ballDetected: boolean
    ballPosition?: { x: number; y: number }
}

// ==========================================
// Moteur Coach Live
// ==========================================

const DEFAULT_CONFIG: LiveCoachConfig = {
    frameInterval: 3,
    alertSensitivity: 'medium',
    fatigueAlerts: true,
    shotPostureAlerts: true,
    mentalAlerts: true,
    maxAlertsPerQuarter: 15
}

/**
 * Moteur d'analyse en temps réel.
 * Maintient l'état accumulé de la session et produit des alertes contextuelles.
 *
 * Usage :
 *   const engine = new LiveCoachEngine()
 *   engine.startSession(config)
 *   // Pour chaque frame reçue :
 *   const result = engine.analyzeFrame(landmarks, quarter, manualShots)
 *   // En fin de quart :
 *   const summary = engine.endQuarter()
 *   // En fin de match :
 *   const report = engine.endSession()
 */
export class LiveCoachEngine {
    private config: LiveCoachConfig = DEFAULT_CONFIG
    private sessionActive: boolean = false
    private currentQuarter: number = 1
    private alertCounter: number = 0
    private quarterAlertCount: number = 0

    // Historique pour analyse de tendance
    private mentalHistory: number[] = []
    private speedHistory: number[] = []
    private postureHistory: number[] = []
    private previousLandmarks: Landmark[] | null = null
    private previousTimestamp: number = 0

    // Stats cumulées
    private stats: LiveCumulativeStats = this.createEmptyStats()

    // Cooldowns pour éviter le spam d'alertes
    private alertCooldowns: Map<LiveAlertType, number> = new Map()

    // Seuils dynamiques (s'ajustent au joueur)
    private baselineSpeed: number = 0
    private baselinePosture: number = 0
    private baselineSet: boolean = false
    private frameCount: number = 0

    // Détection automatique de tir
    private wasInShootingMotion: boolean = false
    private shootingCooldown: number = 0

    // Analyse de rythme
    private recentActions: { type: 'shot' | 'move' | 'idle'; timestamp: number }[] = []

    /**
     * Démarre une nouvelle session live.
     */
    startSession(config: Partial<LiveCoachConfig> = {}): void {
        this.config = { ...DEFAULT_CONFIG, ...config }
        this.sessionActive = true
        this.currentQuarter = 1
        this.alertCounter = 0
        this.quarterAlertCount = 0
        this.mentalHistory = []
        this.speedHistory = []
        this.postureHistory = []
        this.previousLandmarks = null
        this.previousTimestamp = 0
        this.stats = this.createEmptyStats()
        this.alertCooldowns.clear()
        this.baselineSpeed = 0
        this.baselinePosture = 0
        this.baselineSet = false
        this.frameCount = 0
        this.wasInShootingMotion = false
        this.shootingCooldown = 0
        this.recentActions = []
    }

    /**
     * Analyse une frame reçue de l'app mobile.
     * Retourne le résultat d'analyse instantané + alertes.
     */
    analyzeFrame(
        data: LiveLandmarks,
        quarter: number,
        timestamp: number,
        manualShotMade?: boolean,
        manualShotMissed?: boolean
    ): LiveFrameAnalysis {
        if (!this.sessionActive) {
            throw new Error('No active live session. Call startSession() first.')
        }

        this.currentQuarter = quarter
        this.frameCount++

        const landmarks = data.landmarks
        const hasLandmarks = landmarks && landmarks.length >= 33

        // 1. Calculer les métriques instantanées
        const postureScore = hasLandmarks ? getShoulderPosture(landmarks) : 0.5
        let speed = 0
        const deltaTime = timestamp - this.previousTimestamp

        if (hasLandmarks && this.previousLandmarks && deltaTime > 0) {
            speed = calculateSpeed(this.previousLandmarks, landmarks, deltaTime)
        }

        // 1.5. Détection automatique de mouvement de tir
        let autoShotDetected = false
        if (hasLandmarks && this.config.shotPostureAlerts) {
            const shotMotion = this.detectShootingMotion(landmarks, timestamp)
            if (shotMotion) {
                autoShotDetected = true
                // Note: on ne sait pas si le tir est réussi sans tracking de la balle.
                // On enregistre uniquement la tentative. L'issue (made/missed) reste manuelle.
                this.stats.shotsDetected++
                this.recentActions.push({ type: 'shot', timestamp })
            }
        }

        // 1.6. Analyse de rythme (idle/move classification)
        if (speed > 0.02) {
            this.recentActions.push({ type: 'move', timestamp })
        } else if (deltaTime > 2) {
            this.recentActions.push({ type: 'idle', timestamp })
        }
        // Garder les 60 dernières secondes d'actions
        const cutoff = timestamp - 60
        this.recentActions = this.recentActions.filter(a => a.timestamp > cutoff)

        // 2. Établir la baseline sur les premières frames
        if (!this.baselineSet && this.frameCount <= 10) {
            this.speedHistory.push(speed)
            this.postureHistory.push(postureScore)
            if (this.frameCount === 10) {
                this.baselineSpeed = avg(this.speedHistory)
                this.baselinePosture = avg(this.postureHistory)
                this.baselineSet = true
            }
        }

        // 3. Score mental temps réel
        const mentalScore = this.computeLiveMentalScore(postureScore, speed, quarter)
        this.mentalHistory.push(mentalScore)

        // 4. Index de fatigue temps réel
        const fatigueIndex = this.computeLiveFatigueIndex(speed)

        // 5. Accumuler les stats
        this.stats.playTime += deltaTime > 0 ? deltaTime : this.config.frameInterval
        this.stats.distanceCovered += speed * (deltaTime > 0 ? deltaTime : this.config.frameInterval)
        this.stats.avgMentalScore = avg(this.mentalHistory)

        if (!this.stats.mentalByQuarter[quarter]) {
            this.stats.mentalByQuarter[quarter] = []
        }
        this.stats.mentalByQuarter[quarter].push(mentalScore)

        // Tirs manuels (inputs du joueur via l'UI)
        if (manualShotMade) {
            this.stats.shotsMade++
            this.stats.shotsDetected++
        }
        if (manualShotMissed) {
            this.stats.shotsDetected++
        }
        this.stats.shootingPct = this.stats.shotsDetected > 0
            ? Math.round((this.stats.shotsMade / this.stats.shotsDetected) * 100)
            : 0

        // Peaks & lows
        if (!this.stats.peakMoment || mentalScore > this.stats.peakMoment.score) {
            this.stats.peakMoment = { quarter, timestamp, score: mentalScore }
        }
        if (!this.stats.lowMoment || mentalScore < this.stats.lowMoment.score) {
            this.stats.lowMoment = { quarter, timestamp, score: mentalScore }
        }

        // 6. Générer les alertes contextuelles
        const alerts = this.generateAlerts(mentalScore, fatigueIndex, postureScore, speed, quarter)

        // 7. Sauvegarder l'état pour la prochaine frame
        if (hasLandmarks) {
            this.previousLandmarks = landmarks
        }
        this.previousTimestamp = timestamp
        this.speedHistory.push(speed)
        this.postureHistory.push(postureScore)

        // Confiance : dépend de la qualité des landmarks
        const confidence = hasLandmarks
            ? Math.min(1, landmarks.reduce((sum, l) => sum + l.visibility, 0) / 33)
            : 0.3

        return {
            mentalScore: Math.round(mentalScore),
            fatigueIndex: Math.round(fatigueIndex),
            postureScore: Math.round(postureScore * 100) / 100,
            speed: Math.round(speed * 100) / 100,
            alerts,
            cumulativeStats: { ...this.stats },
            confidence: Math.round(confidence * 100) / 100
        }
    }

    /**
     * Termine un quart-temps et génère un résumé.
     */
    endQuarter(): LiveAlert {
        const quarterScores = this.stats.mentalByQuarter[this.currentQuarter] || []
        const avgMental = quarterScores.length > 0 ? avg(quarterScores) : 50
        const shootingStr = this.stats.shotsDetected > 0
            ? `${this.stats.shotsMade}/${this.stats.shotsDetected} (${this.stats.shootingPct}%)`
            : 'Aucun tir enregistré'

        const trendEmoji = avgMental >= 70 ? '📈' : avgMental >= 45 ? '➡️' : '📉'

        const summary: LiveAlert = {
            id: `alert_${++this.alertCounter}`,
            type: 'quarter_summary',
            severity: 'info',
            message: `Fin Q${this.currentQuarter} — Mental: ${Math.round(avgMental)}/100 ${trendEmoji} | Tirs: ${shootingStr} | Distance: ${Math.round(this.stats.distanceCovered)}m`,
            emoji: '📋',
            vibrate: true,
            vibrationPattern: [100, 50, 100],
            timestamp: Date.now(),
            data: {
                quarter: this.currentQuarter,
                avgMentalScore: Math.round(avgMental),
                shootingPct: this.stats.shootingPct,
                distanceCovered: Math.round(this.stats.distanceCovered)
            }
        }

        // Reset des compteurs du quart
        this.quarterAlertCount = 0

        return summary
    }

    /**
     * Termine la session et retourne le rapport final.
     */
    endSession(): {
        summary: LiveAlert
        stats: LiveCumulativeStats
        mentalTimeline: number[]
        recommendations: string[]
    } {
        this.sessionActive = false

        const recommendations = this.generateEndOfGameRecommendations()

        const summary: LiveAlert = {
            id: `alert_${++this.alertCounter}`,
            type: 'quarter_summary',
            severity: 'info',
            message: `Match terminé ! Mental moyen: ${Math.round(this.stats.avgMentalScore)}/100 | Tirs: ${this.stats.shotsMade}/${this.stats.shotsDetected} | Distance: ${Math.round(this.stats.distanceCovered)}m`,
            emoji: '🏁',
            vibrate: true,
            vibrationPattern: [200, 100, 200, 100, 200],
            timestamp: Date.now()
        }

        return {
            summary,
            stats: { ...this.stats },
            mentalTimeline: [...this.mentalHistory],
            recommendations
        }
    }

    /**
     * Retourne l'état courant de la session.
     */
    getSessionState(): { active: boolean; quarter: number; stats: LiveCumulativeStats } {
        return {
            active: this.sessionActive,
            quarter: this.currentQuarter,
            stats: { ...this.stats }
        }
    }

    // ==========================================
    // Méthodes privées
    // ==========================================

    private computeLiveMentalScore(posture: number, speed: number, _quarter: number): number {
        // Score mental basé sur la posture (principal indicateur en temps réel)
        // Inspiré de Furley & Schweizer (2014) et Carney et al. (2010)

        let score = 65 // Baseline neutre

        // Facteur posture (±20 points)
        if (this.baselineSet && this.baselinePosture > 0) {
            const postureRatio = posture / this.baselinePosture
            score += (postureRatio - 1) * 40 // Au-dessus de la baseline = boost
        } else {
            score += (posture - 0.5) * 30
        }

        // Facteur vitesse (±10 points) — un joueur qui ralentit perd confiance
        if (this.baselineSet && this.baselineSpeed > 0) {
            const speedRatio = speed / this.baselineSpeed
            score += (speedRatio - 1) * 20
        }

        // Facteur shooting (±15 points)
        if (this.stats.shotsDetected >= 3) {
            if (this.stats.shootingPct >= 50) score += 10
            else if (this.stats.shootingPct >= 35) score += 3
            else score -= 10
        }

        // Tendance récente (dernières 5 mesures)
        if (this.mentalHistory.length >= 5) {
            const recent = this.mentalHistory.slice(-5)
            const trend = recent[recent.length - 1] - recent[0]
            score += trend * 0.3 // Momentum positif ou négatif
        }

        return Math.max(10, Math.min(100, score))
    }

    private computeLiveFatigueIndex(currentSpeed: number): number {
        if (!this.baselineSet || this.baselineSpeed === 0) return 0

        // Comparer la vitesse actuelle à la baseline
        const recentSpeeds = this.speedHistory.slice(-10)
        const recentAvg = recentSpeeds.length > 0 ? avg(recentSpeeds) : currentSpeed

        const decline = ((this.baselineSpeed - recentAvg) / this.baselineSpeed) * 100
        return Math.max(0, Math.min(100, Math.round(decline * 2.5)))
    }

    private generateAlerts(
        mental: number,
        fatigue: number,
        posture: number,
        speed: number,
        quarter: number
    ): LiveAlert[] {
        const alerts: LiveAlert[] = []
        const now = Date.now()
        const sensitivity = this.config.alertSensitivity

        // Vérifier la limite d'alertes par quart
        if (this.quarterAlertCount >= this.config.maxAlertsPerQuarter) {
            return alerts
        }

        const cooldownMs = sensitivity === 'low' ? 60000 : sensitivity === 'medium' ? 30000 : 15000

        // === Alerte fatigue ===
        if (this.config.fatigueAlerts && fatigue > 60 && this.canSendAlert('fatigue', now, cooldownMs * 2)) {
            const severity = fatigue > 80 ? 'critical' : 'warning'
            alerts.push({
                id: `alert_${++this.alertCounter}`,
                type: 'fatigue',
                severity,
                message: fatigue > 80
                    ? '⚠️ Fatigue élevée détectée — demande un temps-mort ou hydrate-toi'
                    : 'Ta vitesse baisse — pense à gérer ton énergie',
                emoji: fatigue > 80 ? '🔴' : '🟡',
                vibrate: true,
                vibrationPattern: severity === 'critical' ? [300, 100, 300] : [200],
                timestamp: now,
                data: { fatigueIndex: fatigue, speedDecline: Math.round((1 - speed / Math.max(this.baselineSpeed, 0.01)) * 100) }
            })
        }

        // === Alerte posture / body language ===
        if (this.config.mentalAlerts && posture < 0.35 && this.canSendAlert('posture', now, cooldownMs)) {
            alerts.push({
                id: `alert_${++this.alertCounter}`,
                type: 'posture',
                severity: 'warning',
                message: 'Épaules tombantes détectées — redresse-toi, power pose ! 💪',
                emoji: '🧍',
                vibrate: true,
                vibrationPattern: [150, 50, 150],
                timestamp: now,
                data: { postureScore: posture }
            })
        }

        // === Alerte mental drop ===
        if (this.config.mentalAlerts && mental < 40 && this.canSendAlert('mental_drop', now, cooldownMs * 1.5)) {
            alerts.push({
                id: `alert_${++this.alertCounter}`,
                type: 'mental_drop',
                severity: 'critical',
                message: 'Mental Score en chute — respire, recentre-toi. Prochain possession = simple et efficace.',
                emoji: '🧠',
                vibrate: true,
                vibrationPattern: [400, 200, 400],
                timestamp: now,
                data: { mentalScore: mental }
            })
        }

        // === Alerte mental recovery ===
        if (this.config.mentalAlerts && this.mentalHistory.length >= 6) {
            const recentTrend = this.mentalHistory.slice(-6)
            const wasLow = recentTrend[0] < 45
            const isRecovering = recentTrend[recentTrend.length - 1] > 60
            if (wasLow && isRecovering && this.canSendAlert('mental_recovery', now, cooldownMs * 2)) {
                alerts.push({
                    id: `alert_${++this.alertCounter}`,
                    type: 'mental_recovery',
                    severity: 'info',
                    message: 'Belle remontée mentale ! Tu es de retour dans le match 🔥',
                    emoji: '🔥',
                    vibrate: true,
                    vibrationPattern: [100, 50, 100, 50, 100],
                    timestamp: now,
                    data: { mentalScore: mental, trend: 'up' }
                })
            }
        }

        // === Alerte shooting streak ===
        if (this.stats.shotsDetected >= 5) {
            if (this.stats.shootingPct >= 60 && this.canSendAlert('shooting_hot', now, cooldownMs * 3)) {
                alerts.push({
                    id: `alert_${++this.alertCounter}`,
                    type: 'shooting_hot',
                    severity: 'info',
                    message: `Tu es chaud ! ${this.stats.shotsMade}/${this.stats.shotsDetected} (${this.stats.shootingPct}%) — continue de shooter avec confiance`,
                    emoji: '🔥',
                    vibrate: true,
                    vibrationPattern: [100, 50, 100],
                    timestamp: now,
                    data: { shootingPct: this.stats.shootingPct }
                })
            }
            if (this.stats.shootingPct < 25 && this.canSendAlert('shooting_cold', now, cooldownMs * 3)) {
                alerts.push({
                    id: `alert_${++this.alertCounter}`,
                    type: 'shooting_cold',
                    severity: 'warning',
                    message: `${this.stats.shootingPct}% au tir — change de stratégie : drives, passes, ou cherche le layup`,
                    emoji: '🥶',
                    vibrate: true,
                    vibrationPattern: [200, 100, 200],
                    timestamp: now,
                    data: { shootingPct: this.stats.shootingPct }
                })
            }
        }

        // === Alerte hydratation (toutes les 12 min) ===
        if (this.stats.playTime > 0 && this.stats.playTime % 720 < this.config.frameInterval + 1 && this.canSendAlert('hydration', now, 600000)) {
            alerts.push({
                id: `alert_${++this.alertCounter}`,
                type: 'hydration',
                severity: 'info',
                message: 'Rappel : pense à t\'hydrater à la prochaine pause 💧',
                emoji: '💧',
                vibrate: true,
                vibrationPattern: [100],
                timestamp: now
            })
        }

        // === Alerte momentum (changement de quart-temps) ===
        if (quarter >= 2 && this.stats.mentalByQuarter[quarter - 1]) {
            const prevQuarterAvg = avg(this.stats.mentalByQuarter[quarter - 1])
            const currentFrames = this.stats.mentalByQuarter[quarter] || []
            if (currentFrames.length >= 3) {
                const currentAvg = avg(currentFrames)
                if (currentAvg - prevQuarterAvg > 15 && this.canSendAlert('momentum', now, cooldownMs * 4)) {
                    alerts.push({
                        id: `alert_${++this.alertCounter}`,
                        type: 'momentum',
                        severity: 'info',
                        message: `Tu es meilleur ce Q${quarter} que le précédent ! Le momentum est avec toi 🚀`,
                        emoji: '🚀',
                        vibrate: true,
                        vibrationPattern: [100, 50, 100, 50, 100],
                        timestamp: now,
                        data: { prevAvg: Math.round(prevQuarterAvg), currentAvg: Math.round(currentAvg) }
                    })
                }
            }
        }

        this.quarterAlertCount += alerts.length
        this.stats.alertsSent += alerts.length

        return alerts
    }

    private canSendAlert(type: LiveAlertType, now: number, cooldownMs: number): boolean {
        const lastSent = this.alertCooldowns.get(type) || 0
        if (now - lastSent < cooldownMs) return false
        this.alertCooldowns.set(type, now)
        return true
    }

    private generateEndOfGameRecommendations(): string[] {
        const recs: string[] = []

        // Analyse shooting
        if (this.stats.shotsDetected >= 3) {
            if (this.stats.shootingPct >= 50) {
                recs.push(`Excellent au tir (${this.stats.shootingPct}%) ! Travaille la constance sur les sessions suivantes.`)
            } else if (this.stats.shootingPct >= 35) {
                recs.push(`Shooting correct (${this.stats.shootingPct}%). Ajoute 50 tirs de mi-distance à ton prochain entraînement.`)
            } else {
                recs.push(`Shooting en difficulté (${this.stats.shootingPct}%). Concentre-toi sur la mécanique de base : pieds alignés, coude à 90°.`)
            }
        }

        // Analyse mentale
        if (this.stats.avgMentalScore < 45) {
            recs.push('Mental fragile aujourd\'hui. Travaille la routine pré-tir et la respiration entre les possessions.')
        } else if (this.stats.avgMentalScore >= 75) {
            recs.push('Excellente force mentale ! Ce type de performance vient avec la régularité.')
        }

        // Analyse fatigue
        const lastSpeeds = this.speedHistory.slice(-20)
        const firstSpeeds = this.speedHistory.slice(0, 20)
        if (firstSpeeds.length >= 5 && lastSpeeds.length >= 5) {
            const decline = ((avg(firstSpeeds) - avg(lastSpeeds)) / Math.max(avg(firstSpeeds), 0.01)) * 100
            if (decline > 30) {
                recs.push(`Baisse de vitesse de ${Math.round(decline)}% en fin de match. Ajoute du cardio (HIIT 20 min × 3/semaine).`)
            }
        }

        // Comparaison quarts
        const quarters = Object.entries(this.stats.mentalByQuarter)
        if (quarters.length >= 2) {
            const q1Avg = quarters[0] ? avg(quarters[0][1] as number[]) : 0
            const lastQAvg = quarters[quarters.length - 1] ? avg(quarters[quarters.length - 1][1] as number[]) : 0
            if (lastQAvg - q1Avg > 10) {
                recs.push('Tu finis mieux que tu ne commences — travaille ton échauffement pré-match.')
            } else if (q1Avg - lastQAvg > 15) {
                recs.push('Tu démarres fort mais finis moins bien. Gère mieux ton énergie sur la durée.')
            }
        }

        if (recs.length === 0) {
            recs.push('Continue comme ça ! Analyse la vidéo complète pour un rapport détaillé.')
        }

        return recs
    }

    /**
     * Détecte un mouvement de tir à partir des landmarks.
     * Utilise une machine à états simple :
     *   - Phase de préparation : poignet monte au-dessus de l'épaule
     *   - Phase de release : extension du coude > 130°
     *   - Cooldown : ignore les détections pendant 2s pour éviter les doublons
     */
    private detectShootingMotion(landmarks: Landmark[], timestamp: number): boolean {
        // Cooldown actif — ignorer
        if (timestamp - this.shootingCooldown < 2) return false

        const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER]
        const rightElbow = landmarks[LANDMARKS.RIGHT_ELBOW]
        const rightWrist = landmarks[LANDMARKS.RIGHT_WRIST]

        // Vérifier la visibilité minimale
        if (rightShoulder.visibility < 0.6 || rightElbow.visibility < 0.6 || rightWrist.visibility < 0.6) {
            return false
        }

        const elbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist)
        const wristAboveShoulder = rightWrist.y < rightShoulder.y

        const isInShootingMotion = wristAboveShoulder && elbowAngle > 130

        // Transition : pas en tir → en tir = détection
        if (isInShootingMotion && !this.wasInShootingMotion) {
            this.wasInShootingMotion = true
            this.shootingCooldown = timestamp
            return true
        }

        // Transition : en tir → pas en tir = reset
        if (!isInShootingMotion) {
            this.wasInShootingMotion = false
        }

        return false
    }

    /**
     * Calcule un score de rythme basé sur la variété des actions récentes (0-100).
     * Un joueur actif (mouvements + tirs) a un bon rythme.
     * Un joueur idle a un rythme faible.
     */
    getRhythmScore(): number {
        if (this.recentActions.length < 3) return 50 // pas assez de données

        const moves = this.recentActions.filter(a => a.type === 'move').length
        const shots = this.recentActions.filter(a => a.type === 'shot').length
        const idles = this.recentActions.filter(a => a.type === 'idle').length
        const total = this.recentActions.length

        // Ratio d'activité (move + shot vs idle)
        const activityRatio = (moves + shots) / total
        // Diversité (avoir des shots et des moves, pas juste l'un ou l'autre)
        const diversity = (shots > 0 && moves > 0) ? 1.2 : 1.0

        return Math.min(100, Math.round(activityRatio * diversity * 100))
    }

    private createEmptyStats(): LiveCumulativeStats {
        return {
            playTime: 0,
            shotsDetected: 0,
            shotsMade: 0,
            shootingPct: 0,
            avgMentalScore: 65,
            mentalByQuarter: {},
            distanceCovered: 0,
            alertsSent: 0,
            peakMoment: null,
            lowMoment: null
        }
    }
}

// ==========================================
// Utilitaires
// ==========================================

function avg(arr: number[]): number {
    if (arr.length === 0) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
}

/**
 * Analyse rapide de landmarks pour une frame unique (sans contexte de session).
 * Utilisé pour l'endpoint stateless de l'API.
 */
export function analyzeSingleFrame(landmarks: Landmark[]): {
    postureScore: number
    elbowAngle: number
    isShootingMotion: boolean
    headPosition: 'up' | 'neutral' | 'down'
} {
    if (landmarks.length < 33) {
        return { postureScore: 0.5, elbowAngle: 0, isShootingMotion: false, headPosition: 'neutral' }
    }

    const postureScore = getShoulderPosture(landmarks)

    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER]
    const rightElbow = landmarks[LANDMARKS.RIGHT_ELBOW]
    const rightWrist = landmarks[LANDMARKS.RIGHT_WRIST]
    const nose = landmarks[LANDMARKS.NOSE]

    const elbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist)

    // Détection de mouvement de tir : poignet au-dessus de l'épaule + extension du coude
    const isShootingMotion = rightWrist.y < rightShoulder.y && elbowAngle > 120

    // Position de la tête par rapport aux épaules
    const shoulderY = (landmarks[LANDMARKS.LEFT_SHOULDER].y + rightShoulder.y) / 2
    const headDiff = nose.y - shoulderY
    const headPosition: 'up' | 'neutral' | 'down' = headDiff < -0.1 ? 'up' : headDiff > 0.05 ? 'down' : 'neutral'

    return { postureScore, elbowAngle, isShootingMotion, headPosition }
}
