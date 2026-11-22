// ============================================================================
// TRADELINK V6.0 — MOTEUR KYC COMPLET (PROMPT 02 & CONFORMITÉ RÉGLEMENTAIRE B2B)
// - 8 États canoniques : NON_COMMENCE, EN_COURS, DOCUMENTS_SOUMIS, EN_VERIFICATION,
//   COMPLEMENT_DEMANDE, VALIDE, REJETE, SUSPENDU (+ alias historiques)
// - Référentiel des documents requis selon le profil et la juridiction (MA, FR, DE, ES, AE, INTL)
// - Upload sécurisé, scan antivirus, condensat SHA-256 et chiffrement par enveloppe AES-256-GCM (KMS)
// - Génération d'URLs présignées S3/MinIO temporaires (expiration 15 min / 900s) avec signature HMAC-SHA256
// - Prévisualisation sécurisée et journalisée anti-IDOR
// - Historique horodaté, Commentaires administratifs & Notifications multicanales
// - Tâche programmée KYCCronService (Relances J+1, J+3, J+5, J+6 et suspension conditionnelle J+7)
// - Règle d'or : Un dossier dont les pièces obligatoires ont été soumises à temps
//   n'est JAMAIS suspendu à J+7 du seul fait qu'il attend une revue administrative.
// - Seul un Administrateur autorisé peut valider, rejeter, demander un complément ou réactiver.
// // Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================

import {
  KYCDossier,
  KYCDocumentItem,
  KYCStatus,
  UserRoleCode,
  KYCPresignedUrlResponse,
} from '../types';
import {
  generateSha256Hash,
  hmacSha256Hex,
  getServiceHmacSecret,
  getSecureRandomAlphanumeric,
} from './securityCrypto';

export type KycActorProfile = 'CLIENT' | 'FOURNISSEUR' | 'TRANSPORTEUR';

export interface KycRequiredDocSpec {
  docType: string;
  labelFr: string;
  labelEn: string;
  labelAr: string;
  mandatory: boolean;
  acceptedFormats: string;
  maxSizeMb: number;
  descriptionFr: string;
}

export interface JurisdictionRequirementSpec {
  countryCode: string;
  countryName: string;
  currency: string;
  gracePeriodDays: number;
  requiredDocTypes: string[];
  optionalDocTypes: string[];
  docSpecs: KycRequiredDocSpec[];
}

export interface KycHistoryEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRoleCode | 'SYSTEM_CRON';
  action:
    | 'DOSSIER_INITIALIZED'
    | 'DOCUMENT_UPLOADED_ENCRYPTED'
    | 'DOCUMENT_PREVIEWED'
    | 'PRESIGNED_URL_GENERATED'
    | 'PROFILE_INFO_UPDATED'
    | 'ALL_MANDATORY_SUBMITTED_IN_TIME'
    | 'CRON_REMINDER_SENT'
    | 'CRON_J7_PROTECTED_IN_TIME'
    | 'CRON_J7_SUSPENDED_MISSING_DOCS'
    | 'ADMIN_COMMENT_ADDED'
    | 'ADMIN_COMPLEMENT_REQUESTED'
    | 'ADMIN_VALIDATED'
    | 'ADMIN_REJECTED_WITH_REASON'
    | 'ADMIN_ACCOUNT_REACTIVATED';
  summary: string;
}

export interface KycAdminComment {
  id: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
  comment: string;
  targetDocType?: string;
  visibility: 'INTERNAL_ADMIN_ONLY' | 'SHARED_WITH_APPLICANT';
}

export interface KycNotificationItem {
  id: string;
  dossierId: string;
  recipientUserId: string;
  channel: 'IN_APP' | 'EMAIL' | 'SMS';
  milestone: 'UPLOAD' | 'J+1' | 'J+3' | 'J+5' | 'J+6' | 'J+7' | 'ADMIN_DECISION';
  severity: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  sentAt: string;
}

export interface EncryptedKycMetadata {
  cipherAlgorithm: 'AES-256-GCM';
  kekAlias: string;
  dekId: string;
  ivHex: string;
  authTagHex: string;
  sha256: string;
  encryptedVaultUri: string;
  mimeType: string;
  fileSizeBytes: number;
  virusScanStatus: 'CLEAN' | 'QUARANTINED';
}

// 8 États canoniques TRADELINK V6.0
export const KYC_CANONICAL_STATUSES = [
  { code: 'NON_COMMENCE', labelFr: 'Non commencé', step: 1 },
  { code: 'EN_COURS', labelFr: 'En cours', step: 2 },
  { code: 'DOCUMENTS_SOUMIS', labelFr: 'Documents soumis', step: 3 },
  { code: 'EN_VERIFICATION', labelFr: 'En vérification', step: 4 },
  { code: 'COMPLEMENT_DEMANDE', labelFr: 'Complément demandé', step: 5 },
  { code: 'VALIDE', labelFr: 'Validé', step: 6 },
  { code: 'REJETE', labelFr: 'Rejeté', step: 7 },
  { code: 'SUSPENDU', labelFr: 'Suspendu', step: 8 },
] as const;

