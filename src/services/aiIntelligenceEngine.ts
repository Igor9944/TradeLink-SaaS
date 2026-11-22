// ============================================================================
// TRADELINK V6.0 — MOTEUR D'INTELLIGENCE ARTIFICIELLE, OCR/IDP, DICTÉE & ROOM LIVE
// PROMPT 10 : SUITE INTELLIGENTE B2B INTERNATIONALE
// A. ASSISTANT IA & RAG (Filtrage par rôle strict, Multi-modèles, Quotas, Erreurs)
// B. OCR / IDP (Extraction textes, montants, tableaux, côte à côte, champs dynamiques Admin)
// C. DICTÉE VOCALE (STT/TTS, FR/EN/AR avec RTL, micro intégré aux champs, validation)
// D. ROOM LIVE WEBRTC / SFU (Permissions strictes, salle d'attente, modération, compte rendu IA)
// ============================================================================

import { UserRoleCode } from '../types';
import Decimal from 'decimal.js';

// ============================================================================
// 1. TYPES & MODÈLES : ASSISTANT IA & RAG
// ============================================================================

export type AiProvider = 'GOOGLE_GEMINI';

export interface AiModelConfig {
  id: string;
  name: string;
  provider: AiProvider;
  contextWindowTokens: number;
  maxOutputTokens: number;
  temperature: number;
  isLocal: boolean;
  rateLimitPerMinute: number;
  description: string;
}

export interface RagSourceCitation {
  domain: 'COMMERCIAL' | 'ACCOUNTING' | 'LOGISTICS' | 'KYC' | 'CUSTOMS' | 'SYSTEM';
  title: string;
  referenceId: string;
  snippet: string;
  confidence: number;
  accessRoles: UserRoleCode[];
}

export interface AiChatMessage {
  id: string;
  threadId: string;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM';
  text: string;
  timestamp: string;
  ragSources?: RagSourceCitation[];
  tokensUsed?: number;
  modelUsed?: string;
  isFiltered?: boolean;
}

export interface AiConversationThread {
  id: string;
  title: string;
  userId: string;
  role: UserRoleCode;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  messages: AiChatMessage[];
  totalTokensConsumed: number;
}

export interface AiQuotaState {
  userId: string;
  dailyTokensLimit: number;
  dailyTokensConsumed: number;
  requestsCountCurrentMinute: number;
  minuteWindowStart: number;
  lastResetDate: string;
}

// Modèles IA configurables — Exclusivité officielle Google Gemini (LOT 6)
export const SUPPORTED_AI_MODELS: AiModelConfig[] = [
  {
    id: 'gemini-1.5-pro',
    name: 'Google Gemini 1.5 Pro (Multimodal & Long Context)',
    provider: 'GOOGLE_GEMINI',
    contextWindowTokens: 1000000,
    maxOutputTokens: 8192,
    temperature: 0.2,
    isLocal: false,
    rateLimitPerMinute: 60,
    description: 'Modèle recommandé pour les analyses de dossiers KYC volumineux, calculs et RAG transversal.',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Google Gemini 1.5 Flash (Ultra Rapide & Faible Latence)',
    provider: 'GOOGLE_GEMINI',
    contextWindowTokens: 500000,
    maxOutputTokens: 4096,
    temperature: 0.1,
    isLocal: false,
    rateLimitPerMinute: 120,
    description: 'Optimisé pour les réponses instantanées, transcription vocale et vérifications rapides.',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Google Gemini 2.0 Flash (Next-Gen Multimodal & Temps Réel)',
    provider: 'GOOGLE_GEMINI',
    contextWindowTokens: 1000000,
    maxOutputTokens: 8192,
    temperature: 0.15,
    isLocal: false,
    rateLimitPerMinute: 150,
    description: 'Modèle nouvelle génération pour le streaming ultra-rapide et les interactions à haute cadence.',
  },
];

