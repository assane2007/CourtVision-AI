/**
 * Service Coach Live — Client API typé pour toutes les opérations Coach Live.
 *
 * Encapsule les appels réseau vers l'API backend et fournit
 * un EventSource SSE pour les alertes push en temps réel.
 *
 * Usage :
 *   import { LiveCoachService } from '@/lib/liveCoachService'
 *   const service = new LiveCoachService(sessionId)
 *   await service.start({ alertSensitivity: 'medium' })
 *   const frame = await service.sendFrame({ timestamp: 120, quarter: 1 })
 *   const shot = await service.recordShot('made', 'midrange')
 *   service.connectSSE((event) => handleSSE(event))
 *   await service.endSession()
 */

import { apiFetch, API_BASE_URL, getAuthToken } from './api'
import type {
    LiveSessionConfig,
    LiveStartResponse,
    LiveFramePayload,
    LiveFrameResponse,
    LiveShotResponse,
    LiveQuarterResponse,
    LiveEndResponse,
    LiveStatusResponse,
    LiveSSEEvent,
    ShotOutcome,
    ShotZone,
} from '@courtvision/shared'

export class LiveCoachService {
    private sessionId: string
    private basePath: string
    private eventSource: EventSource | null = null
    private sseReconnectTimer: ReturnType<typeof setTimeout> | null = null
    private sseListeners: Set<(event: LiveSSEEvent) => void> = new Set()

    constructor(sessionId: string) {
        this.sessionId = sessionId
        this.basePath = `/api/sessions/${sessionId}/live`
    }

    // ==========================================
    // Session Lifecycle
    // ==========================================

    /**
     * Démarre une session Coach Live sur le serveur.
     */
    async start(config?: LiveSessionConfig): Promise<LiveStartResponse> {
        return apiFetch<LiveStartResponse>(this.basePath, {
            method: 'POST',
            body: JSON.stringify(config || {}),
        })
    }

    /**
     * Envoie une frame d'analyse (landmarks + metadata).
     */
    async sendFrame(payload: LiveFramePayload): Promise<LiveFrameResponse> {
        return apiFetch<LiveFrameResponse>(`${this.basePath}/frame`, {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    }

    /**
     * Enregistre un tir manuellement.
     */
    async recordShot(outcome: ShotOutcome, zone?: ShotZone): Promise<LiveShotResponse> {
        return apiFetch<LiveShotResponse>(`${this.basePath}/shot`, {
            method: 'POST',
            body: JSON.stringify({ outcome, zone }),
        })
    }

    /**
     * Termine un quart-temps et reçoit le résumé.
     */
    async endQuarter(quarter: number): Promise<LiveQuarterResponse> {
        return apiFetch<LiveQuarterResponse>(`${this.basePath}/quarter`, {
            method: 'POST',
            body: JSON.stringify({ quarter }),
        })
    }

    /**
     * Termine la session et reçoit le rapport final.
     */
    async endSession(): Promise<LiveEndResponse> {
        this.disconnectSSE()
        return apiFetch<LiveEndResponse>(`${this.basePath}/end`, {
            method: 'POST',
        })
    }

    /**
     * Récupère le status courant de la session.
     */
    async getStatus(): Promise<LiveStatusResponse> {
        return apiFetch<LiveStatusResponse>(`${this.basePath}/status`)
    }

    // ==========================================
    // Server-Sent Events (SSE)
    // ==========================================

    /**
     * Se connecte au flux SSE pour recevoir les alertes en push.
     * Le callback est appelé pour chaque événement reçu.
     * Gère automatiquement la reconnection.
     */
    connectSSE(onEvent: (event: LiveSSEEvent) => void): void {
        this.sseListeners.add(onEvent)

        if (this.eventSource) return // déjà connecté

        // getAuthToken() est async — on résout le token avant de construire l'URL
        getAuthToken().then(token => {
            const url = `${API_BASE_URL}${this.basePath}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`
            this.startSSEPolyfill(url).catch(error => {
                console.warn('[LiveCoach SSE] Connection error:', error)
                this.scheduleSSEReconnect()
            })
        }).catch(() => {
            // Pas de token — tenter quand même sans auth
            const url = `${API_BASE_URL}${this.basePath}/stream`
            this.startSSEPolyfill(url).catch(() => this.scheduleSSEReconnect())
        })
    }

    /**
     * Déconnecte le flux SSE.
     */
    disconnectSSE(): void {
        if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
        }
        if (this.sseReconnectTimer) {
            clearTimeout(this.sseReconnectTimer)
            this.sseReconnectTimer = null
        }
        this.sseListeners.clear()
    }

    /**
     * Polyfill SSE pour React Native basé sur fetch + streaming.
     * React Native n'a pas d'EventSource natif, on simule avec un fetch long-polling.
     */
    private async startSSEPolyfill(url: string): Promise<void> {
        const token = await getAuthToken()
        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
            })

            if (!response.ok) {
                console.warn(`[LiveCoach SSE] HTTP ${response.status}`)
                this.scheduleSSEReconnect()
                return
            }

            const reader = response.body?.getReader()
            if (!reader) {
                console.warn('[LiveCoach SSE] No reader available, falling back to polling')
                return
            }

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                // Parser les messages SSE
                const lines = buffer.split('\n')
                buffer = lines.pop() || '' // garder le dernier fragment incomplet

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6)) as LiveSSEEvent
                            for (const listener of this.sseListeners) {
                                listener(data)
                            }
                        } catch {
                            // Ignorer les messages mal formés
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('[LiveCoach SSE] Stream error:', error)
            this.scheduleSSEReconnect()
        }
    }

    private scheduleSSEReconnect(): void {
        if (this.sseReconnectTimer) return
        this.sseReconnectTimer = setTimeout(() => {
            this.sseReconnectTimer = null
            if (this.sseListeners.size > 0) {
                getAuthToken().then(token => {
                    const url = `${API_BASE_URL}${this.basePath}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`
                    this.startSSEPolyfill(url)
                }).catch(() => {
                    this.startSSEPolyfill(`${API_BASE_URL}${this.basePath}/stream`)
                })
            }
        }, 5000)
    }

    // ==========================================
    // Cleanup
    // ==========================================

    destroy(): void {
        this.disconnectSSE()
    }
}
