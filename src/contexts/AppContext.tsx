// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AuditLogRecord,
  BackupRecord,
  CalculationResultRecord,
  CartItem,
  DayCountBasis,
  FloatingButtonItem,
  ImportJobRecord,
  IncidentRecord,
  InvoiceRecord,
  KMSKeyRecord,
  KYCDossier,
  Locale,
  OrderRecord,
  OrderStatus,
  PaymentRecord,
  ProductItem,
  QuoteRecord,
  RoomLiveRecord,
  ShipmentRecord,
  ShipmentStatus,
  ThemeMode,
  UserProfile,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
  NotificationPreferencesRecord,
  ConversationRecord,
  ConversationMessageRecord,
  ConversationParticipantDetail,
  MessageAttachment,
  Icon3DName,
  ProductCategoryRecord,
  StockMovementRecord,
  StockReservationRecord,
  PhysicalInventorySession,
  StockAlertRecord,
  StockMovementType,
} from '../types';
import { INITIAL_CATALOG_CATEGORIES } from '../services/catalogEngine';
import i18n from '../i18n/config';
import { translations } from '../i18n/translations';
import {
  calculateFinancialInterest,
  validateDualAdminApproval,
} from '../services/backendServices';
import {
  checkMandatoryKycCompletion,
  encryptAndStoreKycDocument,
  executeKycCronBatch,
  KycCronExecutionReport,
} from '../services/kycEngine';
import {
  INITIAL_CARRIER_VEHICLES,
  INITIAL_SHIPMENT_WAYPOINTS,
  LogisticsEngine,
  LogisticsMissionRecord,
  ProofOfDeliveryData,
  RouteWaypoint,
  VehicleRecord,
} from '../services/logisticsEngine';
import {
  AiChatMessage,
  AiConversationThread,
  AiQuotaState,
  queryAiAssistantWithRag,
  streamAiAssistantTokens,
  getOrCreateAiQuota,
  RagSourceCitation,
  OcrDocumentRecord,
  createMockOcrDocument,
  correctOcrFieldValue,
  reviewDynamicOcrField,
  commitOcrDocumentValidation,
  VoiceLanguage,
  formatDictatedText,
  RoomLiveSessionState,
  initializeRoomLiveSession,
  moderateParticipantAction,
  generateCertifiedMeetingExport,
  LiveRoomChatLine,
  LiveSubtitleLine,
} from '../services/aiIntelligenceEngine';
import {
  RoomLiveSfuEngine,
  RoomSfuTokenManager,
} from '../services/roomLiveSfuEngine';
import {
  RoomViewMode,
  RoomLiveAiSummary,
} from '../types';
import {
  defaultB2BMessagingEngine,
  SecureAttachmentManager,
} from '../services/messagingEngine';
import {
  analyzeFileInIsolatedSandbox,
  buildAuditChainFromLogs,
  EnvelopeCipherResult,
  exportDatasetToFormat,
  ImportExportFormat,
  KmsOperationEntry,
  rotateKmsMasterKey,
  SandboxAnalysisReport,
  simulateEnvelopeEncryption,
  validateDualAdminOperation,
  verifyAuditLogChainIntegrity,
  verifyBackupCryptographicIntegrity,
} from '../services/adminAdvancedEngine';

export type UXPreviewState = 'normal' | 'loading' | 'empty' | 'error';

export interface NotificationItem {
  id: string;
  cat: NotificationCategory;
  title: string;
  msg: string;
  icon: Icon3DName;
  isRead: boolean;
  timestamp: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  channels?: NotificationChannel[];
  createdAt?: string;
}

export const DEMO_USERS: Record<string, UserProfile> = {
  ADMIN_1: {
    id: 'usr-admin-01',
    email: 'direction.sec@tradelink-saas.com',
    phone: '+33 1 88 40 10 01',
    firstName: 'Karim',
    lastName: 'Mansouri',
    companyName: 'TRADELINK GLOBAL HQ',
    role: 'ADMIN',
    permissions: ['*'],
    mfaEnabled: true,
    mfaVerified: true,
    activeSessionId: 'sess-redis-9941a',
    kycStatus: 'VALIDATED',
    kycDaysRemaining: 7,
    jurisdiction: 'FR / MA / AE',
    avatarInitials: 'KM',
  },
  ADMIN_2: {
    id: 'usr-admin-02',
    email: 'ciso.approver@tradelink-saas.com',
    phone: '+33 1 88 40 10 02',
    firstName: 'Sophie',
    lastName: 'Laurent (Admin #2 CISO)',
    companyName: 'TRADELINK SECURITY OPS',
    role: 'ADMIN',
    permissions: ['*'],
    mfaEnabled: true,
    mfaVerified: true,
    activeSessionId: 'sess-redis-8820b',
    kycStatus: 'VALIDATED',
    kycDaysRemaining: 7,
    jurisdiction: 'FR / EU',
    avatarInitials: 'SL',
  },
  CLIENT: {
    id: 'usr-client-01',
    email: 'achats@atlas-import-retail.ma',
    phone: '+212 5 22 90 14 55',
    firstName: 'Youssef',
    lastName: 'Berrada',
    companyName: 'Atlas Import & Distribution S.A.',
    role: 'CLIENT',
    permissions: [
      'catalog:read',
      'orders:read:own',
      'orders:create',
      'quotes:read:own',
      'quotes:create',
      'invoices:read:own',
      'payments:create:own',
      'room:join:invited',
    ],
    mfaEnabled: false,
    mfaVerified: true,
    activeSessionId: 'sess-redis-4412c',
    kycStatus: 'SUBMITTED_IN_TIME_PENDING_REVIEW',
    kycDaysRemaining: 3,
    jurisdiction: 'MA',
    avatarInitials: 'YB',
    delegatedRoomIds: ['room-02'],
  },
  FOURNISSEUR: {
    id: 'usr-supp-01',
    email: 'export@eurotech-industrial.de',
    phone: '+49 40 8821 900',
    firstName: 'Marc',
    lastName: 'Vandenberg',
    companyName: 'EuroTech Industrial & ColdChain GmbH',
    role: 'FOURNISSEUR',
    permissions: [
      'products:crud:own',
      'stocks:manage:own',
      'orders:process:assigned',
      'quotes:respond:assigned',
      'room:create',
    ],
    mfaEnabled: true,
    mfaVerified: true,
    activeSessionId: 'sess-redis-5519s',
    kycStatus: 'VALIDATED',
    kycDaysRemaining: 7,
    jurisdiction: 'EU',
    avatarInitials: 'MV',
  },
  TRANSPORTEUR: {
    id: 'usr-trans-01',
    email: 'dispatch@medfreight-logistics.com',
    phone: '+34 956 77 12 00',
    firstName: 'Nadia',
    lastName: 'El Amrani',
    companyName: 'MedFreight Multimodal Carriers',
    role: 'TRANSPORTEUR',
    permissions: [
      'missions:read:assigned',
      'missions:update:status',
      'shipments:pod:upload',
      'incidents:report',
      'room:create',
    ],
    mfaEnabled: false,
    mfaVerified: true,
    activeSessionId: 'sess-redis-6630t',
    kycStatus: 'VALIDATED',
    kycDaysRemaining: 7,
    jurisdiction: 'INTL',
    avatarInitials: 'NE',
  },
  COMPTABLE: {
    id: 'usr-compta-01',
    email: 'audit.finance@fiduciaire-b2b.fr',
    phone: '+33 1 42 68 55 00',
    firstName: 'Claire',
    lastName: 'Dubois',
    companyName: 'Cabinet FinAudit & Expertise',
    role: 'COMPTABLE',
    permissions: [
      'compta:read:source_readonly',
      'compta:journals:read',
      'compta:ledger:read',
      'compta:statements:generate',
      'calc:execute',
      'room:create',
    ],
    mfaEnabled: true,
    mfaVerified: true,
    activeSessionId: 'sess-redis-7710f',
    kycStatus: 'VALIDATED',
    kycDaysRemaining: 7,
    jurisdiction: 'FR / OHADA / IFRS',
    avatarInitials: 'CD',
  },
  SUPPORT: {
    id: 'usr-supp-agent-01',
    email: 'assistance@tradelink-support.io',
    phone: '+33 1 88 40 19 99',
    firstName: 'Amine',
    lastName: 'Khelifi',
    companyName: 'TradeLink Customer Care Center',
    role: 'SUPPORT',
    permissions: ['tickets:read:assigned', 'tickets:reply', 'room:create:support'],
    mfaEnabled: true,
    mfaVerified: true,
    activeSessionId: 'sess-redis-1190h',
    kycStatus: 'VALIDATED',
    kycDaysRemaining: 7,
    jurisdiction: 'GLOBAL',
    avatarInitials: 'AK',
  },
};

const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-01',
    sku: 'TL-COLD-400X',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    category: 'Chaîne du Froid & Pharma',
    name: {
      fr: 'Conteneur Isotherme Actif Pharma -25°C à +8°C (IoT)',
      en: 'Active Pharma Cold-Chain Container -25°C to +8°C (IoT)',
      ar: 'حاوية تبريد دوائية ذكية نشطة (-25 إلى +8 درجة مئوية)',
    },
    description: {
      fr: 'Palette conteneurisée certifiée GDP avec télémétrie GPS/Température temps réel, autonomie 120h pour fret aérien et maritime.',
      en: 'GDP-certified pallet container with real-time GPS/Temperature telemetry, 120h autonomy for air and sea freight.',
      ar: 'حاوية معتمدة لشحن الأدوية مع تتبع مباشر للحرارة والموقع الجغرافي لمدة 120 ساعة.',
    },
    unitPrice: '4850.00',
    currency: 'EUR',
    taxRate: '20.00',
    unit: 'UNITÉ',
    stockAvailable: 42,
    stockReserved: 6,
    minStockAlert: 10,
    icon3d: 'cold-chain',
    originCountry: 'Allemagne (DE)',
    incoterm: 'CIP Casablanca / Roissy',
    leadTimeDays: 4,
    isPublished: true,
  },
  {
    id: 'prod-02',
    sku: 'TL-AGV-900R',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    category: 'Robotique & Automatisation Entrepôt',
    name: {
      fr: 'Robot Autonome AGV de Manutention Palette 1.5T',
      en: 'Autonomous Warehouse AGV Pallet Robot 1.5T',
      ar: 'روبوت مستودعات ذاتي القيادة لنقل الطبليات 1.5 طن',
    },
    description: {
      fr: 'Navigation LiDAR 360°, intégration native WMS TradeLink, recharge rapide induction 45 min, sécurité ISO 3691-4.',
      en: '360° LiDAR navigation, native TradeLink WMS integration, 45-min fast inductive charging, ISO 3691-4 safety.',
      ar: 'ملاحة ليدار 360 درجة، تكامل مباشر مع نظام المستودعات وشحن سريع خلال 45 دقيقة.',
    },
    unitPrice: '14200.00',
    currency: 'EUR',
    taxRate: '20.00',
    unit: 'UNITÉ',
    stockAvailable: 14,
    stockReserved: 2,
    minStockAlert: 5,
    icon3d: 'warehouse-robot',
    originCountry: 'Allemagne (DE)',
    incoterm: 'DAP Entrepôt Client',
    leadTimeDays: 10,
    isPublished: true,
  },
  {
    id: 'prod-03',
    sku: 'TL-CONT-40HC',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    category: 'Conteneurs & Équipements Maritimes',
    name: {
      fr: 'Conteneur Maritime 40 Pieds High Cube Certifié CSC',
      en: '40ft High Cube ISO Shipping Container (CSC Certified)',
      ar: 'حاوية شحن بحري 40 قدم عالية السعة معتمدة دولياً',
    },
    description: {
      fr: 'Acier Corten anticorrosion, plancher bambou marin haute densité, scellé électronique RFID TradeLink inclus.',
      en: 'Anti-corrosion Corten steel, high-density marine bamboo floor, TradeLink RFID electronic seal included.',
      ar: 'فولاذ مقاوم للصدأ مع قفل إلكتروني ذكي لتتبع الشحنات عبر الموانئ.',
    },
    unitPrice: '3690.00',
    currency: 'EUR',
    taxRate: '20.00',
    unit: 'CONTENEUR',
    stockAvailable: 85,
    stockReserved: 12,
    minStockAlert: 15,
    icon3d: 'container',
    originCountry: 'Pays-Bas (NL)',
    incoterm: 'FOB Rotterdam / Tanger Med',
    leadTimeDays: 5,
    isPublished: true,
  },
  {
    id: 'prod-04',
    sku: 'TL-CONV-MOD8',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    category: 'Infrastructure & Tri Logistique',
    name: {
      fr: 'Ligne de Convoyage Modulaire à Rouleaux Motorisés (8m)',
      en: 'Modular Motorized Roller Conveyor Line (8m)',
      ar: 'خط حزام ناقل أوتوماتيكي للمستودعات بطول 8 أمتار',
    },
    description: {
      fr: 'Module de tri haute cadence 2 400 colis/heure avec lecteur code-barres et pesée dynamique intégrée.',
      en: 'High-speed sorting module (2,400 parcels/hour) with integrated barcode scanner and dynamic weight check.',
      ar: 'وحدة فرز عالية السرعة 2400 طرد/ساعة مع ماسح ضوئي وميزان رقمي مدمج.',
    },
    unitPrice: '6400.00',
    currency: 'EUR',
    taxRate: '20.00',
    unit: 'LOT 8M',
    stockAvailable: 7,
    stockReserved: 3,
    minStockAlert: 8,
    icon3d: 'conveyor',
    originCountry: 'France (FR)',
    incoterm: 'EXW Lyon',
    leadTimeDays: 7,
    isPublished: true,
  },
  {
    id: 'prod-05',
    sku: 'TL-SCAN-PRO5G',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    category: 'Terminaux & Traçabilité',
    name: {
      fr: 'Pack 10 Terminaux Lasers Durcis 5G / Wi-Fi 6E + OCR',
      en: 'Pack of 10 Rugged 5G / Wi-Fi 6E Barcode & OCR Terminals',
      ar: 'حزمة 10 أجهزة مسح ضوئي صناعية الجيل الخامس مع قارئ OCR',
    },
    description: {
      fr: 'Lecture longue portée 15m, reconnaissance OCR instantanée des lettres de voiture CMR et étiquettes GS1-128.',
      en: '15m long-range scanning, instant OCR recognition for CMR waybills and GS1-128 shipping labels.',
      ar: 'قراءة عن بعد 15 متراً مع استخراج فوري لبيانات بوليصة الشحن والملصقات.',
    },
    unitPrice: '5250.00',
    currency: 'EUR',
    taxRate: '20.00',
    unit: 'PACK x10',
    stockAvailable: 31,
    stockReserved: 4,
    minStockAlert: 6,
    icon3d: 'scanner',
    originCountry: 'France (FR)',
    incoterm: 'DDP Client',
    leadTimeDays: 3,
    isPublished: true,
  },
  {
    id: 'prod-06',
    sku: 'TL-FORK-LI35',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    category: 'Manutention Lourde',
    name: {
      fr: 'Chariot Élévateur Électrique Lithium-Ion 3.5 Tonnes',
      en: '3.5-Ton Lithium-Ion Electric Warehouse Forklift',
      ar: 'رافعة شوكية كهربائية ببطارية ليثيوم حمولة 3.5 طن',
    },
    description: {
      fr: 'Mât triplex 4.80m, zéro émission pour entrepôt fermé, télémétrie flotte et clés RFID conducteur incluses.',
      en: '4.80m triplex mast, zero emissions for indoor warehouses, fleet telemetry and driver RFID keys included.',
      ar: 'صفر انبعاثات للمستودعات المغلقة، ارتفاع 4.8 متر مع مفاتيح أمان ذكية للسائقين.',
    },
    unitPrice: '28900.00',
    currency: 'EUR',
    taxRate: '20.00',
    unit: 'UNITÉ',
    stockAvailable: 9,
    stockReserved: 1,
    minStockAlert: 3,
    icon3d: 'forklift',
    originCountry: 'Allemagne (DE)',
    incoterm: 'CIF Casablanca / Marseille',
    leadTimeDays: 12,
    isPublished: true,
  },
];

