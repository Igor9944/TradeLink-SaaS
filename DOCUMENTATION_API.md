# DOCUMENTATION COMPLÈTE DES API REST — TRADELINK SaaS B2B

**Version de l'API** : `v1` (`/api/v1/*`)  
**Spécification OpenAPI** : `GET /api/v1/docs/openapi.json`  
**Implémentation** : `src/server/controllers/domain.controllers.ts`

---

## 1. Conventions Générales et Format de Réponse

Toutes les réponses JSON respectent une enveloppe standardisée :

```json
{
  "success": true,
  "correlationId": "corr-1732400000-x8a9f",
  "persistedInDatabase": true,
  "dataSource": "POSTGRESQL_PRISMA",
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 42,
    "totalPages": 3
  }
}
```

En cas d'erreur (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `503`), l'API retourne :

```json
{
  "success": false,
  "correlationId": "corr-1732400000-x8a9f",
  "error": {
    "code": "CLIENT_ROOM_CREATION_FORBIDDEN",
    "message": "Interdit : Le Client rejoint uniquement les salles autorisées et ne dispose pas d'un droit général de création."
  }
}
```

### En-têtes de Sécurité et d'Authentification
- `Authorization: Bearer <JWT_HS256>` ou cookie `tradelink_session` (`HttpOnly; Secure; SameSite=Strict`).
- `X-CSRF-Token: <token>` pour les requêtes mutantes avec cookie.
- `Idempotency-Key: <uuid>` supporté sur toutes les requêtes `POST` et `PUT` pour éviter les doubles exécutions.

---

## 2. Catalogue Exhaustif des Endpoints par Domaine

### 2.1 Santé, Observabilité & Résilience
| Méthode | Route | Auth / Rôle | Description |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | État global et connectivité PostgreSQL, Redis, Vault, ClamAV, Gemini |
| `GET` | `/api/v1/health/ready` | Public (K8s) | Sonde de disponibilité (Readiness probe) |
| `GET` | `/api/v1/health/live` | Public (K8s) | Sonde de vivacité mémoire et uptime (Liveness probe) |
| `GET` | `/api/v1/metrics` | Bearer `METRICS_SCRAPE_TOKEN` ou `ADMIN` | Métriques Prometheus RFC 0.0.4 (bloqué `403` sur Nginx public) |
| `GET` | `/api/v1/circuit-breakers` | `ADMIN` (MFA) | État des disjoncteurs (`gemini`, `meet`, `clamav`, `payment`) |
| `GET` | `/api/v1/dlq/jobs` | `ADMIN` (MFA) | Liste des jobs en file de lettres mortes (Dead Letter Queue) |
| `GET` | `/api/v1/docs/openapi.json` | Public | Spécification OpenAPI 3.1 complète |

### 2.2 Authentification, Sessions, Appareils & MFA
| Méthode | Route | Auth / Rôle | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Inscription B2B Argon2id + émission OTP (rôles `ADMIN`/`COMPTABLE`/`SUPPORT` interdits) |
| `POST` | `/api/v1/auth/verify-otp` | Public | Validation OTP 6 chiffres (max 5 essais, TTL 10 min) |
| `POST` | `/api/v1/auth/verify-phone` | Public | Validation OTP SMS téléphone |
| `POST` | `/api/v1/auth/login` | Public | Connexion Argon2id + création de session unique Redis + JWT HS256 |
| `POST` | `/api/v1/auth/logout` | Authentifié | Révocation de la session active Redis et purge du cookie |
| `POST` | `/api/v1/auth/refresh` | Public (Refresh Token) | Rotation du Refresh Token avec détection de vol de famille |
| `GET` | `/api/v1/auth/session` | Authentifié | Profil et état MFA de la session active |
| `GET` | `/api/v1/auth/sessions` | Authentifié | Liste des sessions de l'utilisateur |
| `DELETE` | `/api/v1/auth/sessions/:id` | Authentifié | Révocation d'une session spécifique |
| `GET` | `/api/v1/auth/devices` | Authentifié | Liste des appareils enregistrés |
| `DELETE` | `/api/v1/auth/devices/:id` | Authentifié | Révocation d'un appareil (avec contrôle anti-IDOR) |
| `POST` | `/api/v1/auth/mfa/setup` | Authentifié | Génération d'un secret TOTP Base32 160 bits et URI `otpauth://` |
| `POST` | `/api/v1/auth/mfa/verify` | Authentifié | Validation du code TOTP RFC 6238 (fenêtre ±1 de 30s) |
| `POST` | `/api/v1/auth/mfa/recovery-codes` | Authentifié | Génération de codes de secours MFA à usage unique |
| `POST` | `/api/v1/auth/mfa/verify-recovery` | Authentifié | Connexion MFA par code de secours à usage unique |
| `POST` | `/api/v1/auth/forgot-password` | Public | Demande de réinitialisation de mot de passe |
| `POST` | `/api/v1/auth/reset-password` | Public | Réinitialisation à usage unique + invalidation de toutes les sessions |