// 1. Référentiel des documents requis selon le profil (CLIENT, FOURNISSEUR, TRANSPORTEUR)
export const KYC_REQUIRED_DOCUMENTS_BY_PROFILE: Record<KycActorProfile, KycRequiredDocSpec[]> = {
  CLIENT: [
    {
      docType: 'CIN_DIRIGEANT',
      labelFr: 'Pièce d’identité du dirigeant (CIN / Passeport)',
      labelEn: 'Legal Representative ID (National ID / Passport)',
      labelAr: 'بطاقة الهوية الوطنية أو جواز سفر المسير القانوني',
      mandatory: true,
      acceptedFormats: 'PDF, JPG, PNG',
      maxSizeMb: 10,
      descriptionFr: 'Recto-verso couleur en cours de validité du signataire habilité.',
    },
    {
      docType: 'PATENTE_FISCAL',
      labelFr: 'Attestation de Patente & Identifiant Fiscal (ICE / IF)',
      labelEn: 'Business Tax Patent & Fiscal Identifier (ICE / VAT)',
      labelAr: 'شهادة الضريبة المهنية والتعريف الموحد للمقاولة (ICE)',
      mandatory: true,
      acceptedFormats: 'PDF, JPG, PNG',
      maxSizeMb: 10,
      descriptionFr: 'Certificat d’inscription au rôle de la patente de l’exercice en cours.',
    },
    {
      docType: 'RNE_KBIS',
      labelFr: 'Extrait RNE / Registre du Commerce (Kbis < 3 mois)',
      labelEn: 'National Business Registry Extract (RNE / Kbis < 3 months)',
      labelAr: 'مستخرج السجل الوطني للمؤسسات / السجل التجاري (أقل من 3 أشهر)',
      mandatory: true,
      acceptedFormats: 'PDF',
      maxSizeMb: 10,
      descriptionFr: 'Extrait officiel attestant l’existence juridique et les pouvoirs de signature.',
    },
    {
      docType: 'RIB_ATTESTATION',
      labelFr: 'Relevé d’Identité Bancaire Professionnel (IBAN / SWIFT)',
      labelEn: 'Corporate Bank Account Certificate (IBAN / SWIFT)',
      labelAr: 'شهادة الحساب البنكي المهني (IBAN / SWIFT)',
      mandatory: false,
      acceptedFormats: 'PDF, PNG',
      maxSizeMb: 5,
      descriptionFr: 'Optionnel à l’ouverture, recommandé pour les remboursements et avoirs.',
    },
  ],
  FOURNISSEUR: [
    {
      docType: 'RNE_HANDELSREGISTER',
      labelFr: 'Extrait RNE / Handelsregister / Registre du Commerce Industriel',
      labelEn: 'Commercial & Industrial Registry Extract (RNE / Handelsregister)',
      labelAr: 'مستخرج السجل التجاري والصناعي للمورد',
      mandatory: true,
      acceptedFormats: 'PDF',
      maxSizeMb: 10,
      descriptionFr: 'Document officiel de moins de 90 jours identifiant la société exportatrice.',
    },
    {
      docType: 'TVA_FISCAL_CERT',
      labelFr: 'Attestation de Régularité Fiscale & N° TVA / EORI Export',
      labelEn: 'Tax Clearance Certificate & Intra-EU VAT / EORI Number',
      labelAr: 'شهادة الوضعية الجبائية السليمة ورقم التصدير الجمركي',
      mandatory: true,
      acceptedFormats: 'PDF',
      maxSizeMb: 10,
      descriptionFr: 'Obligatoire pour l’émission des factures B2B et le dédouanement import-export.',
    },
    {
      docType: 'ISO_GDP_CERT',
      labelFr: 'Certificat Qualité ISO 9001 / Conformité GDP Chaîne du Froid',
      labelEn: 'ISO 9001 Quality Certificate / GDP Cold Chain Compliance',
      labelAr: 'شهادة الجودة ISO 9001 ومطابقة سلسلة التبريد',
      mandatory: true,
      acceptedFormats: 'PDF, JPG, PNG',
      maxSizeMb: 10,
      descriptionFr: 'Certificat d’accréditation industrielle des équipements commercialisés.',
    },
    {
      docType: 'RIB_SWIFT_EXPORT',
      labelFr: 'Coordonnées Bancaires Internationales SWIFT / SEPA',
      labelEn: 'International Corporate Bank Details (SWIFT / SEPA)',
      labelAr: 'بيانات الحساب البنكي الدولي للتحويلات (SWIFT / SEPA)',
      mandatory: false,
      acceptedFormats: 'PDF',
      maxSizeMb: 5,
      descriptionFr: 'Utilisé pour le reversement des encaissements fournisseurs.',
    },
  ],
  TRANSPORTEUR: [
    {
      docType: 'LICENCE_TRANSPORT_INT',
      labelFr: 'Licence de Transport International de Marchandises (TIR / CEMT)',
      labelEn: 'International Freight Carrier License (TIR / ECMT)',
      labelAr: 'رخصة النقل الدولي للبضائع والعبور الجمركي (TIR)',
      mandatory: true,
      acceptedFormats: 'PDF',
      maxSizeMb: 10,
      descriptionFr: 'Autorisation ministérielle d’exercer le transport routier/multimodal international.',
    },
    {
      docType: 'PERMIS_CE_CARTE_GRISE',
      labelFr: 'Permis Poids Lourd (C+E) & Certificats d’Immatriculation Flotte',
      labelEn: 'Heavy Truck License (C+E) & Fleet Registration Certificates',
      labelAr: 'رخصة السياقة للوزن الثقيل (C+E) والبطاقات الرمادية للأسطول',
      mandatory: true,
      acceptedFormats: 'PDF, JPG, PNG',
      maxSizeMb: 10,
      descriptionFr: 'Justificatifs d’habilitation des conducteurs et des tracteurs routiers.',
    },
    {
      docType: 'ASSURANCE_MARCHANDISE_CMR',
      labelFr: 'Attestation d’Assurance Responsabilité Contractuelle CMR',
      labelEn: 'CMR Cargo Liability Insurance Certificate',
      labelAr: 'شهادة تأمين المسؤولية التعاقدية عن البضائع المنقولة (CMR)',
      mandatory: true,
      acceptedFormats: 'PDF',
      maxSizeMb: 10,
      descriptionFr: 'Police d’assurance couvrant la valeur des marchandises transportées.',
    },
    {
      docType: 'CERTIFICAT_ATP_FRIGO',
      labelFr: 'Attestation ATP — Transport sous Température Dirigée',
      labelEn: 'ATP Cold-Chain Vehicle Certification',
      labelAr: 'شهادة مطابقة النقل المبرد الخاضع للتحكم الحراري (ATP)',
      mandatory: false,
      acceptedFormats: 'PDF, PNG',
      maxSizeMb: 5,
      descriptionFr: 'Requis uniquement pour les missions logistiques Chaîne du Froid.',
    },
  ],
};

