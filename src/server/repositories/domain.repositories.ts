// ============================================================================
// TRADELINK V6.0 — COUCHE REPOSITORIES, SOFT-DELETE & TRANSACTIONS ATOMIQUES
// Conforme à PROMPTS 4, 7, 8 & 9 :
// - Séparation stricte entre données persistées en base PostgreSQL et données Sandbox
// - Suppressions logiques (deletedAt) filtrées par défaut
// - Transactions atomiques (rollback intégral en cas d'erreur)
// - Support complet des agrégats Commerciaux, Logistiques et Comptables
// ============================================================================

import {
  AuditLogRecord,
  AuthSessionDetail,
  BackupRecord,
  CalculationResultRecord,
  CopilotConversationThread,
  IncidentRecord,
  InvoiceRecord,
  KYCDossier,
  KYCJurisdictionConfigRecord,
  KYCDecisionHistoryRecord,
  KYCReminderLogRecord,
  LoginAttemptRecord,
  MFAConfigurationRecord,
  OrderRecord,
  PaymentRecord,
  ProductItem,
  QuoteRecord,
  RefreshTokenRecord,
  RoomLiveRecord,
  ShipmentRecord,
  ShipmentStatus,
  SupportedLocale,
  TranslationRecord,
  UserLanguagePreferenceRecord,
  VoiceInteractionRecord,
  OcrDocumentDetail,
  OcrQueueJob,
  NotificationRecord,
  NotificationPreferencesRecord,
  ConversationRecord,
  ConversationMessageRecord,
  ProductCategoryRecord,
  StockMovementRecord,
  StockReservationRecord,
  PhysicalInventorySession,
  StockAlertRecord,
  StockValuationReport,
  CartItem,
  CommercialDisputeRecord,
  FinancialAnomalyRecord,
  PaymentReceiptRecord,
  CommercialDocumentRecord,
  DocumentSearchFilters,
  BenchmarkRateRecord,
  FinancialEngineConfigRecord,
  FinancialConfigAuditRecord,
  FiscalPeriodRecord,
  SecureImportPipelineJob,
  DatabaseSandboxSession,
  DataExportResult,
  SecurityAlertRecord,
  BackupRestoreDrillResult,
  SupportTicketRecord,
  KnowledgeArticleRecord,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  UserRoleCode,
} from '../../types';
import { defaultCatalogEngine } from '../../services/catalogEngine';
import { defaultStockEngine } from '../../services/stockEngine';
import { BillingDocumentEngine } from '../../services/billingDocumentEngine';
import { PaginationAndFilterParams } from '../validators/schema.validator';
import {
  INITIAL_CARRIER_VEHICLES,
  LogisticsMissionRecord,
  TransportDocumentRecord,
  VehicleRecord,
} from '../../services/logisticsEngine';
import {
  AccountingEntryRecord,
  DEFAULT_FINANCIAL_CONFIG,
  INITIAL_BENCHMARK_RATES,
} from '../../services/accountingEngine';
import { KYC_JURISDICTION_REGISTRY } from '../../services/kycEngine';
import { INITIAL_SUPPORT_TICKETS, KNOWLEDGE_BASE_ARTICLES } from '../../services/supportEngine';

export interface SoftDeletableEntity {
  id: string;
  deletedAt?: string | null;
}

export interface DatabaseStateSnapshot {
  products: (ProductItem & { deletedAt?: string | null })[];
  orders: (OrderRecord & { deletedAt?: string | null })[];
  kycDossiers: KYCDossier[];
  backups: BackupRecord[];
  rooms: (RoomLiveRecord & { deletedAt?: string | null })[];
  calcHistory: CalculationResultRecord[];
  auditLogs: AuditLogRecord[];
  quotes?: QuoteRecord[];
  invoices?: InvoiceRecord[];
  payments?: PaymentRecord[];
  disputes?: CommercialDisputeRecord[];
  financialAnomalies?: FinancialAnomalyRecord[];
  paymentReceipts?: PaymentReceiptRecord[];
  shipments?: ShipmentRecord[];
  incidents?: IncidentRecord[];
  stockMovements?: StockMovementRecord[];
  accountingEntries?: AccountingEntryRecord[];
  logisticsMissions?: LogisticsMissionRecord[];
  vehicles?: VehicleRecord[];
  transportDocuments?: TransportDocumentRecord[];
  kycJurisdictions?: KYCJurisdictionConfigRecord[];
  kycDecisions?: KYCDecisionHistoryRecord[];
  kycReminders?: KYCReminderLogRecord[];
  copilotThreads?: CopilotConversationThread[];
  voiceInteractions?: VoiceInteractionRecord[];
  ocrDocuments?: OcrDocumentDetail[];
  ocrQueueJobs?: OcrQueueJob[];
  commercialDocuments?: CommercialDocumentRecord[];
  financialConfig?: FinancialEngineConfigRecord;
  financialConfigAudits?: FinancialConfigAuditRecord[];
  benchmarkRates?: BenchmarkRateRecord[];
  fiscalPeriods?: FiscalPeriodRecord[];
  secureImportJobs?: SecureImportPipelineJob[];
  databaseSandboxSessions?: DatabaseSandboxSession[];
  dataExports?: DataExportResult[];
  securityAlerts?: SecurityAlertRecord[];
  backupRestoreDrills?: BackupRestoreDrillResult[];
  supportTickets?: SupportTicketRecord[];
  knowledgeArticles?: KnowledgeArticleRecord[];
}

export class TradeLinkRepositoryStore {
  private state: Required<DatabaseStateSnapshot>;
  public readonly isProductionDatabaseConnected: boolean;
  private userPreferences: Map<string, UserLanguagePreferenceRecord> = new Map();
  private translationsMap: Map<string, TranslationRecord> = new Map();
  private loginAttemptsList: LoginAttemptRecord[] = [];
  private refreshTokensStore: Map<string, RefreshTokenRecord> = new Map();
  private mfaConfigurationsStore: Map<string, MFAConfigurationRecord> = new Map();
  private authSessionsStore: Map<string, AuthSessionDetail> = new Map();
  private voiceConsentsStore: Map<string, { userId: string; granted: boolean; timestamp: string }> = new Map();
  private notificationsStore: Map<string, NotificationRecord> = new Map();
  private notificationPreferencesStore: Map<string, NotificationPreferencesRecord> = new Map();
  private conversationsStore: Map<string, ConversationRecord> = new Map();
  private messagesStore: Map<string, ConversationMessageRecord[]> = new Map();
  private userCartsStore: Map<string, CartItem[]> = new Map();

