import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { RealtimePipelineEngine } from '@courtvision/ai'

export default async function wsRoutes(fastify: FastifyInstance) {
    // Pipeline instances indexed by sessionId
    const pipelines = new Map<string, RealtimePipelineEngine>();

    // WebSocket endpoint: /ws/sessions/:id
    fastify.get('/sessions/:id', { websocket: true }, (connectionParam: any, req: any) => {
        const socket = connectionParam.socket || connectionParam;
        const sessionId = req.params.id

        // Initialize high-performance pipeline for this session
        const pipeline = new RealtimePipelineEngine({
            mode: 'full',
            onEvent: (event: any) => {
                // Forward events to mobile in real-time
                socket.send(JSON.stringify(event));
            }
        } as any);
        pipelines.set(sessionId, pipeline);

        socket.on('message', async (message: import('ws').RawData) => {
            try {
                const data = JSON.parse(message.toString())

                if (data.type === 'frame') {
                    // Process frame through the real AI motor
                    // Arguments: (frameData, frameIndex, timestamp, frameWidth, frameHeight)
                    const result = await (pipeline as any).processFrame(
                        data.payload.frameData,
                        data.payload.frameIndex || 0,
                        data.payload.timestamp || Date.now() / 1000,
                        data.payload.width || 640,
                        data.payload.height || 480
                    );

                    // Send sync response for UI rendering
                    socket.send(JSON.stringify({
                        type: 'frame_ack',
                        frameId: data.frameId,
                        response: {
                            success: true,
                            mentalScore: result.mentalScore,
                            fatigueIndex: result.fatigueIndex,
                            postureScore: result.postureScore,
                            confidence: result.confidence,
                            alerts: (result as any).alerts || [],
                            stats: (result as any).getStats ? (result as any).getStats() : null
                        }
                    }))
                }
            } catch (err) {
                console.error(`[WS] Error on session ${sessionId}:`, err);
            }
        })

        socket.on('close', () => {
            pipeline.stop();
            pipelines.delete(sessionId);
            console.info(`[WS] Session ${sessionId} cleaned up.`);
        })

        // Initial handshake payload
        socket.send(JSON.stringify({
            sessionId,
            status: 'connected',
            timestamp: Date.now()
        }))
    })
}
