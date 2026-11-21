// ============================================================================
// TRADELINK V6.1 — SUITE DE TESTS LOT 2 : POSTGRESQL 16, PRISMA & REDIS 7
// Missions 2.1, 2.2, 2.3, 2.4 & 2.5 :
// 1. Connexion PostgreSQL 16 (68 tables), synchronisation relationnelle & SQL direct
// 2. Persistance réelle après arrêt et redémarrage complet d'une nouvelle instance serveur
// 3. Transactions ACID, contraintes d'intégrité et rollbacks sur erreur
// 4. Redis 7 : TTL, compteurs atomiques, verrous distribués (SET NX PX)
// 5. Architecture Multi-Instances (2 serveurs Express distincts partageant sessions,
//    révocations Single Active Session, révocations JWT JTI et Rate Limiting)
// 6. Gestion des indisponibilités PostgreSQL / Redis et sondes /api/v1/health (503 -> 200)
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createApp } from '../app';
import { TradeLinkRepositoryStore, DatabaseStateSnapshot } from '../repositories/domain.repositories';
import { TradeLinkPostgresManager } from '../database/prisma.client';
import { TradeLinkRedisManager } from '../database/redis.client';
import {
  signJwtAccessToken,
  revokeJwtAccessTokenByJti,
  verifyJwtAccessToken,
} from '../../services/securityCrypto';
import { registerSingleActiveSession } from '../middlewares/errorAndSecurity.middleware';

