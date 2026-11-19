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
  avatarUrl?: string;
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

export type ProductStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'SUSPENDED';

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>; // e.g. { "Conditionnement": "Carton 10kg", "Calibre": "Catégorie 1" }
  priceDelta: string; // e.g. "+5.00" or "-2.50" or "0.00"
  stockAvailable: number;
  isDefault?: boolean;
}

export interface ProductSpecification {
  key: string;
  value: string;
  category?: string; // e.g. "Technique", "Dimensions", "Normes & Certifications"
}

export interface ProductCategoryRecord {
  id: string;
  code: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  parentCategoryId?: string;
  icon3d: Icon3DName;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  subcategories?: ProductCategoryRecord[];
}

export interface ProductItem {
  id: string;
  sku: string;
  supplierId: string;
  supplierName: string;
  category: string;
  categoryId?: string;
  subcategory?: string;
  subcategoryId?: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  unitPrice: string; // Decimal string
  currency: string;
  taxRate: string;
  unit: string;
  stockAvailable: number;
  stockReserved: number;
  stockOrdered?: number;
  stockShipped?: number;
  minStockAlert: number;
  warehouseLocation?: string;
  minOrderQuantity?: number; // MOQ (Minimum Order Quantity)
  icon3d: Icon3DName;
  photos?: string[];
  gallery?: string[];
  specifications?: ProductSpecification[];
  variants?: ProductVariant[];
  originCountry: string;
  incoterm: string;
  leadTimeDays: number;
  isPublished: boolean;
  status?: ProductStatus;
  isReported?: boolean;
  reportReason?: string;
  adminRejectionReason?: string;
  supplierCountry?: string;
  supplierRating?: number;
  supplierKycStatus?: string;
  originalLanguage?: Locale;
  isAutoTranslated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
  unitPriceOverride?: string;
  notes?: string;
}

export interface VerifiedCartItem {
  productId: string;
  sku: string;
  name: string;
  requestedQuantity: number;
  availableStock: number;
  minOrderQuantity: number;
  unitPrice: string;
  lineTotal: string;
  currency: string;
  isAvailable: boolean;
  status: 'IN_STOCK' | 'PARTIAL_STOCK' | 'OUT_OF_STOCK' | 'PRICE_UPDATED' | 'BELOW_MOQ';
  warningMessage?: string;
}

export interface CartValidationResult {
  valid: boolean;
  hasUnavailableItems: boolean;
  unavailableCount: number;
  items: VerifiedCartItem[];
  subtotalAmount: string;
  taxRatePct: string;
  taxAmount: string;
  shippingAmount: string;
  totalAmount: string;
  currency: string;
  warnings: string[];
}

// ============================================================================
// TYPES GESTION DES STOCKS, DISPONIBILITÉS ET RÉSERVATIONS (PROMPT 10)
// ============================================================================

export type StockMovementType =
  | 'INBOUND_RECEIPT'      // Entrée de stock / Réception fournisseur / Bon de livraison
  | 'OUTBOUND_SHIPMENT'    // Sortie définitive lors de l'expédition
  | 'ORDER_RESERVATION'    // Réservation serveur lors de l'engagement de commande
  | 'RESERVATION_RELEASE'  // Libération de réservation (annulation / expiration TTL)
  | 'INVENTORY_ADJUSTMENT' // Ajustement suite à inventaire ou écart physique
  | 'SCRAP_OR_LOSS'        // Sortie pour casse, dépréciation, perte
  | 'CUSTOMER_RETURN';     // Réintégration suite à retour marchandise

export interface StockMovementRecord {
  id: string;
  movementNumber: string;
  productId: string;
  sku: string;
  movementType: StockMovementType;
  quantityChange: number;
  resultingAvailable: number;
  resultingReserved: number;
  resultingOrdered?: number;
  resultingShipped?: number;
  reason: string;
  referenceDocument?: string; // N° Commande, Facture, Bon de livraison, Fiche d'inventaire
  orderId?: string;
  orderNumber?: string;
  batchNumber?: string;
  inventorySessionId?: string;
  performedByUserId: string;
  performedByUserName: string;
  performedByUserRole?: UserRoleCode;
  timestamp: string;
  minStockAlertTriggered: boolean;
}

export interface StockReservationRecord {
  id: string;
  reservationNumber: string;
  orderId: string;
  orderNumber?: string;
  clientId: string;
  clientName?: string;
  productId: string;
  sku: string;
  quantity: number;
  reservedAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
  releasedAt?: string;
  fulfilledAt?: string;
  notes?: string;
}

export interface PhysicalInventoryLine {
  productId: string;
  sku: string;
  productName: string;
  theoreticalAvailable: number;
  physicalCounted: number;
  varianceQuantity: number;
  unitPrice: string;
  varianceValueEur: string;
  reconciled: boolean;
  notes?: string;
}

export interface PhysicalInventorySession {
  id: string;
  sessionNumber: string;
  supplierId: string;
  supplierName: string;
  title: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt: string;
  completedAt?: string;
  conductedByUserId: string;
  conductedByUserName: string;
  lines: PhysicalInventoryLine[];
  totalTheoreticalQty: number;
  totalPhysicalQty: number;
  totalVarianceQty: number;
  totalVarianceValueEur: string;
  notes?: string;
}

