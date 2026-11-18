# TRADELINK V6.0 — GUIDE DE SAUVEGARDE & RESTAURATION CONTRÔLÉE

Ce guide formalise la politique de continuité d'activité (PCA) et de reprise après sinistre (PRA) de **TRADELINK V6.0**.

---

## 1. OBJECTIFS DE SERVICE (SLA / RPO / RTO)

| Indicateur | Objectif | Mécanisme de Mise en Œuvre |
| :--- | :--- | :--- |
| **RPO** (Perte de données maximale admissible) | **< 1 Heure** | Snapshots complets quotidiens + archivage continu des journaux de transactions (WAL) PostgreSQL. |
| **RTO** (Délai maximal de reprise de service) | **< 30 Minutes** | Restauration automatisée conteneurisée et bascule de trafic DNS/Load Balancer. |
| **Disponibilité Cible** | **99.9%** | Architecture redondante N+1 avec sondes de santé continues. |

---

## 2. TYPES DE SAUVEGARDES & FORMATS

1. **Sauvegarde Programmée Quotidienne (`FULL_SCHEDULED`)** : Déclenchée chaque nuit à 02:00 UTC. Dump SQL complet compressé et chiffré.
2. **Snapshot Manuel à la Demande (`MANUAL_SNAPSHOT`)** : Déclenché par un administrateur habilité avant une intervention d'exploitation.
3. **Sauvegarde Pré-Migration (`PRE_MIGRATION`)** : Générée automatiquement avant toute application de mise à jour de schéma de données ou import de volume important.

---

## 3. SÉCURITÉ CRYPTOGRAPHIQUE & CHIFFREMENT ENVELOPPE

Chaque archive de sauvegarde est traitée selon un protocole de sécurité strict :
1. **Chiffrement par Enveloppe AES-256-GCM** : Une clé éphémère de données (DEK) est générée pour chiffrer l'archive, puis cette DEK est chiffrée par la clé maîtresse KEK stockée dans le HSM/Vault.
2. **Empreinte d'Intégrité SHA-256** : Une empreinte SHA-256 de 256 bits (64 caractères hexadécimaux) est calculée sur le flux chiffré scellé et consignée dans le journal d'audit.
3. **Stockage Distant Sécurisé** : L'archive est poussée vers un bucket de stockage immuable compatible S3 avec verrouillage WORM (*Write Once, Read Many*) interdisant toute altération ou suppression prématurée.

---

## 4. PROCÉDURE DE VÉRIFICATION D'INTÉGRITÉ SHA-256

Avant toute tentative de restauration, l'administrateur ou le job planifié doit vérifier l'intégrité de la sauvegarde :

```bash
# Commande de vérification d'intégrité de l'archive
curl -X POST http://localhost:5173/api/v1/admin/backups/verify \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"backupId": "bak-20261118-001"}'
```

*Vérifications effectuées :*
- Recalcul de l'empreinte SHA-256 sur le fichier stocké.
- Comparaison stricte avec l'empreinte enregistrée lors de la création du snapshot.
- Si un seul octet diffère, le statut bascule en `CORRUPTED` et l'archive est écartée.

---

## 5. TEST DE RESTAURATION EN SANDBOX ISOLÉE

La réglementation TRADELINK interdit de restaurer directement un snapshot sur la base de données de production sans qualification préalable en Sandbox :

1. Un conteneur Sandbox éphémère sans accès réseau (`network_mode: none`) est instancié.
2. Le flux de données est déchiffré à la volée en mémoire vive via le KMS et injecté dans une instance temporaire.
3. Le moteur valide la cohérence des 8 tables principales (Produits, Commandes, Factures, Écritures, Devis, Expéditions, KYC, Audit).
4. Le rapport de validation confirme :
   - `isolationGuaranteed: true`
   - `tablesRestoredCount: 8`
   - `productionContaminationRisk: 0%`

---

## 6. WORKFLOW DE DOUBLE APPROBATION (DUAL CONTROL)

La restauration effective sur la base de production ne peut être menée par un administrateur isolé :

```
[Admin #1 : Initiateur]
         │
         ▼
Lance la demande de restauration :
Génération du plan d'exécution & calcul du planHash (SHA-256)
         │
         ▼
[Admin #2 : Approbateur Distinct]
         │
         ├── Tentative d'auto-approbation par Admin #1 ? ──> REJET STRICT (403 SELF_APPROVAL_FORBIDDEN)
         │
         ├── planHash fourni != planHash attendu ? ────────> REJET STRICT (400 PLAN_HASH_MISMATCH)
         │
         └── Validation conforme par Admin #2 distinct ────> RESTAURATION EXÉCUTÉE
```

---

## 7. RUNBOOK DE RESTAURATION EN CAS D'URGENCE

En cas de corruption matérielle ou d'incident majeur nécessitant une restauration complète :

```bash
# 1. Mise en maintenance du cluster
docker compose stop app

# 2. Vérification de la dernière sauvegarde saine
sha256sum /backups/tradelink-prod-20261118.sql.enc

# 3. Restauration PostgreSQL sous contrôle d'intégrité
docker compose exec postgres psql -U tradelink_user -d tradelink_db -f /sandbox/clean_restore.sql

# 4. Redémarrage applicatif et vérification du healthcheck
docker compose start app
curl -s http://localhost:5173/api/v1/health | grep '"status":"UP"'
```
