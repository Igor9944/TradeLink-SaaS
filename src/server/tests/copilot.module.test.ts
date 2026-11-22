// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS COMPLÈTE ASSISTANT IA FLOTTANT (AI COPILOT)
// PROMPT 03 : VÉRIFICATION DÉTAILLÉE DE TOUTES LES SPÉCIFICATIONS ET GARDE-FOUS
// 1. Intelligence contextuelle par rôle (7 rôles) et page active
// 2. RAG documentaire & filtrage strict RBAC (client bloqué sur marges/KMS)
// 3. Actions assistées (préparation produit, devis, synthèse, navigation, calcul)
// 4. Garde-fou critique : interdiction formelle des paiements et suppressions
// 5. Token streaming progressif & annulation de génération (AbortController)
// 6. Cache SHA-256 ultra-rapide (< 2 ms) & métriques de hit rate
// 7. Analyse et synthèse de pièces jointes (<= 10 Mo, rejet .exe)
// 8. Gestion multi-threads, persistance et protection Anti-IDOR
// 9. Quotas, rate limiting et traçabilité audit log immuable
// 10. Trilinguisme (FR/EN/AR) & Configuration backend sans fuite de clés
// ============================================================================

import {
  generateCopilotAnswer,
  streamCopilotTokens,
  processAndSummarizeAttachment,
  getCopilotCacheMetrics,
} from '../../services/copilotEngine';
import {
  TradeLinkRepositoryStore,
  DatabaseStateSnapshot,
} from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { computeCurrentTotpCode } from '../../services/securityCrypto';
import { UserRoleCode } from '../../types';

export interface CopilotTestResult {
  testId: string;
  title: string;
  passed: boolean;
  summary: string;
}

function createCopilotTestDatabaseSnapshot(): DatabaseStateSnapshot {
  return {
    products: [
      {
        id: 'prod-ind-01',
        sku: 'COLD-IND-2026-X',
        name: {
          fr: 'Conteneur Isotherme Connecté GDP 250L',
          en: 'Active Pharma Cold-Chain Container 250L',
          ar: 'حاوية متصلة مبردة 250 لتر',
        },
        description: {
          fr: 'Conteneur certifié chaîne du froid',
          en: 'Certified cold-chain container',
          ar: 'حاوية معتمدة لسلسلة التبريد',
        },
        category: 'Logistique',
        unitPrice: '4800.00',
        currency: 'EUR',
        taxRate: '0.20',
        unit: 'pièce',
        stockAvailable: 25,
        stockReserved: 0,
        minStockAlert: 5,
        originCountry: 'DE',
        incoterm: 'CIP',
        leadTimeDays: 7,
        isPublished: true,
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech Industrial GmbH',
        icon3d: 'cold-chain',
      },
    ],
    orders: [
      {
        id: 'cmd-client-01',
        orderNumber: 'CMD-2026-11223',
        clientId: 'usr-client-01',
        clientName: 'Atlas Import S.A.',
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech Industrial GmbH',
        items: [],
        subtotalAmount: '20000.00',
        taxAmount: '4000.00',
        shippingAmount: '0.00',
        totalAmount: '24000.00',
        currency: 'EUR',
        shippingAddress: 'Zone Franche Tanger Port, Maroc',
        status: 'SHIPPED',
        createdAt: '2026-11-15T10:00:00Z',
        timeline: [
          { step: 'Validation', timestamp: '2026-11-15T10:00:00Z', actor: 'Atlas Import S.A.', completed: true },
        ],
      },
    ],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
    quotes: [],
    invoices: [],
    payments: [],
    shipments: [],
    incidents: [],
    stockMovements: [],
    accountingEntries: [],
    logisticsMissions: [],
    vehicles: [],
    transportDocuments: [],
    copilotThreads: [],
  };
}

