// ============================================================================
// TRADELINK V6.0 — TYPESCRIPT DOMAIN & ARCHITECTURE TYPES
// ============================================================================

import type {
  RagSourceCitation,
  VoiceLanguage,
  OcrExtractedField,
  OcrTableLineItem,
  OcrDynamicField,
  OcrCorrectionLog,
} from '../services/aiIntelligenceEngine';

export type Locale = 'fr' | 'en' | 'ar';
export type ThemeMode = 'system' | 'light' | 'dark';

export type UserRoleCode =
  | 'VISITEUR'
  | 'ADMIN'
  | 'CLIENT'
  | 'FOURNISSEUR'
  | 'TRANSPORTEUR'
  | 'COMPTABLE'
  | 'SUPPORT';

export type Icon3DName =
  | 'delivery-van'
  | 'scooter'
  | 'air-freight'
  | 'sea-freight'
  | 'drone'
  | 'container'
  | 'rail-freight'
  | 'parcel-stack'
  | 'pallet-load'
  | 'fragile'
  | 'cold-chain'
  | 'returns'
  | 'warehouse'
  | 'forklift'
  | 'hand-truck'
  | 'conveyor'
  | 'mailbox'
  | 'location-pin'
  | 'live-tracking'
  | 'global-reach'
  | 'route-map'
  | 'scanner'
  | 'checklist'
  | 'weight-check'
  | 'courier-helmet'
  | 'handover'
  | 'courier-bag'
  | 'fast-delivery'
  | 'insured'
  | 'support'
  | 'semi-truck'
  | 'cargo-bike'
  | 'shelving-rack'
  | 'warehouse-robot'
  | 'gantry-crane'
  | 'parcel-locker'
  | 'secure-parcel'
  | 'eco-delivery'
  | 'hazardous-goods'
  | 'temperature'
  | 'invoice'
  | 'customs-stamp'
  | 'proof-of-delivery'
  | 'shipping-label'
  | 'analytics'
  | 'scheduled-drop'
  | 'payment'
  | 'fuel'
  | 'fleet-keys'
  | 'doorstep-drop';

export type KYCStatus =
  // 8 États canoniques TRADELINK V6.0
  | 'NON_COMMENCE'
  | 'EN_COURS'
  | 'DOCUMENTS_SOUMIS'
  | 'EN_VERIFICATION'
  | 'COMPLEMENT_DEMANDE'
  | 'VALIDE'
  | 'REJETE'
  | 'SUSPENDU'
  // Alias anglais & compatibilité historique
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PENDING_SUBMISSION'
  | 'DOCUMENTS_SUBMITTED'
  | 'SUBMITTED_IN_TIME_PENDING_REVIEW'
  | 'UNDER_REVIEW'
  | 'COMPLEMENT_REQUESTED'
  | 'VALIDATED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'SUSPENDED_J7'
  | 'SUSPENDED_J7_UNSUBMITTED';

export interface KYCDocumentItem {
  id: string;
  docType:
    | 'CIN'
    | 'PATENTE'
    | 'RNE'
    | 'PERMIS'
    | 'CARTE_GRISE'
    | 'ASSURANCE'
    | 'CIN_DIRIGEANT'
    | 'PATENTE_FISCAL'
    | 'RNE_KBIS'
    | 'RIB_ATTESTATION'
    | 'RNE_HANDELSREGISTER'
    | 'TVA_FISCAL_CERT'
    | 'ISO_GDP_CERT'
    | 'RIB_SWIFT_EXPORT'
    | 'LICENCE_TRANSPORT_INT'
    | 'PERMIS_CE_CARTE_GRISE'
    | 'ASSURANCE_MARCHANDISE_CMR'
    | 'CERTIFICAT_ATP_FRIGO'
    | string;
  label: string;
  fileName: string;
  uploadedAt: string;
  sha256: string;
  encryptionKeyId: string;
  status: 'UPLOADED' | 'VALIDATED' | 'REJECTED' | 'COMPLEMENT_NEEDED';
  rejectionComment?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  encryptedVaultUri?: string;
  ivHex?: string;
  authTagHex?: string;
  virusScanStatus?: 'CLEAN' | 'QUARANTINED';
}