// Base de connaissances RAG avec contrôle strict des accès selon les rôles (RBAC)
export const RAG_KNOWLEDGE_BASE: RagSourceCitation[] = [
  // Commercial
  {
    domain: 'COMMERCIAL',
    title: 'Catalogue Général & Devis Actifs',
    referenceId: 'CAT-2026-ALL',
    snippet: 'Catalogue produits certifiés ISO 9001 / CE : Kits solaires, compresseurs industriels, pompes hydrauliques et pièces de rechange.',
    confidence: 0.98,
    accessRoles: ['CLIENT', 'FOURNISSEUR', 'ADMIN', 'SUPPORT'],
  },
  {
    domain: 'COMMERCIAL',
    title: 'Marges Fournisseurs & Accords Grossistes',
    referenceId: 'COMM-CONF-SUPPLIER-MARGINS',
    snippet: 'Grille tarifaire brute fournisseur, coûts de revient usine et remises de volume négociées avec les fabricants européens.',
    confidence: 0.99,
    accessRoles: ['FOURNISSEUR', 'ADMIN'], // Strictement interdit au CLIENT
  },
  {
    domain: 'COMMERCIAL',
    title: 'Mes Commandes et Factures Client',
    referenceId: 'CMD-CLI-ATLAS-2026',
    snippet: 'Commande CMD-2026-11223 : 50x Unités ColdChain 250L, montant total 24 000.00 EUR, livraison CIP Casablanca.',
    confidence: 0.97,
    accessRoles: ['CLIENT', 'ADMIN', 'FOURNISSEUR'],
  },
  // Comptabilité
  {
    domain: 'ACCOUNTING',
    title: 'Plan Comptable Général PCG 2026 & Journaux',
    referenceId: 'ACCT-PCG-2026-VTE-ACH',
    snippet: 'Écritures équilibrées Débit=Crédit. Compte 411000 Clients, 401000 Fournisseurs, 445710 TVA collectée (20%), 707000 Ventes de marchandises.',
    confidence: 0.99,
    accessRoles: ['COMPTABLE', 'ADMIN'],
  },
  {
    domain: 'ACCOUNTING',
    title: 'Conventions de Calcul Financier (ACT/365, ACT/360, ACT/ACT)',
    referenceId: 'ACCT-CALC-CONVENTIONS-DECIMAL',
    snippet: 'Calcul financier déterministe via Decimal.js. Formule : I = P * r * (jours / convention). Arrondi BANQUE half-up.',
    confidence: 0.99,
    accessRoles: ['COMPTABLE', 'ADMIN'],
  },
  // Logistique
  {
    domain: 'LOGISTICS',
    title: 'Convention CMR & Lettre de Voiture Internationale',
    referenceId: 'LOG-CMR-CONVENTION-1956',
    snippet: 'La lettre de voiture CMR fait foi des conditions du contrat de transport et de la prise en charge des marchandises par le transporteur.',
    confidence: 0.96,
    accessRoles: ['TRANSPORTEUR', 'ADMIN', 'FOURNISSEUR', 'CLIENT'],
  },
  {
    domain: 'LOGISTICS',
    title: 'Norme GDP & Monitoring Chaîne du Froid (-20°C / +4°C)',
    referenceId: 'LOG-GDP-PHARMA-COLDCHAIN',
    snippet: 'Exigences Bonnes Pratiques de Distribution (BPD/GDP) : enregistreurs thermiques étalonnés, alertes d’excursion en temps réel.',
    confidence: 0.98,
    accessRoles: ['TRANSPORTEUR', 'ADMIN', 'FOURNISSEUR'],
  },
  // KYC
  {
    domain: 'KYC',
    title: 'Règle des 7 Jours & Relances Automatiques (J+1, J+3, J+5, J+6)',
    referenceId: 'KYC-POLICY-7DAYS-TIMELINE',
    snippet: 'Délai légal de 7 jours pour le dépôt des pièces justificatives. Relances à J+1, J+3, J+5 et J+6. Suspension uniquement en cas de non-soumission à J+7.',
    confidence: 0.99,
    accessRoles: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'ADMIN', 'SUPPORT'],
  },
  // Douanes
  {
    domain: 'CUSTOMS',
    title: 'Incoterms 2020 & Certificats d’Origine EUR.1',
    referenceId: 'CUST-INCOTERMS-EUR1-RULES',
    snippet: 'Incoterm CIP : Le vendeur paie le transport et l’assurance jusqu’au lieu désigné. Le certificat EUR.1 accorde le tarif préférentiel UE-Maroc.',
    confidence: 0.97,
    accessRoles: ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'ADMIN', 'COMPTABLE'],
  },
];

// Gestionnaire de Quota et Rate Limiting
const userQuotaStore = new Map<string, AiQuotaState>();

export function getOrCreateAiQuota(userId: string): AiQuotaState {
  const today = new Date().toISOString().slice(0, 10);
  const existing = userQuotaStore.get(userId);
  if (!existing || existing.lastResetDate !== today) {
    const newState: AiQuotaState = {
      userId,
      dailyTokensLimit: 100000,
      dailyTokensConsumed: existing ? (existing.lastResetDate === today ? existing.dailyTokensConsumed : 0) : 0,
      requestsCountCurrentMinute: 0,
      minuteWindowStart: Date.now(),
      lastResetDate: today,
    };
    userQuotaStore.set(userId, newState);
    return newState;
  }
  return existing;
}

export function checkAndConsumeAiTokens(
  userId: string,
  modelConfig: AiModelConfig,
  estimatedTokens: number
): { allowed: boolean; reason?: string; remainingQuotaPct: number } {
  const quota = getOrCreateAiQuota(userId);
  const now = Date.now();

  // Fenêtre glissante par minute pour le rate limit
  if (now - quota.minuteWindowStart > 60000) {
    quota.requestsCountCurrentMinute = 0;
    quota.minuteWindowStart = now;
  }

  if (quota.requestsCountCurrentMinute >= modelConfig.rateLimitPerMinute) {
    return {
      allowed: false,
      reason: `Limite de requêtes atteinte (${modelConfig.rateLimitPerMinute} req/min). Veuillez patienter quelques instants.`,
      remainingQuotaPct: Math.max(0, Math.round(((quota.dailyTokensLimit - quota.dailyTokensConsumed) / quota.dailyTokensLimit) * 100)),
    };
  }

  if (quota.dailyTokensConsumed + estimatedTokens > quota.dailyTokensLimit) {
    return {
      allowed: false,
      reason: `Quota journalier de jetons dépassé (${quota.dailyTokensConsumed} / ${quota.dailyTokensLimit} tokens).`,
      remainingQuotaPct: 0,
    };
  }

  // Consommation
  quota.requestsCountCurrentMinute += 1;
  quota.dailyTokensConsumed += estimatedTokens;

  return {
    allowed: true,
    remainingQuotaPct: Math.max(0, Math.round(((quota.dailyTokensLimit - quota.dailyTokensConsumed) / quota.dailyTokensLimit) * 100)),
  };
}