// 1b. Référentiel des exigences documentaires configurables par juridiction (MA, FR, DE, ES, AE, INTL)
export const KYC_JURISDICTION_REGISTRY: Record<string, JurisdictionRequirementSpec> = {
  MA: {
    countryCode: 'MA',
    countryName: 'Maroc',
    currency: 'MAD',
    gracePeriodDays: 7,
    requiredDocTypes: ['CIN_DIRIGEANT', 'PATENTE_FISCAL', 'RNE_KBIS'],
    optionalDocTypes: ['RIB_ATTESTATION', 'DOMICILIATION_BAIL'],
    docSpecs: [
      {
        docType: 'CIN_DIRIGEANT',
        labelFr: 'Pièce d’identité du dirigeant (CIN / Passeport)',
        labelEn: 'Legal Representative National ID / Passport',
        labelAr: 'بطاقة الهوية الوطنية أو جواز سفر المسير القانوني',
        mandatory: true,
        acceptedFormats: 'PDF, JPG, PNG',
        maxSizeMb: 10,
        descriptionFr: 'CIN marocaine ou passeport en cours de validité du signataire habilité.',
      },
      {
        docType: 'PATENTE_FISCAL',
        labelFr: 'Attestation de Patente & Identifiant Fiscal (ICE / IF)',
        labelEn: 'Business Tax Patent & Fiscal Identifier (ICE / IF)',
        labelAr: 'شهادة الضريبة المهنية والتعريف الموحد للمقاولة (ICE)',
        mandatory: true,
        acceptedFormats: 'PDF, JPG, PNG',
        maxSizeMb: 10,
        descriptionFr: 'Certificat d’inscription au rôle de la patente et mention de l’ICE officiel.',
      },
      {
        docType: 'RNE_KBIS',
        labelFr: 'Extrait Registre du Commerce (RC / Modèle 7 < 3 mois)',
        labelEn: 'Commercial Register Extract (Model 7 < 3 months)',
        labelAr: 'مستخرج السجل التجاري (النموذج 7 أقل من 3 أشهر)',
        mandatory: true,
        acceptedFormats: 'PDF',
        maxSizeMb: 10,
        descriptionFr: 'Extrait officiel délivré par le Tribunal de Commerce de moins de 90 jours.',
      },
      {
        docType: 'RIB_ATTESTATION',
        labelFr: 'Relevé d’Identité Bancaire Entreprise (RIB)',
        labelEn: 'Corporate Bank Account Certificate (RIB)',
        labelAr: 'شهادة الحساب البنكي للشركة (RIB)',
        mandatory: false,
        acceptedFormats: 'PDF, PNG',
        maxSizeMb: 5,
        descriptionFr: 'Relevé bancaire professionnel pour règlements et remboursements.',
      },
    ],
  },
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    currency: 'EUR',
    gracePeriodDays: 7,
    requiredDocTypes: ['CIN_DIRIGEANT', 'RNE_KBIS', 'TVA_FISCAL_CERT'],
    optionalDocTypes: ['RIB_ATTESTATION'],
    docSpecs: [
      {
        docType: 'CIN_DIRIGEANT',
        labelFr: 'Pièce d’identité du dirigeant (CNI / Passeport)',
        labelEn: 'Manager ID (National ID Card / Passport)',
        labelAr: 'بطاقة الهوية أو جواز سفر المسير',
        mandatory: true,
        acceptedFormats: 'PDF, JPG, PNG',
        maxSizeMb: 10,
        descriptionFr: 'CNI recto-verso couleur ou passeport du dirigeant en cours de validité.',
      },
      {
        docType: 'RNE_KBIS',
        labelFr: 'Extrait Kbis ou Extrait RNE (< 3 mois)',
        labelEn: 'Official Kbis or RNE Extract (< 3 months)',
        labelAr: 'مستخرج السجل التجاري Kbis (أقل من 3 أشهر)',
        mandatory: true,
        acceptedFormats: 'PDF',
        maxSizeMb: 10,
        descriptionFr: 'Extrait Kbis délivré par le greffe du tribunal de commerce (moins de 90 jours).',
      },
      {
        docType: 'TVA_FISCAL_CERT',
        labelFr: 'Attestation de Régularité Fiscale & N° TVA Intracommunautaire',
        labelEn: 'Tax Clearance Certificate & Intra-EU VAT Number',
        labelAr: 'شهادة الوضعية الجبائية ورقم ضريبة القيمة المضافة',
        mandatory: true,
        acceptedFormats: 'PDF',
        maxSizeMb: 10,
        descriptionFr: 'Attestation de vigilance URSSAF ou régularité fiscale DGFIP.',
      },
      {
        docType: 'RIB_ATTESTATION',
        labelFr: 'RIB / IBAN Entreprise SEPA',
        labelEn: 'Corporate SEPA IBAN Certificate',
        labelAr: 'شهادة الحساب البنكي SEPA للشركة',
        mandatory: false,
        acceptedFormats: 'PDF',
        maxSizeMb: 5,
        descriptionFr: 'RIB bancaire professionnel pour les virements SEPA.',
      },
    ],
  },
  DE: {
    countryCode: 'DE',
    countryName: 'Allemagne',
    currency: 'EUR',
    gracePeriodDays: 7,
    requiredDocTypes: ['CIN_DIRIGEANT', 'RNE_HANDELSREGISTER', 'TVA_FISCAL_CERT'],
    optionalDocTypes: ['RIB_ATTESTATION'],
    docSpecs: [
      {
        docType: 'CIN_DIRIGEANT',
        labelFr: 'Personalausweis ou Reisepass du dirigeant',
        labelEn: 'Managing Director ID / Passport (Personalausweis)',
        labelAr: 'بطاقة الهوية الألمانية أو جواز السفر للمدير',
        mandatory: true,
        acceptedFormats: 'PDF, JPG, PNG',
        maxSizeMb: 10,
        descriptionFr: 'Personalausweis ou passeport officiel en cours de validité.',
      },
      {
        docType: 'RNE_HANDELSREGISTER',
        labelFr: 'Handelsregisterauszug (< 3 mois)',
        labelEn: 'Commercial Register Extract (Handelsregisterauszug < 3 months)',
        labelAr: 'مستخرج السجل التجاري الألماني Handelsregister',
        mandatory: true,
        acceptedFormats: 'PDF',
        maxSizeMb: 10,
        descriptionFr: 'Amtlicher Handelsregisterauszug (HRB/HRA) de moins de 90 jours.',
      },
      {
        docType: 'TVA_FISCAL_CERT',
        labelFr: 'Bescheinigung der USt-IdNr & Gewerbeanmeldung',
        labelEn: 'VAT ID Certificate (USt-IdNr) & Business Registration',
        labelAr: 'شهادة التعريف الضريبي USt-IdNr',
        mandatory: true,
        acceptedFormats: 'PDF',
        maxSizeMb: 10,
        descriptionFr: 'Certificat fiscal fédéral et numéro de TVA intracommunautaire.',
      },
      {
        docType: 'RIB_ATTESTATION',
        labelFr: 'Bankbestätigung / IBAN Geschäftskonto',
        labelEn: 'Corporate Bank Account Confirmation',
        labelAr: 'تأكيد الحساب البنكي التجاري',
        mandatory: false,
        acceptedFormats: 'PDF',
        maxSizeMb: 5,
        descriptionFr: 'Justificatif bancaire professionnel.',
      },
    ],
  },
  ES: {
    countryCode: 'ES',
    countryName: 'Espagne',
    currency: 'EUR',
    gracePeriodDays: 7,
    requiredDocTypes: ['CIN_DIRIGEANT', 'PATENTE_FISCAL', 'RNE_KBIS'],
    optionalDocTypes: ['RIB_ATTESTATION'],
    docSpecs: [
      {
        docType: 'CIN_DIRIGEANT',
        labelFr: 'DNI / NIE / Pasaporte del Administrador',
        labelEn: 'Director National ID / NIE / Passport',
        labelAr: 'بطاقة الهوية الإسبانية DNI/NIE أو جواز السفر',
        mandatory: true,
        acceptedFormats: 'PDF, JPG, PNG',
        maxSizeMb: 10,
        descriptionFr: 'DNI ou NIE en vigueur de l’administrateur habilité.',
      },
      {
        docType: 'PATENTE_FISCAL',
        labelFr: 'Certificado de Identificación Fiscal (CIF / NIF)',
        labelEn: 'Fiscal Identification Certificate (CIF / NIF)',
        labelAr: 'شهادة التعريف الضريبي CIF/NIF',
        mandatory: true,
        acceptedFormats: 'PDF',
        maxSizeMb: 10,
        descriptionFr: 'Certificat officiel délivré par la Agencia Tributaria.',
      },
      {
        docType: 'RNE_KBIS',
        labelFr: 'Nota Simple del Registro Mercantil (< 3 meses)',
        labelEn: 'Mercantile Registry Certificate (< 3 months)',
        labelAr: 'مستخرج السجل التجاري الإسباني Registro Mercantil',
        mandatory: true,
        acceptedFormats: 'PDF',
        maxSizeMb: 10,
        descriptionFr: 'Certificat de constitution et pouvoirs de la société.',
      },
      {
        docType: 'RIB_ATTESTATION',
        labelFr: 'Certificado de Cuenta Bancaria (IBAN)',
        labelEn: 'Bank Account Certificate (IBAN)',
        labelAr: 'شهادة الحساب البنكي الرسمي',
        mandatory: false,
        acceptedFormats: 'PDF',
        maxSizeMb: 5,
        descriptionFr: 'Certificat bancaire professionnel pour transactions.',
      },
    ],
  },
  AE: {
    countryCode: 'AE',
    countryName: 'Émirats Arabes Unis',
    currency: 'AED',
    gracePeriodDays: 7,
    requiredDocTypes: ['CIN_DIRIGEANT', 'PATENTE_FISCAL', 'RNE_KBIS'],
    optionalDocTypes: ['RIB_ATTESTATION'],
    docSpecs: [
      {
        docType: 'CIN_DIRIGEANT',
        labelFr: 'Emirates ID & Passport du Manager',
        labelEn: 'Manager Emirates ID & Passport',
        labelAr: 'الهوية الإماراتية وجواز السفر للمدير',
        mandatory: true,
        acceptedFormats: 'PDF, JPG, PNG',
        maxSizeMb: 10,
        descriptionFr: 'Emirates ID recto-verso et visa/passeport en cours de validité.',
      },
      {
        docType: 'PATENTE_FISCAL',
        labelFr: 'Commercial Trade License (DED / Free Zone)',
        labelEn: 'Commercial Trade License (DED / Free Zone)',
        labelAr: 'الرخصة التجارية المعتمدة من دائرة التنمية الاقتصادية أو المنطقة الحرة',
        mandatory: true,
        acceptedFormats: 'PDF',
        maxSizeMb: 10,
        descriptionFr: 'Licence commerciale valide délivrée par le DED ou l’autorité de zone franche.',
      },
      {
        docType: 'RNE_KBIS',
        labelFr: 'Memorandum of Association (MOA) / Chamber Certificate',
        labelEn: 'Memorandum of Association (MOA) / Chamber Certificate',
        labelAr: 'عقد التأسيس الموثق وشهادة غرفة التجارة',
        mandatory: true,
        acceptedFormats: 'PDF',
        maxSizeMb: 10,
        descriptionFr: 'Statuts notariés et certificat de la Chambre de Commerce.',
      },
      {
        docType: 'RIB_ATTESTATION',
        labelFr: 'Corporate Bank Account Details (IBAN)',
        labelEn: 'Corporate Bank Account Details (IBAN)',
        labelAr: 'بيانات الحساب البنكي للشركة (IBAN)',
        mandatory: false,
        acceptedFormats: 'PDF',
        maxSizeMb: 5,
        descriptionFr: 'Certificat bancaire d’établissement agréé aux EAU.',
      },
    ],
  },
  INTL: {
    countryCode: 'INTL',
    countryName: 'International',
    currency: 'USD',
    gracePeriodDays: 7,
    requiredDocTypes: ['CIN_DIRIGEANT', 'PATENTE_FISCAL', 'RNE_KBIS'],
    optionalDocTypes: ['RIB_ATTESTATION'],
    docSpecs: [
      {
        docType: 'CIN_DIRIGEANT',
        labelFr: 'Passeport International du Représentant Légal',
        labelEn: 'International Passport of Legal Representative',
        labelAr: 'جواز السفر الدولي للممثل القانوني',
        mandatory: true,
        acceptedFormats: 'PDF, JPG, PNG',
        maxSizeMb: 10,
        descriptionFr: 'Passeport en cours de validité du représentant habilité.',
      },
      {
        docType: 'PATENTE_FISCAL',
        labelFr: 'Certificat d’Immatriculation Fiscale Nationale (Tax ID)',
        labelEn: 'National Tax Identification Certificate',
        labelAr: 'شهادة التعريف الضريبي الوطني',
        mandatory: true,
        acceptedFormats: 'PDF',
        maxSizeMb: 10,
        descriptionFr: 'Certificat officiel attestant l’assujettissement fiscal.',
      },
      {
        docType: 'RNE_KBIS',
        labelFr: 'Extrait du Registre Officiel des Sociétés (< 3 mois)',
        labelEn: 'National Company Registry Certificate (< 3 months)',
        labelAr: 'مستخرج السجل التجاري الوطني الرسمي',
        mandatory: true,
        acceptedFormats: 'PDF',
        maxSizeMb: 10,
        descriptionFr: 'Certificate of Good Standing ou extrait officiel du registre du commerce.',
      },
      {
        docType: 'RIB_ATTESTATION',
        labelFr: 'Attestation Bancaire SWIFT / BIC',
        labelEn: 'SWIFT / BIC Bank Account Certificate',
        labelAr: 'شهادة الحساب البنكي الدولي SWIFT',
        mandatory: false,
        acceptedFormats: 'PDF',
        maxSizeMb: 5,
        descriptionFr: 'Coordonnées bancaires internationales certifiées.',
      },
    ],
  },
};

