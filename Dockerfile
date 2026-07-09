# ============================================
# CourtVision AI — Multi-stage Docker Build
# ============================================
# Production image for Next.js 16 + Bun + SQLite/PostgreSQL

LABEL maintainer="CourtVision AI Team"
LABEL version="0.2.0"
LABEL description="Basketball AI coaching platform — production build"

# ---- Stage 1: Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app

# Install bun from official source
RUN npm install -g bun

# Copy lockfiles first for Docker layer caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production=false

# ---- Stage 2: Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install bun from official source
RUN npm install -g bun

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full source
COPY . .

# Generate Prisma client (required before build)
RUN bunx prisma generate

# Build Next.js (output: "standalone" is set in next.config.ts)
# The build script also copies static + public into .next/standalone/
RUN bun run build

# ---- Stage 3: Runner (production) ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install curl for health check
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 node

# Copy standalone output (includes static + public via build script)
COPY --from=builder --chown=node:nodejs /app/.next/standalone ./

# Copy static assets (explicit copy for safety)
COPY --from=builder --chown=node:nodejs /app/.next/static ./.next/static

# Copy public assets (logo, manifest, icons, etc.)
COPY --from=builder --chown=node:nodejs /app/public ./public

# Copy Prisma schema for potential migrations at runtime
COPY --from=builder --chown=node:nodejs /app/prisma ./prisma

# Create directories for database data and uploads (mount volumes here)
RUN mkdir -p /app/db /app/uploads && \
    chown node:nodejs /app/db /app/uploads

USER node

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check (matches /api/health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]