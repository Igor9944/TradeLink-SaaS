# MATRICE DE SUIVI DES FONCTIONNALITÉS — TRADELINK SaaS B2B

**Date de mise à jour** : 24 novembre 2026  
**Branche** : `main`

---

## 1. Définition des États Obligatoires (Section 3.2)

| État | Signification |
|---|---|
| **TERMINÉ ET VALIDÉ** | Fonction implémentée de bout en bout et tests automatisés concluants |
| **DÉVELOPPÉ À VALIDER** | Code complet et testé localement, en attente de validation sur service externe réel |
| **PARTIEL** | Fonctionnalité commencée mais incomplète (en cours de finalisation dans les lots courants) |
| **NON DÉVELOPPÉ** | Fonctionnalité absente |
| **BLOQUÉ** | Dépendance, clé API, OAuth ou infrastructure externe payante/autorisée manquante |
| **À CORRIGER** | Fonction existante présentant une anomalie identifiée |

---

## 2. Matrice Exhaustive par Module et Fonctionnalité

| Module / Fonctionnalité | État Initial (Audit Lot 0) | Preuve Code / Route / Service | Suite de Test Associée | Observation / Action Requise |
|---|---|---|---|---|
| **Authentification Argon2id (RFC 9106)** | TERMINÉ ET VALIDÉ | `src/services/securityCrypto.ts`, `POST /api/v1/auth/register`, `POST /api/v1/auth/login` | `test:lot1-audit`, `test:security` | Paramètres `m=65536, t=3, p=4`, rejet des anciens hashes FNV/SHA-512 |
| **Vérification OTP E-mail & Téléphone** | TERMINÉ ET VALIDÉ | `POST /api/v1/auth/verify-otp`, `POST /api/v1/auth/verify-phone` | `test:auth-lifecycle` | Expiration 10 min, max 5 tentatives |
| **MFA TOTP RFC 6238 & Codes de secours** | TERMINÉ ET VALIDÉ | `POST /api/v1/auth/mfa/setup`, `/verify`, `/recovery-codes`, `/verify-recovery` | `test:lot1-audit`, `test:lot3-actors` | Obligatoire pour `ADMIN` sur toutes les routes privées |
| **Sessions uniques Redis, Refresh & Appareils** | TERMINÉ ET VALIDÉ | `TradeLinkRedisManager`, `GET/DELETE /api/v1/auth/sessions`, `/devices` | `test:lot2-persistence`, `test:auth-lifecycle` | Révocation automatique de la session précédente et détection de rejeu |
| **Modèle RBAC/ABAC & Isolation Multi-Tenant** | TERMINÉ ET VALIDÉ | `enforceRBACAndOwnership`, `companyAndAccountEngine.ts`, `/api/v1/companies/*` | `test:lot3-actors`, `lot9.security.regression.test.ts` | 7 rôles plateforme + 7 rôles internes d'organisation, anti-IDOR strict |
| **KYC, Chiffrement KMS AES-256-GCM & SLA J+7** | TERMINÉ ET VALIDÉ | `kycEngine.ts`, `/api/v1/kyc/*`, `KycModuleViews.tsx` | `test:kyc`, `test:lot1-audit` | 8 états canoniques, URL présignées HMAC 15 min, relances J+1..J+7 |
| **Catalogue B2B, Variantes, Paliers & Comparateur** | TERMINÉ ET VALIDÉ | `catalogEngine.ts`, `/api/v1/catalog/*`, `/api/v1/products` | `test:catalog`, `test:lot4-commercial` | Paliers dégressifs, MOQ, modération Admin, favoris |
| **Stocks, Réservations Atomiques & Inventaires** | TERMINÉ ET VALIDÉ | `stockEngine.ts`, `/api/v1/stocks/*` | `test:stock`, `test:lot4-commercial` | Anti-surréservation transactionnelle, balayage TTL, valorisation |
| **Devis (RFQ), Négociation & Conversion Commande** | TERMINÉ ET VALIDÉ | `commercialEngine.ts`, `/api/v1/quotes/*`, `/api/v1/orders/*` | `test:commercial-cycle`, `test:lot4-commercial` | Machine à états stricte, réservation atomique de stock |
| **Facturation, Avoirs & Sceau SHA-256** | TERMINÉ ET VALIDÉ | `billingDocumentEngine.ts`, `/api/v1/invoices/*`, `/api/v1/documents/*` | `test:billing-documents` | Multi-juridictions (MA, FR, EU, INTL, OHADA), jetons temporaires |
| **Paiements Séquestre & Webhooks HMAC-SHA256** | TERMINÉ ET VALIDÉ | `/api/v1/payments/*`, `/api/v1/webhooks/payments/*` | `test:lot4-commercial`, `lot9.security.regression.test.ts` | Stripe, Konnect, Flouci, CMI, Virement, LC ; anti-rejeu 300s ; fail-closed 503 |
| **Logistique Multimodale, GPS, Chaîne du Froid & POD** | TERMINÉ ET VALIDÉ | `logisticsEngine.ts`, `/api/v1/logistics/*` | `test:logistics`, `test:logistics-advanced` | 10 statuts, alertes thermiques GDP, e-CMR, preuve de livraison signée |
| **Comptabilité Partie Double, Grand Livre, FEC & Calculs** | TERMINÉ ET VALIDÉ | `accountingEngine.ts`, `/api/v1/accounting/*`, `/api/v1/calc/simple` | `test:accounting`, `test:financial-engine` | PCG, IFRS, OHADA, PCM ; immuabilité des écritures validées ; contre-passation |
| **Messagerie B2B & Centre de Notifications** | TERMINÉ ET VALIDÉ | `messagingEngine.ts`, `notificationEngine.ts`, `/api/v1/messaging/*`, `/api/v1/notifications/*` | `test:notifications` | Pièces jointes scannées, traduction à la volée, anti-doublon |
| **Room Live WebRTC SFU & Restriction Client** | TERMINÉ ET VALIDÉ | `roomLiveSfuEngine.ts`, `/api/v1/rooms/*`, `RoomLiveCreateModal.tsx` | `test:room-live`, `test:lot5-roomlive` | `CLIENT` interdit de création (`403`), lobby knocking, modération, RGPD 90j |
| **Intégration Google Meet API v2** | DÉVELOPPÉ À VALIDER | `googleMeetService.ts`, `/api/v1/rooms/google-meet/*` | `test:lot5-roomlive` | Enrichissement LOT 5 (`spaces.patch`, `conferenceRecords`, OAuth2) ; OAuth Google réel requis en prod |
| **Assistant IA Exclusif Google Gemini** | DÉVELOPPÉ À VALIDER | `geminiAiService.ts`, `copilotEngine.ts`, `/api/v1/copilot/*` | `test:lot6-ai-gemini`, `test:copilot` | Zéro dépendance OpenAI/Ollama, filtrage RBAC/RAG, clé `GEMINI_API_KEY` requise en prod |
| **Traduction Native (FR/EN/AR/ES) & Mention Légale** | TERMINÉ ET VALIDÉ | `src/i18n/config.ts`, `src/i18n/locales/es.json`, `translationEngine.ts`, `tradeGlossary.ts` | `test:lot7-translation`, `lot9.security.regression.test.ts` | Couverture FR (référence), EN, AR (RTL), ES + marquage `isCertified: false` & `legalDisclaimer` |
| **Importation Universelle Multi-Formats (26 formats)** | TERMINÉ ET VALIDÉ | `importExportEngine.ts`, `/api/v1/import/*` | `test:admin`, `test:admin-security`, `lot9.security.regression.test.ts` | `CSV`, `XLS`, `XLSX`, `ODS`, `DOC`, `DOCX`, `PDF`, `ODT`, `RTF`, `TXT`, `JPG`, `JPEG`, `PNG`, `TIFF`, `BMP`, `JSON`, `XML`, `YAML`, `SQL`, `SQLITE`, `BAK`, `DBF`, `CDX`, `ZIP`, `TAR`, `GZ` |
| **Exportation Universelle Multi-Formats (17 formats)** | TERMINÉ ET VALIDÉ | `importExportEngine.ts`, `/api/v1/export` | `test:admin`, `test:admin-security`, `lot9.security.regression.test.ts` | `CSV`, `XLS`, `XLSX`, `ODS`, `PDF`, `DOCX`, `ODT`, `RTF`, `TXT`, `JSON`, `XML`, `YAML`, `SQL`, `SQLITE`, `DBF`, `CDX`, `BAK` + aller-retour vérifié |
| **OCR & IDP Multi-Profils (PDF/JPG/PNG/WEBP/TIFF/BMP)** | TERMINÉ ET VALIDÉ | `ocrDocumentEngine.ts`, `/api/v1/ocr/*` | `test:ocr`, `lot9.security.regression.test.ts` | Signatures binaires `TIFF`/`BMP`, extraction 7 profils et garde-fou `canTriggerAutomatedDownstreamAction` |
| **Observabilité Prometheus, Sondes K8s, Circuit Breakers & DLQ** | TERMINÉ ET VALIDÉ | `observabilityMetrics.ts`, `circuitBreaker.ts`, `deadLetterQueue.ts` | `test:lot8-performance`, `test:performance` | Latence p95 < 200 ms, `/metrics` protégé par token Bearer / RBAC Admin |
| **Déploiement Internet & Validation Post-Déploiement** | BLOQUÉ | `Dockerfile`, `docker-compose.prod.yml`, `.github/workflows/deploy.yml` | Manifests YAML & builds validés localement | Requiert infrastructure d'hébergement, DNS, certificats TLS et autorisation utilisateur |