export interface StockAlertRecord {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  supplierId: string;
  stockAvailable: number;
  minStockAlert: number;
  severity: 'WARNING_LOW' | 'CRITICAL_OUT';
  triggeredAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface StockValuationReport {
  supplierId?: string;
  totalReferencesCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalAvailableUnits: number;
  totalReservedUnits: number;
  totalOrderedUnits: number;
  totalShippedUnits: number;
  totalAvailableValueEur: string;
  totalReservedValueEur: string;
  turnoverRatioAnnualEstimate: string;
  topMovingProducts: {
    productId: string;
    sku: string;
    name: string;
    totalMoved: number;
    totalShipped: number;
  }[];
}

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PENDING_VALIDATION'
  | 'ACCEPTED'
  | 'CONFIRMED'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PREPARING'
  | 'IN_PREPARATION'
  | 'READY_FOR_PICKUP'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REFUSED'
  | 'CANCELLED'
  | 'DISPUTED';

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
    note?: string;
  }[];
  quoteId?: string;
  quoteNumber?: string;
  paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
  paidAmount?: string;
  paymentMethod?: string;
  disputeId?: string;
  cancellationReason?: string;
  trackingNumber?: string;
  authorizedRoomId?: string;
}

export type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'RFQ_SUBMITTED'
  | 'RESPONDED'
  | 'QUOTATION_ISSUED'
  | 'ACCEPTED'
  | 'CONVERTED'
  | 'REFUSED'
  | 'REJECTED';

export interface QuoteRecord {
  id: string;
  quoteNumber: string;
  clientId: string;
  clientName: string;
  supplierId: string;
  supplierName: string;
  status: QuoteStatus;
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
    productId?: string;
    targetPrice?: string;
  }[];
  incoterm?: string;
  paymentTerms?: string;
  specialInstructions?: string;
  supplierNotes?: string;
  rejectionReason?: string;
  orderId?: string;
  orderNumber?: string;
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

