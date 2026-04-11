import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { CoachChatEngine } from '@courtvision/ai'

const voiceCommandSchema = z.object({
    type: z.literal('voice_command'),
    text: z.string().trim().min(1).max(500),
    context: z.enum([
        'general',
        'session_review',
        'training',
        'pre_game',
        'film_room',
        'technique',
    ]).optional(),
})

const VOICE_COMMAND_WINDOW_MS = 60_000
const VOICE_COMMAND_MAX_PER_WINDOW = 30

/**
 * 🎙️ Voice Coach WebSocket Routes
 * 
 * This enables hands-free, real-time coaching via audio.
 * The mobile app streams PCM audio chunks, we process them (STT),
 * query the CoachEngine, and return text (and later TTS audio).
 */
export default async function voiceCoachRoutes(fastify: FastifyInstance) {
    // WebSocket endpoint: /ws/coach
    // Usage: const ws = new WebSocket('ws://localhost:8080/ws/coach')
    fastify.get('/coach', { websocket: true, preValidation: [fastify.authenticate] }, (connection: any, req: any) => {
        const socket = connection.socket || connection;
        const user = req.user;
        const displayName = String(user.username || user.email?.split('@')[0] || 'Player')

        let commandWindowStartedAt = Date.now()
        let commandCountInWindow = 0

        const isCommandRateLimited = () => {
            const now = Date.now()
            if (now - commandWindowStartedAt > VOICE_COMMAND_WINDOW_MS) {
                commandWindowStartedAt = now
                commandCountInWindow = 0
            }

            commandCountInWindow += 1
            return commandCountInWindow > VOICE_COMMAND_MAX_PER_WINDOW
        }

        fastify.log.info({ userId: user.id }, '[VoiceCoach] User connected via voice')

        socket.on('message', async (message: any, isBinary: boolean) => {
            if (isBinary) {
                // Incoming audio chunks (PCM/WAV)
                // For MVP, we would pipe this to a speech-to-text service like Whisper
                // For now, we simulate detection and trigger a coach response
                fastify.log.debug({ userId: user.id, bytes: message.length }, '[VoiceCoach] Received binary audio chunk')
                return;
            }

            try {
                const data = JSON.parse(message.toString());

                if (data.type !== 'voice_command') {
                    socket.send(JSON.stringify({
                        type: 'voice_error',
                        message: 'Unsupported voice event type'
                    }))
                    return
                }

                if (isCommandRateLimited()) {
                    socket.send(JSON.stringify({
                        type: 'voice_rate_limited',
                        message: 'Too many voice commands. Please slow down.'
                    }))
                    return
                }

                const command = voiceCommandSchema.parse(data)

                // Manual trigger or detected intent from audio
                const response = await CoachChatEngine.generateResponse(
                    command.text,
                    command.context || 'general',
                    { username: displayName, position: user.position } as any,
                    []
                )

                socket.send(JSON.stringify({
                    type: 'coach_response',
                    text: response.message,
                    suggestedActions: response.suggestedActions
                }))
            } catch (err) {
                fastify.log.warn({ err, userId: user.id }, '[VoiceCoach] Message processing failed')
                socket.send(JSON.stringify({
                    type: 'voice_error',
                    message: err instanceof z.ZodError
                        ? 'Invalid voice command payload'
                        : 'Voice command processing failed'
                }))
            }
        });

        socket.on('close', () => {
            fastify.log.info({ userId: user.id }, '[VoiceCoach] User disconnected')
        });

        // Handshake
        socket.send(JSON.stringify({
            type: 'ready',
            message: `Hey ${displayName}, I'm listening. Ask me anything about your game.`
        }));
    });
}
