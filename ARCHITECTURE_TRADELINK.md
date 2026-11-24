# ARCHITECTURE LOGICIELLE ET SYSTÈME — TRADELINK SaaS B2B

**Version** : 6.2.0  
**Date** : 24 novembre 2026  
**Branche** : `main`

---

## 1. Architecture Globale en Couches

L'architecture de **TRADELINK SaaS** suit un modèle modulaire en couches strictes garantissant l'isolation multi-tenant, la testabilité de bout en bout et la résilience en production :

1. **Couche Présentation (SPA React 18 / Vite 6)** :
   - Découpage asynchrone par espace métier (`PublicAndAuthPages`, `AdminWorkspacePages`, `ClientWorkspacePages`, `SupplierWorkspacePages`, `CarrierWorkspacePages`, `AccountingWorkspacePages`, `SupportWorkspacePages`, `CarrierAccountingSupportAndTransversalPages`).
   - Protection client par `<RoleGuard>` (redirection immédiate si rôle non autorisé ou si `ADMIN` sans MFA TOTP validé).
   - Internationalisation native (`i18next` : `fr`, `en`, `ar` RTL, `es`) fonctionnant hors-ligne dès l'installation.
2. **Couche Passerelle & Sécurité Périmétrique (Nginx 1.27 + Express 5 Middlewares)** :
   - Terminaison TLSv1.2 / TLSv1.3, HSTS, blocage externe HTTP `403` de `/metrics`.
   - Middlewares Express : `helmet`, `cors` strict, capture `req.rawBody` pour signatures HMAC, protection Express 5 `assertFlatStringQuery`, assainissement XSS itératif à point fixe `sanitizeHtmlInput`, vérification CSRF et rate-limiting Redis.
3. **Couche Contrôleurs & Validation (`src/server/controllers/domain.controllers.ts`, `schema.validator.ts`)** :
   - Validation systématique des payloads via 25+ schémas **Zod v4**.
   - Gestion de l'idempotence (`Idempotency-Key`) sur les mutations critiques (`POST`, `PUT`).
   - Application systématique de `requireAuthenticatedSession` et `enforceRBACAndOwnership`.
4. **Couche Moteurs Métiers (`src/services/*.ts` & `src/server/services/domain.services.ts`)** :
   - 28 services spécialisés sans couplage à l'interface HTTP.
   - Résilience des appels externes via disjoncteurs (`geminiCircuitBreaker`, `meetCircuitBreaker`, `clamAvCircuitBreaker`, `paymentCircuitBreaker`) et file de lettres mortes (`DeadLetterQueueManager`).
5. **Couche Persistance, Cache & Stockage (`src/server/database/`, `prisma/schema.prisma`)** :
   - **PostgreSQL 16** (68 modèles Prisma, transactions ACID, précision financière `Decimal(18, 4)`).
   - **Redis 7** (`ioredis` : registre de session unique, révocation de JTI JWT, verrous distribués, cache d'idempotence).
   - **Stockage Documentaire & KMS** : MinIO / S3 compatible + HashiCorp Vault KMS (chiffrement par enveloppe AES-256-GCM) + démon antivirus ClamAV (`clamd:3310`).

---

## 2. Architecture Multi-Tenant et Isolation des Organisations

Chaque ressource métier est rattachée à un propriétaire et/ou une entreprise (`companyId`, `clientId`, `supplierId`, `carrierId`, `userId`) :
- **Contrôle d'accès systématique côté serveur** : aucune requête ne fait confiance aux paramètres du frontend. Les listes sont filtrées à la source par l'identifiant de l'acteur authentifié, et les accès unitaires par identifiant vérifient la propriété avant toute lecture ou mutation (`403 RESOURCE_OWNERSHIP_VIOLATION`).
- **Séparation des tâches (Segregation of Duties)** :
  - Le rôle `COMPTABLE` est en lecture seule stricte sur les données commerciales sources (`403 COMPTABLE_STAGE3_READONLY_SOURCE_DATA`).
  - Le rôle `CLIENT` ne peut jamais créer, organiser, modérer ou administrer une Room Live (`403 CLIENT_ROOM_CREATION_FORBIDDEN` / `CLIENT_ROOM_ADMINISTRATION_FORBIDDEN`).
  - Les opérations critiques d'administration (migration de base de données en Sandbox, restauration d'une sauvegarde en production) imposent le **principe des 4 yeux** (double approbation par deux administrateurs distincts : `initiatorId !== approverId`).

---

## 3. Topologie Réseau de Production (`docker-compose.yml` + `docker-compose.prod.yml`)

- **`tradelink-dmz`** : contient uniquement le reverse proxy `nginx` exposé sur les ports `80` et `443`.
- **`tradelink-internal` (`internal: true`)** : réseau privé sans accès sortant direct depuis Internet, hébergeant `backend` (UID `10001`), `app` (UID `10001`), `postgres:16-alpine`, `redis:7-alpine`, `minio`, `vault:1.16.2`, `clamav:1.4`, `prometheus` et `grafana`.
- **Sandbox d'analyse de bases (`Dockerfile.sandbox`)** : conteneur isolé (`USER 20001:20001`, `network_mode: "none"`, aucun secret de production injecté, quotas CPU/RAM stricts) dédié à l'inspection des fichiers `SQL`, `SQLITE`, `BAK`, `DBF` et `CDX`.
