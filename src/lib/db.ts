import { getDb } from '@/lib/database'

/**
 * Prisma database client singleton.
 *
 * Delegates to the database module for connection pooling,
 * slow query logging, and health check support.
 *
 * The database module handles hot-reload safety via globalThis caching.
 */
export const db = getDb()