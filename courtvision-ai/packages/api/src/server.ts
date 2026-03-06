import { buildApp } from './app'
import dotenv from 'dotenv'
import { initWorker } from './queue/videoProcessor'

// Load .env BEFORE any env validation
import { resolve } from 'path'
dotenv.config({ path: resolve(__dirname, '../../.env') })
dotenv.config() // Fallback to local .env in packages/api

// Env validation — fail fast if critical vars are missing (C-5)
import { env } from './config/env'

const start = async () => {
    // Init worker (graceful — no-op if Redis not available)
    let worker: { close: () => Promise<void> }
    try {
        worker = initWorker()
    } catch {
        console.warn('[Server] Worker init skipped (no Redis)')
        worker = { close: async () => { } }
    }

    const server = buildApp({
        logger: {
            level: env.isProduction ? 'info' : 'debug',
            transport: !env.isProduction
                ? { target: 'pino-pretty' }
                : undefined,
        },
    })

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        server.log.info(`Received ${signal}, shutting down gracefully...`)
        await worker.close()
        await server.close()
        process.exit(0)
    }
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    try {
        await server.listen({ port: env.PORT, host: '0.0.0.0' })
        server.log.info(`🏀 CourtVision API running on port ${env.PORT}`)
    } catch (err) {
        server.log.error(err)
        process.exit(1)
    }
}

start()
