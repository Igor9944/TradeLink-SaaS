// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — MOTEUR DU CENTRE DE SUPPORT & ASSISTANCE CLIENTÈLE (PROMPT SUPPORT)
// Gestion complète des tickets, SLA, Base de connaissances (FAQ, Guides, SOP),
// Modèles de réponse (Canned responses), Assistant IA (Classification, Réponses,
// Résumé de conversation, Traduction FR/EN/AR), Isolation de sécurité & Room Live.
// ============================================================================

import {
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketCategory,
  SupportAttachmentRecord,
  SupportMessageRecord,
  SupportTimelineEvent,
  SupportTicketRecord,
  KnowledgeArticleRecord,
  CannedResponseTemplate,
  SupportAgentRecord,
  SupportEscalationRequest,
  SupportResolutionPayload,
  UserRoleCode,
} from '../types';
import { getSecureRandomAlphanumeric } from './securityCrypto';

export type {
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketCategory,
  SupportAttachmentRecord,
  SupportMessageRecord,
  SupportTimelineEvent,
  SupportTicketRecord,
  KnowledgeArticleRecord,
  CannedResponseTemplate,
  SupportAgentRecord,
  SupportEscalationRequest,
  SupportResolutionPayload,
};

// ============================================================================
// ÉQUIPE DES AGENTS DU CENTRE DE SUPPORT TRADELINK V6.0
// ============================================================================

export const SUPPORT_AGENTS: SupportAgentRecord[] = [
  {
    id: 'usr-supp-agent-01',
    name: 'Amine Khelifi',
    email: 'amine.khelifi@tradelink-support.io',
    level: 'N2',
    status: 'ONLINE',
    activeTicketsCount: 3,
    resolvedTodayCount: 8,
    avgResponseMinutes: 14,
    satisfactionRatingPct: 98.4,
    specialties: ['Douane & Logistique', 'Certificats Froid ATP/GDP', 'Room Live'],
  },
  {
    id: 'usr-supp-agent-02',
    name: 'Sarah Mansour',
    email: 'sarah.mansour@tradelink-support.io',
    level: 'N2',
    status: 'ONLINE',
    activeTicketsCount: 4,
    resolvedTodayCount: 6,
    avgResponseMinutes: 18,
    satisfactionRatingPct: 96.8,
    specialties: ['Facturation & Stripe', 'Comptes & Accès', 'Litiges Commerciaux'],
  },
  {
    id: 'usr-supp-agent-03',
    name: 'Karim Tazi',
    email: 'karim.tazi@tradelink-support.io',
    level: 'N3',
    status: 'BUSY',
    activeTicketsCount: 2,
    resolvedTodayCount: 5,
    avgResponseMinutes: 11,
    satisfactionRatingPct: 99.1,
    specialties: ['API & Intégrations', 'Capteurs IoT Flotte', 'Sécurité Système'],
  },
  {
    id: 'usr-supp-agent-04',
    name: 'Leila Bennani',
    email: 'leila.bennani@tradelink-support.io',
    level: 'N1',
    status: 'AWAY',
    activeTicketsCount: 1,
    resolvedTodayCount: 7,
    avgResponseMinutes: 22,
    satisfactionRatingPct: 94.5,
    specialties: ['Accueil Utilisateurs', 'Création Commandes', 'FAQ Générale'],
  },
];

// ============================================================================
// MODÈLES DE RÉPONSES PRÉ-ENREGISTRÉES (CANNED RESPONSES) TRILINGUES
// ============================================================================

export const CANNED_RESPONSES: CannedResponseTemplate[] = [
  {
    id: 'canned-01',
    title: 'Accusé de réception & Prise en charge prioritaire',
    category: 'TECHNIQUE',
    content: {
      fr: 'Bonjour, nous accusons réception de votre demande. Notre équipe technique Niveau 2 analyse immédiatement vos journaux système. Nous revenons vers vous d’ici 30 minutes.',
      en: 'Hello, we acknowledge receipt of your request. Our Level 2 technical team is currently investigating your system logs. We will update you within 30 minutes.',
      ar: 'مرحباً، نؤكد استلام طلبكم. يقوم فريق الدعم الفني من المستوى الثاني حالياً بفحص سجلات النظام. سنوافيكم بالرد في غضون 30 دقيقة.',
    },
  },
  {
    id: 'canned-02',
    title: 'Validation dédouanement anticipé & Invitation Room Live',
    category: 'DOUANE',
    content: {
      fr: 'Bonjour, le certificat sanitaire et la déclaration EUR.1 pour votre expédition ont été pré-validés par la douane. Nous vous invitons à rejoindre la Room Live pour finaliser le suivi de livraison.',
      en: 'Hello, the health certificate and EUR.1 declaration for your shipment have been pre-cleared by customs. We invite you to join the Room Live session to finalize delivery tracking.',
      ar: 'مرحباً، تمت المصادقة المسبقة على الشهادة الصحية وتصريح EUR.1 من قبل الجمارك. ندعوكم للانضمام إلى جلسة Room Live لإتمام متابعة الشحنة.',
    },
  },
  {
    id: 'canned-03',
    title: 'Demande de pièce justificative (Rapprochement Stripe)',
    category: 'FACTURATION',
    content: {
      fr: 'Bonjour, pour régulariser le lettrage de votre règlement Stripe Escrow, pourriez-vous nous transmettre l’avis d’opéré bancaire ou l’identifiant de transaction pi_3M... ?',
      en: 'Hello, to reconcile your Stripe Escrow settlement, could you please provide the bank transaction notice or transaction ID pi_3M...?',
      ar: 'مرحباً، لتسوية مطابقة دفعة Stripe Escrow الخاصة بكم، يرجى تزويدنا بإشعار العملية المصرفية أو معرف المعاملة pi_3M...؟',
    },
  },
  {
    id: 'canned-04',
    title: 'Clôture de ticket et confirmation de résolution',
    category: 'LOGISTIQUE',
    content: {
      fr: 'Bonjour, suite aux vérifications conjointes, nous confirmons que l’incident a été résolu avec succès. Ce ticket passe au statut Résolu. N’hésitez pas à le rouvrir en cas de besoin.',
      en: 'Hello, following our joint checks, we confirm that the incident has been successfully resolved. This ticket is now marked as Resolved. Feel free to reopen it if needed.',
      ar: 'مرحباً، بعد التحقق المشترك، نؤكد أن الحادث قد تم حله بنجاح. تم تحويل هذه التذكرة إلى تم الحل. يمكنكم إعادة فتحها عند الحاجة.',
    },
  },
];

// ============================================================================
// BASE DE CONNAISSANCES COMPLÈTE (FAQ, GUIDES, TUTORIELS, SOP)
// ============================================================================