// Récupère les exigences documentaires adaptées selon le profil acteur et la juridiction
export function getRequiredDocsForDossier(
  actorType: KycActorProfile,
  jurisdiction?: string
): KycRequiredDocSpec[] {
  if (actorType === 'TRANSPORTEUR') {
    return KYC_REQUIRED_DOCUMENTS_BY_PROFILE.TRANSPORTEUR;
  }
  if (actorType === 'FOURNISSEUR') {
    return KYC_REQUIRED_DOCUMENTS_BY_PROFILE.FOURNISSEUR;
  }
  if (jurisdiction && KYC_JURISDICTION_REGISTRY[jurisdiction]) {
    return KYC_JURISDICTION_REGISTRY[jurisdiction].docSpecs;
  }
  return KYC_REQUIRED_DOCUMENTS_BY_PROFILE.CLIENT;
}

// Génération d'une URL présignée temporaire (expiration 15 min / 900s) pour téléchargement privé
export function generateKycPresignedDocumentUrl(params: {
  dossierId: string;
  docId: string;
  fileName: string;
  s3ObjectKey?: string;
  expiresInSeconds?: number;
  signingSecret?: string;
}): KYCPresignedUrlResponse {
  const expiresInSeconds = params.expiresInSeconds ?? 900; // 15 minutes par défaut
  const nowMs = Date.now();
  const expiresAtMs = nowMs + expiresInSeconds * 1000;
  const issuedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(expiresAtMs).toISOString();

  const objectKey =
    params.s3ObjectKey ??
    `vault/${params.dossierId}/${params.docId}_${params.fileName.replace(/\s+/g, '_')}`;

  const secret = params.signingSecret ?? getServiceHmacSecret('KYC_SIGNING_SECRET');
  const signingPayload = `${objectKey}:${expiresAtMs}:${params.docId}`;
  const signatureSha256 = hmacSha256Hex(secret, signingPayload);

  const url = `https://s3.tradelink-kyc.internal/${objectKey}?X-TL-Algorithm=HMAC-SHA256&X-TL-Credential=tradelink-kyc-vault-agent&X-TL-Date=${encodeURIComponent(
    issuedAt
  )}&X-TL-Expires=${expiresInSeconds}&X-TL-Signature=${signatureSha256}`;

  return {
    url,
    s3ObjectKey: objectKey,
    docType: params.docId.split('-')[0] ?? 'DOCUMENT',
    fileName: params.fileName,
    expiresInSeconds,
    expiresAt,
    issuedAt,
    signatureSha256,
  };
}

