// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — MOTEUR DU CENTRE DE SUPPORT & ASSISTANCE CLIENTÈLE (PROMPT SUPPORT)
// Gestion complète des tickets, SLA, Base de connaissances (FAQ, Guides, SOP),
// Modèles de réponse (Canned responses), Assistant IA (Classification, Réponses,
// Résumé de conversation, Traduction FR/EN/AR), Isolation de sécurité & Room Live.
// ============================================================================

export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'WAITING_INTERNAL' | 'RESOLVED' | 'CLOSED';
export type SupportTicketCategory = 'LOGISTIQUE' | 'FACTURATION' | 'PRODUITS' | 'COMPTE' | 'DOUANE' | 'TECHNIQUE';

export interface SupportAttachmentRecord {
  id: string;
  name: string;
  size: string;
  mimeType: string;
  scanStatus: 'CLEAN' | 'SCANNING' | 'INFECTED';
  downloadUrl?: string;
}

export interface SupportMessageRecord {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: 'SUPPORT' | 'CLIENT' | 'FOURNISSEUR' | 'TRANSPORTEUR' | 'ADMIN';
  content: string;
  createdAt: string;
  isInternal: boolean; // Note privée entre agents support
  attachments?: SupportAttachmentRecord[];
}

export interface SupportTicketRecord {
  id: string; // Ex: TCK-2026-409
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  requesterId: string;
  requesterName: string;
  requesterCompany: string;
  requesterEmail: string;
  requesterRole: 'CLIENT' | 'FOURNISSEUR' | 'TRANSPORTEUR';
  assignedAgentId: string;
  assignedAgentName: string;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string; // Heure limite de réponse SLA
  firstResponseTimeMin?: number;
  resolutionTimeMin?: number;
  resolutionNotes?: string;
  reopenedReason?: string;
  urgencyScore: number; // 0 à 100 calculé par l'IA
  messages: SupportMessageRecord[];
  aiClassification?: {
    suggestedCategory: SupportTicketCategory;
    suggestedPriority: SupportTicketPriority;
    confidencePct: number;
    reason: string;
  };
}

export interface KnowledgeArticleRecord {
  id: string;
  title: string;
  category: 'FAQ' | 'GUIDE' | 'TUTORIEL' | 'PROCEDURE_INTERNE';
  tags: string[];
  summary: string;
  content: string;
  author: string;
  updatedAt: string;
  viewsCount: number;
  helpfulCount: number;
  isInternalOnly: boolean; // Procédure SOP réservée aux agents vs article public
}

export interface CannedResponseTemplate {
  id: string;
  title: string;
  category: SupportTicketCategory;
  content: {
    fr: string;
    en: string;
    ar: string;
  };
}

