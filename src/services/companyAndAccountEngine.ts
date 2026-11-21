// ============================================================================
// TRADELINK V6.1 — MOTEUR DE GESTION DES COMPTES, ACTEURS, ENTREPRISES B2B & ESPACES (LOT 3)
// Missions 3.1, 3.2, 3.3, 3.4 & 3.5 :
// - Cycle de vie complet des comptes : profil, appareils de confiance, codes de secours MFA,
//   désactivation et suppression contrôlée (blocage si obligations commerciales actives)
// - Gouvernance des 7 acteurs (VISITEUR, CLIENT, FOURNISSEUR, TRANSPORTEUR, COMPTABLE, SUPPORT, ADMIN)
// - Gestion des entreprises B2B : création, profil légal, représentants, pièces justificatives,
//   membres, invitations signées HMAC, permissions internes, statuts, historique immuable
//   et isolation stricte inter-entreprises (Anti-IDOR)
// - Agrégateur d'espace utilisateur adapté par rôle (Dashboard, Profil, Sécurité, KYC, Documents, Activités)
// ============================================================================

import {
  UserRoleCode,
  KYCStatus,
} from '../types';
import {
  generateSha256Hash,
  hmacSha256Hex,
  getServiceHmacSecret,
  getSecureRandomBytes,
  constantTimeEqual,
  ROLE_GRANULAR_PERMISSIONS,
} from './securityCrypto';

// ============================================================================
// 1. TYPES & STRUCTURES : ENTREPRISES B2B, MEMBRES, INVITATIONS & PERMISSIONS
// ============================================================================

export type CompanyInternalRole =
  | 'COMPANY_OWNER'
  | 'COMPANY_ADMIN'
  | 'COMPANY_BUYER'
  | 'COMPANY_SALES'
  | 'COMPANY_FINANCE'
  | 'COMPANY_LOGISTICS'
  | 'COMPANY_VIEWER';

export type CompanyInternalPermission =
  | 'company:profile:edit'
  | 'company:members:manage'
  | 'company:documents:upload'
  | 'company:orders:create'
  | 'company:orders:approve'
  | 'company:quotes:negotiate'
  | 'company:invoices:view'
  | 'company:payments:initiate'
  | 'company:logistics:manage'
  | 'company:kyc:submit';

export type CompanyStatus = 'PENDING_KYC' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface CompanyRepresentativeRecord {
  id: string;
  fullName: string;
  title: string; // ex: Directeur Général, Gérant, Président
  idDocumentType: 'CIN' | 'PASSPORT' | 'RESIDENCE_PERMIT';
  idDocumentNumber: string;
  nationality: string;
  email: string;
  phone?: string;
  isPrimarySigner: boolean;
  addedAt: string;
}

export interface CompanySupportingDocumentRecord {
  id: string;
  docType: 'RNE_KBIS' | 'PATENTE_FISCAL' | 'STATUTS' | 'RIB_IBAN' | 'ISO_CERT' | 'CUSTOMS_EORI' | string;
  title: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Checksum: string;
  virusScanStatus: 'CLEAN' | 'QUARANTINED';
  uploadedByUserId: string;
  uploadedAt: string;
  verifiedByAdmin?: boolean;
}

export interface CompanyMemberRecord {
  memberId: string;
  userId: string;
  email: string;
  fullName: string;
  internalRole: CompanyInternalRole;
  permissions: CompanyInternalPermission[];
  status: 'ACTIVE' | 'SUSPENDED';
  joinedAt: string;
  invitedByUserId?: string;
}

export interface CompanyInvitationRecord {
  id: string;
  companyId: string;
  companyName: string;
  invitedEmail: string;
  targetInternalRole: CompanyInternalRole;
  permissions: CompanyInternalPermission[];
  invitedByUserId: string;
  invitedByEmail: string;
  tokenHash: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptedByUserId?: string;
}

export interface CompanyHistoryEntry {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  details: string;
}