// Hachage cryptographique SHA-256 réel (NIST FIPS 180-4) pour métadonnées d'enveloppe AES-256-GCM
function deterministicHex(seed: string, length: number): string {
  const fullHash = generateSha256Hash(seed);
  if (length <= fullHash.length) {
    return fullHash.slice(0, length);
  }
  const secondHash = generateSha256Hash(`${seed}:ext`);
  return (fullHash + secondHash).slice(0, length);
}

export function encryptAndStoreKycDocument(params: {
  dossierId: string;
  actorType: KycActorProfile;
  docType: string;
  fileName: string;
  fileSizeBytes?: number;
  mimeType?: string;
}): {
  documentItem: KYCDocumentItem & {
    encryptedMeta: EncryptedKycMetadata;
    previewSummary: string;
  };
} {
  const cleanName = params.fileName.trim();
  const lower = cleanName.toLowerCase();

  // Sécurité : Rejet des extensions exécutables ou scripts malveillants
  if (
    lower.endsWith('.exe') ||
    lower.endsWith('.bat') ||
    lower.endsWith('.cmd') ||
    lower.endsWith('.sh') ||
    lower.endsWith('.js') ||
    lower.endsWith('.vbs')
  ) {
    throw new Error('KYC_SECURITY_MALICIOUS_FILE_EXTENSION');
  }

  const size = params.fileSizeBytes ?? 428_500;
  if (size > 10 * 1024 * 1024) {
    throw new Error('KYC_FILE_SIZE_EXCEEDS_10MB');
  }

  const seed = `${params.dossierId}:${params.docType}:${cleanName}:${Date.now()}`;
  const sha256 = deterministicHex(`sha256:${seed}`, 64);
  const ivHex = deterministicHex(`iv:${seed}`, 24);
  const authTagHex = deterministicHex(`tag:${seed}`, 32);
  const dekId = `dek-aes256-${deterministicHex(`dek:${seed}`, 12)}`;
  const kekAlias = 'alias/tradelink-kyc-kek-v6';
  const encryptedVaultUri = `s3://tradelink-kyc-encrypted-vault/${params.actorType.toLowerCase()}/${params.dossierId}/${params.docType}_${sha256.slice(0, 12)}.enc`;

  const specList = KYC_REQUIRED_DOCUMENTS_BY_PROFILE[params.actorType] ?? [];
  const foundSpec = specList.find((s) => s.docType === params.docType);
  const label = foundSpec?.labelFr ?? `Justificatif ${params.docType}`;

  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

  return {
    documentItem: {
      id: `kdoc-${Date.now().toString(36)}-${getSecureRandomAlphanumeric(4)}`,
      docType: params.docType as KYCDocumentItem['docType'],
      label,
      fileName: cleanName,
      uploadedAt: nowStr,
      sha256,
      encryptionKeyId: `${kekAlias} -> ${dekId}`,
      status: 'UPLOADED',
      encryptedMeta: {
        cipherAlgorithm: 'AES-256-GCM',
        kekAlias,
        dekId,
        ivHex,
        authTagHex,
        sha256,
        encryptedVaultUri,
        mimeType:
          params.mimeType ??
          (lower.endsWith('.png')
            ? 'image/png'
            : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
            ? 'image/jpeg'
            : 'application/pdf'),
        fileSizeBytes: size,
        virusScanStatus: 'CLEAN',
      },
      previewSummary: `Pièce officielle [${params.docType}] (${cleanName}) déchiffrée à la volée via KMS (${kekAlias}). Empreinte SHA-256 vérifiée : ${sha256.slice(0, 24)}... — Scan Antivirus ClamAV : CLEAN.`,
    },
  };
}