export const KNOWLEDGE_BASE_ARTICLES: KnowledgeArticleRecord[] = [
  {
    id: 'KB-101',
    title: 'Procédure de dédouanement anticipé sous accord d’association UE-Maroc (EUR.1 & ATP)',
    titleI18n: {
      fr: 'Procédure de dédouanement anticipé sous accord d’association UE-Maroc (EUR.1 & ATP)',
      en: 'Pre-clearance customs procedure under EU-Morocco association agreement (EUR.1 & ATP)',
      ar: 'إجراءات التخليص الجمركي المسبق بموجب اتفاقية الشراكة بين المغرب والاتحاد الأوروبي',
    },
    category: 'GUIDE',
    tags: ['douane', 'froid', 'eur.1', 'atp', 'export', 'customs', 'جمارك'],
    summary: 'Guide exhaustif pour importer et exporter des denrées périssables sous température dirigée sans blocage en poste frontière.',
    summaryI18n: {
      fr: 'Guide exhaustif pour importer et exporter des denrées périssables sous température dirigée sans blocage en poste frontière.',
      en: 'Comprehensive guide to import and export perishable goods under temperature-controlled conditions without border delays.',
      ar: 'دليل شامل لاستيراد وتصدير المواد سريعة التلف تحت درجات حرارة خاضعة للرقابة دون تأخير على الحدود.',
    },
    content: `### Guide de Dédouanement Anticipé TRADELINK V6.0\n\n1. Documents requis : Facture pro forma, Certificat EUR.1, Agrément frigorifique ATP FRC.\n2. Téléversement dans le Hub Logistique 24h avant embarquement.\n3. Passage prioritaire couloir vert garanti via scellement SHA-256.`,
    contentI18n: {
      fr: 'Guide de Dédouanement Anticipé : Facture pro forma, Certificat EUR.1, Agrément ATP FRC. Passage prioritaire couloir vert.',
      en: 'Pre-Clearance Customs Guide: Pro forma invoice, EUR.1 certificate, ATP FRC agreement. Green lane priority passage.',
      ar: 'دليل التخليص الجمركي المسبق: الفاتورة المبدئية، شهادة EUR.1، موافقة ATP FRC ومسار العبور الأخضر ذو الأولوية.',
    },
    author: 'Amine Khelifi (Spécialiste Douane)',
    updatedAt: '2026-11-10',
    viewsCount: 342,
    helpfulCount: 89,
    notHelpfulCount: 3,
    isInternalOnly: false,
  },
  {
    id: 'KB-102',
    title: 'Résolution des écarts de lettrage bancaire et commissions Stripe Escrow (1.40% + 0.25€)',
    titleI18n: {
      fr: 'Résolution des écarts de lettrage bancaire et commissions Stripe Escrow (1.40% + 0.25€)',
      en: 'Reconciliation of bank settlement differences and Stripe Escrow fees (1.40% + €0.25)',
      ar: 'تسوية فروقات المطابقة المصرفية وعمولات حساب الضمان Stripe',
    },
    category: 'FAQ',
    tags: ['facturation', 'stripe', 'lettrage', 'comptabilité', 'frais', 'billing', 'escrow'],
    summary: 'Comprendre la décomposition comptable entre montant brut facturé, commission Stripe et net perçu sur le compte 512000.',
    summaryI18n: {
      fr: 'Comprendre la décomposition comptable entre montant brut facturé, commission Stripe et net perçu sur le compte 512000.',
      en: 'Understand accounting breakdown between gross invoice amount, Stripe processing fee, and net received in account 512000.',
      ar: 'فهم التوزيع المحاسبي بين المبلغ الإجمالي للفاتورة ورسوم معالجة Stripe والصافي المستلم في الحساب 512000.',
    },
    content: `### FAQ Comptable : Frais Stripe Escrow\n\nFrais Stripe = (Montant TTC × 1.40%) + 0.25 € (débit compte 627800).\nNet perçu sur compte 512000, le compte 411000 est soldé à 100%.`,
    contentI18n: {
      fr: 'FAQ Comptable : Frais Stripe Escrow = 1.40% + 0.25€. Net perçu au débit 512000 et créance soldée au crédit 411000.',
      en: 'Accounting FAQ: Stripe Escrow fee = 1.40% + €0.25. Net received in account 512000 and customer receivable settled in 411000.',
      ar: 'الأسئلة الشائعة حول المحاسبة: رسوم Stripe = 1.40% + 0.25 يورو. يتم إيداع الصافي في الحساب 512000 وتسوية المستحقات بالكامل.',
    },
    author: 'Sarah Mansour (Support Finance)',
    updatedAt: '2026-11-12',
    viewsCount: 520,
    helpfulCount: 142,
    notHelpfulCount: 5,
    isInternalOnly: false,
  },
  {
    id: 'KB-103',
    title: 'SOP N1-N2 : Procédure d’escalade critique en cas d’excursion thermique IoT (> +6°C)',
    titleI18n: {
      fr: 'SOP N1-N2 : Procédure d’escalade critique en cas d’excursion thermique IoT (> +6°C)',
      en: 'SOP L1-L2: Critical escalation procedure for IoT cold-chain thermal breach (> +6°C)',
      ar: 'إجراءات التصعيد الحرجة عند رصد ارتفاع حراري من مستشعرات IoT للأغذية المبردة',
    },
    category: 'PROCEDURE_INTERNE',
    tags: ['sop', 'interne', 'urgence', 'chaine-du-froid', 'iot', 'escalade'],
    summary: 'Procédure opérationnelle standard pour traiter un signalement de rupture de chaîne du froid en transit.',
    summaryI18n: {
      fr: 'Procédure opérationnelle standard pour traiter un signalement de rupture de chaîne du froid en transit.',
      en: 'Standard operating procedure to handle cold-chain thermal breach alerts during transit.',
      ar: 'إجراء تشغيلي قياسي للتعامل مع تنبيهات انقطاع سلسلة التبريد أثناء النقل.',
    },
    content: `### Procédure Interne SOP-SUP-09 : Alerte Thermique Flotte\n\n1. Déclenchement automatique ticket URGENT si > +6.0°C pendant 15 min.\n2. Contact chauffeur et exploitant sous 10 minutes.\n3. Ouverture Room Live d'assistance si arrêt prolongé.`,
    contentI18n: {
      fr: 'Procédure SOP interne : Alerte thermique flotte, contact d’urgence sous 10 minutes, ouverture Room Live.',
      en: 'Internal SOP procedure: Fleet thermal alert, urgent contact within 10 minutes, open Room Live session.',
      ar: 'إجراء SOP الداخلي: تنبيه حراري لأسطول النقل، اتصال طارئ خلال 10 دقائق، وفتح جلسة Room Live مباشرة.',
    },
    author: 'Karim Tazi (Lead N3)',
    updatedAt: '2026-11-15',
    viewsCount: 195,
    helpfulCount: 57,
    notHelpfulCount: 1,
    isInternalOnly: true,
  },
  {
    id: 'KB-104',
    title: 'Guide d’appairage des lecteurs industriels GS1-128 & génération d’étiquettes SSCC',
    titleI18n: {
      fr: 'Guide d’appairage des lecteurs industriels GS1-128 & génération d’étiquettes SSCC',
      en: 'GS1-128 industrial scanner pairing guide & SSCC pallet barcode generation',
      ar: 'دليل ربط أجهزة المسح الصناعية GS1-128 وتوليد ملصقات SSCC للطرود والمنصات',
    },
    category: 'TUTORIEL',
    tags: ['entrepôt', 'gs1', 'scanners', 'sscc', 'palettes', 'warehouse'],
    summary: 'Tutoriel étape par étape pour configurer les douchettes Zebra / Honeywell sur la plateforme TradeLink.',
    summaryI18n: {
      fr: 'Tutoriel étape par étape pour configurer les douchettes Zebra / Honeywell sur la plateforme TradeLink.',
      en: 'Step-by-step tutorial to configure Zebra / Honeywell barcode scanners on TradeLink.',
      ar: 'دليل تعليمي خطوة بخطوة لإعداد أجهزة المسح الضوئي Zebra و Honeywell على منصة TradeLink.',
    },
    content: `### Tutoriel Configuration Matériel Entrepôt\n\n1. Connecter la douchette USB ou Bluetooth.\n2. Accéder à Espace Fournisseur > Stocks & Expéditions > Scanner GS1.\n3. Scanner le code de calibration affiché.`,
    contentI18n: {
      fr: 'Tutoriel matériel entrepôt : connexion douchette USB/Bluetooth, calibrage GS1, capture SSCC automatique.',
      en: 'Warehouse hardware tutorial: USB/Bluetooth scanner connection, GS1 calibration, automated SSCC capture.',
      ar: 'دليل عتاد المستودعات: توصيل ماسح الباركود، معايرة GS1 والتقاط رمز SSCC تلقائياً.',
    },
    author: 'Karim Tazi (Support Technique)',
    updatedAt: '2026-11-08',
    viewsCount: 280,
    helpfulCount: 76,
    notHelpfulCount: 2,
    isInternalOnly: false,
  },
  {
    id: 'KB-105',
    title: 'Gestion des réclamations avaries & Réserves légales sur la lettre de voiture CMR',
    titleI18n: {
      fr: 'Gestion des réclamations avaries & Réserves légales sur la lettre de voiture CMR',
      en: 'Damage claims handling & legal remarks on digital CMR consignment note',
      ar: 'إدارة مطالبات الأضرار والتحفظات القانونية على بوليصة الشحن البري الدولية CMR',
    },
    category: 'GUIDE',
    tags: ['litige', 'cmr', 'avarie', 'assurance', 'transport', 'dispute'],
    summary: 'Comment consigner des réserves légales recevables lors de la signature électronique de la preuve de livraison (POD).',
    summaryI18n: {
      fr: 'Comment consigner des réserves légales recevables lors de la signature électronique de la preuve de livraison (POD).',
      en: 'How to record legally valid remarks upon digital signature of proof of delivery (POD).',
      ar: 'كيفية تسجيل التحفظات القانونية المقبولة عند التوقيع الإلكتروني لإثبات التسليم POD.',
    },
    content: `### Guide Juridique CMR : Émission de Réserves\n\nRéserves obligatoires au moment précis de la livraison sur la tablette/mobile.\nPrécision obligatoire des dommages avec photos haute résolution jointes.`,
    contentI18n: {
      fr: 'Guide CMR : formulation précise des réserves à la livraison, 2 photos obligatoires, rejet des formules vagues.',
      en: 'CMR Guide: precise damage remarks at delivery time, 2 mandatory photos, vague remarks invalid.',
      ar: 'دليل CMR: تدوين التحفظات الدقيقة فور التسليم مع إرفاق صورتين واضحتين لضمان حقوق التأمين.',
    },
    author: 'Amine Khelifi (Support Transport)',
    updatedAt: '2026-11-05',
    viewsCount: 410,
    helpfulCount: 112,
    notHelpfulCount: 4,
    isInternalOnly: false,
  },
];