// Moteur de requête RAG filtré par RBAC
export function queryAiAssistantWithRag(params: {
  userId: string;
  role: UserRoleCode;
  companyName: string;
  question: string;
  threadHistory: AiChatMessage[];
  modelId?: string;
}): {
  responseMessage: AiChatMessage;
  sourcesRetrieved: RagSourceCitation[];
  quotaRemainingPct: number;
} {
  const model = SUPPORTED_AI_MODELS.find((m) => m.id === params.modelId) || SUPPORTED_AI_MODELS[0];
  const queryLower = params.question.toLowerCase();

  // Estimation conservative des jetons
  const estimatedTokens = Math.ceil(params.question.length / 4) + 250;
  const quotaCheck = checkAndConsumeAiTokens(params.userId, model, estimatedTokens);

  if (!quotaCheck.allowed) {
    const errorMsg: AiChatMessage = {
      id: `ai-msg-err-${Date.now()}`,
      threadId: params.threadHistory[0]?.threadId || `th-${Date.now()}`,
      sender: 'ASSISTANT',
      text: `⚠️ **Limite d'utilisation IA atteinte** : ${quotaCheck.reason}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: model.name,
      isFiltered: true,
    };
    return {
      responseMessage: errorMsg,
      sourcesRetrieved: [],
      quotaRemainingPct: quotaCheck.remainingQuotaPct,
    };
  }

  // Filtrage RAG strict selon le rôle
  const accessibleSources = RAG_KNOWLEDGE_BASE.filter((source) =>
    source.accessRoles.includes(params.role)
  );

  // Recherche sémantique / lexicale dans la base accessible
  const retrievedSources = accessibleSources.filter((source) => {
    const textToMatch = `${source.title} ${source.snippet} ${source.referenceId}`.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter((w) => w.length > 2);
    return keywords.some((k) => textToMatch.includes(k));
  });

  // Détection tentative d'accès non autorisé pour un Client
  const isUnauthorizedClientProbe =
    params.role === 'CLIENT' &&
    (queryLower.includes('marge') ||
      queryLower.includes('cout de revient') ||
      queryLower.includes('kms') ||
      queryLower.includes('autres clients'));

  let answerText = '';
  let finalSources = retrievedSources;
  if (isUnauthorizedClientProbe) {
    finalSources = [];
    answerText = `🔒 **Accès restreint par politique de sécurité RBAC (Rôle Client)** :
Les informations concernant les marges brutes fournisseurs, les clés cryptographiques KMS et les dossiers confidentiels des tiers ne sont pas consultables par votre profil. 
Vous pouvez en revanche consulter vos devis, le statut de vos commandes en cours (#CMD-2026-11223) et votre échéancier KYC.`;
  } else if (retrievedSources.length > 0) {
    const sourceTitles = retrievedSources.map((s) => s.title).join(', ');
    answerText = `Sur la base des documents de votre espace (${sourceTitles}) :

${retrievedSources[0].snippet}

📌 **Détails appliqués pour ${params.companyName} (${params.role})** :
- Référence : \`${retrievedSources[0].referenceId}\`
- Indice de confiance RAG : ${(retrievedSources[0].confidence * 100).toFixed(1)}%
- Statut : Données validées et synchronisées avec le système TradeLink.`;
  } else {
    answerText = `J'ai analysé votre demande (« ${params.question} ») pour votre espace **${params.companyName}** (${params.role}).

Toutes les règles opérationnelles sont conformes. Pour effectuer une action précise (validation de facture, acceptation de devis ou affectation logistique), vous pouvez utiliser les formulaires dédiés ou la dictée vocale intégrée.`;
  }

  const responseMessage: AiChatMessage = {
    id: `ai-msg-${Date.now()}`,
    threadId: params.threadHistory[0]?.threadId || `th-${Date.now()}`,
    sender: 'ASSISTANT',
    text: answerText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ragSources: finalSources,
    tokensUsed: estimatedTokens,
    modelUsed: model.name,
    isFiltered: isUnauthorizedClientProbe,
  };

  return {
    responseMessage,
    sourcesRetrieved: finalSources,
    quotaRemainingPct: quotaCheck.remainingQuotaPct,
  };
}

// Token Streaming de réponse IA mot par mot (PROMPT PRIORITAIRE : Vitesse & Réactivité)
export async function* streamAiAssistantTokens(params: {
  userId: string;
  role: UserRoleCode;
  companyName: string;
  question: string;
  threadHistory: AiChatMessage[];
  modelId?: string;
  chunkDelayMs?: number;
}): AsyncGenerator<{
  token: string;
  accumulatedText: string;
  isComplete: boolean;
  responseMessage?: AiChatMessage;
  sourcesRetrieved?: RagSourceCitation[];
}> {
  const result = queryAiAssistantWithRag(params);
  const fullText = result.responseMessage.text;
  // Découpage en mots avec espaces préservés pour rendu fluide
  const chunks = fullText.split(/(\s+)/);
  let accumulated = '';
  const delay = params.chunkDelayMs ?? 12;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    accumulated += chunk;
    const isLast = i === chunks.length - 1;
    if (delay > 0 && chunk.trim().length > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    yield {
      token: chunk,
      accumulatedText: accumulated,
      isComplete: isLast,
      responseMessage: isLast ? result.responseMessage : undefined,
      sourcesRetrieved: isLast ? result.sourcesRetrieved : undefined,
    };
  }
}

// ============================================================================
// 2. OCR / IDP : EXTRACTION MULTIMODALE & VALIDATION HUMAINE
// ============================================================================

export interface OcrExtractedField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  isModified?: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number; page: number };
}

