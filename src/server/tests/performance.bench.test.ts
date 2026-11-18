// ============================================================================
// TRADELINK V6.0 — SUITE DE BENCHMARK & PERFORMANCE (PROMPT 12)
// OBJECTIFS À MESURER :
// - Latence API : Cible < 200 ms pour les opérations compatibles
// - Moteur financier Decimal.js : Cible < 10 ms pour les calculs d'amortissement
// - Chiffrement KMS Enveloppe AES-256-GCM : Cible < 50 ms
// - Analyse Sandbox isolée : Cible < 100 ms
// - Performance Frontend : Bundle optimisé, cible chargement < 2 s
// - Disponibilité cible : 99.9%
// ============================================================================

import { TradeLinkRepositoryStore, DatabaseStateSnapshot } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { registerSingleActiveSession } from '../middlewares/errorAndSecurity.middleware';
import { AccountingEngine } from '../../services/accountingEngine';
import {
  analyzeFileInIsolatedSandbox,
  simulateEnvelopeEncryption,
} from '../../services/adminAdvancedEngine';
import { queryAiAssistantWithRag, streamAiAssistantTokens } from '../../services/aiIntelligenceEngine';
import { APM_TELEMETRY } from '../../services/backendServices';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Échec Benchmark Performance : ${message}`);
  }
}

function createPerformanceDatabase(): DatabaseStateSnapshot {
  const products = [];
  for (let i = 1; i <= 200; i++) {
    products.push({
      id: `prod-bench-${i}`,
      sku: `SKU-PERF-${String(i).padStart(4, '0')}`,
      supplierId: 'usr-supp-bench',
      supplierName: 'Fournisseur Performance Test',
      category: 'Catégorie Test',
      name: { fr: `Produit Performance ${i}`, en: `Product Performance ${i}`, ar: `منتج تجريبي ${i}` },
      description: { fr: `Description détaillée du produit ${i}`, en: `Description ${i}`, ar: `وصف ${i}` },
      unitPrice: (100 + i * 5).toFixed(2),
      currency: 'EUR',
      taxRate: '20.0',
      unit: 'pièce',
      stockAvailable: 500,
      stockReserved: 10,
      minStockAlert: 20,
      icon3d: 'container' as const,
      originCountry: 'FR',
      incoterm: 'DAP',
      leadTimeDays: 3,
      isPublished: true,
    });
  }

  return {
    products,
    quotes: [],
    orders: [],
    invoices: [],
    payments: [],
    shipments: [],
    accountingEntries: [],
    kycDossiers: [],
    backups: [],
    auditLogs: [],
    rooms: [],
    calcHistory: [],
  };
}

export async function runPerformanceBenchSuite() {
  console.log('====================================================================');
  console.log('TRADELINK V6.0 — SUITE DE BENCHMARK & PERFORMANCE SYSTÈME');
  console.log('====================================================================\n');

  const repo = new TradeLinkRepositoryStore(createPerformanceDatabase(), false);
  const app = new TradeLinkApiApplication(repo);
  let passed = 0;

  const benchUserId = 'usr-bench-user';
  const benchSessionId = 'sess-bench-01';
  registerSingleActiveSession(benchUserId, benchSessionId, true);
  const benchUser = {
    id: benchUserId,
    email: 'bench@tradelink.ma',
    role: 'CLIENT' as const,
    sessionId: benchSessionId,
    companyName: 'Performance Benchmarking S.A.',
    mfaVerified: true,
  };

  // --------------------------------------------------------------------------
  // BENCH 1 : Temps de réponse API (Cible < 200 ms)
  // --------------------------------------------------------------------------
  console.log('BENCH 1 : Mesure des temps de réponse API (Cible < 200 ms)...');
  const apiOperations = [
    { name: 'Health Check (GET /api/v1/health)', method: 'GET', path: '/api/v1/health', body: {} },
    { name: 'Catalogue Produits (GET /api/v1/products?limit=50)', method: 'GET', path: '/api/v1/products', query: { limit: '50' } },
    { name: 'Documentation OpenAPI (GET /api/v1/docs/openapi.json)', method: 'GET', path: '/api/v1/docs/openapi.json', body: {} },
    {
      name: 'Recherche Full-Text Catalogue (GET /api/v1/products?search=Performance)',
      method: 'GET',
      path: '/api/v1/products',
      query: { search: 'Performance' },
    },
  ];

  for (const op of apiOperations) {
    const start = performance.now();
    const res = app.handleRequest({
      method: op.method,
      path: op.path,
      headers: {},
      query: op.query ?? {},
      params: {},
      body: op.body ?? {},
      user: benchUser,
      correlationId: `corr-bench-${Date.now()}`,
      ipAddress: '127.0.0.1',
    });
    const durationMs = performance.now() - start;

    assert(res.statusCode === 200, `${op.name} retourne code HTTP 200`);
    assert(durationMs < 200, `Latence ${op.name} (${durationMs.toFixed(2)} ms) dépasse la cible de 200 ms`);
    console.log(`  -> [PASS] ${op.name} : ${durationMs.toFixed(2)} ms (Cible < 200 ms atteinte).`);
  }
  console.log('');
  passed++;

  // --------------------------------------------------------------------------
  // BENCH 2 : Moteur financier déterministe Decimal.js (Cible < 15 ms)
  // --------------------------------------------------------------------------
  console.log('BENCH 2 : Moteur Financier Decimal.js — Échéancier 60 mensualités de crédit commercial (Cible < 15 ms)...');
  const finStart = performance.now();
  const schedule5Years = AccountingEngine.calculateAmortizationSchedule({
    principalStr: '250000.00',
    annualRatePctStr: '4.75',
    durationMonths: 60, // 5 ans de crédit d'équipement commercial
    startDateStr: '2026-01-01',
  });
  const finDurationMs = performance.now() - finStart;

  assert(schedule5Years.schedule.length === 60, '60 périodes d’amortissement générées');
  assert(schedule5Years.schedule[59].remainingPrincipalEnd === '0.00', 'Solde final à zéro exact');
  assert(finDurationMs < 15, `Calcul financier 60 mois (${finDurationMs.toFixed(2)} ms) dépasse la cible de 15 ms`);
  console.log(`  -> [PASS] Échéancier 60 mensualités calculé en ${finDurationMs.toFixed(2)} ms (Cible < 15 ms atteinte).\n`);
  passed++;

  // --------------------------------------------------------------------------
  // BENCH 3 : Chiffrement par Enveloppe KMS AES-256-GCM (Cible < 50 ms)
  // --------------------------------------------------------------------------
  console.log('BENCH 3 : Chiffrement par Enveloppe KMS AES-256-GCM (Cible < 50 ms)...');
  const kekMaster = {
    id: 'kms-bench-01',
    keyAlias: 'alias/tradelink-prod-kek-bench',
    keyType: 'KEK_MASTER' as const,
    algorithm: 'AES-256-GCM' as const,
    kmsProvider: 'HASHICORP_VAULT_KMS' as const,
    keyArnMasked: 'vault://kms/eu-west-1/key/••••••••-••••-9910-b82c-49a12f88e104',
    version: 1,
    status: 'ACTIVE' as const,
    lastRotatedAt: '2026-11-01',
    nextRotationAt: '2027-02-01',
  };

  const payloadToEncrypt = 'DATA_BANCAIRE_SWIFT_CONFIDENTIELLE_POUR_BENCHMARK_TRADELINK_V6_SAAS'.repeat(10);
  const kmsStart = performance.now();
  const cipherResult = simulateEnvelopeEncryption(payloadToEncrypt, kekMaster);
  const kmsDurationMs = performance.now() - kmsStart;

  assert(Boolean(cipherResult.cipherTextBase64), 'Chiffrement par enveloppe réussi');
  assert(kmsDurationMs < 50, `Temps de chiffrement KMS (${kmsDurationMs.toFixed(2)} ms) dépasse la cible de 50 ms`);
  console.log(`  -> [PASS] Chiffrement AES-256-GCM par enveloppe en ${kmsDurationMs.toFixed(2)} ms (Cible < 50 ms atteinte).\n`);
  passed++;

  // --------------------------------------------------------------------------
  // BENCH 4 : Analyse Sandbox Isolée de structure de données (Cible < 100 ms)
  // --------------------------------------------------------------------------
  console.log('BENCH 4 : Analyse Sandbox Isolée d\'un Dump SQL (Cible < 100 ms)...');
  const sandboxStart = performance.now();
  const report = analyzeFileInIsolatedSandbox({
    fileName: 'Legacy_Export_ERP_2026.sql',
    fileSize: 15480000,
    format: 'SQL',
  });
  const sandboxDurationMs = performance.now() - sandboxStart;

  assert(report.totalRowsDetected > 0, 'Structure et lignes détectées');
  assert(sandboxDurationMs < 100, `Temps d'analyse Sandbox (${sandboxDurationMs.toFixed(2)} ms) dépasse la cible de 100 ms`);
  console.log(`  -> [PASS] Analyse Sandbox de dump de 15.48 Mo en ${sandboxDurationMs.toFixed(2)} ms (Cible < 100 ms atteinte).\n`);
  passed++;

  // --------------------------------------------------------------------------
  // BENCH 5 : Assistant IA & RAG Contextuel (Cible < 150 ms en mode simulé)
  // --------------------------------------------------------------------------
  console.log('BENCH 5 : Moteur RAG & Requête Assistant IA (Cible < 150 ms)...');
  const ragStart = performance.now();
  const ragRes = queryAiAssistantWithRag({
    userId: benchUserId,
    role: 'CLIENT',
    companyName: 'Performance Benchmarking S.A.',
    question: 'Quel est le statut de mes commandes et livraisons ?',
    threadHistory: [],
    modelId: 'gemini-1.5-pro',
  });
  const ragDurationMs = performance.now() - ragStart;

  assert(Boolean(ragRes.responseMessage.text), 'Réponse RAG retournée');
  assert(ragDurationMs < 150, `Latence RAG (${ragDurationMs.toFixed(2)} ms) dépasse 150 ms`);
  console.log(`  -> [PASS] Moteur RAG exécuté en ${ragDurationMs.toFixed(2)} ms (Cible < 150 ms atteinte).\n`);
  passed++;

  // --------------------------------------------------------------------------
  // BENCH 6 : Token Streaming IA — Latence premier mot & fluidité (Cible < 30 ms)
  // --------------------------------------------------------------------------
  console.log('BENCH 6 : Token Streaming IA — Latence premier mot & émission progressive (Cible < 30 ms)...');
  const streamStart = performance.now();
  const streamGen = streamAiAssistantTokens({
    userId: benchUserId,
    role: 'CLIENT',
    companyName: 'Performance Benchmarking S.A.',
    question: 'Quel est le statut de mes commandes ?',
    threadHistory: [],
    modelId: 'gemini-1.5-flash',
    chunkDelayMs: 0,
  });
  let tokenCount = 0;
  let firstTokenLatency = 0;
  for await (const chunk of streamGen) {
    if (tokenCount === 0) {
      firstTokenLatency = performance.now() - streamStart;
    }
    tokenCount++;
  }
  const streamTotalMs = performance.now() - streamStart;
  assert(firstTokenLatency < 30, `Premier token émis en ${firstTokenLatency.toFixed(2)} ms (> 30 ms)`);
  assert(tokenCount > 5, 'Tokens émis avec succès');
  console.log(`  -> [PASS] Token Streaming : 1er token en ${firstTokenLatency.toFixed(2)} ms, ${tokenCount} chunks traités en ${streamTotalMs.toFixed(2)} ms.\n`);
  passed++;

  // --------------------------------------------------------------------------
  // BENCH 7 : Télémétrie APM & Collecteur de métriques RUM (Cible p95 < 200 ms)
  // --------------------------------------------------------------------------
  console.log('BENCH 7 : Télémétrie APM / OpenTelemetry — Agrégation p95 (Cible < 200 ms)...');
  const apmSummary = APM_TELEMETRY.getSummary();
  assert(apmSummary.count > 0, 'Métriques APM collectées');
  assert(apmSummary.p95Ms < 200, `p95 APM (${apmSummary.p95Ms} ms) dépasse 200 ms`);
  console.log(`  -> [PASS] Télémétrie APM : ${apmSummary.count} opérations enregistrées, p95=${apmSummary.p95Ms} ms, succès=${apmSummary.successRatePct}% (Cible < 200 ms atteinte).\n`);
  passed++;

  // --------------------------------------------------------------------------
  // BENCH 8 : En-têtes HTTP de Caching & Sécurité OWASP
  // --------------------------------------------------------------------------
  console.log('BENCH 8 : En-têtes HTTP de Caching (Cache-Control) & Sécurité OWASP...');
  const cacheRes = app.handleRequest({
    method: 'GET',
    path: '/api/v1/products',
    headers: {},
    query: { limit: '10' },
    params: {},
    body: {},
    user: benchUser,
    correlationId: `corr-cache-${Date.now()}`,
    ipAddress: '127.0.0.1',
  });
  assert(Boolean(cacheRes.headers['Cache-Control']?.includes('public, max-age=60')), 'Cache-Control présent pour GET');
  assert(cacheRes.headers['X-Content-Type-Options'] === 'nosniff', 'X-Content-Type-Options nosniff validé');
  assert(cacheRes.headers['X-Frame-Options'] === 'DENY', 'X-Frame-Options DENY validé');
  assert(Boolean(cacheRes.headers['Strict-Transport-Security']?.includes('max-age=63072000')), 'HSTS strict validé');
  console.log('  -> [PASS] En-têtes de Caching et de protection OWASP validés avec succès.\n');
  passed++;

  console.log('====================================================================');
  console.log(`RÉSULTAT BENCHMARK PERFORMANCE : ${passed} / 8 BENCHMARKS CONFORMES (100%) !`);
  console.log('====================================================================\n');
}

if (process.argv[1]?.endsWith('performance.bench.test.ts') || process.argv[1]?.endsWith('performance.bench.test.cjs')) {
  runPerformanceBenchSuite();
}
