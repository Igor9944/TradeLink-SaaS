# TRADELINK V6.0 — DOCUMENTATION DES APIS (SPÉCIFICATION OPENAPI 3.1.0)

Ce document répertorie l'ensemble des points d'accès de l'API RESTful de **TRADELINK V6.0**.

---

## 1. CONVENTIONS GLOBALES & SÉCURITÉ

### Base URL
- **Environnement de Production** : `https://app.tradelink.ma/api/v1`
- **Environnement de Test Local** : `http://localhost:5173/api/v1`

### En-têtes Requis & Traçabilité
- `Authorization: Bearer <JWT_ACCESS_TOKEN>` : Jeton d'accès signé RS256/Argon2id.
- `Content-Type: application/json` : Format d'échange standard.
- `X-Correlation-Id: <UUID>` : Identifiant unique de corrélation pour le traçage des requêtes de bout en bout.
- `Idempotency-Key: <STRING>` : Requis sur les opérations financières ou mutantes critiques (`POST /api/v1/payments/*`, `POST /api/v1/orders/*`).

### Codes HTTP Standards
| Code | Signification | Contexte d'Utilisation |
| :--- | :--- | :--- |
| **200 OK** | Succès | Requêtes `GET` et `PUT` abouties. |
| **201 Created** | Créé avec succès | Création de ressource (`POST` de commande, devis, produit, upload KYC). |
| **400 Bad Request** | Erreur de validation | Champs obligatoires manquants, format invalide, refus de mission sans motif. |
| **401 Unauthorized** | Non authentifié | Jeton manquant ou session révoquée par *Single Active Session Policy*. |
| **403 Forbidden** | Accès refusé | Violation de rôle RBAC, tentative de mutation commerciale par le Comptable (Stage 3). |
| **404 Not Found** | Introuvable | Ressource inexistante ou supprimée logiquement (*Soft Deleted*). |
| **409 Conflict** | Conflit d'état | Email déjà enregistré, rupture de stock atomique lors de la conversion de commande. |
| **429 Too Many Requests** | Débit dépassé | Quota OTP épuisé (5 tentatives) ou dépassement de quota jetons IA. |
| **500 Server Error** | Erreur interne | Erreur inattendue consignée avec son `correlationId`. |

---

## 2. CATALOGUE DES POINTS D'ACCÈS

### A. Diagnostic & Santé Système
- `GET /api/v1/health`
  - **Description** : État de santé des composants (App, PostgreSQL, Redis, MinIO, Vault).
  - **Permissions** : Public.
  - **Réponse 200** : `{ "status": "UP", "version": "6.0.0", "persistedInDatabase": true }`

- `GET /api/v1/docs/openapi.json`
  - **Description** : Schéma complet OpenAPI 3.1.0 téléchargeable au format JSON.
  - **Permissions** : Public.

---

### B. Authentification & Sécurité RBAC
- `POST /api/v1/auth/register`
  - **Description** : Inscription publique d'un compte Visiteur avec hachage Argon2id.
  - **Corps** : `{ "email": "pro@enterprise.com", "password": "...", "fullName": "...", "companyName": "...", "taxId": "...", "country": "...", "requestedRole": "CLIENT" }`
  - **Réponse 201** : `{ "userId": "...", "kycStatus": "PENDING_OTP", "otpExpiresInSeconds": 600 }`

- `POST /api/v1/auth/verify-otp`
  - **Description** : Validation du code OTP à 6 chiffres et promotion du compte.
  - **Corps** : `{ "email": "...", "code": "123456", "approveClientOnboarding": true }`
  - **Réponse 200** : `{ "userId": "...", "role": "CLIENT", "emailVerified": true }`

- `POST /api/v1/auth/login`
  - **Description** : Connexion utilisateur, contrôle de mot de passe, émission JWT et enregistrement de session unique.
  - **Corps** : `{ "email": "...", "password": "...", "mfaCode": "123456" }`
  - **Réponse 200** : `{ "token": "...", "sessionId": "...", "user": { ... } }`

---

### C. Module KYC & Conformité
- `GET /api/v1/kyc/requirements`
  - **Description** : Référentiel des documents requis selon le profil (Client, Fournisseur, Transporteur).
  - **Permissions** : Utilisateur authentifié.

- `POST /api/v1/kyc/:dossierId/documents`
  - **Description** : Dépôt d'une pièce justificative avec scan antivirus et chiffrement immédiat KMS.
  - **Permissions** : Propriétaire du dossier ou Administrateur.
  - **Corps** : `{ "docType": "CIN_DIRIGEANT", "fileName": "cin.pdf", "fileSizeBytes": 340000 }`

- `PUT /api/v1/kyc/:dossierId/decision`
  - **Description** : Validation, demande de complément ou rejet motivé du dossier KYC.
  - **Permissions** : `ADMIN` uniquement.
  - **Corps** : `{ "decision": "VALIDATED", "adminNotes": "Conforme" }`

---

### D. Écosystème Commercial (Devis, Commandes & Paiements)
- `GET /api/v1/products`
  - **Description** : Consultation paginée du catalogue avec recherche textuelle et filtres de catégorie.
  - **Permissions** : Tout utilisateur connecté.

