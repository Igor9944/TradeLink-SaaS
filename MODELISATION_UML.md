# MODÉLISATION FONCTIONNELLE ET UML COMPLÈTE — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`  
**Conformité** : Phase 2 (Sections 4.1 A à F) & Phase 16

---

## A. Diagramme de Cas d'Utilisation (Section 4.1.A)

Ce diagramme modélise l'ensemble des acteurs réels du système (`VISITEUR`, `CLIENT`, `FOURNISSEUR`, `TRANSPORTEUR`, `COMPTABLE`, `SUPPORT`, `ADMIN`, ainsi que le rôle organisationnel `COMPANY_ADMIN`/`COMPANY_OWNER`), leurs cas d'utilisation autorisés, leurs restrictions (notamment l'interdiction pour le `CLIENT` de créer ou d'administrer une Room Live, et l'accès en lecture seule du `COMPTABLE` sur les données commerciales sources) et les interactions avec les services externes (Google Gemini, Google Meet API v2, Stripe/Passerelles de paiement, ClamAV, HashiCorp Vault KMS).

```mermaid
flowchart LR
  subgraph Acteurs["Acteurs TRADELINK"]
    VIS["Visiteur Public (VISITEUR)"]
    CLI["Client / Acheteur B2B (CLIENT)"]
    FOU["Fournisseur / Exportateur (FOURNISSEUR)"]
    TRA["Transporteur / Logisticien (TRANSPORTEUR)"]
    COM["Comptable / Auditeur (COMPTABLE)"]
    SUP["Agent Support (SUPPORT)"]
    ORG["Admin d'Organisation (COMPANY_ADMIN)"]
    ADM["Superadministrateur (ADMIN + MFA)"]
  end

  subgraph UC_Public["Zone Publique & Onboarding"]
    UC1["Consulter le catalogue public"]
    UC2["S'inscrire et vérifier OTP Email/SMS"]
    UC3["S'authentifier (Argon2id + Session unique)"]
    UC4["Valider MFA TOTP RFC 6238"]
  end

  subgraph UC_Org_KYC["Organisation & Conformité KYC"]
    UC5["Créer/Gérer l'entreprise B2B & Inviter des membres"]
    UC6["Soumettre les pièces KYC chiffrées KMS"]
    UC7["Auditer, Valider, Rejeter ou Demander Complément KYC"]
  end

  subgraph UC_Commerce["Catalogue, Stocks, Devis, Commandes & Paiements"]
    UC8["Créer/Publier des produits & Gérer les stocks"]
    UC9["Demander un devis (RFQ), Négocier & Passer commande"]
    UC10["Émettre factures/avoirs & Payer en séquestre"]
    UC11["Arbitrer un litige commercial"]
  end

  subgraph UC_Logistique["Logistique Multimodale & POD"]
    UC12["Gérer les missions, GPS, Chaîne du froid & e-CMR"]
    UC13["Soumettre la preuve de livraison (POD) & Signaler un incident"]
  end

  subgraph UC_Compta["Comptabilité & Finance"]
    UC14["Tenir les journaux, Grand Livre, Balance, Rapprochement & FEC"]
    UC15["Contre-passer une écriture & Calculer intérêts ACT/365"]
  end

  subgraph UC_Docs["Système Documentaire, Import/Export & OCR/IDP"]
    UC16["Importer fichiers (Tableurs, Docs, XML/YAML, SQL/DBF/CDX/BAK, Archives)"]
    UC17["Analyser par OCR/IDP & Valider humainement"]
    UC18["Exporter les données multi-formats dans son périmètre"]
    UC19["Approuver à 4 yeux (Dual Admin) une migration Sandbox"]
  end

  subgraph UC_Collab["Messagerie, Room Live, IA & Traduction"]
    UC20["Échanger via Messagerie B2B & Recevoir Notifications"]
    UC21["Créer, Planifier & Modérer une Room Live / Google Meet"]
    UC22["Rejoindre uniquement une Room Live autorisée (Sans droit de création)"]
    UC23["Utiliser l'Assistant IA Gemini & Traduire (FR/EN/AR/ES)"]
  end

  subgraph Externes["Services Externes"]
    EXT_MEET["Google Meet API v2 & OAuth 2.0"]
    EXT_GEMINI["Google Gemini 1.5 Pro/Flash API"]
    EXT_PAY["Stripe / Konnect / Flouci / CMI"]
    EXT_SEC["ClamAV clamd & HashiCorp Vault KMS"]
  end

  VIS --> UC1
  VIS --> UC2
  VIS --> UC3

  CLI --> UC3
  CLI --> UC6
  CLI --> UC9
  CLI --> UC10
  CLI --> UC18
  CLI --> UC20
  CLI --> UC22
  CLI --> UC23

  FOU --> UC3
  FOU --> UC6
  FOU --> UC8
  FOU --> UC9
  FOU --> UC10
  FOU --> UC16
  FOU --> UC17
  FOU --> UC18
  FOU --> UC20
  FOU --> UC21
  FOU --> UC23

  TRA --> UC3
  TRA --> UC6
  TRA --> UC12
  TRA --> UC13
  TRA --> UC20
  TRA --> UC21
  TRA --> UC23

  COM --> UC3
  COM --> UC14
  COM --> UC15
  COM --> UC17
  COM --> UC18
  COM --> UC21
  COM --> UC23

  SUP --> UC3
  SUP --> UC20
  SUP --> UC21
  SUP --> UC23

  ORG --> UC5
  ORG --> UC6

  ADM --> UC3
  ADM --> UC4
  ADM --> UC5
  ADM --> UC7
  ADM --> UC11
  ADM --> UC16
  ADM --> UC18
  ADM --> UC19
  ADM --> UC21
  ADM --> UC23

  UC6 --> EXT_SEC
  UC16 --> EXT_SEC
  UC10 --> EXT_PAY
  UC21 --> EXT_MEET
  UC23 --> EXT_GEMINI
```

---

## B. Diagramme de Classes du Domaine (Section 4.1.B)

Ce diagramme représente les 30 classes métier principales correspondant aux modèles Prisma (`prisma/schema.prisma`) et aux moteurs TypeScript (`src/types/index.ts`, `src/services/*.ts`).

```mermaid
classDiagram
  class User {
    +UUID id
    +String email
    +String passwordHash
    +UserRoleCode role
    +Boolean mfaEnabled
    +String totpSecretEncrypted
    +KYCStatus kycStatus
    +Boolean isSuspended
    +DateTime createdAt
  }

  class UserProfile {
    +UUID userId
    +String firstName
    +String lastName
    +String phone
    +Locale preferredLocale
    +String avatarUrl
  }

  class Role {
    +UUID id
    +UserRoleCode code
    +String labelFr
    +Boolean mfaMandatory
    +Boolean canCreateRoomLive
  }

  class Permission {
    +String id
    +String resource
    +String action
    +String scope
    +String sensitivityLevel
  }

  class UserSession {
    +UUID id
    +UUID userId
    +String jti
    +String refreshTokenHash
    +Boolean mfaVerified
    +String ipAddress
    +DateTime expiresAt
  }

  class Company {
    +UUID id
    +String companyCode
    +String legalName
    +String actorType
    +String registrationNumber
    +String taxId
    +CompanyStatus status
    +UUID ownerUserId
  }

  class CompanyMember {
    +UUID memberId
    +UUID companyId
    +UUID userId
    +CompanyInternalRole internalRole
    +String[] permissions
  }

  class KYCDossier {
    +UUID id
    +UUID userId
    +String companyName
    +KYCStatus status
    +Int daysRemaining
    +DateTime deadlineAt
  }

  class KYCDocument {
    +UUID id
    +UUID dossierId
    +String docType
    +String sha256
    +String encryptionKeyId
    +String virusScanStatus
  }

  class ProductCategory {
    +UUID id
    +String code
    +UUID parentId
    +Boolean isActive
  }

  class Product {
    +UUID id
    +String sku
    +UUID supplierId
    +UUID categoryId
    +Decimal priceAmount
    +String currency
    +Int stockAvailable
    +Int stockReserved
    +Int minOrderQuantity
    +ProductStatus status
  }

  class Catalog {
    +UUID supplierId
    +Product[] publishedProducts
    +DateTime updatedAt
  }

  class Quote {
    +UUID id
    +String quoteNumber
    +UUID clientId
    +UUID supplierId
    +String status
    +Decimal totalAmount
    +DateTime validUntil
  }

  class Order {
    +UUID id
    +String orderNumber
    +UUID clientId
    +UUID supplierId
    +String status
    +String paymentStatus
    +Decimal subtotalAmount
    +Decimal taxAmount
    +Decimal totalAmount
  }

  class OrderLine {
    +UUID id
    +UUID orderId
    +UUID productId
    +String sku
    +Int quantity
    +Decimal unitPrice
    +Decimal totalLine
  }

  class Invoice {
    +UUID id
    +String invoiceNumber
    +UUID orderId
    +UUID clientId
    +UUID supplierId
    +Decimal totalHt
    +Decimal taxAmount
    +Decimal totalTtc
    +String status
  }

  class Payment {
    +UUID id
    +String paymentReference
    +UUID orderId
    +UUID invoiceId
    +String provider
    +Decimal amount
    +String status
    +String escrowStatus
  }

  class Shipment {
    +UUID id
    +String trackingNumber
    +UUID orderId
    +UUID carrierId
    +String status
    +String transportMode
  }

  class CommercialDocument {
    +UUID id
    +String documentNumber
    +String documentType
    +String jurisdiction
    +String digitalSealSha256
    +Boolean isArchived
  }

  class DocumentFolder {
    +UUID id
    +UUID companyId
    +String folderType
    +Int documentsCount
  }

  class AccountingTransaction {
    +UUID id
    +String reference
    +Decimal amount
    +String currency
    +DateTime executedAt
  }

  class AccountingEntry {
    +UUID id
    +String entryNumber
    +JournalCode journalCode
    +String fiscalPeriod
    +Decimal totalDebit
    +Decimal totalCredit
    +Boolean isBalanced
    +Boolean isImmutable
    +UUID reversesEntryId
  }

  class Conversation {
    +UUID id
    +String title
    +String type
    +String relatedEntityId
  }

  class ChatMessage {
    +UUID id
    +UUID conversationId
    +UUID senderId
    +String text
    +DateTime createdAt
  }

  class Notification {
    +UUID id
    +UUID userId
    +String category
    +String priority
    +Boolean isRead
  }

  class RoomLive {
    +UUID id
    +String roomCode
    +UUID createdById
    +String status
    +MeetingProvider meetingProvider
    +String googleMeetSpaceName
    +String googleMeetUri
  }

  class RoomParticipant {
    +String id
    +UUID roomId
    +UUID userId
    +UserRoleCode role
    +Boolean isHost
    +String status
  }

  class TranslationRecord {
    +String id
    +String entityType
    +SupportedLocale sourceLang
    +SupportedLocale targetLang
    +String originalText
    +String translatedText
    +Boolean isCertified
  }

  class AuditLog {
    +String id
    +String actorName
    +UserRoleCode actorRole
    +String action
    +String targetType
    +String targetId
    +String previousHash
    +String currentHash
  }

  User "1" --> "1" UserProfile : possède
  User "1" --> "*" UserSession : ouvre
  User "*" --> "1" Role : détient
  Role "1" --> "*" Permission : accorde
  Company "1" --> "*" CompanyMember : regroupe
  User "1" --> "*" CompanyMember : appartient
  User "1" --> "0..1" KYCDossier : soumet
  KYCDossier "1" --> "*" KYCDocument : contient
  Company "1" --> "*" DocumentFolder : organise
  DocumentFolder "1" --> "*" CommercialDocument : archive
  ProductCategory "1" --> "*" Product : classe
  Catalog "1" --> "*" Product : expose
  User "1" --> "*" Product : fournit (FOURNISSEUR)
  User "1" --> "*" Quote : demande/reçoit
  Quote "1" --> "0..1" Order : convertit en
  Order "1" --> "1..*" OrderLine : comporte
  Order "1" --> "0..*" Invoice : génère
  Order "1" --> "0..*" Payment : règle
  Order "1" --> "0..*" Shipment : expédie
  Payment "1" --> "1" AccountingTransaction : déclenche
  AccountingTransaction "1" --> "1..*" AccountingEntry : comptabilise
  Conversation "1" --> "*" ChatMessage : contient
  User "1" --> "*" Notification : reçoit
  RoomLive "1" --> "1..*" RoomParticipant : accueille
  User "1" --> "*" AuditLog : génère
```

---

## C. Diagrammes de Séquence des 21 Processus Essentiels (Section 4.1.C)

### C.1. Inscription, Authentification et Vérification MFA (Processus 1, 2, 3)

```mermaid
sequenceDiagram
  autonumber
  actor U as Utilisateur / Admin
  participant FE as Frontend SPA
  participant API as API Express (/api/v1/auth)
  participant SVC as Auth & Crypto Service
  participant REDIS as Redis 7 (Sessions/OTP)
  participant DB as PostgreSQL 16 (Prisma)

  Note over U,DB: 1. Inscription (Register + OTP)
  U->>FE: Soumet formulaire inscription (email, password, companyName, role)
  FE->>API: POST /api/v1/auth/register (AuthRegisterZodSchema)
  API->>SVC: hashPasswordArgon2id(password) [m=65536, t=3, p=4]
  SVC->>DB: Crée User (statut VISITEUR) + OtpChallenge (6 chiffres, TTL 10m)
  API-->>FE: 201 Created (challenge OTP émis)
  U->>FE: Saisit le code OTP à 6 chiffres
  FE->>API: POST /api/v1/auth/verify-otp
  API->>SVC: Vérifie code OTP (max 5 essais) & active le rôle métier
  SVC->>DB: Met à jour User.role (CLIENT/FOURNISSEUR/TRANSPORTEUR)
  API-->>FE: 200 OK (Compte vérifié)

  Note over U,DB: 2. Authentification (Login + Session Unique Redis)
  U->>FE: Saisit email + mot de passe
  FE->>API: POST /api/v1/auth/login (AuthLoginZodSchema)
  API->>SVC: Vérifie anti-brute-force + verifyPasswordArgon2id()
  SVC->>REDIS: registerActiveSession(userId, newSessionId) -> révoque ancienne session
  SVC-->>API: JWT HS256 (15m) + Refresh Token + Set-Cookie HttpOnly
  API-->>FE: 200 OK (accessToken, mfaRequired si ADMIN)

  Note over U,DB: 3. Vérification MFA TOTP (Obligatoire pour ADMIN)
  U->>FE: Saisit code TOTP 6 chiffres (RFC 6238)
  FE->>API: POST /api/v1/auth/mfa/verify
  API->>SVC: verifyTotpCode(secretBase32, code) [fenêtre ±30s]
  SVC->>REDIS: setSessionMfaVerified(sessionId, true)
  SVC-->>API: Nouveau JWT HS256 avec mfaVerified=true
  API-->>FE: 200 OK (Accès /admin/* déverrouillé)
```

### C.2. Création d'Organisation, Invitation et Attribution de Rôle (Processus 4, 5, 6)

```mermaid
sequenceDiagram
  autonumber
  actor OA as Admin d'Organisation
  actor INV as Utilisateur Invité
  participant API as API Express (/api/v1/companies)
  participant ENG as CompanyAndAccountEngine
  participant DB as PostgreSQL 16

  Note over OA,DB: 4. Création d'une organisation B2B
  OA->>API: POST /api/v1/companies (legalName, registrationNumber, taxId, countryCode)
  API->>ENG: createCompany() -> Affecte OA comme COMPANY_OWNER
  ENG->>DB: Persiste Company + CompanyMember + CompanyHistoryEntry
  API-->>OA: 201 Created (companyId, companyCode)

  Note over OA,DB: 5. Invitation d'un utilisateur avec jeton signé HMAC
  OA->>API: POST /api/v1/companies/:id/invitations (invitedEmail, targetInternalRole)
  API->>ENG: Vérifie permission company:members:manage + génère rawToken & tokenHash SHA-256
  ENG->>DB: Persiste CompanyInvitation (PENDING, TTL 7j)
  API-->>OA: 201 Created (invitationId, rawToken)

  Note over INV,DB: 6. Acceptation et Attribution d'un rôle interne
  INV->>API: POST /api/v1/companies/:id/invitations/:invId/accept (token)
  API->>ENG: constantTimeEqual(sha256(token), invitation.tokenHash)
  ENG->>DB: Crée CompanyMember avec permissions du rôle
  API-->>INV: 200 OK (Membre actif)
  OA->>API: PUT /api/v1/companies/:id/members/:memberId/permissions (internalRole, permissions)
  API->>ENG: updateMemberPermissions() (anti-auto-rétrogradation du propriétaire)
  ENG->>DB: Met à jour CompanyMember + AuditLog
  API-->>OA: 200 OK
```

### C.3. Produit, Catalogue, Devis (RFQ), Commande, Paiement et Facturation (Processus 7 à 12)

```mermaid
sequenceDiagram
  autonumber
  actor F as Fournisseur
  actor C as Client / Acheteur
  participant API as API Express
  participant CAT as Catalog & Stock Engine
  participant COM as Commercial & Billing Engine
  participant PAY as Stripe / Passerelle Webhook
  participant ACC as Accounting Engine
  participant DB as PostgreSQL 16 (ACID)

  Note over F,DB: 7 & 8. Création d'un produit et Publication du catalogue
  F->>API: POST /api/v1/catalog/products (sku, name, priceAmount, stockAvailable, moq)
  API->>CAT: createProduct() [statut PUBLISHED ou PENDING_REVIEW]
  CAT->>DB: INSERT Product + StockMovement initial
  API-->>F: 201 Created

  Note over C,DB: 9. Demande de devis (RFQ) et Négociation
  C->>API: POST /api/v1/quotes (supplierId, lines, incoterm)
  API->>COM: createQuoteTransactional() [statut SENT]
  COM->>DB: INSERT Quote
  F->>API: PUT /api/v1/quotes/:id/respond (unitPrices, validUntilDate)
  API->>COM: respondToQuoteTransactional() [statut RESPONDED]
  C->>API: PUT /api/v1/quotes/:id/accept
  API->>COM: acceptQuoteTransactional() [statut ACCEPTED]

  Note over C,DB: 10. Création d'une commande et Réservation atomique de stock
  C->>API: POST /api/v1/orders (lines, shippingAddress, Idempotency-Key)
  API->>COM: createOrderTransactional()
  COM->>CAT: Vérifie MOQ + décrémente stockAvailable / incrémente stockReserved
  COM->>DB: INSERT Order + OrderLines + StockMovements (Transaction ACID)
  API-->>C: 201 Created (CMD-2026-XXXXX)

  Note over F,DB: 11 & 12. Facturation et Paiement Séquestre via Webhook signé HMAC
  F->>API: POST /api/v1/invoices/generate (orderId, jurisdiction)
  API->>COM: generateInvoiceFromOrderTransactional() + Sceau SHA-256
  COM->>ACC: Génère écriture comptable Journal VTE (411000 Débit / 707000 & 445710 Crédit)
  API-->>F: 201 Created (FAC-2026-XXXXX)
  C->>API: POST /api/v1/payments/initiate (orderId, invoiceId, provider)
  API-->>C: 201 Created (Session de paiement initiée)
  PAY->>API: POST /api/v1/payments/stripe/webhook (Stripe-Signature HMAC-SHA256 + rawBody)
  API->>COM: Vérifie HMAC + fenêtre anti-rejeu 300s + idempotence événement
  COM->>ACC: Génère écriture Journal BNQ (512000 Débit / 411000 Crédit)
  COM->>DB: Met à jour Invoice (PAID) + Order (PAID_ESCROW)
  API-->>PAY: 200 OK
```

### C.4. Import Documentaire, Extraction OCR/IDP et Export de Données (Processus 13, 14, 15)

```mermaid
sequenceDiagram
  autonumber
  actor U as Utilisateur Autorisé
  actor A2 as Second Administrateur (4-Eyes)
  participant API as API Express
  participant IMP as ImportExportEngine
  participant AV as ClamAV / Quarantaine
  participant OCR as OcrDocumentEngine
  participant DB as PostgreSQL 16

  Note over U,DB: 13. Import documentaire (Tableurs, Docs, XML/YAML, DBF/CDX/SQL/BAK, Archives)
  U->>API: POST /api/v1/import/upload (fileName, fileContentRaw, entity)
  API->>IMP: enforceImportPermission(role, entity)
  IMP->>AV: Quarantaine initiale + Inspection Magic Bytes + Scan Antivirus + Anti-Zip-Bomb
  AV-->>IMP: Statut CLEAN (ou blocage QUARANTINED / INFECTED)
  U->>API: POST /api/v1/import/:id/analyze -> /map -> /duplicates -> /errors -> /simulate
  API->>IMP: Détecte colonnes/types, mappe les champs, isole doublons et simule (Dry Run)
  U->>API: POST /api/v1/import/:id/confirm
  opt Import sensible (>1000 lignes ou SQL/BAK/DBF)
    A2->>API: POST /api/v1/import/sandbox/database/:sessionId/approve (4-Eyes anti-self-approval)
  end
  U->>API: POST /api/v1/import/:id/execute
  IMP->>DB: Exécute transactionnellement + génère ImportFinalReport (SHA-256)
  API-->>U: 200 OK (Rapport complet : créés, mis à jour, ignorés, rejetés)

  Note over U,DB: 14. Extraction OCR / IDP avec validation humaine obligatoire
  U->>API: POST /api/v1/ocr/upload (fileName, fileBytesBase64, profile)
  API->>OCR: validateFileMagicBytes(PDF/JPG/PNG/WEBP/TIFF/BMP) + SHA-256 anti-doublon
  OCR->>OCR: extractDocumentFieldsWithProfile() + verifyDocumentArithmeticConsistency(HT+TVA=TTC)
  API-->>U: 201 Created (EXTRACTED_PENDING_REVIEW, globalConfidence, uncertainFields)
  U->>API: PUT /api/v1/ocr/documents/:id/fields (Correction manuelle traçable)
  U->>API: POST /api/v1/ocr/documents/:id/validate (confirmedFields)
  API->>OCR: commitHumanReviewValidation() [Bloque toute écriture auto si non revu ou incohérent]
  OCR->>DB: Marque document VALIDATED + Journal d'audit
  API-->>U: 200 OK

  Note over U,DB: 15. Exportation universelle multi-formats
  U->>API: POST /api/v1/export (entity, format, selectedFields)
  API->>IMP: enforceExportPermission(role, entity) + filtre strict par tenant
  IMP->>IMP: Neutralise formules CWE-1236 + sérialise format + calcule SHA-256
  API-->>U: 200 OK (fileName, content, mimeType, sha256)
```

### C.5. Création Room Live, Rejoindre Room Live et Google Meet API v2 (Processus 16, 17, 18)

```mermaid
sequenceDiagram
  autonumber
  actor H as Hôte Autorisé (Fournisseur/Transporteur/Comptable/Support/Admin)
  actor C as Client B2B (Rejoindre Uniquement)
  participant API as API Express (/api/v1/rooms)
  participant SVC as RoomLive & Domain Service
  participant MEET as GoogleMeetService (API v2)
  participant GAPI as Google Meet REST API v2

  Note over C,API: Règle impérative : Tentative de création par un CLIENT -> Rejet 403
  C->>API: POST /api/v1/rooms
  API->>SVC: canCreateRoomLiveGeneral('CLIENT') === false
  SVC-->>API: 403 CLIENT_ROOM_CREATION_FORBIDDEN + AuditLog ROOM_CREATE_DENIED_CLIENT_ROLE

  Note over H,GAPI: 16 & 18. Création d'une Room Live et Génération d'une réunion Google Meet
  H->>API: POST /api/v1/rooms (title, meetingProvider: 'GOOGLE_MEET', allowedUserIds: [C.id])
  API->>SVC: createRoomLiveChecked()
  SVC->>MEET: createSpace({ title, accessType: 'TRUSTED' })
  MEET->>GAPI: POST https://meet.googleapis.com/v2/spaces (Bearer OAuth2 Token)
  GAPI-->>MEET: { name: 'spaces/xxx', meetingUri: 'https://meet.google.com/abc-defg-hij', meetingCode }
  SVC-->>API: 201 Created (RoomLive + googleMeetSpaceName + hostAccessToken HMAC)

  Note over C,SVC: 17. Rejoindre une Room Live (Knocking Lobby -> Admission Hôte)
  C->>API: POST /api/v1/rooms/:id/join
  API->>SVC: Vérifie liste allowedUserIds -> Place C en WAITING_ROOM + génère jeton SFU (canModerate: false)
  API-->>C: 200 OK (status: 'WAITING_LOBBY')
  H->>API: POST /api/v1/rooms/:id/lobby/admit (participantId)
  API->>SVC: Vérifie que H est hôte -> Bascule C en CONNECTED
  API-->>H: 200 OK (Participant admis)
```

### C.6. Traduction de Contenu, Assistant IA Gemini et Intervention Administrateur (Processus 19, 20, 21)

```mermaid
sequenceDiagram
  autonumber
  actor U as Utilisateur Connecté
  actor ADM as Superadministrateur (MFA)
  participant API as API Express
  participant TR as CentralTranslationService
  participant COP as CopilotEngine & GeminiAiService
  participant GEM as Google Gemini API (1.5 Pro/Flash)
  participant SEC as AdminAdvancedEngine

  Note over U,GEM: 19. Traduction d'un contenu (FR / EN / AR / ES)
  U->>API: POST /api/v1/translation/text (text, sourceLang, targetLang, entityType)
  API->>TR: Vérifie cache SHA-256 (< 2 ms)
  alt Cache Miss
    TR->>TR: Désensibilise secrets + préserve SKU/montants + applique Glossaire B2B
    opt Gemini configuré pour traduction dynamique
      TR->>GEM: generateContent(gemini-1.5-flash)
    end
    TR->>TR: Marque isInformativeOnly / non certifié si document juridique ou financier
  end
  API-->>U: 200 OK (translatedText, sourceLang, targetLang, isInformativeOnly, translationHash)

  Note over U,GEM: 20. Utilisation de l'Assistant IA Gemini
  U->>API: POST /api/v1/copilot/chat (message, context)
  API->>COP: Filtre anti-prompt-injection + Scope RAG strict selon user.role et user.id
  COP->>GEM: POST generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
  GEM-->>COP: Réponse contextualisée
  COP->>COP: Bloque toute action financière/juridique critique sans validation humaine (BLOCKED_BY_GUARDRAIL)
  API-->>U: 200 OK (message, ragSources, assistedAction)

  Note over ADM,SEC: 21. Intervention d'un Administrateur (Suspension, Rotation KMS, Audit Chain)
  ADM->>API: POST /api/v1/admin/users/suspend (userId, reason)
  API->>SEC: Vérifie ADMIN + MFA -> Suspend compte + Révoque sessions Redis + Chaîne Audit SHA-256
  ADM->>API: GET /api/v1/admin/security/audit/verify-chain
  API->>SEC: Vérifie intégrité cryptographique de toute la chaîne de journaux d'audit
  API-->>ADM: 200 OK (isValid: true)
```

---

## D. Diagrammes d'Activité des 10 Workflows Métier (Section 4.1.D)

### D.1. Workflow KYC et Validation d'Entreprise (Workflows 1 & 2)

```mermaid
stateDiagram-v2
  [*] --> NON_COMMENCE : Inscription & Vérification OTP
  NON_COMMENCE --> EN_COURS : Saisie informations légales entreprise
  EN_COURS --> DOCUMENTS_SOUMIS : Dépôt justificatifs (Scan ClamAV + Chiffrement KMS AES-256-GCM)
  NON_COMMENCE --> SUSPENDU : Échéance J+7 dépassée sans dépôt (Cron J+1..J+7)
  EN_COURS --> SUSPENDU : Échéance J+7 dépassée sans soumission
  DOCUMENTS_SOUMIS --> EN_VERIFICATION : Prise en charge par Administrateur KYC
  EN_VERIFICATION --> COMPLEMENT_DEMANDE : Demande motivée de pièces complémentaires
  COMPLEMENT_DEMANDE --> DOCUMENTS_SOUMIS : Nouveau dépôt par l'entreprise
  EN_VERIFICATION --> VALIDE : Validation administrative -> Entreprise ACTIVE
  EN_VERIFICATION --> REJETE : Rejet motivé
  SUSPENDU --> DOCUMENTS_SOUMIS : Réactivation administrative motivée
  VALIDE --> [*]
  REJETE --> [*]
```

### D.2. Workflow Gestion des Commandes, Paiements, Factures et Litiges (Workflows 3, 4, 7, 8)

```mermaid
flowchart TD
  A["Demande de Devis (RFQ) / Panier B2B"] --> B["Devis Chiffré & Accepté"]
  B --> C["Création Commande (PENDING) & Réservation Atomique Stock"]
  C --> D["Confirmation Fournisseur (CONFIRMED)"]
  D --> E["Génération Facture Scellée SHA-256 (ISSUED) + Écriture Journal VTE"]
  E --> F["Paiement Client (Stripe / Konnect / Flouci / CMI / Virement)"]
  F --> G{"Vérification Webhook HMAC-SHA256 & Anti-Rejeu 300s"}
  G -- "Signature Invalide" --> H["Rejet 401/400 + Alerte Sécurité"]
  G -- "Signature Valide" --> I["Fonds en Séquestre (PAID_ESCROW) + Écriture Journal BNQ"]
  I --> J["Préparation & Expédition Logistique (SHIPPED -> IN_TRANSIT)"]
  J --> K{"Réception & Preuve de Livraison (POD)"}
  K -- "Conforme" --> L["Commande Livrée (DELIVERED) & Libération Séquestre"]
  K -- "Anomalie / Avarie" --> M["Ouverture Litige (DISPUTED) & Gel du Séquestre"]
  M --> N{"Arbitrage Administrateur"}
  N -- "Faveur Client" --> O["Remboursement + Avoir (Credit Note) + Contre-passation Comptable"]
  N -- "Faveur Fournisseur" --> L
```

### D.3. Workflow Traitement Documentaire, Import/Export et OCR/IDP (Workflows 5 & 6)

```mermaid
flowchart TD
  S1["1. Réception du fichier & Contrôle RBAC"] --> S2["2. Quarantaine initiale & Contrôle de taille"]
  S2 --> S3["3. Inspection Magic Bytes, Extension & Intégrité SHA-256"]
  S3 --> S4{"4. Scan Antivirus ClamAV & Contrôle Archives (Anti-Zip-Bomb / Path Traversal)"}
  S4 -- "Infecté ou Piégé" --> S5["Rejet 422/400 & Maintien en Quarantaine Isolée"]
  S4 -- "Sain (CLEAN)" --> S6{"5. Type de Traitement"}
  S6 -- "Import Structuré / Base" --> S7["Analyse Colonnes/Tables -> Prévisualisation -> Mapping Auto/Manuel"]
  S7 --> S8["Validation Types -> Détection Doublons -> Rapport d'Erreurs -> Simulation Dry-Run"]
  S8 --> S9{"Nécessite Double Approbation Admin (4-Eyes) ?"}
  S9 -- "Oui (SQL/BAK/DBF ou >1000 lignes)" --> S10["Approbation par un 2nd Administrateur distinct en Sandbox isolée"]
  S9 -- "Non" --> S11["Confirmation Utilisateur & Exécution Transactionnelle"]
  S10 --> S11
  S11 --> S12["Rapport Final d'Importation & Journal d'Audit"]
  S6 -- "Document OCR / IDP" --> O1["Prétraitement & Détection Qualité (PDF/JPG/PNG/WEBP/TIFF/BMP)"]
  O1 --> O2["Extraction Zones/Champs/Tableaux + Score de Confiance + Contrôle HT+TVA=TTC"]
  O2 --> O3["Revue & Correction Manuelle Humaine Obligatoire (Human-in-the-Loop)"]
  O3 --> O4["Validation Finale Documentaire"]
```

### D.4. Workflow Gestion d'une Réunion Room Live / Google Meet et Notifications (Workflows 9 & 10)

```mermaid
flowchart TD
  R1["Demande de Création Room Live"] --> R2{"Contrôle Rôle Acteur côté Serveur"}
  R2 -- "Rôle = CLIENT ou VISITEUR" --> R3["Rejet HTTP 403 CLIENT_ROOM_CREATION_FORBIDDEN + Audit Log"]
  R2 -- "Rôle Autorisé (FOURNISSEUR, TRANSPORTEUR, COMPTABLE, SUPPORT, ADMIN)" --> R4{"Choix du Moteur"}
  R4 -- "Google Meet Officiel" --> R5["Appel Google Meet API v2 (spaces.create) via OAuth 2.0"]
  R5 -- "Succès API" --> R6["Association Room Live <-> spaces/xxx & meet.google.com/xxx-xxxx-xxx"]
  R5 -- "Indisponibilité API" --> R7["Journalisation Incident & Bascule Sécurisée / Réessai Idempotent"]
  R4 -- "WebRTC SFU Interne" --> R8["Création Session SFU & Jetons Signés HMAC-SHA256"]
  R6 --> R9["Envoi Notifications & Invitations (In-App + E-mail anti-doublon)"]
  R8 --> R9
  R9 --> R10["Arrivée Participants (Client autorisé à rejoindre uniquement) -> Salle d'Attente Knocking"]
  R10 --> R11["Admission par l'Hôte -> Session Active (Audio/Vidéo/Partage Docs/Sous-titres)"]
  R11 --> R12["Clôture par l'Hôte (spaces.endActiveConference) -> Compte Rendu IA Scellé SHA-256"]
```

---

## E. Diagramme de Composants (Section 4.1.E)

```mermaid
flowchart TB
  subgraph ClientLayer["Couche Présentation (Navigateur)"]
    SPA["Frontend React 18 / Vite 6 SPA\n(AppLayout, RoleGuard, Workspaces par Rôle)"]
    I18N_FE["i18next Client (FR / EN / AR RTL / ES)"]
  end

  subgraph GatewayLayer["Périmètre Réseau & Sécurité"]
    NGINX["Nginx 1.27 Reverse Proxy\n(TLS 1.2/1.3, HSTS, Blocage /metrics 403)"]
  end

  subgraph BackendLayer["Backend Express 5.3.0 (Node.js 20)"]
    MW["Middlewares Sécurité\n(Helmet, CORS, CSRF, Rate-Limit, XSS, RBAC/ABAC, Anti-IDOR)"]
    CTRL["Contrôleurs API REST (/api/v1/*)\n+ Validateurs Zod v4"]
    subgraph Engines["Services & Moteurs Métiers (28 Services)"]
      ENG_AUTH["SecurityCrypto & CompanyAccountEngine\n(Argon2id, JWT HS256, TOTP RFC 6238)"]
      ENG_COM["Catalog, Stock, Commercial & Billing Engine"]
      ENG_ACC["Accounting & Deterministic Financial Engine (Decimal.js)"]
      ENG_LOG["Logistics & ColdChain Telemetry Engine"]
      ENG_DOC["Universal Import/Export Engine & Sandbox Manager"]
      ENG_OCR["OCR & IDP Document Intelligence Engine"]
      ENG_ROOM["RoomLive SFU Engine & GoogleMeetService"]
      ENG_AI["GeminiAiService & CopilotEngine (RAG Scoped)"]
      ENG_TR["CentralTranslationService & TradeGlossary"]
      ENG_MSG["Messaging, Notification & Support Engine"]
      ENG_OBS["ObservabilityMetrics, CircuitBreaker & DeadLetterQueue"]
    end
    REPO["TradeLinkRepositoryStore & Prisma Adapters"]
  end

  subgraph DataAndInfra["Persistance, Cache & Sécurité Interne (tradelink-internal)"]
    PG[("PostgreSQL 16\n(68 Modèles Prisma ACID)")]
    REDIS[("Redis 7\n(Sessions uniques, JTI, Locks, Idempotence)")]
    MINIO[("MinIO / Stockage Objet S3\n(Documents Chiffrés & Quarantaine)")]
    CLAM["ClamAV Daemon (clamd:3310)\n(Scan zINSTREAM)"]
    VAULT["HashiCorp Vault KMS\n(KEK / DEK AES-256-GCM)"]
    SBX["Conteneur Sandbox Isolé\n(UID 20001, network_mode: none)"]
  end

  subgraph ExternalCloud["APIs Externes Officielles"]
    GMEET["Google Meet REST API v2 & Calendar v3\n(OAuth 2.0)"]
    GGEMINI["Google Gemini API\n(gemini-1.5-pro / gemini-1.5-flash)"]
    PAYGW["Passerelles Paiement\n(Stripe, Konnect, Flouci, CMI)"]
  end

  SPA <-->|"HTTPS / JSON + Cookie HttpOnly"| NGINX
  I18N_FE --- SPA
  NGINX <--> MW
  MW --> CTRL
  CTRL --> Engines
  Engines --> REPO
  REPO <--> PG
  ENG_AUTH <--> REDIS
  CTRL <--> REDIS
  ENG_DOC <--> CLAM
  ENG_OCR <--> CLAM
  ENG_DOC <--> MINIO
  ENG_DOC <--> SBX
  ENG_AUTH <--> VAULT
  ENG_ROOM <-->|"HTTPS OAuth2 + CircuitBreaker"| GMEET
  ENG_AI <-->|"HTTPS API Key + CircuitBreaker"| GGEMINI
  ENG_COM <-->|"Webhooks HMAC-SHA256"| PAYGW
```

---

## F. Diagramme de Déploiement Multi-Environnements (Section 4.1.F)

```mermaid
flowchart TB
  subgraph DEV["1. Environnement de Développement / Test Local"]
    DEV_FE["Vite Dev Server (:5173)"]
    DEV_BE["Node.js / tsx Backend (:3000)"]
    DEV_PG["PostgreSQL 16 PGlite WASM (pgcrypto)"]
    DEV_RD["SharedRedisClusterStore / Redis Local"]
    DEV_FE --> DEV_BE
    DEV_BE --> DEV_PG
    DEV_BE --> DEV_RD
  end

  subgraph PREPROD["2. Environnement de Préproduction / Staging (CI/CD)"]
    STG_NGINX["Nginx TLS Staging (:443)"]
    STG_APP["Conteneur Frontend SPA (UID 10001)"]
    STG_API["Conteneur Backend Express (UID 10001)"]
    STG_PG[("PostgreSQL 16 Staging")]
    STG_RD[("Redis 7 Staging")]
    STG_CLAM["ClamAV clamd (:3310)"]
    STG_NGINX --> STG_APP
    STG_NGINX --> STG_API
    STG_API --> STG_PG
    STG_API --> STG_RD
    STG_API --> STG_CLAM
  end

  subgraph PROD["3. Environnement de Production Durci (docker-compose.prod.yml)"]
    subgraph DMZ["Réseau DMZ (tradelink-dmz)"]
      PRD_NGINX["Nginx 1.27 Reverse Proxy\n(TLS 1.2/1.3, HSTS, /metrics -> 403)"]
    end
    subgraph INTERNAL["Réseau Interne Isolé (tradelink-internal, internal: true)"]
      PRD_APP["App Frontend (USER 10001:10001, read_only, cap_drop: ALL)"]
      PRD_API["Backend API (USER 10001:10001, read_only, cap_drop: ALL)"]
      PRD_SBX["Sandbox DB Migration (USER 20001:20001, network_mode: none)"]
      PRD_PG[("PostgreSQL 16 Production\n(Volumes chiffrés + Backups)")]
      PRD_RD[("Redis 7 Production\n(AOF + Password)")]
      PRD_MINIO[("MinIO S3 Storage\n(Buckets privés + KMS)")]
      PRD_VAULT["HashiCorp Vault 1.16.2\n(Stockage persistant, hors mode -dev)"]
      PRD_CLAM["ClamAV 1.4 Daemon\n(TCP 3310)"]
      PRD_PROM["Prometheus v2.52 + Grafana 11\n(Scrape Bearer Token)"]
    end
    PRD_NGINX --> PRD_APP
    PRD_NGINX --> PRD_API
    PRD_API --> PRD_PG
    PRD_API --> PRD_RD
    PRD_API --> PRD_MINIO
    PRD_API --> PRD_VAULT
    PRD_API --> PRD_CLAM
    PRD_API --> PRD_SBX
    PRD_PROM --> PRD_API
  end
```
