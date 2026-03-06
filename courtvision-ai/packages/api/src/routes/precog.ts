import { FastifyInstance } from 'fastify'
import { z } from 'zod'

// Mock Data representing real clips you will host on Supabase Storage
const MOCK_CLIPS = [
    {
        id: '1',
        category: 'Pick and Roll',
        difficulty: 1,
        correct_answer: 'PASS',
        url: 'https://player.vimeo.com/external/536052737.sd.mp4?s=d010bb1b48b1111059f7df8027ad2a5d914620f3&profile_id=165',
        duration_ms: 1200
    },
    {
        id: '2',
        category: 'Fast Break',
        difficulty: 2,
        correct_answer: 'TIR',
        url: 'https://player.vimeo.com/external/536052951.sd.mp4?s=1d2fdb1143c5b5fe1f0ed56bcfb6ecb1bf7623cf&profile_id=165',
        duration_ms: 1000
    },
    {
        id: '3',
        category: 'Isolation',
        difficulty: 3,
        correct_answer: 'DRIVE',
        url: 'https://player.vimeo.com/external/494247514.sd.mp4?s=d010bb1b48b1111059f7df8027ad2a5d914620f3&profile_id=165',
        duration_ms: 1100
    },
    {
        id: '4',
        category: 'Out of bounds',
        difficulty: 4,
        correct_answer: 'PASS',
        url: 'https://player.vimeo.com/external/517090081.sd.mp4?s=b6540d58849b28a2a78b5cecc2aef00dcd220d58&profile_id=165',
        duration_ms: 1400
    },
    {
        id: '5',
        category: 'Zone Read',
        difficulty: 2,
        correct_answer: 'TIR',
        url: 'https://player.vimeo.com/external/475142103.sd.mp4?s=5550731f822a7f551b9e830e201b1db2f7eb21ed&profile_id=165',
        duration_ms: 900
    }
]

export default async function precogRoutes(fastify: FastifyInstance) {
    // Schema for getting a session
    const GetSessionSchema = z.object({
        userId: z.string().uuid().optional(),
    });

    // 1. Get clips for a new session
    fastify.get('/clips', {
        schema: {
            querystring: GetSessionSchema
        }
    }, async (request, reply) => {
        // Logic: 
        // 1. Fetch user baseline/current speed
        // 2. Select 10 calibration + 40 training clips randomly based on user's current level

        let initialSpeed = 100; // default 100 mph

        // Return mock data
        // We will just repeat the mock clips to simulate a full session
        const calibrationClips = Array(2).fill(MOCK_CLIPS).flat();
        const trainingClips = Array(5).fill(MOCK_CLIPS).flat();

        return reply.send({
            speedMph: initialSpeed,
            calibration: calibrationClips,
            training: trainingClips
        });
    });

    // Schema for finishing a session
    const FinishSessionSchema = z.object({
        userId: z.string().uuid().optional(),
        date: z.string(),
        durationSeconds: z.number(),
        avgResponseMs: z.number(),
        accuracyPercentage: z.number(),
        responses: z.array(z.object({
            clipId: z.string(),
            choice: z.string(),
            correct: z.boolean(),
            responseTimeMs: z.number(),
            speedMultiplier: z.number()
        }))
    });

    // 2. Post session results
    fastify.post('/session', {
        schema: {
            body: FinishSessionSchema
        }
    }, async (request, reply) => {
        const data = request.body as z.infer<typeof FinishSessionSchema>;

        // Analyze progression
        let newSpeedOffset = 0;
        if (data.accuracyPercentage > 75) {
            newSpeedOffset = 10; // +10% speed
        } else if (data.accuracyPercentage < 50) {
            newSpeedOffset = -15; // -15% speed
        }

        // In a real app we'd update Supabase users table here
        // and insert session + responses.

        return reply.send({
            success: true,
            message: 'Session recorded successfully',
            speedAdjustment: newSpeedOffset,
            newSpeedMph: 100 + newSpeedOffset // mocked
        });
    });

    // 3. Get progression data for the dashboard
    fastify.get('/progression/:userId', async (request, reply) => {
        const { userId } = request.params as { userId: string };

        // Return mock progression
        return reply.send({
            currentSpeedMph: 187,
            baselineSpeedMph: 145,
            history: [
                { date: '2026-02-01', speed: 145, accuracy: 60 },
                { date: '2026-02-08', speed: 155, accuracy: 72 },
                { date: '2026-02-15', speed: 165, accuracy: 80 },
                { date: '2026-02-22', speed: 175, accuracy: 65 },
                { date: '2026-03-01', speed: 187, accuracy: 78 }
            ],
            milestone: "Ton cerveau anticipe maintenant 0.4 secondes plus vite qu'à ton arrivée"
        });
    });
}
