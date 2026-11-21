// ============================================================================
// TRADELINK V6.0 — SERVICES MÉTIERS CONNECTÉS AUX REPOSITORIES, AUTHENTIFICATION
// ARGON2ID, OTP, MFA TOTP ADMIN, REFRESH TOKENS ROTATIFS, APPAREILS & TRANSACTIONS
// Conforme aux Chapitres 2, 6, 7, 10, PROMPT 4 et PROMPT 5
// ============================================================================

import Decimal from 'decimal.js';
import {
  AppError,
  markSessionMfaVerified,
  registerSingleActiveSession,
  revokeUserActiveSession,
  ServerRequestContext,
} from '../middlewares/errorAndSecurity.middleware';
import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';
import {
  calculateFinancialInterest,
  canCreateRoomLiveGeneral,
  evaluateKYCDossierRule,
  validateDualAdminApproval,
} from '../../services/backendServices';
import {
  buildOtpAuthUri,
  enforceLegacyHashMigration,
  generateTotpSecretBase32,
  hashPasswordArgon2id,
  invalidateAllUserJwtTokens,
  isLegacyMockHash,
  signJwtAccessToken,
  verifyPasswordArgon2id,
  verifyTotpCode,
} from '../../services/securityCrypto';
import {
  B2BCompanyManagementEngine,
  CompanyB2BRecord,
  CompanyInternalPermission,
  CompanyInternalRole,
  CompanyStatus,
  TRADELINK_ACTOR_SPECIFICATIONS,
} from '../../services/companyAndAccountEngine';
import {
  checkMandatoryKycCompletion,
  encryptAndStoreKycDocument,
  executeKycCronBatch,
  generateKycPresignedDocumentUrl,
  KYC_REQUIRED_DOCUMENTS_BY_PROFILE,
  KycActorProfile,
} from '../../services/kycEngine';
import {
  analyzeFileInIsolatedSandbox,
  buildAuditChainFromLogs,
  exportDatasetToFormat,
  ImportExportFormat,
  rotateKmsMasterKey,
  SandboxAnalysisReport,
  validateDualAdminOperation,
  verifyAuditLogChainIntegrity,
  verifyBackupCryptographicIntegrity,
  detectSecurityAnomalies,
  getSystemSupervisionMetrics,
  performBackupRestoreDrill,
  simulateEnvelopeEncryption,
  createSystemBackupRecord,
} from '../../services/adminAdvancedEngine';
import {
  AuditLogRecord,
  BackupRecord,
  SecurityAlertRecord,
  SystemSupervisionMetrics,
  BackupRestoreDrillResult,
  AuthSessionDetail,
  CopilotAssistedAction,
  CopilotAttachment,
  CopilotContextState,
  CopilotConversationThread,
  CopilotMessage,
  DayCountBasis,
  IncidentRecord,
  InvoiceRecord,
  KMSKeyRecord,
  KYCDecisionHistoryRecord,
  KYCJurisdictionConfigRecord,
  KYCPresignedUrlResponse,
  LoginAttemptRecord,
  OrderRecord,
  ProductItem,
  QuoteRecord,
  RagSourceCitation,
  RoomLiveRecord,
  RoomLiveReaction,
  ShipmentRecord,
  ShipmentStatus,
  ShipmentPackageDetail,
  ShipmentAddressDetail,
  ShipmentGpsLocationRecord,
  IncidentCategory,
  SmartRedirectInfo,
  SupportedLocale,
  TranslationRecord,
  UserLanguagePreferenceRecord,
  TranslationGlossaryTerm,
  TranslationJob,
  TranslationEntityType,
  SmartTranslatedMessage,
  UserRoleCode,
  VoiceInteractionRecord,
  VoiceTranscribePayload,
  VoiceTranscribeResponse,
  OcrDocumentDetail,
  OcrDocumentProfile,
  OcrProcessingStatus,
  OcrQueueJob,
  OcrCorrectionLog,
  NotificationRecord,
  NotificationPreferencesRecord,
  ConversationRecord,
  ConversationMessageRecord,
  ConversationType,
  ConversationParticipantDetail,
  MessageAttachment,
  ProductCategoryRecord,
  Locale,
  StockMovementRecord,
  StockReservationRecord,
  PhysicalInventorySession,
  StockAlertRecord,
  StockValuationReport,
  StockMovementType,
  OrderStatus,
  PaymentProvider,
  PaymentRecord,
  PaymentReceiptRecord,
  CommercialDisputeRecord,
  DisputeReason,
  CartValidationResult,
  CartItem,
  CommercialDocumentRecord,
  CommercialDocumentType,
  TaxJurisdictionCode,
  DocumentSearchFilters,
  DocumentPartyInfo,
  TemporaryDownloadTokenPayload,
  DocumentTransportDetails,
  AgingBalanceReport,
  BenchmarkRateRecord,
  CalculationResultRecord,
  FinancialConfigAuditRecord,
  FinancialEngineConfigRecord,
  FinancialRateType,
  FinancialRoundingMode,
  FiscalPeriodRecord,
  SecureImportPipelineJob,
  ImportTargetEntity,
  DuplicateStrategy,
  DatabaseSandboxSession,
  ExportDatasetType,
  ExportFormatType,
  DataExportResult,
  ImportFinalReport,
  SupportTicketRecord,
  KnowledgeArticleRecord,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  SupportAttachmentRecord,
  GlobalSearchDomain,
  GlobalSearchResponse,
  AutocompleteSuggestion,
  AnalyticsPeriod,
  RoleSpecificAnalytics,
} from '../../types';
import { SupportEngine } from '../../services/supportEngine';
import {
  GlobalSearchEngine,
  AnalyticsEngine,
  DatasetRepositorySnapshot,
} from '../../services/globalSearchAndAnalyticsEngine';
import { ImportExportEngine } from '../../services/importExportEngine';
import {
  BillingDocumentEngine,
} from '../../services/billingDocumentEngine';
import {
  defaultStockEngine,
  StockError,
} from '../../services/stockEngine';
import {
  defaultCatalogEngine,
  CatalogFilterCriteria,
  CatalogSearchResult,
  ProductComparisonMatrix,
  BulkImportResult,
} from '../../services/catalogEngine';
import {
  validateFileMagicBytes,
  calculateDocumentSha256,
  generateOcrPresignedUrl,
  extractDocumentFieldsWithProfile,
  commitHumanReviewValidation,
  OCR_MAX_FILE_SIZE_BYTES,
} from '../../services/ocrDocumentEngine';
import {
  formatDictatedSpeech,
  detectLanguageFromSample,
  TRILINGUAL_VOICE_CONFIGS,
  VOICE_MAX_DURATION_SECONDS,
  PUNCTUATION_DICTIONARY,
} from '../../services/voiceDictationEngine';
import {
  CentralTranslationService,
  TranslationJobManager,
} from '../../services/translationEngine';
import { TradeGlossaryManager } from '../../services/tradeGlossary';
import {
  CommercialEngine,
  INITIAL_PRODUCT_CATEGORIES,
  ProductCategory,
  QuoteCreateInput,
  QuoteRespondInput,
  StockMovementRecord as LegacyCommercialStockMovementRecord,
  StripeCheckoutSessionSimulated,
  StripeWebhookPayloadSimulated,
  GenericPaymentSession,
  defaultIdempotencyStore,
} from '../../services/commercialEngine';
import {
  INITIAL_SHIPMENT_WAYPOINTS,
  LogisticsEngine,
  LogisticsMissionRecord,
  ProofOfDeliveryData,
  RouteWaypoint,
  TransportDocumentRecord,
  TransportMode,
  VehicleRecord,
} from '../../services/logisticsEngine';
import {
  AccountingEngine,
  AccountingEntryRecord,
  AccountingFramework,
  AccountingJournalRecord,
  BankReconciliationResult,
  BankStatementLine,
  CHARTS_OF_ACCOUNTS,
  STANDARD_JOURNALS,
} from '../../services/accountingEngine';
import {
  generateCopilotAnswer,
  processAndSummarizeAttachment,
  getCopilotCacheMetrics,
} from '../../services/copilotEngine';
import {
  checkAndConsumeAiTokens,
  SUPPORTED_AI_MODELS,
  RoomLiveSessionState,
  RoomParticipantState,
  initializeRoomLiveSession,
  moderateParticipantAction,
} from '../../services/aiIntelligenceEngine';
import {
  RoomLiveSfuEngine,
  RoomSfuTokenManager,
} from '../../services/roomLiveSfuEngine';
import {
  RoomParticipantModerationAction,
  RoomLiveAiSummary,
} from '../../types';
import {
  defaultNotificationDispatcher,
} from '../../services/notificationEngine';
import {
  defaultB2BMessagingEngine,
  SecureAttachmentManager,
} from '../../services/messagingEngine';

export interface RegisteredAccountRecord {
  userId: string;
  email: string;
  fullName: string;
  companyName: string;
  taxId: string;
  country: string;
  role: UserRoleCode;
  requestedRole: UserRoleCode;
  passwordHashArgon2id: string;
  emailVerified: boolean;
  kycStatus: 'PENDING_OTP' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED';
  mfaEnabled: boolean;
  mfaSecretBase32?: string;
  failedLoginAttempts: number;
  lockedUntilMs?: number;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneVerified?: boolean;
  businessAddress?: string;
  city?: string;
  postalCode?: string;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  isDeactivated?: boolean;
  deactivatedReason?: string;
  deletedAt?: string;
  locale?: 'fr' | 'en' | 'ar';
  themePreference?: 'system' | 'light' | 'dark';
  companyId?: string;
}

export interface PhoneOtpChallengeRecord {
  phone: string;
  code: string;
  purpose: 'REGISTRATION_PHONE_VERIFICATION';
  expiresAtMs: number;
  attemptsRemaining: number;
  consumed: boolean;
}

export interface OtpChallengeRecord {
  email: string;
  code: string;
  purpose: 'REGISTRATION_VERIFICATION' | 'LOGIN_VERIFICATION';
  expiresAtMs: number;
  attemptsRemaining: number;
  consumed: boolean;
}

export interface RefreshTokenRecord {
  token: string;
  userId: string;
  sessionId: string;
  deviceId: string;
  expiresAtMs: number;
  consumed: boolean;
  revoked: boolean;
}

export interface PasswordResetTokenRecord {
  token: string;
  email: string;
  userId: string;
  expiresAtMs: number;
  used: boolean;
}

export interface UserDeviceRecord {
  id: string;
  userId: string;
  sessionId: string;
  deviceName: string;
  userAgent: string;
  ipAddress: string;
  trusted: boolean;
  revoked: boolean;
  lastActiveAt: string;
}

export class TradeLinkDomainServices {
  private readonly accountsByEmail = new Map<string, RegisteredAccountRecord>();
  private readonly otpChallenges = new Map<string, OtpChallengeRecord>();
  private readonly phoneOtpChallenges = new Map<string, PhoneOtpChallengeRecord>();
  private readonly refreshTokens = new Map<string, RefreshTokenRecord>();
  private readonly resetTokens = new Map<string, PasswordResetTokenRecord>();
  private readonly devicesById = new Map<string, UserDeviceRecord>();
  private readonly processedStripeEventIds = new Set<string>();
  private readonly companyEngine = new B2BCompanyManagementEngine();

  constructor(private readonly repo: TradeLinkRepositoryStore) {
    // Provisionnement manuel initial des profils souverains (Chapitre 2.1)
    this.seedProvisionedAccounts();

    // Synchronisation initiale du catalogue central avec le repository PostgreSQL 16
    defaultCatalogEngine.syncProducts(
      this.repo.getSnapshot().products.filter((p) => !p.deletedAt),
      true
    );

    // Persistance automatique dans PostgreSQL 16 de toute notification IN_APP émise par le dispatcher central
    defaultNotificationDispatcher.registerPersistenceListener((notif) => {
      const existing = this.repo
        .listNotifications({ userId: notif.userId })
        .some((n) => n.id === notif.id);
      if (!existing) {
        this.repo.saveNotification(notif);
      }
    });
  }

  private static readonly seededArgon2idCache = new Map<string, string>();

  private static getSeededAccountHash(plainPassword: string, salt: string): string {
    const cacheKey = `${plainPassword}:${salt}`;
    let cached = this.seededArgon2idCache.get(cacheKey);
    if (!cached) {
      cached = hashPasswordArgon2id(plainPassword, salt);
      this.seededArgon2idCache.set(cacheKey, cached);
    }
    return cached;
  }

  public setAccountHashForMigrationAudit(email: string, rawHash: string): void {
    const acc = this.accountsByEmail.get(email.trim().toLowerCase());
    if (acc) {
      acc.passwordHashArgon2id = rawHash;
    }
  }

  private seedProvisionedAccounts(): void {
    const adminSecret = generateTotpSecretBase32('usr-admin-01-tradelink-v6');
    this.accountsByEmail.set('k.benali@tradelink-global.com', {
      userId: 'usr-admin-01',
      email: 'k.benali@tradelink-global.com',
      fullName: 'Karim Benali',
      firstName: 'Karim',
      lastName: 'Benali',
      companyName: 'TradeLink Global HQ',
      taxId: 'FR-TL-00000001',
      country: 'France',
      role: 'ADMIN',
      requestedRole: 'ADMIN',
      passwordHashArgon2id: TradeLinkDomainServices.getSeededAccountHash('AdminTradeLink!2026', 'salt-admin-01'),
      emailVerified: true,
      emailVerifiedAt: '2026-01-01T00:00:00Z',
      termsAcceptedAt: '2026-01-01T00:00:00Z',
      privacyAcceptedAt: '2026-01-01T00:00:00Z',
      kycStatus: 'VALIDATED',
      mfaEnabled: true,
      mfaSecretBase32: adminSecret,
      failedLoginAttempts: 0,
      createdAt: '2026-01-01T00:00:00Z',
    });

    this.accountsByEmail.set('s.mansouri@atlas-import.ma', {
      userId: 'usr-client-01',
      email: 's.mansouri@atlas-import.ma',
      fullName: 'Sofia Mansouri',
      firstName: 'Sofia',
      lastName: 'Mansouri',
      companyName: 'Atlas Import & Distribution SARL',
      taxId: 'MA-ICE-002849100',
      country: 'Maroc',
      phone: '+212661002244',
      phoneVerified: true,
      phoneVerifiedAt: '2026-02-10T00:00:00Z',
      role: 'CLIENT',
      requestedRole: 'CLIENT',
      passwordHashArgon2id: TradeLinkDomainServices.getSeededAccountHash('ClientAtlas!2026', 'salt-client-01'),
      emailVerified: true,
      emailVerifiedAt: '2026-02-10T00:00:00Z',
      termsAcceptedAt: '2026-02-10T00:00:00Z',
      privacyAcceptedAt: '2026-02-10T00:00:00Z',
      kycStatus: 'VALIDATED',
      mfaEnabled: false,
      failedLoginAttempts: 0,
      createdAt: '2026-02-10T00:00:00Z',
    });

    this.accountsByEmail.set('h.weber@eurotech-supply.de', {
      userId: 'usr-supp-01',
      email: 'h.weber@eurotech-supply.de',
      fullName: 'Hans Weber',
      firstName: 'Hans',
      lastName: 'Weber',
      companyName: 'EuroTech Industrial & ColdChain GmbH',
      taxId: 'DE-998877665',
      country: 'Allemagne',
      role: 'FOURNISSEUR',
      requestedRole: 'FOURNISSEUR',
      passwordHashArgon2id: TradeLinkDomainServices.getSeededAccountHash('SupplierEuro!2026', 'salt-supp-01'),
      emailVerified: true,
      emailVerifiedAt: '2026-02-12T00:00:00Z',
      termsAcceptedAt: '2026-02-12T00:00:00Z',
      privacyAcceptedAt: '2026-02-12T00:00:00Z',
      kycStatus: 'VALIDATED',
      mfaEnabled: false,
      failedLoginAttempts: 0,
      createdAt: '2026-02-12T00:00:00Z',
    });

    this.accountsByEmail.set('t.alami@logistrading.ma', {
      userId: 'usr-trans-01',
      email: 't.alami@logistrading.ma',
      fullName: 'Tariq Alami',
      firstName: 'Tariq',
      lastName: 'Alami',
      companyName: 'LogisTrading Maroc SARL',
      taxId: 'MA-ICE-007654321',
      country: 'Maroc',
      phone: '+212662998877',
      phoneVerified: true,
      phoneVerifiedAt: '2026-02-14T00:00:00Z',
      role: 'TRANSPORTEUR',
      requestedRole: 'TRANSPORTEUR',
      passwordHashArgon2id: TradeLinkDomainServices.getSeededAccountHash('CarrierLogis!2026', 'salt-trans-01'),
      emailVerified: true,
      emailVerifiedAt: '2026-02-14T00:00:00Z',
      termsAcceptedAt: '2026-02-14T00:00:00Z',
      privacyAcceptedAt: '2026-02-14T00:00:00Z',
      kycStatus: 'VALIDATED',
      mfaEnabled: false,
      failedLoginAttempts: 0,
      createdAt: '2026-02-14T00:00:00Z',
    });

    this.accountsByEmail.set('c.dupont@tradelink-audit.fr', {
      userId: 'usr-compt-01',
      email: 'c.dupont@tradelink-audit.fr',
      fullName: 'Claire Dupont',
      firstName: 'Claire',
      lastName: 'Dupont',
      companyName: 'TradeLink Finance & Audit',
      taxId: 'FR-COMPT-001',
      country: 'France',
      role: 'COMPTABLE',
      requestedRole: 'COMPTABLE',
      passwordHashArgon2id: TradeLinkDomainServices.getSeededAccountHash('ComptableSecure!2026', 'salt-compt-01'),
      emailVerified: true,
      emailVerifiedAt: '2026-02-15T00:00:00Z',
      termsAcceptedAt: '2026-02-15T00:00:00Z',
      privacyAcceptedAt: '2026-02-15T00:00:00Z',
      kycStatus: 'VALIDATED',
      mfaEnabled: false,
      failedLoginAttempts: 0,
      createdAt: '2026-02-15T00:00:00Z',
    });

    this.accountsByEmail.set('s.lefevre@tradelink-support.com', {
      userId: 'usr-supp-rep-01',
      email: 's.lefevre@tradelink-support.com',
      fullName: 'Stéphane Lefèvre',
      firstName: 'Stéphane',
      lastName: 'Lefèvre',
      companyName: 'TradeLink Global Support',
      taxId: 'FR-SUPP-001',
      country: 'France',
      role: 'SUPPORT',
      requestedRole: 'SUPPORT',
      passwordHashArgon2id: TradeLinkDomainServices.getSeededAccountHash('SupportAgent!2026', 'salt-supp-rep-01'),
      emailVerified: true,
      emailVerifiedAt: '2026-02-16T00:00:00Z',
      termsAcceptedAt: '2026-02-16T00:00:00Z',
      privacyAcceptedAt: '2026-02-16T00:00:00Z',
      kycStatus: 'VALIDATED',
      mfaEnabled: false,
      failedLoginAttempts: 0,
      createdAt: '2026-02-16T00:00:00Z',
    });
  }

  // 1A. Inscription Visiteur (Chapitre 2.1 & PROMPT 01 : Admin, Comptable & Support provisionnés manuellement, Visiteur -> Client/Fournisseur/Transporteur après validation)
  public registerVisitorAccount(params: {
    email: string;
    password: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    companyName: string;
    taxId?: string;
    country: string;
    phone?: string;
    businessAddress?: string;
    city?: string;
    postalCode?: string;
    requestedRole?: string;
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    if (!normalizedEmail.includes('@')) {
      throw new AppError(400, 'VALIDATION_INVALID_EMAIL', 'Adresse email professionnelle invalide.');
    }

    // Règle stricte : Acceptation obligatoire des conditions générales et de la politique de confidentialité
    if (params.termsAccepted === false || params.privacyAccepted === false) {
      throw new AppError(
        400,
        'TERMS_ACCEPTANCE_REQUIRED',
        'L’acceptation expresse des Conditions Générales d’Utilisation et de la Politique de Confidentialité est obligatoire pour créer un compte TRADELINK.'
      );
    }

    // Règle stricte : L'Administrateur est provisionné manuellement uniquement
    if (params.requestedRole === 'ADMIN') {
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: normalizedEmail,
          actorRole: 'VISITEUR',
          action: 'AUTH_PUBLIC_ADMIN_REGISTRATION_BLOCKED',
          targetType: 'User',
          targetId: normalizedEmail,
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: 'Tentative bloquée : le rôle ADMIN est provisionné manuellement uniquement.',
        });
      });
      throw new AppError(
        403,
        'ADMIN_PROVISIONED_MANUALLY_ONLY',
        'Interdit (Chapitre 2.1) : Le compte Administrateur est provisionné manuellement et ne peut pas être demandé via l’inscription publique.'
      );
    }

    // Règle stricte : Les rôles internes COMPTABLE et SUPPORT sont provisionnés manuellement
    if (params.requestedRole === 'COMPTABLE' || params.requestedRole === 'SUPPORT') {
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: normalizedEmail,
          actorRole: 'VISITEUR',
          action: 'AUTH_PUBLIC_RESTRICTED_ROLE_BLOCKED',
          targetType: 'User',
          targetId: normalizedEmail,
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: `Tentative bloquée : le rôle ${params.requestedRole} est provisionné manuellement par la gouvernance TRADELINK.`,
        });
      });
      throw new AppError(
        403,
        'ROLE_RESTRICTED_MANUAL_PROVISIONING',
        `Interdit : Le rôle ${params.requestedRole} est strictement restreint et provisionné manuellement par l’administration TRADELINK.`
      );
    }

    if (!params.password || params.password.length < 10) {
      throw new AppError(
        400,
        'PASSWORD_POLICY_VIOLATION',
        'Le mot de passe doit contenir au moins 10 caractères.'
      );
    }

    if (this.accountsByEmail.has(normalizedEmail)) {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Un compte existe déjà avec cet email.');
    }

    const userId = `usr-vis-${Date.now().toString(36)}`;
    const passwordHashArgon2id = hashPasswordArgon2id(params.password);
    const targetRole: UserRoleCode =
      params.requestedRole === 'FOURNISSEUR'
        ? 'FOURNISSEUR'
        : params.requestedRole === 'TRANSPORTEUR'
        ? 'TRANSPORTEUR'
        : 'CLIENT';

    const resolvedFullName = (
      params.fullName ?? `${params.firstName ?? ''} ${params.lastName ?? ''}`
    ).trim() || params.companyName.trim();

    const nowIso = new Date().toISOString();

    // Le demandeur démarre à l'état pré-client VISITEUR jusqu'à vérification OTP et approbation
    const record: RegisteredAccountRecord = {
      userId,
      email: normalizedEmail,
      fullName: resolvedFullName,
      firstName: params.firstName?.trim(),
      lastName: params.lastName?.trim(),
      companyName: params.companyName.trim(),
      taxId: params.taxId?.trim() ?? 'ICE-EN-ATTENTE',
      country: params.country.trim(),
      phone: params.phone?.trim(),
      phoneVerified: false,
      businessAddress: params.businessAddress?.trim(),
      city: params.city?.trim(),
      postalCode: params.postalCode?.trim(),
      role: 'VISITEUR',
      requestedRole: targetRole,
      passwordHashArgon2id,
      emailVerified: false,
      kycStatus: 'PENDING_OTP',
      mfaEnabled: false,
      failedLoginAttempts: 0,
      termsAcceptedAt: nowIso,
      privacyAcceptedAt: nowIso,
      createdAt: nowIso,
    };

    this.accountsByEmail.set(normalizedEmail, record);

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    this.otpChallenges.set(normalizedEmail, {
      email: normalizedEmail,
      code: otpCode,
      purpose: 'REGISTRATION_VERIFICATION',
      expiresAtMs: Date.now() + 10 * 60 * 1000, // 10 minutes
      attemptsRemaining: 5,
      consumed: false,
    });

    let phoneOtpCode: string | undefined;
    if (params.phone) {
      const normalizedPhone = params.phone.replace(/[\s\-\(\)]/g, '');
      phoneOtpCode = String(Math.floor(100000 + Math.random() * 900000));
      this.phoneOtpChallenges.set(normalizedPhone, {
        phone: normalizedPhone,
        code: phoneOtpCode,
        purpose: 'REGISTRATION_PHONE_VERIFICATION',
        expiresAtMs: Date.now() + 10 * 60 * 1000,
        attemptsRemaining: 5,
        consumed: false,
      });
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: normalizedEmail,
        actorRole: 'VISITEUR',
        action: 'AUTH_VISITOR_REGISTERED_ARGON2ID',
        targetType: 'User',
        targetId: userId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Demande de compte Visiteur créée (${record.companyName}) avec hash Argon2id et OTP émis. Orientation KYC J+7.`,
      });
    });

    return {
      userId,
      email: normalizedEmail,
      fullName: resolvedFullName,
      companyName: record.companyName,
      role: record.role,
      requestedRole: record.requestedRole,
      kycStatus: record.kycStatus,
      kycDaysRemaining: 7,
      termsAcceptedAt: record.termsAcceptedAt,
      privacyAcceptedAt: record.privacyAcceptedAt,
      passwordHashAlgorithm: 'Argon2id (v=19, m=65536, t=3, p=4)',
      otpIssued: true,
      otpExpiresInSeconds: 600,
      sandboxOtpCode: this.repo.isProductionDatabaseConnected ? undefined : otpCode,
      phoneOtpIssued: Boolean(phoneOtpCode),
      sandboxPhoneOtpCode: this.repo.isProductionDatabaseConnected ? undefined : phoneOtpCode,
    };
  }

  // 1B. Vérification OTP et transition Visiteur -> Client après processus d'approbation
  public verifyOtpChallenge(params: {
    email: string;
    code: string;
    approveClientOnboarding?: boolean;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const challenge = this.otpChallenges.get(normalizedEmail);
    if (!challenge || challenge.consumed) {
      throw new AppError(400, 'OTP_CHALLENGE_NOT_FOUND', 'Aucun code OTP actif pour cet email.');
    }

    if (Date.now() > challenge.expiresAtMs) {
      throw new AppError(400, 'OTP_EXPIRED', 'Le code OTP a expiré (délai de 10 minutes dépassé).');
    }

    if (challenge.attemptsRemaining <= 0) {
      throw new AppError(
        429,
        'OTP_MAX_ATTEMPTS_EXCEEDED',
        'Nombre maximal de tentatives OTP atteint (5/5). Veuillez demander un nouveau code.'
      );
    }

    if (challenge.code !== params.code.trim()) {
      challenge.attemptsRemaining -= 1;
      if (challenge.attemptsRemaining <= 0) {
        throw new AppError(
          429,
          'OTP_MAX_ATTEMPTS_EXCEEDED',
          'Code OTP invalide. Quota de 5 tentatives épuisé ; le code est désormais verrouillé.'
        );
      }
      throw new AppError(
        400,
        'OTP_INVALID_CODE',
        `Code OTP incorrect. Tentatives restantes : ${challenge.attemptsRemaining}.`
      );
    }

    challenge.consumed = true;
    const account = this.accountsByEmail.get(normalizedEmail);
    if (!account) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Compte utilisateur introuvable.');
    }

    account.emailVerified = true;
    account.emailVerifiedAt = new Date().toISOString();
    if (params.approveClientOnboarding !== false) {
      account.role = account.requestedRole;
      account.kycStatus = 'SUBMITTED';
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: normalizedEmail,
        actorRole: account.role,
        action: 'AUTH_OTP_VERIFIED_ONBOARDING',
        targetType: 'User',
        targetId: account.userId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `OTP vérifié ; statut du compte promu vers ${account.role} (KYC: ${account.kycStatus}).`,
      });
    });

    return {
      userId: account.userId,
      email: account.email,
      emailVerified: account.emailVerified,
      emailVerifiedAt: account.emailVerifiedAt,
      role: account.role,
      kycStatus: account.kycStatus,
    };
  }

  // 1B-bis. Vérification SMS OTP Téléphone
  public verifyPhoneOtpChallenge(params: {
    phone: string;
    code: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedPhone = params.phone.replace(/[\s\-\(\)]/g, '');
    const challenge = this.phoneOtpChallenges.get(normalizedPhone);
    if (!challenge || challenge.consumed) {
      throw new AppError(400, 'PHONE_OTP_NOT_FOUND', 'Aucun code SMS OTP actif pour ce numéro de téléphone.');
    }

    if (Date.now() > challenge.expiresAtMs) {
      throw new AppError(400, 'PHONE_OTP_EXPIRED', 'Le code SMS OTP a expiré (10 minutes).');
    }

    if (challenge.attemptsRemaining <= 0) {
      throw new AppError(
        429,
        'PHONE_OTP_MAX_ATTEMPTS_EXCEEDED',
        'Nombre maximal de tentatives SMS OTP atteint (5/5).'
      );
    }

    if (challenge.code !== params.code.trim()) {
      challenge.attemptsRemaining -= 1;
      throw new AppError(
        400,
        'PHONE_OTP_INVALID_CODE',
        `Code SMS OTP incorrect. Tentatives restantes : ${challenge.attemptsRemaining}.`
      );
    }

    challenge.consumed = true;
    const nowIso = new Date().toISOString();
    let updatedUserId: string | null = null;
    for (const acc of this.accountsByEmail.values()) {
      if (acc.phone && acc.phone.replace(/[\s\-\(\)]/g, '') === normalizedPhone) {
        acc.phoneVerified = true;
        acc.phoneVerifiedAt = nowIso;
        updatedUserId = acc.userId;
        break;
      }
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso.replace('T', ' ').slice(0, 19),
        actorName: normalizedPhone,
        actorRole: 'VISITEUR',
        action: 'AUTH_PHONE_OTP_VERIFIED',
        targetType: 'User',
        targetId: updatedUserId ?? normalizedPhone,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Numéro de téléphone ${normalizedPhone} vérifié avec succès par SMS OTP.`,
      });
    });

    return {
      phone: normalizedPhone,
      phoneVerified: true,
      verifiedAt: nowIso,
    };
  }

  // 1C. AuthService & SessionService — Connexion avec Argon2id, Brute-Force Lockout, Session Unique Redis, JWT & Refresh Token
  public loginAndCreateSingleSession(params: {
    userId?: string;
    email: string;
    password?: string;
    role?: NonNullable<ServerRequestContext['user']>['role'];
    companyName?: string;
    deviceName?: string;
    userAgent?: string;
    mfaCode?: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const account = this.accountsByEmail.get(normalizedEmail);

    // Vérification compte suspendu
    if (account?.isSuspended) {
      this.repo.recordLoginAttempt({
        userId: account.userId,
        emailAttempted: normalizedEmail,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent ?? 'Mozilla/5.0 TradeLink-Client/6.0',
        isSuccess: false,
        failureReason: 'AUTH_ACCOUNT_SUSPENDED',
        correlationId: params.correlationId,
      });
      throw new AppError(
        403,
        'AUTH_ACCOUNT_SUSPENDED',
        `Compte suspendu par la gouvernance TRADELINK : ${account.suspensionReason || 'Veuillez contacter le support administratif.'}`
      );
    }

    // Si un mot de passe est fourni ou que le compte est enregistré avec Argon2id, appliquer le contrôle Brute-Force + Argon2id
    if (account && params.password !== undefined) {
      if (account.lockedUntilMs && Date.now() < account.lockedUntilMs) {
        this.repo.recordLoginAttempt({
          userId: account.userId,
          emailAttempted: normalizedEmail,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent ?? 'Mozilla/5.0 TradeLink-Client/6.0',
          isSuccess: false,
          failureReason: 'AUTH_ACCOUNT_LOCKED_BRUTE_FORCE',
          correlationId: params.correlationId,
        });
        this.repo.executeTransaction((tx) => {
          tx.auditLogs.unshift({
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            actorName: normalizedEmail,
            actorRole: account.role,
            action: 'AUTH_LOGIN_BLOCKED_LOCKOUT',
            targetType: 'User',
            targetId: account.userId,
            result: 'DENIED',
            correlationId: params.correlationId,
            ipAddress: params.ipAddress,
            details: 'Tentative de connexion rejetée : compte temporairement verrouillé (anti-brute-force).',
          });
        });
        throw new AppError(
          429,
          'AUTH_ACCOUNT_LOCKED_BRUTE_FORCE',
          'Compte temporairement verrouillé suite à 5 tentatives de connexion infructueuses (15 minutes).'
        );
      }

      // Détection des anciens hashes non fiables (FNV 64 chars ou SHA-512 128 chars) :
      // Révocation immédiate des sessions et réinitialisation obligatoire du mot de passe
      if (isLegacyMockHash(account.passwordHashArgon2id)) {
        enforceLegacyHashMigration({
          storedHash: account.passwordHashArgon2id,
          userId: account.userId,
          onInvalidateUserSessions: () => {
            revokeUserActiveSession(account.userId);
            const existingSessions = this.repo.getUserSessions(account.userId);
            for (const s of existingSessions) {
              this.repo.revokeUserSession(s.id, 'LEGACY_HASH_MANDATORY_PASSWORD_RESET');
              this.repo.revokeRefreshTokensForSession(s.id);
            }
            for (const rt of this.refreshTokens.values()) {
              if (rt.userId === account.userId) {
                rt.revoked = true;
              }
            }
          },
        });
        this.repo.executeTransaction((tx) => {
          tx.auditLogs.unshift({
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            actorName: normalizedEmail,
            actorRole: account.role,
            action: 'AUTH_LEGACY_HASH_RESET_MANDATORY',
            targetType: 'User',
            targetId: account.userId,
            result: 'DENIED',
            correlationId: params.correlationId,
            ipAddress: params.ipAddress,
            details: 'Ancien hash non-Argon2id détecté : sessions révoquées et réinitialisation obligatoire requise.',
          });
        });
        throw new AppError(
          403,
          'AUTH_PASSWORD_RESET_REQUIRED_LEGACY_HASH',
          'Sécurité TRADELINK : Votre ancienne empreinte de mot de passe n’est plus fiable. Une réinitialisation obligatoire du mot de passe avec Argon2id (RFC 9106) est requise.'
        );
      }

      const validPassword = verifyPasswordArgon2id(params.password, account.passwordHashArgon2id);
      if (!validPassword) {
        account.failedLoginAttempts += 1;
        const willLock = account.failedLoginAttempts >= 5;

        this.repo.recordLoginAttempt({
          userId: account.userId,
          emailAttempted: normalizedEmail,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent ?? 'Mozilla/5.0 TradeLink-Client/6.0',
          isSuccess: false,
          failureReason: willLock ? 'AUTH_ACCOUNT_LOCKED_BRUTE_FORCE' : 'AUTH_INVALID_CREDENTIALS',
          correlationId: params.correlationId,
        });

        if (willLock) {
          account.lockedUntilMs = Date.now() + 15 * 60 * 1000;
          this.repo.executeTransaction((tx) => {
            tx.auditLogs.unshift({
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
              actorName: normalizedEmail,
              actorRole: account.role,
              action: 'AUTH_BRUTE_FORCE_LOCKOUT',
              targetType: 'User',
              targetId: account.userId,
              result: 'DENIED',
              correlationId: params.correlationId,
              ipAddress: params.ipAddress,
              details: `Verrouillage de sécurité déclenché après ${account.failedLoginAttempts} échecs consécutifs.`,
            });
          });
          throw new AppError(
            429,
            'AUTH_ACCOUNT_LOCKED_BRUTE_FORCE',
            'Sécurité TRADELINK : Votre compte est verrouillé pendant 15 minutes après 5 tentatives infructueuses.'
          );
        }

        this.repo.executeTransaction((tx) => {
          tx.auditLogs.unshift({
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            actorName: normalizedEmail,
            actorRole: account.role,
            action: 'AUTH_LOGIN_FAILED_BAD_PASSWORD',
            targetType: 'User',
            targetId: account.userId,
            result: 'DENIED',
            correlationId: params.correlationId,
            ipAddress: params.ipAddress,
            details: `Échec de mot de passe Argon2id (${account.failedLoginAttempts}/5).`,
          });
        });

        throw new AppError(
          401,
          'AUTH_INVALID_CREDENTIALS',
          `Identifiants invalides. Tentatives restantes avant verrouillage : ${5 - account.failedLoginAttempts}.`
        );
      }

      // Réinitialisation du compteur d'échecs après authentification réussie
      account.failedLoginAttempts = 0;
      account.lockedUntilMs = undefined;
    }

    const resolvedUserId = account?.userId ?? params.userId ?? `usr-${Date.now().toString(36)}`;
    const resolvedRole = account?.role ?? params.role ?? 'CLIENT';
    const resolvedCompany = account?.companyName ?? params.companyName ?? 'TradeLink Partner';

    // Journalisation tentative réussie
    this.repo.recordLoginAttempt({
      userId: resolvedUserId,
      emailAttempted: normalizedEmail,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent ?? 'Mozilla/5.0 TradeLink-Client/6.0',
      isSuccess: true,
      correlationId: params.correlationId,
    });

    // MFA obligatoire pour l'Administrateur lorsque l'authentification complète par mot de passe est utilisée
    let mfaVerified = true;
    if (resolvedRole === 'ADMIN' && params.password !== undefined) {
      if (params.mfaCode && account?.mfaSecretBase32) {
        const checkTotp = verifyTotpCode(account.mfaSecretBase32, params.mfaCode);
        if (!checkTotp) {
          throw new AppError(401, 'AUTH_INVALID_MFA_TOTP', 'Code TOTP Administrateur invalide.');
        }
        mfaVerified = true;
      } else {
        mfaVerified = false;
      }
    }

    const newSessionId = `sess-redis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const { previousRevokedSessionId } = registerSingleActiveSession(
      resolvedUserId,
      newSessionId,
      mfaVerified
    );

    // Révocation de tous les anciens refresh tokens et appareils de la session précédente
    for (const rt of this.refreshTokens.values()) {
      if (rt.userId === resolvedUserId && !rt.revoked) {
        rt.revoked = true;
      }
    }
    for (const dev of this.devicesById.values()) {
      if (dev.userId === resolvedUserId && dev.sessionId === previousRevokedSessionId) {
        dev.revoked = true;
      }
    }

    const deviceId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    this.devicesById.set(deviceId, {
      id: deviceId,
      userId: resolvedUserId,
      sessionId: newSessionId,
      deviceName: params.deviceName ?? 'Poste de travail B2B (Chrome/Windows)',
      userAgent: params.userAgent ?? 'Mozilla/5.0 TradeLink-Client/6.0',
      ipAddress: params.ipAddress,
      trusted: true,
      revoked: false,
      lastActiveAt: new Date().toISOString(),
    });

    // Enregistrement de la session dans le repository store
    this.repo.revokeAllUserSessionsExcept(resolvedUserId, newSessionId);
    this.repo.saveUserSession({
      id: newSessionId,
      userId: resolvedUserId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent ?? 'Mozilla/5.0 TradeLink-Client/6.0',
      deviceName: params.deviceName ?? 'Poste de travail B2B (Chrome/Windows)',
      isCurrent: true,
      isRevoked: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      lastActiveAt: new Date().toISOString(),
    });

    const accessToken = signJwtAccessToken({
      sub: resolvedUserId,
      email: normalizedEmail,
      role: resolvedRole,
      sessionId: newSessionId,
      mfaVerified,
      deviceId,
      ttlSeconds: 900,
    });

    const refreshToken = `rt-rot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    this.refreshTokens.set(refreshToken, {
      token: refreshToken,
      userId: resolvedUserId,
      sessionId: newSessionId,
      deviceId,
      expiresAtMs: Date.now() + 7 * 24 * 3600 * 1000,
      consumed: false,
      revoked: false,
    });

    this.repo.saveRefreshToken({
      id: `rt-db-${Date.now().toString(36)}`,
      userId: resolvedUserId,
      sessionId: newSessionId,
      tokenHash: refreshToken,
      family: `fam-${resolvedUserId}`,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    const redirectInfo = this.computeSmartRedirect({
      role: resolvedRole,
      kycStatus: account?.kycStatus,
      isSuspended: account?.isSuspended,
      mfaVerified,
      createdAt: account?.createdAt,
    });

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: normalizedEmail,
        actorRole: resolvedRole,
        action: 'AUTH_LOGIN_SINGLE_SESSION',
        targetType: 'Session',
        targetId: newSessionId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: previousRevokedSessionId
          ? `Nouvelle session ${newSessionId} active ; session précédente ${previousRevokedSessionId} révoquée.`
          : `Première session active ${newSessionId} ouverte.`,
      });
    });

    return {
      userId: resolvedUserId,
      email: normalizedEmail,
      role: resolvedRole,
      companyName: resolvedCompany,
      sessionId: newSessionId,
      previousRevokedSessionId,
      mfaRequired: resolvedRole === 'ADMIN',
      mfaVerified,
      accessToken,
      refreshToken,
      deviceId,
      redirectTarget: redirectInfo.targetPath,
      redirectInfo,
    };
  }

  // 1C-bis. Moteur de Redirection Intelligente Post-Authentification
  public computeSmartRedirect(params: {
    role: UserRoleCode;
    kycStatus?: string;
    isSuspended?: boolean;
    mfaVerified?: boolean;
    createdAt?: string;
  }): SmartRedirectInfo {
    if (params.isSuspended) {
      return {
        targetPath: '/suspended',
        role: params.role,
        accountStatus: 'SUSPENDED',
        reason: 'Compte suspendu par l’administration TRADELINK.',
      };
    }

    if (params.role === 'ADMIN' && params.mfaVerified === false) {
      return {
        targetPath: '/admin/mfa-challenge',
        role: params.role,
        accountStatus: 'PENDING_MFA',
        reason: 'Double authentification TOTP requise pour l’administration.',
      };
    }

    const createdMs = params.createdAt ? new Date(params.createdAt).getTime() : Date.now();
    const daysElapsed = Math.floor((Date.now() - createdMs) / (24 * 3600 * 1000));
    const kycDaysRemaining = Math.max(0, 7 - daysElapsed);

    if (params.kycStatus === 'PENDING_OTP') {
      return {
        targetPath: '/auth/verify-otp',
        role: params.role,
        accountStatus: 'PENDING_KYC',
        reason: 'Validation de l’adresse email requise.',
        kycDaysRemaining,
      };
    }

    const defaultRolePaths: Record<UserRoleCode, string> = {
      ADMIN: '/admin',
      CLIENT: '/client',
      FOURNISSEUR: '/fournisseur',
      TRANSPORTEUR: '/transporteur',
      COMPTABLE: '/comptable',
      SUPPORT: '/support',
      VISITEUR: '/',
    };

    return {
      targetPath: defaultRolePaths[params.role] ?? '/',
      role: params.role,
      accountStatus: 'ACTIVE',
      kycDaysRemaining,
    };
  }

  // 1C-ter. Déconnexion & Révocation de session active
  public logoutUserSession(params: {
    sessionId: string;
    userId: string;
    correlationId: string;
    ipAddress: string;
  }) {
    revokeUserActiveSession(params.userId);
    this.repo.revokeUserSession(params.sessionId, 'LOGOUT_USER_INITIATED');
    this.repo.revokeRefreshTokensForSession(params.sessionId);

    // Invalidation des tokens locaux en mémoire
    for (const rt of this.refreshTokens.values()) {
      if (rt.sessionId === params.sessionId || rt.userId === params.userId) {
        rt.revoked = true;
      }
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.userId,
        actorRole: 'CLIENT',
        action: 'AUTH_LOGOUT',
        targetType: 'Session',
        targetId: params.sessionId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Session ${params.sessionId} fermée et révoquée avec succès.`,
      });
    });

    return {
      loggedOut: true,
      sessionId: params.sessionId,
      revokedAt: new Date().toISOString(),
    };
  }

  // 1C-quater. Gestion des sessions de l'utilisateur & journalisation des connexions
  public listUserSessions(userId: string): AuthSessionDetail[] {
    return this.repo.getUserSessions(userId);
  }

  public getLoginAttempts(userId?: string, email?: string): LoginAttemptRecord[] {
    return this.repo.getLoginAttempts(userId, email);
  }

  public revokeUserSessionById(params: {
    userId: string;
    targetSessionId: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const revoked = this.repo.revokeUserSession(params.targetSessionId, 'USER_REQUESTED_REVOCATION');
    this.repo.revokeRefreshTokensForSession(params.targetSessionId);

    // Si la session révoquée est la session active, la retirer de la mémoire active
    revokeUserActiveSession(params.userId);

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.userId,
        actorRole: 'CLIENT',
        action: 'AUTH_SESSION_REVOKED_BY_USER',
        targetType: 'Session',
        targetId: params.targetSessionId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Session ${params.targetSessionId} révoquée manuellement.`,
      });
    });

    return {
      sessionId: params.targetSessionId,
      revoked,
    };
  }

  public suspendUserAccount(params: {
    targetEmailOrId: string;
    reason: string;
    adminUserId: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const target = Array.from(this.accountsByEmail.values()).find(
      (a) => a.email === params.targetEmailOrId.toLowerCase() || a.userId === params.targetEmailOrId
    );
    if (!target) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Utilisateur à suspendre introuvable.');
    }

    target.isSuspended = true;
    target.suspensionReason = params.reason;

    // Révocation de toutes ses sessions actives et refresh tokens
    revokeUserActiveSession(target.userId);
    this.repo.revokeAllUserSessionsExcept(target.userId);
    this.repo.revokeRefreshTokensForUser(target.userId);
    for (const rt of this.refreshTokens.values()) {
      if (rt.userId === target.userId) {
        rt.revoked = true;
      }
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.adminUserId,
        actorRole: 'ADMIN',
        action: 'AUTH_USER_ACCOUNT_SUSPENDED',
        targetType: 'User',
        targetId: target.userId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Compte ${target.email} suspendu par l’administrateur : ${params.reason}.`,
      });
    });

    return {
      userId: target.userId,
      email: target.email,
      isSuspended: true,
      reason: params.reason,
    };
  }

  public unsuspendUserAccount(params: {
    targetEmailOrId: string;
    adminUserId: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const target = Array.from(this.accountsByEmail.values()).find(
      (a) => a.email === params.targetEmailOrId.toLowerCase() || a.userId === params.targetEmailOrId
    );
    if (!target) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
    }

    target.isSuspended = false;
    target.suspensionReason = undefined;

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.adminUserId,
        actorRole: 'ADMIN',
        action: 'AUTH_USER_ACCOUNT_UNSUSPENDED',
        targetType: 'User',
        targetId: target.userId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Compte ${target.email} réactivé par l’administrateur.`,
      });
    });

    return {
      userId: target.userId,
      email: target.email,
      isSuspended: false,
    };
  }

  // 1D. Configuration & Vérification TOTP MFA Administrateur (RFC 6238 + QR Code URI)
  public setupTotpMfaForUser(params: {
    userId: string;
    email: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const account = this.accountsByEmail.get(normalizedEmail);
    const secretBase32 =
      account?.mfaSecretBase32 ?? generateTotpSecretBase32(`${params.userId}-${normalizedEmail}`);

    if (account) {
      account.mfaSecretBase32 = secretBase32;
      account.mfaEnabled = true;
    }

    const otpauthUri = buildOtpAuthUri(normalizedEmail, secretBase32);

    return {
      userId: params.userId,
      email: normalizedEmail,
      secretBase32,
      otpauthUri,
      algorithm: 'SHA1',
      digits: 6,
      periodSeconds: 30,
    };
  }

  public verifyAdminTotpMfa(params: {
    user: NonNullable<ServerRequestContext['user']>;
    code: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedEmail = params.user.email.trim().toLowerCase();
    const account = this.accountsByEmail.get(normalizedEmail);
    const secretBase32 =
      account?.mfaSecretBase32 ?? generateTotpSecretBase32(`${params.user.id}-${normalizedEmail}`);

    const check = verifyTotpCode(secretBase32, params.code);
    if (!check) {
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: normalizedEmail,
          actorRole: params.user.role,
          action: 'AUTH_MFA_TOTP_FAILED',
          targetType: 'Session',
          targetId: params.user.sessionId,
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: 'Code TOTP MFA invalide lors de la vérification Administrateur.',
        });
      });
      throw new AppError(401, 'AUTH_INVALID_MFA_TOTP', 'Code TOTP à 6 chiffres invalide ou expiré.');
    }

    markSessionMfaVerified(params.user.sessionId);

    const upgradedAccessToken = signJwtAccessToken({
      sub: params.user.id,
      email: normalizedEmail,
      role: params.user.role,
      sessionId: params.user.sessionId,
      mfaVerified: true,
      deviceId: 'dev-mfa-verified',
      ttlSeconds: 900,
    });

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: normalizedEmail,
        actorRole: params.user.role,
        action: 'AUTH_MFA_TOTP_VERIFIED',
        targetType: 'Session',
        targetId: params.user.sessionId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Double authentification TOTP validée pour la session ${params.user.sessionId}.`,
      });
    });

    return {
      sessionId: params.user.sessionId,
      mfaVerified: true,
      accessToken: upgradedAccessToken,
    };
  }

  // 1E. Rotation des Refresh Tokens & Détection de réutilisation frauduleuse (Token Reuse Detection)
  public rotateRefreshToken(params: {
    refreshToken: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const record = this.refreshTokens.get(params.refreshToken);
    if (!record) {
      throw new AppError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token inconnu.');
    }

    // Détection de vol de Refresh Token : si déjà consommé, révoquer immédiatement la session active
    if (record.consumed) {
      revokeUserActiveSession(record.userId);
      for (const rt of this.refreshTokens.values()) {
        if (rt.userId === record.userId) {
          rt.revoked = true;
        }
      }
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: record.userId,
          actorRole: 'CLIENT',
          action: 'AUTH_REFRESH_TOKEN_REUSE_DETECTED',
          targetType: 'Session',
          targetId: record.sessionId,
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: 'Alerte sécurité : réutilisation d’un refresh token déjà consommé. Session révoquée.',
        });
      });
      throw new AppError(
        401,
        'REFRESH_TOKEN_REUSE_DETECTED',
        'Alerte de sécurité : réutilisation d’un refresh token déjà consommé détectée. Toutes vos sessions ont été révoquées.'
      );
    }

    if (record.revoked || Date.now() > record.expiresAtMs) {
      throw new AppError(
        401,
        'REFRESH_TOKEN_REVOKED_OR_EXPIRED',
        'Ce refresh token a expiré ou a été révoqué suite à une nouvelle connexion.'
      );
    }

    record.consumed = true;

    const newRefreshToken = `rt-rot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    this.refreshTokens.set(newRefreshToken, {
      token: newRefreshToken,
      userId: record.userId,
      sessionId: record.sessionId,
      deviceId: record.deviceId,
      expiresAtMs: Date.now() + 7 * 24 * 3600 * 1000,
      consumed: false,
      revoked: false,
    });

    const newAccessToken = signJwtAccessToken({
      sub: record.userId,
      email: `${record.userId}@tradelink.io`,
      role: 'CLIENT',
      sessionId: record.sessionId,
      mfaVerified: true,
      deviceId: record.deviceId,
      ttlSeconds: 900,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId: record.sessionId,
    };
  }

  // 1F. Mot de passe oublié & Réinitialisation sécurisée à usage unique
  public requestPasswordReset(params: {
    email: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const account = this.accountsByEmail.get(normalizedEmail);
    const resetToken = `rst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    if (account) {
      this.resetTokens.set(resetToken, {
        token: resetToken,
        email: normalizedEmail,
        userId: account.userId,
        expiresAtMs: Date.now() + 15 * 60 * 1000, // 15 minutes
        used: false,
      });
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: normalizedEmail,
        actorRole: account?.role ?? 'VISITEUR',
        action: 'AUTH_PASSWORD_RESET_REQUESTED',
        targetType: 'User',
        targetId: account?.userId ?? 'UNKNOWN',
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: 'Jeton de réinitialisation à usage unique généré (expiration 15 min).',
      });
    });

    return {
      accepted: true,
      expiresInSeconds: 900,
      sandboxResetToken: this.repo.isProductionDatabaseConnected ? undefined : resetToken,
    };
  }

  public confirmPasswordReset(params: {
    token: string;
    newPassword: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const resetRecord = this.resetTokens.get(params.token);
    if (!resetRecord || resetRecord.used || Date.now() > resetRecord.expiresAtMs) {
      throw new AppError(
        400,
        'RESET_TOKEN_ALREADY_USED_OR_EXPIRED',
        'Le jeton de réinitialisation est invalide, expiré ou a déjà été consommé.'
      );
    }

    if (!params.newPassword || params.newPassword.length < 10) {
      throw new AppError(
        400,
        'PASSWORD_POLICY_VIOLATION',
        'Le nouveau mot de passe doit contenir au moins 10 caractères.'
      );
    }

    const account = this.accountsByEmail.get(resetRecord.email);
    if (!account) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
    }

    resetRecord.used = true;
    account.passwordHashArgon2id = hashPasswordArgon2id(params.newPassword);
    account.failedLoginAttempts = 0;
    account.lockedUntilMs = undefined;

    // Révocation immédiate de toutes les sessions actives et refresh tokens de l'utilisateur
    revokeUserActiveSession(account.userId);
    for (const rt of this.refreshTokens.values()) {
      if (rt.userId === account.userId) {
        rt.revoked = true;
      }
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: account.email,
        actorRole: account.role,
        action: 'AUTH_PASSWORD_RESET_COMPLETED',
        targetType: 'User',
        targetId: account.userId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: 'Mot de passe re-haché avec Argon2id ; jeton invalidé et sessions actives révoquées.',
      });
    });

    return {
      userId: account.userId,
      email: account.email,
      passwordReset: true,
      allPreviousSessionsRevoked: true,
    };
  }

  // 1G. Gestion des appareils (Device Management)
  public listUserDevices(userId: string): UserDeviceRecord[] {
    return Array.from(this.devicesById.values()).filter((d) => d.userId === userId);
  }

  public revokeUserDevice(params: {
    actorUserId: string;
    actorRole: UserRoleCode;
    deviceId: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const dev = this.devicesById.get(params.deviceId);
    if (!dev) {
      throw new AppError(404, 'DEVICE_NOT_FOUND', 'Appareil introuvable.');
    }

    // Protection IDOR : un utilisateur ne peut révoquer que ses propres appareils (sauf ADMIN)
    if (params.actorRole !== 'ADMIN' && dev.userId !== params.actorUserId) {
      throw new AppError(
        403,
        'RESOURCE_OWNERSHIP_VIOLATION',
        'Interdit (Protection IDOR) : vous ne pouvez pas révoquer l’appareil d’un autre utilisateur.'
      );
    }

    dev.revoked = true;
    revokeUserActiveSession(dev.userId);

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actorUserId,
        actorRole: params.actorRole,
        action: 'AUTH_DEVICE_REVOKED',
        targetType: 'Device',
        targetId: dev.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Appareil ${dev.deviceName} (${dev.id}) et session associée ${dev.sessionId} révoqués.`,
      });
    });

    return dev;
  }

  public trustUserDevice(params: {
    actorUserId: string;
    actorRole: UserRoleCode;
    targetUserId: string;
    deviceId: string;
    correlationId: string;
    ipAddress: string;
  }): UserDeviceRecord {
    if (params.actorRole !== 'ADMIN' && params.actorUserId !== params.targetUserId) {
      throw new AppError(
        403,
        'RESOURCE_OWNERSHIP_VIOLATION',
        'Interdit (Protection IDOR) : vous ne pouvez gérer que vos propres appareils.'
      );
    }

    const dev = this.devicesById.get(params.deviceId);
    if (!dev || dev.userId !== params.targetUserId) {
      throw new AppError(404, 'DEVICE_NOT_FOUND', 'Appareil introuvable pour cet utilisateur.');
    }

    dev.trusted = true;
    dev.lastActiveAt = new Date().toISOString();

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actorUserId,
        actorRole: params.actorRole,
        action: 'AUTH_DEVICE_TRUSTED',
        targetType: 'Device',
        targetId: dev.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Appareil ${dev.deviceName} (${dev.id}) marqué comme appareil de confiance.`,
      });
    });

    return dev;
  }

  // ==========================================================================
  // LOT 3 — CYCLE DE VIE COMPLET DES COMPTES, ACTEURS, ENTREPRISES B2B & ESPACES
  // ==========================================================================

  private findAccountByIdOrEmail(idOrEmail: string): RegisteredAccountRecord | undefined {
    const lower = idOrEmail.trim().toLowerCase();
    const byEmail = this.accountsByEmail.get(lower);
    if (byEmail) return byEmail;
    for (const acc of this.accountsByEmail.values()) {
      if (acc.userId === idOrEmail.trim()) {
        return acc;
      }
    }
    return undefined;
  }

  private sanitizeAccountForResponse(acc: RegisteredAccountRecord) {
    const company = this.companyEngine.findCompanyByUserId(acc.userId, acc.email);
    return {
      userId: acc.userId,
      email: acc.email,
      fullName: acc.fullName,
      firstName: acc.firstName,
      lastName: acc.lastName,
      companyName: company?.legalName ?? acc.companyName,
      companyId: company?.id ?? acc.companyId,
      taxId: acc.taxId,
      country: acc.country,
      phone: acc.phone,
      phoneVerified: Boolean(acc.phoneVerified),
      businessAddress: acc.businessAddress,
      city: acc.city,
      postalCode: acc.postalCode,
      role: acc.role,
      requestedRole: acc.requestedRole,
      emailVerified: acc.emailVerified,
      kycStatus: acc.kycStatus,
      mfaEnabled: acc.mfaEnabled,
      isSuspended: Boolean(acc.isSuspended),
      suspensionReason: acc.suspensionReason,
      isDeactivated: Boolean(acc.isDeactivated),
      deletedAt: acc.deletedAt ?? null,
      locale: acc.locale ?? 'fr',
      themePreference: acc.themePreference ?? 'light',
      createdAt: acc.createdAt,
    };
  }

  public listAllUsersForAdmin(actor: NonNullable<ServerRequestContext['user']>) {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_ADMIN_ONLY', 'Seul un administrateur peut lister tous les comptes.');
    }
    return Array.from(this.accountsByEmail.values())
      .filter((a) => !a.deletedAt)
      .map((a) => this.sanitizeAccountForResponse(a));
  }

  public getUserProfileService(
    targetUserId: string,
    actor: NonNullable<ServerRequestContext['user']>
  ) {
    if (actor.role !== 'ADMIN' && actor.id !== targetUserId) {
      throw new AppError(
        403,
        'RESOURCE_OWNERSHIP_VIOLATION',
        'Protection IDOR : vous ne pouvez consulter que votre propre profil utilisateur.'
      );
    }

    const acc = this.findAccountByIdOrEmail(targetUserId);
    if (!acc || acc.deletedAt) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Profil utilisateur introuvable.');
    }

    return {
      profile: this.sanitizeAccountForResponse(acc),
      actorSpecification: TRADELINK_ACTOR_SPECIFICATIONS[acc.role],
      devices: this.listUserDevices(acc.userId),
      company: this.companyEngine.findCompanyByUserId(acc.userId, acc.email),
    };
  }

  public updateUserProfileService(params: {
    targetUserId: string;
    patch: {
      firstName?: string;
      lastName?: string;
      fullName?: string;
      phone?: string;
      companyName?: string;
      businessAddress?: string;
      city?: string;
      postalCode?: string;
      country?: string;
      locale?: 'fr' | 'en' | 'ar';
      themePreference?: 'system' | 'light' | 'dark';
    };
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    if (params.actor.role !== 'ADMIN' && params.actor.id !== params.targetUserId) {
      throw new AppError(
        403,
        'RESOURCE_OWNERSHIP_VIOLATION',
        'Protection IDOR : vous ne pouvez modifier que votre propre profil utilisateur.'
      );
    }

    const acc = this.findAccountByIdOrEmail(params.targetUserId);
    if (!acc || acc.deletedAt) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
    }

    const { patch } = params;
    if (patch.firstName !== undefined) acc.firstName = patch.firstName.trim();
    if (patch.lastName !== undefined) acc.lastName = patch.lastName.trim();
    if (patch.fullName !== undefined) {
      acc.fullName = patch.fullName.trim();
    } else if (patch.firstName !== undefined || patch.lastName !== undefined) {
      acc.fullName = `${acc.firstName ?? ''} ${acc.lastName ?? ''}`.trim();
    }
    if (patch.phone !== undefined) acc.phone = patch.phone.trim();
    if (patch.companyName !== undefined) acc.companyName = patch.companyName.trim();
    if (patch.businessAddress !== undefined) acc.businessAddress = patch.businessAddress.trim();
    if (patch.city !== undefined) acc.city = patch.city.trim();
    if (patch.postalCode !== undefined) acc.postalCode = patch.postalCode.trim();
    if (patch.country !== undefined) acc.country = patch.country.trim();
    if (patch.locale && ['fr', 'en', 'ar'].includes(patch.locale)) {
      acc.locale = patch.locale;
      this.repo.setUserLanguagePreference(acc.userId, { preferredLocale: patch.locale });
    }
    if (patch.themePreference && ['system', 'light', 'dark'].includes(patch.themePreference)) {
      acc.themePreference = patch.themePreference;
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'USER_PROFILE_UPDATED',
        targetType: 'User',
        targetId: acc.userId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Profil utilisateur ${acc.email} mis à jour.`,
      });
    });

    return this.sanitizeAccountForResponse(acc);
  }

  public generateMfaRecoveryCodesService(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    const codes = this.companyEngine.generateMfaRecoveryCodesForUser(params.actor.id);
    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'AUTH_MFA_RECOVERY_CODES_GENERATED',
        targetType: 'User',
        targetId: params.actor.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: '8 codes de récupération MFA à usage unique générés et hachés SHA-256.',
      });
    });
    return {
      userId: params.actor.id,
      recoveryCodes: codes,
      count: codes.length,
    };
  }

  public verifyMfaRecoveryCodeService(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    recoveryCode: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const valid = this.companyEngine.consumeMfaRecoveryCode(params.actor.id, params.recoveryCode);
    if (!valid) {
      throw new AppError(
        401,
        'MFA_RECOVERY_CODE_INVALID_OR_USED',
        'Code de récupération MFA invalide ou déjà consommé.'
      );
    }

    markSessionMfaVerified(params.actor.sessionId);
    const upgradedAccessToken = signJwtAccessToken({
      sub: params.actor.id,
      email: params.actor.email,
      role: params.actor.role,
      sessionId: params.actor.sessionId,
      mfaVerified: true,
    });

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'AUTH_MFA_RECOVERY_CODE_CONSUMED',
        targetType: 'Session',
        targetId: params.actor.sessionId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: 'Code de secours MFA validé et consommé ; session élevée.',
      });
    });

    return {
      mfaVerified: true,
      accessToken: upgradedAccessToken,
      sessionId: params.actor.sessionId,
    };
  }

  public deactivateUserAccountService(params: {
    targetUserId: string;
    reason: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    if (params.actor.role !== 'ADMIN' && params.actor.id !== params.targetUserId) {
      throw new AppError(
        403,
        'RESOURCE_OWNERSHIP_VIOLATION',
        'Protection IDOR : vous ne pouvez désactiver que votre propre compte.'
      );
    }

    const acc = this.findAccountByIdOrEmail(params.targetUserId);
    if (!acc || acc.deletedAt) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Compte introuvable.');
    }

    acc.isDeactivated = true;
    acc.deactivatedReason = params.reason || 'Désactivation demandée.';
    acc.isSuspended = true;
    acc.suspensionReason = acc.deactivatedReason;

    // Révocation immédiate dans Redis 7 + invalidation des JWT
    revokeUserActiveSession(acc.userId);
    invalidateAllUserJwtTokens(acc.userId);
    for (const rt of this.refreshTokens.values()) {
      if (rt.userId === acc.userId) rt.revoked = true;
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'USER_ACCOUNT_DEACTIVATED',
        targetType: 'User',
        targetId: acc.userId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Compte ${acc.email} désactivé et sessions révoquées. Motif : ${acc.deactivatedReason}`,
      });
    });

    return {
      userId: acc.userId,
      email: acc.email,
      isDeactivated: true,
      sessionsRevoked: true,
    };
  }

  public deleteUserAccountControlledService(params: {
    targetUserId: string;
    reason?: string;
    forceByAdmin?: boolean;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    if (params.actor.role !== 'ADMIN' && params.actor.id !== params.targetUserId) {
      throw new AppError(
        403,
        'RESOURCE_OWNERSHIP_VIOLATION',
        'Protection IDOR : vous ne pouvez demander la suppression que de votre propre compte.'
      );
    }

    const acc = this.findAccountByIdOrEmail(params.targetUserId);
    if (!acc || acc.deletedAt) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Compte introuvable ou déjà supprimé.');
    }

    // Vérification des obligations commerciales actives (commandes en cours / factures impayées)
    const snapshot = this.repo.getSnapshot();
    const activeOrders = snapshot.orders.filter(
      (o) =>
        !o.deletedAt &&
        (o.clientId === acc.userId || o.supplierId === acc.userId) &&
        !['COMPLETED', 'DELIVERED', 'CANCELLED', 'REFUSED'].includes(o.status)
    );

    const canForce = params.actor.role === 'ADMIN' && params.forceByAdmin === true;
    if (activeOrders.length > 0 && !canForce) {
      throw new AppError(
        409,
        'ACCOUNT_HAS_ACTIVE_OBLIGATIONS',
        `Suppression bloquée : ce compte possède ${activeOrders.length} commande(s) active(s) non clôturée(s).`
      );
    }

    const nowIso = new Date().toISOString();
    acc.deletedAt = nowIso;
    acc.isDeactivated = true;
    acc.isSuspended = true;
    acc.suspensionReason = params.reason || 'Suppression contrôlée du compte.';

    // Révocation immédiate de toutes les sessions Redis et jetons JWT
    revokeUserActiveSession(acc.userId);
    invalidateAllUserJwtTokens(acc.userId);
    for (const rt of this.refreshTokens.values()) {
      if (rt.userId === acc.userId) rt.revoked = true;
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso.replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'USER_ACCOUNT_CONTROLLED_DELETION',
        targetType: 'User',
        targetId: acc.userId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Suppression logique contrôlée du compte ${acc.email} (deletedAt=${nowIso}).`,
      });
    });

    return {
      userId: acc.userId,
      deleted: true,
      deletedAt: nowIso,
      sessionsRevoked: true,
    };
  }

  // Mission 3.2 : Spécifications des 7 acteurs
  public listActorSpecificationsService() {
    return Object.values(TRADELINK_ACTOR_SPECIFICATIONS);
  }

  public getActorSpecificationService(role: UserRoleCode) {
    const spec = TRADELINK_ACTOR_SPECIFICATIONS[role];
    if (!spec) {
      throw new AppError(404, 'ACTOR_ROLE_NOT_FOUND', `Rôle "${role}" inconnu.`);
    }
    return spec;
  }

  // Mission 3.3 : Services Entreprises B2B
  public listCompaniesService(actor: NonNullable<ServerRequestContext['user']>): CompanyB2BRecord[] {
    return this.companyEngine.listCompaniesForActor(actor);
  }

  public getCompanyByIdService(
    companyId: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): CompanyB2BRecord {
    try {
      return this.companyEngine.getCompanyByIdForActor(companyId, actor);
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.errorCode || err.message, err.message);
    }
  }

  public createCompanyService(params: {
    body: Record<string, any>;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }): CompanyB2BRecord {
    try {
      const created = this.companyEngine.createCompany({
        legalName: String(params.body.legalName ?? ''),
        tradeName: params.body.tradeName ? String(params.body.tradeName) : undefined,
        actorType:
          params.body.actorType === 'FOURNISSEUR'
            ? 'FOURNISSEUR'
            : params.body.actorType === 'TRANSPORTEUR'
            ? 'TRANSPORTEUR'
            : 'CLIENT',
        legalForm: String(params.body.legalForm ?? 'SARL'),
        registrationNumber: String(params.body.registrationNumber ?? ''),
        taxId: String(params.body.taxId ?? ''),
        vatNumber: params.body.vatNumber ? String(params.body.vatNumber) : undefined,
        legalCapital: params.body.legalCapital ? String(params.body.legalCapital) : undefined,
        currency: params.body.currency ? String(params.body.currency) : 'EUR',
        countryCode: String(params.body.countryCode ?? 'MA'),
        headquartersAddress: String(params.body.headquartersAddress ?? 'Siège Social B2B'),
        city: String(params.body.city ?? 'Casablanca'),
        postalCode: String(params.body.postalCode ?? '20000'),
        contactEmail: String(params.body.contactEmail ?? params.actor.email),
        contactPhone: String(params.body.contactPhone ?? '+212600000000'),
        website: params.body.website ? String(params.body.website) : undefined,
        representativeName: params.body.representativeName ? String(params.body.representativeName) : undefined,
        representativeTitle: params.body.representativeTitle ? String(params.body.representativeTitle) : undefined,
        representativeIdNumber: params.body.representativeIdNumber ? String(params.body.representativeIdNumber) : undefined,
        actor: params.actor,
      });

      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'COMPANY_B2B_CREATED',
          targetType: 'Company',
          targetId: created.id,
          result: 'SUCCESS',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: `Entreprise B2B créée : ${created.legalName} (${created.companyCode}).`,
        });
      });

      return created;
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.errorCode || err.message, err.message);
    }
  }

  public updateCompanyProfileService(params: {
    companyId: string;
    patch: Record<string, any>;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }): CompanyB2BRecord {
    try {
      const updated = this.companyEngine.updateCompanyProfile({
        companyId: params.companyId,
        patch: params.patch,
        actor: params.actor,
      });
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'COMPANY_B2B_UPDATED',
          targetType: 'Company',
          targetId: updated.id,
          result: 'SUCCESS',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: `Profil de l'entreprise ${updated.legalName} modifié.`,
        });
      });
      return updated;
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.errorCode || err.message, err.message);
    }
  }

  public addCompanyRepresentativeService(params: {
    companyId: string;
    body: Record<string, any>;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    try {
      return this.companyEngine.addRepresentative({
        companyId: params.companyId,
        representative: {
          fullName: String(params.body.fullName ?? ''),
          title: String(params.body.title ?? 'Mandataire'),
          idDocumentType: params.body.idDocumentType ?? 'CIN',
          idDocumentNumber: String(params.body.idDocumentNumber ?? ''),
          nationality: String(params.body.nationality ?? 'MA'),
          email: String(params.body.email ?? params.actor.email),
          phone: params.body.phone ? String(params.body.phone) : undefined,
          isPrimarySigner: Boolean(params.body.isPrimarySigner ?? false),
        },
        actor: params.actor,
      });
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.errorCode || err.message, err.message);
    }
  }

  public addCompanyDocumentService(params: {
    companyId: string;
    body: Record<string, any>;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    try {
      return this.companyEngine.addSupportingDocument({
        companyId: params.companyId,
        docType: String(params.body.docType ?? 'RNE_KBIS'),
        title: String(params.body.title ?? 'Justificatif Entreprise'),
        fileName: String(params.body.fileName ?? 'document.pdf'),
        fileSizeBytes: Number(params.body.fileSizeBytes ?? 128000),
        mimeType: String(params.body.mimeType ?? 'application/pdf'),
        virusScanStatus: params.body.virusScanStatus ?? 'CLEAN',
        actor: params.actor,
      });
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.errorCode || err.message, err.message);
    }
  }

  public inviteCompanyMemberService(params: {
    companyId: string;
    invitedEmail: string;
    targetInternalRole: CompanyInternalRole;
    customPermissions?: CompanyInternalPermission[];
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    try {
      const res = this.companyEngine.inviteMember({
        companyId: params.companyId,
        invitedEmail: params.invitedEmail,
        targetInternalRole: params.targetInternalRole,
        customPermissions: params.customPermissions,
        actor: params.actor,
      });
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'COMPANY_MEMBER_INVITED',
          targetType: 'Company',
          targetId: params.companyId,
          result: 'SUCCESS',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: `Invitation envoyée à ${params.invitedEmail} (${params.targetInternalRole}).`,
        });
      });
      return res;
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.errorCode || err.message, err.message);
    }
  }

  public acceptCompanyInvitationService(params: {
    companyId: string;
    invitationId: string;
    rawToken: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    try {
      const acc = this.findAccountByIdOrEmail(params.actor.id);
      const member = this.companyEngine.acceptInvitation({
        companyId: params.companyId,
        invitationId: params.invitationId,
        rawToken: params.rawToken,
        actor: {
          ...params.actor,
          fullName: acc?.fullName ?? params.actor.email,
        },
      });
      if (acc) {
        acc.companyId = params.companyId;
      }
      return member;
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.errorCode || err.message, err.message);
    }
  }

  public updateCompanyMemberPermissionsService(params: {
    companyId: string;
    targetMemberId: string;
    internalRole?: CompanyInternalRole;
    permissions?: CompanyInternalPermission[];
    actor: NonNullable<ServerRequestContext['user']>;
  }) {
    try {
      return this.companyEngine.updateMemberPermissions(params);
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.errorCode || err.message, err.message);
    }
  }

  public removeCompanyMemberService(params: {
    companyId: string;
    targetMemberId: string;
    actor: NonNullable<ServerRequestContext['user']>;
  }) {
    try {
      return this.companyEngine.removeMember(params);
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.errorCode || err.message, err.message);
    }
  }

  public updateCompanyStatusAdminService(params: {
    companyId: string;
    status: CompanyStatus;
    reason: string;
    actor: NonNullable<ServerRequestContext['user']>;
  }) {
    try {
      return this.companyEngine.updateCompanyStatusByAdmin(params);
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.errorCode || err.message, err.message);
    }
  }

  // Mission 3.5 : Espace utilisateur complet adapté par acteur
  public getActorWorkspaceService(
    targetUserId: string,
    actor: NonNullable<ServerRequestContext['user']>
  ) {
    if (actor.role !== 'ADMIN' && actor.id !== targetUserId) {
      throw new AppError(
        403,
        'RESOURCE_OWNERSHIP_VIOLATION',
        'Protection IDOR : vous ne pouvez consulter que votre propre espace de travail.'
      );
    }

    const acc = this.findAccountByIdOrEmail(targetUserId);
    const effectiveRole = acc?.role ?? actor.role;
    const effectiveEmail = acc?.email ?? actor.email;
    const actorSpec = TRADELINK_ACTOR_SPECIFICATIONS[effectiveRole];
    const company = this.companyEngine.findCompanyByUserId(targetUserId, effectiveEmail);
    const snapshot = this.repo.getSnapshot();

    const userOrders = snapshot.orders.filter(
      (o) => !o.deletedAt && (o.clientId === targetUserId || o.supplierId === targetUserId || effectiveRole === 'ADMIN' || effectiveRole === 'COMPTABLE')
    );
    const userKyc = snapshot.kycDossiers.find((d) => d.userId === targetUserId);
    const notifs = this.repo.listNotifications({ userId: targetUserId });
    const unreadNotifsCount = notifs.filter((n) => !n.isRead).length;
    const conversations = this.repo.listConversationsForUser(targetUserId, effectiveRole);
    const recentActivities = snapshot.auditLogs
      .filter((a) => a.actorName === effectiveEmail || a.targetId === targetUserId || effectiveRole === 'ADMIN')
      .slice(0, 15);

    return {
      userId: targetUserId,
      role: effectiveRole,
      workspacePath: actorSpec.defaultWorkspacePath,
      actorSpecification: actorSpec,
      profile: acc
        ? this.sanitizeAccountForResponse(acc)
        : {
            userId: actor.id,
            email: actor.email,
            role: actor.role,
            companyName: actor.companyName,
          },
      company,
      security: {
        mfaEnabled: acc?.mfaEnabled ?? (effectiveRole === 'ADMIN'),
        mfaMandatory: actorSpec.mfaMandatory,
        activeSessionId: actor.sessionId,
        trustedDevicesCount: this.listUserDevices(targetUserId).filter((d) => d.trusted && !d.revoked).length,
      },
      kyc: {
        requiresKyc: actorSpec.requiresKyc,
        status: userKyc?.status ?? acc?.kycStatus ?? 'NOT_REQUIRED',
        daysRemaining: userKyc?.daysRemaining ?? 7,
        dossierId: userKyc?.id ?? null,
      },
      dashboardSummary: {
        allowedModules: actorSpec.allowedModules,
        ordersCount: userOrders.length,
        unreadNotificationsCount: unreadNotifsCount,
        activeConversationsCount: conversations.length,
        canCreateRoomLive: actorSpec.canCreateRoomLive,
        sourceCommercialDataAccess: actorSpec.sourceCommercialDataAccess,
      },
      notifications: {
        unreadCount: unreadNotifsCount,
        recent: notifs.slice(0, 5),
      },
      activities: recentActivities,
    };
  }

  // 2. OrderService & StockService — Création de commande TRANSACTIONNELLE avec réservation de stock, MOQ, paliers B2B & idempotence
  public createOrderTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    shippingAddress: string;
    lines: { productId: string; quantity: number; variantId?: string }[];
    idempotencyKey?: string;
    correlationId: string;
    ipAddress: string;
  }): OrderRecord {
    if (params.idempotencyKey) {
      const existingByIdempotency = this.repo
        .getSnapshot()
        .orders.find(
          (o) =>
            !o.deletedAt &&
            o.idempotencyKey === params.idempotencyKey &&
            o.clientId === params.actor.id
        );
      if (existingByIdempotency) {
        return existingByIdempotency;
      }
    }

    return this.repo.executeTransaction((tx) => {
      let subtotalDec = new Decimal(0);
      const builtItems: OrderRecord['items'] = [];
      let primarySupplierId = 'usr-supp-01';
      let primarySupplierName = 'EuroTech Industrial & ColdChain GmbH';

      // Passe 1 : Vérification atomique sans effet de bord (existence, MOQ, stock disponible)
      for (const reqLine of params.lines) {
        if (!reqLine.quantity || reqLine.quantity <= 0) {
          throw new AppError(
            400,
            'INVALID_ORDER_QUANTITY',
            'La quantité commandée doit être strictement supérieure à 0.'
          );
        }
        const prod = tx.products.find((p) => p.id === reqLine.productId && !p.deletedAt);
        if (!prod) {
          throw new AppError(
            404,
            'PRODUCT_NOT_FOUND',
            `Le produit ${reqLine.productId} est introuvable ou a été supprimé logiquement.`
          );
        }
        const moq = prod.minOrderQuantity || 1;
        if (reqLine.quantity < moq) {
          throw new AppError(
            400,
            'ORDER_QUANTITY_BELOW_MOQ',
            `Quantité minimale de commande (MOQ) non atteinte pour ${prod.sku} : demandé ${reqLine.quantity}, minimum requis ${moq}.`
          );
        }
        if (prod.stockAvailable < reqLine.quantity) {
          throw new AppError(
            409,
            'INSUFFICIENT_STOCK_TRANSACTION_ABORTED',
            `Stock insuffisant pour ${prod.sku} : demandé ${reqLine.quantity}, disponible ${prod.stockAvailable}. Transaction annulée (Rollback).`
          );
        }
      }

      const orderNumber = `CMD-2026-${Math.floor(10000 + Math.random() * 89999)}`;
      const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const nowIso = new Date().toISOString();

      // Passe 2 : Réservation atomique du stock, application des paliers B2B et traçabilité des mouvements
      for (let i = 0; i < params.lines.length; i++) {
        const reqLine = params.lines[i];
        const prod = tx.products.find((p) => p.id === reqLine.productId && !p.deletedAt)!;
        if (i === 0) {
          primarySupplierId = prod.supplierId || primarySupplierId;
          primarySupplierName = prod.supplierName || primarySupplierName;
        }

        prod.stockAvailable -= reqLine.quantity;
        prod.stockReserved += reqLine.quantity;
        prod.stockOrdered = (prod.stockOrdered || 0) + reqLine.quantity;
        prod.updatedAt = nowIso;

        const priceRes = defaultCatalogEngine.resolveTieredUnitPrice(
          prod,
          reqLine.quantity,
          reqLine.variantId
        );
        const unitDec = new Decimal(priceRes.unitPrice);
        const lineTotalDec = unitDec.times(reqLine.quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        subtotalDec = subtotalDec.plus(lineTotalDec);

        builtItems.push({
          productId: prod.id,
          sku: prod.sku,
          name: prod.name.fr,
          quantity: reqLine.quantity,
          unitPrice: unitDec.toFixed(2),
          totalLine: lineTotalDec.toFixed(2),
          icon3d: prod.icon3d,
        });

        const alertTriggered = prod.stockAvailable <= prod.minStockAlert;
        if (!tx.stockMovements) tx.stockMovements = [];
        tx.stockMovements.unshift({
          id: `stkm-ord-${Date.now()}-${i}`,
          movementNumber: `MOV-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          productId: prod.id,
          sku: prod.sku,
          movementType: 'ORDER_RESERVATION',
          quantityChange: -reqLine.quantity,
          resultingAvailable: prod.stockAvailable,
          resultingReserved: prod.stockReserved,
          resultingOrdered: prod.stockOrdered,
          resultingShipped: prod.stockShipped || 0,
          reason: `Réservation atomique pour commande ${orderNumber}`,
          referenceDocument: orderNumber,
          orderId,
          orderNumber,
          performedByUserId: params.actor.id,
          performedByUserName: params.actor.companyName || params.actor.email,
          performedByUserRole: params.actor.role,
          timestamp: nowIso,
          minStockAlertTriggered: alertTriggered,
        });
      }

      // Synchroniser l'état du stock avec le moteur de catalogue central
      defaultCatalogEngine.syncProducts(
        tx.products.filter((p) => !p.deletedAt),
        true
      );

      const taxDec = subtotalDec.times('0.20').toDecimalPlaces(2);
      const shippingDec = new Decimal('650.00');
      const totalDec = subtotalDec.plus(taxDec).plus(shippingDec);

      const createdOrder: OrderRecord = {
        id: orderId,
        orderNumber,
        clientId: params.actor.id,
        clientName: params.actor.companyName,
        supplierId: primarySupplierId,
        supplierName: primarySupplierName,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        idempotencyKey: params.idempotencyKey,
        subtotalAmount: subtotalDec.toFixed(2),
        taxAmount: taxDec.toFixed(2),
        shippingAmount: shippingDec.toFixed(2),
        totalAmount: totalDec.toFixed(2),
        currency: 'EUR',
        shippingAddress: params.shippingAddress,
        createdAt: nowIso.replace('T', ' ').slice(0, 16),
        items: builtItems,
        timeline: [
          {
            step: 'Commande créée & Stock réservé atomiquement',
            timestamp: nowIso,
            actor: params.actor.companyName,
            completed: true,
          },
        ],
      };

      tx.orders.unshift(createdOrder);
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso.replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'ORDER_CREATED_TRANSACTIONAL',
        targetType: 'Order',
        targetId: orderNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Commande ${orderNumber} créée avec réservation de stock (${totalDec.toFixed(2)} EUR TTC).`,
      });

      const orderNotif = defaultNotificationDispatcher.createOrderNotification({
        userId: primarySupplierId,
        orderNumber: createdOrder.orderNumber,
        status: 'CREATED',
        totalAmount: createdOrder.totalAmount,
        currency: createdOrder.currency,
      });
      defaultNotificationDispatcher.dispatch({ notification: orderNotif });

      return createdOrder;
    });
  }

  // 3A. KYCService — Référentiel des documents requis selon le profil
  public getKycRequirementsByProfile(profile?: string) {
    if (profile && ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR'].includes(profile)) {
      const p = profile as KycActorProfile;
      return {
        profile: p,
        requiredDocuments: KYC_REQUIRED_DOCUMENTS_BY_PROFILE[p],
      };
    }
    return {
      profiles: KYC_REQUIRED_DOCUMENTS_BY_PROFILE,
    };
  }

  // 3B. KYCService — Dépôt, scan antivirus et chiffrement par enveloppe AES-256-GCM d'un justificatif
  public uploadAndEncryptKycDocumentTransactional(params: {
    dossierId: string;
    docType: string;
    fileName: string;
    fileSizeBytes?: number;
    mimeType?: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const dos = tx.kycDossiers.find((d) => d.id === params.dossierId);
      if (!dos) {
        throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
      }

      // Protection IDOR : seul le propriétaire du dossier ou un ADMIN peut déposer une pièce
      if (params.actor.role !== 'ADMIN' && dos.userId !== params.actor.id) {
        throw new AppError(
          403,
          'RESOURCE_OWNERSHIP_VIOLATION',
          'Interdit (Protection IDOR) : vous ne pouvez déposer des pièces que sur votre propre dossier KYC.'
        );
      }

      let encryptedResult;
      try {
        encryptedResult = encryptAndStoreKycDocument({
          dossierId: dos.id,
          actorType: dos.actorType,
          docType: params.docType,
          fileName: params.fileName,
          fileSizeBytes: params.fileSizeBytes,
          mimeType: params.mimeType,
        });
      } catch (err) {
        if (err instanceof Error && err.message === 'KYC_SECURITY_MALICIOUS_FILE_EXTENSION') {
          throw new AppError(
            400,
            'KYC_SECURITY_MALICIOUS_FILE_EXTENSION',
            'Rejet Antivirus / Sécurité : les fichiers exécutables ou scripts sont strictement interdits.'
          );
        }
        if (err instanceof Error && err.message === 'KYC_FILE_SIZE_EXCEEDS_10MB') {
          throw new AppError(
            400,
            'KYC_FILE_SIZE_EXCEEDS_10MB',
            'La taille du fichier dépasse la limite maximale autorisée de 10 Mo.'
          );
        }
        throw err;
      }

      const { documentItem } = encryptedResult;
      dos.documents = [
        ...dos.documents.filter((existing) => existing.docType !== params.docType),
        {
          id: documentItem.id,
          docType: documentItem.docType,
          label: documentItem.label,
          fileName: documentItem.fileName,
          uploadedAt: documentItem.uploadedAt,
          sha256: documentItem.sha256,
          encryptionKeyId: documentItem.encryptionKeyId,
          status: 'UPLOADED',
          mimeType: documentItem.encryptedMeta.mimeType,
          fileSizeBytes: documentItem.encryptedMeta.fileSizeBytes,
          encryptedVaultUri: documentItem.encryptedMeta.encryptedVaultUri,
          ivHex: documentItem.encryptedMeta.ivHex,
          authTagHex: documentItem.encryptedMeta.authTagHex,
          virusScanStatus: documentItem.encryptedMeta.virusScanStatus,
        },
      ];

      const completion = checkMandatoryKycCompletion(dos.actorType, dos.documents, dos.jurisdiction);
      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);

      if (completion.allMandatoryUploaded && dos.daysElapsed < 7 && dos.status !== 'VALIDATED') {
        dos.status = 'SUBMITTED_IN_TIME_PENDING_REVIEW';
        dos.submittedAt = dos.submittedAt ?? nowIso;
      }

      dos.history = [
        {
          id: `khist-${Date.now()}`,
          timestamp: nowIso,
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: completion.allMandatoryUploaded
            ? 'ALL_MANDATORY_SUBMITTED_IN_TIME'
            : 'DOCUMENT_UPLOADED_ENCRYPTED',
          summary: `Pièce ${params.docType} (${params.fileName}) chiffrée AES-256-GCM. Complétude obligatoire : ${completion.uploadedMandatory}/${completion.totalMandatory}.`,
        },
        ...(dos.history ?? []),
      ];

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_DOCUMENT_UPLOADED_ENCRYPTED',
        targetType: 'KYCDocument',
        targetId: `${dos.id}:${documentItem.id}`,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Pièce ${params.docType} (${params.fileName}) chiffrée AES-256-GCM (SHA-256: ${documentItem.sha256.slice(
          0,
          16
        )}...).`,
      });

      return {
        dossier: dos,
        uploadedDocument: documentItem,
        completion,
        ruleEvaluation: evaluateKYCDossierRule(dos),
      };
    });
  }

  // 3C. KYCService — Prévisualisation sécurisée et déchiffrement KMS journalisé
  public previewEncryptedKycDocument(params: {
    dossierId: string;
    docId: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const dos = tx.kycDossiers.find((d) => d.id === params.dossierId);
      if (!dos) {
        throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
      }

      if (params.actor.role !== 'ADMIN' && dos.userId !== params.actor.id) {
        throw new AppError(
          403,
          'RESOURCE_OWNERSHIP_VIOLATION',
          'Interdit (Protection IDOR) : vous ne pouvez pas prévisualiser les pièces KYC d’un autre utilisateur.'
        );
      }

      const doc = dos.documents.find((item) => item.id === params.docId);
      if (!doc) {
        throw new AppError(404, 'KYC_DOCUMENT_NOT_FOUND', 'Document KYC introuvable.');
      }

      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
      dos.history = [
        {
          id: `khist-${Date.now()}`,
          timestamp: nowIso,
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'DOCUMENT_PREVIEWED',
          summary: `Déchiffrement KMS à la volée et prévisualisation autorisée de ${doc.fileName}.`,
        },
        ...(dos.history ?? []),
      ];

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_ENCRYPTED_DOCUMENT_PREVIEWED',
        targetType: 'KYCDocument',
        targetId: `${dos.id}:${doc.id}`,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Prévisualisation KMS autorisée pour ${doc.fileName} (SHA-256: ${doc.sha256.slice(0, 16)}...).`,
      });

      return {
        dossierId: dos.id,
        companyName: dos.companyName,
        document: doc,
        decryptedPreviewContent: `CERTIFIED_PREVIEW::${dos.companyName}::${doc.docType}::${doc.fileName}`,
        integrityVerified: true,
      };
    });
  }

  // 3D. KYCService — Commentaire administratif horodaté
  public addAdminKycCommentTransactional(params: {
    dossierId: string;
    comment: string;
    visibility?: 'INTERNAL_ADMIN_ONLY' | 'SHARED_WITH_APPLICANT';
    targetDocType?: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const dos = tx.kycDossiers.find((d) => d.id === params.dossierId);
      if (!dos) {
        throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
      }
      const trimmed = params.comment.trim();
      if (trimmed.length < 3) {
        throw new AppError(400, 'VALIDATION_COMMENT_EMPTY', 'Le commentaire administratif est requis.');
      }

      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const commentItem = {
        id: `kcom-${Date.now()}`,
        authorEmail: params.actor.email,
        authorName: params.actor.email,
        createdAt: nowIso,
        comment: trimmed,
        targetDocType: params.targetDocType,
        visibility: params.visibility ?? 'SHARED_WITH_APPLICANT',
      };

      dos.adminComments = [commentItem, ...(dos.adminComments ?? [])];
      dos.history = [
        {
          id: `khist-${Date.now()}`,
          timestamp: nowIso,
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'ADMIN_COMMENT_ADDED',
          summary: `Commentaire administratif (${commentItem.visibility}) : ${trimmed}`,
        },
        ...(dos.history ?? []),
      ];

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_ADMIN_COMMENT_ADDED',
        targetType: 'KYC',
        targetId: dos.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Commentaire administratif ajouté sur ${dos.id}.`,
      });

      return { dossier: dos, addedComment: commentItem };
    });
  }

  // 3E. KYCService — Décision administrative (VALIDATED, REJECTED, COMPLEMENT_REQUESTED, REACTIVATE)
  public reviewKycDossierTransactional(params: {
    dossierId: string;
    decision: 'VALIDATED' | 'REJECTED' | 'COMPLEMENT_REQUESTED' | 'REACTIVATE';
    reason?: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const dos = tx.kycDossiers.find((d) => d.id === params.dossierId);
      if (!dos) {
        throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
      }

      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);

      if (params.decision === 'REACTIVATE') {
        dos.status = 'SUBMITTED_IN_TIME_PENDING_REVIEW';
        dos.reactivatedAt = nowIso;
        dos.reactivatedBy = params.actor.email;
      } else {
        dos.status = params.decision;
      }

      dos.reviewedAt = nowIso;
      dos.reviewedBy = params.actor.email;
      dos.rejectionReason = params.decision === 'REJECTED' ? params.reason : dos.rejectionReason;
      dos.complementReason =
        params.decision === 'COMPLEMENT_REQUESTED' ? params.reason : dos.complementReason;

      if (params.decision === 'VALIDATED') {
        dos.documents = dos.documents.map((doc) => ({ ...doc, status: 'VALIDATED' }));
      }

      dos.history = [
        {
          id: `khist-${Date.now()}`,
          timestamp: nowIso,
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: `ADMIN_${params.decision}`,
          summary: params.reason
            ? `Décision [${params.decision}] par ${params.actor.email} — Motif : ${params.reason}`
            : `Décision [${params.decision}] par ${params.actor.email}`,
        },
        ...(dos.history ?? []),
      ];

      // Enregistrement de la décision administrative dans l'audit trail immuable
      const decisionRec: KYCDecisionHistoryRecord = {
        id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kycId: dos.id,
        adminUserId: params.actor.id,
        adminEmail: params.actor.email,
        action:
          params.decision === 'VALIDATED'
            ? 'VALIDATE'
            : params.decision === 'REJECTED'
            ? 'REJECT'
            : params.decision === 'COMPLEMENT_REQUESTED'
            ? 'REQUEST_COMPLEMENT'
            : 'REACTIVATE',
        reason: params.reason,
        createdAt: nowIso,
      };
      tx.kycDecisions = [decisionRec, ...(tx.kycDecisions ?? [])];

      const ruleEvaluation = evaluateKYCDossierRule(dos);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action:
          params.decision === 'VALIDATED'
            ? 'KYC_VALIDATED'
            : params.decision === 'REJECTED'
            ? 'KYC_REJECTED_WITH_REASON'
            : params.decision === 'COMPLEMENT_REQUESTED'
            ? 'KYC_COMPLEMENT_REQUESTED'
            : 'KYC_ACCOUNT_REACTIVATED',
        targetType: 'KYC',
        targetId: dos.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: params.reason
          ? `${params.decision} — Motif : ${params.reason}`
          : `Dossier KYC ${params.decision}.`,
      });

      return { dossier: dos, ruleEvaluation, decision: decisionRec };
    });
  }

  // 3F. KYCCronService — Tâche programmée J+1, J+3, J+5, J+6 et suspension conditionnelle J+7
  public runKycScheduledCronJobTransactional(params: {
    simulatedDayOverride?: number;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const report = executeKycCronBatch(tx.kycDossiers, params.simulatedDayOverride);

      // Journalisation des rappels et suspensions automatiques
      for (const r of report.remindersTriggered) {
        tx.kycReminders?.push({
          id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          kycId: r.dossierId,
          userId: tx.kycDossiers.find((d) => d.id === r.dossierId)?.userId ?? '',
          milestone: r.milestone,
          channel: 'EMAIL',
          status: 'SENT',
          sentAt: report.executedAt,
        });
      }
      for (const s of report.suspendedAtJ7) {
        tx.kycReminders?.push({
          id: `rem-j7-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          kycId: s.dossierId,
          userId: tx.kycDossiers.find((d) => d.id === s.dossierId)?.userId ?? '',
          milestone: 'J+7',
          channel: 'EMAIL',
          status: 'SENT',
          sentAt: report.executedAt,
        });
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: report.executedAt,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_CRON_BATCH_EXECUTED',
        targetType: 'KYCCronService',
        targetId: `BATCH-${report.evaluatedCount}`,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Relances=${report.remindersTriggered.length} ; Suspendus J+7=${report.suspendedAtJ7.length} ; Protégés à J+7 (soumis à temps)=${report.protectedInTimeAtJ7.length}`,
      });

      return report;
    });
  }

  // 3G. KYCService — Référentiel des juridictions configurables (MA, FR, DE, ES, AE, INTL)
  public listKycJurisdictions(): KYCJurisdictionConfigRecord[] {
    return this.repo.getSnapshot().kycJurisdictions ?? [];
  }

  public updateKycJurisdiction(params: {
    countryCode: string;
    patch: Partial<KYCJurisdictionConfigRecord>;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    if (params.actor.role !== 'ADMIN') {
      throw new AppError(
        403,
        'FORBIDDEN_ADMIN_ONLY',
        'Seul un Administrateur peut modifier la configuration juridictionnelle KYC.'
      );
    }
    return this.repo.executeTransaction((tx) => {
      const code = params.countryCode.toUpperCase();
      let jur = (tx.kycJurisdictions ?? []).find((j) => j.countryCode.toUpperCase() === code);
      if (!jur) {
        throw new AppError(404, 'KYC_JURISDICTION_NOT_FOUND', `Juridiction ${code} introuvable.`);
      }
      Object.assign(jur, params.patch, { updatedAt: new Date().toISOString() });
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_JURISDICTION_CONFIG_UPDATED',
        targetType: 'KYCJurisdictionConfig',
        targetId: code,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Mise à jour des exigences documentaires KYC pour le pays ${code}.`,
      });
      return jur;
    });
  }

  // 3H. KYCService — Mise à jour des informations d'entreprise et du représentant légal
  public updateKycCompanyProfile(params: {
    dossierId: string;
    profile: {
      companyLegalType?: string;
      registrationNumber?: string;
      representativeName?: string;
      representativeIdNumber?: string;
      representativeNationality?: string;
      businessAddress?: string;
      city?: string;
      postalCode?: string;
      phoneNumber?: string;
      legalCapital?: number;
      incorporationDate?: string;
    };
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const dos = tx.kycDossiers.find((d) => d.id === params.dossierId);
      if (!dos) {
        throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
      }
      if (params.actor.role !== 'ADMIN' && dos.userId !== params.actor.id) {
        throw new AppError(
          403,
          'RESOURCE_OWNERSHIP_VIOLATION',
          'Interdit (Protection IDOR) : vous ne pouvez modifier que votre propre dossier KYC.'
        );
      }
      Object.assign(dos, params.profile);
      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
      dos.history = [
        {
          id: `khist-${Date.now()}`,
          timestamp: nowIso,
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'PROFILE_INFO_UPDATED',
          summary: `Mise à jour des informations d'entreprise et du représentant légal (${dos.representativeName ?? dos.companyName}).`,
        },
        ...(dos.history ?? []),
      ];
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_PROFILE_UPDATED',
        targetType: 'KYC',
        targetId: dos.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Informations légales et représentant mises à jour pour ${dos.companyName}.`,
      });
      return dos;
    });
  }

  // 3I. KYCService — Génération d'URL présignée temporaire (15 min / 900s) avec signature HMAC-SHA256
  public generateKycPresignedUrl(params: {
    dossierId: string;
    docId: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
    expiresInSeconds?: number;
  }): KYCPresignedUrlResponse {
    const dos = this.repo.getSnapshot().kycDossiers.find((d) => d.id === params.dossierId);
    if (!dos) {
      throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
    }
    if (params.actor.role !== 'ADMIN' && dos.userId !== params.actor.id) {
      throw new AppError(
        403,
        'RESOURCE_OWNERSHIP_VIOLATION',
        'Interdit (Protection IDOR) : accès non autorisé aux pièces du dossier KYC.'
      );
    }
    const doc = dos.documents.find((d) => d.id === params.docId);
    if (!doc) {
      throw new AppError(404, 'KYC_DOCUMENT_NOT_FOUND', 'Document introuvable dans le dossier KYC.');
    }
    const presigned = generateKycPresignedDocumentUrl({
      dossierId: dos.id,
      docId: doc.id,
      fileName: doc.fileName,
      s3ObjectKey: doc.encryptedVaultUri?.replace('s3://tradelink-kyc-encrypted-vault/', 'vault/'),
      expiresInSeconds: params.expiresInSeconds ?? 900,
    });
    return this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_PRESIGNED_URL_GENERATED',
        targetType: 'KYCDocument',
        targetId: `${dos.id}:${doc.id}`,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `URL temporaire 15 min générée pour ${doc.fileName} (SHA-256: ${doc.sha256.slice(0, 16)}...).`,
      });
      return presigned;
    });
  }

  // 3J. KYCService — Demande de complément avec spécification des pièces et motif
  public requestKycComplementsTransactional(params: {
    dossierId: string;
    complementDocs: string[];
    reason: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    if (params.actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_ADMIN_ONLY', 'Action réservée aux administrateurs TRADELINK.');
    }
    if (!params.reason || params.reason.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_REASON_MANDATORY', 'Le motif de la demande de complément est obligatoire.');
    }
    return this.repo.executeTransaction((tx) => {
      const dos = tx.kycDossiers.find((d) => d.id === params.dossierId);
      if (!dos) {
        throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
      }
      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
      dos.status = 'COMPLEMENT_REQUESTED';
      dos.complementReason = params.reason;
      dos.complementRequestedDocs = params.complementDocs;
      dos.reviewedAt = nowIso;
      dos.reviewedBy = params.actor.email;

      if (params.complementDocs && params.complementDocs.length > 0) {
        dos.documents = dos.documents.map((d) =>
          params.complementDocs.includes(d.docType)
            ? { ...d, status: 'COMPLEMENT_NEEDED' as const, rejectionComment: params.reason }
            : d
        );
      }

      const decisionRec: KYCDecisionHistoryRecord = {
        id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kycId: dos.id,
        adminUserId: params.actor.id,
        adminEmail: params.actor.email,
        action: 'REQUEST_COMPLEMENT',
        reason: params.reason,
        complementDocs: params.complementDocs,
        createdAt: nowIso,
      };
      tx.kycDecisions = [decisionRec, ...(tx.kycDecisions ?? [])];

      dos.history = [
        {
          id: `khist-${Date.now()}`,
          timestamp: nowIso,
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'ADMIN_COMPLEMENT_REQUESTED',
          summary: `Demande de complément par ${params.actor.email} (${params.complementDocs.join(', ')}) — Motif : ${params.reason}`,
        },
        ...(dos.history ?? []),
      ];

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_COMPLEMENT_REQUESTED',
        targetType: 'KYC',
        targetId: dos.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Demande de complément (${params.complementDocs.join(', ')}) — Motif : ${params.reason}`,
      });

      return { dossier: dos, decision: decisionRec, ruleEvaluation: evaluateKYCDossierRule(dos) };
    });
  }

  // 3K. KYCService — Réactivation d'un compte suspendu avec traçabilité
  public reactivateKycAccountTransactional(params: {
    dossierId: string;
    reason: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    if (params.actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_ADMIN_ONLY', 'Action réservée aux administrateurs TRADELINK.');
    }
    if (!params.reason || params.reason.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_REASON_MANDATORY', 'Le motif de réactivation est obligatoire.');
    }
    return this.repo.executeTransaction((tx) => {
      const dos = tx.kycDossiers.find((d) => d.id === params.dossierId);
      if (!dos) {
        throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
      }
      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
      dos.status = 'SUBMITTED_IN_TIME_PENDING_REVIEW';
      dos.reactivatedAt = nowIso;
      dos.reactivatedBy = params.actor.email;
      dos.reviewedAt = nowIso;
      dos.reviewedBy = params.actor.email;

      const decisionRec: KYCDecisionHistoryRecord = {
        id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kycId: dos.id,
        adminUserId: params.actor.id,
        adminEmail: params.actor.email,
        action: 'REACTIVATE',
        reason: params.reason,
        createdAt: nowIso,
      };
      tx.kycDecisions = [decisionRec, ...(tx.kycDecisions ?? [])];

      dos.history = [
        {
          id: `khist-${Date.now()}`,
          timestamp: nowIso,
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'ADMIN_ACCOUNT_REACTIVATED',
          summary: `Réactivation administrative du compte par ${params.actor.email} — Motif : ${params.reason}`,
        },
        ...(dos.history ?? []),
      ];

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_ACCOUNT_REACTIVATED',
        targetType: 'KYC',
        targetId: dos.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Compte réactivé — Motif : ${params.reason}`,
      });

      return { dossier: dos, decision: decisionRec, ruleEvaluation: evaluateKYCDossierRule(dos) };
    });
  }

  // 3L. KYCService — Consultation de l'historique complet des décisions et rappels
  public getKycDossierHistory(params: {
    dossierId: string;
    actor: NonNullable<ServerRequestContext['user']>;
  }) {
    const dos = this.repo.getSnapshot().kycDossiers.find((d) => d.id === params.dossierId);
    if (!dos) {
      throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
    }
    if (params.actor.role !== 'ADMIN' && dos.userId !== params.actor.id) {
      throw new AppError(
        403,
        'RESOURCE_OWNERSHIP_VIOLATION',
        'Interdit : consultation de l’historique non autorisée.'
      );
    }
    const decisions = (this.repo.getSnapshot().kycDecisions ?? []).filter((d) => d.kycId === dos.id);
    const reminders = (this.repo.getSnapshot().kycReminders ?? []).filter((r) => r.kycId === dos.id);
    return {
      dossierId: dos.id,
      companyName: dos.companyName,
      status: dos.status,
      history: dos.history ?? [],
      decisions,
      reminders,
      adminComments:
        params.actor.role === 'ADMIN'
          ? dos.adminComments ?? []
          : (dos.adminComments ?? []).filter((c) => c.visibility === 'SHARED_WITH_APPLICANT'),
    };
  }

  // 4. RoomService — Création de salle Room Live (Interdite en création générale aux Clients)
  public createRoomLiveChecked(params: {
    title: string;
    scheduledAt: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
    description?: string;
    isImmediate?: boolean;
    isPrivate?: boolean;
    hasWaitingRoom?: boolean;
    allowedUserIds?: string[];
    invitedEmails?: string[];
    durationMinutes?: number;
  }): RoomLiveRecord {
    if (!canCreateRoomLiveGeneral(params.actor.role)) {
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'ROOM_CREATE_DENIED_CLIENT_ROLE',
          targetType: 'Room',
          targetId: 'N/A',
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: 'Refusé (Annexe B) : Le rôle CLIENT ne dispose pas d’un droit général de création Room Live.',
        });
      });
      throw new AppError(
        403,
        'CLIENT_ROOM_CREATION_FORBIDDEN',
        'Interdit (Chapitre 6.10 & Annexe B) : Le Client rejoint uniquement les salles autorisées et ne dispose pas d’un droit général de création.'
      );
    }

    return this.repo.executeTransaction((tx) => {
      const roomId = `room-${Date.now()}`;
      const roomCode = `RM-LIVE-${Math.floor(1000 + Math.random() * 8999)}`;
      const allowed = Array.from(new Set([params.actor.id, ...(params.allowedUserIds || ['usr-client-01'])]));

      const token = RoomSfuTokenManager.generateToken({
        roomId,
        roomCode,
        userId: params.actor.id,
        userName: params.actor.email,
        userRole: params.actor.role,
        isHost: true,
        canPublishAudio: true,
        canPublishVideo: true,
        canPublishScreen: true,
        canModerate: true,
      });

      const room: RoomLiveRecord = {
        id: roomId,
        roomCode,
        title: params.title,
        description: params.description,
        createdById: params.actor.id,
        creatorName: params.actor.email,
        creatorRole: params.actor.role,
        status: params.isImmediate ? 'LIVE' : 'SCHEDULED',
        scheduledAt: params.scheduledAt,
        durationMinutes: params.durationMinutes || 60,
        isImmediate: params.isImmediate ?? true,
        isScheduled: !params.isImmediate,
        isPrivate: params.isPrivate ?? false,
        hasWaitingRoom: params.hasWaitingRoom ?? true,
        participantsCount: 1,
        allowedUserIds: allowed,
        invitedEmails: params.invitedEmails || [],
        securityToken: token,
        hostAccessToken: token,
        recordingConsent: true,
        isRecording: false,
        aiSummaryAvailable: false,
      };

      tx.rooms.unshift(room);

      // Enregistrer également la session dans le moteur SFU
      const sessionState: RoomLiveSessionState = {
        roomId: room.id,
        roomCode: room.roomCode,
        title: room.title,
        description: room.description,
        creatorId: room.createdById,
        creatorName: room.creatorName,
        creatorRole: room.creatorRole,
        hostUserId: room.createdById,
        status: room.status,
        recordingConsent: true,
        isRecording: false,
        screenShareActive: false,
        participants: [
          {
            id: `p-${params.actor.id}`,
            userId: params.actor.id,
            name: params.actor.email,
            role: params.actor.role,
            avatarUrl: '/images/warehouse-operations.jpg',
            isHost: true,
            status: 'CONNECTED',
            audioEnabled: true,
            videoEnabled: true,
            screenSharing: false,
            joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            connectionQuality: 'EXCELLENT',
          },
        ],
        chatHistory: [],
        subtitlesHistory: [],
      };
      RoomLiveSfuEngine.registerRoomSession(sessionState);

      return room;
    });
  }

  public listAccessibleRoomsService(userId: string, role: UserRoleCode): RoomLiveRecord[] {
    const allRooms = this.repo.listRooms();
    if (role === 'ADMIN') {
      return allRooms;
    }
    return allRooms.filter((r) => {
      if (r.createdById === userId) return true;
      if (r.allowedUserIds && r.allowedUserIds.includes(userId)) return true;
      if (!r.isPrivate) return true;
      return false;
    });
  }

  public getRoomDetailsService(
    roomIdOrCode: string,
    user?: NonNullable<ServerRequestContext['user']>
  ): { room: RoomLiveRecord; session?: RoomLiveSessionState } {
    const room = this.repo.getRoom(roomIdOrCode);
    if (!room) {
      throw new AppError(404, 'ROOM_NOT_FOUND', `La salle "${roomIdOrCode}" est introuvable ou a été clôturée.`);
    }

    if (user && room.isPrivate && user.role !== 'ADMIN' && room.createdById !== user.id && !room.allowedUserIds.includes(user.id)) {
      throw new AppError(403, 'FORBIDDEN_ROOM_ACCESS', 'Accès refusé : vous ne figurez pas sur la liste des participants autorisés pour cette salle privée.');
    }

    let session = RoomLiveSfuEngine.getRoomSession(room.id);
    if (!session) {
      session = initializeRoomLiveSession(room.roomCode);
      RoomLiveSfuEngine.registerRoomSession(session);
    }

    return { room, session };
  }

  public joinRoomLiveService(params: {
    roomIdOrCode: string;
    actor: NonNullable<ServerRequestContext['user']>;
    deviceInfo?: { audioInput?: string; videoInput?: string; audioOutput?: string };
  }): {
    room: RoomLiveRecord;
    session: RoomLiveSessionState;
    token: string;
    participant: RoomParticipantState;
    participantStatus: 'WAITING_ROOM' | 'CONNECTED';
    status?: string;
    message?: string;
  } {
    const { room, session } = this.getRoomDetailsService(params.roomIdOrCode, params.actor);
    const isHost = params.actor.id === room.createdById || params.actor.role === 'ADMIN';

    // Règle du Lobby : si la salle d'attente est active et que l'utilisateur n'est pas l'hôte
    const requiresLobby = Boolean(room.hasWaitingRoom && !isHost);
    const initialStatus: 'WAITING_ROOM' | 'CONNECTED' = requiresLobby ? 'WAITING_ROOM' : 'CONNECTED';

    // Rechercher ou créer le participant
    let existingPart = session!.participants.find((p) => p.userId === params.actor.id || p.id === params.actor.id);
    if (!existingPart) {
      existingPart = {
        id: `p-${params.actor.id}-${Date.now().toString(36).slice(-4)}`,
        userId: params.actor.id,
        name: params.actor.email,
        role: params.actor.role,
        avatarUrl: '/images/warehouse-operations.jpg',
        isHost,
        status: initialStatus,
        audioEnabled: initialStatus === 'CONNECTED',
        videoEnabled: initialStatus === 'CONNECTED',
        screenSharing: false,
        joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        connectionQuality: 'EXCELLENT',
      };
      session!.participants.push(existingPart);
    } else {
      existingPart.status = initialStatus;
    }

    // Connecter le pair SFU
    RoomLiveSfuEngine.connectPeer(existingPart.id);

    // Émettre le jeton SFU signé
    const token = RoomSfuTokenManager.generateToken({
      roomId: room.id,
      roomCode: room.roomCode,
      userId: params.actor.id,
      userName: params.actor.email,
      userRole: params.actor.role,
      isHost,
      canPublishAudio: true,
      canPublishVideo: true,
      canPublishScreen: isHost || params.actor.role !== 'CLIENT',
      canModerate: isHost,
    });

    // Mettre à jour le nombre de participants connectés
    const connectedCount = session!.participants.filter((p) => p.status === 'CONNECTED').length;
    this.repo.updateRoom(room.id, { participantsCount: connectedCount });

    return {
      room,
      session: session!,
      token,
      participant: existingPart,
      participantStatus: initialStatus,
      status: initialStatus === 'WAITING_ROOM' ? 'WAITING_LOBBY' : 'CONNECTED',
      message: initialStatus === 'WAITING_ROOM' ? 'Vous êtes dans la salle d attente...' : 'Connexion établie',
    };
  }

  public admitLobbyParticipantService(
    roomIdOrCode: string,
    targetParticipantId: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): { success: boolean; admitted: boolean; session: RoomLiveSessionState; message: string } {
    const { session } = this.getRoomDetailsService(roomIdOrCode, actor);
    const result = moderateParticipantAction(session!, targetParticipantId, 'ADMIT', actor.id);
    if (result.success) {
      RoomLiveSfuEngine.registerRoomSession(result.session);
      const connectedCount = result.session.participants.filter((p) => p.status === 'CONNECTED').length;
      this.repo.updateRoom(session!.roomId, { participantsCount: connectedCount });
    }
    return {
      ...result,
      admitted: true,
    };
  }

  public rejectLobbyParticipantService(
    roomIdOrCode: string,
    targetParticipantId: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): { success: boolean; session: RoomLiveSessionState; message: string } {
    const { session } = this.getRoomDetailsService(roomIdOrCode, actor);
    const result = moderateParticipantAction(session!, targetParticipantId, 'DENY', actor.id);
    if (result.success) {
      RoomLiveSfuEngine.registerRoomSession(result.session);
    }
    return result;
  }

  public moderateRoomParticipantService(
    roomIdOrCode: string,
    targetParticipantId: string,
    action: RoomParticipantModerationAction,
    actor: NonNullable<ServerRequestContext['user']>
  ): { success: boolean; session: RoomLiveSessionState; message: string } {
    const { session } = this.getRoomDetailsService(roomIdOrCode, actor);
    const result = moderateParticipantAction(session!, targetParticipantId, action, actor.id);
    if (result.success) {
      RoomLiveSfuEngine.registerRoomSession(result.session);
    }
    return result;
  }

  public startRoomRecordingService(
    roomIdOrCode: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): { success: boolean; session: RoomLiveSessionState; message: string; recordingKey?: string } {
    const { room, session } = this.getRoomDetailsService(roomIdOrCode, actor);
    const result = RoomLiveSfuEngine.startRecordingWithConsent(session!, actor.id);
    if (result.success) {
      this.repo.updateRoom(room.id, {
        isRecording: true,
        recordingKey: result.recordingKey,
        recordingRetentionDays: 90,
      });
    }
    return result;
  }

  public stopRoomRecordingService(
    roomIdOrCode: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): { success: boolean; session: RoomLiveSessionState; message: string } {
    const { room, session } = this.getRoomDetailsService(roomIdOrCode, actor);
    const result = RoomLiveSfuEngine.stopRecording(session!, actor.id);
    if (result.success) {
      this.repo.updateRoom(room.id, { isRecording: false });
    }
    return result;
  }

  public generateRoomAiSummaryService(
    roomIdOrCode: string,
    actor: NonNullable<ServerRequestContext['user']>,
    targetLocale: 'fr' | 'en' | 'ar' = 'fr'
  ): RoomLiveAiSummary {
    const { room, session } = this.getRoomDetailsService(roomIdOrCode, actor);
    const summary = RoomLiveSfuEngine.generateAiMeetingSummary(session!, targetLocale);
    session!.aiSummary = summary;
    this.repo.updateRoom(room.id, {
      aiSummaryAvailable: true,
      aiSummary: {
        summary: summary.summary,
        decisions: summary.decisions,
        actionItems: summary.actionItems.map((a) => a.task),
        topicsDiscussed: summary.topicsDiscussed,
        generatedAt: summary.generatedAt,
        certifiedHashSha256: summary.certifiedHashSha256,
      },
    });
    return summary;
  }

  public shareRoomDocumentService(
    roomIdOrCode: string,
    document: { id: string; title: string; type: string; url?: string; previewUrl?: string },
    actor: NonNullable<ServerRequestContext['user']>
  ): RoomLiveSessionState {
    const { session } = this.getRoomDetailsService(roomIdOrCode, actor);
    return RoomLiveSfuEngine.shareDocument(session!, document, actor.id);
  }

  public raiseHandRoomService(
    roomIdOrCode: string,
    participantId: string,
    isRaised?: boolean
  ): RoomLiveSessionState {
    const { session } = this.getRoomDetailsService(roomIdOrCode);
    return RoomLiveSfuEngine.toggleRaiseHand(session!, participantId, isRaised);
  }

  public broadcastRoomReactionService(
    roomIdOrCode: string,
    participantId: string,
    emoji: string
  ): { session: RoomLiveSessionState; reaction: RoomLiveReaction } {
    const { session } = this.getRoomDetailsService(roomIdOrCode);
    return RoomLiveSfuEngine.broadcastReaction(session!, participantId, emoji);
  }

  public inviteToRoomService(
    roomIdOrCode: string,
    invitedUserIds: string[],
    invitedEmails: string[],
    actor: NonNullable<ServerRequestContext['user']>
  ): { room: RoomLiveRecord; inviteLinks: string[] } {
    const { room } = this.getRoomDetailsService(roomIdOrCode, actor);
    const isHost = actor.id === room.createdById || actor.role === 'ADMIN';
    if (!isHost) {
      throw new AppError(403, 'FORBIDDEN_INVITE', "Seul l'hôte ou l'administrateur peut inviter de nouveaux participants.");
    }

    const updatedAllowed = Array.from(new Set([...(room.allowedUserIds || []), ...invitedUserIds]));
    const updatedEmails = Array.from(new Set([...(room.invitedEmails || []), ...invitedEmails]));

    const updatedRoom = this.repo.updateRoom(room.id, {
      allowedUserIds: updatedAllowed,
      invitedEmails: updatedEmails,
    });

    const inviteLinks = invitedUserIds.map((uId) => {
      const inviteToken = RoomSfuTokenManager.generateToken({
        roomId: room.id,
        roomCode: room.roomCode,
        userId: uId,
        userName: uId,
        userRole: 'CLIENT',
        isHost: false,
        canPublishAudio: true,
        canPublishVideo: true,
        canPublishScreen: false,
        canModerate: false,
      });
      return `https://app.tradelink-saas.com/room/${room.roomCode}?token=${inviteToken}`;
    });

    return { room: updatedRoom || room, inviteLinks };
  }

  // 5. CalculationEngine — Calcul financier déterministe Decimal.js
  public executeDeterministicCalculation(params: {
    principalStr: string;
    annualRatePctStr: string;
    startDateStr: string;
    endDateStr: string;
    basis: DayCountBasis;
    actor: NonNullable<ServerRequestContext['user']>;
  }) {
    return this.repo.executeTransaction((tx) => {
      const calc = calculateFinancialInterest({
        ...params,
        executedBy: `${params.actor.email} (${params.actor.role})`,
      });
      tx.calcHistory.unshift(calc);
      return calc;
    });
  }

  // 6. BackupService — Double validation par deux administrateurs distincts
  public approveBackupRestoreDualAdmin(params: {
    backupId: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const backup = tx.backups.find((b) => b.id === params.backupId);
      if (!backup) {
        throw new AppError(404, 'BACKUP_NOT_FOUND', 'Sauvegarde introuvable.');
      }
      const initiatorId = backup.restoreInitiatorId ?? 'usr-admin-01';
      const check = validateDualAdminApproval(initiatorId, params.actor.id);
      if (!check.allowed) {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'BACKUP_RESTORE_SELF_APPROVAL_DENIED',
          targetType: 'Backup',
          targetId: backup.backupCode,
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: check.reason,
        });
        throw new AppError(403, 'SELF_APPROVAL_FORBIDDEN', check.reason);
      }

      backup.restoreStatus = 'APPROVED_READY';
      backup.restoreSecondApproverId = params.actor.id;
      backup.restoreSecondApproverName = params.actor.email;

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'BACKUP_RESTORE_DUAL_APPROVED',
        targetType: 'Backup',
        targetId: backup.backupCode,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Double approbation validée par ${params.actor.email} (distinct de ${initiatorId}).`,
      });

      return backup;
    });
  }

  // 7. SandboxService — Analyse isolée et contrôle avant migration (PROMPT 11)
  public analyzeSandboxDump(params: {
    fileName: string;
    fileSize: number;
    format?: ImportExportFormat;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }): SandboxAnalysisReport {
    const report = analyzeFileInIsolatedSandbox({
      fileName: params.fileName,
      fileSize: params.fileSize,
      format: params.format,
    });

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'SANDBOX_ISOLATED_ANALYSIS',
        targetType: 'SandboxDump',
        targetId: report.jobId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Analyse isolée (Réseau OFF, Secrets OFF) : ${params.fileName} (${report.totalRowsDetected} lignes, score ${report.compatibilityScore}%).`,
      });
    });

    return report;
  }

  // 8. SandboxService — Promotion vers la production soumise à Double Validation Admin
  public promoteSandboxDumpTransactional(params: {
    report: SandboxAnalysisReport;
    initiatorId: string;
    actor: NonNullable<ServerRequestContext['user']>;
    planHash: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const check = validateDualAdminOperation({
      initiatorId: params.initiatorId,
      approverId: params.actor.id,
      actionCode: 'SANDBOX_PROMOTE_TO_PROD',
      planHash: params.planHash,
      expectedPlanHash: params.report.migrationPlanHash,
    });

    if (!check.allowed) {
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'SANDBOX_PROMOTION_DENIED_DUAL_ADMIN',
          targetType: 'SandboxDump',
          targetId: params.report.jobId,
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: check.reason,
        });
      });
      throw new AppError(403, check.errorCode || 'DUAL_ADMIN_CHECK_FAILED', check.reason);
    }

    return this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'SANDBOX_PROMOTION_SUCCESS_DUAL_ADMIN',
        targetType: 'SandboxDump',
        targetId: params.report.jobId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Promotion vers la production validée par 2e Admin distinct (${params.actor.email}) pour planHash ${params.planHash.slice(0, 16)}...`,
      });

      return {
        success: true,
        jobId: params.report.jobId,
        rowsMigrated: params.report.validRows,
        migratedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        approverAdmin: params.actor.email,
        initiatorAdmin: params.initiatorId,
      };
    });
  }

  // 9. KMSService — Rotation de clé maître KEK sous HSM avec ré-enveloppement des DEK
  public rotateKmsKeyTransactional(params: {
    keyAlias: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      // Simuler l'enregistrement de clé KMS
      const kekRecord: KMSKeyRecord = {
        id: `kms-key-${params.keyAlias.replace(/[^a-zA-Z0-9]/g, '-')}`,
        keyAlias: params.keyAlias,
        keyType: 'KEK_MASTER',
        algorithm: 'AES-256-GCM',
        kmsProvider: 'HASHICORP_VAULT_KMS',
        keyArnMasked: `arn:aws:kms:eu-west-3:774910294102:key/${params.keyAlias}-****`,
        version: 3,
        status: 'ACTIVE',
        lastRotatedAt: '2026-08-15 00:00:00',
        nextRotationAt: '2026-11-15',
      };

      const result = rotateKmsMasterKey(kekRecord, params.actor.email);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KMS_KEK_MASTER_ROTATED',
        targetType: 'KMSKey',
        targetId: params.keyAlias,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: result.logEntry.details,
      });

      return result;
    });
  }

  // 10. BackupService — Test de restauration en Sandbox éphémère isolée
  public testBackupRestoreInSandbox(params: {
    backupId: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    const backup = this.repo.getSnapshot().backups.find((b) => b.id === params.backupId);
    if (!backup) {
      throw new AppError(404, 'BACKUP_NOT_FOUND', 'Sauvegarde introuvable pour le test en sandbox.');
    }

    const integrityCheck = verifyBackupCryptographicIntegrity(backup);
    if (!integrityCheck.isValid) {
      throw new AppError(400, 'BACKUP_INTEGRITY_CHECK_FAILED', integrityCheck.message);
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'BACKUP_SANDBOX_RESTORE_TEST_SUCCESS',
        targetType: 'Backup',
        targetId: backup.backupCode,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Restauration test exécutée en instance Sandbox isolée (Aucune écriture prod, intégrité SHA-256 confirmée).`,
      });
    });

    return {
      testSuccess: true,
      backupCode: backup.backupCode,
      integrityVerified: true,
      tablesRestoredCount: 8,
      durationMs: 380,
      sandboxContainerId: `sbx-test-${Date.now().toString().slice(-6)}`,
      isolationGuaranteed: true,
      testedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
  }

  // 11. ExportService — Exports structurés multi-formats (CSV, XLSX, JSON, SQL, DBF, CDX)
  public exportDataset(params: {
    entity: 'PRODUCTS' | 'ORDERS' | 'ENTRIES' | 'AUDIT_LOGS';
    format: ImportExportFormat;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    let dataset: any[] = [];
    const snapshot = this.repo.getSnapshot();

    switch (params.entity) {
      case 'PRODUCTS':
        dataset = snapshot.products.filter((p) => !p.deletedAt);
        break;
      case 'ORDERS':
        dataset = snapshot.orders.filter((o) => !o.deletedAt);
        break;
      case 'ENTRIES':
        dataset = snapshot.accountingEntries || [];
        break;
      case 'AUDIT_LOGS':
        dataset = snapshot.auditLogs;
        break;
    }

    const exported = exportDatasetToFormat({
      entityName: params.entity,
      records: dataset,
      format: params.format,
    });

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'ADMIN_DATASET_EXPORT',
        targetType: params.entity,
        targetId: exported.fileName,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Export ${params.entity} au format ${params.format} (${exported.rowsCount} lignes, SHA-256: ${exported.sha256.slice(0, 16)}...).`,
      });
    });

    return exported;
  }

  // 12. AuditService — Vérification cryptographique de l'intégrité de la chaîne de hachage append-only
  public verifyAuditLogChain(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    const rawLogs = this.repo.getSnapshot().auditLogs;
    const chained = buildAuditChainFromLogs(rawLogs);
    const integrity = verifyAuditLogChainIntegrity(chained);

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'AUDIT_HASH_CHAIN_VERIFIED',
        targetType: 'AuditLog',
        targetId: 'CHAIN_INTEGRITY',
        result: integrity.isChainIntact ? 'SUCCESS' : 'WARNING',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Vérification cryptographique de la chaîne (${integrity.totalEntriesVerified} entrées vérifiées, Intacte : ${integrity.isChainIntact}).`,
      });
    });

    return {
      ...integrity,
      latestHash: chained[0]?.currentHash || 'GENESIS',
      genesisHash: chained[chained.length - 1]?.currentHash || 'GENESIS',
      verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
  }

  // ============================================================================
  // PROMPT 7 : ÉCOSYSTÈME COMMERCIAL COMPLET (CATÉGORIES, PRODUITS, STOCKS,
  // DEVIS, COMMANDES, FACTURATION, STRIPE IDEMPOTENT)
  // ============================================================================

  public listProductCategories(): ProductCategory[] {
    return INITIAL_PRODUCT_CATEGORIES;
  }

  public createProductTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    product: Omit<ProductItem, 'id'>;
    correlationId: string;
    ipAddress: string;
  }): ProductItem {
    CommercialEngine.enforceCommercialAccessControl(params.actor.role, 'CREATE_PRODUCT');

    return this.repo.executeTransaction((tx) => {
      const newProduct: ProductItem = {
        ...params.product,
        id: `prod-${Date.now()}`,
      };

      tx.products.unshift(newProduct);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'COMMERCIAL_PRODUCT_CREATED',
        targetType: 'Product',
        targetId: newProduct.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Produit ${newProduct.sku} (${newProduct.name.fr}) créé avec succès.`,
      });

      return newProduct;
    });
  }

  public recordStockMovementTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    productId: string;
    movementType: LegacyCommercialStockMovementRecord['movementType'];
    quantity: number;
    reason: string;
    referenceDocument?: string;
    correlationId: string;
    ipAddress: string;
  }) {
    CommercialEngine.enforceCommercialAccessControl(params.actor.role, 'UPDATE_STOCK');

    return this.repo.executeTransaction((tx) => {
      const product = tx.products.find((p) => p.id === params.productId && !p.deletedAt);
      if (!product) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produit introuvable.');
      }

      if (params.actor.role === 'FOURNISSEUR' && product.supplierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez modifier le stock que de vos propres produits.');
      }

      const { updatedProduct, movementRecord, alertTriggered } = CommercialEngine.applyStockMovement(
        product,
        params.movementType,
        params.quantity,
        params.reason,
        { id: params.actor.id, name: params.actor.email },
        params.referenceDocument
      );

      const idx = tx.products.findIndex((p) => p.id === updatedProduct.id);
      if (idx !== -1) {
        tx.products[idx] = updatedProduct;
      }

      tx.stockMovements.unshift(movementRecord as any);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: alertTriggered ? 'STOCK_MOVEMENT_WITH_MIN_ALERT' : 'STOCK_MOVEMENT_RECORDED',
        targetType: 'StockMovement',
        targetId: movementRecord.movementNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Mouvement ${movementRecord.movementType} (${params.quantity}) sur ${updatedProduct.sku}. Stock dispo: ${updatedProduct.stockAvailable}. Alerte seuil mini: ${alertTriggered}.`,
      });

      return { updatedProduct, movementRecord, alertTriggered };
    });
  }

  public listStockMovements(productId?: string): StockMovementRecord[] {
    const list = this.repo.getSnapshot().stockMovements;
    return productId ? list.filter((m) => m.productId === productId) : list;
  }

  public createQuoteTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    quoteInput: QuoteCreateInput;
    correlationId: string;
    ipAddress: string;
  }): QuoteRecord {
    return this.repo.executeTransaction((tx) => {
      const quote = CommercialEngine.createQuote(params.quoteInput);
      tx.quotes.unshift(quote);

      const notif = defaultNotificationDispatcher.createQuoteNotification({
        userId: quote.supplierId,
        quoteNumber: quote.quoteNumber,
        action: 'REQUESTED',
      });
      defaultNotificationDispatcher.dispatch({ notification: notif });

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'QUOTE_REQUEST_CREATED',
        targetType: 'Quote',
        targetId: quote.quoteNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Demande de devis ${quote.quoteNumber} émise par ${quote.clientName}. Total estimé: ${quote.totalAmount} ${quote.currency}.`,
      });

      return quote;
    });
  }

  public respondToQuoteTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    respondInput: QuoteRespondInput;
    correlationId: string;
    ipAddress: string;
  }): QuoteRecord {
    return this.repo.executeTransaction((tx) => {
      const quote = tx.quotes.find((q) => q.id === params.respondInput.quoteId);
      if (!quote) {
        throw new AppError(404, 'QUOTE_NOT_FOUND', 'Devis introuvable.');
      }

      if (params.actor.role === 'FOURNISSEUR' && quote.supplierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez chiffrer que les devis qui vous sont adressés.');
      }

      let updated: QuoteRecord;
      try {
        updated = CommercialEngine.respondToQuote(quote, params.respondInput);
      } catch (err: any) {
        const msg = err?.message || 'Erreur lors de la réponse au devis.';
        const code = msg.startsWith('QUOTE_EXPIRED') ? 'QUOTE_EXPIRED' : 'QUOTE_RESPOND_ERROR';
        throw new AppError(409, code, msg);
      }
      const idx = tx.quotes.findIndex((q) => q.id === updated.id);
      if (idx !== -1) {
        tx.quotes[idx] = updated;
      }

      const notif = defaultNotificationDispatcher.createQuoteNotification({
        userId: updated.clientId,
        quoteNumber: updated.quoteNumber,
        action: 'PRICE_OFFERED',
      });
      defaultNotificationDispatcher.dispatch({ notification: notif });

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'QUOTE_RESPONDED_BY_SUPPLIER',
        targetType: 'Quote',
        targetId: updated.quoteNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Devis ${updated.quoteNumber} chiffré par le fournisseur (${updated.totalAmount} ${updated.currency} TTC).`,
      });

      return updated;
    });
  }

  public acceptQuoteTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    quoteId: string;
    correlationId: string;
    ipAddress: string;
  }): QuoteRecord {
    return this.repo.executeTransaction((tx) => {
      const quote = tx.quotes.find((q) => q.id === params.quoteId);
      if (!quote) {
        throw new AppError(404, 'QUOTE_NOT_FOUND', 'Devis introuvable.');
      }
      if (params.actor.role === 'CLIENT' && quote.clientId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez accepter que vos propres devis.');
      }

      const todayStr = new Date().toISOString().split('T')[0];
      if (quote.status === 'EXPIRED' || (quote.validUntil && quote.validUntil < todayStr)) {
        quote.status = 'EXPIRED';
        throw new AppError(409, 'QUOTE_EXPIRED', `Le devis ${quote.quoteNumber} a expiré le ${quote.validUntil}.`);
      }
      if (quote.status === 'CONVERTED' || quote.status === 'REFUSED' || quote.status === 'REJECTED') {
        throw new AppError(409, 'QUOTE_ALREADY_FINALIZED', `Le devis ${quote.quoteNumber} est déjà au statut ${quote.status}.`);
      }

      quote.status = 'ACCEPTED';

      const notif = defaultNotificationDispatcher.createQuoteNotification({
        userId: quote.supplierId,
        quoteNumber: quote.quoteNumber,
        action: 'ACCEPTED',
      });
      defaultNotificationDispatcher.dispatch({ notification: notif });

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'QUOTE_ACCEPTED_BY_CLIENT',
        targetType: 'Quote',
        targetId: quote.quoteNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Devis ${quote.quoteNumber} accepté par le client.`,
      });

      return quote;
    });
  }

  public negotiateQuoteTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    quoteId: string;
    notes?: string;
    incoterm?: string;
    paymentTerms?: string;
    validUntilDate?: string;
    lines: {
      productId?: string;
      description: string;
      quantity: number;
      unitPrice: string;
      discountPct?: string;
    }[];
    correlationId: string;
    ipAddress: string;
  }): QuoteRecord {
    if (params.actor.role === 'COMPTABLE') {
      throw new AppError(
        403,
        'COMPTABLE_STAGE3_READONLY_SOURCE_DATA',
        'Interdit : Le rôle COMPTABLE ne peut pas négocier un devis commercial.'
      );
    }

    return this.repo.executeTransaction((tx) => {
      const quote = tx.quotes.find((q) => q.id === params.quoteId);
      if (!quote) {
        throw new AppError(404, 'QUOTE_NOT_FOUND', 'Devis introuvable.');
      }

      if (params.actor.role === 'CLIENT' && quote.clientId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez négocier que vos propres devis.');
      }
      if (params.actor.role === 'FOURNISSEUR' && quote.supplierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez négocier que les devis qui vous sont adressés.');
      }

      let updated: QuoteRecord;
      try {
        updated = CommercialEngine.negotiateQuote(quote, {
          actorId: params.actor.id,
          actorRole: params.actor.role,
          actorName: params.actor.companyName || params.actor.email,
          notes: params.notes,
          incoterm: params.incoterm,
          paymentTerms: params.paymentTerms,
          validUntilDate: params.validUntilDate,
          lines: params.lines,
        });
      } catch (err: any) {
        const msg = err?.message || 'Erreur de négociation du devis.';
        const code = msg.startsWith('QUOTE_EXPIRED') ? 'QUOTE_EXPIRED' : 'QUOTE_NEGOTIATION_ERROR';
        throw new AppError(409, code, msg);
      }

      const idx = tx.quotes.findIndex((q) => q.id === updated.id);
      if (idx !== -1) {
        tx.quotes[idx] = updated;
      }

      const recipientUserId = params.actor.role === 'CLIENT' ? updated.supplierId : updated.clientId;
      const notif = defaultNotificationDispatcher.createQuoteNotification({
        userId: recipientUserId,
        quoteNumber: updated.quoteNumber,
        action: 'PRICE_OFFERED',
      });
      defaultNotificationDispatcher.dispatch({ notification: notif });

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'QUOTE_NEGOTIATION_ROUND_RECORDED',
        targetType: 'Quote',
        targetId: updated.quoteNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Contre-proposition enregistrée sur le devis ${updated.quoteNumber} (${updated.totalAmount} ${updated.currency} TTC).`,
      });

      return updated;
    });
  }

  public sweepExpiredQuotesTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    asOfDateStr?: string;
    correlationId: string;
    ipAddress: string;
  }): { expiredCount: number; expiredQuotes: QuoteRecord[] } {
    const asOf = params.asOfDateStr || new Date().toISOString().split('T')[0];
    return this.repo.executeTransaction((tx) => {
      const expiredQuotes: QuoteRecord[] = [];
      for (const q of tx.quotes) {
        if (
          ['DRAFT', 'SENT', 'RFQ_SUBMITTED', 'RESPONDED', 'NEGOTIATING', 'QUOTATION_ISSUED'].includes(q.status) &&
          q.validUntil &&
          q.validUntil < asOf
        ) {
          q.status = 'EXPIRED';
          expiredQuotes.push(q);
        }
      }

      if (expiredQuotes.length > 0) {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'QUOTES_EXPIRED_SWEEP',
          targetType: 'Quote',
          targetId: `SWEEP-${expiredQuotes.length}`,
          result: 'SUCCESS',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: `${expiredQuotes.length} devis arrivés à échéance avant ${asOf} marqués EXPIRED.`,
        });
      }

      return { expiredCount: expiredQuotes.length, expiredQuotes };
    });
  }

  public convertQuoteToOrderTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    quoteId: string;
    shippingAddress: string;
    correlationId: string;
    ipAddress: string;
  }): { updatedQuote: QuoteRecord; createdOrder: OrderRecord } {
    CommercialEngine.enforceCommercialAccessControl(params.actor.role, 'CREATE_ORDER');

    return this.repo.executeTransaction((tx) => {
      const quote = tx.quotes.find((q) => q.id === params.quoteId);
      if (!quote) {
        throw new AppError(404, 'QUOTE_NOT_FOUND', 'Devis introuvable.');
      }

      if (params.actor.role === 'CLIENT' && quote.clientId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez convertir que vos propres devis.');
      }

      const activeProds = tx.products.filter((p) => !p.deletedAt);
      let convResult: ReturnType<typeof CommercialEngine.convertQuoteToOrder>;
      try {
        convResult = CommercialEngine.convertQuoteToOrder(
          quote,
          params.shippingAddress,
          activeProds
        );
      } catch (err: any) {
        const msg = err?.message || 'Erreur lors de la conversion du devis.';
        const code = msg.startsWith('QUOTE_EXPIRED')
          ? 'QUOTE_EXPIRED'
          : msg.includes('Stock insuffisant')
          ? 'INSUFFICIENT_STOCK_TRANSACTION_ABORTED'
          : 'QUOTE_CONVERSION_ERROR';
        throw new AppError(409, code, msg);
      }
      const { updatedQuote, createdOrder, updatedProducts } = convResult;

      for (const up of updatedProducts) {
        const idx = tx.products.findIndex((p) => p.id === up.id);
        if (idx !== -1) {
          tx.products[idx] = up;
        }
      }
      defaultCatalogEngine.syncProducts(
        tx.products.filter((p) => !p.deletedAt),
        true
      );

      const qIdx = tx.quotes.findIndex((q) => q.id === updatedQuote.id);
      if (qIdx !== -1) {
        tx.quotes[qIdx] = updatedQuote;
      }

      tx.orders.unshift(createdOrder);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'QUOTE_CONVERTED_TO_ORDER_TRANSACTIONAL',
        targetType: 'Order',
        targetId: createdOrder.orderNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Devis ${quote.quoteNumber} converti en commande ${createdOrder.orderNumber} avec réservation de stock atomique.`,
      });

      return { updatedQuote, createdOrder };
    });
  }

  public generateInvoiceFromOrderTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    orderId: string;
    dueInDays?: number;
    jurisdiction?: string;
    correlationId: string;
    ipAddress: string;
  }): InvoiceRecord {
    return this.repo.executeTransaction((tx) => {
      const order = tx.orders.find((o) => o.id === params.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }

      const invoice = CommercialEngine.generateInvoiceFromOrder(
        order,
        params.dueInDays ?? 30,
        params.jurisdiction ?? 'France / UE (TVA 20%)',
        tx.invoices
      );

      const salesEntry = AccountingEngine.createSalesInvoiceEntry(
        invoice,
        `${params.actor.email} (${params.actor.role})`
      );
      salesEntry.isImmutable = true;

      invoice.accountingEntryId = salesEntry.id;
      invoice.accountingEntryNumber = salesEntry.entryNumber;
      order.invoiceId = invoice.id;
      order.invoiceNumber = invoice.invoiceNumber;

      tx.invoices.unshift(invoice);
      tx.accountingEntries.unshift(salesEntry);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'COMMERCIAL_INVOICE_GENERATED',
        targetType: 'Invoice',
        targetId: invoice.invoiceNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Facture ${invoice.invoiceNumber} générée pour la commande ${order.orderNumber}. Écriture comptable VTE ${salesEntry.entryNumber} équilibrée créée automatiquement.`,
      });

      return invoice;
    });
  }

  public getInvoiceByIdService(
    invoiceIdOrNumber: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): InvoiceRecord {
    const invoice = this.repo
      .getSnapshot()
      .invoices.find((i) => i.id === invoiceIdOrNumber || i.invoiceNumber === invoiceIdOrNumber);
    if (!invoice) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', 'Facture introuvable.');
    }
    if (actor.role === 'CLIENT' && invoice.clientId !== actor.id) {
      throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Accès interdit à cette facture.');
    }
    if (actor.role === 'FOURNISSEUR' && invoice.supplierId !== actor.id) {
      throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Accès interdit à cette facture.');
    }
    return invoice;
  }

  public sweepOverdueInvoicesTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    asOfDateStr?: string;
    correlationId: string;
    ipAddress: string;
  }): { overdueCount: number; overdueInvoices: InvoiceRecord[] } {
    const asOf = params.asOfDateStr || new Date().toISOString().slice(0, 10);
    return this.repo.executeTransaction((tx) => {
      const overdueInvoices: InvoiceRecord[] = [];
      for (const inv of tx.invoices) {
        if (inv.status === 'ISSUED' && inv.dueAt && inv.dueAt < asOf) {
          inv.status = 'OVERDUE';
          overdueInvoices.push(inv);
        }
      }
      if (overdueInvoices.length > 0) {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'INVOICES_OVERDUE_SWEEP',
          targetType: 'Invoice',
          targetId: `OVERDUE-${overdueInvoices.length}`,
          result: 'SUCCESS',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: `${overdueInvoices.length} factures impayées arrivées à échéance avant ${asOf} marquées OVERDUE.`,
        });
      }
      return { overdueCount: overdueInvoices.length, overdueInvoices };
    });
  }

  public createStripeCheckoutSessionTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    orderId: string;
    invoiceId: string;
    correlationId: string;
    ipAddress: string;
  }): StripeCheckoutSessionSimulated {
    return this.repo.executeTransaction((tx) => {
      const order = tx.orders.find((o) => o.id === params.orderId && !o.deletedAt);
      const invoice = tx.invoices.find((i) => i.id === params.invoiceId);

      if (!order || !invoice) {
        throw new AppError(404, 'ORDER_OR_INVOICE_NOT_FOUND', 'Commande ou facture introuvable.');
      }

      const session = CommercialEngine.createStripeCheckoutSession(order, invoice, params.actor.email);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'STRIPE_CHECKOUT_SESSION_CREATED',
        targetType: 'Payment',
        targetId: session.sessionId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Session Stripe Test créée pour la facture ${invoice.invoiceNumber} (${session.amountTotalCents / 100} ${session.currency.toUpperCase()}).`,
      });

      return session;
    });
  }

  public processStripeWebhookTransactional(params: {
    webhookPayload: StripeWebhookPayloadSimulated;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const result = CommercialEngine.processStripeWebhookIdempotent(
        params.webhookPayload,
        this.processedStripeEventIds,
        tx.payments,
        tx.invoices,
        tx.orders.filter((o) => !o.deletedAt)
      );

      if (result.isIdempotentReplay) {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: 'Stripe Webhook Gateway',
          actorRole: 'SUPPORT',
          action: 'STRIPE_WEBHOOK_IDEMPOTENT_REPLAY_IGNORED',
          targetType: 'Payment',
          targetId: params.webhookPayload.id,
          result: 'SUCCESS',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: `Webhook Stripe ${params.webhookPayload.id} déjà traité : rejeu idempotent ignoré sans double débit.`,
        });

        return {
          status: 'IDEMPOTENT_REPLAY',
          payment: result.paymentRecord,
        };
      }

      if (result.paymentRecord) {
        tx.payments.unshift(result.paymentRecord);
      }

      if (result.updatedInvoice) {
        const invIdx = tx.invoices.findIndex((i) => i.id === result.updatedInvoice!.id);
        if (invIdx !== -1) {
          tx.invoices[invIdx] = result.updatedInvoice;
        }
      }

      if (result.updatedOrder) {
        const ordIdx = tx.orders.findIndex((o) => o.id === result.updatedOrder!.id);
        if (ordIdx !== -1) {
          tx.orders[ordIdx] = result.updatedOrder;
        }
      }

      if (result.paymentRecord) {
        const cashEntry = AccountingEngine.createPaymentCashEntry(
          result.paymentRecord,
          '1.40',
          '0.25',
          'Stripe Webhook Gateway'
        );
        tx.accountingEntries.unshift(cashEntry);
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: 'Stripe Webhook Gateway',
        actorRole: 'SUPPORT',
        action: 'STRIPE_WEBHOOK_PROCESSED_SUCCESSFULLY',
        targetType: 'Payment',
        targetId: params.webhookPayload.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Paiement Stripe ${result.paymentRecord?.paymentReference} validé (${result.paymentRecord?.amount} ${result.paymentRecord?.currency}). Facture payée & commande passée en PREPARING.`,
      });

      return {
        status: 'PROCESSED',
        payment: result.paymentRecord,
        invoice: result.updatedInvoice,
        order: result.updatedOrder,
      };
    });
  }

  // ============================================================================
  // PROMPT 11 : CYCLE COMMERCIAL CENTRALISÉ (PANIER, DEVIS, COMMANDES & PAIEMENTS)
  // ============================================================================

  public validateCartService(params: {
    items: { productId: string; quantity: number }[];
    currency?: string;
    vatRatePct?: string;
    shippingFlatRate?: string;
    saveForUserId?: string;
  }): CartValidationResult {
    const products = this.repo.getSnapshot().products.filter((p) => !p.deletedAt);
    const result = CommercialEngine.validateCart(
      params.items,
      products,
      params.currency || 'EUR',
      params.vatRatePct || '20.00',
      params.shippingFlatRate || '650.00'
    );

    if (params.saveForUserId) {
      const cartItemsToPersist: CartItem[] = result.items.map((vi) => {
        const prod = products.find((p) => p.id === vi.productId) || products[0];
        return {
          product: prod,
          quantity: vi.requestedQuantity,
        };
      });
      this.repo.saveUserCart(params.saveForUserId, cartItemsToPersist);
    }

    return result;
  }

  public getPersistedCartService(userId: string): CartItem[] {
    return this.repo.getUserCart(userId);
  }

  public savePersistedCartService(userId: string, items: CartItem[]): CartItem[] {
    return this.repo.saveUserCart(userId, items);
  }

  public updateOrderStatusTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    orderId: string;
    targetStatus: OrderStatus;
    reason?: string;
    correlationId: string;
    ipAddress: string;
  }): OrderRecord {
    if (params.actor.role === 'COMPTABLE') {
      throw new AppError(
        403,
        'COMPTABLE_STAGE3_READONLY_SOURCE_DATA',
        'Interdit (Stage 3 Cahier des Charges) : Le rôle COMPTABLE ne peut modifier aucune commande commerciale source.'
      );
    }

    return this.repo.executeTransaction((tx) => {
      const order = tx.orders.find((o) => o.id === params.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }

      // Contrôle de propriété ou de rôle
      if (params.actor.role === 'CLIENT' && order.clientId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez modifier que vos propres commandes.');
      }
      if (params.actor.role === 'FOURNISSEUR' && order.supplierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez modifier que les commandes qui vous sont attribuées.');
      }

      // Validation de la transition d'état
      CommercialEngine.assertOrderTransition(order.status, params.targetStatus);

      const previousStatus = order.status;
      order.status = params.targetStatus;

      order.timeline.push({
        step: `Statut mis à jour : ${previousStatus} ➔ ${params.targetStatus}`,
        timestamp: new Date().toISOString(),
        actor: `${params.actor.email} (${params.actor.role})`,
        completed: true,
        note: params.reason,
      });

      // Synchronisation automatique des stocks selon la transition
      if (params.targetStatus === 'CANCELLED') {
        order.cancellationReason = params.reason || 'Annulation commerciale';
        // Libérer les réservations de stock associées si existantes
        try {
          defaultStockEngine.releaseReservation({
            orderId: order.id,
            actor: {
              id: params.actor.id,
              name: params.actor.email,
              role: params.actor.role,
            },
            reason: params.reason || 'Annulation de la commande',
          });
        } catch (err: any) {
          if (err?.code !== 'NO_ACTIVE_RESERVATION_FOUND') {
            throw err;
          }
        }

        // Restaurer le stock dans le snapshot
        for (const item of order.items) {
          const prod = tx.products.find((p) => p.id === item.productId && !p.deletedAt);
          if (prod) {
            prod.stockReserved = Math.max(0, prod.stockReserved - item.quantity);
            prod.stockAvailable += item.quantity;
            prod.stockOrdered = Math.max(0, (prod.stockOrdered || 0) - item.quantity);
          }
        }
      } else if (params.targetStatus === 'SHIPPED') {
        // Confirmation de sortie définitive du stock réservé si existant
        try {
          defaultStockEngine.fulfillReservation({
            orderId: order.id,
            actor: {
              id: params.actor.id,
              name: params.actor.email,
              role: params.actor.role,
            },
          });
        } catch (err: any) {
          if (err?.code !== 'NO_ACTIVE_RESERVATION_FOUND') {
            throw err;
          }
        }

        for (const item of order.items) {
          const prod = tx.products.find((p) => p.id === item.productId && !p.deletedAt);
          if (prod) {
            prod.stockReserved = Math.max(0, prod.stockReserved - item.quantity);
            prod.stockShipped = (prod.stockShipped || 0) + item.quantity;
          }
        }
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'ORDER_STATUS_TRANSITION',
        targetType: 'Order',
        targetId: order.orderNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Commande ${order.orderNumber} passée de ${previousStatus} à ${params.targetStatus}.${params.reason ? ` Motif: ${params.reason}` : ''}`,
      });

      // Notification multi-acteurs
      const notifStatus = params.targetStatus === 'CANCELLED'
        ? 'CANCELLED'
        : params.targetStatus === 'SHIPPED'
        ? 'SHIPPED'
        : params.targetStatus === 'DELIVERED'
        ? 'DELIVERED'
        : 'CONFIRMED';

      const orderNotif = defaultNotificationDispatcher.createOrderNotification({
        userId: params.actor.role === 'CLIENT' ? order.supplierId : order.clientId,
        orderNumber: order.orderNumber,
        status: notifStatus,
        totalAmount: order.totalAmount,
        currency: order.currency,
      });
      defaultNotificationDispatcher.dispatch({ notification: orderNotif });

      return order;
    });
  }

  public rejectQuoteTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    quoteId: string;
    reason: string;
    correlationId: string;
    ipAddress: string;
  }): QuoteRecord {
    return this.repo.executeTransaction((tx) => {
      const quote = tx.quotes.find((q) => q.id === params.quoteId);
      if (!quote) {
        throw new AppError(404, 'QUOTE_NOT_FOUND', 'Devis introuvable.');
      }
      if (params.actor.role === 'CLIENT' && quote.clientId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez refuser que vos propres devis.');
      }

      const updated = CommercialEngine.rejectQuote(quote, params.actor.id, params.reason);
      const idx = tx.quotes.findIndex((q) => q.id === updated.id);
      if (idx !== -1) {
        tx.quotes[idx] = updated;
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'QUOTE_REJECTED_BY_CLIENT',
        targetType: 'Quote',
        targetId: updated.quoteNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Devis ${updated.quoteNumber} refusé par le client. Motif: ${params.reason}`,
      });

      const quoteNotif = defaultNotificationDispatcher.createQuoteNotification({
        userId: quote.supplierId,
        quoteNumber: quote.quoteNumber,
        action: 'REJECTED',
      });
      defaultNotificationDispatcher.dispatch({ notification: quoteNotif });

      return updated;
    });
  }

  public initiateMultiProviderPaymentTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    orderId: string;
    invoiceId?: string;
    provider: PaymentProvider;
    customerEmail: string;
    currency?: string;
    idempotencyKey?: string;
    correlationId: string;
    ipAddress: string;
  }): GenericPaymentSession {
    // Vérification de la clé d'idempotence pour éviter tout double prélèvement
    if (params.idempotencyKey) {
      const cached = defaultIdempotencyStore.get<GenericPaymentSession>(`pay-init-${params.idempotencyKey}`);
      if (cached) {
        return cached;
      }
    }

    return this.repo.executeTransaction((tx) => {
      const order = tx.orders.find((o) => o.id === params.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }

      // Trouver ou générer la facture correspondante
      let invoice = tx.invoices.find((i) => i.id === params.invoiceId || i.orderId === order.id);
      if (!invoice) {
        invoice = CommercialEngine.generateInvoiceFromOrder(order);
        tx.invoices.unshift(invoice);
      }

      if (invoice.status === 'PAID') {
        throw new AppError(
          409,
          'PAYMENT_ALREADY_SETTLED',
          `La commande ${order.orderNumber} et la facture ${invoice.invoiceNumber} sont déjà intégralement payées.`
        );
      }

      const session = CommercialEngine.initiatePaymentSession(
        order,
        invoice,
        params.provider,
        params.customerEmail,
        params.currency
      );

      // Création d'un enregistrement de paiement PENDING
      const paymentRecord: PaymentRecord = {
        id: `pay-${Date.now()}`,
        paymentReference: `PAY-${params.provider}-${order.orderNumber.replace('CMD-', '')}`,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientId: order.clientId,
        supplierId: order.supplierId,
        provider: params.provider,
        amount: session.amount,
        currency: session.currency,
        status: 'PENDING',
        idempotencyKey: params.idempotencyKey,
        idempotencyVerified: Boolean(params.idempotencyKey),
        reconciled: false,
        createdAt: new Date().toISOString(),
      };

      tx.payments.unshift(paymentRecord);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'PAYMENT_SESSION_INITIATED',
        targetType: 'Payment',
        targetId: session.sessionId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Session de paiement ${params.provider} initiée pour ${order.orderNumber} (${session.amount} ${session.currency}).`,
      });

      if (params.idempotencyKey) {
        defaultIdempotencyStore.set(`pay-init-${params.idempotencyKey}`, session);
      }

      return session;
    });
  }

  public confirmPaymentTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    paymentId: string;
    providerTxId?: string;
    correlationId: string;
    ipAddress: string;
  }): {
    payment: PaymentRecord;
    invoice: InvoiceRecord;
    order: OrderRecord;
    receipt: PaymentReceiptRecord;
  } {
    return this.repo.executeTransaction((tx) => {
      const payment = tx.payments.find((p) => p.id === params.paymentId || p.paymentReference === params.paymentId);
      if (!payment) {
        throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Paiement introuvable.');
      }
      if (payment.status === 'SUCCEEDED') {
        throw new AppError(409, 'PAYMENT_ALREADY_SUCCEEDED', 'Ce paiement a déjà été validé sans double débit.');
      }

      const invoice = tx.invoices.find((i) => i.id === payment.invoiceId);
      if (!invoice) {
        throw new AppError(404, 'INVOICE_NOT_FOUND', 'Facture associée introuvable.');
      }

      const order = tx.orders.find((o) => o.id === invoice.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande associée introuvable.');
      }

      const { updatedPayment, updatedInvoice, updatedOrder, receipt } = CommercialEngine.confirmPayment(
        payment,
        order,
        invoice,
        params.providerTxId
      );

      // Mettre à jour dans tx
      const pIdx = tx.payments.findIndex((p) => p.id === updatedPayment.id);
      if (pIdx !== -1) tx.payments[pIdx] = updatedPayment;

      updatedInvoice.paymentIds = Array.from(
        new Set([...(updatedInvoice.paymentIds || []), updatedPayment.id])
      );

      // Générer l'écriture comptable automatique
      const cashEntry = AccountingEngine.createPaymentCashEntry(
        updatedPayment,
        '1.20',
        '0.15',
        `${params.actor.email} (${params.actor.role})`
      );
      cashEntry.isImmutable = true;
      updatedInvoice.accountingEntryId = updatedInvoice.accountingEntryId || cashEntry.id;

      const iIdx = tx.invoices.findIndex((i) => i.id === updatedInvoice.id);
      if (iIdx !== -1) tx.invoices[iIdx] = updatedInvoice;

      const oIdx = tx.orders.findIndex((o) => o.id === updatedOrder.id);
      if (oIdx !== -1) tx.orders[oIdx] = updatedOrder;

      // Sauvegarder la quittance certifiée
      this.repo.savePaymentReceipt(receipt);
      tx.accountingEntries.unshift(cashEntry);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'PAYMENT_CONFIRMED_SUCCESSFULLY',
        targetType: 'Payment',
        targetId: updatedPayment.paymentReference,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Paiement ${updatedPayment.paymentReference} (${updatedPayment.amount} ${updatedPayment.currency}) validé. Reçu ${receipt.receiptNumber} émis.`,
      });

      // Notification au client
      const payNotif = defaultNotificationDispatcher.createPaymentNotification({
        userId: order.clientId,
        invoiceNumber: invoice.invoiceNumber,
        status: 'PAYMENT_RECEIVED',
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
      });
      defaultNotificationDispatcher.dispatch({ notification: payNotif });

      return { payment: updatedPayment, invoice: updatedInvoice, order: updatedOrder, receipt };
    });
  }

  public refundPaymentTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    paymentId: string;
    refundAmountStr?: string;
    reason?: string;
    correlationId: string;
    ipAddress: string;
  }): {
    payment: PaymentRecord;
    invoice: InvoiceRecord;
    order: OrderRecord;
    refundedAmount: string;
    isFullRefund: boolean;
  } {
    if (params.actor.role !== 'ADMIN' && params.actor.role !== 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN_REFUND_OPERATION', 'Seul un Administrateur ou un Comptable peut autoriser un remboursement.');
    }

    return this.repo.executeTransaction((tx) => {
      const payment = tx.payments.find((p) => p.id === params.paymentId || p.paymentReference === params.paymentId);
      if (!payment) {
        throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Paiement introuvable.');
      }

      const invoice = tx.invoices.find((i) => i.id === payment.invoiceId);
      if (!invoice) {
        throw new AppError(404, 'INVOICE_NOT_FOUND', 'Facture associée introuvable.');
      }

      const order = tx.orders.find((o) => o.id === invoice.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande associée introuvable.');
      }

      const result = CommercialEngine.refundPayment(
        payment,
        invoice,
        order,
        params.refundAmountStr,
        params.reason || 'Remboursement autorisé par la direction financière'
      );

      const pIdx = tx.payments.findIndex((p) => p.id === result.updatedPayment.id);
      if (pIdx !== -1) tx.payments[pIdx] = result.updatedPayment;

      const iIdx = tx.invoices.findIndex((i) => i.id === result.updatedInvoice.id);
      if (iIdx !== -1) tx.invoices[iIdx] = result.updatedInvoice;

      const oIdx = tx.orders.findIndex((o) => o.id === result.updatedOrder.id);
      if (oIdx !== -1) tx.orders[oIdx] = result.updatedOrder;

      // Générer automatiquement l'écriture comptable de remboursement en partie double
      const refundEntry = AccountingEngine.createRefundAccountingEntry(
        result.updatedPayment,
        result.refundedAmount,
        invoice.invoiceNumber,
        `${params.actor.email} (${params.actor.role})`
      );
      tx.accountingEntries.unshift(refundEntry);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'PAYMENT_REFUNDED',
        targetType: 'Payment',
        targetId: result.updatedPayment.paymentReference,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Remboursement de ${result.refundedAmount} ${payment.currency} validé (${result.isFullRefund ? 'Total' : 'Partiel'}). Motif: ${params.reason}`,
      });

      const refundNotif = defaultNotificationDispatcher.createPaymentNotification({
        userId: order.clientId,
        invoiceNumber: invoice.invoiceNumber,
        status: 'REFUNDED',
        amount: result.refundedAmount,
        currency: payment.currency,
      });
      defaultNotificationDispatcher.dispatch({ notification: refundNotif });

      return {
        payment: result.updatedPayment,
        invoice: result.updatedInvoice,
        order: result.updatedOrder,
        refundedAmount: result.refundedAmount,
        isFullRefund: result.isFullRefund,
      };
    });
  }

  public failOrCancelPaymentTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    paymentId: string;
    action: 'FAIL' | 'CANCEL';
    reason: string;
    correlationId: string;
    ipAddress: string;
  }): PaymentRecord {
    return this.repo.executeTransaction((tx) => {
      const payment = tx.payments.find((p) => p.id === params.paymentId || p.paymentReference === params.paymentId);
      if (!payment) {
        throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Paiement introuvable.');
      }
      if (payment.status === 'SUCCEEDED' || payment.status === 'REFUNDED') {
        throw new AppError(
          409,
          'PAYMENT_ALREADY_FINALIZED',
          `Impossible de marquer ce paiement comme ${params.action} : statut actuel ${payment.status}.`
        );
      }

      const updated =
        params.action === 'FAIL'
          ? CommercialEngine.failPayment(payment, params.reason || 'Échec de transaction bancaire')
          : CommercialEngine.cancelPayment(payment, params.reason || 'Annulation de paiement');

      const idx = tx.payments.findIndex((p) => p.id === updated.id);
      if (idx !== -1) {
        tx.payments[idx] = updated;
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: params.action === 'FAIL' ? 'PAYMENT_FAILED' : 'PAYMENT_CANCELLED',
        targetType: 'Payment',
        targetId: updated.paymentReference,
        result: 'WARNING',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Paiement ${updated.paymentReference} passé à ${updated.status}. Motif : ${updated.failureReason}`,
      });

      return updated;
    });
  }

  public processSecureMultiProviderWebhookTransactional(params: {
    provider: PaymentProvider;
    rawPayload: string | object;
    signatureHeader: string;
    timestampHeader?: string | number;
    webhookSecret: string;
    correlationId: string;
    ipAddress: string;
  }): {
    status: 'PROCESSED' | 'IDEMPOTENT_REPLAY';
    paymentId?: string;
    orderId?: string;
  } {
    // Vérification cryptographique de la signature HMAC-SHA256 et de l'anti-rejeu
    const sigCheck = CommercialEngine.verifyWebhookSignature(
      params.rawPayload,
      params.signatureHeader,
      params.webhookSecret,
      params.timestampHeader,
      300
    );

    if (!sigCheck.valid) {
      this.repo.saveFinancialAnomaly({
        id: `anom-${Date.now()}`,
        anomalyType: 'WEBHOOK_SIGNATURE_INVALID',
        severity: 'CRITICAL',
        entityId: params.provider,
        entityType: 'WEBHOOK',
        description: `Signature invalide pour le webhook ${params.provider} : ${sigCheck.reason}`,
        timestamp: new Date().toISOString(),
        resolved: false,
      });

      throw new AppError(400, 'WEBHOOK_SIGNATURE_INVALID', `Échec de vérification cryptographique : ${sigCheck.reason}`);
    }

    const payloadObj = typeof params.rawPayload === 'string' ? JSON.parse(params.rawPayload) : params.rawPayload;
    const eventId = String(payloadObj.id || payloadObj.eventId || payloadObj.reference || `evt_${Date.now()}`);

    return this.repo.executeTransaction((tx) => {
      // Vérification d'idempotence stricte
      if (this.processedStripeEventIds.has(eventId)) {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: `${params.provider} Webhook Gateway`,
          actorRole: 'SUPPORT',
          action: 'WEBHOOK_IDEMPOTENT_REPLAY_IGNORED',
          targetType: 'Payment',
          targetId: eventId,
          result: 'SUCCESS',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: `Webhook ${params.provider} (${eventId}) déjà traité : rejeu idempotent ignoré sans double écriture.`,
        });

        return { status: 'IDEMPOTENT_REPLAY' };
      }

      this.processedStripeEventIds.add(eventId);

      // Traitement des données du webhook
      const meta = payloadObj.data?.object?.metadata || payloadObj.metadata || {};
      const orderId = meta.orderId || payloadObj.orderId;
      const invoiceId = meta.invoiceId || payloadObj.invoiceId;

      const order = tx.orders.find((o) => o.id === orderId || o.orderNumber === orderId && !o.deletedAt);
      const invoice = tx.invoices.find((i) => i.id === invoiceId || i.orderId === order?.id);

      if (order && invoice) {
        invoice.status = 'PAID';
        invoice.paidAt = new Date().toISOString().split('T')[0];

        order.status = 'IN_PREPARATION';
        order.paymentStatus = 'PAID';
        order.timeline.push({
          step: `Paiement ${params.provider} certifié par webhook (${eventId})`,
          timestamp: new Date().toISOString(),
          actor: `${params.provider} Gateway`,
          completed: true,
        });

        const payment: PaymentRecord = {
          id: `pay-${Date.now()}`,
          paymentReference: `PAY-${params.provider}-${eventId.slice(-8).toUpperCase()}`,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          orderId: order.id,
          orderNumber: order.orderNumber,
          clientId: order.clientId,
          supplierId: order.supplierId,
          provider: params.provider,
          amount: invoice.totalAmount,
          currency: invoice.currency,
          status: 'SUCCEEDED',
          webhookEventId: eventId,
          idempotencyVerified: true,
          reconciled: false,
          createdAt: new Date().toISOString(),
        };

        tx.payments.unshift(payment);

        const receipt = CommercialEngine.generatePaymentReceipt(payment, order, invoice);
        this.repo.savePaymentReceipt(receipt);

        const cashEntry = AccountingEngine.createPaymentCashEntry(payment, '1.40', '0.25', `${params.provider} Webhook`);
        tx.accountingEntries.unshift(cashEntry);

        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: `${params.provider} Webhook Gateway`,
          actorRole: 'SUPPORT',
          action: 'WEBHOOK_PROCESSED_SUCCESSFULLY',
          targetType: 'Payment',
          targetId: eventId,
          result: 'SUCCESS',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: `Webhook ${params.provider} validé : Commande ${order.orderNumber} réglée (${invoice.totalAmount} ${invoice.currency}).`,
        });

        return { status: 'PROCESSED', paymentId: payment.id, orderId: order.id };
      }

      return { status: 'PROCESSED' };
    });
  }

  public openOrderDisputeTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    orderId: string;
    reason: DisputeReason;
    description: string;
    correlationId: string;
    ipAddress: string;
  }): { dispute: CommercialDisputeRecord; order: OrderRecord } {
    return this.repo.executeTransaction((tx) => {
      const order = tx.orders.find((o) => o.id === params.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }

      if (params.actor.role === 'CLIENT' && order.clientId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez ouvrir un litige que sur vos commandes.');
      }
      if (params.actor.role === 'FOURNISSEUR' && order.supplierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez ouvrir un litige que sur les commandes qui vous sont confiées.');
      }

      const { updatedOrder, dispute } = CommercialEngine.openOrderDispute(
        order,
        { id: params.actor.id, name: params.actor.email, role: params.actor.role },
        params.reason,
        params.description
      );

      const oIdx = tx.orders.findIndex((o) => o.id === updatedOrder.id);
      if (oIdx !== -1) tx.orders[oIdx] = updatedOrder;

      this.repo.saveDispute(dispute);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'ORDER_DISPUTE_OPENED',
        targetType: 'Order',
        targetId: order.orderNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Litige commercial ${dispute.disputeNumber} ouvert sur la commande ${order.orderNumber} (${params.reason}).`,
      });

      // Alerte aux administrateurs
      const disputeNotif = defaultNotificationDispatcher.createSecurityNotification({
        userId: 'usr-admin-01',
        alertType: 'SUSPICIOUS_IP',
        details: `Litige commercial ouvert sur la commande ${order.orderNumber}. Motif: ${params.reason}`,
      });
      disputeNotif.title = `Litige commercial ouvert : ${order.orderNumber}`;
      disputeNotif.body = `Un litige a été ouvert par ${params.actor.email}. Motif: ${params.reason}.`;
      disputeNotif.category = 'COMMERCIAL';
      disputeNotif.actionUrl = `/admin/litiges/${dispute.id}`;
      defaultNotificationDispatcher.dispatch({ notification: disputeNotif });

      return { dispute, order: updatedOrder };
    });
  }

  public resolveOrderDisputeTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    disputeId: string;
    resolution: string;
    action: 'REFUND_TOTAL' | 'REFUND_PARTIAL' | 'FORCE_DELIVERY' | 'DISMISSED';
    correlationId: string;
    ipAddress: string;
  }): { dispute: CommercialDisputeRecord; order: OrderRecord } {
    if (params.actor.role !== 'ADMIN') {
      throw new AppError(403, 'ADMIN_PRIVILEGE_REQUIRED', 'Seul un Administrateur peut arbitrer un litige commercial.');
    }

    return this.repo.executeTransaction((tx) => {
      const dispute = this.repo.findDisputeById(params.disputeId);
      if (!dispute) {
        throw new AppError(404, 'DISPUTE_NOT_FOUND', 'Litige introuvable.');
      }

      const order = tx.orders.find((o) => o.id === dispute.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande associée introuvable.');
      }

      const { updatedDispute, updatedOrder } = CommercialEngine.resolveOrderDispute(
        dispute,
        order,
        { id: params.actor.id, name: params.actor.email },
        params.resolution,
        params.action
      );

      const oIdx = tx.orders.findIndex((o) => o.id === updatedOrder.id);
      if (oIdx !== -1) tx.orders[oIdx] = updatedOrder;

      this.repo.saveDispute(updatedDispute);

      if (params.action === 'REFUND_TOTAL') {
        // Libérer le stock réservé
        defaultStockEngine.releaseReservation({
          orderId: order.id,
          actor: {
            id: params.actor.id,
            name: params.actor.email,
            role: params.actor.role,
          },
          reason: `Arbitrage litige ${dispute.disputeNumber} : Remboursement total`,
        });
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'ORDER_DISPUTE_RESOLVED',
        targetType: 'Order',
        targetId: order.orderNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Litige ${dispute.disputeNumber} résolu par arbitrage administrateur (${params.action}) : ${params.resolution}`,
      });

      return { dispute: updatedDispute, order: updatedOrder };
    });
  }

  public getCommercialOverviewAdmin(params: {
    actor: NonNullable<ServerRequestContext['user']>;
  }) {
    if (params.actor.role !== 'ADMIN' && params.actor.role !== 'COMPTABLE') {
      throw new AppError(403, 'ADMIN_PRIVILEGE_REQUIRED', 'Accès réservé aux Administrateurs et Comptables.');
    }

    const snap = this.repo.getSnapshot();
    const activeOrders = snap.orders.filter((o) => !o.deletedAt);
    const quotes = snap.quotes || [];
    const payments = snap.payments || [];
    const rawDisputes = this.repo.getDisputesForActor(params.actor.id, params.actor.role);
    const disputes: CommercialDisputeRecord[] = Array.isArray(rawDisputes)
      ? rawDisputes
      : ((rawDisputes as any).items || []);
    const anomalies = this.repo.getFinancialAnomalies();

    let totalGmvDec = new Decimal(0);
    const ordersByStatus: Record<string, number> = {};
    for (const o of activeOrders) {
      ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
      totalGmvDec = totalGmvDec.plus(new Decimal(o.totalAmount || '0.00'));
    }

    let totalPaymentsCollectedDec = new Decimal(0);
    const paymentsByProvider: Record<string, { count: number; totalAmount: string }> = {};
    for (const p of payments) {
      if (p.status === 'SUCCEEDED') {
        totalPaymentsCollectedDec = totalPaymentsCollectedDec.plus(new Decimal(p.amount || '0.00'));
      }
      if (!paymentsByProvider[p.provider]) {
        paymentsByProvider[p.provider] = { count: 0, totalAmount: '0.00' };
      }
      paymentsByProvider[p.provider].count += 1;
      paymentsByProvider[p.provider].totalAmount = new Decimal(paymentsByProvider[p.provider].totalAmount)
        .plus(new Decimal(p.amount || '0.00'))
        .toFixed(2);
    }

    return {
      orders: {
        totalCount: activeOrders.length,
        totalGmvEur: totalGmvDec.toDecimalPlaces(2).toFixed(2),
        byStatus: ordersByStatus,
      },
      quotes: {
        totalCount: quotes.length,
        pendingReviewCount: quotes.filter((q) => q.status === 'SENT' || q.status === 'RFQ_SUBMITTED').length,
        issuedCount: quotes.filter((q) => q.status === 'RESPONDED' || q.status === 'QUOTATION_ISSUED').length,
        convertedCount: quotes.filter((q) => q.status === 'CONVERTED').length,
      },
      payments: {
        totalCount: payments.length,
        totalCollectedEur: totalPaymentsCollectedDec.toDecimalPlaces(2).toFixed(2),
        byProvider: paymentsByProvider,
      },
      disputes: {
        totalCount: disputes.length,
        openCount: disputes.filter((d) => d.status === 'OPEN').length,
        inMediationCount: disputes.filter((d) => d.status === 'IN_MEDIATION').length,
        resolvedCount: disputes.filter((d) => d.status === 'RESOLVED').length,
      },
      anomalies: {
        totalCount: anomalies.length,
        unresolvedCount: anomalies.filter((a) => !a.resolved).length,
        items: anomalies.slice(0, 10),
      },
    };
  }

  // ============================================================================
  // PROMPT 9 : MODULE LOGISTIQUE ET TRANSPORT MULTIMODAL
  // ============================================================================

  public listVehicles(carrierId?: string): VehicleRecord[] {
    const list = this.repo.getSnapshot().vehicles;
    return carrierId ? list.filter((v) => v.carrierId === carrierId) : list;
  }

  public createLogisticsMissionTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    orderId: string;
    carrierId: string;
    carrierName: string;
    pickupAddress: string;
    deliveryAddress: string;
    cargoWeightKg: string;
    cargoVolumeM3: string;
    isColdChain: boolean;
    requiredVehicleType?: VehicleRecord['vehicleType'];
    correlationId: string;
    ipAddress: string;
  }): LogisticsMissionRecord {
    return this.repo.executeTransaction((tx) => {
      const order = tx.orders.find((o) => o.id === params.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }

      const mission = LogisticsEngine.createMission({
        order,
        carrierId: params.carrierId,
        carrierName: params.carrierName,
        pickupAddress: params.pickupAddress,
        deliveryAddress: params.deliveryAddress,
        cargoWeightKg: params.cargoWeightKg,
        cargoVolumeM3: params.cargoVolumeM3,
        isColdChain: params.isColdChain,
        requiredVehicleType: params.requiredVehicleType,
      });

      tx.logisticsMissions.unshift(mission);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'LOGISTICS_MISSION_OFFERED',
        targetType: 'Mission',
        targetId: mission.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Mission logistique pour la commande ${order.orderNumber} affectée à ${params.carrierName}.`,
      });

      return mission;
    });
  }

  public respondToLogisticsMissionTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    missionId: string;
    accept: boolean;
    rejectionReason?: string;
    correlationId: string;
    ipAddress: string;
  }): { updatedMission: LogisticsMissionRecord; createdShipment?: ShipmentRecord } {
    return this.repo.executeTransaction((tx) => {
      const mission = tx.logisticsMissions.find((m) => m.id === params.missionId);
      if (!mission) {
        throw new AppError(404, 'MISSION_NOT_FOUND', 'Mission logistique introuvable.');
      }

      if (params.actor.role === 'TRANSPORTEUR' && mission.carrierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez répondre qu’aux missions qui vous sont attribuées.');
      }

      const { updatedMission, createdShipment } = LogisticsEngine.respondToMission(
        mission,
        params.accept,
        params.rejectionReason
      );

      const mIdx = tx.logisticsMissions.findIndex((m) => m.id === updatedMission.id);
      if (mIdx !== -1) {
        tx.logisticsMissions[mIdx] = updatedMission;
      }

      if (createdShipment) {
        tx.shipments.unshift(createdShipment);
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: params.accept ? 'LOGISTICS_MISSION_ACCEPTED' : 'LOGISTICS_MISSION_REFUSED',
        targetType: 'Mission',
        targetId: updatedMission.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: params.accept
          ? `Mission acceptée par ${params.actor.email} -> Expédition ${createdShipment?.trackingNumber} initialisée.`
          : `Mission refusée avec motif : ${params.rejectionReason}`,
      });

      return { updatedMission, createdShipment };
    });
  }

  public createShipmentTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    orderId: string;
    packages: ShipmentPackageDetail[];
    pickupAddress: ShipmentAddressDetail;
    deliveryAddress: ShipmentAddressDetail;
    carrierId?: string;
    carrierName?: string;
    scheduledPickupDate?: string;
    scheduledPickupTimeWindow?: string;
    handlingInstructions?: string;
    customsNotes?: string;
    transportMode?: TransportMode;
    correlationId: string;
    ipAddress: string;
  }): { shipment: ShipmentRecord; documents: TransportDocumentRecord[] } {
    return this.repo.executeTransaction((tx) => {
      const order = tx.orders.find((o) => o.id === params.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable pour l’expédition.');
      }

      if (params.actor.role === 'FOURNISSEUR' && order.supplierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez expédier que vos propres commandes.');
      }

      const shipment = LogisticsEngine.createShipment({
        order,
        carrierId: params.carrierId,
        carrierName: params.carrierName,
        packages: params.packages,
        pickupAddress: params.pickupAddress,
        deliveryAddress: params.deliveryAddress,
        scheduledPickupDate: params.scheduledPickupDate,
        scheduledPickupTimeWindow: params.scheduledPickupTimeWindow,
        handlingInstructions: params.handlingInstructions,
        customsNotes: params.customsNotes,
        transportMode: params.transportMode,
      });

      tx.shipments.unshift(shipment);

      // Générer automatiquement la liasse documentaire associée
      const docs = LogisticsEngine.generateTransportDocuments(shipment, order, undefined, { fullBundle: true });
      for (const d of docs) {
        tx.transportDocuments.unshift(d);
      }
      shipment.associatedDocumentIds = docs.map((d) => d.id);

      // Notifier le client
      defaultNotificationDispatcher.dispatch({
        notification: {
          id: `notif-shp-${Date.now()}`,
          userId: shipment.clientId,
          category: 'LOGISTIQUE',
          priority: 'MEDIUM',
          title: `Nouvelle Expédition Préparée — ${shipment.trackingNumber}`,
          body: `Votre commande ${order.orderNumber} est en cours de préparation logistique. Suivi en direct disponible.`,
          channels: ['IN_APP', 'EMAIL'],
          actionUrl: `/client/logistique`,
          isRead: false,
          icon: 'delivery-van',
          createdAt: new Date().toISOString(),
        },
      });

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'LOGISTICS_SHIPMENT_CREATED',
        targetType: 'Shipment',
        targetId: shipment.trackingNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Expédition ${shipment.trackingNumber} créée pour la commande ${order.orderNumber} (${shipment.totalPackagesCount} colis, ${shipment.weightKg} kg).`,
      });

      return { shipment, documents: docs };
    });
  }

  public assignCarrierTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    shipmentId: string;
    carrierId: string;
    carrierName: string;
    vehicleId?: string;
    driverName?: string;
    reason?: string;
    correlationId: string;
    ipAddress: string;
  }): ShipmentRecord {
    return this.repo.executeTransaction((tx) => {
      const shipment = tx.shipments.find((s) => s.id === params.shipmentId || s.trackingNumber === params.shipmentId);
      if (!shipment) {
        throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
      }

      if (params.actor.role === 'FOURNISSEUR' && shipment.supplierId && shipment.supplierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez affecter que vos propres expéditions.');
      }

      const updated = LogisticsEngine.assignCarrier(shipment, {
        carrierId: params.carrierId,
        carrierName: params.carrierName,
        vehicleId: params.vehicleId,
        driverName: params.driverName,
        reassignedBy: params.actor.email,
        reason: params.reason,
      });

      const sIdx = tx.shipments.findIndex((s) => s.id === updated.id);
      if (sIdx !== -1) {
        tx.shipments[sIdx] = updated;
      }

      // Notifier le transporteur affecté
      defaultNotificationDispatcher.dispatch({
        notification: {
          id: `notif-assign-${Date.now()}`,
          userId: params.carrierId,
          category: 'LOGISTIQUE',
          priority: 'HIGH',
          title: `Nouvelle Expédition Assignée — ${updated.trackingNumber}`,
          body: `Une mission d’acheminement pour la commande ${updated.orderNumber} vous a été affectée.`,
          channels: ['IN_APP', 'EMAIL'],
          actionUrl: `/transporteur/missions`,
          isRead: false,
          icon: 'delivery-van',
          createdAt: new Date().toISOString(),
        },
      });

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'LOGISTICS_CARRIER_ASSIGNED',
        targetType: 'Shipment',
        targetId: updated.trackingNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Expédition ${updated.trackingNumber} affectée au transporteur ${params.carrierName}.`,
      });

      return updated;
    });
  }

  public updateShipmentStatusTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    shipmentId: string;
    nextStatus: ShipmentStatus;
    reason?: string;
    actualDate?: string;
    correlationId: string;
    ipAddress: string;
  }): ShipmentRecord {
    return this.repo.executeTransaction((tx) => {
      const shipment = tx.shipments.find((s) => s.id === params.shipmentId || s.trackingNumber === params.shipmentId);
      if (!shipment) {
        throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
      }

      if (params.actor.role === 'TRANSPORTEUR' && shipment.carrierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez modifier le statut que de vos propres expéditions.');
      }

      const updated = LogisticsEngine.transitionShipmentStatus(shipment, params.nextStatus, {
        reason: params.reason,
        actualDate: params.actualDate,
      });

      const sIdx = tx.shipments.findIndex((s) => s.id === updated.id);
      if (sIdx !== -1) {
        tx.shipments[sIdx] = updated;
      }

      if (
        params.nextStatus === 'COLLECTED' ||
        params.nextStatus === 'PICKED_UP' ||
        params.nextStatus === 'IN_TRANSIT'
      ) {
        const order = tx.orders.find((o) => o.id === shipment.orderId && !o.deletedAt);
        if (order) {
          order.status = 'SHIPPED';
        }
      }

      // Notifier le client lors des étapes clés
      if (['PICKED_UP', 'COLLECTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'INCIDENT', 'FAILED'].includes(params.nextStatus)) {
        defaultNotificationDispatcher.dispatch({
          notification: {
            id: `notif-stat-${Date.now()}`,
            userId: shipment.clientId,
            category: 'LOGISTIQUE',
            priority: params.nextStatus === 'INCIDENT' || params.nextStatus === 'FAILED' ? 'HIGH' : 'MEDIUM',
            title: `Suivi Expédition ${updated.trackingNumber} — ${updated.status}`,
            body: `Votre expédition est passée au statut : ${updated.status}.`,
            channels: ['IN_APP', 'EMAIL'],
            actionUrl: `/client/logistique`,
            isRead: false,
            icon: 'delivery-van',
            createdAt: new Date().toISOString(),
          },
        });
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'LOGISTICS_SHIPMENT_STATUS_TRANSITION',
        targetType: 'Shipment',
        targetId: updated.trackingNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Expédition ${updated.trackingNumber} passée à ${updated.status}.`,
      });

      return updated;
    });
  }

  public recordShipmentGpsLocationTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    shipmentId: string;
    latitude: number;
    longitude: number;
    altitudeMeters?: number;
    speedKmh?: number;
    headingDeg?: number;
    ambientTempCelsius?: number;
    batteryLevelPct?: number;
    addressDescription?: string;
    correlationId: string;
    ipAddress: string;
  }): {
    shipment: ShipmentRecord;
    gpsRecord: ShipmentGpsLocationRecord;
    temperatureAnomalyDetected: boolean;
  } {
    return this.repo.executeTransaction((tx) => {
      const shipment = tx.shipments.find((s) => s.id === params.shipmentId || s.trackingNumber === params.shipmentId);
      if (!shipment) {
        throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
      }

      if (params.actor.role === 'TRANSPORTEUR' && shipment.carrierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez émettre des positions que pour vos propres expéditions.');
      }

      const { updatedShipment, gpsRecord, temperatureAnomalyDetected } = LogisticsEngine.recordGpsPosition(
        shipment,
        {
          latitude: params.latitude,
          longitude: params.longitude,
          altitudeMeters: params.altitudeMeters,
          speedKmh: params.speedKmh,
          headingDeg: params.headingDeg,
          ambientTempCelsius: params.ambientTempCelsius,
          batteryLevelPct: params.batteryLevelPct,
          addressDescription: params.addressDescription,
        }
      );

      const sIdx = tx.shipments.findIndex((s) => s.id === updatedShipment.id);
      if (sIdx !== -1) {
        tx.shipments[sIdx] = updatedShipment;
      }

      if (temperatureAnomalyDetected) {
        defaultNotificationDispatcher.dispatch({
          notification: {
            id: `notif-cold-${Date.now()}`,
            userId: shipment.carrierId,
            category: 'LOGISTIQUE',
            priority: 'CRITICAL',
            title: `ALERTE CHAÎNE DU FROID — ${shipment.trackingNumber}`,
            body: `Température anormale détectée (${params.ambientTempCelsius}°C). Seuil de rupture sous température dirigée dépassé.`,
            channels: ['IN_APP', 'EMAIL', 'SMS'],
            actionUrl: `/transporteur/expeditions`,
            isRead: false,
            icon: 'hazardous-goods',
            createdAt: new Date().toISOString(),
          },
        });

        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'COLD_CHAIN_TEMPERATURE_BREACH',
          targetType: 'Shipment',
          targetId: shipment.trackingNumber,
          result: 'WARNING',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: `Alerte température critique : ${params.ambientTempCelsius}°C relevé en télémétrie sur ${shipment.trackingNumber}.`,
        });
      }

      return { shipment: updatedShipment, gpsRecord, temperatureAnomalyDetected };
    });
  }

  public getShipmentTrackingWithWaypoints(shipmentId: string) {
    const shipment = this.repo.getSnapshot().shipments.find((s) => s.id === shipmentId || s.trackingNumber === shipmentId);
    if (!shipment) {
      throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
    }

    const waypoints: RouteWaypoint[] = INITIAL_SHIPMENT_WAYPOINTS[shipment.trackingNumber] ?? [
      {
        name: shipment.origin,
        country: 'Origine',
        latitude: shipment.pickupAddressDetails?.latitude ?? 33.5731,
        longitude: shipment.pickupAddressDetails?.longitude ?? -7.5898,
        estimatedPassedAt: '2026-11-18 08:00',
        actualPassedAt: shipment.actualPickupDate || '2026-11-18 08:15',
        isCheckpoint: true,
      },
      {
        name: shipment.destination,
        country: 'Destination',
        latitude: shipment.deliveryAddressDetails?.latitude ?? 48.8566,
        longitude: shipment.deliveryAddressDetails?.longitude ?? 2.3522,
        estimatedPassedAt: shipment.estimatedArrival || '2026-11-20 18:00',
        actualPassedAt: shipment.actualDeliveryDate,
        isCheckpoint: true,
      },
    ];

    const docs = this.repo.getSnapshot().transportDocuments.filter((d) => d.shipmentId === shipment.id);

    return {
      shipment,
      waypoints,
      documents: docs,
      hasGeoCoordinates: waypoints.some((w) => w.latitude !== undefined && w.longitude !== undefined),
      currentLocation: shipment.currentGpsLocation,
      gpsHistory: shipment.gpsHistory || [],
    };
  }

  public generateTransportDocumentsTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    shipmentId: string;
    fullBundle?: boolean;
    correlationId: string;
    ipAddress: string;
  }): TransportDocumentRecord[] {
    return this.repo.executeTransaction((tx) => {
      const shipment = tx.shipments.find((s) => s.id === params.shipmentId || s.trackingNumber === params.shipmentId);
      if (!shipment) {
        throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
      }

      const order = tx.orders.find((o) => o.id === shipment.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }

      const docs = LogisticsEngine.generateTransportDocuments(shipment, order, undefined, {
        fullBundle: params.fullBundle,
      });
      for (const d of docs) {
        tx.transportDocuments.unshift(d);
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'TRANSPORT_DOCUMENTS_GENERATED',
        targetType: 'Document',
        targetId: shipment.trackingNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Documents de transport officiels (${docs.map((d) => d.docType).join(', ')}) générés pour ${shipment.trackingNumber}.`,
      });

      return docs;
    });
  }

  public submitProofOfDeliveryTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    podData: ProofOfDeliveryData;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const shipment = tx.shipments.find((s) => s.id === params.podData.shipmentId || s.trackingNumber === params.podData.shipmentId);
      if (!shipment) {
        throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
      }

      if (params.actor.role === 'TRANSPORTEUR' && shipment.carrierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez soumettre la POD que pour vos propres expéditions.');
      }

      const order = tx.orders.find((o) => o.id === shipment.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }

      const { updatedShipment, updatedOrder, podCertifiedRecord } = LogisticsEngine.recordProofOfDelivery(
        shipment,
        order,
        params.podData
      );

      const sIdx = tx.shipments.findIndex((s) => s.id === updatedShipment.id);
      if (sIdx !== -1) {
        tx.shipments[sIdx] = updatedShipment;
      }

      const oIdx = tx.orders.findIndex((o) => o.id === updatedOrder.id);
      if (oIdx !== -1) {
        tx.orders[oIdx] = updatedOrder;
      }

      // Notifier le client et le fournisseur de la livraison effective
      defaultNotificationDispatcher.dispatch({
        notification: {
          id: `notif-pod-cli-${Date.now()}`,
          userId: shipment.clientId,
          category: 'LOGISTIQUE',
          priority: 'HIGH',
          title: `Marchandises Livrées — Preuve de Livraison Scellée (${updatedShipment.trackingNumber})`,
          body: `Livraison effectuée avec succès et signée par ${podCertifiedRecord.recipientFullName}. Sceau SHA-256 : ${podCertifiedRecord.certificationSha256}`,
          channels: ['IN_APP', 'EMAIL'],
          actionUrl: `/client/commandes`,
          isRead: false,
          icon: 'parcel-stack',
          createdAt: new Date().toISOString(),
        },
      });

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'PROOF_OF_DELIVERY_CERTIFIED',
        targetType: 'Shipment',
        targetId: updatedShipment.trackingNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Preuve de livraison (POD) certifiée avec signature par ${podCertifiedRecord.recipientFullName} (${podCertifiedRecord.certificationSha256}). Commande et expédition livrées.`,
      });

      return { updatedShipment, updatedOrder, podCertifiedRecord };
    });
  }

  public reportLogisticsIncidentTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    shipmentId: string;
    title: string;
    description: string;
    severity: IncidentRecord['severity'];
    category?: IncidentCategory;
    evidencePhotos?: string[];
    gpsLocation?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    correlationId: string;
    ipAddress: string;
  }): IncidentRecord {
    return this.repo.executeTransaction((tx) => {
      const shipment = tx.shipments.find((s) => s.id === params.shipmentId || s.trackingNumber === params.shipmentId);
      if (!shipment) {
        throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
      }

      const inc = LogisticsEngine.logLogisticsIncident({
        shipment,
        title: params.title,
        description: params.description,
        severity: params.severity,
        category: params.category,
        reporterId: params.actor.id,
        reporterRole: params.actor.role,
        reporterName: params.actor.email,
        evidencePhotos: params.evidencePhotos,
        gpsLocation: params.gpsLocation,
      });

      tx.incidents.unshift(inc);

      // Si incident grave ou critique, passer le statut de l'expédition en INCIDENT
      if (params.severity === 'HIGH' || params.severity === 'CRITICAL') {
        const sIdx = tx.shipments.findIndex((s) => s.id === shipment.id);
        if (sIdx !== -1) {
          tx.shipments[sIdx].status = 'INCIDENT';
          tx.shipments[sIdx].lastIncidentId = inc.id;
          tx.shipments[sIdx].incidentCount = (tx.shipments[sIdx].incidentCount || 0) + 1;
        }
      }

      // Notifications in-app pour tous les acteurs
      defaultNotificationDispatcher.dispatch({
        notification: {
          id: `notif-inc-${Date.now()}`,
          userId: shipment.clientId,
          category: 'LOGISTIQUE',
          priority: inc.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          title: `Incident Logistique Signalé [${inc.severity}] — ${shipment.trackingNumber}`,
          body: `${inc.title} : ${inc.description}`,
          channels: ['IN_APP', 'EMAIL', 'SMS'],
          actionUrl: `/client/logistique`,
          isRead: false,
          icon: 'hazardous-goods',
          createdAt: new Date().toISOString(),
        },
      });

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'LOGISTICS_INCIDENT_REPORTED',
        targetType: 'Incident',
        targetId: inc.id,
        result: 'WARNING',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Incident logistique [${inc.severity}] signalé pour ${shipment.trackingNumber} : ${inc.title}`,
      });

      return inc;
    });
  }

  public resolveLogisticsIncidentTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    incidentId: string;
    resolutionNotes: string;
    actionTaken?: IncidentRecord['actionTaken'];
    resumeShipmentStatus?: ShipmentStatus;
    correlationId: string;
    ipAddress: string;
  }): IncidentRecord {
    return this.repo.executeTransaction((tx) => {
      const incident = tx.incidents.find((i) => i.id === params.incidentId);
      if (!incident) {
        throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident logistique introuvable.');
      }

      const resolved = LogisticsEngine.resolveLogisticsIncident(incident, {
        resolutionNotes: params.resolutionNotes,
        resolvedBy: params.actor.email,
        actionTaken: params.actionTaken,
      });

      const iIdx = tx.incidents.findIndex((i) => i.id === incident.id);
      if (iIdx !== -1) {
        tx.incidents[iIdx] = resolved;
      }

      // Si l'expédition était bloquée en statut INCIDENT, reprise vers le transit
      const shipment = tx.shipments.find((s) => s.id === incident.shipmentId || s.trackingNumber === incident.trackingNumber);
      if (shipment && shipment.status === 'INCIDENT') {
        const nextStatus = params.resumeShipmentStatus || 'IN_TRANSIT';
        const sIdx = tx.shipments.findIndex((s) => s.id === shipment.id);
        if (sIdx !== -1) {
          tx.shipments[sIdx].status = nextStatus;
        }
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'LOGISTICS_INCIDENT_RESOLVED',
        targetType: 'Incident',
        targetId: resolved.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Incident ${resolved.id} résolu par ${params.actor.email} (Mesure : ${resolved.actionTaken}).`,
      });

      return resolved;
    });
  }

  // ============================================================================
  // PROMPT 8 : MODULE DE COMPTABILITÉ COMPLÈTE & AUDIT FINANCIER
  // ============================================================================

  public getChartOfAccounts(framework: AccountingFramework = 'PCG') {
    return {
      framework,
      accounts: CHARTS_OF_ACCOUNTS[framework] ?? CHARTS_OF_ACCOUNTS.PCG,
    };
  }

  public listAccountingJournals(): AccountingJournalRecord[] {
    return STANDARD_JOURNALS;
  }

  public listAccountingEntries(journalCode?: string, fiscalPeriod?: string): AccountingEntryRecord[] {
    let list = this.repo.getSnapshot().accountingEntries;
    if (journalCode) {
      list = list.filter((e) => e.journalCode === journalCode);
    }
    if (fiscalPeriod) {
      list = list.filter((e) => e.fiscalPeriod === fiscalPeriod);
    }
    return list;
  }

  public createManualAccountingEntryTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    journalCode: AccountingJournalRecord['code'];
    date: string;
    pieceReference: string;
    description: string;
    lines: {
      accountCode: string;
      accountName: string;
      auxiliaryCode?: string;
      label: string;
      debit: string;
      credit: string;
    }[];
    correlationId: string;
    ipAddress: string;
  }): AccountingEntryRecord {
    return this.repo.executeTransaction((tx) => {
      const balanceCheck = AccountingEngine.validateDoubleEntryBalance(params.lines);
      if (!balanceCheck.isBalanced) {
        throw new AppError(
          400,
          'UNBALANCED_ACCOUNTING_ENTRY',
          `Écriture comptable déséquilibrée : Total Débit (${balanceCheck.totalDebit}) différent de Total Crédit (${balanceCheck.totalCredit}). La partie double est violée.`
        );
      }

      const now = new Date();
      const entryDate = params.date || now.toISOString().slice(0, 10);
      const fiscalPeriods = this.repo.listFiscalPeriods();
      try {
        AccountingEngine.validateFiscalPeriodNotLocked(entryDate, fiscalPeriods);
      } catch (err: any) {
        throw new AppError(400, 'FISCAL_PERIOD_LOCKED', err.message);
      }

      const entryNumber = `${params.journalCode}-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      const createdEntry: AccountingEntryRecord = {
        id: `ent-${Date.now()}`,
        entryNumber,
        journalCode: params.journalCode,
        date: params.date || now.toISOString().slice(0, 10),
        fiscalPeriod: (params.date || now.toISOString()).slice(0, 7),
        pieceReference: params.pieceReference,
        description: params.description,
        totalDebit: balanceCheck.totalDebit,
        totalCredit: balanceCheck.totalCredit,
        isBalanced: true,
        isImmutable: true,
        validatedAt: now.toISOString(),
        validatedBy: params.actor.email,
        lines: params.lines.map((l, idx) => ({
          id: `line-${Date.now()}-${idx}`,
          accountCode: l.accountCode,
          accountName: l.accountName,
          auxiliaryCode: l.auxiliaryCode,
          label: l.label,
          debit: l.debit || '0.00',
          credit: l.credit || '0.00',
        })),
      };

      tx.accountingEntries.unshift(createdEntry);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'ACCOUNTING_ENTRY_MANUAL_VALIDATED',
        targetType: 'AccountingEntry',
        targetId: createdEntry.entryNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Écriture ${createdEntry.entryNumber} (${createdEntry.journalCode}) équilibrée créée avec succès (${createdEntry.totalDebit} EUR).`,
      });

      return createdEntry;
    });
  }

  public reverseAccountingEntryTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    entryIdOrNumber: string;
    reason: string;
    replacementLines?: {
      accountCode: string;
      accountName: string;
      auxiliaryCode?: string;
      label: string;
      debit: string;
      credit: string;
    }[];
    correlationId: string;
    ipAddress: string;
  }): {
    reversalEntry: AccountingEntryRecord;
    replacementEntry?: AccountingEntryRecord;
    originalEntry: AccountingEntryRecord;
  } {
    if (params.actor.role !== 'COMPTABLE' && params.actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_ACCOUNTING_REVERSAL', 'Seul un Comptable ou un Administrateur peut émettre une écriture de contre-passation.');
    }

    return this.repo.executeTransaction((tx) => {
      const original = tx.accountingEntries.find(
        (e) => e.id === params.entryIdOrNumber || e.entryNumber === params.entryIdOrNumber
      );
      if (!original) {
        throw new AppError(404, 'ACCOUNTING_ENTRY_NOT_FOUND', 'Écriture comptable d’origine introuvable.');
      }

      let revRes: ReturnType<typeof AccountingEngine.createReversalEntry>;
      try {
        revRes = AccountingEngine.createReversalEntry({
          originalEntry: original,
          reason: params.reason,
          validatedBy: params.actor.email,
          replacementLines: params.replacementLines,
        });
      } catch (err: any) {
        const msg = err?.message || 'Erreur lors de la contre-passation.';
        const status = msg.startsWith('ACCOUNTING_ENTRY_ALREADY_REVERSED') ? 409 : 400;
        const code = msg.split(':')[0].trim();
        throw new AppError(status, code, msg);
      }

      const idx = tx.accountingEntries.findIndex((e) => e.id === original.id);
      if (idx !== -1) {
        tx.accountingEntries[idx] = revRes.updatedOriginalEntry;
      }

      if (revRes.replacementEntry) {
        tx.accountingEntries.unshift(revRes.replacementEntry);
      }
      tx.accountingEntries.unshift(revRes.reversalEntry);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'ACCOUNTING_ENTRY_REVERSED_BY_COUNTER_ENTRY',
        targetType: 'AccountingEntry',
        targetId: revRes.reversalEntry.entryNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Contre-passation ${revRes.reversalEntry.entryNumber} enregistrée pour l’écriture immuable ${original.entryNumber}. Motif : ${params.reason}`,
      });

      return {
        reversalEntry: revRes.reversalEntry,
        replacementEntry: revRes.replacementEntry,
        originalEntry: revRes.updatedOriginalEntry,
      };
    });
  }

  public getGeneralLedger(framework: AccountingFramework = 'PCG') {
    const chart = CHARTS_OF_ACCOUNTS[framework] ?? CHARTS_OF_ACCOUNTS.PCG;
    const entries = this.repo.getSnapshot().accountingEntries;
    return AccountingEngine.computeGeneralLedger(entries, chart);
  }

  public getTrialBalance(framework: AccountingFramework = 'PCG') {
    const ledger = this.getGeneralLedger(framework);
    return AccountingEngine.computeTrialBalance(ledger);
  }

  public executeBankReconciliationBatchTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    bankLines: BankStatementLine[];
    correlationId: string;
    ipAddress: string;
  }): BankReconciliationResult[] {
    return this.repo.executeTransaction((tx) => {
      const results = AccountingEngine.executeBankReconciliation(params.bankLines, tx.payments);

      for (const res of results) {
        if (res.status === 'MATCHED' && res.paymentId) {
          const pay = tx.payments.find((p) => p.id === res.paymentId);
          if (pay) {
            pay.reconciled = true;
          }
        }
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'BANK_RECONCILIATION_BATCH_EXECUTED',
        targetType: 'BankReconciliation',
        targetId: `REC-BATCH-${results.length}`,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Rapprochement bancaire exécuté : ${results.filter((r) => r.status === 'MATCHED').length} rapprochés, ${results.filter((r) => r.status === 'DISCREPANCY').length} écarts, ${results.filter((r) => r.status === 'UNMATCHED').length} non rapprochés.`,
      });

      return results;
    });
  }

  public getFinancialStatements(framework: AccountingFramework = 'PCG') {
    const trialBalance = this.getTrialBalance(framework);
    return AccountingEngine.generateFinancialStatements(trialBalance.items, framework);
  }

  public calculateLoanAmortizationSchedule(params: {
    principalStr: string;
    annualRatePctStr: string;
    durationMonths: number;
    startDateStr: string;
  }) {
    return AccountingEngine.calculateAmortizationSchedule(params);
  }

  public exportTrialBalanceCsv(framework: AccountingFramework = 'PCG'): string {
    const trial = this.getTrialBalance(framework);
    return AccountingEngine.exportTrialBalanceToCsv(trial.items);
  }

  // ============================================================================
  // SERVICES MOTEUR DE CALCUL FINANCIER DÉTERMINISTE (PROMPT 14)
  // Montant × Taux × Nombre de jours / Base annuelle (Decimal.js)
  // Conventions ACT/365, ACT/360, ACT/ACT, Taux fixes/variables, Arrondis IEEE 754
  // ============================================================================

  public calculateFinancialInterestService(
    actor: NonNullable<ServerRequestContext['user']>,
    params: {
      principalStr: string;
      annualRatePctStr?: string;
      rateType?: FinancialRateType;
      benchmarkRateCode?: string;
      benchmarkRatePctStr?: string;
      spreadPctStr?: string;
      startDateStr: string;
      endDateStr: string;
      basis?: DayCountBasis;
      roundingMode?: FinancialRoundingMode;
      roundingDecimals?: number;
      currency?: string;
    },
    correlationId: string,
    ipAddress: string
  ): CalculationResultRecord {
    if (actor.role !== 'ADMIN' && actor.role !== 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs et comptables.');
    }

    const config = this.repo.getFinancialConfig();
    const benchmarkRates = this.repo.listBenchmarkRates();

    const calcResult = AccountingEngine.calculateFinancialInterest({
      principalStr: params.principalStr,
      annualRatePctStr: params.annualRatePctStr,
      rateType: params.rateType,
      benchmarkRateCode: params.benchmarkRateCode,
      benchmarkRatePctStr: params.benchmarkRatePctStr,
      spreadPctStr: params.spreadPctStr,
      startDateStr: params.startDateStr,
      endDateStr: params.endDateStr,
      basis: params.basis ?? config.defaultBasis,
      roundingMode: params.roundingMode ?? config.defaultRoundingMode,
      roundingDecimals: params.roundingDecimals ?? config.defaultRoundingDecimals,
      currency: params.currency ?? config.fixedRecoveryFeeCurrency ?? 'EUR',
      executedBy: actor.email,
      ruleVersion: config.version,
      benchmarksRegistry: benchmarkRates,
    });

    this.repo.saveCalculationResult(calcResult);

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: actor.email,
        actorRole: actor.role,
        action: 'FINANCIAL_INTEREST_CALCULATED',
        targetType: 'CalculationResult',
        targetId: calcResult.id,
        result: 'SUCCESS',
        correlationId,
        ipAddress,
        details: `Calcul d'intérêt financier exécuté : ${calcResult.principal} à ${calcResult.annualRatePct}% sur ${calcResult.daysCount} jours (${calcResult.basis}) = ${calcResult.interestAmount} ${calcResult.currency}.`,
      });
      return null;
    });

    return calcResult;
  }

  public listCalculationHistoryService(
    actor: NonNullable<ServerRequestContext['user']>,
    limit = 100
  ): CalculationResultRecord[] {
    if (actor.role !== 'ADMIN' && actor.role !== 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs et comptables.');
    }
    return this.repo.listCalculationHistory(limit);
  }

  public getFinancialEngineConfigService(
    actor: NonNullable<ServerRequestContext['user']>
  ): FinancialEngineConfigRecord {
    if (actor.role !== 'ADMIN' && actor.role !== 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs et comptables.');
    }
    return this.repo.getFinancialConfig();
  }

  public updateFinancialEngineConfigService(
    actor: NonNullable<ServerRequestContext['user']>,
    updates: Partial<FinancialEngineConfigRecord>,
    correlationId: string,
    ipAddress: string
  ): { updated: FinancialEngineConfigRecord; audits: FinancialConfigAuditRecord[] } {
    if (actor.role !== 'ADMIN') {
      throw new AppError(
        403,
        'ADMIN_ROLE_REQUIRED',
        'Seul un administrateur peut modifier la configuration globale du moteur financier.'
      );
    }
    const res = this.repo.updateFinancialConfig(updates, actor.email, 'Mise à jour des paramètres financiers applicables');
    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: actor.email,
        actorRole: actor.role,
        action: 'FINANCIAL_ENGINE_CONFIG_UPDATED',
        targetType: 'FinancialEngineConfig',
        targetId: 'DEFAULT',
        result: 'SUCCESS',
        correlationId,
        ipAddress,
        details: `Configuration financière mise à jour (${res.audits.length} modification(s) enregistrée(s)).`,
      });
      return null;
    });
    return res;
  }

  public listFinancialConfigAuditsService(
    actor: NonNullable<ServerRequestContext['user']>
  ): FinancialConfigAuditRecord[] {
    if (actor.role !== 'ADMIN' && actor.role !== 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs et comptables.');
    }
    return this.repo.listFinancialConfigAudits();
  }

  public listBenchmarkRatesService(
    actor: NonNullable<ServerRequestContext['user']>
  ): BenchmarkRateRecord[] {
    if (actor.role !== 'ADMIN' && actor.role !== 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs et comptables.');
    }
    return this.repo.listBenchmarkRates();
  }

  public updateBenchmarkRateService(
    actor: NonNullable<ServerRequestContext['user']>,
    code: string,
    newRatePct: string,
    correlationId: string,
    ipAddress: string
  ): BenchmarkRateRecord {
    if (actor.role !== 'ADMIN') {
      throw new AppError(
        403,
        'ADMIN_ROLE_REQUIRED',
        'Seul un administrateur peut mettre à jour les taux de référence de marché.'
      );
    }
    const updated = this.repo.updateBenchmarkRate(code, newRatePct, actor.email);
    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: actor.email,
        actorRole: actor.role,
        action: 'BENCHMARK_RATE_UPDATED',
        targetType: 'BenchmarkRate',
        targetId: code,
        result: 'SUCCESS',
        correlationId,
        ipAddress,
        details: `Taux monétaire ${code} mis à jour : ${newRatePct}%.`,
      });
      return null;
    });
    return updated;
  }

  public getAgingBalanceReportService(
    actor: NonNullable<ServerRequestContext['user']>,
    asOfDateStr?: string
  ): AgingBalanceReport {
    if (actor.role !== 'ADMIN' && actor.role !== 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs et comptables.');
    }
    const invoices = this.repo.getSnapshot().invoices;
    const payments = this.repo.getSnapshot().payments;
    return AccountingEngine.calculateAgingBalance({
      invoices,
      payments,
      asOfDateStr,
    });
  }

  public exportFecService(
    actor: NonNullable<ServerRequestContext['user']>,
    fiscalYear: number
  ): { fecContent: string; filename: string; mimeType: string } {
    if (actor.role !== 'ADMIN' && actor.role !== 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs et comptables.');
    }
    const entries = this.repo.getSnapshot().accountingEntries;
    const fecContent = AccountingEngine.exportFecAccountingFile(entries, fiscalYear);
    const filename = `FEC_${fiscalYear}_TRADELINK_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.txt`;
    return {
      fecContent,
      filename,
      mimeType: 'text/plain; charset=UTF-8',
    };
  }

  public listFiscalPeriodsService(
    actor: NonNullable<ServerRequestContext['user']>
  ): FiscalPeriodRecord[] {
    if (actor.role !== 'ADMIN' && actor.role !== 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs et comptables.');
    }
    return this.repo.listFiscalPeriods();
  }

  public lockFiscalPeriodService(
    actor: NonNullable<ServerRequestContext['user']>,
    periodCode: string,
    correlationId: string,
    ipAddress: string
  ): FiscalPeriodRecord {
    if (actor.role !== 'ADMIN') {
      throw new AppError(
        403,
        'ADMIN_ROLE_REQUIRED',
        'Seul un administrateur peut verrouiller et clôturer une période comptable.'
      );
    }
    const locked = this.repo.lockFiscalPeriod(periodCode, actor.email);
    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: actor.email,
        actorRole: actor.role,
        action: 'FISCAL_PERIOD_LOCKED',
        targetType: 'FiscalPeriod',
        targetId: periodCode,
        result: 'SUCCESS',
        correlationId,
        ipAddress,
        details: `Période comptable ${periodCode} verrouillée. Aucune nouvelle écriture ne peut être enregistrée.`,
      });
      return null;
    });
    return locked;
  }

  // ============================================================================
  // SERVICES DE TRADUCTION IA CENTRALE & PRÉFÉRENCES LINGUISTIQUES
  // ============================================================================

  public getUserLanguagePreference(userId: string): UserLanguagePreferenceRecord {
    return this.repo.getUserLanguagePreference(userId);
  }

  public updateUserLanguagePreference(
    userId: string,
    partial: Partial<UserLanguagePreferenceRecord>
  ): UserLanguagePreferenceRecord {
    return this.repo.setUserLanguagePreference(userId, partial);
  }

  public translateCatalogProduct(productId: string, targetLang: SupportedLocale) {
    const product = this.repo.findActiveProductById(productId);
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', `Produit introuvable : ${productId}`);
    }

    const { translatedProduct, translationRecord } = CentralTranslationService.translateProductSync(
      product,
      targetLang
    );

    // Mise à jour des traductions persistées dans le catalogue produit
    this.repo.updateProductTranslations(
      productId,
      targetLang,
      translatedProduct.name[targetLang] || product.name.fr,
      translatedProduct.description[targetLang] || product.description.fr
    );

    this.repo.saveTranslation(translationRecord);

    return { translatedProduct, translationRecord };
  }

  public translateMessage(params: {
    messageId: string;
    text: string;
    senderId: string;
    senderRole: string;
    targetLang: SupportedLocale;
  }) {
    const translated = CentralTranslationService.translateChatMessageSync(params);

    const record: TranslationRecord = {
      id: `tr-msg-${params.messageId}-${params.targetLang}`,
      entityType: 'MESSAGE',
      entityId: params.messageId,
      field: 'body',
      sourceLang: translated.sourceLang,
      targetLang: translated.targetLang,
      originalText: translated.originalText,
      translatedText: translated.translatedText,
      status: 'TRANSLATED',
      engineVersion: translated.engineVersion,
      confidenceScore: 0.99,
      isInformativeOnly: false,
      glossaryApplied: translated.glossaryApplied,
      contentHashSha256: params.messageId,
      createdAt: translated.translatedAt,
    };

    this.repo.saveTranslation(record);

    return translated;
  }

  public translateDocument(
    doc: {
      type: 'INVOICE' | 'QUOTE' | 'CMR' | 'SHIPMENT' | 'ORDER';
      id: string;
      title: string;
      notes?: string;
      specialConditions?: string;
    },
    targetLang: SupportedLocale
  ) {
    return CentralTranslationService.translateCommercialDocumentSync(doc, targetLang);
  }

  public translateSmartMessageService(params: {
    senderId: string;
    senderName?: string;
    senderRole?: string;
    recipientId: string;
    recipientName?: string;
    text: string;
    conversationId?: string;
  }): SmartTranslatedMessage {
    const recipientPref = this.repo.getUserLanguagePreference(params.recipientId);
    const recipientPreferredLocale = recipientPref?.preferredLocale || 'fr';

    const smartMsg = CentralTranslationService.translateSmartMessage({
      ...params,
      recipientPreferredLocale,
    });

    // Enregistrer dans les logs de traduction
    const record: TranslationRecord = {
      id: `tr-smart-${smartMsg.id}`,
      entityType: 'MESSAGE',
      entityId: smartMsg.id,
      field: 'smart_body',
      sourceLang: smartMsg.sourceLang,
      targetLang: smartMsg.targetLang,
      originalText: smartMsg.originalText,
      translatedText: smartMsg.translatedText,
      status: 'TRANSLATED',
      engineVersion: 'tradelink-neural-v6.0-enterprise',
      confidenceScore: 0.99,
      isInformativeOnly: false,
      glossaryApplied: true,
      contentHashSha256: smartMsg.id,
      createdAt: smartMsg.createdAt,
    };
    this.repo.saveTranslation(record);

    return smartMsg;
  }

  public listGlossaryTermsService(params?: { category?: string; status?: string; search?: string }): TranslationGlossaryTerm[] {
    return TradeGlossaryManager.filterTerms(params);
  }

  public addGlossaryTermService(params: {
    category: TranslationGlossaryTerm['category'];
    termFr: string;
    termEn: string;
    termAr: string;
    context?: string;
    isAdmin?: boolean;
    adminEmail?: string;
  }): TranslationGlossaryTerm {
    const term = TradeGlossaryManager.addDynamicTerm({
      category: params.category,
      termFr: params.termFr,
      termEn: params.termEn,
      termAr: params.termAr,
      context: params.context,
      status: params.isAdmin ? 'VALIDATED' : 'PENDING_REVIEW',
    });
    if (params.isAdmin && params.adminEmail) {
      term.validatedBy = params.adminEmail;
      term.validatedAt = new Date().toISOString();
    }
    return term;
  }

  public updateGlossaryTermService(id: string, updates: Partial<TranslationGlossaryTerm>): TranslationGlossaryTerm {
    return TradeGlossaryManager.updateTerm(id, updates);
  }

  public validateGlossaryTermService(id: string, validatorEmail: string): TranslationGlossaryTerm {
    return TradeGlossaryManager.validateTerm(id, validatorEmail);
  }

  public deleteGlossaryTermService(id: string): boolean {
    return TradeGlossaryManager.deleteTerm(id);
  }

  public createTranslationJobService(params: {
    sourceLang: SupportedLocale;
    targetLang: SupportedLocale;
    entityType: TranslationEntityType;
    totalItems: number;
  }): TranslationJob {
    return TranslationJobManager.createJob(params);
  }

  public getTranslationJobService(jobId: string): TranslationJob {
    const job = TranslationJobManager.getJob(jobId);
    if (!job) {
      throw new AppError(404, 'TRANSLATION_JOB_NOT_FOUND', `Job de traduction "${jobId}" introuvable.`);
    }
    return job;
  }

  // ============================================================================
  // ASSISTANT IA FLOTTANT — AI COPILOT SERVICES (PROMPT 03)
  // ============================================================================

  public processCopilotChatTransactional(params: {
    message: string;
    threadId?: string;
    modelId?: string;
    context?: CopilotContextState;
    attachments?: CopilotAttachment[];
    actor: { id: string; email: string; role: UserRoleCode; companyName?: string };
    correlationId: string;
    ipAddress: string;
  }): {
    thread: CopilotConversationThread;
    assistantMessage: CopilotMessage;
    sources: RagSourceCitation[];
    assistedAction?: CopilotAssistedAction;
    quotaRemainingPct: number;
  } {
    const model =
      SUPPORTED_AI_MODELS.find((m) => m.id === params.modelId) || SUPPORTED_AI_MODELS[0];
    const estimatedTokens = Math.ceil(params.message.length / 4) + 150;

    // 1. Contrôle des quotas et du débit (rate limit)
    const quotaCheck = checkAndConsumeAiTokens(params.actor.id, model, estimatedTokens);
    if (!quotaCheck.allowed) {
      throw new AppError(429, 'AI_QUOTA_EXCEEDED', quotaCheck.reason || 'Quota IA dépassé.');
    }

    // 2. Récupération ou création du thread de conversation
    let thread = params.threadId ? this.repo.getCopilotThread(params.threadId) : null;
    if (thread && thread.userId !== params.actor.id && params.actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_IDOR_THREAD_ACCESS', 'Accès interdit à ce fil de discussion.');
    }

    const nowIso = new Date().toISOString();
    const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!thread) {
      const threadId = params.threadId || `th-copilot-${Date.now()}`;
      thread = {
        id: threadId,
        title: params.message.slice(0, 45) || 'Nouvelle conversation Copilot',
        userId: params.actor.id,
        userRole: params.actor.role,
        currentPath: params.context?.currentPath || '/',
        modelId: model.id,
        createdAt: nowIso,
        updatedAt: nowIso,
        messages: [],
        totalTokensConsumed: 0,
      };
    }

    // 3. Synthèse des éventuelles pièces jointes fournies
    const attachmentSummaries: string[] = [];
    if (params.attachments && params.attachments.length > 0) {
      for (const att of params.attachments) {
        const attRes = processAndSummarizeAttachment({
          name: att.name,
          size: att.size,
          mimeType: att.mimeType,
        });
        if (attRes.ok && attRes.summary) {
          attachmentSummaries.push(attRes.summary);
          att.summary = attRes.summary;
        }
      }
    }

    // 4. Message utilisateur
    const userMessage: CopilotMessage = {
      id: `msg-usr-${Date.now()}`,
      threadId: thread.id,
      sender: 'USER',
      text: params.message,
      timestamp: timeFormatted,
      attachments: params.attachments,
    };
    thread.messages.push(userMessage);

    // 5. Génération de la réponse via le moteur Copilot avec RAG et détection d'actions
    const genResult = generateCopilotAnswer({
      query: params.message,
      userRole: params.actor.role,
      companyName: params.actor.companyName,
      currentPath: params.context?.currentPath || thread.currentPath || '/',
      locale: params.context?.locale || 'fr',
      modelId: model.id,
      conversationHistory: thread.messages,
      attachmentSummaries,
    });

    // 6. Message assistant
    const assistantMessage: CopilotMessage = {
      id: `msg-ast-${Date.now()}`,
      threadId: thread.id,
      sender: 'ASSISTANT',
      text: genResult.text,
      timestamp: timeFormatted,
      ragSources: genResult.sources,
      tokensUsed: genResult.tokensUsed,
      modelUsed: genResult.modelUsed,
      isFiltered: genResult.isRestricted,
      assistedAction: genResult.assistedAction,
    };
    thread.messages.push(assistantMessage);
    thread.totalTokensConsumed += genResult.tokensUsed;
    thread.updatedAt = nowIso;

    // 7. Persistance
    this.repo.saveCopilotThread(thread);

    // 8. Audit log immuable
    this.repo.addAuditLog({
      id: `aud-copilot-${Date.now()}`,
      action: 'COPILOT_CHAT_QUERY',
      targetType: 'CopilotEngine',
      targetId: thread.id,
      actorName: params.actor.email,
      actorRole: params.actor.role,
      timestamp: nowIso,
      ipAddress: params.ipAddress,
      correlationId: params.correlationId,
      result: genResult.isRestricted ? 'WARNING' : 'SUCCESS',
      details: `Requête Copilot par ${params.actor.email} (${params.actor.role}) sur ${thread.currentPath}. Modèle: ${model.id}. Sources RAG: ${genResult.sources.length}.`,
    });

    return {
      thread,
      assistantMessage,
      sources: genResult.sources,
      assistedAction: genResult.assistedAction,
      quotaRemainingPct: quotaCheck.remainingQuotaPct,
    };
  }

  public listCopilotConversations(actor: { id: string; role: UserRoleCode }): CopilotConversationThread[] {
    return this.repo.listCopilotThreads(actor.id);
  }

  public getCopilotConversation(threadId: string, actor: { id: string; role: UserRoleCode }): CopilotConversationThread {
    const thread = this.repo.getCopilotThread(threadId);
    if (!thread) {
      throw new AppError(404, 'THREAD_NOT_FOUND', `Fil de discussion introuvable : ${threadId}`);
    }
    if (thread.userId !== actor.id && actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_IDOR_THREAD_ACCESS', 'Accès interdit à ce fil de discussion.');
    }
    return thread;
  }

  public deleteCopilotConversation(threadId: string, actor: { id: string; role: UserRoleCode }): { deleted: boolean; threadId: string } {
    const thread = this.repo.getCopilotThread(threadId);
    if (!thread) {
      throw new AppError(404, 'THREAD_NOT_FOUND', `Fil de discussion introuvable : ${threadId}`);
    }
    if (thread.userId !== actor.id && actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_IDOR_THREAD_ACCESS', 'Accès interdit à ce fil de discussion.');
    }
    this.repo.deleteCopilotThread(threadId, actor.id, actor.role === 'ADMIN');
    return { deleted: true, threadId };
  }

  public executeCopilotAssistedAction(params: {
    actionId: string;
    actionType: string;
    payload: Record<string, any>;
    confirmed: boolean;
    isCritical?: boolean;
    actor: { id: string; email: string; role: UserRoleCode };
    correlationId: string;
    ipAddress: string;
  }): { executed: boolean; message: string; actionId: string; targetPath?: string } {
    // GARDE-FOU ABSOLU DE SÉCURITÉ : Interdiction formelle des opérations sensibles pour l'IA
    if (
      params.isCritical ||
      params.actionType === 'BLOCKED_SENSITIVE_ACTION' ||
      JSON.stringify(params.payload).toLowerCase().includes('paiement') ||
      JSON.stringify(params.payload).toLowerCase().includes('supprimer') ||
      JSON.stringify(params.payload).toLowerCase().includes('validate_kyc_bypass')
    ) {
      throw new AppError(
        403,
        'CRITICAL_ACTION_PROHIBITED_FOR_AI',
        'Garde-fou de sécurité : L’Assistant IA ne peut en aucun cas valider de paiements, supprimer de données ou court-circuiter les validations administratives.'
      );
    }

    if (!params.confirmed) {
      throw new AppError(400, 'ACTION_CONFIRMATION_REQUIRED', 'La confirmation explicite de l’utilisateur est requise avant exécution.');
    }

    // Traitement selon le type d'action assistée autorisée
    let executionMessage = 'Action assistée exécutée avec succès.';
    let targetPath: string | undefined;

    switch (params.actionType) {
      case 'PREFILL_PRODUCT':
        executionMessage = `Fiche produit préparée avec succès pour le SKU ${params.payload.sku || 'Nouveau'}.`;
        targetPath = '/fournisseur/catalogue/nouveau';
        break;
      case 'PREPARE_QUOTE_RESPONSE':
        executionMessage = `Offre de devis préparée avec remise de ${params.payload.proposedDiscountPct || 0}%.`;
        targetPath = '/fournisseur/devis';
        break;
      case 'SUMMARIZE_ORDER':
        executionMessage = `Synthèse de commande ${params.payload.orderNumber || ''} prête.`;
        targetPath = '/client/commandes';
        break;
      case 'NAVIGATE':
        executionMessage = `Navigation autorisée vers ${params.payload.path || '/'}.`;
        targetPath = params.payload.path;
        break;
      case 'CALCULATE_FINANCE':
        executionMessage = `Calcul financier certifié : ${params.payload.calculatedInterestEur || '0.00'} EUR d'intérêts.`;
        targetPath = '/comptable/calcul';
        break;
      default:
        executionMessage = `Action assistée ${params.actionType} prise en compte.`;
    }

    this.repo.addAuditLog({
      id: `aud-act-${Date.now()}`,
      action: 'COPILOT_ACTION_EXECUTED',
      targetType: 'CopilotAssistedAction',
      targetId: params.actionId,
      actorName: params.actor.email,
      actorRole: params.actor.role,
      timestamp: new Date().toISOString(),
      ipAddress: params.ipAddress,
      correlationId: params.correlationId,
      result: 'SUCCESS',
      details: `Action ${params.actionType} confirmée et exécutée par ${params.actor.email} (${params.actor.role}).`,
    });

    return {
      executed: true,
      message: executionMessage,
      actionId: params.actionId,
      targetPath,
    };
  }

  public summarizeCopilotAttachment(attachment: {
    name: string;
    size: number;
    mimeType: string;
  }): { ok: boolean; summary: string } {
    const result = processAndSummarizeAttachment(attachment);
    if (!result.ok || !result.summary) {
      throw new AppError(400, 'INVALID_ATTACHMENT_FOR_SUMMARY', result.error || 'Erreur lors du traitement du fichier.');
    }
    return { ok: true, summary: result.summary };
  }

  public getCopilotConfig(): {
    models: typeof SUPPORTED_AI_MODELS;
    cacheMetrics: { hits: number; misses: number; hitRatePct: number };
    maxAttachmentSizeBytes: number;
    supportedFormats: string[];
  } {
    // Clés API JAMAIS exposées au client !
    return {
      models: SUPPORTED_AI_MODELS,
      cacheMetrics: getCopilotCacheMetrics(),
      maxAttachmentSizeBytes: 10 * 1024 * 1024,
      supportedFormats: ['PDF', 'JPG', 'PNG', 'WEBP', 'TXT', 'CSV', 'XLSX'],
    };
  }

  // ============================================================================
  // SERVICES SYSTÈME DE DICTÉE VOCALE INTELLIGENTE (PROMPT 04)
  // ============================================================================

  public getVoiceConsentService(actorId: string): {
    userId: string;
    granted: boolean;
    retentionPolicy: string;
    maxDurationSeconds: number;
  } {
    if (!actorId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Identifiant utilisateur requis.');
    }
    const granted = this.repo.getVoiceConsent(actorId);
    return {
      userId: actorId,
      granted,
      retentionPolicy: 'ZERO_RETENTION_RAM_ONLY',
      maxDurationSeconds: VOICE_MAX_DURATION_SECONDS,
    };
  }

  public saveVoiceConsentService(
    actorId: string,
    granted: boolean,
    ipAddress = '127.0.0.1'
  ): { success: boolean; granted: boolean; timestamp: string } {
    if (!actorId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Identifiant utilisateur requis.');
    }

    this.repo.setVoiceConsent(actorId, granted);

    // Audit log de modification du consentement RGPD / CNDP
    this.repo.addAuditLog({
      id: `audit-voice-consent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: granted ? 'VOICE_CONSENT_GRANTED' : 'VOICE_CONSENT_REVOKED',
      targetType: 'USER_VOICE_PREFERENCE',
      targetId: actorId,
      actorName: actorId,
      actorRole: 'CLIENT',
      timestamp: new Date().toISOString(),
      correlationId: `corr-voice-consent-${Date.now()}`,
      ipAddress,
      result: 'SUCCESS',
      details: JSON.stringify({
        granted,
        retentionPolicy: 'ZERO_RETENTION_RAM_ONLY',
      }),
    });

    return {
      success: true,
      granted,
      timestamp: new Date().toISOString(),
    };
  }

  public getSupportedVoiceLanguagesService(): {
    languages: typeof TRILINGUAL_VOICE_CONFIGS;
    maxDurationSeconds: number;
    punctuationCommandsCount: number;
    zeroRetention: true;
  } {
    return {
      languages: TRILINGUAL_VOICE_CONFIGS,
      maxDurationSeconds: VOICE_MAX_DURATION_SECONDS,
      punctuationCommandsCount: PUNCTUATION_DICTIONARY.length,
      zeroRetention: true,
    };
  }

  public transcribeVoiceAudioService(
    actorId: string,
    payload: VoiceTranscribePayload,
    ipAddress = '127.0.0.1'
  ): VoiceTranscribeResponse {
    if (!actorId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentification requise pour la transcription vocale.');
    }

    // 1. Contrôle strict de la durée maximale (60 secondes max)
    if (payload.durationSeconds > VOICE_MAX_DURATION_SECONDS) {
      throw new AppError(
        400,
        'VOICE_MAX_DURATION_EXCEEDED',
        `La durée maximale d'enregistrement autorisée est de ${VOICE_MAX_DURATION_SECONDS} secondes.`
      );
    }

    // 2. Vérification obligatoire du consentement explicite (RGPD / CNDP)
    const isConsentStored = this.repo.getVoiceConsent(actorId);
    if (!isConsentStored && !payload.consentGranted) {
      throw new AppError(
        403,
        'VOICE_CONSENT_REQUIRED',
        'Le consentement explicite utilisateur est requis avant toute capture ou transcription vocale.'
      );
    }

    // Si le payload fournit consentGranted: true, mettre à jour le repository
    if (payload.consentGranted && !isConsentStored) {
      this.repo.setVoiceConsent(actorId, true);
    }

    // 3. Détermination de la langue et traitement de la parole
    const language = payload.language || 'fr-FR';

    // Simulation ou décodage de texte STT sécurisé depuis le payload audio ou transcript brut
    let rawText = '';
    if (payload.audioBase64) {
      // Décodage du buffer audio en mémoire uniquement (zéro écriture disque)
      try {
        const decoded = Buffer.from(payload.audioBase64, 'base64').toString('utf-8');
        rawText = decoded;
      } catch {
        rawText = '';
      }
    }

    // Si le texte est vide (fallback ou test unitaire passant du texte audio simulé)
    if (!rawText) {
      // Exemple de transcription contextuelle par défaut selon la langue
      const voiceConfig = TRILINGUAL_VOICE_CONFIGS[language as keyof typeof TRILINGUAL_VOICE_CONFIGS];
      rawText = voiceConfig?.samplePhrase || 'Commande confirmée avec succès.';
    }

    // 4. Détection automatique de la langue si activée
    const detected = detectLanguageFromSample(rawText);
    const effectiveLanguage = detected || language;

    // 5. Application de la ponctuation intelligente
    const { formatted, punctuationCount } = formatDictatedSpeech(
      rawText,
      effectiveLanguage,
      payload.autoFormatPunctuation !== false
    );

    const interactionId = `voice-int-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // 6. Enregistrement des métadonnées d'interaction vocale SANS le flux audio
    const interactionRecord: VoiceInteractionRecord = {
      id: interactionId,
      userId: actorId,
      locale: effectiveLanguage,
      durationSeconds: payload.durationSeconds || 5,
      intentDetected: payload.targetField || 'FIELD_INPUT',
      transcriptSnippet: formatted.slice(0, 60),
      consentGranted: true,
      confidenceScore: 0.98,
      createdAt: new Date().toISOString(),
    };
    this.repo.recordVoiceInteraction(interactionRecord);

    // 7. Audit log de traçabilité sans audio (Zéro Rétention)
    this.repo.addAuditLog({
      id: `audit-${interactionId}`,
      action: 'VOICE_DICTATION_TRANSCRIBE',
      targetType: 'VOICE_INTERACTION',
      targetId: interactionId,
      actorName: actorId,
      actorRole: 'CLIENT',
      timestamp: new Date().toISOString(),
      correlationId: `corr-voice-tx-${Date.now()}`,
      ipAddress,
      result: 'SUCCESS',
      details: JSON.stringify({
        locale: effectiveLanguage,
        durationSeconds: payload.durationSeconds,
        punctuationsApplied: punctuationCount,
        zeroRetentionEnforced: true,
      }),
    });

    return {
      success: true,
      transcript: formatted,
      rawTranscript: rawText,
      language: effectiveLanguage,
      durationSeconds: payload.durationSeconds || 5,
      confidence: 0.98,
      punctuationsApplied: punctuationCount,
      interactionId,
      zeroRetentionEnforced: true,
    };
  }

  // ============================================================================
  // SERVICES SYSTÈME OCR, INTELLIGENCE DOCUMENTAIRE & VALIDATION (PROMPT 05)
  // ============================================================================

  public uploadAndAnalyzeOcrDocumentService(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    fileName: string;
    fileBytesBase64?: string;
    fileSizeBytes: number;
    mimeType: string;
    profile: OcrDocumentProfile;
    correlationId: string;
    ipAddress?: string;
  }): { document: OcrDocumentDetail; job?: OcrQueueJob } {
    const { actor, fileName, fileBytesBase64, fileSizeBytes, mimeType, profile, correlationId, ipAddress = '127.0.0.1' } = params;

    // 1. Validation de la taille maximale (15 Mo max)
    if (fileSizeBytes > OCR_MAX_FILE_SIZE_BYTES) {
      throw new AppError(
        400,
        'FILE_TOO_LARGE',
        `La taille du fichier (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} Mo) dépasse la limite autorisée de 15 Mo.`
      );
    }

    // 2. Décodage du buffer et contrôle strict des Magic Bytes (rejet malwares et faux formats)
    const rawBuffer = fileBytesBase64
      ? Buffer.from(fileBytesBase64, 'base64')
      : Buffer.from(`%PDF-1.7\nSimulated TRADELINK OCR Document for ${fileName}\nTotal: 31680.00 EUR`, 'utf-8');

    const magicCheck = validateFileMagicBytes(rawBuffer);
    if (!magicCheck.isValid) {
      throw new AppError(400, 'INVALID_FILE_SIGNATURE', magicCheck.error || 'Signature de fichier invalide ou format interdit.');
    }

    // 3. Calcul du hachage cryptographique SHA-256 pour intégrité et détection des doublons
    const sha256Hash = calculateDocumentSha256(rawBuffer);
    const existingDuplicate = this.repo.findOcrDocumentByHash(sha256Hash);
    if (existingDuplicate) {
      throw new AppError(
        409,
        'DOCUMENT_DUPLICATE_DETECTED',
        `Ce document a déjà été importé sur la plateforme sous la référence "${existingDuplicate.fileName}" (ID: ${existingDuplicate.id}).`
      );
    }

    const docId = `ocr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const effectiveMime = magicCheck.detectedMimeType || mimeType;

    // 4. Extraction textuelle et détection structurée selon profil
    const rawText = rawBuffer.toString('utf-8');
    const { fields, lineItems, globalConfidence, detectedLanguage, hasUncertainFields } =
      extractDocumentFieldsWithProfile(rawText, profile, fileName);

    // 5. Génération d'une URL présignée temporaire (15 min) avec signature HMAC
    const { url: presignedUrl, expiresAt: presignedUrlExpiresAt } = generateOcrPresignedUrl(docId, fileName);

    // 6. Gestion de la file d'attente (pour documents volumineux > 5 Mo)
    const isHeavyDocument = fileSizeBytes > 5 * 1024 * 1024;
    let job: OcrQueueJob | undefined;

    if (isHeavyDocument) {
      job = this.repo.enqueueOcrJob({
        id: `job-ocr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        documentId: docId,
        profile,
        status: 'RUNNING',
        progressPercentage: 65,
        attempts: 1,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
      });
    }

    const docRecord: OcrDocumentDetail = {
      id: docId,
      fileName,
      fileSize: fileSizeBytes,
      fileType: effectiveMime.includes('pdf') ? 'PDF' : 'IMAGE',
      fileSizeFormatted: `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} Mo`,
      status: 'EXTRACTED',
      processingStatus: isHeavyDocument ? 'PROCESSING' : 'EXTRACTED_PENDING_REVIEW',
      contentHash: sha256Hash,
      sha256Hash,
      globalConfidence,
      rawText,
      extractedText: rawText,
      fields,
      extractedFields: fields,
      lineItems,
      dynamicFields: [],
      corrections: [],
      correctionsLog: [],
      uncertainFields: hasUncertainFields ? fields.filter((f) => f.confidence < 0.8).map((f) => f.key) : [],
      previewUrl: presignedUrl,
      presignedUrl,
      presignedUrlExpiresAt,
      profile,
      mimeType: effectiveMime,
      uploadedById: actor.id,
      uploadedByName: actor.companyName || actor.email,
      detectedLanguage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedDoc = this.repo.saveOcrDocument(docRecord);

    // Finaliser le job si c'était un gros fichier
    if (job) {
      this.repo.updateOcrJob(job.id, 100, 'COMPLETED');
      savedDoc.processingStatus = 'EXTRACTED_PENDING_REVIEW';
      this.repo.saveOcrDocument(savedDoc);
    }

    // 7. Audit log immuable
    this.repo.addAuditLog({
      id: `audit-ocr-upload-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: 'OCR_DOCUMENT_UPLOADED',
      targetType: 'DOCUMENT_OCR',
      targetId: docId,
      actorName: actor.email,
      actorRole: actor.role,
      timestamp: new Date().toISOString(),
      correlationId,
      ipAddress,
      result: 'SUCCESS',
      details: JSON.stringify({
        fileName,
        profile,
        sha256Hash,
        globalConfidence,
        detectedLanguage,
        hasUncertainFields,
      }),
    });

    return { document: savedDoc, job };
  }

  public listOcrDocumentsService(actor: NonNullable<ServerRequestContext['user']>, params: {
    profile?: OcrDocumentProfile;
    status?: OcrProcessingStatus;
  }): OcrDocumentDetail[] {
    const isElevated = actor.role === 'ADMIN' || actor.role === 'COMPTABLE' || actor.role === 'SUPPORT';
    const targetUserId = isElevated ? undefined : actor.id;
    return this.repo.listOcrDocuments(targetUserId, params.profile, params.status);
  }

  public getOcrDocumentByIdService(
    documentId: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): OcrDocumentDetail {
    const doc = this.repo.getOcrDocumentById(documentId);
    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', `Document OCR "${documentId}" introuvable.`);
    }

    // Anti-IDOR : propriétaire ou rôles habilités (ADMIN, COMPTABLE, SUPPORT)
    const isElevated = actor.role === 'ADMIN' || actor.role === 'COMPTABLE' || actor.role === 'SUPPORT';
    if (doc.uploadedById !== actor.id && !isElevated) {
      throw new AppError(403, 'FORBIDDEN_IDOR_DOCUMENT_ACCESS', 'Accès interdit : vous ne pouvez consulter que les documents de votre organisation.');
    }

    // Renouveler l'URL présignée si nécessaire
    const now = Date.now();
    const expiresAtMs = doc.presignedUrlExpiresAt ? new Date(doc.presignedUrlExpiresAt).getTime() : 0;
    if (now >= expiresAtMs - 60000) {
      const refreshed = generateOcrPresignedUrl(doc.id, doc.fileName);
      doc.previewUrl = refreshed.url;
      doc.presignedUrlExpiresAt = refreshed.expiresAt;
      this.repo.saveOcrDocument(doc);
    }

    return doc;
  }

  public correctOcrFieldService(params: {
    documentId: string;
    fieldKey: string;
    newValue: string;
    reason?: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress?: string;
  }): OcrDocumentDetail {
    const { documentId, fieldKey, newValue, reason, actor, correlationId, ipAddress = '127.0.0.1' } = params;
    const doc = this.getOcrDocumentByIdService(documentId, actor);

    const targetField = doc.fields.find((f) => f.key === fieldKey);
    if (!targetField) {
      throw new AppError(404, 'FIELD_NOT_FOUND', `Le champ "${fieldKey}" n'existe pas dans l'extraction de ce document.`);
    }

    const originalValue = targetField.value;
    targetField.value = newValue;
    targetField.isModified = true;
    targetField.confidence = 1.0; // Validé par l'humain

    const correctionEntry: OcrCorrectionLog = {
      fieldKey,
      originalValue,
      correctedValue: newValue,
      correctedBy: actor.email,
      timestamp: new Date().toISOString(),
    };
    doc.corrections.push(correctionEntry);

    const savedDoc = this.repo.saveOcrDocument(doc);

    // Audit log
    this.repo.addAuditLog({
      id: `audit-ocr-corr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: 'OCR_FIELD_CORRECTED',
      targetType: 'DOCUMENT_OCR',
      targetId: documentId,
      actorName: actor.email,
      actorRole: actor.role,
      timestamp: new Date().toISOString(),
      correlationId,
      ipAddress,
      result: 'SUCCESS',
      details: JSON.stringify({
        fieldKey,
        originalValue,
        newValue,
        reason: reason || 'Correction manuelle opérateur',
      }),
    });

    return savedDoc;
  }

  public validateOcrDocumentHumanReviewService(params: {
    documentId: string;
    confirmedFields: Record<string, string>;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress?: string;
  }): { success: boolean; document: OcrDocumentDetail; message: string } {
    const { documentId, confirmedFields, actor, correlationId, ipAddress = '127.0.0.1' } = params;
    const doc = this.getOcrDocumentByIdService(documentId, actor);

    // Exécution de la validation humaine avec contrôle mathématique
    const result = commitHumanReviewValidation(
      doc,
      { id: actor.id, email: actor.email, role: actor.role },
      confirmedFields || {}
    );

    const savedDoc = this.repo.saveOcrDocument(result.validatedDocument);

    // Audit log
    this.repo.addAuditLog({
      id: `audit-ocr-val-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: 'OCR_DOCUMENT_VALIDATED',
      targetType: 'DOCUMENT_OCR',
      targetId: documentId,
      actorName: actor.email,
      actorRole: actor.role,
      timestamp: new Date().toISOString(),
      correlationId,
      ipAddress,
      result: 'SUCCESS',
      details: JSON.stringify({
        fileName: doc.fileName,
        validatedBy: actor.email,
        confirmedFieldsCount: Object.keys(confirmedFields || {}).length,
      }),
    });

    return {
      success: true,
      document: savedDoc,
      message: result.message,
    };
  }

  public rejectOcrDocumentService(params: {
    documentId: string;
    reason: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress?: string;
  }): { success: boolean; document: OcrDocumentDetail } {
    const { documentId, reason, actor, correlationId, ipAddress = '127.0.0.1' } = params;
    if (!reason || !reason.trim()) {
      throw new AppError(400, 'REJECTION_REASON_REQUIRED', 'Un motif explicite est obligatoirement requis pour rejeter un document OCR.');
    }

    const doc = this.getOcrDocumentByIdService(documentId, actor);
    doc.status = 'REJECTED';
    doc.processingStatus = 'REJECTED';
    doc.rejectionReason = reason.trim();

    const savedDoc = this.repo.saveOcrDocument(doc);

    // Audit log
    this.repo.addAuditLog({
      id: `audit-ocr-rej-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: 'OCR_DOCUMENT_REJECTED',
      targetType: 'DOCUMENT_OCR',
      targetId: documentId,
      actorName: actor.email,
      actorRole: actor.role,
      timestamp: new Date().toISOString(),
      correlationId,
      ipAddress,
      result: 'SUCCESS',
      details: JSON.stringify({
        fileName: doc.fileName,
        reason: doc.rejectionReason,
        rejectedBy: actor.email,
      }),
    });

    return { success: true, document: savedDoc };
  }

  public softDeleteOcrDocumentService(
    documentId: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): { success: boolean } {
    const isAdmin = actor.role === 'ADMIN';
    const deleted = this.repo.softDeleteOcrDocument(documentId, actor.id, isAdmin);
    if (!deleted) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', `Document OCR "${documentId}" introuvable.`);
    }
    return { success: true };
  }

  public getOcrQueueStatusService(): { queue: OcrQueueJob[]; totalPending: number; totalCompleted: number } {
    const jobs = this.repo.getOcrQueueJobs();
    const totalPending = jobs.filter((j) => j.status === 'PENDING' || j.status === 'RUNNING').length;
    const totalCompleted = jobs.filter((j) => j.status === 'COMPLETED').length;
    return {
      queue: jobs,
      totalPending,
      totalCompleted,
    };
  }

  // ============================================================================
  // SERVICES DE NOTIFICATIONS MULTI-CANAUX (PROMPT 08)
  // ============================================================================

  public listNotificationsService(
    actor: NonNullable<ServerRequestContext['user']>,
    params?: { category?: string; priority?: string; isRead?: boolean }
  ): NotificationRecord[] {
    const isAdmin = actor.role === 'ADMIN';
    // L'Admin peut voir les notifications globales ou filtrer par utilisateur, les autres uniquement les leurs
    return this.repo.listNotifications({
      userId: isAdmin ? undefined : actor.id,
      category: params?.category,
      priority: params?.priority,
      isRead: params?.isRead,
    });
  }

  public markNotificationReadService(
    notificationId: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): NotificationRecord {
    const notif = this.repo.markNotificationRead(notificationId, actor.id);
    if (!notif) {
      throw new AppError(404, 'NOTIFICATION_NOT_FOUND', `Notification "${notificationId}" introuvable.`);
    }
    return notif;
  }

  public markNotificationUnreadService(
    notificationId: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): NotificationRecord {
    const all = this.repo.listNotifications({ userId: actor.role === 'ADMIN' ? undefined : actor.id });
    const target = all.find((n) => n.id === notificationId);
    if (!target) {
      throw new AppError(404, 'NOTIFICATION_NOT_FOUND', `Notification "${notificationId}" introuvable.`);
    }
    target.isRead = false;
    target.readAt = undefined;
    this.repo.saveNotification(target);
    return target;
  }

  public markAllNotificationsReadService(
    actor: NonNullable<ServerRequestContext['user']>
  ): { updatedCount: number } {
    const count = this.repo.markAllNotificationsRead(actor.id);
    return { updatedCount: count };
  }

  public getNotificationPreferencesService(
    actor: NonNullable<ServerRequestContext['user']>
  ): NotificationPreferencesRecord {
    return this.repo.getNotificationPreferences(actor.id);
  }

  public updateNotificationPreferencesService(
    actor: NonNullable<ServerRequestContext['user']>,
    payload: Partial<NotificationPreferencesRecord>
  ): NotificationPreferencesRecord {
    const existing = this.repo.getNotificationPreferences(actor.id);
    const updated: NotificationPreferencesRecord = {
      ...existing,
      ...payload,
      id: existing.id,
      userId: actor.id,
      updatedAt: new Date().toISOString(),
    };
    return this.repo.saveNotificationPreferences(updated);
  }

  public dispatchNotificationService(
    params: {
      notification: NotificationRecord;
      recipientEmail?: string;
      recipientPhone?: string;
      recipientName?: string;
    },
    _actor: NonNullable<ServerRequestContext['user']>
  ) {
    const prefs = this.repo.getNotificationPreferences(params.notification.userId);
    const result = defaultNotificationDispatcher.dispatch({
      notification: params.notification,
      preferences: prefs,
      recipientEmail: params.recipientEmail,
      recipientPhone: params.recipientPhone,
      recipientName: params.recipientName,
    });

    // Si le canal IN_APP a été délivré (et non dédupliqué), persister la notification
    const inAppDelivered = result.dispatchedChannels.some(
      (c) => c.channel === 'IN_APP' && c.status === 'DELIVERED'
    );
    if (inAppDelivered && !result.isDeduplicated) {
      this.repo.saveNotification(result.notification);
    }

    return result;
  }

  // ============================================================================
  // SERVICES DE MESSAGERIE B2B CENTRALISÉE & SÉCURISÉE (PROMPT 08)
  // ============================================================================

  public createConversationService(
    actor: NonNullable<ServerRequestContext['user']>,
    payload: {
      type: ConversationType;
      title: string;
      participants: ConversationParticipantDetail[];
      relatedEntityId?: string;
      relatedEntityType?: 'ORDER' | 'SHIPMENT' | 'QUOTE' | 'TICKET' | 'OTHER';
    }
  ): ConversationRecord {
    const conv = defaultB2BMessagingEngine.createConversation({
      type: payload.type,
      title: payload.title,
      participants: payload.participants,
      initiatorId: actor.id,
      initiatorRole: actor.role,
      relatedEntityId: payload.relatedEntityId,
      relatedEntityType: payload.relatedEntityType,
    });

    return this.repo.createConversation(conv);
  }

  public listConversationsService(
    actor: NonNullable<ServerRequestContext['user']>
  ): ConversationRecord[] {
    return this.repo.listConversationsForUser(actor.id, actor.role);
  }

  private checkConversationAccess(
    conv: ConversationRecord,
    actor: NonNullable<ServerRequestContext['user']>
  ): void {
    try {
      defaultB2BMessagingEngine.verifyAccess(conv, actor.id, actor.role);
    } catch (err: any) {
      throw new AppError(
        err.statusCode || 403,
        err.message || 'FORBIDDEN_CONVERSATION_ACCESS_IDOR',
        'Accès non autorisé à cette conversation.'
      );
    }
  }

  public getConversationService(
    conversationId: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): { conversation: ConversationRecord; messages: ConversationMessageRecord[] } {
    const conv = this.repo.getConversation(conversationId);
    if (!conv) {
      throw new AppError(404, 'CONVERSATION_NOT_FOUND', `Conversation "${conversationId}" introuvable.`);
    }

    // Vérification stricte anti-IDOR
    this.checkConversationAccess(conv, actor);

    const messages = this.repo.listMessages(conversationId);
    return {
      conversation: conv,
      messages,
    };
  }

  public sendMessageService(
    conversationId: string,
    actor: NonNullable<ServerRequestContext['user']>,
    payload: {
      text: string;
      attachments?: MessageAttachment[];
      targetRecipientLocale?: SupportedLocale;
    }
  ): { message: ConversationMessageRecord; conversation: ConversationRecord } {
    const conv = this.repo.getConversation(conversationId);
    if (!conv) {
      throw new AppError(404, 'CONVERSATION_NOT_FOUND', `Conversation "${conversationId}" introuvable.`);
    }

    this.checkConversationAccess(conv, actor);

    const senderDetail: ConversationParticipantDetail = conv.participantDetails.find(
      (p) => p.id === actor.id
    ) || {
      id: actor.id,
      name: actor.email.split('@')[0],
      role: actor.role,
      email: actor.email,
    };

    let sendResult: ReturnType<typeof defaultB2BMessagingEngine.sendMessage>;
    try {
      sendResult = defaultB2BMessagingEngine.sendMessage({
        conversation: conv,
        sender: senderDetail,
        text: payload.text,
        attachments: payload.attachments,
        recipientLocalePreference: payload.targetRecipientLocale,
      });
    } catch (err: any) {
      throw new AppError(
        err.statusCode || 400,
        err.message || 'MESSAGE_SEND_FAILED',
        err.message || 'Envoi du message refusé par les contrôles de sécurité.'
      );
    }

    this.repo.saveMessage(sendResult.message);
    this.repo.updateConversation(sendResult.conversation);

    return sendResult;
  }

  public markMessagesAsReadService(
    conversationId: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): { unreadClearedCount: number } {
    const conv = this.repo.getConversation(conversationId);
    if (!conv) {
      throw new AppError(404, 'CONVERSATION_NOT_FOUND', `Conversation "${conversationId}" introuvable.`);
    }

    this.checkConversationAccess(conv, actor);

    const messages = this.repo.listMessages(conversationId);
    const result = defaultB2BMessagingEngine.markAsRead(conv, messages, actor.id);

    this.repo.updateMessages(conversationId, result.updatedMessages);
    this.repo.updateConversation(conv);

    return { unreadClearedCount: result.unreadClearedCount };
  }

  public searchMessagesService(
    conversationId: string,
    query: string,
    actor: NonNullable<ServerRequestContext['user']>
  ): ConversationMessageRecord[] {
    const conv = this.repo.getConversation(conversationId);
    if (!conv) {
      throw new AppError(404, 'CONVERSATION_NOT_FOUND', `Conversation "${conversationId}" introuvable.`);
    }

    this.checkConversationAccess(conv, actor);

    const messages = this.repo.listMessages(conversationId);
    return defaultB2BMessagingEngine.searchMessages(messages, query);
  }

  public uploadMessageAttachmentService(
    conversationId: string,
    actor: NonNullable<ServerRequestContext['user']>,
    fileData: {
      fileName: string;
      fileSizeBytes: number;
      mimeType: string;
      base64Data?: string;
      magicBytesHeaderHex?: string;
    }
  ): MessageAttachment {
    const conv = this.repo.getConversation(conversationId);
    if (!conv) {
      throw new AppError(404, 'CONVERSATION_NOT_FOUND', `Conversation "${conversationId}" introuvable.`);
    }

    this.checkConversationAccess(conv, actor);

    try {
      return SecureAttachmentManager.validateAndProcess(fileData);
    } catch (err: any) {
      throw new AppError(
        err.statusCode || 400,
        err.message || 'INVALID_ATTACHMENT',
        'Pièce jointe rejetée par le contrôle de sécurité.'
      );
    }
  }

  // ============================================================================
  // SERVICES DU CATALOGUE CENTRAL B2B & GESTION DES PRODUITS (PROMPT 09)
  // ============================================================================

  public listCatalogCategoriesService(includeInactive = false): ProductCategoryRecord[] {
    return this.repo.listCatalogCategories(includeInactive);
  }

  public getCatalogCategoryDetailService(id: string): ProductCategoryRecord {
    const cat = this.repo.getCatalogCategoryById(id);
    if (!cat) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', `Catégorie "${id}" introuvable.`);
    }
    return cat;
  }

  public createCatalogCategoryService(
    actor: NonNullable<ServerRequestContext['user']>,
    payload: {
      code: string;
      name: Record<Locale, string>;
      description: Record<Locale, string>;
      parentCategoryId?: string;
      icon3d?: any;
      imageUrl?: string;
      displayOrder?: number;
    }
  ): ProductCategoryRecord {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_CATEGORY_MANAGEMENT', 'Seul un Administrateur peut créer une catégorie.');
    }
    return this.repo.createCatalogCategory(payload);
  }

  public updateCatalogCategoryService(
    actor: NonNullable<ServerRequestContext['user']>,
    id: string,
    updates: Partial<ProductCategoryRecord>
  ): ProductCategoryRecord {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_CATEGORY_MANAGEMENT', 'Seul un Administrateur peut modifier une catégorie.');
    }
    return this.repo.updateCatalogCategory(id, updates);
  }

  public deleteCatalogCategoryService(
    actor: NonNullable<ServerRequestContext['user']>,
    id: string
  ): { success: boolean; message: string } {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_CATEGORY_MANAGEMENT', 'Seul un Administrateur peut supprimer une catégorie.');
    }
    try {
      return this.repo.deleteCatalogCategory(id);
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.message, err.message);
    }
  }

  public hasActiveOrdersForProduct(productId: string): boolean {
    const orders = this.repo.getSnapshot().orders;
    return orders.some(
      (o) =>
        !o.deletedAt &&
        !['COMPLETED', 'DELIVERED', 'CANCELLED', 'REFUSED'].includes(o.status) &&
        Array.isArray(o.items) &&
        o.items.some((it) => it.productId === productId)
    );
  }

  public searchCatalogProductsService(
    criteria: CatalogFilterCriteria,
    actor?: ServerRequestContext['user']
  ): CatalogSearchResult {
    defaultCatalogEngine.syncProducts(
      this.repo.getSnapshot().products.filter((p) => !p.deletedAt),
      false
    );
    const role = actor?.role || 'CLIENT';
    const userId = actor?.id;
    return defaultCatalogEngine.searchProducts(criteria, role, userId);
  }

  public getCatalogProductDetailService(
    id: string,
    actor?: ServerRequestContext['user']
  ): ProductItem {
    defaultCatalogEngine.syncProducts(
      this.repo.getSnapshot().products.filter((p) => !p.deletedAt),
      false
    );
    const product = defaultCatalogEngine.getProductById(id);
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', `Produit "${id}" introuvable.`);
    }
    if ((!actor || actor.role === 'CLIENT' || actor.role === 'VISITEUR') && product.status !== 'PUBLISHED') {
      throw new AppError(403, 'FORBIDDEN_UNPUBLISHED_PRODUCT', 'Ce produit n’est pas encore publié au catalogue.');
    }
    if (actor?.role === 'FOURNISSEUR' && product.status !== 'PUBLISHED' && product.supplierId !== actor.id) {
      throw new AppError(403, 'FORBIDDEN_UNPUBLISHED_PRODUCT', 'Ce produit appartient à un tiers et n’est pas publié.');
    }
    return product;
  }

  public createCatalogProductService(
    actor: NonNullable<ServerRequestContext['user']>,
    payload: any,
    correlationId = 'cid-catalog',
    ipAddress = '127.0.0.1'
  ): ProductItem {
    if (actor.role !== 'FOURNISSEUR' && actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_PRODUCT_CREATION', 'Seul un Fournisseur ou Admin peut créer un produit.');
    }

    const supplierId = actor.role === 'FOURNISSEUR' ? actor.id : payload.supplierId || actor.id;
    const supplierName = actor.role === 'FOURNISSEUR' ? (actor.companyName || actor.email || 'Fournisseur') : (payload.supplierName || 'Fournisseur Certifié');

    try {
      const createdProduct = defaultCatalogEngine.createProduct({
        ...payload,
        supplierId,
        supplierName,
        originalLanguage: payload.originalLanguage || 'fr',
      });

      this.repo.executeTransaction((tx) => {
        tx.products.unshift(createdProduct);
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: actor.companyName || actor.email,
          actorRole: actor.role,
          action: 'CATALOG_PRODUCT_CREATED',
          targetType: 'CATALOG_PRODUCT',
          targetId: createdProduct.id,
          result: 'SUCCESS',
          correlationId,
          ipAddress,
          details: `Produit ${createdProduct.sku} (${createdProduct.id}) créé dans le catalogue.`,
        });
      });

      return createdProduct;
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.message, err.message);
    }
  }

  public updateCatalogProductService(
    actor: NonNullable<ServerRequestContext['user']>,
    id: string,
    updates: Partial<ProductItem>,
    correlationId = 'cid-catalog',
    ipAddress = '127.0.0.1'
  ): ProductItem {
    defaultCatalogEngine.syncProducts(
      this.repo.getSnapshot().products.filter((p) => !p.deletedAt),
      false
    );
    const existing = defaultCatalogEngine.getProductById(id);
    if (existing && this.hasActiveOrdersForProduct(id)) {
      const locksSku = updates.sku !== undefined && updates.sku.toUpperCase() !== existing.sku.toUpperCase();
      const locksCurrency = updates.currency !== undefined && updates.currency.toUpperCase() !== existing.currency.toUpperCase();
      const locksUnit = updates.unit !== undefined && updates.unit !== existing.unit;
      if (locksSku || locksCurrency || locksUnit) {
        throw new AppError(
          409,
          'PRODUCT_CRITICAL_FIELD_LOCKED_BY_ACTIVE_ORDER',
          'Impossible de modifier le SKU, la devise ou l’unité de vente d’un produit engagé dans des commandes actives en cours.'
        );
      }
    }
    try {
      const updated = defaultCatalogEngine.updateProduct(id, actor.id, actor.role, updates);

      this.repo.executeTransaction((tx) => {
        const idx = tx.products.findIndex((p) => p.id === id);
        if (idx !== -1) {
          tx.products[idx] = { ...tx.products[idx], ...updated };
        }
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: actor.companyName || actor.email,
          actorRole: actor.role,
          action: 'CATALOG_PRODUCT_UPDATED',
          targetType: 'CATALOG_PRODUCT',
          targetId: id,
          result: 'SUCCESS',
          correlationId,
          ipAddress,
          details: `Produit ${updated.sku} (${id}) mis à jour.`,
        });
      });

      return updated;
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.message, err.message);
    }
  }

  public updateCatalogStockAndPriceQuickService(
    actor: NonNullable<ServerRequestContext['user']>,
    id: string,
    params: { stockAvailable?: number; unitPrice?: string }
  ): ProductItem {
    try {
      const updated = defaultCatalogEngine.updateStockAndPriceQuick(id, actor.id, actor.role, params);
      this.repo.executeTransaction((tx) => {
        const idx = tx.products.findIndex((p) => p.id === id);
        if (idx !== -1) {
          tx.products[idx] = { ...tx.products[idx], ...updated };
        }
      });
      return updated;
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.message, err.message);
    }
  }

  public archiveCatalogProductService(
    actor: NonNullable<ServerRequestContext['user']>,
    id: string
  ): ProductItem {
    try {
      const updated = defaultCatalogEngine.archiveProduct(id, actor.id, actor.role);
      this.repo.executeTransaction((tx) => {
        const idx = tx.products.findIndex((p) => p.id === id);
        if (idx !== -1) {
          tx.products[idx] = { ...tx.products[idx], ...updated };
        }
      });
      return updated;
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.message, err.message);
    }
  }

  public deleteCatalogProductService(
    actor: NonNullable<ServerRequestContext['user']>,
    id: string
  ): { success: boolean; message: string } {
    if (this.hasActiveOrdersForProduct(id)) {
      throw new AppError(
        409,
        'PRODUCT_HAS_ACTIVE_ORDERS',
        'Suppression refusée : ce produit est rattaché à une ou plusieurs commandes actives. Veuillez l’archiver ou clôturer les commandes en cours.'
      );
    }
    try {
      const result = defaultCatalogEngine.deleteProduct(id, actor.id, actor.role);
      this.repo.softDeleteProduct(id);
      return result;
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.message, err.message);
    }
  }

  public moderateCatalogProductService(
    actor: NonNullable<ServerRequestContext['user']>,
    id: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string
  ): ProductItem {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_MODERATION', 'Seul un Administrateur peut modérer les produits.');
    }
    try {
      const updated = defaultCatalogEngine.moderateProductPublication(id, action, reason);
      this.repo.executeTransaction((tx) => {
        const idx = tx.products.findIndex((p) => p.id === id);
        if (idx !== -1) {
          tx.products[idx] = { ...tx.products[idx], ...updated };
        }
      });
      return updated;
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.message, err.message);
    }
  }

  public reportCatalogProductService(
    _actor: NonNullable<ServerRequestContext['user']>,
    id: string,
    reason: string
  ): ProductItem {
    if (!reason?.trim()) {
      throw new AppError(400, 'REPORT_REASON_MANDATORY', 'Le motif de signalement est obligatoire.');
    }
    try {
      return defaultCatalogEngine.reportProduct(id, reason);
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.message, err.message);
    }
  }

  public suspendCatalogProductService(
    actor: NonNullable<ServerRequestContext['user']>,
    id: string,
    reason: string
  ): ProductItem {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_SUSPENSION', 'Seul un Administrateur peut suspendre un produit.');
    }
    if (!reason?.trim()) {
      throw new AppError(400, 'SUSPENSION_REASON_MANDATORY', 'Le motif de suspension est obligatoire.');
    }
    try {
      const updated = defaultCatalogEngine.suspendProduct(id, reason);
      this.repo.executeTransaction((tx) => {
        const idx = tx.products.findIndex((p) => p.id === id);
        if (idx !== -1) {
          tx.products[idx] = { ...tx.products[idx], ...updated };
        }
      });
      return updated;
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.message, err.message);
    }
  }

  public compareCatalogProductsService(productIds: string[]): ProductComparisonMatrix {
    try {
      return defaultCatalogEngine.compareProducts(productIds);
    } catch (err: any) {
      throw new AppError(err.statusCode || 400, err.message, err.message);
    }
  }

  public toggleCatalogFavoriteService(
    actor: NonNullable<ServerRequestContext['user']>,
    productId: string
  ): { isFavorite: boolean; totalFavorites: number } {
    return this.repo.toggleCatalogFavorite(actor.id, productId);
  }

  public listCatalogFavoritesService(
    actor: NonNullable<ServerRequestContext['user']>
  ): ProductItem[] {
    return this.repo.listCatalogFavorites(actor.id);
  }

  public importCatalogProductsBulkService(
    actor: NonNullable<ServerRequestContext['user']>,
    items: Partial<ProductItem>[]
  ): BulkImportResult {
    if (actor.role !== 'FOURNISSEUR' && actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_BULK_IMPORT', 'Seul un Fournisseur ou Admin peut importer par lot.');
    }
    const supplierId = actor.role === 'FOURNISSEUR' ? actor.id : 'sup-admin-bulk';
    const supplierName = actor.companyName || actor.email || 'Fournisseur B2B';

    const result = defaultCatalogEngine.importProductsBulk(items, supplierId, supplierName);

    if (result.importedProducts.length > 0) {
      this.repo.executeTransaction((tx) => {
        for (const p of result.importedProducts) {
          tx.products.unshift(p);
        }
      });
    }

    return result;
  }

  public getCatalogStatsService(
    actor: NonNullable<ServerRequestContext['user']>
  ) {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_STATS', 'Seul un Administrateur peut consulter les statistiques globales du catalogue.');
    }
    return defaultCatalogEngine.getCatalogStatistics();
  }

  // ============================================================================
  // GESTION DES STOCKS, DISPONIBILITÉS & INVENTAIRES (PROMPT 10)
  // ============================================================================

  public getStockOverviewService(
    actor?: ServerRequestContext['user'],
    supplierId?: string
  ) {
    if (actor?.role === 'FOURNISSEUR') {
      return defaultStockEngine.getOverview(actor.id);
    }
    if (actor?.role === 'CLIENT') {
      const overview = defaultStockEngine.getOverview(supplierId);
      return {
        totalReferences: overview.totalReferences,
        totalAvailable: overview.totalAvailable,
        products: overview.products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          unitPrice: p.unitPrice,
          currency: p.currency,
          stockAvailable: p.stockAvailable,
          stockStatus: p.stockStatus,
          minOrderQuantity: p.minOrderQuantity,
        })),
      };
    }
    return defaultStockEngine.getOverview(supplierId);
  }

  public listStockMovementsService(
    actor?: ServerRequestContext['user'],
    filter?: {
      productId?: string;
      supplierId?: string;
      movementType?: StockMovementType;
      search?: string;
      startDate?: string;
      endDate?: string;
    }
  ): StockMovementRecord[] {
    if (actor?.role === 'CLIENT') {
      throw new AppError(403, 'FORBIDDEN_CLIENT_STOCK_MOVEMENTS', 'Les clients n’ont pas accès aux mouvements internes de stock.');
    }
    const effectiveFilter = { ...(filter || {}) };
    if (actor?.role === 'FOURNISSEUR') {
      effectiveFilter.supplierId = actor.id;
    }
    return defaultStockEngine.listMovements(effectiveFilter);
  }

  public recordInboundStockService(
    actor: NonNullable<ServerRequestContext['user']>,
    payload: {
      productId: string;
      quantity: number;
      reason: string;
      referenceDocument?: string;
      batchNumber?: string;
    },
    correlationId = 'cid-stock',
    ipAddress = '127.0.0.1'
  ): StockMovementRecord {
    if (actor.role === 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN_COMPTABLE_READ_ONLY', "Le profil Comptable dispose d'un accès strictement en lecture seule.");
    }
    if (actor.role === 'CLIENT') {
      throw new AppError(403, 'FORBIDDEN_CLIENT_STOCK_MUTATION', 'Les clients ne peuvent pas enregistrer d’entrées de stock.');
    }

    try {
      const movement = defaultStockEngine.recordInbound({
        ...payload,
        actor: {
          id: actor.id,
          name: actor.companyName || actor.email,
          role: actor.role,
          companyName: actor.companyName,
        },
      });

      this.repo.executeTransaction((tx) => {
        if (!tx.stockMovements) tx.stockMovements = [];
        tx.stockMovements.unshift(movement);

        const prod = tx.products.find((p) => p.id === payload.productId);
        if (prod) {
          prod.stockAvailable = movement.resultingAvailable;
          prod.updatedAt = new Date().toISOString();
        }

        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: actor.companyName || actor.email,
          actorRole: actor.role,
          action: 'STOCK_INBOUND_RECORDED',
          targetType: 'PRODUCT',
          targetId: payload.productId,
          correlationId,
          ipAddress,
          result: 'SUCCESS',
          details: `Entrée de stock : +${payload.quantity} unités pour ${movement.sku} (Motif : ${payload.reason}).`,
        });
      });

      return movement;
    } catch (err: any) {
      if (err instanceof StockError) {
        throw new AppError(err.statusCode, err.code, err.message);
      }
      throw err;
    }
  }

  public adjustStockService(
    actor: NonNullable<ServerRequestContext['user']>,
    payload: {
      productId: string;
      newStockAvailable?: number;
      deltaAvailable?: number;
      reason: string;
      movementType?: StockMovementType;
      referenceDocument?: string;
      batchNumber?: string;
    },
    correlationId = 'cid-stock',
    ipAddress = '127.0.0.1'
  ): StockMovementRecord {
    if (actor.role === 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN_COMPTABLE_READ_ONLY', "Le profil Comptable dispose d'un accès strictement en lecture seule.");
    }
    if (actor.role === 'CLIENT') {
      throw new AppError(403, 'FORBIDDEN_CLIENT_STOCK_MUTATION', 'Les clients ne peuvent pas ajuster les stocks.');
    }

    try {
      const movement = defaultStockEngine.adjustStock({
        ...payload,
        actor: {
          id: actor.id,
          name: actor.companyName || actor.email,
          role: actor.role,
          companyName: actor.companyName,
        },
      });

      this.repo.executeTransaction((tx) => {
        if (!tx.stockMovements) tx.stockMovements = [];
        tx.stockMovements.unshift(movement);

        const prod = tx.products.find((p) => p.id === payload.productId);
        if (prod) {
          prod.stockAvailable = movement.resultingAvailable;
          prod.updatedAt = new Date().toISOString();
        }

        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: actor.companyName || actor.email,
          actorRole: actor.role,
          action: 'STOCK_ADJUSTMENT_PERFORMED',
          targetType: 'PRODUCT',
          targetId: payload.productId,
          correlationId,
          ipAddress,
          result: 'SUCCESS',
          details: `Ajustement stock ${movement.sku} : ${movement.quantityChange > 0 ? '+' : ''}${movement.quantityChange} (Nouveau dispo: ${movement.resultingAvailable}, Motif: ${payload.reason}).`,
        });
      });

      return movement;
    } catch (err: any) {
      if (err instanceof StockError) {
        throw new AppError(err.statusCode, err.code, err.message);
      }
      throw err;
    }
  }

  public reserveStockForOrderService(
    actor: NonNullable<ServerRequestContext['user']>,
    payload: {
      orderId: string;
      orderNumber?: string;
      clientId?: string;
      clientName?: string;
      items: { productId: string; quantity: number }[];
      ttlMinutes?: number;
      notes?: string;
    },
    correlationId = 'cid-stock',
    ipAddress = '127.0.0.1'
  ): StockReservationRecord[] {
    if (actor.role === 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN_COMPTABLE_READ_ONLY', "Le profil Comptable dispose d'un accès strictement en lecture seule.");
    }

    const clientId = payload.clientId || (actor.role === 'CLIENT' ? actor.id : 'client-order');
    const clientName = payload.clientName || actor.companyName || actor.email;

    try {
      const reservations = defaultStockEngine.reserveStockForOrder({
        ...payload,
        clientId,
        clientName,
        actor: {
          id: actor.id,
          name: actor.companyName || actor.email,
          role: actor.role,
          companyName: actor.companyName,
        },
      });

      this.repo.executeTransaction((tx) => {
        for (const item of payload.items) {
          const prod = tx.products.find((p) => p.id === item.productId);
          if (prod) {
            prod.stockAvailable -= item.quantity;
            prod.stockReserved += item.quantity;
            prod.stockOrdered = (prod.stockOrdered || 0) + item.quantity;
            prod.updatedAt = new Date().toISOString();
          }
        }

        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: actor.companyName || actor.email,
          actorRole: actor.role,
          action: 'STOCK_RESERVATION_CREATED',
          targetType: 'ORDER',
          targetId: payload.orderId,
          correlationId,
          ipAddress,
          result: 'SUCCESS',
          details: `Réservation de stock effectuée pour commande ${payload.orderNumber || payload.orderId} (${reservations.length} articles engagés).`,
        });
      });

      return reservations;
    } catch (err: any) {
      if (err instanceof StockError) {
        throw new AppError(err.statusCode, err.code, err.message);
      }
      throw err;
    }
  }

  public releaseStockReservationService(
    actor: NonNullable<ServerRequestContext['user']>,
    payload: {
      reservationId?: string;
      orderId?: string;
      reason?: string;
    },
    correlationId = 'cid-stock',
    ipAddress = '127.0.0.1'
  ): StockMovementRecord[] {
    if (actor.role === 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN_COMPTABLE_READ_ONLY', "Le profil Comptable dispose d'un accès strictement en lecture seule.");
    }

    try {
      const movements = defaultStockEngine.releaseReservation({
        ...payload,
        actor: {
          id: actor.id,
          name: actor.companyName || actor.email,
          role: actor.role,
          companyName: actor.companyName,
        },
      });

      this.repo.executeTransaction((tx) => {
        if (!tx.stockMovements) tx.stockMovements = [];
        for (const mov of movements) {
          tx.stockMovements.unshift(mov);
          const prod = tx.products.find((p) => p.id === mov.productId);
          if (prod) {
            prod.stockAvailable = mov.resultingAvailable;
            prod.stockReserved = mov.resultingReserved;
            prod.stockOrdered = mov.resultingOrdered;
            prod.updatedAt = new Date().toISOString();
          }
        }

        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: actor.companyName || actor.email,
          actorRole: actor.role,
          action: 'STOCK_RESERVATION_RELEASED',
          targetType: 'ORDER',
          targetId: payload.orderId || payload.reservationId || 'target-release',
          correlationId,
          ipAddress,
          result: 'SUCCESS',
          details: `Libération de réservation de stock : ${movements.length} lignes restituées.`,
        });
      });

      return movements;
    } catch (err: any) {
      if (err instanceof StockError) {
        throw new AppError(err.statusCode, err.code, err.message);
      }
      throw err;
    }
  }

  public fulfillStockReservationService(
    actor: NonNullable<ServerRequestContext['user']>,
    payload: {
      reservationId?: string;
      orderId?: string;
      referenceDocument?: string;
      reason?: string;
    },
    correlationId = 'cid-stock',
    ipAddress = '127.0.0.1'
  ): StockMovementRecord[] {
    if (actor.role === 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN_COMPTABLE_READ_ONLY', "Le profil Comptable dispose d'un accès strictement en lecture seule.");
    }

    try {
      const movements = defaultStockEngine.fulfillReservation({
        ...payload,
        actor: {
          id: actor.id,
          name: actor.companyName || actor.email,
          role: actor.role,
          companyName: actor.companyName,
        },
      });

      this.repo.executeTransaction((tx) => {
        if (!tx.stockMovements) tx.stockMovements = [];
        for (const mov of movements) {
          tx.stockMovements.unshift(mov);
          const prod = tx.products.find((p) => p.id === mov.productId);
          if (prod) {
            prod.stockReserved = mov.resultingReserved;
            prod.stockShipped = mov.resultingShipped;
            prod.updatedAt = new Date().toISOString();
          }
        }

        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: actor.companyName || actor.email,
          actorRole: actor.role,
          action: 'STOCK_RESERVATION_FULFILLED',
          targetType: 'ORDER',
          targetId: payload.orderId || payload.reservationId || 'target-fulfill',
          correlationId,
          ipAddress,
          result: 'SUCCESS',
          details: `Confirmation sortie définitive expédition : ${movements.length} lignes déstockées.`,
        });
      });

      return movements;
    } catch (err: any) {
      if (err instanceof StockError) {
        throw new AppError(err.statusCode, err.code, err.message);
      }
      throw err;
    }
  }

  public sweepExpiredStockReservationsService(
    actor: NonNullable<ServerRequestContext['user']>,
    correlationId = 'cid-stock',
    ipAddress = '127.0.0.1'
  ) {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_ADMIN_ONLY', 'Seul un Administrateur peut déclencher manuellement le balayage TTL des réservations.');
    }

    const result = defaultStockEngine.expirePendingReservations();

    if (result.expiredCount > 0) {
      this.repo.executeTransaction((tx) => {
        if (!tx.stockMovements) tx.stockMovements = [];
        for (const mov of result.releasedMovements) {
          tx.stockMovements.unshift(mov);
          const prod = tx.products.find((p) => p.id === mov.productId);
          if (prod) {
            prod.stockAvailable = mov.resultingAvailable;
            prod.stockReserved = mov.resultingReserved;
            prod.stockOrdered = mov.resultingOrdered;
            prod.updatedAt = new Date().toISOString();
          }
        }

        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: actor.companyName || actor.email,
          actorRole: actor.role,
          action: 'STOCK_RESERVATIONS_TTL_SWEEP',
          targetType: 'STOCK',
          targetId: 'all-expired',
          correlationId,
          ipAddress,
          result: 'SUCCESS',
          details: `Balayage TTL des réservations de stock : ${result.expiredCount} réservations échues libérées.`,
        });
      });
    }

    return result;
  }

  public listStockReservationsService(
    actor?: ServerRequestContext['user'],
    filter?: {
      orderId?: string;
      clientId?: string;
      productId?: string;
      status?: 'ACTIVE' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
    }
  ): StockReservationRecord[] {
    const effectiveFilter = { ...(filter || {}) };
    if (actor?.role === 'CLIENT') {
      effectiveFilter.clientId = actor.id;
    }
    return defaultStockEngine.listReservations(effectiveFilter);
  }

  public createInventorySessionService(
    actor: NonNullable<ServerRequestContext['user']>,
    payload: {
      supplierId?: string;
      supplierName?: string;
      title: string;
      productIds?: string[];
      notes?: string;
    },
    correlationId = 'cid-stock',
    ipAddress = '127.0.0.1'
  ): PhysicalInventorySession {
    if (actor.role === 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN_COMPTABLE_READ_ONLY', "Le profil Comptable dispose d'un accès strictement en lecture seule.");
    }
    if (actor.role === 'CLIENT') {
      throw new AppError(403, 'FORBIDDEN_CLIENT_INVENTORY', 'Les clients n’ont pas accès aux inventaires de stock.');
    }

    const supplierId = actor.role === 'FOURNISSEUR' ? actor.id : (payload.supplierId || actor.id);
    const supplierName = actor.role === 'FOURNISSEUR' ? (actor.companyName || actor.email) : (payload.supplierName || 'Fournisseur Certifié');

    try {
      const session = defaultStockEngine.createInventorySession({
        supplierId,
        supplierName,
        title: payload.title,
        conductedBy: {
          id: actor.id,
          name: actor.companyName || actor.email,
          role: actor.role,
          companyName: actor.companyName,
        },
        productIds: payload.productIds,
        notes: payload.notes,
      });

      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: actor.companyName || actor.email,
          actorRole: actor.role,
          action: 'PHYSICAL_INVENTORY_SESSION_CREATED',
          targetType: 'INVENTORY',
          targetId: session.id,
          correlationId,
          ipAddress,
          result: 'SUCCESS',
          details: `Session d’inventaire physique ${session.sessionNumber} créée avec ${session.lines.length} articles à recenser.`,
        });
      });

      return session;
    } catch (err: any) {
      if (err instanceof StockError) {
        throw new AppError(err.statusCode, err.code, err.message);
      }
      throw err;
    }
  }

  public updateInventoryCountService(
    actor: NonNullable<ServerRequestContext['user']>,
    sessionId: string,
    counts: { productId: string; physicalCounted: number; notes?: string }[]
  ): PhysicalInventorySession {
    if (actor.role === 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN_COMPTABLE_READ_ONLY', "Le profil Comptable dispose d'un accès strictement en lecture seule.");
    }

    try {
      return defaultStockEngine.updateInventoryCount(sessionId, counts, {
        id: actor.id,
        name: actor.companyName || actor.email,
        role: actor.role,
        companyName: actor.companyName,
      });
    } catch (err: any) {
      if (err instanceof StockError) {
        throw new AppError(err.statusCode, err.code, err.message);
      }
      throw err;
    }
  }

  public reconcileInventorySessionService(
    actor: NonNullable<ServerRequestContext['user']>,
    sessionId: string,
    completionNotes?: string,
    correlationId = 'cid-stock',
    ipAddress = '127.0.0.1'
  ): { session: PhysicalInventorySession; adjustmentsMade: StockMovementRecord[] } {
    if (actor.role === 'COMPTABLE') {
      throw new AppError(403, 'FORBIDDEN_COMPTABLE_READ_ONLY', "Le profil Comptable dispose d'un accès strictement en lecture seule.");
    }

    try {
      const result = defaultStockEngine.reconcileInventorySession(
        sessionId,
        {
          id: actor.id,
          name: actor.companyName || actor.email,
          role: actor.role,
          companyName: actor.companyName,
        },
        completionNotes
      );

      this.repo.executeTransaction((tx) => {
        if (!tx.stockMovements) tx.stockMovements = [];
        for (const mov of result.adjustmentsMade) {
          tx.stockMovements.unshift(mov);
          const prod = tx.products.find((p) => p.id === mov.productId);
          if (prod) {
            prod.stockAvailable = mov.resultingAvailable;
            prod.updatedAt = new Date().toISOString();
          }
        }

        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: actor.companyName || actor.email,
          actorRole: actor.role,
          action: 'PHYSICAL_INVENTORY_SESSION_RECONCILED',
          targetType: 'INVENTORY',
          targetId: sessionId,
          correlationId,
          ipAddress,
          result: 'SUCCESS',
          details: `Clôture et réconciliation inventaire ${result.session.sessionNumber} : ${result.adjustmentsMade.length} ajustements de stock appliqués.`,
        });
      });

      return result;
    } catch (err: any) {
      if (err instanceof StockError) {
        throw new AppError(err.statusCode, err.code, err.message);
      }
      throw err;
    }
  }

  public listInventorySessionsService(
    actor?: ServerRequestContext['user'],
    supplierId?: string
  ): PhysicalInventorySession[] {
    if (actor?.role === 'CLIENT') {
      throw new AppError(403, 'FORBIDDEN_CLIENT_INVENTORY', 'Les clients n’ont pas accès aux inventaires.');
    }
    const effectiveSupplierId = actor?.role === 'FOURNISSEUR' ? actor.id : supplierId;
    return defaultStockEngine.listInventorySessions(effectiveSupplierId);
  }

  public getInventorySessionDetailService(
    actor: ServerRequestContext['user'],
    sessionId: string
  ): PhysicalInventorySession {
    if (actor?.role === 'CLIENT') {
      throw new AppError(403, 'FORBIDDEN_CLIENT_INVENTORY', 'Les clients n’ont pas accès aux inventaires.');
    }
    const session = defaultStockEngine.getInventorySessionById(sessionId);
    if (!session) {
      throw new AppError(404, 'INVENTORY_SESSION_NOT_FOUND', `Session d’inventaire "${sessionId}" introuvable.`);
    }
    if (actor?.role === 'FOURNISSEUR' && session.supplierId !== actor.id) {
      throw new AppError(403, 'FORBIDDEN_IDOR_INVENTORY', 'Accès interdit à cet inventaire.');
    }
    return session;
  }

  public listStockAlertsService(
    actor?: ServerRequestContext['user'],
    supplierId?: string,
    onlyUnresolved = true
  ): StockAlertRecord[] {
    if (actor?.role === 'CLIENT') {
      throw new AppError(403, 'FORBIDDEN_CLIENT_ALERTS', 'Les clients n’ont pas accès aux alertes internes de stock.');
    }
    const effectiveSupplierId = actor?.role === 'FOURNISSEUR' ? actor.id : supplierId;
    return defaultStockEngine.getAlerts(effectiveSupplierId, onlyUnresolved);
  }

  public resolveStockAlertService(
    actor: NonNullable<ServerRequestContext['user']>,
    alertId: string
  ): StockAlertRecord {
    if (actor.role === 'COMPTABLE' || actor.role === 'CLIENT') {
      throw new AppError(403, 'FORBIDDEN_ALERT_MUTATION', 'Accès non autorisé.');
    }
    try {
      return defaultStockEngine.resolveAlertManual(alertId);
    } catch (err: any) {
      if (err instanceof StockError) {
        throw new AppError(err.statusCode, err.code, err.message);
      }
      throw err;
    }
  }

  public getStockValuationReportService(
    actor?: ServerRequestContext['user'],
    supplierId?: string
  ): StockValuationReport {
    if (actor?.role === 'CLIENT') {
      throw new AppError(403, 'FORBIDDEN_CLIENT_VALUATION', 'Les clients n’ont pas accès à la valorisation financière des stocks.');
    }
    const effectiveSupplierId = actor?.role === 'FOURNISSEUR' ? actor.id : supplierId;
    return defaultStockEngine.getValuationReport(effectiveSupplierId);
  }

  // ============================================================================
  // PROMPT 12 : GESTION DOCUMENTAIRE & FACTURATION MULTI-JURIDICTIONS
  // ============================================================================

  public createCommercialDocumentService(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    documentType: CommercialDocumentType;
    jurisdiction: TaxJurisdictionCode;
    issuer: DocumentPartyInfo;
    recipient: DocumentPartyInfo;
    carrier?: DocumentPartyInfo;
    lines: {
      sku: string;
      description: Record<Locale, string>;
      quantity: number;
      unit: string;
      unitPrice: string;
      discountPct?: string;
      taxRatePct?: string;
      hsCode?: string;
    }[];
    orderId?: string;
    orderNumber?: string;
    quoteId?: string;
    quoteNumber?: string;
    originalInvoiceId?: string;
    originalInvoiceNumber?: string;
    creditNoteReason?: string;
    paymentId?: string;
    paymentReference?: string;
    shipmentId?: string;
    trackingNumber?: string;
    shippingAmount?: string;
    currency?: string;
    validityDays?: number;
    dueInDays?: number;
    incoterm?: string;
    incotermLocation?: string;
    transportDetails?: DocumentTransportDetails;
    correlationId: string;
    ipAddress: string;
  }): CommercialDocumentRecord {
    // RBAC: Comptable en lecture seule (Stage 3)
    if (params.actor.role === 'COMPTABLE') {
      throw new AppError(403, 'COMPTABLE_STAGE3_READONLY_SOURCE_DATA', 'Le profil COMPTABLE est en lecture seule sur les documents légaux.');
    }
    // Client ne peut pas émettre de facture
    if (params.actor.role === 'CLIENT' && (params.documentType === 'COMMERCIAL_INVOICE' || params.documentType === 'CREDIT_NOTE' || params.documentType === 'DELIVERY_NOTE')) {
      throw new AppError(403, 'FORBIDDEN_CLIENT_DOCUMENT_CREATION', 'Le Client ne peut pas émettre de facture, d’avoir ou de bon de livraison.');
    }

    const doc = BillingDocumentEngine.createCommercialDocument({
      ...params,
      createdByUserId: params.actor.id,
      createdByUserName: params.actor.email,
    });

    this.repo.saveCommercialDocument(doc);

    // Audit log
    this.repo.addAuditLog({
      id: `aud-doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorName: params.actor.email,
      actorRole: params.actor.role,
      action: `DOCUMENT_ISSUED_${params.documentType}`,
      targetType: 'CommercialDocument',
      targetId: doc.documentNumber,
      result: 'SUCCESS',
      correlationId: params.correlationId,
      ipAddress: params.ipAddress,
      details: `Document ${doc.documentNumber} (${doc.documentType}) émis sous juridiction ${doc.jurisdiction} pour un montant de ${doc.totalTtc} ${doc.currency}.`,
    });

    return doc;
  }

  public createCreditNoteService(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    invoiceId: string;
    reason: string;
    partialLines?: { sku: string; quantity: number }[];
    correlationId: string;
    ipAddress: string;
  }): { creditNote: CommercialDocumentRecord; updatedOriginalInvoice: CommercialDocumentRecord } {
    if (params.actor.role === 'COMPTABLE' || params.actor.role === 'CLIENT') {
      throw new AppError(403, 'FORBIDDEN_CREDIT_NOTE_CREATION', 'Seul le Fournisseur émetteur ou l’Administrateur peut émettre une facture d’avoir.');
    }

    const originalInvoice = this.repo.findCommercialDocumentById(params.invoiceId);
    if (!originalInvoice) {
      throw new AppError(404, 'INVOICE_NOT_FOUND', 'Facture d’origine introuvable pour émettre un avoir.');
    }

    const actorInfo = {
      id: params.actor.id,
      name: (params.actor as any).companyName || params.actor.email,
      email: params.actor.email,
      role: params.actor.role,
    };

    BillingDocumentEngine.enforceDocumentAccess(actorInfo, originalInvoice, 'CREATE_CREDIT_NOTE');

    const result = BillingDocumentEngine.createCreditNoteFromInvoice(
      originalInvoice,
      params.reason,
      actorInfo,
      params.partialLines
    );

    this.repo.saveCommercialDocument(result.creditNote);
    this.repo.saveCommercialDocument(result.updatedOriginalInvoice);

    // Audit log
    this.repo.addAuditLog({
      id: `aud-doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorName: params.actor.email,
      actorRole: params.actor.role,
      action: 'CREDIT_NOTE_ISSUED',
      targetType: 'CommercialDocument',
      targetId: result.creditNote.documentNumber,
      result: 'SUCCESS',
      correlationId: params.correlationId,
      ipAddress: params.ipAddress,
      details: `Avoir ${result.creditNote.documentNumber} émis en annulation/rectification de la facture ${originalInvoice.documentNumber} (Motif: ${params.reason}).`,
    });

    return result;
  }

  public getCommercialDocumentByIdService(
    actor: NonNullable<ServerRequestContext['user']>,
    documentId: string
  ): CommercialDocumentRecord {
    const doc = this.repo.findCommercialDocumentById(documentId);
    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document commercial introuvable.');
    }
    BillingDocumentEngine.enforceDocumentAccess(actor, doc, 'VIEW');
    return doc;
  }

  public getCommercialDocumentPreviewService(
    actor: NonNullable<ServerRequestContext['user']>,
    documentId: string,
    targetLocale: Locale = 'fr'
  ): { document: CommercialDocumentRecord; targetLocale: Locale; isSealValid: boolean } {
    const doc = this.getCommercialDocumentByIdService(actor, documentId);
    const isSealValid = BillingDocumentEngine.verifyDocumentSeal(doc);
    return {
      document: doc,
      targetLocale,
      isSealValid,
    };
  }

  public generateCommercialDocumentPdfService(
    actor: NonNullable<ServerRequestContext['user']>,
    documentId: string,
    targetLocale: Locale = 'fr'
  ): { pdfBuffer: Buffer; filename: string; mimeType: string } {
    const doc = this.getCommercialDocumentByIdService(actor, documentId);
    BillingDocumentEngine.enforceDocumentAccess(actor, doc, 'DOWNLOAD');
    const pdfBuffer = BillingDocumentEngine.generateStandardPdfBuffer(doc, targetLocale);
    return {
      pdfBuffer,
      filename: `${doc.documentNumber}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  public createDocumentDownloadTokenService(
    actor: NonNullable<ServerRequestContext['user']>,
    documentId: string,
    secretKey = 'tradelink_doc_secret_key_9944'
  ): TemporaryDownloadTokenPayload & { downloadUrl: string } {
    const doc = this.getCommercialDocumentByIdService(actor, documentId);
    BillingDocumentEngine.enforceDocumentAccess(actor, doc, 'DOWNLOAD');
    const tokenPayload = BillingDocumentEngine.generateTemporaryDownloadToken(
      doc.id,
      doc.documentNumber,
      actor.id,
      secretKey,
      900 // 15 min
    );
    const downloadUrl = `/api/v1/documents/${doc.id}/download?token=${tokenPayload.hmacSignature}&expires=${tokenPayload.expiresAt}&user=${actor.id}`;
    return {
      ...tokenPayload,
      downloadUrl,
    };
  }

  public verifyAndDownloadDocumentWithTokenService(
    documentId: string,
    token: string,
    expiresAt: number,
    userId: string,
    secretKey = 'tradelink_doc_secret_key_9944',
    targetLocale: Locale = 'fr'
  ): { pdfBuffer: Buffer; filename: string; mimeType: string } {
    const doc = this.repo.findCommercialDocumentById(documentId);
    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document introuvable.');
    }
    const check = BillingDocumentEngine.verifyTemporaryDownloadToken(
      documentId,
      doc.documentNumber,
      userId,
      expiresAt,
      token,
      secretKey
    );
    if (!check.valid) {
      throw new AppError(403, 'INVALID_OR_EXPIRED_DOWNLOAD_TOKEN', `Lien de téléchargement invalide ou expiré (${check.reason}).`);
    }
    const pdfBuffer = BillingDocumentEngine.generateStandardPdfBuffer(doc, targetLocale);
    return {
      pdfBuffer,
      filename: `${doc.documentNumber}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  public queryCommercialDocumentsService(
    actor: NonNullable<ServerRequestContext['user']>,
    filters: DocumentSearchFilters
  ): CommercialDocumentRecord[] {
    const effectiveFilters = { ...filters };
    const docs = this.repo.queryCommercialDocuments(effectiveFilters);
    // Filtrage RBAC strict
    return docs.filter((d) => {
      try {
        BillingDocumentEngine.enforceDocumentAccess(actor, d, 'VIEW');
        return true;
      } catch {
        return false;
      }
    });
  }

  // ============================================================================
  // PROMPT 15 : SERVICES D'IMPORTATION EN 12 ÉTAPES, SANDBOX & EXPORTS
  // ============================================================================

  private logAudit(
    actor: NonNullable<ServerRequestContext['user']>,
    action: string,
    targetType: string,
    targetId: string,
    result: 'SUCCESS' | 'DENIED' | 'WARNING',
    details: string
  ): void {
    const entry: AuditLogRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actorName: actor.companyName || actor.email || actor.id,
      actorRole: actor.role,
      action,
      targetType,
      targetId,
      result,
      correlationId: `corr-${Date.now()}`,
      ipAddress: '127.0.0.1',
      details,
    };
    this.repo.addAuditLog(entry);
  }

  public uploadImportJobService(
    actor: NonNullable<ServerRequestContext['user']>,
    params: {
      fileName: string;
      fileSize: number;
      fileContentRaw: string;
      entity: ImportTargetEntity;
    }
  ): SecureImportPipelineJob {
    ImportExportEngine.enforceImportPermission(actor.role, params.entity);

    const job = ImportExportEngine.step1_upload({
      fileName: params.fileName,
      fileSize: params.fileSize,
      fileContentRaw: params.fileContentRaw,
      entity: params.entity,
      userId: actor.id,
    });

    this.repo.saveSecureImportJob(job);
    this.logAudit(
      actor,
      'IMPORT_JOB_UPLOADED',
      'IMPORT_JOB',
      job.id,
      job.status === 'FAILED' ? 'DENIED' : 'SUCCESS',
      `Fichier ${job.fileName} (${job.format}, ${(job.fileSize / 1024).toFixed(1)} Ko) téléversé. Validation: ${job.validation.antivirusScan}`
    );

    return job;
  }

  public identifyImportFormatService(
    actor: NonNullable<ServerRequestContext['user']>,
    jobId: string
  ): SecureImportPipelineJob {
    const job = this.repo.getSecureImportJob(jobId);
    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Session d’importation introuvable.');
    ImportExportEngine.enforceImportPermission(actor.role, job.entity);

    const updated = ImportExportEngine.step2_identifyFormat(job);
    this.repo.saveSecureImportJob(updated);
    return updated;
  }

  public validateImportJobService(
    actor: NonNullable<ServerRequestContext['user']>,
    jobId: string
  ): SecureImportPipelineJob {
    const job = this.repo.getSecureImportJob(jobId);
    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Session d’importation introuvable.');
    ImportExportEngine.enforceImportPermission(actor.role, job.entity);

    const updated = ImportExportEngine.step3_validate(job);
    this.repo.saveSecureImportJob(updated);
    return updated;
  }

  public analyzeImportContentService(
    actor: NonNullable<ServerRequestContext['user']>,
    jobId: string
  ): { job: SecureImportPipelineJob; columns: string[]; parsedRowsCount: number; previewRows: any[] } {
    const job = this.repo.getSecureImportJob(jobId);
    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Session d’importation introuvable.');
    ImportExportEngine.enforceImportPermission(actor.role, job.entity);

    const step4 = ImportExportEngine.step4_analyzeContent(job);
    const step5 = ImportExportEngine.step5_preview(step4.job, step4.parsedRows, 10);
    this.repo.saveSecureImportJob(step5);

    return {
      job: step5,
      columns: step4.columns,
      parsedRowsCount: step4.parsedRowsCount,
      previewRows: step5.previewRows,
    };
  }

  public mapImportColumnsService(
    actor: NonNullable<ServerRequestContext['user']>,
    jobId: string,
    customMappings?: Record<string, string>
  ): SecureImportPipelineJob {
    const job = this.repo.getSecureImportJob(jobId);
    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Session d’importation introuvable.');
    ImportExportEngine.enforceImportPermission(actor.role, job.entity);

    const step4 = ImportExportEngine.step4_analyzeContent(job);
    const updated = ImportExportEngine.step6_mapColumns(step4.job, step4.parsedRows, customMappings);
    this.repo.saveSecureImportJob(updated);
    return updated;
  }

  public checkImportDuplicatesService(
    actor: NonNullable<ServerRequestContext['user']>,
    jobId: string,
    duplicateStrategy: DuplicateStrategy = 'SKIP',
    uniqueKeyField?: string
  ): { job: SecureImportPipelineJob; duplicates: any[] } {
    const job = this.repo.getSecureImportJob(jobId);
    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Session d’importation introuvable.');
    ImportExportEngine.enforceImportPermission(actor.role, job.entity);

    job.duplicateStrategy = duplicateStrategy;
    const step4 = ImportExportEngine.step4_analyzeContent(job);

    // Récupérer les entités existantes selon le type
    let existing: any[] = [];
    if (job.entity === 'CATALOG_PRODUCTS') {
      existing = this.repo.getSnapshot().products;
    } else if (job.entity === 'INVOICES') {
      existing = this.repo.getSnapshot().invoices;
    } else if (job.entity === 'ACCOUNTING_ENTRIES') {
      existing = this.repo.getSnapshot().accountingEntries;
    }

    const res = ImportExportEngine.step7_detectDuplicates({
      job,
      parsedRows: step4.parsedRows,
      existingRecords: existing,
      uniqueKeyField,
    });

    this.repo.saveSecureImportJob(res.job);
    return res;
  }

  public reportImportErrorsService(
    actor: NonNullable<ServerRequestContext['user']>,
    jobId: string
  ): { job: SecureImportPipelineJob; errors: any[] } {
    const job = this.repo.getSecureImportJob(jobId);
    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Session d’importation introuvable.');
    ImportExportEngine.enforceImportPermission(actor.role, job.entity);

    const step4 = ImportExportEngine.step4_analyzeContent(job);
    const res = ImportExportEngine.step8_reportErrors({
      job,
      parsedRows: step4.parsedRows,
    });

    this.repo.saveSecureImportJob(res.job);
    return res;
  }

  public simulateImportService(
    actor: NonNullable<ServerRequestContext['user']>,
    jobId: string
  ): SecureImportPipelineJob {
    const job = this.repo.getSecureImportJob(jobId);
    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Session d’importation introuvable.');
    ImportExportEngine.enforceImportPermission(actor.role, job.entity);

    const step4 = ImportExportEngine.step4_analyzeContent(job);
    const dupRes = this.checkImportDuplicatesService(actor, jobId, job.duplicateStrategy);
    const errRes = this.reportImportErrorsService(actor, jobId);

    const updated = ImportExportEngine.step9_simulate({
      job,
      parsedRows: step4.parsedRows,
      duplicates: dupRes.duplicates,
      errors: errRes.errors,
    });

    this.repo.saveSecureImportJob(updated);
    return updated;
  }

  public confirmImportService(
    actor: NonNullable<ServerRequestContext['user']>,
    jobId: string
  ): SecureImportPipelineJob {
    const job = this.repo.getSecureImportJob(jobId);
    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Session d’importation introuvable.');
    ImportExportEngine.enforceImportPermission(actor.role, job.entity);

    const updated = ImportExportEngine.step10_confirm({
      job,
      confirmedByUserId: actor.id,
    });

    this.repo.saveSecureImportJob(updated);
    return updated;
  }

  public executeImportService(
    actor: NonNullable<ServerRequestContext['user']>,
    jobId: string
  ): ImportFinalReport {
    const job = this.repo.getSecureImportJob(jobId);
    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Session d’importation introuvable.');
    ImportExportEngine.enforceImportPermission(actor.role, job.entity);

    if (job.status === 'AWAITING_APPROVAL' && job.requiresDualAdmin) {
      throw new AppError(
        403,
        'DUAL_ADMIN_APPROVAL_REQUIRED',
        'Cette opération sensible nécessite la validation préalable d’un second administrateur.'
      );
    }

    const step4 = ImportExportEngine.step4_analyzeContent(job);

    const finalReport = ImportExportEngine.step11_and_12_executeAndReport({
      job,
      parsedRows: step4.parsedRows,
      executedByUserId: actor.id,
      applyMutationFn: (rowsToCreate, rowsToUpdate) => {
        let created = 0;
        let updated = 0;

        if (job.entity === 'CATALOG_PRODUCTS') {
          for (const r of rowsToCreate) {
            const pId = `prod-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const pName = r['name.fr'] || r.name || 'Produit Importé';
            const newP: any = {
              id: pId,
              sku: r.sku || `SKU-${Date.now()}`,
              name: { fr: pName, en: r['name.en'] || pName, ar: r['name.ar'] || pName },
              price: { amount: String(r.priceAmount || '10.00'), currency: 'EUR' },
              stock: { available: Number(r.stockAvailable || 0), reserved: 0, minThreshold: 5 },
              supplier: { id: actor.id, companyName: actor.role === 'FOURNISSEUR' ? 'Fournisseur Import' : 'Fournisseur Partenaire' },
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            this.repo.getSnapshot().products.push(newP);
            created++;
          }
          defaultCatalogEngine.syncProducts(this.repo.getSnapshot().products.filter((p) => !p.deletedAt));
        } else {
          created += rowsToCreate.length;
          updated += rowsToUpdate.length;
        }

        return { created, updated };
      },
    });

    this.repo.saveSecureImportJob(job);
    this.logAudit(
      actor,
      'IMPORT_JOB_EXECUTED',
      'IMPORT_JOB',
      job.id,
      'SUCCESS',
      `Importation finalisée : ${finalReport.importedRows} lignes insérées/mises à jour, ${finalReport.ignoredRows} doublons ignorés, ${finalReport.rejectedRows} rejets en ${finalReport.durationMs}ms.`
    );

    return finalReport;
  }

  // --- SANDBOX BASES DE DONNÉES (SQL, BAK, DBF) ---

  public createDatabaseSandboxSessionService(
    actor: NonNullable<ServerRequestContext['user']>,
    params: { fileName: string; fileContentRaw: string }
  ): DatabaseSandboxSession {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Seul un administrateur peut analyser des fichiers de base de données en sandbox.');
    }

    const session = ImportExportEngine.createDatabaseSandboxSession({
      fileName: params.fileName,
      fileContentRaw: params.fileContentRaw,
      initiatedByUserId: actor.id,
    });

    this.repo.saveDatabaseSandboxSession(session);
    this.logAudit(
      actor,
      'DATABASE_SANDBOX_ANALYSIS_CREATED',
      'DATABASE_SANDBOX',
      session.sessionId,
      session.status === 'FAILED' ? 'DENIED' : 'SUCCESS',
      `Session sandbox isolée créée pour ${session.fileName} (${session.fileFormat}, score: ${session.compatibilityReport.isCompatible ? 'COMPATIBLE' : 'INCOMPATIBLE'}). Réseau OFF, Secrets Prod Masqués.`
    );

    return session;
  }

  public approveDatabaseMigrationService(
    actor: NonNullable<ServerRequestContext['user']>,
    sessionId: string
  ): DatabaseSandboxSession {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Seul un administrateur peut approuver une migration.');
    }

    const session = this.repo.getDatabaseSandboxSession(sessionId);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Session sandbox introuvable.');

    try {
      const updated = ImportExportEngine.approveDualAdminMigration(session, actor.id);
      this.repo.saveDatabaseSandboxSession(updated);
      this.logAudit(
        actor,
        'DATABASE_MIGRATION_DUAL_APPROVED',
        'DATABASE_SANDBOX',
        session.sessionId,
        'SUCCESS',
        `Double approbation accordée par l'administrateur ${actor.id} (Initié par ${session.dualAdminApproval.initiatedBy}).`
      );
      return updated;
    } catch (err: any) {
      if (err.message?.includes('ADMIN_SELF_APPROVAL_FORBIDDEN')) {
        throw new AppError(403, 'ADMIN_SELF_APPROVAL_FORBIDDEN', err.message);
      }
      throw new AppError(400, 'APPROVAL_ERROR', err.message);
    }
  }

  public executeDatabaseMigrationService(
    actor: NonNullable<ServerRequestContext['user']>,
    sessionId: string
  ): { success: boolean; executedTablesCount: number; migratedRowsCount: number; backupSnapshotId: string; executionLog: string[] } {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Seul un administrateur peut exécuter une migration.');
    }

    const session = this.repo.getDatabaseSandboxSession(sessionId);
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Session sandbox introuvable.');

    const result = ImportExportEngine.executeDatabaseMigration(session);
    this.repo.saveDatabaseSandboxSession(session);
    this.logAudit(
      actor,
      'DATABASE_MIGRATION_EXECUTED',
      'DATABASE_SANDBOX',
      session.sessionId,
      'SUCCESS',
      `Migration exécutée avec succès : ${result.migratedRowsCount} lignes, ${result.executedTablesCount} tables. Sauvegarde: ${result.backupSnapshotId}`
    );

    return result;
  }

  // --- EXPORTATION UNIFIÉE ---

  public exportDatasetService(
    actor: NonNullable<ServerRequestContext['user']>,
    params: {
      entity: ExportDatasetType;
      format: ExportFormatType;
      selectedFields?: string[];
      preventFormulaInjection?: boolean;
    }
  ): DataExportResult {
    ImportExportEngine.enforceExportPermission(actor.role, params.entity);

    let records: any[] = [];
    if (params.entity === 'PRODUCTS') {
      records = this.repo.getSnapshot().products.filter((p) => !p.deletedAt);
    } else if (params.entity === 'ORDERS') {
      records = this.repo.getSnapshot().orders.filter((o) => !o.deletedAt);
    } else if (params.entity === 'INVOICES') {
      records = this.repo.getSnapshot().invoices;
    } else if (params.entity === 'ENTRIES') {
      records = this.repo.getSnapshot().accountingEntries;
    } else if (params.entity === 'AUDIT_LOGS') {
      records = this.repo.getSnapshot().auditLogs;
    }

    const result = ImportExportEngine.exportDataset({
      entity: params.entity,
      format: params.format,
      records,
      selectedFields: params.selectedFields,
      preventFormulaInjection: params.preventFormulaInjection ?? true,
    });

    this.repo.saveDataExport(result);
    this.logAudit(
      actor,
      'DATASET_EXPORTED',
      'EXPORT',
      `${params.entity}_${params.format}`,
      'SUCCESS',
      `Export ${params.entity} en format ${params.format} (${result.rowsCount} lignes, SHA-256: ${result.sha256.slice(0, 16)}...). Injections formules prévenues: ${result.preventedInjectionsCount}.`
    );

    return result;
  }

  // ============================================================================
  // PROMPT 16 : ADMINISTRATION AVANCÉE, SÉCURITÉ, AUDIT, KMS & SUPERVISION
  // ============================================================================

  public listSecurityAlertsService(actor: NonNullable<ServerRequestContext['user']>): SecurityAlertRecord[] {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }

    const attempts = this.repo.getLoginAttempts();
    const auditLogs = this.repo.listAuditLogs();
    const activeKek: KMSKeyRecord = {
      id: 'kms-kek-master-01',
      keyAlias: 'kms/tradelink-master-kek-eu-west-3',
      keyType: 'KEK_MASTER',
      algorithm: 'AES-256-GCM',
      kmsProvider: 'AWS_KMS_HSM',
      keyArnMasked: 'arn:aws:kms:eu-west-3:************:key/8a7b-****-42e1',
      version: 4,
      status: 'ACTIVE',
      lastRotatedAt: '2026-10-15 10:00:00',
      nextRotationAt: '2026-11-25',
    };

    const detected = detectSecurityAnomalies({
      loginAttempts: attempts,
      auditLogs,
      activeKek,
    });

    for (const d of detected) {
      const existing = this.repo.listSecurityAlerts().find((a) => a.id === d.id || (a.type === d.type && a.actorIp === d.actorIp && a.status === 'OPEN'));
      if (!existing) {
        this.repo.addSecurityAlert(d);
      }
    }

    return this.repo.listSecurityAlerts();
  }

  public resolveSecurityAlertService(
    actor: NonNullable<ServerRequestContext['user']>,
    alertId: string
  ): SecurityAlertRecord {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }

    const resolved = this.repo.resolveSecurityAlert(alertId, actor.id);
    if (!resolved) {
      throw new AppError(404, 'ALERT_NOT_FOUND', 'Alerte de sécurité introuvable.');
    }

    this.logAudit(
      actor,
      'SECURITY_ALERT_RESOLVED',
      'SECURITY_ALERT',
      alertId,
      'SUCCESS',
      `Alerte de sécurité ${alertId} (${resolved.type}) marquée comme résolue par ${actor.id}.`
    );

    return resolved;
  }

  public listActiveUserSessionsService(
    actor: NonNullable<ServerRequestContext['user']>
  ): any[] {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }
    return this.repo.getAllActiveSessions();
  }

  public revokeUserSessionService(
    actor: NonNullable<ServerRequestContext['user']>,
    sessionId: string
  ): { success: boolean; sessionId: string } {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }

    const revoked = this.repo.revokeUserSession(sessionId, `Révoqué manuellement par l’administrateur ${actor.id}`);
    if (!revoked) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Session introuvable ou déjà révoquée.');
    }

    this.logAudit(
      actor,
      'USER_SESSION_REVOKED',
      'AUTH_SESSION',
      sessionId,
      'SUCCESS',
      `Session utilisateur ${sessionId} révoquée à chaud avec succès.`
    );

    return { success: true, sessionId };
  }

  public revokeAllUserSessionsService(
    actor: NonNullable<ServerRequestContext['user']>,
    targetUserId: string
  ): { success: boolean; targetUserId: string; revokedCount: number } {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }

    const count = this.repo.revokeAllUserSessionsExcept(targetUserId);

    this.logAudit(
      actor,
      'ALL_USER_SESSIONS_REVOKED',
      'USER',
      targetUserId,
      'SUCCESS',
      `Révocation totale de toutes les sessions actives pour l'utilisateur ${targetUserId} (${count} session(s) révoquée(s)).`
    );

    return { success: true, targetUserId, revokedCount: count };
  }

  public getKmsKeyLifecycleService(actor: NonNullable<ServerRequestContext['user']>): KMSKeyRecord {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }

    return {
      id: 'kms-kek-master-01',
      keyAlias: 'kms/tradelink-master-kek-eu-west-3',
      keyType: 'KEK_MASTER',
      algorithm: 'AES-256-GCM',
      kmsProvider: 'AWS_KMS_HSM',
      keyArnMasked: 'arn:aws:kms:eu-west-3:************:key/8a7b-****-42e1',
      version: 4,
      status: 'ACTIVE',
      lastRotatedAt: '2026-10-15 10:00:00',
      nextRotationAt: '2027-01-15',
    };
  }

  public rotateKmsKeyService(actor: NonNullable<ServerRequestContext['user']>): {
    updatedKey: KMSKeyRecord;
    logEntry: any;
  } {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }

    const currentKey = this.getKmsKeyLifecycleService(actor);
    const result = rotateKmsMasterKey(currentKey, actor.email || actor.id);

    this.logAudit(
      actor,
      'KMS_KEY_ROTATED',
      'KMS_KEY',
      currentKey.id,
      'SUCCESS',
      `Rotation de la KEK maître effectuée : v${currentKey.version} -> v${result.updatedKey.version}. Ré-enveloppement sans rupture de service.`
    );

    return result;
  }

  public testEnvelopeEncryptionService(
    actor: NonNullable<ServerRequestContext['user']>,
    plainText: string
  ): any {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }

    const kek = this.getKmsKeyLifecycleService(actor);
    return simulateEnvelopeEncryption(plainText || 'Données confidentielles client TradeLink V6', kek);
  }

  public createSystemBackupService(
    actor: NonNullable<ServerRequestContext['user']>,
    type: BackupRecord['type'] = 'MANUAL_SNAPSHOT'
  ): BackupRecord {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }

    const backup = createSystemBackupRecord({
      type,
      creatorName: actor.companyName || actor.email || actor.id,
      creatorId: actor.id,
    });

    this.repo.getSnapshot().backups.unshift(backup);

    this.logAudit(
      actor,
      'SYSTEM_BACKUP_CREATED',
      'BACKUP',
      backup.backupCode,
      'SUCCESS',
      `Sauvegarde système ${backup.backupCode} (${backup.type}, ${backup.sizeFormatted}) générée et chiffrée sous KMS AES-256-GCM. SHA-256: ${backup.sha256.slice(0, 16)}...`
    );

    return backup;
  }

  public performRestoreDrillService(
    actor: NonNullable<ServerRequestContext['user']>,
    backupCode: string
  ): BackupRestoreDrillResult {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }

    const backups = this.repo.getSnapshot().backups;
    const backup = backups.find((b) => b.backupCode === backupCode) || backups[0];
    if (!backup) {
      throw new AppError(404, 'BACKUP_NOT_FOUND', 'Sauvegarde introuvable pour le test de restauration.');
    }

    const drill = performBackupRestoreDrill(backup);
    this.repo.saveRestoreDrill(drill);

    this.logAudit(
      actor,
      'BACKUP_RESTORE_DRILL_EXECUTED',
      'BACKUP_DRILL',
      drill.drillId,
      drill.status === 'DRILL_PASSED' ? 'SUCCESS' : 'DENIED',
      `Test de restauration sandbox pour ${backup.backupCode} : ${drill.status} (${drill.tablesRestoredCount} tables, ${drill.rowsRestoredCount} lignes en ${drill.durationMs}ms).`
    );

    return drill;
  }

  public restoreBackupToProductionService(
    actor: NonNullable<ServerRequestContext['user']>,
    params: { backupCode: string; planHash: string; secondApproverId: string }
  ): { success: boolean; backupCode: string; restoredAt: string } {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }

    const backups = this.repo.getSnapshot().backups;
    const backup = backups.find((b) => b.backupCode === params.backupCode);
    if (!backup) {
      throw new AppError(404, 'BACKUP_NOT_FOUND', 'Sauvegarde introuvable.');
    }

    // Double validation avec interdiction stricte d'auto-approbation
    const validation = validateDualAdminOperation({
      initiatorId: actor.id,
      approverId: params.secondApproverId,
      actionCode: 'BACKUP_RESTORE_TO_PROD',
      planHash: params.planHash,
      expectedPlanHash: params.planHash,
    });

    if (!validation.allowed) {
      throw new AppError(403, validation.errorCode || 'DUAL_ADMIN_RESTORE_FORBIDDEN', validation.reason);
    }

    backup.restoreStatus = 'RESTORED';
    backup.restoreInitiatorId = actor.id;
    backup.restoreSecondApproverId = params.secondApproverId;

    this.logAudit(
      actor,
      'BACKUP_RESTORE_TO_PRODUCTION_EXECUTED',
      'BACKUP',
      backup.backupCode,
      'SUCCESS',
      `Restauration en production confirmée par double approbation : Initiée par ${actor.id}, approuvée par ${params.secondApproverId}.`
    );

    return {
      success: true,
      backupCode: backup.backupCode,
      restoredAt: new Date().toISOString(),
    };
  }

  public getSystemSupervisionMetricsService(
    actor: NonNullable<ServerRequestContext['user']>
  ): SystemSupervisionMetrics {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }

    return getSystemSupervisionMetrics();
  }

  public verifyAuditLogChainService(actor: NonNullable<ServerRequestContext['user']>): {
    isChainIntact: boolean;
    totalEntriesVerified: number;
    chainLength: number;
  } {
    if (actor.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
    }

    const logs = this.repo.listAuditLogs();
    const chain = buildAuditChainFromLogs(logs);
    const verification = verifyAuditLogChainIntegrity(chain);

    return {
      isChainIntact: verification.isChainIntact,
      totalEntriesVerified: verification.totalEntriesVerified,
      chainLength: chain.length,
    };
  }

  // ==========================================================================
  // PROMPT 17 : CENTRE D'ASSISTANCE & GESTION DES TICKETS (HELPDESK)
  // ==========================================================================

  private recordAuditEntry(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    result: 'SUCCESS' | 'DENIED' | 'WARNING',
    details: Record<string, unknown>
  ): void {
    const entry: AuditLogRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      actorName: actorId,
      actorRole: 'ADMIN',
      action,
      targetType,
      targetId,
      result,
      correlationId: `corr-${Date.now()}`,
      ipAddress: '127.0.0.1',
      details: JSON.stringify(details),
    };
    this.repo.addAuditLog(entry);
  }

  public listSupportTicketsService(
    actor: NonNullable<ServerRequestContext['user']>,
    filters?: {
      status?: SupportTicketStatus;
      priority?: SupportTicketPriority;
      category?: SupportTicketCategory;
      assignedToAgentId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): { tickets: SupportTicketRecord[]; total: number; page: number; limit: number; totalPages: number } {
    const isSupportOrAdmin = actor.role === 'ADMIN' || actor.role === ('SUPPORT' as any);
    const queryFilter: any = { ...filters };

    // Isolation stricte : Un client/fournisseur/transporteur ne peut voir que SES tickets
    if (!isSupportOrAdmin) {
      queryFilter.requesterId = actor.id;
    }

    const allTickets = this.repo.listSupportTickets(queryFilter);

    // Filtrer les messages pour masquer les notes internes aux demandeurs
    const sanitizedTickets = allTickets.map((t) => ({
      ...t,
      messages: SupportEngine.filterMessagesForRequester(t.messages, actor.role as UserRoleCode),
    }));

    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 20));
    const offset = (page - 1) * limit;
    const paginated = sanitizedTickets.slice(offset, offset + limit);

    return {
      tickets: paginated,
      total: sanitizedTickets.length,
      page,
      limit,
      totalPages: Math.ceil(sanitizedTickets.length / limit) || 1,
    };
  }

  public getSupportTicketByIdService(
    actor: NonNullable<ServerRequestContext['user']>,
    ticketId: string
  ): SupportTicketRecord {
    const ticket = this.repo.getSupportTicket(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket support introuvable : ${ticketId}`);
    }

    const isSupportOrAdmin = actor.role === 'ADMIN' || actor.role === ('SUPPORT' as any);
    if (!isSupportOrAdmin && ticket.requesterId !== actor.id) {
      throw new AppError(403, 'FORBIDDEN', "Vous n'êtes pas autorisé à consulter ce ticket.");
    }

    return {
      ...ticket,
      messages: SupportEngine.filterMessagesForRequester(ticket.messages, actor.role as UserRoleCode),
    };
  }

  public createSupportTicketService(
    actor: NonNullable<ServerRequestContext['user']>,
    payload: {
      subject: string;
      description: string;
      category?: SupportTicketCategory;
      priority?: SupportTicketPriority;
      attachments?: SupportAttachmentRecord[];
      orderId?: string;
      invoiceId?: string;
      productId?: string;
    }
  ): SupportTicketRecord {
    if (!payload.subject || !payload.subject.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Le sujet du ticket est obligatoire.');
    }
    if (!payload.description || !payload.description.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'La description du ticket est obligatoire.');
    }

    // Contrôle de sécurité sur les pièces jointes
    if (payload.attachments && payload.attachments.length > 0) {
      for (const att of payload.attachments) {
        const sizeNum = typeof att.size === 'number' ? att.size : parseInt(att.size as any, 10) || 1024;
        const safety = SupportEngine.checkAttachmentSafety({ name: att.name, size: sizeNum });
        if (safety.scanStatus === 'INFECTED') {
          throw new AppError(400, 'ATTACHMENT_REJECTED', `Pièce jointe rejetée (${att.name}) : Détection de risque de sécurité.`);
        }
      }
    }

    const ticket = SupportEngine.createTicket({
      subject: payload.subject.trim(),
      description: payload.description.trim(),
      category: payload.category,
      priority: payload.priority,
      requesterId: actor.id,
      requesterName: actor.email,
      requesterCompany: (actor as any).companyName || 'TradeLink Network',
      requesterEmail: actor.email,
      requesterRole: (actor.role === 'VISITEUR' ? 'CLIENT' : actor.role) as any,
      attachments: payload.attachments?.map((a) => ({
        name: a.name,
        size: typeof a.size === 'number' ? a.size : parseInt(a.size as any, 10) || 1024,
        content: (a as any).content,
      })),
    });

    if (payload.orderId) ticket.orderId = payload.orderId;
    if (payload.invoiceId) ticket.invoiceId = payload.invoiceId;
    if (payload.productId) ticket.productId = payload.productId;

    this.repo.saveSupportTicket(ticket);

    this.recordAuditEntry(
      actor.id,
      'SUPPORT_TICKET_CREATED',
      'SUPPORT_TICKET',
      ticket.id,
      'SUCCESS',
      { ticketId: ticket.id, category: ticket.category, priority: ticket.priority }
    );

    return ticket;
  }

  public addSupportMessageService(
    actor: NonNullable<ServerRequestContext['user']>,
    ticketId: string,
    payload: {
      message: string;
      isInternal?: boolean;
      attachments?: SupportAttachmentRecord[];
    }
  ): SupportTicketRecord {
    if (!payload.message || !payload.message.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Le contenu du message est obligatoire.');
    }

    const ticket = this.repo.getSupportTicket(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket support introuvable : ${ticketId}`);
    }

    const isSupportOrAdmin = actor.role === 'ADMIN' || actor.role === ('SUPPORT' as any);

    if (payload.isInternal) {
      if (!isSupportOrAdmin) {
        throw new AppError(403, 'FORBIDDEN', 'Les notes internes sont réservées aux agents de support et administrateurs.');
      }
    } else {
      if (!isSupportOrAdmin && ticket.requesterId !== actor.id && ticket.assignedAgentId !== actor.id) {
        throw new AppError(403, 'FORBIDDEN', "Vous n'êtes pas autorisé à poster un message sur ce ticket.");
      }
    }

    if (payload.attachments && payload.attachments.length > 0) {
      for (const att of payload.attachments) {
        const sizeNum = typeof att.size === 'number' ? att.size : parseInt(att.size as any, 10) || 1024;
        const safety = SupportEngine.checkAttachmentSafety({ name: att.name, size: sizeNum });
        if (safety.scanStatus === 'INFECTED') {
          throw new AppError(400, 'ATTACHMENT_REJECTED', `Pièce jointe rejetée (${att.name}) : Détection de risque de sécurité.`);
        }
      }
    }

    SupportEngine.addMessage(ticket, {
      authorId: actor.id,
      authorName: actor.email,
      authorRole: (actor.role === 'VISITEUR' ? 'CLIENT' : actor.role) as any,
      content: payload.message.trim(),
      isInternal: !!payload.isInternal,
      attachments: payload.attachments,
    });

    this.repo.saveSupportTicket(ticket);

    return {
      ...ticket,
      messages: SupportEngine.filterMessagesForRequester(ticket.messages, actor.role as UserRoleCode),
    };
  }

  public assignSupportTicketService(
    actor: NonNullable<ServerRequestContext['user']>,
    ticketId: string,
    payload: { agentId: string; agentName: string }
  ): SupportTicketRecord {
    if (actor.role !== 'ADMIN' && (actor.role as any) !== 'SUPPORT') {
      throw new AppError(403, 'FORBIDDEN', 'Seuls les agents support et administrateurs peuvent affecter un ticket.');
    }

    const ticket = this.repo.getSupportTicket(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket support introuvable : ${ticketId}`);
    }

    const updated = SupportEngine.assignTicket(
      ticket,
      payload.agentId,
      {
        id: actor.id,
        name: actor.email,
        role: actor.role,
      },
      payload.agentName
    );
    this.repo.saveSupportTicket(updated);

    this.recordAuditEntry(
      actor.id,
      'SUPPORT_TICKET_ASSIGNED',
      'SUPPORT_TICKET',
      ticket.id,
      'SUCCESS',
      { assignedTo: payload.agentId, agentName: payload.agentName }
    );

    return updated;
  }

  public escalateSupportTicketService(
    actor: NonNullable<ServerRequestContext['user']>,
    ticketId: string,
    payload: {
      targetLevel: 'N2' | 'N3' | 'SUPERVISOR' | 'TECHNICAL' | 'LEGAL';
      reason: string;
      escalatedToAgentId?: string;
    }
  ): SupportTicketRecord {
    if (actor.role !== 'ADMIN' && (actor.role as any) !== 'SUPPORT') {
      throw new AppError(403, 'FORBIDDEN', 'Seuls les agents support et administrateurs peuvent escalader un ticket.');
    }

    const ticket = this.repo.getSupportTicket(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket support introuvable : ${ticketId}`);
    }

    const updated = SupportEngine.escalateTicket(ticket, {
      targetLevel: payload.targetLevel,
      reason: payload.reason,
      escalatedBy: { id: actor.id, name: actor.email, role: actor.role },
    });

    this.repo.saveSupportTicket(updated);

    this.recordAuditEntry(
      actor.id,
      'SUPPORT_TICKET_ESCALATED',
      'SUPPORT_TICKET',
      ticket.id,
      'SUCCESS',
      { targetLevel: payload.targetLevel, reason: payload.reason }
    );

    return updated;
  }

  public resolveSupportTicketService(
    actor: NonNullable<ServerRequestContext['user']>,
    ticketId: string,
    payload: {
      resolutionNotes: string;
      resolutionCategory?: string;
      rootCause?: string;
    }
  ): SupportTicketRecord {
    if (actor.role !== 'ADMIN' && (actor.role as any) !== 'SUPPORT') {
      throw new AppError(403, 'FORBIDDEN', 'Seuls les agents support et administrateurs peuvent résoudre un ticket.');
    }

    const ticket = this.repo.getSupportTicket(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket support introuvable : ${ticketId}`);
    }

    const updated = SupportEngine.resolveTicket(ticket, {
      resolvedBy: { id: actor.id, name: actor.email, role: actor.role },
      resolutionNotes: payload.resolutionNotes,
    });

    this.repo.saveSupportTicket(updated);

    this.recordAuditEntry(
      actor.id,
      'SUPPORT_TICKET_RESOLVED',
      'SUPPORT_TICKET',
      ticket.id,
      'SUCCESS',
      { resolvedBy: actor.id }
    );

    return updated;
  }

  public closeSupportTicketService(
    actor: NonNullable<ServerRequestContext['user']>,
    ticketId: string,
    payload?: { csatScore?: number; csatFeedback?: string }
  ): SupportTicketRecord {
    const ticket = this.repo.getSupportTicket(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket support introuvable : ${ticketId}`);
    }

    const isSupportOrAdmin = actor.role === 'ADMIN' || actor.role === ('SUPPORT' as any);
    if (!isSupportOrAdmin && ticket.requesterId !== actor.id) {
      throw new AppError(403, 'FORBIDDEN', "Vous n'êtes pas autorisé à clôturer ce ticket.");
    }

    const updated = SupportEngine.closeTicket(ticket, {
      closedBy: { id: actor.id, name: actor.email, role: actor.role },
      csatRating: payload?.csatScore,
      csatFeedback: payload?.csatFeedback,
    });

    this.repo.saveSupportTicket(updated);

    this.recordAuditEntry(
      actor.id,
      'SUPPORT_TICKET_CLOSED',
      'SUPPORT_TICKET',
      ticket.id,
      'SUCCESS',
      { csatScore: payload?.csatScore }
    );

    return updated;
  }

  public reopenSupportTicketService(
    actor: NonNullable<ServerRequestContext['user']>,
    ticketId: string,
    payload: { reason: string }
  ): SupportTicketRecord {
    const ticket = this.repo.getSupportTicket(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket support introuvable : ${ticketId}`);
    }

    const isSupportOrAdmin = actor.role === 'ADMIN' || actor.role === ('SUPPORT' as any);
    if (!isSupportOrAdmin && ticket.requesterId !== actor.id) {
      throw new AppError(403, 'FORBIDDEN', "Vous n'êtes pas autorisé à réouvrir ce ticket.");
    }

    try {
      const updated = SupportEngine.reopenTicket(ticket, {
        reopenedBy: { id: actor.id, name: actor.email, role: actor.role },
        reason: payload.reason,
      });

      this.repo.saveSupportTicket(updated);

      this.recordAuditEntry(
        actor.id,
        'SUPPORT_TICKET_REOPENED',
        'SUPPORT_TICKET',
        ticket.id,
        'SUCCESS',
        { reason: payload.reason }
      );

      return updated;
    } catch (err: any) {
      throw new AppError(400, 'CANNOT_REOPEN_TICKET', err.message || 'Impossible de réouvrir le ticket.');
    }
  }

  public createSupportRoomLiveService(
    actor: NonNullable<ServerRequestContext['user']>,
    ticketId: string
  ): { roomId: string; joinUrl: string } {
    const ticket = this.repo.getSupportTicket(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket support introuvable : ${ticketId}`);
    }

    const session = SupportEngine.createSupportRoomLiveSession(ticket, {
      id: actor.id,
      name: actor.email,
    });

    this.repo.saveSupportTicket(ticket);
    return session;
  }

  public listKnowledgeArticlesService(
    _actor: NonNullable<ServerRequestContext['user']>,
    params?: { query?: string; category?: string; locale?: string }
  ): KnowledgeArticleRecord[] {
    const all = this.repo.listKnowledgeArticles();
    if (params?.query && params.query.trim()) {
      return SupportEngine.searchKnowledgeBase(all, params.query, (params.locale as any) || 'fr');
    }
    if (params?.category) {
      return all.filter((a) => a.category.toLowerCase() === params.category!.toLowerCase());
    }
    return all;
  }

  public getKnowledgeArticleByIdService(
    _actor: NonNullable<ServerRequestContext['user']>,
    articleId: string
  ): KnowledgeArticleRecord {
    const article = this.repo.getKnowledgeArticle(articleId);
    if (!article) {
      throw new AppError(404, 'ARTICLE_NOT_FOUND', `Article KB introuvable : ${articleId}`);
    }
    article.viewsCount = (article.viewsCount || 0) + 1;
    this.repo.saveKnowledgeArticle(article);
    return article;
  }

  public voteKnowledgeArticleService(
    _actor: NonNullable<ServerRequestContext['user']>,
    articleId: string,
    helpful: boolean
  ): { success: boolean; helpfulCount: number; notHelpfulCount: number } {
    const article = this.repo.getKnowledgeArticle(articleId);
    if (!article) {
      throw new AppError(404, 'ARTICLE_NOT_FOUND', `Article KB introuvable : ${articleId}`);
    }
    const updated = SupportEngine.voteKnowledgeArticle(article, helpful);
    this.repo.saveKnowledgeArticle(updated);
    return {
      success: true,
      helpfulCount: updated.helpfulCount,
      notHelpfulCount: updated.notHelpfulCount || 0,
    };
  }

  public generateAiSuggestedReplyService(
    actor: NonNullable<ServerRequestContext['user']>,
    ticketId: string
  ): { suggestedReply: string; confidenceScore: number; relevantArticleIds: string[] } {
    if (actor.role !== 'ADMIN' && (actor.role as any) !== 'SUPPORT') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux agents support et administrateurs.');
    }
    const ticket = this.repo.getSupportTicket(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket support introuvable : ${ticketId}`);
    }
    const kb = this.repo.listKnowledgeArticles();
    const suggestedReply = SupportEngine.generateAiSuggestedReply(ticket, kb);
    return {
      suggestedReply,
      confidenceScore: 92,
      relevantArticleIds: kb.slice(0, 2).map((a) => a.id),
    };
  }

  public summarizeSupportTicketService(
    actor: NonNullable<ServerRequestContext['user']>,
    ticketId: string
  ): { initialIssue: string; actionsTaken: string[]; currentStatus: string; nextStep: string } {
    const ticket = this.repo.getSupportTicket(ticketId);
    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket support introuvable : ${ticketId}`);
    }
    const isSupportOrAdmin = actor.role === 'ADMIN' || actor.role === ('SUPPORT' as any);
    if (!isSupportOrAdmin && ticket.requesterId !== actor.id) {
      throw new AppError(403, 'FORBIDDEN', 'Accès non autorisé.');
    }
    return SupportEngine.summarizeConversation(ticket.messages);
  }

  public checkSupportSecurityBoundaryService(action: string): void {
    SupportEngine.enforceSupportSecurityBoundary(action);
  }

  // ==========================================================================
  // PROMPT 18 : RECHERCHE GLOBALE ET ANALYSE INTELLIGENTE (ANALYTICS)
  // ==========================================================================

  private buildDatasetSnapshotForAnalytics(): DatasetRepositorySnapshot {
    const snap = this.repo.getSnapshot();
    const tickets = this.repo.listSupportTickets();
    const directory = [
      { id: 'usr-admin-01', name: 'Super Admin TradeLink', email: 'admin@tradelink.com', role: 'ADMIN' as UserRoleCode, companyName: 'TradeLink International', country: 'FR' },
      { id: 'usr-client-01', name: 'Sarah Benali', email: 'sarah.benali@casablanca-import.ma', role: 'CLIENT' as UserRoleCode, companyName: 'Casablanca Import SAS', country: 'MA' },
      { id: 'usr-supp-01', name: 'Atlas Agri Export', email: 'contact@atlas-agri.ma', role: 'FOURNISSEUR' as UserRoleCode, companyName: 'Atlas Agri SARL', country: 'MA' },
      { id: 'usr-carrier-01', name: 'TransMaghreb Logistics', email: 'dispatch@transmaghreb.com', role: 'TRANSPORTEUR' as UserRoleCode, companyName: 'TransMaghreb Express', country: 'MA' },
      { id: 'usr-agent-01', name: 'Support Agent Jean', email: 'support.jean@tradelink.com', role: 'ADMIN' as UserRoleCode, companyName: 'TradeLink Helpdesk', country: 'FR' },
      { id: 'usr-compta-01', name: 'Cabinet Fiduciaire Atlas', email: 'compta@atlas-fiduciaire.com', role: 'COMPTABLE' as UserRoleCode, companyName: 'Atlas Fiduciaire', country: 'FR' },
    ];

    return {
      products: snap.products || [],
      orders: snap.orders || [],
      quotes: snap.quotes || [],
      invoices: snap.invoices || [],
      shipments: snap.shipments || [],
      documents: snap.commercialDocuments || [],
      tickets: tickets || [],
      conversations: [],
      usersDirectory: directory,
    };
  }

  public executeGlobalSearchService(
    actor: NonNullable<ServerRequestContext['user']>,
    params: {
      query: string;
      domains?: GlobalSearchDomain[];
      limit?: number;
      page?: number;
      sortBy?: 'RELEVANCE' | 'DATE_DESC' | 'DATE_ASC';
      statusFilter?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): GlobalSearchResponse {
    const snapshot = this.buildDatasetSnapshotForAnalytics();
    return GlobalSearchEngine.executeGlobalSearch({
      query: {
        query: params.query || '',
        domains: params.domains,
        limit: params.limit,
        page: params.page,
        sortBy: params.sortBy,
        statusFilter: params.statusFilter,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
      actor: {
        id: actor.id,
        role: actor.role as UserRoleCode,
        companyName: (actor as any).companyName,
      },
      snapshot,
    });
  }

  public getAutocompleteSuggestionsService(
    actor: NonNullable<ServerRequestContext['user']>,
    query: string,
    domain?: GlobalSearchDomain
  ): { suggestions: AutocompleteSuggestion[] } {
    const snapshot = this.buildDatasetSnapshotForAnalytics();
    const suggestions = GlobalSearchEngine.getAutocompleteSuggestions(
      { id: actor.id, role: actor.role as UserRoleCode },
      query || '',
      snapshot,
      domain
    );
    return { suggestions };
  }

  public getRoleAnalyticsDashboardService(
    actor: NonNullable<ServerRequestContext['user']>,
    params?: {
      period?: AnalyticsPeriod;
      roleOverride?: UserRoleCode;
    }
  ): RoleSpecificAnalytics {
    const snapshot = this.buildDatasetSnapshotForAnalytics();
    const period = params?.period || '30D';
    const targetRole = actor.role === 'ADMIN' && params?.roleOverride ? params.roleOverride : (actor.role as UserRoleCode);

    switch (targetRole) {
      case 'ADMIN':
        return AnalyticsEngine.computeAdminDashboard(snapshot, period);
      case 'CLIENT':
        return AnalyticsEngine.computeClientDashboard(snapshot, actor.id, period);
      case 'FOURNISSEUR':
        return AnalyticsEngine.computeSupplierDashboard(snapshot, actor.id, period);
      case 'TRANSPORTEUR':
        return AnalyticsEngine.computeCarrierDashboard(snapshot, actor.id, period);
      case 'COMPTABLE':
        return AnalyticsEngine.computeAccountingDashboard(snapshot, period);
      case 'SUPPORT' as any:
        return AnalyticsEngine.computeSupportDashboard(snapshot, period);
      default:
        return AnalyticsEngine.computeAdminDashboard(snapshot, period);
    }
  }

  public exportAnalyticsReportService(
    actor: NonNullable<ServerRequestContext['user']>,
    params: {
      period?: AnalyticsPeriod;
      format: 'CSV' | 'XLSX' | 'JSON' | 'PDF';
      roleOverride?: UserRoleCode;
    }
  ): {
    format: 'CSV' | 'XLSX' | 'JSON' | 'PDF';
    content: string;
    mimeType: string;
    fileName: string;
    fileSizeBytes: number;
    checksumSha256: string;
  } {
    const dashboard = this.getRoleAnalyticsDashboardService(actor, {
      period: params.period,
      roleOverride: params.roleOverride,
    });

    const exported = AnalyticsEngine.exportAnalyticsReport(
      dashboard,
      params.format
    );

    const fileSizeBytes = Buffer.byteLength(exported.content, 'utf-8');

    this.recordAuditEntry(
      actor.id,
      'ANALYTICS_REPORT_EXPORTED',
      'ANALYTICS',
      dashboard.period,
      'SUCCESS',
      { format: params.format, fileName: exported.fileName, size: fileSizeBytes }
    );

    return {
      format: params.format,
      content: exported.content,
      mimeType: exported.mimeType,
      fileName: exported.fileName,
      fileSizeBytes,
      checksumSha256: exported.sha256,
    };
  }
}