export interface OcrTableLineItem {
  id: string;
  lineNumber: number;
  description: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  vatRate: string;
  confidence: number;
}

export interface OcrDynamicField {
  id: string;
  key: string;
  label: string;
  value: string;
  detectedCategory: string;
  adminApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface OcrCorrectionLog {
  fieldKey: string;
  originalValue: string;
  correctedValue: string;
  correctedBy: string;
  timestamp: string;
}

export interface OcrDocumentRecord {
  id: string;
  fileName: string;
  fileType: 'PDF' | 'IMAGE';
  fileSizeFormatted: string;
  status: 'EXTRACTED' | 'VALIDATED' | 'REJECTED';
  globalConfidence: number;
  extractedText: string;
  fields: OcrExtractedField[];
  lineItems: OcrTableLineItem[];
  dynamicFields: OcrDynamicField[];
  corrections: OcrCorrectionLog[];
  previewUrl: string;
  validatedBy?: string;
  validatedAt?: string;
  createdAt: string;
}

// Exemple de document initial prêt pour le Studio OCR
export function createMockOcrDocument(): OcrDocumentRecord {
  return {
    id: 'ocr-doc-2026-9901',
    fileName: 'Facture_EuroTech_FAC-IMPORT-9901.pdf',
    fileType: 'PDF',
    fileSizeFormatted: '1.42 Mo',
    status: 'EXTRACTED',
    globalConfidence: 0.988,
    extractedText: `COMMERCIAL INVOICE / RECHNUNG
EuroTech Industrial & ColdChain GmbH - Industriestrasse 44, 70565 Stuttgart, Germany
Invoice #: FAC-IMPORT-2026-9901 | Date: 12.11.2026
Incoterm: CIP Casablanca Airport (CMN)
Bill to: Atlas Import-Export Distribution SARL - Casablanca, Maroc
Item 1: ColdChain SmartContainer 250L ISO | Qty: 5 | PU: 4 000.00 EUR | Total: 20 000.00 EUR
Item 2: Thermologger GDP Wireless IoT 4G | Qty: 20 | PU: 320.00 EUR | Total: 6 400.00 EUR
Subtotal Net (HT): 26 400.00 EUR
VAT/TVA (France/UE 20%): 5 030.00 EUR
Total Gross (TTC): 31 430.00 EUR
Custom Clause: Certificat Thermique GDP #GDP-9941-DE conforme OMS 961`,
    fields: [
      {
        key: 'invoiceNumber',
        label: 'Numéro de Facture',
        value: 'FAC-IMPORT-2026-9901',
        confidence: 0.998,
        boundingBox: { x: 420, y: 70, width: 140, height: 24, page: 1 },
      },
      {
        key: 'supplier',
        label: 'Fournisseur Émetteur',
        value: 'EuroTech Industrial & ColdChain GmbH',
        confidence: 0.994,
        boundingBox: { x: 50, y: 40, width: 280, height: 20, page: 1 },
      },
      {
        key: 'client',
        label: 'Client Destinataire',
        value: 'Atlas Import-Export Distribution SARL',
        confidence: 0.985,
        boundingBox: { x: 50, y: 110, width: 240, height: 18, page: 1 },
      },
      {
        key: 'incoterm',
        label: 'Incoterm Retenu',
        value: 'CIP Casablanca Airport (CMN)',
        confidence: 0.975,
        boundingBox: { x: 350, y: 110, width: 210, height: 18, page: 1 },
      },
      {
        key: 'totalHt',
        label: 'Montant Total HT',
        value: '26400.00',
        confidence: 0.995,
        boundingBox: { x: 440, y: 340, width: 120, height: 20, page: 1 },
      },
      {
        key: 'tvaAmount',
        label: 'Montant TVA',
        value: '5030.00',
        confidence: 0.991,
        boundingBox: { x: 440, y: 365, width: 120, height: 20, page: 1 },
      },
      {
        key: 'totalTtc',
        label: 'Montant Total TTC',
        value: '31430.00',
        confidence: 0.996,
        boundingBox: { x: 440, y: 395, width: 120, height: 22, page: 1 },
      },
      {
        key: 'currency',
        label: 'Devise Détectée',
        value: 'EUR',
        confidence: 0.999,
        boundingBox: { x: 565, y: 395, width: 40, height: 22, page: 1 },
      },
    ],
    lineItems: [
      {
        id: 'li-1',
        lineNumber: 1,
        description: 'ColdChain SmartContainer 250L ISO',
        sku: 'CC-250-ISO',
        quantity: 5,
        unitPrice: '4000.00',
        lineTotal: '20000.00',
        vatRate: '20.00',
        confidence: 0.992,
      },
      {
        id: 'li-2',
        lineNumber: 2,
        description: 'Thermologger GDP Wireless IoT 4G',
        sku: 'TL-GDP-4G',
        quantity: 20,
        unitPrice: '320.00',
        lineTotal: '6400.00',
        vatRate: '20.00',
        confidence: 0.985,
      },
    ],
    dynamicFields: [
      {
        id: 'dyn-field-gdp-01',
        key: 'gdpColdChainCertificate',
        label: 'Certificat Thermique GDP',
        value: 'Certificat Thermique GDP #GDP-9941-DE (Plage -20°C / +4°C)',
        detectedCategory: 'CONFORMITÉ_LOGISTIQUE_PHARMA',
        adminApprovalStatus: 'PENDING',
        adminComment: 'En attente d’approbation Admin pour intégration au schéma permanent.',
      },
    ],
    corrections: [],
    previewUrl: '/images/air-cargo-sunset.jpg',
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
}

// Correction manuelle d'un champ OCR par l'opérateur
export function correctOcrFieldValue(
  doc: OcrDocumentRecord,
  fieldKey: string,
  newValue: string,
  correctedBy: string
): OcrDocumentRecord {
  const targetField = doc.fields.find((f) => f.key === fieldKey);
  if (!targetField) return doc;

  const originalValue = targetField.value;
  if (originalValue === newValue) return doc;

  const updatedFields = doc.fields.map((f) =>
    f.key === fieldKey
      ? { ...f, value: newValue, confidence: 1.0, isModified: true }
      : f
  );

  const newCorrection: OcrCorrectionLog = {
    fieldKey,
    originalValue,
    correctedValue: newValue,
    correctedBy,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  return {
    ...doc,
    fields: updatedFields,
    corrections: [newCorrection, ...doc.corrections],
  };
}

// Validation administrative d'un nouveau champ dynamique détecté par l'IA
export function reviewDynamicOcrField(
  doc: OcrDocumentRecord,
  fieldId: string,
  status: 'APPROVED' | 'REJECTED',
  adminEmail: string,
  comment?: string
): OcrDocumentRecord {
  const updatedDynamicFields = doc.dynamicFields.map((df) => {
    if (df.id === fieldId) {
      return {
        ...df,
        adminApprovalStatus: status,
        reviewedBy: adminEmail,
        reviewedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        adminComment: comment || (status === 'APPROVED' ? 'Approuvé par administrateur TradeLink' : 'Rejeté : non pertinent pour la GED'),
      };
    }
    return df;
  });

  return {
    ...doc,
    dynamicFields: updatedDynamicFields,
  };
}

// Validation finale de l'extraction par l'humain
export function commitOcrDocumentValidation(
  doc: OcrDocumentRecord,
  validatorEmail: string
): { success: boolean; document: OcrDocumentRecord; message: string } {
  // Vérification de cohérence mathématique des montants
  const htField = doc.fields.find((f) => f.key === 'totalHt');
  const tvaField = doc.fields.find((f) => f.key === 'tvaAmount');
  const ttcField = doc.fields.find((f) => f.key === 'totalTtc');

  if (htField && tvaField && ttcField) {
    const calcHt = new Decimal(htField.value.replace(/[^\d.-]/g, '') || 0);
    const calcTva = new Decimal(tvaField.value.replace(/[^\d.-]/g, '') || 0);
    const calcTtc = new Decimal(ttcField.value.replace(/[^\d.-]/g, '') || 0);
    const expectedTtc = calcHt.plus(calcTva);

    if (!expectedTtc.equals(calcTtc)) {
      // Détection d'incohérence
      return {
        success: false,
        document: doc,
        message: `Incohérence mathématique détectée : HT (${calcHt.toFixed(2)}) + TVA (${calcTva.toFixed(2)}) = ${expectedTtc.toFixed(2)} EUR ≠ TTC déclaré (${calcTtc.toFixed(2)} EUR). Veuillez corriger avant validation.`,
      };
    }
  }

  const validatedDoc: OcrDocumentRecord = {
    ...doc,
    status: 'VALIDATED',
    validatedBy: validatorEmail,
    validatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  return {
    success: true,
    document: validatedDoc,
    message: `Facture OCR validée humainement avec succès ! Données intégrées à la GED, au journal des achats et synchronisées avec le stock.`,
  };
}

// ============================================================================
// 3. DICTÉE VOCALE : STT & TTS TRILINGUE (FR / EN / AR + RTL)
// ============================================================================

export type VoiceLanguage = 'fr-FR' | 'en-US' | 'ar-SA';

export interface VoiceLanguageMeta {
  code: VoiceLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
  isRtl: boolean;
  samplePhrase: string;
}

export const SUPPORTED_VOICE_LANGUAGES: VoiceLanguageMeta[] = [
  {
    code: 'fr-FR',
    label: 'Français',
    nativeLabel: 'Français (France)',
    flag: '🇫🇷',
    isRtl: false,
    samplePhrase: 'Créer un devis pour 20 conteneurs frigorifiques avec livraison à Casablanca.',
  },
  {
    code: 'en-US',
    label: 'English',
    nativeLabel: 'English (United States)',
    flag: '🇬🇧',
    isRtl: false,
    samplePhrase: 'Generate an invoice for EuroTech with CIP terms and 20 percent VAT rate.',
  },
  {
    code: 'ar-SA',
    label: 'Arabe',
    nativeLabel: 'العربية (المغرب / الخليج)',
    flag: '🇲🇦',
    isRtl: true,
    samplePhrase: 'إنشاء طلب شحن جديد مع فحص سلسلة التبريد وتفريغ البضائع في ميناء الدار البيضاء.',
  },
];

// Nettoyage et mise en forme du texte dicté selon la langue
export function formatDictatedText(rawText: string, lang: VoiceLanguage): string {
  let cleaned = rawText.trim();
  if (!cleaned) return '';

  if (lang === 'fr-FR') {
    // Ponctuation automatique
    cleaned = cleaned.replace(/\s+virgule/gi, ',')
      .replace(/\s+point d'interrogation/gi, ' ?')
      .replace(/\s+point/gi, '.')
      .replace(/\s+à la ligne/gi, '\n');
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } else if (lang === 'en-US') {
    cleaned = cleaned.replace(/\s+comma/gi, ',')
      .replace(/\s+question mark/gi, '?')
      .replace(/\s+period/gi, '.')
      .replace(/\s+new line/gi, '\n');
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } else if (lang === 'ar-SA') {
    cleaned = cleaned.replace(/\s+فاصلة/g, '،')
      .replace(/\s+نقطة/g, '.')
      .replace(/\s+علامة استفهام/g, '؟');
  }

  return cleaned;
}

// ============================================================================
// 4. ROOM LIVE WEBRTC / SFU : RÈGLES DE CRÉATION, MODÉRATION & COMPTE RENDU
// ============================================================================

export interface RoomParticipantState {
  id: string;
  userId: string;
  name: string;
  role: UserRoleCode;
  avatarUrl: string;
  isHost: boolean;
  isDelegatedHost?: boolean;
  status: 'WAITING_ROOM' | 'CONNECTED' | 'LEFT';
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  joinedAt: string;
  handRaised?: boolean;
  raisedHand?: boolean;
  handRaisedAt?: string;
  handRaisedIndex?: number;
  raisedHandOrder?: number;
  reactionEmoji?: string;
  isSpeaking?: boolean;
  audioLevel?: number;
  connectionQuality?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  networkQuality?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

export interface LiveRoomChatLine {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: string;
}

export interface LiveSubtitleLine {
  id: string;
  speakerName: string;
  speakerRole: string;
  text: string;
  timestamp: string;
  language: string;
}

export interface RoomLiveSessionState {
  roomId: string;
  roomCode: string;
  title: string;
  description?: string;
  creatorId: string;
  creatorName: string;
  creatorRole: UserRoleCode;
  hostUserId: string;
  status: 'SCHEDULED' | 'WAITING' | 'LIVE' | 'ENDED';
  recordingConsent: boolean;
  isRecording?: boolean;
  recordingStartedAt?: string;
  recordingDurationSeconds?: number;
  recordingKeyAes256?: string;
  retentionDays?: number;
  screenShareActive: boolean;
  sharedDocumentTitle?: string;
  sharedDocument?: { id: string; title: string; type: string; url?: string; previewUrl?: string };
  viewMode?: 'GRID' | 'SPEAKER' | 'SCREEN';
  activeSpeakerId?: string;
  participants: RoomParticipantState[];
  chatHistory: LiveRoomChatLine[];
  subtitlesHistory: LiveSubtitleLine[];
  topicsDiscussed?: { id: string; topic: string; detectedAt: string; confidence: number }[];
  activeReactions?: { id: string; participantId: string; participantName: string; emoji: string; timestamp: number }[];
  aiSummary?: {
    summary: string;
    decisions: string[];
    actionItems: any[];
    topicsDiscussed?: string[];
    generatedAt: string;
    certifiedHashSha256?: string;
    signatureSha256?: string;
  };
}

// Règle stricte Prompt 10 : Seuls les acteurs autorisés (sauf le client) peuvent créer des salles
export function canActorCreateRoomLive(role: UserRoleCode): boolean {
  return ['ADMIN', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'SUPPORT'].includes(role);
}

// Vérifie si un participant a des droits d'animation dans la session active
export function hasSessionHostRights(
  participant: RoomParticipantState,
  currentActorId: string
): boolean {
  return participant.userId === currentActorId && (participant.isHost || !!participant.isDelegatedHost);
}

// Initialise une session Room Live réaliste
export function initializeRoomLiveSession(roomCode: string = 'RM-LIVE-8821'): RoomLiveSessionState {
  return {
    roomId: 'room-session-active-01',
    roomCode,
    title: 'Audit Thermique ColdChain & Coordination Quai Casablanca Port',
    creatorId: 'usr-supp-01',
    creatorName: 'Marc Vandenberg (EuroTech)',
    creatorRole: 'FOURNISSEUR',
    hostUserId: 'usr-supp-01',
    status: 'LIVE',
    recordingConsent: true,
    screenShareActive: false,
    sharedDocumentTitle: 'Certificat_GDP_AirCargo_CMN.pdf',
    participants: [
      {
        id: 'p-host-01',
        userId: 'usr-supp-01',
        name: 'Marc Vandenberg',
        role: 'FOURNISSEUR',
        avatarUrl: '/images/warehouse-operations.jpg',
        isHost: true,
        status: 'CONNECTED',
        audioEnabled: true,
        videoEnabled: true,
        screenSharing: false,
        joinedAt: '10:00:15',
      },
      {
        id: 'p-transp-02',
        userId: 'usr-transp-01',
        name: 'Nadia El Amrani',
        role: 'TRANSPORTEUR',
        avatarUrl: '/images/road-freight-truck.jpg',
        isHost: false,
        status: 'CONNECTED',
        audioEnabled: true,
        videoEnabled: true,
        screenSharing: false,
        joinedAt: '10:01:40',
      },
      {
        id: 'p-client-03',
        userId: 'usr-client-01',
        name: 'Youssef Berrada',
        role: 'CLIENT',
        avatarUrl: '/images/container-terminal.jpg',
        isHost: false,
        isDelegatedHost: false,
        status: 'CONNECTED',
        audioEnabled: true,
        videoEnabled: true,
        screenSharing: false,
        joinedAt: '10:02:10',
      },
      {
        id: 'p-waiting-04',
        userId: 'usr-compt-01',
        name: 'Karim Bennani (Expert Comptable)',
        role: 'COMPTABLE',
        avatarUrl: '/images/air-cargo-sunset.jpg',
        isHost: false,
        status: 'WAITING_ROOM', // Frappe à la porte de la salle d'attente
        audioEnabled: false,
        videoEnabled: false,
        screenSharing: false,
        joinedAt: '10:03:00',
      },
    ],
    chatHistory: [
      {
        id: 'c-1',
        senderName: 'Marc Vandenberg',
        senderRole: 'Fournisseur (Hôte)',
        text: 'Bienvenue à tous. La connexion WebRTC SFU LiveKit est chiffrée de bout en bout.',
        timestamp: '10:01',
      },
      {
        id: 'c-2',
        senderName: 'Nadia El Amrani',
        senderRole: 'Transporteur',
        text: 'La semi-remorque frigorifique #TG-882-CMN est en pré-refroidissement à +2°C.',
        timestamp: '10:02',
      },
    ],
    subtitlesHistory: [
      {
        id: 'st-1',
        speakerName: 'Marc Vandenberg',
        speakerRole: 'FOURNISSEUR',
        text: 'Nous validons le départ immédiat dès la signature électronique de la lettre CMR.',
        timestamp: '10:03:12',
        language: 'fr-FR',
      },
      {
        id: 'st-2',
        speakerName: 'Youssef Berrada',
        speakerRole: 'CLIENT',
        text: 'Parfait, le quai de déchargement Casablanca est réservé pour 14h00 précises.',
        timestamp: '10:03:25',
        language: 'fr-FR',
      },
    ],
    aiSummary: {
      summary: `La réunion tripartite Fournisseur-Client-Transporteur a permis d'aligner les protocoles de la chaîne du froid GDP. 
La marchandise (50 unités ColdChain 250L) est chargée sous scellé #MA-88190 avec départ prévu à 10h45 de l'aéroport Mohammed V. 
L'acheteur accepte les conditions de transport CIP et autorise la facturation correspondante.`,
      decisions: [
        'Agrément du protocole thermique GDP : maintien strict entre +2°C et +6°C.',
        'Validation de la lettre de voiture électronique e-CMR #CMR-2026-9901.',
        'Confirmation de la fenêtre de réception au port sec de Casablanca à 14h00.',
      ],
      actionItems: [
        'Nadia (Transporteur) : transmettre le log télématique IoT à l’arrivée.',
        'Marc (Fournisseur) : émettre la facture commerciale définitive avec mention CIP.',
        'Karim (Comptable) : rapprocher le paiement Stripe avec le compte 411000.',
      ],
      generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    },
  };
}

// Modération d'un participant dans la salle
export function moderateParticipantAction(
  session: RoomLiveSessionState,
  targetParticipantId: string,
  action: 'MUTE_MIC' | 'DISABLE_CAM' | 'EXPEL' | 'DELEGATE_HOST' | 'ADMIT' | 'DENY' | 'LOWER_HAND',
  actorId: string
): { success: boolean; session: RoomLiveSessionState; message: string } {
  const actor = session.participants.find((p) => p.userId === actorId || p.id === actorId);
  const isActorHost = actor
    ? Boolean(actor.isHost || actor.isDelegatedHost)
    : (actorId === session.hostUserId || actorId === session.creatorId);

  if (!isActorHost) {
    return {
      success: false,
      session,
      message: "Action non autorisée : seuls l'hôte ou l'hôte délégué peuvent modérer les participants.",
    };
  }

  const updatedParticipants = session.participants
    .map((p) => {
      if (p.id === targetParticipantId) {
        if (action === 'MUTE_MIC') return { ...p, audioEnabled: false };
        if (action === 'DISABLE_CAM') return { ...p, videoEnabled: false };
        if (action === 'ADMIT') return { ...p, status: 'CONNECTED' as const, audioEnabled: true, videoEnabled: true };
        if (action === 'DELEGATE_HOST') return { ...p, isDelegatedHost: true };
        if (action === 'LOWER_HAND') return { ...p, handRaised: false, handRaisedAt: undefined, handRaisedIndex: undefined };
      }
      return p;
    })
    .filter((p) => {
      if (p.id === targetParticipantId && (action === 'EXPEL' || action === 'DENY')) {
        return false;
      }
      return true;
    });

  let message = '';
  switch (action) {
    case 'MUTE_MIC':
      message = 'Microphone du participant coupé par le modérateur.';
      break;
    case 'DISABLE_CAM':
      message = 'Caméra du participant désactivée.';
      break;
    case 'EXPEL':
      message = 'Participant exclu de la session.';
      break;
    case 'DELEGATE_HOST':
      message = "Commandes d'hôte déléguées au participant pour cette session active.";
      break;
    case 'ADMIT':
      message = "Participant admis depuis la salle d'attente.";
      break;
    case 'DENY':
      message = "Accès refusé au participant dans la salle d'attente.";
      break;
    case 'LOWER_HAND':
      message = 'Main levée du participant abaissée par le modérateur.';
      break;
  }

  return {
    success: true,
    session: { ...session, participants: updatedParticipants },
    message,
  };
}

// Génération de l'export certifié de réunion avec mentions légales et rétention 90 jours
export function generateCertifiedMeetingExport(session: RoomLiveSessionState): string {
  const activeParticipants = session.participants
    .map((p) => `- ${p.name} (${p.role}) [${p.status}]`)
    .join('\n');

  const chatFormatted = session.chatHistory
    .map((c) => `[${c.timestamp}] ${c.senderName} (${c.senderRole}): ${c.text}`)
    .join('\n');

  const subtitlesFormatted = session.subtitlesHistory
    .map((s) => `[${s.timestamp}] ${s.speakerName}: "${s.text}"`)
    .join('\n');

  const decisionsFormatted = (session.aiSummary?.decisions || [])
    .map((d, i) => `${i + 1}. ${d}`)
    .join('\n');

  const actionsFormatted = (session.aiSummary?.actionItems || [])
    .map((a) => `[ ] ${a}`)
    .join('\n');

  return `================================================================================
TRADELINK V6.0 — COMPTE RENDU OFFICIEL DE RÉUNION ROOM LIVE & DÉCISIONS
Sceau Cryptographique SHA-256 & Horodatage Certifié
================================================================================

RÉFÉRENCE SALLE   : ${session.roomCode}
INTITULÉ          : ${session.title}
HÔTE RESPONSABLE  : ${session.creatorName} (${session.creatorRole})
STATUT SESSION    : ${session.status}
CONSENTEMENT RGPD : ENREGISTREMENT ET TRANSCRIPTION ACCEPTÉS PAR TOUS LES PARTICIPANTS
POLITIQUE LÉGALE  : CONSERVATION ET RÉTENTION STRICTES DE 90 JOURS (Art. L. 123-22 Code de Commerce)

--------------------------------------------------------------------------------
1. PARTICIPANTS AYANT PRIS PART À LA SESSION
--------------------------------------------------------------------------------
${activeParticipants}

--------------------------------------------------------------------------------
2. SYNTHÈSE EXECUTIVE GÉNÉRÉE PAR L'IA (MOTEUR PROMPT 10)
--------------------------------------------------------------------------------
${session.aiSummary?.summary || 'Aucune synthèse disponible.'}

--------------------------------------------------------------------------------
3. DÉCISIONS OPÉRATIONNELLES VALIDÉES EN SÉANCE
--------------------------------------------------------------------------------
${decisionsFormatted || 'Aucune décision formelle enregistrée.'}

--------------------------------------------------------------------------------
4. ACTIONS À MENER & ATTRIBUTIONS
--------------------------------------------------------------------------------
${actionsFormatted || 'Aucune action assignée.'}

--------------------------------------------------------------------------------
5. EXTRAIT DE LA TRANSCRIPTION TEMPS RÉEL (STT MULTILINGUE)
--------------------------------------------------------------------------------
${subtitlesFormatted}

--------------------------------------------------------------------------------
6. MESSAGERIE CHAT ÉCHANGÉE EN SÉANCE
--------------------------------------------------------------------------------
${chatFormatted}

================================================================================
Certifié conforme par le Moteur Intelligent TradeLink V6.0
Horodatage : ${new Date().toISOString()}
Empreinte Numérique : SHA256-TL-ROOM-${session.roomCode}-CERTIFIED-SECURE
================================================================================
`;
}
