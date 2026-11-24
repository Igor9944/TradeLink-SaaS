# CARTOGRAPHIE FONCTIONNELLE GLOBALE — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`

---

## 1. Architecture Fonctionnelle par Domaine

La plateforme **TRADELINK SaaS** est organisée en 12 domaines fonctionnels interconnectés, exposés via le routeur SPA React (`src/App.tsx`) et l'API RESTful Express (`/api/v1/*` dans `src/server/controllers/domain.controllers.ts`).

| # | Domaine Fonctionnel | Composants Frontend Principaux | Services & Moteurs Backend | Modèles Prisma Associés |
|---|---|---|---|---|
| 1 | **Portail Public & Catalogue Ouvert** | `src/pages/PublicAndAuthPages.tsx` (`LandingPage`, `PublicCataloguePage`, `EditorialPublicPage`) | `catalogEngine.ts`, `domain.services.ts` | `Product`, `ProductCategory`, `KnowledgeArticle` |
| 2 | **Authentification, Sessions & MFA** | `src/pages/PublicAndAuthPages.tsx` (`AuthPortalPage`), `RouteGuards.tsx` | `securityCrypto.ts`, `companyAndAccountEngine.ts` | `User`, `Role`, `Permission`, `UserSession`, `TrustedDevice`, `OtpChallenge`, `LoginAttempt`, `PasswordResetToken` |
| 3 | **Gouvernance des Organisations B2B** | `ClientWorkspacePages.tsx`, `SupplierWorkspacePages.tsx`, `AdminWorkspacePages.tsx` | `companyAndAccountEngine.ts` | `Company`, `CompanyMember`, `CompanyInvitation` |
| 4 | **Conformité KYC & Chiffrement KMS** | `src/components/kyc/KycModuleViews.tsx` | `kycEngine.ts`, `securityCrypto.ts`, `adminAdvancedEngine.ts` | `KycSubmission`, `KycDocument`, `KycReviewLog`, `KycDecisionHistory`, `KycJurisdictionConfig`, `KycReminderLog` |
| 5 | **Catalogue B2B, Produits & Stocks** | `SupplierWorkspacePages.tsx`, `ClientWorkspacePages.tsx`, `ProductTranslationManager.tsx` | `catalogEngine.ts`, `stockEngine.ts` | `Product`, `ProductCategory`, `ProductTranslation`, `Warehouse`, `InventoryItem`, `StockMovement`, `StockReservation`, `InventorySession`, `StockAlert` |
| 6 | **Cycle Commercial, Devis, Commandes & Litiges** | `ClientWorkspacePages.tsx`, `SupplierWorkspacePages.tsx` | `commercialEngine.ts`, `billingDocumentEngine.ts` | `QuoteRequest`, `QuoteItem`, `QuoteNegotiationLog`, `Order`, `OrderItem`, `OrderStatusHistory`, `Dispute`, `CommercialDocument` |
| 7 | **Facturation, Séquestre & Paiements** | `ClientWorkspacePages.tsx`, `SupplierWorkspacePages.tsx`, `AccountingWorkspacePages.tsx`, `CommercialDocumentViewerModal.tsx` | `commercialEngine.ts`, `billingDocumentEngine.ts` | `Invoice`, `InvoiceLine`, `CreditNote`, `PaymentTransaction`, `EscrowAccount`, `WebhookEventLog`, `TaxConfig` |
| 8 | **Logistique Multimodale, Flotte & POD** | `CarrierWorkspacePages.tsx`, `InteractiveLogisticsMap.tsx` | `logisticsEngine.ts` | `CarrierFleet`, `Vehicle`, `TransportMission`, `Shipment`, `ShipmentTrackingEvent`, `ColdChainTelemetryLog`, `ProofOfDelivery`, `LogisticsIncident`, `CustomsDeclaration` |
| 9 | **Comptabilité & Calcul Financier** | `AccountingWorkspacePages.tsx`, `CarrierAccountingSupportAndTransversalPages.tsx` | `accountingEngine.ts` | `ChartOfAccount`, `AccountingJournal`, `JournalEntry`, `JournalEntryLine`, `FiscalYear`, `TaxRate`, `BankReconciliation`, `FinancialReportSnapshot`, `FinancialEngineConfig`, `BenchmarkRate`, `CalculationAuditLog` |
| 10 | **Exploitation Documentaire, Import/Export & OCR/IDP** | `OcrDocumentStudioView.tsx`, `OcrSecureUploader.tsx`, `AdminWorkspacePages.tsx` (`import-export`, `backups`) | `importExportEngine.ts`, `ocrDocumentEngine.ts` | `ImportJob`, `ExportJob`, `DatabaseSandboxMigration`, `OcrDocumentJob`, `OcrExtractedFieldRecord`, `SystemBackup` |
| 11 | **Collaboration, Messagerie, Notifications & Room Live / Google Meet** | `B2BMessagingCenterView.tsx`, `NotificationCenterPopover.tsx`, `RoomLiveCreateModal.tsx`, `RoomLiveLobbyView.tsx`, `LiveSubtitleOverlay.tsx` | `messagingEngine.ts`, `notificationEngine.ts`, `roomLiveSfuEngine.ts`, `googleMeetService.ts` | `Conversation`, `ConversationParticipant`, `ChatMessage`, `MessageAttachment`, `Notification`, `NotificationPreference`, `RoomLiveSession`, `RoomParticipant`, `RoomRecording`, `RoomTranscript`, `RoomSharedDocument` |
| 12 | **Intelligence Artificielle Gemini, Traduction & Support** | `AiCopilotWidget.tsx`, `TranslationGlossaryAdminView.tsx`, `SupportWorkspacePages.tsx`, `VoiceDictationButton.tsx` | `geminiAiService.ts`, `copilotEngine.ts`, `translationEngine.ts`, `tradeGlossary.ts`, `supportEngine.ts`, `voiceDictationEngine.ts`, `globalSearchAndAnalyticsEngine.ts` | `AiConversation`, `AiMessage`, `AiPromptTemplate`, `AiUsageQuota`, `TranslationCache`, `TranslationGlossary`, `TranslationJobRecord`, `VoiceConsentRecord`, `SupportTicket`, `SupportMessage` |

