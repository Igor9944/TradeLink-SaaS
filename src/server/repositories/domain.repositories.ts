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
  NotificationRecord,
  NotificationPreferencesRecord,
  ConversationRecord,
  ConversationMessageRecord,
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
  private notificationsStore: Map<string, NotificationRecord> = new Map();
  private notificationPreferencesStore: Map<string, NotificationPreferencesRecord> = new Map();
  private conversationsStore: Map<string, ConversationRecord> = new Map();
  private messagesStore: Map<string, ConversationMessageRecord[]> = new Map();

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

    // Initialisation des notifications par défaut
    this.initDefaultNotifications();
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
}
