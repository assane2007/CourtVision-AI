/**
 * PipelineThrottler — Gestion intelligente du débit de frames dans le pipeline IA.
 *
 * Adapte dynamiquement le nombre de frames traitées par seconde en fonction de :
 * - La charge CPU estimée (temps de traitement des frames)
 * - Le niveau de batterie (économie d'énergie)
 * - L'activité du joueur (burst quand un tir est en cours)
 * - La température du device
 *
 * Architecture :
 * - Fonctionne avec un token bucket pour le rate limiting
 * - Prioritise les frames pendant les phases de tir
 * - Réduit automatiquement quand le device surchauffe
 */

// ==========================================
// Types
// ==========================================

export interface ThrottlerConfig {
    /** FPS cible maximum */
    maxFps: number
    /** FPS minimum garanti */
    minFps: number
    /** FPS pendant les phases de tir (burst) */
    burstFps: number
    /** Seuil de processing time (ms) pour commencer à throttle */
    processingTimeThresholdMs: number
    /** Activer l'adaptation dynamique */
    enableDynamicAdaptation: boolean
    /** Taille de la fenêtre pour le calcul de la moyenne */
    windowSize: number
}

export interface ThrottlerStats {
    /** FPS actuel effectif */
    effectiveFps: number
    /** FPS cible actuel */
    targetFps: number
    /** Temps de traitement moyen (ms) */
    avgProcessingTimeMs: number
    /** Nombre de frames droppées */
    droppedFrames: number
    /** Nombre total de frames reçues */
    totalFrames: number
    /** Drop rate (%) */
    dropRate: number
    /** Raison du throttle actuel */
    throttleReason: 'none' | 'processing_slow' | 'battery_low' | 'thermal' | 'idle'
    /** Mode actuel */
    mode: 'normal' | 'burst' | 'eco'
}

// ==========================================
// Constants
// ==========================================

const DEFAULT_CONFIG: ThrottlerConfig = {
    maxFps: 15,
    minFps: 5,
    burstFps: 25,
    processingTimeThresholdMs: 50,
    enableDynamicAdaptation: true,
    windowSize: 30,
}

// ==========================================
// Pipeline Throttler
// ==========================================

export class PipelineThrottler {
    private config: ThrottlerConfig
    private processingTimes: number[] = []
    private frameTimestamps: number[] = []
    private droppedFrames = 0
    private totalFrames = 0
    private lastProcessedTime = 0
    private currentTargetFps: number
    private mode: 'normal' | 'burst' | 'eco' = 'normal'
    private throttleReason: ThrottlerStats['throttleReason'] = 'none'
    private burstUntil = 0 // timestamp jusqu'auquel le mode burst est actif