---

## 2. Cartographie des Espaces par Rôle

1. **Zone Publique (`VISITEUR`)** : `/`, `/catalogue`, `/catalogue/:id`, `/about`, `/services`, `/how-it-works`, `/contact`, `/faq`, `/blog`, `/legal`, `/privacy`, `/cookies`.
2. **Portail d'Authentification** : `/register`, `/login`, `/verify-otp`, `/forgot-password`, `/mfa`.
3. **Espace Superadministrateur (`ADMIN`, MFA TOTP obligatoire)** : `/admin/dashboard`, `/admin/users`, `/admin/users/:id`, `/admin/kyc`, `/admin/kyc/:id`, `/admin/commercial`, `/admin/finance`, `/admin/logistique`, `/admin/security`, `/admin/import-export`, `/admin/ai-config`, `/admin/room-live`, `/admin/floating-buttons`, `/admin/audit`, `/admin/backups`, `/admin/reports`, `/admin/parametres`.
4. **Espace Client / Acheteur B2B (`CLIENT`)** : `/client/dashboard`, `/client/kyc`, `/client/kyc/upload`, `/client/catalogue`, `/client/catalogue/:id`, `/client/panier`, `/client/checkout`, `/client/commandes`, `/client/commandes/:id`, `/client/devis`, `/client/devis/nouveau`, `/client/factures`, `/client/paiements`, `/client/logistique`, `/client/documents`, `/client/room-live` (rejoindre uniquement — création interdite), `/client/parametres`.
5. **Espace Fournisseur / Exportateur (`FOURNISSEUR`)** : `/fournisseur/dashboard`, `/fournisseur/kyc`, `/fournisseur/catalogue`, `/fournisseur/catalogue/nouveau`, `/fournisseur/catalogue/:id`, `/fournisseur/stocks`, `/fournisseur/commandes`, `/fournisseur/commandes/:id`, `/fournisseur/devis`, `/fournisseur/documents`, `/fournisseur/paiements`, `/fournisseur/clients`, `/fournisseur/logistique`, `/fournisseur/ia`, `/fournisseur/room-live`, `/fournisseur/parametres`.
6. **Espace Transporteur / Logisticien (`TRANSPORTEUR`)** : `/transporteur/dashboard`, `/transporteur/kyc`, `/transporteur/missions`, `/transporteur/missions/:id`, `/transporteur/expeditions`, `/transporteur/documents`, `/transporteur/incidents`, `/transporteur/communication`, `/transporteur/ia`, `/transporteur/room-live`, `/transporteur/parametres`.
7. **Espace Comptable / Auditeur Financier (`COMPTABLE`)** : `/comptable/dashboard`, `/comptable/factures`, `/comptable/documents`, `/comptable/journaux`, `/comptable/grand-livre`, `/comptable/etats-financiers`, `/comptable/calcul`, `/comptable/ia`, `/comptable/parametres`.
8. **Espace Support & Helpdesk (`SUPPORT`)** : `/support/dashboard`, `/support/tickets`, `/support/tickets/:id`, `/support/utilisateurs`, `/support/communication`, `/support/base-connaissances`, `/support/ia`, `/support/room-live`, `/support/parametres`.
9. **Interfaces Transversales** : `/room/:id` (Session Room Live), `/ocr-idp` (Studio OCR & Centre Documentaire), `/notifications` (Centre de notifications), `/403`, `/404`, `/500`.
