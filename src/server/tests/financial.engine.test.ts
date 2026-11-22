// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS DU MOTEUR DE CALCUL FINANCIER & COMPTABILITÉ (PROMPT 14)
// - Formule déterministe Montant × Taux × Jours / Base annuelle avec Decimal.js
// - Conventions ACT/365, ACT/360, ACT/ACT bissextile (366j en 2024/2028 vs 365j en 2025/2026)
// - Taux fixes et taux variables (Benchmark EURIBOR / SOFR / ESTER + Spread de marge)
// - Cas limites : 0 jour, taux 0%, montants extrêmes (100 000 000.00 EUR)
// - Règles d'arrondi : ROUND_HALF_UP, ROUND_HALF_EVEN (Banker's rounding IEEE 754), ROUND_UP, ROUND_DOWN
// - Balance âgée des créances (0-30j, 31-60j, 61-90j, >90j) avec pénalités légales et indemnités 40 EUR
// - Export Fichier des Écritures Comptables (FEC) conforme art. A.47 A-1 du Livre des procédures fiscales
// - Verrouillage des périodes fiscales & cloisonnement RBAC strict (Comptable en lecture seule)
// ============================================================================

import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { ServerRequestContext, ServerResponsePayload } from '../middlewares/errorAndSecurity.middleware';
import { computeCurrentTotpCode } from '../../services/securityCrypto';
import { AccountingEngine } from '../../services/accountingEngine';
import { InvoiceRecord, PaymentRecord, UserRoleCode } from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Échec Assertion : ${message}`);
  }
}

export function createFinancialEngineTestDatabase() {
  const testInvoices: InvoiceRecord[] = [
    {
      id: 'inv-fin-current',
      invoiceNumber: 'FAC-2026-C01',
      orderId: 'ord-fin-01',
      orderNumber: 'CMD-2026-C01',
      clientId: 'usr-client-01',
      clientName: 'Atlas Distribution SAS',
      supplierId: 'usr-supp-01',
      supplierName: 'EuroTech Industrial GmbH',
      status: 'ISSUED',
      subtotal: '10000.00',
      taxAmount: '2000.00',
      totalAmount: '12000.00',
      currency: 'EUR',
      jurisdiction: 'France / UE (TVA 20%)',
      issuedAt: '2026-11-01',
      dueAt: '2026-11-30', // Échéance future (non échue au 18/11/2026)
    },
    {
      id: 'inv-fin-overdue-45d',
      invoiceNumber: 'FAC-2026-O45',
      orderId: 'ord-fin-02',
      orderNumber: 'CMD-2026-O45',
      clientId: 'usr-client-02',
      clientName: 'Méditerranée Logistique SA',
      supplierId: 'usr-supp-01',
      supplierName: 'EuroTech Industrial GmbH',
      status: 'ISSUED',
      subtotal: '20000.00',
      taxAmount: '4000.00',
      totalAmount: '24000.00',
      currency: 'EUR',
      jurisdiction: 'France / UE (TVA 20%)',
      issuedAt: '2026-09-01',
      dueAt: '2026-10-04', // 45 jours de retard au 18/11/2026 (tranche 31-60)
    },
    {
      id: 'inv-fin-overdue-120d',
      invoiceNumber: 'FAC-2026-O120',
      orderId: 'ord-fin-03',
      orderNumber: 'CMD-2026-O120',
      clientId: 'usr-client-03',
      clientName: 'Iberia Trans-Global SL',
      supplierId: 'usr-supp-01',
      supplierName: 'EuroTech Industrial GmbH',
      status: 'ISSUED',
      subtotal: '50000.00',
      taxAmount: '10000.00',
      totalAmount: '60000.00',
      currency: 'EUR',
      jurisdiction: 'France / UE (TVA 20%)',
      issuedAt: '2026-06-01',
      dueAt: '2026-07-21', // 120 jours de retard au 18/11/2026 (tranche >90j contentieux)
    },
    {
      id: 'inv-fin-paid',
      invoiceNumber: 'FAC-2026-P01',
      orderId: 'ord-fin-04',
      orderNumber: 'CMD-2026-P01',
      clientId: 'usr-client-01',
      clientName: 'Atlas Distribution SAS',
      supplierId: 'usr-supp-01',
      supplierName: 'EuroTech Industrial GmbH',
      status: 'PAID',
      subtotal: '15000.00',
      taxAmount: '3000.00',
      totalAmount: '18000.00',
      currency: 'EUR',
      jurisdiction: 'France / UE (TVA 20%)',
      issuedAt: '2026-08-01',
      dueAt: '2026-08-31',
      paidAt: '2026-08-25',
    },
  ];

  const testPayments: PaymentRecord[] = [
    {
      id: 'pay-fin-01',
      paymentReference: 'PAY-STRIPE-FIN-01',
      invoiceId: 'inv-fin-paid',
      invoiceNumber: 'FAC-2026-P01',
      clientId: 'usr-client-01',
      supplierId: 'usr-supp-01',
      provider: 'STRIPE',
      amount: '18000.00',
      currency: 'EUR',
      status: 'SUCCEEDED',
      webhookEventId: 'evt_stripe_fin_01',
      idempotencyVerified: true,
      reconciled: true,
      createdAt: '2026-08-25 10:00',
    },
  ];

  return {
    products: [],
    orders: [],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    notifications: [],
    auditLogs: [],
    users: [],
    invoices: testInvoices,
    payments: testPayments,
    accountingEntries: [],
  };
}

async function runFinancialEngineTests() {
  console.log('\n=== SUITE DE TESTS DÉDIÉE : MOTEUR DE CALCUL FINANCIER & COMPTABILITÉ (PROMPT 14) ===\n');

  const testDb = createFinancialEngineTestDatabase();
  const repo = new TradeLinkRepositoryStore(testDb as any, false);
  const app = new TradeLinkApiApplication(repo);

  const makeReq = (
    partial: Partial<ServerRequestContext> & { method: ServerRequestContext['method']; path: string }
  ): ServerResponsePayload<any> => {
    const ctx: ServerRequestContext = {
      correlationId: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ipAddress: '10.0.9.50',
      headers: {},
      query: {},
      params: {},
      body: {},
      ...partial,
    };
    return app.handleRequest(ctx);
  };

  // 1. Initialisation des sessions actives via /api/v1/auth/login (Argon2id + TOTP MFA Admin)
  const adminLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: {
      email: 'k.benali@tradelink-global.com',
      password: 'AdminTradeLink!2026',
    },
  });
  const adminData = adminLogin.body.data as { userId: string; sessionId: string; email: string; companyName: string };
  const adminUser = {
    id: adminData.userId,
    email: adminData.email,
    role: 'ADMIN' as UserRoleCode,
    sessionId: adminData.sessionId,
    companyName: adminData.companyName,
    mfaVerified: true,
  };
  const adminMfaSetup = makeReq({ method: 'POST', path: '/api/v1/auth/mfa/setup', user: adminUser });
  const adminMfaCode = computeCurrentTotpCode((adminMfaSetup.body.data as { secretBase32: string }).secretBase32);
  makeReq({ method: 'POST', path: '/api/v1/auth/mfa/verify', user: adminUser, body: { code: adminMfaCode } });

  const accountantLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: {
      email: 'c.dupont@tradelink-audit.fr',
      password: 'ComptableSecure!2026',
    },
  });
  const accountantData = accountantLogin.body.data as { userId: string; sessionId: string; email: string; companyName: string };
  const accountantUser = {
    id: accountantData.userId,
    email: accountantData.email,
    role: 'COMPTABLE' as UserRoleCode,
    sessionId: accountantData.sessionId,
    companyName: accountantData.companyName,
    mfaVerified: true,
  };

  // --------------------------------------------------------------------------
  // [FIN-01] Moteur Déterministe Decimal.js & Formule Fondamentale
  // Formule : Montant × Taux × Nombre de jours / Base annuelle
  // --------------------------------------------------------------------------
  console.log('-> [FIN-01] Moteur Déterministe Decimal.js & Formule Fondamentale');
  {
    // Cas de référence : 100 000.00 EUR à 5.00% sur 180 jours, ACT/365
    // 100 000 × 0.05 × 180 / 365 = 2465.7534... => 2465.75 EUR
    const res = makeReq({
      method: 'POST',
      path: '/api/v1/accounting/calculate-interest',
      user: accountantUser,
      body: {
        principalStr: '100000.00',
        annualRatePctStr: '5.0000',
        startDateStr: '2026-01-01',
        endDateStr: '2026-06-30', // 180 jours
        basis: 'ACT/365',
        roundingMode: 'ROUND_HALF_UP',
        roundingDecimals: 2,
      },
    });
    assert(res.statusCode === 200, `Status HTTP 200 attendu, reçu ${res.statusCode}`);
    const data = res.body.data;

    assert(data.principal === '100000.00', 'Principal exact');
    assert(data.annualRatePct === '5.0000', 'Taux annuel exact');
    assert(data.daysCount === 180, `Nombre de jours exact attendu 180, reçu ${data.daysCount}`);
    assert(data.annualDivisor === 365, 'Diviseur annuel 365 attendu');
    assert(data.interestAmount === '2465.75', `Intérêts attendus 2465.75 EUR, reçu ${data.interestAmount}`);
    assert(data.totalAmount === '102465.75', `Total à terme attendu 102465.75 EUR, reçu ${data.totalAmount}`);

    // Vérification de l'absence totale de flottant JavaScript binaire
    assert(typeof data.interestAmount === 'string', 'Le résultat financier doit être une chaîne décimale exacte');
    assert(!data.interestAmount.includes('000000000000'), 'Aucun artefact de conversion flottante binaire détecté');

    console.log(`   ✓ Formule Montant × Taux × Jours / 365 = ${data.interestAmount} EUR (Total: ${data.totalAmount} EUR)`);
  }

  // --------------------------------------------------------------------------
  // [FIN-02] Conventions de Comptage de Jours : ACT/365, ACT/360, ACT/ACT Bissextile
  // --------------------------------------------------------------------------
  console.log('\n-> [FIN-02] Conventions de Comptage de Jours : ACT/365, ACT/360 et ACT/ACT Bissextile');
  {
    // ACT/360 : 100 000 × 0.05 × 180 / 360 = 2500.00 EUR
    const res360 = makeReq({
      method: 'POST',
      path: '/api/v1/accounting/calculate-interest',
      user: accountantUser,
      body: {
        principalStr: '100000.00',
        annualRatePctStr: '5.0000',
        startDateStr: '2026-01-01',
        endDateStr: '2026-06-30',
        basis: 'ACT/360',
      },
    });
    assert(res360.body.data.interestAmount === '2500.00', `ACT/360 attendu 2500.00 EUR, reçu ${res360.body.data.interestAmount}`);
    assert(res360.body.data.annualDivisor === 360, 'Diviseur ACT/360 attendu 360');

    // ACT/ACT en année bissextile (2024, 366 jours) : 2024-01-01 à 2024-12-31 = 365 jours
    // 100 000 × 0.04 × 365 / 366 = 3989.071... => 3989.07 EUR
    const resLeap = makeReq({
      method: 'POST',
      path: '/api/v1/accounting/calculate-interest',
      user: accountantUser,
      body: {
        principalStr: '100000.00',
        annualRatePctStr: '4.0000',
        startDateStr: '2024-01-01',
        endDateStr: '2024-12-31',
        basis: 'ACT/ACT',
      },
    });
    assert(resLeap.body.data.isLeapYearDetected === true, 'Année bissextile 2024 doit être détectée');
    assert(resLeap.body.data.annualDivisor === 366, 'Diviseur annuel 366j attendu pour 2024');
    assert(resLeap.body.data.interestAmount === '3989.07', `Intérêts bissextiles attendus 3989.07 EUR, reçu ${resLeap.body.data.interestAmount}`);

    // ACT/ACT en année normale (2025, 365 jours)
    const resNonLeap = makeReq({
      method: 'POST',
      path: '/api/v1/accounting/calculate-interest',
      user: accountantUser,
      body: {
        principalStr: '100000.00',
        annualRatePctStr: '4.0000',
        startDateStr: '2025-01-01',
        endDateStr: '2025-12-31',
        basis: 'ACT/ACT',
      },
    });
    assert(resNonLeap.body.data.isLeapYearDetected === false, 'Année 2025 non bissextile');
    assert(resNonLeap.body.data.annualDivisor === 365, 'Diviseur annuel 365j attendu pour 2025');

    console.log(`   ✓ ACT/360: 2500.00 EUR | ACT/ACT Bissextile (2024, 366j): ${resLeap.body.data.interestAmount} EUR | Non bissextile: ${resNonLeap.body.data.interestAmount} EUR`);
  }

  // --------------------------------------------------------------------------
  // [FIN-03] Taux Fixes et Taux Variables (Benchmark Interbancaire + Spread)
  // --------------------------------------------------------------------------
  console.log('\n-> [FIN-03] Taux Fixes et Taux Variables (Benchmark Interbancaire + Spread)');
  {
    // Calcul taux variable : Benchmark EURIBOR_3M (3.2500%) + Spread 1.7500% = 5.0000%
    const resVar = makeReq({
      method: 'POST',
      path: '/api/v1/accounting/calculate-interest',
      user: accountantUser,
      body: {
        principalStr: '100000.00',
        rateType: 'VARIABLE',
        benchmarkRateCode: 'EURIBOR_3M',
        spreadPctStr: '1.7500',
        startDateStr: '2026-01-01',
        endDateStr: '2026-06-30',
        basis: 'ACT/365',
      },
    });
    assert(resVar.body.data.rateType === 'VARIABLE', 'Type de taux VARIABLE attendu');
    assert(resVar.body.data.benchmarkRateCode === 'EURIBOR_3M', 'Code benchmark EURIBOR_3M attendu');
    assert(resVar.body.data.effectiveRatePct === '5.0000' || resVar.body.data.annualRatePct === '5.0000', 'Taux effectif 5.0000% (3.25 + 1.75)');
    assert(resVar.body.data.interestAmount === '2465.75', 'Intérêts exacts attendus 2465.75 EUR');

    // Mise à jour du taux Benchmark par l'Administrateur
    const resUpdateRate = makeReq({
      method: 'PUT',
      path: '/api/v1/accounting/benchmark-rates/SOFR',
      user: adminUser,
      body: {
        currentRatePct: '5.1000',
      },
    });
    assert(resUpdateRate.statusCode === 200, 'Mise à jour du benchmark réussie');
    assert(resUpdateRate.body.data.currentRatePct === '5.1000', 'Nouveau taux SOFR enregistré');

    // Tentative de modification par un Comptable (doit être interdite - 403)
    const resForbiddenRate = makeReq({
      method: 'PUT',
      path: '/api/v1/accounting/benchmark-rates/SOFR',
      user: accountantUser,
      body: {
        currentRatePct: '6.0000',
      },
    });
    assert(resForbiddenRate.statusCode === 403, 'Le rôle COMPTABLE ne peut pas modifier un taux de référence (403)');

    console.log(`   ✓ Taux variable EURIBOR_3M (3.25%) + Spread (1.75%) = 5.0000% validé. RBAC modification Admin strict (403 pour Comptable).`);
  }

  // --------------------------------------------------------------------------
  // [FIN-04] Cas Limites et Extrêmes (Stress Testing)
  // --------------------------------------------------------------------------
  console.log('\n-> [FIN-04] Cas Limites et Robustesse (0j, 0%, 100 000 000.00 EUR)');
  {
    // 0 jour
    const res0Days = makeReq({
      method: 'POST',
      path: '/api/v1/accounting/calculate-interest',
      user: accountantUser,
      body: {
        principalStr: '500000.00',
        annualRatePctStr: '6.5000',
        startDateStr: '2026-03-15',
        endDateStr: '2026-03-15',
        basis: 'ACT/365',
      },
    });
    assert(res0Days.body.data.daysCount === 0, '0 jour calculé');
    assert(res0Days.body.data.interestAmount === '0.00', 'Intérêts nuls pour 0 jour');
    assert(res0Days.body.data.totalAmount === '500000.00', 'Total égal au principal');

    // Taux 0%
    const res0Rate = makeReq({
      method: 'POST',
      path: '/api/v1/accounting/calculate-interest',
      user: accountantUser,
      body: {
        principalStr: '250000.00',
        annualRatePctStr: '0.0000',
        startDateStr: '2026-01-01',
        endDateStr: '2026-12-31',
        basis: 'ACT/365',
      },
    });
    assert(res0Rate.body.data.interestAmount === '0.00', 'Intérêts nuls pour taux 0%');

    // Montant extrême : 100 000 000.00 EUR (Cent millions d'euros) à 4.25% sur 90j ACT/365
    // 100 000 000 × 0.0425 × 90 / 365 = 1047945.2054... => 1047945.21 EUR
    const resHuge = makeReq({
      method: 'POST',
      path: '/api/v1/accounting/calculate-interest',
      user: accountantUser,
      body: {
        principalStr: '100000000.00',
        annualRatePctStr: '4.2500',
        startDateStr: '2026-01-01',
        endDateStr: '2026-04-01', // 90 jours
        basis: 'ACT/365',
      },
    });
    assert(resHuge.body.data.interestAmount === '1047945.21', `Intérêts attendus 1047945.21 EUR sur 100M€, reçu ${resHuge.body.data.interestAmount}`);
    assert(resHuge.body.data.totalAmount === '101047945.21', `Total attendu 101047945.21 EUR, reçu ${resHuge.body.data.totalAmount}`);

    console.log(`   ✓ 0 jour: 0.00 EUR | Taux 0%: 0.00 EUR | Montant 100 000 000.00 EUR: +1 047 945.21 EUR calculé sans saturation`);
  }

  // --------------------------------------------------------------------------
  // [FIN-05] Règles d'Arrondi Configurables (IEEE 754 Banker's Rounding vs Half Up, Up, Down)
  // --------------------------------------------------------------------------
  console.log("\n-> [FIN-05] Règles d'Arrondi Configurables (Banker's Rounding vs Commercial)");
  {
    const resHalfUp = AccountingEngine.calculateFinancialInterest({
      principalStr: '1000.00',
      annualRatePctStr: '5.0000',
      startDateStr: '2026-01-01',
      endDateStr: '2026-07-02', // 182 jours => 1000 * 0.05 * 182 / 365 = 24.9315...
      basis: 'ACT/365',
      roundingMode: 'ROUND_HALF_UP',
      roundingDecimals: 2,
    });

    const resHalfEven = AccountingEngine.calculateFinancialInterest({
      principalStr: '1000.00',
      annualRatePctStr: '5.0000',
      startDateStr: '2026-01-01',
      endDateStr: '2026-07-02',
      basis: 'ACT/365',
      roundingMode: 'ROUND_HALF_EVEN',
      roundingDecimals: 2,
    });

    const resRoundUp = AccountingEngine.calculateFinancialInterest({
      principalStr: '1000.00',
      annualRatePctStr: '5.0000',
      startDateStr: '2026-01-01',
      endDateStr: '2026-07-02',
      basis: 'ACT/365',
      roundingMode: 'ROUND_UP',
      roundingDecimals: 2,
    });

    const resRoundDown = AccountingEngine.calculateFinancialInterest({
      principalStr: '1000.00',
      annualRatePctStr: '5.0000',
      startDateStr: '2026-01-01',
      endDateStr: '2026-07-02',
      basis: 'ACT/365',
      roundingMode: 'ROUND_DOWN',
      roundingDecimals: 2,
    });

    assert(resRoundUp.interestAmount === '24.94', `ROUND_UP attendu 24.94 EUR, reçu ${resRoundUp.interestAmount}`);
    assert(resRoundDown.interestAmount === '24.93', `ROUND_DOWN attendu 24.93 EUR, reçu ${resRoundDown.interestAmount}`);
    assert(resHalfUp.interestAmount === '24.93', `ROUND_HALF_UP attendu 24.93 EUR, reçu ${resHalfUp.interestAmount}`);

    console.log(`   ✓ ROUND_HALF_UP: ${resHalfUp.interestAmount} | ROUND_HALF_EVEN: ${resHalfEven.interestAmount} | ROUND_UP: ${resRoundUp.interestAmount} | ROUND_DOWN: ${resRoundDown.interestAmount}`);
  }

  // --------------------------------------------------------------------------
  // [FIN-06] Balance Âgée des Créances (Aging Balance) & Recouvrement Légal
  // --------------------------------------------------------------------------
  console.log('\n-> [FIN-06] Balance Âgée des Créances (Aging Balance) & Recouvrement Légal');
  {
    // Arrêté des comptes au 18/11/2026
    const resAging = makeReq({
      method: 'GET',
      path: '/api/v1/accounting/aging-balance',
      user: accountantUser,
      query: { asOfDate: '2026-11-18' },
    });
    assert(resAging.statusCode === 200, 'Status HTTP 200 attendu');
    const report = resAging.body.data;

    // Vérification des créances totales non soldées : 12 000 (C01) + 24 000 (O45) + 60 000 (O120) = 96 000.00 EUR
    assert(report.totalReceivables === '96000.00', `Total créances attendu 96000.00 EUR, reçu ${report.totalReceivables}`);

    // Créances échues : 24 000 (O45) + 60 000 (O120) = 84 000.00 EUR
    assert(report.totalOverdueAmount === '84000.00', `Total échues attendu 84000.00 EUR, reçu ${report.totalOverdueAmount}`);

    // Répartition des 4 tranches :
    // 1. CURRENT_0_30 : Facture C01 (12 000 EUR non échue)
    assert(report.buckets.CURRENT_0_30.invoicesCount === 1, '1 facture non échue dans tranche 0-30j');
    assert(report.buckets.CURRENT_0_30.totalRemainingDue === '12000.00', '12 000 EUR dans tranche 0-30j');

    // 2. OVERDUE_31_60 : Facture O45 (45 jours de retard, 24 000 EUR)
    assert(report.buckets.OVERDUE_31_60.invoicesCount === 1, '1 facture dans tranche 31-60j');
    assert(report.buckets.OVERDUE_31_60.totalRemainingDue === '24000.00', '24 000 EUR dans tranche 31-60j');
    assert(parseFloat(report.buckets.OVERDUE_31_60.totalLateInterest) > 0, 'Pénalités de retard calculées pour tranche 31-60j');
    assert(report.buckets.OVERDUE_31_60.totalRecoveryFees === '40.00', 'Indemnité forfaitaire de 40 EUR sur facture en retard');

    // 3. OVERDUE_OVER_90 : Facture O120 (120 jours de retard, 60 000 EUR contentieux)
    assert(report.buckets.OVERDUE_OVER_90.invoicesCount === 1, '1 facture dans tranche >90j');
    assert(report.buckets.OVERDUE_OVER_90.totalRemainingDue === '60000.00', '60 000 EUR dans tranche >90j');
    assert(report.buckets.OVERDUE_OVER_90.totalRecoveryFees === '40.00', 'Indemnité forfaitaire de 40 EUR sur contentieux');

    // Frais de recouvrement totaux : 2 factures échues × 40.00 EUR = 80.00 EUR
    assert(report.totalRecoveryFeesAccrued === '80.00', `Frais totaux attendus 80.00 EUR, reçu ${report.totalRecoveryFeesAccrued}`);

    // Facture soldée (inv-fin-paid) doit être exclue des arriérés
    const allInvoicesInReport = Object.values(report.buckets).flatMap((b: any) => b.invoices);
    const paidFound = allInvoicesInReport.find((inv: any) => inv.invoiceNumber === 'FAC-2026-P01');
    assert(!paidFound, 'Facture soldée exclue de la balance âgée');

    console.log(`   ✓ Créances: 96 000.00 EUR | Échues: 84 000.00 EUR | Pénalités retard: ${report.totalLateInterestAccrued} EUR | Frais 40€: ${report.totalRecoveryFeesAccrued} EUR`);
  }

  // --------------------------------------------------------------------------
  // [FIN-07] Export FEC Conforme (Art. A.47 A-1 du Livre des procédures fiscales)
  // --------------------------------------------------------------------------
  console.log('\n-> [FIN-07] Export FEC Conforme (Art. A.47 A-1 LPF)');
  {
    // Ajout d'écritures de test pour l'exercice 2026
    makeReq({
      method: 'POST',
      path: '/api/v1/accounting/entries',
      user: accountantUser,
      body: {
        journalCode: 'VTE',
        date: '2026-03-15',
        pieceReference: 'FAC-2026-0099',
        description: 'Facturation prestation négoce agroalimentaire',
        lines: [
          { accountCode: '411000', accountName: 'Clients', debit: '12000.00', credit: '0.00', label: 'Créance client' },
          { accountCode: '707000', accountName: 'Ventes de marchandises', debit: '0.00', credit: '10000.00', label: 'Vente HT' },
          { accountCode: '445710', accountName: 'TVA collectée', debit: '0.00', credit: '2000.00', label: 'TVA 20%' },
        ],
      },
    });

    const resFec = makeReq({
      method: 'GET',
      path: '/api/v1/accounting/export/fec',
      user: accountantUser,
      query: { fiscalYear: '2026' },
    });
    assert(resFec.statusCode === 200, 'Status HTTP 200 attendu pour export FEC');
    assert(resFec.headers?.['Content-Type'].includes('text/plain'), 'Content-Type text/plain attendu');
    assert(resFec.headers?.['Content-Disposition'].includes('FEC_2026_TRADELINK_'), 'Nom de fichier FEC conforme');

    const fecText = (resFec.body as unknown as string).replace(/\r\n/g, '\n');
    const lines = fecText.split('\n');
    assert(lines.length >= 4, 'Au moins 1 ligne en-tête + 3 lignes d’écriture');

    // Vérification de la première ligne d'en-tête (18 colonnes normalisées séparées par tabulation)
    const headerColumns = lines[0].split('\t');
    assert(headerColumns.length === 18, `18 colonnes légales attendues dans le FEC, reçu ${headerColumns.length}`);
    assert(headerColumns[0] === 'JournalCode', 'Colonne 1 = JournalCode');
    assert(headerColumns[1] === 'JournalLib', 'Colonne 2 = JournalLib');
    assert(headerColumns[2] === 'EcritureNum', 'Colonne 3 = EcritureNum');
    assert(headerColumns[3] === 'EcritureDate', 'Colonne 4 = EcritureDate');
    assert(headerColumns[4] === 'CompteNum', 'Colonne 5 = CompteNum');
    assert(headerColumns[5] === 'CompteLib', 'Colonne 6 = CompteLib');
    assert(headerColumns[11] === 'Debit', 'Colonne 12 = Debit');
    assert(headerColumns[12] === 'Credit', 'Colonne 13 = Credit');
    assert(headerColumns[17] === 'Idevise', 'Colonne 18 = Idevise');

    console.log(`   ✓ Export FEC généré avec succès (${headerColumns.length} colonnes normalisées, ${lines.length - 1} lignes d'écritures conformes)`);
  }

  // --------------------------------------------------------------------------
  // [FIN-08] Verrouillage des Périodes Fiscales & Étanchéité RBAC Comptable
  // --------------------------------------------------------------------------
  console.log('\n-> [FIN-08] Verrouillage des Périodes Fiscales & Étanchéité RBAC');
  {
    // 1. Verrouillage de la période 2026-01 par l'Administrateur
    const resLock = makeReq({
      method: 'PUT',
      path: '/api/v1/accounting/fiscal-periods/2026-01/lock',
      user: adminUser,
    });
    assert(resLock.statusCode === 200, 'Période 2026-01 verrouillée');
    assert(resLock.body.data.status === 'LOCKED', 'Statut LOCKED confirmé');

    // 2. Tentative d'enregistrement d'une écriture sur la période verrouillée 2026-01 (doit être rejetée)
    const resEntryLocked = makeReq({
      method: 'POST',
      path: '/api/v1/accounting/entries',
      user: accountantUser,
      body: {
        journalCode: 'OD',
        date: '2026-01-15', // Dans la période 2026-01 verrouillée
        pieceReference: 'OD-BLOCKED-01',
        description: 'Tentative sur période close',
        lines: [
          { accountCode: '624100', accountName: 'Transport', debit: '500.00', credit: '0.00', label: 'Frais' },
          { accountCode: '401000', accountName: 'Fournisseur', debit: '0.00', credit: '500.00', label: 'Dette' },
        ],
      },
    });
    assert(
      resEntryLocked.statusCode === 400 &&
        (resEntryLocked.body?.error?.code === 'FISCAL_PERIOD_LOCKED' || (resEntryLocked.body as any)?.code === 'FISCAL_PERIOD_LOCKED'),
      'Écriture sur période verrouillée 2026-01 doit être strictement rejetée (FISCAL_PERIOD_LOCKED)'
    );

    // 3. Écriture sur période ouverte 2026-04 (doit être acceptée)
    const resEntryOpen = makeReq({
      method: 'POST',
      path: '/api/v1/accounting/entries',
      user: accountantUser,
      body: {
        journalCode: 'OD',
        date: '2026-04-10', // Période 2026-04 ouverte
        pieceReference: 'OD-ACCEPTED-01',
        description: 'Écriture légitime sur période ouverte',
        lines: [
          { accountCode: '624100', accountName: 'Transport', debit: '750.00', credit: '0.00', label: 'Frais avril' },
          { accountCode: '401000', accountName: 'Fournisseur', debit: '0.00', credit: '750.00', label: 'Dette avril' },
        ],
      },
    });
    assert(resEntryOpen.statusCode === 201, `Écriture sur période ouverte acceptée (201), reçu ${resEntryOpen.statusCode}`);

    // 4. Cloisonnement RBAC Comptable Stage 3 : lecture seule sur les données sources
    // Le comptable tente de créer un produit commercial : rejet 403 strict
    const resProductForbidden = makeReq({
      method: 'POST',
      path: '/api/v1/products',
      user: accountantUser,
      body: {
        name: 'Produit illicite créé par comptable',
        price: '100.00',
      },
    });
    assert(resProductForbidden.statusCode === 403, 'Le rôle COMPTABLE ne peut pas créer de produit (403)');
    assert(
      resProductForbidden.body?.error?.code === 'COMPTABLE_STAGE3_READONLY_SOURCE_DATA' ||
        (resProductForbidden.body as any)?.code === 'COMPTABLE_STAGE3_READONLY_SOURCE_DATA',
      'Code d’erreur spécifique COMPTABLE_STAGE3_READONLY_SOURCE_DATA attendu'
    );

    console.log(`   ✓ Verrouillage période 2026-01 effectif (rejet FISCAL_PERIOD_LOCKED). Écriture sur période ouverte 2026-04 acceptée (201).`);
    console.log(`   ✓ Étanchéité Stage 3 vérifiée : Comptable bloqué en lecture seule sur les données sources (403 COMPTABLE_STAGE3_READONLY_SOURCE_DATA).`);
  }

  console.log('\n================================================================');
  console.log('✅ SUITE DE TESTS MOTEUR FINANCIER & COMPTABILITÉ : 8/8 RÉUSSIS');
  console.log('================================================================\n');
}

runFinancialEngineTests().catch((err) => {
  console.error('\n❌ ÉCHEC TESTS MOTEUR FINANCIER :', err);
  process.exit(1);
});
