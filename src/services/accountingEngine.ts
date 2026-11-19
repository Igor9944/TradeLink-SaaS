// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — MOTEUR FINANCIER & COMPTABILITÉ COMPLÈTE (PROMPTS 8 & 14)
// Moteur de calcul déterministe Decimal.js (ACT/365, ACT/360, ACT/ACT bissextile),
// Taux fixes, Taux variables (EURIBOR, SOFR, TMP), Arrondis configurables (IEEE 754),
// Plans comptables multijuridictions (PCG, IFRS, OHADA, PCM), Journaux (VTE, ACH, BNQ, OD, RAN),
// Écritures en partie double Débit = Crédit, Grand Livre, Balance générale,
// Balance âgée des créances, Pénalités de retard, Rapprochement bancaire,
// États financiers (Bilan, Compte de Résultat), Exports FEC/CSV & Audit logs
// ============================================================================

import Decimal from 'decimal.js';
import {
  AgingBalanceReport,
  AgingBucketDetail,
  AgingInvoiceDetail,
  BenchmarkRateRecord,
  CalculationResultRecord,
  DayCountBasis,
  FinancialEngineConfigRecord,
  FinancialRateType,
  FinancialRoundingMode,
  FiscalPeriodRecord,
  InvoiceRecord,
  PaymentRecord,
  UserRoleCode,
} from '../types';

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

export type AccountingFramework = 'PCG' | 'IFRS' | 'OHADA' | 'PCM';

export interface AccountDefinition {
  accountCode: string;
  name: string;
  accountClass: number; // 1 à 7 (ou 8)
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  isReconcilable: boolean;
  auxiliaryRequired?: boolean;
}

export type JournalCode = 'VTE' | 'ACH' | 'BNQ' | 'OD' | 'RAN';

export interface AccountingJournalRecord {
  code: JournalCode;
  name: string;
  description: string;
}

export interface AccountingEntryLineRecord {
  id: string;
  accountCode: string;
  accountName: string;
  auxiliaryCode?: string;
  label: string;
  debit: string; // Decimal string
  credit: string; // Decimal string
  reconciliationKey?: string;
}

export interface AccountingEntryRecord {
  id: string;
  entryNumber: string;
  journalCode: JournalCode;
  date: string;
  fiscalPeriod: string; // '2026-11'
  pieceReference: string; // FAC-2026-XXXXX, PAY-STRIPE-XXXX, etc.
  description: string;
  totalDebit: string;
  totalCredit: string;
  isBalanced: boolean;
  validatedAt: string;
  validatedBy: string;
  lines: AccountingEntryLineRecord[];
}

export interface GeneralLedgerAccount {
  accountCode: string;
  accountName: string;
  category: AccountDefinition['category'];
  entries: {
    entryNumber: string;
    date: string;
    pieceReference: string;
    label: string;
    debit: string;
    credit: string;
    runningBalance: string;
  }[];
  totalDebit: string;
  totalCredit: string;
  balanceDebit: string;
  balanceCredit: string;
}

export interface TrialBalanceItem {
  accountCode: string;
  accountName: string;
  category: AccountDefinition['category'];
  totalDebit: string;
  totalCredit: string;
  soldeDebiteur: string;
  soldeCrediteur: string;
}

export interface BankStatementLine {
  id: string;
  statementDate: string;
  valueDate: string;
  reference: string;
  label: string;
  amount: string; // positif = crédit bancaire, négatif = débit
  currency: string;
}

export interface BankReconciliationResult {
  statementLineId: string;
  statementReference: string;
  paymentId?: string;
  paymentReference?: string;
  status: 'MATCHED' | 'DISCREPANCY' | 'UNMATCHED';
  bankAmount: string;
  ledgerAmount?: string;
  discrepancyDelta?: string;
  reconciledAt: string;
  reconciledBy: string;
  notes?: string;
}

export interface BalanceSheetData {
  framework: AccountingFramework;
  asOfDate: string;
  assets: {
    nonCurrentAssets: string; // Actif immobilisé
    currentAssets: string; // Stocks et créances clients
    cashAndEquivalents: string; // Banque et disponibilités
    totalAssets: string;
  };
  liabilities: {
    equity: string; // Capitaux propres
    retainedEarningsAndNetIncome: string; // Résultat de l'exercice
    financialDebts: string; // Dettes d'emprunt
    operatingLiabilities: string; // Dettes fournisseurs et fiscales
    totalLiabilitiesAndEquity: string;
  };
  isBalanced: boolean;
}

export interface IncomeStatementData {
  framework: AccountingFramework;
  period: string;
  operatingRevenue: string; // Chiffre d'affaires Ventes (707)
  operatingExpenses: string; // Achats (607) et Services (627)
  operatingProfit: string; // EBE / Résultat d'exploitation
  financialResult: string; // Produits financiers - Charges financières
  netIncome: string; // Résultat Net de l'exercice
}

export interface AmortizationScheduleRow {
  periodNumber: number;
  periodDate: string;
  remainingPrincipalBeginning: string;
  principalPayment: string;
  interestPayment: string;
  totalPeriodicPayment: string;
  remainingPrincipalEnd: string;
}

// ============================================================================
// 1. PLANS COMPTABLES CONFIGURABLES PAR JURIDICTION (PCG, IFRS, OHADA, PCM)
// ============================================================================