- `POST /api/v1/products`
  - **Description** : Création d'un nouvel article dans le catalogue.
  - **Permissions** : `FOURNISSEUR` ou `ADMIN` (**Interdit en 403 pour COMPTABLE**).

- `POST /api/v1/quotes`
  - **Description** : Demande de devis commercial émise par un Client.
  - **Permissions** : `CLIENT`.

- `PUT /api/v1/quotes/:id/respond`
  - **Description** : Chiffrage et proposition commerciale du Fournisseur.
  - **Permissions** : `FOURNISSEUR`.

- `POST /api/v1/quotes/:id/convert`
  - **Description** : Conversion atomique du devis en commande avec réservation de stock immédiate.
  - **Permissions** : `CLIENT`.

- `POST /api/v1/invoices/generate`
  - **Description** : Génération de la facture légale à partir d'une commande acceptée.
  - **Permissions** : `FOURNISSEUR` ou `COMPTABLE`.

- `POST /api/v1/payments/stripe/checkout-session`
  - **Description** : Création d'une session de paiement Stripe sécurisée.
  - **Permissions** : `CLIENT`.

- `POST /api/v1/payments/stripe/webhook`
  - **Description** : Traitement idempotent des événements Stripe (`checkout.session.completed`).
  - **Permissions** : Signature Stripe Webhook.

---

### E. Logistique, Fret & Transport
- `GET /api/v1/logistics/vehicles`
  - **Description** : Liste des véhicules habilités (Agrément frigo ATP, ADR, Bâchés).
  - **Permissions** : `TRANSPORTEUR`, `ADMIN`.

- `POST /api/v1/logistics/missions`
  - **Description** : Création d'une mission de transport pour une commande préparée.
  - **Permissions** : `FOURNISSEUR`, `ADMIN`.

- `PUT /api/v1/logistics/missions/:id/respond`
  - **Description** : Acceptation ou refus motivé de la mission par le transporteur.
  - **Permissions** : `TRANSPORTEUR` affecté.

- `POST /api/v1/logistics/shipments/:id/documents`
  - **Description** : Émission du CMR international et de la déclaration en douane EUR.1.
  - **Permissions** : `TRANSPORTEUR`.

- `POST /api/v1/logistics/shipments/:id/pod`
  - **Description** : Enregistrement de la Preuve de Livraison (signature électronique, photo et GPS).
  - **Permissions** : `TRANSPORTEUR`.

---

### F. Comptabilité & Moteur Financier
- `GET /api/v1/accounting/entries`
  - **Description** : Consultation du journal des écritures comptables en partie double.
  - **Permissions** : `COMPTABLE`, `ADMIN`.

- `POST /api/v1/accounting/entries`
  - **Description** : Enregistrement d'une écriture comptable équilibrée (Total Débit == Total Crédit).
  - **Permissions** : `COMPTABLE`, `ADMIN`.

- `GET /api/v1/accounting/financial-statements`
  - **Description** : Bilan équilibré (Actif = Passif) et Compte de Résultat selon le référentiel PCG, IFRS ou OHADA.
  - **Permissions** : `COMPTABLE`, `ADMIN`.

- `POST /api/v1/accounting/calc/amortization`
  - **Description** : Moteur financier Decimal.js pour calcul d'échéancier d'emprunt ou crédit documentaire.
  - **Permissions** : `COMPTABLE`, `ADMIN`.

---

### G. Collaboration, Room Live & IA
- `POST /api/v1/rooms`
  - **Description** : Création d'une visioconférence Room Live B2B.
  - **Permissions** : `FOURNISSEUR`, `TRANSPORTEUR`, `COMPTABLE`, `ADMIN` (**Interdit en 403 pour CLIENT**).

- `POST /api/v1/rooms/:id/join`
  - **Description** : Rejoindre une salle avec salon d'attente sur invitation.
  - **Permissions** : Utilisateur invité.

- `POST /api/v1/ai/ocr/analyze`
  - **Description** : Extraction OCR et analyse IDP de documents de facturation.
  - **Permissions** : Tout utilisateur authentifié.

- `POST /api/v1/ai/chat`
  - **Description** : Assistant conversationnel RAG avec filtrage de sécurité par rôle.
  - **Permissions** : Tout utilisateur authentifié.

---

### H. Administration Avancée & Sandbox
- `POST /api/v1/admin/export`
  - **Description** : Export de jeux de données multi-formats (CSV, XLSX, JSON, SQL, BAK, DBF, CDX).
  - **Permissions** : `ADMIN`.

- `POST /api/v1/admin/sandbox/analyze`
  - **Description** : Analyse en sandbox isolée éphémère (réseau coupé, scan antivirus).
  - **Permissions** : `ADMIN`.

- `POST /api/v1/admin/backups/verify`
  - **Description** : Vérification cryptographique de l'intégrité SHA-256 d'une sauvegarde.
  - **Permissions** : `ADMIN`.

- `POST /api/v1/admin/operations/dual-approve`
  - **Description** : Double validation administrative avec rejet d'auto-approbation.
  - **Permissions** : `ADMIN` distinct de l'initiateur.