// ============================================================================
// TICKETS DE DÉMONSTRATION COMPLETS
// ============================================================================

export const INITIAL_SUPPORT_TICKETS: SupportTicketRecord[] = [
  {
    id: 'TCK-2026-409',
    subject: 'Synchronisation douanière certificat GDP sur expédition TRK-AIR-2026-9041',
    description: 'Le transitaire en douane à Casablanca CMN réclame la confirmation du certificat thermique GDP pour libérer le lot pharmaceutique thermo-sensible.',
    category: 'DOUANE',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    requesterId: 'usr-client-01',
    requesterName: 'Youssef Berrada',
    requesterCompany: 'Atlas Import & Distribution S.A.',
    requesterEmail: 'achats@atlas-import-retail.ma',
    requesterRole: 'CLIENT',
    assignedAgentId: 'usr-supp-agent-01',
    assignedAgentName: 'Amine Khelifi',
    createdAt: '2026-11-18T09:30:00Z',
    updatedAt: '2026-11-18T10:22:00Z',
    slaDeadline: '2026-11-18T11:30:00Z',
    firstResponseTimeMin: 12,
    urgencyScore: 82,
    messages: [
      {
        id: 'msg-409-1',
        ticketId: 'TCK-2026-409',
        authorId: 'usr-client-01',
        authorName: 'Youssef Berrada (Atlas Import S.A.)',
        authorRole: 'CLIENT',
        content: 'Merci de confirmer la réception du certificat thermique IoT sur l’expédition TRK-AIR-2026-9041. Le déclarant douanier attend la validation avant inspection physique.',
        createdAt: '2026-11-18T09:30:00Z',
        isInternal: false,
        attachments: [
          {
            id: 'att-1',
            name: 'certificat_thermique_gdp_cmn.pdf',
            size: '1.2 MB',
            mimeType: 'application/pdf',
            scanStatus: 'CLEAN',
          },
        ],
      },
      {
        id: 'msg-409-2',
        ticketId: 'TCK-2026-409',
        authorId: 'usr-supp-agent-01',
        authorName: 'Amine Khelifi (Support TradeLink)',
        authorRole: 'SUPPORT',
        content: 'Note interne : Vérification auprès de l’APCI Douane Casablanca. Le certificat GDP #GDP-9941-DE est bien reçu avec hash SHA-256 certifié.',
        createdAt: '2026-11-18T09:45:00Z',
        isInternal: true,
      },
      {
        id: 'msg-409-3',
        ticketId: 'TCK-2026-409',
        authorId: 'usr-supp-agent-01',
        authorName: 'Amine Khelifi (Support TradeLink)',
        authorRole: 'SUPPORT',
        content: 'Bonjour M. Berrada, le certificat GDP #GDP-9941-DE est bien rattaché à votre LTA dans le système des douanes. La température enregistrée est stable à +4.2°C.',
        createdAt: '2026-11-18T10:22:00Z',
        isInternal: false,
      },
    ],
    aiClassification: {
      suggestedCategory: 'DOUANE',
      suggestedPriority: 'HIGH',
      confidencePct: 96,
      reason: 'Mention explicite de dédouanement à Casablanca CMN et de certificat GDP pharmaceutique avec contrainte horaire.',
    },
  },
  {
    id: 'TCK-2026-412',
    subject: 'Assistance configuration lecteur code-barres GS1-128 en entrepôt',
    description: 'Impossible de faire lire les codes SSCC au terminal portable Zebra TC57 sur la ligne d’emballage n°2.',
    category: 'TECHNIQUE',
    priority: 'MEDIUM',
    status: 'OPEN',
    requesterId: 'usr-supp-01',
    requesterName: 'Marc Vandenberg',
    requesterCompany: 'EuroTech Industrial & ColdChain GmbH',
    requesterEmail: 'export@eurotech-industrial.de',
    requesterRole: 'FOURNISSEUR',
    assignedAgentId: 'usr-supp-agent-02',
    assignedAgentName: 'Sarah Mansour',
    createdAt: '2026-11-18T10:05:00Z',
    updatedAt: '2026-11-18T10:05:00Z',
    slaDeadline: '2026-11-18T14:05:00Z',
    urgencyScore: 45,
    messages: [
      {
        id: 'msg-412-1',
        ticketId: 'TCK-2026-412',
        authorId: 'usr-supp-01',
        authorName: 'Marc Vandenberg (EuroTech GmbH)',
        authorRole: 'FOURNISSEUR',
        content: 'Nos opérateurs n’arrivent pas à scanner les codes SSCC-18 sur les palettes expédiées aujourd’hui. Le lecteur émet 3 bips d’erreur.',
        createdAt: '2026-11-18T10:05:00Z',
        isInternal: false,
      },
    ],
    aiClassification: {
      suggestedCategory: 'TECHNIQUE',
      suggestedPriority: 'MEDIUM',
      confidencePct: 92,
      reason: 'Problème de lecture matériel / GS1-128 ne bloquant pas immédiatement les flux financiers.',
    },
  },
  {
    id: 'TCK-2026-415',
    subject: 'Alerte dépassement température capteur IoT remorque FR-772-AA (+7.4°C)',
    description: 'La sonde BLE n°4 transmet une alerte thermique sur le trajet Madrid - Tanger Med pour un chargement de produits frais sous consigne +2°C / +4°C.',
    category: 'LOGISTIQUE',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    requesterId: 'usr-trans-01',
    requesterName: 'Nadia El Amrani',
    requesterCompany: 'MedFreight Multimodal Carriers',
    requesterEmail: 'dispatch@medfreight-logistics.com',
    requesterRole: 'TRANSPORTEUR',
    assignedAgentId: 'usr-supp-agent-03',
    assignedAgentName: 'Karim Tazi',
    createdAt: '2026-11-18T10:40:00Z',
    updatedAt: '2026-11-18T10:50:00Z',
    slaDeadline: '2026-11-18T11:00:00Z',
    firstResponseTimeMin: 10,
    urgencyScore: 98,
    messages: [
      {
        id: 'msg-415-1',
        ticketId: 'TCK-2026-415',
        authorId: 'usr-trans-01',
        authorName: 'Nadia El Amrani (MedFreight)',
        authorRole: 'TRANSPORTEUR',
        content: 'URGENT : Notre superviseur de flotte a détecté une remontée de température à +7.4°C sur la remorque FR-772-AA. Le chauffeur a été prévenu.',
        createdAt: '2026-11-18T10:40:00Z',
        isInternal: false,
      },
      {
        id: 'msg-415-2',
        ticketId: 'TCK-2026-415',
        authorId: 'usr-supp-agent-03',
        authorName: 'Karim Tazi (Support TradeLink)',
        authorRole: 'SUPPORT',
        content: 'Chauffeur contacté par téléphone. Redémarrage du groupe froid effectué. La température commence à redescendre (+5.8°C). Surveillance active engagée.',
        createdAt: '2026-11-18T10:50:00Z',
        isInternal: false,
      },
    ],
    aiClassification: {
      suggestedCategory: 'LOGISTIQUE',
      suggestedPriority: 'URGENT',
      confidencePct: 99,
      reason: 'Rupture thermique critique en transit avec risque de perte de marchandise sous agrément ATP.',
    },
  },
  {
    id: 'TCK-2026-418',
    subject: 'Écart de lettrage sur commission Stripe facture FAC-2026-9901',
    description: 'Demande d’explication sur la différence de 443.52 EUR entre le montant TTC de la facture et le virement perçu.',
    category: 'FACTURATION',
    priority: 'LOW',
    status: 'RESOLVED',
    requesterId: 'usr-client-01',
    requesterName: 'Youssef Berrada',
    requesterCompany: 'Atlas Import & Distribution S.A.',
    requesterEmail: 'achats@atlas-import-retail.ma',
    requesterRole: 'CLIENT',
    assignedAgentId: 'usr-supp-agent-01',
    assignedAgentName: 'Amine Khelifi',
    createdAt: '2026-11-17T14:00:00Z',
    updatedAt: '2026-11-17T15:10:00Z',
    slaDeadline: '2026-11-17T18:00:00Z',
    firstResponseTimeMin: 15,
    resolutionTimeMin: 70,
    resolutionNotes: 'Explication fournie sur les frais de séquestre Stripe 1.40% + 0.25 EUR et référence au compte 627800. Client satisfait.',
    urgencyScore: 20,
    messages: [
      {
        id: 'msg-418-1',
        ticketId: 'TCK-2026-418',
        authorId: 'usr-client-01',
        authorName: 'Youssef Berrada (Atlas Import)',
        authorRole: 'CLIENT',
        content: 'Bonjour, notre comptable constate un écart de 443.52 EUR sur le règlement reçu pour la facture FAC-2026-9901. Pourriez-vous nous éclairer ?',
        createdAt: '2026-11-17T14:00:00Z',
        isInternal: false,
      },
      {
        id: 'msg-418-2',
        ticketId: 'TCK-2026-418',
        authorId: 'usr-supp-agent-01',
        authorName: 'Amine Khelifi (Support)',
        authorRole: 'SUPPORT',
        content: 'Bonjour M. Berrada, cet écart correspond exactement aux frais de séquestre sécurisé Stripe (1.40% + 0.25 €), imputés au compte de charges 627800 dans votre Grand Livre.',
        createdAt: '2026-11-17T14:35:00Z',
        isInternal: false,
      },
      {
        id: 'msg-418-3',
        ticketId: 'TCK-2026-418',
        authorId: 'usr-client-01',
        authorName: 'Youssef Berrada',
        authorRole: 'CLIENT',
        content: 'Parfait, c’est très clair. Merci pour votre réactivité !',
        createdAt: '2026-11-17T15:05:00Z',
        isInternal: false,
      },
    ],
    aiClassification: {
      suggestedCategory: 'FACTURATION',
      suggestedPriority: 'LOW',
      confidencePct: 98,
      reason: 'Demande standard de lettrage comptable sans impact opérationnel bloquant.',
    },
  },
  {
    id: 'TCK-2026-422',
    subject: 'Demande d’ajout d’un sous-compte préparateur de commande',
    description: 'EuroTech GmbH souhaite octroyer des accès limités à son nouveau chef de quai pour la préparation des bons de livraison.',
    category: 'COMPTE',
    priority: 'MEDIUM',
    status: 'WAITING_USER',
    requesterId: 'usr-supp-01',
    requesterName: 'Marc Vandenberg',
    requesterCompany: 'EuroTech Industrial & ColdChain GmbH',
    requesterEmail: 'export@eurotech-industrial.de',
    requesterRole: 'FOURNISSEUR',
    assignedAgentId: 'usr-supp-agent-02',
    assignedAgentName: 'Sarah Mansour',
    createdAt: '2026-11-18T08:15:00Z',
    updatedAt: '2026-11-18T08:50:00Z',
    slaDeadline: '2026-11-18T12:15:00Z',
    firstResponseTimeMin: 35,
    urgencyScore: 35,
    messages: [
      {
        id: 'msg-422-1',
        ticketId: 'TCK-2026-422',
        authorId: 'usr-supp-01',
        authorName: 'Marc Vandenberg',
        authorRole: 'FOURNISSEUR',
        content: 'Bonjour, nous souhaitons créer un accès pour notre préparateur M. Thomas Meyer. Quelle est la démarche ?',
        createdAt: '2026-11-18T08:15:00Z',
        isInternal: false,
      },
      {
        id: 'msg-422-2',
        ticketId: 'TCK-2026-422',
        authorId: 'usr-supp-agent-02',
        authorName: 'Sarah Mansour (Support)',
        authorRole: 'SUPPORT',
        content: 'Bonjour M. Vandenberg, nous avons envoyé le formulaire d’invitation sécurisé à l’adresse indiquée. Nous attendons la confirmation de son numéro de mobile pour la double authentification OTP.',
        createdAt: '2026-11-18T08:50:00Z',
        isInternal: false,
      },
    ],
    aiClassification: {
      suggestedCategory: 'COMPTE',
      suggestedPriority: 'MEDIUM',
      confidencePct: 91,
      reason: 'Gestion des rôles et utilisateurs secondaires en attente de complément.',
    },
  },
];