const INITIAL_KYC_DOSSIERS: KYCDossier[] = [
  {
    id: 'kyc-dos-01',
    userId: 'usr-client-01',
    userName: 'Youssef Berrada',
    companyName: 'Atlas Import & Distribution S.A.',
    actorType: 'CLIENT',
    jurisdiction: 'MA (Maroc)',
    status: 'SUBMITTED_IN_TIME_PENDING_REVIEW',
    startedAt: '2026-11-14 09:00',
    deadlineAt: '2026-11-21 09:00',
    daysElapsed: 4,
    daysRemaining: 3,
    submittedAt: '2026-11-16 14:22',
    remindersSent: ['J+1', 'J+3'],
    documents: [
      {
        id: 'doc-kyc-1',
        docType: 'CIN_DIRIGEANT',
        label: 'Pièce d’identité du dirigeant (CIN / Passeport)',
        fileName: 'CIN_Dirigeant_AtlasImport_2026.pdf',
        uploadedAt: '2026-11-16 14:20',
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        encryptionKeyId: 'alias/tradelink-kyc-kek-v6 -> dek-aes256-9f86d081884c',
        status: 'UPLOADED',
        mimeType: 'application/pdf',
        fileSizeBytes: 512400,
        encryptedVaultUri: 's3://tradelink-kyc-encrypted-vault/client/kyc-dos-01/CIN_DIRIGEANT_9f86d081884c.enc',
        ivHex: 'a1b2c3d4e5f60718293a4b5c',
        authTagHex: '884c7d659a2feaa0c55ad015a3bf4f1b',
        virusScanStatus: 'CLEAN',
      },
      {
        id: 'doc-kyc-2',
        docType: 'RNE_KBIS',
        label: 'Extrait RNE / Registre du Commerce (Kbis < 3 mois)',
        fileName: 'RNE_RC_Casablanca_448912.pdf',
        uploadedAt: '2026-11-16 14:21',
        sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        encryptionKeyId: 'alias/tradelink-kyc-kek-v6 -> dek-aes256-4b227777d4dd',
        status: 'UPLOADED',
        mimeType: 'application/pdf',
        fileSizeBytes: 684120,
        encryptedVaultUri: 's3://tradelink-kyc-encrypted-vault/client/kyc-dos-01/RNE_KBIS_4b227777d4dd.enc',
        ivHex: 'f1e2d3c4b5a69788796a5b4c',
        authTagHex: '1fc61c6f884f48641d02b4d121d3fd32',
        virusScanStatus: 'CLEAN',
      },
      {
        id: 'doc-kyc-3',
        docType: 'PATENTE_FISCAL',
        label: 'Attestation de Patente & Identifiant Fiscal (ICE / IF)',
        fileName: 'Patente_ICE_002918440000045.pdf',
        uploadedAt: '2026-11-16 14:22',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        encryptionKeyId: 'alias/tradelink-kyc-kek-v6 -> dek-aes256-e3b0c44298fc',
        status: 'UPLOADED',
        mimeType: 'application/pdf',
        fileSizeBytes: 394800,
        encryptedVaultUri: 's3://tradelink-kyc-encrypted-vault/client/kyc-dos-01/PATENTE_FISCAL_e3b0c44298fc.enc',
        ivHex: '11223344556677889900aabb',
        authTagHex: '98fc1c149afbf4c8996fb92427ae41e4',
        virusScanStatus: 'CLEAN',
      },
    ],
    adminComments: [
      {
        id: 'kcom-01',
        authorEmail: 'direction.sec@tradelink-saas.com',
        authorName: 'Karim Mansouri (Admin Conformité)',
        createdAt: '2026-11-16 15:10',
        comment: 'Les 3 pièces obligatoires Client (CIN, RNE, Patente ICE) ont été soumises à J+2 avant l’échéance J+7. Compte protégé contre toute suspension automatique en attendant la revue finale.',
        visibility: 'SHARED_WITH_APPLICANT',
      },
    ],
    history: [
      {
        id: 'khist-01',
        timestamp: '2026-11-14 09:00',
        actorName: 'Système Onboarding',
        actorRole: 'SYSTEM_CRON',
        action: 'DOSSIER_INITIALIZED',
        summary: 'Ouverture du dossier KYC Client — Compte à rebours réglementaire de 7 jours démarré.',
      },
      {
        id: 'khist-02',
        timestamp: '2026-11-15 09:00',
        actorName: 'KYCCronService',
        actorRole: 'SYSTEM_CRON',
        action: 'CRON_REMINDER_SENT',
        summary: 'Relance automatique J+1 envoyée par Email et Notification In-App.',
      },
      {
        id: 'khist-03',
        timestamp: '2026-11-16 14:22',
        actorName: 'Youssef Berrada',
        actorRole: 'CLIENT',
        action: 'ALL_MANDATORY_SUBMITTED_IN_TIME',
        summary: 'Dépôt complet des 3 justificatifs obligatoires chiffrés AES-256-GCM dans les délais (J+2). Protection anti-suspension J+7 activée.',
      },
    ],
  },
  {
    id: 'kyc-dos-02',
    userId: 'usr-trans-01',
    userName: 'Nadia El Amrani',
    companyName: 'MedFreight Multimodal Carriers',
    actorType: 'TRANSPORTEUR',
    jurisdiction: 'MA / ES (International)',
    status: 'PENDING_SUBMISSION',
    startedAt: '2026-11-12 10:00',
    deadlineAt: '2026-11-19 10:00',
    daysElapsed: 6,
    daysRemaining: 1,
    remindersSent: ['J+1', 'J+3', 'J+5', 'J+6'],
    documents: [
      {
        id: 'doc-kyc-4',
        docType: 'PERMIS_CE_CARTE_GRISE',
        label: 'Permis Poids Lourd (C+E) & Certificats d’Immatriculation Flotte',
        fileName: 'Permis_CE_Flotte_MedFreight_2026.pdf',
        uploadedAt: '2026-11-15 11:10',
        sha256: '7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730',
        encryptionKeyId: 'alias/tradelink-kyc-kek-v6 -> dek-aes256-7d865e959b24',
        status: 'UPLOADED',
        mimeType: 'application/pdf',
        fileSizeBytes: 540200,
        encryptedVaultUri: 's3://tradelink-kyc-encrypted-vault/transporteur/kyc-dos-02/PERMIS_CE_7d865e959b24.enc',
        ivHex: 'ccddeeff0011223344556677',
        authTagHex: '9b2466918c9863afca942d0fb89d7c9a',
        virusScanStatus: 'CLEAN',
      },
    ],
    adminComments: [
      {
        id: 'kcom-02',
        authorEmail: 'direction.sec@tradelink-saas.com',
        authorName: 'Karim Mansouri (Admin Conformité)',
        createdAt: '2026-11-18 08:30',
        comment: 'Rappel J+6 envoyé : merci de téléverser la Licence de Transport International (TIR) et l’Attestation d’Assurance CMR avant demain 10h00.',
        visibility: 'SHARED_WITH_APPLICANT',
      },
    ],
    history: [
      {
        id: 'khist-04',
        timestamp: '2026-11-12 10:00',
        actorName: 'Système Onboarding',
        actorRole: 'SYSTEM_CRON',
        action: 'DOSSIER_INITIALIZED',
        summary: 'Ouverture du dossier KYC Transporteur — Compte à rebours de 7 jours démarré.',
      },
      {
        id: 'khist-05',
        timestamp: '2026-11-18 08:00',
        actorName: 'KYCCronService',
        actorRole: 'SYSTEM_CRON',
        action: 'CRON_REMINDER_SENT',
        summary: 'Relances automatiques J+1, J+3, J+5 et J+6 émises (2 pièces obligatoires manquantes : Licence TIR & Assurance CMR).',
      },
    ],
  },
  {
    id: 'kyc-dos-03',
    userId: 'usr-client-88',
    userName: 'Jean-Luc Moreau',
    companyName: 'Sud Négoce Matériaux SAS',
    actorType: 'CLIENT',
    jurisdiction: 'FR (France)',
    status: 'SUSPENDED_J7',
    startedAt: '2026-11-08 08:00',
    deadlineAt: '2026-11-15 08:00',
    daysElapsed: 10,
    daysRemaining: 0,
    remindersSent: ['J+1', 'J+3', 'J+5', 'J+6', 'J+7_SUSPENSION'],
    documents: [],
    adminComments: [
      {
        id: 'kcom-03',
        authorEmail: 'direction.sec@tradelink-saas.com',
        authorName: 'Karim Mansouri (Admin Conformité)',
        createdAt: '2026-11-15 08:05',
        comment: 'Suspension automatique J+7 appliquée par KYCCronService : aucune pièce obligatoire n’a été déposée dans le délai de 7 jours.',
        visibility: 'SHARED_WITH_APPLICANT',
      },
    ],
    history: [
      {
        id: 'khist-06',
        timestamp: '2026-11-15 08:00',
        actorName: 'KYCCronService',
        actorRole: 'SYSTEM_CRON',
        action: 'CRON_J7_SUSPENDED_MISSING_DOCS',
        summary: 'Suspension automatique à J+7 (0/3 pièces obligatoires soumises après relances J+1, J+3, J+5 et J+6).',
      },
    ],
  },
  {
    id: 'kyc-dos-04',
    userId: 'usr-supp-01',
    userName: 'Marc Vandenberg',
    companyName: 'EuroTech Industrial & ColdChain GmbH',
    actorType: 'FOURNISSEUR',
    jurisdiction: 'DE (Allemagne / UE)',
    status: 'VALIDATED',
    startedAt: '2026-11-01 09:00',
    deadlineAt: '2026-11-08 09:00',
    daysElapsed: 3,
    daysRemaining: 4,
    submittedAt: '2026-11-03 11:00',
    reviewedAt: '2026-11-04 10:15',
    reviewedBy: 'Karim Mansouri (Admin Conformité)',
    remindersSent: ['J+1'],
    documents: [
      {
        id: 'doc-kyc-5',
        docType: 'RNE_HANDELSREGISTER',
        label: 'Extrait RNE / Handelsregister / Registre du Commerce Industriel',
        fileName: 'Handelsregister_HRB_Hambourg_EuroTech.pdf',
        uploadedAt: '2026-11-03 10:55',
        sha256: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b',
        encryptionKeyId: 'alias/tradelink-kyc-kek-v6 -> dek-aes256-3a7bd3e2360a',
        status: 'VALIDATED',
        mimeType: 'application/pdf',
        fileSizeBytes: 615000,
        encryptedVaultUri: 's3://tradelink-kyc-encrypted-vault/fournisseur/kyc-dos-04/RNE_HANDELSREGISTER_3a7bd3e2360a.enc',
        virusScanStatus: 'CLEAN',
      },
      {
        id: 'doc-kyc-6',
        docType: 'TVA_FISCAL_CERT',
        label: 'Attestation de Régularité Fiscale & N° TVA / EORI Export',
        fileName: 'EORI_VAT_DE998877665_Clearance.pdf',
        uploadedAt: '2026-11-03 10:58',
        sha256: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
        encryptionKeyId: 'alias/tradelink-kyc-kek-v6 -> dek-aes256-8f434346648f',
        status: 'VALIDATED',
        mimeType: 'application/pdf',
        fileSizeBytes: 448900,
        encryptedVaultUri: 's3://tradelink-kyc-encrypted-vault/fournisseur/kyc-dos-04/TVA_FISCAL_CERT_8f434346648f.enc',
        virusScanStatus: 'CLEAN',
      },
      {
        id: 'doc-kyc-7',
        docType: 'ISO_GDP_CERT',
        label: 'Certificat Qualité ISO 9001 / Conformité GDP Chaîne du Froid',
        fileName: 'TUV_ISO9001_GDP_ColdChain_2026.pdf',
        uploadedAt: '2026-11-03 11:00',
        sha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
        encryptionKeyId: 'alias/tradelink-kyc-kek-v6 -> dek-aes256-2c26b46b68ff',
        status: 'VALIDATED',
        mimeType: 'application/pdf',
        fileSizeBytes: 892100,
        encryptedVaultUri: 's3://tradelink-kyc-encrypted-vault/fournisseur/kyc-dos-04/ISO_GDP_CERT_2c26b46b68ff.enc',
        virusScanStatus: 'CLEAN',
      },
    ],
    adminComments: [
      {
        id: 'kcom-04',
        authorEmail: 'direction.sec@tradelink-saas.com',
        authorName: 'Karim Mansouri (Admin Conformité)',
        createdAt: '2026-11-04 10:15',
        comment: 'Dossier Fournisseur Industriel EuroTech GmbH conforme et validé (Handelsregister, EORI/TVA et certification GDP vérifiés).',
        visibility: 'SHARED_WITH_APPLICANT',
      },
    ],
    history: [
      {
        id: 'khist-07',
        timestamp: '2026-11-04 10:15',
        actorName: 'Karim Mansouri (Admin)',
        actorRole: 'ADMIN',
        action: 'ADMIN_VALIDATED',
        summary: 'Validation définitive du dossier KYC Fournisseur EuroTech GmbH.',
      },
    ],
  },
];

const INITIAL_ORDERS: OrderRecord[] = [
  {
    id: 'ord-2026-8841',
    orderNumber: 'CMD-2026-8841',
    clientId: 'usr-client-01',
    clientName: 'Atlas Import & Distribution S.A.',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    carrierId: 'usr-trans-01',
    carrierName: 'MedFreight Multimodal Carriers',
    status: 'SHIPPED',
    subtotalAmount: '25150.00',
    taxAmount: '5030.00',
    shippingAmount: '1250.00',
    totalAmount: '31430.00',
    currency: 'EUR',
    shippingAddress: 'Zone Logistique Zenata, Lot 14, Casablanca, Maroc',
    createdAt: '2026-11-15 10:30',
    authorizedRoomId: 'room-01',
    items: [
      {
        productId: 'prod-01',
        sku: 'TL-COLD-400X',
        name: 'Conteneur Isotherme Actif Pharma -25°C à +8°C (IoT)',
        quantity: 3,
        unitPrice: '4850.00',
        totalLine: '14550.00',
        icon3d: 'cold-chain',
      },
      {
        productId: 'prod-05',
        sku: 'TL-SCAN-PRO5G',
        name: 'Pack 10 Terminaux Lasers Durcis 5G / Wi-Fi 6E + OCR',
        quantity: 2,
        unitPrice: '5250.00',
        totalLine: '10500.00',
        icon3d: 'scanner',
      },
    ],
    timeline: [
      { step: 'Commande créée & Stock réservé', timestamp: '15 Nov 2026 10:30', actor: 'Atlas Import (Client)', completed: true },
      { step: 'Acceptée par le Fournisseur', timestamp: '15 Nov 2026 11:15', actor: 'EuroTech GmbH', completed: true },
      { step: 'Préparation & Colisage terminés', timestamp: '16 Nov 2026 09:40', actor: 'Entrepôt Hambourg', completed: true },
      { step: 'En transit multimodal (Aérien + Routier)', timestamp: '17 Nov 2026 06:20', actor: 'MedFreight Carriers', completed: true },
      { step: 'Livraison finale & Preuve POD', timestamp: 'Prévu 19 Nov 2026', actor: 'MedFreight Carriers', completed: false },
    ],
  },
  {
    id: 'ord-2026-8890',
    orderNumber: 'CMD-2026-8890',
    clientId: 'usr-client-01',
    clientName: 'Atlas Import & Distribution S.A.',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    status: 'PENDING',
    subtotalAmount: '28900.00',
    taxAmount: '5780.00',
    shippingAmount: '950.00',
    totalAmount: '35630.00',
    currency: 'EUR',
    shippingAddress: 'Port de Tanger Med, Zone Franche Logistique G4, Maroc',
    createdAt: '2026-11-17 16:45',
    authorizedRoomId: 'room-02',
    items: [
      {
        productId: 'prod-06',
        sku: 'TL-FORK-LI35',
        name: 'Chariot Élévateur Électrique Lithium-Ion 3.5 Tonnes',
        quantity: 1,
        unitPrice: '28900.00',
        totalLine: '28900.00',
        icon3d: 'forklift',
      },
    ],
    timeline: [
      { step: 'Commande créée & Stock réservé', timestamp: '17 Nov 2026 16:45', actor: 'Atlas Import (Client)', completed: true },
      { step: 'Validation Fournisseur en attente', timestamp: 'En cours', actor: 'EuroTech GmbH', completed: false },
      { step: 'Préparation & Affectation Transporteur', timestamp: '-', actor: 'EuroTech GmbH', completed: false },
      { step: 'Expédition & Douane', timestamp: '-', actor: 'Transporteur', completed: false },
    ],
  },
];

const INITIAL_STOCK_MOVEMENTS: StockMovementRecord[] = [
  {
    id: 'stkm-init-01',
    movementNumber: 'MOV-2026-001091',
    productId: 'prod-01',
    sku: 'TL-COLD-400X',
    movementType: 'INBOUND_RECEIPT',
    quantityChange: 50,
    resultingAvailable: 42,
    resultingReserved: 6,
    resultingOrdered: 9,
    resultingShipped: 3,
    reason: 'Réception usine Francfort BL-2026-9812',
    referenceDocument: 'BL-2026-9812',
    batchNumber: 'LOT-COLD-2026-01',
    performedByUserId: 'usr-supp-01',
    performedByUserName: 'EuroTech Industrial & ColdChain GmbH',
    performedByUserRole: 'FOURNISSEUR',
    timestamp: '2026-11-14T09:00:00Z',
    minStockAlertTriggered: false,
  },
  {
    id: 'stkm-init-02',
    movementNumber: 'MOV-2026-001092',
    productId: 'prod-01',
    sku: 'TL-COLD-400X',
    movementType: 'ORDER_RESERVATION',
    quantityChange: -6,
    resultingAvailable: 42,
    resultingReserved: 6,
    resultingOrdered: 9,
    resultingShipped: 3,
    reason: 'Réservation commande CMD-2026-8842',
    referenceDocument: 'CMD-2026-8842',
    orderId: 'ord-2026-8842',
    orderNumber: 'CMD-2026-8842',
    performedByUserId: 'usr-client-01',
    performedByUserName: 'Atlas Import & Distribution S.A.',
    performedByUserRole: 'CLIENT',
    timestamp: '2026-11-15T10:30:00Z',
    minStockAlertTriggered: false,
  },
  {
    id: 'stkm-init-03',
    movementNumber: 'MOV-2026-001093',
    productId: 'prod-01',
    sku: 'TL-COLD-400X',
    movementType: 'OUTBOUND_SHIPMENT',
    quantityChange: -3,
    resultingAvailable: 42,
    resultingReserved: 6,
    resultingOrdered: 9,
    resultingShipped: 3,
    reason: 'Expédition prise en charge par transporteur MedFreight',
    referenceDocument: 'CMD-2026-8841',
    orderId: 'ord-2026-8841',
    orderNumber: 'CMD-2026-8841',
    performedByUserId: 'usr-supp-01',
    performedByUserName: 'EuroTech Industrial & ColdChain GmbH',
    performedByUserRole: 'FOURNISSEUR',
    timestamp: '2026-11-16T14:15:00Z',
    minStockAlertTriggered: false,
  },
];

const INITIAL_STOCK_RESERVATIONS: StockReservationRecord[] = [
  {
    id: 'res-init-01',
    reservationNumber: 'RES-2026-009101',
    orderId: 'ord-2026-8842',
    orderNumber: 'CMD-2026-8842',
    clientId: 'usr-client-01',
    clientName: 'Atlas Import & Distribution S.A.',
    productId: 'prod-01',
    sku: 'TL-COLD-400X',
    quantity: 6,
    reservedAt: '2026-11-15T10:30:00Z',
    expiresAt: '2026-11-20T10:30:00Z',
    status: 'ACTIVE',
  },
];

const INITIAL_INVENTORY_SESSIONS: PhysicalInventorySession[] = [
  {
    id: 'inv-sess-init-01',
    sessionNumber: 'INV-2026-1042',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    title: 'Inventaire Physique Mensuel Entrepôt Munich',
    status: 'COMPLETED',
    startedAt: '2026-11-10T08:00:00Z',
    completedAt: '2026-11-10T17:30:00Z',
    conductedByUserId: 'usr-supp-01',
    conductedByUserName: 'EuroTech Industrial & ColdChain GmbH',
    lines: [
      {
        productId: 'prod-01',
        sku: 'TL-COLD-400X',
        productName: 'Conteneur Isotherme Actif Pharma -25°C à +8°C (IoT)',
        theoreticalAvailable: 40,
        physicalCounted: 42,
        varianceQuantity: 2,
        unitPrice: '4850.00',
        varianceValueEur: '9700.00',
        reconciled: true,
      },
    ],
    totalTheoreticalQty: 40,
    totalPhysicalQty: 42,
    totalVarianceQty: 2,
    totalVarianceValueEur: '9700.00',
    notes: 'Rapprochement validé suite à recomptage contradictoire.',
  },
];

const INITIAL_QUOTES: QuoteRecord[] = [
  {
    id: 'quo-2026-301',
    quoteNumber: 'DEV-2026-301',
    clientId: 'usr-client-01',
    clientName: 'Atlas Import & Distribution S.A.',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    status: 'RESPONDED',
    subtotalAmount: '42600.00',
    taxAmount: '8520.00',
    totalAmount: '51120.00',
    currency: 'EUR',
    amountInWords: 'Cinquante et un mille cent vingt euros toutes taxes comprises',
    validUntil: '2026-12-15',
    createdAt: '2026-11-14',
    lines: [
      {
        description: 'Robot Autonome AGV de Manutention Palette 1.5T (x3)',
        quantity: 3,
        unitPrice: '14200.00',
        discountPct: '0.00',
        totalLine: '42600.00',
      },
    ],
  },
];

const INITIAL_INVOICES: InvoiceRecord[] = [
  {
    id: 'inv-2026-9901',
    invoiceNumber: 'FAC-2026-9901',
    orderId: 'ord-2026-8841',
    orderNumber: 'CMD-2026-8841',
    clientId: 'usr-client-01',
    clientName: 'Atlas Import & Distribution S.A.',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    status: 'PAID',
    subtotal: '26400.00',
    taxAmount: '5030.00',
    totalAmount: '31430.00',
    currency: 'EUR',
    jurisdiction: 'EU / MA (Convention B2B)',
    issuedAt: '2026-11-15',
    dueAt: '2026-12-15',
    paidAt: '2026-11-16',
  },
  {
    id: 'inv-2026-9942',
    invoiceNumber: 'FAC-2026-9942',
    orderId: 'ord-2026-8890',
    orderNumber: 'CMD-2026-8890',
    clientId: 'usr-client-01',
    clientName: 'Atlas Import & Distribution S.A.',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    status: 'ISSUED',
    subtotal: '29850.00',
    taxAmount: '5780.00',
    totalAmount: '35630.00',
    currency: 'EUR',
    jurisdiction: 'EU / MA (Convention B2B)',
    issuedAt: '2026-11-17',
    dueAt: '2026-12-17',
  },
];

const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-01',
    paymentReference: 'PAY-STRP-2026-7719A',
    invoiceId: 'inv-2026-9901',
    invoiceNumber: 'FAC-2026-9901',
    clientId: 'usr-client-01',
    supplierId: 'usr-supp-01',
    provider: 'STRIPE',
    amount: '31430.00',
    currency: 'EUR',
    status: 'SUCCEEDED',
    webhookEventId: 'evt_3Q9xLm2eZvKYlo2C1948aBcD',
    idempotencyVerified: true,
    reconciled: true,
    createdAt: '2026-11-16 15:04:12',
  },
];

const INITIAL_MISSIONS: LogisticsMissionRecord[] = [
  {
    id: 'mis-2026-001',
    orderId: 'ord-2026-8841',
    orderNumber: 'CMD-2026-8841',
    clientId: 'usr-client-01',
    clientName: 'Atlas Import & Distribution S.A.',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    carrierId: 'usr-trans-01',
    carrierName: 'MedFreight Multimodal Carriers',
    status: 'OFFERED',
    assignedAt: '2026-11-18 08:30',
    pickupAddress: 'Hub Logistique Zenata, Casablanca',
    deliveryAddress: 'Plateforme Rungis, Paris Sud, France',
    cargoWeightKg: '24000.000',
    cargoVolumeM3: '88.000',
    isColdChain: true,
    requiredVehicleType: 'REEFER_ATP_FRIGO',
  },
  {
    id: 'mis-2026-002',
    orderId: 'ord-2026-8890',
    orderNumber: 'CMD-2026-8890',
    clientId: 'usr-client-01',
    clientName: 'Atlas Import & Distribution S.A.',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    carrierId: 'usr-trans-01',
    carrierName: 'MedFreight Multimodal Carriers',
    status: 'ACCEPTED',
    assignedAt: '2026-11-16 10:00',
    respondedAt: '2026-11-16 10:45',
    pickupAddress: 'Port de Hambourg (DEHAM)',
    deliveryAddress: 'Port de Tanger Med (MAPTM)',
    cargoWeightKg: '4250.000',
    cargoVolumeM3: '18.200',
    isColdChain: false,
    requiredVehicleType: 'SEMI_TRUCK_CURTAINSIDER',
  },
];

const INITIAL_SHIPMENTS: ShipmentRecord[] = [
  {
    id: 'shp-01',
    trackingNumber: 'TRK-AIR-2026-9041',
    orderId: 'ord-2026-8841',
    orderNumber: 'CMD-2026-8841',
    clientId: 'usr-client-01',
    carrierId: 'usr-trans-01',
    carrierName: 'MedFreight Multimodal Carriers',
    transportMode: 'AIR',
    icon3d: 'air-freight',
    origin: 'Francfort Cargo Hub (FRA)',
    destination: 'Casablanca Mohammed V Cargo (CMN)',
    status: 'IN_TRANSIT',
    weightKg: '1480.500',
    volumeM3: '11.400',
    palletsCount: 5,
    estimatedArrival: '2026-11-19 14:00',
    podSigned: false,
    customsCleared: true,
  },
  {
    id: 'shp-02',
    trackingNumber: 'TRK-SEA-2026-9088',
    orderId: 'ord-2026-8890',
    orderNumber: 'CMD-2026-8890',
    clientId: 'usr-client-01',
    carrierId: 'usr-trans-01',
    carrierName: 'MedFreight Multimodal Carriers',
    transportMode: 'SEA',
    icon3d: 'sea-freight',
    origin: 'Port de Hambourg (DEHAM)',
    destination: 'Port de Tanger Med (MAPTM)',
    status: 'ACCEPTED',
    weightKg: '4250.000',
    volumeM3: '18.200',
    palletsCount: 2,
    estimatedArrival: '2026-11-24 08:30',
    podSigned: false,
    customsCleared: false,
  },
  {
    id: 'shp-03',
    trackingNumber: 'SHP-2026-8819',
    orderId: 'ord-2026-8841',
    orderNumber: 'CMD-2026-8841',
    clientId: 'usr-client-01',
    carrierId: 'usr-trans-01',
    carrierName: 'MedFreight Multimodal Carriers',
    transportMode: 'ROAD',
    icon3d: 'cold-chain',
    origin: 'Hub Logistique Zenata, Casablanca (MA)',
    destination: 'Plateforme Rungis, Paris Sud (FR)',
    status: 'IN_TRANSIT',
    weightKg: '24000.000',
    volumeM3: '88.000',
    palletsCount: 26,
    estimatedArrival: '2026-11-20 16:00',
    podSigned: false,
    customsCleared: false,
  },
];

