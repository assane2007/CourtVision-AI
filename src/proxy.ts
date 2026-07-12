/**
 * NOTE: The active request interceptor has been moved to src/middleware.ts
 * due to a sandbox constraint (files cannot be deleted).
 *
 * In Next.js 16, the preferred convention is proxy.ts (this file).
 * Once the sandbox allows file deletion, remove src/middleware.ts and
 * restore the full proxy logic here (rename `middleware` export to `proxy`).
 *
 * This file intentionally exports nothing to avoid the dual-file conflict.
 */

// No exports — this file is intentionally inactive.
const _noop = undefined
export { _noop }