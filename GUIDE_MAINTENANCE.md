# GUIDE DE MAINTENANCE, SUPERVISION ET REPRISE APRÈS INCIDENT — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`

---

## 1. Supervision Continue et Observabilité (Prometheus & Sondes K8s)

1. **Sondes de Santé HTTP** :
   - `GET /api/v1/health` : état détaillé des dépendances (`database`, `redis`, `vault`, `clamav`, `gemini`).
   - `GET /api/v1/health/ready` : sonde Readiness (retourne `200` si PostgreSQL 16 et Redis 7 sont opérationnels, `503` sinon).
   - `GET /api/v1/health/live` : sonde Liveness (surveille l'uptime et la consommation mémoire Heap `< 1.5 Go`).
2. **Métriques Prometheus (`GET /api/v1/metrics`)** :
   - Protégé par le jeton Bearer `METRICS_SCRAPE_TOKEN` (ou session `ADMIN` MFA) et bloqué depuis Internet (`403` sur Nginx).
   - Expose les percentiles de latence (`p50`, `p95`, `p99`), les compteurs de requêtes HTTP par route/statut, l'état des disjoncteurs (`CircuitBreaker`) et la taille de la Dead Letter Queue (`DLQ`).
3. **Inspection des Disjoncteurs et de la DLQ** :
   - `GET /api/v1/circuit-breakers` : permet à l'administrateur de vérifier si un service externe (`gemini`, `meet`, `clamav`, `payment`) est en état `CLOSED`, `HALF_OPEN` ou `OPEN`.
   - `GET /api/v1/dlq/jobs` : liste les tâches asynchrones en échec pour retraitement contrôlé.

---

## 2. Rotation des Secrets et Clés KMS

- **Rotation de la Clé Maître KMS (KEK)** :
  - Exécutable sans interruption de service via l'interface `/admin/security` ou `POST /api/v1/admin/security/kms/rotate` (et `POST /api/v1/admin/kms/rotate`).
  - Les nouvelles pièces KYC et nouveaux jetons OAuth sont chiffrés avec la nouvelle version de clé tandis que les enveloppes existantes restent déchiffrables grâce à leur `encryptionKeyId`.
- **Vérification de la Chaîne de Journaux d'Audit** :
  - Exécuter régulièrement `GET /api/v1/admin/security/audit/verify-chain` pour certifier qu'aucune entrée du journal d'audit n'a été altérée (`previousHash -> currentHash` SHA-256).

---

## 3. Sauvegardes, Exercices de Restauration (Restore Drills) et Reprise (PRA/PCA)

1. **Création de Sauvegardes Chiffrées** :
   - Via `POST /api/v1/admin/security/backups` (sauvegarde complète ou incrémentale scellée par empreinte SHA-256).
2. **Exercice de Restauration en Sandbox Isolée (`Restore Drill`)** :
   - Avant toute restauration réelle, exécuter `POST /api/v1/admin/security/backups/:backupCode/drill` (`testBackupRestoreInSandbox`).
   - Le système restaure le snapshot dans un conteneur Sandbox éphémère isolé de la production, vérifie le hash SHA-256 et le nombre de tables/lignes restaurées (`DRILL_PASSED`).
3. **Restauration en Production sous Principe des 4 Yeux** :
   - Toute restauration en production (`POST /api/v1/admin/security/backups/:backupCode/restore-prod` ou `POST /api/v1/admin/backups/:id/restore`) exige obligatoirement la validation conjointe de **deux administrateurs distincts** (`initiatorId !== secondApproverId`).
