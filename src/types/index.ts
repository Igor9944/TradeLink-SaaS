// ============================================================================
// TRADELINK V6.0 — TYPESCRIPT DOMAIN & ARCHITECTURE TYPES
// ============================================================================

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
  | 'PENDING_SUBMISSION'
  | 'SUBMITTED_IN_TIME_PENDING_REVIEW'
  | 'COMPLEMENT_REQUESTED'
  | 'VALIDATED'
  | 'REJECTED'
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
  reactivatedAt?: string;
  reactivatedBy?: string;
  remindersSent: string[];
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