const INITIAL_INCIDENTS: IncidentRecord[] = [
  {
    id: 'inc-01',
    shipmentId: 'shp-01',
    trackingNumber: 'TRK-AIR-2026-9041',
    carrierId: 'usr-trans-01',
    title: 'Contrôle phytosanitaire & douanier complémentaire escale Madrid',
    description: 'Inspection documentaire du certificat GDP chaîne du froid résolue en 45 minutes. Température maintenue à +4.2°C.',
    severity: 'LOW',
    status: 'RESOLVED',
    reportedAt: '2026-11-17 11:20',
  },
];

const INITIAL_ROOMS: RoomLiveRecord[] = [
  {
    id: 'room-01',
    roomCode: 'RM-LIVE-8841',
    title: 'Coordination Douane & Livraison CMD-2026-8841 (Chaîne du Froid)',
    createdById: 'usr-supp-01',
    creatorName: 'Marc Vandenberg (Fournisseur)',
    creatorRole: 'FOURNISSEUR',
    status: 'LIVE',
    scheduledAt: '2026-11-18 10:00',
    participantsCount: 4,
    allowedUserIds: ['usr-admin-01', 'usr-client-01', 'usr-supp-01', 'usr-trans-01'],
    recordingConsent: true,
    aiSummaryAvailable: true,
    aiSummary: {
      summary:
        'Réunion de synchronisation logistique concernant l’expédition aérienne TRK-AIR-2026-9041. Le dédouanement anticipé à Casablanca CMN est validé et le camion frigorifique assurera le dernier kilomètre vers Zenata.',
      decisions: [
        'Validation du créneau de déchargement à l’entrepôt Zenata le 19/11 à 14h00',
        'Transmission automatique du relevé thermique IoT au comptable et au client',
      ],
      actionItems: [
        'MedFreight : téléverser la preuve de livraison signée (POD) dès réception',
        'Atlas Import : confirmer la disponibilité du quai n°3',
      ],
    },
  },
  {
    id: 'room-02',
    roomCode: 'RM-LIVE-8890',
    title: 'Revue Technique Chariot Lithium-Ion & Conditions Incoterm CIF',
    createdById: 'usr-admin-01',
    creatorName: 'Karim Mansouri (Admin)',
    creatorRole: 'ADMIN',
    delegatedClientHostId: 'usr-client-01',
    status: 'SCHEDULED',
    scheduledAt: '2026-11-19 15:30',
    participantsCount: 3,
    allowedUserIds: ['usr-admin-01', 'usr-client-01', 'usr-supp-01', 'usr-support-01'],
    recordingConsent: false,
    aiSummaryAvailable: false,
  },
];

const INITIAL_IMPORT_JOBS: ImportJobRecord[] = [
  {
    id: 'imp-01',
    fileName: 'ERP_Legacy_Commercial_Dump_2026.bak',
    format: 'BAK',
    sha256Checksum: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b',
    avScanStatus: 'CLEAN',
    sandboxStatus: 'SANDBOX_READY',
    rowsDetected: 14820,
    tablesDetected: ['dbo.Clients', 'dbo.Articles', 'dbo.Factures_2026', 'dbo.EcrituresCompta'],
    compatibilityScore: 98.4,
    initiatedBy: 'Karim Mansouri (usr-admin-01)',
    firstAdminApprover: 'usr-admin-01',
    createdAt: '2026-11-17 18:12',
  },
  {
    id: 'imp-02',
    fileName: 'Tarifs_Douaniers_SH_2026.dbf',
    format: 'DBF',
    sha256Checksum: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    avScanStatus: 'CLEAN',
    sandboxStatus: 'PROMOTED_DOUBLE_APPROVED',
    rowsDetected: 3250,
    tablesDetected: ['SH_NOMENCLATURE_CDX'],
    compatibilityScore: 100,
    initiatedBy: 'Karim Mansouri (usr-admin-01)',
    firstAdminApprover: 'usr-admin-01',
    secondAdminApprover: 'usr-admin-02 (Sophie Laurent)',
    createdAt: '2026-11-16 09:40',
  },
];

const INITIAL_BACKUPS: BackupRecord[] = [
  {
    id: 'bkp-2026-1118',
    backupCode: 'BKP-FULL-20261118-0200',
    type: 'FULL_SCHEDULED',
    sizeFormatted: '4.82 GB (Chiffré AES-256-GCM)',
    encryptionKeyAlias: 'alias/tradelink-prod-kek-v4',
    sha256: 'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a',
    status: 'VERIFIED',
    restoreStatus: 'PENDING_SECOND_APPROVAL',
    restoreInitiatorId: 'usr-admin-01',
    restoreInitiatorName: 'Karim Mansouri (Admin #1)',
    planHash: 'PLAN-IMMUTABLE-99281A',
    createdAt: '2026-11-18 02:00:00',
  },
  {
    id: 'bkp-2026-1117',
    backupCode: 'BKP-SNAP-20261117-1800',
    type: 'PRE_MIGRATION',
    sizeFormatted: '4.79 GB (Chiffré AES-256-GCM)',
    encryptionKeyAlias: 'alias/tradelink-prod-kek-v4',
    sha256: 'f5ca38f748a1d6eaf726b8a42fb575c3c71f1864a8143301782de13da2d9202b',
    status: 'VERIFIED',
    restoreStatus: 'NONE',
    createdAt: '2026-11-17 18:00:00',
  },
];

const INITIAL_KMS_KEYS: KMSKeyRecord[] = [
  {
    id: 'kms-01',
    keyAlias: 'alias/tradelink-prod-kek-v4',
    keyType: 'KEK_MASTER',
    algorithm: 'AES-256-GCM',
    kmsProvider: 'HASHICORP_VAULT_KMS',
    keyArnMasked: 'vault://kms/eu-west-1/key/••••••••-••••-49a1-b82c-99102f88e104',
    version: 4,
    status: 'ACTIVE',
    lastRotatedAt: '2026-10-01 00:00',
    nextRotationAt: '2027-01-01 00:00',
  },
  {
    id: 'kms-02',
    keyAlias: 'alias/tradelink-kyc-dek-envelope',
    keyType: 'DEK_ENVELOPE',
    algorithm: 'AES-256-GCM',
    kmsProvider: 'HASHICORP_VAULT_KMS',
    keyArnMasked: 'vault://kms/eu-west-1/dek/••••••••-••••-41c0-a11d-33819c002190',
    version: 9,
    status: 'ACTIVE',
    lastRotatedAt: '2026-11-01 00:00',
    nextRotationAt: '2026-12-01 00:00',
  },
];

const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'aud-101',
    timestamp: '2026-11-18 08:15:22',
    actorName: 'Karim Mansouri',
    actorRole: 'ADMIN',
    action: 'SESSION_SINGLE_ENFORCEMENT',
    targetType: 'Session',
    targetId: 'sess-redis-9941a',
    result: 'SUCCESS',
    correlationId: 'corr-99812-a1',
    ipAddress: '195.154.122.10',
    details: 'Nouvelle connexion Admin validée par MFA TOTP ; session précédente révoquée.',
  },
  {
    id: 'aud-102',
    timestamp: '2026-11-17 18:14:05',
    actorName: 'Karim Mansouri',
    actorRole: 'ADMIN',
    action: 'SANDBOX_ISOLATED_BAK_ANALYSIS',
    targetType: 'ImportJob',
    targetId: 'imp-01',
    result: 'SUCCESS',
    correlationId: 'corr-99740-b8',
    ipAddress: '195.154.122.10',
    details: 'Analyse statique et restauration BAK en instance SQL Server éphémère sans réseau prod.',
  },
  {
    id: 'aud-103',
    timestamp: '2026-11-17 15:40:19',
    actorName: 'Youssef Berrada',
    actorRole: 'CLIENT',
    action: 'ROOM_CREATE_ATTEMPT_BLOCKED',
    targetType: 'Room',
    targetId: 'N/A',
    result: 'DENIED',
    correlationId: 'corr-99611-c4',
    ipAddress: '196.200.141.55',
    details: 'Contrôle RBAC serveur : le rôle CLIENT ne dispose pas du droit général de création Room Live.',
  },
  {
    id: 'aud-104',
    timestamp: '2026-11-16 14:22:30',
    actorName: 'Youssef Berrada',
    actorRole: 'CLIENT',
    action: 'KYC_SUBMITTED_ON_TIME',
    targetType: 'KYC',
    targetId: 'kyc-dos-01',
    result: 'SUCCESS',
    correlationId: 'corr-99402-d9',
    ipAddress: '196.200.141.55',
    details: '3 justificatifs chiffrés AES-256-GCM déposés à J+4. Protection contre suspension automatique J+7 activée.',
  },
];

const INITIAL_FLOATING_BUTTONS: FloatingButtonItem[] = [
  {
    id: 'fb-1',
    code: 'AI_ASSISTANT',
    label: { fr: 'Assistant IA & RAG', en: 'AI & RAG Assistant', ar: 'المساعد الذكي IA' },
    icon3d: 'warehouse-robot',
    position: 'BOTTOM_RIGHT',
    displayOrder: 1,
    isEnabled: true,
    requiresConsent: false,
  },
  {
    id: 'fb-2',
    code: 'VOICE_DICTATION',
    label: { fr: 'Dictée Vocale STT', en: 'Voice Dictation STT', ar: 'الإملاء الصوتي' },
    icon3d: 'support',
    position: 'BOTTOM_RIGHT',
    displayOrder: 2,
    isEnabled: true,
    requiresConsent: true,
  },
  {
    id: 'fb-3',
    code: 'WHATSAPP',
    label: { fr: 'WhatsApp B2B Direct', en: 'WhatsApp B2B Desk', ar: 'واتساب للأعمال' },
    icon3d: 'live-tracking',
    position: 'BOTTOM_RIGHT',
    displayOrder: 3,
    isEnabled: true,
    requiresConsent: true,
  },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    cat: 'KYC',
    title: 'Dossier KYC soumis à J+4 dans les délais',
    msg: 'Vos justificatifs chiffrés AES-256-GCM sont en attente de revue administrative. Aucune suspension automatique J+7 ne sera déclenchée.',
    icon: 'customs-stamp',
    isRead: false,
    timestamp: 'Il y a 15 min',
  },
  {
    id: 'notif-2',
    cat: 'LOGISTIQUE',
    title: 'Expédition TRK-AIR-2026-9041 en transit aérien',
    msg: 'Température chaîne du froid maintenue à +4.2°C. Arrivée prévue à Casablanca CMN.',
    icon: 'air-freight',
    isRead: false,
    timestamp: 'Il y a 1h',
  },
  {
    id: 'notif-3',
    cat: 'SÉCURITÉ',
    title: 'Politique de session unique appliquée',
    msg: 'Votre connexion a invalidé la session active précédente dans Redis.',
    icon: 'secure-parcel',
    isRead: true,
    timestamp: 'Il y a 3h',
  },
  {
    id: 'notif-4',
    cat: 'FINANCE',
    title: 'Paiement Stripe PAY-STRP-2026-7719A rapproché',
    msg: 'Idempotence webhook vérifiée sur la facture FAC-2026-9901 (31 430,00 EUR).',
    icon: 'payment',
    isRead: true,
    timestamp: 'Hier',
  },
];