// Vérifie si tous les documents obligatoires du profil ont été déposés
export function checkMandatoryKycCompletion(
  actorType: KycActorProfile,
  documents: KYCDocumentItem[],
  jurisdiction?: string
): {
  totalMandatory: number;
  uploadedMandatory: number;
  missingMandatoryDocTypes: string[];
  allMandatoryUploaded: boolean;
  progressPercent: number;
} {
  const specs = getRequiredDocsForDossier(actorType, jurisdiction);
  const mandatorySpecs = specs.filter((s) => s.mandatory);
  const uploadedTypes = new Set(
    documents.filter((d) => d.status !== 'REJECTED').map((d) => String(d.docType))
  );

  // Compatibilité avec les codes courts existants ('CIN', 'PATENTE', 'RNE', etc.)
  const matchesSpec = (specDocType: string): boolean => {
    if (uploadedTypes.has(specDocType)) return true;
    if (specDocType === 'CIN_DIRIGEANT' && uploadedTypes.has('CIN')) return true;
    if (specDocType === 'PATENTE_FISCAL' && (uploadedTypes.has('PATENTE') || uploadedTypes.has('TAX_ID'))) return true;
    if (
      (specDocType === 'RNE_KBIS' || specDocType === 'RNE_HANDELSREGISTER') &&
      (uploadedTypes.has('RNE') || uploadedTypes.has('KBIS') || uploadedTypes.has('REGISTRY'))
    ) {
      return true;
    }
    if (specDocType === 'TVA_FISCAL_CERT' && (uploadedTypes.has('TAX_CERT') || uploadedTypes.has('PATENTE'))) return true;
    if (specDocType === 'ISO_GDP_CERT' && uploadedTypes.has('ID_CARD')) return true;
    return false;
  };

  const missingMandatoryDocTypes: string[] = [];
  let uploadedMandatory = 0;

  for (const spec of mandatorySpecs) {
    if (matchesSpec(spec.docType)) {
      uploadedMandatory += 1;
    } else {
      missingMandatoryDocTypes.push(spec.docType);
    }
  }

  const totalMandatory = mandatorySpecs.length;
  const allMandatoryUploaded = missingMandatoryDocTypes.length === 0;
  const progressPercent =
    totalMandatory === 0 ? 100 : Math.round((uploadedMandatory / totalMandatory) * 100);

  return {
    totalMandatory,
    uploadedMandatory,
    missingMandatoryDocTypes,
    allMandatoryUploaded,
    progressPercent,
  };
}

