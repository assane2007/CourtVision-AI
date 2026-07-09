import { getDb } from './database'

/** Prisma client singleton instance. Safe to import and use directly. */
export const db = getDb()

export { healthCheck, disconnect, POOL_CONFIG, SLOW_QUERY_THRESHOLD_MS } from './database'