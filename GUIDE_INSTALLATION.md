# GUIDE D'INSTALLATION — TRADELINK SaaS B2B

**Version** : 6.2.0  
**Date** : 24 novembre 2026

---

## 1. Prérequis Système

- **Node.js** : version `20.x` ou `22.x` LTS.
- **Gestionnaire de paquets** : `npm` (inclus avec Node.js) ou `pnpm` `>= 9.x`.
- **Git** : version `2.40+`.
- **Pour le déploiement conteneurisé / production** :
  - Docker Engine `24.0+` & Docker Compose `v2.20+`
  - PostgreSQL `16`
  - Redis `7`
  - ClamAV Daemon (`clamd` port TCP `3310`)
  - HashiCorp Vault `1.16+`

---

## 2. Installation Locale (Développement & Validation)

### Étape 1 : Cloner le dépôt sur la branche `main`
```bash
git clone https://github.com/Igor9944/TradeLink-SaaS.git
cd "TradeLink-SaaS"
git checkout main
```

### Étape 2 : Installer les dépendances
```bash
npm install
```

### Étape 3 : Configurer les variables d'environnement
Copier le fichier modèle `.env.example` vers `.env` :
```bash
cp .env.example .env
```
> En mode développement (`NODE_ENV=development`), la plateforme démarre immédiatement avec PostgreSQL 16 PGlite WASM et le cluster Redis local partagé si aucun serveur PostgreSQL/Redis externe n'est démarré.

### Étape 4 : Valider le schéma Prisma et le typage TypeScript
```bash
npx prisma validate
npm run typecheck
```

### Étape 5 : Lancer l'application en mode développement
- **Frontend Vite SPA** (port `5173`) :
  ```bash
  npm run dev
  ```
- **Backend API Express** (port `3000`) :
  ```bash
  npm run dev:backend
  ```

### Étape 6 : Compiler les builds de production
```bash
# Build Frontend SPA (génère dist/index.html et dist/assets/*.js sans aucun compte démo)
npm run build

# Build Backend Express (génère dist/server.cjs)
npm run build:backend
```
