/**
 * Ball Tracker — Détection et tracking de balle + panier pour make/miss
 *
 * Ce module fournit le tracking intelligent du ballon de basket et
 * la détection du résultat du tir (make/miss/blocked).
 *
 * Architecture :
 * 1. Détection du ballon par couleur + forme (heuristique rapide)
 * 2. Tracking par Kalman Filter (prédiction de trajectoire parabolique)
 * 3. Détection du panier par homographie du terrain
 * 4. Résolution make/miss par analyse de la trajectoire
 *
 * Approches de détection make/miss :
 *
 * A) Trajectory-Based (primaire) :
 *    - Le ballon suit une parabole descendante
 *    - Si la trajectoire passe dans la "zone du panier" et le ballon disparaît
 *      ou change de direction rapidement → MAKE
 *    - Si le ballon rebondit (changement brusque de direction) → MISS
 *
 * B) Audio-Assisted (secondaire, optionnel) :
 *    - Détection du son du filet ("swish") par analyse spectrale
 *    - Détection du son du rebond sur l'arceau (fréquence plus basse)
 *    - Utilisé comme confirmateur, pas comme détecteur primaire
 *
 * C) User-Assisted (fallback) :
 *    - L'utilisateur confirme make/miss via un tap rapide
 *    - Utilisé quand la confiance automatique est < 60%
 *
 * Références :
 * - Kalman Filter for ball tracking: Welch & Bishop (2006)
 * - Parabolic trajectory fitting: physics-based (projectile motion)
 * - Basketball rim detection: Hough circles + color segmentation
 */

// ==========================================
// Types
// ==========================================

/** Position d'un ballon détecté */
export interface BallPosition {
    x: number           // Position X normalisée (0-1)
    y: number           // Position Y normalisée (0-1)
    radius: number      // Rayon estimé en pixels
    confidence: number  // Score de confiance (0-1)
    timestamp: number   // Timestamp en secondes
    frameIndex: number
}

/** État du Kalman Filter pour le tracking */
export interface KalmanState {
    x: number       // Position X
    y: number       // Position Y
    vx: number      // Vitesse X
    vy: number      // Vitesse Y
    ax: number      // Accélération X (toujours ~0 pour une balle)
    ay: number      // Accélération Y (~9.8 m/s² : gravité)
}

/** Position du panier détecté */
export interface RimPosition {
    x: number       // Centre X normalisé
    y: number       // Centre Y normalisé
    width: number   // Largeur en pixels
    confidence: number
    isVisible: boolean
}

/** Résultat de l'analyse de trajectoire du ballon */
export interface TrajectoryAnalysis {
    /** Le ballon suit une parabole cohérente */
    isParabolic: boolean
    /** Le ballon entre dans la zone du panier */
    entersRimZone: boolean
    /** Le ballon "disparaît" (entre dans le filet) */
    ballDisappears: boolean
    /** Le ballon rebondit (changement brusque de direction) */
    ballBounces: boolean
    /** Angle d'entrée estimé (° par rapport à l'horizontale) */
    entryAngle: number
    /** Point d'apex de la trajectoire */
    apex: { x: number; y: number } | null
    /** Vitesse au moment de l'entrée dans la rim zone */
    entrySpeed: number
}

/** Résultat de la résolution make/miss */
export interface ShotOutcomeResult {
    outcome: 'made' | 'missed' | 'blocked' | 'unknown'
    confidence: number
    method: 'trajectory' | 'audio' | 'user' | 'heuristic'
    details: string
    trajectoryAnalysis: TrajectoryAnalysis | null
}

/** Configuration du ball tracker */
export interface BallTrackerConfig {
    /** FPS de capture */
    fps: number
    /** Taille minimum du ballon en pixels (pour filtrer les faux positifs) */
    minBallRadiusPx: number
    /** Nombre de frames à analyser après le release */
    postReleaseFrames: number
    /** Seuil de confiance minimum pour la détection */
    minDetectionConfidence: number
    /** Activer la détection audio */
    enableAudioDetection: boolean
    /** Tolérance pour la zone du panier (en pixels) */
    rimZoneTolerance: number
}

