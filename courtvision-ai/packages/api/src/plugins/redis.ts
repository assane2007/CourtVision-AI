import fp from 'fastify-plugin'
import type { RedisOptions } from 'ioredis';
import Redis from 'ioredis'
import { env } from '../config/env'

export interface RedisPluginOptions extends RedisOptions {}

export const redisPlugin = fp<RedisPluginOptions>(async (fastify, opts) => {
    const isTest = process.env.NODE_ENV === 'test'

    // In tests without REDIS_URL, use an in-memory shim to avoid network sockets
    // and reconnect timers that can keep Jest alive.
    if (isTest && !env.REDIS_URL) {
        const kvStore = new Map<string, string>()
        const hashStore = new Map<string, Map<string, string>>()

        const mockRedis = {
            on: () => mockRedis,
            async get(key: string) {
                return kvStore.get(key) ?? null
            },
            async setex(key: string, _seconds: number, value: string) {
                kvStore.set(key, value)
                return 'OK'
            },
            async del(key: string) {
                const hadKey = kvStore.delete(key)
                const hadHash = hashStore.delete(key)
                return hadKey || hadHash ? 1 : 0
            },
            async keys(pattern: string) {
                if (!pattern.endsWith('*')) {
                    return kvStore.has(pattern) || hashStore.has(pattern) ? [pattern] : []
                }

                const prefix = pattern.slice(0, -1)
                const keys = new Set<string>()

                for (const key of kvStore.keys()) {
                    if (key.startsWith(prefix)) keys.add(key)
                }
                for (const key of hashStore.keys()) {
                    if (key.startsWith(prefix)) keys.add(key)
                }

                return Array.from(keys)
            },
            async hgetall(key: string) {
                const bucket = hashStore.get(key)
                if (!bucket) return {}
                return Object.fromEntries(bucket.entries())
            },
            async hmset(key: string, values: Record<string, unknown>) {
                let bucket = hashStore.get(key)
                if (!bucket) {
                    bucket = new Map<string, string>()
                    hashStore.set(key, bucket)
                }

                for (const [field, value] of Object.entries(values)) {
                    bucket.set(field, String(value))
                }
                return 'OK'
            },
            async hset(key: string, field: string, value: string) {
                let bucket = hashStore.get(key)
                if (!bucket) {
                    bucket = new Map<string, string>()
                    hashStore.set(key, bucket)
                }
                bucket.set(field, value)
                return 1
            },
            async expire(_key: string, _seconds: number) {
                return 1
            },
            async quit() {
                return 'OK'
            },
            disconnect() {
                kvStore.clear()
                hashStore.clear()
            },
        } as unknown as Redis

        fastify.decorate('redis', mockRedis)
        fastify.addHook('onClose', async (instance) => {
            try {
                await instance.redis.quit()
            } finally {
                instance.redis.disconnect(false)
            }
        })
        return
    }

    // Graceful degradation: default to localhost:6379 if REDIS_URL not set
    const redisUrl = env.REDIS_URL || 'redis://localhost:6379'
    
    const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: isTest ? 1 : 3,
        lazyConnect: isTest,
        enableOfflineQueue: !isTest,
        retryStrategy: isTest ? () => null : undefined,
        ...opts
    })

    redis.on('error', (err) => {
        fastify.log.warn({ err }, 'Redis connection error in plugin')
    })
    
    fastify.decorate('redis', redis)
    
    fastify.addHook('onClose', async (instance) => {
        try {
            await instance.redis.quit()
        } catch {
            // Ignore: client may already be closed or never connected
        } finally {
            instance.redis.disconnect(false)
        }
    })
}, { name: 'courtvision-redis' })

declare module 'fastify' {
    interface FastifyInstance {
        redis: Redis
    }
}
