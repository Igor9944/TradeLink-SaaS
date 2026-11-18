# TRADELINK V6.0 — GUIDE D'EXPLOITATION & DE MAINTENANCE SYSTÈME

Ce document fournit aux équipes d'infrastructure (DevOps / SRE / Sécurité) toutes les procédures d'exploitation, de surveillance et de maintenance de la plateforme **TRADELINK V6.0**.

---

## 1. ARCHITECTURE D'OBSERVABILITÉ & MONITORING

TRADELINK intègre une stack de surveillance en temps réel garantissant l'atteinte de l'objectif de disponibilité de **99.9%** :

### Composants de Supervision
1. **Prometheus (Port 9090)** : Collecte les métriques de latence des requêtes, de consommation mémoire, des connexions de pool PostgreSQL et des sessions actives Redis.
2. **Grafana (Port 3001)** : Visualisation des tableaux de bord synthétiques (latence API p95/p99, taux d'erreurs HTTP 4xx/5xx, utilisation du pool de connexions, débit réseau).
3. **Sentry** : Capture et agrégation en temps réel des exceptions applicatives avec traçabilité complète des piles d'appels et du `correlationId`.

### Métriques Clés à Surveiller (Alerting)
- **Latence API** : Alerte d'avertissement si p95 > 200 ms pendant plus de 2 minutes ; alerte critique si p95 > 500 ms.
- **Taux d'Échec** : Alerte si le taux de codes 5xx dépasse 0.1% sur une fenêtre de 5 minutes.
- **Saturation PostgreSQL** : Alerte si le nombre de connexions actives dépasse 85% du maximum configuré (`max_connections = 300`).
- **Mémoire Redis** : Alerte si la mémoire utilisée dépasse 80% du quota `maxmemory = 1536mb`.

---

## 2. GESTION DES JOURNAUX (LOGS) & ROTATION

Pour éviter toute saturation de l'espace disque tout en garantissant la conformité légale d'audit (rétention de 90 jours minimum) :

### Politique de Rotation Docker
Configurée nativement dans `docker-compose.prod.yml` :
- Driver : `json-file`
- Taille maximale par fichier : `50m` (50 Mo)
- Fichiers conservés : `5` fichiers tournants (maximum 250 Mo par service)

### Format des Logs Structurés
Chaque ligne de journal applicatif est sérialisée en JSON enrichi :
```json
{
  "timestamp": "2026-11-18T10:15:30.120Z",
  "level": "INFO",
  "correlationId": "corr-8841-e2e-2026",
  "userId": "usr-supp-01",
  "role": "FOURNISSEUR",
  "method": "POST",
  "path": "/api/v1/shipments",
  "statusCode": 201,
  "durationMs": 14.2,
  "dataSource": "POSTGRESQL_PRISMA"
}
```

---

## 3. PROCÉDURE DE ROTATION DES CLÉS MAÎTRESSES KMS (KEK)

La politique de sécurité impose une rotation trimestrielle de la clé maîtresse KEK :

### Déroulement de la Rotation
1. Connectez-vous avec un compte Administrateur disposant de la permission `KMS_KEY_MANAGEMENT`.
2. Déclenchez l'opération de rotation :
   ```bash
   curl -X POST http://localhost:5173/api/v1/admin/kms/rotate \
     -H "Authorization: Bearer <TOKEN_ADMIN>" \
     -H "Content-Type: application/json" \
     -d '{"keyAlias": "alias/tradelink-prod-kek-v6"}'
   ```
3. HashiCorp Vault incrémente le numéro de version de la KEK (`version: 6 -> 7`).
4. Toutes les nouvelles écritures de données utilisent la version 7 pour chiffrer les nouvelles clés de données (DEK). Les données chiffrées avec les versions précédentes demeurent lisibles de manière transparente.
5. L'opération est scellée dans le journal d'audit append-only avec horodatage cryptographique.

---

## 4. OPTIMISATION DES PERFORMANCES POSTGRESQL & REDIS

### Réglages PostgreSQL Recommandés (16 Go RAM Hôte)
Dans `/etc/postgresql/16/main/postgresql.conf` :
- `shared_buffers = 4GB`
- `effective_cache_size = 12GB`
- `maintenance_work_mem = 1GB`
- `checkpoint_completion_target = 0.9`
- `wal_buffers = 16MB`
- `default_statistics_target = 100`
- `random_page_cost = 1.1` (optimisé pour SSD NVMe)

### Réglages Redis 7
Dans `/etc/redis/redis.conf` :
- `maxmemory 2gb`
- `maxmemory-policy allkeys-lru` (éviction automatique des caches les moins récemment utilisés tout en protégeant les sessions actives)
- `appendonly yes` (persistance continue sur disque toutes les secondes)

---

## 5. GUIDE DE DÉPANNAGE (TROUBLESHOOTING)

| Symptôme | Cause Probable | Solution de Résolution |
| :--- | :--- | :--- |
| **HTTP 401 `SESSION_REVOKED_SINGLE_ACCESS_POLICY`** | L'utilisateur s'est connecté depuis un second appareil ou navigateur. | Comportement normal de sécurité. L'utilisateur doit se reconnecter sur son terminal actuel. |
| **HTTP 403 `COMPTABLE_STAGE3_READONLY_SOURCE_DATA`** | Un profil Comptable a tenté d'ajouter/modifier un produit, commande ou stock. | Violation de règle régalienne Stage 3. Seuls les Fournisseurs ou Admins peuvent créer/modifier le catalogue. |
| **HTTP 409 `EMAIL_ALREADY_REGISTERED`** | Tentative d'inscription avec un email déjà existant. | Inviter l'utilisateur à utiliser la procédure de réinitialisation de mot de passe sécurisée. |
| **HTTP 429 `OTP_MAX_ATTEMPTS_EXCEEDED`** | 5 codes OTP erronés consécutifs saisis. | Le défi OTP est verrouillé. Demander une nouvelle émission d'OTP après expiration du délai. |
| **HTTP 500 avec `correlationId`** | Erreur interne inattendue. | Rechercher le `correlationId` dans les logs Grafana/Prometheus ou Sentry pour identifier la source exacte. |
| **Latence anormale > 500 ms** | Requête non indexée ou saturation du pool de connexions. | Vérifier `docker compose logs postgres` et vérifier les index B-Tree sur les colonnes de jointure. |
