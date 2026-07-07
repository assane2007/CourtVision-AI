# ============================================
# CourtVision AI — Multi-stage Docker Build
# ============================================
# Builds a minimal production image for Next.js 16 + Bun + SQLite

# ---- Stage 1: Dependencies ----
FROM oven/bun:1.2.8 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production=false

# ---- Stage 2: Builder ----
FROM oven/bun:1.2.8 AS builder
WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full source
COPY . .

# Generate Prisma client (required before build)
RUN bunx prisma generate

# Build Next.js (output: "standalone" is set in next.config.ts)
# The post-build copy step in package.json is not needed in Docker;
# we handle file placement explicitly in the runner stage.
RUN bun run build

# ---- Stage 3: Runner (production) ----
FROM oven/bun:1.2.8 AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets (must be inside .next/static for standalone)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public assets (logo, manifest, icons, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema for potential migrations at runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Create directories for SQLite data and uploads (mount volumes here)
RUN mkdir -p /app/db /app/uploads && \
    chown nextjs:nodejs /app/db /app/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check (matches docker-compose.yml and /api/health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["bun", "server.js"]