// ==========================================
// Constantes
// ==========================================

export const DEFAULT_BALL_TRACKER_CONFIG: BallTrackerConfig = {
    fps: 30,
    minBallRadiusPx: 8,
    postReleaseFrames: 45,     // 1.5 secondes après le release
    minDetectionConfidence: 0.4,
    enableAudioDetection: false,
    rimZoneTolerance: 30,
}

/**
 * Paramètres physiques du basket
 * Source: FIBA regulations + NBA court specifications
 */
const BASKETBALL_PHYSICS = {
    /** Diamètre du ballon en mètres (size 7) */
    BALL_DIAMETER_M: 0.24,
    /** Diamètre intérieur de l'arceau en mètres */
    RIM_DIAMETER_M: 0.46,
    /** Hauteur du panier en mètres */
    RIM_HEIGHT_M: 3.05,
    /** Accélération gravitationnelle (m/s²) */
    GRAVITY: 9.81,
    /** Angle d'entrée optimal pour un swish (°) — recherche montre ~45° */
    OPTIMAL_ENTRY_ANGLE: 45,
    /** Angle d'entrée minimum pour qu'un tir rentre (~32°) */
    MIN_ENTRY_ANGLE: 32,
}

// ==========================================
// Kalman Filter pour le tracking de balle
//
// Le Kalman Filter prédit la position future du ballon
// en se basant sur le modèle physique de la trajectoire parabolique.
// Cela permet de :
// 1. Lisser les détections bruitées
// 2. Prédire la position quand le ballon est temporairement occulté
// 3. Valider la trajectoire (devrait être parabolique)
// ==========================================

export class BallKalmanFilter {
    private state: KalmanState
    private initialized: boolean = false
    private processNoise: number
    private measurementNoise: number

    constructor(processNoise = 0.1, measurementNoise = 0.5) {
        this.state = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0 }
        this.processNoise = processNoise
        this.measurementNoise = measurementNoise
    }

    /**
     * Initialise le filtre avec la première observation.
     */
    init(x: number, y: number): void {
        this.state = { x, y, vx: 0, vy: 0, ax: 0, ay: 0.005 }  // gravité normalisée
        this.initialized = true
    }

    /**
     * Étape de prédiction : avance l'état d'un pas de temps.
     */
    predict(dt: number): KalmanState {
        if (!this.initialized) return this.state

        // Modèle physique : position = p + v*dt + 0.5*a*dt²
        this.state.x += this.state.vx * dt + 0.5 * this.state.ax * dt * dt
        this.state.y += this.state.vy * dt + 0.5 * this.state.ay * dt * dt
        this.state.vx += this.state.ax * dt
        this.state.vy += this.state.ay * dt

        return { ...this.state }
    }

    /**
     * Étape de mise à jour : corrige l'état avec une observation.
     */
    update(measuredX: number, measuredY: number): KalmanState {
        if (!this.initialized) {
            this.init(measuredX, measuredY)
            return { ...this.state }
        }

        // Kalman gain simplifié (scalar version)
        const K = this.processNoise / (this.processNoise + this.measurementNoise)

        // Innovation (erreur de prédiction)
        const dx = measuredX - this.state.x
        const dy = measuredY - this.state.y

        // Mise à jour de l'état
        this.state.x += K * dx
        this.state.y += K * dy
        this.state.vx += K * dx * 0.5  // Ajuster la vitesse aussi
        this.state.vy += K * dy * 0.5

        return { ...this.state }
    }

    /**
     * Retourne la position prédite N frames dans le futur.
     */
    predictFuture(frames: number, fps: number): { x: number; y: number }[] {
        const predictions: { x: number; y: number }[] = []
        const dt = 1 / fps
        const tempState = { ...this.state }

        for (let i = 0; i < frames; i++) {
            tempState.x += tempState.vx * dt + 0.5 * tempState.ax * dt * dt
            tempState.y += tempState.vy * dt + 0.5 * tempState.ay * dt * dt
            tempState.vx += tempState.ax * dt
            tempState.vy += tempState.ay * dt
            predictions.push({ x: tempState.x, y: tempState.y })
        }

        return predictions
    }

    getState(): KalmanState {
        return { ...this.state }
    }

    isInitialized(): boolean {
        return this.initialized
    }

    reset(): void {
        this.state = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0 }
        this.initialized = false
    }
}

