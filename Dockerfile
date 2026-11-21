# ============================================================================
# TRADELINK V6.1 — DOCKERFILE MULTI-STAGE DE PRODUCTION (FRONTEND & BACKEND)
# Architecture haute sécurité : Non-root user, isolation et images durcies
# ============================================================================

# ----------------------------------------------------------------------------
# Étape 1 : Construction des assets Frontend & Compilation Backend (Builder)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

RUN corepack enable && pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate && npx tsc --noEmit && npm run build && npm run build:backend

# ----------------------------------------------------------------------------
# Étape 2 : Image d'Exécution Backend Express API (Target: backend)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS backend

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

RUN addgroup --system --gid 10001 tradelink && \
    adduser --system --uid 10001 --ingroup tradelink tradelink

COPY --from=builder --chown=tradelink:tradelink /app/dist/server.cjs ./dist/server.cjs
COPY --from=builder --chown=tradelink:tradelink /app/package.json ./package.json
COPY --from=builder --chown=tradelink:tradelink /app/prisma ./prisma

USER tradelink

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/server.cjs"]

# ----------------------------------------------------------------------------
# Étape 3 : Image d'Exécution Frontend SPA (Target: runner)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5173
ENV HOST=0.0.0.0

RUN addgroup --system --gid 10001 tradelink && \
    adduser --system --uid 10001 --ingroup tradelink tradelink

RUN npm install -g serve@14.2.4

COPY --from=builder --chown=tradelink:tradelink /app/dist ./dist
COPY --from=builder --chown=tradelink:tradelink /app/package.json ./package.json

USER tradelink

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/ || exit 1

CMD ["serve", "-s", "dist", "-l", "5173"]
