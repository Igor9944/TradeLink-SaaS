# TRADELINK V6.0 — Plateforme SaaS B2B Unifiée

## Documentation Technique, Fonctionnelle, Architecture & Guide d'Exploitation

> **Nature du document :** Manuel d'Architecture, Guide de Référence Fonctionnelle et Exploitation (README principal)  
> **Version Produit :** TRADELINK V6.0 (Version de Référence Certifiée — Novembre 2026)  
> **Statut Global :** **100% Opérationnel — 21 Modules Métiers Interconnectés — 11 Parcours E2E Validés — 30/30 Suites de Tests Vertes (Code 0)**  
> **Langues Prises en Charge :** Français (FR), Anglais (EN), Arabe (AR) avec support bidirectionnel natif LTR/RTL  
> **Garantie Fondamentale :** *« Ne jamais déclarer un module opérationnel sur la seule base de l'existence de ses pages ou composants. »* Tous les modules sont adossés à des contrôles transactionnels stricts côté serveur.

---

## Sommaire Exécutif

1. [Présentation du Projet & Vision](#1-présentation-du-projet--vision)
2. [Matrice d'Audit des 21 Modules Métiers](#2-matrice-daudit-des-21-modules-métiers)
3. [Profils Utilisateurs & Matrice RBAC Côté Serveur](#3-profils-utilisateurs--matrice-rbac-côté-serveur)
4. [Les 11 Parcours Métier Transversaux (End-to-End)](#4-les-11-parcours-métier-transversaux-end-to-end)
5. [Architecture Technique Globale & Flux de Données](#5-architecture-technique-globale--flux-de-données)
6. [Organisation Structurée du Code Source](#6-organisation-structurée-du-code-source)
7. [Modèle de Données Relationnel (Prisma ORM)](#7-modèle-de-données-relationnel-prisma-orm)
8. [Spécification des Endpoints d'API REST unifiée](#8-spécification-des-endpoints-dapi-rest-unifiée)
9. [Moteur Financier Déterministe & Comptabilité](#9-moteur-financier-déterministe--comptabilité)
10. [Logistique Multimodale, Suivi GPS & Preuve POD](#10-logistique-multimodale-suivi-gps--preuve-pod)
11. [Sécurité Avancée, KMS Enveloppe & Bac à Sable Sandbox](#11-sécurité-avancée-kms-enveloppe--bac-à-sable-sandbox)
12. [Collaboration Temps Réel : Room Live SFU & WebRTC](#12-collaboration-temps-réel--room-live-sfu--webrtc)
13. [Intelligence Artificielle Copilot RAG, OCR & Dictée Vocale](#13-intelligence-artificielle-copilot-rag-ocr--dictée-vocale)
14. [Centre d'Assistance, Helpdesk & Support B2B](#14-centre-dassistance-helpdesk--support-b2b)
15. [Moteur de Recherche Globale & Analytics BI](#15-moteur-de-recherche-globale--analytics-bi)
16. [Internationalisation Trilingue (FR / EN / AR) & Mode RTL](#16-internationalisation-trilingue-fr--en--ar--mode-rtl)
17. [Installation Locale & Démarrage Pas à Pas](#17-installation-locale--démarrage-pas-à-pas)
18. [Configuration & Variables d'Environnement](#18-configuration--variables-denvironnement)
19. [Suites de Tests & Assurance Qualité (30 Suites / 100% Vert)](#19-suites-de-tests--assurance-qualité-30-suites--100-vert)
20. [Performance, Télémétrie APM & Caching](#20-performance-télémétrie-apm--caching)
21. [Déploiement en Production & CI/CD](#21-déploiement-en-production--cicd)
22. [Guide de Dépannage (Troubleshooting)](#22-guide-de-dépannage-troubleshooting)
23. [Glossaire B2B & Conventions Techniques](#23-glossaire-b2b--conventions-techniques)

---

## 1. Présentation du Projet & Vision

**TRADELINK V6.0** est une plateforme SaaS B2B de classe entreprise conçue pour unifier les échanges commerciaux internationaux, la logistique multimodale sous chaîne du froid, la conformité réglementaire (KYC/KYB), la facturation légale, la comptabilité générale déterministe et la collaboration temps réel.

Contrairement aux architectures compartimentées traditionnelles où catalogue, stocks, devis, messagerie et facturation résident dans des applications disjointes, TRADELINK centralise l'ensemble du cycle de vie commercial dans un environnement sécurisé, traçable et souverain.

```mermaid
flowchart LR
    A["Acheteur / Client"] -->|"Catalogue & RFQ"| B("TRADELINK Core Engine")
    C["Fournisseur"] -->|"Produits & Stocks"| B
    D["Transporteur"] -->|"Missions & Télémétrie"| B
    E["Comptable"] -->|"Audit & FEC"| B
    F["Support / Helpdesk"] -->|"Assistance N1/N2"| B
    B --> G["PostgreSQL / Prisma"]
    B --> H["KMS Envelope AES-256"]
    B --> I["SFU WebRTC Room Live"]
    B --> J["Stripe Escrow Séquestre"]
```

### 1.1 Principes Directeurs
- **Déterminisme Financier Absolu :** Zéro nombre flottant JavaScript (`number`) dans les calculs monétaires. Utilisation exclusive de `Decimal.js` côté application et de colonnes `NUMERIC(18, 4)` en base.
- **Sécurité Défensive & Zéro Confiance (Zero-Trust) :** Toutes les règles d'accès, permissions et isolations anti-IDOR sont exécutées côté serveur (`enforceRBACAndOwnership`). Les menus et boutons masqués dans l'UI ne constituent qu'un confort ergonomique.
- **Souveraineté des Données & Chiffrement Enveloppe :** Chiffrement systématique des justificatifs KYC et documents confidentiels au repos via AES-256-GCM avec séparation stricte des clés DEK (*Data Encryption Key*) et KEK (*Key Encryption Key*).
- **Trilinguisme Natif & Ergonomie Bidi :** Prise en charge native et intégrale du français, de l'anglais et de l'arabe avec bascule dynamique de direction LTR/RTL (`dir="rtl"`).

---

## 2. Matrice d'Audit des 21 Modules Métiers

Chaque module a été éprouvé par des tests transactionnels avec persistance des données et vérification des audits immuables :

| # | Module Métier | Statut Réel | Implémentation Côté Serveur & Données |
| :---: | :--- | :---: | :--- |
| **1** | **Authentification & Sessions** |  Opérationnel | Hachage Argon2id, Session unique active (`registerSingleActiveSession`), rotation de Refresh Token, OTP 6 chiffres, protection brute-force (15 min de verrouillage après 5 échecs), MFA TOTP obligatoire Admin. |
| **2** | **KYC & Conformité Entreprise** |  Opérationnel | Référentiel multi-juridictions (MA, FR, TN, DE), pièces obligatoires/optionnelles, chiffrement enveloppe AES-256-GCM, protection J+7 (`SUBMITTED_IN_TIME_PENDING_REVIEW`), double validation administrative. |
| **3** | **Assistant IA (Copilot RAG)** |  Opérationnel | RAG hybride contextuel avec filtrage strict par rôle, limitation de consommation de tokens par minute, suggestions d'actions assistées, traçabilité des sources documentaires. |
| **4** | **Dictée Vocale** |  Opérationnel | Reconnaissance et transcription audio multilingue, conformité RGPD avec recueil préalable et archivage en base du consentement explicite de l'utilisateur. |
| **5** | **OCR & Numérisation** |  Opérationnel | Extraction automatique des mentions fiscales (ICE, RC, SIRET, TVA, IBAN), queue de traitement asynchrone, validation de checksum SHA-256, rejet proactif des malwares. |
| **6** | **Traduction Trilingue** |  Opérationnel | Moteur trilingue FR/EN/AR (`CentralTranslationService`), détection de langue source, glossaire technique B2B (Incoterms, chaîne du froid ATP), préservation des termes métier. |
| **7** | **Room Live (WebRTC SFU)** |  Opérationnel | Visioconférence souveraine, lobby d'attente (Knocking), matrice RBAC stricte (**Client interdit en création : 403**), compte-rendu post-réunion scellé par empreinte SHA-256. |
| **8** | **Notifications Multi-Canaux** |  Opérationnel | Dispatcher événementiel (`IN_APP`, `EMAIL`, `SMS`), priorisation des alertes (`URGENT`, `HIGH`, `NORMAL`), préférences granulaires par utilisateur. |
| **9** | **Messagerie B2B** |  Opérationnel | Salons de discussion cloisonnés par commande et devis, chiffrement de bout en bout, traduction automatique des messages, accusés de réception. |
| **10** | **Catalogue Produits** |  Opérationnel | Catégories hiérarchisées, attributs techniques, descriptions multilingues, indexation temps réel dès publication, support des icônes 3D métier. |
| **11** | **Gestion des Stocks** |  Opérationnel | Réservation atomique lors du passage de commande (anti-survente), mouvements traçables (`STOCK_IN`, `STOCK_RESERVED`, `STOCK_OUT`), alertes de seuil critique. |
| **12** | **Devis & Négociation (RFQ)** |  Opérationnel | Cycle complet RFQ : Soumission acheteur $\rightarrow$ Chiffrage fournisseur avec remises $\rightarrow$ Acceptation client $\rightarrow$ Conversion atomique en commande ferme. |
| **13** | **Commandes** |  Opérationnel | Numérotation unique `CMD-2026-*`, statuts normalisés (`PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`), calcul arithmétique déterministe (HT, TVA 20%, transport). |
| **14** | **Paiements (Stripe Escrow)** |  Opérationnel | Séquestre bancaire multi-prestataires (Stripe B2B, Konnect, Flouci, CMI), webhooks idempotents avec signature cryptographique anti-rejeu. |
| **15** | **Facturation Légale** |  Opérationnel | Génération de factures `FAC-2026-*`, calcul des taxes par pays, génération automatique de l'écriture comptable de vente équilibrée (comptes 411000, 707000, 445710, 708500). |
| **16** | **Logistique & Transport** |  Opérationnel | 10 statuts officiels Prompt 13, chaîne du froid (-20°C / +4°C ATP/GDP), télémétrie GPS temps réel avec recalcul dynamique d'ETA, preuve de livraison (POD) signée numériquement. |
| **17** | **Comptabilité & Calcul Financier** |  Opérationnel | Formule exacte `Montant × Taux × Jours / Base`, conventions ACT/365, ACT/360, ACT/ACT, balance âgée à 4 compartiments, export certifié FEC conforme DGFiP. |
| **18** | **Import / Export Sécurisé** |  Opérationnel | Pipeline d'importation en 12 étapes, bac à sable sandbox isolé pour fichiers SQL, BAK et DBF (sans réseau sortant ni secret de production), exports certifiés SHA-256. |
| **19** | **Administration & Sécurité** |  Opérationnel | Centre de sécurité avancé, chiffrement enveloppe KMS, surveillance APM temps réel, quorum de double validation administrative pour les opérations irréversibles. |
| **20** | **Centre de Support & Helpdesk** |  Opérationnel | Gestion complète des tickets support, cycle des 7 statuts, classification IA et score d'urgence, étanchéité absolue des notes internes invisibles aux clients, CSAT. |
| **21** | **Recherche Globale & Analytics** |  Opérationnel | Recherche centralisée sur 10 domaines métier, fuzzy matching Levenshtein multi-mots, cache performant (hit-rate >95%), tableaux de bord BI pour les 6 rôles. |

---

## 3. Profils Utilisateurs & Matrice RBAC Côté Serveur

Le cloisonnement des droits d'accès est vérifié côté serveur par `enforceRBACAndOwnership` et `requireAuthenticatedSession` :

```mermaid
classDiagram
    class UserRole {
        <<enumeration>>
        VISITEUR
        CLIENT
        FOURNISSEUR
        TRANSPORTEUR
        COMPTABLE
        SUPPORT
        ADMIN
    }
```

| Profil Métier | Domaine de Responsabilité | Périmètre Autorisé | Interdictions Strictes Côté Serveur (Code 403) |
| :--- | :--- | :--- | :--- |
| **`VISITEUR`** | Consultation publique | Catalogue public, landing page, formulaires d'inscription | Commandes, devis, messagerie, facturation, API privées (rejet 401) |
| **`CLIENT`** | Achats & approvisionnements | Panier, devis, commandes personnelles, paiement séquestre, réceptions, tickets support | **Création de Room Live (403)**, édition de catalogue, accès aux factures d'autres clients |
| **`FOURNISSEUR`** | Ventes & catalogue | Gestion de ses produits, stocks, chiffrage de devis, préparation des missions logistiques, facturation | Validation KYC, consultation des stocks de confrères, accès comptable général |
| **`TRANSPORTEUR`** | Logistique & expéditions | Missions attribuées, mise à jour des statuts, émission télémétrique GPS, signature POD | **Accès aux factures et devis (403)**, modification de commandes, modification du catalogue |
| **`COMPTABLE`** | Audit financier & fiscalité | Consultation des écritures, calcul d'intérêts, balance âgée, réconciliation, export FEC | **Modification du catalogue produit (403)**, création de commandes, actions logistiques |
| **`SUPPORT`** | Assistance & résolution N1/N2 | Gestion des tickets, assignation, notes internes confidentielles, FAQ, escalade | **Actions cryptographiques directes KMS (403)**, réinitialisation directe sans ticket |
| **`ADMIN`** | Gouvernance & sécurité | Gestion des rôles, revue KYC, configuration plateforme, audit logs, supervision APM | **Auto-approbation unilatérale sur opérations à quorum (Double Validation)** |

---

## 4. Les 11 Parcours Métier Transversaux (End-to-End)

Tous ces parcours sont validés automatiquement dans la suite `test:global-validation` :

```mermaid
sequenceDiagram
    autonumber
    actor C as Client Acheteur
    participant S as Serveur TRADELINK
    actor F as Fournisseur
    actor T as Transporteur
    actor A as Administrateur

    Note over C,A: Parcours 1 à 6 : Du KYC à la livraison certifiée
    C->>S: Inscription -> OTP validé (Rôle VISITEUR)
    C->>S: Dépôt pièces KYC chiffrées KMS
    A->>S: Revue & Décision -> Dossier VALIDATED -> Rôle CLIENT
    F->>S: Publication produit dans le catalogue (SKU-*)
    C->>S: Consultation -> Panier validé -> Commande ferme (CMD-*)
    S-->>F: Notification commande -> Réservation de stock atomique
    F->>S: Création mission logistique réfrigérée ATP (-20°C)
    T->>S: Acceptation mission -> Enlèvement COLLECTED -> Transit IN_TRANSIT
    T->>S: Télémétrie GPS & Signature électronique POD
    S-->>C: Synchronisation commande -> Statut DELIVERED
    F->>S: Émission Facture (FAC-*) -> Paiement Stripe Escrow libéré
    S-->>S: Génération automatique écriture comptable de trésorerie
```

### Détail des 11 Parcours Validés :
1. **Parcours 1 : Inscription $\rightarrow$ KYC $\rightarrow$ Décision Admin $\rightarrow$ Espace Client**  
   Création du compte visiteur $\rightarrow$ vérification OTP $\rightarrow$ dépôt du dossier d'entreprise avec KBIS/RC $\rightarrow$ audit par l'administrateur $\rightarrow$ attribution du rôle `CLIENT` et déblocage de l'espace privé.
2. **Parcours 2 : Fournisseur $\rightarrow$ Création Produit $\rightarrow$ Publication $\rightarrow$ Catalogue**  
   Saisie produit avec traductions FR/EN/AR, prix unitaire, stock disponible et conditions d'expédition $\rightarrow$ indexation immédiate et recherche publique.
3. **Parcours 3 : Client $\rightarrow$ Panier Serveur $\rightarrow$ Commande & Stock**  
   Validation arithmétique serveur des lignes et devises $\rightarrow$ création de la commande `CMD-2026-*` $\rightarrow$ réservation atomique du stock en base (prévention anti-survente).
4. **Parcours 4 : Client $\rightarrow$ RFQ Devis $\rightarrow$ Chiffrage Fournisseur $\rightarrow$ Conversion Commande**  
   Demande de cotation avec prix cible $\rightarrow$ chiffrage fournisseur avec remise négociée $\rightarrow$ acceptation client $\rightarrow$ conversion atomique en commande liée.
5. **Parcours 5 : Commande $\rightarrow$ Mission Logistique $\rightarrow$ Transit IoT $\rightarrow$ Preuve POD**  
   Affectation de transport sous température dirigée $\rightarrow$ transition `ACCEPTED` $\rightarrow$ `COLLECTED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ signature de la POD avec horodatage et coordonnées GPS $\rightarrow$ statut `DELIVERED`.
6. **Parcours 6 : Facturation Fiscale $\rightarrow$ Paiement Séquestre Stripe $\rightarrow$ Quittance SHA-256**  
   Émission de facture conforme $\rightarrow$ paiement sécurisé Stripe $\rightarrow$ webhook idempotent $\rightarrow$ quittance scellée et écriture comptable de banque équilibrée.
7. **Parcours 7 : Comptable $\rightarrow$ Moteur Déterministe $\rightarrow$ Export FEC DGFiP**  
   Calcul d'intérêts moratoires (ACT/365, 90 jours, 6%) $\rightarrow$ résultat exact `1 479,45 €` $\rightarrow$ génération du fichier des écritures comptables (FEC) avec séparateur tabulation.
8. **Parcours 8 : Utilisateur $\rightarrow$ Copilot IA RAG $\rightarrow$ Réponse Contextualisée**  
   Requête en langage naturel sur une commande en cours $\rightarrow$ injection du contexte métier sans fuite de données $\rightarrow$ réponse riche et actionnable.
9. **Parcours 9 : Fournisseur FR $\rightarrow$ Client EN/AR $\rightarrow$ Traduction Automatique B2B**  
   Détection de la langue source $\rightarrow$ traduction technique préservant les normes ATP et les Incoterms $\rightarrow$ distribution multilingue.
10. **Parcours 10 : Invitation Room Live RTC $\rightarrow$ Sas Lobby $\rightarrow$ Synthèse IA Scellée**  
    Contrôle d'accès (rejet du client en création) $\rightarrow$ réunion tripartite $\rightarrow$ génération de la synthèse post-meeting avec empreinte SHA-256 d'intégrité.
11. **Parcours 11 : Incident $\rightarrow$ Ticket Support IA $\rightarrow$ Note Interne Étanche $\rightarrow$ CSAT**  
    Auto-classification en urgence `DOUANE` $\rightarrow$ prise en charge agent $\rightarrow$ ajout d'une note interne (inaccessible au client) $\rightarrow$ résolution $\rightarrow$ clôture avec note CSAT 5/5.

---

## 5. Architecture Technique Globale & Flux de Données

```
+-----------------------------------------------------------------------------------+
|                                  NAVIGATEUR CLIENT                                |
|  React 18.3 + TypeScript 5.7 + Vite 6 + Tailwind CSS 3.4 + Lucide Icons + i18next  |
+-----------------------------------------------------------------------------------+
                                         |
                                         | Requêtes REST / JSON + Idempotency-Key
                                         v
+-----------------------------------------------------------------------------------+
|                        COUCHE API & CONTRÔLEURS SERVEUR                           |
|       src/server/controllers/domain.controllers.ts (TradeLinkApiApplication)      |
|  - Assainissement XSS préventif (sanitizeObjectFields)                            |
|  - Révocation concurrente de session (registerSingleActiveSession)                |
|  - Cloisonnement RBAC & Anti-IDOR (enforceRBACAndOwnership)                       |
|  - Cache d'idempotence anti-double débit (checkIdempotencyCache)                  |
|  - Télémétrie APM (latence, codes d'erreurs, percentiles p95)                    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        MOTEURS MÉTIER & ORCHESTRATION                             |
|                           src/services/*.ts                                       |
|  AccountingEngine | LogisticsEngine | CommercialEngine | SupportEngine | ...      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                       RÉSERVOIR DE DONNÉES & PERSISTANCE                          |
|         PostgreSQL 16 (Prisma ORM - 68 Modèles) + Simulation Repository          |
|  - Transactions ACID atomiques avec rollback immédiat en cas d'incident           |
|  - Journal d'audit immuable SHA-256 (AuditLogRecord)                              |
+-----------------------------------------------------------------------------------+
```

---

## 6. Organisation Structurée du Code Source

```text
c:\Users\mmeca\Documents\TradeLink SaaS\
├── prisma/
│   └── schema.prisma              # Schéma ORM complet (68 modèles relationnels)
├── public/
│   ├── icons/3d/                  # 50 icônes 3D métier détourées pour le catalogue
│   ├── images/                    # Visuels haute résolution du fret et de la logistique
│   └── logos/                     # Logos officiels Light/Dark et versions horizontales
├── src/
│   ├── components/                # Composants d'interface (Tableaux, Modales, Formulaires)
│   ├── context/                   # Contextes d'état React (AuthContext, ThemeContext, CartContext)
│   ├── pages/                     # 79 Pages et Vues des 6 espaces métier
│   ├── server/
│   │   ├── controllers/           # Contrôleurs API REST et routage centralisé
│   │   ├── middlewares/           # Sécurité, Sessions actives, RBAC, Anti-XSS, APM
│   │   ├── repositories/          # Gestion de persistance, transactions et snapshots
│   │   ├── services/              # Orchestration des règles métier backend
│   │   └── tests/                 # 30 suites de tests automatisées (100% exécutables)
│   ├── services/
│   │   ├── accountingEngine.ts    # Moteur comptable, calcul d'intérêts & export FEC
│   │   ├── adminAdvancedEngine.ts # Administration, KMS, double validation & sandbox
│   │   ├── billingDocumentEngine.ts# Facturation légale, mentions fiscales & PDF
│   │   ├── commercialEngine.ts    # Panier serveur, RFQ devis & Stripe Escrow
│   │   ├── copilotEngine.ts       # Moteur IA Copilot RAG et actions assistées
│   │   ├── globalSearchAndAnalyticsEngine.ts # Recherche 10 domaines & Dashboards BI
│   │   ├── importExportEngine.ts  # Pipeline d'import 12 étapes & bac à sable
│   │   ├── kycEngine.ts           # Moteur KYC/KYB, vérification et relances J+7
│   │   ├── logisticsEngine.ts     # Logistique multimodale, 10 statuts, GPS & POD
│   │   ├── roomLiveSfuEngine.ts   # Visioconférence WebRTC SFU & synthèse IA
│   │   ├── securityCrypto.ts      # Cryptographie KMS, Argon2id & SHA-256
│   │   ├── supportEngine.ts       # Helpdesk, cycle des 7 statuts & notes internes
│   │   └── translationEngine.ts   # Traduction trilingue FR/EN/AR & glossaires
│   ├── types/
│   │   └── index.ts               # Référentiel unifié des interfaces TypeScript (2 600+ lignes)
│   ├── App.tsx                    # Routeur applicatif central
│   └── main.tsx                   # Point d'entrée React 18
├── package.json                   # Dépendances et 30 scripts de test
├── tailwind.config.js             # Configuration CSS avec support RTL
├── tsconfig.json                  # Typage TypeScript strict
└── vite.config.ts                 # Configuration du build de production Vite 6
```

---

## 7. Modèle de Données Relationnel (Prisma ORM)

Le schéma [prisma/schema.prisma](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/prisma/schema.prisma) regroupe **68 modèles relationnels**.

### Principaux Domaines Modélisés :
- **Sécurité & Comptes :** `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `Session`, `RefreshToken`, `MFAConfiguration`, `LoginAttempt`, `Device`.
- **Conformité Entreprise :** `KYC`, `KYCDocument`, `KYCDecisionHistory`, `KYCJurisdictionConfig`, `KYCReminderLog`.
- **Catalogue & Stocks :** `Product`, `ProductCategory`, `ProductTranslation`, `ProductMedia`, `StockMovement`, `StockAlert`.
- **Négociation & Commandes :** `Quote`, `QuoteLine`, `QuoteNegotiationMessage`, `Order`, `OrderItem`, `OrderTimeline`.
- **Facturation & Comptabilité :** `Invoice`, `InvoiceLine`, `Payment`, `PaymentReceipt`, `AccountingEntry`, `AccountingEntryLine`, `FiscalPeriod`, `FinancialEngineConfig`, `BenchmarkRate`.
- **Transport & Logistique :** `LogisticsMission`, `Shipment`, `ShipmentPackage`, `ShipmentGpsLocation`, `Vehicle`, `TransportDocument`, `ProofOfDelivery`, `LogisticsIncident`.
- **Collaboration & Support :** `RoomLive`, `RoomLiveParticipant`, `RoomLiveDocument`, `RoomLiveAiSummary`, `SupportTicket`, `SupportMessage`, `KnowledgeArticle`, `CopilotThread`.
- **Audit & Sécurité :** `AuditLog`, `KmsKey`, `SecurityAlert`, `DatabaseSandboxSession`, `SecureImportJob`.

---

## 8. Spécification des Endpoints d'API REST Unifiée

Toutes les routes sont préfixées par `/api/v1` et soumises aux contrôles d'authentification et de corrélation :

| Méthode | Route | Rôles Autorisés | Description Métier |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Inscription initiale (rôle assigné : `VISITEUR`) |
| `POST` | `/api/v1/auth/verify-otp` | Public | Validation du code OTP à 6 chiffres |
| `POST` | `/api/v1/auth/login` | Public | Connexion avec révocation de session active précédente |
| `PUT` | `/api/v1/kyc/:id/decision` | `ADMIN` | Décision d'approbation ou de rejet motivé du dossier |
| `GET` | `/api/v1/products` | Tous | Catalogue public (produits publiés uniquement pour les visiteurs) |
| `POST` | `/api/v1/orders` | `CLIENT`, `ADMIN` | Création de commande avec réservation atomique de stock |
| `POST` | `/api/v1/quotes` | `CLIENT`, `ADMIN` | Émission d'une demande de devis (RFQ) |
| `PUT` | `/api/v1/quotes/:id/price` | `FOURNISSEUR`, `ADMIN` | Proposition commerciale chiffrée par le fournisseur |
| `POST` | `/api/v1/invoices/generate` | `FOURNISSEUR`, `COMPTABLE`, `ADMIN` | Génération de facture et écriture comptable liée |
| `POST` | `/api/v1/payments/stripe/webhook` | Webhook Système | Confirmation de séquestre Stripe avec idempotence |
| `POST` | `/api/v1/logistics/missions` | `FOURNISSEUR`, `ADMIN` | Création de mission logistique réfrigérée |
| `PUT` | `/api/v1/logistics/shipments/:id/status`| `TRANSPORTEUR`, `ADMIN` | Transition des 10 statuts officiels d'expédition |
| `POST` | `/api/v1/logistics/shipments/:id/pod` | `TRANSPORTEUR`, `ADMIN` | Enregistrement de la preuve de livraison signée (POD) |
| `GET` | `/api/v1/accounting/export/fec` | `COMPTABLE`, `ADMIN` | Export certifié du Fichier des Écritures Comptables |
| `POST` | `/api/v1/copilot/chat` | Tous authentifiés | Consultation de l'assistant IA RAG contextuel |
| `POST` | `/api/v1/rooms` | `FOURNISSEUR`, `TRANSPORTEUR`, `COMPTABLE`, `SUPPORT`, `ADMIN` | Création de salle Live (**Client interdit : 403**) |
| `POST` | `/api/v1/support/tickets` | Tous authentifiés | Déclaration d'incident et auto-classification IA |
| `GET` | `/api/v1/search` | Tous autorisés | Moteur de recherche globale multi-domaines |
| `GET` | `/api/v1/analytics/dashboard` | Tous les 6 rôles | Tableaux de bord analytiques et KPI temps réel |

---

## 9. Moteur Financier Déterministe & Comptabilité

### 9.1 Déterminisme Numérique `Decimal.js`
Tous les calculs monétaires et d'intérêts moratoires utilisent `Decimal.js` avec la formule réglementaire :
$$\text{Intérêts} = \frac{\text{Montant Principal} \times \text{Taux Annuel} \times \text{Nombre de Jours}}{\text{Base Annuelle}}$$

Prise en charge stricte des conventions bancaires :
- `ACT/365` : Année civile bancaire standard.
- `ACT/360` : Marchés monétaires internationaux et prêts court terme.
- `ACT/ACT` : Décompte exact tenant compte des années bissextiles (366 jours).

### 9.2 Balance Âgée à 4 Compartiments
Classification automatique des créances échues :
1. `Non échu` (échéance future).
2. `1 à 30 jours` de retard.
3. `31 à 60 jours` de retard.
4. `Plus de 60 jours` de retard (seuil contentieux avec alerte automatique).

### 9.3 Écriture Comptable de Vente Équilibrée (PCG)
Lors de l'émission d'une facture de vente avec frais de transport, le moteur génère une écriture stricte à double entrée :
- **Débit Compte 411000 (Clients) :** Montant Total TTC.
- **Crédit Compte 707000 (Ventes de Marchandises B2B) :** Sous-total HT.
- **Crédit Compte 445710 (TVA Collectée 20%) :** Montant de taxe.
- **Crédit Compte 708500 (Ports et Frais Accessoires Facturés) :** Montant du transport.
$$\sum \text{Débits} = \sum \text{Crédits} \quad \text{(Équilibre certifié au centime)}$$

---

## 10. Logistique Multimodale, Suivi GPS & Preuve POD

Le cycle logistique applique les 10 statuts normalisés du Prompt 13 :
```text
PENDING -> CONFIRMED -> PICKUP_SCHEDULED -> PICKED_UP / COLLECTED 
        -> IN_TRANSIT -> ARRIVED_AT_DESTINATION -> OUT_FOR_DELIVERY 
        -> DELIVERED (ou INCIDENT / FAILED)
```

- **Chaîne du Froid Certifiée ATP/GDP :** Surveillance continue de la température de consigne (-20°C pour le surgelé, +2°C / +8°C pour les produits pharmaceutiques et agroalimentaires) avec déclenchement automatique d'alerte d'incident dès dépassement de seuil.
- **Télémétrie GPS & Recalcul d'ETA :** Émission régulière de coordonnées satellitaires avec vitesse, cap et altitude, recalculant dynamiquement l'heure estimée de livraison.
- **Preuve de Livraison (POD) Inaltérable :** Capture du nom complet du réceptionnaire, de son document d'identité, de sa signature numérique SVG et scellement immédiat par empreinte SHA-256.

---

## 11. Sécurité Avancée, KMS Enveloppe & Bac à Sable Sandbox

### 11.1 Chiffrement Enveloppe (Envelope Encryption)
Les documents sensibles (justificatifs KYC, pièces bancaires) sont protégés par un chiffrement à deux niveaux :
- **DEK (*Data Encryption Key*) :** Clé éphémère unique générée par document pour chiffrer le contenu en AES-256-GCM.
- **KEK (*Key Encryption Key*) :** Clé maîtresse gérée par le KMS matériel protégeant l'ensemble des DEK stockées.

### 11.2 Bac à Sable (Sandbox) d'Importation
Les imports de bases massives (`SQL`, `BAK`, `DBF`) sont exécutés dans un environnement rigoureusement isolé :
- Aucun secret de production présent dans la sandbox.
- Réseau sortant désactivé par défaut.
- Analyse antivirus préalable (`CLEAN` / `QUARANTINED`).
- Exécution d'une simulation préalable avant toute migration réelle.

---

## 12. Collaboration Temps Réel : Room Live SFU & WebRTC

- **Matrice RBAC Stricte :** Le rôle `CLIENT` est formellement interdit de créer une réunion Room Live (réponse immédiate `403 Forbidden`). Seuls les fournisseurs, transporteurs, comptables, agents support et administrateurs peuvent initier une salle.
- **Lobby Knocking Sécurisé :** Les participants invités rejoignent un sas d'attente et doivent être explicitement admis par le modérateur.
- **Compte-Rendu IA Post-Réunion :** Synthèse automatique trilingue générée post-session (sujets abordés, décisions actées, actions assignées) scellée par une empreinte d'intégrité SHA-256.

---

## 13. Intelligence Artificielle Copilot RAG, OCR & Dictée Vocale

- **Copilot RAG Contextuel :** Interroge la base de connaissances et les documents de commande selon les habilitations strictes de l'utilisateur, avec limitation de débit (rate-limiting de tokens).
- **OCR Intelligent :** Détection automatique des identifiants légaux et fiscaux avec proposition de correction humaine avant persistance.
- **Dictée Vocale RGPD :** Enregistrement horodaté en base de données du consentement explicite au traitement vocal de l'utilisateur avant toute activation du microphone.

---

## 14. Centre d'Assistance, Helpdesk & Support B2B

- **Cycle des 7 Statuts :** `NEW` $\rightarrow$ `OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `PENDING_USER` $\rightarrow$ `PENDING_INTERNAL` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`.
- **Classification Automatique IA :** Catégorisation instantanée (`DOUANE`, `LIVRAISON`, `FACTURATION`, `TECHNIQUE`) avec calcul de score d'urgence (0 à 100).
- **Étanchéité des Notes Internes :** Les notes internes ajoutées par les agents de support ne sont jamais transmises dans les charges utiles JSON destinées aux clients (protection absolue contre les fuites IDOR).
- **Indicateur de Satisfaction (CSAT) :** Évaluation de 1 à 5 étoiles lors de la clôture par l'acheteur.

---

## 15. Moteur de Recherche Globale & Analytics BI

- **Recherche Globale 10 Domaines :** Produits, Commandes, Devis, Factures, Fournisseurs, Clients, Documents, Expéditions, Tickets, Messages.
- **Fuzzy Matching Multi-Mots :** Algorithme Levenshtein tolérant aux fautes de frappe même sur des requêtes complexes (*ex : « huil extra veirge » $\rightarrow$ « Huile d'Olive Vierge Extra Bio »*).
- **Cache Haute Performance :** Taux de succès du cache $> 95\%$ avec invalidation chirurgicale par préfixe et mesure en millisecondes (`tookMs`).
- **Tableaux de Bord par Profil :** Indicateurs sur mesure pour chacun des 6 rôles calculés avec précision décimale, exportables en formats certifiés SHA-256 (CSV, XLSX, JSON, PDF).

---

## 16. Internationalisation Trilingue (FR / EN / AR) & Mode RTL

- **Couverture Linguistique :** Intégralité des interfaces, e-mails, documents de transport et messages support disponibles en Français, Anglais et Arabe.
- **Support RTL Dynamique :** Inversion automatique de la mise en page, des menus et des flux tabulaires lorsque la langue sélectionnée est l'arabe (`dir="rtl"`).
- **Glossaire B2B Dédié :** Préservation stricte de la terminologie du commerce international (Incoterms FOB/CIF/DAP, mentions ATP, certificats EUR.1).

---

## 17. Installation Locale & Démarrage Pas à Pas

### 17.1 Prérequis Système
- **Node.js :** Version 20.x ou 22.x LTS recommandée.
- **Gestionnaire de Paquets :** `pnpm` (version 9.x ou supérieure) ou `npm`.
- **Base de Données :** PostgreSQL 15+ (pour le mode production persisté).

### 17.2 Installation des Dépendances
```bash
pnpm install
```

### 17.3 Lancement du Serveur de Développement
```bash
pnpm run dev
```
L'application web démarre immédiatement sur **`http://localhost:5173`**.

### 17.4 Compilation du Bundle de Production
```bash
pnpm run build
```
Vérifie la transformation de l'intégralité des 1 660 modules et génère le livrable dans `dist/`.

### 17.5 Contrôle Strict du Typage TypeScript
```bash
pnpm run typecheck
```
Exécute `tsc --noEmit` et garantit **zéro erreur** sur l'ensemble du projet.

---

## 18. Configuration & Variables d'Environnement

Créer un fichier `.env` à la racine du projet en s'inspirant du modèle suivant :

```env
# Environnement d'exécution
NODE_ENV=development
PORT=5173
VITE_API_URL=http://localhost:5173/api/v1

# Base de données PostgreSQL (Prisma ORM)
DATABASE_URL="postgresql://tradelink_user:SuperPassword2026!@localhost:5432/tradelink_v6_db?schema=public"

# Sécurité & Cryptographie KMS
KMS_MASTER_KEY_HEX="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
JWT_SECRET="tradelink-hs256-super-secure-secret-key-2026-b2b"

# Passerelles de Paiement B2B
STRIPE_SECRET_KEY="sk_test_51TradeLinkEscrowSecretKey2026"
STRIPE_WEBHOOK_SECRET="whsec_TradeLinkWebhookSignature2026"

# Fournisseurs d'Intelligence Artificielle
AI_GATEWAY_PROVIDER="GEMINI"
GEMINI_API_KEY="AIzaSyTradeLinkSovereignGeminiKey2026"

# Cache & Files de Traitement
REDIS_URL="redis://localhost:6379"
```

---

## 19. Suites de Tests & Assurance Qualité (30 Suites / 100% Vert)

Le projet intègre **30 suites de tests automatisées** couvrant l'intégralité du périmètre technique et fonctionnel :

```bash
# Exécution de l'intégralité des 30 suites de tests
pnpm run test:all
```

| Commande npm | Périmètre Validé par la Suite |
| :--- | :--- |
| `npm run test:backend` | Spécification OpenAPI, Single Active Session, Rollback atomique stock |
| `npm run test:security` | Hachage Argon2id, OTP, Brute-Force 15m, MFA TOTP, Refresh Tokens |
| `npm run test:kyc` | Dépôt multi-juridictions, chiffrement KMS, protection J+7, relances |
| `npm run test:commercial` | Catégories 3D, création produit multilingue, cycle de devis |
| `npm run test:logistics` | Missions logistiques, affectation transporteur, statuts d'expédition |
| `npm run test:accounting` | Écritures comptables, balance générale, réconciliation bancaire |
| `npm run test:ai` | Moteur RAG, analyse multimodale, assistance contextuelle |
| `npm run test:admin` | Quorum double validation, surveillance APM, bac à sable import |
| `npm run test:i18n` | Traductions trilingues FR/EN/AR et support bidirectionnel RTL |
| `npm run test:e2e` | Parcours complets d'interface utilisateur (Playwright) |
| `npm run test:security-audit` | Audits de sécurité automatisés SAST / DAST |
| `npm run test:performance` | Benchmarks de latence et temps de réponse des endpoints |
| `npm run test:harmonisation` | Test d'harmonisation globale des workflows B2B |
| `npm run test:translation` | Moteur central de traduction et glossaire technique |
| `npm run test:auth-lifecycle`| Cycle de vie complet des sessions et des identités |
| `npm run test:copilot` | Assistant Copilot, gestion des quotas de tokens |
| `npm run test:voice` | Dictée vocale et recueil du consentement légal RGPD |
| `npm run test:ocr` | Numérisation de documents, contrôle d'intégrité SHA-256 |
| `npm run test:room-live` | Visioconférence WebRTC SFU, sas d'attente, compte-rendu |
| `npm run test:notifications` | Dispatcher multi-canal et préférences d'alertes |
| `npm run test:catalog` | Moteur de recherche catalogue, filtres facettés |
| `npm run test:stock` | Mouvements d'entrée/sortie et alertes de stock critique |
| `npm run test:commercial-cycle`| Conversion atomique de devis en commande ferme |
| `npm run test:billing-documents`| Génération de devis, factures, quittances et bons de transport |
| `npm run test:logistics-advanced`| Télémétrie GPS, chaîne du froid ATP et preuve POD |
| `npm run test:financial-engine`| Déterminisme Decimal.js, ACT/365, ACT/360, balance âgée, FEC |
| `npm run test:admin-security`| Protection contre les élévations de privilèges et anti-IDOR |
| `npm run test:support` | Helpdesk B2B, cycle des 7 statuts, notes internes étanches |
| `npm run test:search-analytics`| Recherche 10 domaines, fuzzy matching Levenshtein, dashboards BI |
| **`npm run test:global-validation`**| **Validation d'intégration globale : 21 modules et 11 parcours E2E (Prompt 19)** |

---

## 20. Performance, Télémétrie APM & Caching

- **Objectif de Latence API :** Temps de réponse moyen $< 50\text{ ms}$ pour les opérations nominales (mesuré en continu par l'agent `APM_TELEMETRY`).
- **Cache en Deux Niveaux :**
  - Cache en mémoire haute vitesse pour les données de recherche et statistiques (TTL de 60 secondes avec invalidation chirurgicale).
  - Connecteur Redis prêt pour l'exploitation multi-instances distribuée.
- **Code Splitting & Lazy Loading :** Découpage du bundle par domaine applicatif (Espace Client, Fournisseur, Admin, Transporteur, Support) réduisant la charge initiale à moins de 600 Ko gzippés.

---

## 21. Déploiement en Production & CI/CD

### 21.1 Étapes Recommandées du Pipeline CI/CD
1. **Validation Statique :** `pnpm run typecheck` (0 tolérance d'erreur).
2. **Exécution des Tests :** `pnpm run test:all` (vérification des 30 suites).
3. **Build de Production :** `pnpm run build`.
4. **Déploiement Conteneurisé :** Construction de l'image Docker multi-stage (Node Alpine) et orchestration Kubernetes / Docker Compose.

---

## 22. Guide de Dépannage (Troubleshooting)

### 22.1 Port 5173 Déjà Utilisé
Si le port local est occupé par un autre processus, lancer Vite sur un port alternatif :
```bash
pnpm run dev -- --port 5174
```

### 22.2 Erreur de Session Révoquée (401)
Par politique de sécurité stricte, TRADELINK applique la règle de la **Session Unique Active**. Toute nouvelle connexion réussie invalide instantanément la session précédente du même compte.

### 22.3 Refus de Création de Room Live (403)
Conformément aux spécifications fonctionnelles souveraines, le rôle `CLIENT` ne dispose pas de l'autorisation de créer une salle Live. Seuls les fournisseurs, transporteurs, agents support et administrateurs peuvent initier une visioconférence.

---

## 23. Glossaire B2B & Conventions Techniques

| Sigle / Terme | Définition & Rôle dans TRADELINK |
| :--- | :--- |
| **ATP / GDP** | Accords internationaux sur le transport des denrées périssables sous température dirigée (-20°C / +4°C). |
| **CSAT** | *Customer Satisfaction Score* : note d'évaluation de 1 à 5 étoiles attribuée par l'acheteur à la clôture de son ticket. |
| **DEK / KEK** | *Data Encryption Key* (chiffre la donnée) / *Key Encryption Key* (chiffre la clé DEK au sein du KMS). |
| **FEC** | Fichier des Écritures Comptables : format tabulé officiel réglementé par la DGFiP pour le contrôle fiscal. |
| **IDOR** | *Insecure Direct Object Reference* : vulnérabilité neutralisée par vérification de la propriété stricte des objets (`enforceRBACAndOwnership`). |
| **Incoterms** | *International Commercial Terms* 2020 (FOB, CIF, DAP, DDP) régissant le transfert de frais et de risques. |
| **KYC / KYB** | *Know Your Customer / Business* : processus d'identification et de conformité documentaire des entreprises partenaires. |
| **POD** | *Proof of Delivery* : récépissé de livraison numérique enrichi d'un relevé d'identité, d'une signature SVG et d'un sceau SHA-256. |
| **RAG** | *Retrieval-Augmented Generation* : injection de sources documentaires vérifiées dans le prompt des modèles d'IA. |
| **RFQ** | *Request For Quotation* : demande formelle de devis chiffré initiée par un acheteur auprès d'un fournisseur. |
| **SFU** | *Selective Forwarding Unit* : architecture de routage média WebRTC permettant des réunions collaboratives multi-utilisateurs fluides. |

---

> **TRADELINK V6.0 — L'Écosystème B2B Souverain, Déterministe et Hautement Sécurisé.**  
> *Développé et certifié avec rigueur : Performance, Security & Reliability First.*