export interface CompanyB2BRecord {
  id: string;
  companyCode: string;
  legalName: string;
  tradeName?: string;
  actorType: 'CLIENT' | 'FOURNISSEUR' | 'TRANSPORTEUR';
  legalForm: string; // SARL, SA, SAS, GmbH, LLC
  registrationNumber: string; // ICE, SIRET, RC, Handelsregister
  taxId: string;
  vatNumber?: string;
  legalCapital?: string;
  currency: string;
  countryCode: string;
  headquartersAddress: string;
  city: string;
  postalCode: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  status: CompanyStatus;
  kycDossierId?: string;
  kycStatus: KYCStatus;
  ownerUserId: string;
  representatives: CompanyRepresentativeRecord[];
  supportingDocuments: CompanySupportingDocumentRecord[];
  members: CompanyMemberRecord[];
  invitations: CompanyInvitationRecord[];
  history: CompanyHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export const INTERNAL_ROLE_DEFAULT_PERMISSIONS: Record<CompanyInternalRole, CompanyInternalPermission[]> = {
  COMPANY_OWNER: [
    'company:profile:edit',
    'company:members:manage',
    'company:documents:upload',
    'company:orders:create',
    'company:orders:approve',
    'company:quotes:negotiate',
    'company:invoices:view',
    'company:payments:initiate',
    'company:logistics:manage',
    'company:kyc:submit',
  ],
  COMPANY_ADMIN: [
    'company:profile:edit',
    'company:members:manage',
    'company:documents:upload',
    'company:orders:create',
    'company:orders:approve',
    'company:quotes:negotiate',
    'company:invoices:view',
    'company:logistics:manage',
    'company:kyc:submit',
  ],
  COMPANY_BUYER: [
    'company:orders:create',
    'company:quotes:negotiate',
    'company:invoices:view',
  ],
  COMPANY_SALES: [
    'company:quotes:negotiate',
    'company:orders:approve',
    'company:invoices:view',
  ],
  COMPANY_FINANCE: [
    'company:invoices:view',
    'company:payments:initiate',
    'company:documents:upload',
  ],
  COMPANY_LOGISTICS: [
    'company:logistics:manage',
    'company:documents:upload',
  ],
  COMPANY_VIEWER: [
    'company:invoices:view',
  ],
};

// ============================================================================
// 2. SPÉCIFICATION OFFICIELLE DES 7 ACTEURS TRADELINK (MISSION 3.2)
// ============================================================================

export interface ActorRoleSpecification {
  role: UserRoleCode;
  labelFr: string;
  labelEn: string;
  labelAr: string;
  publicRegistrationAllowed: boolean;
  requiresKyc: boolean;
  mfaMandatory: boolean;
  canCreateRoomLive: boolean;
  canJoinInvitedRoomLive: boolean;
  sourceCommercialDataAccess: 'NONE' | 'OWN_SCOPED' | 'READ_ONLY_AUDIT' | 'FULL_ADMIN';
  defaultWorkspacePath: string;
  allowedModules: string[];
  granularPermissions: string[];
}

export const TRADELINK_ACTOR_SPECIFICATIONS: Record<UserRoleCode, ActorRoleSpecification> = {
  VISITEUR: {
    role: 'VISITEUR',
    labelFr: 'Visiteur Public / Pré-inscription',
    labelEn: 'Public Visitor / Pre-onboarding',
    labelAr: 'زائر عام / ما قبل التسجيل',
    publicRegistrationAllowed: true,
    requiresKyc: false,
    mfaMandatory: false,
    canCreateRoomLive: false,
    canJoinInvitedRoomLive: false,
    sourceCommercialDataAccess: 'NONE',
    defaultWorkspacePath: '/',
    allowedModules: ['PUBLIC_CATALOG', 'OTP_VERIFICATION'],
    granularPermissions: ROLE_GRANULAR_PERMISSIONS.VISITEUR,
  },
  CLIENT: {
    role: 'CLIENT',
    labelFr: 'Client / Acheteur Professionnel B2B',
    labelEn: 'B2B Corporate Buyer / Client',
    labelAr: 'عميل / مشتري مهني للشركات',
    publicRegistrationAllowed: true,
    requiresKyc: true,
    mfaMandatory: false,
    canCreateRoomLive: false, // Règle impérative : Le Client rejoint uniquement les salles autorisées
    canJoinInvitedRoomLive: true,
    sourceCommercialDataAccess: 'OWN_SCOPED',
    defaultWorkspacePath: '/client',
    allowedModules: [
      'DASHBOARD',
      'CATALOG',
      'CART',
      'ORDERS',
      'QUOTES',
      'INVOICES',
      'PAYMENTS',
      'SHIPMENTS_TRACKING',
      'KYC',
      'COMPANY_PROFILE',
      'MESSAGING',
      'ROOM_LIVE_JOIN_ONLY',
      'AI_COPILOT',
      'SUPPORT_TICKETS',
      'DOCUMENTS',
      'SETTINGS',
    ],
    granularPermissions: ROLE_GRANULAR_PERMISSIONS.CLIENT,
  },
  FOURNISSEUR: {
    role: 'FOURNISSEUR',
    labelFr: 'Fournisseur / Industriel Exportateur B2B',
    labelEn: 'B2B Supplier / Industrial Exporter',
    labelAr: 'مورد / مصدر صناعي للشركات',
    publicRegistrationAllowed: true,
    requiresKyc: true,
    mfaMandatory: false,
    canCreateRoomLive: true,
    canJoinInvitedRoomLive: true,
    sourceCommercialDataAccess: 'OWN_SCOPED',
    defaultWorkspacePath: '/fournisseur',
    allowedModules: [
      'DASHBOARD',
      'PRODUCTS_MANAGEMENT',
      'STOCK_INVENTORY',
      'ORDERS_PROCESSING',
      'QUOTES_RFQ_RESPONSE',
      'INVOICES_ISSUED',
      'PAYMENTS_RECEIVED',
      'LOGISTICS_DISPATCH',
      'KYC',
      'COMPANY_PROFILE',
      'MESSAGING',
      'ROOM_LIVE_FULL',
      'AI_COPILOT',
      'SUPPORT_TICKETS',
      'DOCUMENTS',
      'SETTINGS',
    ],
    granularPermissions: ROLE_GRANULAR_PERMISSIONS.FOURNISSEUR,
  },
  TRANSPORTEUR: {
    role: 'TRANSPORTEUR',
    labelFr: 'Transporteur / Opérateur Logistique Multimodal',
    labelEn: 'Carrier / Multimodal Logistics Operator',
    labelAr: 'ناقل / مشغل خدمات لوجستية',
    publicRegistrationAllowed: true,
    requiresKyc: true,
    mfaMandatory: false,
    canCreateRoomLive: true,
    canJoinInvitedRoomLive: true,
    sourceCommercialDataAccess: 'OWN_SCOPED',
    defaultWorkspacePath: '/transporteur',
    allowedModules: [
      'DASHBOARD',
      'LOGISTICS_MISSIONS',
      'FLEET_VEHICLES',
      'SHIPMENTS_STATUS',
      'TRANSPORT_DOCUMENTS_CMR',
      'PROOF_OF_DELIVERY_POD',
      'INCIDENTS_REPORTING',
      'KYC',
      'COMPANY_PROFILE',
      'MESSAGING',
      'ROOM_LIVE_FULL',
      'AI_COPILOT',
      'SUPPORT_TICKETS',
      'SETTINGS',
    ],
    granularPermissions: ROLE_GRANULAR_PERMISSIONS.TRANSPORTEUR,
  },
  COMPTABLE: {
    role: 'COMPTABLE',
    labelFr: 'Comptable / Auditeur Financier',
    labelEn: 'Accountant / Financial Auditor',
    labelAr: 'محاسب / مدقق مالي',
    publicRegistrationAllowed: false, // Provisionné manuellement
    requiresKyc: false,
    mfaMandatory: false,
    canCreateRoomLive: true,
    canJoinInvitedRoomLive: true,
    sourceCommercialDataAccess: 'READ_ONLY_AUDIT', // Règle Stage 3 : Lecture seule sur données commerciales sources
    defaultWorkspacePath: '/comptable',
    allowedModules: [
      'DASHBOARD',
      'CHART_OF_ACCOUNTS',
      'ACCOUNTING_JOURNALS',
      'GENERAL_LEDGER',
      'TRIAL_BALANCE',
      'BANK_RECONCILIATION',
      'FINANCIAL_STATEMENTS',
      'FINANCIAL_CALCULATOR_ACT',
      'FEC_EXPORT',
      'COMMERCIAL_SOURCE_READONLY',
      'MESSAGING',
      'ROOM_LIVE_FULL',
      'AI_COPILOT',
      'SETTINGS',
    ],
    granularPermissions: ROLE_GRANULAR_PERMISSIONS.COMPTABLE,
  },
  SUPPORT: {
    role: 'SUPPORT',
    labelFr: 'Agent Support & Assistance B2B',
    labelEn: 'B2B Support & Helpdesk Agent',
    labelAr: 'وكيل الدعم والمساعدة التقنية',
    publicRegistrationAllowed: false, // Provisionné manuellement
    requiresKyc: false,
    mfaMandatory: false,
    canCreateRoomLive: true,
    canJoinInvitedRoomLive: true,
    sourceCommercialDataAccess: 'NONE', // Aucun accès libre aux mots de passe, moyens de paiement ou coffre KYC privé
    defaultWorkspacePath: '/support',
    allowedModules: [
      'DASHBOARD',
      'TICKETS_MANAGEMENT',
      'ESCALATIONS',
      'KNOWLEDGE_BASE',
      'MESSAGING',
      'ROOM_LIVE_SUPPORT',
      'AI_COPILOT',
      'SETTINGS',
    ],
    granularPermissions: ROLE_GRANULAR_PERMISSIONS.SUPPORT,
  },
  ADMIN: {
    role: 'ADMIN',
    labelFr: 'Administrateur Général & Gouvernance Plateforme',
    labelEn: 'Platform General Administrator & Governance',
    labelAr: 'المدير العام وحوكمة المنصة',
    publicRegistrationAllowed: false, // Provisionné manuellement uniquement
    requiresKyc: false,
    mfaMandatory: true, // MFA TOTP RFC 6238 strictement obligatoire
    canCreateRoomLive: true,
    canJoinInvitedRoomLive: true,
    sourceCommercialDataAccess: 'FULL_ADMIN',
    defaultWorkspacePath: '/admin',
    allowedModules: [
      'DASHBOARD',
      'USERS_GOVERNANCE',
      'COMPANIES_GOVERNANCE',
      'ROLES_PERMISSIONS',
      'KYC_VALIDATION_CENTER',
      'CATALOG_CATEGORIES_ADMIN',
      'COMMERCIAL_SUPERVISION',
      'FINANCIAL_SUPERVISION',
      'ROOM_LIVE_MODERATION',
      'IMPORT_EXPORT_SANDBOX',
      'KMS_VAULT_SECURITY',
      'BACKUPS_RESTORE_DUAL_ADMIN',
      'AUDIT_LOGS_CHAIN',
      'APM_MONITORING',
      'SETTINGS',
    ],
    granularPermissions: ROLE_GRANULAR_PERMISSIONS.ADMIN,
  },
};

// ============================================================================
// 3. MOTEUR DE GESTION DES ENTREPRISES B2B & ISOLATION ANTI-IDOR (MISSION 3.3)
// ============================================================================

export class B2BCompanyManagementEngine {
  private readonly companiesById = new Map<string, CompanyB2BRecord>();
  private readonly mfaRecoveryCodesByUser = new Map<string, Set<string>>();