// ==========================================
// Ball Tracker Engine
// ==========================================

export class BallTrackerEngine {
    private config: BallTrackerConfig
    private kalman: BallKalmanFilter
    private positionHistory: BallPosition[] = []
    private rimPosition: RimPosition | null = null

    constructor(config: Partial<BallTrackerConfig> = {}) {
        this.config = { ...DEFAULT_BALL_TRACKER_CONFIG, ...config }
        this.kalman = new BallKalmanFilter()
    }

    /**
     * Enregistre une détection de balle.
     * Le Kalman Filter lisse et prédit la trajectoire.
     */
    trackBall(detection: BallPosition): KalmanState {
        this.positionHistory.push(detection)

        // Limiter l'historique
        if (this.positionHistory.length > 300) {
            this.positionHistory.shift()
        }

        const dt = 1 / this.config.fps
        this.kalman.predict(dt)
        return this.kalman.update(detection.x, detection.y)
    }

    /**
     * Quand le ballon n'est pas détecté, on utilise la prédiction.
     */
    predictPosition(): KalmanState | null {
        if (!this.kalman.isInitialized()) return null
        const dt = 1 / this.config.fps
        return this.kalman.predict(dt)
    }

    /**
     * Définit la position du panier (détecté une fois au début).
     */
    setRimPosition(rim: RimPosition): void {
        this.rimPosition = rim
    }

    /**
     * Analyse la trajectoire après un release pour déterminer le résultat.
     *
     * @param releaseTimestamp - Timestamp du moment du release
     * @returns Résultat make/miss avec confiance
     */
    analyzeTrajectory(releaseTimestamp: number): ShotOutcomeResult {
        // Filtrer les positions après le release
        const postRelease = this.positionHistory.filter(p => p.timestamp >= releaseTimestamp)

        if (postRelease.length < 5) {
            return {
                outcome: 'unknown',
                confidence: 0,
                method: 'heuristic',
                details: 'Pas assez de frames après le release pour analyser la trajectoire.',
                trajectoryAnalysis: null,
            }
        }

        // Analyser la trajectoire
        const trajectory = this.analyzeTrajectoryPoints(postRelease)

        // Résolution basée sur la trajectoire
        return this.resolveOutcome(trajectory, postRelease)
    }

    /**
     * Retourne la trajectoire prédite du ballon (pour l'overlay AR).
     */
    getPredictedTrajectory(frames: number): { x: number; y: number }[] {
        return this.kalman.predictFuture(frames, this.config.fps)
    }

    /**
     * Réinitialise le tracker (nouveau tir).
     */
    reset(): void {
        this.positionHistory = []
        this.kalman.reset()
    }

    // ==========================================
    // Private Methods
    // ==========================================

    private analyzeTrajectoryPoints(points: BallPosition[]): TrajectoryAnalysis {
        // 1. Vérifier si la trajectoire est parabolique
        const isParabolic = this.checkParabolicTrajectory(points)

        // 2. Trouver l'apex
        const apex = this.findApex(points)

        // 3. Vérifier si le ballon entre dans la zone du panier
        const entersRimZone = this.checkRimZoneEntry(points)

        // 4. Vérifier si le ballon "disparaît" (entre dans le filet)
        const ballDisappears = this.checkBallDisappearance(points)

        // 5. Vérifier le rebond
        const ballBounces = this.checkBounce(points)

        // 6. Calculer l'angle d'entrée
        const entryAngle = this.computeEntryAngle(points)

        // 7. Vitesse à l'entrée
        const entrySpeed = this.computeEntrySpeed(points)

        return {
            isParabolic,
            entersRimZone,
            ballDisappears,
            ballBounces,
            entryAngle,
            apex,
            entrySpeed,
        }
    }