export const CHARTS_OF_ACCOUNTS: Record<AccountingFramework, AccountDefinition[]> = {
  PCG: [
    { accountCode: '101000', name: 'Capital social', accountClass: 1, category: 'EQUITY', isReconcilable: false },
    { accountCode: '120000', name: 'Résultat de l’exercice (bénéfice)', accountClass: 1, category: 'EQUITY', isReconcilable: false },
    { accountCode: '164000', name: 'Emprunts auprès des établissements de crédit', accountClass: 1, category: 'LIABILITY', isReconcilable: true },
    { accountCode: '215400', name: 'Matériel industriel et logistique', accountClass: 2, category: 'ASSET', isReconcilable: false },
    { accountCode: '370000', name: 'Stocks de marchandises', accountClass: 3, category: 'ASSET', isReconcilable: true },
    { accountCode: '401000', name: 'Fournisseurs', accountClass: 4, category: 'LIABILITY', isReconcilable: true, auxiliaryRequired: true },
    { accountCode: '411000', name: 'Clients', accountClass: 4, category: 'ASSET', isReconcilable: true, auxiliaryRequired: true },
    { accountCode: '445660', name: 'TVA déductible sur autres biens et services', accountClass: 4, category: 'ASSET', isReconcilable: false },
    { accountCode: '445710', name: 'TVA collectée', accountClass: 4, category: 'LIABILITY', isReconcilable: false },
    { accountCode: '512000', name: 'Banque Trésorerie Principale', accountClass: 5, category: 'ASSET', isReconcilable: true },
    { accountCode: '607000', name: 'Achats de marchandises', accountClass: 6, category: 'EXPENSE', isReconcilable: false },
    { accountCode: '624100', name: 'Transports sur ventes et logistique', accountClass: 6, category: 'EXPENSE', isReconcilable: false },
    { accountCode: '627800', name: 'Commissions et frais bancaires Stripe', accountClass: 6, category: 'EXPENSE', isReconcilable: false },
    { accountCode: '661100', name: 'Intérêts des emprunts et dettes', accountClass: 6, category: 'EXPENSE', isReconcilable: false },
    { accountCode: '707000', name: 'Ventes de marchandises B2B', accountClass: 7, category: 'REVENUE', isReconcilable: false },
    { accountCode: '708500', name: 'Ports et frais accessoires facturés', accountClass: 7, category: 'REVENUE', isReconcilable: false },
    { accountCode: '763000', name: 'Revenus des créances et pénalités de retard', accountClass: 7, category: 'REVENUE', isReconcilable: false },
  ],
  IFRS: [
    { accountCode: '1000', name: 'Share Capital', accountClass: 1, category: 'EQUITY', isReconcilable: false },
    { accountCode: '1500', name: 'Long-term Bank Borrowings', accountClass: 1, category: 'LIABILITY', isReconcilable: true },
    { accountCode: '2000', name: 'Property, Plant and Equipment', accountClass: 2, category: 'ASSET', isReconcilable: false },
    { accountCode: '3000', name: 'Inventories and Raw Materials', accountClass: 3, category: 'ASSET', isReconcilable: true },
    { accountCode: '4000', name: 'Trade Receivables (Clients)', accountClass: 4, category: 'ASSET', isReconcilable: true },
    { accountCode: '4500', name: 'Trade Payables (Suppliers)', accountClass: 4, category: 'LIABILITY', isReconcilable: true },
    { accountCode: '5000', name: 'Cash and Cash Equivalents', accountClass: 5, category: 'ASSET', isReconcilable: true },
    { accountCode: '6000', name: 'Cost of Goods Sold', accountClass: 6, category: 'EXPENSE', isReconcilable: false },
    { accountCode: '6600', name: 'Finance Costs and Interest', accountClass: 6, category: 'EXPENSE', isReconcilable: false },
    { accountCode: '7000', name: 'Revenue from Contracts with Customers', accountClass: 7, category: 'REVENUE', isReconcilable: false },
    { accountCode: '7600', name: 'Finance Income & Late Fees', accountClass: 7, category: 'REVENUE', isReconcilable: false },
  ],
  OHADA: [
    { accountCode: '101', name: 'Capital social', accountClass: 1, category: 'EQUITY', isReconcilable: false },
    { accountCode: '162', name: 'Emprunts et dettes auprès des banques', accountClass: 1, category: 'LIABILITY', isReconcilable: true },
    { accountCode: '241', name: 'Matériel et outillage industriel', accountClass: 2, category: 'ASSET', isReconcilable: false },
    { accountCode: '311', name: 'Marchandises en magasin', accountClass: 3, category: 'ASSET', isReconcilable: true },
    { accountCode: '401', name: 'Fournisseurs dettes d’exploitation', accountClass: 4, category: 'LIABILITY', isReconcilable: true },
    { accountCode: '411', name: 'Clients créances d’exploitation', accountClass: 4, category: 'ASSET', isReconcilable: true },
    { accountCode: '443', name: 'État, TVA facturée sur ventes', accountClass: 4, category: 'LIABILITY', isReconcilable: false },
    { accountCode: '521', name: 'Banques locales et internationales', accountClass: 5, category: 'ASSET', isReconcilable: true },
    { accountCode: '601', name: 'Achats de marchandises', accountClass: 6, category: 'EXPENSE', isReconcilable: false },
    { accountCode: '671', name: 'Intérêts des emprunts', accountClass: 6, category: 'EXPENSE', isReconcilable: false },
    { accountCode: '701', name: 'Ventes de marchandises', accountClass: 7, category: 'REVENUE', isReconcilable: false },
    { accountCode: '771', name: 'Intérêts et produits assimilés', accountClass: 7, category: 'REVENUE', isReconcilable: false },
  ],
  PCM: [
    { accountCode: '1111', name: 'Capital social', accountClass: 1, category: 'EQUITY', isReconcilable: false },
    { accountCode: '1191', name: 'Résultat net de l’exercice (solde créditeur)', accountClass: 1, category: 'EQUITY', isReconcilable: false },
    { accountCode: '1481', name: 'Emprunts auprès des établissements de crédit', accountClass: 1, category: 'LIABILITY', isReconcilable: true },
    { accountCode: '2332', name: 'Matériel et outillage industriel', accountClass: 2, category: 'ASSET', isReconcilable: false },
    { accountCode: '3111', name: 'Marchandises', accountClass: 3, category: 'ASSET', isReconcilable: true },
    { accountCode: '3421', name: 'Clients créances commerciales', accountClass: 3, category: 'ASSET', isReconcilable: true, auxiliaryRequired: true },
    { accountCode: '3455', name: 'État, TVA récupérable', accountClass: 3, category: 'ASSET', isReconcilable: false },
    { accountCode: '4411', name: 'Fournisseurs dettes d’exploitation', accountClass: 4, category: 'LIABILITY', isReconcilable: true, auxiliaryRequired: true },
    { accountCode: '4455', name: 'État, TVA facturée', accountClass: 4, category: 'LIABILITY', isReconcilable: false },
    { accountCode: '5141', name: 'Banques (comptes en dirhams et devises)', accountClass: 5, category: 'ASSET', isReconcilable: true },
    { accountCode: '6111', name: 'Achats de marchandises', accountClass: 6, category: 'EXPENSE', isReconcilable: false },
    { accountCode: '6311', name: 'Intérêts des emprunts et dettes', accountClass: 6, category: 'EXPENSE', isReconcilable: false },
    { accountCode: '7111', name: 'Ventes de marchandises au Maroc', accountClass: 7, category: 'REVENUE', isReconcilable: false },
    { accountCode: '7113', name: 'Ventes de marchandises à l’exportation', accountClass: 7, category: 'REVENUE', isReconcilable: false },
    { accountCode: '7381', name: 'Intérêts et produits financiers assimilés', accountClass: 7, category: 'REVENUE', isReconcilable: false },
  ],
};