export interface KYCDecisionHistoryRecord {
  id: string;
  kycId: string;
  adminUserId: string;
  adminEmail: string;
  action: 'VALIDATE' | 'REJECT' | 'REQUEST_COMPLEMENT' | 'REACTIVATE';
  reason?: string;
  complementDocs?: string[];
  createdAt: string;
}

export interface KYCJurisdictionConfigRecord {
  id: string;
  countryCode: string;
  countryName: string;
  currency: string;
  requiredDocs: string[];
  optionalDocs: string[];
  gracePeriodDays: number;
  isActive: boolean;
  updatedAt?: string;
}

export interface KYCReminderLogRecord {
  id: string;
  kycId: string;
  userId: string;
  milestone: 'J+1' | 'J+3' | 'J+5' | 'J+6' | 'J+7';
  channel: 'EMAIL' | 'SMS' | 'IN_APP';
  status: 'SENT' | 'FAILED';
  errorMessage?: string;
  sentAt: string;
}

export interface KYCPresignedUrlResponse {
  url: string;
  s3ObjectKey: string;
  docType: string;
  fileName: string;
  expiresInSeconds: number;
  expiresAt: string;
  issuedAt: string;
  signatureSha256: string;
}

export interface KYCDossier {
  id: string;
  userId: string;
  userName: string;
  companyName: string;
  actorType: 'CLIENT' | 'FOURNISSEUR' | 'TRANSPORTEUR';
  jurisdiction: string;
  status: KYCStatus;
  startedAt: string;
  deadlineAt: string;
  daysElapsed: number;
  daysRemaining: number;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  complementReason?: string;
  complementRequestedDocs?: string[];
  reactivatedAt?: string;
  reactivatedBy?: string;
  remindersSent: string[];
  // Coordonnées et profil juridique d'entreprise
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
  documents: KYCDocumentItem[];
  adminComments?: {
    id: string;
    authorEmail: string;
    authorName: string;
    createdAt: string;
    comment: string;
    targetDocType?: string;
    visibility: 'INTERNAL_ADMIN_ONLY' | 'SHARED_WITH_APPLICANT';
  }[];
  history?: {
    id: string;
    timestamp: string;
    actorName: string;
    actorRole: string;
    action: string;
    summary: string;
  }[];
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  companyName: string;
  role: UserRoleCode;
  permissions: string[];
  mfaEnabled: boolean;
  mfaVerified: boolean;
  activeSessionId: string;
  previousSessionRevoked?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  kycStatus: KYCStatus;
  kycDaysRemaining: number;
  jurisdiction: string;
  avatarInitials: string;
  delegatedRoomIds?: string[]; // Ponctuel uniquement pour un Client hôte délégué
}

export interface ProductItem {
  id: string;
  sku: string;
  supplierId: string;
  supplierName: string;
  category: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  unitPrice: string; // Decimal string
  currency: string;
  taxRate: string;
  unit: string;
  stockAvailable: number;
  stockReserved: number;
  minStockAlert: number;
  icon3d: Icon3DName;
  originCountry: string;
  incoterm: string;
  leadTimeDays: number;
  isPublished: boolean;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
}

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'REFUSED'
  | 'CANCELLED';

export interface OrderRecord {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  supplierId: string;
  supplierName: string;
  carrierId?: string;
  carrierName?: string;
  status: OrderStatus;
  subtotalAmount: string;
  taxAmount: string;
  shippingAmount: string;
  totalAmount: string;
  currency: string;
  shippingAddress: string;
  createdAt: string;
  items: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: string;
    totalLine: string;
    icon3d: Icon3DName;
  }[];
  timeline: {
    step: string;
    timestamp: string;
    actor: string;
    completed: boolean;
  }[];
  authorizedRoomId?: string;
}

