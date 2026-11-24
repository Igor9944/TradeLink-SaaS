# MODÉLISATION DES RÔLES, PERMISSIONS RBAC/ABAC ET POLITIQUES — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`  
**Conformité** : Phase 2 (Section 4.2) & Phase 4 (Sections 6.1 à 6.10)

---

## 1. Architecture des Rôles Réellement Présents dans TRADELINK (Section 6)

Le système implémente un modèle de contrôle d'accès à **deux niveaux complémentaires** vérifiés côté serveur (`src/services/securityCrypto.ts`, `src/services/companyAndAccountEngine.ts`, `src/server/middlewares/errorAndSecurity.middleware.ts`) :

1. **Rôles Plateforme (`UserRoleCode`)** :
   - `ADMIN` : Superadministrateur de la plateforme (MFA TOTP RFC 6238 obligatoire).
   - `CLIENT` : Client / Acheteur / Importateur professionnel B2B (soumis au KYC, **interdit de créer/administrer une Room Live**).
   - `FOURNISSEUR` : Fournisseur / Exportateur / Producteur / Distributeur B2B (soumis au KYC, gère catalogues, stocks, devis, commandes, expéditions).
   - `TRANSPORTEUR` : Prestataire logistique / Transporteur multimodal (soumis au KYC, gère flotte, missions, GPS, chaîne du froid, e-CMR, POD).
   - `COMPTABLE` : Comptable / Auditeur financier (provisionné sans inscription publique, **strictement en lecture seule sur les données commerciales sources**, gère écritures, journaux, rapprochement, états financiers, FEC).
   - `SUPPORT` : Agent Support & Helpdesk B2B (provisionné sans inscription publique, gère tickets SLA, base de connaissances, sessions d'assistance).
   - `VISITEUR` : Compte pré-inscription ou non vérifié OTP (accès limité au catalogue public et à la vérification OTP/onboarding).

2. **Rôles Internes d'Organisation (`CompanyInternalRole`)** permettant à une entreprise B2B d'opérer en tant qu'acheteur, fournisseur, distributeur ou industriel multi-utilisateurs :
   - `COMPANY_OWNER` : Propriétaire légal de l'organisation.
   - `COMPANY_ADMIN` : Administrateur d'organisation (Section 6.2 — gère exclusivement son organisation, ses membres, invitations et paramètres sans accès aux autres tenants ni aux fonctions Superadmin).
   - `COMPANY_BUYER` : Acheteur / Approvisionneur interne.
   - `COMPANY_SALES` : Responsable commercial / Ventes & Devis.
   - `COMPANY_FINANCE` : Responsable facturation & paiements internes.
   - `COMPANY_LOGISTICS` : Responsable expéditions & réception interne.
   - `COMPANY_VIEWER` :Observateur interne en lecture seule.

---

## 2. Référentiel des Permissions RBAC & Règles Contextuelles ABAC (Section 4.2)

Chaque permission est définie par un **identifiant**, une **ressource**, une **action**, un **périmètre (scope)**, une **condition contextuelle (ABAC)** et un **niveau de sensibilité** (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

| Identifiant Canonique | Alias Compatible | Ressource | Action | Périmètre | Condition Contextuelle (ABAC) | Sensibilité |
|---|---|---|---|---|---|---|
| `organization.read` | `company:profile:view` | Organisation | `read` | `TENANT` | Appartenance à l'organisation (`company.members.includes(user.id)`) ou `ADMIN` | `MEDIUM` |
| `organization.update` | `company:profile:edit` | Organisation | `update` | `TENANT` | Rôle interne `COMPANY_OWNER` ou `COMPANY_ADMIN` du même tenant | `HIGH` |
| `users.invite` | `company:members:manage` | Membres Organisation | `invite` | `TENANT` | Rôle interne `COMPANY_OWNER` ou `COMPANY_ADMIN` + jeton HMAC signé | `HIGH` |
| `users.manage` | `users:manage` | Utilisateurs | `manage` | `GLOBAL` / `TENANT` | `ADMIN` (global + MFA) ou `COMPANY_ADMIN` (limité aux membres de son organisation sans élévation de privilèges) | `CRITICAL` |
| `products.create` | `products:write`, `products:crud:own` | Produits | `create` | `OWN_TENANT` | `FOURNISSEUR` ou `ADMIN` ; interdit au `COMPTABLE` (Stage 3) et au `CLIENT` | `MEDIUM` |
| `products.publish` | `products:write` | Catalogue | `publish` | `OWN_TENANT` | Propriétaire du produit (`product.supplierId === user.id`) ou modérateur `ADMIN` | `MEDIUM` |
| `stocks.manage` | `stocks:write`, `stocks:manage:own` | Stocks & Inventaires | `manage` | `OWN_TENANT` | `FOURNISSEUR` propriétaire du stock ou `ADMIN` ; interdit au `COMPTABLE` | `HIGH` |
| `quotes.create` | `quotes:create` | Devis (RFQ) | `create` | `OWN_TENANT` | `CLIENT` ou `ADMIN` | `MEDIUM` |
| `quotes.respond` | `quotes:respond:assigned` | Devis (RFQ) | `respond` | `ASSIGNED` | `FOURNISSEUR` destinataire (`quote.supplierId === user.id`) | `MEDIUM` |
| `orders.create` | `orders:create` | Commandes | `create` | `OWN_TENANT` | `CLIENT` (avec stock disponible et MOQ respecté) ; interdit au `COMPTABLE` | `HIGH` |
| `orders.approve` | `orders:process:assigned` | Commandes | `approve` | `ASSIGNED` | `FOURNISSEUR` assigné (`order.supplierId === user.id`) ou `COMPANY_ADMIN` | `HIGH` |
| `orders.read` | `orders:read:own`, `orders:read_own` | Commandes | `read` | `SCOPED` | `order.clientId === user.id` ou `order.supplierId === user.id` ou `COMPTABLE`/`ADMIN` | `MEDIUM` |
| `invoices.read` | `invoices:read:own`, `invoices:read:issued` | Factures | `read` | `SCOPED` | Émetteur, destinataire, `COMPTABLE` ou `ADMIN` | `MEDIUM` |
| `invoices.validate` | `compta:statements:generate` | Factures & Avoirs | `validate` | `SCOPED` | `FOURNISSEUR` émetteur, `COMPTABLE` ou `ADMIN` | `HIGH` |
| `payments.initiate` | `payments:create:own` | Paiements | `initiate` | `OWN_TENANT` | `CLIENT` titulaire de la commande/facture | `CRITICAL` |
| `logistics.manage` | `missions:update:status`, `shipments:pod:upload` | Expéditions & POD | `manage` | `ASSIGNED` | `TRANSPORTEUR` assigné (`shipment.carrierId === user.id`), `FOURNISSEUR` expéditeur ou `ADMIN` | `HIGH` |
| `documents.import` | `import:sandbox` | Système Documentaire | `import` | `ROLE_ENTITY` | `FOURNISSEUR` (`CATALOG_PRODUCTS`), `CLIENT` (`CLIENTS`), `COMPTABLE` (`ACCOUNTING_ENTRIES`), `ADMIN` (tous + bases en Sandbox 4-Eyes) | `HIGH` |
| `documents.export` | `compta:export` | Système Documentaire | `export` | `ROLE_ENTITY` | Filtré par organisation et par entité autorisée (`enforceExportPermission`) | `HIGH` |
| `ocr.validate` | `documents:read:own` | Studio OCR / IDP | `validate` | `SCOPED` | Revue humaine complétée (`humanReviewCompleted === true`) + cohérence arithmétique `HT + TVA = TTC` | `HIGH` |
| `rooms.create` | `room:create`, `room:create:support` | Room Live & Google Meet | `create` | `AUTHORIZED_ROLES` | Autorisé à `ADMIN`, `FOURNISSEUR`, `TRANSPORTEUR`, `COMPTABLE`, `SUPPORT`. **Strictement interdit à `CLIENT` et `VISITEUR` (`403`)** | `HIGH` |
| `rooms.join` | `room:join:invited` | Room Live & Google Meet | `join` | `INVITED_OR_PUBLIC` | Utilisateur présent dans `allowedUserIds` / `invitedEmails` ou salle publique | `MEDIUM` |
| `rooms.manage` | `room:create` | Room Live & Google Meet | `manage` | `HOST_ONLY` | Créateur de la salle (`room.createdById === user.id`) ou `ADMIN`. **Interdit au `CLIENT`** | `HIGH` |
| `accounting.read` | `compta:journals:read`, `compta:ledger:read` | Comptabilité | `read` | `FINANCIAL` | `COMPTABLE` ou `ADMIN` | `HIGH` |
| `accounting.manage` | `accounting:calculate`, `calc:execute` | Comptabilité | `manage` | `FINANCIAL` | `COMPTABLE` ou `ADMIN` (écritures validées immuables : modification uniquement par contre-passation `/reverse`) | `CRITICAL` |
| `admin.audit.read` | `audit:read` | Journaux d'Audit & Sécurité | `read` | `GLOBAL` | `ADMIN` avec session MFA TOTP vérifiée (`mfaVerified === true`) | `CRITICAL` |
| `admin.backups.restore` | `backups:restore`, `backup:restore:approve` | Sauvegardes & Sandbox | `restore` | `GLOBAL` | `ADMIN` + MFA + Double approbation par 2 administrateurs distincts (`initiatorId !== approverId`) | `CRITICAL` |

---

## 3. Périmètres Détaillés par Acteur (Sections 6.1 à 6.9)

### 3.1 Superadministrateur de la plateforme (`ADMIN`)
- **Périmètre** : Gouvernance globale de l'écosystème TRADELINK.
- **Exigences de sécurité** : MFA TOTP RFC 6238 obligatoire (`ADMIN_MFA_MANDATORY`), journalisation immuable chaînée SHA-256 de chaque action, principe des 4 yeux (double approbation) pour toute restauration de sauvegarde ou promotion de migration Sandbox, aucun secret affiché en clair.

### 3.2 Administrateur d'organisation (`COMPANY_OWNER` / `COMPANY_ADMIN`)
- **Périmètre** : Gestion exclusive de son entreprise B2B (`/api/v1/companies/:id/*`).
- **Droits** : Éditer le profil légal, ajouter des représentants et justificatifs, inviter/révoquer des collaborateurs, attribuer des rôles internes (`COMPANY_BUYER`, `COMPANY_SALES`, `COMPANY_FINANCE`, `COMPANY_LOGISTICS`, `COMPANY_VIEWER`).
- **Limites** : Isolation multi-tenant stricte (`RESOURCE_OWNERSHIP_VIOLATION` sur toute autre organisation), impossibilité d'accéder aux routes `/admin/*` ou de s'attribuer le rôle `ADMIN`.

### 3.3 Fournisseur / Exportateur / Fabricant / Distributeur (`FOURNISSEUR`)
- **Périmètre** : Création et publication de produits/catalogues, gestion des stocks et inventaires, réponse aux demandes de devis (RFQ), confirmation des commandes, émission des factures, création d'expéditions logistiques, import/export de son catalogue, création et animation de réunions Room Live / Google Meet.
- **Limites** : Accès restreint à ses propres produits, stocks, devis, commandes et factures (`supplierId === user.id`).

### 3.4 Acheteur / Importateur & Client Final (`CLIENT`)
- **Périmètre** : Consultation des catalogues, comparateur B2B, panier, demandes de devis (RFQ), négociation, passation et suivi de commandes, paiement en séquestre, téléchargement de ses factures/quittances/documents, messagerie B2B.
- **Restriction Room Live impérative (Sections 6.8 & 10)** :
  - Le profil `CLIENT` peut **uniquement rejoindre** une Room Live lorsqu'il y est invité/autorisé (`rooms.join`).
  - Il lui est **strictement interdit** de créer (`POST /api/v1/rooms`, `POST /api/v1/rooms/google-meet/create` -> `403 CLIENT_ROOM_CREATION_FORBIDDEN`), de clôturer (`/end` -> `403`), d'inviter (`/invite` -> `403`), d'admettre/rejeter dans le lobby (`/lobby/admit`, `/lobby/reject` -> `403`) ou de modérer/attribuer des rôles (`/moderate` -> `403`).

### 3.5 Prestataire / Logisticien (`TRANSPORTEUR`)
- **Périmètre** : Réception et acceptation de missions de transport, gestion de flotte, mise à jour des 10 statuts d'expédition, télémétrie GPS et chaîne du froid, génération de liasses e-CMR, dépôt de preuves de livraison (POD), déclaration d'incidents, création/participation aux Room Live logistiques.
- **Limites** : Accès strictement restreint aux expéditions qui lui sont assignées (`shipment.carrierId === user.id`), sans accès aux marges financières ou aux écritures comptables.

### 3.6 Comptable / Auditeur Financier (`COMPTABLE`)
- **Périmètre** : Plan comptable (PCG, IFRS, OHADA, PCM), journaux (`VTE`, `ACH`, `BNQ`, `OD`, `RAN`), saisie et contre-passation d'écritures en partie double, Grand Livre, Balance générale, Balance âgée, rapprochement bancaire, états financiers, calculateur d'intérêts `Decimal.js`, export FEC.
- **Limites** : **Lecture seule stricte sur les données commerciales sources** (`403 COMPTABLE_STAGE3_READONLY_SOURCE_DATA` sur toute tentative de création/modification de produit, stock, devis ou commande). Immuabilité absolue des écritures validées (`403 ACCOUNTING_VALIDATED_ENTRY_IMMUTABLE` sur `PUT`/`PATCH`/`DELETE`).

### 3.7 Agent Support (`SUPPORT`)
- **Périmètre** : Gestion des tickets d'assistance (classification IA, SLA, escalade N1/N2/N3, résolution, CSAT), base de connaissances trilingue/quadrilingue, création de sessions Room Live d'assistance technique.

---

## 4. Matrice Obligatoire des Droits par Module et par Acteur (Section 6.10)

| Module | Superadmin (`ADMIN`) | Admin Organisation (`COMPANY_ADMIN`) | Fournisseur (`FOURNISSEUR`) | Acheteur / Client (`CLIENT`) | Transporteur (`TRANSPORTEUR`) | Comptable (`COMPTABLE`) | Support (`SUPPORT`) |
|---|---|---|---|---|---|---|---|
| **Tableau de bord** | Global plateforme | Organisationnel | Personnel / Ventes & Stocks | Personnel / Achats & Commandes | Personnel / Flotte & Missions | Personnel / Finance & Audit | Personnel / Tickets & SLA |
| **Utilisateurs & Membres** | Global (CRUD, Suspension, Sessions) | Membres & Invitations de son organisation | Lecture profil propre | Lecture profil propre | Lecture profil propre | Lecture profil propre | Consultation limitée aux tickets |
| **Conformité KYC** | Audit, Validation, Rejet, Complément, Cron | Dépôt & Suivi KYC de son organisation | Dépôt & Suivi KYC propre | Dépôt & Suivi KYC propre | Dépôt & Suivi KYC propre | Non applicable | Lecture statut pour assistance |
| **Catalogue & Produits** | Supervision, Modération, Catégories | Catalogue de son organisation | Création, Édition, Publication, Stocks | Consultation, Comparaison, Favoris | Non | Consultation (Lecture seule) | Consultation |
| **Devis (RFQ) & Commandes** | Supervision globale & Arbitrage litiges | Commandes de son organisation | Réponse devis, Confirmation & Suivi commandes | Demande devis, Création & Suivi commandes | Commandes liées à ses missions | Lecture seule audit (`READ_ONLY`) | Consultation liée aux tickets |
| **Facturation & Paiements** | Supervision séquestre & Remboursements | Factures & Paiements de son organisation | Émission factures & Suivi encaissements | Consultation factures & Paiement séquestre | Facturation de ses prestations | Validation, Rapprochement, Avoirs | Consultation liée aux tickets |
| **Logistique & Expéditions** | Supervision globale | Suivi expéditions de son organisation | Création expéditions & Affectation transporteur | Suivi de livraison & POD | Gestion missions, GPS, Frigo, e-CMR, POD | Lecture seule justificatifs | Consultation liée aux tickets |
| **Comptabilité** | Supervision & Verrouillage périodes fiscales | Rapports financiers de son organisation | Consultation de ses ventes/factures | Factures & Quittances personnelles | Non | Gestion complète (Journaux, Grand Livre, FEC) | Non |
| **Système Documentaire, Import/Export & OCR** | Tous formats + Sandbox DB (4-Eyes) + Quarantaine | Documents de son organisation | Import/Export Catalogue + Studio OCR | Export Commandes/Factures + Studio OCR | Documents transport (e-CMR/POD) + OCR | Import/Export Écritures & FEC + Studio OCR | Pièces jointes tickets |
| **Messagerie & Notifications** | Supervision & Alertes sécurité | Conversations de son organisation | Conversations commerciales & logistiques | Conversations fournisseurs/transporteurs/support | Conversations expéditeurs/destinataires | Notifications financières | Messagerie tickets & utilisateurs |
| **Room Live & Google Meet** | Création, Modération & Clôture globale | Création & Gestion (si profil non-Client) | **Création**, Planification, Invitation, Modération | **Rejoindre uniquement** (Création/Modération interdites `403`) | **Création**, Planification, Invitation, Modération | **Création**, Planification, Synthèse | **Création** session support |
| **Assistant IA Gemini & Traduction** | Configuration globale, Quotas, Glossaire | Utilisation scopée à l'organisation | Utilisation scopée + Traduction produits | Utilisation scopée + Traduction messages | Utilisation scopée + Dictée vocale | Utilisation scopée finance | Suggestions réponses & Résumés IA |
| **Administration & Sécurité** | Global (KMS, Backups 4-Eyes, Audit Chain, APM) | Paramètres internes de son organisation | Non | Non | Non | Non | Non |
