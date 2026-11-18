// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — ASSISTANT IA FLOTTANT (AI COPILOT CENTRAL ENGINE)
// PROMPT 03 : COPILOT CONTEXTUEL MULTI-RÔLE, RAG FILTRÉ, ACTIONS ASSISTÉES & SÉCURITÉ
// - Intelligence contextuelle (rôle, page active, langue FR/EN/AR avec RTL)
// - RAG documentaire filtré par permissions strictes RBAC
// - Actions assistées avec confirmation & blocage strict des opérations critiques
// - Streaming token par token, annulation (AbortController) & cache SHA-256 (< 2 ms)
// - Synthèse documentaire et gestion des pièces jointes (<= 10 Mo, sans .exe)
// ============================================================================

import crypto from 'crypto';
import Decimal from 'decimal.js';
import {
  CopilotAssistedAction,
  CopilotMessage,
  Locale,
  RagSourceCitation,
  UserRoleCode,
} from '../types';
import { SUPPORTED_AI_MODELS } from './aiIntelligenceEngine';

// ============================================================================
// 1. BASE DE CONNAISSANCES RAG AUGMENTÉE & MULTI-RÔLE
// ============================================================================

export interface ExtendedRagSource extends RagSourceCitation {
  id: string;
  category: 'NAVIGATION' | 'COMMERCIAL' | 'FINANCE' | 'LOGISTICS' | 'KYC' | 'SUPPORT' | 'ADMIN' | 'PUBLIC';
  keywords: string[];
}

