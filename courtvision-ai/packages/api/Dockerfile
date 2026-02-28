FROM node:20-alpine AS base
WORKDIR /app

# Install ffmpeg for video processing
RUN apk add --no-cache ffmpeg

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/api/package.json ./packages/api/
COPY packages/ai/package.json ./packages/ai/
COPY packages/database/package.json ./packages/database/
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/packages/api
RUN npm run build

FROM base AS runner
WORKDIR /app/packages/api

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package.json ./

USER fastify

EXPOSE 8080
ENV PORT 8080

CMD ["npm", "start"]
