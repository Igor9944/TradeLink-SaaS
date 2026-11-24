# GUIDE DE CONFIGURATION ET VARIABLES D'ENVIRONNEMENT — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Fichier de Référence** : `.env.example` (72 variables documentées sans secret en dur)

---

## 1. Politique de Configuration et Validation au Démarrage

En production (`NODE_ENV=production`), la fonction `validateProductionSecurityEnv()` (`src/server/app.ts`) contrôle la présence et l'entropie minimale (`>= 32` caractères, rejet des valeurs par défaut ou placeholders `REPLACE_WITH_*`) de tous les secrets critiques avant d'accepter le trafic HTTP.

Génération recommandée pour chaque secret cryptographique :
```bash
openssl rand -hex 32
```

---

## 2. Référentiel des Variables d'Environnement

### 2.1 Serveur, Réseau & Persistance
| Variable | Obligatoire en Prod | Description |
|---|:---:|---|
| `NODE_ENV` | Oui | `development`, `test` ou `production` |
| `PORT` | Oui | Port d'écoute du serveur Express (défaut : `3000`) |
| `CORS_ALLOWED_ORIGINS` | Oui | Liste blanche des origines autorisées séparées par virgule (ex: `https://app.tradelink.ma`) |
| `DATABASE_URL` | Oui | URL PostgreSQL 16 (`postgresql://user:pass@postgres:5432/tradelink?schema=public`) |
| `REDIS_URL` | Oui | URL Redis 7 (`redis://:password@redis:6379/0`) |

### 2.2 Secrets Cryptographiques, JWT, KMS & Audit
| Variable | Obligatoire en Prod | Description |
|---|:---:|---|
| `JWT_SECRET` / `JWT_ACCESS_SECRET` | Oui | Secret HMAC-SHA256 (>= 32 octets) pour les jetons d'accès JWT |
| `JWT_REFRESH_SECRET` | Oui | Secret dédié aux Refresh Tokens |
| `CSRF_SECRET` | Oui | Secret de signature des jetons anti-CSRF |
| `DOCUMENT_TOKEN_SECRET` | Oui | Secret HMAC pour les liens temporaires de téléchargement documentaire (15 min) |
| `OCR_HMAC_SECRET` | Oui | Secret HMAC pour les URL présignées du Studio OCR |
| `ROOM_ACCESS_TOKEN_SECRET` | Oui | Secret HMAC pour les jetons d'accès WebRTC SFU Room Live |
| `COMPANY_INVITE_HMAC_SECRET` | Oui | Secret HMAC pour les invitations de membres d'organisation |
| `KMS_VAULT_ADDR` & `KMS_VAULT_TOKEN` | Oui | Adresse et token d'authentification HashiCorp Vault KMS |
| `KMS_MASTER_KEY` | Oui | Clé maître KEK (256 bits) pour le chiffrement par enveloppe AES-256-GCM |
| `METRICS_SCRAPE_TOKEN` | Oui | Jeton Bearer (>= 16 chars) requis par Prometheus pour lire `/api/v1/metrics` |

### 2.3 Antivirus ClamAV & Stockage S3/MinIO
| Variable | Obligatoire en Prod | Description |
|---|:---:|---|
| `CLAMAV_HOST` & `CLAMAV_PORT` | Oui | Hôte et port TCP du démon antivirus `clamd` (défaut : `clamav:3310`) |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Oui | Configuration du stockage objet chiffré (MinIO ou AWS S3) |

### 2.4 Intégrations Externes (Google Gemini, Google Meet API v2 & Passerelles de Paiement)
| Variable | Obligatoire en Prod | Description |
|---|:---:|---|
| `GEMINI_API_KEY` | Oui (pour IA en ligne) | Clé API officielle Google Gemini (`gemini-1.5-pro` / `gemini-1.5-flash`) |
| `GOOGLE_MEET_CLIENT_ID` | Oui (pour Meet réel) | Client ID OAuth 2.0 Google Cloud Console |
| `GOOGLE_MEET_CLIENT_SECRET` | Oui (pour Meet réel) | Client Secret OAuth 2.0 Google Cloud Console |
| `GOOGLE_MEET_REFRESH_TOKEN` | Optionnel / OAuth | Refresh Token OAuth 2.0 autorisé sur les scopes `meetings.space.created` & `readonly` |
| `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` | Oui (si Stripe actif) | Clé API et secret HMAC webhook Stripe (`whsec_...`) |
| `KONNECT_WEBHOOK_SECRET`, `FLOUCI_WEBHOOK_SECRET`, `CMI_WEBHOOK_SECRET`, `WIRE_TRANSFER_WEBHOOK_SECRET`, `LETTER_OF_CREDIT_WEBHOOK_SECRET` | Selon passerelles actives | Secrets HMAC-SHA256 par passerelle (si absent en prod, la route retourne `503 WEBHOOK_PROVIDER_NOT_CONFIGURED`) |
