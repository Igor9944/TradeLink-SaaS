# DOCUMENTATION DE LA BASE DE DONNÉES ET PERSISTANCE — TRADELINK SaaS B2B

**Moteur Relationnel Principal** : PostgreSQL 16  
**ORM** : Prisma `6.4.1` (`prisma/schema.prisma`)  
**Cache & Sessions Distribuées** : Redis 7 (`ioredis` `6.0.0`, `src/server/database/redis.client.ts`)

---

## 1. Architecture de Persistance Sans Repli Silencieux en Production

1. **PostgreSQL 16 (`src/server/database/prisma.client.ts`)** :
   - En production (`NODE_ENV=production`), `TradeLinkPostgresManager` exige une variable `DATABASE_URL` valide pointant vers PostgreSQL 16 et refuse tout démarrage en mode dégradé (politique **fail-closed**).
   - En développement et lors de l'exécution des tests automatisés locaux, le système utilise une véritable instance PostgreSQL 16 compilée en WebAssembly (`@electric-sql/pglite` avec l'extension cryptographique `pgcrypto`), garantissant une fidélité SQL totale.
2. **Redis 7 (`src/server/database/redis.client.ts`)** :
   - Utilisé pour le registre d'unicité de session (`tradelink:session:active:<userId>`), la liste noire des identifiants JWT révoqués (`tradelink:jwt:revoked:jti:<jti>`), l'invalidation globale par utilisateur (`tradelink:jwt:invalidated_before:<userId>`), les verrous distribués, le cache d'idempotence (`Idempotency-Key`, TTL 24h) et le rate-limiting.
   - En production, `TradeLinkRedisManager` exige `REDIS_URL` et n'autorise aucun repli silencieux vers une Map locale.

---

## 2. Inventaire des 68 Modèles du Schéma Prisma (`prisma/schema.prisma`)

Le schéma est structuré en **10 domaines fonctionnels** totalisant **68 modèles** :

| Domaine | Modèles Prisma (68 au total) | Caractéristiques Clés |
|---|---|---|
| **1. Identité, Auth & Sessions (8)** | `User`, `Role`, `Permission`, `RolePermission`, `UserSession`, `TrustedDevice`, `OtpChallenge`, `PasswordResetToken` | UUID, hachage Argon2id, secrets TOTP chiffrés, index sur `email`, `jti`, `expiresAt` |
| **2. Organisations B2B & KYC (9)** | `Company`, `CompanyMember`, `CompanyInvitation`, `KycSubmission`, `KycDocument`, `KycReviewLog`, `KycDecisionHistory`, `KycJurisdictionConfig`, `KycReminderLog` | Isolation multi-tenant par `companyId`, empreintes `sha256`, métadonnées KMS (`encryptionKeyId`, `ivHex`, `authTagHex`) |
| **3. Catalogue & Stocks (9)** | `ProductCategory`, `Product`, `ProductTranslation`, `Warehouse`, `InventoryItem`, `StockMovement`, `StockReservation`, `InventorySession`, `StockAlert` | Prix `@db.Decimal(18, 4)`, SKU unique, soft-delete `deletedAt`, index sur `(supplierId, status)` |
| **4. Cycle Commercial & Litiges (8)** | `QuoteRequest`, `QuoteItem`, `QuoteNegotiationLog`, `Order`, `OrderItem`, `OrderStatusHistory`, `Dispute`, `CommercialDocument` | Clés d'idempotence, montants `@db.Decimal(18, 4)`, sceau numérique `digitalSealSha256` |
| **5. Facturation & Paiements (7)** | `Invoice`, `InvoiceLine`, `CreditNote`, `PaymentTransaction`, `EscrowAccount`, `WebhookEventLog`, `TaxConfig` | Unicité `invoiceNumber` et `providerEventId` (anti-rejeu webhook), précision `@db.Decimal(18, 4)` |
| **6. Logistique Multimodale (9)** | `CarrierFleet`, `Vehicle`, `TransportMission`, `Shipment`, `ShipmentTrackingEvent`, `ColdChainTelemetryLog`, `ProofOfDelivery`, `LogisticsIncident`, `CustomsDeclaration` | Index sur `trackingNumber`, coordonnées GPS, relevés thermiques GDP et signature POD |
| **7. Comptabilité & Finance (11)** | `ChartOfAccount`, `AccountingJournal`, `JournalEntry`, `JournalEntryLine`, `FiscalYear`, `TaxRate`, `BankReconciliation`, `FinancialReportSnapshot`, `FinancialEngineConfig`, `BenchmarkRate`, `CalculationAuditLog` | Contrainte d'immuabilité (`isImmutable`), liens de contre-passation (`reversesEntryId`), montants `@db.Decimal(18, 4)` |
| **8. Collaboration & Room Live (11)** | `Conversation`, `ConversationParticipant`, `ChatMessage`, `MessageAttachment`, `Notification`, `NotificationPreference`, `RoomLiveSession`, `RoomParticipant`, `RoomRecording`, `RoomTranscript`, `RoomSharedDocument` | Association `googleMeetSpaceName` (`spaces/xxx`), rétention légale 90 jours des enregistrements |
| **9. IA, Traduction, OCR & Imports (12)** | `AiConversation`, `AiMessage`, `AiPromptTemplate`, `AiUsageQuota`, `TranslationCache`, `TranslationGlossary`, `TranslationJobRecord`, `VoiceConsentRecord`, `OcrDocumentJob`, `OcrExtractedFieldRecord`, `ImportJob`, `ExportJob` | Hash de cache SHA-256, scores de confiance OCR, traçabilité des approbations à 4 yeux (`DatabaseSandboxMigration`) |
| **10. Sécurité, Support & Audit (6)** | `SupportTicket`, `SupportMessage`, `KnowledgeArticle`, `SecurityAlert`, `SystemBackup`, `AuditLog` | Chaînage cryptographique append-only (`previousHash`, `currentHash`) sur `AuditLog` |

---

## 3. Migrations Versionnées et Commandes d'Exploitation

Les migrations sont versionnées sous `prisma/migrations/` :
1. `20260301000000_init_tradelink_v6_enterprise`
2. `20260328000000_lot2_full_68_models_decimal_indexes`
3. `20260329000000_lot4_commercial_accounting_immutability`

### Commandes Prisma Standard
```bash
# Valider la syntaxe et la cohérence des 68 modèles
npx prisma validate

# Générer le client Prisma typé
npx prisma generate

# Appliquer les migrations en préproduction / production (sans perte de données)
npx prisma migrate deploy
```
