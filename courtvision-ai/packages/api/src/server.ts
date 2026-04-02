import dotenv from 'dotenv'

// Load .env BEFORE any env validation
import { resolve } from 'path'
dotenv.config({ path: resolve(__dirname, '../../.env'), override: true })
dotenv.config({ path: resolve(__dirname, '../.env') }) // Optional fallback: packages/api/.env

async function isCourtVisionApiRunning(port: number): Promise<boolean> {
    try {
        const res = await fetch(`http://127.0.0.1:${port}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(1500),
        })
        const health = await res.json().catch(() => null) as { service?: string } | null
        return res.ok && health?.service === 'courtvision-api'
    } catch {
        return false
    }
}

const start = async () => {
    const { env } = await import('./config/env')

    // Fast preflight: avoid initializing app/workers when this is just a duplicate local launch.
    if (!env.isProduction && await isCourtVisionApiRunning(env.PORT)) {
        console.log(`[Server] Port ${env.PORT} already serves CourtVision API; skipping duplicate dev instance.`)
        return
    }

    // Dynamic imports guarantee dotenv values are present before module initialization.
    const [{ initWorker }, { buildApp }] = await Promise.all([
        import('./queue/videoProcessor'),
        import('./app'),
    ])

    let worker: { close: () => Promise<void> } = { close: async () => { } }

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

        // Init worker only once the server is bound successfully.
        try {
            worker = await initWorker()
        } catch {
            server.log.warn('[Server] Worker init skipped (no Redis)')
        }
    } catch (err: any) {
        // Handle duplicate local launches gracefully when the same API is already running.
        if (err?.code === 'EADDRINUSE' && await isCourtVisionApiRunning(env.PORT)) {
            server.log.info(`Port ${env.PORT} already serves CourtVision API; skipping duplicate dev instance.`)
            await server.close().catch(() => { })
            return
        }

        server.log.error(err)
        process.exit(1)
    }
}

start()
