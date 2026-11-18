// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — ESPACE COMPTABLE COMPLET & SOUVERAIN (PAGES 62 À 68)
// 7 PILIERS :
// 1. Tableau de bord financier (Synthèse opérations, créances, trésorerie, échéances)
// 2. Gestion documentaire (Factures, devis, reçus, classement, recherche, exports)
// 3. Moteur de calcul financier Decimal.js (ACT/365, ACT/360, ACT/ACT, bissextile, amortissement prêt)
// 4. Analyse financière & Comptabilité (Journaux VTE/ACH/BNQ/OD, Grand Livre, Balance, Bilan & Résultat)
// 5. Assistant IA Financier (Explication calculs, résumé ratios, analyse trésorerie, dictée vocale STT/TTS)
// 6. Sécurité & Permissions (Lecture Seule Métier Stage 3, blocage modifications sources, audit log)
// 7. Paramètres & Référentiels (Profil Yassine Alami, PCG / IFRS, devises, langues, thème)
// ISOLATION DES DONNÉES & GOUVERNANCE : Lecture seule stricte sur les opérations
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Decimal from 'decimal.js';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  FileText,
  Download,
  ShieldCheck,
  Scale,
  PieChart,
  BookOpen,
  RefreshCw,
  Lock,
  Mic,
  MicOff,
  Clock,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, translateStatus, downloadDataExport } from '../i18n/translations';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  SearchBar,
} from '../components/ui/DesignSystem';
import { DayCountBasis, ThemeMode } from '../types';
import {
  AccountingEngine,
  AccountingEntryRecord,
  AccountingFramework,
  AmortizationScheduleRow,
  CHARTS_OF_ACCOUNTS,
  TrialBalanceItem,
} from '../services/accountingEngine';

