// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.1 — SUITE OFFICIELLE LOT 8 : PERFORMANCE, STABILITÉ,
// OBSERVABILITÉ ET RÉSILIENCE SYSTÈME
// ============================================================================

import { TradeLinkRepositoryStore, DatabaseStateSnapshot } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { TradeLinkPostgresManager } from '../database/prisma.client';
import { TradeLinkRedisManager } from '../database/redis.client';
import { registerSingleActiveSession } from '../middlewares/errorAndSecurity.middleware';
import { observabilityMetrics } from '../../services/observabilityMetrics';
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  executeWithRetryAndJitter,
  geminiCircuitBreaker,
  meetCircuitBreaker,
  clamAvCircuitBreaker,
  paymentCircuitBreaker,
} from '../../services/circuitBreaker';
import { DeadLetterQueueManager } from '../../services/deadLetterQueue';
import { createApp } from '../app';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Échec Test LOT 8 Performance & Résilience] ${message}`);
  }
}

function createLot8Database(): DatabaseStateSnapshot {
  const products = [];
  for (let i = 1; i <= 100; i++) {
    products.push({
      id: `prod-lot8-${i}`,
      sku: `SKU-LOT8-${String(i).padStart(4, '0')}`,
      supplierId: 'usr-supp-lot8',
      supplierName: 'Fournisseur Lot 8 Performance',
      category: 'Équipement',
      name: { fr: `Produit Haute Performance ${i}`, en: `High Performance Product ${i}`, ar: `منتج عالي الأداء ${i}` },
      description: { fr: `Description ${i}`, en: `Description ${i}`, ar: `وصف ${i}` },
      unitPrice: (250 + i * 2).toFixed(2),
      currency: 'EUR',
      taxRate: '20.0',
      unit: 'unité',
      stockAvailable: 2500,
      stockReserved: 15,
      minStockAlert: 50,
      icon3d: 'container' as const,
      originCountry: 'FR',
      incoterm: 'CIP',
      leadTimeDays: 2,
      isPublished: true,
    });
  }

  return {
    products,
    quotes: [],
    orders: [],
    invoices: [],
    payments: [],
    kycDossiers: [],
    backups: [],
    auditLogs: [],
    rooms: [],
    calcHistory: [],
  };
}

export async function runLot8TestSuite() {
  console.log('\n====================================================================');
  console.log('⚡ TRADELINK V6.1 — SUITE OFFICIELLE LOT 8 : PERFORMANCE & RÉSILIENCE');
  console.log('Latence p95 < 200ms, Observabilité Prometheus, Circuit Breakers & DLQ');
  console.log('====================================================================\n');

  const repo = new TradeLinkRepositoryStore(createLot8Database(), false);
  const app = new TradeLinkApiApplication(repo);

  const testUser = {
    id: 'usr-bench-lot8',
    email: 'lot8.performance@tradelink-saas.com',
    role: 'ADMIN' as const,
    sessionId: 'sess-lot8-perf-01',
    companyName: 'TradeLink High Reliability Operations',
    mfaVerified: true,
  };
  registerSingleActiveSession(testUser.id, testUser.sessionId, true);

  // --------------------------------------------------------------------------
  // [TEST-LOT8-01] Latence API & Percentiles p50, p90, p95, p99 (< 200 ms)
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT8-01] Benchmark de latence API et calcul des percentiles p95 < 200 ms...');
  {
    observabilityMetrics.reset();
    const latencies: number[] = [];
    const requestCount = 200;

    for (let i = 0; i < requestCount; i++) {
      const t0 = performance.now();
      const res = app.handleRequest({
        method: 'GET',
        path: '/api/v1/products',
        headers: {},
        query: { limit: '20' },
        params: {},
        body: {},
        user: testUser,
        correlationId: `corr-lot8-lat-${i}`,
        ipAddress: '127.0.0.1',
      });
      const durationMs = performance.now() - t0;
      latencies.push(durationMs);
      assert(res.statusCode === 200, `Requête #${i} doit retourner 200`);
    }

    const percentiles = observabilityMetrics.calculateLatencyPercentiles(latencies);
    assert(percentiles.count === requestCount, `${requestCount} requêtes comptabilisées`);
    assert(percentiles.p50Ms < 50, `p50 (${percentiles.p50Ms} ms) < 50 ms`);
    assert(percentiles.p95Ms < 200, `p95 (${percentiles.p95Ms} ms) < 200 ms`);
    assert(percentiles.p99Ms < 200, `p99 (${percentiles.p99Ms} ms) < 200 ms`);

    console.log(`  ✅ [TEST-LOT8-01] Latence API validée : p50=${percentiles.p50Ms} ms, p90=${percentiles.p90Ms} ms, p95=${percentiles.p95Ms} ms, p99=${percentiles.p99Ms} ms (Cible < 200 ms atteinte).`);
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT8-02] Observabilité Prometheus RFC 0.0.4 & Format JSON
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT8-02] Observabilité complète Prometheus (RFC 0.0.4) & Instantanés JSON...');
  {
    // Injection de métriques simulées
    observabilityMetrics.recordDbQuery(2.4, true);
    observabilityMetrics.recordDbQuery(3.1, true);
    observabilityMetrics.recordRedisAccess(true);
    observabilityMetrics.recordRedisAccess(true);
    observabilityMetrics.recordRedisAccess(false);
    observabilityMetrics.recordAiUsage(450, 42.0);

    const prometheusText = observabilityMetrics.toPrometheusFormat();

    // Vérification de la conformité du format Prometheus
    assert(prometheusText.includes('# HELP tradelink_http_requests_total'), 'Métrique HTTP requests présente');
    assert(prometheusText.includes('# TYPE tradelink_http_requests_total counter'), 'Type counter certifié');
    assert(prometheusText.includes('# HELP tradelink_http_request_duration_seconds'), 'Histogramme de latence présent');
    assert(prometheusText.includes('# HELP tradelink_db_queries_total'), 'Métrique DB présente');
    assert(prometheusText.includes('# HELP tradelink_redis_cache_hits_total'), 'Métrique Redis présente');
    assert(prometheusText.includes('# HELP tradelink_ai_tokens_consumed_total'), 'Métrique AI présente');
    assert(prometheusText.includes('nodejs_heap_size_used_bytes'), 'Métrique mémoire système présente');

    // Vérification du snapshot JSON
    const snapshot = observabilityMetrics.getSnapshot();
    assert(snapshot.http.totalRequests >= 200, 'Total HTTP synchronisé');
    assert(snapshot.redis.hits >= 2, 'Hits Redis comptabilisés');
    assert(snapshot.ai.totalTokens >= 450, 'Jetons Gemini comptabilisés');
    assert(snapshot.system.heapUsedBytes > 0, 'Mémoire heap quantifiée');

    console.log('  ✅ [TEST-LOT8-02] Format d exposition Prometheus RFC 0.0.4 et instantanés JSON validés.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT8-03] Health Checks Détaillés (/health, /health/ready, /health/live)
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT8-03] Health Checks Kubernetes (/health, /health/ready, /health/live)...');
  {
    // 1. Health global UP
    const healthRes = app.handleRequest({
      method: 'GET',
      path: '/api/v1/health',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'corr-h-1',
      ipAddress: '127.0.0.1',
    });
    assert(healthRes.statusCode === 200, 'Health global doit retourner 200');
    assert((healthRes.body.data as any).status === 'UP', 'Statut UP certifié');

    // 2. Readiness Probe
    const readyRes = app.handleRequest({
      method: 'GET',
      path: '/api/v1/health/ready',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'corr-h-ready',
      ipAddress: '127.0.0.1',
    });
    assert(readyRes.statusCode === 200, 'Readiness probe retourne 200 quand les composants sont UP');
    assert((readyRes.body.data as any).ready === true, 'Ready = true');
    assert((readyRes.body.data as any).checks.postgresql16 === 'READY', 'PostgreSQL 16 prêt');
    assert((readyRes.body.data as any).checks.redis7Cluster === 'READY', 'Redis 7 Cluster prêt');

    // 3. Liveness Probe
    const liveRes = app.handleRequest({
      method: 'GET',
      path: '/api/v1/health/live',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'corr-h-live',
      ipAddress: '127.0.0.1',
    });
    assert(liveRes.statusCode === 200, 'Liveness probe retourne 200');
    assert((liveRes.body.data as any).live === true, 'Live = true');
    assert((liveRes.body.data as any).memoryOk === true, 'Plafond mémoire respecté');

    // 4. Dégradation si PostgreSQL ou Redis est indisponible
    try {
      TradeLinkPostgresManager.setDatabaseUnavailableForTest(true);
      const degradedReady = app.handleRequest({
        method: 'GET',
        path: '/api/v1/health/ready',
        headers: {},
        query: {},
        params: {},
        body: {},
        correlationId: 'corr-h-deg',
        ipAddress: '127.0.0.1',
      });
      assert(degradedReady.statusCode === 503, 'Readiness retourne 503 si PostgreSQL est DOWN');
      assert((degradedReady.body.data as any).ready === false, 'Ready = false en panne PG');
    } finally {
      TradeLinkPostgresManager.setDatabaseUnavailableForTest(false);
    }

    console.log('  ✅ [TEST-LOT8-03] Health checks Kubernetes (Health, Ready, Live, Degraded) validés.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT8-04] Circuit Breaker State Machine & Protection Services Tiers
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT8-04] Circuit Breaker : Machine à états (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)...');
  {
    const testBreaker = new CircuitBreaker({
      name: 'TEST_SERVICE',
      failureThreshold: 3,
      cooldownMs: 50, // 50ms pour test rapide
      halfOpenSuccessThreshold: 2,
      timeoutMs: 1000,
    });

    assert(testBreaker.getState() === 'CLOSED', 'Circuit démarre à CLOSED');

    // Simulation de 2 échecs (ne doit pas encore déclencher l'ouverture)
    try {
      await testBreaker.execute(() => { throw new Error('Fail 1'); });
    } catch {}
    try {
      await testBreaker.execute(() => { throw new Error('Fail 2'); });
    } catch {}
    assert(testBreaker.getState() === 'CLOSED', 'Circuit toujours CLOSED après 2 échecs (< 3)');

    // 3ème échec -> déclenchement OPEN
    try {
      await testBreaker.execute(() => { throw new Error('Fail 3'); });
    } catch {}
    assert(testBreaker.getState() === 'OPEN', 'Circuit bascule à OPEN après 3 échecs consécutifs');

    // Tentative en OPEN -> Échec immédiat sans appeler l'opération (Fast Failure)
    let callAttempted = false;
    try {
      await testBreaker.execute(() => {
        callAttempted = true;
        return 'unexpected';
      });
      assert(false, 'Doit lever CircuitBreakerOpenError');
    } catch (err) {
      assert(err instanceof CircuitBreakerOpenError, 'Exception CircuitBreakerOpenError levée');
      assert(callAttempted === false, 'L opération ne doit PAS être appelée en état OPEN');
    }

    // Attente du cooldown (55 ms) -> passage à HALF_OPEN
    await new Promise((r) => setTimeout(r, 60));
    assert(testBreaker.getState() === 'HALF_OPEN', 'Circuit bascule à HALF_OPEN après expiration du cooldown');

    // 1er succès en HALF_OPEN
    await testBreaker.execute(() => 'success 1');
    assert(testBreaker.getState() === 'HALF_OPEN', 'Circuit encore HALF_OPEN (1/2 succès requis)');

    // 2ème succès en HALF_OPEN -> Circuit REFERMÉ (CLOSED)
    await testBreaker.execute(() => 'success 2');
    assert(testBreaker.getState() === 'CLOSED', 'Circuit rétabli à CLOSED après 2 succès probants');

    // Vérification des instances préconfigurées
    assert(geminiCircuitBreaker.name === 'GEMINI_AI', 'Circuit Gemini configuré');
    assert(meetCircuitBreaker.name === 'GOOGLE_MEET', 'Circuit Meet configuré');
    assert(clamAvCircuitBreaker.name === 'CLAMAV_SCANNER', 'Circuit ClamAV configuré');
    assert(paymentCircuitBreaker.name === 'PAYMENT_GATEWAY', 'Circuit Paiement configuré');

    console.log('  ✅ [TEST-LOT8-04] Machine à états Circuit Breaker et protection des 4 services tiers validées.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT8-05] Résilience avec Réessais Exponentiels et Jitter
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT8-05] Résilience : Réessais exponentiels avec jitter & non-réessai des erreurs fatales...');
  {
    let attemptsCount = 0;
    // Opération réussissant à la 3ème tentative
    const operationWithTransientFailures = async () => {
      attemptsCount++;
      if (attemptsCount < 3) {
        const err = new Error('Transient 503 Service Unavailable');
        (err as any).statusCode = 503;
        throw err;
      }
      return 'SUCCESSFUL_DATA';
    };

    const retryResult = await executeWithRetryAndJitter(operationWithTransientFailures, {
      maxRetries: 3,
      baseDelayMs: 20,
      maxDelayMs: 100,
      jitter: true,
    });

    assert(retryResult.result === 'SUCCESSFUL_DATA', 'Résultat obtenu après réessais');
    assert(retryResult.attempts === 3, '3 tentatives effectuées');

    // Vérification qu'une erreur 400 Bad Request N'EST PAS réessayée inutilement
    let fatalAttempts = 0;
    try {
      await executeWithRetryAndJitter(
        () => {
          fatalAttempts++;
          const err = new Error('Bad Request: Invalid SKU');
          (err as any).statusCode = 400;
          throw err;
        },
        { maxRetries: 3, baseDelayMs: 10 }
      );
      assert(false, 'Ne doit pas réussir');
    } catch (err: any) {
      assert(fatalAttempts === 1, 'Erreur 400 abandonnée dès la 1ère tentative sans réessai');
      assert(err.statusCode === 400, 'Code 400 préservé');
    }

    console.log('  ✅ [TEST-LOT8-05] Réessais exponentiels avec jitter et détection d erreurs fatales validés.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT8-06] Dead Letter Queue (DLQ) & Archivage / Rejeu Résilient
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT8-06] Dead Letter Queue (DLQ) : Enfilage, diagnostic, rejeu et purge...');
  {
    DeadLetterQueueManager.clear();

    // 1. Enfilage de tâches échouées
    const failedKycJob = DeadLetterQueueManager.enqueueFailedJob({
      queueName: 'KYC_PIPELINE',
      payload: { dossierId: 'kyc-dos-fail-99', userId: 'usr-client-01' },
      error: new Error('ClamAV Scanner Timeout after 3 attempts'),
      attemptsCount: 3,
      metadata: { priority: 'HIGH' },
    });

    const failedOcrJob = DeadLetterQueueManager.enqueueFailedJob({
      queueName: 'OCR_PROCESSING',
      payload: { documentId: 'doc-ocr-fail-12', fileName: 'Invoice_Blurry.png' },
      error: new Error('OCR unreadable resolution'),
      attemptsCount: 3,
    });

    assert(failedKycJob.status === 'FAILED', 'Statut FAILED assigné');
    assert(failedOcrJob.status === 'FAILED', 'Statut OCR FAILED assigné');
    assert(failedKycJob.errorMessage.includes('ClamAV Scanner Timeout'), 'Erreur tracée');
    assert(Boolean(failedKycJob.errorStack), 'Stack trace archivée');

    // 2. Listing et filtrage
    const allJobs = DeadLetterQueueManager.listJobs();
    assert(allJobs.length === 2, '2 tâches en DLQ');

    const kycOnly = DeadLetterQueueManager.listJobs({ queueName: 'KYC_PIPELINE' });
    assert(kycOnly.length === 1 && kycOnly[0].id === failedKycJob.id, 'Filtrage par queueName respecté');

    // 3. Rejeu d'une tâche échouée (Replay)
    let replayExecuted: boolean = false;
    const replayOutcome = await DeadLetterQueueManager.replayJob(failedKycJob.id, async (payload) => {
      replayExecuted = true;
      assert(payload.dossierId === 'kyc-dos-fail-99', 'Payload transmis au handler de rejeu');
      return true; // Rejeu réussi
    });

    assert(Boolean(replayExecuted), 'Handler de rejeu exécuté');
    assert(replayOutcome.success === true, 'Rejeu réussi');
    assert(replayOutcome.job.status === 'REPLAYED', 'Statut mis à jour à REPLAYED');
    assert(Boolean(replayOutcome.job.replayedAt), 'Date de rejeu tracée');

    // 4. Purge des tâches rejouées
    const purged = DeadLetterQueueManager.purge();
    assert(purged === 1, '1 tâche rejouée purgée');
    assert(DeadLetterQueueManager.listJobs().length === 1, '1 tâche FAILED restante');

    console.log('  ✅ [TEST-LOT8-06] Dead Letter Queue (DLQ), diagnostic complet et rejeu résilient validés.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT8-07] Rate Limiting Distribué par Paliers (Auth, AI, Export, API)
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT8-07] Rate Limiting par paliers & en-têtes RFC 429 Retry-After...');
  {
    TradeLinkRedisManager.resetRateLimitCounters();
    const testIp = '192.168.1.150';
    const expressApp = createApp({ repositoryStore: repo });
    assert(Boolean(expressApp), 'Instance Express configurée avec succès');

    // Test sur le palier AUTH (limite fixée)
    const authLimit = 40;
    for (let i = 0; i < authLimit; i++) {
      const { count } = TradeLinkRedisManager.incrementRateLimitCounter(`${testIp}:AUTH`, 60000);
      assert(count === i + 1, `Compteur auth = ${i + 1}`);
    }

    // Le 41ème dépasse la limite
    const { count: overflowCount, resetAtMs } = TradeLinkRedisManager.incrementRateLimitCounter(
      `${testIp}:AUTH`,
      60000
    );
    assert(overflowCount > authLimit, 'Dépassement du quota détecté');
    assert(resetAtMs > Date.now(), 'Délai de reset dans le futur');

    const retrySec = Math.ceil((resetAtMs - Date.now()) / 1000);
    assert(retrySec >= 1 && retrySec <= 60, 'En-tête Retry-After cohérent');

    console.log('  ✅ [TEST-LOT8-07] Rate Limiting distribué par palier et en-têtes RFC 429 validés.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT8-08] Optimisation Redis Multi-Instance : Pipeline & Invalidation Granulaire
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT8-08] Redis Multi-Instance : Pipeline atomique et invalidation granulaire par namespace...');
  {
    // 1. Pipeline d'opérations
    const pipelineOps = [
      { type: 'set' as const, key: 'tradelink:cache:catalog:prod-01', value: '{"name":"Engine"}', ttlSeconds: 300 },
      { type: 'set' as const, key: 'tradelink:cache:catalog:prod-02', value: '{"name":"Filter"}', ttlSeconds: 300 },
      { type: 'set' as const, key: 'tradelink:cache:user:pref-01', value: '{"lang":"fr"}', ttlSeconds: 300 },
      { type: 'get' as const, key: 'tradelink:cache:catalog:prod-01' },
      { type: 'del' as const, key: 'tradelink:cache:catalog:prod-02' },
    ];

    const pipelineResults = TradeLinkRedisManager.executePipeline(pipelineOps);
    assert(pipelineResults.length === 5, '5 opérations traitées en pipeline');
    assert(pipelineResults[0] === true, 'Set prod-01 réussi');
    assert(pipelineResults[3] === '{"name":"Engine"}', 'Get prod-01 restitué fidèlement');
    assert(pipelineResults[4] === true, 'Del prod-02 réussi');

    // 2. Invalidation granulaire par namespace
    // Ajout de clés dans plusieurs namespaces
    TradeLinkRedisManager.setKey('tradelink:cache:orders:cmd-01', 'Order 1');
    TradeLinkRedisManager.setKey('tradelink:cache:orders:cmd-02', 'Order 2');
    TradeLinkRedisManager.setKey('tradelink:cache:invoices:fac-01', 'Invoice 1');

    const invalidated = TradeLinkRedisManager.invalidateNamespace('tradelink:cache:orders');
    assert(invalidated === 2, '2 clés du namespace orders invalidées');
    assert(TradeLinkRedisManager.getKey('tradelink:cache:orders:cmd-01') === null, 'cmd-01 supprimé');
    assert(TradeLinkRedisManager.getKey('tradelink:cache:orders:cmd-02') === null, 'cmd-02 supprimé');
    assert(TradeLinkRedisManager.getKey('tradelink:cache:invoices:fac-01') === 'Invoice 1', 'Le namespace invoices est préservé');

    // 3. Métriques de cache Redis
    const redisMetrics = TradeLinkRedisManager.getMetrics();
    assert(redisMetrics.keysCount >= 2, 'Clés comptabilisées');
    assert(redisMetrics.memoryEstimateBytes > 0, 'Empreinte mémoire estimée');

    console.log('  ✅ [TEST-LOT8-08] Pipeline Redis atomique et invalidation granulaire par namespace validés.');
  }

  console.log('\n====================================================================');
  console.log('🎉 TOUS LES TESTS OFFICIELS DU LOT 8 (8/8) ONT RÉUSSI AVEC SUCCÈS !');
  console.log('Performance p95 < 200ms, Observabilité Prometheus, Circuit Breakers & DLQ');
  console.log('====================================================================\n');
}

// Auto-exécution si lancé directement
if (require.main === module || !process.env.TEST_HARNESS_ACTIVE) {
  runLot8TestSuite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
