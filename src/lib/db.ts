import { PrismaClient } from '@prisma/client'
import { getDb } from './database'

/**
 * Lazy Prisma client proxy.
 * Defers database connection until the first actual property access,
 * so the module can be safely imported at build time without DATABASE_URL.
 */
let _db: PrismaClient | undefined

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!_db) _db = getDb()
    const value = Reflect.get(_db, prop, receiver)
    if (typeof value === 'function') {
      return value.bind(_db)
    }
    return value
  },
})

export { healthCheck, disconnect, POOL_CONFIG, SLOW_QUERY_THRESHOLD_MS } from './database'