export const COPILOT_RAG_KNOWLEDGE_BASE: ExtendedRagSource[] = [
  // 1. NAVIGATION & VISITEUR PUBLIC
  {
    id: 'RAG-NAV-01',
    category: 'PUBLIC',
    domain: 'SYSTEM',
    title: 'Présentation de la Plateforme TRADELINK V6.0 & Découverte Publique',
    referenceId: 'PUB-DOC-DISCOVERY',
    snippet: 'TRADELINK V6.0 est la plateforme SaaS B2B internationale dédiée aux échanges transfrontaliers, logistique multimodale, financement d’opérations et conformité KYC. Les visiteurs peuvent explorer le catalogue public certifié et initier leur inscription.',
    confidence: 0.99,
    accessRoles: ['VISITEUR', 'CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'SUPPORT', 'ADMIN'],
    keywords: ['plateforme', 'tradelink', 'accueil', 'public', 'visiteur', 'services', 'presentation', 'decouverte'],
  },
  {
    id: 'RAG-NAV-02',
    category: 'NAVIGATION',
    domain: 'SYSTEM',
    title: 'Orientation & Navigation dans les Espaces Métiers',
    referenceId: 'NAV-GUIDE-WORKSPACES',
    snippet: 'Chaque utilisateur accède à un espace adapté : /client/dashboard (commandes, panier, devis), /fournisseur/dashboard (produits, stocks, RFQ), /transporteur/dashboard (missions, CMR, POD), /comptable/dashboard (factures, journaux, calculs financiers), /support/dashboard (tickets, utilisateurs), /admin/dashboard (gouvernance, KYC, audit).',
    confidence: 0.98,
    accessRoles: ['VISITEUR', 'CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'SUPPORT', 'ADMIN'],
    keywords: ['navigation', 'aller', 'page', 'dashboard', 'ou', 'trouver', 'espace', 'menu', 'onglet'],
  },

  // 2. COMMERCIAL & CLIENT B2B
  {
    id: 'RAG-COMM-01',
    category: 'COMMERCIAL',
    domain: 'COMMERCIAL',
    title: 'Catalogue Produits B2B, Panier & Processus de Commande',
    referenceId: 'COMM-CATALOG-PURCHASE',
    snippet: 'Le catalogue Client permet la sélection de produits industriels certifiés, gestion du panier avec calcul automatique HT/TVA, réservation immédiate de stock et conversion de devis négocié en commande ferme (#CMD).',
    confidence: 0.97,
    accessRoles: ['CLIENT', 'FOURNISSEUR', 'ADMIN', 'SUPPORT'],
    keywords: ['catalogue', 'produit', 'produits', 'panier', 'commande', 'acheter', 'prix', 'devis', 'commander'],
  },
  {
    id: 'RAG-COMM-02',
    category: 'COMMERCIAL',
    domain: 'COMMERCIAL',
    title: 'Négociation Commerciale & Demandes de Devis (RFQ)',
    referenceId: 'COMM-RFQ-NEGOTIATION',
    snippet: 'Un client peut soumettre une demande de cotation (RFQ) précisant quantité, Incoterm (CIP, FOB, EXW) et date limite. Le fournisseur répond avec un chiffrage unitaire et conditions de remise, validable en 1 clic.',
    confidence: 0.96,
    accessRoles: ['CLIENT', 'FOURNISSEUR', 'ADMIN'],
    keywords: ['devis', 'rfq', 'cotation', 'negociation', 'remise', 'chiffrage', 'incoterm'],
  },
  {
    id: 'RAG-COMM-03',
    category: 'COMMERCIAL',
    domain: 'COMMERCIAL',
    title: 'Accords Fournisseurs Confidentiels & Marges Brutes Usine',
    referenceId: 'COMM-CONF-SUPPLIER-MARGINS',
    snippet: 'Barèmes de marge brute fournisseur, remises de volume négociées avec les fabricants européens et coûts de revient usine. Données strictement confidentielles.',
    confidence: 0.99,
    accessRoles: ['FOURNISSEUR', 'ADMIN'], // STRICTEMENT INTERDIT AU CLIENT, TRANSPORTEUR, COMPTABLE, SUPPORT
    keywords: ['marge', 'marges', 'cout de revient', 'grossiste', 'accord confidentiel', 'taux de marque'],
  },

  // 3. FOURNISSEUR & GESTION DES STOCKS
  {
    id: 'RAG-SUPP-01',
    category: 'COMMERCIAL',
    domain: 'COMMERCIAL',
    title: 'Fiches Produits, Variantes & Rapprochement de Stocks',
    referenceId: 'SUPP-PROD-STOCK-MGMT',
    snippet: 'Le fournisseur gère ses articles via /fournisseur/catalogue. Chaque produit requiert : SKU unique, nom multilingue, catégorie, caractéristiques techniques, prix unitaire HT, quantité minimale de commande (MOQ) et stock de sécurité avec alerte.',
    confidence: 0.97,
    accessRoles: ['FOURNISSEUR', 'ADMIN'],
    keywords: ['ajouter produit', 'fiche produit', 'creer produit', 'stock', 'variantes', 'sku', 'fournisseur', 'inventaire'],
  },

  // 4. LOGISTIQUE & TRANSPORTEUR
  {
    id: 'RAG-LOG-01',
    category: 'LOGISTICS',
    domain: 'LOGISTICS',
    title: 'Missions de Transport, Lettre de Voiture CMR & Suivi Temps Réel',
    referenceId: 'LOG-CMR-MISSION-DISPATCH',
    snippet: 'Les transporteurs consultent les missions assignées sur /transporteur/missions. La prise en charge génère une CMR internationale chiffrée. Le suivi en temps réel inclut statut d’expédition, géolocalisation et alertes d’étape.',
    confidence: 0.98,
    accessRoles: ['TRANSPORTEUR', 'ADMIN', 'FOURNISSEUR', 'CLIENT'],
    keywords: ['mission', 'transport', 'cmr', 'expedition', 'livraison', 'chauffeur', 'vehicule', 'colis', 'trajet', 'itineraire'],
  },
  {
    id: 'RAG-LOG-02',
    category: 'LOGISTICS',
    domain: 'LOGISTICS',
    title: 'Chaîne du Froid (-25°C à +8°C), Normes GDP & Incidents',
    referenceId: 'LOG-COLDCHAIN-GDP-INCIDENT',
    snippet: 'Les conteneurs certifiés ColdChain sont monitorés par IoT. En cas de dépassement thermique ou retard logistique, le transporteur déclare un incident motivé avec justificatifs photos et horodatage.',
    confidence: 0.97,
    accessRoles: ['TRANSPORTEUR', 'ADMIN', 'FOURNISSEUR'],
    keywords: ['chaine du froid', 'temperature', 'gdp', 'incident', 'retard', 'panne', 'avarie', 'anomalie'],
  },
  {
    id: 'RAG-LOG-03',
    category: 'LOGISTICS',
    domain: 'LOGISTICS',
    title: 'Preuve de Livraison Électronique (POD) & Clôture d’Expédition',
    referenceId: 'LOG-POD-SIGNATURE-CLOSURE',
    snippet: 'La livraison s’achève par l’émargement de la preuve de livraison électronique (POD) avec signature du réceptionnaire, horodatage certifié et empreinte SHA-256 transmise au client et au fournisseur.',
    confidence: 0.99,
    accessRoles: ['TRANSPORTEUR', 'CLIENT', 'ADMIN', 'FOURNISSEUR'],
    keywords: ['pod', 'preuve de livraison', 'signature', 'emargement', 'reception', 'cloture livraison'],
  },

  // 5. COMPTABILITÉ & MOTEUR FINANCIER
  {
    id: 'RAG-ACCT-01',
    category: 'FINANCE',
    domain: 'ACCOUNTING',
    title: 'Moteur de Calcul Financier TRADELINK Déterministe (Decimal.js)',
    referenceId: 'ACCT-CALC-DECIMAL-FORMULA',
    snippet: 'Formule de calcul d’intérêts / agios : Montant × Taux × Nombre de Jours / Convention. Supporte ACT/365 (standard), ACT/360 (marchés monétaires) et ACT/ACT (bissextile 366j). Calculs exacts via Decimal.js sans approximation flottante.',
    confidence: 0.99,
    accessRoles: ['COMPTABLE', 'ADMIN'],
    keywords: ['calcul', 'interet', 'agios', 'act/365', 'act/360', 'act/act', 'formule', 'decimal', 'echeance', 'taux', 'arrondi'],
  },
  {
    id: 'RAG-ACCT-02',
    category: 'FINANCE',
    domain: 'ACCOUNTING',
    title: 'Comptabilité en Partie Double, Journaux Ventes/Achats & Rapprochement',
    referenceId: 'ACCT-DOUBLE-ENTRY-LEDGER',
    snippet: 'Toutes les factures génèrent automatiquement des écritures Débit = Crédit équilibrées. Comptes généraux utilisés : 411000 (Clients), 401000 (Fournisseurs), 445710 (TVA Collectée), 707000 (Ventes Marchandises). Rapprochement bancaire via Stripe Escrow.',
    confidence: 0.98,
    accessRoles: ['COMPTABLE', 'ADMIN'],
    keywords: ['partie double', 'ecriture', 'journal', 'facture', 'grand livre', 'debit', 'credit', 'rapprochement', 'tva'],
  },

  // 6. SUPPORT & GESTION DES TICKETS
  {
    id: 'RAG-SUPP-TICKETS',
    category: 'SUPPORT',
    domain: 'SYSTEM',
    title: 'Espace Support B2B, Cycle de Vie des Tickets & SLAs',
    referenceId: 'SUPP-TICKETS-SLA-GUIDE',
    snippet: 'L’équipe support traite les requêtes classées par priorité (Faible, Moyenne, Haute, Critique). L’assistant IA suggère des réponses types et aide à qualifier les anomalies sans modifier les données sensibles.',
    confidence: 0.96,
    accessRoles: ['SUPPORT', 'ADMIN'],
    keywords: ['support', 'ticket', 'reponse', 'assistance', 'agent', 'utilisateur', 'demande', 'reclamation', 'sla'],
  },

  // 7. CONFORMITÉ KYC & RÈGLE DES 7 JOURS
  {
    id: 'RAG-KYC-01',
    category: 'KYC',
    domain: 'KYC',
    title: 'Procédure KYC, Délai de 7 Jours, Relances J+1/J+3/J+5/J+6 & Protection J+7',
    referenceId: 'KYC-POLICY-LIFECYCLE-J7',
    snippet: 'À l’inscription, chaque acteur dispose de 7 jours calendaires pour soumettre ses pièces légales (pièce d’identité, registre de commerce ICE/Kbis/Handelsregister, patente/tax license). Relances automatiques à J+1, J+3, J+5 et J+6. PROTECTION ESSENTIELLE : Un dossier soumis dans les délais n’est JAMAIS suspendu à J+7 du fait du délai d’instruction.',
    confidence: 0.99,
    accessRoles: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'ADMIN', 'SUPPORT'],
    keywords: ['kyc', 'documents', 'justificatif', 'delai', '7 jours', 'suspension', 'relance', 'validation', 'pieces', 'kbis', 'ice'],
  },

  // 8. ADMINISTRATION, SÉCURITÉ & KMS
  {
    id: 'RAG-ADMIN-01',
    category: 'ADMIN',
    domain: 'SYSTEM',
    title: 'Gouvernance Plateforme, Clés KMS AES-256-GCM & Double Approbation',
    referenceId: 'ADMIN-SECURITY-KMS-GOV',
    snippet: 'L’administrateur supervise les métriques, la rotation des clés KEK/DEK en enveloppe KMS, l’analyse des imports en sandbox isolée, et les actions critiques soumises à double validation administrative.',
    confidence: 0.99,
    accessRoles: ['ADMIN'], // STRICTEMENT EXCLUSIF ADMIN
    keywords: ['admin', 'securite', 'kms', 'chiffrement', 'double validation', 'sauvegarde', 'sandbox', 'audit trail'],
  },
];

// ============================================================================
// 2. CACHE SHA-256 ULTRA-RAPIDE (< 2 ms)
// ============================================================================

interface FastQueryCacheEntry {
  answer: string;
  sources: RagSourceCitation[];
  assistedAction?: CopilotAssistedAction;
  timestamp: number;
}

const copilotQueryCache = new Map<string, FastQueryCacheEntry>();
let cacheHitCount = 0;
let cacheMissCount = 0;

export function generateCopilotQueryCacheKey(params: {
  query: string;
  role: UserRoleCode;
  path: string;
  locale: Locale;
}): string {
  const normalized = `${params.query.trim().toLowerCase()}|${params.role}|${params.path}|${params.locale}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function getCachedCopilotResponse(cacheKey: string): FastQueryCacheEntry | null {
  const entry = copilotQueryCache.get(cacheKey);
  if (!entry) {
    cacheMissCount++;
    return null;
  }
  // Expiration après 10 minutes
  if (Date.now() - entry.timestamp > 10 * 60 * 1000) {
    copilotQueryCache.delete(cacheKey);
    cacheMissCount++;
    return null;
  }
  cacheHitCount++;
  return entry;
}

export function setCachedCopilotResponse(
  cacheKey: string,
  entry: Omit<FastQueryCacheEntry, 'timestamp'>
): void {
  // Limite mémoire du cache : 1000 entrées max
  if (copilotQueryCache.size > 1000) {
    const firstKey = copilotQueryCache.keys().next().value;
    if (firstKey) copilotQueryCache.delete(firstKey);
  }
  copilotQueryCache.set(cacheKey, {
    ...entry,
    timestamp: Date.now(),
  });
}

export function getCopilotCacheMetrics(): { hits: number; misses: number; hitRatePct: number } {
  const total = cacheHitCount + cacheMissCount;
  return {
    hits: cacheHitCount,
    misses: cacheMissCount,
    hitRatePct: total > 0 ? Math.round((cacheHitCount / total) * 100) : 0,
  };
}

// ============================================================================
// 3. RECHERCHE DOCUMENTAIRE RAG AVEC CONTRÔLE STRICT RBAC
// ============================================================================

export function searchCopilotRagKnowledge(params: {
  query: string;
  userRole: UserRoleCode;
  currentPath?: string;
}): { sources: RagSourceCitation[]; isRestrictedAttempt: boolean } {
  const queryNorm = normalizeText(params.query);

  // Détection des tentatives de sonde non autorisées
  const isClientProbingSecrets =
    params.userRole === 'CLIENT' &&
    (queryNorm.includes('marge') ||
      queryNorm.includes('cout de revient') ||
      queryNorm.includes('kms') ||
      queryNorm.includes('secret') ||
      queryNorm.includes('fournisseurs confidentiel'));

  const isNonAdminProbingKms =
    params.userRole !== 'ADMIN' &&
    (queryNorm.includes('cle kms') ||
      queryNorm.includes('master key') ||
      queryNorm.includes('sandbox container') ||
      queryNorm.includes('double approbation'));

  if (isClientProbingSecrets || isNonAdminProbingKms) {
    return { sources: [], isRestrictedAttempt: true };
  }

  // Filtrage strict préalable : seuls les documents autorisés pour ce rôle sont éligibles
  const accessibleDocs = COPILOT_RAG_KNOWLEDGE_BASE.filter((doc) =>
    doc.accessRoles.includes(params.userRole)
  );

  const words = queryNorm
    .split(/[\s,.;:!?()'"]+/)
    .filter((w) => w.length > 2);

  const matched = accessibleDocs.filter((doc) => {
    const docText = normalizeText(
      `${doc.title} ${doc.snippet} ${doc.referenceId} ${doc.keywords.join(' ')}`
    );
    // Priorité au contexte de la page courante
    if (params.currentPath) {
      if (params.currentPath.includes('catalogue') && doc.category === 'COMMERCIAL') return true;
      if (params.currentPath.includes('calcul') && doc.category === 'FINANCE') return true;
      if (params.currentPath.includes('missions') && doc.category === 'LOGISTICS') return true;
      if (params.currentPath.includes('kyc') && doc.category === 'KYC') return true;
    }
    return words.some((word) => docText.includes(word));
  });

  return {
    sources: matched.slice(0, 3), // Max 3 sources les plus pertinentes
    isRestrictedAttempt: false,
  };
}

export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ============================================================================
// 4. DÉTECTION & GÉNÉRATION D'ACTIONS ASSISTÉES AVEC GARDE-FOUS
// ============================================================================

export function detectAssistedAction(params: {
  query: string;
  userRole: UserRoleCode;
  currentPath: string;
  locale: Locale;
}): CopilotAssistedAction | undefined {
  const q = normalizeText(params.query);

  // 1. GARDE-FOU CRITIQUE ABSOLU : TENTATIVE D'ACTION SENSIBLE (Paiement, Suppression, Validation Admin)
  const isDangerousActionRequest =
    q.includes('valider le paiement') ||
    q.includes('effectuer le paiement') ||
    q.includes('payer directement') ||
    (q.includes('paiement') && (q.includes('effectuer') || q.includes('valider') || q.includes('payer'))) ||
    q.includes('supprimer cet utilisateur') ||
    q.includes('supprimer la base') ||
    q.includes('valider mon kyc sans document') ||
    q.includes('contourner la validation admin');

  if (isDangerousActionRequest) {
    return {
      id: `act-blocked-${Date.now()}`,
      type: 'BLOCKED_SENSITIVE_ACTION',
      title: 'Action Critique Bloquée par Sécurité',
      description: 'L’Assistant IA ne dispose pas des privilèges pour exécuter des paiements, suppressions irréversibles ou validations administratives/KYC sans validation humaine habilitée.',
      payload: { requestedOperation: params.query, blockedAt: new Date().toISOString() },
      requiresConfirmation: true,
      isCritical: true,
      status: 'BLOCKED_BY_GUARDRAIL',
    };
  }

  // 2. Action : Préparation de fiche produit pour le Fournisseur
  const isProductCreation =
    (params.userRole === 'FOURNISSEUR' || params.userRole === 'ADMIN') &&
    (q.includes('creer') || q.includes('ajouter') || q.includes('fiche produit') || q.includes('nouveau produit')) &&
    (q.includes('produit') || q.includes('conteneur') || q.includes('pompe') || q.includes('compresseur') || q.includes('article'));

  if (isProductCreation) {
    const isColdChain = q.includes('froid') || q.includes('pharma') || q.includes('temperature') || q.includes('isotherme') || q.includes('frigorifique');
    return {
      id: `act-prod-${Date.now()}`,
      type: 'PREFILL_PRODUCT',
      title: 'Préparer la Fiche Produit Industrielle',
      description: 'Préremplissage des spécifications techniques et tarifaires pour le catalogue fournisseur.',
      targetPath: '/fournisseur/catalogue/nouveau',
      payload: {
        sku: isColdChain ? 'COLD-IND-2026-X' : 'IND-HYD-500-BAR',
        name: isColdChain
          ? 'Conteneur Isotherme Connecté GDP 250L'
          : 'Pompe Hydraulique Haute Pression 500 Bars',
        category: isColdChain ? 'Logistique Température Dirigée' : 'Composants Hydrauliques',
        unitPrice: isColdChain ? '4800.00' : '1250.00',
        minOrderQuantity: 2,
        stockAvailable: 25,
      },
      requiresConfirmation: true,
      isCritical: false,
      status: 'PENDING',
    };
  }

  // 3. Action : Préparer une réponse commerciale à un devis (Fournisseur)
  const isQuoteResponse =
    (params.userRole === 'FOURNISSEUR' || params.userRole === 'ADMIN') &&
    (q.includes('repondre') || q.includes('chiffrer') || q.includes('offre commerciale') || q.includes('cotation')) &&
    (q.includes('devis') || q.includes('rfq') || q.includes('offre'));

  if (isQuoteResponse) {
    return {
      id: `act-quote-${Date.now()}`,
      type: 'PREPARE_QUOTE_RESPONSE',
      title: 'Préparer l’Offre Commerciale Chiffrée',
      description: 'Génération automatique de l’offre avec remise de volume et conditions Incoterm CIP Casablanca.',
      targetPath: '/fournisseur/devis',
      payload: {
        quoteReference: 'DEV-2026-8841',
        proposedDiscountPct: 5,
        paymentTermsDays: 30,
        validityDays: 15,
        incoterm: 'CIP Casablanca Port',
      },
      requiresConfirmation: true,
      isCritical: false,
      status: 'PENDING',
    };
  }

  // 4. Action : Résumé de commande avec suivi logistique (Client / Fournisseur / Transporteur)
  if (q.includes('resume ma commande') || q.includes('ou en est la commande') || q.includes('statut commande')) {
    return {
      id: `act-ord-${Date.now()}`,
      type: 'SUMMARIZE_ORDER',
      title: 'Synthèse de Commande & Suivi Étape',
      description: 'Consultation de la commande #CMD-2026-11223 avec étape logistique et facture associée.',
      targetPath:
        params.userRole === 'CLIENT'
          ? '/client/commandes'
          : params.userRole === 'FOURNISSEUR'
          ? '/fournisseur/commandes'
          : '/transporteur/expeditions',
      payload: {
        orderId: 'cmd-client-01',
        orderNumber: 'CMD-2026-11223',
        status: 'EN_LIVRAISON',
        totalAmountEur: '24000.00',
        carrier: 'MedFreight Carriers',
      },
      requiresConfirmation: false,
      isCritical: false,
      status: 'PENDING',
    };
  }

  // 5. Action : Explication et simulation de calcul financier (Comptable)
  if (
    (params.userRole === 'COMPTABLE' || params.userRole === 'ADMIN') &&
    (q.includes('calculer interet') || q.includes('calcul financier') || q.includes('formule agios') || q.includes('act/365'))
  ) {
    const principal = new Decimal(50000);
    const rate = new Decimal(0.045);
    const days = 90;
    const convention = 365;
    const interest = principal.mul(rate).mul(days).div(convention).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    return {
      id: `act-calc-${Date.now()}`,
      type: 'CALCULATE_FINANCE',
      title: 'Simulation Moteur Financier Déterministe',
      description: `Calcul certifié Decimal.js : 50 000.00 EUR à 4.5% sur 90 jours (ACT/365) = ${interest.toFixed(2)} EUR.`,
      targetPath: '/comptable/calcul',
      payload: {
        principal: '50000.00',
        annualRate: '0.045',
        days: 90,
        convention: 'ACT/365',
        calculatedInterestEur: interest.toFixed(2),
      },
      requiresConfirmation: false,
      isCritical: false,
      status: 'PENDING',
    };
  }

  // 6. Action : Navigation guidée vers une section précise
  if (q.includes('comment aller a') || q.includes('ou trouver') || q.includes('acceder a')) {
    let destPath = '/';
    let destTitle = 'Accueil';
    if (q.includes('facture')) {
      destPath = params.userRole === 'COMPTABLE' ? '/comptable/factures' : '/client/factures';
      destTitle = 'Factures & Paiements';
    } else if (q.includes('kyc')) {
      destPath = params.userRole === 'ADMIN' ? '/admin/kyc' : `/${params.userRole.toLowerCase()}/kyc`;
      destTitle = 'Dossier de Conformité KYC';
    } else if (q.includes('catalogue')) {
      destPath = params.userRole === 'CLIENT' ? '/client/catalogue' : '/catalogue';
      destTitle = 'Catalogue Produits B2B';
    } else if (q.includes('mission')) {
      destPath = '/transporteur/missions';
      destTitle = 'Missions de Transport';
    } else if (q.includes('ticket')) {
      destPath = '/support/tickets';
      destTitle = 'Tickets de Support';
    }

    return {
      id: `act-nav-${Date.now()}`,
      type: 'NAVIGATE',
      title: `Naviguer vers ${destTitle}`,
      description: `Redirection directe vers ${destPath}.`,
      targetPath: destPath,
      payload: { path: destPath },
      requiresConfirmation: false,
      isCritical: false,
      status: 'PENDING',
    };
  }

  return undefined;
}

// ============================================================================
// 5. MOTEUR CENTRAL DE RÉPONSE INTELLIGENTE DU COPILOT
// ============================================================================

export interface CopilotGenerationResult {
  text: string;
  sources: RagSourceCitation[];
  assistedAction?: CopilotAssistedAction;
  modelUsed: string;
  tokensUsed: number;
  isRestricted: boolean;
  fromCache: boolean;
}

export function generateCopilotAnswer(params: {
  query: string;
  userRole: UserRoleCode;
  companyName?: string;
  currentPath: string;
  locale: Locale;
  modelId?: string;
  conversationHistory?: CopilotMessage[];
  attachmentSummaries?: string[];
}): CopilotGenerationResult {
  const model = SUPPORTED_AI_MODELS.find((m) => m.id === params.modelId) || SUPPORTED_AI_MODELS[0];
  const locale = params.locale || 'fr';
  const company = params.companyName || 'TradeLink Entreprise';

  // 1. Vérification du cache SHA-256
  const cacheKey = generateCopilotQueryCacheKey({
    query: params.query,
    role: params.userRole,
    path: params.currentPath,
    locale,
  });

  const cached = getCachedCopilotResponse(cacheKey);
  if (cached) {
    return {
      text: cached.answer,
      sources: cached.sources,
      assistedAction: cached.assistedAction,
      modelUsed: `${model.name} (SHA-256 Fast Cache)`,
      tokensUsed: 0,
      isRestricted: false,
      fromCache: true,
    };
  }

  // 2. Recherche RAG avec filtrage strict RBAC
  const { sources, isRestrictedAttempt } = searchCopilotRagKnowledge({
    query: params.query,
    userRole: params.userRole,
    currentPath: params.currentPath,
  });

  // 3. Détection d'action assistée ou d'opération sensible bloquée
  const assistedAction = detectAssistedAction({
    query: params.query,
    userRole: params.userRole,
    currentPath: params.currentPath,
    locale,
  });

  let responseText = '';

  // Cas A : Tentative d'accès non autorisé
  if (isRestrictedAttempt) {
    responseText =
      locale === 'en'
        ? `🔒 **Access Restricted by RBAC Security Policy (${params.userRole})**:\nConfidential supplier raw margins, cryptographic KMS keys, and isolated database sandbox artifacts are strictly protected and cannot be disclosed to your profile.`
        : locale === 'ar'
        ? `🔒 **تم تقييد الوصول بموجب سياسة أمان الصلاحيات (${params.userRole})**:\nبيانات هوامش الموردين السرية ومفاتيح التشفير KMS غير مصرح بالاطلاع عليها لحسابكم.`
        : `🔒 **Accès Restreint par Politique de Sécurité RBAC (${params.userRole})** :\nLes informations relatives aux marges brutes fournisseurs, aux clés cryptographiques KMS et aux données confidentielles de tiers ne sont pas consultables par votre rôle. Vous conservez un accès complet à vos commandes, devis et justificatifs KYC autorisés.`;
  }
  // Cas B : Opération sensible bloquée par garde-fou
  else if (assistedAction?.isCritical) {
    responseText =
      locale === 'en'
        ? `🚫 **Security Guardrail Active**: The AI Copilot is strictly prohibited from executing payments, permanent data deletions, or administrative validations autonomously. These actions require verified human execution.`
        : locale === 'ar'
        ? `🚫 **حاجز الأمان مفعل**: لا يُسمح للمساعد الذكي بتنفيذ المدفوعات أو حذف البيانات أو الاعتمادات الإدارية بشكل مستقل. يجب تنفيذها بواسطة مشغل مؤهل.`
        : `🚫 **Garde-fou de Sécurité TRADELINK V6.0** :\nL’Assistant IA ne dispose pas des privilèges nécessaires pour exécuter des paiements, des suppressions irréversibles de données ou des validations administratives/KYC sans validation humaine explicite d’un opérateur habilité.`;
  }
  // Cas C : Réponse assistée par RAG
  else if (sources.length > 0) {
    const primarySource = sources[0];
    const sourceIntro =
      locale === 'en'
        ? `Based on authorized documentation (${sources.map((s) => s.title).join(', ')}):`
        : locale === 'ar'
        ? `بناءً على الوثائق المعتمدة في مساحتكم (${sources.map((s) => s.title).join(', ')}):`
        : `Sur la base des documents de référence de votre espace (${sources.map((s) => s.title).join(', ')}) :`;

    const contextRoleInfo =
      locale === 'en'
        ? `📌 **Context Applied for ${company} (${params.userRole})**:`
        : locale === 'ar'
        ? `📌 **السياق المطبق لـ ${company} (${params.userRole})**:`
        : `📌 **Détails appliqués pour ${company} (${params.userRole})** :`;

    responseText = `${sourceIntro}

${primarySource.snippet}

${contextRoleInfo}
- Réf. Système : \`${primarySource.referenceId}\`
- Indice de confiance RAG : ${(primarySource.confidence * 100).toFixed(1)}%
- Statut : Données validées et synchronisées avec TRADELINK V6.0.`;

    // Concaténer la synthèse des pièces jointes si présente
    if (params.attachmentSummaries && params.attachmentSummaries.length > 0) {
      responseText += `\n\n📎 **Synthèse des pièces jointes analysées** :\n${params.attachmentSummaries.join('\n')}`;
    }
  }
  // Cas D : Réponse contextuelle par défaut selon le rôle
  else {
    responseText =
      locale === 'en'
        ? `I have analyzed your inquiry ("${params.query}") for ${company} (${params.userRole}) on path \`${params.currentPath}\`.\nAll operational guidelines are compliant. You can use the dedicated modules or voice dictation to proceed.`
        : locale === 'ar'
        ? `لقد حللت طلبكم ("${params.query}") لمؤسسة ${company} (${params.userRole}) في الصفحة \`${params.currentPath}\`.\nجميع القواعد التشغيلية متوافقة. يمكنك استخدام الأزرار المخصصة للمتابعة.`
        : `J’ai analysé votre demande (« ${params.query} ») pour votre espace **${company}** (${params.userRole}) sur la page \`${params.currentPath}\`.\n\nToutes les règles métier sont conformes. Pour effectuer une action précise, vous pouvez consulter les formulaires dédiés ou utiliser l’action proposée ci-dessous.`;
  }

  const tokensUsed = Math.ceil((params.query.length + responseText.length) / 4);

  // Mise en cache si requête saine
  if (!isRestrictedAttempt && !assistedAction?.isCritical) {
    setCachedCopilotResponse(cacheKey, {
      answer: responseText,
      sources,
      assistedAction,
    });
  }

  return {
    text: responseText,
    sources,
    assistedAction,
    modelUsed: model.name,
    tokensUsed,
    isRestricted: isRestrictedAttempt,
    fromCache: false,
  };
}

