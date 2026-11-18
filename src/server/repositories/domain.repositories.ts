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
  SupportedLocale,
  TranslationRecord,
  UserLanguagePreferenceRecord,
  VoiceInteractionRecord,
  OcrDocumentDetail,
  OcrQueueJob,
} from '../../types';
import { PaginationAndFilterParams } from '../validators/schema.validator';
import { StockMovementRecord } from '../../services/commercialEngine';
import {
  INITIAL_CARRIER_VEHICLES,
  LogisticsMissionRecord,
  TransportDocumentRecord,
  VehicleRecord,
} from '../../services/logisticsEngine';
import { AccountingEntryRecord } from '../../services/accountingEngine';
import { KYC_JURISDICTION_REGISTRY } from '../../services/kycEngine';

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

  constructor(initialState: DatabaseStateSnapshot, isProdDbConnected = false) {
    this.state = structuredClone({
      ...initialState,
      quotes: initialState.quotes ?? [],
      invoices: initialState.invoices ?? [],
      payments: initialState.payments ?? [],
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
    });
    this.isProductionDatabaseConnected = isProdDbConnected;
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
}