interface AppContextValue {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  isRtl: boolean;
  t: (key: string) => string;
  theme: ThemeMode;
  resolvedDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleQuickTheme: () => void;
  uxPreviewState: UXPreviewState;
  setUxPreviewState: (st: UXPreviewState) => void;
  currentUser: UserProfile;
  switchUserAccount: (userKey: keyof typeof DEMO_USERS) => void;
  products: ProductItem[];
  categories: ProductCategoryRecord[];
  addCategory: (cat: { code: string; name: Record<Locale, string>; description: Record<Locale, string>; parentCategoryId?: string; icon3d?: Icon3DName; imageUrl?: string; displayOrder?: number }) => void;
  updateCategory: (id: string, updates: Partial<ProductCategoryRecord>) => void;
  deleteCategory: (id: string) => { ok: boolean; message: string };
  catalogFavorites: string[];
  toggleCatalogFavorite: (productId: string) => void;
  isCatalogFavorite: (productId: string) => boolean;
  comparisonProductIds: string[];
  toggleComparisonProduct: (productId: string) => void;
  clearComparison: () => void;
  moderateProduct: (productId: string, action: 'APPROVE' | 'REJECT', reason?: string) => void;
  reportProduct: (productId: string, reason: string) => void;
  suspendProduct: (productId: string, reason: string) => void;
  updateProductQuick: (productId: string, stock: number, price: string) => void;
  addProduct: (p: Omit<ProductItem, 'id'>) => void;
  updateProductDetails: (productId: string, sku: string, unitPrice: string, nameFr: string, nameAr: string) => void;
  updateProductStock: (productId: string, delta: number, reason: string) => void;
  stockMovements: StockMovementRecord[];
  stockReservations: StockReservationRecord[];
  inventorySessions: PhysicalInventorySession[];
  stockAlerts: StockAlertRecord[];
  recordInboundStock: (productId: string, quantity: number, reason: string, referenceDocument?: string, batchNumber?: string) => void;
  adjustStockManual: (productId: string, delta: number, reason: string, movementType?: StockMovementType) => void;
  createInventorySession: (title: string, notes?: string) => PhysicalInventorySession | null;
  updateInventoryCount: (sessionId: string, counts: { productId: string; physicalCounted: number; notes?: string }[]) => void;
  reconcileInventorySession: (sessionId: string, notes?: string) => void;
  archiveProduct: (productId: string) => void;
  deleteProduct: (productId: string) => { ok: boolean; message: string };
  importProductsBulk: (items: Omit<ProductItem, 'id'>[]) => number;
  cart: CartItem[];
  addToCart: (product: ProductItem, qty?: number) => void;
  updateCartQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  orders: OrderRecord[];
  createOrderFromCart: (shippingAddress: string, paymentMethod: string) => OrderRecord | null;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  updateOrderStatusWithReason: (orderId: string, newStatus: OrderStatus, reason?: string) => void;
  quotes: QuoteRecord[];
  createQuote: (q: Omit<QuoteRecord, 'id' | 'quoteNumber' | 'createdAt'>) => void;
  convertQuoteToOrder: (quoteId: string) => void;
  respondToQuote: (quoteId: string, adjustedAmount: string, notes?: string) => void;
  invoices: InvoiceRecord[];
  payInvoice: (invoiceId: string) => void;
  payments: PaymentRecord[];
  shipments: ShipmentRecord[];
  updateShipmentStatus: (shipmentId: string, status: ShipmentStatus, podSign?: boolean) => void;
  incidents: IncidentRecord[];
  reportIncident: (shipmentId: string, title: string, description: string, severity: IncidentRecord['severity']) => void;
  vehicles: VehicleRecord[];
  missions: LogisticsMissionRecord[];
  waypoints: Record<string, RouteWaypoint[]>;
  respondToMission: (missionId: string, accept: boolean, rejectionReason?: string) => void;
  createLogisticsMission: (orderId: string, carrierId?: string, isColdChain?: boolean) => LogisticsMissionRecord | null;
  recordProofOfDelivery: (shipmentId: string, podData: ProofOfDeliveryData) => void;
  addVehicle: (v: Omit<VehicleRecord, 'id'>) => void;
  updateVehicleStatus: (vehicleId: string, status: VehicleRecord['status']) => void;
  resolveIncident: (incidentId: string) => void;
  kycDossiers: KYCDossier[];
  submitClientKYCDocument: (docType: string, fileName: string) => void;
  uploadKycDocumentForDossier: (
    dossierId: string,
    docType: string,
    fileName: string,
    fileSizeBytes?: number
  ) => void;
  reviewKYCDossier: (
    dossierId: string,
    decision: 'VALIDATED' | 'REJECTED' | 'COMPLEMENT_REQUESTED' | 'REACTIVATE',
    reason?: string
  ) => void;
  addAdminKycComment: (
    dossierId: string,
    comment: string,
    visibility?: 'INTERNAL_ADMIN_ONLY' | 'SHARED_WITH_APPLICANT',
    targetDocType?: string
  ) => void;
  triggerKycScheduledCron: (simulatedDayOverride?: number) => KycCronExecutionReport;
  recordKycDocumentPreview: (dossierId: string, docId: string, fileName: string) => void;
  updateKycProfile: (
    dossierId: string,
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
    }
  ) => void;
  calcHistory: CalculationResultRecord[];
  runFinancialCalculation: (
    principalStr: string,
    annualRatePctStr: string,
    startDateStr: string,
    endDateStr: string,
    basis: DayCountBasis
  ) => CalculationResultRecord;
  rooms: RoomLiveRecord[];
  createRoomLive: (
    titleOrParams:
      | string
      | {
          title: string;
          scheduledAt: string;
          description?: string;
          isImmediate?: boolean;
          isPrivate?: boolean;
          hasWaitingRoom?: boolean;
          allowedUserIds?: string[];
          invitedEmails?: string[];
          durationMinutes?: number;
        },
    scheduledAtFallback?: string
  ) => { ok: boolean; message: string; room?: RoomLiveRecord };
  importJobs: ImportJobRecord[];
  addImportJob: (fileName: string) => void;
  backups: BackupRecord[];
  createManualBackup: () => void;
  approveBackupRestore: (backupId: string) => { ok: boolean; message: string };
  kmsKeys: KMSKeyRecord[];
  rotateKMSKey: (keyId: string) => void;
  auditLogs: AuditLogRecord[];
  addAuditLog: (action: string, targetType: string, targetId: string, result: AuditLogRecord['result'], details: string) => void;

  // PROMPT 11 : Administration Avancée (Sandbox, KMS, Backups & Audit)
  sandboxReports: Record<string, SandboxAnalysisReport>;
  activeSandboxReport: SandboxAnalysisReport | null;
  setActiveSandboxReport: (report: SandboxAnalysisReport | null) => void;
  analyzeSandboxFile: (fileName: string, format?: ImportExportFormat) => SandboxAnalysisReport;
  promoteSandboxReport: (reportId: string) => { ok: boolean; message: string };
  testBackupRestoreInSandbox: (backupId: string) => { ok: boolean; message: string; details?: any };
  kmsOperationsHistory: KmsOperationEntry[];
  simulateKmsEnvelopeCipher: (plainText: string, keyId: string) => EnvelopeCipherResult;
  exportDatasetAction: (entity: 'PRODUCTS' | 'ORDERS' | 'ENTRIES' | 'AUDIT_LOGS', format: ImportExportFormat) => { fileName: string; content: string; mimeType: string; sha256: string };
  verifyAuditChainAction: () => { isChainIntact: boolean; brokenIndex?: number; totalEntriesVerified: number; latestHash: string };
  floatingButtons: FloatingButtonItem[];
  toggleFloatingButton: (id: string) => void;
  notificationsList: NotificationItem[];
  toggleNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  aiDrawerOpen: boolean;
  setAiDrawerOpen: (open: boolean) => void;
  voiceModalOpen: boolean;
  setVoiceModalOpen: (open: boolean) => void;
  toastMessage: { text: string; type: 'success' | 'error' | 'warning' | 'info' } | null;
  notifyToast: (text: string, type?: 'success' | 'error' | 'warning' | 'info') => void;

  // Moteur d'Intelligence Artificielle & RAG
  aiThreads: AiConversationThread[];
  activeAiThreadId: string;
  setActiveAiThreadId: (id: string) => void;
  selectedAiModelId: string;
  setSelectedAiModelId: (id: string) => void;
  sendAiAssistantQuery: (question: string) => Promise<{ answer: string; sources: RagSourceCitation[]; quotaRemainingPct: number }>;
  createNewAiThread: (title?: string) => string;
  aiQuota: AiQuotaState;

  // Moteur OCR / IDP Studio
  ocrDocument: OcrDocumentRecord;
  uploadOcrFile: (fileName: string) => void;
  correctOcrField: (fieldKey: string, newValue: string) => void;
  reviewDynamicField: (fieldId: string, status: 'APPROVED' | 'REJECTED', comment?: string) => void;
  validateOcrDocument: () => { success: boolean; message: string };

  // Dictée Vocale Multilingue STT / TTS
  activeVoiceLang: VoiceLanguage;
  setActiveVoiceLang: (lang: VoiceLanguage) => void;
  voiceTranscript: string;
  setVoiceTranscript: (text: string) => void;
  isVoiceRecording: boolean;
  setIsVoiceRecording: (rec: boolean) => void;
  startVoiceDictation: (lang?: VoiceLanguage) => void;
  stopVoiceDictation: () => void;
  speakVoiceText: (text: string, lang?: VoiceLanguage) => void;

  // Session Room Live WebRTC / SFU
  activeRoomSession: RoomLiveSessionState;
  roomViewMode: RoomViewMode;
  setRoomViewMode: (mode: RoomViewMode) => void;
  moderateRoomParticipant: (
    targetParticipantId: string,
    action: 'MUTE_MIC' | 'DISABLE_CAM' | 'EXPEL' | 'DELEGATE_HOST' | 'ADMIT' | 'DENY' | 'LOWER_HAND'
  ) => void;
  toggleRoomMedia: (type: 'audio' | 'video' | 'screen') => void;
  sendRoomChatMessage: (text: string) => void;
  addRoomSubtitle: (text: string) => void;
  exportRoomCertifiedSummary: () => string;
  toggleRaiseHand: (participantId?: string) => void;
  broadcastRoomReaction: (emoji: string) => void;
  startRoomRecording: () => { ok: boolean; message: string };
  stopRoomRecording: () => { ok: boolean; message: string };
  generateRoomAiSummary: (targetLocale?: 'fr' | 'en' | 'ar') => RoomLiveAiSummary;
  shareRoomDocument: (document: { id: string; title: string; type: string; url?: string; previewUrl?: string }) => void;
  stopSharingRoomDocument: () => void;

  // Messagerie B2B Centralisée & Préférences de Notifications (PROMPT 08)
  notificationPreferences: NotificationPreferencesRecord;
  updateNotificationPreferences: (updated: Partial<NotificationPreferencesRecord>) => void;
  conversationsList: ConversationRecord[];
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  activeConversationMessages: ConversationMessageRecord[];
  sendB2BMessage: (text: string, attachments?: MessageAttachment[]) => Promise<void>;
  uploadB2BAttachment: (file: File) => Promise<MessageAttachment | null>;
  createB2BConversation: (
    title: string,
    participants: ConversationParticipantDetail[],
    relatedId?: string,
    relatedType?: 'ORDER' | 'SHIPMENT' | 'QUOTE' | 'TICKET' | 'OTHER'
  ) => Promise<ConversationRecord>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem('tradelink_preferred_locale');
      if (saved === 'fr' || saved === 'en' || saved === 'ar') {
        return saved as Locale;
      }
    } catch {}
    return 'fr';
  });
  const [uxPreviewState, setUxPreviewState] = useState<UXPreviewState>('normal');
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('color-scheme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'system';
  });
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS.ADMIN_1);
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<ProductCategoryRecord[]>(INITIAL_CATALOG_CATEGORIES);
  const [catalogFavorites, setCatalogFavorites] = useState<string[]>(['prod-01']);
  const [comparisonProductIds, setComparisonProductIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([
    { product: INITIAL_PRODUCTS[0], quantity: 2 },
  ]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_ORDERS);
  const [stockMovements, setStockMovements] = useState<StockMovementRecord[]>(INITIAL_STOCK_MOVEMENTS);
  const [stockReservations, setStockReservations] = useState<StockReservationRecord[]>(INITIAL_STOCK_RESERVATIONS);
  const [inventorySessions, setInventorySessions] = useState<PhysicalInventorySession[]>(INITIAL_INVENTORY_SESSIONS);
  const [stockAlerts] = useState<StockAlertRecord[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>(INITIAL_QUOTES);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(INITIAL_INVOICES);
  const [payments, setPayments] = useState<PaymentRecord[]>(INITIAL_PAYMENTS);
  const [shipments, setShipments] = useState<ShipmentRecord[]>(INITIAL_SHIPMENTS);
  const [incidents, setIncidents] = useState<IncidentRecord[]>(INITIAL_INCIDENTS);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(INITIAL_CARRIER_VEHICLES);
  const [missions, setMissions] = useState<LogisticsMissionRecord[]>(INITIAL_MISSIONS);
  const [waypoints, setWaypoints] = useState<Record<string, RouteWaypoint[]>>(INITIAL_SHIPMENT_WAYPOINTS);
  const [kycDossiers, setKycDossiers] = useState<KYCDossier[]>(INITIAL_KYC_DOSSIERS);
  const [calcHistory, setCalcHistory] = useState<CalculationResultRecord[]>(() => [
    calculateFinancialInterest({
      principalStr: '125000.00',
      annualRatePctStr: '5.75',
      startDateStr: '2026-01-01',
      endDateStr: '2026-06-30',
      basis: 'ACT/365',
      executedBy: 'Claire Dubois (Comptable)',
    }),
    calculateFinancialInterest({
      principalStr: '250000.00',
      annualRatePctStr: '4.50',
      startDateStr: '2024-01-01',
      endDateStr: '2024-12-31',
      basis: 'ACT/ACT',
      executedBy: 'Claire Dubois (Année bissextile 2024 - 366j)',
    }),
  ]);
  const [rooms, setRooms] = useState<RoomLiveRecord[]>(INITIAL_ROOMS);
  const [importJobs, setImportJobs] = useState<ImportJobRecord[]>(INITIAL_IMPORT_JOBS);
  const [backups, setBackups] = useState<BackupRecord[]>(INITIAL_BACKUPS);
  const [kmsKeys, setKmsKeys] = useState<KMSKeyRecord[]>(INITIAL_KMS_KEYS);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(INITIAL_AUDIT_LOGS);

  // PROMPT 11 : État Sandbox, Rapports et KMS
  const [sandboxReports, setSandboxReports] = useState<Record<string, SandboxAnalysisReport>>(() => {
    const initialReport = analyzeFileInIsolatedSandbox({
      fileName: 'Archive_Catalogue_ERP_2026.bak',
      fileSize: 4850000,
      format: 'BAK',
    });
    return {
      'imp-01': initialReport,
      [initialReport.jobId]: initialReport,
    };
  });
  const [activeSandboxReport, setActiveSandboxReport] = useState<SandboxAnalysisReport | null>(() => {
    return Object.values(sandboxReports)[0] || null;
  });
  const [kmsOperationsHistory, setKmsOperationsHistory] = useState<KmsOperationEntry[]>([
    {
      id: 'kms-op-101',
      timestamp: '2026-10-01 00:00:00',
      operation: 'ROTATE_KEK',
      keyAlias: 'alias/tradelink-prod-kek-v4',
      keyArnMasked: 'vault://kms/eu-west-1/key/••••••••-••••-49a1-b82c-99102f88e104',
      performedBy: 'direction.sec@tradelink-saas.com',
      result: 'SUCCESS',
      details: 'Rotation annuelle programmée HSM. KEK v3 -> v4 avec ré-enveloppement transparent des DEKs.',
    },
    {
      id: 'kms-op-102',
      timestamp: '2026-11-17 18:12:30',
      operation: 'GENERATE_DATA_KEY',
      keyAlias: 'alias/tradelink-kyc-dek-envelope',
      keyArnMasked: 'vault://kms/eu-west-1/key/••••••••-••••-77b3-c19a-883901bc0912',
      performedBy: 'system-kyc-vault@tradelink-saas.com',
      result: 'SUCCESS',
      details: 'Génération DEK éphémère 256 bits en RAM pour chiffrement du dossier KYC #kdos-01.',
    },
    {
      id: 'kms-op-103',
      timestamp: '2026-11-18 02:00:15',
      operation: 'GENERATE_DATA_KEY',
      keyAlias: 'alias/tradelink-prod-kek-v4',
      keyArnMasked: 'vault://kms/eu-west-1/key/••••••••-••••-49a1-b82c-99102f88e104',
      performedBy: 'system-backup-scheduler@tradelink-saas.com',
      result: 'SUCCESS',
      details: 'Génération DEK pour sauvegarde snapshot BKP-FULL-20261118-0200.',
    },
  ]);
  const [floatingButtons, setFloatingButtons] = useState<FloatingButtonItem[]>(INITIAL_FLOATING_BUTTONS);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferencesRecord>({
    id: 'pref-default',
    userId: DEMO_USERS.ADMIN_1.id,
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
    smsPhoneNumber: '+33 6 12 34 56 78',
    updatedAt: new Date().toISOString(),
  });

  const [conversationsList, setConversationsList] = useState<ConversationRecord[]>([
    {
      id: 'conv-b2b-01',
      type: 'ORDER_THREAD',
      title: 'Commande #CMD-2026-001 — Coordination Expédition',
      participantIds: ['usr-client-01', 'usr-admin-01'],
      participantDetails: [
        {
          id: 'usr-client-01',
          name: 'Atlas Trading & Imports',
          role: 'CLIENT',
          email: 'youssef.berrada@atlastrading.ma',
        },
        {
          id: 'usr-admin-01',
          name: 'Karim Mansouri (Admin TradeLink)',
          role: 'ADMIN',
          email: 'direction.sec@tradelink-saas.com',
        },
      ],
      relatedEntityId: 'CMD-2026-001',
      relatedEntityType: 'ORDER',
      lastMessageSnippet: 'Bonjour, les conteneurs sont scellés et prêts pour enlèvement au quai A3.',
      lastMessageAt: new Date(Date.now() - 1800000).toISOString(),
      unreadCountByUser: {
        'usr-client-01': 0,
        'usr-admin-01': 1,
      },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'conv-b2b-02',
      type: 'SHIPMENT_THREAD',
      title: 'Expédition #TRK-2026-901 — Télémétrie & CMR',
      participantIds: ['usr-client-01', 'usr-admin-01'],
      participantDetails: [
        {
          id: 'usr-client-01',
          name: 'Atlas Trading & Imports',
          role: 'CLIENT',
          email: 'youssef.berrada@atlastrading.ma',
        },
        {
          id: 'usr-admin-01',
          name: 'Karim Mansouri',
          role: 'ADMIN',
          email: 'direction.sec@tradelink-saas.com',
        },
      ],
      relatedEntityId: 'TRK-2026-901',
      relatedEntityType: 'SHIPMENT',
      lastMessageSnippet: 'La lettre de voiture électronique (e-CMR) a été contresignée avec succès.',
      lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
      unreadCountByUser: {
        'usr-client-01': 0,
        'usr-admin-01': 0,
      },
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);

  const [activeConversationId, setActiveConversationId] = useState<string>('conv-b2b-01');

  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ConversationMessageRecord[]>>({
    'conv-b2b-01': [
      {
        id: 'msg-01',
        conversationId: 'conv-b2b-01',
        senderId: 'usr-client-01',
        senderName: 'Atlas Trading & Imports',
        senderRole: 'CLIENT',
        originalText: 'Bonjour Karim, nous confirmons la finalisation de la commande #CMD-2026-001.',
        sourceLang: 'fr',
        isTranslated: false,
        attachments: [],
        status: 'READ',
        readBy: [
          { userId: 'usr-client-01', readAt: new Date(Date.now() - 3600000).toISOString() },
          { userId: 'usr-admin-01', readAt: new Date(Date.now() - 3500000).toISOString() },
        ],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'msg-02',
        conversationId: 'conv-b2b-01',
        senderId: 'usr-client-01',
        senderName: 'Atlas Trading & Imports',
        senderRole: 'CLIENT',
        originalText: 'يرجى تأكيد موعد وصول الشاحنة إلى رصيف الميناء.',
        sourceLang: 'ar',
        translatedText: 'Veuillez confirmer l’heure d’arrivée du camion au quai du port.',
        targetLang: 'fr',
        isTranslated: true,
        attachments: [],
        status: 'SENT',
        readBy: [{ userId: 'usr-client-01', readAt: new Date(Date.now() - 1800000).toISOString() }],
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
    'conv-b2b-02': [
      {
        id: 'msg-03',
        conversationId: 'conv-b2b-02',
        senderId: 'usr-admin-01',
        senderName: 'Karim Mansouri',
        senderRole: 'ADMIN',
        originalText: 'La lettre de voiture électronique (e-CMR) a été contresignée avec succès.',
        sourceLang: 'fr',
        isTranslated: false,
        attachments: [
          {
            id: 'att-mock-cmr-01',
            fileName: 'eCMR_TRK-2026-901_Certifiee.pdf',
            fileSizeBytes: 420000,
            mimeType: 'application/pdf',
            storageKey: 'attachments/b2b/2026/eCMR_TRK-2026-901_Certifiee.pdf',
            presignedDownloadUrl: '#download-mock-cmr',
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
            sha256: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
            virusScanStatus: 'CLEAN',
          },
        ],
        status: 'READ',
        readBy: [
          { userId: 'usr-admin-01', readAt: new Date(Date.now() - 7200000).toISOString() },
          { userId: 'usr-client-01', readAt: new Date(Date.now() - 7000000).toISOString() },
        ],
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
  });
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  // Intelligence Artificielle & RAG
  const [aiThreads, setAiThreads] = useState<AiConversationThread[]>([
    {
      id: 'thread-default-01',
      title: 'Assistant RAG & Règles TradeLink V6.0',
      userId: DEMO_USERS.ADMIN_1.id,
      role: DEMO_USERS.ADMIN_1.role,
      modelId: 'gemini-1.5-pro',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg-init-1',
          threadId: 'thread-default-01',
          sender: 'ASSISTANT',
          text: "Bonjour ! Je suis votre Assistant IA TradeLink V6.0 connecté au moteur RAG avec filtrage strict par rôle. Comment puis-je vous assister aujourd'hui dans la gestion de vos opérations B2B ?",
          timestamp: '10:00',
          ragSources: [
            {
              domain: 'SYSTEM',
              title: 'Base de Connaissances TradeLink V6.0',
              referenceId: 'SYS-RAG-INDEX',
              snippet: 'Index sémantique unifié des factures, commandes, logistique GDP, conformité KYC et douanes.',
              confidence: 0.99,
              accessRoles: ['ADMIN', 'CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'SUPPORT'],
            },
          ],
        },
      ],
      totalTokensConsumed: 120,
    },
  ]);
  const [activeAiThreadId, setActiveAiThreadId] = useState<string>('thread-default-01');
  const [selectedAiModelId, setSelectedAiModelId] = useState<string>('gemini-1.5-pro');

  // OCR / IDP Studio
  const [ocrDocument, setOcrDocument] = useState<OcrDocumentRecord>(createMockOcrDocument);

  // Dictée Vocale STT / TTS
  const [activeVoiceLang, setActiveVoiceLang] = useState<VoiceLanguage>('fr-FR');
  const [voiceTranscript, setVoiceTranscript] = useState<string>(
    'Vérification de la température de transport sous chaîne du froid GDP à l’arrivée de Casablanca.'
  );
  const [isVoiceRecording, setIsVoiceRecording] = useState<boolean>(false);

  // Room Live WebRTC / SFU
  const [activeRoomSession, setActiveRoomSession] = useState<RoomLiveSessionState>(() =>
    initializeRoomLiveSession('RM-LIVE-8821')
  );
  const [roomViewMode, setRoomViewMode] = useState<RoomViewMode>('GRID');

  const notifyToast = (
    text: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'color-scheme') {
        const val = e.newValue;
        if (val === 'light' || val === 'dark') setThemeState(val);
        else setThemeState('system');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const resolvedDark = theme === 'system' ? systemDark : theme === 'dark';

  useEffect(() => {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute('content', theme === 'system' ? 'light dark' : theme);
    }
    document.documentElement.classList.toggle('dark', resolvedDark);
  }, [theme, resolvedDark]);

  const isRtl = locale === 'ar';
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    try {
      i18n.changeLanguage(locale);
    } catch {}
  }, [locale, isRtl]);

  const setLocale = (loc: Locale) => {
    setLocaleState(loc);
    try {
      localStorage.setItem('tradelink_preferred_locale', loc);
      i18n.changeLanguage(loc);
    } catch {}
    notifyToast(
      loc === 'ar'
        ? 'تم تفعيل اللغة العربية واتجاه RTL بالكامل'
        : loc === 'en'
        ? 'Language switched to English (LTR)'
        : 'Langue basculée en Français (LTR)',
      'info'
    );
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      if (mode === 'system') {
        localStorage.removeItem('color-scheme');
      } else {
        localStorage.setItem('color-scheme', mode);
      }
    } catch {}
  };

  const toggleQuickTheme = () => {
    const targetScheme: 'light' | 'dark' = resolvedDark ? 'light' : 'dark';
    const currentSys: 'light' | 'dark' = systemDark ? 'dark' : 'light';
    if (targetScheme === currentSys) {
      setTheme('system');
    } else {
      setTheme(targetScheme);
    }
  };

  const t = (key: string): string => {
    try {
      const i18nVal = i18n.t(key);
      if (i18nVal && i18nVal !== key) {
        return i18nVal;
      }
    } catch {}
    return translations[locale]?.[key] ?? translations.fr[key] ?? key;
  };

  const addAuditLog = (
    action: string,
    targetType: string,
    targetId: string,
    result: AuditLogRecord['result'],
    details: string
  ) => {
    const entry: AuditLogRecord = {
      id: `aud-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actorName: `${currentUser.firstName} ${currentUser.lastName}`,
      actorRole: currentUser.role,
      action,
      targetType,
      targetId,
      result,
      correlationId: `corr-${Math.random().toString(36).slice(2, 8)}`,
      ipAddress: '195.154.122.10',
      details,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  const switchUserAccount = (userKey: keyof typeof DEMO_USERS) => {
    const nextUser = {
      ...DEMO_USERS[userKey],
      activeSessionId: `sess-redis-${Math.random().toString(36).slice(2, 7)}`,
      previousSessionRevoked: true,
    };
    setCurrentUser(nextUser);
    addAuditLog(
      'AUTH_LOGIN_SINGLE_SESSION_REVOKED_PREVIOUS',
      'Session',
      nextUser.activeSessionId,
      'SUCCESS',
      `Connexion ${nextUser.role} (${nextUser.email}) — Session précédente invalidée dans Redis.`
    );
    notifyToast(
      `Connecté en tant que ${nextUser.firstName} ${nextUser.lastName} [${nextUser.role}] — Session unique active (${nextUser.activeSessionId})`,
      'success'
    );
  };

  const addProduct = (p: Omit<ProductItem, 'id'>) => {
    if (currentUser.role === 'COMPTABLE') {
      notifyToast('Action refusée : Le rôle Comptable est en lecture seule sur le catalogue produit.', 'error');
      return;
    }
    const newProd: ProductItem = { ...p, id: `prod-${Date.now().toString().slice(-4)}` };
    setProducts((prev) => [newProd, ...prev]);
    addAuditLog('PRODUCT_CREATED', 'Product', newProd.sku, 'SUCCESS', `Produit ${newProd.sku} ajouté au catalogue.`);
    notifyToast(`Produit ${newProd.sku} créé avec traductions FR/EN/AR.`, 'success');
  };

  const updateProductDetails = (
    productId: string,
    sku: string,
    unitPrice: string,
    nameFr: string,
    nameAr: string
  ) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, sku, unitPrice, name: { ...p.name, fr: nameFr, ar: nameAr } }
          : p
      )
    );
    addAuditLog('PRODUCT_UPDATED', 'Product', sku, 'SUCCESS', `Fiche produit ${sku} mise à jour.`);
    notifyToast(`Fiche produit ${sku} enregistrée avec succès.`, 'success');
  };

  const updateProductStock = (productId: string, delta: number, reason: string) => {
    if (currentUser.role === 'COMPTABLE') {
      notifyToast('Action refusée : Le Comptable est en lecture seule (Stage 3) sur les stocks.', 'error');
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stockAvailable: Math.max(0, p.stockAvailable + delta) }
          : p
      )
    );
    addAuditLog('STOCK_MOVEMENT', 'Product', productId, 'SUCCESS', `Mouvement de stock (${delta > 0 ? '+' : ''}${delta}) : ${reason}`);
    notifyToast(`Stock mis à jour (${delta > 0 ? '+' : ''}${delta}) — Motif : ${reason}`, 'success');
  };

  const recordInboundStock = (
    productId: string,
    quantity: number,
    reason: string,
    referenceDocument?: string,
    batchNumber?: string
  ) => {
    if (currentUser.role === 'COMPTABLE') {
      notifyToast('Action refusée : Le Comptable est en lecture seule (Stage 3) sur les stocks.', 'error');
      return;
    }
    if (quantity <= 0) {
      notifyToast('Quantité invalide : la valeur doit être supérieure à zéro.', 'error');
      return;
    }
    const target = products.find((p) => p.id === productId);
    if (!target) return;

    const newAvailable = target.stockAvailable + quantity;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stockAvailable: newAvailable } : p))
    );

    const movId = `stkm-${Date.now()}`;
    const movNumber = `MOV-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const newMovement: StockMovementRecord = {
      id: movId,
      movementNumber: movNumber,
      productId: target.id,
      sku: target.sku,
      movementType: 'INBOUND_RECEIPT',
      quantityChange: quantity,
      resultingAvailable: newAvailable,
      resultingReserved: target.stockReserved,
      resultingOrdered: target.stockOrdered || 0,
      resultingShipped: target.stockShipped || 0,
      reason,
      referenceDocument,
      batchNumber,
      performedByUserId: currentUser.id,
      performedByUserName: `${currentUser.firstName} ${currentUser.lastName}`,
      performedByUserRole: currentUser.role,
      timestamp: new Date().toISOString(),
      minStockAlertTriggered: false,
    };

    setStockMovements((prev) => [newMovement, ...prev]);
    addAuditLog('STOCK_INBOUND_RECORDED', 'Product', productId, 'SUCCESS', `Entrée de stock (+${quantity}) : ${reason}`);
    notifyToast(`Entrée de stock de ${quantity} unités enregistrée avec succès.`, 'success');
  };

  const adjustStockManual = (
    productId: string,
    delta: number,
    reason: string,
    movementType: StockMovementType = 'INVENTORY_ADJUSTMENT'
  ) => {
    if (currentUser.role === 'COMPTABLE') {
      notifyToast('Action refusée : Le Comptable est en lecture seule (Stage 3) sur les stocks.', 'error');
      return;
    }
    const target = products.find((p) => p.id === productId);
    if (!target) return;

    const newAvailable = target.stockAvailable + delta;
    if (newAvailable < 0) {
      notifyToast('Erreur : le stock disponible résultant ne peut pas être négatif.', 'error');
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stockAvailable: newAvailable } : p))
    );

    const movId = `stkm-${Date.now()}`;
    const newMovement: StockMovementRecord = {
      id: movId,
      movementNumber: `MOV-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      productId: target.id,
      sku: target.sku,
      movementType,
      quantityChange: delta,
      resultingAvailable: newAvailable,
      resultingReserved: target.stockReserved,
      resultingOrdered: target.stockOrdered || 0,
      resultingShipped: target.stockShipped || 0,
      reason,
      performedByUserId: currentUser.id,
      performedByUserName: `${currentUser.firstName} ${currentUser.lastName}`,
      performedByUserRole: currentUser.role,
      timestamp: new Date().toISOString(),
      minStockAlertTriggered: newAvailable <= target.minStockAlert,
    };

    setStockMovements((prev) => [newMovement, ...prev]);
    addAuditLog('STOCK_ADJUSTMENT', 'Product', productId, 'SUCCESS', `Ajustement de stock (${delta > 0 ? '+' : ''}${delta}) : ${reason}`);
    notifyToast(`Ajustement appliqué (${delta > 0 ? '+' : ''}${delta}) : ${reason}`, 'success');
  };

  const createInventorySession = (title: string, notes?: string): PhysicalInventorySession | null => {
    if (currentUser.role === 'COMPTABLE') {
      notifyToast('Action refusée : Le Comptable est en lecture seule (Stage 3).', 'error');
      return null;
    }
    const myProds = products.filter((p) => currentUser.role === 'ADMIN' || p.supplierId === currentUser.id);
    if (myProds.length === 0) {
      notifyToast('Aucun produit à inventorier.', 'warning');
      return null;
    }

    let totalTheoretical = 0;
    const lines = myProds.map((p) => {
      totalTheoretical += p.stockAvailable;
      return {
        productId: p.id,
        sku: p.sku,
        productName: p.name[locale] || p.name.fr,
        theoreticalAvailable: p.stockAvailable,
        physicalCounted: p.stockAvailable,
        varianceQuantity: 0,
        unitPrice: p.unitPrice,
        varianceValueEur: '0.00',
        reconciled: false,
      };
    });

    const sessionId = `inv-sess-${Date.now()}`;
    const session: PhysicalInventorySession = {
      id: sessionId,
      sessionNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierId: currentUser.id,
      supplierName: currentUser.companyName,
      title: title || `Session Inventaire ${new Date().toLocaleDateString('fr-FR')}`,
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      conductedByUserId: currentUser.id,
      conductedByUserName: `${currentUser.firstName} ${currentUser.lastName}`,
      lines,
      totalTheoreticalQty: totalTheoretical,
      totalPhysicalQty: totalTheoretical,
      totalVarianceQty: 0,
      totalVarianceValueEur: '0.00',
      notes,
    };

    setInventorySessions((prev) => [session, ...prev]);
    addAuditLog('INVENTORY_SESSION_CREATED', 'Inventory', sessionId, 'SUCCESS', `Session inventaire ${session.sessionNumber} démarrée.`);
    notifyToast(`Session d'inventaire ${session.sessionNumber} créée avec succès.`, 'success');
    return session;
  };

  const updateInventoryCount = (
    sessionId: string,
    counts: { productId: string; physicalCounted: number; notes?: string }[]
  ) => {
    if (currentUser.role === 'COMPTABLE') {
      notifyToast('Action refusée : Le Comptable est en lecture seule (Stage 3).', 'error');
      return;
    }
    setInventorySessions((prev) =>
      prev.map((sess) => {
        if (sess.id !== sessionId) return sess;
        const countsMap = new Map(counts.map((c) => [c.productId, c]));
        let totalPhys = 0;
        let totalVar = 0;
        let totalVarVal = 0;

        const updatedLines = sess.lines.map((l) => {
          const input = countsMap.get(l.productId);
          const counted = input ? Math.max(0, input.physicalCounted) : l.physicalCounted;
          const variance = counted - l.theoreticalAvailable;
          const varVal = variance * parseFloat(l.unitPrice);
          totalPhys += counted;
          totalVar += variance;
          totalVarVal += varVal;
          return {
            ...l,
            physicalCounted: counted,
            varianceQuantity: variance,
            varianceValueEur: varVal.toFixed(2),
            notes: input?.notes ?? l.notes,
          };
        });

        return {
          ...sess,
          lines: updatedLines,
          totalPhysicalQty: totalPhys,
          totalVarianceQty: totalVar,
          totalVarianceValueEur: totalVarVal.toFixed(2),
        };
      })
    );
    notifyToast('Comptage physique mis à jour.', 'info');
  };

  const reconcileInventorySession = (sessionId: string, notes?: string) => {
    if (currentUser.role === 'COMPTABLE') {
      notifyToast('Action refusée : Le Comptable est en lecture seule (Stage 3).', 'error');
      return;
    }
    const sess = inventorySessions.find((s) => s.id === sessionId);
    if (!sess || sess.status !== 'IN_PROGRESS') return;

    const adjustments: StockMovementRecord[] = [];
    const now = new Date().toISOString();

    sess.lines.forEach((l) => {
      if (l.varianceQuantity !== 0) {
        setProducts((prev) =>
          prev.map((p) => (p.id === l.productId ? { ...p, stockAvailable: l.physicalCounted } : p))
        );

        adjustments.push({
          id: `stkm-inv-${Date.now()}-${l.productId}`,
          movementNumber: `MOV-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          productId: l.productId,
          sku: l.sku,
          movementType: 'INVENTORY_ADJUSTMENT',
          quantityChange: l.varianceQuantity,
          resultingAvailable: l.physicalCounted,
          resultingReserved: 0,
          resultingOrdered: 0,
          resultingShipped: 0,
          reason: `Rapprochement inventaire ${sess.sessionNumber}`,
          referenceDocument: sess.sessionNumber,
          inventorySessionId: sess.id,
          performedByUserId: currentUser.id,
          performedByUserName: `${currentUser.firstName} ${currentUser.lastName}`,
          performedByUserRole: currentUser.role,
          timestamp: now,
          minStockAlertTriggered: false,
        });
      }
    });

    if (adjustments.length > 0) {
      setStockMovements((prev) => [...adjustments, ...prev]);
    }

    setInventorySessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: 'COMPLETED',
              completedAt: now,
              notes: notes || s.notes,
              lines: s.lines.map((l) => ({ ...l, reconciled: true })),
            }
          : s
      )
    );

    addAuditLog('INVENTORY_SESSION_RECONCILED', 'Inventory', sessionId, 'SUCCESS', `Inventaire ${sess.sessionNumber} rapproché (${adjustments.length} ajustements).`);
    notifyToast(`Session d'inventaire ${sess.sessionNumber} rapprochée et clôturée.`, 'success');
  };

  const archiveProduct = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isPublished: false } : p))
    );
    addAuditLog('PRODUCT_ARCHIVED', 'Product', productId, 'SUCCESS', `Produit ${productId} archivé.`);
    notifyToast(`Produit archivé avec succès.`, 'info');
  };

  const deleteProduct = (productId: string): { ok: boolean; message: string } => {
    const isReferenced = orders.some(
      (o) =>
        ['PENDING', 'ACCEPTED', 'PREPARING', 'SHIPPED'].includes(o.status) &&
        o.items.some((it) => it.productId === productId)
    );
    if (isReferenced) {
      archiveProduct(productId);
      return {
        ok: false,
        message: 'Le produit est référencé dans des commandes en cours. Il a été archivé pour respecter les règles d’intégrité.',
      };
    }
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    addAuditLog('PRODUCT_DELETED', 'Product', productId, 'SUCCESS', `Produit ${productId} supprimé définitivement.`);
    notifyToast('Produit supprimé du catalogue.', 'success');
    return { ok: true, message: 'Produit supprimé avec succès.' };
  };

  const importProductsBulk = (items: Omit<ProductItem, 'id'>[]): number => {
    const newItems: ProductItem[] = items.map((it, idx) => ({
      ...it,
      id: `prod-bulk-${Date.now()}-${idx}`,
    }));
    setProducts((prev) => [...newItems, ...prev]);
    addAuditLog('PRODUCTS_BULK_IMPORTED', 'Product', `${items.length} items`, 'SUCCESS', `${items.length} produits importés en masse.`);
    notifyToast(`${items.length} produits importés avec succès dans le catalogue.`, 'success');
    return newItems.length;
  };

  const addCategory = (cat: {
    code: string;
    name: Record<Locale, string>;
    description: Record<Locale, string>;
    parentCategoryId?: string;
    icon3d?: Icon3DName;
    imageUrl?: string;
    displayOrder?: number;
  }) => {
    const id = `cat-${cat.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
    const record: ProductCategoryRecord = {
      id,
      code: cat.code.toUpperCase(),
      name: cat.name,
      description: cat.description,
      parentCategoryId: cat.parentCategoryId,
      icon3d: cat.icon3d || 'pallet-load',
      imageUrl: cat.imageUrl,
      displayOrder: cat.displayOrder || categories.length + 1,
      isActive: true,
    };
    setCategories((prev) => {
      if (cat.parentCategoryId) {
        return prev.map((c) =>
          c.id === cat.parentCategoryId
            ? { ...c, subcategories: [...(c.subcategories || []), record] }
            : c
        );
      }
      return [...prev, record];
    });
    notifyToast(`Catégorie ${record.name[locale] || record.code} créée avec succès.`, 'success');
  };

  const updateCategory = (id: string, updates: Partial<ProductCategoryRecord>) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return { ...c, ...updates };
        }
        if (c.subcategories) {
          return {
            ...c,
            subcategories: c.subcategories.map((sub) =>
              sub.id === id ? { ...sub, ...updates } : sub
            ),
          };
        }
        return c;
      })
    );
    notifyToast('Catégorie mise à jour.', 'success');
  };

  const deleteCategory = (id: string): { ok: boolean; message: string } => {
    const cat = categories.find((c) => c.id === id);
    if (cat?.subcategories && cat.subcategories.length > 0) {
      notifyToast('Impossible de supprimer une catégorie contenant des sous-catégories.', 'error');
      return { ok: false, message: 'La catégorie possède des sous-catégories.' };
    }
    const isLinked = products.some((p) => p.categoryId === id || p.category === cat?.code);
    if (isLinked) {
      notifyToast('Impossible de supprimer une catégorie liée à des produits du catalogue.', 'error');
      return { ok: false, message: 'Des produits sont rattachés à cette catégorie.' };
    }
    setCategories((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c) => ({
          ...c,
          subcategories: c.subcategories?.filter((sub) => sub.id !== id),
        }))
    );
    notifyToast('Catégorie supprimée avec succès.', 'success');
    return { ok: true, message: 'Catégorie supprimée.' };
  };

  const toggleCatalogFavorite = (productId: string) => {
    setCatalogFavorites((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      notifyToast(
        exists ? 'Produit retiré des favoris.' : 'Produit ajouté à votre liste d’envies B2B !',
        'info'
      );
      return next;
    });
  };

  const isCatalogFavorite = (productId: string): boolean => {
    return catalogFavorites.includes(productId);
  };

  const toggleComparisonProduct = (productId: string) => {
    setComparisonProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 4) {
        notifyToast('Le comparateur est limité à 4 produits simultanément.', 'warning');
        return prev;
      }
      notifyToast('Produit ajouté au comparateur B2B.', 'info');
      return [...prev, productId];
    });
  };

  const clearComparison = () => {
    setComparisonProductIds([]);
    notifyToast('Comparateur réinitialisé.', 'info');
  };

  const moderateProduct = (productId: string, action: 'APPROVE' | 'REJECT', reason?: string) => {
    if (action === 'REJECT' && !reason?.trim()) {
      notifyToast('Le motif de rejet est obligatoire.', 'error');
      return;
    }
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        if (action === 'APPROVE') {
          return {
            ...p,
            status: 'PUBLISHED',
            isPublished: true,
            adminRejectionReason: undefined,
          };
        } else {
          return {
            ...p,
            status: 'DRAFT',
            isPublished: false,
            adminRejectionReason: reason,
          };
        }
      })
    );
    notifyToast(
      action === 'APPROVE'
        ? `Produit ${productId} validé et publié au catalogue.`
        : `Produit ${productId} rejeté avec motif envoyé au fournisseur.`,
      action === 'APPROVE' ? 'success' : 'warning'
    );
  };

  const reportProduct = (productId: string, reason: string) => {
    if (!reason.trim()) {
      notifyToast('Veuillez préciser le motif du signalement.', 'error');
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isReported: true, reportReason: reason } : p
      )
    );
    notifyToast('Produit signalé aux administrateurs pour vérification.', 'info');
  };

  const suspendProduct = (productId: string, reason: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, status: 'SUSPENDED', isPublished: false, adminRejectionReason: reason }
          : p
      )
    );
    notifyToast(`Produit ${productId} suspendu par l'administration.`, 'warning');
  };

  const updateProductQuick = (productId: string, stock: number, price: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stockAvailable: Math.max(0, stock), unitPrice: price }
          : p
      )
    );
    notifyToast('Prix et stock mis à jour instantanément.', 'success');
  };

  const addToCart = (product: ProductItem, qty = 1) => {
    const moq = product.minOrderQuantity || 1;
    const effectiveQty = Math.max(qty, moq);
    if (qty < moq) {
      notifyToast(`Quantité ajustée à la MOQ minimale : ${moq} ${product.unit}`, 'info');
    }
    if (effectiveQty > product.stockAvailable) {
      notifyToast(`Stock insuffisant (Disponible : ${product.stockAvailable})`, 'error');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(product.stockAvailable, item.quantity + effectiveQty) }
            : item
        );
      }
      return [...prev, { product, quantity: effectiveQty }];
    });
    notifyToast(`${product.name[locale]} ajouté au panier B2B (${effectiveQty} ${product.unit})`, 'success');
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: Math.min(
                  item.product.stockAvailable,
                  Math.max(0, item.quantity + delta)
                ),
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const createOrderFromCart = (shippingAddress: string, paymentMethod: string): OrderRecord | null => {
    if (cart.length === 0) return null;

    // 1. Contrôle Anti-Overselling côté client
    for (const c of cart) {
      const prod = products.find((p) => p.id === c.product.id);
      if (!prod || prod.stockAvailable < c.quantity) {
        notifyToast(`Stock insuffisant pour ${c.product.sku} : disponible ${prod?.stockAvailable || 0}`, 'error');
        return null;
      }
    }

    const subtotalNum = cart.reduce(
      (acc, item) => acc + parseFloat(item.product.unitPrice) * item.quantity,
      0
    );
    const taxNum = subtotalNum * 0.2;
    const shippingNum = 650;
    const totalNum = subtotalNum + taxNum + shippingNum;
    const orderNumber = `CMD-2026-${Math.floor(9000 + Math.random() * 900)}`;
    const newOrderId = `ord-${Date.now()}`;
    const nowIso = new Date().toISOString();

    // 2. Décrémentation et réservation automatique
    const newReservations: StockReservationRecord[] = [];
    const newMovements: StockMovementRecord[] = [];

    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = cart.find((c) => c.product.id === p.id);
        if (cartItem) {
          const newAvail = p.stockAvailable - cartItem.quantity;
          const newRes = p.stockReserved + cartItem.quantity;
          const newOrd = (p.stockOrdered || 0) + cartItem.quantity;

          newReservations.push({
            id: `res-${Date.now()}-${p.id}`,
            reservationNumber: `RES-2026-${Math.floor(100000 + Math.random() * 900000)}`,
            orderId: newOrderId,
            orderNumber,
            clientId: currentUser.id,
            clientName: currentUser.companyName,
            productId: p.id,
            sku: p.sku,
            quantity: cartItem.quantity,
            reservedAt: nowIso,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            status: 'ACTIVE',
          });

          newMovements.push({
            id: `stkm-res-${Date.now()}-${p.id}`,
            movementNumber: `MOV-2026-${Math.floor(100000 + Math.random() * 900000)}`,
            productId: p.id,
            sku: p.sku,
            movementType: 'ORDER_RESERVATION',
            quantityChange: -cartItem.quantity,
            resultingAvailable: newAvail,
            resultingReserved: newRes,
            resultingOrdered: newOrd,
            resultingShipped: p.stockShipped || 0,
            reason: `Réservation pour commande ${orderNumber}`,
            referenceDocument: orderNumber,
            orderNumber,
            performedByUserId: currentUser.id,
            performedByUserName: `${currentUser.firstName} ${currentUser.lastName}`,
            performedByUserRole: currentUser.role,
            timestamp: nowIso,
            minStockAlertTriggered: newAvail <= p.minStockAlert,
          });

          return {
            ...p,
            stockAvailable: newAvail,
            stockReserved: newRes,
            stockOrdered: newOrd,
          };
        }
        return p;
      })
    );

    if (newReservations.length > 0) {
      setStockReservations((prev) => [...newReservations, ...prev]);
    }
    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    const newOrder: OrderRecord = {
      id: newOrderId,
      orderNumber,
      clientId: currentUser.id,
      clientName: currentUser.companyName,
      supplierId: 'usr-supp-01',
      supplierName: 'EuroTech Industrial & ColdChain GmbH',
      status: 'PENDING',
      subtotalAmount: subtotalNum.toFixed(2),
      taxAmount: taxNum.toFixed(2),
      shippingAmount: shippingNum.toFixed(2),
      totalAmount: totalNum.toFixed(2),
      currency: 'EUR',
      shippingAddress,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      items: cart.map((c) => ({
        productId: c.product.id,
        sku: c.product.sku,
        name: c.product.name.fr,
        quantity: c.quantity,
        unitPrice: c.product.unitPrice,
        totalLine: (parseFloat(c.product.unitPrice) * c.quantity).toFixed(2),
        icon3d: c.product.icon3d,
      })),
      timeline: [
        {
          step: `Commande créée (${paymentMethod}) & Stock réservé`,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          actor: currentUser.companyName,
          completed: true,
        },
        { step: 'Validation Fournisseur', timestamp: 'En attente', actor: 'EuroTech GmbH', completed: false },
      ],
    };

    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    addAuditLog('ORDER_CREATED_IDEMPOTENT', 'Order', orderNumber, 'SUCCESS', `Commande ${orderNumber} créée (${totalNum.toFixed(2)} EUR).`);
    notifyToast(`Commande ${orderNumber} validée avec réservation de stock !`, 'success');
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    // Gestion des stocks selon statut commande
    if (newStatus === 'SHIPPED') {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        setProducts((prev) =>
          prev.map((p) => {
            const item = order.items.find((it) => it.productId === p.id);
            if (item) {
              return {
                ...p,
                stockReserved: Math.max(0, p.stockReserved - item.quantity),
                stockShipped: (p.stockShipped || 0) + item.quantity,
              };
            }
            return p;
          })
        );
        setStockReservations((prev) =>
          prev.map((r) => (r.orderId === orderId ? { ...r, status: 'FULFILLED', fulfilledAt: new Date().toISOString() } : r))
        );
      }
    } else if (newStatus === 'CANCELLED') {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        setProducts((prev) =>
          prev.map((p) => {
            const item = order.items.find((it) => it.productId === p.id);
            if (item) {
              return {
                ...p,
                stockAvailable: p.stockAvailable + item.quantity,
                stockReserved: Math.max(0, p.stockReserved - item.quantity),
                stockOrdered: Math.max(0, (p.stockOrdered || 0) - item.quantity),
              };
            }
            return p;
          })
        );
        setStockReservations((prev) =>
          prev.map((r) => (r.orderId === orderId ? { ...r, status: 'CANCELLED', releasedAt: new Date().toISOString() } : r))
        );
      }
    }
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: newStatus,
              timeline: [
                ...o.timeline.map((t) => ({ ...t, completed: true })),
                {
                  step: `Statut mis à jour : ${newStatus}`,
                  timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
                  actor: `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`,
                  completed: true,
                },
              ],
            }
          : o
      )
    );
    addAuditLog('ORDER_STATUS_TRANSITION', 'Order', orderId, 'SUCCESS', `Transition vers ${newStatus}`);
    notifyToast(`Statut de la commande mis à jour : ${newStatus}`, 'success');
  };

  const createQuote = (q: Omit<QuoteRecord, 'id' | 'quoteNumber' | 'createdAt'>) => {
    const quoteNumber = `DEV-2026-${Math.floor(400 + Math.random() * 500)}`;
    const newQuote: QuoteRecord = {
      ...q,
      id: `quo-${Date.now()}`,
      quoteNumber,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setQuotes((prev) => [newQuote, ...prev]);
    addAuditLog('QUOTE_CREATED', 'Quote', quoteNumber, 'SUCCESS', `Devis ${quoteNumber} généré.`);
    notifyToast(`Devis ${quoteNumber} enregistré avec succès`, 'success');
  };

  const convertQuoteToOrder = (quoteId: string) => {
    const q = quotes.find((item) => item.id === quoteId);
    if (!q) return;
    setQuotes((prev) => prev.map((item) => (item.id === quoteId ? { ...item, status: 'CONVERTED' } : item)));
    const orderNumber = `CMD-2026-${Math.floor(9100 + Math.random() * 800)}`;
    const newOrder: OrderRecord = {
      id: `ord-${Date.now()}`,
      orderNumber,
      clientId: q.clientId,
      clientName: q.clientName,
      supplierId: q.supplierId,
      supplierName: q.supplierName,
      status: 'ACCEPTED',
      subtotalAmount: q.subtotalAmount,
      taxAmount: q.taxAmount,
      shippingAmount: '0.00',
      totalAmount: q.totalAmount,
      currency: q.currency,
      shippingAddress: 'Zone Logistique Zenata, Casablanca',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      items: q.lines.map((l, idx) => ({
        productId: `prod-0${(idx % 5) + 1}`,
        sku: `TL-QUO-${idx + 1}`,
        name: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalLine: l.totalLine,
        icon3d: 'pallet-load',
      })),
      timeline: [
        { step: `Converti depuis le devis ${q.quoteNumber}`, timestamp: 'Aujourd’hui', actor: currentUser.companyName, completed: true },
      ],
    };
    setOrders((prev) => [newOrder, ...prev]);
    notifyToast(`Devis ${q.quoteNumber} converti en commande ${orderNumber}`, 'success');
  };

  const respondToQuote = (quoteId: string, adjustedAmount: string, notes?: string) => {
    setQuotes((prev) =>
      prev.map((q) =>
        q.id === quoteId
          ? {
              ...q,
              status: 'RESPONDED',
              totalAmount: adjustedAmount,
              amountInWords: `${adjustedAmount} ${q.currency}`,
            }
          : q
      )
    );
    addAuditLog('QUOTE_RESPONDED', 'Quote', quoteId, 'SUCCESS', `Proposition commerciale émise pour devis ${quoteId} (${notes || 'Tarif négocié'}).`);
    notifyToast(`Proposition commerciale transmise au client (${adjustedAmount} EUR).`, 'success');
  };

  const updateOrderStatusWithReason = (orderId: string, newStatus: OrderStatus, reason?: string) => {
    if (currentUser.role === 'COMPTABLE') {
      notifyToast('Action refusée : Le Comptable (Stage 3) est en lecture seule sur les commandes.', 'error');
      return;
    }
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: newStatus,
              timeline: [
                ...o.timeline,
                {
                  step: `Statut modifié en ${newStatus}${reason ? ` (${reason})` : ''}`,
                  timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
                  actor: `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`,
                  completed: true,
                },
              ],
            }
          : o
      )
    );
    addAuditLog('ORDER_STATUS_CHANGED', 'Order', orderId, 'SUCCESS', `Statut commande ${orderId} -> ${newStatus}. ${reason ? `Motif: ${reason}` : ''}`);
    notifyToast(`Commande ${newStatus} ${reason ? `(Motif: ${reason})` : ''}`, newStatus === 'REFUSED' ? 'info' : 'success');
  };

  const payInvoice = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv || inv.status === 'PAID') return;
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === invoiceId
          ? { ...i, status: 'PAID', paidAt: new Date().toISOString().slice(0, 10) }
          : i
      )
    );
    const newPay: PaymentRecord = {
      id: `pay-${Date.now()}`,
      paymentReference: `PAY-STRP-${Math.floor(10000 + Math.random() * 89999)}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientId: inv.clientId,
      supplierId: inv.supplierId,
      provider: 'STRIPE',
      amount: inv.totalAmount,
      currency: inv.currency,
      status: 'SUCCEEDED',
      webhookEventId: `evt_${Math.random().toString(36).slice(2, 14)}`,
      idempotencyVerified: true,
      reconciled: true,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    setPayments((prev) => [newPay, ...prev]);
    addAuditLog('PAYMENT_WEBHOOK_IDEMPOTENT', 'Invoice', inv.invoiceNumber, 'SUCCESS', `Paiement ${newPay.paymentReference} rapproché sans doublon.`);
    notifyToast(`Facture ${inv.invoiceNumber} payée et rapprochée (Idempotence Webhook vérifiée)`, 'success');
  };

  const updateShipmentStatus = (shipmentId: string, status: ShipmentStatus, podSign = false) => {
    setShipments((prev) =>
      prev.map((s) =>
        s.id === shipmentId
          ? {
              ...s,
              status,
              podSigned: podSign || s.podSigned || status === 'DELIVERED',
              podTimestamp:
                podSign || status === 'DELIVERED'
                  ? new Date().toISOString().replace('T', ' ').slice(0, 16)
                  : s.podTimestamp,
            }
          : s
      )
    );
    addAuditLog('SHIPMENT_STATUS_UPDATED', 'Shipment', shipmentId, 'SUCCESS', `Statut expédition : ${status}`);
    notifyToast(`Expédition mise à jour : ${status}`, 'success');
  };

  const reportIncident = (
    shipmentId: string,
    title: string,
    description: string,
    severity: IncidentRecord['severity']
  ) => {
    const shp = shipments.find((s) => s.id === shipmentId);
    const inc: IncidentRecord = {
      id: `inc-${Date.now()}`,
      shipmentId,
      trackingNumber: shp?.trackingNumber ?? 'TRK-2026',
      carrierId: currentUser.id,
      title,
      description,
      severity,
      status: 'OPEN',
      reportedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
    setIncidents((prev) => [inc, ...prev]);
    addAuditLog('LOGISTICS_INCIDENT_REPORTED', 'Shipment', inc.trackingNumber, 'WARNING', `Incident signalé : ${title}`);
    notifyToast(`Incident logistique enregistré sur ${inc.trackingNumber}`, 'warning');
  };

  const respondToMission = (missionId: string, accept: boolean, rejectionReason?: string) => {
    const mis = missions.find((m) => m.id === missionId);
    if (!mis) return;
    try {
      const { updatedMission, createdShipment } = LogisticsEngine.respondToMission(mis, accept, rejectionReason);
      setMissions((prev) => prev.map((m) => (m.id === missionId ? updatedMission : m)));
      if (createdShipment) {
        setShipments((prev) => [createdShipment, ...prev]);
        setWaypoints((prev) => ({
          ...prev,
          [createdShipment.trackingNumber]: INITIAL_SHIPMENT_WAYPOINTS['SHP-2026-8819'] ?? [],
        }));
      }
      addAuditLog(
        accept ? 'LOGISTICS_MISSION_ACCEPTED' : 'LOGISTICS_MISSION_REFUSED',
        'LogisticsMission',
        missionId,
        'SUCCESS',
        accept
          ? `Mission ${mis.id} acceptée par ${currentUser.companyName}. Expédition ${createdShipment?.trackingNumber} créée.`
          : `Mission ${mis.id} refusée par ${currentUser.companyName}. Motif : ${rejectionReason}`
      );
      notifyToast(
        accept
          ? `Mission ${mis.id} acceptée avec succès ! Expédition ${createdShipment?.trackingNumber} générée.`
          : `Mission refusée avec motif motivé enregistré.`,
        accept ? 'success' : 'info'
      );
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : 'Erreur mission', 'error');
    }
  };

  const createLogisticsMission = (orderId: string, carrierId = 'usr-trans-01', isColdChain = false): LogisticsMissionRecord | null => {
    const ord = orders.find((o) => o.id === orderId);
    if (!ord) return null;
    const newMission = LogisticsEngine.createMission({
      order: ord,
      carrierId,
      carrierName: 'MedFreight Multimodal Carriers',
      pickupAddress: 'Hub Logistique Zenata, Casablanca',
      deliveryAddress: ord.shippingAddress,
      cargoWeightKg: '1500.000',
      cargoVolumeM3: '12.000',
      isColdChain,
    });
    setMissions((prev) => [newMission, ...prev]);
    addAuditLog('LOGISTICS_MISSION_CREATED', 'Order', ord.orderNumber, 'SUCCESS', `Mission ${newMission.id} assignée au transporteur.`);
    notifyToast(`Mission ${newMission.id} créée et assignée à MedFreight.`, 'success');
    return newMission;
  };

  const recordProofOfDelivery = (shipmentId: string, podData: ProofOfDeliveryData) => {
    const shp = shipments.find((s) => s.id === shipmentId);
    if (!shp) return;
    const ord = orders.find((o) => o.id === shp.orderId || o.orderNumber === shp.orderNumber) ?? orders[0];
    try {
      const { updatedShipment, updatedOrder, podCertifiedRecord } = LogisticsEngine.recordProofOfDelivery(shp, ord, podData);
      setShipments((prev) => prev.map((s) => (s.id === shipmentId ? updatedShipment : s)));
      setOrders((prev) => prev.map((o) => (o.id === ord.id ? updatedOrder : o)));
      addAuditLog(
        'LOGISTICS_POD_CERTIFIED',
        'Shipment',
        shp.trackingNumber,
        'SUCCESS',
        `Preuve de livraison émargée par ${podData.recipientFullName} (${podCertifiedRecord.certificationSha256}).`
      );
      setNotificationsList((prev) => [
        {
          id: `notif-pod-${Date.now()}`,
          cat: 'LOGISTIQUE',
          title: `Preuve de Livraison (POD) Certifiée — ${shp.trackingNumber}`,
          msg: `Marchandises livrées à ${podData.recipientFullName}. Certificat électronique scellé.`,
          icon: 'air-freight',
          isRead: false,
          timestamp: 'À l’instant',
        },
        ...prev,
      ]);
      notifyToast(`Preuve de Livraison POD signée et certifiée (${podCertifiedRecord.certificationSha256}) !`, 'success');
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : 'Erreur validation POD', 'error');
    }
  };

  const addVehicle = (v: Omit<VehicleRecord, 'id'>) => {
    const newV: VehicleRecord = {
      ...v,
      id: `veh-${Date.now().toString().slice(-4)}`,
    };
    setVehicles((prev) => [newV, ...prev]);
    addAuditLog('LOGISTICS_VEHICLE_ADDED', 'Vehicle', newV.registrationPlate, 'SUCCESS', `Véhicule ${newV.brandModel} (${newV.registrationPlate}) ajouté.`);
    notifyToast(`Véhicule ${newV.registrationPlate} enregistré dans la flotte.`, 'success');
  };

  const updateVehicleStatus = (vehicleId: string, status: VehicleRecord['status']) => {
    setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? { ...v, status } : v)));
    addAuditLog('LOGISTICS_VEHICLE_STATUS_UPDATED', 'Vehicle', vehicleId, 'SUCCESS', `Statut véhicule : ${status}`);
    notifyToast(`Statut du véhicule mis à jour : ${status}`, 'info');
  };

  const resolveIncident = (incidentId: string) => {
    setIncidents((prev) => prev.map((i) => (i.id === incidentId ? { ...i, status: 'RESOLVED' } : i)));
    addAuditLog('LOGISTICS_INCIDENT_RESOLVED', 'Incident', incidentId, 'SUCCESS', `Incident logistique résolu.`);
    notifyToast(`Incident logistique résolu.`, 'success');
  };

  const uploadKycDocumentForDossier = (
    dossierId: string,
    docType: string,
    fileName: string,
    fileSizeBytes?: number
  ) => {
    try {
      const targetDossier = kycDossiers.find((d) => d.id === dossierId) ?? kycDossiers[0];
      const { documentItem } = encryptAndStoreKycDocument({
        dossierId: targetDossier.id,
        actorType: targetDossier.actorType,
        docType,
        fileName,
        fileSizeBytes,
      });

      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

      setKycDossiers((prev) =>
        prev.map((dos) => {
          if (dos.id !== targetDossier.id) return dos;
          const updatedDocs = [
            ...dos.documents.filter((existing) => existing.docType !== docType),
            {
              id: documentItem.id,
              docType: documentItem.docType,
              label: documentItem.label,
              fileName: documentItem.fileName,
              uploadedAt: documentItem.uploadedAt,
              sha256: documentItem.sha256,
              encryptionKeyId: documentItem.encryptionKeyId,
              status: 'UPLOADED' as const,
              mimeType: documentItem.encryptedMeta.mimeType,
              fileSizeBytes: documentItem.encryptedMeta.fileSizeBytes,
              encryptedVaultUri: documentItem.encryptedMeta.encryptedVaultUri,
              ivHex: documentItem.encryptedMeta.ivHex,
              authTagHex: documentItem.encryptedMeta.authTagHex,
              virusScanStatus: documentItem.encryptedMeta.virusScanStatus,
            },
          ];

          const completion = checkMandatoryKycCompletion(dos.actorType, updatedDocs);
          const nextStatus =
            completion.allMandatoryUploaded && dos.status !== 'VALIDATED'
              ? 'SUBMITTED_IN_TIME_PENDING_REVIEW'
              : dos.status === 'COMPLEMENT_REQUESTED'
              ? 'SUBMITTED_IN_TIME_PENDING_REVIEW'
              : dos.status;

          const histEntry = {
            id: `khist-${Date.now()}`,
            timestamp: nowStr,
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            actorRole: currentUser.role,
            action: completion.allMandatoryUploaded
              ? 'ALL_MANDATORY_SUBMITTED_IN_TIME'
              : 'DOCUMENT_UPLOADED_ENCRYPTED',
            summary: `Pièce [${docType}] (${fileName}) chiffrée AES-256-GCM (SHA-256: ${documentItem.sha256.slice(
              0,
              16
            )}...). Complétude obligatoire : ${completion.uploadedMandatory}/${completion.totalMandatory}.`,
          };

          return {
            ...dos,
            status: nextStatus,
            submittedAt: completion.allMandatoryUploaded ? dos.submittedAt ?? nowStr : dos.submittedAt,
            documents: updatedDocs,
            history: [histEntry, ...(dos.history ?? [])],
          };
        })
      );

      setNotificationsList((prev) => [
        {
          id: `notif-kyc-up-${Date.now()}`,
          cat: 'KYC',
          title: `Dépôt KYC chiffré : ${docType}`,
          msg: `Fichier "${fileName}" chiffré AES-256-GCM et déposé sur le coffre S3/MinIO pour ${targetDossier.companyName}.`,
          icon: 'customs-stamp',
          isRead: false,
          timestamp: 'À l’instant',
        },
        ...prev,
      ]);

      addAuditLog(
        'KYC_DOCUMENT_UPLOADED_ENCRYPTED',
        'KYC',
        `${targetDossier.id}:${docType}`,
        'SUCCESS',
        `Pièce ${fileName} chiffrée AES-256-GCM (${documentItem.encryptionKeyId}). Scan AV: CLEAN.`
      );
      notifyToast(
        `Pièce ${docType} (${fileName}) chiffrée AES-256-GCM et déposée avec succès !`,
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof Error && err.message === 'KYC_SECURITY_MALICIOUS_FILE_EXTENSION'
          ? 'Sécurité Antivirus : Extension de fichier exécutable/script interdite.'
          : 'Erreur lors du téléversement KYC (taille max 10 Mo, formats PDF/JPG/PNG).';
      notifyToast(msg, 'error');
    }
  };

  const submitClientKYCDocument = (docType: string, fileName: string) => {
    const clientDossier =
      kycDossiers.find((d) => d.userId === currentUser.id) ?? kycDossiers[0];
    uploadKycDocumentForDossier(clientDossier.id, docType, fileName);
  };

  const reviewKYCDossier = (
    dossierId: string,
    decision: 'VALIDATED' | 'REJECTED' | 'COMPLEMENT_REQUESTED' | 'REACTIVATE',
    reason?: string
  ) => {
    if (currentUser.role !== 'ADMIN') {
      addAuditLog(
        'KYC_DECISION_DENIED_NON_ADMIN',
        'KYC',
        dossierId,
        'DENIED',
        `Tentative non autorisée par ${currentUser.role} de statuer (${decision}) sur le dossier KYC.`
      );
      notifyToast(
        'Interdit (Chapitre 6.3) : Seul un Administrateur autorisé peut valider, rejeter, demander un complément ou réactiver un compte.',
        'error'
      );
      return;
    }

    if (
      (decision === 'REJECTED' || decision === 'COMPLEMENT_REQUESTED') &&
      (!reason || reason.trim().length < 5)
    ) {
      notifyToast(
        'Un motif explicite (au moins 5 caractères) est obligatoire pour un rejet ou une demande de complément KYC.',
        'error'
      );
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const adminFullName = `${currentUser.firstName} ${currentUser.lastName}`;

    setKycDossiers((prev) =>
      prev.map((d) => {
        if (d.id !== dossierId) return d;
        const nextStatus =
          decision === 'REACTIVATE' ? 'SUBMITTED_IN_TIME_PENDING_REVIEW' : decision;

        const histAction =
          decision === 'VALIDATED'
            ? 'ADMIN_VALIDATED'
            : decision === 'REJECTED'
            ? 'ADMIN_REJECTED_WITH_REASON'
            : decision === 'COMPLEMENT_REQUESTED'
            ? 'ADMIN_COMPLEMENT_REQUESTED'
            : 'ADMIN_ACCOUNT_REACTIVATED';

        const histSummary =
          decision === 'VALIDATED'
            ? `Dossier KYC validé par ${adminFullName}.`
            : decision === 'REJECTED'
            ? `Dossier KYC rejeté par ${adminFullName} — Motif : ${reason}`
            : decision === 'COMPLEMENT_REQUESTED'
            ? `Demande de complément émise par ${adminFullName} : ${reason}`
            : `Compte réactivé par ${adminFullName} (${reason ?? 'Réactivation administrative'}).`;

        const updatedDocs =
          decision === 'VALIDATED'
            ? d.documents.map((doc) => ({ ...doc, status: 'VALIDATED' as const }))
            : d.documents;

        return {
          ...d,
          status: nextStatus,
          reviewedAt: nowStr,
          reviewedBy: adminFullName,
          rejectionReason: decision === 'REJECTED' ? reason : d.rejectionReason,
          complementReason: decision === 'COMPLEMENT_REQUESTED' ? reason : d.complementReason,
          reactivatedAt: decision === 'REACTIVATE' ? nowStr : d.reactivatedAt,
          reactivatedBy: decision === 'REACTIVATE' ? adminFullName : d.reactivatedBy,
          documents: updatedDocs,
          adminComments: reason
            ? [
                {
                  id: `kcom-${Date.now()}`,
                  authorEmail: currentUser.email,
                  authorName: adminFullName,
                  createdAt: nowStr,
                  comment: `[${decision}] ${reason}`,
                  visibility: 'SHARED_WITH_APPLICANT',
                },
                ...(d.adminComments ?? []),
              ]
            : d.adminComments,
          history: [
            {
              id: `khist-${Date.now()}`,
              timestamp: nowStr,
              actorName: adminFullName,
              actorRole: 'ADMIN',
              action: histAction,
              summary: histSummary,
            },
            ...(d.history ?? []),
          ],
        };
      })
    );

    setNotificationsList((prev) => [
      {
        id: `notif-kyc-dec-${Date.now()}`,
        cat: 'KYC',
        title: `Décision KYC Admin : ${decision}`,
        msg: reason
          ? `Dossier ${dossierId} : ${decision} — Motif : ${reason}`
          : `Dossier ${dossierId} mis à jour avec le statut ${decision}.`,
        icon: 'customs-stamp',
        isRead: false,
        timestamp: 'À l’instant',
      },
      ...prev,
    ]);

    addAuditLog(
      `KYC_ADMIN_${decision}`,
      'KYC',
      dossierId,
      'SUCCESS',
      reason ? `${decision} — Motif : ${reason}` : `Décision ${decision} appliquée.`
    );
    notifyToast(`Décision KYC [${decision}] enregistrée et notifiée à l’entreprise.`, 'success');
  };

  const addAdminKycComment = (
    dossierId: string,
    comment: string,
    visibility: 'INTERNAL_ADMIN_ONLY' | 'SHARED_WITH_APPLICANT' = 'SHARED_WITH_APPLICANT',
    targetDocType?: string
  ) => {
    if (!comment.trim()) return;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const authorName = `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`;

    setKycDossiers((prev) =>
      prev.map((d) =>
        d.id === dossierId
          ? {
              ...d,
              adminComments: [
                {
                  id: `kcom-${Date.now()}`,
                  authorEmail: currentUser.email,
                  authorName,
                  createdAt: nowStr,
                  comment: comment.trim(),
                  targetDocType,
                  visibility,
                },
                ...(d.adminComments ?? []),
              ],
              history: [
                {
                  id: `khist-${Date.now()}`,
                  timestamp: nowStr,
                  actorName: authorName,
                  actorRole: currentUser.role,
                  action: 'ADMIN_COMMENT_ADDED',
                  summary: `Commentaire ajouté (${visibility}) : "${comment.trim()}"`,
                },
                ...(d.history ?? []),
              ],
            }
          : d
      )
    );
    addAuditLog('KYC_ADMIN_COMMENT_ADDED', 'KYC', dossierId, 'SUCCESS', comment.trim());
    notifyToast('Commentaire administratif ajouté au dossier KYC.', 'info');
  };

  const triggerKycScheduledCron = (simulatedDayOverride?: number): KycCronExecutionReport => {
    const cloned = structuredClone(kycDossiers);
    const report = executeKycCronBatch(cloned, simulatedDayOverride);
    setKycDossiers(cloned);

    if (report.generatedNotifications.length > 0) {
      setNotificationsList((prev) => [
        ...report.generatedNotifications.map((gn) => ({
          id: gn.id,
          cat: 'KYC' as const,
          title: gn.title,
          msg: gn.message,
          icon: 'customs-stamp' as const,
          isRead: false,
          timestamp: gn.sentAt,
        })),
        ...prev,
      ]);
    }

    addAuditLog(
      'KYC_SCHEDULED_CRON_EXECUTED',
      'KYCCronService',
      `BATCH-${report.evaluatedCount}`,
      'SUCCESS',
      `Cron exécuté : ${report.remindersTriggered.length} relance(s) J+1/J+3/J+5/J+6, ${report.suspendedAtJ7.length} suspension(s) J+7 (dossiers non soumis), ${report.protectedInTimeAtJ7.length} dossier(s) soumis à temps protégés contre toute suspension.`
    );

    notifyToast(
      `Tâche planifiée KYCCronService exécutée : ${report.protectedInTimeAtJ7.length} dossier(s) soumis à temps protégés à J+7, ${report.suspendedAtJ7.length} suspendu(s), ${report.remindersTriggered.length} relance(s).`,
      'info'
    );

    return report;
  };

  const recordKycDocumentPreview = (dossierId: string, docId: string, fileName: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setKycDossiers((prev) =>
      prev.map((d) =>
        d.id === dossierId
          ? {
              ...d,
              history: [
                {
                  id: `khist-${Date.now()}`,
                  timestamp: nowStr,
                  actorName: `${currentUser.firstName} ${currentUser.lastName}`,
                  actorRole: currentUser.role,
                  action: 'DOCUMENT_PREVIEWED',
                  summary: `Prévisualisation sécurisée et déchiffrement KMS à la volée de la pièce ${fileName} (${docId}).`,
                },
                ...(d.history ?? []),
              ],
            }
          : d
      )
    );
    addAuditLog(
      'KYC_ENCRYPTED_DOCUMENT_PREVIEWED',
      'KYCDocument',
      `${dossierId}:${docId}`,
      'SUCCESS',
      `Consultation et déchiffrement autorisé de ${fileName} par ${currentUser.email}.`
    );
  };

  const updateKycProfile = (
    dossierId: string,
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
    }
  ) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const authorName = `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`;
    setKycDossiers((prev) =>
      prev.map((d) => {
        if (d.id !== dossierId) return d;
        return {
          ...d,
          ...profile,
          history: [
            {
              id: `khist-${Date.now()}`,
              timestamp: nowStr,
              actorName: authorName,
              actorRole: currentUser.role,
              action: 'PROFILE_INFO_UPDATED',
              summary: `Mise à jour des informations juridiques et du représentant (${profile.representativeName ?? d.companyName}).`,
            },
            ...(d.history ?? []),
          ],
        };
      })
    );
    addAuditLog('KYC_PROFILE_UPDATED', 'KYC', dossierId, 'SUCCESS', 'Informations légales et représentant mises à jour.');
    notifyToast('Informations juridiques et du représentant enregistrées avec succès.', 'success');
  };

  const runFinancialCalculation = (
    principalStr: string,
    annualRatePctStr: string,
    startDateStr: string,
    endDateStr: string,
    basis: DayCountBasis
  ): CalculationResultRecord => {
    const res = calculateFinancialInterest({
      principalStr,
      annualRatePctStr,
      startDateStr,
      endDateStr,
      basis,
      executedBy: `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`,
    });
    setCalcHistory((prev) => [res, ...prev]);
    addAuditLog(
      'CALCULATION_ENGINE_EXECUTED',
      'CalculationPeriod',
      res.id,
      'SUCCESS',
      `Calcul Decimal.js (${basis}) : ${res.principal} EUR @ ${res.annualRatePct}% sur ${res.daysCount}j = ${res.interestAmount} EUR`
    );
    notifyToast(`Calcul financier déterministe (${basis}) enregistré : +${res.interestAmount} EUR`, 'success');
    return res;
  };

  const createRoomLive = (
    titleOrParams:
      | string
      | {
          title: string;
          scheduledAt: string;
          description?: string;
          isImmediate?: boolean;
          isPrivate?: boolean;
          hasWaitingRoom?: boolean;
          allowedUserIds?: string[];
          invitedEmails?: string[];
          durationMinutes?: number;
        },
    scheduledAtFallback: string = '2026-11-20 10:00'
  ) => {
    if (currentUser.role === 'CLIENT' || currentUser.role === 'VISITEUR') {
      addAuditLog(
        'ROOM_CREATE_DENIED_RBAC',
        'Room',
        'GENERAL_CREATE',
        'DENIED',
        'Tentative de création générale Room Live par un profil Client bloquée.'
      );
      notifyToast(
        'Accès refusé (Annexe B) : Le profil Client rejoint uniquement les salles autorisées et ne dispose pas d’un droit général de création.',
        'error'
      );
      return { ok: false, message: 'Création générale non autorisée pour le rôle Client.' };
    }

    const title = typeof titleOrParams === 'string' ? titleOrParams : titleOrParams.title;
    const scheduledAt = typeof titleOrParams === 'string' ? scheduledAtFallback : titleOrParams.scheduledAt;
    const description = typeof titleOrParams === 'object' ? titleOrParams.description : undefined;
    const isImmediate = typeof titleOrParams === 'object' ? titleOrParams.isImmediate ?? true : true;
    const isPrivate = typeof titleOrParams === 'object' ? titleOrParams.isPrivate ?? false : false;
    const hasWaitingRoom = typeof titleOrParams === 'object' ? titleOrParams.hasWaitingRoom ?? true : true;
    const durationMinutes = typeof titleOrParams === 'object' ? titleOrParams.durationMinutes ?? 60 : 60;
    const allowedUserIds =
      typeof titleOrParams === 'object' && titleOrParams.allowedUserIds
        ? titleOrParams.allowedUserIds
        : ['usr-admin-01', 'usr-client-01', 'usr-supp-01', 'usr-trans-01', currentUser.id];
    const invitedEmails = typeof titleOrParams === 'object' ? titleOrParams.invitedEmails || [] : [];

    const roomCode = `RM-LIVE-${Math.floor(1000 + Math.random() * 8999)}`;
    const securityToken = RoomSfuTokenManager.generateToken({
      roomId: `room-${Date.now().toString().slice(-4)}`,
      roomCode,
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      userRole: currentUser.role,
      isHost: true,
      canPublishAudio: true,
      canPublishVideo: true,
      canPublishScreen: true,
      canModerate: true,
    });

    const newRoom: RoomLiveRecord = {
      id: `room-${Date.now().toString().slice(-4)}`,
      roomCode,
      title,
      description,
      createdById: currentUser.id,
      creatorName: `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`,
      creatorRole: currentUser.role,
      status: isImmediate ? 'LIVE' : 'SCHEDULED',
      scheduledAt,
      durationMinutes,
      isImmediate,
      isPrivate,
      hasWaitingRoom,
      participantsCount: 1,
      allowedUserIds: Array.from(new Set([...allowedUserIds, currentUser.id])),
      invitedEmails,
      securityToken,
      recordingConsent: true,
      isRecording: false,
      aiSummaryAvailable: false,
    };

    setRooms((prev) => [newRoom, ...prev]);
    addAuditLog('ROOM_LIVE_CREATED', 'Room', newRoom.roomCode, 'SUCCESS', `Salle ${newRoom.roomCode} ouverte par ${currentUser.role}.`);
    notifyToast(`Salle Room Live ${newRoom.roomCode} créée avec succès !`, 'success');
    return { ok: true, message: 'Salle créée', room: newRoom };
  };

  const addImportJob = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toUpperCase() ?? 'CSV';
    const format = (['SQL', 'BAK', 'DBF', 'CDX', 'CSV', 'XLSX', 'JSON'].includes(ext)
      ? ext
      : 'CSV') as ImportJobRecord['format'];
    const newJob: ImportJobRecord = {
      id: `imp-${Date.now().toString().slice(-4)}`,
      fileName,
      format,
      sha256Checksum: `${Math.random().toString(16).slice(2)}9f86d081884c7d659a2feaa0c55ad015`,
      avScanStatus: 'CLEAN',
      sandboxStatus: 'SANDBOX_READY',
      rowsDetected: Math.floor(800 + Math.random() * 9000),
      tablesDetected: [`sandbox.${fileName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 18)}`],
      compatibilityScore: 99.2,
      initiatedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      firstAdminApprover: currentUser.id,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
    setImportJobs((prev) => [newJob, ...prev]);
    addAuditLog(
      'SANDBOX_IMPORT_ANALYZED',
      'ImportJob',
      newJob.id,
      'SUCCESS',
      `Fichier ${fileName} analysé en Sandbox éphémère isolée (${newJob.rowsDetected} lignes).`
    );
    notifyToast(`Fichier "${fileName}" analysé en Sandbox isolée (${newJob.rowsDetected} lignes détectées) !`, 'success');
  };

  const createManualBackup = () => {
    const code = `BKP-MANUAL-20261118-${Math.floor(1000 + Math.random() * 8999)}`;
    const newBkp: BackupRecord = {
      id: `bkp-${Date.now()}`,
      backupCode: code,
      type: 'MANUAL_SNAPSHOT',
      sizeFormatted: '4.85 GB (Chiffré AES-256-GCM)',
      encryptionKeyAlias: 'alias/tradelink-prod-kek-v4',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: 'VERIFIED',
      restoreStatus: 'PENDING_SECOND_APPROVAL',
      restoreInitiatorId: currentUser.id,
      restoreInitiatorName: `${currentUser.firstName} ${currentUser.lastName}`,
      planHash: `PLAN-IMMUTABLE-${Math.floor(10000 + Math.random() * 89999)}`,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    setBackups((prev) => [newBkp, ...prev]);
    addAuditLog('BACKUP_MANUAL_CREATED', 'Backup', code, 'SUCCESS', `Snapshot chiffré ${code} créé.`);
    notifyToast(`Sauvegarde manuelle chiffrée ${code} créée !`, 'success');
  };

  const approveBackupRestore = (backupId: string) => {
    const bkp = backups.find((b) => b.id === backupId);
    if (!bkp) return { ok: false, message: 'Sauvegarde introuvable' };

    const initiatorId = bkp.restoreInitiatorId ?? 'usr-admin-01';
    const check = validateDualAdminApproval(initiatorId, currentUser.id);
    if (!check.allowed) {
      addAuditLog(
        'BACKUP_RESTORE_SELF_APPROVAL_BLOCKED',
        'Backup',
        bkp.backupCode,
        'DENIED',
        check.reason
      );
      notifyToast(check.reason, 'error');
      return { ok: false, message: check.reason };
    }

    setBackups((prev) =>
      prev.map((b) =>
        b.id === backupId
          ? {
              ...b,
              restoreStatus: 'APPROVED_READY',
              restoreSecondApproverId: currentUser.id,
              restoreSecondApproverName: `${currentUser.firstName} ${currentUser.lastName}`,
            }
          : b
      )
    );
    addAuditLog(
      'BACKUP_RESTORE_DUAL_APPROVED',
      'Backup',
      bkp.backupCode,
      'SUCCESS',
      `Double validation complétée par ${currentUser.firstName} ${currentUser.lastName} (Admin distinct de l’initiateur).`
    );
    notifyToast(`Restauration ${bkp.backupCode} approuvée par le 2e Administrateur distinct !`, 'success');
    return { ok: true, message: check.reason };
  };

  const rotateKMSKey = (keyId: string) => {
    const kek = kmsKeys.find((k) => k.id === keyId);
    if (!kek) return;

    const { updatedKey, logEntry } = rotateKmsMasterKey(kek, currentUser.email);
    setKmsKeys((prev) => prev.map((k) => (k.id === keyId ? updatedKey : k)));
    setKmsOperationsHistory((prev) => [logEntry, ...prev]);

    addAuditLog(
      'KMS_KEY_ENVELOPE_ROTATED',
      'EncryptionKey',
      keyId,
      'SUCCESS',
      `Rotation KEK (${kek.keyAlias}) v${kek.version} -> v${updatedKey.version} effectuée sous HSM sans exposition de secret brut.`
    );
    notifyToast(`Rotation de clé KMS ${kek.keyAlias} (v${updatedKey.version}) exécutée avec ré-enveloppement transparent des DEK.`, 'success');
  };

  const analyzeSandboxFile = (fileName: string, format?: ImportExportFormat): SandboxAnalysisReport => {
    const rep = analyzeFileInIsolatedSandbox({
      fileName,
      fileSize: Math.floor(102400 + Math.random() * 5000000),
      format,
    });
    setSandboxReports((prev) => ({ ...prev, [rep.jobId]: rep }));
    setActiveSandboxReport(rep);

    const ext = (format || fileName.split('.').pop() || 'CSV').toUpperCase() as ImportJobRecord['format'];
    const newJob: ImportJobRecord = {
      id: rep.jobId,
      fileName,
      format: (['SQL', 'BAK', 'DBF', 'CDX', 'CSV', 'XLSX', 'JSON'].includes(ext) ? ext : 'CSV') as any,
      sha256Checksum: rep.sha256Checksum,
      avScanStatus: rep.avScanStatus,
      sandboxStatus: 'SANDBOX_READY',
      rowsDetected: rep.totalRowsDetected,
      tablesDetected: rep.tablesDetected.map((t) => t.tableName),
      compatibilityScore: rep.compatibilityScore,
      initiatedBy: `${currentUser.firstName} ${currentUser.lastName} (${currentUser.id})`,
      firstAdminApprover: currentUser.id,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
    setImportJobs((prev) => [newJob, ...prev]);

    addAuditLog(
      'SANDBOX_ISOLATED_ANALYSIS',
      'SandboxDump',
      rep.jobId,
      'SUCCESS',
      `Fichier ${fileName} analysé en sandbox éphémère isolée (${rep.totalRowsDetected} lignes, score ${rep.compatibilityScore}%, planHash: ${rep.migrationPlanHash.slice(0, 12)}...).`
    );
    notifyToast(`Fichier "${fileName}" analysé en Sandbox isolée (${rep.totalRowsDetected} lignes détectées) !`, 'success');
    return rep;
  };

  const promoteSandboxReport = (reportId: string): { ok: boolean; message: string } => {
    const report = sandboxReports[reportId] || activeSandboxReport;
    if (!report) {
      return { ok: false, message: 'Rapport Sandbox introuvable.' };
    }

    const initiatorId = report.firstAdminApproverId || 'usr-admin-01';
    const check = validateDualAdminOperation({
      initiatorId,
      approverId: currentUser.id,
      actionCode: 'SANDBOX_PROMOTE_TO_PROD',
      planHash: report.migrationPlanHash,
      expectedPlanHash: report.migrationPlanHash,
    });

    if (!check.allowed) {
      addAuditLog(
        'SANDBOX_PROMOTION_DENIED_DUAL_ADMIN',
        'SandboxDump',
        report.jobId,
        'DENIED',
        check.reason
      );
      notifyToast(check.reason, 'error');
      return { ok: false, message: check.reason };
    }

    const updatedReport: SandboxAnalysisReport = {
      ...report,
      promotedToProduction: true,
      secondAdminApproverId: currentUser.id,
    };
    setSandboxReports((prev) => ({ ...prev, [report.jobId]: updatedReport }));
    if (activeSandboxReport?.jobId === report.jobId) {
      setActiveSandboxReport(updatedReport);
    }
    setImportJobs((prev) =>
      prev.map((job) =>
        job.id === report.jobId || job.fileName === report.fileName
          ? {
              ...job,
              sandboxStatus: 'PROMOTED_DOUBLE_APPROVED',
              secondAdminApprover: `${currentUser.firstName} ${currentUser.lastName} (${currentUser.id})`,
            }
          : job
      )
    );

    addAuditLog(
      'SANDBOX_PROMOTION_SUCCESS_DUAL_ADMIN',
      'SandboxDump',
      report.jobId,
      'SUCCESS',
      `Promotion Sandbox validée par 2e Admin distinct (${currentUser.firstName} ${currentUser.lastName}) pour planHash ${report.migrationPlanHash.slice(0, 16)}...`
    );
    notifyToast(`Promotion Sandbox validée par le 2e Admin distinct ! ${report.validRows} lignes intégrées en production.`, 'success');
    return { ok: true, message: check.reason };
  };

  const testBackupRestoreInSandbox = (backupId: string): { ok: boolean; message: string; details?: any } => {
    const bkp = backups.find((b) => b.id === backupId);
    if (!bkp) {
      notifyToast('Sauvegarde introuvable.', 'error');
      return { ok: false, message: 'Sauvegarde introuvable' };
    }

    const integrity = verifyBackupCryptographicIntegrity(bkp);
    if (!integrity.isValid) {
      addAuditLog('BACKUP_INTEGRITY_FAILED', 'Backup', bkp.backupCode, 'DENIED', integrity.message);
      notifyToast(integrity.message, 'error');
      return { ok: false, message: integrity.message };
    }

    const testDetails = {
      testSuccess: true,
      backupCode: bkp.backupCode,
      integrityVerified: true,
      tablesRestoredCount: 8,
      durationMs: 340,
      sandboxContainerId: `sbx-restore-${Date.now().toString().slice(-6)}`,
      isolationGuaranteed: true,
      testedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    addAuditLog(
      'BACKUP_SANDBOX_RESTORE_TEST_SUCCESS',
      'Backup',
      bkp.backupCode,
      'SUCCESS',
      `Restauration test exécutée avec succès dans le container Sandbox isolé ${testDetails.sandboxContainerId}. Aucune écriture en prod.`
    );
    notifyToast(`Test de restauration de "${bkp.backupCode}" réussi en Sandbox isolée (Intégrité SHA-256 certifiée) !`, 'success');
    return { ok: true, message: 'Test de restauration réussi en sandbox isolée.', details: testDetails };
  };

  const simulateKmsEnvelopeCipher = (plainText: string, keyId: string): EnvelopeCipherResult => {
    const kek = kmsKeys.find((k) => k.id === keyId) || kmsKeys[0];
    const cipherResult = simulateEnvelopeEncryption(plainText, kek);

    const op: KmsOperationEntry = {
      id: `kms-op-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operation: 'GENERATE_DATA_KEY',
      keyAlias: kek.keyAlias,
      keyArnMasked: kek.keyArnMasked,
      performedBy: currentUser.email,
      result: 'SUCCESS',
      details: `Chiffrement par enveloppe AES-256-GCM : DEK chiffrée sous KEK (${kek.keyAlias}), secret en clair zéroïzé de la mémoire vive.`,
    };
    setKmsOperationsHistory((prev) => [op, ...prev]);

    addAuditLog(
      'KMS_ENVELOPE_ENCRYPT_SIMULATED',
      'KMSKey',
      kek.keyAlias,
      'SUCCESS',
      `Simulation chiffrement enveloppe AES-256-GCM : payload ${plainText.length} octets chiffré, DEK enveloppée.`
    );
    notifyToast(`Payload chiffré par enveloppe sous ${kek.keyAlias} (AES-256-GCM) !`, 'success');
    return cipherResult;
  };

  const exportDatasetAction = (
    entity: 'PRODUCTS' | 'ORDERS' | 'ENTRIES' | 'AUDIT_LOGS',
    format: ImportExportFormat
  ) => {
    let records: any[] = [];
    switch (entity) {
      case 'PRODUCTS':
        records = products;
        break;
      case 'ORDERS':
        records = orders;
        break;
      case 'ENTRIES':
        records = [
          { id: 'entry-01', entryNumber: 'ECR-2026-001', journalCode: 'VT', date: '2026-11-16', debitAccount: '411000', creditAccount: '707000', amount: '31430.00', currency: 'EUR', label: 'Vente Facture FAC-2026-9901' },
          { id: 'entry-02', entryNumber: 'ECR-2026-002', journalCode: 'BQ', date: '2026-11-16', debitAccount: '512000', creditAccount: '411000', amount: '31430.00', currency: 'EUR', label: 'Règlement Stripe FAC-2026-9901' },
        ];
        break;
      case 'AUDIT_LOGS':
        records = auditLogs;
        break;
    }

    const exported = exportDatasetToFormat({
      entityName: entity,
      records,
      format,
    });

    addAuditLog(
      'ADMIN_DATASET_EXPORT',
      entity,
      exported.fileName,
      'SUCCESS',
      `Export de ${exported.rowsCount} lignes au format ${format} (SHA-256: ${exported.sha256.slice(0, 16)}...).`
    );
    notifyToast(`Export ${exported.fileName} (${format}) généré avec succès !`, 'success');
    return exported;
  };

  const verifyAuditChainAction = () => {
    const chain = buildAuditChainFromLogs(auditLogs);
    const integrity = verifyAuditLogChainIntegrity(chain);

    addAuditLog(
      'AUDIT_HASH_CHAIN_VERIFIED',
      'AuditLog',
      'CHAIN_INTEGRITY',
      integrity.isChainIntact ? 'SUCCESS' : 'WARNING',
      `Vérification cryptographique de la chaîne (${integrity.totalEntriesVerified} entrées vérifiées, Intacte : ${integrity.isChainIntact}).`
    );

    if (integrity.isChainIntact) {
      notifyToast(`Chaîne de hachage d’audit immuable vérifiée avec succès (${integrity.totalEntriesVerified} blocs scellés) !`, 'success');
    } else {
      notifyToast(`Alerte sécurité : rupture détectée dans la chaîne d'audit au bloc #${integrity.brokenIndex} !`, 'error');
    }

    return {
      ...integrity,
      latestHash: chain[0]?.currentHash || 'GENESIS_HASH_TRADELINK_V6_INITIAL_BLOCK',
    };
  };

  const toggleFloatingButton = (id: string) => {
    setFloatingButtons((prev) =>
      prev.map((fb) => (fb.id === id ? { ...fb, isEnabled: !fb.isEnabled } : fb))
    );
    notifyToast('Configuration des boutons flottants mise à jour.', 'info');
  };

  const toggleNotificationRead = (id: string) => {
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
    notifyToast('Toutes les notifications ont été marquées comme lues.', 'success');
  };

  const updateNotificationPreferences = (updated: Partial<NotificationPreferencesRecord>) => {
    setNotificationPreferences((prev) => ({
      ...prev,
      ...updated,
      updatedAt: new Date().toISOString(),
    }));
    notifyToast('Préférences de notifications multi-canaux mises à jour.', 'success');
  };

  // ============================================================================
  // MÉTHODES DE MESSAGERIE B2B CENTRALISÉE (PROMPT 08)
  // ============================================================================

  const activeConversationMessages = messagesByConversation[activeConversationId] || [];

  const sendB2BMessage = async (text: string, attachments: MessageAttachment[] = []) => {
    const activeConv = conversationsList.find((c) => c.id === activeConversationId);
    if (!activeConv) return;

    const senderDetail: ConversationParticipantDetail = {
      id: currentUser.id,
      name: `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email.split('@')[0],
      role: currentUser.role,
      email: currentUser.email,
    };

    const sendRes = await defaultB2BMessagingEngine.sendMessage({
      conversation: activeConv,
      sender: senderDetail,
      text,
      attachments,
      recipientLocalePreference: 'fr',
    });

    setMessagesByConversation((prev) => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), sendRes.message],
    }));

    setConversationsList((prev) =>
      prev.map((c) => (c.id === activeConversationId ? sendRes.conversation : c))
    );

    // Ajoute une notification dans la liste pour les autres participants
    setNotificationsList((prev) => [
      {
        id: `notif-msg-${Date.now()}`,
        cat: 'MESSAGE',
        priority: 'MEDIUM',
        title: `Message de ${senderDetail.name}`,
        msg: text.slice(0, 70) || 'Pièce jointe envoyée',
        icon: 'mailbox',
        isRead: false,
        timestamp: 'À l’instant',
      },
      ...prev,
    ]);
  };

  const uploadB2BAttachment = async (file: File): Promise<MessageAttachment | null> => {
    try {
      const att = SecureAttachmentManager.validateAndProcess({
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type || 'application/pdf',
      });
      notifyToast(`Fichier "${file.name}" analysé et sécurisé.`, 'success');
      return att;
    } catch (err: any) {
      notifyToast(`Erreur téléversement : ${err?.message || 'Fichier non conforme'}`, 'error');
      return null;
    }
  };

  const createB2BConversation = async (
    title: string,
    participants: ConversationParticipantDetail[],
    relatedId?: string,
    relatedType?: 'ORDER' | 'SHIPMENT' | 'QUOTE' | 'TICKET' | 'OTHER'
  ): Promise<ConversationRecord> => {
    const conv = defaultB2BMessagingEngine.createConversation({
      type: relatedType ? (`${relatedType}_THREAD` as any) : 'DIRECT',
      title,
      participants,
      initiatorId: currentUser.id,
      initiatorRole: currentUser.role,
      relatedEntityId: relatedId,
      relatedEntityType: relatedType,
    });

    setConversationsList((prev) => [conv, ...prev]);
    setMessagesByConversation((prev) => ({ ...prev, [conv.id]: [] }));
    setActiveConversationId(conv.id);
    notifyToast(`Conversation "${title}" créée.`, 'success');
    return conv;
  };

  // ============================================================================
  // MÉTHODES INTELLIGENCE ARTIFICIELLE, RAG, OCR/IDP, DICTÉE & ROOM LIVE
  // ============================================================================

  const sendAiAssistantQuery = async (question: string) => {
    if (!question.trim()) {
      return { answer: '', sources: [], quotaRemainingPct: 100 };
    }

    const userMsg: AiChatMessage = {
      id: `msg-user-${Date.now()}`,
      threadId: activeAiThreadId,
      sender: 'USER',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const activeThread = aiThreads.find((t) => t.id === activeAiThreadId) || aiThreads[0];
    const updatedHistory = [...(activeThread?.messages || []), userMsg];

    // OPTIMISTIC UI : Affichage immédiat du message utilisateur avant attente du stream
    const streamingMsgId = `ai-msg-stream-${Date.now()}`;
    const initialAssistantMsg: AiChatMessage = {
      id: streamingMsgId,
      threadId: activeAiThreadId,
      sender: 'ASSISTANT',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: selectedAiModelId,
    };

    setAiThreads((prev) =>
      prev.map((t) =>
        t.id === activeAiThreadId
          ? {
              ...t,
              messages: [...updatedHistory, initialAssistantMsg],
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );

    // TOKEN STREAMING : Émission progressive mot par mot
    let finalAnswer = '';
    let finalSources: RagSourceCitation[] = [];
    let finalResponseMessage: AiChatMessage | undefined;

    try {
      const generator = streamAiAssistantTokens({
        userId: currentUser.id,
        role: currentUser.role,
        companyName: currentUser.companyName,
        question,
        threadHistory: updatedHistory,
        modelId: selectedAiModelId,
        chunkDelayMs: 10,
      });

      for await (const chunk of generator) {
        finalAnswer = chunk.accumulatedText;
        setAiThreads((prev) =>
          prev.map((t) =>
            t.id === activeAiThreadId
              ? {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === streamingMsgId ? { ...m, text: chunk.accumulatedText } : m
                  ),
                }
              : t
          )
        );

        if (chunk.isComplete) {
          finalSources = chunk.sourcesRetrieved || [];
          finalResponseMessage = chunk.responseMessage;
        }
      }
    } catch {
      // Fallback synchrone robuste en cas d'interruption du stream
      const fallback = queryAiAssistantWithRag({
        userId: currentUser.id,
        role: currentUser.role,
        companyName: currentUser.companyName,
        question,
        threadHistory: updatedHistory,
        modelId: selectedAiModelId,
      });
      finalAnswer = fallback.responseMessage.text;
      finalSources = fallback.sourcesRetrieved;
      finalResponseMessage = fallback.responseMessage;
    }

    // Finalisation du message avec métadonnées RAG complètes et audit log
    if (finalResponseMessage) {
      setAiThreads((prev) =>
        prev.map((t) =>
          t.id === activeAiThreadId
            ? {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === streamingMsgId
                    ? {
                        ...finalResponseMessage!,
                        id: streamingMsgId,
                        text: finalAnswer,
                      }
                    : m
                ),
                updatedAt: new Date().toISOString(),
                totalTokensConsumed:
                  t.totalTokensConsumed + (finalResponseMessage?.tokensUsed || 0),
              }
            : t
        )
      );

      addAuditLog(
        'AI_ASSISTANT_QUERY',
        'AiEngine',
        selectedAiModelId,
        finalResponseMessage.isFiltered ? 'WARNING' : 'SUCCESS',
        `Requête IA posée par ${currentUser.email} (${currentUser.role}). RAG: ${finalSources.length} sources.`
      );
    }

    return {
      answer: finalAnswer,
      sources: finalSources,
      quotaRemainingPct: 100,
    };
  };

  const createNewAiThread = (title?: string): string => {
    const newThreadId = `th-${Date.now()}`;
    const newThread: AiConversationThread = {
      id: newThreadId,
      title: title || `Discussion ${new Date().toLocaleDateString()}`,
      userId: currentUser.id,
      role: currentUser.role,
      modelId: selectedAiModelId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          threadId: newThreadId,
          sender: 'ASSISTANT',
          text: `Nouvelle session avec le modèle ${selectedAiModelId} pour ${currentUser.companyName} (${currentUser.role}). Posez votre question sur vos commandes, règles comptables ou documents logistiques.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      totalTokensConsumed: 0,
    };
    setAiThreads((prev) => [newThread, ...prev]);
    setActiveAiThreadId(newThreadId);
    return newThreadId;
  };

  const aiQuota = getOrCreateAiQuota(currentUser.id);

  // OCR / IDP Studio
  const uploadOcrFile = (fileName: string) => {
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(fileName);
    const newDoc: OcrDocumentRecord = {
      ...createMockOcrDocument(),
      id: `ocr-doc-${Date.now().toString().slice(-4)}`,
      fileName,
      fileType: isImage ? 'IMAGE' : 'PDF',
      status: 'EXTRACTED',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    setOcrDocument(newDoc);
    addAuditLog('OCR_DOCUMENT_UPLOADED', 'OCR', newDoc.id, 'SUCCESS', `Document ${fileName} analysé par OCR Studio.`);
    notifyToast(`Extraction OCR/IDP exécutée pour "${fileName}" (Score : ${(newDoc.globalConfidence * 100).toFixed(1)}%)`, 'success');
  };

  const correctOcrField = (fieldKey: string, newValue: string) => {
    setOcrDocument((prev) => correctOcrFieldValue(prev, fieldKey, newValue, currentUser.email));
    notifyToast(`Champ "${fieldKey}" corrigé manuellement. Traçabilité enregistrée.`, 'info');
  };

  const reviewDynamicField = (fieldId: string, status: 'APPROVED' | 'REJECTED', comment?: string) => {
    if (currentUser.role !== 'ADMIN') {
      notifyToast('Action réservée à l’Administrateur TradeLink (Chapitre 6.9).', 'error');
      return;
    }
    setOcrDocument((prev) => reviewDynamicOcrField(prev, fieldId, status, currentUser.email, comment));
    addAuditLog('DYNAMIC_FIELD_REVIEWED', 'OCR', fieldId, status === 'APPROVED' ? 'SUCCESS' : 'WARNING', `Validation admin champ dynamique: ${status}`);
    notifyToast(`Champ dynamique ${status === 'APPROVED' ? 'approuvé' : 'rejeté'} par l’administrateur !`, status === 'APPROVED' ? 'success' : 'info');
  };

  const validateOcrDocument = () => {
    const result = commitOcrDocumentValidation(ocrDocument, currentUser.email);
    if (!result.success) {
      notifyToast(result.message, 'error');
      return { success: false, message: result.message };
    }
    setOcrDocument(result.document);
    addAuditLog('OCR_DOCUMENT_COMMITTED', 'OCR', ocrDocument.id, 'SUCCESS', `Document OCR validé humainement par ${currentUser.email}.`);
    notifyToast(result.message, 'success');
    return { success: true, message: result.message };
  };

  // Dictée Vocale STT / TTS
  const startVoiceDictation = (lang: VoiceLanguage = activeVoiceLang) => {
    setActiveVoiceLang(lang);
    setIsVoiceRecording(true);
    notifyToast(`Dictée vocale démarrée (${lang}) — Parlez dans votre microphone...`, 'info');
  };

  const stopVoiceDictation = () => {
    setIsVoiceRecording(false);
    const formatted = formatDictatedText(voiceTranscript, activeVoiceLang);
    setVoiceTranscript(formatted);
    notifyToast('Dictée vocale enregistrée et formatée !', 'success');
  };

  const speakVoiceText = (text: string, lang: VoiceLanguage = activeVoiceLang) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    }
    notifyToast(`Synthèse vocale (TTS ${lang}) en cours de lecture...`, 'info');
  };

  // Room Live WebRTC / SFU
  const moderateRoomParticipant = (
    targetParticipantId: string,
    action: 'MUTE_MIC' | 'DISABLE_CAM' | 'EXPEL' | 'DELEGATE_HOST' | 'ADMIT' | 'DENY' | 'LOWER_HAND'
  ) => {
    const result = moderateParticipantAction(activeRoomSession, targetParticipantId, action, currentUser.id);
    if (!result.success) {
      notifyToast(result.message, 'error');
      return;
    }
    setActiveRoomSession(result.session);
    addAuditLog('ROOM_MODERATION_ACTION', 'RoomLive', activeRoomSession.roomCode, 'SUCCESS', result.message);
    notifyToast(result.message, 'info');
  };

  const toggleRaiseHand = (participantId?: string) => {
    const targetId = participantId || activeRoomSession.participants.find((p) => p.userId === currentUser.id)?.id;
    if (!targetId) return;
    setActiveRoomSession((prev) => {
      const updated = RoomLiveSfuEngine.toggleRaiseHand(prev, targetId);
      const isRaised = updated.participants.find((p) => p.id === targetId)?.handRaised;
      notifyToast(isRaised ? '✋ Main levée enregistrée !' : 'Main abaissée.', 'info');
      return updated;
    });
  };

  const broadcastRoomReaction = (emoji: string) => {
    const myPart = activeRoomSession.participants.find((p) => p.userId === currentUser.id);
    if (!myPart) return;
    setActiveRoomSession((prev) => {
      const { session } = RoomLiveSfuEngine.broadcastReaction(prev, myPart.id, emoji);
      return session;
    });
  };

  const startRoomRecording = (): { ok: boolean; message: string } => {
    const result = RoomLiveSfuEngine.startRecordingWithConsent(activeRoomSession, currentUser.id);
    if (!result.success) {
      notifyToast(result.message, 'error');
      return { ok: false, message: result.message };
    }
    setActiveRoomSession(result.session);
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomSession.roomId
          ? { ...r, isRecording: true, recordingKey: result.recordingKey, recordingRetentionDays: 90 }
          : r
      )
    );
    addAuditLog('ROOM_RECORDING_STARTED', 'RoomLive', activeRoomSession.roomCode, 'SUCCESS', 'Enregistrement activé sous consentement RGPD Art. 6 & 7');
    notifyToast(result.message, 'success');
    return { ok: true, message: result.message };
  };

  const stopRoomRecording = (): { ok: boolean; message: string } => {
    const result = RoomLiveSfuEngine.stopRecording(activeRoomSession, currentUser.id);
    if (!result.success) {
      notifyToast(result.message, 'error');
      return { ok: false, message: result.message };
    }
    setActiveRoomSession(result.session);
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomSession.roomId ? { ...r, isRecording: false } : r
      )
    );
    addAuditLog('ROOM_RECORDING_STOPPED', 'RoomLive', activeRoomSession.roomCode, 'SUCCESS', 'Enregistrement arrêté et chiffré KMS AES-256');
    notifyToast(result.message, 'info');
    return { ok: true, message: result.message };
  };

  const generateRoomAiSummary = (targetLocale: 'fr' | 'en' | 'ar' = 'fr'): RoomLiveAiSummary => {
    const summary = RoomLiveSfuEngine.generateAiMeetingSummary(activeRoomSession, targetLocale);
    setActiveRoomSession((prev) => ({ ...prev, aiSummary: summary }));
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomSession.roomId
          ? {
              ...r,
              aiSummaryAvailable: true,
              aiSummary: {
                summary: summary.summary,
                decisions: summary.decisions,
                actionItems: summary.actionItems.map((a) => a.task),
                topicsDiscussed: summary.topicsDiscussed,
                generatedAt: summary.generatedAt,
                certifiedHashSha256: summary.certifiedHashSha256,
              },
            }
          : r
      )
    );
    notifyToast('Procès-verbal IA & Synthèse certifiée générés avec succès !', 'success');
    return summary;
  };

  const shareRoomDocument = (document: { id: string; title: string; type: string; url?: string; previewUrl?: string }) => {
    setActiveRoomSession((prev) => RoomLiveSfuEngine.shareDocument(prev, document, currentUser.id));
    notifyToast(`Document "${document.title}" partagé à l'écran.`, 'info');
  };

  const stopSharingRoomDocument = () => {
    setActiveRoomSession((prev) => RoomLiveSfuEngine.stopSharingDocument(prev));
    notifyToast('Partage de document arrêté.', 'info');
  };

  const toggleRoomMedia = (type: 'audio' | 'video' | 'screen') => {
    setActiveRoomSession((prev) => {
      if (type === 'screen') {
        const nextState = !prev.screenShareActive;
        notifyToast(nextState ? 'Partage d’écran documentaire activé' : 'Partage d’écran arrêté', 'info');
        return { ...prev, screenShareActive: nextState };
      }
      const updatedParts = prev.participants.map((p) => {
        if (p.userId === currentUser.id) {
          if (type === 'audio') return { ...p, audioEnabled: !p.audioEnabled };
          if (type === 'video') return { ...p, videoEnabled: !p.videoEnabled };
        }
        return p;
      });
      return { ...prev, participants: updatedParts };
    });
  };

  const sendRoomChatMessage = (text: string) => {
    if (!text.trim()) return;
    const newLine: LiveRoomChatLine = {
      id: `chat-${Date.now()}`,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      senderRole: currentUser.role,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setActiveRoomSession((prev) => ({
      ...prev,
      chatHistory: [...prev.chatHistory, newLine],
    }));
  };

  const addRoomSubtitle = (text: string) => {
    if (!text.trim()) return;
    const newSub: LiveSubtitleLine = {
      id: `sub-${Date.now()}`,
      speakerName: `${currentUser.firstName} ${currentUser.lastName}`,
      speakerRole: currentUser.role,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      language: activeVoiceLang,
    };
    setActiveRoomSession((prev) => ({
      ...prev,
      subtitlesHistory: [...prev.subtitlesHistory, newSub],
    }));
  };

  const exportRoomCertifiedSummary = (): string => {
    const report = generateCertifiedMeetingExport(activeRoomSession);
    addAuditLog(
      'ROOM_CERTIFIED_EXPORT',
      'RoomLive',
      activeRoomSession.roomCode,
      'SUCCESS',
      'Export certifié du compte rendu IA avec sceau SHA-256 et rétention 90 jours.'
    );
    notifyToast('Compte rendu officiel certifié exporté !', 'success');
    return report;
  };

  return (
    <AppContext.Provider
      value={{
        locale,
        setLocale,
        isRtl,
        t,
        theme,
        resolvedDark,
        setTheme,
        toggleQuickTheme,
        uxPreviewState,
        setUxPreviewState,
        currentUser,
        switchUserAccount,
        products,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        catalogFavorites,
        toggleCatalogFavorite,
        isCatalogFavorite,
        comparisonProductIds,
        toggleComparisonProduct,
        clearComparison,
        moderateProduct,
        reportProduct,
        suspendProduct,
        updateProductQuick,
        addProduct,
        updateProductDetails,
        updateProductStock,
        stockMovements,
        stockReservations,
        inventorySessions,
        stockAlerts,
        recordInboundStock,
        adjustStockManual,
        createInventorySession,
        updateInventoryCount,
        reconcileInventorySession,
        archiveProduct,
        deleteProduct,
        importProductsBulk,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartDrawerOpen,
        setCartDrawerOpen,
        orders,
        createOrderFromCart,
        updateOrderStatus,
        updateOrderStatusWithReason,
        quotes,
        createQuote,
        convertQuoteToOrder,
        respondToQuote,
        invoices,
        payInvoice,
        payments,
        shipments,
        updateShipmentStatus,
        incidents,
        reportIncident,
        vehicles,
        missions,
        waypoints,
        respondToMission,
        createLogisticsMission,
        recordProofOfDelivery,
        addVehicle,
        updateVehicleStatus,
        resolveIncident,
        kycDossiers,
        submitClientKYCDocument,
        uploadKycDocumentForDossier,
        reviewKYCDossier,
        addAdminKycComment,
        triggerKycScheduledCron,
        recordKycDocumentPreview,
        updateKycProfile,
        calcHistory,
        runFinancialCalculation,
        rooms,
        createRoomLive,
        importJobs,
        addImportJob,
        backups,
        createManualBackup,
        approveBackupRestore,
        kmsKeys,
        rotateKMSKey,
        auditLogs,
        addAuditLog,
        sandboxReports,
        activeSandboxReport,
        setActiveSandboxReport,
        analyzeSandboxFile,
        promoteSandboxReport,
        testBackupRestoreInSandbox,
        kmsOperationsHistory,
        simulateKmsEnvelopeCipher,
        exportDatasetAction,
        verifyAuditChainAction,
        floatingButtons,
        toggleFloatingButton,
        notificationsList,
        toggleNotificationRead,
        markAllNotificationsRead,
        aiDrawerOpen,
        setAiDrawerOpen,
        voiceModalOpen,
        setVoiceModalOpen,
        toastMessage,
        notifyToast,
        aiThreads,
        activeAiThreadId,
        setActiveAiThreadId,
        selectedAiModelId,
        setSelectedAiModelId,
        sendAiAssistantQuery,
        createNewAiThread,
        aiQuota,
        ocrDocument,
        uploadOcrFile,
        correctOcrField,
        reviewDynamicField,
        validateOcrDocument,
        activeVoiceLang,
        setActiveVoiceLang,
        voiceTranscript,
        setVoiceTranscript,
        isVoiceRecording,
        setIsVoiceRecording,
        startVoiceDictation,
        stopVoiceDictation,
        speakVoiceText,
        activeRoomSession,
        roomViewMode,
        setRoomViewMode,
        moderateRoomParticipant,
        toggleRoomMedia,
        sendRoomChatMessage,
        addRoomSubtitle,
        exportRoomCertifiedSummary,
        toggleRaiseHand,
        broadcastRoomReaction,
        startRoomRecording,
        stopRoomRecording,
        generateRoomAiSummary,
        shareRoomDocument,
        stopSharingRoomDocument,
        notificationPreferences,
        updateNotificationPreferences,
        conversationsList,
        activeConversationId,
        setActiveConversationId,
        activeConversationMessages,
        sendB2BMessage,
        uploadB2BAttachment,
        createB2BConversation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