  constructor() {
    this.seedDefaultCompanies();
  }

  private seedDefaultCompanies(): void {
    const now = '2026-02-10T09:00:00.000Z';

    const atlasCompany: CompanyB2BRecord = {
      id: 'comp-atlas-01',
      companyCode: 'CLI-ATLAS-MA-01',
      legalName: 'Atlas Import & Distribution SARL',
      tradeName: 'Atlas B2B Distribution',
      actorType: 'CLIENT',
      legalForm: 'SARL',
      registrationNumber: 'MA-RC-CAS-109283',
      taxId: 'MA-ICE-002849100',
      vatNumber: 'MA-IF-44910283',
      legalCapital: '2500000.0000',
      currency: 'MAD',
      countryCode: 'MA',
      headquartersAddress: 'Boulevard d’Anfa, Tour CFC #14',
      city: 'Casablanca',
      postalCode: '20000',
      contactEmail: 's.mansouri@atlas-import.ma',
      contactPhone: '+212661002244',
      website: 'https://atlas-import.ma',
      status: 'ACTIVE',
      kycDossierId: 'kyc-client-01',
      kycStatus: 'VALIDATED',
      ownerUserId: 'usr-client-01',
      representatives: [
        {
          id: 'rep-atlas-01',
          fullName: 'Sofia Mansouri',
          title: 'Directrice Générale',
          idDocumentType: 'CIN',
          idDocumentNumber: 'BK-492011',
          nationality: 'MA',
          email: 's.mansouri@atlas-import.ma',
          phone: '+212661002244',
          isPrimarySigner: true,
          addedAt: now,
        },
      ],
      supportingDocuments: [],
      members: [
        {
          memberId: 'mem-atlas-01',
          userId: 'usr-client-01',
          email: 's.mansouri@atlas-import.ma',
          fullName: 'Sofia Mansouri',
          internalRole: 'COMPANY_OWNER',
          permissions: [...INTERNAL_ROLE_DEFAULT_PERMISSIONS.COMPANY_OWNER],
          status: 'ACTIVE',
          joinedAt: now,
        },
      ],
      invitations: [],
      history: [
        {
          id: 'chist-atlas-01',
          timestamp: now,
          actorUserId: 'usr-client-01',
          actorEmail: 's.mansouri@atlas-import.ma',
          action: 'COMPANY_CREATED_AND_KYC_VALIDATED',
          details: 'Création initiale de l’entreprise Atlas Import & Distribution SARL.',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const eurotechCompany: CompanyB2BRecord = {
      id: 'comp-eurotech-01',
      companyCode: 'SUP-EURO-DE-01',
      legalName: 'EuroTech Industrial & ColdChain GmbH',
      tradeName: 'EuroTech Germany',
      actorType: 'FOURNISSEUR',
      legalForm: 'GmbH',
      registrationNumber: 'DE-HRB-884120',
      taxId: 'DE-998877665',
      vatNumber: 'DE998877665',
      legalCapital: '500000.0000',
      currency: 'EUR',
      countryCode: 'DE',
      headquartersAddress: 'Am Sandtorkai 54, HafenCity',
      city: 'Hamburg',
      postalCode: '20457',
      contactEmail: 'h.weber@eurotech-supply.de',
      contactPhone: '+49408829100',
      website: 'https://eurotech-supply.de',
      status: 'ACTIVE',
      kycDossierId: 'kyc-supp-01',
      kycStatus: 'VALIDATED',
      ownerUserId: 'usr-supp-01',
      representatives: [
        {
          id: 'rep-euro-01',
          fullName: 'Hans Weber',
          title: 'Geschäftsführer (CEO)',
          idDocumentType: 'PASSPORT',
          idDocumentNumber: 'C01X99281',
          nationality: 'DE',
          email: 'h.weber@eurotech-supply.de',
          isPrimarySigner: true,
          addedAt: now,
        },
      ],
      supportingDocuments: [],
      members: [
        {
          memberId: 'mem-euro-01',
          userId: 'usr-supp-01',
          email: 'h.weber@eurotech-supply.de',
          fullName: 'Hans Weber',
          internalRole: 'COMPANY_OWNER',
          permissions: [...INTERNAL_ROLE_DEFAULT_PERMISSIONS.COMPANY_OWNER],
          status: 'ACTIVE',
          joinedAt: now,
        },
      ],
      invitations: [],
      history: [
        {
          id: 'chist-euro-01',
          timestamp: now,
          actorUserId: 'usr-supp-01',
          actorEmail: 'h.weber@eurotech-supply.de',
          action: 'COMPANY_CREATED_AND_KYC_VALIDATED',
          details: 'Création initiale de l’entreprise EuroTech Industrial & ColdChain GmbH.',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const logisCompany: CompanyB2BRecord = {
      id: 'comp-logis-01',
      companyCode: 'CAR-LOGIS-MA-01',
      legalName: 'LogisTrading Maroc SARL',
      tradeName: 'LogisTrading Freight',
      actorType: 'TRANSPORTEUR',
      legalForm: 'SARL',
      registrationNumber: 'MA-RC-TNG-55419',
      taxId: 'MA-ICE-007654321',
      legalCapital: '1200000.0000',
      currency: 'MAD',
      countryCode: 'MA',
      headquartersAddress: 'Zone Logistique Port Tanger Med, Secteur B',
      city: 'Tanger',
      postalCode: '90000',
      contactEmail: 't.alami@logistrading.ma',
      contactPhone: '+212662998877',
      status: 'ACTIVE',
      kycDossierId: 'kyc-trans-01',
      kycStatus: 'VALIDATED',
      ownerUserId: 'usr-trans-01',
      representatives: [
        {
          id: 'rep-logis-01',
          fullName: 'Tariq Alami',
          title: 'Gérant Exploitation Flotte',
          idDocumentType: 'CIN',
          idDocumentNumber: 'KB-112938',
          nationality: 'MA',
          email: 't.alami@logistrading.ma',
          phone: '+212662998877',
          isPrimarySigner: true,
          addedAt: now,
        },
      ],
      supportingDocuments: [],
      members: [
        {
          memberId: 'mem-logis-01',
          userId: 'usr-trans-01',
          email: 't.alami@logistrading.ma',
          fullName: 'Tariq Alami',
          internalRole: 'COMPANY_OWNER',
          permissions: [...INTERNAL_ROLE_DEFAULT_PERMISSIONS.COMPANY_OWNER],
          status: 'ACTIVE',
          joinedAt: now,
        },
      ],
      invitations: [],
      history: [
        {
          id: 'chist-logis-01',
          timestamp: now,
          actorUserId: 'usr-trans-01',
          actorEmail: 't.alami@logistrading.ma',
          action: 'COMPANY_CREATED_AND_KYC_VALIDATED',
          details: 'Création initiale de l’entreprise LogisTrading Maroc SARL.',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.companiesById.set(atlasCompany.id, atlasCompany);
    this.companiesById.set(eurotechCompany.id, eurotechCompany);
    this.companiesById.set(logisCompany.id, logisCompany);
  }

  /**
   * Vérifie qu'un utilisateur appartient à l'entreprise ou est ADMIN/COMPTABLE (Protection IDOR inter-entreprises)
   */
  public assertCompanyAccess(
    company: CompanyB2BRecord,
    actor: { id: string; email: string; role: UserRoleCode },
    requiredInternalPermission?: CompanyInternalPermission
  ): CompanyMemberRecord | null {
    const member = company.members.find(
      (m) => (m.userId === actor.id || m.email.toLowerCase() === actor.email.toLowerCase()) && m.status === 'ACTIVE'
    );

    if (actor.role === 'ADMIN') {
      return member ?? null;
    }

    // Le Comptable dispose d'un accès en lecture seule (audit financier) sans permission de mutation
    if (actor.role === 'COMPTABLE' && !requiredInternalPermission) {
      return null;
    }

    if (!member) {
      const err = new Error(
        `COMPANY_ISOLATION_IDOR_VIOLATION: Accès refusé à l'entreprise "${company.legalName}". Isolation stricte entre entreprises.`
      );
      (err as any).statusCode = 403;
      (err as any).errorCode = 'COMPANY_ISOLATION_IDOR_VIOLATION';
      throw err;
    }

    if (requiredInternalPermission && !member.permissions.includes(requiredInternalPermission)) {
      const err = new Error(
        `COMPANY_INTERNAL_PERMISSION_DENIED: La permission interne "${requiredInternalPermission}" est requise (rôle actuel : ${member.internalRole}).`
      );
      (err as any).statusCode = 403;
      (err as any).errorCode = 'COMPANY_INTERNAL_PERMISSION_DENIED';
      throw err;
    }

    return member;
  }

  public listCompaniesForActor(actor: { id: string; email: string; role: UserRoleCode }): CompanyB2BRecord[] {
    const all = Array.from(this.companiesById.values());
    if (actor.role === 'ADMIN' || actor.role === 'COMPTABLE' || actor.role === 'SUPPORT') {
      return all.map((c) => structuredClone(c));
    }
    return all
      .filter((c) =>
        c.members.some(
          (m) => (m.userId === actor.id || m.email.toLowerCase() === actor.email.toLowerCase()) && m.status === 'ACTIVE'
        )
      )
      .map((c) => structuredClone(c));
  }

  public getCompanyByIdForActor(
    companyId: string,
    actor: { id: string; email: string; role: UserRoleCode }
  ): CompanyB2BRecord {
    const comp = this.companiesById.get(companyId);
    if (!comp) {
      const err = new Error(`COMPANY_NOT_FOUND: Entreprise "${companyId}" introuvable.`);
      (err as any).statusCode = 404;
      (err as any).errorCode = 'COMPANY_NOT_FOUND';
      throw err;
    }
    this.assertCompanyAccess(comp, actor);
    return structuredClone(comp);
  }

  public findCompanyByUserId(userId: string, email?: string): CompanyB2BRecord | null {
    for (const comp of this.companiesById.values()) {
      const isMember = comp.members.some(
        (m) => m.userId === userId || (email && m.email.toLowerCase() === email.toLowerCase())
      );
      if (isMember) return structuredClone(comp);
    }
    return null;
  }

  public createCompany(params: {
    legalName: string;
    tradeName?: string;
    actorType: 'CLIENT' | 'FOURNISSEUR' | 'TRANSPORTEUR';
    legalForm: string;
    registrationNumber: string;
    taxId: string;
    vatNumber?: string;
    legalCapital?: string;
    currency?: string;
    countryCode: string;
    headquartersAddress: string;
    city: string;
    postalCode: string;
    contactEmail: string;
    contactPhone: string;
    website?: string;
    representativeName?: string;
    representativeTitle?: string;
    representativeIdNumber?: string;
    actor: { id: string; email: string; role: UserRoleCode; companyName?: string };
  }): CompanyB2BRecord {
    if (!params.legalName || params.legalName.trim().length < 2) {
      const err = new Error('VALIDATION_COMPANY_LEGAL_NAME: La raison sociale est obligatoire.');
      (err as any).statusCode = 400;
      (err as any).errorCode = 'VALIDATION_COMPANY_LEGAL_NAME';
      throw err;
    }
    if (!params.registrationNumber || !params.taxId) {
      const err = new Error('VALIDATION_COMPANY_LEGAL_IDS: Le numéro d’immatriculation (RC/SIRET) et l’identifiant fiscal (ICE/IF) sont obligatoires.');
      (err as any).statusCode = 400;
      (err as any).errorCode = 'VALIDATION_COMPANY_LEGAL_IDS';
      throw err;
    }

    const now = new Date().toISOString();
    const id = `comp-${Date.now().toString(36)}-${Buffer.from(getSecureRandomBytes(3)).toString('hex')}`;
    const prefix = params.actorType === 'FOURNISSEUR' ? 'SUP' : params.actorType === 'TRANSPORTEUR' ? 'CAR' : 'CLI';
    const companyCode = `${prefix}-${params.countryCode.toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const representatives: CompanyRepresentativeRecord[] = params.representativeName
      ? [
          {
            id: `rep-${Date.now().toString(36)}`,
            fullName: params.representativeName.trim(),
            title: params.representativeTitle?.trim() || 'Représentant Légal',
            idDocumentType: 'CIN',
            idDocumentNumber: params.representativeIdNumber?.trim() || 'PENDING-ID',
            nationality: params.countryCode.toUpperCase(),
            email: params.contactEmail.trim().toLowerCase(),
            phone: params.contactPhone.trim(),
            isPrimarySigner: true,
            addedAt: now,
          },
        ]
      : [];

    const company: CompanyB2BRecord = {
      id,
      companyCode,
      legalName: params.legalName.trim(),
      tradeName: params.tradeName?.trim(),
      actorType: params.actorType,
      legalForm: params.legalForm.trim().toUpperCase(),
      registrationNumber: params.registrationNumber.trim(),
      taxId: params.taxId.trim(),
      vatNumber: params.vatNumber?.trim(),
      legalCapital: params.legalCapital ?? '100000.0000',
      currency: params.currency ?? 'EUR',
      countryCode: params.countryCode.trim().toUpperCase(),
      headquartersAddress: params.headquartersAddress.trim(),
      city: params.city.trim(),
      postalCode: params.postalCode.trim(),
      contactEmail: params.contactEmail.trim().toLowerCase(),
      contactPhone: params.contactPhone.trim(),
      website: params.website?.trim(),
      status: 'PENDING_KYC',
      kycStatus: 'PENDING_SUBMISSION',
      ownerUserId: params.actor.id,
      representatives,
      supportingDocuments: [],
      members: [
        {
          memberId: `mem-${Date.now().toString(36)}`,
          userId: params.actor.id,
          email: params.actor.email.toLowerCase(),
          fullName: params.representativeName?.trim() || params.actor.email,
          internalRole: 'COMPANY_OWNER',
          permissions: [...INTERNAL_ROLE_DEFAULT_PERMISSIONS.COMPANY_OWNER],
          status: 'ACTIVE',
          joinedAt: now,
        },
      ],
      invitations: [],
      history: [
        {
          id: `chist-${Date.now().toString(36)}`,
          timestamp: now,
          actorUserId: params.actor.id,
          actorEmail: params.actor.email,
          action: 'COMPANY_CREATED',
          details: `Création de l'entreprise ${params.legalName.trim()} (${companyCode}).`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.companiesById.set(company.id, company);
    return structuredClone(company);
  }

  public updateCompanyProfile(params: {
    companyId: string;
    patch: Partial<Pick<
      CompanyB2BRecord,
      | 'legalName'
      | 'tradeName'
      | 'legalForm'
      | 'registrationNumber'
      | 'taxId'
      | 'vatNumber'
      | 'legalCapital'
      | 'currency'
      | 'headquartersAddress'
      | 'city'
      | 'postalCode'
      | 'contactEmail'
      | 'contactPhone'
      | 'website'
    >>;
    actor: { id: string; email: string; role: UserRoleCode };
  }): CompanyB2BRecord {
    const comp = this.companiesById.get(params.companyId);
    if (!comp) {
      const err = new Error('COMPANY_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'COMPANY_NOT_FOUND';
      throw err;
    }

    this.assertCompanyAccess(comp, params.actor, 'company:profile:edit');

    const updatedFields: string[] = [];
    const allowedKeys: (keyof typeof params.patch)[] = [
      'legalName',
      'tradeName',
      'legalForm',
      'registrationNumber',
      'taxId',
      'vatNumber',
      'legalCapital',
      'currency',
      'headquartersAddress',
      'city',
      'postalCode',
      'contactEmail',
      'contactPhone',
      'website',
    ];

    for (const k of allowedKeys) {
      const val = params.patch[k];
      if (val !== undefined) {
        (comp as any)[k] = typeof val === 'string' ? val.trim() : val;
        updatedFields.push(String(k));
      }
    }

    comp.updatedAt = new Date().toISOString();
    comp.history.unshift({
      id: `chist-${Date.now().toString(36)}`,
      timestamp: comp.updatedAt,
      actorUserId: params.actor.id,
      actorEmail: params.actor.email,
      action: 'COMPANY_PROFILE_UPDATED',
      details: `Champs mis à jour : ${updatedFields.join(', ') || 'aucun'}.`,
    });

    return structuredClone(comp);
  }

  public addRepresentative(params: {
    companyId: string;
    representative: Omit<CompanyRepresentativeRecord, 'id' | 'addedAt'>;
    actor: { id: string; email: string; role: UserRoleCode };
  }): CompanyRepresentativeRecord {
    const comp = this.companiesById.get(params.companyId);
    if (!comp) {
      const err = new Error('COMPANY_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'COMPANY_NOT_FOUND';
      throw err;
    }

    this.assertCompanyAccess(comp, params.actor, 'company:profile:edit');

    const now = new Date().toISOString();
    const rep: CompanyRepresentativeRecord = {
      ...params.representative,
      id: `rep-${Date.now().toString(36)}-${Buffer.from(getSecureRandomBytes(2)).toString('hex')}`,
      addedAt: now,
    };

    comp.representatives.push(rep);
    comp.updatedAt = now;
    comp.history.unshift({
      id: `chist-${Date.now().toString(36)}`,
      timestamp: now,
      actorUserId: params.actor.id,
      actorEmail: params.actor.email,
      action: 'COMPANY_REPRESENTATIVE_ADDED',
      details: `Représentant légal ajouté : ${rep.fullName} (${rep.title}).`,
    });

    return structuredClone(rep);
  }

  public addSupportingDocument(params: {
    companyId: string;
    docType: string;
    title: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    virusScanStatus: 'CLEAN' | 'QUARANTINED' | 'INFECTED';
    actor: { id: string; email: string; role: UserRoleCode };
  }): CompanySupportingDocumentRecord {
    const comp = this.companiesById.get(params.companyId);
    if (!comp) {
      const err = new Error('COMPANY_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'COMPANY_NOT_FOUND';
      throw err;
    }

    this.assertCompanyAccess(comp, params.actor, 'company:documents:upload');

    if (params.virusScanStatus !== 'CLEAN') {
      const err = new Error('COMPANY_DOCUMENT_NOT_CLEAN: Tout document justificatif d’entreprise doit avoir passé le scan antivirus ClamAV (statut CLEAN).');
      (err as any).statusCode = 400;
      (err as any).errorCode = 'COMPANY_DOCUMENT_NOT_CLEAN';
      throw err;
    }

    const now = new Date().toISOString();
    const doc: CompanySupportingDocumentRecord = {
      id: `cdoc-${Date.now().toString(36)}-${Buffer.from(getSecureRandomBytes(2)).toString('hex')}`,
      docType: params.docType,
      title: params.title,
      fileName: params.fileName,
      fileSizeBytes: params.fileSizeBytes,
      mimeType: params.mimeType,
      sha256Checksum: generateSha256Hash(`${params.companyId}:${params.fileName}:${params.fileSizeBytes}:${now}`),
      virusScanStatus: 'CLEAN',
      uploadedByUserId: params.actor.id,
      uploadedAt: now,
    };

    comp.supportingDocuments.push(doc);
    comp.updatedAt = now;
    comp.history.unshift({
      id: `chist-${Date.now().toString(36)}`,
      timestamp: now,
      actorUserId: params.actor.id,
      actorEmail: params.actor.email,
      action: 'COMPANY_DOCUMENT_UPLOADED',
      details: `Document justificatif déposé : ${doc.title} (${doc.fileName}, SHA-256: ${doc.sha256Checksum.slice(0, 12)}...).`,
    });

    return structuredClone(doc);
  }

  public inviteMember(params: {
    companyId: string;
    invitedEmail: string;
    targetInternalRole: CompanyInternalRole;
    customPermissions?: CompanyInternalPermission[];
    actor: { id: string; email: string; role: UserRoleCode };
  }): { invitation: CompanyInvitationRecord; rawInvitationToken: string } {
    const comp = this.companiesById.get(params.companyId);
    if (!comp) {
      const err = new Error('COMPANY_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'COMPANY_NOT_FOUND';
      throw err;
    }

    this.assertCompanyAccess(comp, params.actor, 'company:members:manage');

    const cleanEmail = params.invitedEmail.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      const err = new Error('VALIDATION_INVALID_EMAIL');
      (err as any).statusCode = 400;
      (err as any).errorCode = 'VALIDATION_INVALID_EMAIL';
      throw err;
    }

    if (comp.members.some((m) => m.email.toLowerCase() === cleanEmail && m.status === 'ACTIVE')) {
      const err = new Error('COMPANY_MEMBER_ALREADY_EXISTS: Cet utilisateur est déjà membre actif de l’entreprise.');
      (err as any).statusCode = 409;
      (err as any).errorCode = 'COMPANY_MEMBER_ALREADY_EXISTS';
      throw err;
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const expiresIso = new Date(nowMs + 7 * 24 * 3600 * 1000).toISOString();
    const inviteId = `inv-${nowMs.toString(36)}-${Buffer.from(getSecureRandomBytes(3)).toString('hex')}`;
    const rawToken = hmacSha256Hex(
      getServiceHmacSecret('JWT_SECRET'),
      `${inviteId}:${comp.id}:${cleanEmail}:${expiresIso}`
    );
    const tokenHash = generateSha256Hash(rawToken);

    const permissions =
      params.customPermissions && params.customPermissions.length > 0
        ? params.customPermissions
        : [...(INTERNAL_ROLE_DEFAULT_PERMISSIONS[params.targetInternalRole] ?? INTERNAL_ROLE_DEFAULT_PERMISSIONS.COMPANY_VIEWER)];

    const invitation: CompanyInvitationRecord = {
      id: inviteId,
      companyId: comp.id,
      companyName: comp.legalName,
      invitedEmail: cleanEmail,
      targetInternalRole: params.targetInternalRole,
      permissions,
      invitedByUserId: params.actor.id,
      invitedByEmail: params.actor.email,
      tokenHash,
      status: 'PENDING',
      createdAt: nowIso,
      expiresAt: expiresIso,
    };

    comp.invitations.push(invitation);
    comp.updatedAt = nowIso;
    comp.history.unshift({
      id: `chist-${Date.now().toString(36)}`,
      timestamp: nowIso,
      actorUserId: params.actor.id,
      actorEmail: params.actor.email,
      action: 'COMPANY_MEMBER_INVITED',
      details: `Invitation envoyée à ${cleanEmail} avec le rôle interne ${params.targetInternalRole}.`,
    });

    return {
      invitation: structuredClone(invitation),
      rawInvitationToken: rawToken,
    };
  }

  public acceptInvitation(params: {
    companyId: string;
    invitationId: string;
    rawToken: string;
    actor: { id: string; email: string; fullName?: string; role: UserRoleCode };
  }): CompanyMemberRecord {
    const comp = this.companiesById.get(params.companyId);
    if (!comp) {
      const err = new Error('COMPANY_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'COMPANY_NOT_FOUND';
      throw err;
    }

    const inv = comp.invitations.find((i) => i.id === params.invitationId);
    if (!inv || inv.status !== 'PENDING') {
      const err = new Error('COMPANY_INVITATION_INVALID_OR_CONSUMED');
      (err as any).statusCode = 400;
      (err as any).errorCode = 'COMPANY_INVITATION_INVALID_OR_CONSUMED';
      throw err;
    }

    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      inv.status = 'EXPIRED';
      const err = new Error('COMPANY_INVITATION_EXPIRED');
      (err as any).statusCode = 400;
      (err as any).errorCode = 'COMPANY_INVITATION_EXPIRED';
      throw err;
    }

    if (inv.invitedEmail.toLowerCase() !== params.actor.email.toLowerCase()) {
      const err = new Error('COMPANY_INVITATION_EMAIL_MISMATCH: Cette invitation est nominative et destinée à une autre adresse email.');
      (err as any).statusCode = 403;
      (err as any).errorCode = 'COMPANY_INVITATION_EMAIL_MISMATCH';
      throw err;
    }

    const candidateHash = generateSha256Hash(params.rawToken);
    if (!constantTimeEqual(candidateHash, inv.tokenHash)) {
      const err = new Error('COMPANY_INVITATION_TOKEN_INVALID');
      (err as any).statusCode = 403;
      (err as any).errorCode = 'COMPANY_INVITATION_TOKEN_INVALID';
      throw err;
    }

    const now = new Date().toISOString();
    inv.status = 'ACCEPTED';
    inv.acceptedAt = now;
    inv.acceptedByUserId = params.actor.id;

    const newMember: CompanyMemberRecord = {
      memberId: `mem-${Date.now().toString(36)}-${Buffer.from(getSecureRandomBytes(2)).toString('hex')}`,
      userId: params.actor.id,
      email: params.actor.email.toLowerCase(),
      fullName: params.actor.fullName || params.actor.email,
      internalRole: inv.targetInternalRole,
      permissions: [...inv.permissions],
      status: 'ACTIVE',
      joinedAt: now,
      invitedByUserId: inv.invitedByUserId,
    };

    comp.members.push(newMember);
    comp.updatedAt = now;
    comp.history.unshift({
      id: `chist-${Date.now().toString(36)}`,
      timestamp: now,
      actorUserId: params.actor.id,
      actorEmail: params.actor.email,
      action: 'COMPANY_INVITATION_ACCEPTED',
      details: `${params.actor.email} a rejoint l’entreprise avec le rôle ${newMember.internalRole}.`,
    });

    return structuredClone(newMember);
  }

  public updateMemberPermissions(params: {
    companyId: string;
    targetMemberId: string;
    internalRole?: CompanyInternalRole;
    permissions?: CompanyInternalPermission[];
    actor: { id: string; email: string; role: UserRoleCode };
  }): CompanyMemberRecord {
    const comp = this.companiesById.get(params.companyId);
    if (!comp) {
      const err = new Error('COMPANY_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'COMPANY_NOT_FOUND';
      throw err;
    }

    this.assertCompanyAccess(comp, params.actor, 'company:members:manage');

    const target = comp.members.find((m) => m.memberId === params.targetMemberId || m.userId === params.targetMemberId);
    if (!target) {
      const err = new Error('COMPANY_MEMBER_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'COMPANY_MEMBER_NOT_FOUND';
      throw err;
    }

    if (params.internalRole) {
      // Empêcher de rétrograder le dernier COMPANY_OWNER
      if (target.internalRole === 'COMPANY_OWNER' && params.internalRole !== 'COMPANY_OWNER') {
        const ownersCount = comp.members.filter((m) => m.internalRole === 'COMPANY_OWNER' && m.status === 'ACTIVE').length;
        if (ownersCount <= 1) {
          const err = new Error('CANNOT_DEMOTE_LAST_COMPANY_OWNER');
          (err as any).statusCode = 400;
          (err as any).errorCode = 'CANNOT_DEMOTE_LAST_COMPANY_OWNER';
          throw err;
        }
      }
      target.internalRole = params.internalRole;
      target.permissions = params.permissions ?? [...INTERNAL_ROLE_DEFAULT_PERMISSIONS[params.internalRole]];
    } else if (params.permissions) {
      target.permissions = [...params.permissions];
    }

    const now = new Date().toISOString();
    comp.updatedAt = now;
    comp.history.unshift({
      id: `chist-${Date.now().toString(36)}`,
      timestamp: now,
      actorUserId: params.actor.id,
      actorEmail: params.actor.email,
      action: 'COMPANY_MEMBER_PERMISSIONS_UPDATED',
      details: `Permissions du membre ${target.email} mises à jour (rôle: ${target.internalRole}).`,
    });

    return structuredClone(target);
  }

  public removeMember(params: {
    companyId: string;
    targetMemberId: string;
    actor: { id: string; email: string; role: UserRoleCode };
  }): { removed: boolean; memberId: string } {
    const comp = this.companiesById.get(params.companyId);
    if (!comp) {
      const err = new Error('COMPANY_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'COMPANY_NOT_FOUND';
      throw err;
    }

    this.assertCompanyAccess(comp, params.actor, 'company:members:manage');

    const idx = comp.members.findIndex((m) => m.memberId === params.targetMemberId || m.userId === params.targetMemberId);
    if (idx === -1) {
      const err = new Error('COMPANY_MEMBER_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'COMPANY_MEMBER_NOT_FOUND';
      throw err;
    }

    const target = comp.members[idx];
    if (target.internalRole === 'COMPANY_OWNER') {
      const ownersCount = comp.members.filter((m) => m.internalRole === 'COMPANY_OWNER' && m.status === 'ACTIVE').length;
      if (ownersCount <= 1) {
        const err = new Error('CANNOT_REMOVE_LAST_COMPANY_OWNER: Une entreprise doit conserver au moins un propriétaire légal actif.');
        (err as any).statusCode = 400;
        (err as any).errorCode = 'CANNOT_REMOVE_LAST_COMPANY_OWNER';
        throw err;
      }
    }

    comp.members.splice(idx, 1);
    const now = new Date().toISOString();
    comp.updatedAt = now;
    comp.history.unshift({
      id: `chist-${Date.now().toString(36)}`,
      timestamp: now,
      actorUserId: params.actor.id,
      actorEmail: params.actor.email,
      action: 'COMPANY_MEMBER_REMOVED',
      details: `Membre ${target.email} retiré de l'entreprise.`,
    });

    return { removed: true, memberId: target.memberId };
  }

  public updateCompanyStatusByAdmin(params: {
    companyId: string;
    status: CompanyStatus;
    reason: string;
    actor: { id: string; email: string; role: UserRoleCode };
  }): CompanyB2BRecord {
    if (params.actor.role !== 'ADMIN') {
      const err = new Error('FORBIDDEN_ADMIN_ONLY: Seul un administrateur peut modifier le statut légal d’une entreprise.');
      (err as any).statusCode = 403;
      (err as any).errorCode = 'FORBIDDEN_ADMIN_ONLY';
      throw err;
    }

    const comp = this.companiesById.get(params.companyId);
    if (!comp) {
      const err = new Error('COMPANY_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'COMPANY_NOT_FOUND';
      throw err;
    }

    if (!params.reason || params.reason.trim().length < 5) {
      const err = new Error('COMPANY_STATUS_REASON_REQUIRED: Un motif explicite (min. 5 caractères) est obligatoire.');
      (err as any).statusCode = 400;
      (err as any).errorCode = 'COMPANY_STATUS_REASON_REQUIRED';
      throw err;
    }

    const prevStatus = comp.status;
    comp.status = params.status;
    comp.updatedAt = new Date().toISOString();
    comp.history.unshift({
      id: `chist-${Date.now().toString(36)}`,
      timestamp: comp.updatedAt,
      actorUserId: params.actor.id,
      actorEmail: params.actor.email,
      action: `COMPANY_STATUS_${params.status}`,
      details: `Transition ${prevStatus} -> ${params.status}. Motif : ${params.reason.trim()}`,
    });

    return structuredClone(comp);
  }

  // ==========================================================================
  // 4. CODES DE RÉCUPÉRATION MFA À USAGE UNIQUE (MISSION 3.1)
  // ==========================================================================

  public generateMfaRecoveryCodesForUser(userId: string): string[] {
    const codes: string[] = [];
    const hashedSet = new Set<string>();

    for (let i = 0; i < 8; i++) {
      const randHex = Buffer.from(getSecureRandomBytes(5)).toString('hex').toUpperCase();
      const formatted = `TL-${randHex.slice(0, 5)}-${randHex.slice(5, 10)}`;
      codes.push(formatted);
      hashedSet.add(generateSha256Hash(formatted));
    }

    this.mfaRecoveryCodesByUser.set(userId, hashedSet);
    return codes;
  }

  public consumeMfaRecoveryCode(userId: string, rawCode: string): boolean {
    const set = this.mfaRecoveryCodesByUser.get(userId);
    if (!set || !rawCode) return false;
    const targetHash = generateSha256Hash(rawCode.trim().toUpperCase());

    for (const storedHash of set.values()) {
      if (constantTimeEqual(storedHash, targetHash)) {
        set.delete(storedHash); // Usage unique strict
        return true;
      }
    }
    return false;
  }
}

export const defaultCompanyManagementEngine = new B2BCompanyManagementEngine();
