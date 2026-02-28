import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import {
    serializerCompiler,
    validatorCompiler,
    ZodTypeProvider,
    jsonSchemaTransform
} from 'fastify-type-provider-zod'

import { supabasePlugin } from './plugins/supabase'
import { authPlugin } from './plugins/auth'

// ── Routes ──
import authRoutes from './routes/auth'
import sessionRoutes from './routes/sessions'
import analysisRoutes from './routes/analyses'
import twinRoutes from './routes/twin'
import billingRoutes from './routes/billing'
import communityRoutes from './routes/community'
import liveRoutes from './routes/live'
import waitlistRoutes from './routes/waitlist'
import shareRoutes from './routes/share'
import shotDnaRoutes from './routes/shotDna'
import predictRoutes from './routes/predict'
import trainingRoutes from './routes/training'
import coachChatRoutes from './routes/coachChat'
import recoveryRoutes from './routes/recovery'
import questRoutes from './routes/quests'
import crewRoutes from './routes/crews'
import analyticsRoutes from './routes/analytics'
import dashboardRoutes from './routes/dashboard'
import shootingSessionRoutes from './routes/shootingSessions'

export const buildApp = (opts: FastifyServerOptions = {}): FastifyInstance => {
    const app = fastify(opts).withTypeProvider<ZodTypeProvider>()

    // Zod Compilers
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)

    // Rate Limiting
    app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute'
    })

    // CORS
    app.register(cors, {
        origin: true
    })

    // Plugins
    app.register(supabasePlugin)
    app.register(authPlugin)

    // Global Error Handler (Production Optimized)
    app.setErrorHandler((error, request, reply) => {
        const isProduction = process.env.NODE_ENV === 'production'
        const statusCode = error.statusCode || 500

        // Log structured error
        request.log.error({
            err: error,
            requestId: request.id,
            url: request.url,
            method: request.method
        }, `API Error: ${error.message}`)

        // Zod validation errors
        if (error.name === 'ZodError') {
            return reply.status(400).send({
                success: false,
                error: 'Validation Error',
                message: 'Invalid input parameters',
                details: (error as any).issues || (error as any).errors
            })
        }

        // Fastify standard validation
        if (error.validation) {
            return reply.status(400).send({
                success: false,
                error: 'Bad Request',
                message: error.message
            })
        }

        // Generic response
        return reply.status(statusCode).send({
            success: false,
            error: statusCode >= 500 ? 'Internal Server Error' : 'Client Error',
            message: statusCode >= 500 && isProduction
                ? 'An unexpected error occurred. Please try again later.'
                : error.message,
            requestId: isProduction ? undefined : request.id
        })
    })

    // ── Routes Registration ──
    app.register(authRoutes, { prefix: '/api/auth' })
    app.register(sessionRoutes, { prefix: '/api/sessions' })
    app.register(analysisRoutes, { prefix: '/api/analyses' })
    app.register(twinRoutes, { prefix: '/api/twin' })
    app.register(billingRoutes, { prefix: '/api/billing' })
    app.register(communityRoutes, { prefix: '/api/community' })
    app.register(liveRoutes, { prefix: '/api/sessions' })
    app.register(waitlistRoutes, { prefix: '/api' })
    app.register(shareRoutes, { prefix: '/api/share' })
    app.register(shotDnaRoutes, { prefix: '/api/shot-dna' })
    app.register(predictRoutes, { prefix: '/api/predict' })
    app.register(trainingRoutes, { prefix: '/api/training' })
    app.register(coachChatRoutes, { prefix: '/api/coach' })
    app.register(recoveryRoutes, { prefix: '/api/recovery' })
    app.register(questRoutes, { prefix: '/api/quests' })
    app.register(crewRoutes, { prefix: '/api/crews' })
    app.register(analyticsRoutes, { prefix: '/api/analytics' })
    app.register(dashboardRoutes, { prefix: '/api/dashboard' })
    app.register(shootingSessionRoutes, { prefix: '/api/shooting-sessions' })

    // Health check
    app.get('/health', async () => {
        return {
            status: 'ok',
            service: 'courtvision-api',
            version: '5.2.0',
            codename: 'Apex-Hardened',
            time: new Date().toISOString()
        }
    })

    return app as unknown as FastifyInstance
}