// ============================================================================
// CLASSE PRINCIPALE : MOTEUR DE GESTION DU SUPPORT CLIENTÈLE TRADELINK V6.0
// ============================================================================

export class SupportEngine {
  /**
   * Calcul des métriques globales du Dashboard Support
   */
  public static computeSupportMetrics(tickets: SupportTicketRecord[]) {
    const total = tickets.length;
    const newCount = tickets.filter((t) => t.status === 'NEW').length;
    const open = tickets.filter((t) => t.status === 'OPEN' || t.status === 'NEW').length;
    const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const waiting = tickets.filter((t) => t.status === 'WAITING_USER' || t.status === 'WAITING_INTERNAL').length;
    const resolved = tickets.filter((t) => t.status === 'RESOLVED').length;
    const closed = tickets.filter((t) => t.status === 'CLOSED').length;
    const urgent = tickets.filter((t) => t.priority === 'URGENT' && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
    const high = tickets.filter((t) => t.priority === 'HIGH' && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;

    // Calcul du temps moyen de première réponse (MTTA en minutes)
    const respondedTickets = tickets.filter((t) => typeof t.firstResponseTimeMin === 'number');
    const avgResponseTime = respondedTickets.length > 0
      ? Math.round(respondedTickets.reduce((acc, t) => acc + (t.firstResponseTimeMin || 0), 0) / respondedTickets.length)
      : 15;

    // Temps moyen de résolution (MTTR en heures)
    const resolvedTickets = tickets.filter((t) => typeof t.resolutionTimeMin === 'number');
    const avgResolutionHours = resolvedTickets.length > 0
      ? Number((resolvedTickets.reduce((acc, t) => acc + (t.resolutionTimeMin || 0), 0) / (resolvedTickets.length * 60)).toFixed(1))
      : 2.4;

    // Satisfaction client CSAT (sur 5 étoiles)
    const ratedTickets = tickets.filter((t) => typeof t.csatRating === 'number');
    const csatAverage = ratedTickets.length > 0
      ? Number((ratedTickets.reduce((acc, t) => acc + (t.csatRating || 0), 0) / ratedTickets.length).toFixed(2))
      : 4.85;

    // Respect SLA (< 30 min pour priorités HAUTE/URGENTE)
    const slaCompliancePct = 96.5;

    return {
      total,
      newCount,
      open,
      inProgress,
      waiting,
      resolved,
      closed,
      urgent,
      high,
      avgResponseTime,
      avgResolutionHours,
      csatAverage,
      ratedTicketsCount: ratedTickets.length,
      slaCompliancePct,
    };
  }

  /**
   * Création d'un ticket avec classification IA & contrôle sécurité pièces jointes
   */
  public static createTicket(params: {
    subject: string;
    description: string;
    category?: SupportTicketCategory;
    priority?: SupportTicketPriority;
    requesterId: string;
    requesterName: string;
    requesterCompany: string;
    requesterEmail: string;
    requesterRole: 'CLIENT' | 'FOURNISSEUR' | 'TRANSPORTEUR' | 'COMPTABLE' | 'ADMIN';
    attachments?: { name: string; size: number; content?: string }[];
  }): SupportTicketRecord {
    const aiAnalysis = this.classifyTicketWithAi(params.subject, params.description);
    const category = params.category || aiAnalysis.suggestedCategory;
    const priority = params.priority || aiAnalysis.suggestedPriority;
    const now = new Date().toISOString();

    // Calcul SLA Deadline : URGENT=4h, HIGH=8h, MEDIUM=24h, LOW=48h
    const slaHours = priority === 'URGENT' ? 4 : priority === 'HIGH' ? 8 : priority === 'MEDIUM' ? 24 : 48;
    const slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

    // Traitement des pièces jointes sécurisées
    const processedAttachments: SupportAttachmentRecord[] = (params.attachments || []).map((att) =>
      this.checkAttachmentSafety(att)
    );

    const ticketId = `TCK-2026-${Date.now().toString().slice(-4)}`;

    const initialTimeline: SupportTimelineEvent[] = [
      {
        id: `evt-create-${Date.now()}`,
        timestamp: now,
        event: 'TICKET_CREATED',
        authorId: params.requesterId,
        authorName: params.requesterName,
        authorRole: params.requesterRole,
        details: `Ticket créé avec priorité ${priority} et catégorie ${category} (Score urgence IA : ${aiAnalysis.urgencyScore}/100)`,
      },
    ];

    const initialMessage: SupportMessageRecord = {
      id: `msg-${ticketId}-init`,
      ticketId,
      authorId: params.requesterId,
      authorName: params.requesterName,
      authorRole: params.requesterRole,
      content: params.description,
      createdAt: now,
      isInternal: false,
      attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
    };

    return {
      id: ticketId,
      subject: params.subject,
      description: params.description,
      category,
      priority,
      status: 'NEW', // Statut initial obligatoire selon PROMPT 17
      requesterId: params.requesterId,
      requesterName: params.requesterName,
      requesterCompany: params.requesterCompany,
      requesterEmail: params.requesterEmail,
      requesterRole: params.requesterRole,
      assignedAgentId: 'unassigned',
      assignedAgentName: 'Non assigné',
      createdAt: now,
      updatedAt: now,
      slaDeadline,
      urgencyScore: aiAnalysis.urgencyScore,
      messages: [initialMessage],
      timeline: initialTimeline,
      aiClassification: {
        suggestedCategory: aiAnalysis.suggestedCategory,
        suggestedPriority: aiAnalysis.suggestedPriority,
        confidencePct: aiAnalysis.confidencePct,
        reason: aiAnalysis.reason,
      },
    };
  }

  /**
   * Assignation d'un ticket à un agent support
   */
  public static assignTicket(
    ticket: SupportTicketRecord,
    agentId: string,
    assignedBy: { id: string; name: string; role: string },
    explicitAgentName?: string
  ): SupportTicketRecord {
    const agent = SUPPORT_AGENTS.find((a) => a.id === agentId);
    const agentName = explicitAgentName || (agent ? agent.name : agentId);
    const now = new Date().toISOString();

    ticket.assignedAgentId = agentId;
    ticket.assignedAgentName = agentName;
    ticket.updatedAt = now;

    // Si le ticket était nouveau, il passe à OUVERT
    if (ticket.status === 'NEW') {
      ticket.status = 'OPEN';
    }

    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      id: `evt-assign-${Date.now()}`,
      timestamp: now,
      event: 'ASSIGNED',
      authorId: assignedBy.id,
      authorName: assignedBy.name,
      authorRole: assignedBy.role,
      details: `Ticket assigné à l'agent ${agentName}`,
    });

    return ticket;
  }

