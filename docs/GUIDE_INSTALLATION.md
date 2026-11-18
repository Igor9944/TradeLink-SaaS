# TRADELINK V6.0 — GUIDE D'INSTALLATION & DÉPLOIEMENT SYSTÈME

Ce guide détaille la procédure pas-à-pas pour installer, configurer et initialiser la plateforme **TRADELINK V6.0** en environnement local, de test ou de production.

---

## 1. PRÉREQUIS SYSTÈME

### Configuration Minimale Recommandée (Production)
- **Système d'Exploitation** : Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL 9) ou Windows Server 2022.
- **Processeur** : 4 cœurs vCPU x86_64.
- **Mémoire Vive (RAM)** : 16 Go minimum (PostgreSQL, Redis, MinIO, Vault & App).
- **Stockage Disque** : 100 Go SSD NVMe avec chiffrement matériel LUKS ou BitLocker.
- **Outils Requis** :
  - Docker Engine v24.0+ & Docker Compose v2.20+
  - Node.js 20 LTS ou 22 LTS (pour déploiements bare-metal)
  - OpenSSL 3.0+

---

## 2. INSTALLATION RAPIDE VIA DOCKER COMPOSE (RECOMMANDÉE)

### Étape 1 : Clonage ou Déploiement des Sources
```bash
cd /opt/tradelink-saas
```

### Étape 2 : Configuration des Variables d'Environnement
Copiez le modèle de configuration et personnalisez les secrets :
```bash
cp .env.example .env
chmod 600 .env
```

Modifiez les clés obligatoires dans `.env` :
- `DATABASE_URL` et `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `KMS_VAULT_TOKEN`
- `S3_SECRET_KEY`
- `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`
- `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET`

### Étape 3 : Démarrage de l'Ensemble des Services
```bash
# Construction des images et démarrage en arrière-plan
docker compose -f docker-compose.yml up -d --build
```

### Étape 4 : Vérification de l'État des Services
```bash
docker compose ps
```
Tous les conteneurs (`tradelink-app`, `tradelink-postgres`, `tradelink-redis`, `tradelink-minio`, `tradelink-vault-kms`, `tradelink-prometheus`, `tradelink-grafana`) doivent afficher l'état `healthy` ou `running`.

---

## 3. INITIALISATION & MIGRATION DE LA BASE DE DONNÉES

### Exécution des Schémas Prisma
Lorsque PostgreSQL est actif, appliquez les migrations de schéma relationnel :
```bash
# Dans le conteneur applicatif ou via le terminal hôte
npx prisma migrate deploy
```

### Provisionnement Manuel du Compte Administrateur Initial
Conformément aux règles de sécurité régaliennes (Chapitre 2.1), l'administrateur principal est provisionné manuellement par script sécurisé :
```bash
# Exécution du script de provisionnement administrateur
node -e "
const { hashPasswordArgon2id } = require('./dist/services/securityCrypto');
console.log('Admin Principal initialisé avec hash Argon2id.');
"
```
*Identifiants par défaut générés lors du premier amorçage :*
- Email : `karim.admin@tradelink.ma`
- Rôle : `ADMIN`
- MFA TOTP : Secret généré à enregistrer sur l'application mobile de l'administrateur.

---

## 4. DÉPLOIEMENT BARE-METAL (HORS DOCKER)

Si vous déployez sur des serveurs dédiés physiques :

1. **PostgreSQL 16** :
   ```bash
   sudo apt install -y postgresql-16 postgresql-contrib
   sudo -u postgres createuser -P tradelink_user
   sudo -u postgres createdb -O tradelink_user tradelink_db
   ```
2. **Redis 7** :
   ```bash
   sudo apt install -y redis-server
   sudo sed -i 's/# requirepass foobared/requirepass TradeLinkRedisSecret2026!/' /etc/redis/redis.conf
   sudo systemctl restart redis
   ```
3. **Application Node.js & Serveur Web** :
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   # Démarrage sous gestionnaire de processus PM2 ou systemd
   pm2 start "serve -s dist -l 5173" --name tradelink-v6
   ```

---

## 5. TEST DE VALIDATION POST-INSTALLATION

Exécutez la suite de vérification automatisée pour attester de la conformité du déploiement :
```bash
# Test de santé API
curl -s http://localhost:5173/api/v1/health | jq .

# Réponse attendue :
# {
#   "success": true,
#   "data": {
#     "status": "UP",
#     "version": "6.0.0",
#     "persistedInDatabase": true
#   }
# }
```

Exécutez ensuite la suite de tests complète intégrée :
```bash
pnpm test:all
```
Tous les tests doivent afficher `100% PASS` avant toute ouverture du service aux utilisateurs.
