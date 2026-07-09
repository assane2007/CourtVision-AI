# CourtVision AI — Vercel Environment Variables

## Required Variables
| Variable | Value |
|----------|-------|
| DATABASE_URL | Your PostgreSQL connection string (e.g., from Vercel Postgres, Neon, or Supabase) |
| NEXTAUTH_SECRET | Generate: `openssl rand -base64 48` |
| NEXTAUTH_URL | Your Vercel domain (e.g., `https://courtvision-ai.vercel.app`) |
| ENCRYPTION_KEY | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

## Optional Variables
| Variable | Description |
|----------|-------------|
| SENTRY_DSN | Server-side Sentry DSN |
| NEXT_PUBLIC_SENTRY_DSN | Client-side Sentry DSN |
| SENTRY_AUTH_TOKEN | For source map uploads |
| NEXT_PUBLIC_SENTRY_RELEASE | e.g., courtvision-ai@1.0.0 |
| STRIPE_SECRET_KEY | Stripe secret key |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe publishable key |
| STRIPE_WEBHOOK_SECRET | Stripe webhook signing secret |
| REDIS_URL | Redis URL (e.g., from Upstash) |
| S3_BUCKET | For video/file storage |
| RESEND_API_KEY | For transactional emails |
| NEXT_PUBLIC_APP_URL | Public app URL |

## Deployment Steps
1. Push to GitHub
2. Import project in Vercel dashboard
3. Set environment variables above
4. Deploy
5. Set up a PostgreSQL database (Neon, Supabase, or Vercel Postgres)
6. Run: `npx prisma migrate deploy` (or use Vercel build command)