import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'

import { supabasePlugin } from './plugins/supabase'
import { authPlugin } from './plugins/auth'

import authRoutes from './routes/auth'
import sessionRoutes from './routes/sessions'
import analysisRoutes from './routes/analyses'
import twinRoutes from './routes/twin'
import billingRoutes from './routes/billing'
import communityRoutes from './routes/community'
import liveRoutes from './routes/live'

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

    // Routes
    app.register(authRoutes, { prefix: '/api/auth' })
    app.register(sessionRoutes, { prefix: '/api/sessions' })
    app.register(analysisRoutes, { prefix: '/api/analyses' })
    app.register(twinRoutes, { prefix: '/api/twin' })
    app.register(billingRoutes, { prefix: '/api/billing' })
    app.register(communityRoutes, { prefix: '/api/community' })
    app.register(liveRoutes, { prefix: '/api/sessions' })

    // Route fallback
    app.get('/health', async () => {
        return { status: 'ok', time: new Date().toISOString() }
    })

    return app
}