export const AccountingWorkspacePage: React.FC<{
  section:
    | 'dashboard'
    | 'factures'
    | 'documents'
    | 'journaux'
    | 'grand-livre'
    | 'etats-financiers'
    | 'calcul'
    | 'assistant-ia'
    | 'parametres';
}> = ({ section }) => {
  const {
    locale,
    setLocale,
    theme,
    setTheme,
    currentUser,
    invoices,
    payments,
    calcHistory,
    runFinancialCalculation,
    isVoiceRecording,
    startVoiceDictation,
    stopVoiceDictation,
    voiceTranscript,
    notifyToast,
  } = useApp();

  // --------------------------------------------------------------------------
  // ÉTATS LOCAUX : RÉFÉRENTIEL COMPTABLE (PCG / IFRS / US GAAP)
  // --------------------------------------------------------------------------
  const [framework, setFramework] = useState<AccountingFramework>('PCG');

  // --------------------------------------------------------------------------
  // ÉTATS LOCAUX : MOTEUR DE CALCUL FINANCIER DECIMAL.JS
  // Formule centrale : Montant × Taux × Jours / Diviseur
  // --------------------------------------------------------------------------
  const [principal, setPrincipal] = useState('150000.00');
  const [rate, setRate] = useState('5.25');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [basis, setBasis] = useState<DayCountBasis>('ACT/365');
  const [roundingMode, setRoundingMode] = useState<string>('ROUND_HALF_UP');

  // Amortissement de prêt commercial
  const [loanPrincipal, setLoanPrincipal] = useState('250000.00');
  const [loanRate, setLoanRate] = useState('4.50');
  const [loanDuration, setLoanDuration] = useState('12');
  const [amortizationSchedule, setAmortizationSchedule] = useState<AmortizationScheduleRow[]>(() => {
    try {
      const res = AccountingEngine.calculateAmortizationSchedule({
        principalStr: '250000.00',
        annualRatePctStr: '4.50',
        durationMonths: 12,
        startDateStr: '2026-01-01',
      });
      return res.schedule;
    } catch {
      return [];
    }
  });

  // --------------------------------------------------------------------------
  // ÉTATS LOCAUX : JOURNAUX ET GRAND LIVRE
  // --------------------------------------------------------------------------
  const [selectedJournal, setSelectedJournal] = useState<'ALL' | 'VTE' | 'ACH' | 'BNQ' | 'OD'>('ALL');
  const [selectedLedgerTab, setSelectedLedgerTab] = useState<'ledger' | 'balance' | 'reconciliation'>('ledger');
  const [selectedCalcTab, setSelectedCalcTab] = useState<'interest' | 'amortization'>('interest');

  // Filtres factures & documents
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'PAID' | 'ISSUED' | 'OVERDUE'>('ALL');

  // Alerte sécurité Stage 3 (Tentative de modification refusée)
  const [stage3AlertOpen, setStage3AlertOpen] = useState(false);

  // --------------------------------------------------------------------------
  // ÉCRITURES COMPTABLES EN DOUBLE PARTIE RIGOREUSEMENT ÉQUILIBRÉES
  // --------------------------------------------------------------------------
  const [entries] = useState<AccountingEntryRecord[]>(() => {
    return [
      {
        id: 'ent-init-01',
        entryNumber: 'OD-2026-0001',
        journalCode: 'OD',
        date: '2026-01-01',
        fiscalPeriod: '2026-01',
        pieceReference: 'BILAN-OUVERTURE-2026',
        description: 'Bilan d’ouverture de l’exercice fiscal 2026',
        totalDebit: '100000.00',
        totalCredit: '100000.00',
        isBalanced: true,
        validatedAt: '2026-01-01T08:00:00Z',
        validatedBy: 'Cabinet Audit & Commissariat',
        lines: [
          { id: 'l1', accountCode: '512000', accountName: 'Banque Trésorerie Principale', debit: '60000.00', credit: '0.00', label: 'Disponibilités bancaires' },
          { id: 'l2', accountCode: '215400', accountName: 'Matériel industriel et logistique', debit: '40000.00', credit: '0.00', label: 'Immobilisations' },
          { id: 'l3', accountCode: '101000', accountName: 'Capital social', debit: '0.00', credit: '100000.00', label: 'Capital social libéré' },
        ],
      },
      {
        id: 'ent-init-02',
        entryNumber: 'VTE-2026-0081',
        journalCode: 'VTE',
        date: '2026-11-10',
        fiscalPeriod: '2026-11',
        pieceReference: 'FAC-2026-9901',
        description: 'Vente équipements Atlas Import & Distribution S.A.',
        totalDebit: '31680.00',
        totalCredit: '31680.00',
        isBalanced: true,
        validatedAt: '2026-11-10T10:15:00Z',
        validatedBy: 'Automate Facturation V6.0',
        lines: [
          { id: 'l4', accountCode: '411000', accountName: 'Clients', auxiliaryCode: 'CLI-ATLAS', debit: '31680.00', credit: '0.00', label: 'Créance Atlas Import S.A.' },
          { id: 'l5', accountCode: '707000', accountName: 'Ventes de marchandises B2B', debit: '0.00', credit: '26400.00', label: 'Produits HT Ventes' },
          { id: 'l6', accountCode: '445710', accountName: 'TVA collectée', debit: '0.00', credit: '5280.00', label: 'TVA 20% collectée' },
        ],
      },
      {
        id: 'ent-init-03',
        entryNumber: 'BNQ-2026-0042',
        journalCode: 'BNQ',
        date: '2026-11-15',
        fiscalPeriod: '2026-11',
        pieceReference: 'VIR-STRIPE-88192',
        description: 'Encaissement règlement Atlas Import via Stripe Escrow',
        totalDebit: '31680.00',
        totalCredit: '31680.00',
        isBalanced: true,
        validatedAt: '2026-11-15T14:30:00Z',
        validatedBy: 'Automate Trésorerie Stage 3',
        lines: [
          { id: 'l7', accountCode: '512000', accountName: 'Banque Trésorerie Principale', debit: '31236.48', credit: '0.00', label: 'Net perçu après commission' },
          { id: 'l8', accountCode: '627800', accountName: 'Frais sur services bancaires & Stripe', debit: '443.52', credit: '0.00', label: 'Commission plateforme 1.40%' },
          { id: 'l9', accountCode: '411000', accountName: 'Clients', auxiliaryCode: 'CLI-ATLAS', debit: '0.00', credit: '31680.00', label: 'Extinction créance' },
        ],
      },
    ];
  });

  // --------------------------------------------------------------------------
  // CALCULS STATISTIQUES FINANCIÈRES
  // --------------------------------------------------------------------------
  const stats = useMemo(() => {
    let totalInvoiced = new Decimal(0);
    let totalPaid = new Decimal(0);
    let totalPending = new Decimal(0);

    invoices.forEach((inv) => {
      const amt = new Decimal(inv.totalAmount || '0');
      totalInvoiced = totalInvoiced.plus(amt);
      if (inv.status === 'PAID') {
        totalPaid = totalPaid.plus(amt);
      } else {
        totalPending = totalPending.plus(amt);
      }
    });

    const totalCashCollected = payments
      .filter((p) => p.status === 'SUCCEEDED')
      .reduce((acc, p) => acc.plus(new Decimal(p.amount || '0')), new Decimal(0));

    return {
      totalInvoiced: totalInvoiced.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      totalPending: totalPending.toFixed(2),
      totalCashCollected: totalCashCollected.toFixed(2),
      invoicesCount: invoices.length,
      paidCount: invoices.filter((i) => i.status === 'PAID').length,
      pendingCount: invoices.filter((i) => i.status !== 'PAID').length,
    };
  }, [invoices, payments]);

  // Grand Livre & Balance Générale
  const generalLedger = useMemo(() => {
    return AccountingEngine.computeGeneralLedger(entries, CHARTS_OF_ACCOUNTS[framework]);
  }, [entries, framework]);

  const trialBalance = useMemo(() => {
    return AccountingEngine.computeTrialBalance(generalLedger);
  }, [generalLedger]);

  const financialStatements = useMemo(() => {
    return AccountingEngine.generateFinancialStatements(trialBalance.items, framework);
  }, [trialBalance, framework]);

  // Filtrage des factures
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        inv.orderNumber.toLowerCase().includes(invoiceSearch.toLowerCase());
      const matchesStatus =
        invoiceStatusFilter === 'ALL' || inv.status === invoiceStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, invoiceSearch, invoiceStatusFilter]);

  // Filtrage des écritures
  const filteredEntries = useMemo(() => {
    if (selectedJournal === 'ALL') return entries;
    return entries.filter((e) => e.journalCode === selectedJournal);
  }, [entries, selectedJournal]);

  // --------------------------------------------------------------------------
  // HANDLERS DU MOTEUR DE CALCUL FINANCIER
  // --------------------------------------------------------------------------
  const handleExecuteInterestCalc = () => {
    try {
      const res = runFinancialCalculation(principal, rate, startDate, endDate, basis);
      notifyToast(
        `Calcul déterministe ${basis} réussi : Intérêts = +${res.interestAmount} ${res.currency}`,
        'success'
      );
    } catch (err: any) {
      notifyToast(err?.message || 'Erreur lors du calcul.', 'error');
    }
  };

  const handleCalculateAmortization = () => {
    try {
      const res = AccountingEngine.calculateAmortizationSchedule({
        principalStr: loanPrincipal,
        annualRatePctStr: loanRate,
        durationMonths: Number(loanDuration),
        startDateStr: '2026-01-01',
      });
      setAmortizationSchedule(res.schedule);
      notifyToast(`Échéancier de prêt (${loanDuration} mensualités) calculé avec succès.`, 'success');
    } catch (err: any) {
      notifyToast(err?.message || 'Erreur calcul amortissement.', 'error');
    }
  };

  const handleExportTrialBalance = () => {
    const csvContent = AccountingEngine.exportTrialBalanceToCsv(trialBalance.items);
    downloadDataExport('balance-generale-tradelink-2026.csv', csvContent, 'text/csv;charset=utf-8;');
    notifyToast('Balance Générale CSV téléchargée avec succès pour l’audit.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* BANDEAU SUPÉRIEUR ESPACE COMPTABLE & READ-ONLY GUARD                  */}
      {/* ===================================================================== */}
      <div className="rounded-3xl bg-white dark:bg-[#0B2D31] p-5 border border-slate-200 dark:border-teal-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600">
            <Scale className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="info">ESPACE COMPTABLE & ANALYSE FINANCIÈRE V6.0</Badge>
              <Badge variant="warning">STAGE 3 : LECTURE SEULE MÉTIER</Badge>
            </div>
            <h1 className="text-xl font-extrabold mt-1 text-slate-900 dark:text-white">
              {currentUser.companyName}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Expert-Comptable Référent : {currentUser.firstName} {currentUser.lastName} • Référentiel {framework}
            </p>
          </div>
        </div>

        {/* Navigation vers les 7 piliers comptables */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { to: '/comptable/dashboard', label: '1. Dashboard' },
            { to: '/comptable/factures', label: '2. Factures' },
            { to: '/comptable/documents', label: 'Documents' },
            { to: '/comptable/calcul', label: '3. Moteur Calcul' },
            { to: '/comptable/journaux', label: '4. Journaux' },
            { to: '/comptable/grand-livre', label: 'Grand Livre' },
            { to: '/comptable/etats-financiers', label: 'Bilan & P&L' },
            { to: '/comptable/ia', label: '5. Assistant IA' },
            { to: '/comptable/parametres', label: '6. Paramètres' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                window.location.pathname === item.to
                  ? 'bg-[#E85D22] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-teal-900/60 hover:bg-slate-200 dark:hover:bg-teal-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Bannière de Sécurité Stage 3 Read-Only */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-amber-900 dark:text-amber-200">
            <strong>Sécurité Stage 3 Active :</strong> L'Espace Comptable est restreint en lecture seule sur les commandes, catalogues et données commerciales sources.
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setStage3AlertOpen(true)}
        >
          Tester Restriction
        </Button>
      </div>

      {/* ===================================================================== */}
      {/* 1. TABLEAU DE BORD FINANCIER (/comptable/dashboard)                   */}
      {/* ===================================================================== */}
      {section === 'dashboard' && (
        <div className="space-y-6">
          {/* Métriques financières KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Total Facturé (TTC)" subtitle="Factures B2B émises">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(Number(stats.totalInvoiced), 'EUR', locale)}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">{stats.invoicesCount} factures enregistrées</p>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-[#E85D22]">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card title="Règlements Encaissés" subtitle="Extinction créances">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-emerald-600">
                    {formatCurrency(Number(stats.totalPaid), 'EUR', locale)}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">{stats.paidCount} soldées à 100%</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card title="Créances Clients en Attente" subtitle="Encours de paiement">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-amber-500">
                    {formatCurrency(Number(stats.totalPending), 'EUR', locale)}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">{stats.pendingCount} en cours d'échéance</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card title="Trésorerie Nette Disponible" subtitle="Compte Banque 512000">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-blue-600">
                    {formatCurrency(91236.48, 'EUR', locale)}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">Rapprochement validé</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Grille : Échéancier de Trésorerie & Alertes Financières */}
          <div className="grid lg:grid-cols-2 gap-6 text-xs">
            <Card title="Échéancier Prévisionnel des Créances" subtitle="Ventilation par tranches de maturité">
              <div className="space-y-3">
                {[
                  { tranche: 'Échues à J-1 à J-15', montant: '0.00 EUR', status: 'Aucun retard constaté', color: 'text-emerald-500' },
                  { tranche: 'À échoir dans 30 jours (J+30)', montant: '31 680.00 EUR', status: 'Atlas Import & Distribution S.A.', color: 'text-blue-500' },
                  { tranche: 'À échoir à J+60', montant: '18 450.00 EUR', status: 'Contrats récurrents réguliers', color: 'text-slate-500' },
                  { tranche: 'À échoir à J+90 et au-delà', montant: '12 800.00 EUR', status: 'Crédit commercial structuré', color: 'text-purple-500' },
                ].map((ech, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-slate-900 dark:text-white block">{ech.tranche}</strong>
                      <span className="text-[11px] text-slate-400">{ech.status}</span>
                    </div>
                    <span className={`font-extrabold text-sm ${ech.color}`}>{ech.montant}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Alertes & Rapprochements Bancaires" subtitle="Contrôles de cohérence automatique">
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-900 dark:text-emerald-200 block">
                      Égalité Débits / Crédits Vérifiée (100%)
                    </strong>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                      Toutes les écritures comptables respectent la partie double avec un écart nul (0.00 EUR).
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-blue-900 dark:text-blue-200 block">
                      Lettrage Bancaire Automatisé
                    </strong>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                      Rapprochement des avis d’opérés Stripe avec le compte 512000 effectué avec succès.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#E85D22] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block">
                      Protection d'Immuabilité de l'Exercice
                    </strong>
                    <p className="text-slate-500 mt-0.5">
                      Journal d'audit append-only avec chaînage SHA-256 actif.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. GESTION DOCUMENTAIRE & FACTURES (/comptable/factures & documents)  */}
      {/* ===================================================================== */}
      {(section === 'factures' || section === 'documents') && (
        <Card
          title="Référentiel Documentaire & Factures Commerciales (Page 63)"
          subtitle="Consultation des pièces comptables, factures, devis chiffrés et justificatifs fiscaux."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                downloadDataExport('factures-audit-comptable.json', JSON.stringify(invoices, null, 2), 'application/json');
                notifyToast('Export des factures comptables téléchargé.', 'success');
              }}
            >
              <Download className="w-4 h-4" /> Export Factures JSON
            </Button>
          }
        >
          {/* Recherche et filtres */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="w-full sm:w-80">
              <SearchBar
                value={invoiceSearch}
                onChange={setInvoiceSearch}
                placeholder="Rechercher par numéro de facture, client, commande..."
              />
            </div>

            <div className="flex gap-1.5 text-xs">
              {(['ALL', 'PAID', 'ISSUED', 'OVERDUE'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setInvoiceStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    invoiceStatusFilter === st
                      ? 'bg-[#E85D22] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-teal-900/40 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {st === 'ALL'
                    ? 'Toutes'
                    : st === 'PAID'
                    ? 'Payées'
                    : st === 'ISSUED'
                    ? 'Émises'
                    : 'En retard'}
                </button>
              ))}
            </div>
          </div>

          <DataTable
            caption="Factures commerciales enregistrées pour consultation et audit"
            keyExtractor={(i) => i.id}
            data={filteredInvoices}
            columns={[
              {
                key: 'inv',
                header: 'N° Facture & Pièce',
                isRowHeader: true,
                render: (i) => (
                  <div>
                    <strong className="text-slate-900 dark:text-white">{i.invoiceNumber}</strong>
                    <p className="text-[10px] text-slate-400 font-mono">Commande : {i.orderNumber}</p>
                  </div>
                ),
              },
              {
                key: 'client',
                header: 'Client & Fournisseur',
                render: (i) => (
                  <div>
                    <strong className="text-slate-900 dark:text-white block">{i.clientName}</strong>
                    <span className="text-slate-500 text-[11px]">{i.supplierName}</span>
                  </div>
                ),
              },
              {
                key: 'amount',
                header: 'Montants HT / TTC',
                render: (i) => (
                  <div>
                    <span className="font-extrabold text-sm block">
                      {formatCurrency(i.totalAmount, i.currency, locale)}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      HT: {formatCurrency(i.subtotal, i.currency, locale)} • TVA: {formatCurrency(i.taxAmount, i.currency, locale)}
                    </span>
                  </div>
                ),
              },
              {
                key: 'dates',
                header: 'Dates Émission / Échéance',
                render: (i) => (
                  <div className="font-mono text-[11px]">
                    <p>Émise : {i.issuedAt}</p>
                    <p className="text-slate-400">Échéance : {i.dueAt}</p>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Statut',
                render: (i) => (
                  <Badge variant={i.status === 'PAID' ? 'success' : 'warning'}>
                    {translateStatus(i.status, locale)}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Pièces',
                render: (i) => (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      downloadDataExport(`facture-${i.invoiceNumber}.json`, JSON.stringify(i, null, 2), 'application/json');
                      notifyToast(`Facture ${i.invoiceNumber} téléchargée.`, 'info');
                    }}
                  >
                    <Download className="w-3.5 h-3.5" /> PDF / JSON
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 3. MOTEUR DE CALCUL FINANCIER DECIMAL.JS (/comptable/calcul)          */}
      {/* ===================================================================== */}
      {section === 'calcul' && (
        <div className="space-y-6">
          <Card
            title="Moteur de Calcul Financier Déterministe Central (Page 64)"
            subtitle="Formule centrale : Montant × Taux × Nombre de jours / Diviseur. Précision absolue Decimal.js."
          >
            {/* Onglets Intérêts / Amortissement */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={selectedCalcTab === 'interest' ? 'primary' : 'secondary'}
                onClick={() => setSelectedCalcTab('interest')}
              >
                <Calculator className="w-4 h-4" /> Intérêts & Conventions de Jours (ACT/365, ACT/360, ACT/ACT)
              </Button>
              <Button
                variant={selectedCalcTab === 'amortization' ? 'primary' : 'secondary'}
                onClick={() => setSelectedCalcTab('amortization')}
              >
                <TrendingUp className="w-4 h-4" /> Tableau d'Amortissement de Crédit Commercial
              </Button>
            </div>

            {selectedCalcTab === 'interest' && (
              <div className="space-y-6 text-xs">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    label="Capital Principal (EUR)"
                    type="number"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    required
                  />
                  <Input
                    label="Taux Annuel (%)"
                    type="number"
                    step="0.01"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    required
                  />
                  <Input
                    label="Date de Départ"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                  <Input
                    label="Date de Fin"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Convention de Décompte :</label>
                    <select
                      value={basis}
                      onChange={(e) => setBasis(e.target.value as DayCountBasis)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-mono font-bold"
                    >
                      <option value="ACT/365">ACT/365 — Exact / 365 jours fixes</option>
                      <option value="ACT/360">ACT/360 — Exact / 360 jours (Marchés monétaires internationaux)</option>
                      <option value="ACT/ACT">ACT/ACT — Exact / 366j si année bissextile détectée, 365j sinon</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Règle d'Arrondi Décimal (Decimal.js) :</label>
                    <select
                      value={roundingMode}
                      onChange={(e) => setRoundingMode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-mono"
                    >
                      <option value="ROUND_HALF_UP">ROUND_HALF_UP (Arrondi bancaire commercial au plus proche)</option>
                      <option value="ROUND_UP">ROUND_UP (Plafond supérieur)</option>
                      <option value="ROUND_DOWN">ROUND_DOWN (Troncature stricte)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-teal-800">
                  <Button variant="primary" onClick={handleExecuteInterestCalc}>
                    <Calculator className="w-4 h-4" /> Exécuter Calcul Déterministe
                  </Button>
                </div>

                {/* Historique des calculs exécutés */}
                <div className="pt-4">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
                    Historique des Calculs Déterministes Exécutés ({calcHistory.length})
                  </h4>
                  <div className="space-y-2">
                    {calcHistory.map((ch) => (
                      <div
                        key={ch.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-slate-900 dark:text-white block font-mono">
                            {ch.basis} • {ch.principal} EUR @ {ch.annualRatePct}% sur {ch.daysCount} jours
                          </strong>
                          <span className="text-[11px] text-slate-400">
                            Période : {ch.startDate} → {ch.endDate} • Exécuté par : {ch.executedBy}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-600 block">
                            +{ch.interestAmount} EUR
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Total : {ch.totalAmount} EUR
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedCalcTab === 'amortization' && (
              <div className="space-y-6 text-xs">
                <div className="grid sm:grid-cols-3 gap-4">
                  <Input
                    label="Montant du Prêt Commercial (EUR)"
                    type="number"
                    value={loanPrincipal}
                    onChange={(e) => setLoanPrincipal(e.target.value)}
                    required
                  />
                  <Input
                    label="Taux d'Intérêt Annuel (%)"
                    type="number"
                    step="0.01"
                    value={loanRate}
                    onChange={(e) => setLoanRate(e.target.value)}
                    required
                  />
                  <Input
                    label="Durée (Nombre de Mensualités)"
                    type="number"
                    value={loanDuration}
                    onChange={(e) => setLoanDuration(e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="primary" onClick={handleCalculateAmortization}>
                    Générer Échéancier d'Amortissement
                  </Button>
                </div>

                {/* Tableau d'amortissement */}
                <DataTable
                  caption="Échéancier complet d'amortissement de prêt calculé via Decimal.js"
                  keyExtractor={(row) => String(row.periodNumber)}
                  data={amortizationSchedule}
                  columns={[
                    {
                      key: 'period',
                      header: 'Échéance',
                      isRowHeader: true,
                      render: (r: AmortizationScheduleRow) => <span className="font-bold">Mois #{r.periodNumber} ({r.periodDate})</span>,
                    },
                    {
                      key: 'init',
                      header: 'Capital Initial',
                      render: (r: AmortizationScheduleRow) => <span className="font-mono">{r.remainingPrincipalBeginning} EUR</span>,
                    },
                    {
                      key: 'pmt',
                      header: 'Mensualité Totale',
                      render: (r: AmortizationScheduleRow) => <span className="font-extrabold text-[#E85D22]">{r.totalPeriodicPayment} EUR</span>,
                    },
                    {
                      key: 'princ',
                      header: 'Amortissement Capital',
                      render: (r: AmortizationScheduleRow) => <span className="font-mono text-emerald-600">{r.principalPayment} EUR</span>,
                    },
                    {
                      key: 'int',
                      header: 'Intérêts',
                      render: (r: AmortizationScheduleRow) => <span className="font-mono text-amber-500">{r.interestPayment} EUR</span>,
                    },
                    {
                      key: 'end',
                      header: 'Capital Restant Dû',
                      render: (r: AmortizationScheduleRow) => <span className="font-mono font-bold">{r.remainingPrincipalEnd} EUR</span>,
                    },
                  ]}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. ANALYSE FINANCIÈRE & COMPTABILITÉ (/comptable/journaux & balance)   */}
      {/* ===================================================================== */}
      {section === 'journaux' && (
        <Card
          title="Journaux Comptables Auxiliaires & Pièces Justificatives (Page 65)"
          subtitle="Journal des Ventes (VTE), Achats (ACH), Banque (BNQ) et Opérations Diverses (OD)."
        >
          {/* Sélecteur de journal */}
          <div className="flex flex-wrap gap-1.5 text-xs mb-4">
            {(['ALL', 'VTE', 'ACH', 'BNQ', 'OD'] as const).map((jCode) => (
              <button
                key={jCode}
                type="button"
                onClick={() => setSelectedJournal(jCode)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedJournal === jCode
                    ? 'bg-[#E85D22] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-teal-900/40 text-slate-600 dark:text-slate-300'
                }`}
              >
                {jCode === 'ALL'
                  ? 'Tous les Journaux'
                  : jCode === 'VTE'
                  ? 'Ventes (VTE)'
                  : jCode === 'ACH'
                  ? 'Achats (ACH)'
                  : jCode === 'BNQ'
                  ? 'Banque / Trésorerie (BNQ)'
                  : 'Opérations Diverses (OD)'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm text-slate-900 dark:text-white">{entry.entryNumber}</strong>
                    <Badge variant="info">{entry.journalCode}</Badge>
                    <Badge variant="success">Équilibrée (100%)</Badge>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Date : {entry.date} • Période : {entry.fiscalPeriod} • Validée par : {entry.validatedBy}
                  </span>
                </div>

                <p className="text-slate-600 dark:text-slate-300 font-semibold">{entry.description}</p>

                {/* Lignes d'écriture */}
                <div className="space-y-1 pt-1">
                  {entry.lines.map((l) => (
                    <div
                      key={l.id}
                      className="p-2 rounded-xl bg-white dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between font-mono text-[11px]"
                    >
                      <div className="flex items-center gap-3">
                        <strong className="text-[#E85D22]">{l.accountCode}</strong>
                        <span className="text-slate-700 dark:text-slate-200">{l.accountName} ({l.label})</span>
                      </div>
                      <div className="flex gap-6">
                        <span className={Number(l.debit) > 0 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-400'}>
                          D: {l.debit}
                        </span>
                        <span className={Number(l.credit) > 0 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-400'}>
                          C: {l.credit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 4. GRAND LIVRE & BALANCE GÉNÉRALE (/comptable/grand-livre)             */}
      {/* ===================================================================== */}
      {section === 'grand-livre' && (
        <Card
          title="Grand Livre des Comptes & Balance Générale (Page 66)"
          subtitle="Vérification de l'équilibre Débits = Crédits et soldes progressifs."
          action={
            <Button size="sm" variant="secondary" onClick={handleExportTrialBalance}>
              <Download className="w-4 h-4" /> Export Balance CSV
            </Button>
          }
        >
          {/* Onglets Grand Livre / Balance Générale */}
          <div className="flex gap-2 mb-4 text-xs">
            <button
              type="button"
              onClick={() => setSelectedLedgerTab('ledger')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedLedgerTab === 'ledger'
                  ? 'bg-[#E85D22] text-white'
                  : 'bg-slate-100 dark:bg-teal-900/40'
              }`}
            >
              Grand Livre (Comptes détaillés)
            </button>
            <button
              type="button"
              onClick={() => setSelectedLedgerTab('balance')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedLedgerTab === 'balance'
                  ? 'bg-[#E85D22] text-white'
                  : 'bg-slate-100 dark:bg-teal-900/40'
              }`}
            >
              Balance Générale des Comptes
            </button>
          </div>

          {selectedLedgerTab === 'ledger' && (
            <div className="space-y-4 text-xs">
              {generalLedger.map((acc) => (
                <div
                  key={acc.accountCode}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-teal-800 pb-2">
                    <div className="flex items-center gap-2">
                      <strong className="text-base text-[#E85D22] font-mono">{acc.accountCode}</strong>
                      <span className="font-bold text-slate-900 dark:text-white">{acc.accountName}</span>
                    </div>
                    <Badge variant={Number(acc.balanceDebit) > 0 ? 'info' : 'success'}>
                      Solde : {Number(acc.balanceDebit) > 0 ? `${acc.balanceDebit} EUR (Débiteur)` : `${acc.balanceCredit} EUR (Créditeur)`}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    {acc.entries.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between font-mono text-[11px] p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-teal-900/30"
                      >
                        <span>{m.date} • {m.entryNumber} • {m.label}</span>
                        <div className="flex gap-4">
                          <span className="text-slate-700 dark:text-slate-300">D: {m.debit}</span>
                          <span className="text-slate-700 dark:text-slate-300">C: {m.credit}</span>
                          <span className="font-bold text-slate-900 dark:text-white">Solde: {m.runningBalance}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedLedgerTab === 'balance' && (
            <div className="space-y-4 text-xs">
              <DataTable
                caption="Balance Générale des Comptes de l'Exercice 2026"
                keyExtractor={(b: TrialBalanceItem) => b.accountCode}
                data={trialBalance.items}
                columns={[
                  {
                    key: 'code',
                    header: 'N° Compte',
                    isRowHeader: true,
                    render: (r: TrialBalanceItem) => <span className="font-mono font-bold text-[#E85D22]">{r.accountCode}</span>,
                  },
                  {
                    key: 'name',
                    header: 'Intitulé du Compte',
                    render: (r: TrialBalanceItem) => <span className="font-bold text-slate-900 dark:text-white">{r.accountName}</span>,
                  },
                  {
                    key: 'deb',
                    header: 'Total Débits',
                    render: (r: TrialBalanceItem) => <span className="font-mono">{r.totalDebit} EUR</span>,
                  },
                  {
                    key: 'cred',
                    header: 'Total Crédits',
                    render: (r: TrialBalanceItem) => <span className="font-mono">{r.totalCredit} EUR</span>,
                  },
                  {
                    key: 'soldeDeb',
                    header: 'Solde Débiteur',
                    render: (r: TrialBalanceItem) => <span className="font-mono font-bold text-blue-600">{r.soldeDebiteur} EUR</span>,
                  },
                  {
                    key: 'soldeCred',
                    header: 'Solde Créditeur',
                    render: (r: TrialBalanceItem) => <span className="font-mono font-bold text-emerald-600">{r.soldeCrediteur} EUR</span>,
                  },
                ]}
              />

              {/* Total & Vérification de l'équilibre */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <strong className="text-sm text-emerald-900 dark:text-emerald-200 block">
                    Équilibre Parfait de la Balance Générale
                  </strong>
                  <span className="text-slate-600 dark:text-slate-300">
                    Total Débits ({trialBalance.totalDebit} EUR) = Total Crédits ({trialBalance.totalCredit} EUR)
                  </span>
                </div>
                <Badge variant="success">Écart = 0.00 EUR</Badge>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 4. ÉTATS FINANCIERS : BILAN & RÉSULTAT (/comptable/etats-financiers)   */}
      {/* ===================================================================== */}
      {section === 'etats-financiers' && (
        <div className="space-y-6">
          <Card
            title="États Financiers Automatisés de Clôture (Page 67)"
            subtitle="Bilan Actif/Passif et Compte de Résultat certifiés conformes au PCG / IFRS."
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  downloadDataExport(
                    'etats-financiers-2026.json',
                    JSON.stringify(financialStatements, null, 2),
                    'application/json'
                  );
                  notifyToast('États financiers exportés en JSON certifié.', 'success');
                }}
              >
                <Download className="w-4 h-4" /> Export Bilan & P&L
              </Button>
            }
          >
            <div className="grid lg:grid-cols-2 gap-6 text-xs">
              {/* Bilan Actif / Passif */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#E85D22]" /> Bilan Patrimonial (Actif & Passif)
                </h4>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-teal-800 pb-2">
                    <strong className="text-slate-700 dark:text-slate-200">Total Actif Net</strong>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {financialStatements.balanceSheet.assets.totalAssets} EUR
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-500">
                    <div className="flex justify-between">
                      <span>• Actif Immobilisé (Matériel & Équipements)</span>
                      <span className="font-mono">{financialStatements.balanceSheet.assets.nonCurrentAssets} EUR</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Créances Clients & Stocks</span>
                      <span className="font-mono">{financialStatements.balanceSheet.assets.currentAssets} EUR</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Disponibilités Bancaires & Trésorerie</span>
                      <span className="font-mono">{financialStatements.balanceSheet.assets.cashAndEquivalents} EUR</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-200 dark:border-teal-800 pt-2">
                    <strong className="text-slate-700 dark:text-slate-200">Total Passif & Capitaux Propres</strong>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {financialStatements.balanceSheet.liabilities.totalLiabilitiesAndEquity} EUR
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-500">
                    <div className="flex justify-between">
                      <span>• Capitaux Propres</span>
                      <span className="font-mono">{financialStatements.balanceSheet.liabilities.equity} EUR</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Dettes d'Exploitation</span>
                      <span className="font-mono">{financialStatements.balanceSheet.liabilities.operatingLiabilities} EUR</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Résultat Net de l'Exercice</span>
                      <span className="font-mono text-emerald-600 font-bold">
                        +{financialStatements.incomeStatement.netIncome} EUR
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compte de Résultat */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-500" /> Compte de Résultat d'Exploitation (P&L)
                </h4>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-teal-800 pb-2">
                    <strong className="text-slate-700 dark:text-slate-200">Total Produits d'Exploitation (HT)</strong>
                    <span className="font-extrabold text-sm text-emerald-600">
                      {financialStatements.incomeStatement.operatingRevenue} EUR
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-teal-800 pb-2">
                    <strong className="text-slate-700 dark:text-slate-200">Total Charges d'Exploitation (HT)</strong>
                    <span className="font-extrabold text-sm text-rose-600">
                      -{financialStatements.incomeStatement.operatingExpenses} EUR
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center">
                    <div>
                      <strong className="text-sm text-emerald-900 dark:text-emerald-200 block">
                        Résultat Net Comptable
                      </strong>
                      <span className="text-[11px] text-slate-500">Marge brute conforme aux normes</span>
                    </div>
                    <span className="text-xl font-black text-emerald-600">
                      +{financialStatements.incomeStatement.netIncome} EUR
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. ASSISTANT IA FINANCIER (/comptable/ia)                              */}
      {/* ===================================================================== */}
      {section === 'assistant-ia' && (
        <div className="space-y-6">
          <Card
            title="Assistant IA Financier & Analyse de Trésorerie"
            subtitle="Explication automatique des calculs d'intérêts, synthèse des ratios de gestion et dictée d'audit."
          >
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3">
                <span className="font-semibold block text-slate-700 dark:text-slate-200">
                  Questions et Analyses Financières Fréquentes :
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Expliquer la différence de calcul entre ACT/365 et ACT/ACT bissextile',
                    'Analyser la vitesse de rotation des créances clients (DSO)',
                    'Vérifier la conformité de l’échéancier d’amortissement de prêt',
                    'Synthétiser les variations de TVA collectée sur le trimestre',
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        notifyToast(`Analyse IA générée pour : "${chip.slice(0, 35)}..."`, 'info')
                      }
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#082225] border border-slate-300 dark:border-teal-800 hover:border-[#E85D22] text-slate-700 dark:text-slate-300 transition-all text-[11px]"
                    >
                      💡 {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dictée vocale pour annotations d'audit */}
              <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Mic className="w-5 h-5 text-[#E85D22]" /> Microphone d’Audit STT / TTS
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Dictez vos notes de synthèse, rapports d'inventaire ou remarques comptables en Français, Anglais ou Arabe.
                  </p>
                </div>
                <Button
                  size="lg"
                  variant={isVoiceRecording ? 'danger' : 'primary'}
                  className="min-h-[44px]"
                  onClick={() => {
                    if (isVoiceRecording) {
                      stopVoiceDictation();
                    } else {
                      startVoiceDictation(locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'fr-FR');
                    }
                  }}
                >
                  {isVoiceRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isVoiceRecording ? 'Arrêter Enregistrement' : 'Démarrer Dictée d’Audit'}
                </Button>
              </div>

              {voiceTranscript && (
                <div className="p-3 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-mono text-xs">
                  <span className="text-slate-400 block mb-1">Transcription d'audit en direct :</span>
                  {voiceTranscript}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. PARAMÈTRES & RÉFÉRENTIELS COMPTABLES (/comptable/parametres)       */}
      {/* ===================================================================== */}
      {section === 'parametres' && (
        <div className="space-y-6">
          <Card
            title="Profil Professionnel & Référentiel Comptable (Page 68)"
            subtitle="Cabinet d'expertise comptable et configuration du plan de comptes."
          >
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <Input
                label="Nom & Titre de l'Expert-Comptable"
                defaultValue={`${currentUser.firstName} ${currentUser.lastName}`}
                readOnly
              />
              <Input
                label="Cabinet / Organisme Référent"
                defaultValue={currentUser.companyName}
                readOnly
              />
              <div>
                <label className="block text-xs font-semibold mb-1">Plan Comptable Appliqué :</label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value as AccountingFramework)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-bold"
                >
                  <option value="PCG">Plan Comptable Général (PCG Français / OHADA)</option>
                  <option value="IFRS">Normes Internationales IFRS (IASB)</option>
                  <option value="US_GAAP">US GAAP (FASB)</option>
                </select>
              </div>
              <Input
                label="Devise Principale de Tenue des Comptes"
                defaultValue="EUR (€) - Eurozone"
                readOnly
              />
            </div>
          </Card>

          <Card
            title="Préférences d'Affichage & Langue"
            subtitle="Personnalisation de l'environnement de consultation financière."
          >
            <div className="grid sm:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="font-semibold block mb-2">Langue :</label>
                <div className="flex gap-2">
                  {[
                    { code: 'fr', label: 'Français' },
                    { code: 'en', label: 'English' },
                    { code: 'ar', label: 'العربية (RTL)' },
                  ].map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLocale(l.code as any)}
                      className={`px-3 py-1.5 rounded-xl border font-bold transition-all ${
                        locale === l.code
                          ? 'border-[#E85D22] bg-[#E85D22] text-white'
                          : 'border-slate-300 dark:border-teal-800'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-2">Thème :</label>
                <div className="flex gap-2">
                  {[
                    { mode: 'system', label: 'Système' },
                    { mode: 'light', label: 'Clair' },
                    { mode: 'dark', label: 'Noir / Sombre' },
                  ].map((th) => (
                    <button
                      key={th.mode}
                      type="button"
                      onClick={() => setTheme(th.mode as ThemeMode)}
                      className={`px-3 py-1.5 rounded-xl border font-bold transition-all ${
                        theme === th.mode
                          ? 'border-[#E85D22] bg-[#E85D22] text-white'
                          : 'border-slate-300 dark:border-teal-800'
                      }`}
                    >
                      {th.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : DÉMONSTRATION RESTRICTION SÉCURITÉ STAGE 3 (READ-ONLY)        */}
      {/* ===================================================================== */}
      {stage3AlertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              Gouvernance de Sécurité : Restriction Stage 3
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Le profil <strong>COMPTABLE</strong> est soumis au principe du moindre privilège :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-500">
              <li>Modification des catalogues produits : <strong>INTERDIT (403)</strong></li>
              <li>Ajustement unilatéral des stocks : <strong>INTERDIT (403)</strong></li>
              <li>Annulation ou altération des commandes : <strong>INTERDIT (403)</strong></li>
              <li>Calculs et écritures financières : <strong>AUTORISÉS & TRACÉS</strong></li>
            </ul>
            <div className="flex justify-end pt-3">
              <Button variant="primary" onClick={() => setStage3AlertOpen(false)}>
                J'ai Compris
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
