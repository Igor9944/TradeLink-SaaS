// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS D'INTÉGRATION BACKEND (CHAPITRE 15 & PROMPT 4)
// Couvre :
// 1. OpenAPI 3.1.0 & Séparation explicite des données Sandbox vs Production
// 2. Session unique par utilisateur (la nouvelle connexion révoque la précédente)
// 3. RBAC, Ownership (IDOR) & Mode Lecture Seule Comptable Stage 3
// 4. Règle KYC 7 jours (dossier soumis à temps protégé contre suspension J+7 ; motif obligatoire en cas de rejet)
// 5. Transaction atomique Commande + Réservation Stock + Rollback si stock insuffisant + Idempotency-Key
// 6. Suppression logique (Soft Delete) filtrée automatiquement
// 7. Moteur financier déterministe Decimal.js (ACT/365, ACT/360, ACT/ACT bissextile 366j)
// 8. Double validation Admin sur restauration de sauvegarde (auto-approbation bloquée)
// ============================================================================

import assert from 'node:assert/strict';
import { TradeLinkRepositoryStore, DatabaseStateSnapshot } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { ServerRequestContext } from '../middlewares/errorAndSecurity.middleware';

function createInitialTestDatabase(): DatabaseStateSnapshot {
  return {
    products: [
      {
        id: 'prod-test-01',
        sku: 'TL-COLD-400X',
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech GmbH',
        category: 'Chaîne du Froid',
        name: { fr: 'Conteneur Pharma IoT', en: 'Pharma IoT Container', ar: 'حاوية تبريد' },
        description: { fr: 'Desc FR', en: 'Desc EN', ar: 'Desc AR' },
        unitPrice: '1000.00',
        currency: 'EUR',
        taxRate: '20.00',
        unit: 'UNITÉ',
        stockAvailable: 10,
        stockReserved: 0,
        minStockAlert: 2,
        icon3d: 'cold-chain',
        originCountry: 'DE',
        incoterm: 'CIP',
        leadTimeDays: 4,
        isPublished: true,
        deletedAt: null,
      },
      {
        id: 'prod-test-02',
        sku: 'TL-SCAN-5G',
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech GmbH',
        category: 'Terminaux',
        name: { fr: 'Scanner 5G', en: '5G Scanner', ar: 'ماسح ضوئي' },
        description: { fr: 'Desc FR', en: 'Desc EN', ar: 'Desc AR' },
        unitPrice: '500.00',
        currency: 'EUR',
        taxRate: '20.00',
        unit: 'PACK',
        stockAvailable: 5,
        stockReserved: 0,
        minStockAlert: 1,
        icon3d: 'scanner',
        originCountry: 'FR',
        incoterm: 'DDP',
        leadTimeDays: 3,
        isPublished: true,
        deletedAt: null,
      },
    ],
    orders: [
      {
        id: 'ord-other-client',
        orderNumber: 'CMD-2026-0001',
        clientId: 'usr-client-999',
        clientName: 'Autre Client B2B',
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech GmbH',
        status: 'PENDING',
        subtotalAmount: '1000.00',
        taxAmount: '200.00',
        shippingAmount: '650.00',
        totalAmount: '1850.00',
        currency: 'EUR',
        shippingAddress: 'Lyon, France',
        createdAt: '2026-11-18',
        items: [],
        timeline: [],
        deletedAt: null,
      },
    ],
    kycDossiers: [
      {
        id: 'kyc-dos-intime',
        userId: 'usr-client-01',
        userName: 'Youssef Berrada',
        companyName: 'Atlas Import S.A.',
        actorType: 'CLIENT',
        jurisdiction: 'MA',
        status: 'SUBMITTED_IN_TIME_PENDING_REVIEW',
        startedAt: '2026-11-10',
        deadlineAt: '2026-11-17',
        daysElapsed: 8,
        daysRemaining: 0,
        submittedAt: '2026-11-14 14:00',
        remindersSent: ['J+1', 'J+3'],
        documents: [],
      },
    ],
    backups: [
      {
        id: 'bkp-prod-01',
        backupCode: 'BKP-FULL-20261118',
        type: 'FULL_SCHEDULED',
        sizeFormatted: '4.82 GB',
        encryptionKeyAlias: 'alias/tradelink-kek-v4',
        sha256: 'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a',
        status: 'VERIFIED',
        restoreStatus: 'PENDING_SECOND_APPROVAL',
        restoreInitiatorId: 'usr-admin-01',
        restoreInitiatorName: 'Karim Mansouri (Admin #1)',
        planHash: 'PLAN-IMMUTABLE-99281A',
        createdAt: '2026-11-18 02:00:00',
      },
    ],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
  };
}

