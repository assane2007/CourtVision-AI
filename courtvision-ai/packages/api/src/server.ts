import { buildApp } from './app'
import dotenv from 'dotenv'
import { initWorker } from './queue/videoProcessor'

dotenv.config({ path: '../../.env' })

const start = async () => {
    // Init worker (graceful — no-op if Redis not available)
    let worker: { close: () => Promise<void> }
    try {
        worker = initWorker()
    } catch {
        console.warn('[Server] Worker init skipped (no Redis)')
        worker = { close: async () => {} }
    }

    const server = buildApp({
        logger: {
            level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
            transport: process.env.NODE_ENV !== 'production'
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
        const port = parseInt(process.env.PORT || '3000', 10)
        await server.listen({ port, host: '0.0.0.0' })
        server.log.info(`🏀 CourtVision API running on port ${port}`)
    } catch (err) {
        server.log.error(err)
        process.exit(1)
    }
}

start()