### 2.3 Gouvernance des Acteurs, Utilisateurs & Organisations B2B
| Méthode | Route | Auth / Rôle | Description |
|---|---|---|---|
| `GET` | `/api/v1/actors/roles` | Authentifié | Spécifications officielles des 7 rôles plateforme |
| `GET` | `/api/v1/workspace/me` | Authentifié | Agrégateur d'espace de travail adapté au rôle connecté |
| `GET` | `/api/v1/users` | `ADMIN` (MFA) | Liste globale des utilisateurs |
| `GET/PUT/DELETE` | `/api/v1/users/:id` | Propriétaire ou `ADMIN` | Consultation, édition profil, désactivation (`/deactivate`) ou suppression contrôlée |
| `POST` | `/api/v1/admin/users/suspend` | `ADMIN` (MFA) | Suspension administrative motivée + révocation sessions |
| `POST` | `/api/v1/admin/users/unsuspend` | `ADMIN` (MFA) | Réactivation d'un compte suspendu |
| `GET/POST` | `/api/v1/companies` | Authentifié | Liste scopée / Création d'une organisation B2B |
| `GET/PUT` | `/api/v1/companies/:id` | Membre ou `ADMIN` | Détail et mise à jour d'une organisation (anti-IDOR strict) |
| `POST` | `/api/v1/companies/:id/representatives` | `COMPANY_OWNER` / `ADMIN` | Ajout d'un représentant légal |
| `POST` | `/api/v1/companies/:id/documents` | Membre habilité | Dépôt d'un justificatif d'entreprise |
| `POST` | `/api/v1/companies/:id/invitations` | `COMPANY_OWNER` / `COMPANY_ADMIN` | Invitation d'un collaborateur par jeton signé HMAC |
| `POST` | `/api/v1/companies/:id/invitations/:invId/accept` | Invité authentifié | Acceptation de l'invitation |
| `PUT/DELETE` | `/api/v1/companies/:id/members/:memberId/*` | `COMPANY_OWNER` / `COMPANY_ADMIN` | Attribution des permissions internes ou retrait d'un membre |

### 2.4 Conformité KYC & Chiffrement KMS
| Méthode | Route | Auth / Rôle | Description |
|---|---|---|---|
| `GET` | `/api/v1/kyc/requirements` | Authentifié | Pièces requises par profil (`CLIENT`, `FOURNISSEUR`, `TRANSPORTEUR`) |
| `GET/PUT` | `/api/v1/kyc/jurisdictions/*` | Authentifié / `ADMIN` | Référentiel des juridictions (`MA`, `FR`, `DE`, `ES`, `AE`, `INTL`) |
| `GET` | `/api/v1/kyc/status` | Authentifié | État des dossiers KYC (scopé au demandeur ou global pour `ADMIN`) |
| `POST` | `/api/v1/kyc/:id/documents` | Demandeur / `ADMIN` | Dépôt d'une pièce avec scan ClamAV et chiffrement KMS AES-256-GCM |
| `GET` | `/api/v1/kyc/:id/documents/:docId/preview` | Demandeur / `ADMIN` | Prévisualisation déchiffrée à la volée |
| `GET` | `/api/v1/kyc/:id/presigned-url/:docId` | Demandeur / `ADMIN` | URL présignée temporaire (15 min) signée HMAC-SHA256 |
| `PUT` | `/api/v1/kyc/:id/decision` | `ADMIN` (MFA) | Validation ou rejet motivé d'un dossier KYC |
| `POST` | `/api/v1/kyc/:id/complements` | `ADMIN` (MFA) | Demande motivée de pièces complémentaires |
| `POST` | `/api/v1/kyc/:id/reactivate` | `ADMIN` (MFA) | Réactivation administrative d'un dossier suspendu à J+7 |
| `POST` | `/api/v1/kyc/cron/run` | `ADMIN` (MFA) | Exécution du job de relances J+1/J+3/J+5/J+6 et suspension J+7 |