export function runBackendIntegrationTests(): { passed: number; results: string[] } {
  const repo = new TradeLinkRepositoryStore(createInitialTestDatabase(), false);
  const app = new TradeLinkApiApplication(repo);
  const results: string[] = [];
  let passed = 0;

  const makeReq = (
    partial: Partial<ServerRequestContext> & { method: string; path: string }
  ): ServerRequestContext => ({
    headers: {},
    query: {},
    params: {},
    body: {},
    correlationId: `test-corr-${passed + 1}`,
    ipAddress: '127.0.0.1',
    ...partial,
  });

  // TEST 1 : OpenAPI 3.1.0 & Marquage explicite des données Sandbox non persistées en prod
  {
    const res = app.handleRequest(makeReq({ method: 'GET', path: '/api/v1/docs/openapi.json' }));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.persistedInDatabase, false);
    assert.equal(res.body.dataSource, 'ISOLATED_SANDBOX_STORE');
    assert.equal((res.body.data as any).openapi, '3.1.0');
    passed++;
    results.push('✓ TEST 1 : Spécification OpenAPI 3.1.0 & Séparation explicite Sandbox/Prod validées');
  }

  // TEST 2 : Politique de Session Unique (une nouvelle connexion révoque la précédente)
  let clientActiveSession = '';
  {
    const login1 = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/auth/login',
        body: { userId: 'usr-client-01', email: 'client@atlas.ma', role: 'CLIENT', companyName: 'Atlas Import' },
      })
    );
    assert.equal(login1.statusCode, 200);
    const firstSessionId = (login1.body.data as any).sessionId;

    const login2 = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/auth/login',
        body: { userId: 'usr-client-01', email: 'client@atlas.ma', role: 'CLIENT', companyName: 'Atlas Import' },
      })
    );
    assert.equal(login2.statusCode, 200);
    clientActiveSession = (login2.body.data as any).sessionId;
    assert.equal((login2.body.data as any).previousRevokedSessionId, firstSessionId);

    // Tenter d'utiliser l'ancienne session révoquée -> Doit retourner 401
    const oldSessionReq = app.handleRequest(
      makeReq({
        method: 'GET',
        path: '/api/v1/orders',
        user: {
          id: 'usr-client-01',
          email: 'client@atlas.ma',
          role: 'CLIENT',
          sessionId: firstSessionId,
          companyName: 'Atlas Import',
        },
      })
    );
    assert.equal(oldSessionReq.statusCode, 401);
    assert.equal(oldSessionReq.body.error?.code, 'SESSION_REVOKED_SINGLE_ACCESS_POLICY');
    passed++;
    results.push('✓ TEST 2 : Session unique active & Révocation immédiate de la session précédente validées (401)');
  }

  // TEST 3 : RBAC, Protection IDOR (Ownership) & Lecture Seule Comptable Stage 3
  {
    const comptaLogin = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/auth/login',
        body: { userId: 'usr-compta-01', email: 'compta@cabinet.fr', role: 'COMPTABLE' },
      })
    );
    const comptaSession = (comptaLogin.body.data as any).sessionId;

    // Comptable tente de créer un produit -> 403 COMPTABLE_STAGE3_READONLY_SOURCE_DATA
    const comptaWrite = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/products',
        user: {
          id: 'usr-compta-01',
          email: 'compta@cabinet.fr',
          role: 'COMPTABLE',
          sessionId: comptaSession,
          companyName: 'Cabinet Compta',
        },
      })
    );
    assert.equal(comptaWrite.statusCode, 403);
    assert.equal(comptaWrite.body.error?.code, 'COMPTABLE_STAGE3_READONLY_SOURCE_DATA');

    // Client usr-client-01 tente de lire la commande d'un autre client (usr-client-999) -> 403 IDOR
    const idorAttempt = app.handleRequest(
      makeReq({
        method: 'GET',
        path: '/api/v1/orders/ord-other-client',
        user: {
          id: 'usr-client-01',
          email: 'client@atlas.ma',
          role: 'CLIENT',
          sessionId: clientActiveSession,
          companyName: 'Atlas Import',
        },
      })
    );
    assert.equal(idorAttempt.statusCode, 403);
    assert.equal(idorAttempt.body.error?.code, 'RESOURCE_OWNERSHIP_VIOLATION');

    // Client tente de créer une salle Room Live générale -> 403 CLIENT_ROOM_CREATION_FORBIDDEN
    const roomAttempt = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/rooms',
        user: {
          id: 'usr-client-01',
          email: 'client@atlas.ma',
          role: 'CLIENT',
          sessionId: clientActiveSession,
          companyName: 'Atlas Import',
        },
        body: { title: 'Salle Client Non Autorisée' },
      })
    );
    assert.equal(roomAttempt.statusCode, 403);
    assert.equal(roomAttempt.body.error?.code, 'CLIENT_ROOM_CREATION_FORBIDDEN');
    passed++;
    results.push('✓ TEST 3 : RBAC, Protection IDOR inter-clients et Lecture Seule Comptable Stage 3 validés (403)');
  }

  // TEST 4 : Transaction Commande + Réservation Stock + Rollback Atomique + Idempotency-Key
  {
    // Tentative de commande dépassant le stock (demande 50 sur prod-test-02 qui en a 5) -> Rollback intégral
    const failedOrder = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/orders',
        user: {
          id: 'usr-client-01',
          email: 'client@atlas.ma',
          role: 'CLIENT',
          sessionId: clientActiveSession,
          companyName: 'Atlas Import',
        },
        body: {
          shippingAddress: 'Casablanca Zone Zenata Lot 14',
          lines: [
            { productId: 'prod-test-01', quantity: 2 },
            { productId: 'prod-test-02', quantity: 50 }, // Échec ici !
          ],
        },
      })
    );
    assert.equal(failedOrder.statusCode, 409);
    // Vérifier que prod-test-01 est resté à 10 (rollback atomique de la 1re ligne !)
    assert.equal(repo.findActiveProductById('prod-test-01')?.stockAvailable, 10);

    // Commande valide avec Idempotency-Key
    const validOrder1 = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/orders',
        headers: { 'idempotency-key': 'idem-order-key-001' },
        user: {
          id: 'usr-client-01',
          email: 'client@atlas.ma',
          role: 'CLIENT',
          sessionId: clientActiveSession,
          companyName: 'Atlas Import',
        },
        body: {
          shippingAddress: 'Casablanca Zone Zenata Lot 14',
          lines: [{ productId: 'prod-test-01', quantity: 3 }],
        },
      })
    );
    assert.equal(validOrder1.statusCode, 201);
    assert.equal(repo.findActiveProductById('prod-test-01')?.stockAvailable, 7);
    assert.equal(repo.findActiveProductById('prod-test-01')?.stockReserved, 3);

    // Rejeu avec la même Idempotency-Key -> Ne décrémente pas une 2e fois le stock !
    const replayOrder = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/orders',
        headers: { 'idempotency-key': 'idem-order-key-001' },
        user: {
          id: 'usr-client-01',
          email: 'client@atlas.ma',
          role: 'CLIENT',
          sessionId: clientActiveSession,
          companyName: 'Atlas Import',
        },
        body: {
          shippingAddress: 'Casablanca Zone Zenata Lot 14',
          lines: [{ productId: 'prod-test-01', quantity: 3 }],
        },
      })
    );
    assert.equal(replayOrder.headers['X-Idempotent-Replay'], 'true');
    assert.equal(repo.findActiveProductById('prod-test-01')?.stockAvailable, 7);
    passed++;
    results.push('✓ TEST 4 : Transaction Commande, Rollback atomique sur stock insuffisant & Idempotency-Key validés');
  }

  // TEST 5 : Règle KYC J+7 (Dossier soumis à temps non suspendu) & Motif obligatoire de rejet
  let admin1Session = '';
  {
    const adminLogin = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/auth/login',
        body: { userId: 'usr-admin-01', email: 'admin1@tradelink.com', role: 'ADMIN' },
      })
    );
    admin1Session = (adminLogin.body.data as any).sessionId;

    const kycStatusRes = app.handleRequest(
      makeReq({
        method: 'GET',
        path: '/api/v1/kyc/status',
        user: {
          id: 'usr-admin-01',
          email: 'admin1@tradelink.com',
          role: 'ADMIN',
          sessionId: admin1Session,
          companyName: 'HQ',
        },
      })
    );
    const firstEval = (kycStatusRes.body.data as any)[0].evaluation;
    assert.equal(firstEval.protectedFromAutoSuspension, true);
    assert.equal(firstEval.computedStatus, 'SUBMITTED_IN_TIME_PENDING_REVIEW');

    // Rejet sans motif -> 400 VALIDATION_KYC_REJECTION_REASON_REQUIRED
    const rejectNoReason = app.handleRequest(
      makeReq({
        method: 'PUT',
        path: '/api/v1/kyc/kyc-dos-intime/decision',
        user: {
          id: 'usr-admin-01',
          email: 'admin1@tradelink.com',
          role: 'ADMIN',
          sessionId: admin1Session,
          companyName: 'HQ',
        },
        body: { decision: 'REJECTED', reason: '' },
      })
    );
    assert.equal(rejectNoReason.statusCode, 400);
    assert.equal(rejectNoReason.body.error?.code, 'VALIDATION_KYC_REJECTION_REASON_REQUIRED');
    passed++;
    results.push('✓ TEST 5 : Protection KYC J+7 des dossiers soumis à temps & Motif de rejet obligatoire validés');
  }

  // TEST 6 : Moteur Financier Déterministe Decimal.js (ACT/365, ACT/360 & ACT/ACT Bissextile)
  {
    const calcLeap = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/calc/simple',
        user: {
          id: 'usr-admin-01',
          email: 'admin1@tradelink.com',
          role: 'ADMIN',
          sessionId: admin1Session,
          companyName: 'HQ',
        },
        body: {
          principal: '100000.00',
          annualRatePct: '3.66',
          startDate: '2024-01-01',
          endDate: '2024-12-31', // 365 jours sur une année bissextile 2024 (diviseur 366 en ACT/ACT)
          basis: 'ACT/ACT',
        },
      })
    );
    assert.equal(calcLeap.statusCode, 200);
    const data = calcLeap.body.data as any;
    assert.equal(data.isLeapYearDetected, true);
    assert.equal(data.annualDivisor, 366);
    assert.equal(data.interestAmount, '3650.00');
    passed++;
    results.push('✓ TEST 6 : Moteur Financier Déterministe Decimal.js (ACT/ACT année bissextile 366j = 3650.00 EUR) validé');
  }

  // TEST 7 : Double Validation Admin sur Restauration de Sauvegarde (Interdiction d'auto-approbation)
  {
    // Admin #1 (initiateur) tente d'approuver sa propre demande -> 403 SELF_APPROVAL_FORBIDDEN
    const selfApprove = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/admin/backups/bkp-prod-01/restore',
        user: {
          id: 'usr-admin-01',
          email: 'admin1@tradelink.com',
          role: 'ADMIN',
          sessionId: admin1Session,
          companyName: 'HQ',
        },
      })
    );
    assert.equal(selfApprove.statusCode, 403);
    assert.equal(selfApprove.body.error?.code, 'SELF_APPROVAL_FORBIDDEN');

    // Admin #2 (distinct) se connecte et approuve -> 200 APPROVED_READY
    const admin2Login = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/auth/login',
        body: { userId: 'usr-admin-02', email: 'admin2@tradelink.com', role: 'ADMIN' },
      })
    );
    const admin2Session = (admin2Login.body.data as any).sessionId;

    const dualApprove = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/admin/backups/bkp-prod-01/restore',
        user: {
          id: 'usr-admin-02',
          email: 'admin2@tradelink.com',
          role: 'ADMIN',
          sessionId: admin2Session,
          companyName: 'HQ',
        },
      })
    );
    assert.equal(dualApprove.statusCode, 200);
    assert.equal((dualApprove.body.data as any).restoreStatus, 'APPROVED_READY');
    passed++;
    results.push('✓ TEST 7 : Double Validation Admin (blocage auto-approbation Admin #1 + validation Admin #2) validée');
  }

  // TEST 8 : Suppression logique (Soft Delete) et filtrage automatique dans le catalogue
  {
    const delRes = app.handleRequest(
      makeReq({
        method: 'DELETE',
        path: '/api/v1/products/prod-test-02',
        user: {
          id: 'usr-admin-01',
          email: 'admin1@tradelink.com',
          role: 'ADMIN',
          sessionId: admin1Session,
          companyName: 'HQ',
        },
      })
    );
    assert.equal(delRes.statusCode, 200);

    const listAfter = app.handleRequest(
      makeReq({
        method: 'GET',
        path: '/api/v1/products',
        query: { page: '1', limit: '10' },
      })
    );
    assert.equal(listAfter.body.pagination?.totalItems, 1);
    passed++;
    results.push('✓ TEST 8 : Suppression logique (Soft Delete deletedAt) et pagination/filtrage validés');
  }

  return { passed, results };
}

// Exécution directe si appelé en ligne de commande
const summary = runBackendIntegrationTests();
console.log(`\n=== SUITE DE TESTS D'INTÉGRATION BACKEND TRADELINK V6.0 (${summary.passed}/8 RÉUSSIS) ===`);
for (const line of summary.results) {
  console.log(line);
}
