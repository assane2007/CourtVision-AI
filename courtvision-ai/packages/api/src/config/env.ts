/**
 * Environment Variable Validation — Fail-Fast at Startup
 *
 * Uses envalid to validate ALL required env vars before the server boots.
 * If any critical variable is missing, the process exits immediately with
 * a clear error message — no silent failures in production.
 *
 * Skill: production-code-audit → C-5 (env validation)
 */

import { cleanEnv, str, port, url, num } from 'envalid'

export const env = cleanEnv(process.env, {
    // ── Server ──
    NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
    PORT: port({ default: 3000 }),

    // ── Supabase (CRITICAL) ──
    SUPABASE_URL: url({ desc: 'Supabase project URL' }),
    SUPABASE_ANON_KEY: str({ desc: 'Supabase anon/public key' }),
    SUPABASE_SERVICE_ROLE_KEY: str({ desc: 'Supabase service role key (server only)' }),

    // ── Stripe (required in production, optional in dev) ──
    STRIPE_SECRET_KEY: str({ default: '', desc: 'Stripe secret API key' }),
    STRIPE_WEBHOOK_SECRET: str({ default: '', desc: 'Stripe webhook signing secret' }),
    STRIPE_PRICE_PLAYER: str({ default: '', desc: 'Stripe price ID for Player plan' }),
    STRIPE_PRICE_COACH: str({ default: '', desc: 'Stripe price ID for Coach plan' }),
    STRIPE_PRICE_ACADEMY: str({ default: '', desc: 'Stripe price ID for Academy plan' }),

    // -- RevenueCat --
    REVENUECAT_WEBHOOK_SECRET: str({ default: '', desc: 'RevenueCat webhook auth secret' }),

    // ── Redis (optional — graceful degradation) ──
    REDIS_URL: str({ default: '', desc: 'Redis connection URL for BullMQ' }),

    // ── CORS ──
    ALLOWED_ORIGINS: str({ default: 'https://courtvision.ai', desc: 'Comma-separated allowed origins' }),

    // ── AI / LLM (optional) ──
    GROQ_API_KEY: str({ default: '', desc: 'Groq API key for LLM inference' }),
    CF_ACCOUNT_ID: str({ default: '', desc: 'Cloudflare account ID' }),
    CF_API_TOKEN: str({ default: '', desc: 'Cloudflare API token' }),

    // ── Worker ──
    WORKER_CONCURRENCY: num({ default: 2, desc: 'BullMQ worker concurrency' }),
    CV_ENGINE_URL: str({ default: 'http://localhost:8000', desc: 'Python CV engine URL' }),
})

/**
 * Validate Stripe config — called only when Stripe routes are hit.
 * Throws immediately if critical Stripe vars are missing in production.
 */
export function requireStripeConfig(): void {
    if (env.isProduction) {
        if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is required in production')
        if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is required in production')
        if (!env.STRIPE_PRICE_PLAYER) throw new Error('STRIPE_PRICE_PLAYER is required in production')
        if (!env.STRIPE_PRICE_COACH) throw new Error('STRIPE_PRICE_COACH is required in production')
        if (!env.STRIPE_PRICE_ACADEMY) throw new Error('STRIPE_PRICE_ACADEMY is required in production')
    }
}
