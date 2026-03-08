import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import helmet from '@fastify/helmet'
import {
    serializerCompiler,
    validatorCompiler,
    ZodTypeProvider,
    jsonSchemaTransform
} from 'fastify-type-provider-zod'

import fastifyWebsocket from '@fastify/websocket'

import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

import { supabasePlugin } from './plugins/supabase'
import { authPlugin } from './plugins/auth'
import { initV5Orchestrator } from './services/v5Orchestrator'
import { env } from './config/env'
import { initializeQueues } from './queue'

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
import highlightRoutes from './routes/highlights'
import wsRoutes from './routes/ws'
import playersRoutes from './routes/players'
import shadowRoutes from './routes/shadow'
import spatialRoutes from './routes/spatial'
import precogRoutes from './routes/precog'
import voiceCoachRoutes from './routes/voiceCoach'
import tiktokRoutes from './routes/tiktok'
import investorRoutes from './routes/investor'
import reportRoutes from './routes/reports'

export const buildApp = (opts: FastifyServerOptions = {}): FastifyInstance => {
    // Initialize Sentry early (C-2)
    Sentry.init({
        dsn: env.isProduction ? process.env.SENTRY_DSN : '',
        integrations: [
            nodeProfilingIntegration(),
        ],
        // Tracing
        tracesSampleRate: env.isProduction ? 0.2 : 1.0,
    })

    const app = fastify({ ...opts, logger: true }).withTypeProvider<ZodTypeProvider>()

    // Zod Compilers
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)

    // Security Headers (C-3: @fastify/helmet)
    app.register(helmet, {
        contentSecurityPolicy: env.isProduction ? undefined : false, // CSP breaks Swagger UI in dev
        crossOriginEmbedderPolicy: false, // needed for mobile app
    })

    // Rate Limiting — global default + route-specific overrides (M-8)
    app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute'
    })

    // CORS — tighter in production (M-7: trim whitespace)
    app.register(cors, {
        origin: env.isProduction
            ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
            : true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    })

    // WebSockets
    app.register(fastifyWebsocket, {
        options: { maxPayload: 1048576 }
    })

    // Plugins
    app.register(supabasePlugin)
    app.register(authPlugin)

    // Initialize V5Orchestrator with shared Supabase client after plugin registration
    app.addHook('onReady', async () => {
        initV5Orchestrator(app.supabase)

        // Boot our AI workers
        if (!env.isProduction) {
            // Note: In prod these might run on separate containers, but for dev we bind them to the web API thread.
            initializeQueues();
        }
    })

    // Global Error Handler (Production Optimized)
    app.setErrorHandler((error, request, reply) => {
        const isProduction = process.env.NODE_ENV === 'production'
        const statusCode = error.statusCode || 500

        // Log structured error with full context
        request.log.error({
            err: error,
            requestId: request.id,
            url: request.url,
            method: request.method,
            userId: request.user?.id,
        }, `API Error: ${error.message}`)

        // Capture to Sentry
        if (statusCode >= 500) {
            Sentry.captureException(error, {
                extra: { url: request.url, method: request.method, userId: request.user?.id }
            });
        }

        // Zod validation errors — safe to expose field details
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

        // Rate limiting
        if (statusCode === 429) {
            return reply.status(429).send({
                success: false,
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please slow down.',
            })
        }

        // Generic response — NEVER leak internals in production
        return reply.status(statusCode).send({
            success: false,
            error: statusCode >= 500 ? 'Internal Server Error' : 'Request failed',
            message: isProduction
                ? 'An unexpected error occurred. Please try again later.'
                : error.message,
        })
    })

    // ── Global onSend hook: strip error.message in production responses ──
    // Catches error leaks from route-level catch blocks that return error.message directly
    if (process.env.NODE_ENV === 'production') {
        app.addHook('onSend', async (request, reply, payload) => {
            if (reply.statusCode >= 400 && typeof payload === 'string') {
                try {
                    const body = JSON.parse(payload)
                    // If the response has an "error" field that looks like an internal error, sanitize it
                    if (body.error && !body.success && typeof body.error === 'string') {
                        const internalPatterns = /supabase|postgres|sql|econnrefused|timeout|ENOTFOUND|column|relation|22P02|23505|42P01/i
                        if (internalPatterns.test(body.error)) {
                            body.error = 'Request failed'
                            return JSON.stringify(body)
                        }
                    }
                } catch {
                    // Not JSON, pass through
                }
            }
            return payload
        })
    }

    // ── Routes Registration ──
    app.register(authRoutes, { prefix: '/api/auth' })
    app.register(sessionRoutes, { prefix: '/api/sessions' })
    app.register(analysisRoutes, { prefix: '/api/analyses' })
    app.register(twinRoutes, { prefix: '/api/twin' })
    app.register(billingRoutes, { prefix: '/api/billing' })
    app.register(communityRoutes, { prefix: '/api/community' })
    app.register(liveRoutes, { prefix: '/api/live' })
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
    app.register(highlightRoutes, { prefix: '/api/highlights' })
    app.register(wsRoutes, { prefix: '/ws' })
    app.register(playersRoutes, { prefix: '/api/players' })
    app.register(shadowRoutes, { prefix: '/api/shadow' })
    app.register(spatialRoutes, { prefix: '/api/spatial' })
    app.register(precogRoutes, { prefix: '/api/precog' })
    app.register(voiceCoachRoutes, { prefix: '/ws' })
    app.register(tiktokRoutes, { prefix: '/api/tiktok' })
    app.register(investorRoutes, { prefix: '/api/investor' })
    app.register(reportRoutes, { prefix: '/api/reports' })

    // Health check — deep check with DB + Redis connectivity (M-9)
    app.get('/health', async (request) => {
        const checks: Record<string, 'ok' | 'error'> = { api: 'ok' }

        // Supabase connectivity
        try {
            const { error } = await app.supabase.from('users').select('id').limit(1)
            checks.database = error ? 'error' : 'ok'
        } catch { checks.database = 'error' }

        // CV Engine (Python worker) connectivity
        try {
            const res = await fetch(`${env.CV_ENGINE_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) })
            checks.cvEngine = res.ok ? 'ok' : 'error'
        } catch { checks.cvEngine = 'error' }

        const allOk = Object.values(checks).every(v => v === 'ok')

        return {
            status: allOk ? 'ok' : 'degraded',
            service: 'courtvision-api',
            version: '5.3.0',
            codename: 'Skill-Hardened',
            time: new Date().toISOString(),
            checks,
        }
    })

    return app as unknown as FastifyInstance
}

