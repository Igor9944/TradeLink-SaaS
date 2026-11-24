# PLAN DE TESTS ET VALIDATION AUTOMATISÉE — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`  
**Conformité** : Phase 13 (Sections 15.1 à 15.5)

---

## 1. Architecture des Suites de Tests (`src/server/tests/`)

Le dépôt comporte **40 fichiers de tests** sous `src/server/tests/` couvrant les tests unitaires, d'intégration, de bout en bout (E2E), de sécurité (SAST/DAST/anti-IDOR) et de performance/charge.

| Catégorie (Phase 13) | Commandes Exécutables (`package.json`) | Fichiers de Tests Principaux | Périmètre Vérifié |
|---|---|---|---|
| **15.1 Tests Unitaires** | `npm run test:accounting`, `npm run test:financial-engine`, `npm run test:catalog`, `npm run test:stock`, `npm run test:translation`, `npm run test:voice` | `accounting.module.test.ts`, `financial.engine.test.ts`, `catalog.central.test.ts`, `stock.management.test.ts`, `translation.engine.test.ts`, `voice.dictation.test.ts` | Calculs `Decimal.js` (`ACT/365`, amortissements, équilibre partie double), paliers B2B, réservations de stock, machines à états, glossaire et traduction FR/EN/AR/ES |
| **15.2 Tests d'Intégration** | `npm run test:express`, `npm run test:lot2-persistence`, `npm run test:lot3-actors`, `npm run test:lot4-commercial`, `npm run test:lot5-roomlive`, `npm run test:lot6-ai-gemini`, `npm run test:lot7-translation`, `npm run test:kyc`, `npm run test:ocr`, `npm run test:notifications`, `npm run test:support` | `express.server.test.ts`, `lot2.postgres.redis.persistence.test.ts`, `lot3.auth.users.actors.companies.test.ts`, `lot4.commercial.ecosystem.test.ts`, `lot5.roomlive.googlemeet.test.ts`, `lot6.ai.gemini.exclusivity.test.ts`, `lot7.translation.multilingual.rtl.test.ts`, `kyc.module.test.ts`, `ocr.intelligence.test.ts` | Persistance PostgreSQL 16 (PGlite/Prisma 68 modèles), Redis 7 multi-instances, KYC KMS, cycle devis->commande->facture->paiement->écriture->contre-passation, OCR (PDF/JPG/PNG/TIFF/BMP), Room Live & Google Meet API v2, exclusivité Gemini |
| **15.3 Tests E2E** | `npm run test:e2e`, `npm run test:harmonisation`, `npm run test:global-validation` | `e2e.playwright.test.ts`, `final.harmonisation.integration.test.ts`, `global.integration.validation.test.ts` | Parcours complets multi-acteurs : inscription OTP, connexion, création d'organisation, invitation membre, publication produit, devis, commande, paiement séquestre, facturation, import/export, OCR, Room Live (création Fournisseur + accès Client limité), traduction et Copilot IA |
| **15.4 Tests de Sécurité (SAST/DAST)** | `npm run test:lot1-audit`, `npm run test:security`, `npm run test:security-audit`, `npm run test:admin-security`, `node scripts/run-test.cjs src/server/tests/lot9.security.regression.test.ts` | `lot1.security.final.audit.test.ts`, `security.auth.test.ts`, `security.audit.sast.dast.test.ts`, `admin.security.audit.test.ts`, `lot9.security.regression.test.ts` | Argon2id RFC 9106, MFA TOTP RFC 6238 obligatoire Admin, anti-IDOR inter-organisations, webhooks signés HMAC-SHA256 & fail-closed 503, XSS itératif, CWE-1236, archives piégées (Zip-Bomb / Path Traversal), 0 `Math.random()`, 0 fuite d'identifiants démo dans `dist/assets/*.js` |
| **15.5 Tests de Charge & Performance** | `npm run test:lot8-performance`, `npm run test:performance`, `npm run test:load` | `lot8.performance.resilience.observability.test.ts`, `performance.bench.test.ts`, `scripts/load-test.k6.js` | Latence API p95 `< 200 ms`, concurrence, recherches, imports/exports, disjoncteurs (`CircuitBreaker`), Dead Letter Queue (`DLQ`) et métriques Prometheus |

---

## 2. Procédure d'Exécution Reproductible

```powershell
# 1. Validation du schéma Prisma (68 modèles) et du typage TypeScript strict
.\node_modules\.bin\prisma.cmd validate
npm.cmd run typecheck

# 2. Exécution des suites officielles de validation par lot et non-régression
npm.cmd run test:express
npm.cmd run test:lot1-audit
npm.cmd run test:lot2-persistence
npm.cmd run test:lot3-actors
npm.cmd run test:lot4-commercial
npm.cmd run test:lot5-roomlive
npm.cmd run test:lot6-ai-gemini
npm.cmd run test:lot7-translation
npm.cmd run test:lot8-performance
npm.cmd run test:security
npm.cmd run test:security-audit
npm.cmd run test:e2e
npm.cmd run test:harmonisation
npm.cmd run test:global-validation
node scripts/run-test.cjs src/server/tests/lot9.security.regression.test.ts

# 3. Compilation des builds de production Frontend et Backend
npm.cmd run build
npm.cmd run build:backend
```