### 2.5 Catalogue, Produits, Stocks, Devis, Commandes, Factures & Paiements
| Méthode | Route | Auth / Rôle | Description |
|---|---|---|---|
| `GET/POST/PUT/DELETE` | `/api/v1/catalog/categories/*` | Public (GET) / `ADMIN` | Hiérarchie des catégories et sous-catégories |
| `GET/POST/PUT/DELETE` | `/api/v1/catalog/products/*` | Public (GET publiés) / `FOURNISSEUR`, `ADMIN` | Recherche paginée (`validatePaginationAndFilters`), CRUD produit, modération, import en lot |
| `POST` | `/api/v1/catalog/compare` | Authentifié | Comparateur multicritères B2B |
| `GET/POST/PUT` | `/api/v1/stocks/*` | `FOURNISSEUR`, `COMPTABLE` (GET), `ADMIN` | Vue d'ensemble, entrées (`inbound`), ajustements, réservations, inventaires, valorisation |
| `GET/POST/PUT/DELETE` | `/api/v1/cart/*` | `CLIENT` | Validation serveur déterministe du panier (`Decimal.js`) et persistance |
| `GET/POST/PUT` | `/api/v1/quotes/*` | `CLIENT`, `FOURNISSEUR`, `COMPTABLE` (GET), `ADMIN` | Création RFQ, chiffrage (`/respond`), négociation (`/negotiate`), acceptation, refus, conversion en commande (`/convert`) |
| `GET/POST/PUT` | `/api/v1/orders/*` | `CLIENT`, `FOURNISSEUR`, `COMPTABLE` (GET), `ADMIN` | Création transactionnelle avec réservation de stock, changement de statut, annulation, ouverture de litige (`/disputes`) |
| `GET/POST` | `/api/v1/disputes/*` | Parties / `ADMIN` (`/resolve`) | Consultation et arbitrage administratif des litiges |
| `GET/POST` | `/api/v1/invoices/*` | `CLIENT`, `FOURNISSEUR`, `COMPTABLE`, `ADMIN` | Génération de facture scellée SHA-256 et balayage des impayés (`/sweep-overdue`) |
| `GET/POST` | `/api/v1/documents/*` | Authentifié / Token HMAC | Documents commerciaux, avoirs (`/credit-note`), aperçu PDF et téléchargement par token temporaire |
| `GET/POST` | `/api/v1/payments/*` | `CLIENT`, `FOURNISSEUR` (GET), `COMPTABLE`, `ADMIN` | Initiation multi-prestataires, confirmation, remboursement (`/refund`), quittances (`/receipts`) |
| `POST` | `/api/v1/payments/stripe/webhook` | Webhook signé HMAC-SHA256 | Traitement idempotent Stripe (anti-rejeu 300s, `503` si non configuré en prod) |
| `POST` | `/api/v1/webhooks/payments/:provider` | Webhook signé HMAC-SHA256 | Passerelles `STRIPE`, `KONNECT`, `FLOUCI`, `CMI`, `WIRE_TRANSFER`, `LETTER_OF_CREDIT` |

### 2.6 Logistique Multimodale & Comptabilité
| Méthode | Route | Auth / Rôle | Description |
|---|---|---|---|
| `GET/POST/PUT` | `/api/v1/logistics/missions/*` | `FOURNISSEUR`, `TRANSPORTEUR`, `ADMIN` | Création et réponse aux missions de transport |
| `GET/POST/PUT` | `/api/v1/logistics/shipments/*` | `CLIENT` (GET), `FOURNISSEUR`, `TRANSPORTEUR`, `ADMIN` | Expéditions, tracking GPS (`/gps`), liasse e-CMR (`/documents`), preuve de livraison (`/pod`) |
| `GET/POST/PUT` | `/api/v1/logistics/incidents/*` | `CLIENT`, `FOURNISSEUR`, `TRANSPORTEUR`, `ADMIN` | Déclaration et résolution d'incidents logistiques ou chaîne du froid |
| `GET/POST` | `/api/v1/accounting/entries/*` | `COMPTABLE`, `ADMIN` | Liste, saisie d'écriture équilibrée et contre-passation (`/:id/reverse`). `PUT`/`DELETE` bloqués `403` |
| `GET/POST` | `/api/v1/accounting/*` | `COMPTABLE`, `ADMIN` | Plan comptable (`PCG`/`IFRS`/`OHADA`/`PCM`), journaux, Grand Livre, Balance, rapprochement bancaire, Bilan/CPC, balance âgée, export FEC, verrouillage périodes fiscales |
| `POST` | `/api/v1/calc/simple` | `COMPTABLE`, `ADMIN` | Calculateur financier déterministe `Decimal.js` (`ACT/365`, `ACT/360`, `ACT/ACT`) |