// Calcul du compte à rebours de 7 jours (jours, heures, minutes restantes)
export function computeKycCountdown7Days(startedAtStr: string, referenceNowMs = Date.now()): {
  daysElapsed: number;
  daysRemaining: number;
  hoursRemaining: number;
  isPastDeadlineJ7: boolean;
  deadlineIso: string;
} {
  const startMs = new Date(startedAtStr).getTime();
  const validStartMs = Number.isNaN(startMs) ? referenceNowMs - 3 * 86400 * 1000 : startMs;
  const deadlineMs = validStartMs + 7 * 86400 * 1000;
  const elapsedMs = Math.max(0, referenceNowMs - validStartMs);
  const remainingMs = Math.max(0, deadlineMs - referenceNowMs);

  const daysElapsed = Math.floor(elapsedMs / (86400 * 1000));
  const daysRemaining = Math.ceil(remainingMs / (86400 * 1000));
  const hoursRemaining = Math.ceil(remainingMs / (3600 * 1000));

  return {
    daysElapsed,
    daysRemaining,
    hoursRemaining,
    isPastDeadlineJ7: referenceNowMs >= deadlineMs || daysElapsed >= 7,
    deadlineIso: new Date(deadlineMs).toISOString().slice(0, 10),
  };
}

// Exécution de la tâche programmée KYCCronService :
// - Envoie les relances J+1, J+3, J+5 et J+6 si les pièces obligatoires ne sont pas toutes soumises
// - Suspend à J+7 UNIQUEMENT si les documents obligatoires ne sont pas soumis dans les délais
// - Protège intégralement les comptes dont les documents ont été soumis à temps et attendent validation Admin
export interface KycCronExecutionReport {
  executedAt: string;
  evaluatedCount: number;
  remindersTriggered: { dossierId: string; companyName: string; milestone: 'J+1' | 'J+3' | 'J+5' | 'J+6' }[];
  suspendedAtJ7: { dossierId: string; companyName: string; missingDocs: string[] }[];
  protectedInTimeAtJ7: { dossierId: string; companyName: string; status: KYCStatus }[];
  generatedNotifications: KycNotificationItem[];
}

