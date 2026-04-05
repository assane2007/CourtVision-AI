# CourtVision AI — Infrastructure & Deployment Guide

## Architecture Overview

```
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Web (Next)  │    │  Mobile (Expo)│    │  CV Engine    │
│   Vercel      │    │  Expo/EAS     │    │  Railway GPU  │
│   :3000       │    │               │    │  :8000        │
└──────┬────────┘    └──────┬────────┘    └──────┬────────┘
       │                    │                    │
       └────────────┬───────┘────────────────────┘
                    ▼
           ┌─────────────────┐
           │  Fastify API    │
           │  Railway        │
           │  :8080          │
           └───┬─────────┬───┘
               │         │
     ┌─────────▼──┐ ┌────▼──────┐
     │  Supabase  │ │  Redis    │
     │  (Postgres)│ │  (BullMQ) │
     └────────────┘ └───────────┘
```

## Quick Start (Local Development)

```bash
# 1. Clone & install
git clone https://github.com/YOUR_ORG/CourtVision-AI.git
cd CourtVision-AI/courtvision-ai

# 2. Copy environment variables
cp .env.example .env
# Fill in your Supabase, Stripe, and Gemini keys

# 3. Install dependencies
npm install

# 4. Start infrastructure (Redis + Postgres)
docker-compose up -d redis postgres

# 5. Run database migrations
# Apply SQL files from packages/database/ in your Supabase dashboard

# 6. Start development servers
npm run dev:api    # Fastify on :8080
npm run dev:web    # Next.js on :3000
# In a separate terminal for mobile:
cd apps/mobile && npx expo start
```

## Docker Compose (Full Stack Local)

```bash
docker-compose up --build
```

Services:
| Service    | Port | Description                    |
|------------|------|--------------------------------|
| web        | 3000 | Next.js frontend               |
| api        | 8080 | Fastify API + BullMQ workers   |
| cv-engine  | 8000 | Python FastAPI (GPU optional)  |
| redis      | 6379 | Redis 7 (queue backing store)  |
| postgres   | 5432 | PostgreSQL 15 (local dev only) |

**Note:** Production uses Supabase-managed PostgreSQL, not local Postgres.

## Production Deployment

### API → Railway
1. Connect repo to Railway
2. Set root directory to `courtvision-ai`
3. Railway auto-detects `Dockerfile` and `railway.toml`
4. Add all env vars from `.env.example` in Railway dashboard
5. Health check is at `GET /health`

### Web → Vercel
1. Connect repo to Vercel
2. Set root directory to `courtvision-ai/apps/web`
3. Framework: Next.js (auto-detected)
4. Add `NEXT_PUBLIC_*` env vars in Vercel dashboard

### Mobile → EAS Build
```bash
cd apps/mobile
eas build --platform all
eas submit --platform all
```

### CV Engine → Railway (GPU)
1. Create separate Railway service
2. Set dockerfile path to `apps/cv-engine/Dockerfile`
3. Enable GPU (NVIDIA) if available
4. Set `CV_ENGINE_URL` in API env vars

## Port Mapping (Standardized)

| Service    | Port | Set By              |
|------------|------|---------------------|
| API        | 8080 | `PORT` env var      |
| Web        | 3000 | Next.js default     |
| CV Engine  | 8000 | uvicorn default     |
| Redis      | 6379 | Redis default       |
| Postgres   | 5432 | Postgres default    |

**Important:** The root `Dockerfile` and `docker-compose.yml` both use port 8080 for the API.

## CI/CD

GitHub Actions workflows in `.github/workflows/`:
- `ci.yml` — Lint + Test + Build on every PR
- `deploy-api.yml` — Deploy API to Railway on merge to main
- `deploy-web.yml` — Deploy Web to Vercel on merge to main
- `security.yml` — Weekly dependency audit + CodeQL scan

## Environment Variables

All env vars are documented in `.env.example` at the monorepo root.
**Never commit actual secrets.** Use platform-specific secret managers.