  constructor(initialState: DatabaseStateSnapshot, isProdDbConnected = false) {
    this.state = structuredClone({
      ...initialState,
      quotes: initialState.quotes ?? [],
      invoices: initialState.invoices ?? [],
      payments: initialState.payments ?? [],
      disputes: initialState.disputes ?? [],
      financialAnomalies: initialState.financialAnomalies ?? [],
      paymentReceipts: initialState.paymentReceipts ?? [],
      shipments: initialState.shipments ?? [],
      incidents: initialState.incidents ?? [],
      stockMovements: initialState.stockMovements ?? [],
      accountingEntries: initialState.accountingEntries ?? [],
      logisticsMissions: initialState.logisticsMissions ?? [],
      vehicles:
        initialState.vehicles && initialState.vehicles.length > 0
          ? initialState.vehicles
          : structuredClone(INITIAL_CARRIER_VEHICLES),
      transportDocuments: initialState.transportDocuments ?? [],
      kycJurisdictions:
        initialState.kycJurisdictions && initialState.kycJurisdictions.length > 0
          ? initialState.kycJurisdictions
          : Object.values(KYC_JURISDICTION_REGISTRY).map((j) => ({
              id: `jur-${j.countryCode.toLowerCase()}`,
              countryCode: j.countryCode,
              countryName: j.countryName,
              currency: j.currency,
              requiredDocs: j.requiredDocTypes,
              optionalDocs: j.optionalDocTypes,
              gracePeriodDays: j.gracePeriodDays,
              isActive: true,
              updatedAt: new Date().toISOString(),
            })),
      kycDecisions: initialState.kycDecisions ?? [],
      kycReminders: initialState.kycReminders ?? [],
      copilotThreads: initialState.copilotThreads ?? [],
      voiceInteractions: initialState.voiceInteractions ?? [],
      ocrDocuments: initialState.ocrDocuments ?? [],
      ocrQueueJobs: initialState.ocrQueueJobs ?? [],
      commercialDocuments: initialState.commercialDocuments ?? [],
      financialConfig: initialState.financialConfig ?? structuredClone(DEFAULT_FINANCIAL_CONFIG),
      financialConfigAudits: initialState.financialConfigAudits ?? [],
      benchmarkRates:
        initialState.benchmarkRates && initialState.benchmarkRates.length > 0
          ? initialState.benchmarkRates
          : structuredClone(INITIAL_BENCHMARK_RATES),
      fiscalPeriods:
        initialState.fiscalPeriods && initialState.fiscalPeriods.length > 0
          ? initialState.fiscalPeriods
          : [
              {
                id: 'fp-2026-11',
                fiscalYear: 2026,
                periodCode: '2026-11',
                startDate: '2026-11-01',
                endDate: '2026-11-30',
                status: 'OPEN',
              },
              {
                id: 'fp-2026-12',
                fiscalYear: 2026,
                periodCode: '2026-12',
                startDate: '2026-12-01',
                endDate: '2026-12-31',
                status: 'OPEN',
              },
            ],
      secureImportJobs: initialState.secureImportJobs ?? [],
      databaseSandboxSessions: initialState.databaseSandboxSessions ?? [],
      dataExports: initialState.dataExports ?? [],
      securityAlerts: initialState.securityAlerts ?? [],
      backupRestoreDrills: initialState.backupRestoreDrills ?? [],
      supportTickets:
        initialState.supportTickets && initialState.supportTickets.length > 0
          ? initialState.supportTickets
          : structuredClone(INITIAL_SUPPORT_TICKETS),
      knowledgeArticles:
        initialState.knowledgeArticles && initialState.knowledgeArticles.length > 0
          ? initialState.knowledgeArticles
          : structuredClone(KNOWLEDGE_BASE_ARTICLES),
    });
    this.isProductionDatabaseConnected = isProdDbConnected;

    // Initialisation des notifications par défaut
    this.initDefaultNotifications();

    // Synchronisation des produits du repository dans le moteur de catalogue
    if (this.state.products && this.state.products.length > 0) {
      defaultCatalogEngine.syncProducts(this.state.products.filter((p) => !p.deletedAt));
    }
  }