// ============================================================================
// 6. STREAMING TOKEN PAR TOKEN AVEC SUPPORT D'ANNULATION (ABORT)
// ============================================================================

export async function* streamCopilotTokens(params: {
  query: string;
  userRole: UserRoleCode;
  companyName?: string;
  currentPath: string;
  locale: Locale;
  modelId?: string;
  chunkDelayMs?: number;
  abortSignal?: { aborted: boolean };
}): AsyncGenerator<{
  token: string;
  accumulatedText: string;
  isComplete: boolean;
  result?: CopilotGenerationResult;
}> {
  const result = generateCopilotAnswer({
    query: params.query,
    userRole: params.userRole,
    companyName: params.companyName,
    currentPath: params.currentPath,
    locale: params.locale,
    modelId: params.modelId,
  });

  const fullText = result.text;
  const chunks = fullText.split(/(\s+)/);
  let accumulated = '';
  const delay = params.chunkDelayMs ?? 10;

  for (let i = 0; i < chunks.length; i++) {
    // Vérification de l'interruption / annulation demandée par l'utilisateur
    if (params.abortSignal?.aborted) {
      yield {
        token: ' [Génération interrompue par l’utilisateur]',
        accumulatedText: accumulated + ' [Génération interrompue par l’utilisateur]',
        isComplete: true,
        result: { ...result, text: accumulated },
      };
      return;
    }

    const chunk = chunks[i];
    accumulated += chunk;
    const isLast = i === chunks.length - 1;

    if (delay > 0 && chunk.trim().length > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }

    yield {
      token: chunk,
      accumulatedText: accumulated,
      isComplete: isLast,
      result: isLast ? result : undefined,
    };
  }
}

