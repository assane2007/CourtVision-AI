import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'

import { supabasePlugin } from './plugins/supabase'
import { authPlugin } from './plugins/auth'

// ── Core Routes ──
import authRoutes from './routes/auth'
import sessionRoutes from './routes/sessions'
import analysisRoutes from './routes/analyses'
import twinRoutes from './routes/twin'
import billingRoutes from './routes/billing'
import communityRoutes from './routes/community'
import liveRoutes from './routes/live'
import waitlistRoutes from './routes/waitlist'
import shareRoutes from './routes/share'

// ── V5 Apex Routes ──
import shotDnaRoutes from './routes/shotDna'
import predictRoutes from './routes/predict'
import trainingRoutes from './routes/training'
import coachChatRoutes from './routes/coachChat'
import recoveryRoutes from './routes/recovery'
import questRoutes from './routes/quests'
import crewRoutes from './routes/crews'
import analyticsRoutes from './routes/analytics'
import dashboardRoutes from './routes/dashboard'

export const buildApp = (opts: FastifyServerOptions = {}): FastifyInstance => {
    const app = fastify(opts)

    // Rate Limiting (100 req/min per IP)
    app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute'
    })

    // CORS
    app.register(cors, {
        origin: true // Configure as needed for production
    })

    // Plugins
    app.register(supabasePlugin)
    app.register(authPlugin)

    // ── Core Routes ──
    app.register(authRoutes, { prefix: '/api/auth' })
    app.register(sessionRoutes, { prefix: '/api/sessions' })
    app.register(analysisRoutes, { prefix: '/api/analyses' })
    app.register(twinRoutes, { prefix: '/api/twin' })
    app.register(billingRoutes, { prefix: '/api/billing' })
    app.register(communityRoutes, { prefix: '/api/community' })
    app.register(liveRoutes, { prefix: '/api/sessions' })
    app.register(waitlistRoutes, { prefix: '/api' })
    app.register(shareRoutes, { prefix: '/api/share' })

    // ── V5 Apex Routes ──
    app.register(shotDnaRoutes, { prefix: '/api/shot-dna' })
    app.register(predictRoutes, { prefix: '/api/predict' })
    app.register(trainingRoutes, { prefix: '/api/training' })
    app.register(coachChatRoutes, { prefix: '/api/coach' })
    app.register(recoveryRoutes, { prefix: '/api/recovery' })
    app.register(questRoutes, { prefix: '/api/quests' })
    app.register(crewRoutes, { prefix: '/api/crews' })
    app.register(analyticsRoutes, { prefix: '/api/analytics' })
    app.register(dashboardRoutes, { prefix: '/api/dashboard' })

    // Health check
    app.get('/health', async () => {
        return {
            status: 'ok',
            service: 'courtvision-api',
            version: '5.0.0',
            codename: 'Apex',
            time: new Date().toISOString(),
            uptime: process.uptime(),
            features: [
                'shot-dna', 'predictive-engine', 'smart-training',
                'ai-coach-chat', 'recovery-wellness', 'quests-gamification',
                'crews', 'advanced-analytics', 'live-coach', 'digital-twin',
                'highlight-reel', 'community', 'billing',
            ],
        }
    })

    return app
}