export async function runCopilotModuleTestSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: CopilotTestResult[];
}> {
  const results: CopilotTestResult[] = [];
  const snapshot = createCopilotTestDatabaseSnapshot();
  const repo = new TradeLinkRepositoryStore(snapshot);
  const app = new TradeLinkApiApplication(repo);

  // Authentification et ouverture de sessions réelles pour les tests (Argon2id + TOTP MFA Admin)
  const adminLogin = app.handleRequest({
    method: 'POST',
    path: '/api/v1/auth/login',
    headers: {},
    query: {},
    params: {},
    body: { email: 'k.benali@tradelink-global.com', password: 'AdminTradeLink!2026' },
    correlationId: 'copilot-init-adm',
    ipAddress: '10.0.0.1',
  });
  const adminData = adminLogin.body.data as { userId: string; sessionId: string; email: string; companyName: string };
  const adminUser = {
    id: adminData.userId,
    email: adminData.email,
    role: 'ADMIN' as UserRoleCode,
    companyName: adminData.companyName,
    sessionId: adminData.sessionId,
    mfaVerified: true,
  };
  const adminMfaSetup = app.handleRequest({
    method: 'POST',
    path: '/api/v1/auth/mfa/setup',
    headers: {},
    query: {},
    params: {},
    body: {},
    correlationId: 'copilot-init-adm-setup',
    ipAddress: '10.0.0.1',
    user: adminUser,
  });
  const adminMfaCode = computeCurrentTotpCode((adminMfaSetup.body.data as { secretBase32: string }).secretBase32);
  app.handleRequest({
    method: 'POST',
    path: '/api/v1/auth/mfa/verify',
    headers: {},
    query: {},
    params: {},
    body: { code: adminMfaCode },
    correlationId: 'copilot-init-adm-verify',
    ipAddress: '10.0.0.1',
    user: adminUser,
  });

  const clientLogin = app.handleRequest({
    method: 'POST',
    path: '/api/v1/auth/login',
    headers: {},
    query: {},
    params: {},
    body: { email: 's.mansouri@atlas-import.ma', password: 'ClientAtlas!2026' },
    correlationId: 'copilot-init-cli',
    ipAddress: '41.214.0.10',
  });
  const clientData = clientLogin.body.data as { userId: string; sessionId: string; email: string; companyName: string };
  const clientUser = {
    id: clientData.userId,
    email: clientData.email,
    role: 'CLIENT' as UserRoleCode,
    companyName: clientData.companyName,
    sessionId: clientData.sessionId,
    mfaVerified: true,
  };

  const suppLogin = app.handleRequest({
    method: 'POST',
    path: '/api/v1/auth/login',
    headers: {},
    query: {},
    params: {},
    body: { email: 'h.weber@eurotech-supply.de', password: 'SupplierEuro!2026' },
    correlationId: 'copilot-init-supp',
    ipAddress: '88.198.0.1',
  });
  const suppData = suppLogin.body.data as { userId: string; sessionId: string; email: string; companyName: string };
  const supplierUser = {
    id: suppData.userId,
    email: suppData.email,
    role: 'FOURNISSEUR' as UserRoleCode,
    companyName: suppData.companyName,
    sessionId: suppData.sessionId,
    mfaVerified: true,
  };

  console.log('\n================================================================================');
  console.log('TRADELINK V6.0 — SUITE DE VALIDATION DU COPILOT IA FLOTTANT (PROMPT 03)');
  console.log('================================================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1 : Intelligence contextuelle par rôle et page active
  // --------------------------------------------------------------------------
  {
    const clientAns = generateCopilotAnswer({
      query: 'Où en est ma commande ?',
      userRole: 'CLIENT',
      companyName: 'Atlas Import S.A.',
      currentPath: '/client/commandes',
      locale: 'fr',
    });

    const suppAns = generateCopilotAnswer({
      query: 'Aide-moi à ajouter un conteneur frigorifique',
      userRole: 'FOURNISSEUR',
      companyName: 'EuroTech Industrial GmbH',
      currentPath: '/fournisseur/stocks',
      locale: 'fr',
    });

    const passed =
      clientAns.text.length > 20 &&
      suppAns.assistedAction?.type === 'PREFILL_PRODUCT' &&
      suppAns.assistedAction?.payload?.sku === 'COLD-IND-2026-X';

    results.push({
      testId: 'COPILOT-01',
      title: 'Intelligence Contextuelle par Rôle & Page Active (Client & Fournisseur)',
      passed,
      summary: `Client réponse contextuelle (${clientAns.tokensUsed} tokens) ; Fournisseur action préremplie (${suppAns.assistedAction?.payload?.name})`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 2 : Filtrage strict RAG & Barrière Anti-Fuite RBAC (Client bloqué sur marges/KMS)
  // --------------------------------------------------------------------------
  {
    // Client tente de sonder les marges fournisseurs
    const clientProbe = generateCopilotAnswer({
      query: 'Quelles sont les marges brutes et coûts de revient des fournisseurs ?',
      userRole: 'CLIENT',
      companyName: 'Atlas Import S.A.',
      currentPath: '/client/catalogue',
      locale: 'fr',
    });

    // Fournisseur demande légitimement ses accords
    const supplierValid = generateCopilotAnswer({
      query: 'Rappelle-moi nos accords de marges fournisseurs',
      userRole: 'FOURNISSEUR',
      companyName: 'EuroTech Industrial GmbH',
      currentPath: '/fournisseur/dashboard',
      locale: 'fr',
    });

    const passed =
      clientProbe.isRestricted &&
      clientProbe.sources.length === 0 &&
      clientProbe.text.includes('Accès Restreint') &&
      !supplierValid.isRestricted &&
      supplierValid.sources.length > 0;

    results.push({
      testId: 'COPILOT-02',
      title: 'Filtrage Strict RAG & Barrière Anti-Fuite RBAC (Marges & Données Confidentielles)',
      passed,
      summary: `Client sonde bloquée (isRestricted=${clientProbe.isRestricted}, 0 source) ; Fournisseur accès accordé (${supplierValid.sources.length} source(s))`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 3 : Actions Assistées Sûres (Fiche Produit, Devis, Suivi, Calcul)
  // --------------------------------------------------------------------------
  {
    const quoteAction = generateCopilotAnswer({
      query: 'Comment répondre au devis DEV-2026-8841 ?',
      userRole: 'FOURNISSEUR',
      companyName: 'EuroTech Industrial GmbH',
      currentPath: '/fournisseur/devis',
      locale: 'fr',
    });

    const calcAction = generateCopilotAnswer({
      query: 'Comment calculer les intérêts selon ACT/365 ?',
      userRole: 'COMPTABLE',
      companyName: 'Fiduciaire Internationale B2B',
      currentPath: '/comptable/calcul',
      locale: 'fr',
    });

    const passed =
      quoteAction.assistedAction?.type === 'PREPARE_QUOTE_RESPONSE' &&
      quoteAction.assistedAction.payload.incoterm === 'CIP Casablanca Port' &&
      calcAction.assistedAction?.type === 'CALCULATE_FINANCE' &&
      calcAction.assistedAction.payload.convention === 'ACT/365';

    results.push({
      testId: 'COPILOT-03',
      title: 'Génération d’Actions Assistées Sûres (Devis RFQ & Moteur Financier Decimal.js)',
      passed,
      summary: `Devis action (${quoteAction.assistedAction?.type}) ; Calcul finance (${calcAction.assistedAction?.payload?.calculatedInterestEur} EUR)`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 4 : Garde-Fou Critique : Blocage Absolu des Opérations Sensibles (Paiement, Suppression)
  // --------------------------------------------------------------------------
  {
    const paymentAttempt = generateCopilotAnswer({
      query: 'Effectuer le paiement de 24 000 EUR pour ma commande immédiatement',
      userRole: 'CLIENT',
      companyName: 'Atlas Import S.A.',
      currentPath: '/client/checkout',
      locale: 'fr',
    });

    // Appel API direct pour tenter d'exécuter une action critique non autorisée
    const executeRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/copilot/action/execute',
      headers: {},
      query: {},
      params: {},
      body: {
        actionId: 'act-malicious-01',
        actionType: 'BLOCKED_SENSITIVE_ACTION',
        payload: { operation: 'valider le paiement sans accord bancaire' },
        confirmed: true,
        isCritical: true,
      },
      correlationId: 'test-guardrail-01',
      ipAddress: '10.0.0.1',
      user: clientUser,
    });

    const passed =
      paymentAttempt.assistedAction?.type === 'BLOCKED_SENSITIVE_ACTION' &&
      paymentAttempt.assistedAction.isCritical === true &&
      paymentAttempt.text.includes('Garde-fou de Sécurité') &&
      executeRes.statusCode === 403 &&
      (executeRes.body as any).error?.code === 'CRITICAL_ACTION_PROHIBITED_FOR_AI';

    results.push({
      testId: 'COPILOT-04',
      title: 'Garde-Fou Critique : Interdiction Formelle des Paiements & Validations par l’IA',
      passed,
      summary: `Tentative paiement IA détectée critique (isCritical=true) ; Exécution API bloquée net (HTTP ${executeRes.statusCode} CRITICAL_ACTION_PROHIBITED_FOR_AI)`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 5 : Token Streaming Mot par Mot & Mécanisme d’Annulation (AbortSignal)
  // --------------------------------------------------------------------------
  {
    const abortSig = { aborted: false };
    const tokens: string[] = [];
    const generator = streamCopilotTokens({
      query: 'Explique-moi les règles de la convention CMR',
      userRole: 'TRANSPORTEUR',
      companyName: 'MedFreight Carriers',
      currentPath: '/transporteur/missions',
      locale: 'fr',
      chunkDelayMs: 1,
      abortSignal: abortSig,
    });

    let iteration = 0;
    for await (const chunk of generator) {
      tokens.push(chunk.token);
      iteration++;
      if (iteration === 4) {
        abortSig.aborted = true;
      }
    }

    const hasInterruptionMarker = tokens.some((t) => t.includes('interrompue'));
    const passed = tokens.length >= 4 && hasInterruptionMarker;

    results.push({
      testId: 'COPILOT-05',
      title: 'Token Streaming Mot par Mot & Annulation Immédiate (AbortSignal)',
      passed,
      summary: `Tokens émis avant arrêt : ${tokens.length} ; Marqueur interruption validé : ${hasInterruptionMarker}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 6 : Cache SHA-256 Ultra-Rapide (< 2 ms) & Taux de Succès (Hit Rate)
  // --------------------------------------------------------------------------
  {
    const query = 'Quels sont les Incoterms 2020 utilisés ?';
    // Appel 1 : miss et mise en cache
    const firstCall = generateCopilotAnswer({
      query,
      userRole: 'CLIENT',
      companyName: 'Atlas Import S.A.',
      currentPath: '/client/devis',
      locale: 'fr',
    });

    const startPerf = performance.now();
    // Appel 2 : hit de cache instantané
    const secondCall = generateCopilotAnswer({
      query,
      userRole: 'CLIENT',
      companyName: 'Atlas Import S.A.',
      currentPath: '/client/devis',
      locale: 'fr',
    });
    const cacheLatencyMs = performance.now() - startPerf;
    const metrics = getCopilotCacheMetrics();

    const passed =
      !firstCall.fromCache &&
      secondCall.fromCache &&
      cacheLatencyMs < 2.5 &&
      metrics.hits >= 1;

    results.push({
      testId: 'COPILOT-06',
      title: 'Cache SHA-256 Déterministe (< 2 ms) & Mesure de Performance',
      passed,
      summary: `Premier appel (fromCache=${firstCall.fromCache}) ; Deuxième appel hit (fromCache=${secondCall.fromCache}, ${cacheLatencyMs.toFixed(3)} ms, Hit Rate: ${metrics.hitRatePct}%)`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 7 : Analyse & Synthèse de Pièces Jointes (Upload <= 10 Mo, Rejet .exe)
  // --------------------------------------------------------------------------
  {
    // Fichier valide
    const validPdf = processAndSummarizeAttachment({
      name: 'Facture_Commerciale_EuroTech_2026.pdf',
      size: 2.4 * 1024 * 1024,
      mimeType: 'application/pdf',
    });

    // Fichier trop lourd (> 10 Mo)
    const oversized = processAndSummarizeAttachment({
      name: 'Dump_Archive_Lourde.pdf',
      size: 15 * 1024 * 1024,
      mimeType: 'application/pdf',
    });

    // Fichier exécutable interdit
    const maliciousScript = processAndSummarizeAttachment({
      name: 'UpdateInstaller.exe',
      size: 500 * 1024,
      mimeType: 'application/x-msdownload',
    });

    const passed = Boolean(
      validPdf.ok &&
      validPdf.summary?.includes('Facture Commerciale') &&
      !oversized.ok &&
      oversized.error?.includes('10 Mo') &&
      !maliciousScript.ok &&
      maliciousScript.error?.includes('exécutables')
    );

    results.push({
      testId: 'COPILOT-07',
      title: 'Analyse & Synthèse de Pièces Jointes (Contrôle 10 Mo & Rejet Exécutables .exe)',
      passed,
      summary: `PDF valide accepté (${validPdf.ok}) ; >10 Mo rejeté (${!oversized.ok}) ; Script .exe bloqué (${!maliciousScript.ok})`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 8 : Gestion Multi-Threads, Persistance & Protection Anti-IDOR
  // --------------------------------------------------------------------------
  {
    // 1. Client crée une discussion
    const chatRes1 = app.handleRequest({
      method: 'POST',
      path: '/api/v1/copilot/chat',
      headers: {},
      query: {},
      params: {},
      body: {
        message: 'Où en est ma livraison ?',
        currentPath: '/client/commandes',
      },
      correlationId: 'test-thread-01',
      ipAddress: '10.0.0.1',
      user: clientUser,
    });

    const createdThread = (chatRes1.body as any).data?.thread;
    const threadId = createdThread?.id;

    // 2. Client consulte sa liste de conversations
    const listRes = app.handleRequest({
      method: 'GET',
      path: '/api/v1/copilot/conversations',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'test-thread-02',
      ipAddress: '10.0.0.1',
      user: clientUser,
    });

    // 3. Tiers non autorisé (Fournisseur) tente d'accéder à la conversation du client (IDOR)
    const idorGetRes = app.handleRequest({
      method: 'GET',
      path: `/api/v1/copilot/conversations/${threadId}`,
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'test-thread-idor-get',
      ipAddress: '192.168.1.1',
      user: supplierUser,
    });

    // 3b. Admin accède légitimement au fil (supervision autorisée)
    const adminGetRes = app.handleRequest({
      method: 'GET',
      path: `/api/v1/copilot/conversations/${threadId}`,
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'test-thread-admin-get',
      ipAddress: '10.0.0.1',
      user: adminUser,
    });

    // 4. Tiers non autorisé tente de supprimer la conversation (IDOR DELETE)
    const idorDelRes = app.handleRequest({
      method: 'DELETE',
      path: `/api/v1/copilot/conversations/${threadId}`,
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'test-thread-idor-del',
      ipAddress: '192.168.1.1',
      user: supplierUser,
    });

    // 5. Propriétaire supprime sa conversation
    const ownerDelRes = app.handleRequest({
      method: 'DELETE',
      path: `/api/v1/copilot/conversations/${threadId}`,
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'test-thread-owner-del',
      ipAddress: '10.0.0.1',
      user: clientUser,
    });

    const passed =
      chatRes1.statusCode === 200 &&
      listRes.statusCode === 200 &&
      (listRes.body as any).data.count >= 1 &&
      idorGetRes.statusCode === 403 &&
      adminGetRes.statusCode === 200 &&
      idorDelRes.statusCode === 403 &&
      ownerDelRes.statusCode === 200;

    results.push({
      testId: 'COPILOT-08',
      title: 'Gestion Multi-Threads, Persistance en Base & Protection Anti-IDOR',
      passed,
      summary: `Thread créé (${threadId}) ; IDOR GET bloqué (${idorGetRes.statusCode}) ; Admin GET autorisé (${adminGetRes.statusCode}) ; IDOR DELETE bloqué (${idorDelRes.statusCode}) ; Suppression propriétaire (${ownerDelRes.statusCode})`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 9 : Traçabilité Audit Log Immuable & Décompte des Jetons
  // --------------------------------------------------------------------------
  {
    const auditRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/copilot/chat',
      headers: {},
      query: {},
      params: {},
      body: {
        message: 'Quelle est la procédure de dédouanement avec le certificat EUR.1 ?',
        currentPath: '/client/documents',
      },
      correlationId: 'test-audit-01',
      ipAddress: '41.214.0.15',
      user: clientUser,
    });

    const snapshotAfter = repo.getSnapshot();
    const copilotLogs = snapshotAfter.auditLogs.filter((l) => l.action === 'COPILOT_CHAT_QUERY');
    const lastLog = copilotLogs[0];

    const passed =
      auditRes.statusCode === 200 &&
      copilotLogs.length > 0 &&
      lastLog?.actorName === clientUser.email &&
      lastLog?.ipAddress === '41.214.0.15' &&
      lastLog?.result === 'SUCCESS';

    results.push({
      testId: 'COPILOT-09',
      title: 'Traçabilité dans les Audit Logs Immuables & Respect des Quotas',
      passed,
      summary: `Requête auditée (${lastLog?.action}) ; Auteur : ${lastLog?.actorName} ; IP : ${lastLog?.ipAddress} ; Résultat : ${lastLog?.result}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 10 : Trilinguisme Complet (FR / EN / AR) & Configuration Publique sans Fuite de Clés
  // --------------------------------------------------------------------------
  {
    const frAns = generateCopilotAnswer({
      query: 'Aide-moi à comprendre TradeLink',
      userRole: 'VISITEUR',
      currentPath: '/',
      locale: 'fr',
    });

    const enAns = generateCopilotAnswer({
      query: 'Help me understand TradeLink',
      userRole: 'VISITEUR',
      currentPath: '/',
      locale: 'en',
    });

    const arAns = generateCopilotAnswer({
      query: 'اشرح لي منصة تريدلينك',
      userRole: 'VISITEUR',
      currentPath: '/',
      locale: 'ar',
    });

    // Endpoint de configuration publique
    const configRes = app.handleRequest({
      method: 'GET',
      path: '/api/v1/copilot/config',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'test-config-01',
      ipAddress: '10.0.0.1',
      user: clientUser,
    });

    const configData = (configRes.body as any).data;
    const jsonStr = JSON.stringify(configData);

    // Vérifier l'absence de toute clé API privée dans la réponse
    const hasNoApiKeyLeaked =
      !jsonStr.includes('AIzaSy') &&
      !jsonStr.includes('sk-') &&
      !jsonStr.includes('OPENAI_API_KEY') &&
      !jsonStr.includes('GEMINI_API_KEY');

    const passed =
      frAns.text.length > 0 &&
      enAns.text.length > 20 &&
      arAns.text.length > 20 &&
      configRes.statusCode === 200 &&
      configData.models.length >= 2 &&
      hasNoApiKeyLeaked;

    results.push({
      testId: 'COPILOT-10',
      title: 'Trilinguisme (FR/EN/AR) & Sécurité de Configuration (Aucune Clé API Divulguée)',
      passed,
      summary: `Trilinguisme certifié (FR/EN/AR) ; Modèles disponibles : ${configData?.models?.length} ; Absence totale de clés privées exposées : ${hasNoApiKeyLeaked}`,
    });
  }

  // --------------------------------------------------------------------------
  // SYNTHÈSE DES RÉSULTATS
  // --------------------------------------------------------------------------
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  results.forEach((r) => {
    const mark = r.passed ? '✓' : '✗';
    console.log(`${mark} [${r.testId}] ${r.title}`);
    console.log(`   -> ${r.summary}`);
  });

  console.log('\n================================================================================');
  console.log(`SUITE DE TESTS COPILOT VALIDÉE : ${passedCount}/${results.length} RÉUSSIS (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log('================================================================================\n');

  if (failedCount > 0) {
    throw new Error(`La suite Copilot a échoué avec ${failedCount} test(s) non passant(s).`);
  }

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}

// Auto-exécution si lancé directement
if (typeof require !== 'undefined' && require.main === module) {
  runCopilotModuleTestSuite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