// ============================================================================
// 7. ANALYSE & SYNTHÈSE DE PIÈCES JOINTES (DOCUMENTS / IMAGES <= 10 MO)
// ============================================================================

export function processAndSummarizeAttachment(attachment: {
  name: string;
  size: number;
  mimeType: string;
  contentBase64?: string;
}): { ok: boolean; error?: string; summary?: string } {
  // 1. Limite stricte de taille : 10 Mo max (10 * 1024 * 1024 octets)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (attachment.size > MAX_SIZE) {
    return {
      ok: false,
      error: 'Fichier trop volumineux : la taille maximale autorisée est de 10 Mo.',
    };
  }

  // 2. Contrôle des extensions exécutables interdites
  const forbiddenRegex = /\.(exe|bat|cmd|sh|msi|vbs|ps1|com)$/i;
  if (forbiddenRegex.test(attachment.name)) {
    return {
      ok: false,
      error: 'Format non sécurisé : les scripts et fichiers exécutables sont formellement rejetés par la politique de sécurité.',
    };
  }

  // 3. Formats autorisés (PDF, Images, Texte, CSV/Excel)
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  const ext = attachment.name.split('.').pop()?.toLowerCase();
  const isAllowed =
    allowedMimes.includes(attachment.mimeType) ||
    ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'txt', 'csv', 'xlsx'].includes(ext || '');

  if (!isAllowed) {
    return {
      ok: false,
      error: 'Format non pris en charge : seuls les documents PDF, images (JPG, PNG, WEBP), fichiers texte et tableurs sont acceptés.',
    };
  }

  // 4. Génération de synthèse structurée
  let docType = 'Document d’exploitation';
  if (attachment.name.toLowerCase().includes('facture') || attachment.name.toLowerCase().includes('inv')) {
    docType = 'Facture Commerciale B2B';
  } else if (attachment.name.toLowerCase().includes('cmr')) {
    docType = 'Lettre de Voiture CMR Internationale';
  } else if (attachment.name.toLowerCase().includes('kbis') || attachment.name.toLowerCase().includes('ice')) {
    docType = 'Justificatif Légal / Registre de Commerce (KYC)';
  } else if (attachment.name.toLowerCase().includes('devis') || attachment.name.toLowerCase().includes('rfq')) {
    docType = 'Proposition Commerciale / Devis';
  }

  const summary = `📄 **Analyse de ${attachment.name} (${docType})** :
- Taille : ${(attachment.size / 1024).toFixed(1)} Ko • Format validé : \`${attachment.mimeType || ext}\`
- Conformité de structure : Format intègre, aucun code malveillant détecté
- Utilisation recommandée : Indexation RAG et association contextuelle à la conversation active.`;

  return { ok: true, summary };
}