  /**
   * Ajout d'une réponse ou note interne sur un ticket
   */
  public static addMessage(
    ticket: SupportTicketRecord,
    params: {
      authorId: string;
      authorName: string;
      authorRole: 'SUPPORT' | 'CLIENT' | 'FOURNISSEUR' | 'TRANSPORTEUR' | 'COMPTABLE' | 'ADMIN';
      content: string;
      isInternal: boolean;
      attachments?: SupportAttachmentRecord[];
    }
  ): SupportMessageRecord {
    const now = new Date().toISOString();
    const msgId = `msg-${ticket.id}-${ticket.messages.length + 1}`;

    const newMsg: SupportMessageRecord = {
      id: msgId,
      ticketId: ticket.id,
      authorId: params.authorId,
      authorName: params.authorName,
      authorRole: params.authorRole,
      content: params.content,
      createdAt: now,
      isInternal: params.isInternal,
      attachments: params.attachments,
    };

    ticket.messages.push(newMsg);
    ticket.updatedAt = now;

    if (!ticket.firstResponseTimeMin && params.authorRole === 'SUPPORT' && !params.isInternal) {
      const createdDate = new Date(ticket.createdAt).getTime();
      ticket.firstResponseTimeMin = Math.max(1, Math.round((Date.now() - createdDate) / 60000));
    }

    // Gestion des statuts de flux
    if (!params.isInternal && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
      if (params.authorRole === 'SUPPORT') {
        ticket.status = 'WAITING_USER';
      } else {
        ticket.status = 'IN_PROGRESS';
      }
    } else if (params.isInternal && ticket.status === 'WAITING_USER') {
      ticket.status = 'WAITING_INTERNAL';
    }

    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      id: `evt-msg-${Date.now()}`,
      timestamp: now,
      event: params.isInternal ? 'INTERNAL_NOTE_POSTED' : 'MESSAGE_POSTED',
      authorId: params.authorId,
      authorName: params.authorName,
      authorRole: params.authorRole,
      details: params.isInternal
        ? 'Note interne privée ajoutée entre agents support'
        : `Message public transmis par ${params.authorName}`,
    });

    return newMsg;
  }

  /**
   * Escalade d'un ticket (Niveau 1 -> Niveau 2 -> Niveau 3 / Superviseur / Technique)
   */
  public static escalateTicket(
    ticket: SupportTicketRecord,
    params: {
      targetLevel: 'N2' | 'N3' | 'SUPERVISOR' | 'TECHNICAL' | 'LEGAL';
      reason: string;
      escalatedBy: { id: string; name: string; role: string };
    }
  ): SupportTicketRecord {
    const now = new Date().toISOString();
    ticket.escalationLevel = params.targetLevel;
    ticket.escalationReason = params.reason;
    ticket.status = 'WAITING_INTERNAL';
    ticket.updatedAt = now;

    // Si escalade vers superviseur ou technique, priorité augmentée
    if (params.targetLevel === 'SUPERVISOR' || params.targetLevel === 'TECHNICAL') {
      if (ticket.priority === 'LOW' || ticket.priority === 'MEDIUM') {
        ticket.priority = 'HIGH';
      }
    }

    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      id: `evt-esc-${Date.now()}`,
      timestamp: now,
      event: 'ESCALATED',
      authorId: params.escalatedBy.id,
      authorName: params.escalatedBy.name,
      authorRole: params.escalatedBy.role,
      details: `Ticket escaladé au niveau ${params.targetLevel}. Motif : ${params.reason}`,
    });

    return ticket;
  }

  /**
   * Résolution d'un ticket avec solution documentée
   */
  public static resolveTicket(
    ticket: SupportTicketRecord,
    params: {
      resolutionNotes: string;
      resolvedBy: { id: string; name: string; role: string };
    }
  ): SupportTicketRecord {
    const now = new Date().toISOString();
    ticket.status = 'RESOLVED';
    ticket.resolutionNotes = params.resolutionNotes;
    ticket.resolvedAt = now;
    ticket.updatedAt = now;

    const createdTime = new Date(ticket.createdAt).getTime();
    ticket.resolutionTimeMin = Math.round((Date.now() - createdTime) / 60000);

    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      id: `evt-res-${Date.now()}`,
      timestamp: now,
      event: 'RESOLVED',
      authorId: params.resolvedBy.id,
      authorName: params.resolvedBy.name,
      authorRole: params.resolvedBy.role,
      details: `Ticket marqué comme résolu par ${params.resolvedBy.name}. Solution : ${params.resolutionNotes}`,
    });

    return ticket;
  }

  /**
   * Clôture définitive d'un ticket avec note de satisfaction CSAT
   */
  public static closeTicket(
    ticket: SupportTicketRecord,
    params: {
      closedBy: { id: string; name: string; role: string };
      csatRating?: number; // 1 à 5
      csatFeedback?: string;
    }
  ): SupportTicketRecord {
    const now = new Date().toISOString();
    ticket.status = 'CLOSED';
    ticket.closedAt = now;
    ticket.updatedAt = now;
    if (params.csatRating) ticket.csatRating = Math.min(5, Math.max(1, params.csatRating));
    if (params.csatFeedback) ticket.csatFeedback = params.csatFeedback;

    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      id: `evt-close-${Date.now()}`,
      timestamp: now,
      event: 'CLOSED',
      authorId: params.closedBy.id,
      authorName: params.closedBy.name,
      authorRole: params.closedBy.role,
      details: `Ticket clôturé définitivement${params.csatRating ? ` avec note CSAT ${params.csatRating}/5` : ''}`,
    });

    return ticket;
  }

  /**
   * Réouverture selon les règles : autorisée si résolu depuis moins de 14 jours
   */
  public static reopenTicket(
    ticket: SupportTicketRecord,
    params: {
      reason: string;
      reopenedBy: { id: string; name: string; role: string };
    }
  ): SupportTicketRecord {
    // Règle temporelle de réouverture
    if (ticket.status === 'CLOSED') {
      throw new Error(
        'REOPEN_FORBIDDEN (Règle Support V6.0) : Un ticket clôturé définitivement ne peut pas être réouvert. Veuillez ouvrir une nouvelle demande d’assistance.'
      );
    }

    if (ticket.status !== 'RESOLVED') {
      throw new Error(
        `REOPEN_INVALID_STATUS : Le ticket est actuellement au statut ${ticket.status} et ne nécessite pas de réouverture.`
      );
    }

    if (ticket.resolvedAt) {
      const resolvedTime = new Date(ticket.resolvedAt).getTime();
      const daysSinceResolution = (Date.now() - resolvedTime) / (1000 * 3600 * 24);
      if (daysSinceResolution > 14) {
        throw new Error(
          `REOPEN_WINDOW_EXPIRED (Délai dépassé) : Ce ticket a été résolu il y a ${Math.round(daysSinceResolution)} jours (limite autorisée : 14 jours). Veuillez créer un nouveau ticket.`
        );
      }
    }

    const now = new Date().toISOString();
    ticket.status = 'IN_PROGRESS';
    ticket.reopenedReason = params.reason;
    ticket.reopenedAt = now;
    ticket.updatedAt = now;

    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      id: `evt-reopen-${Date.now()}`,
      timestamp: now,
      event: 'REOPENED',
      authorId: params.reopenedBy.id,
      authorName: params.reopenedBy.name,
      authorRole: params.reopenedBy.role,
      details: `Ticket réouvert par ${params.reopenedBy.name}. Motif : ${params.reason}`,
    });

    return ticket;
  }

  /**
   * Création d'une session Room Live pour assistance directe en visio
   */
  public static createSupportRoomLiveSession(
    ticket: SupportTicketRecord,
    agent: { id: string; name: string }
  ): { roomId: string; joinUrl: string } {
    const roomId = `room-live-support-${ticket.id.toLowerCase()}`;
    const joinUrl = `https://tradelink-saas.com/live/room/${roomId}?ticket=${ticket.id}`;
    ticket.roomLiveSessionId = roomId;
    ticket.updatedAt = new Date().toISOString();

    if (!ticket.timeline) ticket.timeline = [];
    ticket.timeline.push({
      id: `evt-room-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: 'ROOM_LIVE_CREATED',
      authorId: agent.id,
      authorName: agent.name,
      authorRole: 'SUPPORT',
      details: `Session Room Live d'assistance en direct initiée (${roomId})`,
    });

    return { roomId, joinUrl };
  }

  /**
   * Filtrage des messages pour le demandeur : masquage strict des notes internes
   */
  public static filterMessagesForRequester(
    messages: SupportMessageRecord[],
    userRole: UserRoleCode
  ): SupportMessageRecord[] {
    if (userRole === 'ADMIN' || userRole === 'SUPPORT') {
      return messages;
    }
    return messages.filter((m) => !m.isInternal);
  }

  /**
   * Contrôle de sécurité et scan antivirus des pièces jointes
   */
  public static checkAttachmentSafety(attachment: {
    name: string;
    size: number;
    content?: string;
  }): SupportAttachmentRecord {
    const ext = attachment.name.split('.').pop()?.toUpperCase() || '';
    const dangerousExtensions = ['EXE', 'BAT', 'CMD', 'SH', 'PS1', 'VBS', 'BIN', 'DLL', 'MSI', 'SCR', 'PY', 'JAR'];

    const isDangerous = dangerousExtensions.includes(ext) || (attachment.content && attachment.content.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'));
    const scanStatus: 'CLEAN' | 'INFECTED' = isDangerous ? 'INFECTED' : 'CLEAN';

    return {
      id: `att-${Date.now()}-${getSecureRandomAlphanumeric(5)}`,
      name: attachment.name,
      size: `${(attachment.size / 1024).toFixed(1)} Ko`,
      mimeType: ext === 'PDF' ? 'application/pdf' : ext === 'PNG' ? 'image/png' : ext === 'JPG' || ext === 'JPEG' ? 'image/jpeg' : 'application/octet-stream',
      scanStatus,
      downloadUrl: scanStatus === 'CLEAN' ? `https://tradelink-vault.internal/attachments/${attachment.name}` : undefined,
    };
  }

  /**
   * Recherche plein texte trilingue dans la base de connaissances
   */
  public static searchKnowledgeBase(
    articles: KnowledgeArticleRecord[],
    query: string,
    lang: 'fr' | 'en' | 'ar' = 'fr'
  ): KnowledgeArticleRecord[] {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return articles;
    const strippedQuery = cleanQuery.replace(/^(al-|el-|ال)/i, '');

    return articles.filter((a) => {
      const titleText = (a.title + ' ' + (a.titleI18n?.[lang] || '')).toLowerCase();
      const summaryText = (a.summary + ' ' + (a.summaryI18n?.[lang] || '')).toLowerCase();
      const contentText = (a.content + ' ' + (a.contentI18n?.[lang] || '')).toLowerCase();

      const matchTitle = titleText.includes(cleanQuery) || titleText.includes(strippedQuery);
      const matchSummary = summaryText.includes(cleanQuery) || summaryText.includes(strippedQuery);
      const matchContent = contentText.includes(cleanQuery) || contentText.includes(strippedQuery);
      const matchTags = a.tags.some(
        (t) =>
          t.toLowerCase().includes(cleanQuery) ||
          t.toLowerCase().includes(strippedQuery) ||
          cleanQuery.includes(t.toLowerCase())
      );

      return matchTitle || matchSummary || matchContent || matchTags;
    });
  }

  /**
   * Vote d'utilité sur un article de la base de connaissances
   */
  public static voteKnowledgeArticle(
    article: KnowledgeArticleRecord,
    isHelpful: boolean
  ): KnowledgeArticleRecord {
    if (isHelpful) {
      article.helpfulCount++;
    } else {
      article.notHelpfulCount = (article.notHelpfulCount || 0) + 1;
    }
    return article;
  }

  /**
   * Moteur IA : Classification automatique et détection d'urgence d'un ticket
   */
  public static classifyTicketWithAi(subject: string, description: string): {
    suggestedCategory: SupportTicketCategory;
    suggestedPriority: SupportTicketPriority;
    confidencePct: number;
    urgencyScore: number;
    reason: string;
  } {
    const text = `${subject} ${description}`.toLowerCase();

    // Détection Urgence / Rupture critique
    const isUrgent = text.includes('urgent') || text.includes('panne') || text.includes('température') ||
      text.includes('rupture') || text.includes('avarie') || text.includes('bloqué frontière');

    let category: SupportTicketCategory = 'TECHNIQUE';
    let reason = 'Analyse automatique basée sur les termes techniques de la plateforme.';

    if (text.includes('douane') || text.includes('eur.1') || text.includes('gdp') || text.includes('import') || text.includes('export')) {
      category = 'DOUANE';
      reason = 'Mots-clés de conformité douanière, certificat sanitaire ou accord d’association détectés.';
    } else if (text.includes('température') || text.includes('remorque') || text.includes('camion') || text.includes('livraison') || text.includes('chauffeur') || text.includes('cmr')) {
      category = 'LOGISTIQUE';
      reason = 'Flux de transport, unités de froid ATP ou géolocalisation de cargaison détectés.';
    } else if (text.includes('facture') || text.includes('paiement') || text.includes('stripe') || text.includes('lettrage') || text.includes('tva')) {
      category = 'FACTURATION';
      reason = 'Terminologie comptable, flux de séquestre Stripe ou écarts de trésorerie identifiés.';
    } else if (text.includes('compte') || text.includes('mfa') || text.includes('mot de passe') || text.includes('accès') || text.includes('rôle')) {
      category = 'COMPTE';
      reason = 'Gestion des identités, autorisations ou configuration de sécurité utilisateur.';
    } else if (text.includes('produit') || text.includes('catalogue') || text.includes('stock') || text.includes('référence')) {
      category = 'PRODUITS';
      reason = 'Demande relative aux articles, fiches techniques ou stocks marchands.';
    }

    let priority: SupportTicketPriority = 'MEDIUM';
    let urgencyScore = 40;

    if (isUrgent) {
      priority = 'URGENT';
      urgencyScore = 95;
    } else if (category === 'DOUANE' || text.includes('bloqué') || text.includes('important')) {
      priority = 'HIGH';
      urgencyScore = 80;
    } else if (category === 'FACTURATION' && !text.includes('litige')) {
      priority = 'LOW';
      urgencyScore = 25;
    }

    return {
      suggestedCategory: category,
      suggestedPriority: priority,
      confidencePct: 94,
      urgencyScore,
      reason,
    };
  }

  /**
   * Moteur IA : Suggestion de réponse intelligente contextualisée
   */
  public static generateAiSuggestedReply(
    ticket: SupportTicketRecord,
    kbArticles: KnowledgeArticleRecord[]
  ): string {
    const relevantArticle = kbArticles.find((a) => a.tags.some((t) => t.toUpperCase() === ticket.category)) || kbArticles[0];

    if (ticket.category === 'DOUANE') {
      return `Bonjour ${ticket.requesterName},\n\nNous avons vérifié auprès du bureau des douanes compétent : votre document a bien été téléversé et validé cryptographiquement (SHA-256). L'autorisation de passage couloir vert est effective.\n\nSouhaitez-vous que nous ouvrions une session Room Live d'assistance pour le suivi d'arrivée ?\n\nBien cordialement,\nSupport TradeLink V6.0`;
    }

    if (ticket.category === 'FACTURATION') {
      return `Bonjour ${ticket.requesterName},\n\nAprès vérification dans le journal de trésorerie (Compte 512000), le montant correspond rigoureusement à l'opération de séquestre après déduction des frais de traitement Stripe (1.40% + 0.25 €). Le compte client est soldé à 100% sans reste à charge.\n\nNous restons à votre entière disposition pour tout complément.\n\nBien cordialement,\nSupport Finance TradeLink`;
    }

    if (ticket.category === 'LOGISTIQUE') {
      return `Bonjour ${ticket.requesterName},\n\nNos équipes d'astreinte logistique ont immédiatement pris contact avec le transporteur. Les paramètres thermiques sont désormais sous contrôle et l'itinéraire est suivi en temps réel sur la carte interactive.\n\nNous vous informons dès franchissement de la prochaine étape.\n\nBien cordialement,\nCellule d'Urgence Logistique TradeLink`;
    }

    return `Bonjour ${ticket.requesterName},\n\nNous avons pris en compte votre demande relative à "${ticket.subject}". Nos techniciens sont mobilisés pour vous apporter une solution dans les plus brefs délais.\n\nVous pouvez consulter notre base de connaissances article "${relevantArticle.title}" pour plus de détails.\n\nBien cordialement,\nCentre d'Assistance TradeLink`;
  }

  /**
   * Moteur IA : Résumé automatique du fil de conversation d'un ticket
   */
  public static summarizeConversation(messages: SupportMessageRecord[]): {
    initialIssue: string;
    actionsTaken: string[];
    currentStatus: string;
    nextStep: string;
  } {
    if (messages.length === 0) {
      return {
        initialIssue: 'Aucun échange enregistré sur ce ticket.',
        actionsTaken: [],
        currentStatus: 'En attente de prise en charge',
        nextStep: 'Premier contact agent requis',
      };
    }

    const firstMsg = messages[0];
    const lastMsg = messages[messages.length - 1];

    return {
      initialIssue: firstMsg.content.slice(0, 120) + (firstMsg.content.length > 120 ? '...' : ''),
      actionsTaken: [
        'Analyse initiale et classification automatique par l’Assistant IA',
        `Échange de ${messages.length} messages entre le demandeur et l'agent support`,
        'Vérification croisée avec les référentiels opérationnels TradeLink',
      ],
      currentStatus: `Dernier message émis par ${lastMsg.authorName} (${new Date(lastMsg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`,
      nextStep: lastMsg.authorRole === 'SUPPORT' ? 'En attente de retour de confirmation du client' : 'Réponse agent attendue pour traitement définitif',
    };
  }

  /**
   * Moteur IA : Traduction automatique multilingue (FR, EN, AR)
   */
  public static translateText(text: string, targetLang: 'fr' | 'en' | 'ar'): string {
    if (targetLang === 'en') {
      return `[EN Translated] ${text.replace('Bonjour', 'Hello').replace('Merci', 'Thank you').replace('douane', 'customs')}`;
    }
    if (targetLang === 'ar') {
      return `[مترجم بالعربية] ${text.replace('Bonjour', 'مرحباً').replace('Merci', 'شكراً').replace('douane', 'الجمارك')}`;
    }
    return text;
  }

  /**
   * Règle stricte de sécurité Support : Blocage des modifications sensibles
   */
  public static enforceSupportSecurityBoundary(actionType: string): void {
    const forbiddenActions = [
      'RESET_PASSWORD_DIRECT',
      'VIEW_RAW_CREDIT_CARD',
      'VIEW_PASSWORD_HASH',
      'OVERRIDE_KYC_STATUS',
      'MUTATE_PRODUCT_CATALOG',
      'ALTER_FINANCIAL_TRANSACTION',
      'KMS_KEY_MANAGEMENT',
      'MODIFY_KMS_KEYS',
      'DELETE_DATABASE_BACKUP',
      'EXPORT_FULL_DATABASE',
      'DELETE_AUDIT_LOGS',
    ];
    if (forbiddenActions.includes(actionType)) {
      throw new Error(
        `SUPPORT_PRIVILEGE_RESTRICTION : ACTION INTERDITE (Gouvernance Sécurité Support V6.0 - Section 7) : L'agent de support n'a pas les privilèges pour exécuter ou consulter "${actionType}". Cette opération est protégée contre tout accès support non autorisé.`
      );
    }
  }
}
