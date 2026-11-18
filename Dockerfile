# ============================================================================
# TRADELINK V6.0 — DOCKERFILE MULTI-STAGE DE PRODUCTION
# Architecture haute sécurité : Non-root user, isolation et image durcie
# ============================================================================

# ----------------------------------------------------------------------------
# Étape 1 : Construction des assets & Compilation TypeScript (Builder)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Installation de curl et dépendances système minimales
RUN apk add --no-cache libc6-compat

# Copie des manifestes de paquets
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Installation des dépendances de compilation
RUN npm install --ignore-scripts

# Copie de l'ensemble du code source
COPY . .

# Compilation TypeScript et Build des bundles Vite optimisés
RUN npx tsc --noEmit && npm run build

# ----------------------------------------------------------------------------
# Étape 2 : Image d'Exécution Minimale de Production (Runner)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5173
ENV HOST=0.0.0.0

# Sécurité : Création d'un groupe et d'un utilisateur applicatif non-root
RUN addgroup --system --gid 10001 tradelink && \
    adduser --system --uid 10001 --ingroup tradelink tradelink

# Installation d'un serveur HTTP léger et sécurisé pour distribuer la SPA
RUN npm install -g serve@14.2.4

# Copie des fichiers compilés depuis le builder
COPY --from=builder --chown=tradelink:tradelink /app/dist ./dist
COPY --from=builder --chown=tradelink:tradelink /app/package.json ./package.json

# Bascule vers l'utilisateur applicatif non privilégié
USER tradelink

# Exposition du port applicatif
EXPOSE 5173

# Healthcheck HTTP natif Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/ || exit 1

# Démarrage du service
CMD ["serve", "-s", "dist", "-l", "5173"]
