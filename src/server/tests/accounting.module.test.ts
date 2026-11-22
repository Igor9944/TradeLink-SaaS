// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS INTÉGRATION COMPTABILITÉ COMPLÈTE (PROMPT 8)
// - Plans comptables configurables (PCG France, IFRS, OHADA)
// - Journaux comptables (VTE, ACH, BNQ, OD)
// - Écritures en partie double Débit = Crédit & Rejet d'écritures déséquilibrées
// - Grand Livre avec soldes progressifs déterministes
// - Balance Générale des comptes équilibrée
// - Rapprochement bancaire automatique & Détection d'écarts
// - Bilan (Actif = Passif) & Compte de Résultat
// - Moteur financier déterministe Decimal.js (Échéancier d’amortissement & Conventions)
// - Export CSV conforme pour l'audit
// ============================================================================

import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { ServerRequestContext, ServerResponsePayload } from '../middlewares/errorAndSecurity.middleware';
import { InvoiceRecord, PaymentRecord, UserRoleCode } from '../../types';
import Decimal from 'decimal.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Échec Assertion : ${message}`);
  }
}

export function createInitialAccountingTestDatabase() {
  const testInvoice: InvoiceRecord = {
    id: 'inv-acct-01',
    invoiceNumber: 'FAC-2026-00441',
    orderId: 'ord-acct-01',
    orderNumber: 'CMD-2026-11223',
    clientId: 'usr-client-01',
    clientName: 'Atlas Import-Export Distribution',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    status: 'PAID',
    subtotal: '20000.00',
    taxAmount: '4000.00',
    totalAmount: '24000.00',
    currency: 'EUR',
    jurisdiction: 'France / UE (TVA 20%)',
    issuedAt: '2026-11-01',
    dueAt: '2026-11-30',
    paidAt: '2026-11-05',
  };

  const testPayment: PaymentRecord = {
    id: 'pay-acct-01',
    paymentReference: 'PAY-STRIPE-881920',
    invoiceId: 'inv-acct-01',
    invoiceNumber: 'FAC-2026-00441',
    clientId: 'usr-client-01',
    supplierId: 'usr-supp-01',
    provider: 'STRIPE',
    amount: '24000.00',
    currency: 'EUR',
    status: 'SUCCEEDED',
    webhookEventId: 'evt_stripe_test_init_01',
    idempotencyVerified: true,
    reconciled: false,
    createdAt: '2026-11-05 14:30',
  };

  return {
    products: [],
    orders: [],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
    quotes: [],
    invoices: [testInvoice],
    payments: [testPayment],
    shipments: [],
    incidents: [],
    stockMovements: [],
    accountingEntries: [],
    logisticsMissions: [],
    vehicles: [],
    transportDocuments: [],
  };
}