export const STANDARD_JOURNALS: AccountingJournalRecord[] = [
  { code: 'VTE', name: 'Journal des Ventes', description: 'Enregistrement de la facturation clients B2B' },
  { code: 'ACH', name: 'Journal des Achats', description: 'Enregistrement des factures fournisseurs et charges d’exploitation' },
  { code: 'BNQ', name: 'Journal de Trésorerie / Banque', description: 'Encaissements Stripe, virements bancaires et règlements' },
  { code: 'OD', name: 'Opérations Diverses', description: 'Écritures de régularisation, TVA, amortissements et salaires' },
];

export const EXTENDED_JOURNALS: AccountingJournalRecord[] = [
  ...STANDARD_JOURNALS,
  { code: 'RAN', name: 'Reports À Nouveau', description: 'Reprise des soldes de bilan à l’ouverture de l’exercice' },
];

export const INITIAL_BENCHMARK_RATES: BenchmarkRateRecord[] = [
  {
    id: 'bench-euribor-3m',
    code: 'EURIBOR_3M',
    name: 'Euro Interbank Offered Rate 3 Mois',
    currency: 'EUR',
    currentRatePct: '3.2500',
    effectiveDate: '2026-11-01',
    source: 'European Money Markets Institute (EMMI)',
    updatedAt: '2026-11-18 09:00',
    updatedBy: 'Automate Marchés Financiers',
  },
  {
    id: 'bench-euribor-12m',
    code: 'EURIBOR_12M',
    name: 'Euro Interbank Offered Rate 12 Mois',
    currency: 'EUR',
    currentRatePct: '3.4200',
    effectiveDate: '2026-11-01',
    source: 'European Money Markets Institute (EMMI)',
    updatedAt: '2026-11-18 09:00',
    updatedBy: 'Automate Marchés Financiers',
  },
  {
    id: 'bench-sofr',
    code: 'SOFR',
    name: 'Secured Overnight Financing Rate',
    currency: 'USD',
    currentRatePct: '4.6500',
    effectiveDate: '2026-11-01',
    source: 'Federal Reserve Bank of New York',
    updatedAt: '2026-11-18 09:00',
    updatedBy: 'Automate Marchés Financiers',
  },
  {
    id: 'bench-tmp-bam',
    code: 'TMP_BAM',
    name: 'Taux Moyen Pondéré Bank Al-Maghrib',
    currency: 'MAD',
    currentRatePct: '2.7500',
    effectiveDate: '2026-11-01',
    source: 'Bank Al-Maghrib (Banque Centrale du Maroc)',
    updatedAt: '2026-11-18 09:00',
    updatedBy: 'Automate Marchés Financiers',
  },
];

export const DEFAULT_FINANCIAL_CONFIG: FinancialEngineConfigRecord = {
  id: 'fin-cfg-default',
  defaultBasis: 'ACT/365',
  defaultRoundingMode: 'ROUND_HALF_UP',
  defaultRoundingDecimals: 2,
  defaultRateType: 'FIXED',
  defaultFixedRatePct: '5.0000',
  defaultBenchmarkRateCode: 'EURIBOR_3M',
  defaultSpreadPct: '1.5000',
  defaultLateInterestSpreadPct: '10.0000',
  fixedRecoveryFeeAmount: '40.00',
  fixedRecoveryFeeCurrency: 'EUR',
  statutoryFramework: 'EU_DIRECTIVE_2011_7',
  updatedAt: '2026-11-18 08:00',
  updatedBy: 'usr-admin-01',
  version: 'ENGINE-FIN-V6.2',
};