export interface QuoteRecord {
  id: string;
  quoteNumber: string;
  clientId: string;
  clientName: string;
  supplierId: string;
  supplierName: string;
  status: 'DRAFT' | 'SENT' | 'RESPONDED' | 'ACCEPTED' | 'CONVERTED' | 'REFUSED';
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  amountInWords: string;
  validUntil: string;
  createdAt: string;
  lines: {
    description: string;
    quantity: number;
    unitPrice: string;
    discountPct: string;
    totalLine: string;
  }[];
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  supplierId: string;
  supplierName: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  jurisdiction: string;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
}

export interface PaymentRecord {
  id: string;
  paymentReference: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  supplierId: string;
  provider: 'STRIPE' | 'WIRE_TRANSFER' | 'LETTER_OF_CREDIT';
  amount: string;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  webhookEventId: string;
  idempotencyVerified: boolean;
  reconciled: boolean;
  createdAt: string;
}

export type ShipmentStatus =
  | 'TO_ASSIGN'
  | 'ACCEPTED'
  | 'COLLECTED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED';

export interface ShipmentRecord {
  id: string;
  trackingNumber: string;
  orderId: string;
  orderNumber: string;
  clientId: string;
  carrierId: string;
  carrierName: string;
  transportMode: 'ROAD' | 'AIR' | 'SEA' | 'RAIL';
  icon3d: Icon3DName;
  origin: string;
  destination: string;
  status: ShipmentStatus;
  weightKg: string;
  volumeM3: string;
  palletsCount: number;
  estimatedArrival: string;
  podSigned: boolean;
  podTimestamp?: string;
  customsCleared: boolean;
}

export interface IncidentRecord {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  carrierId: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  reportedAt: string;
}

export type DayCountBasis = 'ACT/365' | 'ACT/360' | 'ACT/ACT';

export interface CalculationResultRecord {
  id: string;
  ruleVersion: string;
  principal: string;
  annualRatePct: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  basis: DayCountBasis;
  annualDivisor: number;
  isLeapYearDetected: boolean;
  interestAmount: string;
  totalAmount: string;
  currency: string;
  executedBy: string;
  executedAt: string;
}

export interface RoomLiveRecord {
  id: string;
  roomCode: string;
  title: string;
  createdById: string;
  creatorName: string;
  creatorRole: UserRoleCode;
  delegatedClientHostId?: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  scheduledAt: string;
  participantsCount: number;
  allowedUserIds: string[];
  recordingConsent: boolean;
  aiSummaryAvailable: boolean;
  aiSummary?: {
    summary: string;
    decisions: string[];
    actionItems: string[];
  };
}

export interface ImportJobRecord {
  id: string;
  fileName: string;
  format: 'SQL' | 'BAK' | 'DBF' | 'CDX' | 'CSV' | 'XLSX' | 'JSON';
  sha256Checksum: string;
  avScanStatus: 'CLEAN' | 'QUARANTINED';
  sandboxStatus:
    | 'ISOLATED_ANALYZING'
    | 'SANDBOX_READY'
    | 'PENDING_SECOND_ADMIN'
    | 'PROMOTED_DOUBLE_APPROVED'
    | 'REJECTED';
  rowsDetected: number;
  tablesDetected: string[];
  compatibilityScore: number;
  initiatedBy: string;
  firstAdminApprover?: string;
  secondAdminApprover?: string;
  createdAt: string;
}

export interface BackupRecord {
  id: string;
  backupCode: string;
  type: 'FULL_SCHEDULED' | 'MANUAL_SNAPSHOT' | 'PRE_MIGRATION';
  sizeFormatted: string;
  encryptionKeyAlias: string;
  sha256: string;
  status: 'VERIFIED' | 'IN_PROGRESS';
  restoreStatus: 'NONE' | 'PENDING_SECOND_APPROVAL' | 'APPROVED_READY' | 'RESTORED';
  restoreInitiatorId?: string;
  restoreInitiatorName?: string;
  restoreSecondApproverId?: string;
  restoreSecondApproverName?: string;
  planHash?: string;
  createdAt: string;
}

