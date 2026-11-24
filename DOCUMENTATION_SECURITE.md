# DOCUMENTATION DE SÉCURITÉ APPLICATIVE ET INFRASTRUCTURE — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`  
**Conformité** : Phase 10 (Sections 12.1 à 12.5)

---

## 1. Authentification, Cryptographie et Gestion des Sessions (Section 12.1)

1. **Hachage des mots de passe (`src/services/securityCrypto.ts`)** :
   - Utilisation exclusive d'**Argon2id (RFC 9106)** via `@node-rs/argon2` (et `@noble/hashes/argon2` en environnement compatible) avec paramètres durcis : mémoire `m = 65536` (64 Mio), itérations `t = 3`, parallélisme `p = 4`, sel aléatoire 128 bits, condensat 256 bits (43 caractères Base64 sans padding).
   - Détection et rejet formel de tout ancien hash non conforme (`isLegacyMockHash`), avec invalidation immédiate des sessions et obligation de réinitialisation.
2. **Double Authentification MFA TOTP (`RFC 6238`)** :
   - Génération de secrets aléatoires de 160 bits encodés en Base32 (`generateTotpSecretBase32`).
   - Calcul HMAC-SHA1 conforme RFC 4226 / RFC 6238 avec tolérance stricte de `±1` fenêtre de 30 secondes et comparaison en temps constant (`constantTimeEqual`).
   - **Obligation stricte pour le rôle `ADMIN`** : le middleware serveur `requireAuthenticatedSession` et le composant `<RoleGuard>` bloquent tout accès (`403 ADMIN_MFA_MANDATORY`) tant que la session n'est pas marquée `mfaVerified = true` dans Redis.
3. **Sessions Uniques Redis & Jetons JWT (`HS256`)** :
   - Signature HMAC-SHA256 avec validation stricte de l'en-tête (`alg === 'HS256'`, rejet de `alg: none`), de l'émetteur (`iss`), de l'audience (`aud`), de l'expiration (`exp`) et de l'identifiant unique `jti`.
   - Politique de **session unique active** par utilisateur dans Redis (`registerSingleActiveSession`) : toute nouvelle connexion révoque automatiquement la session précédente.
   - Rotation des Refresh Tokens par famille avec révocation complète en cas de tentative de réutilisation d'un jeton déjà consommé.

---

## 2. Autorisations RBAC/ABAC et Isolation Multi-Tenant (Sections 12.2 & 12.5)

- **Contrôle côté serveur obligatoire** : chaque route privée invoque `requireAuthenticatedSession` puis `enforceRBACAndOwnership` avant d'interroger la base de données.
- **Anti-IDOR et cloisonnement inter-entreprises** :
  - Un `CLIENT` ne peut lire ou agir que sur ses propres devis, commandes, factures, paiements, expéditions et dossier KYC (`clientId === user.id`).
  - Un `FOURNISSEUR` ne peut modifier ou supprimer que ses propres produits et stocks (`supplierId === user.id`).
  - Un `TRANSPORTEUR` ne voit que les missions et expéditions qui lui sont assignées (`carrierId === user.id`).
  - Un membre d'organisation ne peut consulter ni modifier une autre entreprise (`companyId`).
- **Règles métier impératives** :
  - Le profil `CLIENT` peut uniquement rejoindre une Room Live invitée ; toute tentative de création (`POST /api/v1/rooms`), de modification (`PATCH /google-meet`), d'invitation, d'admission/rejet lobby ou de modération retourne `403`.
  - Le profil `COMPTABLE` est en lecture seule sur les données commerciales sources (`403 COMPTABLE_STAGE3_READONLY_SOURCE_DATA`), et les écritures comptables validées sont immuables (`403 ACCOUNTING_VALIDATED_ENTRY_IMMUTABLE`).

---

## 3. Sécurité des API, Webhooks et Entrées Utilisateur (Section 12.3)

- **Validation de schémas** : validation systématique via **Zod v4** (`src/server/validators/schema.validator.ts`) et blocage des paramètres de requête imbriqués sous Express 5 (`assertFlatStringQuery`).
- **Assainissement XSS itératif (`sanitizeHtmlInput`)** : décodage des entités HTML numériques/hexadécimales/nommées, suppression en boucle jusqu'à convergence des balises `<script>`, gestionnaires d'événements `on*=` et URI `javascript:`/`vbscript:`/`data:`, puis échappement `<`/`>` sans altérer les champs sensibles (`NON_SANITIZED_SENSITIVE_FIELDS`).
- **Protection contre l'injection de formules tableur (CWE-1236)** : neutralisation automatique par préfixe `'` de toute cellule commençant par `=`, `+`, `-`, `@`, `|`, `%`, `\t`, `\r` dans tous les exports (`CSV`, `XLS`, `XLSX`, `ODS`) côté serveur et côté client.
- **Webhooks de paiement signés HMAC-SHA256** : vérification sur `req.rawBody`, fenêtre anti-rejeu de `300 s`, registre d'idempotence et comportement fail-closed (`503 WEBHOOK_PROVIDER_NOT_CONFIGURED`) si le secret n'est pas provisionné en production.

---

## 4. Sécurité Documentaire, KMS et Infrastructure (Section 12.4)

- **Pipeline d'ingestion documentaire sécurisé** :
  - Mise en quarantaine systématique à la réception (`QUARANTINED_ON_INGEST`).
  - Vérification des **Magic Bytes** binaires (blocage immédiat des exécutables `MZ`, `ELF`, `#!` et des extensions dangereuses).
  - Scan antivirus en flux TCP via le démon **ClamAV (`zINSTREAM`)** : si le démon est indisponible, le fichier reste strictement en `QUARANTINED`.
  - Protection contre les archives piégées (**Anti-Zip-Bomb** : ratio max `100:1`, taille décompressée max `250 Mo`, max `1000` entrées) et contre la traversée de répertoires (**Anti-Path-Traversal CWE-22** : blocage de `../` et `..\`).
- **Chiffrement par enveloppe KMS (AES-256-GCM)** : les pièces justificatives KYC et les jetons OAuth 2.0 persistés sont chiffrés avec un vecteur d'initialisation (`ivHex`) de 96 bits et un tag d'authentification (`authTagHex`) de 128 bits.
- **Conteneurs et Réseau Durcis** : exécution non-root (`USER 10001:10001` et `USER 20001:20001` pour la Sandbox sans réseau), `cap_drop: [ALL]`, `read_only: true`, réseau interne `internal: true`, et zéro fuite d'identifiants de démonstration dans le bundle Vite de production (`0` fuite vérifiée sur les 14 fichiers `dist/assets/*.js`).
