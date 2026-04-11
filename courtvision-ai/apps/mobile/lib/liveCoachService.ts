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
import { Platform } from 'react-native'
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
    private basePath: string // For fallback REST calls if needed
    private ws: WebSocket | null = null
    private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null
    private eventListeners: Set<(event: LiveSSEEvent) => void> = new Set()
    private isConnected = false
    private framePromises = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>()
    private frameCounter = 0

    constructor(sessionId: string) {
        this.sessionId = sessionId
        this.basePath = `/api/sessions/${sessionId}/live`
    }

    // ==========================================
    // Session Lifecycle
    // ==========================================

    async start(config?: LiveSessionConfig): Promise<LiveStartResponse> {
        // We still start the session via REST to initialize DB records, then connect WS
        const res = await apiFetch<LiveStartResponse>(this.basePath, {
            method: 'POST',
            body: JSON.stringify(config || {}),
        })
        this.connectWebSocket()
        return res
    }

    async sendFrame(payload: LiveFramePayload): Promise<LiveFrameResponse> {
        if (!this.isConnected || !this.ws) {
            // Fallback to HTTP if WS is dead or still connecting
            return apiFetch<LiveFrameResponse>(`${this.basePath}/frame`, {
                method: 'POST',
                body: JSON.stringify(payload),
            })
        }

        return new Promise((resolve, reject) => {
            const frameId = `f_${this.frameCounter++}`
            this.framePromises.set(frameId, { resolve, reject })

            // Timeout in case server doesn't ack the frame
            setTimeout(() => {
                if (this.framePromises.has(frameId)) {
                    this.framePromises.delete(frameId)
                    reject(new Error('WebSocket frame timeout'))
                }
            }, 5000)

            this.ws!.send(JSON.stringify({
                type: 'frame',
                frameId,
                payload
            }))
        })
    }

    async recordShot(outcome: ShotOutcome, zone?: ShotZone): Promise<LiveShotResponse> {
        return apiFetch<LiveShotResponse>(`${this.basePath}/shot`, {
            method: 'POST',
            body: JSON.stringify({ outcome, zone }),
        })
    }

    async endQuarter(quarter: number): Promise<LiveQuarterResponse> {
        return apiFetch<LiveQuarterResponse>(`${this.basePath}/quarter`, {
            method: 'POST',
            body: JSON.stringify({ quarter }),
        })
    }

    async endSession(): Promise<LiveEndResponse> {
        this.disconnectWebSocket()
        return apiFetch<LiveEndResponse>(`${this.basePath}/end`, {
            method: 'POST',
        })
    }

    async getStatus(): Promise<LiveStatusResponse> {
        return apiFetch<LiveStatusResponse>(`${this.basePath}/status`)
    }

    // ==========================================
    // WebSockets (Native)
    // ==========================================

    connectSSE(onEvent: (event: LiveSSEEvent) => void): void {
        this.eventListeners.add(onEvent)
        this.connectWebSocket() // Connect if not already done
    }

    private async connectWebSocket(): Promise<void> {
        if (this.ws) return // already connecting/connected

        const token = await getAuthToken()
        const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss://' : 'ws://'
        const domain = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '')
        // Route as defined in our sync audit fix: /ws/sessions/:id
        const wsUrl = `${wsProtocol}${domain}/ws/sessions/${this.sessionId}`

        if (token && Platform.OS !== 'web') {
            const WebSocketWithHeaders = WebSocket as unknown as {
                new (
                    url: string,
                    protocols?: string | string[],
                    options?: { headers?: Record<string, string> }
                ): WebSocket
            }
            this.ws = new WebSocketWithHeaders(wsUrl, undefined, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
        } else {
            this.ws = new WebSocket(wsUrl)
        }

        this.ws.onopen = () => {
            this.isConnected = true
            console.log('[LiveCoach WS] Connected')
            if (this.wsReconnectTimer) {
                clearTimeout(this.wsReconnectTimer)
                this.wsReconnectTimer = null
            }
        }

        this.ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data)

                // Match frame promises
                if (data.type === 'frame_ack' && data.frameId) {
                    const promise = this.framePromises.get(data.frameId)
                    if (promise) {
                        promise.resolve(data.response)
                        this.framePromises.delete(data.frameId)
                    }
                    return
                }

                // If it's a push event or alert from the SSE/WS stream
                if (data.type === 'alert' || data.type === 'status_update' || data.type === 'biomechanic_fault') {
                    for (const listener of this.eventListeners) {
                        listener(data)
                    }
                }
            } catch (err) {
                console.warn('[LiveCoach WS] Parse error:', err)
            }
        }

        this.ws.onerror = (e) => {
            console.warn('[LiveCoach WS] Error:', e)
            this.isConnected = false
        }

        this.ws.onclose = () => {
            console.log('[LiveCoach WS] Closed')
            this.isConnected = false
            this.ws = null
            this.scheduleReconnect()
        }
    }

    disconnectSSE(): void {
        this.disconnectWebSocket()
        this.eventListeners.clear()
    }

    private disconnectWebSocket(): void {
        if (this.ws) {
            this.ws.close()
            this.ws = null
        }
        this.isConnected = false
        if (this.wsReconnectTimer) {
            clearTimeout(this.wsReconnectTimer)
            this.wsReconnectTimer = null
        }
        // Reject pending frame promises
        for (const [id, promise] of this.framePromises.entries()) {
            promise.reject(new Error('WebSocket disconnected'))
        }
        this.framePromises.clear()
    }

    private scheduleReconnect(): void {
        if (this.wsReconnectTimer) return
        this.wsReconnectTimer = setTimeout(() => {
            this.wsReconnectTimer = null
            if (this.eventListeners.size > 0) {
                this.connectWebSocket()
            }
        }, 3000)
    }

    // ==========================================
    // Cleanup
    // ==========================================

    destroy(): void {
        this.disconnectWebSocket()
        this.eventListeners.clear()
    }
}