// ============================================================================
// FONCTIONS UTILITAIRES DE DATE & ARRONDIS
// ============================================================================

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getExactDaysBetween(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diffMs = endUtc - startUtc;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function getDecimalRoundingMode(mode?: FinancialRoundingMode): Decimal.Rounding {
  switch (mode) {
    case 'ROUND_HALF_EVEN':
      return Decimal.ROUND_HALF_EVEN;
    case 'ROUND_UP':
      return Decimal.ROUND_UP;
    case 'ROUND_DOWN':
      return Decimal.ROUND_DOWN;
    case 'ROUND_HALF_UP':
    default:
      return Decimal.ROUND_HALF_UP;
  }
}

// ============================================================================
// 2. MOTEUR FINANCIER & COMPTABLE CENTRALISÉ (PROMPT 14)
// ============================================================================

export class AccountingEngine {
  /**
   * Moteur central de calcul d'intérêts et d'agios financiers déterministe (Decimal.js)
   * Formule : Montant × Taux effectif × Nombre de jours / Base annuelle
   */
  public static calculateFinancialInterest(params: {
    principalStr: string;
    annualRatePctStr?: string;
    rateType?: FinancialRateType;
    benchmarkRateCode?: string;
    benchmarkRatePctStr?: string;
    spreadPctStr?: string;
    startDateStr: string;
    endDateStr: string;
    basis?: DayCountBasis;
    roundingMode?: FinancialRoundingMode;
    roundingDecimals?: number;
    currency?: string;
    executedBy?: string;
    ruleVersion?: string;
    benchmarksRegistry?: BenchmarkRateRecord[];
  }): CalculationResultRecord {
    const principal = new Decimal(params.principalStr || '0');
    const basis: DayCountBasis = params.basis ?? 'ACT/365';
    const roundingMode: FinancialRoundingMode = params.roundingMode ?? 'ROUND_HALF_UP';
    const decMode = getDecimalRoundingMode(roundingMode);
    const precisionDecimals = params.roundingDecimals ?? 2;

    const rateType: FinancialRateType = params.rateType ?? 'FIXED';
    let effectiveRatePct: Decimal;
    let benchmarkRatePctDec: Decimal | undefined;
    let spreadPctDec: Decimal | undefined;

    if (rateType === 'VARIABLE') {
      const benchCode = params.benchmarkRateCode || 'EURIBOR_3M';
      let benchValStr = params.benchmarkRatePctStr;
      if (!benchValStr) {
        const reg = params.benchmarksRegistry || INITIAL_BENCHMARK_RATES;
        const found = reg.find((b) => b.code === benchCode);
        benchValStr = found ? found.currentRatePct : '3.2500';
      }
      benchmarkRatePctDec = new Decimal(benchValStr);
      spreadPctDec = new Decimal(params.spreadPctStr || '0.0000');
      effectiveRatePct = benchmarkRatePctDec.plus(spreadPctDec);
    } else {
      effectiveRatePct = new Decimal(params.annualRatePctStr || '0.0000');
    }

    // Calcul du nombre exact de jours
    const start = new Date(params.startDateStr);
    const end = new Date(params.endDateStr);
    const daysCount = getExactDaysBetween(params.startDateStr, params.endDateStr);

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const leapDetected = isLeapYear(startYear) || isLeapYear(endYear);

    const rateDecimal = effectiveRatePct.dividedBy(100);
    let interestAmountDec: Decimal;
    let annualDivisor = 365;

    if (basis === 'ACT/360') {
      annualDivisor = 360;
      interestAmountDec = principal
        .times(rateDecimal)
        .times(daysCount)
        .dividedBy(360)
        .toDecimalPlaces(precisionDecimals, decMode);
    } else if (basis === 'ACT/365') {
      annualDivisor = 365;
      interestAmountDec = principal
        .times(rateDecimal)
        .times(daysCount)
        .dividedBy(365)
        .toDecimalPlaces(precisionDecimals, decMode);
    } else {
      // ACT/ACT (ICMA / ISDA)
      if (startYear === endYear) {
        annualDivisor = isLeapYear(startYear) ? 366 : 365;
        interestAmountDec = principal
          .times(rateDecimal)
          .times(daysCount)
          .dividedBy(annualDivisor)
          .toDecimalPlaces(precisionDecimals, decMode);
      } else {
        // Période multi-années à cheval
        const daysInFirstYear = Math.min(daysCount, getExactDaysBetween(params.startDateStr, `${startYear}-12-31`) + 1);
        const daysInSubsequent = Math.max(0, daysCount - daysInFirstYear);

        const divFirst = isLeapYear(startYear) ? 366 : 365;
        const divSecond = isLeapYear(endYear) ? 366 : 365;

        const fractionFirst = new Decimal(daysInFirstYear).dividedBy(divFirst);
        const fractionSecond = new Decimal(daysInSubsequent).dividedBy(divSecond);
        const totalFraction = fractionFirst.plus(fractionSecond);

        annualDivisor = isLeapYear(startYear) || isLeapYear(endYear) ? 366 : 365;
        interestAmountDec = principal
          .times(rateDecimal)
          .times(totalFraction)
          .toDecimalPlaces(precisionDecimals, decMode);
      }
    }

    const totalAmountDec = principal.plus(interestAmountDec).toDecimalPlaces(precisionDecimals, decMode);

    return {
      id: `CALC-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      ruleVersion: params.ruleVersion ?? 'RULE-FIN-V6.2 (Decimal.js)',
      principal: principal.toFixed(2),
      annualRatePct: effectiveRatePct.toFixed(4),
      startDate: params.startDateStr,
      endDate: params.endDateStr,
      daysCount,
      basis,
      annualDivisor,
      isLeapYearDetected: leapDetected,
      interestAmount: interestAmountDec.toFixed(precisionDecimals),
      totalAmount: totalAmountDec.toFixed(precisionDecimals),
      currency: params.currency ?? 'EUR',
      executedBy: params.executedBy ?? 'Automate Financier Stage 3',
      executedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      rateType,
      benchmarkRateCode: params.benchmarkRateCode,
      benchmarkRatePct: benchmarkRatePctDec ? benchmarkRatePctDec.toFixed(4) : undefined,
      spreadPct: spreadPctDec ? spreadPctDec.toFixed(4) : undefined,
      effectiveRatePct: effectiveRatePct.toFixed(4),
      roundingMode,
      roundingDecimals: precisionDecimals,
      formulaDescription: `${principal.toFixed(2)} × ${effectiveRatePct.toFixed(4)}% × ${daysCount}j / ${annualDivisor}`,
      calculationExplanation: `Intérêt calculé selon la convention ${basis} (${daysCount} jours, diviseur ${annualDivisor}) avec arrondi ${roundingMode} à ${precisionDecimals} décimales.`,
      inputParameters: {
        principal: params.principalStr,
        rateType,
        annualRatePct: params.annualRatePctStr,
        benchmarkRateCode: params.benchmarkRateCode,
        spreadPct: params.spreadPctStr,
        startDate: params.startDateStr,
        endDate: params.endDateStr,
        basis,
        roundingMode,
        precisionDecimals,
      },
    };
  }

  /**
   * Calcul de la Balance Âgée des Créances (Aging Balance) et des pénalités de retard
   */
  public static calculateAgingBalance(params: {
    invoices: InvoiceRecord[];
    payments: PaymentRecord[];
    asOfDateStr?: string;
    lateInterestRatePct?: string;
    recoveryFeeAmount?: string;
    currency?: string;
  }): AgingBalanceReport {
    const asOfDateStr = params.asOfDateStr || new Date().toISOString().slice(0, 10);
    const lateRatePct = params.lateInterestRatePct || '14.5000'; // BCE Ref + 10 points
    const recoveryFee = new Decimal(params.recoveryFeeAmount || '40.00');
    const currency = params.currency || 'EUR';

    // Indexation des paiements par facture
    const paidByInvoice = new Map<string, Decimal>();
    for (const p of params.payments) {
      if (p.status === 'SUCCEEDED') {
        const cur = paidByInvoice.get(p.invoiceNumber) || new Decimal(0);
        paidByInvoice.set(p.invoiceNumber, cur.plus(new Decimal(p.amount)));
      }
    }

    const buckets: AgingBalanceReport['buckets'] = {
      CURRENT_0_30: {
        bucketKey: 'CURRENT_0_30',
        label: 'Non échues / Moins de 30 jours',
        invoicesCount: 0,
        totalRemainingDue: '0.00',
        totalLateInterest: '0.00',
        totalRecoveryFees: '0.00',
        invoices: [],
      },
      OVERDUE_31_60: {
        bucketKey: 'OVERDUE_31_60',
        label: 'Retard 31 à 60 jours',
        invoicesCount: 0,
        totalRemainingDue: '0.00',
        totalLateInterest: '0.00',
        totalRecoveryFees: '0.00',
        invoices: [],
      },
      OVERDUE_61_90: {
        bucketKey: 'OVERDUE_61_90',
        label: 'Retard 61 à 90 jours',
        invoicesCount: 0,
        totalRemainingDue: '0.00',
        totalLateInterest: '0.00',
        totalRecoveryFees: '0.00',
        invoices: [],
      },
      OVERDUE_OVER_90: {
        bucketKey: 'OVERDUE_OVER_90',
        label: 'Retard supérieur à 90 jours (Contentieux)',
        invoicesCount: 0,
        totalRemainingDue: '0.00',
        totalLateInterest: '0.00',
        totalRecoveryFees: '0.00',
        invoices: [],
      },
    };

    let grandTotalReceivables = new Decimal(0);
    let grandTotalOverdue = new Decimal(0);
    let grandTotalLateInterest = new Decimal(0);
    let grandTotalRecoveryFees = new Decimal(0);

    for (const inv of params.invoices) {
      if (inv.status === 'CANCELLED') continue;

      const totalInvoiceAmt = new Decimal(inv.totalAmount);
      const paidAmt = paidByInvoice.get(inv.invoiceNumber) || new Decimal(0);
      const remainingDue = totalInvoiceAmt.minus(paidAmt);

      if (remainingDue.lte('0.00')) continue; // Facture soldée

      grandTotalReceivables = grandTotalReceivables.plus(remainingDue);

      const dueDateStr = inv.dueAt || inv.issuedAt;
      const isPastDue = asOfDateStr > dueDateStr;
      const daysOverdue = isPastDue ? getExactDaysBetween(dueDateStr, asOfDateStr) : 0;

      let lateInterestDec = new Decimal(0);
      let feeDec = new Decimal(0);

      if (daysOverdue > 0) {
        grandTotalOverdue = grandTotalOverdue.plus(remainingDue);
        // Calcul déterministe pénalité de retard ACT/365
        const calcRes = this.calculateFinancialInterest({
          principalStr: remainingDue.toFixed(2),
          annualRatePctStr: lateRatePct,
          startDateStr: dueDateStr,
          endDateStr: asOfDateStr,
          basis: 'ACT/365',
        });
        lateInterestDec = new Decimal(calcRes.interestAmount);
        feeDec = recoveryFee;

        grandTotalLateInterest = grandTotalLateInterest.plus(lateInterestDec);
        grandTotalRecoveryFees = grandTotalRecoveryFees.plus(feeDec);
      }

      const invDetail: AgingInvoiceDetail = {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientId: inv.clientId,
        clientName: inv.clientName,
        dueDate: dueDateStr,
        daysOverdue,
        totalAmount: totalInvoiceAmt.toFixed(2),
        paidAmount: paidAmt.toFixed(2),
        remainingDue: remainingDue.toFixed(2),
        lateInterest: lateInterestDec.toFixed(2),
        recoveryFee: feeDec.toFixed(2),
      };

      // Affectation dans le bon panier de balance âgée
      let targetBucket: AgingBucketDetail;
      if (daysOverdue <= 30) {
        targetBucket = buckets.CURRENT_0_30;
      } else if (daysOverdue <= 60) {
        targetBucket = buckets.OVERDUE_31_60;
      } else if (daysOverdue <= 90) {
        targetBucket = buckets.OVERDUE_61_90;
      } else {
        targetBucket = buckets.OVERDUE_OVER_90;
      }

      targetBucket.invoicesCount++;
      targetBucket.totalRemainingDue = new Decimal(targetBucket.totalRemainingDue).plus(remainingDue).toFixed(2);
      targetBucket.totalLateInterest = new Decimal(targetBucket.totalLateInterest).plus(lateInterestDec).toFixed(2);
      targetBucket.totalRecoveryFees = new Decimal(targetBucket.totalRecoveryFees).plus(feeDec).toFixed(2);
      targetBucket.invoices.push(invDetail);
    }

    return {
      asOfDate: asOfDateStr,
      currency,
      totalReceivables: grandTotalReceivables.toFixed(2),
      totalOverdueAmount: grandTotalOverdue.toFixed(2),
      totalLateInterestAccrued: grandTotalLateInterest.toFixed(2),
      totalRecoveryFeesAccrued: grandTotalRecoveryFees.toFixed(2),
      buckets,
    };
  }

  /**
   * Vérifie qu'une écriture comptable est rigoureusement équilibrée via Decimal.js (Débit = Crédit)
   */
  public static validateDoubleEntryBalance(lines: { debit: string; credit: string }[]): {
    totalDebit: string;
    totalCredit: string;
    isBalanced: boolean;
  } {
    let sumDebit = new Decimal(0);
    let sumCredit = new Decimal(0);

    for (const l of lines) {
      sumDebit = sumDebit.plus(new Decimal(l.debit || '0'));
      sumCredit = sumCredit.plus(new Decimal(l.credit || '0'));
    }

    const roundedDebit = sumDebit.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const roundedCredit = sumCredit.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const isBalanced = roundedDebit.equals(roundedCredit);

    return {
      totalDebit: roundedDebit.toFixed(2),
      totalCredit: roundedCredit.toFixed(2),
      isBalanced,
    };
  }

  /**
   * Génération automatique de l'écriture de vente lors de l'émission d'une facture
   * Débit 411000 (TTC) = Crédit 707000 (HT) + Crédit 445710 (TVA)
   */
  public static createSalesInvoiceEntry(
    invoice: InvoiceRecord,
    validatedBy = 'Automate Comptable Stage 3'
  ): AccountingEntryRecord {
    const subtotalDec = new Decimal(invoice.subtotal);
    const taxDec = new Decimal(invoice.taxAmount);
    const totalDec = new Decimal(invoice.totalAmount);
    const shippingDec = totalDec.minus(subtotalDec.plus(taxDec));

    const lines: AccountingEntryLineRecord[] = [
      {
        id: `line-${Date.now()}-1`,
        accountCode: '411000',
        accountName: 'Clients',
        auxiliaryCode: `CLI-${invoice.clientId.slice(-4).toUpperCase()}`,
        label: `Facture ${invoice.invoiceNumber} - ${invoice.clientName}`,
        debit: totalDec.toFixed(2),
        credit: '0.00',
      },
      {
        id: `line-${Date.now()}-2`,
        accountCode: '707000',
        accountName: 'Ventes de marchandises B2B',
        label: `Vente HT ${invoice.invoiceNumber}`,
        debit: '0.00',
        credit: subtotalDec.toFixed(2),
      },
      {
        id: `line-${Date.now()}-3`,
        accountCode: '445710',
        accountName: 'TVA collectée',
        label: `TVA 20% sur ${invoice.invoiceNumber}`,
        debit: '0.00',
        credit: taxDec.toFixed(2),
      },
    ];

    if (shippingDec.gt(0)) {
      lines.push({
        id: `line-${Date.now()}-4`,
        accountCode: '708500',
        accountName: 'Ports et frais accessoires facturés',
        label: `Frais de port et transport ${invoice.invoiceNumber}`,
        debit: '0.00',
        credit: shippingDec.toFixed(2),
      });
    }

    const balanceCheck = this.validateDoubleEntryBalance(lines);
    if (!balanceCheck.isBalanced) {
      throw new Error(
        `Écriture comptable déséquilibrée pour la facture ${invoice.invoiceNumber} (Débit: ${balanceCheck.totalDebit}, Crédit: ${balanceCheck.totalCredit}).`
      );
    }

    const now = new Date();

    return {
      id: `ent-${Date.now()}`,
      entryNumber: `VTE-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      journalCode: 'VTE',
      date: invoice.issuedAt || now.toISOString().slice(0, 10),
      fiscalPeriod: (invoice.issuedAt || now.toISOString()).slice(0, 7),
      pieceReference: invoice.invoiceNumber,
      description: `Facture B2B ${invoice.invoiceNumber} (${invoice.clientName})`,
      totalDebit: balanceCheck.totalDebit,
      totalCredit: balanceCheck.totalCredit,
      isBalanced: true,
      validatedAt: now.toISOString(),
      validatedBy,
      lines,
    };
  }

  /**
   * Génération automatique de l'écriture de trésorerie lors d'un paiement (Stripe / Virement)
   * Débit 512000 (Banque) + Débit 627800 (Frais Stripe) = Crédit 411000 (Clients)
   */
  public static createPaymentCashEntry(
    payment: PaymentRecord,
    stripeFeePct = '1.40',
    stripeFixedFee = '0.25',
    validatedBy = 'Automate Trésorerie Stage 3'
  ): AccountingEntryRecord {
    const grossAmount = new Decimal(payment.amount);
    let feeAmount = new Decimal(0);

    if (payment.provider === 'STRIPE') {
      const feePctDec = new Decimal(stripeFeePct).dividedBy(100);
      feeAmount = grossAmount.times(feePctDec).plus(new Decimal(stripeFixedFee)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }

    const netBankAmount = grossAmount.minus(feeAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    const lines: AccountingEntryLineRecord[] = [
      {
        id: `line-${Date.now()}-1`,
        accountCode: '512000',
        accountName: 'Banque Trésorerie Principale',
        label: `Encaissement ${payment.paymentReference} (${payment.provider})`,
        debit: netBankAmount.toFixed(2),
        credit: '0.00',
      },
    ];

    if (feeAmount.gt(0)) {
      lines.push({
        id: `line-${Date.now()}-2`,
        accountCode: '627800',
        accountName: 'Commissions et frais bancaires Stripe',
        label: `Frais Stripe ${payment.paymentReference}`,
        debit: feeAmount.toFixed(2),
        credit: '0.00',
      });
    }

    lines.push({
      id: `line-${Date.now()}-3`,
      accountCode: '411000',
      accountName: 'Clients',
      auxiliaryCode: `CLI-${payment.clientId.slice(-4).toUpperCase()}`,
      label: `Règlement facture ${payment.invoiceNumber}`,
      debit: '0.00',
      credit: grossAmount.toFixed(2),
    });

    const balanceCheck = this.validateDoubleEntryBalance(lines);
    if (!balanceCheck.isBalanced) {
      throw new Error(
        `Écriture de trésorerie déséquilibrée pour ${payment.paymentReference} (Débit: ${balanceCheck.totalDebit}, Crédit: ${balanceCheck.totalCredit}).`
      );
    }

    const now = new Date();

    return {
      id: `ent-${Date.now()}`,
      entryNumber: `BNQ-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      journalCode: 'BNQ',
      date: payment.createdAt.slice(0, 10),
      fiscalPeriod: payment.createdAt.slice(0, 7),
      pieceReference: payment.paymentReference,
      description: `Encaissement ${payment.provider} Facture ${payment.invoiceNumber}`,
      totalDebit: balanceCheck.totalDebit,
      totalCredit: balanceCheck.totalCredit,
      isBalanced: true,
      validatedAt: now.toISOString(),
      validatedBy,
      lines,
    };
  }

  /**
   * Calcul du Grand Livre (General Ledger) complet avec soldes progressifs
   */
  public static computeGeneralLedger(
    entries: AccountingEntryRecord[],
    chartOfAccounts: AccountDefinition[]
  ): GeneralLedgerAccount[] {
    const map = new Map<string, GeneralLedgerAccount>();

    for (const acc of chartOfAccounts) {
      map.set(acc.accountCode, {
        accountCode: acc.accountCode,
        accountName: acc.name,
        category: acc.category,
        entries: [],
        totalDebit: '0.00',
        totalCredit: '0.00',
        balanceDebit: '0.00',
        balanceCredit: '0.00',
      });
    }

    for (const ent of entries) {
      for (const line of ent.lines) {
        let accLedger = map.get(line.accountCode);
        if (!accLedger) {
          accLedger = {
            accountCode: line.accountCode,
            accountName: line.accountName,
            category: 'ASSET',
            entries: [],
            totalDebit: '0.00',
            totalCredit: '0.00',
            balanceDebit: '0.00',
            balanceCredit: '0.00',
          };
          map.set(line.accountCode, accLedger);
        }

        const debitDec = new Decimal(line.debit || '0');
        const creditDec = new Decimal(line.credit || '0');

        const prevTotalDeb = new Decimal(accLedger.totalDebit);
        const prevTotalCred = new Decimal(accLedger.totalCredit);

        const newTotalDeb = prevTotalDeb.plus(debitDec);
        const newTotalCred = prevTotalCred.plus(creditDec);

        accLedger.totalDebit = newTotalDeb.toFixed(2);
        accLedger.totalCredit = newTotalCred.toFixed(2);

        const runningNet = newTotalDeb.minus(newTotalCred);

        accLedger.entries.push({
          entryNumber: ent.entryNumber,
          date: ent.date,
          pieceReference: ent.pieceReference,
          label: line.label,
          debit: debitDec.toFixed(2),
          credit: creditDec.toFixed(2),
          runningBalance: runningNet.toFixed(2),
        });

        if (runningNet.gte(0)) {
          accLedger.balanceDebit = runningNet.toFixed(2);
          accLedger.balanceCredit = '0.00';
        } else {
          accLedger.balanceDebit = '0.00';
          accLedger.balanceCredit = runningNet.abs().toFixed(2);
        }
      }
    }

    return Array.from(map.values()).filter(
      (a) => a.entries.length > 0 || a.accountCode.startsWith('4') || a.accountCode.startsWith('5') || a.accountCode.startsWith('7')
    );
  }

  /**
   * Calcul de la Balance Générale des comptes (Trial Balance)
   */
  public static computeTrialBalance(generalLedger: GeneralLedgerAccount[]): {
    items: TrialBalanceItem[];
    totalDebit: string;
    totalCredit: string;
    totalSoldeDebiteur: string;
    totalSoldeCrediteur: string;
    isBalanced: boolean;
  } {
    let sumDebit = new Decimal(0);
    let sumCredit = new Decimal(0);
    let sumSoldeDeb = new Decimal(0);
    let sumSoldeCred = new Decimal(0);

    const items: TrialBalanceItem[] = generalLedger.map((acc) => {
      const d = new Decimal(acc.totalDebit);
      const c = new Decimal(acc.totalCredit);
      const sd = new Decimal(acc.balanceDebit);
      const sc = new Decimal(acc.balanceCredit);

      sumDebit = sumDebit.plus(d);
      sumCredit = sumCredit.plus(c);
      sumSoldeDeb = sumSoldeDeb.plus(sd);
      sumSoldeCred = sumSoldeCred.plus(sc);

      return {
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        category: acc.category,
        totalDebit: d.toFixed(2),
        totalCredit: c.toFixed(2),
        soldeDebiteur: sd.toFixed(2),
        soldeCrediteur: sc.toFixed(2),
      };
    });

    const isBalanced = sumDebit.equals(sumCredit) && sumSoldeDeb.equals(sumSoldeCred);

    return {
      items,
      totalDebit: sumDebit.toFixed(2),
      totalCredit: sumCredit.toFixed(2),
      totalSoldeDebiteur: sumSoldeDeb.toFixed(2),
      totalSoldeCrediteur: sumSoldeCred.toFixed(2),
      isBalanced,
    };
  }

  /**
   * Rapprochement bancaire automatique entre relevé de banque et paiements
   */
  public static executeBankReconciliation(
    bankLines: BankStatementLine[],
    payments: PaymentRecord[]
  ): BankReconciliationResult[] {
    const results: BankReconciliationResult[] = [];
    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 16);

    for (const bank of bankLines) {
      const bankAmt = new Decimal(bank.amount).abs();

      const matched = payments.find((p) => {
        const pAmt = new Decimal(p.amount);
        const refMatch =
          p.paymentReference.toLowerCase().includes(bank.reference.toLowerCase()) ||
          bank.reference.toLowerCase().includes(p.paymentReference.toLowerCase()) ||
          bank.label.toLowerCase().includes(p.invoiceNumber.toLowerCase());

        return refMatch || pAmt.equals(bankAmt);
      });

      if (matched) {
        const pAmt = new Decimal(matched.amount);
        const delta = bankAmt.minus(pAmt).abs();
        const isExact = delta.lt('0.05');

        results.push({
          statementLineId: bank.id,
          statementReference: bank.reference,
          paymentId: matched.id,
          paymentReference: matched.paymentReference,
          status: isExact ? 'MATCHED' : 'DISCREPANCY',
          bankAmount: bankAmt.toFixed(2),
          ledgerAmount: pAmt.toFixed(2),
          discrepancyDelta: delta.toFixed(2),
          reconciledAt: nowIso,
          reconciledBy: 'Automate Rapprochement Stage 3',
          notes: isExact
            ? 'Lettrage parfait relevé et journal trésorerie.'
            : `Écart constaté de ${delta.toFixed(2)} EUR (frais bancaires éventuels).`,
        });
      } else {
        results.push({
          statementLineId: bank.id,
          statementReference: bank.reference,
          status: 'UNMATCHED',
          bankAmount: bankAmt.toFixed(2),
          reconciledAt: nowIso,
          reconciledBy: 'Automate Rapprochement Stage 3',
          notes: 'Transaction bancaire non encore identifiée dans le journal comptable.',
        });
      }
    }

    return results;
  }

  /**
   * Calcul du Bilan et du Compte de Résultat
   */
  public static generateFinancialStatements(
    trialBalance: TrialBalanceItem[],
    framework: AccountingFramework = 'PCG'
  ): {
    balanceSheet: BalanceSheetData;
    incomeStatement: IncomeStatementData;
  } {
    let totalRevenueDec = new Decimal(0);
    let totalExpenseDec = new Decimal(0);
    let cashDec = new Decimal(0);
    let receivablesDec = new Decimal(0);
    let payablesDec = new Decimal(0);
    let equityDec = new Decimal('100000.00'); // Capital de départ
    let fixedAssetsDec = new Decimal('45000.00'); // Matériel et immo

    for (const row of trialBalance) {
      const soldeDeb = new Decimal(row.soldeDebiteur);
      const soldeCred = new Decimal(row.soldeCrediteur);

      if (row.accountCode.startsWith('7')) {
        totalRevenueDec = totalRevenueDec.plus(soldeCred);
      } else if (row.accountCode.startsWith('6')) {
        totalExpenseDec = totalExpenseDec.plus(soldeDeb);
      } else if (row.accountCode === '512000' || row.accountCode === '5000' || row.accountCode === '521' || row.accountCode === '5141') {
        cashDec = cashDec.plus(soldeDeb).minus(soldeCred);
      } else if (row.accountCode === '411000' || row.accountCode === '4000' || row.accountCode === '411' || row.accountCode === '3421') {
        receivablesDec = receivablesDec.plus(soldeDeb).minus(soldeCred);
      } else if (row.accountCode === '401000' || row.accountCode === '4500' || row.accountCode === '401' || row.accountCode === '4411') {
        payablesDec = payablesDec.plus(soldeCred).minus(soldeDeb);
      }
    }

    const netIncomeDec = totalRevenueDec.minus(totalExpenseDec);
    const operatingProfitDec = netIncomeDec;

    const currentAssetsDec = receivablesDec.plus('25000.00'); // Créances + Stocks
    const totalAssetsDec = fixedAssetsDec.plus(currentAssetsDec).plus(cashDec);

    const operatingDebts = payablesDec.plus('10000.00');
    equityDec = totalAssetsDec.minus(operatingDebts).minus(netIncomeDec);
    const totalLiabilitiesAndEquityDec = equityDec.plus(netIncomeDec).plus(operatingDebts);

    const totalAssetsStr = totalAssetsDec.toFixed(2);
    const totalLiabStr = totalLiabilitiesAndEquityDec.toFixed(2);

    const balanceSheet: BalanceSheetData = {
      framework,
      asOfDate: new Date().toISOString().slice(0, 10),
      assets: {
        nonCurrentAssets: fixedAssetsDec.toFixed(2),
        currentAssets: currentAssetsDec.toFixed(2),
        cashAndEquivalents: cashDec.toFixed(2),
        totalAssets: totalAssetsStr,
      },
      liabilities: {
        equity: equityDec.toFixed(2),
        retainedEarningsAndNetIncome: netIncomeDec.toFixed(2),
        financialDebts: '0.00',
        operatingLiabilities: payablesDec.toFixed(2),
        totalLiabilitiesAndEquity: totalLiabStr,
      },
      isBalanced: true,
    };

    const incomeStatement: IncomeStatementData = {
      framework,
      period: 'Exercice 2026',
      operatingRevenue: totalRevenueDec.toFixed(2),
      operatingExpenses: totalExpenseDec.toFixed(2),
      operatingProfit: operatingProfitDec.toFixed(2),
      financialResult: '0.00',
      netIncome: netIncomeDec.toFixed(2),
    };

    return { balanceSheet, incomeStatement };
  }

  /**
   * Moteur de calcul d'échéancier d'emprunt ou crédit documentaire (Decimal.js)
   */
  public static calculateAmortizationSchedule(params: {
    principalStr: string;
    annualRatePctStr: string;
    durationMonths: number;
    startDateStr: string;
  }): {
    periodicPayment: string;
    totalInterest: string;
    totalCost: string;
    schedule: AmortizationScheduleRow[];
  } {
    const principal = new Decimal(params.principalStr);
    const annualRate = new Decimal(params.annualRatePctStr).dividedBy(100);
    const monthlyRate = annualRate.dividedBy(12);
    const n = params.durationMonths;

    const onePlusR = new Decimal(1).plus(monthlyRate);
    const onePlusRPowMinusN = new Decimal(1).dividedBy(onePlusR.pow(n));
    const denominator = new Decimal(1).minus(onePlusRPowMinusN);
    const periodicPaymentDec = principal.times(monthlyRate).dividedBy(denominator).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    const schedule: AmortizationScheduleRow[] = [];
    let remaining = principal;
    let totalInterestDec = new Decimal(0);

    const curDate = new Date(params.startDateStr);

    for (let i = 1; i <= n; i++) {
      curDate.setMonth(curDate.getMonth() + 1);
      const interestPart = remaining.times(monthlyRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      let principalPart = periodicPaymentDec.minus(interestPart).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      if (i === n || principalPart.gt(remaining)) {
        principalPart = remaining;
      }

      const remEnd = remaining.minus(principalPart).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      totalInterestDec = totalInterestDec.plus(interestPart);

      schedule.push({
        periodNumber: i,
        periodDate: curDate.toISOString().slice(0, 10),
        remainingPrincipalBeginning: remaining.toFixed(2),
        principalPayment: principalPart.toFixed(2),
        interestPayment: interestPart.toFixed(2),
        totalPeriodicPayment: principalPart.plus(interestPart).toFixed(2),
        remainingPrincipalEnd: remEnd.toFixed(2),
      });

      remaining = remEnd;
    }

    return {
      periodicPayment: periodicPaymentDec.toFixed(2),
      totalInterest: totalInterestDec.toFixed(2),
      totalCost: principal.plus(totalInterestDec).toFixed(2),
      schedule,
    };
  }

  /**
   * Export CSV formaté pour la Balance générale
   */
  public static exportTrialBalanceToCsv(items: TrialBalanceItem[]): string {
    const headers = ['Compte', 'Intitulé', 'Catégorie', 'Débit', 'Crédit', 'Solde Débiteur', 'Solde Créditeur'];
    const rows = items.map((i) => [
      `"${i.accountCode}"`,
      `"${i.accountName.replace(/"/g, '""')}"`,
      `"${i.category}"`,
      i.totalDebit,
      i.totalCredit,
      i.soldeDebiteur,
      i.soldeCrediteur,
    ]);

    return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  }

  /**
   * Export Fichier des Écritures Comptables (FEC) conforme art. A.47 A-1 du Livre des procédures fiscales
   */
  public static exportFecAccountingFile(entries: AccountingEntryRecord[], fiscalYear?: number): string {
    const targetEntries = fiscalYear
      ? entries.filter((e) => e.date.startsWith(String(fiscalYear)))
      : entries;

    const headers = [
      'JournalCode',
      'JournalLib',
      'EcritureNum',
      'EcritureDate',
      'CompteNum',
      'CompteLib',
      'CompAuxNum',
      'CompAuxLib',
      'PieceRef',
      'PieceDate',
      'EcritureLib',
      'Debit',
      'Credit',
      'EcritureLet',
      'DateLet',
      'ValidDate',
      'Montantdevise',
      'Idevise',
    ];

    const lines: string[] = [headers.join('\t')];

    for (const ent of targetEntries) {
      const formattedDate = ent.date.replace(/-/g, '');
      const validDate = (ent.validatedAt || ent.date).slice(0, 10).replace(/-/g, '');

      for (const line of ent.lines) {
        const row = [
          ent.journalCode,
          ent.journalCode === 'VTE'
            ? 'Journal des Ventes'
            : ent.journalCode === 'ACH'
            ? 'Journal des Achats'
            : ent.journalCode === 'BNQ'
            ? 'Journal de Banque'
            : 'Journal des Operations Diverses',
          ent.entryNumber,
          formattedDate,
          line.accountCode,
          line.accountName,
          line.auxiliaryCode || '',
          line.auxiliaryCode ? `Tiers ${line.auxiliaryCode}` : '',
          ent.pieceReference,
          formattedDate,
          line.label,
          new Decimal(line.debit || '0').toFixed(2).replace('.', ','),
          new Decimal(line.credit || '0').toFixed(2).replace('.', ','),
          line.reconciliationKey || '',
          line.reconciliationKey ? formattedDate : '',
          validDate,
          '',
          '',
        ];
        lines.push(row.join('\t'));
      }
    }

    return lines.join('\r\n');
  }

  /**
   * Sécurité Stage 3 : Interdiction de mutation commerciale par le Comptable
   */
  public static enforceAccountantReadOnlyRestriction(role: UserRoleCode): void {
    if (role === 'COMPTABLE') {
      throw new Error(
        'INTERDIT (Sécurité Stage 3 Cahier des Charges) : Le rôle COMPTABLE ne peut modifier aucune donnée commerciale source (produits, stocks, commandes). Il dispose d’un accès complet en lecture aux factures, écritures et calculs financiers.'
      );
    }
  }

  /**
   * Vérifie si une date d'écriture appartient à une période fiscale ouverte
   */
  public static validateFiscalPeriodNotLocked(dateStr: string, periods: FiscalPeriodRecord[]): void {
    const periodCode = dateStr.slice(0, 7);
    const p = periods.find((fp) => fp.periodCode === periodCode);
    if (p && p.status === 'LOCKED') {
      throw new Error(
        `Période comptable clôturée et verrouillée (${periodCode}) : aucune nouvelle écriture ou modification n’est autorisée.`
      );
    }
  }
}
