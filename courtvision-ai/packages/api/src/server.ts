import { buildApp } from './app'
import dotenv from 'dotenv'
import { initWorker } from './queue/videoProcessor'

dotenv.config({ path: '../../.env' })

const start = async () => {
    const worker = initWorker()

    const server = buildApp({
        logger: {
            level: 'info',
            transport: {
                target: 'pino-pretty'
            }
        }
    })

    try {
        const port = parseInt(process.env.PORT || '3000', 10)
        await server.listen({ port, host: '0.0.0.0' })
        server.log.info(`Server running on port ${port}`)
    } catch (err) {
        server.log.error(err)
        process.exit(1)
    }
}

start()