export interface KMSKeyRecord {
  id: string;
  keyAlias: string;
  keyType: 'KEK_MASTER' | 'DEK_ENVELOPE';
  algorithm: 'AES-256-GCM';
  kmsProvider: 'HASHICORP_VAULT_KMS' | 'AWS_KMS_HSM';
  keyArnMasked: string; // Métadonnées uniquement, aucun secret brut !
  version: number;
  status: 'ACTIVE' | 'ROTATING' | 'ARCHIVED';
  lastRotatedAt: string;
  nextRotationAt: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRoleCode;
  action: string;
  targetType: string;
  targetId: string;
  result: 'SUCCESS' | 'DENIED' | 'WARNING';
  correlationId: string;
  ipAddress: string;
  details: string;
}

export interface FloatingButtonItem {
  id: string;
  code: 'WHATSAPP' | 'AI_ASSISTANT' | 'VOICE_DICTATION' | 'LIVE_SUPPORT';
  label: Record<Locale, string>;
  icon3d: Icon3DName;
  position: 'BOTTOM_RIGHT' | 'BOTTOM_LEFT';
  displayOrder: number;
  isEnabled: boolean;
  requiresConsent: boolean;
}

// ============================================================================
// RÉ-EXPORTS INTELLIGENCE ARTIFICIELLE, OCR/IDP, DICTÉE & ROOM LIVE (PROMPT 10)
// ============================================================================
export type {
  AiProvider,
  AiModelConfig,
  RagSourceCitation,
  AiChatMessage,
  AiConversationThread,
  AiQuotaState,
  OcrExtractedField,
  OcrTableLineItem,
  OcrDynamicField,
  OcrCorrectionLog,
  OcrDocumentRecord,
  VoiceLanguage,
  VoiceLanguageMeta,
  RoomParticipantState,
  LiveRoomChatLine,
  LiveSubtitleLine,
  RoomLiveSessionState,
} from '../services/aiIntelligenceEngine';

// ============================================================================
// RÉ-EXPORTS ADMINISTRATION AVANCÉE, IMPORTS, KMS & SANDBOX (PROMPT 11)
// ============================================================================
export type {
  ImportExportFormat,
  FieldMappingDetail,
  SandboxDetectedTable,
  SandboxDetectedError,
  SandboxAnalysisReport,
  KmsOperationEntry,
  AuditLogChainEntry,
  EnvelopeCipherResult,
} from '../services/adminAdvancedEngine';

// ============================================================================
// TYPES MOTEUR CENTRAL DE TRADUCTION AUTOMATIQUE IA (FR / EN / AR)
// ============================================================================

export type SupportedLocale = 'fr' | 'en' | 'ar';

export type TranslationEntityType =
  | 'PRODUCT'
  | 'MESSAGE'
  | 'DOCUMENT'
  | 'TICKET'
  | 'ROOM_SPEECH'
  | 'SYSTEM';

export type TranslationStatus =
  | 'PENDING'
  | 'TRANSLATED'
  | 'VERIFIED_BY_USER'
  | 'ERROR';

export interface UserLanguagePreferenceRecord {
  id: string;
  userId: string;
  preferredLocale: SupportedLocale;
  notificationLocale: SupportedLocale;
  communicationLocale: SupportedLocale;
  autoTranslateMessages: boolean;
  displayOriginalByDefault: boolean;
  rtlEnabled: boolean;
  updatedAt: string;
}