function httpRequestJson(params: {
  port: number;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = params.body ? JSON.stringify(params.body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: params.port,
        method: params.method,
        path: params.path,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': String(Buffer.byteLength(payload)) } : {}),
          ...(params.headers ?? {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode ?? 500,
              headers: res.headers,
              body: raw ? JSON.parse(raw) : {},
            });
          } catch {
            resolve({
              statusCode: res.statusCode ?? 500,
              headers: res.headers,
              body: raw,
            });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runLot2PostgresRedisPersistenceTests() {
  console.log('================================================================================');
  console.log('🗄️  TRADELINK V6.1 — DÉMARRAGE SUITE DE TESTS LOT 2 (POSTGRESQL 16 & REDIS 7)');
  console.log('================================================================================\n');

  const tempPersistFile = path.join(process.cwd(), 'dist', '.lot2-test-persistence.json');
  if (fs.existsSync(tempPersistFile)) {
    fs.unlinkSync(tempPersistFile);
  }

  try {
    // ========================================================================
    // TEST 1 (MISSIONS 2.1 & 2.2) : PERSISTANCE POSTGRESQL 16 & SURVIE AU REDÉMARRAGE
    // ========================================================================
    console.log('🔹 [LOT2-01] Persistance PostgreSQL 16 (68 tables) & Survie après redémarrage serveur...');
    {
      const pgHealth = await TradeLinkPostgresManager.checkPostgresHealth();
      assert.strictEqual(pgHealth.status, 'UP');
      assert.strictEqual(pgHealth.tablesCount, 68, 'Les 68 tables Prisma doivent être actives dans PostgreSQL 16');

      const initialSnapshot: DatabaseStateSnapshot = {
        products: [
          {
            id: 'prod-pg-lot2-01',
            sku: 'SKU-PG16-LOT2-001',
            supplierId: 'usr-supp-01',
            supplierName: 'EuroTech Industrial GmbH',
            name: {
              fr: 'Turbine Industrielle Haute Pression V6',
              en: 'High Pressure Industrial Turbine V6',
              ar: 'توربين صناعي عالي الضغط',
            },
            description: {
              fr: 'Turbine industrielle haute performance',
              en: 'High performance industrial turbine',
              ar: 'توربين صناعي عالي الأداء',
            },
            category: 'MACHINERY',
            unitPrice: '14500.0000',
            currency: 'EUR',
            taxRate: '20.0000',
            unit: 'UNIT',
            stockAvailable: 25,
            stockReserved: 0,
            minStockAlert: 5,
            icon3d: 'pallet-load',
            originCountry: 'DE',
            incoterm: 'CIP',
            leadTimeDays: 7,
            isPublished: true,
          },
        ],
        orders: [
          {
            id: 'ord-pg-lot2-01',
            orderNumber: 'CMD-2026-PG16-01',
            clientId: 'usr-client-01',
            clientName: 'Atlas Import & Distribution SARL',
            supplierId: 'usr-supp-01',
            supplierName: 'EuroTech Industrial GmbH',
            status: 'CONFIRMED',
            subtotalAmount: '14500.0000',
            taxAmount: '2900.0000',
            shippingAmount: '0.0000',
            totalAmount: '17400.0000',
            currency: 'EUR',
            createdAt: '2026-11-21',
            shippingAddress: 'Port Tanger Med Zone Franche',
            items: [],
            timeline: [],
          },
        ],
        kycDossiers: [
          {
            id: 'kyc-pg-lot2-01',
            userId: 'usr-client-01',
            userName: 'Sofia Mansouri',
            companyName: 'Atlas Import & Distribution SARL',
            actorType: 'CLIENT',
            jurisdiction: 'MA',
            status: 'VALIDATED',
            startedAt: '2026-11-18',
            deadlineAt: '2026-11-25',
            submittedAt: '2026-11-20',
            daysElapsed: 2,
            daysRemaining: 5,
            remindersSent: [],
            documents: [],
          },
        ],
        backups: [],
        rooms: [],
        calcHistory: [],
        auditLogs: [
          {
            id: 'aud-pg-lot2-01',
            timestamp: '2026-11-21 21:30:00',
            actorName: 'k.benali@tradelink-global.com',
            actorRole: 'ADMIN',
            action: 'LOT2_POSTGRES_SYNC_INIT',
            targetType: 'Database',
            targetId: 'pg16-main',
            result: 'SUCCESS',
            correlationId: 'corr-lot2-01',
            ipAddress: '127.0.0.1',
            details: 'Synchronisation initiale PostgreSQL 16 Lot 2.',
          },
        ],
      };

      // Instance Serveur 1 : écriture transactionnelle + synchronisation SQL PostgreSQL 16
      const repoInstance1 = new TradeLinkRepositoryStore(initialSnapshot, true, {
        persistenceFilePath: tempPersistFile,
        autoLoadFromDisk: false,
      });

      repoInstance1.executeTransaction((tx) => {
        tx.products.push({
          id: 'prod-pg-lot2-02',
          sku: 'SKU-PG16-LOT2-002',
          supplierId: 'usr-supp-01',
          supplierName: 'EuroTech Industrial GmbH',
          name: {
            fr: 'Compresseur Frigorifique ATP',
            en: 'ATP Refrigerated Compressor',
            ar: 'ضاغط تبريد صناعي',
          },
          description: {
            fr: 'Compresseur chaîne du froid certifié ATP',
            en: 'ATP certified cold chain compressor',
            ar: 'ضاغط سلسلة التبريد المعتمد',
          },
          category: 'COLD_CHAIN',
          unitPrice: '8900.0000',
          currency: 'EUR',
          taxRate: '20.0000',
          unit: 'UNIT',
          stockAvailable: 12,
          stockReserved: 0,
          minStockAlert: 3,
          icon3d: 'cold-chain',
          originCountry: 'DE',
          incoterm: 'CIP',
          leadTimeDays: 5,
          isPublished: true,
        });
      });

      const syncStats = await repoInstance1.syncToPostgresRelationalTables();
      assert.ok(syncStats.totalRowsSynced >= 7, 'Les lignes métiers doivent être insérées dans PostgreSQL 16');

      // Vérification directe par requête SQL sur les tables relationnelles PostgreSQL 16
      const pg = await TradeLinkPostgresManager.getOrInitPostgres16Engine();
      const sqlProducts = await pg.query<{ id: string; sku: string; unitPrice: string }>(
        `SELECT "id", "sku", "unitPrice"::text FROM "Product" WHERE "id" IN ('prod-pg-lot2-01', 'prod-pg-lot2-02') ORDER BY "id";`
      );
      assert.strictEqual(sqlProducts.rows.length, 2, 'Les 2 produits sont stockés dans la table SQL "Product"');
      assert.strictEqual(sqlProducts.rows[0].sku, 'SKU-PG16-LOT2-001');
      assert.strictEqual(sqlProducts.rows[1].sku, 'SKU-PG16-LOT2-002');

      const sqlOrders = await pg.query<{ id: string; orderNumber: string; totalAmount: string }>(
        `SELECT "id", "orderNumber", "totalAmount"::text FROM "Order" WHERE "id" = 'ord-pg-lot2-01';`
      );
      assert.strictEqual(sqlOrders.rows.length, 1, 'La commande est stockée dans la table SQL "Order"');
      assert.strictEqual(sqlOrders.rows[0].orderNumber, 'CMD-2026-PG16-01');

      // Simulation d'un REDÉMARRAGE SERVEUR : création d'une Instance 2 vierge qui recharge depuis PostgreSQL / disque
      const emptySnapshot: DatabaseStateSnapshot = {
        products: [],
        orders: [],
        kycDossiers: [],
        backups: [],
        rooms: [],
        calcHistory: [],
        auditLogs: [],
      };
      const repoInstance2AfterRestart = new TradeLinkRepositoryStore(emptySnapshot, true, {
        persistenceFilePath: tempPersistFile,
        autoLoadFromDisk: true,
      });

      const restoredProd1 = repoInstance2AfterRestart.findActiveProductById('prod-pg-lot2-01');
      const restoredProd2 = repoInstance2AfterRestart.findActiveProductById('prod-pg-lot2-02');
      assert.ok(restoredProd1 && restoredProd2, 'Les produits ont survécu au redémarrage du serveur');
      assert.strictEqual(restoredProd2!.sku, 'SKU-PG16-LOT2-002');

      const restoredOrders = repoInstance2AfterRestart.getActiveOrdersForActor('usr-client-01', 'CLIENT', {
        page: 1,
        limit: 10,
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      assert.strictEqual(restoredOrders.totalItems, 1, 'La commande client a survécu au redémarrage du serveur');

      console.log('  ✅ [LOT2-01] Persistance relationnelle PostgreSQL 16 et restauration après redémarrage validées.');
    }

    // ========================================================================
    // TEST 2 (MISSION 2.1 & 2.5) : TRANSACTIONS ACID & ROLLBACK AUTOMATIQUE
    // ========================================================================
    console.log('🔹 [LOT2-02] Transactions ACID PostgreSQL 16 & Rollback intégral sur erreur...');
    {
      const pg = await TradeLinkPostgresManager.getOrInitPostgres16Engine();
      const countBeforeRes = await pg.query<{ cnt: string }>(`SELECT COUNT(*)::text AS cnt FROM "Product";`);
      const countBefore = Number(countBeforeRes.rows[0].cnt);

      let txFailedAsExpected = false;
      try {
        await TradeLinkPostgresManager.executeSqlTransaction(async (txPg) => {
          await txPg.query(
            `INSERT INTO "Product" ("id", "supplierId", "sku", "category", "unitPrice", "currency", "stockAvailable", "updatedAt")
             VALUES ('prod-tx-abort', 'usr-supp-01', 'SKU-TX-ABORT', 'TEST', '500.0000', 'EUR', 10, CURRENT_TIMESTAMP);`
          );
          // Violation volontaire de clé étrangère sur supplierId inexistant -> doit déclencher ROLLBACK
          await txPg.query(
            `INSERT INTO "Product" ("id", "supplierId", "sku", "category", "unitPrice", "currency", "stockAvailable", "updatedAt")
             VALUES ('prod-tx-invalid-fk', 'supplier-inexistant-999', 'SKU-TX-FAIL', 'TEST', '500.0000', 'EUR', 10, CURRENT_TIMESTAMP);`
          );
        });
      } catch {
        txFailedAsExpected = true;
      }

      assert.strictEqual(txFailedAsExpected, true, 'La violation de contrainte FK doit lever une erreur SQL');
      const countAfterRes = await pg.query<{ cnt: string }>(`SELECT COUNT(*)::text AS cnt FROM "Product";`);
      const countAfter = Number(countAfterRes.rows[0].cnt);
      assert.strictEqual(countAfter, countBefore, 'Le ROLLBACK ACID doit avoir annulé la première insertion de la transaction');

      console.log('  ✅ [LOT2-02] Transactions SQL ACID, intégrité référentielle FK et Rollback validés.');
    }

    // ========================================================================
    // TEST 3 (MISSION 2.3) : REDIS 7 — TTL, VERROUS DISTRIBUÉS (SET NX PX)
    // ========================================================================
    console.log('🔹 [LOT2-03] Redis 7 : Expiration TTL & Verrous distribués atomiques (SET NX PX)...');
    {
      // 3.1 Clé avec TTL
      TradeLinkRedisManager.setKey('tradelink:test:ephemeral', 'valeur-cache-v6', 60);
      assert.strictEqual(TradeLinkRedisManager.getKey('tradelink:test:ephemeral'), 'valeur-cache-v6');
      TradeLinkRedisManager.deleteKey('tradelink:test:ephemeral');
      assert.strictEqual(TradeLinkRedisManager.getKey('tradelink:test:ephemeral'), null);

      // 3.2 Verrou distribué empêchant les accès concurrents (Race condition sur stock)
      const lockWorkerA = TradeLinkRedisManager.acquireDistributedLock('stock:SKU-PG16-LOT2-001', 'worker-node-A', 5000);
      assert.strictEqual(lockWorkerA.acquired, true, 'Worker A acquiert le verrou distribué');

      const lockWorkerB = TradeLinkRedisManager.acquireDistributedLock('stock:SKU-PG16-LOT2-001', 'worker-node-B', 5000);
      assert.strictEqual(lockWorkerB.acquired, false, 'Worker B est bloqué tant que Worker A détient le verrou');

      // Tentative de libération illégitime par Worker B -> refusée
      assert.strictEqual(
        TradeLinkRedisManager.releaseDistributedLock('stock:SKU-PG16-LOT2-001', 'worker-node-B'),
        false,
        'Un worker tiers ne peut pas libérer le verrou d’une autre instance'
      );

      // Libération légitime par Worker A -> Worker B peut désormais acquérir le verrou
      assert.strictEqual(
        TradeLinkRedisManager.releaseDistributedLock('stock:SKU-PG16-LOT2-001', 'worker-node-A'),
        true
      );
      const lockWorkerBRetry = TradeLinkRedisManager.acquireDistributedLock('stock:SKU-PG16-LOT2-001', 'worker-node-B', 5000);
      assert.strictEqual(lockWorkerBRetry.acquired, true, 'Worker B acquiert le verrou après libération par Worker A');
      TradeLinkRedisManager.releaseDistributedLock('stock:SKU-PG16-LOT2-001', 'worker-node-B');

      console.log('  ✅ [LOT2-03] Opérations Redis 7 (TTL & Verrous distribués anti-concurrence) validées.');
    }

    // ========================================================================
    // TEST 4 (MISSION 2.4) : ARCHITECTURE MULTI-INSTANCES (2 SERVEURS EXPRESS)
    // ========================================================================
    console.log('🔹 [LOT2-04] Architecture Multi-Instances : Sessions, Révocation & Rate Limit partagés...');
    {
      TradeLinkRedisManager.resetRateLimitCounters();

      const appInstanceA = createApp();
      const appInstanceB = createApp();

      const serverA = appInstanceA.listen(0, '127.0.0.1');
      const serverB = appInstanceB.listen(0, '127.0.0.1');

      await Promise.all([
        new Promise<void>((r) => serverA.once('listening', r)),
        new Promise<void>((r) => serverB.once('listening', r)),
      ]);

      const portA = (serverA.address() as any).port;
      const portB = (serverB.address() as any).port;

      try {
        // A. Ouverture de la Session 1 sur l'Instance A
        registerSingleActiveSession('usr-client-01', 'sess-cluster-nodeA-01', true);
        const jwtSession1 = signJwtAccessToken({
          sub: 'usr-client-01',
          email: 's.mansouri@atlas-import.ma',
          role: 'CLIENT',
          sessionId: 'sess-cluster-nodeA-01',
          mfaVerified: true,
        });

        // Vérification de la Session 1 sur l'Instance B (partage Redis 7 inter-instances)
        const checkOnB = await httpRequestJson({
          port: portB,
          method: 'GET',
          path: '/api/v1/auth/session',
          headers: { Authorization: `Bearer ${jwtSession1}` },
        });
        assert.strictEqual(checkOnB.statusCode, 200, 'La session créée sur Instance A est reconnue par Instance B');
        assert.strictEqual(checkOnB.body.data.user.sessionId, 'sess-cluster-nodeA-01');

        // B. Nouvelle connexion du même utilisateur sur l'Instance B (Session 2) -> Révoque Session 1 sur tout le cluster
        registerSingleActiveSession('usr-client-01', 'sess-cluster-nodeB-02', true);
        const jwtSession2 = signJwtAccessToken({
          sub: 'usr-client-01',
          email: 's.mansouri@atlas-import.ma',
          role: 'CLIENT',
          sessionId: 'sess-cluster-nodeB-02',
          mfaVerified: true,
        });

        // L'ancien jeton (Session 1) utilisé sur l'Instance A doit être immédiatement rejeté (401)
        const oldSessionOnA = await httpRequestJson({
          port: portA,
          method: 'GET',
          path: '/api/v1/auth/session',
          headers: { Authorization: `Bearer ${jwtSession1}` },
        });
        assert.strictEqual(
          oldSessionOnA.statusCode,
          401,
          'Single Active Session : la connexion sur Instance B a révoqué la Session 1 sur Instance A'
        );
        assert.strictEqual(oldSessionOnA.body.error.code, 'SESSION_REVOKED_SINGLE_ACCESS_POLICY');

        // C. Révocation distribuée du JTI de jwtSession2 depuis l'Instance A -> Rejet immédiat sur l'Instance B
        const decodedJwt2 = verifyJwtAccessToken(jwtSession2);
        assert.ok(decodedJwt2?.jti);
        revokeJwtAccessTokenByJti(decodedJwt2!.jti!);

        const revokedJtiOnB = await httpRequestJson({
          port: portB,
          method: 'GET',
          path: '/api/v1/auth/session',
          headers: { Authorization: `Bearer ${jwtSession2}` },
        });
        assert.strictEqual(revokedJtiOnB.statusCode, 401, 'Le JTI révoqué sur Instance A est bloqué sur Instance B');

        // D. Compteur Rate Limiting partagé entre Instance A et Instance B
        const remA = Number(oldSessionOnA.headers['x-ratelimit-remaining']);
        const remB = Number(revokedJtiOnB.headers['x-ratelimit-remaining']);
        assert.strictEqual(remB, remA - 1, 'Le quota Rate Limit est décrémenté de façon partagée entre Instance A et Instance B');
      } finally {
        await Promise.all([
          new Promise<void>((r) => serverA.close(() => r())),
          new Promise<void>((r) => serverB.close(() => r())),
        ]);
      }

      console.log('  ✅ [LOT2-04] Multi-Instances (2 serveurs Express) : sessions, révocations et quotas partagés validés.');
    }

    // ========================================================================
    // TEST 5 (MISSION 2.5) : GESTION DES INDISPONIBILITÉS & SONDES DE SANTÉ
    // ========================================================================
    console.log('🔹 [LOT2-05] Simulation de panne PostgreSQL / Redis & Dégradation contrôlée (503 -> 200)...');
    {
      const app = createApp();
      const server = app.listen(0, '127.0.0.1');
      await new Promise<void>((r) => server.once('listening', r));
      const port = (server.address() as any).port;

      try {
        // 5.1 Simulation panne PostgreSQL
        TradeLinkPostgresManager.setDatabaseUnavailableForTest(true);
        const healthPgDown = await httpRequestJson({
          port,
          method: 'GET',
          path: '/api/v1/health',
        });
        assert.strictEqual(healthPgDown.statusCode, 503, 'Le healthcheck doit retourner 503 si PostgreSQL est en panne');
        assert.strictEqual(healthPgDown.body.status, 'DEGRADED');

        // Rétablissement PostgreSQL
        TradeLinkPostgresManager.setDatabaseUnavailableForTest(false);

        // 5.2 Simulation panne Redis
        TradeLinkRedisManager.setRedisUnavailableForTest(true);
        const healthRedisDown = await httpRequestJson({
          port,
          method: 'GET',
          path: '/api/v1/health',
        });
        assert.strictEqual(healthRedisDown.statusCode, 503, 'Le healthcheck doit retourner 503 si Redis est en panne');
        assert.strictEqual(healthRedisDown.body.checks.redis, 'DOWN (Redis Cluster Unreachable)');

        // Rétablissement Redis -> retour immédiat à 200 UP
        TradeLinkRedisManager.setRedisUnavailableForTest(false);
        const healthRestored = await httpRequestJson({
          port,
          method: 'GET',
          path: '/api/v1/health',
        });
        assert.strictEqual(healthRestored.statusCode, 200);
        assert.strictEqual(healthRestored.body.status, 'UP');
      } finally {
        TradeLinkPostgresManager.setDatabaseUnavailableForTest(false);
        TradeLinkRedisManager.setRedisUnavailableForTest(false);
        await new Promise<void>((r) => server.close(() => r()));
      }

      console.log('  ✅ [LOT2-05] Détection d’indisponibilité PostgreSQL/Redis et rétablissement 503 -> 200 validés.');
    }
  } finally {
    if (fs.existsSync(tempPersistFile)) {
      fs.unlinkSync(tempPersistFile);
    }
    await TradeLinkPostgresManager.shutdownDatabase();
    await TradeLinkRedisManager.disconnectExternalRedis();
  }

  console.log('\n================================================================================');
  console.log('🎉 SUITE DE TESTS LOT 2 (POSTGRESQL 16, PRISMA & REDIS 7) : 5/5 BLOCS RÉUSSIS !');
  console.log('================================================================================\n');
}

runLot2PostgresRedisPersistenceTests().catch((err) => {
  console.error('\n❌ ÉCHEC DANS LA SUITE DE TESTS LOT 2 :', err);
  process.exit(1);
});