  private initDefaultNotifications(): void {
    const defaultNotifs: NotificationRecord[] = [
      {
        id: 'notif-init-01',
        userId: 'usr-client-01',
        category: 'COMMERCIAL',
        priority: 'MEDIUM',
        title: 'Commande #CMD-2026-001 validée',
        body: 'Votre commande de 500 unités a été validée par Atlas Trading et transmise à la préparation.',
        channels: ['IN_APP', 'EMAIL'],
        actionUrl: '/orders/CMD-2026-001',
        isRead: false,
        icon: 'parcel-stack',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'notif-init-02',
        userId: 'usr-client-01',
        category: 'KYC',
        priority: 'HIGH',
        title: 'Rappel KYC J+3 : 4 jours restants',
        body: 'Pensez à déposer votre KBIS et votre justificatif de domicile pour certifier votre compte.',
        channels: ['IN_APP', 'EMAIL', 'SMS'],
        actionUrl: '/kyc',
        isRead: false,
        icon: 'customs-stamp',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'notif-init-03',
        userId: 'usr-client-01',
        category: 'LOGISTIQUE',
        priority: 'LOW',
        title: 'Expédition #TRK-2026-901 prise en charge',
        body: 'Le transporteur Maghreb Express a pris en charge le fret au port de Tanger Med.',
        channels: ['IN_APP', 'WEB_PUSH'],
        actionUrl: '/shipments/TRK-2026-901',
        isRead: true,
        readAt: new Date(Date.now() - 10800000).toISOString(),
        icon: 'delivery-van',
        createdAt: new Date(Date.now() - 14400000).toISOString(),
      },
      {
        id: 'notif-init-04',
        userId: 'usr-admin-01',
        category: 'SÉCURITÉ',
        priority: 'CRITICAL',
        title: 'Tentative brute-force bloquée',
        body: '5 échecs consécutifs détectés depuis IP 198.51.100.44. Compte verrouillé 15 minutes.',
        channels: ['IN_APP', 'EMAIL', 'SMS', 'WEB_PUSH'],
        actionUrl: '/security/audit',
        isRead: false,
        icon: 'secure-parcel',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];

    for (const n of defaultNotifs) {
      this.notificationsStore.set(n.id, n);
    }
  }

  // Exécute une transaction atomique avec rollback intégral en cas d'exception
  public executeTransaction<R>(work: (tx: Required<DatabaseStateSnapshot>) => R): R {
    const snapshotBefore = structuredClone(this.state);
    try {
      const result = work(this.state);
      return result;
    } catch (error) {
      // Rollback atomique de toutes les mutations de la transaction
      this.state = snapshotBefore;
      throw error;
    }
  }

  public getActiveProducts(params: PaginationAndFilterParams) {
    const active = this.state.products.filter((p) => !p.deletedAt);
    const filtered = params.search
      ? active.filter(
          (p) =>
            p.sku.toLowerCase().includes(params.search!.toLowerCase()) ||
            p.name.fr.toLowerCase().includes(params.search!.toLowerCase()) ||
            p.category.toLowerCase().includes(params.search!.toLowerCase())
        )
      : active;
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / params.limit));
    const items = filtered.slice((params.page - 1) * params.limit, params.page * params.limit);
    return { items, page: params.page, limit: params.limit, totalItems, totalPages };
  }

  public findActiveProductById(id: string) {
    return this.state.products.find((p) => p.id === id && !p.deletedAt) ?? null;
  }

  public softDeleteProduct(id: string): boolean {
    const prod = this.state.products.find((p) => p.id === id && !p.deletedAt);
    if (!prod) return false;
    prod.deletedAt = new Date().toISOString();
    return true;
  }

  public getActiveOrdersForActor(actorId: string, role: string, params: PaginationAndFilterParams) {
    const active = this.state.orders.filter((o) => !o.deletedAt);
    const scoped =
      role === 'ADMIN' || role === 'COMPTABLE'
        ? active
        : role === 'CLIENT'
        ? active.filter((o) => o.clientId === actorId)
        : role === 'FOURNISSEUR'
        ? active.filter((o) => o.supplierId === actorId)
        : active;
    const filtered = params.status
      ? scoped.filter((o) => o.status === params.status)
      : scoped;
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / params.limit));
    const items = filtered.slice((params.page - 1) * params.limit, params.page * params.limit);
    return { items, page: params.page, limit: params.limit, totalItems, totalPages };
  }

  public findActiveOrderById(id: string) {
    return this.state.orders.find((o) => o.id === id && !o.deletedAt) ?? null;
  }

  public getUserLanguagePreference(userId: string): UserLanguagePreferenceRecord {
    if (this.userPreferences.has(userId)) {
      return structuredClone(this.userPreferences.get(userId)!);
    }
    const defaultPref: UserLanguagePreferenceRecord = {
      id: `pref-${userId}`,
      userId,
      preferredLocale: 'fr',
      notificationLocale: 'fr',
      communicationLocale: 'fr',
      autoTranslateMessages: true,
      displayOriginalByDefault: false,
      rtlEnabled: false,
      updatedAt: new Date().toISOString(),
    };
    this.userPreferences.set(userId, defaultPref);
    return structuredClone(defaultPref);
  }

  public setUserLanguagePreference(
    userId: string,
    partial: Partial<UserLanguagePreferenceRecord>
  ): UserLanguagePreferenceRecord {
    const existing = this.getUserLanguagePreference(userId);
    const updatedLocale = partial.preferredLocale || existing.preferredLocale;
    const updated: UserLanguagePreferenceRecord = {
      ...existing,
      ...partial,
      userId,
      preferredLocale: updatedLocale,
      rtlEnabled: updatedLocale === 'ar',
      updatedAt: new Date().toISOString(),
    };
    this.userPreferences.set(userId, updated);
    return structuredClone(updated);
  }

  public saveTranslation(record: TranslationRecord): TranslationRecord {
    this.translationsMap.set(record.id, structuredClone(record));
    return structuredClone(record);
  }

  public getTranslationsForEntity(entityType: string, entityId: string): TranslationRecord[] {
    return Array.from(this.translationsMap.values()).filter(
      (t) => t.entityType === entityType && t.entityId === entityId
    );
  }

  public updateProductTranslations(
    productId: string,
    targetLang: SupportedLocale,
    name: string,
    desc: string
  ): ProductItem | null {
    const prod = this.state.products.find((p) => p.id === productId && !p.deletedAt);
    if (!prod) return null;
    prod.name = {
      ...prod.name,
      [targetLang]: name,
    };
    prod.description = {
      ...prod.description,
      [targetLang]: desc,
    };
    return structuredClone(prod);
  }

  // ============================================================================
  // GESTION DES SALLES ROOM LIVE & SFU (PROMPT 07)
  // ============================================================================

  public getRoom(roomIdOrCode: string): (RoomLiveRecord & { deletedAt?: string | null }) | undefined {
    return this.state.rooms.find(
      (r) => (r.id === roomIdOrCode || r.roomCode === roomIdOrCode) && !r.deletedAt
    );
  }

  public listRooms(): RoomLiveRecord[] {
    return this.state.rooms
      .filter((r) => !r.deletedAt)
      .map((r) => structuredClone(r));
  }

  public saveRoom(room: RoomLiveRecord): RoomLiveRecord {
    const existingIndex = this.state.rooms.findIndex((r) => r.id === room.id);
    if (existingIndex >= 0) {
      this.state.rooms[existingIndex] = structuredClone(room);
    } else {
      this.state.rooms.push(structuredClone(room));
    }
    return structuredClone(room);
  }

  public updateRoom(roomId: string, partial: Partial<RoomLiveRecord>): RoomLiveRecord | undefined {
    const room = this.state.rooms.find((r) => (r.id === roomId || r.roomCode === roomId) && !r.deletedAt);
    if (!room) return undefined;
    Object.assign(room, partial);
    return structuredClone(room);
  }

  // ============================================================================
  // GESTION REPOSITORIES : AUTHENTIFICATION, SESSIONS & AUDIT DE CONNEXION (PROMPT 01)
  // ============================================================================

  public recordLoginAttempt(attempt: Omit<LoginAttemptRecord, 'id' | 'attemptedAt'>): LoginAttemptRecord {
    const record: LoginAttemptRecord = {
      ...attempt,
      id: `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      attemptedAt: new Date().toISOString(),
    };
    this.loginAttemptsList.unshift(record);
    if (this.loginAttemptsList.length > 500) {
      this.loginAttemptsList.pop();
    }
    return record;
  }

  public getLoginAttempts(userId?: string, email?: string): LoginAttemptRecord[] {
    return this.loginAttemptsList.filter((a) => {
      if (userId && a.userId === userId) return true;
      if (email && a.emailAttempted.toLowerCase() === email.toLowerCase()) return true;
      return !userId && !email;
    });
  }

  public getRecentFailedLoginAttempts(email: string, windowMinutes: number = 15): LoginAttemptRecord[] {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    return this.loginAttemptsList.filter(
      (a) =>
        a.emailAttempted.toLowerCase() === email.toLowerCase() &&
        !a.isSuccess &&
        new Date(a.attemptedAt).getTime() >= cutoff
    );
  }

  public saveRefreshToken(record: RefreshTokenRecord): RefreshTokenRecord {
    this.refreshTokensStore.set(record.tokenHash, structuredClone(record));
    return structuredClone(record);
  }

  public findRefreshToken(tokenHash: string): RefreshTokenRecord | null {
    const item = this.refreshTokensStore.get(tokenHash);
    return item ? structuredClone(item) : null;
  }

  public revokeRefreshToken(tokenHash: string): boolean {
    const item = this.refreshTokensStore.get(tokenHash);
    if (!item) return false;
    item.isRevoked = true;
    item.revokedAt = new Date().toISOString();
    return true;
  }

  public revokeRefreshTokensForUser(userId: string): number {
    let count = 0;
    for (const item of this.refreshTokensStore.values()) {
      if (item.userId === userId && !item.isRevoked) {
        item.isRevoked = true;
        item.revokedAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  }

  public revokeRefreshTokensForSession(sessionId: string): number {
    let count = 0;
    for (const item of this.refreshTokensStore.values()) {
      if (item.sessionId === sessionId && !item.isRevoked) {
        item.isRevoked = true;
        item.revokedAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  }

  public saveMfaConfig(config: MFAConfigurationRecord): MFAConfigurationRecord {
    this.mfaConfigurationsStore.set(config.userId, structuredClone(config));
    return structuredClone(config);
  }

  public getMfaConfig(userId: string): MFAConfigurationRecord | null {
    const config = this.mfaConfigurationsStore.get(userId);
    return config ? structuredClone(config) : null;
  }

  public saveUserSession(session: AuthSessionDetail): AuthSessionDetail {
    this.authSessionsStore.set(session.id, structuredClone(session));
    return structuredClone(session);
  }

  public getUserSession(sessionId: string): AuthSessionDetail | null {
    const sess = this.authSessionsStore.get(sessionId);
    return sess ? structuredClone(sess) : null;
  }

  public getUserSessions(userId: string): AuthSessionDetail[] {
    return Array.from(this.authSessionsStore.values()).filter((s) => s.userId === userId);
  }

  public revokeUserSession(sessionId: string, reason?: string): boolean {
    const sess = this.authSessionsStore.get(sessionId);
    if (!sess) return false;
    sess.isRevoked = true;
    sess.revokedReason = reason ?? 'MANUAL_REVOCATION';
    sess.isCurrent = false;
    return true;
  }

  public revokeAllUserSessionsExcept(userId: string, keepSessionId?: string): number {
    let count = 0;
    for (const sess of this.authSessionsStore.values()) {
      if (sess.userId === userId && sess.id !== keepSessionId && !sess.isRevoked) {
        sess.isRevoked = true;
        sess.revokedReason = 'SUPERSEDED_BY_NEW_ACTIVE_SESSION';
        sess.isCurrent = false;
        count++;
      }
    }
    return count;
  }

  // ============================================================================
  // COPILOT THREADS & MESSAGES PERSISTENCE (PROMPT 03)
  // ============================================================================

  public listCopilotThreads(userId: string): CopilotConversationThread[] {
    return this.state.copilotThreads
      .filter((t) => t.userId === userId && !t.deletedAt)
      .map((t) => structuredClone(t));
  }

  public getCopilotThread(threadId: string): CopilotConversationThread | null {
    const thread = this.state.copilotThreads.find((t) => t.id === threadId && !t.deletedAt);
    return thread ? structuredClone(thread) : null;
  }

  public saveCopilotThread(thread: CopilotConversationThread): CopilotConversationThread {
    const idx = this.state.copilotThreads.findIndex((t) => t.id === thread.id);
    if (idx >= 0) {
      this.state.copilotThreads[idx] = structuredClone(thread);
    } else {
      this.state.copilotThreads.unshift(structuredClone(thread));
    }
    return structuredClone(thread);
  }

  public deleteCopilotThread(threadId: string, actorId: string, isAdmin = false): boolean {
    const thread = this.state.copilotThreads.find((t) => t.id === threadId);
    if (!thread) return false;
    // Anti-IDOR : propriétaire ou Admin uniquement
    if (thread.userId !== actorId && !isAdmin) {
      const err = new Error('FORBIDDEN_IDOR_THREAD_OWNERSHIP');
      (err as any).statusCode = 403;
      throw err;
    }
    thread.deletedAt = new Date().toISOString();
    return true;
  }

  public addAuditLog(entry: AuditLogRecord): AuditLogRecord {
    this.state.auditLogs.unshift(structuredClone(entry));
    return structuredClone(entry);
  }

  public listAuditLogs(): AuditLogRecord[] {
    return [...this.state.auditLogs];
  }

  // ============================================================================
  // GESTION DU CONSENTEMENT ET DES INTERACTIONS VOCALES (PROMPT 04)
  // ============================================================================

  public getVoiceConsent(userId: string): boolean {
    const entry = this.voiceConsentsStore.get(userId);
    return entry ? entry.granted : false;
  }

  public setVoiceConsent(userId: string, granted: boolean): void {
    this.voiceConsentsStore.set(userId, {
      userId,
      granted,
      timestamp: new Date().toISOString(),
    });
  }

  public recordVoiceInteraction(interaction: VoiceInteractionRecord): VoiceInteractionRecord {
    this.state.voiceInteractions.unshift(structuredClone(interaction));
    return structuredClone(interaction);
  }

  public getVoiceInteractions(userId?: string): VoiceInteractionRecord[] {
    const all = this.state.voiceInteractions;
    if (!userId) return all.map((i) => structuredClone(i));
    return all.filter((i) => i.userId === userId).map((i) => structuredClone(i));
  }

  // ============================================================================
  // GESTION OCR, INTELLIGENCE DOCUMENTAIRE & JOBS (PROMPT 05)
  // ============================================================================

  public saveOcrDocument(doc: OcrDocumentDetail): OcrDocumentDetail {
    const idx = this.state.ocrDocuments.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      this.state.ocrDocuments[idx] = structuredClone(doc);
    } else {
      this.state.ocrDocuments.unshift(structuredClone(doc));
    }
    return structuredClone(doc);
  }

  public getOcrDocumentById(id: string): OcrDocumentDetail | null {
    const doc = this.state.ocrDocuments.find((d) => d.id === id && !d.deletedAt);
    return doc ? structuredClone(doc) : null;
  }

  public findOcrDocumentByHash(sha256Hash: string): OcrDocumentDetail | null {
    const doc = this.state.ocrDocuments.find((d) => d.sha256Hash === sha256Hash && !d.deletedAt);
    return doc ? structuredClone(doc) : null;
  }

  public listOcrDocuments(userId?: string, profile?: string, status?: string): OcrDocumentDetail[] {
    let list = this.state.ocrDocuments.filter((d) => !d.deletedAt);
    if (userId) {
      list = list.filter((d) => d.uploadedById === userId);
    }
    if (profile) {
      list = list.filter((d) => d.profile === profile);
    }
    if (status) {
      list = list.filter((d) => d.processingStatus === status || d.status === status);
    }
    return list.map((d) => structuredClone(d));
  }

  public softDeleteOcrDocument(id: string, actorId: string, isAdmin = false): boolean {
    const doc = this.state.ocrDocuments.find((d) => d.id === id);
    if (!doc) return false;
    // Anti-IDOR : propriétaire ou Admin uniquement
    if (doc.uploadedById !== actorId && !isAdmin) {
      const err = new Error('FORBIDDEN_IDOR_DOCUMENT_OWNERSHIP');
      (err as any).statusCode = 403;
      throw err;
    }
    doc.deletedAt = new Date().toISOString();
    return true;
  }

  public enqueueOcrJob(job: OcrQueueJob): OcrQueueJob {
    this.state.ocrQueueJobs.unshift(structuredClone(job));
    return structuredClone(job);
  }

  public getOcrQueueJobs(): OcrQueueJob[] {
    return this.state.ocrQueueJobs.map((j) => structuredClone(j));
  }

  public updateOcrJob(jobId: string, progress: number, status?: OcrQueueJob['status']): void {
    const job = this.state.ocrQueueJobs.find((j) => j.id === jobId);
    if (job) {
      job.progressPercentage = Math.min(100, Math.max(0, progress));
      if (status) job.status = status;
      if (progress >= 100) {
        job.status = 'COMPLETED';
        job.completedAt = new Date().toISOString();
      }
    }
  }

  public getSnapshot(): Readonly<Required<DatabaseStateSnapshot>> {
    return this.state;
  }

  // ============================================================================
  // MÉTHODES DE GESTION DES NOTIFICATIONS & PRÉFÉRENCES (PROMPT 08)
  // ============================================================================

  public saveNotification(record: NotificationRecord): NotificationRecord {
    this.notificationsStore.set(record.id, structuredClone(record));
    return structuredClone(record);
  }

  public getNotification(id: string): NotificationRecord | null {
    const notif = this.notificationsStore.get(id);
    return notif ? structuredClone(notif) : null;
  }

  public listNotifications(params?: {
    userId?: string;
    category?: string;
    priority?: string;
    isRead?: boolean;
  }): NotificationRecord[] {
    let list = Array.from(this.notificationsStore.values());

    if (params?.userId) {
      list = list.filter((n) => n.userId === params.userId);
    }
    if (params?.category) {
      list = list.filter((n) => n.category === params.category);
    }
    if (params?.priority) {
      list = list.filter((n) => n.priority === params.priority);
    }
    if (params?.isRead !== undefined) {
      list = list.filter((n) => n.isRead === params.isRead);
    }

    // Tri antéchronologique par défaut
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((n) => structuredClone(n));
  }

  public markNotificationRead(id: string, userId: string): NotificationRecord | null {
    const notif = this.notificationsStore.get(id);
    if (!notif) return null;

    // Anti-IDOR : seul le destinataire (ou admin) peut marquer comme lu
    if (notif.userId !== userId) {
      const err = new Error('FORBIDDEN_IDOR_NOTIFICATION');
      (err as any).statusCode = 403;
      throw err;
    }

    notif.isRead = true;
    notif.readAt = new Date().toISOString();
    this.notificationsStore.set(id, notif);
    return structuredClone(notif);
  }

  public markAllNotificationsRead(userId: string): number {
    let updatedCount = 0;
    const now = new Date().toISOString();
    for (const [id, notif] of this.notificationsStore.entries()) {
      if (notif.userId === userId && !notif.isRead) {
        notif.isRead = true;
        notif.readAt = now;
        this.notificationsStore.set(id, notif);
        updatedCount++;
      }
    }
    return updatedCount;
  }

  public getNotificationPreferences(userId: string): NotificationPreferencesRecord {
    let prefs = this.notificationPreferencesStore.get(userId);
    if (!prefs) {
      prefs = {
        id: `pref-${userId}`,
        userId,
        enabledChannels: {
          IN_APP: true,
          EMAIL: true,
          WEB_PUSH: true,
          SMS: true,
        },
        enabledCategories: {
          COMMERCIAL: true,
          KYC: true,
          LOGISTIQUE: true,
          FINANCE: true,
          SÉCURITÉ: true,
          SUPPORT: true,
          ROOM_LIVE: true,
          MESSAGE: true,
        },
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        digestFrequency: 'INSTANT',
        updatedAt: new Date().toISOString(),
      };
      this.notificationPreferencesStore.set(userId, prefs);
    }
    return structuredClone(prefs);
  }

  public saveNotificationPreferences(
    record: NotificationPreferencesRecord
  ): NotificationPreferencesRecord {
    this.notificationPreferencesStore.set(record.userId, structuredClone(record));
    return structuredClone(record);
  }

  // ============================================================================
  // MÉTHODES DE GESTION DE LA MESSAGERIE B2B (PROMPT 08)
  // ============================================================================

  public createConversation(record: ConversationRecord): ConversationRecord {
    this.conversationsStore.set(record.id, structuredClone(record));
    if (!this.messagesStore.has(record.id)) {
      this.messagesStore.set(record.id, []);
    }
    return structuredClone(record);
  }

  public getConversation(id: string): ConversationRecord | null {
    const conv = this.conversationsStore.get(id);
    return conv ? structuredClone(conv) : null;
  }

  public listConversationsForUser(userId: string, userRole?: string): ConversationRecord[] {
    let list = Array.from(this.conversationsStore.values());
    if (userRole !== 'ADMIN' && userRole !== 'SUPPORT') {
      list = list.filter((c) => c.participantIds.includes(userId));
    }
    return list
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      .map((c) => structuredClone(c));
  }

  public updateConversation(record: ConversationRecord): ConversationRecord {
    this.conversationsStore.set(record.id, structuredClone(record));
    return structuredClone(record);
  }

  public saveMessage(message: ConversationMessageRecord): ConversationMessageRecord {
    const list = this.messagesStore.get(message.conversationId) || [];
    list.push(structuredClone(message));
    this.messagesStore.set(message.conversationId, list);
    return structuredClone(message);
  }

  public listMessages(conversationId: string): ConversationMessageRecord[] {
    const list = this.messagesStore.get(conversationId) || [];
    return list.map((m) => structuredClone(m));
  }

  public updateMessages(
    conversationId: string,
    messages: ConversationMessageRecord[]
  ): void {
    this.messagesStore.set(
      conversationId,
      messages.map((m) => structuredClone(m))
    );
  }

  // ============================================================================
  // CATALOGUE CENTRAL & CATÉGORIES (PROMPT 09)
  // ============================================================================

  public listCatalogCategories(includeInactive = false): ProductCategoryRecord[] {
    return defaultCatalogEngine.listCategories(includeInactive);
  }

  public getCatalogCategoryById(id: string): ProductCategoryRecord | null {
    return defaultCatalogEngine.getCategoryById(id);
  }

  public createCatalogCategory(params: Parameters<typeof defaultCatalogEngine.createCategory>[0]): ProductCategoryRecord {
    return defaultCatalogEngine.createCategory(params);
  }

  public updateCatalogCategory(
    id: string,
    updates: Partial<ProductCategoryRecord>
  ): ProductCategoryRecord {
    return defaultCatalogEngine.updateCategory(id, updates);
  }

  public deleteCatalogCategory(id: string): { success: boolean; message: string } {
    return defaultCatalogEngine.deleteCategory(id);
  }

  public toggleCatalogFavorite(userId: string, productId: string) {
    return defaultCatalogEngine.toggleFavorite(userId, productId);
  }

  public listCatalogFavorites(userId: string): ProductItem[] {
    return defaultCatalogEngine.listFavorites(userId);
  }

  // ============================================================================
  // GESTION DES STOCKS & DISPONIBILITÉS (PROMPT 10)
  // ============================================================================

  public listStockMovements(filter?: Parameters<typeof defaultStockEngine.listMovements>[0]): StockMovementRecord[] {
    return defaultStockEngine.listMovements(filter);
  }

  public listStockReservations(filter?: Parameters<typeof defaultStockEngine.listReservations>[0]): StockReservationRecord[] {
    return defaultStockEngine.listReservations(filter);
  }

  public getStockReservationById(id: string): StockReservationRecord | null {
    return defaultStockEngine.getReservationById(id);
  }

  public listInventorySessions(supplierId?: string): PhysicalInventorySession[] {
    return defaultStockEngine.listInventorySessions(supplierId);
  }

  public getInventorySessionById(id: string): PhysicalInventorySession | null {
    return defaultStockEngine.getInventorySessionById(id);
  }

  public getStockAlerts(supplierId?: string, onlyUnresolved = true): StockAlertRecord[] {
    return defaultStockEngine.getAlerts(supplierId, onlyUnresolved);
  }

  public getStockOverview(supplierId?: string) {
    return defaultStockEngine.getOverview(supplierId);
  }

  public getStockValuationReport(supplierId?: string): StockValuationReport {
    return defaultStockEngine.getValuationReport(supplierId);
  }

  // ============================================================================
  // CYCLE COMMERCIAL : DEVIS, COMMANDES, PAIEMENTS & LITIGES (PROMPT 11)
  // ============================================================================

  public getActiveQuotesForActor(actorId: string, role: string, params: PaginationAndFilterParams) {
    const quotes = this.state.quotes || [];
    const scoped =
      role === 'ADMIN' || role === 'COMPTABLE'
        ? quotes
        : role === 'CLIENT'
        ? quotes.filter((q) => q.clientId === actorId)
        : role === 'FOURNISSEUR'
        ? quotes.filter((q) => q.supplierId === actorId)
        : quotes;

    const filtered = params.status
      ? scoped.filter((q) => q.status === params.status)
      : scoped;

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / params.limit));
    const items = filtered.slice((params.page - 1) * params.limit, params.page * params.limit);
    return { items, page: params.page, limit: params.limit, totalItems, totalPages };
  }

  public findQuoteById(id: string): QuoteRecord | null {
    return (this.state.quotes || []).find((q) => q.id === id) ?? null;
  }

  public findQuoteByNumber(quoteNumber: string): QuoteRecord | null {
    return (this.state.quotes || []).find((q) => q.quoteNumber === quoteNumber) ?? null;
  }

  public getActivePaymentsForActor(actorId: string, role: string, params: PaginationAndFilterParams) {
    const payments = this.state.payments || [];
    const scoped =
      role === 'ADMIN' || role === 'COMPTABLE'
        ? payments
        : role === 'CLIENT'
        ? payments.filter((p) => p.clientId === actorId)
        : role === 'FOURNISSEUR'
        ? payments.filter((p) => p.supplierId === actorId)
        : payments;

    const filtered = params.status
      ? scoped.filter((p) => p.status === params.status)
      : scoped;

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / params.limit));
    const items = filtered.slice((params.page - 1) * params.limit, params.page * params.limit);
    return { items, page: params.page, limit: params.limit, totalItems, totalPages };
  }

  public findPaymentById(id: string): PaymentRecord | null {
    return (this.state.payments || []).find((p) => p.id === id) ?? null;
  }

  public findPaymentByReference(ref: string): PaymentRecord | null {
    return (this.state.payments || []).find((p) => p.paymentReference === ref) ?? null;
  }

  public findInvoiceById(id: string): InvoiceRecord | null {
    return (this.state.invoices || []).find((i) => i.id === id) ?? null;
  }

  public findInvoiceByOrderId(orderId: string): InvoiceRecord | null {
    return (this.state.invoices || []).find((i) => i.orderId === orderId) ?? null;
  }

  public getDisputesForActor(actorId: string, role: string, params?: PaginationAndFilterParams) {
    const disputes = this.state.disputes || [];
    const scoped =
      role === 'ADMIN' || role === 'COMPTABLE'
        ? disputes
        : role === 'CLIENT'
        ? disputes.filter((d) => d.initiatorId === actorId)
        : role === 'FOURNISSEUR'
        ? disputes.filter((d) => {
            const ord = (this.state.orders || []).find((o) => o.id === d.orderId);
            return ord?.supplierId === actorId;
          })
        : disputes;

    if (!params) return scoped;

    const filtered = params.status
      ? scoped.filter((d) => d.status === params.status)
      : scoped;

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / params.limit));
    const items = filtered.slice((params.page - 1) * params.limit, params.page * params.limit);
    return { items, page: params.page, limit: params.limit, totalItems, totalPages };
  }

  public findDisputeById(id: string): CommercialDisputeRecord | null {
    return (this.state.disputes || []).find((d) => d.id === id) ?? null;
  }

  public saveDispute(dispute: CommercialDisputeRecord): CommercialDisputeRecord {
    const idx = (this.state.disputes || []).findIndex((d) => d.id === dispute.id);
    if (idx !== -1) {
      this.state.disputes[idx] = structuredClone(dispute);
    } else {
      this.state.disputes.unshift(structuredClone(dispute));
    }
    return structuredClone(dispute);
  }

  public getFinancialAnomalies(params?: { unresolvedOnly?: boolean }): FinancialAnomalyRecord[] {
    const list = this.state.financialAnomalies || [];
    if (params?.unresolvedOnly) {
      return list.filter((a) => !a.resolved);
    }
    return structuredClone(list);
  }

  public saveFinancialAnomaly(anomaly: FinancialAnomalyRecord): FinancialAnomalyRecord {
    const idx = (this.state.financialAnomalies || []).findIndex((a) => a.id === anomaly.id);
    if (idx !== -1) {
      this.state.financialAnomalies[idx] = structuredClone(anomaly);
    } else {
      this.state.financialAnomalies.unshift(structuredClone(anomaly));
    }
    return structuredClone(anomaly);
  }

  public getPaymentReceiptsForActor(actorId: string, role: string): PaymentReceiptRecord[] {
    const receipts = this.state.paymentReceipts || [];
    if (role === 'ADMIN' || role === 'COMPTABLE') {
      return structuredClone(receipts);
    }
    if (role === 'CLIENT') {
      return structuredClone(receipts.filter((r) => r.clientId === actorId));
    }
    if (role === 'FOURNISSEUR') {
      return structuredClone(receipts.filter((r) => r.supplierId === actorId));
    }
    return [];
  }

  public findPaymentReceiptByNumber(receiptNumber: string): PaymentReceiptRecord | null {
    return (this.state.paymentReceipts || []).find((r) => r.receiptNumber === receiptNumber) ?? null;
  }

  public savePaymentReceipt(receipt: PaymentReceiptRecord): PaymentReceiptRecord {
    const idx = (this.state.paymentReceipts || []).findIndex((r) => r.receiptNumber === receipt.receiptNumber);
    if (idx !== -1) {
      this.state.paymentReceipts[idx] = structuredClone(receipt);
    } else {
      this.state.paymentReceipts.unshift(structuredClone(receipt));
    }
    return structuredClone(receipt);
  }

  public getUserCart(userId: string): CartItem[] {
    return structuredClone(this.userCartsStore.get(userId) || []);
  }

  public saveUserCart(userId: string, items: CartItem[]): CartItem[] {
    this.userCartsStore.set(userId, structuredClone(items));
    return structuredClone(items);
  }

  public saveProduct(product: ProductItem): ProductItem {
    const idx = this.state.products.findIndex((p) => p.id === product.id);
    if (idx !== -1) {
      this.state.products[idx] = structuredClone(product);
    } else {
      this.state.products.unshift(structuredClone(product));
    }
    return structuredClone(product);
  }

  public findProductById(id: string): ProductItem | null {
    return this.state.products.find((p) => p.id === id && !p.deletedAt) ?? null;
  }

  public saveOrder(order: OrderRecord): OrderRecord {
    const idx = this.state.orders.findIndex((o) => o.id === order.id);
    if (idx !== -1) {
      this.state.orders[idx] = structuredClone(order);
    } else {
      this.state.orders.unshift(structuredClone(order));
    }
    return structuredClone(order);
  }

  public findOrderById(id: string): OrderRecord | null {
    return this.state.orders.find((o) => o.id === id && !o.deletedAt) ?? null;
  }

  public saveQuote(quote: QuoteRecord): QuoteRecord {
    if (!this.state.quotes) this.state.quotes = [];
    const idx = this.state.quotes.findIndex((q) => q.id === quote.id);
    if (idx !== -1) {
      this.state.quotes[idx] = structuredClone(quote);
    } else {
      this.state.quotes.unshift(structuredClone(quote));
    }
    return structuredClone(quote);
  }

  public saveInvoice(invoice: InvoiceRecord): InvoiceRecord {
    if (!this.state.invoices) this.state.invoices = [];
    const idx = this.state.invoices.findIndex((i) => i.id === invoice.id);
    if (idx !== -1) {
      this.state.invoices[idx] = structuredClone(invoice);
    } else {
      this.state.invoices.unshift(structuredClone(invoice));
    }
    return structuredClone(invoice);
  }

  public savePayment(payment: PaymentRecord): PaymentRecord {
    if (!this.state.payments) this.state.payments = [];
    const idx = this.state.payments.findIndex((p) => p.id === payment.id);
    if (idx !== -1) {
      this.state.payments[idx] = structuredClone(payment);
    } else {
      this.state.payments.unshift(structuredClone(payment));
    }
    return structuredClone(payment);
  }

  public saveCommercialDocument(doc: CommercialDocumentRecord): CommercialDocumentRecord {
    if (!this.state.commercialDocuments) this.state.commercialDocuments = [];
    const idx = this.state.commercialDocuments.findIndex((d) => d.id === doc.id || d.documentNumber === doc.documentNumber);
    if (idx !== -1) {
      this.state.commercialDocuments[idx] = structuredClone(doc);
    } else {
      this.state.commercialDocuments.unshift(structuredClone(doc));
    }
    return structuredClone(doc);
  }

  public findCommercialDocumentById(id: string): CommercialDocumentRecord | null {
    if (!this.state.commercialDocuments) return null;
    return this.state.commercialDocuments.find((d) => d.id === id) ?? null;
  }

  public findCommercialDocumentByNumber(docNumber: string): CommercialDocumentRecord | null {
    if (!this.state.commercialDocuments) return null;
    return this.state.commercialDocuments.find((d) => d.documentNumber === docNumber) ?? null;
  }

  public queryCommercialDocuments(filters: DocumentSearchFilters = {}): CommercialDocumentRecord[] {
    const list = this.state.commercialDocuments || [];
    return BillingDocumentEngine.filterDocuments(list, filters).map((d) => structuredClone(d));
  }

  // ============================================================================
  // REPOSITORIES GESTION LOGISTIQUE ET EXPÉDITIONS (PROMPT 13)
  // ============================================================================

  public saveShipment(shipment: ShipmentRecord): ShipmentRecord {
    if (!this.state.shipments) this.state.shipments = [];
    const idx = this.state.shipments.findIndex(
      (s) => s.id === shipment.id || s.trackingNumber === shipment.trackingNumber
    );
    if (idx !== -1) {
      this.state.shipments[idx] = structuredClone(shipment);
    } else {
      this.state.shipments.unshift(structuredClone(shipment));
    }
    return structuredClone(shipment);
  }

  public findShipmentById(idOrTracking: string): ShipmentRecord | null {
    if (!this.state.shipments) return null;
    const found = this.state.shipments.find(
      (s) => s.id === idOrTracking || s.trackingNumber === idOrTracking
    );
    return found ? structuredClone(found) : null;
  }

  public queryShipments(filters: {
    clientId?: string;
    supplierId?: string;
    carrierId?: string;
    status?: ShipmentStatus;
  } = {}): ShipmentRecord[] {
    let list = this.state.shipments || [];
    if (filters.clientId) {
      list = list.filter((s) => s.clientId === filters.clientId);
    }
    if (filters.supplierId) {
      list = list.filter((s) => s.supplierId === filters.supplierId);
    }
    if (filters.carrierId) {
      list = list.filter((s) => s.carrierId === filters.carrierId);
    }
    if (filters.status) {
      list = list.filter((s) => s.status === filters.status);
    }
    return list.map((s) => structuredClone(s));
  }

  public saveIncident(incident: IncidentRecord): IncidentRecord {
    if (!this.state.incidents) this.state.incidents = [];
    const idx = this.state.incidents.findIndex((i) => i.id === incident.id);
    if (idx !== -1) {
      this.state.incidents[idx] = structuredClone(incident);
    } else {
      this.state.incidents.unshift(structuredClone(incident));
    }
    return structuredClone(incident);
  }

  public findIncidentById(id: string): IncidentRecord | null {
    if (!this.state.incidents) return null;
    const found = this.state.incidents.find((i) => i.id === id);
    return found ? structuredClone(found) : null;
  }

  public queryIncidents(filters: {
    shipmentId?: string;
    carrierId?: string;
    status?: IncidentRecord['status'];
  } = {}): IncidentRecord[] {
    let list = this.state.incidents || [];
    if (filters.shipmentId) {
      list = list.filter((i) => i.shipmentId === filters.shipmentId);
    }
    if (filters.carrierId) {
      list = list.filter((i) => i.carrierId === filters.carrierId);
    }
    if (filters.status) {
      list = list.filter((i) => i.status === filters.status);
    }
    return list.map((i) => structuredClone(i));
  }

  // ============================================================================
  // REPOSITORIES MOTEUR FINANCIER & CONFIGURATION TRAÇABLE (PROMPT 14)
  // ============================================================================

  public getFinancialConfig(): FinancialEngineConfigRecord {
    return structuredClone(this.state.financialConfig);
  }

  public updateFinancialConfig(
    patch: Partial<FinancialEngineConfigRecord>,
    modifiedBy: string,
    reason: string
  ): { updated: FinancialEngineConfigRecord; audits: FinancialConfigAuditRecord[] } {
    const current = this.state.financialConfig;
    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const audits: FinancialConfigAuditRecord[] = [];

    const keys = Object.keys(patch) as (keyof FinancialEngineConfigRecord)[];
    for (const k of keys) {
      if (k === 'id' || k === 'updatedAt' || k === 'updatedBy' || k === 'version') continue;
      const oldVal = String(current[k] ?? '');
      const newVal = String(patch[k] ?? '');
      if (oldVal !== newVal) {
        const audit: FinancialConfigAuditRecord = {
          id: `audit-cfg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          paramKey: String(k),
          oldValue: oldVal,
          newValue: newVal,
          modifiedBy,
          modifiedAt: nowIso,
          reason: reason || 'Mise à jour des paramètres financiers applicables',
        };
        audits.push(audit);
        this.state.financialConfigAudits.unshift(audit);
      }
    }

    this.state.financialConfig = {
      ...current,
      ...patch,
      updatedAt: nowIso,
      updatedBy: modifiedBy,
    };

    return {
      updated: structuredClone(this.state.financialConfig),
      audits,
    };
  }

  public listFinancialConfigAudits(): FinancialConfigAuditRecord[] {
    return (this.state.financialConfigAudits || []).map((a) => structuredClone(a));
  }

  public listBenchmarkRates(): BenchmarkRateRecord[] {
    return (this.state.benchmarkRates || []).map((b) => structuredClone(b));
  }

  public updateBenchmarkRate(
    code: string,
    newRatePct: string,
    modifiedBy: string
  ): BenchmarkRateRecord {
    const idx = (this.state.benchmarkRates || []).findIndex((b) => b.code === code);
    if (idx === -1) {
      throw new Error(`Taux de référence monétaire introuvable pour le code ${code}.`);
    }

    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
    this.state.benchmarkRates[idx].currentRatePct = newRatePct;
    this.state.benchmarkRates[idx].updatedAt = nowIso;
    this.state.benchmarkRates[idx].updatedBy = modifiedBy;

    return structuredClone(this.state.benchmarkRates[idx]);
  }

  public saveCalculationResult(calc: CalculationResultRecord): CalculationResultRecord {
    if (!this.state.calcHistory) this.state.calcHistory = [];
    const idx = this.state.calcHistory.findIndex((c) => c.id === calc.id);
    if (idx !== -1) {
      this.state.calcHistory[idx] = structuredClone(calc);
    } else {
      this.state.calcHistory.unshift(structuredClone(calc));
    }
    return structuredClone(calc);
  }

  public listCalculationHistory(limit = 100): CalculationResultRecord[] {
    return (this.state.calcHistory || []).slice(0, limit).map((c) => structuredClone(c));
  }

  public listFiscalPeriods(): FiscalPeriodRecord[] {
    return (this.state.fiscalPeriods || []).map((fp) => structuredClone(fp));
  }

  public lockFiscalPeriod(periodCode: string, closedBy: string): FiscalPeriodRecord {
    if (!this.state.fiscalPeriods) this.state.fiscalPeriods = [];
    const idx = this.state.fiscalPeriods.findIndex((p) => p.periodCode === periodCode);
    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (idx !== -1) {
      this.state.fiscalPeriods[idx].status = 'LOCKED';
      this.state.fiscalPeriods[idx].closedAt = nowIso;
      this.state.fiscalPeriods[idx].closedBy = closedBy;
      return structuredClone(this.state.fiscalPeriods[idx]);
    } else {
      const newP: FiscalPeriodRecord = {
        id: `fp-${periodCode}`,
        fiscalYear: parseInt(periodCode.slice(0, 4), 10) || 2026,
        periodCode,
        startDate: `${periodCode}-01`,
        endDate: `${periodCode}-28`,
        status: 'LOCKED',
        closedAt: nowIso,
        closedBy,
      };
      this.state.fiscalPeriods.unshift(newP);
      return structuredClone(newP);
    }
  }

  // ============================================================================
  // PROMPT 15 : REPOSITORY MÉTHODES POUR IMPORT/EXPORT ET SANDBOX BASES
  // ============================================================================

  public saveSecureImportJob(job: SecureImportPipelineJob): SecureImportPipelineJob {
    if (!this.state.secureImportJobs) this.state.secureImportJobs = [];
    const existingIdx = this.state.secureImportJobs.findIndex((j) => j.id === job.id);
    if (existingIdx >= 0) {
      this.state.secureImportJobs[existingIdx] = structuredClone(job);
    } else {
      this.state.secureImportJobs.push(structuredClone(job));
    }
    return structuredClone(job);
  }

  public getSecureImportJob(jobId: string): SecureImportPipelineJob | undefined {
    const found = (this.state.secureImportJobs || []).find((j) => j.id === jobId);
    return found ? structuredClone(found) : undefined;
  }

  public listSecureImportJobs(): SecureImportPipelineJob[] {
    return (this.state.secureImportJobs || []).map((j) => structuredClone(j));
  }

  public saveDatabaseSandboxSession(session: DatabaseSandboxSession): DatabaseSandboxSession {
    if (!this.state.databaseSandboxSessions) this.state.databaseSandboxSessions = [];
    const existingIdx = this.state.databaseSandboxSessions.findIndex((s) => s.sessionId === session.sessionId);
    if (existingIdx >= 0) {
      this.state.databaseSandboxSessions[existingIdx] = structuredClone(session);
    } else {
      this.state.databaseSandboxSessions.push(structuredClone(session));
    }
    return structuredClone(session);
  }

  public getDatabaseSandboxSession(sessionId: string): DatabaseSandboxSession | undefined {
    const found = (this.state.databaseSandboxSessions || []).find((s) => s.sessionId === sessionId);
    return found ? structuredClone(found) : undefined;
  }

  public listDatabaseSandboxSessions(): DatabaseSandboxSession[] {
    return (this.state.databaseSandboxSessions || []).map((s) => structuredClone(s));
  }

  public saveDataExport(exportRes: DataExportResult): DataExportResult {
    if (!this.state.dataExports) this.state.dataExports = [];
    this.state.dataExports.unshift(structuredClone(exportRes));
    return structuredClone(exportRes);
  }

  public listDataExports(): DataExportResult[] {
    return (this.state.dataExports || []).map((e) => structuredClone(e));
  }

  // ============================================================================
  // PROMPT 16 : SURVEILLANCE, ALERTES DE SÉCURITÉ, RESTORE DRILLS & SESSIONS
  // ============================================================================

  public listSecurityAlerts(): SecurityAlertRecord[] {
    return (this.state.securityAlerts || []).map((a) => structuredClone(a));
  }

  public addSecurityAlert(alert: SecurityAlertRecord): SecurityAlertRecord {
    if (!this.state.securityAlerts) this.state.securityAlerts = [];
    this.state.securityAlerts.unshift(structuredClone(alert));
    return structuredClone(alert);
  }

  public resolveSecurityAlert(alertId: string, resolvedBy: string): SecurityAlertRecord | undefined {
    if (!this.state.securityAlerts) return undefined;
    const alert = this.state.securityAlerts.find((a) => a.id === alertId);
    if (!alert) return undefined;
    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = resolvedBy;
    return structuredClone(alert);
  }

  public getAllActiveSessions(): AuthSessionDetail[] {
    return Array.from(this.authSessionsStore.values()).map((s) => structuredClone(s));
  }

  public saveRestoreDrill(drill: BackupRestoreDrillResult): BackupRestoreDrillResult {
    if (!this.state.backupRestoreDrills) this.state.backupRestoreDrills = [];
    this.state.backupRestoreDrills.unshift(structuredClone(drill));
    return structuredClone(drill);
  }

  public listRestoreDrills(): BackupRestoreDrillResult[] {
    return (this.state.backupRestoreDrills || []).map((d) => structuredClone(d));
  }

  // ============================================================================
  // PROMPT 17 : CENTRE D'ASSISTANCE, TICKETS ET BASE DE CONNAISSANCES
  // ============================================================================

  public listSupportTickets(filter?: {
    requesterId?: string;
    role?: UserRoleCode;
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    category?: SupportTicketCategory;
  }): SupportTicketRecord[] {
    if (!this.state.supportTickets) this.state.supportTickets = [];
    let list = this.state.supportTickets.map((t) => structuredClone(t));

    if (filter?.requesterId) {
      list = list.filter((t) => t.requesterId === filter.requesterId);
    }
    if (filter?.status) {
      list = list.filter((t) => t.status === filter.status);
    }
    if (filter?.priority) {
      list = list.filter((t) => t.priority === filter.priority);
    }
    if (filter?.category) {
      list = list.filter((t) => t.category === filter.category);
    }

    return list;
  }

  public getSupportTicket(id: string): SupportTicketRecord | undefined {
    if (!this.state.supportTickets) return undefined;
    const ticket = this.state.supportTickets.find((t) => t.id === id);
    return ticket ? structuredClone(ticket) : undefined;
  }

  public saveSupportTicket(ticket: SupportTicketRecord): SupportTicketRecord {
    if (!this.state.supportTickets) this.state.supportTickets = [];
    const idx = this.state.supportTickets.findIndex((t) => t.id === ticket.id);
    if (idx >= 0) {
      this.state.supportTickets[idx] = structuredClone(ticket);
    } else {
      this.state.supportTickets.unshift(structuredClone(ticket));
    }
    return structuredClone(ticket);
  }

  public listKnowledgeArticles(category?: string, search?: string): KnowledgeArticleRecord[] {
    if (!this.state.knowledgeArticles) this.state.knowledgeArticles = [];
    let list = this.state.knowledgeArticles.map((a) => structuredClone(a));

    if (category) {
      list = list.filter((a) => a.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list;
  }

  public getKnowledgeArticle(id: string): KnowledgeArticleRecord | undefined {
    if (!this.state.knowledgeArticles) return undefined;
    const article = this.state.knowledgeArticles.find((a) => a.id === id);
    return article ? structuredClone(article) : undefined;
  }

  public saveKnowledgeArticle(article: KnowledgeArticleRecord): KnowledgeArticleRecord {
    if (!this.state.knowledgeArticles) this.state.knowledgeArticles = [];
    const idx = this.state.knowledgeArticles.findIndex((a) => a.id === article.id);
    if (idx >= 0) {
      this.state.knowledgeArticles[idx] = structuredClone(article);
    } else {
      this.state.knowledgeArticles.unshift(structuredClone(article));
    }
    return structuredClone(article);
  }
}