export interface TranslationRecord {
  id: string;
  entityType: TranslationEntityType;
  entityId: string;
  field: string;
  sourceLang: SupportedLocale;
  targetLang: SupportedLocale;
  originalText: string;
  translatedText: string;
  status: TranslationStatus;
  engineVersion: string;
  confidenceScore: number;
  isInformativeOnly: boolean;
  glossaryApplied: boolean;
  contentHashSha256: string;
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface TranslationGlossaryTerm {
  id: string;
  termKey: string;
  category: 'COMMERCIAL' | 'LOGISTIQUE' | 'FINANCE' | 'DOUANE' | 'INCOTERMS' | 'JURIDIQUE';
  sourceTextFr: string;
  targetTextEn: string;
  targetTextAr: string;
  isStrict: boolean;
  contextNotes?: string;
}

export interface LanguageDetectionResult {
  detectedLang: SupportedLocale | 'unknown';
  confidence: number;
  isRtl: boolean;
  sampleSnippets?: string[];
}

export interface TranslatedMessageBubbleState {
  originalText: string;
  sourceLang: SupportedLocale;
  translatedText: string;
  targetLang: SupportedLocale;
  isShowingOriginal: boolean;
  translatedAt: string;
  engineVersion: string;
}

// ============================================================================
// MODÈLES AUTHENTIFICATION, GESTION DES SESSIONS & SÉCURITÉ (PROMPT 01)
// ============================================================================

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  sessionId: string;
  tokenHash: string;
  family: string;
  isRevoked: boolean;
  revokedAt?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface MFAConfigurationRecord {
  id: string;
  userId: string;
  secretEncrypted: string;
  algorithm: string;
  digits: number;
  periodSeconds: number;
  isVerified: boolean;
  verifiedAt?: string | null;
  backupCodes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginAttemptRecord {
  id: string;
  userId?: string | null;
  emailAttempted: string;
  ipAddress: string;
  userAgent: string;
  isSuccess: boolean;
  failureReason?: string | null;
  correlationId: string;
  attemptedAt: string;
}

export interface AuthSessionDetail {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  deviceName?: string;
  os?: string;
  browser?: string;
  isCurrent: boolean;
  isRevoked: boolean;
  revokedReason?: string | null;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  companyName: string;
  taxId?: string;
  businessAddress?: string;
  city?: string;
  postalCode?: string;
  country: string;
  requestedRole: 'CLIENT' | 'FOURNISSEUR' | 'TRANSPORTEUR' | 'ADMIN';
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export interface SmartRedirectInfo {
  targetPath: string;
  role: UserRoleCode;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'PENDING_MFA' | 'PENDING_KYC';
  reason?: string;
  kycDaysRemaining?: number;
}

// ============================================================================
// PROMPT 03 — ASSISTANT IA FLOTTANT (AI COPILOT) TYPES DÉDIÉS
// ============================================================================

export type CopilotAssistedActionType =
  | 'NAVIGATE'
  | 'PREFILL_FORM'
  | 'PREPARE_QUOTE_RESPONSE'
  | 'SUMMARIZE_ORDER'
  | 'PREFILL_PRODUCT'
  | 'CREATE_SUPPORT_TICKET'
  | 'CALCULATE_FINANCE'
  | 'BLOCKED_SENSITIVE_ACTION';

export interface CopilotAssistedAction {
  id: string;
  type: CopilotAssistedActionType;
  title: string;
  description: string;
  targetPath?: string;
  payload: Record<string, any>;
  requiresConfirmation: boolean;
  isCritical: boolean; // Si true (paiement, suppression, validation admin), strictement bloqué !
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXECUTED' | 'BLOCKED_BY_GUARDRAIL';
}

export interface CopilotAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  summary?: string;
}

export interface CopilotMessage {
  id: string;
  threadId: string;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM';
  text: string;
  timestamp: string;
  ragSources?: RagSourceCitation[];
  tokensUsed?: number;
  modelUsed?: string;
  isFiltered?: boolean;
  attachments?: CopilotAttachment[];
  assistedAction?: CopilotAssistedAction;
}

export interface CopilotConversationThread {
  id: string;
  title: string;
  userId: string;
  userRole: UserRoleCode;
  currentPath?: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  messages: CopilotMessage[];
  totalTokensConsumed: number;
  isPinned?: boolean;
}

export interface CopilotContextState {
  currentPath: string;
  activeRole: UserRoleCode;
  locale: Locale;
  pageTitle?: string;
  companyName?: string;
  entityContext?: { type: string; id: string; data?: any };
}

export interface CopilotChatRequestPayload {
  message: string;
  threadId?: string;
  modelId?: string;
  context?: CopilotContextState;
  attachments?: CopilotAttachment[];
}

export interface CopilotExecuteActionPayload {
  actionId: string;
  threadId: string;
  confirmed: boolean;
  actionPayload: Record<string, any>;
}

// ============================================================================
// TYPES SYSTÈME DE DICTÉE VOCALE INTELLIGENTE (PROMPT 04)
// ============================================================================

export type VoiceDictationStatus = 'IDLE' | 'REQUESTING_PERMISSION' | 'LISTENING' | 'PROCESSING' | 'ERROR' | 'SUCCESS';

export interface VoiceInteractionRecord {
  id: string;
  userId: string;
  locale: VoiceLanguage;
  durationSeconds: number;
  intentDetected?: string | null;
  transcriptSnippet?: string;
  consentGranted: boolean;
  confidenceScore: number;
  createdAt: string;
}

export interface VoiceConsentPayload {
  userId?: string;
  granted: boolean;
  purpose?: string;
}

export interface VoiceConsentState {
  userId: string;
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
  storageRetentionPolicy: 'ZERO_RETENTION_RAM_ONLY';
}

export interface VoiceTranscribePayload {
  audioBase64?: string;
  mimeType?: string;
  language: VoiceLanguage;
  durationSeconds: number;
  consentGranted: boolean;
  autoFormatPunctuation?: boolean;
  targetField?: string;
}

export interface VoiceTranscribeResponse {
  success: boolean;
  transcript: string;
  rawTranscript: string;
  language: VoiceLanguage;
  durationSeconds: number;
  confidence: number;
  punctuationsApplied: number;
  interactionId: string;
  zeroRetentionEnforced: true;
}

export interface VoicePunctuationCommand {
  keyword: string;
  replacement: string;
  language: VoiceLanguage;
  description: string;
}

// ============================================================================
// TYPES SYSTÈME OCR & INTELLIGENCE DOCUMENTAIRE (PROMPT 05)
// ============================================================================

export type OcrDocumentProfile =
  | 'KYC'
  | 'INVOICE'
  | 'QUOTE'
  | 'PURCHASE_ORDER'
  | 'DELIVERY_NOTE'
  | 'TRANSPORT_CMR'
  | 'ACCOUNTING';

export type OcrProcessingStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'EXTRACTED_PENDING_REVIEW'
  | 'VALIDATED'
  | 'REJECTED'
  | 'FAILED';

export interface OcrDocumentDetail {
  id: string;
  fileName: string;
  fileSize: number;
  fileSizeFormatted?: string;
  fileType?: 'PDF' | 'IMAGE';
  mimeType: string;
  profile: OcrDocumentProfile;
  status: 'EXTRACTED' | 'VALIDATED' | 'REJECTED' | OcrProcessingStatus;
  processingStatus: OcrProcessingStatus;
  contentHash: string;
  sha256Hash: string;
  previewUrl: string;
  presignedUrl?: string;
  presignedUrlExpiresAt?: string;
  rawText: string;
  extractedText: string;
  detectedLanguage: 'fr' | 'en' | 'ar' | 'mixed';
  globalConfidence: number;
  uncertainFields: string[];
  fields: OcrExtractedField[];
  extractedFields: OcrExtractedField[];
  lineItems: OcrTableLineItem[];
  dynamicFields: OcrDynamicField[];
  corrections: OcrCorrectionLog[];
  correctionsLog: OcrCorrectionLog[];
  validationMetadata?: {
    validatedBy?: string;
    validatedAt?: string;
    humanReviewCompleted: boolean;
    reviewNotes?: string;
  };
  validatedBy?: string;
  validatedAt?: string;
  uploadedById: string;
  uploadedByName?: string;
  rejectionReason?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface OcrQueueJob {
  id: string;
  documentId: string;
  profile: OcrDocumentProfile;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progressPercentage: number;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface OcrUploadPayload {
  fileName: string;
  fileBytesBase64?: string;
  base64Data?: string;
  fileSize?: number;
  fileSizeBytes?: number;
  mimeType: string;
  profile: OcrDocumentProfile;
  targetLanguage?: 'fr' | 'en' | 'ar';
  languagePreference?: 'fr' | 'en' | 'ar';
}

export interface OcrFieldCorrectionPayload {
  fieldKey: string;
  newValue: string;
  reason?: string;
}

export interface OcrValidationPayload {
  documentId?: string;
  validatorUserId?: string;
  validatorName?: string;
  reviewNotes?: string;
  approvedAt?: string;
  confirmedFields?: Record<string, string>;
  notes?: string;
}




