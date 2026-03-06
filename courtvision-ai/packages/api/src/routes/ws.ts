import { FastifyInstance } from 'fastify'
import { z } from 'zod'

export default async function wsRoutes(fastify: FastifyInstance) {
    // ⚠️ We use fastify-websocket to handle ws connections 
    // WebSocket endpoint: /ws/sessions/:id
    fastify.get('/sessions/:id', { websocket: true }, (connectionParam: any, req: any) => {
        const socket = connectionParam.socket || connectionParam;
        const sessionId = req.params.id

        socket.on('message', (message: import('ws').RawData) => {
            // For now, we simulate receiving a TrackingFrame and returning analyzed data
            // In reality, this would pipe to the LiveCoachEngine as established in live.ts
            try {
                const data = JSON.parse(message.toString())
                // Basic validation
                if (data.type === 'frame') {
                    const payload = data.payload || {}
                    socket.send(JSON.stringify({
                        type: 'frame_ack',
                        frameId: data.frameId,
                        response: {
                            success: true,
                            mentalScore: Math.floor(60 + Math.random() * 40),
                            fatigueIndex: Math.floor(Math.random() * 20),
                            postureScore: 0.8,
                            confidence: 0.9,
                            alerts: [],
                            stats: null
                        }
                    }))

                    // Periodically send a random alert if playing around
                    if (Math.random() > 0.95) {
                        socket.send(JSON.stringify({
                            type: 'alert',
                            alerts: [{
                                id: `alert_${Date.now()}`,
                                type: 'form',
                                message: 'Keep your elbow tucked!',
                                severity: 'warning',
                                emoji: '💡',
                                vibrate: true,
                                vibrationPattern: [100, 200],
                                timestamp: Date.now()
                            }],
                            mentalScore: 65,
                            fatigueIndex: 12
                        }))
                    }
                }
            } catch (err) {
                // Ignore
            }
        })

        socket.on('close', () => {
            // Cleanup
        })

        // Initial handshake payload
        socket.send(JSON.stringify({
            sessionId,
            status: 'connected',
            timestamp: Date.now(),
            players: []
        }))
    })
}
