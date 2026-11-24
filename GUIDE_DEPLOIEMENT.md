# GUIDE DE DÉPLOIEMENT ET COMPARATIF D'HÉBERGEMENT — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`  
**Conformité** : Phase 14 & Phase 15 (Sections 16 & 17)

---

## 1. Comparatif des Options d'Hébergement Compatibles (Section 17)

Conformément à la Phase 15, l'architecture de **TRADELINK SaaS** nécessite : un serveur Node.js 20 persistant (ou conteneur Docker), une base PostgreSQL 16, une instance Redis 7, un stockage objet S3/MinIO et, pour l'analyse antivirus complète, un démon ClamAV (`clamd` consommant ~1,2 Go de RAM pour sa base de signatures).

| Option / Fournisseur | Offre Gratuite / Quotas Gratuits | Coût Estimé Production | PostgreSQL 16 & Redis 7 | Support ClamAV (`clamd`) & Sandbox Docker | Disponibilité, Sécurité & Limites |
|---|---|---|---|---|---|
| **1. VPS Cloud Dédié (Hetzner Cloud CX22/CX32, OVHcloud, DigitalOcean) + Docker Compose** | Crédits d'essai (souvent 60j), pas de plan gratuit permanent | **Faible coût (~6 € à 14 € / mois)** | Conteneurisés (`postgres:16-alpine`, `redis:7-alpine`) ou managés | **100 % Compatible** (`docker-compose.prod.yml` complet avec Nginx, Vault, ClamAV, Sandbox UID 20001) | **Recommandé pour l'architecture complète** : contrôle total du réseau `internal: true`, RAM suffisante (4-8 Go) pour ClamAV |
| **2. Architecture Hybride Cloud Managé (Render / Railway / Fly.io + Neon PostgreSQL + Upstash Redis + Cloudflare R2)** | **Quotas gratuits disponibles** : Neon (0,5 Go PG16 gratuit), Upstash (10k req/j Redis gratuit), Cloudflare R2 (10 Go S3 gratuit) | **0 € (Validation/Proto Limité)** à **~15–25 $ / mois** (sans mise en veille) | **Oui** (Neon PostgreSQL 16 serverless + Upstash Redis TLS) | Limité sur plan gratuit (512 Mo RAM insuffisants pour `clamd`, nécessite service dédié >= 2 Go RAM) | Attention : les conteneurs web gratuits (Render Free) s'endorment après 15 min d'inactivité (cold start ~30s) |
| **3. Cloud Hyperscaler (Google Cloud Run + Cloud SQL PG16 + Memorystore Redis + Cloud Storage + Secret Manager)** | Crédits initiaux 300 $ (90j) + Free Tier partiel sur Cloud Run | **Payant à l'usage (~50 $ à 150 $+ / mois)** | **Oui** (Services managés haute disponibilité multi-zones) | Oui via sidecar Cloud Run ou VM Compute Engine dédiée | Haute disponibilité SLA 99,95 %, coût supérieur, adapté à la montée en charge industrielle |

> **Distinction importante** : Les plans gratuits (Neon Free, Upstash Free, Render Free) conviennent pour un **environnement de préproduction/validation Internet à coût zéro**, mais présentent des limites strictes de RAM (impossibilité d'héberger le démon ClamAV 1,2 Go dans 512 Mo), de stockage (0,5 Go DB) et de mise en veille. Pour une exploitation B2B continue avec ClamAV, Vault et Sandbox Docker, un VPS Linux (>= 4 Go RAM) exécutant `docker-compose.prod.yml` offre le meilleur rapport coût/sécurité.

---

## 2. Procédure de Déploiement en Production (`docker-compose.prod.yml`)

### Étape 1 : Préparation de l'hôte Linux et des certificats TLS
1. Installer Docker Engine et Docker Compose v2 sur le serveur cible.
2. Configurer les enregistrements DNS `A` / `AAAA` pointant vers l'IP publique du serveur.
3. Placer les certificats TLS (Let's Encrypt / Certbot) dans `./infra/nginx/certs/fullchain.pem` et `./infra/nginx/certs/privkey.pem`.
4. Renseigner le fichier `.env` de production avec des secrets générés par `openssl rand -hex 32`.

### Étape 2 : Validation des manifests et démarrage de la pile
```bash
# 1. Vérifier la fusion des configurations Docker Compose
docker compose -f docker-compose.yml -f docker-compose.prod.yml config -q

# 2. Construire et démarrer les services en attendant l'état healthy (--wait)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --wait

# 3. Appliquer les migrations Prisma sur PostgreSQL 16
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

---

## 3. Procédure de Mise à Jour, Sauvegarde et Rollback

- **Sauvegarde préalable obligatoire avant toute mise à jour** :
  ```bash
  docker compose exec postgres pg_dump -U tradelink -Fc tradelink > backup_pre_deploy_$(date +%Y%m%d_%H%M%S).dump
  ```
- **Rollback immédiat en cas d'anomalie post-déploiement** :
  1. Revenir au tag d'image Docker précédent (`IMAGE_TAG=<previous_sha> docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --wait backend app`).
  2. Vérifier les sondes `GET /api/v1/health/ready` et `GET /api/v1/health/live`.

---

## 4. Protocole de Validation Post-Déploiement sur Internet (Phase 14 / Section 16)

Dès que le déploiement Internet est autorisé et exécuté sur le domaine cible (`https://<domaine>`), exécuter la checklist de validation réelle :
1. **HTTPS, Certificats & En-têtes** : `curl -sI https://<domaine>/api/v1/health` (vérifier TLS 1.2/1.3, `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options: DENY`).
2. **Protection `/metrics`** : `curl -sk -o /dev/null -w "%{http_code}\n" https://<domaine>/api/v1/metrics` -> doit retourner **`403`** via Nginx.
3. **Sondes de Santé Réelles** : `GET /api/v1/health/ready` -> doit afficher `postgresql16: "READY"`, `redis7Cluster: "READY"`, `clamAvDaemon: "CONFIGURED"`, `hashiCorpVaultKms: "READY"`.
4. **Parcours E2E Authentifiés** : Inscription OTP, Connexion Argon2id, MFA TOTP Admin, Dépôt KYC chiffré KMS, Commande B2B, Webhook paiement signé HMAC, Import/Export multi-formats, OCR TIFF/PDF, création Room Live Google Meet v2 par un Fournisseur et vérification du rejet `403` pour un Client.