    private resolveOutcome(trajectory: TrajectoryAnalysis, points: BallPosition[]): ShotOutcomeResult {
        let outcome: ShotOutcomeResult['outcome'] = 'unknown'
        let confidence = 0
        let details = ''

        // Critère 1: Make (haute confiance)
        // Trajectoire parabolique + entre dans rim zone + ballon disparaît
        if (trajectory.isParabolic && trajectory.entersRimZone && trajectory.ballDisappears) {
            outcome = 'made'
            confidence = 0.85
            details = `Trajectoire parabolique confirmée. Le ballon entre dans la zone du panier et disparaît (filet). Angle d'entrée: ${trajectory.entryAngle.toFixed(1)}°.`
        }
        // Critère 2: Make (confiance moyenne)
        // Entre dans rim zone + angle d'entrée suffisant
        else if (trajectory.entersRimZone && trajectory.entryAngle >= BASKETBALL_PHYSICS.MIN_ENTRY_ANGLE) {
            outcome = 'made'
            confidence = 0.60
            details = `Le ballon entre dans la zone du panier avec un angle de ${trajectory.entryAngle.toFixed(1)}°. Confiance modérée.`
        }
        // Critère 3: Miss
        // Rebond détecté
        else if (trajectory.ballBounces && !trajectory.ballDisappears) {
            outcome = 'missed'
            confidence = 0.75
            details = `Rebond détecté — le ballon change brusquement de direction après l'apex.`
        }
        // Critère 4: Blocked
        // La trajectoire parabolique est interrompue très tôt
        else if (!trajectory.isParabolic && points.length >= 5) {
            const earlyDirectionChange = this.checkEarlyDirectionChange(points)
            if (earlyDirectionChange) {
                outcome = 'blocked'
                confidence = 0.55
                details = `La trajectoire est interrompue rapidement après le release — possible contre.`
            }
        }
        // Critère 5: Miss par défaut
        else if (trajectory.isParabolic && !trajectory.entersRimZone) {
            outcome = 'missed'
            confidence = 0.50
            details = `Trajectoire parabolique mais le ballon ne passe pas dans la zone du panier.`
        }

        return {
            outcome,
            confidence,
            method: 'trajectory',
            details,
            trajectoryAnalysis: trajectory,
        }
    }

    private checkParabolicTrajectory(points: BallPosition[]): boolean {
        if (points.length < 5) return false

        // Fit quadratique y = at² + bt + c
        // Si le R² est élevé, c'est parabolique
        const n = points.length
        const t0 = points[0].timestamp
        const ts = points.map(p => p.timestamp - t0)
        const ys = points.map(p => p.y)

        // Calcul simplifié du R²
        const meanY = ys.reduce((a, b) => a + b, 0) / n
        const ssTotal = ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0)

        // Régression quadratique par moindres carrés (forme simplifiée)
        // On vérifie juste si la tendance est cohérente : monte puis descend
        let rising = 0
        let falling = 0
        let peakReached = false

        for (let i = 1; i < n; i++) {
            if (ys[i] < ys[i - 1]) {  // y diminue = monte (car y=0 est en haut)
                if (peakReached) return false  // Monte après avoir descendu → pas parabolique
                rising++
            } else {
                peakReached = true
                falling++
            }
        }