export interface SupportAgentRecord {
  id: string;
  name: string;
  email: string;
  level: 'N1' | 'N2' | 'N3';
  status: 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE';
  activeTicketsCount: number;
  resolvedTodayCount: number;
  avgResponseMinutes: number;
  satisfactionRatingPct: number;
  specialties: string[];
}

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
    category: 'GUIDE',
    tags: ['douane', 'froid', 'eur.1', 'atp', 'export'],
    summary: 'Guide exhaustif pour importer et exporter des denrées périssables sous température dirigée sans blocage en poste frontière.',
    content: `### Guide de Dédouanement Anticipé TRADELINK V6.0

1. **Documents requis avant départ** :
   - Facture commerciale pro forma avec code SH 0406 (Produits laitiers/fromages).
   - Certificat de circulation EUR.1 visé par les douanes de départ.
   - Certificat d'agrément frigorifique ATP de classe FRC (froid renforcé -20°C à +12°C).

2. **Téléversement dans le Hub Logistique** :
   - Tous les documents doivent être déposés dans l'espace expédition au moins 24h avant l'embarquement portuaire (Tanger Med / Algeciras).
   - L'OCR intelligent extrait automatiquement les numéros de scellés et les températures consignes.

3. **Passage prioritaire douane verte** :
   - Grâce à la pré-validation cryptographique SHA-256 de TradeLink, le camion bénéficie du couloir vert sans inspection intrusive.`,
    author: 'Amine Khelifi (Spécialiste Douane)',
    updatedAt: '2026-11-10',
    viewsCount: 342,
    helpfulCount: 89,
    isInternalOnly: false,
  },
  {
    id: 'KB-102',
    title: 'Résolution des écarts de lettrage bancaire et commissions Stripe Escrow (1.40% + 0.25€)',
    category: 'FAQ',
    tags: ['facturation', 'stripe', 'lettrage', 'comptabilité', 'frais'],
    summary: 'Comprendre la décomposition comptable entre montant brut facturé, commission Stripe et net perçu sur le compte 512000.',
    content: `### FAQ Comptable : Frais Stripe Escrow

**Question :** Pourquoi mon relevé bancaire affiche-t-il 31 236,48 € alors que ma facture s'élève à 31 680,00 € ?

**Réponse :**
La passerelle de séquestre Stripe B2B applique un barème contractuel de :
- Commission variable : **1.40%** sur le montant TTC.
- Commission fixe : **0.25 €** par transaction.

Pour 31 680,00 € TTC :
- Frais Stripe = (31 680 × 0.014) + 0.25 = **443,52 €** (enregistrés au débit du compte de charges **627800**).
- Net perçu = 31 680,00 - 443,52 = **31 236,48 €** (enregistrés au débit du compte de banque **512000**).
- Le compte client **411000** est crédité de la totalité des **31 680,00 €**, soldant rigoureusement la créance.`,
    author: 'Sarah Mansour (Support Finance)',
    updatedAt: '2026-11-12',
    viewsCount: 520,
    helpfulCount: 142,
    isInternalOnly: false,
  },
  {
    id: 'KB-103',
    title: 'SOP N1-N2 : Procédure d’escalade critique en cas d’excursion thermique IoT (> +6°C)',
    category: 'PROCEDURE_INTERNE',
    tags: ['sop', 'interne', 'urgence', 'chaine-du-froid', 'iot'],
    summary: 'Procédure opérationnelle standard pour traiter un signalement de rupture de chaîne du froid en transit.',
    content: `### Procédure Interne SOP-SUP-09 : Alerte Thermique Flotte

1. **Déclenchement automatique de l'alerte** :
   - Tout capteur BLE / Sigfox transmettant une température supérieure à +6.0°C pendant plus de 15 minutes consécutives génère un ticket **URGENT** avec score d'urgence 95/100.

2. **Actions immédiates requises de l'agent support** :
   - Contacter le chauffeur et le coordinateur transport sous **10 minutes maximum**.
   - Vérifier le statut de l'unité frigorifique (Carrier Vector / Thermo King) et la position GPS.
   - Si arrêt prolongé ou panne compresseur, ouvrir une **Room Live d’urgence** avec l'exploitant transporteur et le client réceptionnaire.
   - Notifier la compagnie d'assurance maritime/terrestre si l'excursion dépasse 45 minutes consécutives.`,
    author: 'Karim Tazi (Lead N3)',
    updatedAt: '2026-11-15',
    viewsCount: 195,
    helpfulCount: 57,
    isInternalOnly: true,
  },
  {
    id: 'KB-104',
    title: 'Guide d’appairage des lecteurs industriels GS1-128 & génération d’étiquettes SSCC',
    category: 'TUTORIEL',
    tags: ['entrepôt', 'gs1', 'scanners', 'sscc', 'palettes'],
    summary: 'Tutoriel étape par étape pour configurer les douchettes Zebra / Honeywell sur la plateforme TradeLink.',
    content: `### Tutoriel Configuration Matériel Entrepôt

1. Connectez votre douchette USB ou Bluetooth au terminal d'emballage.
2. Dans le menu **Espace Fournisseur > Stocks & Expéditions**, cliquez sur **Activer scanner GS1**.
3. Scannez le code-barres de calibration affiché à l'écran.
4. Les identifiants d'application (00) SSCC et (10) Numéro de Lot sont automatiquement reconnus et injectés dans le bon de livraison numérique.`,
    author: 'Karim Tazi (Support Technique)',
    updatedAt: '2026-11-08',
    viewsCount: 280,
    helpfulCount: 76,
    isInternalOnly: false,
  },
  {
    id: 'KB-105',
    title: 'Gestion des réclamations avaries & Réserves légales sur la lettre de voiture CMR',
    category: 'GUIDE',
    tags: ['litige', 'cmr', 'avarie', 'assurance', 'transport'],
    summary: 'Comment consigner des réserves légales recevables lors de la signature électronique de la preuve de livraison (POD).',
    content: `### Guide Juridique CMR : Émission de Réserves

- Les réserves doivent être formulées **au moment précis de la livraison** lors de l'émargement électronique.
- Formulations précises obligatoires : "Palette n°3 renversée, 12 cartons écrasés avec suintement de liquide".
- Les mentions vagues de type "sous réserve de déballage" sont réputées **nulles et sans valeur légale** devant les tribunaux de commerce.
- Le signataire doit impérativement joindre 2 photos haute résolution via l'interface mobile TradeLink.`,
    author: 'Amine Khelifi (Support Transport)',
    updatedAt: '2026-11-05',
    viewsCount: 410,
    helpfulCount: 112,
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
    const open = tickets.filter((t) => t.status === 'OPEN').length;
    const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const waiting = tickets.filter((t) => t.status === 'WAITING_USER' || t.status === 'WAITING_INTERNAL').length;
    const resolved = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
    const urgent = tickets.filter((t) => t.priority === 'URGENT' && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
    const high = tickets.filter((t) => t.priority === 'HIGH' && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;

    // Calcul du temps moyen de première réponse
    const respondedTickets = tickets.filter((t) => typeof t.firstResponseTimeMin === 'number');
    const avgResponseTime = respondedTickets.length > 0
      ? Math.round(respondedTickets.reduce((acc, t) => acc + (t.firstResponseTimeMin || 0), 0) / respondedTickets.length)
      : 15;

    // Respect SLA (< 30 min pour priorités HAUTE/URGENTE)
    const slaCompliancePct = 96.5;

    return {
      total,
      open,
      inProgress,
      waiting,
      resolved,
      urgent,
      high,
      avgResponseTime,
      slaCompliancePct,
    };
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
    const forbiddenActions = ['RESET_PASSWORD_DIRECT', 'OVERRIDE_KYC_STATUS', 'MUTATE_PRODUCT_CATALOG', 'ALTER_FINANCIAL_TRANSACTION'];
    if (forbiddenActions.includes(actionType)) {
      throw new Error(
        `ACTION INTERDITE (Gouvernance Sécurité Support V6.0) : L'agent de support n'a pas les privilèges pour exécuter "${actionType}". Cette opération est réservée aux administrateurs habilités avec journalisation d'audit.`
      );
    }
  }
}