export type PaymentProvider =
  | 'STRIPE'
  | 'KONNECT'
  | 'FLOUCI'
  | 'CMI'
  | 'WIRE_TRANSFER'
  | 'LETTER_OF_CREDIT';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface PaymentRecord {
  id: string;
  paymentReference: string;
  invoiceId: string;
  invoiceNumber: string;
  orderId?: string;
  orderNumber?: string;
  clientId: string;
  supplierId: string;
  provider: PaymentProvider;
  amount: string;
  currency: string;
  status: PaymentStatus;
  webhookEventId?: string;
  idempotencyVerified: boolean;
  idempotencyKey?: string;
  reconciled: boolean;
  failureReason?: string;
  refundedAmount?: string;
  refundReason?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  rawProviderReference?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentReceiptRecord {
  receiptNumber: string;
  paymentId: string;
  paymentReference: string;
  orderId?: string;
  orderNumber: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  supplierId: string;
  supplierName: string;
  amountPaid: string;
  currency: string;
  provider: PaymentProvider;
  taxRate: string;
  taxAmount: string;
  issuedAt: string;
  digitalSignatureSha256: string;
}

export type DisputeReason =
  | 'NON_CONFORMING_PRODUCT'
  | 'LATE_DELIVERY'
  | 'DAMAGED_GOODS'
  | 'PAYMENT_ISSUE'
  | 'INCORRECT_QUANTITY'
  | 'OTHER';

export type DisputeStatus =
  | 'OPEN'
  | 'IN_MEDIATION'
  | 'RESOLVED'
  | 'REJECTED';

export interface CommercialDisputeRecord {
  id: string;
  disputeNumber: string;
  orderId: string;
  orderNumber: string;
  initiatorId: string;
  initiatorName: string;
  initiatorRole: UserRoleCode;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  resolution?: string;
  arbitrationAction?: 'REFUND_TOTAL' | 'REFUND_PARTIAL' | 'FORCE_DELIVERY' | 'DISMISSED';
  resolvedByUserId?: string;
  resolvedByUserName?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface FinancialAnomalyRecord {
  id: string;
  anomalyType:
    | 'PAYMENT_FAILURE'
    | 'PRICE_TAMPERING_ATTEMPT'
    | 'DOUBLE_PAYMENT_BLOCKED'
    | 'WEBHOOK_SIGNATURE_INVALID'
    | 'REPLAY_ATTACK_DETECTED'
    | 'UNRESOLVED_DISPUTE'
    | 'STOCK_OUT_DURING_CHECKOUT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entityId: string;
  entityType: 'ORDER' | 'PAYMENT' | 'INVOICE' | 'WEBHOOK' | 'CART';
  description: string;
  timestamp: string;
  resolved: boolean;
}

export type ShipmentStatus =
  // 10 Statuts officiels du cycle logistique complet (Prompt 13)
  | 'PENDING'                 // En attente d'affectation ou prise en charge
  | 'CONFIRMED'               // Confirmée / Acceptée par le transporteur
  | 'PICKUP_SCHEDULED'        // Collecte programmée avec créneau fixé
  | 'PICKED_UP'               // Collectée / Enlevée chez l'expéditeur
  | 'IN_TRANSIT'              // En transit multimodal
  | 'ARRIVED_AT_DESTINATION'  // Arrivée à destination / Hub logistique
  | 'OUT_FOR_DELIVERY'        // En cours de livraison finale (dernier kilomètre)
  | 'DELIVERED'               // Livrée avec preuve de livraison (POD)
  | 'FAILED'                  // Échec de livraison (avec motif)
  | 'INCIDENT'                // Incident en cours de traitement
  // Alias de rétrocompatibilité :
  | 'TO_ASSIGN'
  | 'ACCEPTED'
  | 'COLLECTED';

export type PackageHandlingType =
  | 'PALLET_EURO'
  | 'PALLET_ISO'
  | 'BOX_CARTON'
  | 'CONTAINER_20'
  | 'CONTAINER_40'
  | 'BARREL_DRUM'
  | 'BULK_CARGO'
  | 'CUSTOM';

export interface ShipmentPackageDetail {
  id: string;
  packageType: PackageHandlingType;
  quantity: number;
  description: string;
  grossWeightKg: number;
  netWeightKg: number;
  dimensionsCm: {
    length: number;
    width: number;
    height: number;
  };
  volumeM3: number;
  isDangerousGoodsAdr?: boolean;
  adrClass?: string;
  isColdChainAtp?: boolean;
  requiredTemperatureRange?: string; // ex: "-20°C à -18°C" ou "+2°C à +6°C"
}

export interface ShipmentAddressDetail {
  street: string;
  postalCode: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  dockAccessCode?: string;
  requiresTailLift?: boolean;
  maxClearanceHeightMeters?: number;
  operatingHours?: string;
  specialInstructions?: string;
}

export interface ShipmentGpsLocationRecord {
  id: string;
  shipmentId: string;
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  speedKmh?: number;
  headingDeg?: number;
  ambientTempCelsius?: number;
  batteryLevelPct?: number;
  addressDescription?: string;
  recordedAt: string;
}

export type IncidentCategory =
  | 'COLD_CHAIN_BREACH'
  | 'VEHICLE_BREAKDOWN'
  | 'ACCIDENT'
  | 'CUSTOMS_DELAY'
  | 'DAMAGED_CARGO'
  | 'CLIENT_ABSENT'
  | 'ACCESS_RESTRICTED'
  | 'WEATHER_HAZARD'
  | 'OTHER';

export interface IncidentRecord {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  carrierId: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  reportedAt: string;
  reporterId?: string;
  reporterRole?: UserRoleCode;
  reporterName?: string;
  category?: IncidentCategory;
  evidencePhotos?: string[];
  gpsLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  notificationsSent?: Array<{
    recipientId: string;
    recipientRole: UserRoleCode;
    sentAt: string;
    channel: 'IN_APP' | 'EMAIL' | 'SMS';
  }>;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  actionTaken?:
    | 'CARGO_REPLACED'
    | 'REROUTED'
    | 'DELAY_ACCEPTED'
    | 'INSURANCE_CLAIM_OPENED'
    | 'DELIVERY_RESCHEDULED'
    | 'NO_ACTION_REQUIRED';
}

export interface ShipmentRecord {
  id: string;
  trackingNumber: string;
  orderId: string;
  orderNumber: string;
  clientId: string;
  clientName?: string;
  supplierId?: string;
  supplierName?: string;
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
  // Enrichissements Colisage & Logistique V6.0 (Prompt 13)
  packages?: ShipmentPackageDetail[];
  totalPackagesCount?: number;
  totalGrossWeightKg?: string;
  totalNetWeightKg?: string;
  pickupAddressDetails?: ShipmentAddressDetail;
  deliveryAddressDetails?: ShipmentAddressDetail;
  scheduledPickupDate?: string;
  scheduledPickupTimeWindow?: string;
  actualPickupDate?: string;
  scheduledDeliveryDate?: string;
  actualDeliveryDate?: string;
  handlingInstructions?: string;
  customsNotes?: string;
  specialHandlingTags?: string[];
  assignedVehicleId?: string;
  assignedDriverName?: string;
  rejectionReason?: string;
  reassignmentHistory?: Array<{
    previousCarrierId: string;
    previousCarrierName: string;
    newCarrierId: string;
    newCarrierName: string;
    reassignedAt: string;
    reassignedBy: string;
    reason: string;
  }>;
  currentGpsLocation?: ShipmentGpsLocationRecord;
  gpsHistory?: ShipmentGpsLocationRecord[];
  podData?: {
    recipientFullName: string;
    recipientIdNumber?: string;
    recipientRoleOrTitle?: string;
    signedAt: string;
    digitalSignatureSvg: string;
    proofPhotoUri?: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    deliveryNotes?: string;
    certificationSha256?: string;
  };
  associatedDocumentIds?: string[];
  incidentCount?: number;
  lastIncidentId?: string;
}

export type DayCountBasis = 'ACT/365' | 'ACT/360' | 'ACT/ACT';

export type FinancialRoundingMode =
  | 'ROUND_HALF_UP'
  | 'ROUND_HALF_EVEN'
  | 'ROUND_UP'
  | 'ROUND_DOWN';

export type FinancialRateType = 'FIXED' | 'VARIABLE';

export interface BenchmarkRateRecord {
  id: string;
  code: string; // ex: 'EURIBOR_1M', 'EURIBOR_3M', 'EURIBOR_6M', 'EURIBOR_12M', 'SOFR', 'ESTER', 'TMP_BAM'
  name: string;
  currency: string;
  currentRatePct: string; // ex: "3.2500"
  effectiveDate: string;
  source: string;
  updatedAt: string;
  updatedBy: string;
}

export interface FinancialEngineConfigRecord {
  id: string;
  defaultBasis: DayCountBasis;
  defaultRoundingMode: FinancialRoundingMode;
  defaultRoundingDecimals: number;
  defaultRateType: FinancialRateType;
  defaultFixedRatePct: string;
  defaultBenchmarkRateCode?: string;
  defaultSpreadPct?: string;
  defaultLateInterestSpreadPct: string; // ex: "10.0000" (taux BCE ref + 10 points selon directive 2011/7/UE)
  fixedRecoveryFeeAmount: string; // ex: "40.00" EUR forfaitaire
  fixedRecoveryFeeCurrency: string;
  statutoryFramework: 'EU_DIRECTIVE_2011_7' | 'US_UCC' | 'OHADA_AUVE' | 'MAROC_LOI_49_15';
  updatedAt: string;
  updatedBy: string;
  version: string;
}

export interface FinancialConfigAuditRecord {
  id: string;
  paramKey: string;
  oldValue: string;
  newValue: string;
  modifiedBy: string;
  modifiedAt: string;
  reason: string;
}

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
  // Enrichissements Moteur Financier Traçable V6.0 (Prompt 14)
  rateType?: FinancialRateType;
  benchmarkRateCode?: string;
  benchmarkRatePct?: string;
  spreadPct?: string;
  effectiveRatePct?: string;
  roundingMode?: FinancialRoundingMode;
  roundingDecimals?: number;
  formulaDescription?: string;
  calculationExplanation?: string;
  inputParameters?: Record<string, any>;
}

export interface AgingInvoiceDetail {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  daysOverdue: number;
  totalAmount: string;
  paidAmount: string;
  remainingDue: string;
  lateInterest: string;
  recoveryFee: string;
}

export interface AgingBucketDetail {
  bucketKey: 'CURRENT_0_30' | 'OVERDUE_31_60' | 'OVERDUE_61_90' | 'OVERDUE_OVER_90';
  label: string;
  invoicesCount: number;
  totalRemainingDue: string;
  totalLateInterest: string;
  totalRecoveryFees: string;
  invoices: AgingInvoiceDetail[];
}

export interface AgingBalanceReport {
  asOfDate: string;
  currency: string;
  totalReceivables: string;
  totalOverdueAmount: string;
  totalLateInterestAccrued: string;
  totalRecoveryFeesAccrued: string;
  buckets: Record<'CURRENT_0_30' | 'OVERDUE_31_60' | 'OVERDUE_61_90' | 'OVERDUE_OVER_90', AgingBucketDetail>;
}

export interface FiscalPeriodRecord {
  id: string;
  fiscalYear: number;
  periodCode: string; // ex: "2026-11"
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'SOFT_CLOSED' | 'LOCKED';
  closedAt?: string;
  closedBy?: string;
}

export interface RoomLiveRecord {
  id: string;
  roomCode: string;
  title: string;
  description?: string;
  createdById: string;
  creatorName: string;
  creatorRole: UserRoleCode;
  delegatedClientHostId?: string;
  status: 'SCHEDULED' | 'WAITING' | 'LIVE' | 'ENDED';
  scheduledAt: string;
  durationMinutes?: number;
  isImmediate?: boolean;
  isScheduled?: boolean;
  isPrivate?: boolean;
  hasWaitingRoom?: boolean;
  participantsCount: number;
  allowedUserIds: string[];
  invitedEmails?: string[];
  securityToken?: string;
  hostAccessToken?: string;
  recordingConsent: boolean;
  isRecording?: boolean;
  recordingStartedAt?: string;
  recordingRetentionDays?: number;
  recordingKey?: string;
  aiSummaryAvailable: boolean;
  aiSummary?: {
    summary: string;
    decisions: string[];
    actionItems: string[];
    topicsDiscussed?: string[];
    generatedAt?: string;
    certifiedHashSha256?: string;
  };
}

export type RoomViewMode = 'GRID' | 'SPEAKER' | 'SCREEN';

export type RoomParticipantModerationAction =
  | 'MUTE_MIC'
  | 'DISABLE_CAM'
  | 'EXPEL'
  | 'DELEGATE_HOST'
  | 'ADMIT'
  | 'DENY'
  | 'LOWER_HAND';

export interface RoomLiveReaction {
  id: string;
  participantId: string;
  participantName: string;
  emoji: string;
  timestamp: number;
}

export interface RoomLiveDocumentShare {
  id: string;
  title: string;
  type: string;
  url?: string;
  previewUrl?: string;
  sharedBy: string;
  sharedAt: string;
}

export interface RoomLiveTopic {
  id: string;
  topic: string;
  detectedAt: string;
  confidence: number;
}

export interface RoomLiveActionItem {
  id: string;
  task: string;
  assigneeName?: string;
  dueDate?: string;
  status: 'PENDING' | 'DONE';
}

export interface RoomLiveAiSummary {
  summary: string;
  decisions: string[];
  actionItems: RoomLiveActionItem[];
  topicsDiscussed: string[];
  generatedAt: string;
  certifiedHashSha256?: string;
}

export interface RoomLiveAccessTokenPayload {
  roomId: string;
  roomCode: string;
  userId: string;
  userName: string;
  userRole: UserRoleCode;
  isHost: boolean;
  canPublishAudio: boolean;
  canPublishVideo: boolean;
  canPublishScreen: boolean;
  canModerate: boolean;
  expiresAt: number;
}

export type RoomSfuConnectionQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

export interface RoomSfuNetworkStats {
  rttMs: number;
  jitterMs: number;
  packetLossPct: number;
  quality: RoomSfuConnectionQuality;
  simulcastLayer: 'HIGH_1080P' | 'MEDIUM_720P' | 'LOW_360P';
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
import type {
  ImportExportFormat,
  SandboxDetectedTable,
} from '../services/adminAdvancedEngine';

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
  status?: 'VALIDATED' | 'PENDING_REVIEW' | 'DRAFT';
  validatedBy?: string;
  validatedAt?: string;
}

export type TranslationJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface TranslationJob {
  id: string;
  sourceLang: SupportedLocale;
  targetLang: SupportedLocale;
  entityType: TranslationEntityType;
  totalItems: number;
  processedItems: number;
  progressPercentage: number;
  status: TranslationJobStatus;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface SmartTranslatedMessage {
  id: string;
  conversationId?: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  recipientId: string;
  recipientName?: string;
  originalText: string;
  sourceLang: SupportedLocale;
  translatedText: string;
  targetLang: SupportedLocale;
  isTranslated: boolean;
  translationNotice?: string;
  createdAt: string;
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

// ============================================================================
// TYPES SYSTÈME CENTRAL DE NOTIFICATIONS & MESSAGERIE (PROMPT 08)
// ============================================================================

export type NotificationCategory =
  | 'COMMERCIAL'
  | 'KYC'
  | 'LOGISTIQUE'
  | 'FINANCE'
  | 'SÉCURITÉ'
  | 'SUPPORT'
  | 'ROOM_LIVE'
  | 'MESSAGE';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'WEB_PUSH' | 'SMS';

export type NotificationDigestFrequency = 'INSTANT' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST';

export interface NotificationRecord {
  id: string;
  userId: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  channels: NotificationChannel[];
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  deduplicationKey?: string;
  metadata?: Record<string, any>;
  icon?: Icon3DName | string;
  createdAt: string;
}

export interface NotificationPreferencesRecord {
  id: string;
  userId: string;
  enabledChannels: Record<NotificationChannel, boolean>;
  enabledCategories: Record<NotificationCategory, boolean>;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string;   // e.g. "08:00"
  digestFrequency: NotificationDigestFrequency;
  smsPhoneNumber?: string;
  updatedAt: string;
}

export interface NotificationDispatchChannelResult {
  channel: NotificationChannel;
  status: 'DELIVERED' | 'QUEUED' | 'SUPPRESSED_QUIET_HOURS' | 'DISABLED' | 'FAILED';
  deliveredAt?: string;
  error?: string;
  gatewayPayload?: any;
}

export interface NotificationDispatchResult {
  notification: NotificationRecord;
  dispatchedChannels: NotificationDispatchChannelResult[];
  isDeduplicated: boolean;
}

// ----------------------------------------------------------------------------
// Types Messagerie B2B Centralisée & Sécurisée
// ----------------------------------------------------------------------------

export type ConversationType =
  | 'DIRECT'
  | 'ORDER_THREAD'
  | 'SHIPMENT_THREAD'
  | 'SUPPORT_THREAD'
  | 'QUOTE_THREAD';

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageKey: string;
  presignedDownloadUrl: string;
  expiresAt: string;
  sha256: string;
  virusScanStatus: 'CLEAN' | 'QUARANTINED';
}

export interface ConversationParticipantDetail {
  id: string;
  name: string;
  role: UserRoleCode;
  email: string;
  avatarInitials?: string;
}

export interface ConversationMessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRoleCode;
  originalText: string;
  sourceLang: SupportedLocale;
  translatedText?: string;
  targetLang?: SupportedLocale;
  isTranslated: boolean;
  attachments: MessageAttachment[];
  status: MessageStatus;
  readBy: { userId: string; readAt: string }[];
  createdAt: string;
}

export interface ConversationRecord {
  id: string;
  type: ConversationType;
  title: string;
  participantIds: string[];
  participantDetails: ConversationParticipantDetail[];
  relatedEntityId?: string; // e.g. orderId, shipmentId, ticketId
  relatedEntityType?: 'ORDER' | 'SHIPMENT' | 'QUOTE' | 'TICKET' | 'OTHER';
  lastMessageSnippet?: string;
  lastMessageAt: string;
  unreadCountByUser: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface TypingIndicatorEvent {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: string;
}

// ============================================================================
// TYPES SYSTÈME DE FACTURATION ET GESTION DOCUMENTAIRE COMMERCIALE (PROMPT 12)
// ============================================================================

export type CommercialDocumentType =
  | 'QUOTE'                   // Devis commercial
  | 'PURCHASE_ORDER'          // Bon de commande acheteur
  | 'ORDER_CONFIRMATION'      // Confirmation de commande fournisseur (Proforma)
  | 'COMMERCIAL_INVOICE'      // Facture commerciale légale
  | 'CREDIT_NOTE'             // Facture d'avoir (annulation / rectification légale)
  | 'PAYMENT_RECEIPT'         // Quittance / Reçu de paiement certifié
  | 'DELIVERY_NOTE'           // Bon de livraison / Bordereau de colisage
  | 'TRANSPORT_DOCUMENT';     // Document de transport (e-CMR / Lettre de voiture)

export type DocumentLifecycleStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PAID'
  | 'CANCELLED'
  | 'ARCHIVED';

export type TaxJurisdictionCode =
  | 'FR_UE'       // France / Union Européenne (TVA 20%, intracommunautaire)
  | 'MA'          // Maroc (TVA 20%, ICE, IF, RC, exonération export art. 92)
  | 'TN'          // Tunisie (TVA 19%, timbre fiscal 1.000 TND, Matricule Fiscal)
  | 'AE_GCC'      // Émirats Arabes Unis / GCC (Tax Invoice, VAT 5%, TRN, bilingue EN/AR)
  | 'INTL_EXPORT';// International hors juridiction (Exonération export, Incoterm, HS codes)

export interface TaxRateConfig {
  code: string;
  label: Record<Locale, string>;
  ratePct: string; // e.g. "20.00", "5.00", "0.00"
  isDefault?: boolean;
}

export interface TaxJurisdictionConfig {
  code: TaxJurisdictionCode;
  countryCode: string;
  name: Record<Locale, string>;
  currency: string;
  defaultTaxRate: string;
  taxRates: TaxRateConfig[];
  fiscalStampAmount?: string; // e.g. "1.000" pour la Tunisie
  mandatoryMentions: Record<Locale, string[]>;
  numberingPrefix: Record<CommercialDocumentType, string>;
  requiresBilingualInvoice?: boolean;
  legalIdentityFields: {
    key: string;
    label: Record<Locale, string>;
    required: boolean;
  }[];
}

export interface DocumentLineItem {
  id: string;
  sku: string;
  description: Record<Locale, string>;
  quantity: number;
  unit: string;
  unitPrice: string; // HT
  discountPct: string; // e.g. "0.00" or "5.00"
  taxRatePct: string; // e.g. "20.00"
  taxAmount: string; // calculé déterministe
  totalLineHt: string; // calculé déterministe
  totalLineTtc: string; // calculé déterministe
  hsCode?: string; // Code douanier international
}

export interface DocumentPartyInfo {
  id?: string;
  companyName: string;
  legalForm?: string; // SARL, SAS, GmbH, etc.
  address: string;
  postalCode?: string;
  city: string;
  country: string;
  email: string;
  phone?: string;
  taxId?: string; // N° TVA / ICE / Matricule Fiscal / TRN
  registrationNumber?: string; // RCS / SIREN / RC / RNE
  additionalLegalMentions?: Record<string, string>;
  iban?: string;
  swiftBic?: string;
  bankName?: string;
}

export interface DocumentTransportDetails {
  licensePlate: string;
  driverName: string;
  trailerNumber?: string;
  atpCertificateNumber?: string;
  temperatureSetpoint?: string;
  carrierReservations?: string;
  mode?: string;
  carrierName?: string;
  carrierRegistration?: string;
  cmrNumber?: string;
  senderCity?: string;
  consigneeCity?: string;
  grossWeightKg?: number;
  volumeM3?: number;
  temperatureControlled?: boolean;
  targetTemperatureRange?: string;
}

export interface CommercialDocumentRecord {
  id: string;
  documentType: CommercialDocumentType;
  documentNumber: string;
  version: number;
  status: DocumentLifecycleStatus;
  jurisdiction: TaxJurisdictionCode;
  issuedAt: string;
  dueAt?: string;
  validUntil?: string;
  deliveryDate?: string;
  
  // Relations d'affaires
  orderId?: string;
  orderNumber?: string;
  quoteId?: string;
  quoteNumber?: string;
  originalInvoiceId?: string; // Pour les avoirs (CREDIT_NOTE)
  originalInvoiceNumber?: string;
  creditNoteReason?: string;
  paymentId?: string;
  paymentReference?: string;
  shipmentId?: string;
  trackingNumber?: string;
  
  // Acteurs juridiques
  issuer: DocumentPartyInfo;
  recipient: DocumentPartyInfo;
  carrier?: DocumentPartyInfo; // Pour CMR
  
  // Lignes & Totaux
  lines: DocumentLineItem[];
  subtotalHt: string;
  totalDiscountAmount: string;
  netCommercialHt: string;
  shippingAmount: string;
  taxBreakdown: {
    ratePct: string;
    taxableBase: string;
    taxAmount: string;
  }[];
  totalTaxAmount: string;
  fiscalStampAmount?: string;
  totalTtc: string;
  currency: string;
  amountInWords: Record<Locale, string>;
  
  // Conditions commerciales & mentions légales
  incoterm?: string;
  incotermLocation?: string;
  paymentTerms: Record<Locale, string>;
  latePaymentPenalties: Record<Locale, string>;
  legalNotice: Record<Locale, string>;
  transportDetails?: DocumentTransportDetails;
  
  // Sécurité, scellement & immutabilité
  digitalSealSha256: string;
  qrPayload?: string;
  pdfUri?: string;
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  createdByUserName: string;
  revisionHistory?: {
    version: number;
    modifiedAt: string;
    modifiedBy: string;
    changeNote: string;
  }[];
}

export interface DocumentSearchFilters {
  query?: string;
  documentType?: CommercialDocumentType;
  jurisdiction?: TaxJurisdictionCode;
  status?: DocumentLifecycleStatus;
  partyId?: string;
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  orderNumber?: string;
}

export interface TemporaryDownloadTokenPayload {
  documentId: string;
  documentNumber: string;
  userId: string;
  expiresAt: number; // timestamp en secondes
  hmacSignature: string;
}

// ============================================================================
// PROMPT 15 : IMPORTATION & EXPORTATION DES DONNÉES SÉCURISÉES
// 1. Formats d'importation métier (CSV, XLSX, JSON) & avancés (SQL, BAK, DBF)
// 2. Parcours d'importation en 12 étapes rigoureuses
// 3. Sandbox isolée pour bases (SQL, BAK, DBF) sans réseau et sans secrets prod
// 4. Exportations certifiées (CSV, Excel, JSON, PDF) avec protection anti-injection
// 5. Double approbation Admin (anti auto-approbation) & rapports complets
// ============================================================================

export type ImportPipelineStep =
  | 'UPLOAD'
  | 'FORMAT_IDENTIFICATION'
  | 'VALIDATION'
  | 'CONTENT_ANALYSIS'
  | 'PREVIEW'
  | 'COLUMN_MAPPING'
  | 'DUPLICATE_DETECTION'
  | 'ERROR_REPORTING'
  | 'SIMULATION'
  | 'CONFIRMATION'
  | 'EXECUTION'
  | 'FINAL_REPORT';

export type DuplicateStrategy = 'SKIP' | 'OVERWRITE' | 'REJECT';

export type ImportTargetEntity =
  | 'CATALOG_PRODUCTS'
  | 'CLIENTS'
  | 'SUPPLIERS'
  | 'INVOICES'
  | 'ACCOUNTING_ENTRIES'
  | 'DATABASE_MIGRATION';

export interface ImportFileValidation {
  fileSize: number;
  maxAllowedSize: number;
  isSizeValid: boolean;
  detectedMime: string;
  detectedFormat: ImportExportFormat;
  magicBytesHex: string;
  antivirusScan: 'CLEAN' | 'INFECTED' | 'QUARANTINED';
  encoding: string;
  securitySanitized: boolean;
  detectedVulnerabilities: string[];
}

export interface ImportColumnMapping {
  sourceColumn: string;
  targetField: string;
  sourceSample: string;
  targetType: string;
  confidencePct: number;
  isRequired: boolean;
  transformRule?: string;
  status: 'AUTO_MATCHED' | 'MANUAL_REVIEW' | 'IGNORED';
}

export interface ImportRowError {
  rowNumber: number;
  columnName: string;
  receivedValue: string;
  errorMessage: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ImportDuplicateDetail {
  rowNumber: number;
  uniqueKey: string;
  existingId: string;
  actionTaken: 'SKIPPED' | 'OVERWRITTEN' | 'REJECTED';
}

export interface ImportSimulationResult {
  totalRows: number;
  previewRows: any[];
  wouldCreate: number;
  wouldUpdate: number;
  wouldSkip: number;
  wouldReject: number;
  errors: ImportRowError[];
  duplicates: ImportDuplicateDetail[];
  schemaChanges: string[];
  estimatedExecutionDurationMs: number;
  isSafeToExecute: boolean;
}

export interface ImportFinalReport {
  jobId: string;
  entity: ImportTargetEntity;
  format: ImportExportFormat;
  fileName: string;
  fileSizeFormatted: string;
  sha256: string;
  totalRows: number;
  importedRows: number;
  ignoredRows: number;
  rejectedRows: number;
  errors: ImportRowError[];
  duplicates: ImportDuplicateDetail[];
  durationMs: number;
  completedAt: string;
  executedBy: string;
  auditLogId: string;
  requiresDualAdmin: boolean;
  dualAdminApprovalId?: string;
}

export interface SecureImportPipelineJob {
  id: string;
  currentStep: ImportPipelineStep;
  entity: ImportTargetEntity;
  format: ImportExportFormat;
  fileName: string;
  fileSize: number;
  fileContentRaw?: string;
  sha256: string;
  validation: ImportFileValidation;
  detectedColumns: string[];
  previewRows: any[];
  columnMappings: ImportColumnMapping[];
  duplicateStrategy: DuplicateStrategy;
  simulationResult?: ImportSimulationResult;
  finalReport?: ImportFinalReport;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  requiresDualAdmin: boolean;
  dualAdminApprovalId?: string;
  status: 'IN_PROGRESS' | 'SIMULATED' | 'AWAITING_APPROVAL' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
  failureReason?: string;
}

export type ImportPipelineJob = SecureImportPipelineJob;

export interface DatabaseSandboxSession {
  sessionId: string;
  fileName: string;
  fileFormat: 'SQL' | 'BAK' | 'DBF' | 'CDX';
  fileSize: number;
  sha256: string;
  sandboxContainerId: string;
  isEgressBlocked: boolean;
  productionSecretsIsolated: boolean;
  cpuLimit: string;
  memoryLimit: string;
  timeoutMs: number;
  antivirusStatus: 'CLEAN' | 'INFECTED';
  compatibilityReport: {
    engineType: 'POSTGRESQL' | 'MSSQL_SERVER' | 'DBASE_FOXPRO';
    isCompatible: boolean;
    versionDetected: string;
    warnings: string[];
    destructiveCommandsBlocked: string[];
  };
  migrationPlan: {
    planHash: string;
    tablesDetected: SandboxDetectedTable[];
    rowsCount: number;
    hasDestructiveOperations: boolean;
    requiresPreBackup: boolean;
    backupSnapshotId?: string;
  };
  dualAdminApproval: {
    approvalId: string;
    initiatedBy: string;
    initiatedAt: string;
    approvedBy?: string;
    approvedAt?: string;
    status: 'PENDING_SECOND_ADMIN' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  };
  createdAt: string;
  status: 'ANALYZED' | 'AWAITING_APPROVAL' | 'MIGRATION_EXECUTED' | 'FAILED';
  errorMessage?: string;
}

export type ExportDatasetType = 'PRODUCTS' | 'ORDERS' | 'INVOICES' | 'ENTRIES' | 'AUDIT_LOGS' | 'CUSTOM';
export type ExportFormatType = 'CSV' | 'XLSX' | 'JSON' | 'PDF';

export interface DataExportRequest {
  entity: ExportDatasetType;
  format: ExportFormatType;
  selectedFields?: string[];
  filterParams?: Record<string, any>;
  dateRange?: { from: string; to: string };
  preventFormulaInjection?: boolean;
}

export interface DataExportResult {
  fileName: string;
  content: string;
  mimeType: string;
  sha256: string;
  rowsCount: number;
  generatedAt: string;
  preventedInjectionsCount: number;
}

// ============================================================================
// PROMPT 16 : ADMINISTRATION AVANCÉE, SÉCURITÉ ET AUDIT
// 1. Gestion des accès & sessions (MFA, Révocation, Rôles)
// 2. Journal d'audit immuable & chaînage de hachage SHA-256
// 3. Surveillance temps réel & Détection d'anomalies
// 4. Gestionnaire cryptographique KMS (AES-256-GCM, KEK, DEK)
// 5. Sauvegardes & Restauration Sandbox (Restore Drills, 4-Eyes Principle)
// 6. Supervision Technique & APM (PostgreSQL, Redis, Queues, Latences)
// ============================================================================

export type SecurityAlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type SecurityAlertType =
  | 'BRUTE_FORCE_ATTEMPT'
  | 'SUSPICIOUS_LOGIN'
  | 'IDOR_ATTEMPT'
  | 'UNAUTHORIZED_ADMIN_ELEVATION'
  | 'MALICIOUS_UPLOAD_BLOCKED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SECRET_ROTATION_DUE';

export interface SecurityAlertRecord {
  id: string;
  timestamp: string;
  severity: SecurityAlertSeverity;
  type: SecurityAlertType;
  actorId?: string;
  actorIp: string;
  details: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  resolvedAt?: string;
  resolvedBy?: string;
  remediationAction?: string;
}

export interface SystemComponentHealth {
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  latencyMs: number;
  details: string;
  lastChecked: string;
}

export interface QueueMonitoringDetail {
  queueName: string;
  pendingCount: number;
  processingCount: number;
  failedCount: number;
  avgProcessingTimeMs: number;
  status: 'HEALTHY' | 'CONGESTED' | 'PAUSED';
}

export interface SystemSupervisionMetrics {
  timestamp: string;
  services: SystemComponentHealth[];
  queues: QueueMonitoringDetail[];
  database: {
    connectionsActive: number;
    connectionsMax: number;
    poolUsagePct: number;
    transactionsPerSec: number;
    avgQueryDurationMs: number;
    status: 'OPTIMAL' | 'DEGRADED';
  };
  redisCache: {
    connected: boolean;
    memoryUsedMb: number;
    hitRatePct: number;
    keysCount: number;
    uptimeSeconds: number;
  };
  apiMetrics: {
    requestsTotal: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    errorRatePct: number;
  };
}

export interface UserAccessSessionRecord {
  sessionId: string;
  userId: string;
  userName: string;
  userRole: UserRoleCode;
  ipAddress: string;
  userAgent: string;
  country: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrentSession: boolean;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}

export interface BackupRestoreDrillResult {
  drillId: string;
  backupCode: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  sha256Verified: boolean;
  tablesRestoredCount: number;
  rowsRestoredCount: number;
  sandboxContainerId: string;
  isIsolatedFromProduction: boolean;
  status: 'DRILL_PASSED' | 'DRILL_FAILED';
  summary: string;
}