### 2.7 Exploitation Universelle des Documents (Import/Export 26 Formats & OCR/IDP)
| Méthode | Route | Auth / Rôle | Description |
|---|---|---|---|
| `POST` | `/api/v1/import/upload` | `FOURNISSEUR`, `CLIENT`, `COMPTABLE`, `ADMIN` | Étape 1 : Réception, quarantaine initiale, magic bytes, scan ClamAV, anti-zip-bomb |
| `POST` | `/api/v1/import/:jobId/identify` -> `/execute` | Initiateur / `ADMIN` | Étapes 2 à 12 : identification, validation, analyse (`CSV`, `XLS`, `XLSX`, `ODS`, `DOCX`, `ODT`, `RTF`, `TXT`, `JSON`, `XML`, `YAML`, `DBF`, `SQL`, `SQLITE`), mapping, doublons, erreurs, simulation Dry-Run, confirmation, exécution & rapport |
| `POST` | `/api/v1/import/sandbox/database/*` | `ADMIN` (4-Eyes) | Analyse en Sandbox isolée (`SQL`, `SQLITE`, `BAK`, `DBF`, `CDX`), double approbation par un 2nd Admin distinct (`/approve`) et exécution (`/execute`) |
| `POST` | `/api/v1/export` | `FOURNISSEUR`, `CLIENT`, `COMPTABLE`, `ADMIN` | Export certifié en 17 formats (`CSV`, `XLS`, `XLSX`, `ODS`, `PDF`, `DOCX`, `ODT`, `RTF`, `TXT`, `JSON`, `XML`, `YAML`, `SQL`, `SQLITE`, `DBF`, `CDX`, `BAK`) avec protection CWE-1236 et hash SHA-256 |
| `GET/POST/PUT/DELETE` | `/api/v1/ocr/*` | Authentifié | Upload OCR (`PDF`, `JPG`, `PNG`, `WEBP`, `TIFF`, `BMP`), extraction 7 profils, correction manuelle (`/:id/fields`) et validation humaine obligatoire (`/:id/validate`) |

### 2.8 Collaboration, Room Live, Google Meet API v2, IA Gemini & Traduction
| Méthode | Route | Auth / Rôle | Description |
|---|---|---|---|
| `GET/POST` | `/api/v1/rooms` | Tous (`POST` interdit à `CLIENT` -> `403`) | Liste des salles accessibles / Création d'une salle Room Live ou Google Meet |
| `GET` | `/api/v1/rooms/invitations` | Authentifié (dont `CLIENT`) | Liste des invitations Room Live reçues |
| `POST` | `/api/v1/rooms/google-meet/create` | Rôles habilités (`CLIENT` -> `403`) | Création directe d'un espace officiel Google Meet v2 (`spaces.create`) |
| `GET` | `/api/v1/rooms/google-meet/oauth-url` | Rôles habilités (`CLIENT` -> `403`) | URL de consentement OAuth 2.0 Google avec scopes minimaux |
| `PATCH/PUT` | `/api/v1/rooms/:id/google-meet` | Hôte / `ADMIN` (`CLIENT` -> `403`) | Mise à jour de l'espace Google Meet (`spaces.patch`) |
| `GET` | `/api/v1/rooms/:id/google-meet/conference-records` | Participant autorisé | Consultation des `conferenceRecords`, `participants` et `participantSessions` |
| `POST` | `/api/v1/rooms/:id/google-meet/sync` | Participant autorisé | Synchronisation de l'espace Google Meet (`spaces.get`) |
| `POST` | `/api/v1/rooms/:id/end` | Hôte / `ADMIN` (`CLIENT` -> `403`) | Clôture de la réunion (`spaces.endActiveConference`) et archivage |
| `POST` | `/api/v1/rooms/:id/join` | Participant autorisé (dont `CLIENT`) | Rejoindre la salle ou la salle d'attente Knocking |
| `POST` | `/api/v1/rooms/:id/lobby/admit` & `/reject` | Hôte / `ADMIN` (`CLIENT` -> `403`) | Admission ou refus depuis la salle d'attente |
| `POST` | `/api/v1/rooms/:id/moderate` | Hôte / `ADMIN` (`CLIENT` -> `403`) | Modération micro/caméra/expulsion/délégation |
| `POST` | `/api/v1/rooms/:id/recording/start` & `/stop` | Hôte / `ADMIN` (`CLIENT` -> `403`) | Enregistrement chiffré KMS AES-256 sous consentement RGPD (rétention 90j) |
| `POST` | `/api/v1/rooms/:id/ai-summary` | Participant autorisé | Synthèse IA post-réunion scellée SHA-256 |
| `GET/POST/PUT/DELETE` | `/api/v1/translation/*` | Authentifié / `ADMIN` (glossaire) | Détection de langue, traduction (`fr`, `en`, `ar`, `es`) avec mention de non-certification juridique, glossaire B2B, jobs batch |
| `GET/POST/DELETE` | `/api/v1/copilot/*` | Authentifié | Chat IA exclusif Google Gemini scopé par rôle/tenant, résumé de pièces jointes, actions assistées avec garde-fou humain |
| `GET/POST/PUT` | `/api/v1/messaging/*` & `/notifications/*` | Authentifié | Messagerie B2B multi-acteurs avec pièces jointes scannées et centre de notifications |
| `GET/POST` | `/api/v1/support/*` & `/search/*` & `/analytics/*` | Authentifié | Helpdesk SLA, base de connaissances, recherche globale et tableaux de bord analytiques |
