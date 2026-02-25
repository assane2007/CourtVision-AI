# Dockerfile — CourtVision API (Fastify + BullMQ Worker)
# Utilisé pour le déploiement sur Railway

FROM node:20-alpine AS base
RUN apk add --no-cache ffmpeg python3 make g++

WORKDIR /app

# Copier les fichiers de dépendances du monorepo
COPY package.json package-lock.json tsconfig.json ./
COPY packages/api/package.json packages/api/
COPY packages/ai/package.json packages/ai/
COPY packages/shared/package.json packages/shared/

# Installer les dépendances
RUN npm ci --workspace=@courtvision/api --workspace=@courtvision/ai --workspace=@courtvision/shared --include-workspace-root

# Copier le code source
COPY packages/api/ packages/api/
COPY packages/ai/ packages/ai/
COPY packages/shared/ packages/shared/

# Build TypeScript
RUN npm run build --workspace=@courtvision/shared || true
RUN npm run build --workspace=@courtvision/ai
RUN npm run build --workspace=@courtvision/api

# ── Production stage ──
FROM node:20-alpine AS production
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY --from=base /app/package.json /app/package-lock.json /app/tsconfig.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/api/dist ./packages/api/dist
COPY --from=base /app/packages/api/package.json ./packages/api/
COPY --from=base /app/packages/ai/dist ./packages/ai/dist
COPY --from=base /app/packages/ai/package.json ./packages/ai/
COPY --from=base /app/packages/shared/ ./packages/shared/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "packages/api/dist/server.js"]
