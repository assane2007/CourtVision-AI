import fp from 'fastify-plugin'
import Redis, { RedisOptions } from 'ioredis'
import { env } from '../config/env'

export interface RedisPluginOptions extends RedisOptions {}

export const redisPlugin = fp<RedisPluginOptions>(async (fastify, opts) => {
    // Graceful degradation: default to localhost:6379 if REDIS_URL not set
    const redisUrl = env.REDIS_URL || 'redis://localhost:6379'
    
    const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        ...opts
    })

    redis.on('error', (err) => {
        fastify.log.warn({ err }, 'Redis connection error in plugin')
    })
    
    fastify.decorate('redis', redis)
    
    fastify.addHook('onClose', async (instance) => {
        await instance.redis.quit()
    })
}, { name: 'courtvision-redis' })

declare module 'fastify' {
    interface FastifyInstance {
        redis: Redis
    }
}
