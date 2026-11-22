# ============================================================================
# TRADELINK V6.1 — DOCKERFILE MULTI-STAGE DE PRODUCTION (FRONTEND & BACKEND)
# Architecture haute sécurité : Non-root user, isolation et images durcies
# ============================================================================

# ----------------------------------------------------------------------------
# Étape 1 : Construction des assets Frontend & Compilation Backend (Builder)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

RUN corepack enable && \
    corepack prepare pnpm@9.15.4 --activate && \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm exec prisma generate && \
    pnpm run typecheck && \
    pnpm run build && \
    pnpm run build:backend

RUN mkdir -p /prod_modules/@prisma /prod_modules/.prisma /prod_modules/@electric-sql /prod_modules/@node-rs && \
    cp -RL node_modules/@prisma/client /prod_modules/@prisma/client && \
    PRISMA_GEN_DIR="$(node -e "const p = require('path'); console.log(p.dirname(require.resolve('.prisma/client/default', { paths: [p.dirname(require.resolve('@prisma/client/package.json'))] })))")" && \
    cp -RL "$PRISMA_GEN_DIR" /prod_modules/.prisma/client && \
    cp -RL node_modules/@electric-sql/pglite /prod_modules/@electric-sql/pglite && \
    cp -RL node_modules/@node-rs/argon2 /prod_modules/@node-rs/argon2 && \
    for pkg in node_modules/.pnpm/@node-rs+argon2-linux-*musl*/node_modules/@node-rs/argon2-linux-*musl*; do \
      if [ -d "$pkg" ]; then cp -RL "$pkg" "/prod_modules/@node-rs/$(basename "$pkg")"; fi; \
    done

# ----------------------------------------------------------------------------
# Étape 2 : Image d'Exécution Backend Express API (Target: backend)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS backend

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    HOME=/tmp \
    TMPDIR=/tmp \
    PRISMA_HOME_DIR=/tmp/prisma \
    XDG_CACHE_HOME=/tmp/.cache \
    XDG_DATA_HOME=/tmp/.local/share

RUN addgroup -g 10001 -S tradelink && \
    adduser -u 10001 -S -G tradelink -H -D tradelink

COPY --from=builder --chown=10001:10001 /app/dist/server.cjs ./dist/server.cjs
COPY --from=builder --chown=10001:10001 /app/package.json ./package.json
COPY --from=builder --chown=10001:10001 /app/prisma ./prisma
COPY --from=builder --chown=10001:10001 /prod_modules ./node_modules

USER 10001:10001

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/v1/health || exit 1

CMD ["node", "dist/server.cjs"]

# ----------------------------------------------------------------------------
# Étape 3 : Image d'Exécution Frontend SPA (Target: runner)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=5173 \
    HOST=0.0.0.0 \
    HOME=/tmp \
    TMPDIR=/tmp \
    XDG_CONFIG_HOME=/tmp/.config \
    XDG_CACHE_HOME=/tmp/.cache \
    NO_UPDATE_NOTIFIER=1

RUN addgroup -g 10001 -S tradelink && \
    adduser -u 10001 -S -G tradelink -H -D tradelink

RUN npm install -g serve@14.2.4 && \
    npm cache clean --force

COPY --from=builder --chown=10001:10001 /app/dist ./dist

USER 10001:10001

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:5173/ || exit 1

CMD ["serve", "-s", "dist", "-l", "5173", "--no-clipboard", "--no-port-switching"]
