# DOCUMENTATION TECHNIQUE GÉNÉRALE — TRADELINK SaaS B2B

**Version** : 6.2.0  
**Date** : 24 novembre 2026  
**Branche** : `main`

---

## 1. Vue d'Ensemble Technique

**TRADELINK SaaS** est une plateforme B2B multi-tenant d'import-export, de gestion commerciale, de logistique multimodale, de conformité KYC, de comptabilité en partie double, d'exploitation universelle de documents (Import/Export 26 formats & OCR/IDP), de visioconférence collaborative (Room Live WebRTC SFU & Google Meet API v2) et d'intelligence artificielle (exclusivement propulsée par Google Gemini).

---

## 2. Pile Technologique et Versions Réelles (`package.json`)

### 2.1 Runtime, Langage & Outils de Build
- **Node.js** : `>= 20.x` (cible ES2022 / `node20`).
- **TypeScript** : `5.7.2` (mode strict activé dans `tsconfig.json`).
- **Vite** : `6.0.5` avec `@vitejs/plugin-react` `4.3.4` (build SPA frontend avec Dead Code Elimination et découpage des chunks `vendor-react`, `vendor-icons`, `vendor-calc`).
- **esbuild** : `0.28.2` (compilation du serveur Express en bundle `dist/server.cjs`).
- **tsx** : `4.23.15` (exécution TypeScript directe pour le développement et l'orchestration des suites de tests).

### 2.2 Frontend SPA (`src/`)
- **React & React DOM** : `18.3.1`.
- **React Router DOM** : `6.28.0` (79 routes avec chargement paresseux `React.lazy` et garde `<RoleGuard>`).
- **Tailwind CSS** : `3.4.17` + `postcss` `8.4.49` + `autoprefixer` `10.4.20` + `clsx` `2.1.1`.
- **Lucide React** : `0.468.0` + système d'icônes 3D logistiques (`Icon3D.tsx`).
- **i18next & react-i18next** : `27.1.5` & `18.0.2` (support natif Français `fr` par défaut, Anglais `en`, Arabe `ar` avec bascule automatique `dir="rtl"`, et Espagnol `es`).

### 2.3 Backend API, Sécurité & Persistance (`src/server/`, `src/services/`, `prisma/`)
- **Express** : `5.3.0` (`src/server/app.ts`, `src/server/controllers/domain.controllers.ts`).
- **Helmet** : `8.3.0` (CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- **CORS** : `2.8.6` (filtrage strict par origine en production).
- **Zod** : `4.6.7` (`src/server/validators/schema.validator.ts`).
- **Argon2id & Cryptographie** : `@node-rs/argon2` `2.2.2`, `@noble/hashes` `2.4.0`, `jsonwebtoken` `9.0.3`, module natif `node:crypto` (SHA-256, HMAC-SHA256, HMAC-SHA1 pour TOTP RFC 6238, AES-256-GCM pour le chiffrement par enveloppe KMS).
- **Précision Financière** : `decimal.js` `10.4.3` (précision configurée à 34 chiffres significatifs, arrondi `ROUND_HALF_UP`).
- **ORM & Base de Données** : `prisma` & `@prisma/client` `6.4.1` (68 modèles PostgreSQL 16) + `@electric-sql/pglite` `0.5.17` (moteur PostgreSQL 16 WASM embarqué pour le développement et les tests hors-ligne).
- **Cache & Coordination Distribuée** : `ioredis` `6.0.0` (Redis 7 pour sessions uniques, révocation JWT, idempotence et rate-limiting).

---

## 3. Organisation du Code Source

```text
TradeLink-SaaS/
├── prisma/
│   ├── schema.prisma                 # 68 modèles PostgreSQL 16 (@db.Decimal(18, 4))
│   └── migrations/                   # Migrations SQL versionnées
├── infra/
│   ├── nginx/default.conf            # Reverse proxy TLS 1.2/1.3 & blocage /metrics (403)
│   └── vault/config.hcl              # Configuration HashiCorp Vault KMS persistant
├── scripts/
│   ├── run-test.cjs                  # Exécuteur de suites de tests TypeScript
│   └── load-test.k6.js               # Script de test de charge k6
├── src/
│   ├── App.tsx                       # Routeur SPA principal (79 routes protégées)
│   ├── main.tsx                      # Point d'entrée React 18
│   ├── types/index.ts                # Contrats et types du domaine TypeScript
│   ├── i18n/                         # Configuration i18next et dictionnaires (fr, en, ar, es)
│   ├── contexts/AppContext.tsx       # État applicatif, session et connecteur API
│   ├── components/                   # Composants UI réutilisables par domaine métier
│   ├── pages/                        # 7 fichiers de pages couvrant les 6 espaces rôles + public
│   ├── services/                     # 28 moteurs métiers purs et testables unitairement
│   └── server/
│       ├── app.ts                    # Configuration Express 5, middlewares HTTP & sondes
│       ├── server.ts                 # Bootstrap serveur HTTP & arrêt gracieux
│       ├── controllers/              # Routeur et contrôleurs API REST (/api/v1/*)
│       ├── services/                 # Orchestration transactionnelle inter-domaines
│       ├── repositories/             # Couche d'accès aux données et transactions ACID
│       ├── database/                 # Gestionnaires PostgreSQL 16 (Prisma/PGlite) et Redis 7
│       ├── middlewares/              # Auth, MFA Admin, RBAC/ABAC, Anti-IDOR, XSS, Erreurs
│       ├── validators/               # Schémas Zod v4 et validation de requêtes
│       ├── openapi/                  # Spécification OpenAPI 3.1 (/api/v1/docs/openapi.json)
│       └── tests/                    # 40 suites de tests unitaires, intégration, E2E et sécurité
├── Dockerfile                        # Image multi-stage production non-root (UID 10001)
├── Dockerfile.sandbox                # Image sandbox migration DB sans réseau (UID 20001)
├── docker-compose.yml                # Orchestration locale / développement
└── docker-compose.prod.yml           # Surcharge durcie de production (internal: true, cap_drop: ALL)
```

---

## 4. Principes d'Ingénierie Appliqués

1. **Séparation stricte des responsabilités** :
   - Les composants React (`src/pages/`, `src/components/`) gèrent uniquement l'affichage et les interactions utilisateur.
   - Les contrôleurs (`domain.controllers.ts`) valident les entrées (`assertFlatStringQuery`, `parseWithZod`, `sanitizeObjectFields`) et appliquent le contrôle d'accès (`requireAuthenticatedSession`, `enforceRBACAndOwnership`).
   - Les moteurs métiers (`src/services/*.ts`) encapsulent les règles déterministes (calculs `Decimal.js`, machines à états, cryptographie, parsing documentaire).
   - Les repositories (`domain.repositories.ts`, `prisma.client.ts`, `redis.client.ts`) assurent la persistance transactionnelle.
2. **Sécurité par défaut (Fail-Closed)** :
   - En production (`NODE_ENV=production`), l'absence de secret critique, de PostgreSQL 16 ou de Redis 7 bloque le démarrage.
   - Une passerelle webhook non configurée retourne `503 WEBHOOK_PROVIDER_NOT_CONFIGURED`.
   - Un démon ClamAV injoignable maintient le fichier en statut `QUARANTINED`.
   - Une extraction OCR non validée humainement ou à confiance `< 0.85` ne peut jamais déclencher d'écriture comptable ou de validation KYC automatique.