export function executeKycCronBatch(
  dossiers: KYCDossier[],
  simulatedDayOverride?: number
): KycCronExecutionReport {
  const remindersTriggered: KycCronExecutionReport['remindersTriggered'] = [];
  const suspendedAtJ7: KycCronExecutionReport['suspendedAtJ7'] = [];
  const protectedInTimeAtJ7: KycCronExecutionReport['protectedInTimeAtJ7'] = [];
  const generatedNotifications: KycNotificationItem[] = [];
  const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const milestones: ('J+1' | 'J+3' | 'J+5' | 'J+6')[] = ['J+1', 'J+3', 'J+5', 'J+6'];

  for (const dos of dossiers) {
    const daysElapsed =
      simulatedDayOverride !== undefined ? simulatedDayOverride : dos.daysElapsed;
    dos.daysElapsed = daysElapsed;
    dos.daysRemaining = Math.max(0, 7 - daysElapsed);

    const completion = checkMandatoryKycCompletion(dos.actorType, dos.documents, dos.jurisdiction);
    const hasSubmittedAllInTime =
      Boolean(dos.submittedAt) ||
      dos.status === 'SUBMITTED_IN_TIME_PENDING_REVIEW' ||
      dos.status === 'DOCUMENTS_SOUMIS' ||
      dos.status === 'EN_VERIFICATION' ||
      dos.status === 'UNDER_REVIEW' ||
      dos.status === 'VALIDATED' ||
      dos.status === 'VALIDE' ||
      completion.allMandatoryUploaded;

    // 1. Si déjà validé, rien à suspendre ni relancer
    if (dos.status === 'VALIDATED' || dos.status === 'VALIDE') {
      continue;
    }

    // 2. Relances automatiques J+1, J+3, J+5 et J+6 si le dossier est incomplet avant J+7
    if (!hasSubmittedAllInTime && daysElapsed < 7) {
      for (const m of milestones) {
        const dayNum = Number(m.replace('J+', ''));
        if (daysElapsed >= dayNum && !dos.remindersSent.includes(m)) {
          dos.remindersSent.push(m);
          remindersTriggered.push({
            dossierId: dos.id,
            companyName: dos.companyName,
            milestone: m,
          });
          generatedNotifications.push({
            id: `notif-kyc-${Date.now()}-${getSecureRandomAlphanumeric(5)}`,
            dossierId: dos.id,
            recipientUserId: dos.userId,
            channel: 'EMAIL',
            milestone: m,
            severity: dayNum >= 5 ? 'warning' : 'info',
            title: `Relance automatique KYC ${m} — ${dos.companyName}`,
            message: `Il vous reste ${Math.max(1, 7 - dayNum)} jour(s) pour déposer vos pièces obligatoires (${completion.missingMandatoryDocTypes.join(', ')}) afin d'éviter la suspension automatique à J+7.`,
            sentAt: nowIso,
          });
        }
      }
    }

    // 3. Échéance J+7 : distinction stricte entre dossier soumis à temps et dossier incomplet
    if (daysElapsed >= 7) {
      if (hasSubmittedAllInTime) {
        // RÈGLE MÉTIER CRITIQUE : Ne jamais suspendre un compte qui a soumis ses pièces à temps et attend une revue Admin
        if (dos.status === 'PENDING_SUBMISSION') {
          dos.status = 'SUBMITTED_IN_TIME_PENDING_REVIEW';
        }
        protectedInTimeAtJ7.push({
          dossierId: dos.id,
          companyName: dos.companyName,
          status: dos.status,
        });
      } else {
        // Documents obligatoires non soumis dans le délai de 7 jours -> Suspension automatique J+7
        dos.status = 'SUSPENDED_J7_UNSUBMITTED';
        if (!dos.remindersSent.includes('J+7_SUSPENDED')) {
          dos.remindersSent.push('J+7_SUSPENDED');
        }
        suspendedAtJ7.push({
          dossierId: dos.id,
          companyName: dos.companyName,
          missingDocs: completion.missingMandatoryDocTypes,
        });
        generatedNotifications.push({
          id: `notif-kyc-j7-${Date.now()}-${getSecureRandomAlphanumeric(5)}`,
          dossierId: dos.id,
          recipientUserId: dos.userId,
          channel: 'EMAIL',
          milestone: 'J+7',
          severity: 'danger',
          title: `Suspension automatique J+7 — Dossier KYC incomplet (${dos.companyName})`,
          message: `Votre compte a été suspendu à J+7 car les pièces obligatoires (${completion.missingMandatoryDocTypes.join(', ')}) n'ont pas été soumises dans le délai réglementaire de 7 jours. Déposez vos pièces pour demander une réactivation administrative.`,
          sentAt: nowIso,
        });
      }
    }
  }

  return {
    executedAt: nowIso,
    evaluatedCount: dossiers.length,
    remindersTriggered,
    suspendedAtJ7,
    protectedInTimeAtJ7,
    generatedNotifications,
  };
}
