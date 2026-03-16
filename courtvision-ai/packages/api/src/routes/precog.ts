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
    // Protect all Pre-Cog routes — user-specific training data
    fastify.addHook('preValidation', fastify.authenticate)

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
        const { userId } = request.query as z.infer<typeof GetSessionSchema>;
        const userUid = userId || request.user?.id;

        // Fetch user speed from profile
        const { data: profile } = await fastify.supabase
            .from('profiles')
            .select('precog_current_speed')
            .eq('id', userUid)
            .single();

        const initialSpeed = profile?.precog_current_speed || 100;

        // Fetch clips from database
        const { data: clips, error } = await fastify.supabase
            .from('precog_clips')
            .select('*')
            .limit(50); // Get a pool of 50 clips

        if (error || !clips || clips.length === 0) {
            return reply.send({
                speedMph: initialSpeed,
                calibration: MOCK_CLIPS.slice(0, 2),
                training: MOCK_CLIPS
            });
        }

        // Randomize and split
        const shuffled = clips.sort(() => 0.5 - Math.random());
        const calibration = shuffled.slice(0, 5);
        const training = shuffled.slice(5, 45);

        return reply.send({
            speedMph: initialSpeed,
            calibration,
            training
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
        const userUid = data.userId || request.user?.id;

        // Start Transactional approach (Supabase doesn't have native multi-table transactions in client, but we can chain)
        const { data: session, error: sessError } = await fastify.supabase
            .from('precog_sessions')
            .insert({
                user_id: userUid,
                duration_seconds: data.durationSeconds,
                avg_response_ms: data.avgResponseMs,
                accuracy_percentage: data.accuracyPercentage
            })
            .select()
            .single();

        if (sessError) throw sessError;

        // Bulk insert responses
        const responseData = data.responses.map(r => ({
            session_id: session.id,
            clip_id: r.clipId,
            choice: r.choice,
            correct: r.correct,
            response_time_ms: r.responseTimeMs,
            speed_multiplier: r.speedMultiplier
        }));

        await fastify.supabase.from('precog_responses').insert(responseData);

        // Analyze progression & update profile
        let newSpeedOffset = 0;
        if (data.accuracyPercentage > 75) newSpeedOffset = 5;
        else if (data.accuracyPercentage < 50) newSpeedOffset = -5;

        const { data: currentProfile } = await fastify.supabase
            .from('profiles')
            .select('precog_current_speed')
            .eq('id', userUid)
            .single();
        
        const oldSpeed = currentProfile?.precog_current_speed || 100;
        const newSpeed = oldSpeed + newSpeedOffset;

        await fastify.supabase
            .from('profiles')
            .update({ precog_current_speed: newSpeed })
            .eq('id', userUid);

        return reply.send({
            success: true,
            message: 'Session recorded successfully',
            speedAdjustment: newSpeedOffset,
            newSpeedMph: newSpeed
        });
    });

    // 3. Get progression data for the dashboard
    fastify.get('/progression/:userId', async (request, reply) => {
        const { userId } = request.params as { userId: string };

        const { data: sessions } = await fastify.supabase
            .from('precog_sessions')
            .select('date, accuracy_percentage')
            .eq('user_id', userId)
            .order('date', { ascending: true })
            .limit(10);

        const { data: profile } = await fastify.supabase
            .from('profiles')
            .select('precog_current_speed, precog_baseline_speed')
            .eq('id', userId)
            .single();

        return reply.send({
            currentSpeedMph: profile?.precog_current_speed || 100,
            baselineSpeedMph: profile?.precog_baseline_speed || 100,
            history: sessions?.map(s => ({
                date: s.date,
                accuracy: s.accuracy_percentage
            })) || [],
            milestone: sessions && sessions.length > 5 
                ? "Excellent travail ! Ta vitesse de traitement visuel est en hausse constante."
                : "Continue tes sessions quotidiennes pour bâtir ton profil cognitif."
        });
    });
}
