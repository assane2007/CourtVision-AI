import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { CoachChatEngine } from '@courtvision/ai'

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
        const socket = connection.socket;
        const user = req.user;

        console.info(`[VoiceCoach] User ${user.id} connected via Voice`);

        socket.on('message', async (message: any, isBinary: boolean) => {
            if (isBinary) {
                // Incoming audio chunks (PCM/WAV)
                // For MVP, we would pipe this to a speech-to-text service like Whisper
                // For now, we simulate detection and trigger a coach response
                console.debug(`[VoiceCoach] Received ${message.length} bytes of audio from ${user.id}`);
                return;
            }

            try {
                const data = JSON.parse(message.toString());

                if (data.type === 'voice_command') {
                    // Manual trigger or detected intent from audio
                    const response = await CoachChatEngine.generateResponse(
                        data.text,
                        data.context || 'general',
                        { username: user.username, position: user.position } as any,
                        []
                    );

                    socket.send(JSON.stringify({
                        type: 'coach_response',
                        text: response.message,
                        suggestedActions: response.suggestedActions
                    }));
                }
            } catch (err) {
                console.error('[VoiceCoach] Error processing message:', err);
            }
        });

        socket.on('close', () => {
            console.info(`[VoiceCoach] User ${user.id} disconnected`);
        });

        // Handshake
        socket.send(JSON.stringify({
            type: 'ready',
            message: `Hey ${user.username}, I'm listening. Ask me anything about your game.`
        }));
    });
}
