# TRADELINK V6.0 — GUIDE D'ADMINISTRATION SYSTÈME & GOUVERNANCE

Ce document détaille les responsabilités régaliennes, les mécanismes de sécurité renforcée et les procédures d'administration de la plateforme **TRADELINK V6.0**.

---

## SOMMAIRE

1. [Principes de Gouvernance & Provisionnement](#1-principes-de-gouvernance--provisionnement)
2. [Authentification Forte, MFA Obligatoire & Sessions](#2-authentification-forte-mfa-obligatoire--sessions)
3. [Double Approbation Administrative (*Dual Control Policy*)](#3-double-approbation-administrative-dual-control-policy)
4. [Gestionnaire KMS & Chiffrement par Enveloppe AES-256-GCM](#4-gestionnaire-kms--chiffrement-par-enveloppe-aes-256-gcm)
5. [Sandbox Éphémère Isolée (Analyse de Dumps & Migration)](#5-sandbox-éphémère-isolée-analyse-de-dumps--migration)
6. [Sauvegardes Cryptographiques & Restauration Contrôlée](#6-sauvegardes-cryptographiques--restauration-contrôlée)
7. [Journal d'Audit Append-Only & Chaîne de Hachage Immuable](#7-journal-daudit-append-only--chaîne-de-hachage-immuable)

---

## 1. PRINCIPES DE GOUVERNANCE & PROVISIONNEMENT

- **Provisionnement Manuel Exclusif** : Aucun compte Administrateur ne peut être créé via l'interface d'inscription publique. Toute tentative d'inscription publique demandant le rôle `ADMIN` est rejetée avec le code d'erreur `403 ADMIN_PROVISIONED_MANUALLY_ONLY` et consignée dans le journal d'audit de sécurité.
- **Principe du Moindre Privilège** : Les administrateurs n'ont pas accès aux données bancaires brutes en clair (les clés DEK et les IBAN sont masqués ou chiffrés par enveloppe KMS).

---

## 2. AUTHENTIFICATION FORTE, MFA OBLIGATOIRE & SESSIONS

### MFA TOTP Obligatoire
- Tout accès au profil Administrateur exige la validation d'un second facteur **TOTP (RFC 6238)** via application d'authentification (Google Authenticator, Microsoft Authenticator).
- L'algorithme de dérivation de mot de passe est **Argon2id** (paramètres durcis : $m=65536$, $t=3$, $p=4$).

### Single Active Session Policy
- Un utilisateur ne peut détenir qu'une seule session active simultanée sur la plateforme.
- Toute nouvelle connexion révoque instantanément la session précédente. L'ancienne session reçoit immédiatement un code HTTP `401 SESSION_REVOKED_SINGLE_ACCESS_POLICY`.

---

## 3. DOUBLE APPROBATION ADMINISTRATIVE (*DUAL CONTROL POLICY*)

Afin de prévenir toute erreur critique ou acte malveillant interne, les actions à haut risque nécessitent obligatoirement l'approbation de **deux administrateurs distincts** :

### Opérations Assujetties
1. Restauration de base de données en production (`BACKUP_RESTORE_TO_PROD`).
2. Promotion d'un jeu de données depuis la Sandbox vers la Production (`SANDBOX_PROMOTE_TO_PROD`).
3. Destruction ou révocation d'une clé maîtresse KMS (`KMS_DESTRUCT_KEY`).

### Règles Régaliennes Inviolables
- **Interdiction stricte d'auto-approbation** : L'administrateur qui initie l'opération ne peut en aucun cas agir en tant que second approbateur. Toute tentative génère l'erreur `SELF_APPROVAL_FORBIDDEN`.
- **Scellement par empreinte de plan (`planHash`)** : Lors de l'initiation, une empreinte SHA-256 du plan d'exécution exact est générée. Le second approbateur doit valider cette empreinte exacte. Si un paramètre est altéré entre l'initiation et la validation, l'opération est avortée avec l'erreur `PLAN_HASH_MISMATCH`.

---

## 4. GESTIONNAIRE KMS & CHIFFREMENT PAR ENVELOPPE AES-256-GCM

TRADELINK met en œuvre une architecture de chiffrement par enveloppe garantissant qu'aucun secret brut ou clé de chiffrement des données (DEK) ne réside en clair dans la base de données.

```
                    ┌────────────────────────────┐
                    │  HashiCorp Vault / KMS HSM │
                    │     Clé Maître (KEK)       │
                    └──────────────┬─────────────┘
                                   │ Chiffre / Déchiffre la DEK
                                   ▼
┌─────────────────────────┐  DEK Chiffrée   ┌───────────────────────────┐
│     Donnée Sensible     │ ─────────────── │    DEK Éphémère en RAM    │
│ (IBAN, Document KYC...) │ ◄────────────── │ (AES-256-GCM, détruite)   │
└─────────────────────────┘  Chiffrement    └───────────────────────────┘
```

- **Rotation Périodique des Clés** : La KEK maître fait l'objet d'une rotation automatique trimestrielle ou à la demande. Les données existantes demeurent déchiffrables grâce à l'historique des versions de clés conservé dans Vault.
- **Zéro Clé Brute dans les Logs** : Les ARN des clés sont systématiquement masqués (`••••••••-••••-9910-...`) dans toutes les sorties console et rapports d'audit.

---

## 5. SANDBOX ÉPHÉMÈRE ISOLÉE (ANALYSE DE DUMPS & MIGRATION)

La Sandbox permet d'importer, parser et tester des fichiers de données volumineux ou hétérogènes sans impacter la base de production.

- **Formats Pris en Charge** : CSV (RFC 4180), XLSX (SpreadsheetML), JSON, SQL (ANSI/Postgres), BAK (MSSQL stream), DBF (FoxPro/dBase III/IV) et CDX (Index B-Tree).
- **Isolation Réseau Physique** : Les conteneurs de sandbox fonctionnent en `network_mode: "none"`, interdisant toute émission ou réception de paquets vers l'extérieur ou le cluster principal.
- **Analyse Automatisée** : Détection de schéma, comptage des lignes, détection des valeurs nulles ou devises obsolètes, génération de propositions de mapping avec score de confiance.

---

## 6. SAUVEGARDES CRYPTOGRAPHIQUES & RESTAURATION CONTRÔLÉE

### Stratégie de Sauvegarde (RPO & RTO)
- **RPO (Recovery Point Objective)** : Moins de 1 heure (archivage WAL continu + snapshots quotidiens).
- **RTO (Recovery Time Objective)** : Moins de 30 minutes.

### Procédure de Restauration Éprouvée
1. **Contrôle d'intégrité SHA-256** : Vérification de la somme de contrôle avant toute décompression.
2. **Restauration test en Sandbox isolée** : Le snapshot est restauré dans un conteneur éphémère pour vérifier l'absence de corruption de tables (`tablesRestoredCount == 8`).
3. **Double Approbation** : Deux administrateurs distincts valident la bascule.
4. **Application en Production** : Restauration atomique sous transaction avec préservation des sessions en cours.

---

## 7. JOURNAL D'AUDIT APPEND-ONLY & CHAÎNE DE HACHAGE IMMUABLE

Chaque action sensible (connexion, décision KYC, émission de CMR, mouvement financier, rotation KMS) fait l'objet d'une écriture immuable dans le journal d'audit.

- **Chaîne de Hachage SHA-256** : Chaque enregistrement d'audit intègre l'empreinte cryptographique de l'enregistrement précédent (`previousHash`), créant une chaîne continue.
- **Détection de Falsification** : Toute tentative de modification, suppression ou insertion rétroactive altère les empreintes subséquentes et est immédiatement signalée par la routine de vérification d'intégrité.