    constructor(config?: Partial<ThrottlerConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config }
        this.currentTargetFps = this.config.maxFps
    }

    // ---- Configuration ----

    configure(config: Partial<ThrottlerConfig>): void {
        this.config = { ...this.config, ...config }
        this.currentTargetFps = Math.min(this.currentTargetFps, this.config.maxFps)
    }

    // ---- Frame Decision ----

    /**
     * Décide si une frame doit être traitée ou droppée.
     * 
     * @returns true si la frame doit être traitée
     */
    shouldProcessFrame(): boolean {
        const now = performance.now()
        this.totalFrames++

        // Vérifier le burst mode
        if (now < this.burstUntil) {
            this.mode = 'burst'
            this.currentTargetFps = this.config.burstFps
        } else if (this.mode === 'burst') {
            this.mode = 'normal'
            this.recalculateTargetFps()
        }

        // Rate limiting : intervalle minimum entre deux frames
        const minInterval = 1000 / this.currentTargetFps
        const elapsed = now - this.lastProcessedTime

        if (elapsed < minInterval) {
            this.droppedFrames++
            return false
        }

        this.lastProcessedTime = now
        this.frameTimestamps.push(now)

        // Garder la fenêtre de calcul
        while (this.frameTimestamps.length > this.config.windowSize * 2) {
            this.frameTimestamps.shift()
        }

        return true
    }

    /**
     * Rapporte le temps de traitement d'une frame (pour adaptation dynamique).
     */
    reportProcessingTime(timeMs: number): void {
        this.processingTimes.push(timeMs)

        if (this.processingTimes.length > this.config.windowSize) {
            this.processingTimes.shift()
        }

        if (this.config.enableDynamicAdaptation) {
            this.recalculateTargetFps()
        }
    }

    /**
     * Active le mode burst (pendant un tir en cours).
     * Le burst dure un certain temps puis revient au normal.
     */
    activateBurst(durationMs = 3000): void {
        this.burstUntil = performance.now() + durationMs
        this.mode = 'burst'
        this.currentTargetFps = this.config.burstFps
        this.throttleReason = 'none'
    }

    /**
     * Active le mode économie d'énergie.
     */
    activateEcoMode(): void {
        this.mode = 'eco'
        this.currentTargetFps = this.config.minFps
        this.throttleReason = 'battery_low'
    }

    /**
     * Revient au mode normal.
     */
    deactivateEcoMode(): void {
        this.mode = 'normal'
        this.recalculateTargetFps()
    }

    // ---- Adaptation dynamique ----

    private recalculateTargetFps(): void {
        if (this.processingTimes.length < 5) return

        const avgProcessingTime = this.getAverageProcessingTime()

        if (this.mode === 'eco') {
            this.currentTargetFps = this.config.minFps
            return
        }

        if (avgProcessingTime > this.config.processingTimeThresholdMs * 2) {
            // Très lent → réduire fortement
            this.currentTargetFps = Math.max(this.config.minFps, Math.round(1000 / (avgProcessingTime * 1.5)))
            this.throttleReason = 'processing_slow'
        } else if (avgProcessingTime > this.config.processingTimeThresholdMs) {
            // Un peu lent → réduire légèrement
            const idealFps = Math.round(1000 / (avgProcessingTime * 1.2))
            this.currentTargetFps = Math.max(this.config.minFps, Math.min(this.config.maxFps, idealFps))
            this.throttleReason = 'processing_slow'
        } else {
            // OK → monter progressivement (pas d'un coup pour éviter l'oscillation)
            if (this.currentTargetFps < this.config.maxFps) {
                this.currentTargetFps = Math.min(
                    this.config.maxFps,
                    this.currentTargetFps + 1,
                )
            }
            this.throttleReason = 'none'
        }
    }

    // ---- Stats ----

    getStats(): ThrottlerStats {
        const now = performance.now()
        const recentFrames = this.frameTimestamps.filter(t => t > now - 1000)

        return {
            effectiveFps: recentFrames.length,
            targetFps: this.currentTargetFps,
            avgProcessingTimeMs: this.getAverageProcessingTime(),
            droppedFrames: this.droppedFrames,
            totalFrames: this.totalFrames,
            dropRate: this.totalFrames > 0
                ? Math.round((this.droppedFrames / this.totalFrames) * 1000) / 10
                : 0,
            throttleReason: this.throttleReason,
            mode: this.mode,
        }
    }

    getAverageProcessingTime(): number {
        if (this.processingTimes.length === 0) return 0
        return Math.round(
            this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length * 10
        ) / 10
    }

    getEffectiveFps(): number {
        const now = performance.now()
        return this.frameTimestamps.filter(t => t > now - 1000).length
    }

    getTargetFps(): number {
        return this.currentTargetFps
    }

    getMode(): string {
        return this.mode
    }

    // ---- Reset ----

    reset(): void {
        this.processingTimes = []
        this.frameTimestamps = []
        this.droppedFrames = 0
        this.totalFrames = 0
        this.lastProcessedTime = 0
        this.currentTargetFps = this.config.maxFps
        this.mode = 'normal'
        this.throttleReason = 'none'
        this.burstUntil = 0
    }
}