export function runAccountingModuleTests(): { passed: number; results: string[] } {
  const repo = new TradeLinkRepositoryStore(createInitialAccountingTestDatabase(), false);
  const app = new TradeLinkApiApplication(repo);
  const results: string[] = [];
  let passed = 0;

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

  // 1. Initialisation des sessions actives via /api/v1/auth/login (Argon2id)
  const accountantLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'c.dupont@tradelink-audit.fr', password: 'ComptableSecure!2026' },
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

  // ==========================================================================
  // [ACCT-01] Plans comptables configurables par juridiction (PCG, IFRS, OHADA)
  // ==========================================================================
  const pcgRes = makeReq({
    method: 'GET',
    path: '/api/v1/accounting/chart-of-accounts',
    query: { framework: 'PCG' },
    user: accountantUser,
  });
  assert(pcgRes.statusCode === 200, 'GET /api/v1/accounting/chart-of-accounts (PCG) retourne 200');
  assert(pcgRes.body.data.accounts.some((a: any) => a.accountCode === '411000'), 'Compte 411000 Clients présent');
  assert(pcgRes.body.data.accounts.some((a: any) => a.accountCode === '512000'), 'Compte 512000 Banque présent');

  const ifrsRes = makeReq({
    method: 'GET',
    path: '/api/v1/accounting/chart-of-accounts',
    query: { framework: 'IFRS' },
    user: accountantUser,
  });
  assert(ifrsRes.statusCode === 200, 'Plan IFRS accessible');
  assert(ifrsRes.body.data.accounts.some((a: any) => a.accountCode === '4000'), 'Compte IFRS 4000 Trade Receivables présent');

  const ohadaRes = makeReq({
    method: 'GET',
    path: '/api/v1/accounting/chart-of-accounts',
    query: { framework: 'OHADA' },
    user: accountantUser,
  });
  assert(ohadaRes.statusCode === 200, 'Plan OHADA accessible');
  assert(ohadaRes.body.data.accounts.some((a: any) => a.accountCode === '521'), 'Compte OHADA 521 Banques présent');
  passed++;
  results.push(
    `✓ [ACCT-01] Référentiel des plans comptables multijuridictions configurables (PCG, IFRS, OHADA) validé`
  );

  // ==========================================================================
  // [ACCT-02] Journaux comptables & Écritures en partie double Débit = Crédit
  // ==========================================================================
  const journalsRes = makeReq({
    method: 'GET',
    path: '/api/v1/accounting/journals',
    user: accountantUser,
  });
  assert(journalsRes.statusCode === 200, 'Journaux comptables retournent 200');
  assert(journalsRes.body.data.length === 4, '4 journaux obligatoires (VTE, ACH, BNQ, OD)');

  // 1. Rejet strict d'une écriture déséquilibrée (Débit: 1000, Crédit: 900)
  const unbalancedRes = makeReq({
    method: 'POST',
    path: '/api/v1/accounting/entries',
    user: accountantUser,
    body: {
      journalCode: 'OD',
      date: '2026-11-10',
      pieceReference: 'OD-TEST-FAUX',
      description: 'Test écriture déséquilibrée volontaire',
      lines: [
        { accountCode: '627800', accountName: 'Frais bancaires', debit: '1000.00', credit: '0.00', label: 'Ligne 1' },
        { accountCode: '512000', accountName: 'Banque', debit: '0.00', credit: '900.00', label: 'Ligne 2 déséquilibrée' },
      ],
    },
  });
  assert(unbalancedRes.statusCode === 400, 'Une écriture comptable déséquilibrée doit renvoyer 400');
  assert(
    unbalancedRes.body.error?.code === 'UNBALANCED_ACCOUNTING_ENTRY',
    'Code erreur UNBALANCED_ACCOUNTING_ENTRY obligatoire'
  );

  // 2. Saisie d'une écriture équilibrée conforme (Débit = Crédit = 5000.00 EUR)
  const balancedRes = makeReq({
    method: 'POST',
    path: '/api/v1/accounting/entries',
    user: accountantUser,
    body: {
      journalCode: 'ACH',
      date: '2026-11-12',
      pieceReference: 'FAC-FOUR-9912',
      description: 'Achat consommables industriels et emballages',
      lines: [
        { accountCode: '607000', accountName: 'Achats de marchandises', debit: '4166.67', credit: '0.00', label: 'Marchandises HT' },
        { accountCode: '445660', accountName: 'TVA déductible', debit: '833.33', credit: '0.00', label: 'TVA déductible 20%' },
        { accountCode: '401000', accountName: 'Fournisseurs', auxiliaryCode: 'FOUR-SUPP-01', debit: '0.00', credit: '5000.00', label: 'Dette fournisseur TTC' },
      ],
    },
  });
  assert(balancedRes.statusCode === 201, 'Écriture équilibrée validée en 201');
  assert(balancedRes.body.data.isBalanced === true, 'isBalanced = true');
  assert(balancedRes.body.data.totalDebit === '5000.00', 'Total Débit = 5000.00');
  assert(balancedRes.body.data.totalCredit === '5000.00', 'Total Crédit = 5000.00');
  passed++;
  results.push(
    `✓ [ACCT-02] Validation rigoureuse de la partie double (Débit = Crédit) & Rejet strict des écritures déséquilibrées (400)`
  );

  // ==========================================================================
  // [ACCT-03] Grand Livre (General Ledger) avec soldes progressifs déterministes
  // ==========================================================================
  // Ajout d'écritures de ventes et trésorerie pour alimenter le grand livre
  makeReq({
    method: 'POST',
    path: '/api/v1/accounting/entries',
    user: accountantUser,
    body: {
      journalCode: 'VTE',
      date: '2026-11-01',
      pieceReference: 'FAC-2026-00441',
      description: 'Facture vente Atlas Import',
      lines: [
        { accountCode: '411000', accountName: 'Clients', debit: '24000.00', credit: '0.00', label: 'Créance client' },
        { accountCode: '707000', accountName: 'Ventes de marchandises B2B', debit: '0.00', credit: '20000.00', label: 'Vente HT' },
        { accountCode: '445710', accountName: 'TVA collectée', debit: '0.00', credit: '4000.00', label: 'TVA 20%' },
      ],
    },
  });

  makeReq({
    method: 'POST',
    path: '/api/v1/accounting/entries',
    user: accountantUser,
    body: {
      journalCode: 'BNQ',
      date: '2026-11-05',
      pieceReference: 'PAY-STRIPE-881920',
      description: 'Règlement Stripe Facture FAC-2026-00441',
      lines: [
        { accountCode: '512000', accountName: 'Banque Trésorerie Principale', debit: '23663.75', credit: '0.00', label: 'Net perçu banque' },
        { accountCode: '627800', accountName: 'Commissions et frais bancaires Stripe', debit: '336.25', credit: '0.00', label: 'Frais Stripe' },
        { accountCode: '411000', accountName: 'Clients', debit: '0.00', credit: '24000.00', label: 'Règlement client' },
      ],
    },
  });

  const ledgerRes = makeReq({
    method: 'GET',
    path: '/api/v1/accounting/general-ledger',
    user: accountantUser,
  });
  assert(ledgerRes.statusCode === 200, 'Grand Livre retourné en 200');
  const ledgerAccounts = ledgerRes.body.data;
  const clientAcc = ledgerAccounts.find((a: any) => a.accountCode === '411000');
  assert(clientAcc, 'Compte 411000 présent dans le Grand Livre');
  assert(clientAcc.totalDebit === '24000.00', 'Débit cumulé Client = 24000.00');
  assert(clientAcc.totalCredit === '24000.00', 'Crédit cumulé Client = 24000.00');
  assert(clientAcc.balanceDebit === '0.00', 'Solde Client après règlement intégral = 0.00 (lettrage parfait)');
  passed++;
  results.push(
    `✓ [ACCT-03] Grand Livre (General Ledger) avec calcul des soldes progressifs et lettrage validé`
  );

  // ==========================================================================
  // [ACCT-04] Balance Générale des comptes (Trial Balance) & Équilibre global
  // ==========================================================================
  const trialRes = makeReq({
    method: 'GET',
    path: '/api/v1/accounting/trial-balance',
    user: accountantUser,
  });
  assert(trialRes.statusCode === 200, 'Balance générale retournée en 200');
  const trialData = trialRes.body.data;
  assert(trialData.isBalanced === true, 'Balance générale rigoureusement équilibrée');
  assert(trialData.totalDebit === trialData.totalCredit, 'Total des Débits = Total des Crédits');
  assert(
    trialData.totalSoldeDebiteur === trialData.totalSoldeCrediteur,
    'Total des Soldes Débiteurs = Total des Soldes Créditeurs'
  );
  passed++;
  results.push(
    `✓ [ACCT-04] Balance Générale des comptes (Trial Balance) avec égalité stricte Débits/Crédits (${trialData.totalDebit} EUR)`
  );

  // ==========================================================================
  // [ACCT-05] Rapprochement bancaire automatique & Détection d'écarts
  // ==========================================================================
  const bankStatementLines = [
    {
      id: 'stmt-01',
      statementDate: '2026-11-05',
      valueDate: '2026-11-05',
      reference: 'PAY-STRIPE-881920',
      label: 'Virement Stripe Payments Europe FAC-2026-00441',
      amount: '24000.00',
      currency: 'EUR',
    },
    {
      id: 'stmt-02',
      statementDate: '2026-11-08',
      valueDate: '2026-11-08',
      reference: 'VIR-INCONNU-7711',
      label: 'Virement international SWIFT non identifié',
      amount: '8500.00',
      currency: 'EUR',
    },
  ];

  const reconRes = makeReq({
    method: 'POST',
    path: '/api/v1/accounting/reconcile',
    user: accountantUser,
    body: {
      bankLines: bankStatementLines,
    },
  });
  assert(reconRes.statusCode === 200, 'Rapprochement bancaire retourne 200');
  const reconResults = reconRes.body.data;
  assert(reconResults.length === 2, '2 lignes de relevé bancaire traitées');
  const matchedLine = reconResults.find((r: any) => r.statementLineId === 'stmt-01');
  assert(matchedLine && matchedLine.status === 'MATCHED', 'Ligne 1 rapprochée avec succès (MATCHED)');
  const unmatchedLine = reconResults.find((r: any) => r.statementLineId === 'stmt-02');
  assert(unmatchedLine && unmatchedLine.status === 'UNMATCHED', 'Ligne 2 isolée en attente (UNMATCHED)');
  passed++;
  results.push(
    `✓ [ACCT-05] Rapprochement bancaire automatisé (lettrage parfait MATCHED & détection UNMATCHED) validé`
  );

  // ==========================================================================
  // [ACCT-06] États financiers automatisés : Bilan (Actif = Passif) & Compte de Résultat
  // ==========================================================================
  const finStmtsRes = makeReq({
    method: 'GET',
    path: '/api/v1/accounting/financial-statements',
    query: { framework: 'PCG' },
    user: accountantUser,
  });
  assert(finStmtsRes.statusCode === 200, 'États financiers retournés en 200');
  const { balanceSheet, incomeStatement } = finStmtsRes.body.data;
  assert(balanceSheet.isBalanced === true, 'Bilan comptable équilibré');
  assert(balanceSheet.assets.totalAssets === balanceSheet.liabilities.totalLiabilitiesAndEquity, 'Total Actif = Total Passif');
  assert(parseFloat(incomeStatement.operatingRevenue) >= 20000, 'Chiffre d’affaires enregistré conforme');
  passed++;
  results.push(
    `✓ [ACCT-06] États financiers automatisés conformes : Bilan Actif/Passif équilibré & Compte de Résultat validés`
  );

  // ==========================================================================
  // [ACCT-07] Moteur financier étendu Decimal.js (Échéancier d'amortissement & Conventions)
  // ==========================================================================
  const amortRes = makeReq({
    method: 'POST',
    path: '/api/v1/accounting/calc/amortization',
    user: accountantUser,
    body: {
      principalStr: '120000.00',
      annualRatePctStr: '4.80',
      durationMonths: 12,
      startDateStr: '2026-01-01',
    },
  });
  assert(amortRes.statusCode === 200, 'Calcul échéancier d’amortissement retourne 200');
  const amortData = amortRes.body.data;
  assert(amortData.schedule.length === 12, '12 mensualités générées');
  const lastRow = amortData.schedule[11];
  assert(lastRow.remainingPrincipalEnd === '0.00', 'Capital restant dû en fin d’échéancier = 0.00 EUR (précision Decimal.js)');
  assert(new Decimal(amortData.totalInterest).gt(0), 'Intérêts financiers cumulés calculés');

  // Test de la convention ACT/ACT bissextile (2028 = année bissextile de 366 jours)
  const calcLeapRes = makeReq({
    method: 'POST',
    path: '/api/v1/calc/simple',
    user: accountantUser,
    body: {
      principal: '100000.00',
      annualRatePct: '3.66',
      startDate: '2028-01-01',
      endDate: '2028-12-31',
      basis: 'ACT/ACT',
    },
  });
  assert(calcLeapRes.statusCode === 200, 'Calcul ACT/ACT bissextile réussi');
  assert(calcLeapRes.body.data.isLeapYearDetected === true, 'Année bissextile 2028 détectée (366 jours)');
  assert(calcLeapRes.body.data.interestAmount === '3650.00', 'Intérêt ACT/ACT exact = 3650.00 EUR');
  passed++;
  results.push(
    `✓ [ACCT-07] Moteur financier déterministe Decimal.js (Échéancier de prêt 12 mois à solde 0.00 & Convention ACT/ACT 366j) validé`
  );

  // ==========================================================================
  // [ACCT-08] Export CSV conforme pour l'audit
  // ==========================================================================
  const csvRes = makeReq({
    method: 'GET',
    path: '/api/v1/accounting/export/trial-balance.csv',
    user: accountantUser,
  });
  assert(csvRes.statusCode === 200, 'Export CSV retourne 200');
  assert(csvRes.headers['Content-Type']?.includes('text/csv'), 'Header text/csv présent');
  const csvContent = String(csvRes.body);
  assert(csvContent.includes('Compte;Intitulé;Catégorie;Débit;Crédit'), 'En-têtes CSV conformes');
  assert(csvContent.includes('411000'), 'Compte client 411000 présent dans l’export CSV');
  passed++;
  results.push(
    `✓ [ACCT-08] Export CSV conforme de la Balance Générale pour l’audit et l’administration fiscale validé`
  );

  return { passed, results };
}

// Exécution directe si invoqué par Node.js
if (typeof require !== 'undefined' && require.main === module) {
  const { passed, results } = runAccountingModuleTests();
  console.log('\n=== SUITE DE TESTS MODULE COMPTABILITÉ TRADELINK V6.0 (' + passed + '/8 RÉUSSIS) ===');
  results.forEach((r) => console.log(r));
}