        // Une parabole a une phase montante puis descendante
        return rising >= 2 && falling >= 2
    }

    private findApex(points: BallPosition[]): { x: number; y: number } | null {
        if (points.length < 3) return null

        let apexIdx = 0
        let minY = points[0].y  // y=0 est en haut

        for (let i = 1; i < points.length; i++) {
            if (points[i].y < minY) {
                minY = points[i].y
                apexIdx = i
            }
        }

        return { x: points[apexIdx].x, y: points[apexIdx].y }
    }

    private checkRimZoneEntry(points: BallPosition[]): boolean {
        if (!this.rimPosition) {
            // Sans position du panier, on utilise une heuristique :
            // Le ballon est dans le quart supérieur de l'image, centré horizontalement
            return points.some(p => p.y < 0.35 && p.x > 0.25 && p.x < 0.75)
        }

        const tolerance = this.config.rimZoneTolerance / 640  // Normalisé
        return points.some(p =>
            Math.abs(p.x - this.rimPosition!.x) < tolerance &&
            Math.abs(p.y - this.rimPosition!.y) < tolerance * 1.5
        )
    }

    private checkBallDisappearance(points: BallPosition[]): boolean {
        // Le ballon "disparaît" s'il y a des gaps dans la détection
        // après avoir été dans la rim zone
        let inRimZone = false
        let consecutiveMissing = 0

        for (let i = 1; i < points.length; i++) {
            const timeDiff = points[i].timestamp - points[i - 1].timestamp
            const expectedDt = 1 / this.config.fps

            if (this.rimPosition) {
                const tolerance = this.config.rimZoneTolerance / 640
                if (Math.abs(points[i].x - this.rimPosition.x) < tolerance) {
                    inRimZone = true
                }
            } else {
                // Heuristique : quart supérieur
                if (points[i].y < 0.3) inRimZone = true
            }

            if (inRimZone && timeDiff > expectedDt * 2.5) {
                consecutiveMissing++
            }
        }

        return inRimZone && consecutiveMissing >= 2
    }

    private checkBounce(points: BallPosition[]): boolean {
        if (points.length < 5) return false

        // Un rebond = changement brusque de direction verticale
        for (let i = 2; i < points.length - 1; i++) {
            const vyBefore = points[i].y - points[i - 2].y
            const vyAfter = points[i + 1].y - points[i].y

            // Changement de signe avec magnitude significative
            if (vyBefore * vyAfter < 0 && Math.abs(vyBefore) > 0.02 && Math.abs(vyAfter) > 0.02) {
                return true
            }
        }

        return false
    }

    private computeEntryAngle(points: BallPosition[]): number {
        // L'angle d'entrée est calculé à partir des derniers points avant la rim zone
        if (points.length < 3) return 0

        // Prendre les 3-5 derniers points descendants
        const descendingPoints = []
        for (let i = points.length - 1; i >= Math.max(0, points.length - 5); i--) {
            if (i > 0 && points[i].y > points[i - 1].y) {
                descendingPoints.unshift(points[i])
            }
        }

        if (descendingPoints.length < 2) return 0

        // Vecteur de direction des derniers points
        const last = descendingPoints[descendingPoints.length - 1]
        const prev = descendingPoints[0]
        const dx = last.x - prev.x
        const dy = last.y - prev.y

        // Angle par rapport à l'horizontale (en degrés)
        const angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI))
        return Math.round(angle * 10) / 10
    }

    private computeEntrySpeed(points: BallPosition[]): number {
        if (points.length < 2) return 0

        const last = points[points.length - 1]
        const prev = points[points.length - 2]
        const dt = last.timestamp - prev.timestamp
        if (dt === 0) return 0

        const dx = last.x - prev.x
        const dy = last.y - prev.y
        return Math.sqrt(dx * dx + dy * dy) / dt
    }

    private checkEarlyDirectionChange(points: BallPosition[]): boolean {
        if (points.length < 3) return false

        // Le ballon change de direction dans les premières 5 frames
        for (let i = 1; i < Math.min(5, points.length - 1); i++) {
            const vy1 = points[i].y - points[i - 1].y
            const vy2 = points[i + 1].y - points[i].y

            if (vy1 < 0 && vy2 > 0) {
                // Montait puis descend → direction inversée trop tôt
                return true
            }
        }

        return false
    }
}
