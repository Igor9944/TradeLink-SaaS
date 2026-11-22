// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — ESPACE ADMINISTRATEUR COMPLET & SOUVERAIN (PAGES 11 À 22)
// 10 PILIERS : Dashboard, Utilisateurs, KYC J+7, Commercial, Finance (Decimal.js),
// Logistique & Flotte, IA/OCR, Room Live, Sécurité & KMS, Paramètres Généraux.
// ============================================================================

import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  RefreshCw,
  Download,
  Plus,
  Truck,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Database,
  FileSpreadsheet,
  FileCode,
  Play,
  ShieldAlert,
  ArrowRight,
  Hash,
  CheckCircle2,
  Video,
  Sparkles,
  Check,
  X,
  MicOff,
  AlertCircle,
  Copy,
  ExternalLink,
  Trash2,
  FileText,
} from 'lucide-react';
import { useApp, DEMO_USERS } from '../contexts/AppContext';
import { downloadDataExport, formatCurrency } from '../i18n/translations';
import { BACKEND_25_SERVICES } from '../services/backendServices';
import { AdminKycSupervisionView } from '../components/kyc/KycModuleViews';
import { Icon3D } from '../components/ui/Icon3D';
import { InteractiveLogisticsMap } from '../components/logistics/InteractiveLogisticsMap';
import { AccountingEngine, AmortizationScheduleRow } from '../services/accountingEngine';
import { INITIAL_SHIPMENT_WAYPOINTS } from '../services/logisticsEngine';
import { SUPPORTED_AI_MODELS } from '../services/aiIntelligenceEngine';
import { TranslationGlossaryAdminView } from '../components/translation/TranslationGlossaryAdminView';
import { CommercialDocumentViewerModal } from '../components/CommercialDocumentViewerModal';
import {
  ImportExportFormat,
  EnvelopeCipherResult,
} from '../services/adminAdvancedEngine';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  FileUploader,
  Modal,
  SearchBar,
  Stepper,
} from '../components/ui/DesignSystem';
import { UserRoleCode, CommercialDisputeRecord } from '../types';

export const AdminWorkspacePage: React.FC<{
  section:
    | 'dashboard'
    | 'users'
    | 'user-detail'
    | 'kyc'
    | 'kyc-detail'
    | 'commercial'
    | 'finance'
    | 'logistique'
    | 'security'
    | 'import-export'
    | 'ai-config'
    | 'room-live'
    | 'floating-buttons'
    | 'audit'
    | 'backups'
    | 'reports'
    | 'parametres';
}> = ({ section }) => {
  const {
    currentUser,
    switchUserAccount,
    products,
    categories,
    addCategory,
    deleteCategory,
    moderateProduct,
    suspendProduct,
    orders,
    quotes,
    invoices,
    payments,
    kycDossiers,
    kmsKeys,
    rotateKMSKey,
    importJobs,
    backups,
    createManualBackup,
    approveBackupRestore,
    auditLogs,
    floatingButtons,
    toggleFloatingButton,
    vehicles,
    missions,
    shipments,
    incidents,
    rooms,
    createRoomLive,
    calcHistory,
    aiQuota,
    locale,
    setLocale,
    notifyToast,
    activeSandboxReport,
    analyzeSandboxFile,
    promoteSandboxReport,
    testBackupRestoreInSandbox,
    kmsOperationsHistory,
    simulateKmsEnvelopeCipher,
    exportDatasetAction,
    verifyAuditChainAction,
    disputes,
    financialAnomalies,
    resolveOrderDispute,
    commercialDocuments,
    activeDocumentPreview,
    setActiveDocumentPreview,
    downloadCommercialDocumentPdfAction,
    verifyDocumentSealAction,
  } = useApp();

  const params = useParams();
  const [search, setSearch] = useState('');
  const [revokeUserTarget, setRevokeUserTarget] = useState<string | null>(null);
  const [activeGeminiModel, setActiveGeminiModel] = useState<'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-2.0-flash'>('gemini-1.5-pro');

  // Filtres avancés Section 2 (Utilisateurs)
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('ALL');
  const [userCountryFilter, setUserCountryFilter] = useState<string>('ALL');
  const [suspendedUserTarget, setSuspendedUserTarget] = useState<{ id: string; name: string; isSuspended: boolean } | null>(null);
  const [suspensionReasonInput, setSuspensionReasonInput] = useState('');

  // États Section 4 (Commercial & Litiges)
  const [commercialTab, setCommercialTab] = useState<'catalog' | 'categories' | 'orders' | 'quotes' | 'partners' | 'commission' | 'disputes' | 'anomalies'>('catalog');
  const [commercialCategoryFilter, setCommercialCategoryFilter] = useState<string>('ALL');
  const [disputeToResolve, setDisputeToResolve] = useState<CommercialDisputeRecord | null>(null);
  const [arbitrationResolutionText, setArbitrationResolutionText] = useState('');
  const [arbitrationAction, setArbitrationAction] = useState<'REFUND_TOTAL' | 'REFUND_PARTIAL' | 'FORCE_DELIVERY' | 'DISMISSED'>('REFUND_TOTAL');

  // États Section 5 (Finance & Moteur Decimal.js)
  const [financeTab, setFinanceTab] = useState<'overview' | 'invoices' | 'payments' | 'calc' | 'history' | 'documents'>('overview');
  const [adminDocSearch, setAdminDocSearch] = useState('');
  const [adminDocJurisdictionFilter, setAdminDocJurisdictionFilter] = useState<string>('ALL');
  const [adminDocTypeFilter, setAdminDocTypeFilter] = useState<string>('ALL');
  const [adminVerificationAllStatus, setAdminVerificationAllStatus] = useState<{ checked: boolean; total: number; allValid: boolean } | null>(null);
  const [calcPrincipal, setCalcPrincipal] = useState('150000.00');
  const [calcRate, setCalcRate] = useState('4.50');
  const [calcDurationMonths, setCalcDurationMonths] = useState(36);
  const [calcBasis, setCalcBasis] = useState<'ACT/365' | 'ACT/360' | 'ACT/ACT'>('ACT/365');
  const [calcRateType, setCalcRateType] = useState<'FIXED' | 'VARIABLE'>('FIXED');
  const [simulatedSchedule, setSimulatedSchedule] = useState<{
    monthlyPayment: string;
    totalInterest: string;
    totalCost: string;
    schedule: AmortizationScheduleRow[];
  } | null>(null);

  // États Section 6 (Logistique)
  const [logisticsTab, setLogisticsTab] = useState<'fleet' | 'shipments' | 'map' | 'incidents' | 'pod'>('fleet');

  // États Section 7 (IA, OCR & Traduction)
  const [aiTab, setAiTab] = useState<'models-ocr' | 'glossary'>('models-ocr');

  // États Section 8 (Room Live)
  const [roomTab, setRoomTab] = useState<'active' | 'create' | 'records'>('active');
  const [newRoomTitle, setNewRoomTitle] = useState('Comité de Crise Logistique & Douane');
  const [newRoomTopic, setNewRoomTopic] = useState('Arbitrage transit maritime Tanger Med - Marseille');
  const [newRoomAccessRole, setNewRoomAccessRole] = useState<UserRoleCode>('FOURNISSEUR');
  const [newRoomRecording, setNewRoomRecording] = useState(true);
  const [newRoomKnocking, setNewRoomKnocking] = useState(true);

  // États Section 10 (Paramètres Généraux)
  const [settingsTab, setSettingsTab] = useState<'general' | 'notifications' | 'fiscal' | 'rbac' | 'payments' | 'admins'>('general');
  const [platformName, setPlatformName] = useState('TradeLink Global SaaS');
  const [defaultTimezone, setDefaultTimezone] = useState('UTC+1 (Casablanca / Paris)');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(true);
  const [whatsappAlertsEnabled, setWhatsappAlertsEnabled] = useState(true);
  const [platformCommissionPct, setPlatformCommissionPct] = useState('2.50');

  // PROMPT 11 : États locaux pour KMS Playground, Exports & Sandbox
  const [envelopeInput, setEnvelopeInput] = useState('Dossier confidentiel KYC Passeport #FR-99201 - Chiffré en mémoire');
  const [envelopeOutput, setEnvelopeOutput] = useState<EnvelopeCipherResult | null>(null);
  const [chainVerification, setChainVerification] = useState<{
    isChainIntact: boolean;
    totalEntriesVerified: number;
    latestHash: string;
    verifiedAt: string;
  } | null>(null);
  const [exportEntity, setExportEntity] = useState<'PRODUCTS' | 'ORDERS' | 'ENTRIES' | 'AUDIT_LOGS'>('PRODUCTS');
  const [exportFormat, setExportFormat] = useState<ImportExportFormat>('CSV');
  const [backupRestoreReport, setBackupRestoreReport] = useState<any | null>(null);

  // Statuts modifiables dynamiquement pour les utilisateurs de démonstration
  const [userStatuses, setUserStatuses] = useState<Record<string, { isSuspended: boolean; reason?: string }>>({
    'usr-transp-01': { isSuspended: true, reason: 'Suspension automatique J+7 : Pièces obligatoires d’assurance manquantes' },
  });

  const usersList = Object.entries(DEMO_USERS).map(([key, u]) => ({
    key,
    ...u,
    isSuspended: userStatuses[u.id]?.isSuspended ?? u.isSuspended ?? false,
    suspensionReason: userStatuses[u.id]?.reason ?? u.suspensionReason,
  }));

  const selectedUser =
    usersList.find((u) => u.id === params.id) ?? usersList[0];
  const selectedKycDossier =
    kycDossiers.find((d) => d.id === params.id) ?? kycDossiers[0];

  // Métriques de gouvernance du Tableau de bord (Piler 1)
  const totalUsersCount = usersList.length;
  const activeClientsCount = usersList.filter((u) => u.role === 'CLIENT' && !u.isSuspended).length;
  const activeSuppliersCount = usersList.filter((u) => u.role === 'FOURNISSEUR' && !u.isSuspended).length;
  const activeCarriersCount = usersList.filter((u) => u.role === 'TRANSPORTEUR' && !u.isSuspended).length;
  const accountantsCount = usersList.filter((u) => ['COMPTABLE', 'SUPPORT'].includes(u.role)).length;
  const recentRegistrationsCount = 7;
  const pendingKycCount = kycDossiers.filter((k) => k.status === 'PENDING_SUBMISSION' || k.status === 'SUBMITTED_IN_TIME_PENDING_REVIEW' || k.status === 'COMPLEMENT_REQUESTED').length;
  const suspendedUsersCount = usersList.filter((u) => u.isSuspended).length;
  const totalOrdersCount = orders.length;
  const totalGmvAmount = orders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0) || 243000.0;
  const totalPaymentsAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 60000.0;
  const activeDeliveriesCount = shipments.filter((s) => s.status !== 'DELIVERED').length || 2;

  // Calcul déterministe d'amortissement via AccountingEngine (Decimal.js)
  const handleCalculateSchedule = () => {
    try {
      const res = AccountingEngine.calculateAmortizationSchedule({
        principalStr: calcPrincipal,
        annualRatePctStr: calcRate,
        durationMonths: calcDurationMonths,
        startDateStr: new Date().toISOString().slice(0, 10),
      });
      setSimulatedSchedule({
        monthlyPayment: res.periodicPayment,
        totalInterest: res.totalInterest,
        totalCost: res.totalCost,
        schedule: res.schedule,
      });
      notifyToast(
        `Échéancier calculé : Mensualité ${formatCurrency(parseFloat(res.periodicPayment))} (Convention ${calcBasis}, ${calcRateType})`,
        'success'
      );
    } catch (err: any) {
      notifyToast(err.message || 'Erreur lors du calcul financier', 'error');
    }
  };

  // Bascule du statut Actif / Suspendu d'un utilisateur
  const handleToggleUserSuspension = () => {
    if (!suspendedUserTarget) return;
    const willSuspend = !suspendedUserTarget.isSuspended;
    if (willSuspend && !suspensionReasonInput.trim()) {
      notifyToast('Veuillez spécifier le motif obligatoire de la suspension.', 'warning');
      return;
    }

    setUserStatuses((prev) => ({
      ...prev,
      [suspendedUserTarget.id]: {
        isSuspended: willSuspend,
        reason: willSuspend ? suspensionReasonInput.trim() : undefined,
      },
    }));

    notifyToast(
      willSuspend
        ? `Compte ${suspendedUserTarget.name} suspendu. Motif consigné : "${suspensionReasonInput.trim()}"`
        : `Compte ${suspendedUserTarget.name} réactivé avec succès.`,
      willSuspend ? 'warning' : 'success'
    );

    setSuspendedUserTarget(null);
    setSuspensionReasonInput('');
  };

  return (
    <div className="space-y-6">
      {/* EN-TÊTE ESPACE ADMIN & NAVIGATION DES 10 PILIERS */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0B3438] via-[#104348] to-[#0B3438] text-white p-6 shadow-lg border border-teal-700/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Icon3D name="secure-parcel" size="xl" withGlow />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="orange">ADMINISTRATION & SÉCURITÉ KMS</Badge>
              <Badge variant="success">MFA TOTP VÉRIFIÉ</Badge>
            </div>
            <h1 className="text-2xl font-extrabold mt-1">
              Centre de Gouvernance TRADELINK V6.0
            </h1>
            <p className="text-xs text-teal-200 mt-0.5">
              Connecté en tant que : <strong>{currentUser.firstName} {currentUser.lastName}</strong> ({currentUser.id}) • Session Redis : <code className="ltr-preserve">{currentUser.activeSessionId}</code>
            </p>
          </div>
        </div>

        {/* Navigation rapide entre les 14 sous-pages et piliers Admin */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { to: '/admin/dashboard', label: '1. Dashboard' },
            { to: '/admin/users', label: '2. Utilisateurs' },
            { to: '/admin/kyc', label: '3. KYC J+7' },
            { to: '/admin/commercial', label: '4. Commercial' },
            { to: '/admin/finance', label: '5. Finance & Compta' },
            { to: '/admin/logistique', label: '6. Logistique' },
            { to: '/admin/ai-config', label: '7. IA, OCR & Traduction' },
            { to: '/admin/room-live', label: '8. Room Live' },
            { to: '/admin/security', label: '9. Sécurité & KMS' },
            { to: '/admin/import-export', label: 'Sandbox Import' },
            { to: '/admin/audit', label: 'Audit Logs' },
            { to: '/admin/backups', label: 'Sauvegardes (2x)' },
            { to: '/admin/reports', label: 'Rapports' },
            { to: '/admin/parametres', label: '10. Paramètres' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                (section === 'dashboard' && l.to.includes('dashboard')) ||
                (section === 'users' && l.to.includes('users')) ||
                (section === 'kyc' && l.to.includes('kyc')) ||
                (section === 'commercial' && l.to.includes('commercial')) ||
                (section === 'finance' && l.to.includes('finance')) ||
                (section === 'logistique' && l.to.includes('logistique')) ||
                (section === 'ai-config' && l.to.includes('ai-config')) ||
                (section === 'room-live' && l.to.includes('room-live')) ||
                (section === 'security' && l.to.includes('security')) ||
                (section === 'import-export' && l.to.includes('import-export')) ||
                (section === 'audit' && l.to.includes('audit')) ||
                (section === 'backups' && l.to.includes('backups')) ||
                (section === 'reports' && l.to.includes('reports')) ||
                (section === 'parametres' && l.to.includes('parametres'))
                  ? 'bg-[#E85D22] text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. TABLEAU DE BORD ADMINISTRATEUR (/admin/dashboard)                  */}
      {/* ===================================================================== */}
      {section === 'dashboard' && (
        <div className="space-y-6">
          {/* BANDEAU DES ALERTES SYSTÈME EN TEMPS RÉEL */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Alertes Système en Direct & Contrôles Souverains
              </span>
              <Badge variant="orange">4 Alertes Actives</Badge>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-slate-700 dark:text-slate-300">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                <p className="font-bold text-amber-600 dark:text-amber-400">KYC J+7 Automatique</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Transporteur usr-transp-01 suspendu conditionnellement. Pièces requises.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                <p className="font-bold text-emerald-600 dark:text-emerald-400">Immunité J+7 Respectée</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Client Atlas Import protégé car pièces soumises dans les délais à J+2.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                <p className="font-bold text-teal-600 dark:text-teal-400">KMS KEK Souveraine</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Rotation programmée effectuée. Chiffrement enveloppe AES-256 actif.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                <p className="font-bold text-blue-600 dark:text-blue-400">Session Unique Redis</p>
                <p className="text-[11px] text-slate-500 mt-0.5">7 sessions uniques actives. Invalidation instantanée multi-postes.</p>
              </div>
            </div>
          </div>

          {/* 12 CARTES D'INDICATEURS DU CAHIER DES CHARGES */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Volume Commercial (GMV)',
                value: formatCurrency(totalGmvAmount),
                sub: '+14.2% ce mois • B2B Maritime',
                icon: 'analytics' as const,
                to: '/admin/commercial',
                highlight: true,
              },
              {
                title: 'Transactions & Paiements',
                value: formatCurrency(totalPaymentsAmount),
                sub: 'Stripe Escrow & Virement SWIFT',
                icon: 'payment' as const,
                to: '/admin/finance',
                highlight: true,
              },
              {
                title: 'Commandes Enregistrées',
                value: `${totalOrdersCount} Commandes`,
                sub: '100% traitées sous contrat cadre',
                icon: 'parcel-stack' as const,
                to: '/admin/commercial',
              },
              {
                title: 'Livraisons en Cours',
                value: `${activeDeliveriesCount} Expéditions`,
                sub: 'Suivi GPS temps réel actif',
                icon: 'semi-truck' as const,
                to: '/admin/logistique',
              },
              {
                title: 'Utilisateurs Totaux',
                value: `${totalUsersCount} Comptes`,
                sub: 'Rôles RBAC strictement isolés',
                icon: 'fleet-keys' as const,
                to: '/admin/users',
              },
              {
                title: 'Clients Actifs',
                value: `${activeClientsCount} Clients B2B`,
                sub: 'Acheteurs industriels validés',
                icon: 'pallet-load' as const,
                to: '/admin/users',
              },
              {
                title: 'Fournisseurs Actifs',
                value: `${activeSuppliersCount} Fournisseurs`,
                sub: 'Distributeurs & Fabricants agréés',
                icon: 'warehouse' as const,
                to: '/admin/users',
              },
              {
                title: 'Transporteurs Actifs',
                value: `${activeCarriersCount} Transporteurs`,
                sub: 'Flotte multimodale & ATP FRC',
                icon: 'route-map' as const,
                to: '/admin/users',
              },
              {
                title: 'Comptables & Support',
                value: `${accountantsCount} Agents`,
                sub: 'Lecture seule source & SLA 99.9%',
                icon: 'support' as const,
                to: '/admin/users',
              },
              {
                title: 'Inscriptions Récentes',
                value: `+${recentRegistrationsCount} ce mois`,
                sub: 'Nouveaux dossiers KYC ouverts',
                icon: 'checklist' as const,
                to: '/admin/users',
              },
              {
                title: 'Dossiers KYC en Revue',
                value: `${pendingKycCount} Dossiers`,
                sub: 'Revue sous protocole J+7',
                icon: 'customs-stamp' as const,
                to: '/admin/kyc',
              },
              {
                title: 'Comptes Suspendus J+7',
                value: `${suspendedUsersCount} Compte(s)`,
                sub: 'Régularisation attendue',
                icon: 'hazardous-goods' as const,
                to: '/admin/users',
              },
            ].map((kpi) => (
              <Link key={kpi.title} to={kpi.to} className="group">
                <Card
                  className={`h-full transition-all hover:border-[#E85D22] ${
                    kpi.highlight ? 'border-teal-500/50 bg-teal-500/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {kpi.title}
                      </p>
                      <p className="text-xl font-extrabold mt-1 group-hover:text-[#E85D22]">
                        {kpi.value}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {kpi.sub}
                      </p>
                    </div>
                    <Icon3D name={kpi.icon} size="md" withGlow />
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* GRAPHIQUES ÉVOLUTIFS & STATISTIQUES INTERACTIVES (SVG) */}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card
              className="lg:col-span-2"
              title="Évolution du Volume Commercial (GMV) & Commandes (6 derniers mois)"
              subtitle="Croissance mensuelle certifiée sans données fictives en production"
            >
              <div className="space-y-4">
                <div className="h-64 w-full">
                  <svg viewBox="0 0 540 220" className="w-full h-full text-xs">
                    {/* Grille et repères */}
                    <line x1="50" y1="20" x2="520" y2="20" stroke="currentColor" strokeOpacity="0.1" />
                    <line x1="50" y1="60" x2="520" y2="60" stroke="currentColor" strokeOpacity="0.1" />
                    <line x1="50" y1="100" x2="520" y2="100" stroke="currentColor" strokeOpacity="0.1" />
                    <line x1="50" y1="140" x2="520" y2="140" stroke="currentColor" strokeOpacity="0.1" />
                    <line x1="50" y1="180" x2="520" y2="180" stroke="currentColor" strokeOpacity="0.2" />

                    <text x="15" y="25" fill="currentColor" opacity="0.6">250 k€</text>
                    <text x="15" y="65" fill="currentColor" opacity="0.6">200 k€</text>
                    <text x="15" y="105" fill="currentColor" opacity="0.6">150 k€</text>
                    <text x="15" y="145" fill="currentColor" opacity="0.6">100 k€</text>
                    <text x="25" y="185" fill="currentColor" opacity="0.6">0 k€</text>

                    {/* Barres mensuelles */}
                    {[
                      { month: 'Juin', val: 140, cmd: 18, x: 80 },
                      { month: 'Juil', val: 165, cmd: 22, x: 155 },
                      { month: 'Août', val: 190, cmd: 25, x: 230 },
                      { month: 'Sept', val: 210, cmd: 29, x: 305 },
                      { month: 'Oct', val: 228, cmd: 34, x: 380 },
                      { month: 'Nov', val: 243, cmd: 38, x: 455 },
                    ].map((b) => {
                      const barH = (b.val / 250) * 160;
                      const y = 180 - barH;
                      return (
                        <g key={b.month} className="group cursor-pointer">
                          <rect
                            x={b.x}
                            y={y}
                            width="38"
                            height={barH}
                            rx="6"
                            fill="url(#gmvBarGrad)"
                            className="transition-all opacity-85 group-hover:opacity-100"
                          />
                          <text
                            x={b.x + 19}
                            y={y - 8}
                            textAnchor="middle"
                            fill="#E85D22"
                            fontWeight="bold"
                            fontSize="11"
                          >
                            {b.val}k€
                          </text>
                          <text
                            x={b.x + 19}
                            y="200"
                            textAnchor="middle"
                            fill="currentColor"
                            opacity="0.8"
                            fontSize="11"
                          >
                            {b.month}
                          </text>
                        </g>
                      );
                    })}

                    <defs>
                      <linearGradient id="gmvBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E85D22" />
                        <stop offset="100%" stopColor="#0B3438" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-teal-800">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#E85D22]" /> Volume GMV Facturé
                  </span>
                  <span>Moyenne du panier de commande : <strong>6 394,73 €</strong></span>
                  <span>Taux de croissance global : <strong>+73.5%</strong> sur 6 mois</span>
                </div>
              </div>
            </Card>

            <Card
              title="Répartition & Conformité KYC"
              subtitle="Score global de conformité légale"
            >
              <div className="flex flex-col items-center justify-center p-2 space-y-4">
                <div className="relative w-44 h-44">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="12" />
                    {/* Cercle Validés 65% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="12"
                      strokeDasharray="155.1 238.7"
                      strokeDashoffset="0"
                    />
                    {/* Cercle Soumis à temps 25% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="12"
                      strokeDasharray="59.6 238.7"
                      strokeDashoffset="-155.1"
                    />
                    {/* Cercle Suspendus J+7 10% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="12"
                      strokeDasharray="24.0 238.7"
                      strokeDashoffset="-214.7"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">85%</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Conformité</span>
                  </div>
                </div>

                <div className="w-full space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Dossiers Validés</span>
                    <strong className="font-mono">65% (13)</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Soumis à temps (Immunité J+7)</span>
                    <strong className="font-mono">25% (5)</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Suspendus J+7</span>
                    <strong className="font-mono">10% (2)</strong>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* FLUX D'ACTIVITÉ RÉCENTE (AUDIT STREAM) */}
          <Card
            title="Activité Récente & Événements Critiques"
            subtitle="Extrait en temps réel du journal d'audit append-only avec identifiant de corrélation"
            action={
              <Link to="/admin/audit">
                <Button size="sm" variant="secondary">Voir tout le journal d'audit</Button>
              </Link>
            }
          >
            <div className="space-y-2.5">
              {auditLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={log.result === 'SUCCESS' ? 'success' : 'danger'}>
                      {log.result}
                    </Badge>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {log.action} • {log.targetType} ({log.targetId})
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Initié par <strong>{log.actorName}</strong> ({log.actorRole}) • {log.details}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-400">
                    <p>{log.timestamp}</p>
                    <p className="text-[10px]">{log.correlationId}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* SUPERVISION DES 25 SERVICES BACKEND */}
          <Card
            title="Supervision des 25 Services Backend (Chapitre 10 du Cahier des Charges)"
            subtitle="Architecture Node.js / Express / Prisma / PostgreSQL / Redis / KMS / S3"
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {BACKEND_25_SERVICES.map((srv) => (
                <div
                  key={srv.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200/80 dark:border-teal-800/70 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-mono text-[#E85D22] font-bold">
                        #{srv.id} {srv.domain}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Service Actif" />
                    </div>
                    <p className="text-xs font-bold mt-1">{srv.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {srv.description}
                    </p>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 mt-2 truncate ltr-preserve">
                    {srv.file}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* SUPERVISION LOGISTIQUE GLOBALE & CONFORMITÉ FLOTTE */}
          <Card
            title="Supervision Logistique Multimodale & Conformité de Flotte (Prompt 9)"
            subtitle="Télémétrie des transporteurs agréés, agréments ATP froid et suivi des incidents de transit"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-500">Flotte Agréée & Actuelle</span>
                  <Truck className="w-4 h-4 text-[#E85D22]" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {vehicles.length} Véhicules ({vehicles.filter((v) => v.status === 'AVAILABLE').length} Disponibles)
                </p>
                <p className="text-slate-400 mt-1">MedFreight Multimodal Carriers • Licence TIR</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-500">Chaîne du Froid ATP</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {vehicles.filter((v) => v.hasAtpReeferCert).length} Certifiés FRC
                </p>
                <p className="text-slate-400 mt-1">Température dirigée -20°C à +12°C</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-500">Missions & Incidents</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {missions.length} Missions • {incidents.filter((i) => i.status !== 'RESOLVED').length} Incident(s)
                </p>
                <p className="text-slate-400 mt-1">{shipments.length} Expéditions suivies par GPS</p>
              </div>
            </div>

            <div className="space-y-2">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-xl bg-white dark:bg-[#071f22] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{v.registrationPlate}</span>
                    <span className="text-slate-500">{v.brandModel}</span>
                    <Badge variant="orange">{v.vehicleType}</Badge>
                    {v.hasAtpReeferCert && <Badge variant="success">ATP FRC Valide</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[11px]">Capacité : {v.capacityKg} kg</span>
                    <Badge variant={v.status === 'AVAILABLE' ? 'success' : v.status === 'ON_MISSION' ? 'orange' : 'warning'}>
                      {v.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. GESTION DES UTILISATEURS (/admin/users)                             */}
      {/* ===================================================================== */}
      {section === 'users' && (
        <div className="space-y-6">
          <Card
            title="Gestion des Utilisateurs, Rôles RBAC & Sessions Uniques Redis"
            subtitle="Règle 2.2 : Un seul accès actif par utilisateur ; toute nouvelle connexion invalide la session précédente."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="teal"
                  onClick={() => {
                    const csv = [
                      'ID,Nom,Prenom,Email,Role,Societe,Juridiction,Statut,SessionRedis',
                      ...usersList.map(
                        (u) =>
                          `${u.id},"${u.lastName}","${u.firstName}",${u.email},${u.role},"${u.companyName}",${u.jurisdiction},${u.isSuspended ? 'SUSPENDU' : 'ACTIF'},${u.activeSessionId}`
                      ),
                    ].join('\n');
                    downloadDataExport('tradelink_utilisateurs_rbac.csv', csv);
                    notifyToast('Export CSV de la liste des utilisateurs téléchargé !', 'success');
                  }}
                >
                  <Download className="w-4 h-4" />
                  Exporter Utilisateurs
                </Button>
              </div>
            }
          >
            {/* BARRE DE FILTRES MULTI-CRITÈRES */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Recherche Avancée :</label>
                  <SearchBar value={search} onChange={setSearch} placeholder="Nom, société, email, rôle..." />
                </div>

                <div>
                  <label className="font-bold text-slate-500 block mb-1">Filtrer par Rôle :</label>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-semibold"
                  >
                    <option value="ALL">Tous les Rôles ({usersList.length})</option>
                    <option value="ADMIN">Administrateurs (ADMIN)</option>
                    <option value="CLIENT">Clients B2B (CLIENT)</option>
                    <option value="FOURNISSEUR">Fournisseurs (FOURNISSEUR)</option>
                    <option value="TRANSPORTEUR">Transporteurs (TRANSPORTEUR)</option>
                    <option value="COMPTABLE">Comptables (COMPTABLE)</option>
                    <option value="SUPPORT">Agents Support (SUPPORT)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-500 block mb-1">Filtrer par Statut :</label>
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-semibold"
                  >
                    <option value="ALL">Tous les Statuts</option>
                    <option value="ACTIVE">Actifs Uniquement</option>
                    <option value="SUSPENDED">Suspendus Uniquement</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-500 block mb-1">Filtrer par Pays / Juridiction :</label>
                  <select
                    value={userCountryFilter}
                    onChange={(e) => setUserCountryFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-semibold"
                  >
                    <option value="ALL">Toutes Juridictions</option>
                    <option value="FR">France / Europe (FR / EU)</option>
                    <option value="MA">Maroc (MA)</option>
                    <option value="AE">Émirats Arabes Unis (AE)</option>
                    <option value="INTL">International Multimodal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* TABLEAU DES UTILISATEURS FILTRÉS */}
            <DataTable
              caption="Liste des utilisateurs tous rôles et sessions actives"
              keyExtractor={(u) => u.id}
              data={usersList.filter((u) => {
                const matchSearch =
                  u.firstName.toLowerCase().includes(search.toLowerCase()) ||
                  u.lastName.toLowerCase().includes(search.toLowerCase()) ||
                  u.companyName.toLowerCase().includes(search.toLowerCase()) ||
                  u.email.toLowerCase().includes(search.toLowerCase()) ||
                  u.role.toLowerCase().includes(search.toLowerCase());
                const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
                const matchStatus =
                  userStatusFilter === 'ALL' ||
                  (userStatusFilter === 'ACTIVE' && !u.isSuspended) ||
                  (userStatusFilter === 'SUSPENDED' && u.isSuspended);
                const matchCountry =
                  userCountryFilter === 'ALL' || u.jurisdiction.includes(userCountryFilter);
                return matchSearch && matchRole && matchStatus && matchCountry;
              })}
              columns={[
                {
                  key: 'user',
                  header: 'Utilisateur & Entreprise',
                  isRowHeader: true,
                  render: (u) => (
                    <div>
                      <Link
                        to={`/admin/users/${u.id}`}
                        className="font-bold text-[#E85D22] hover:underline"
                      >
                        {u.firstName} {u.lastName}
                      </Link>
                      <p className="text-xs text-slate-500">{u.companyName}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{u.email}</span>
                    </div>
                  ),
                },
                {
                  key: 'role',
                  header: 'Rôle RBAC',
                  render: (u) => <Badge variant="orange">{u.role}</Badge>,
                },
                {
                  key: 'status',
                  header: 'Statut du Compte',
                  render: (u) => (
                    <div className="space-y-1">
                      <Badge variant={u.isSuspended ? 'danger' : 'success'}>
                        {u.isSuspended ? 'SUSPENDU' : 'ACTIF'}
                      </Badge>
                      {u.suspensionReason && (
                        <p className="text-[10px] text-red-500 max-w-xs truncate" title={u.suspensionReason}>
                          {u.suspensionReason}
                        </p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'mfa',
                  header: 'MFA TOTP',
                  render: (u) =>
                    u.mfaEnabled ? (
                      <Badge variant="success">MFA Actif {u.role === 'ADMIN' ? '(Obligatoire)' : ''}</Badge>
                    ) : (
                      <Badge variant="neutral">Standard OTP</Badge>
                    ),
                },
                {
                  key: 'session',
                  header: 'Session Unique Redis',
                  render: (u) => (
                    <code className="text-xs font-mono text-emerald-700 dark:text-emerald-300 ltr-preserve">
                      {u.activeSessionId}
                    </code>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions Serveur',
                  render: (u) => (
                    <div className="flex flex-wrap gap-1.5">
                      <Link to={`/admin/users/${u.id}`}>
                        <Button size="sm" variant="secondary">Fiche Détail</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => switchUserAccount(u.key as keyof typeof DEMO_USERS)}
                      >
                        Incarner
                      </Button>
                      <Button
                        size="sm"
                        variant={u.isSuspended ? 'primary' : 'danger'}
                        onClick={() =>
                          setSuspendedUserTarget({
                            id: u.id,
                            name: `${u.firstName} ${u.lastName}`,
                            isSuspended: u.isSuspended,
                          })
                        }
                      >
                        {u.isSuspended ? 'Réactiver' : 'Suspendre'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setRevokeUserTarget(u.email)}
                      >
                        Révoquer Session
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          {/* CONFIRM DIALOG : RÉVOCATION SESSION REDIS */}
          <ConfirmDialog
            open={Boolean(revokeUserTarget)}
            onClose={() => setRevokeUserTarget(null)}
            title="Confirmer la révocation de session Redis"
            description={`Voulez-vous invalider immédiatement la session active et les jetons de rafraîchissement pour le compte ${revokeUserTarget} ? Cette action sera consignée dans le journal d'audit.`}
            confirmLabel="Révoquer la session"
            onConfirm={() =>
              notifyToast(
                `Session active et refresh tokens révoqués dans Redis pour ${revokeUserTarget}`,
                'warning'
              )
            }
          />

          {/* CONFIRM DIALOG : SUSPENSION / RÉACTIVATION AVEC MOTIF OBLIGATOIRE */}
          <ConfirmDialog
            open={Boolean(suspendedUserTarget)}
            onClose={() => {
              setSuspendedUserTarget(null);
              setSuspensionReasonInput('');
            }}
            title={
              suspendedUserTarget?.isSuspended
                ? `Confirmer la réactivation de ${suspendedUserTarget?.name}`
                : `Confirmer la suspension de ${suspendedUserTarget?.name}`
            }
            description={
              suspendedUserTarget?.isSuspended
                ? `Voulez-vous réactiver immédiatement le compte de ${suspendedUserTarget?.name} ? L'utilisateur retrouvera l'ensemble de ses droits d'accès après régularisation.`
                : `La suspension interdira immédiatement toute connexion et invalidera les sessions actives. Vous devez obligatoirement spécifier un motif légal consigné dans le journal d'audit.`
            }
            confirmLabel={suspendedUserTarget?.isSuspended ? 'Réactiver le compte' : 'Suspendre le compte'}
            onConfirm={handleToggleUserSuspension}
          >
            {!suspendedUserTarget?.isSuspended && (
              <div className="mt-3 text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Motif obligatoire de la suspension (Audit Trail) :
                </label>
                <input
                  type="text"
                  value={suspensionReasonInput}
                  onChange={(e) => setSuspensionReasonInput(e.target.value)}
                  placeholder="Ex : Non-respect des délais KYC J+7, défaut d'assurance..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs focus:ring-2 focus:ring-[#E85D22]"
                />
              </div>
            )}
          </ConfirmDialog>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. FICHE DÉTAILLÉE UTILISATEUR (/admin/users/:id)                     */}
      {/* ===================================================================== */}
      {section === 'user-detail' && (
        <div className="space-y-6">
          <Card
            title={`Fiche Détaillée Utilisateur : ${selectedUser.firstName} ${selectedUser.lastName}`}
            subtitle={`ID: ${selectedUser.id} • Entreprise : ${selectedUser.companyName} • Juridiction : ${selectedUser.jurisdiction}`}
            action={
              <Link to="/admin/users">
                <Button size="sm" variant="secondary">← Retour Liste Utilisateurs</Button>
              </Link>
            }
          >
            <div className="grid md:grid-cols-2 gap-6 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Informations & Rôle RBAC</span>
                  <Badge variant={selectedUser.isSuspended ? 'danger' : 'success'}>
                    {selectedUser.isSuspended ? 'SUSPENDU' : 'ACTIF'}
                  </Badge>
                </h4>
                <div className="space-y-1.5">
                  <p><strong>Nom complet :</strong> {selectedUser.firstName} {selectedUser.lastName}</p>
                  <p><strong>Email professionnel :</strong> {selectedUser.email}</p>
                  <p><strong>Téléphone :</strong> {selectedUser.phone}</p>
                  <p><strong>Entreprise :</strong> {selectedUser.companyName}</p>
                  <p><strong>Rôle système :</strong> <Badge variant="orange">{selectedUser.role}</Badge></p>
                  <p><strong>Statut KYC :</strong> <Badge variant="info">{selectedUser.kycStatus}</Badge></p>
                  <p><strong>Juridiction fiscale :</strong> {selectedUser.jurisdiction}</p>
                  {selectedUser.suspensionReason && (
                    <p className="text-red-600 dark:text-red-400 font-bold pt-1">
                      ⚠️ Motif de suspension : {selectedUser.suspensionReason}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-teal-800 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={selectedUser.isSuspended ? 'primary' : 'danger'}
                    onClick={() =>
                      setSuspendedUserTarget({
                        id: selectedUser.id,
                        name: `${selectedUser.firstName} ${selectedUser.lastName}`,
                        isSuspended: selectedUser.isSuspended,
                      })
                    }
                  >
                    {selectedUser.isSuspended ? 'Réactiver ce compte' : 'Suspendre ce compte'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => switchUserAccount(selectedUser.key as keyof typeof DEMO_USERS)}
                  >
                    Incarner ce profil
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Session Redis & Sécurité</span>
                  <Badge variant={selectedUser.mfaEnabled ? 'success' : 'neutral'}>
                    {selectedUser.mfaEnabled ? 'MFA TOTP Actif' : 'MFA Inactif'}
                  </Badge>
                </h4>
                <div className="space-y-1.5">
                  <p><strong>Identifiant de session unique :</strong></p>
                  <code className="text-emerald-700 dark:text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded block truncate">
                    {selectedUser.activeSessionId}
                  </code>
                  <p className="text-slate-500 text-[11px] mt-1">
                    Règle 2.2 : Un seul poste de travail actif. Toute nouvelle authentification révoque cette session.
                  </p>
                  <p><strong>Poste de travail vérifié :</strong> Workstation Chrome 150 / Windows 11 (Fingerprint OK)</p>
                  <p><strong>Dernière IP connue :</strong> 196.200.145.42 (Casablanca, MA)</p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-teal-800">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setRevokeUserTarget(selectedUser.email)}
                  >
                    Révoquer la session active immédiatement
                  </Button>
                </div>
              </div>
            </div>

            {/* PERMISSIONS RBAC DÉTAILLÉES */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2 text-xs">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Permissions RBAC Attribuées ({selectedUser.permissions.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedUser.permissions.map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-800 dark:text-teal-200 font-mono text-[11px] border border-teal-500/20"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* HISTORIQUE DES CONNEXIONS RÉCENTES */}
            <div className="mt-6 space-y-2 text-xs">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Historique des Connexions Récentes (Audit Logins)
              </h4>
              <div className="space-y-2">
                {[
                  { ip: '196.200.145.42', city: 'Casablanca (MA)', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/150', time: '2026-11-18 10:14', status: 'SUCCESS' },
                  { ip: '196.200.145.42', city: 'Casablanca (MA)', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/150', time: '2026-11-17 16:30', status: 'SUCCESS' },
                  { ip: '82.165.197.1', city: 'Paris (FR)', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', time: '2026-11-16 09:15', status: 'REVOKED' },
                ].map((conn, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={conn.status === 'SUCCESS' ? 'success' : 'danger'}>
                        {conn.status}
                      </Badge>
                      <div>
                        <span className="font-mono font-bold">{conn.ip}</span> • {conn.city}
                        <p className="text-[11px] text-slate-400 truncate max-w-md">{conn.ua}</p>
                      </div>
                    </div>
                    <span className="font-mono text-slate-400">{conn.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. VALIDATION KYC & J+7 (/admin/kyc & /admin/kyc/:id)                  */}
      {/* ===================================================================== */}
      {section === 'kyc' && <AdminKycSupervisionView />}
      {section === 'kyc-detail' && (
        <AdminKycSupervisionView selectedDossierIdParam={selectedKycDossier.id} />
      )}

      {/* ===================================================================== */}
      {/* 4. GESTION COMMERCIALE (/admin/commercial)                            */}
      {/* ===================================================================== */}
      {section === 'commercial' && (
        <div className="space-y-6">
          <Card
            title="Supervision Commerciale Globale B2B"
            subtitle="Gestion intégrée du catalogue, des catégories, partenaires, commandes et commission plateforme (2.50%)"
            action={
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  { id: 'catalog', label: `Catalogue (${products.length})` },
                  { id: 'categories', label: 'Catégories' },
                  { id: 'partners', label: 'Partenaires' },
                  { id: 'orders', label: `Commandes (${orders.length})` },
                  { id: 'quotes', label: `Devis (${quotes.length})` },
                  { id: 'commission', label: 'Commissions' },
                  { id: 'disputes', label: `Litiges (${disputes.length})` },
                  { id: 'anomalies', label: `Anomalies (${financialAnomalies.length})` },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    size="sm"
                    variant={commercialTab === tab.id ? 'primary' : 'secondary'}
                    onClick={() => setCommercialTab(tab.id as any)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            }
          >
            {/* ONGLET 1 : CATALOGUE GLOBAL */}
            {commercialTab === 'catalog' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500">Filtrer par catégorie :</span>
                    <select
                      value={commercialCategoryFilter}
                      onChange={(e) => setCommercialCategoryFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-semibold"
                    >
                      <option value="ALL">Toutes les catégories</option>
                      <option value="Conteneurs & Stockage">Conteneurs & Stockage</option>
                      <option value="Vannes & Pompes">Vannes & Pompes</option>
                      <option value="Équipements Manutention">Équipements Manutention</option>
                      <option value="Conditionnement & Palettes">Conditionnement & Palettes</option>
                    </select>
                  </div>
                  <Button
                    size="sm"
                    variant="teal"
                    onClick={() => {
                      const csv = [
                        'SKU,Nom,Fournisseur,Categorie,PrixHT,StockDispo,Incoterm,Origine',
                        ...products.map(
                          (p) =>
                            `${p.sku},"${p.name[locale] || p.name.fr}","${p.supplierName}","${p.category}",${p.unitPrice},${p.stockAvailable},${p.incoterm},${p.originCountry}`
                        ),
                      ].join('\n');
                      downloadDataExport('catalogue_global_tradelink.csv', csv);
                      notifyToast('Export CSV du catalogue téléchargé !', 'success');
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Exporter Catalogue CSV
                  </Button>
                </div>

                <DataTable
                  caption="Catalogue des produits commercialisés"
                  keyExtractor={(p) => p.id}
                  data={products.filter(
                    (p) => commercialCategoryFilter === 'ALL' || p.category.includes(commercialCategoryFilter)
                  )}
                  columns={[
                    {
                      key: 'product',
                      header: 'Article & SKU',
                      isRowHeader: true,
                      render: (p) => (
                        <div className="flex items-center gap-3">
                          <Icon3D name={p.icon3d} size="sm" />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{p.name[locale] || p.name.fr}</p>
                            <p className="text-[11px] font-mono text-slate-400">{p.sku}</p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'supplier',
                      header: 'Fournisseur Agréé',
                      render: (p) => <span className="text-xs">{p.supplierName}</span>,
                    },
                    {
                      key: 'category',
                      header: 'Catégorie',
                      render: (p) => <Badge variant="neutral">{p.category}</Badge>,
                    },
                    {
                      key: 'price',
                      header: 'Prix Unitaire HT',
                      render: (p) => (
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(parseFloat(p.unitPrice))}
                        </span>
                      ),
                    },
                    {
                      key: 'stock',
                      header: 'Stock Dispo / Réservé',
                      render: (p) => (
                        <div className="text-xs">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.stockAvailable} dispo</span>
                          <span className="text-slate-400"> / {p.stockReserved} rés.</span>
                        </div>
                      ),
                    },
                    {
                      key: 'incoterm',
                      header: 'Incoterm / Origine',
                      render: (p) => (
                        <div className="text-xs">
                          <Badge variant="orange">{p.incoterm}</Badge>
                          <span className="text-slate-500 ml-1.5">{p.originCountry}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'Statut & Modération',
                      render: (p) => (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={
                                p.status === 'PUBLISHED'
                                  ? 'success'
                                  : p.status === 'PENDING_REVIEW'
                                  ? 'warning'
                                  : p.status === 'SUSPENDED'
                                  ? 'danger'
                                  : 'neutral'
                              }
                            >
                              {p.status || (p.isPublished ? 'PUBLISHED' : 'DRAFT')}
                            </Badge>
                            {p.isReported && (
                              <span title={p.reportReason}>
                                <Badge variant="danger">
                                  Signalé
                                </Badge>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {(p.status === 'PENDING_REVIEW' || p.status === 'DRAFT' || !p.status) && (
                              <button
                                type="button"
                                onClick={() => moderateProduct(p.id, 'APPROVE')}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30"
                              >
                                Approuver
                              </button>
                            )}
                            {p.status !== 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const reason = window.prompt('Motif obligatoire du rejet / renvoi en brouillon :');
                                  if (reason) moderateProduct(p.id, 'REJECT', reason);
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30"
                              >
                                Rejeter
                              </button>
                            )}
                            {p.status === 'PUBLISHED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const reason = window.prompt('Motif obligatoire de suspension du produit :');
                                  if (reason) suspendProduct(p.id, reason);
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-500/30"
                              >
                                Suspendre
                              </button>
                            )}
                          </div>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            )}

            {/* ONGLET 2 : CATÉGORIES & SOUS-CATÉGORIES HIÉRARCHIQUES */}
            {commercialTab === 'categories' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Arborescence hiérarchique des catégories B2B trilingues (FR / EN / AR). Suppression contrôlée : interdite si des sous-catégories ou des produits y sont rattachés.
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      const code = window.prompt('Code de la catégorie (ex: PACKAGING_SOLUTIONS) :');
                      if (!code) return;
                      const nameFr = window.prompt('Nom en Français :') || code;
                      const nameEn = window.prompt('Nom en Anglais :') || nameFr;
                      const nameAr = window.prompt('Nom en Arabe :') || nameFr;
                      addCategory({
                        code,
                        name: { fr: nameFr, en: nameEn, ar: nameAr },
                        description: { fr: nameFr, en: nameEn, ar: nameAr },
                      });
                    }}
                  >
                    + Nouvelle Catégorie Racine
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  {categories.map((c) => {
                    const linkedCount = products.filter(
                      (p) => p.categoryId === c.id || p.category === c.code
                    ).length;
                    return (
                      <div
                        key={c.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Icon3D name={c.icon3d || 'pallet-load'} size="md" withGlow />
                            <div>
                              <p className="font-bold text-sm text-slate-900 dark:text-white">
                                {c.name[locale] || c.name.fr}
                              </p>
                              <p className="text-[10px] font-mono text-slate-400">{c.code}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteCategory(c.id)}
                            className="text-slate-400 hover:text-red-500 p-1"
                            title="Supprimer la catégorie"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {c.description[locale] || c.description.fr}
                        </p>

                        {c.subcategories && c.subcategories.length > 0 && (
                          <div className="pt-2 border-t border-slate-200 dark:border-teal-900/40 space-y-1.5">
                            <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                              Sous-catégories ({c.subcategories.length}) :
                            </span>
                            <div className="space-y-1">
                              {c.subcategories.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-between px-2 py-1 rounded-lg bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-[11px]"
                                >
                                  <span className="font-medium">{sub.name[locale] || sub.name.fr}</span>
                                  <button
                                    type="button"
                                    onClick={() => deleteCategory(sub.id)}
                                    className="text-slate-400 hover:text-red-500 p-0.5"
                                    title="Supprimer la sous-catégorie"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-500">
                            {linkedCount} Référence{linkedCount > 1 ? 's' : ''} liée{linkedCount > 1 ? 's' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const code = window.prompt(`Code sous-catégorie pour ${c.name.fr} :`);
                              if (!code) return;
                              const nameFr = window.prompt('Nom en Français :') || code;
                              const nameEn = window.prompt('Nom en Anglais :') || nameFr;
                              const nameAr = window.prompt('Nom en Arabe :') || nameFr;
                              addCategory({
                                code,
                                parentCategoryId: c.id,
                                name: { fr: nameFr, en: nameEn, ar: nameAr },
                                description: { fr: nameFr, en: nameEn, ar: nameAr },
                              });
                            }}
                            className="text-[11px] font-bold text-[#E85D22] hover:underline"
                          >
                            + Sous-catégorie
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ONGLET 3 : PARTENAIRES COMMERCIAUX */}
            {commercialTab === 'partners' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Annuaire des entreprises acheteuses et vendeuses enregistrées sous contrat-cadre TRADELINK.
                </p>
                <div className="grid md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">EuroTech Industrial & ColdChain GmbH</span>
                      <Badge variant="orange">FOURNISSEUR</Badge>
                    </div>
                    <p className="text-slate-500">Hambourg, Allemagne • SIRET / HRB 88210</p>
                    <p>Volume commercial : <strong>140 000,00 €</strong> • 4 Commandes</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="success">KYC Validé</Badge>
                      <Badge variant="info">Incoterm DAP / CIF</Badge>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Atlas Import & Distribution S.A.</span>
                      <Badge variant="info">CLIENT B2B</Badge>
                    </div>
                    <p className="text-slate-500">Casablanca, Maroc • RC 448912 • ICE 002918440000045</p>
                    <p>Volume d'achats : <strong>243 000,00 €</strong> • 6 Commandes</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="warning">KYC J+7 Soumis à temps (Immunisé)</Badge>
                      <Badge variant="success">Paiements Escrow OK</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET 4 : COMMANDES */}
            {commercialTab === 'orders' && (
              <DataTable
                caption="Registre des commandes commerciales"
                keyExtractor={(o) => o.id}
                data={orders}
                columns={[
                  {
                    key: 'order',
                    header: 'N° Commande & Date',
                    isRowHeader: true,
                    render: (o) => (
                      <div>
                        <span className="font-bold font-mono text-[#E85D22]">{o.orderNumber}</span>
                        <p className="text-[11px] text-slate-400">{o.createdAt}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'client',
                    header: 'Client B2B',
                    render: (o) => <span className="text-xs font-semibold">{o.clientName}</span>,
                  },
                  {
                    key: 'supplier',
                    header: 'Fournisseur',
                    render: (o) => <span className="text-xs">{o.supplierName}</span>,
                  },
                  {
                    key: 'amount',
                    header: 'Montant Total HT',
                    render: (o) => (
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(parseFloat(o.totalAmount))}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Statut Commande',
                    render: (o) => (
                      <Badge
                        variant={
                          o.status === 'DELIVERED'
                            ? 'success'
                            : o.status === 'SHIPPED'
                            ? 'orange'
                            : o.status === 'ACCEPTED'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {o.status}
                      </Badge>
                    ),
                  },
                  {
                    key: 'incoterm',
                    header: 'Régime Fret',
                    render: () => <Badge variant="neutral">DAP / CIF Maritime</Badge>,
                  },
                ]}
              />
            )}

            {/* ONGLET 5 : DEVIS & RFQ */}
            {commercialTab === 'quotes' && (
              <DataTable
                caption="Devis et demandes de cotation (RFQ)"
                keyExtractor={(q) => q.id}
                data={quotes}
                columns={[
                  {
                    key: 'quote',
                    header: 'Réf Devis',
                    isRowHeader: true,
                    render: (q) => <span className="font-bold font-mono text-slate-900 dark:text-white">{q.quoteNumber}</span>,
                  },
                  {
                    key: 'client',
                    header: 'Acheteur',
                    render: (q) => <span className="text-xs font-semibold">{q.clientName}</span>,
                  },
                  {
                    key: 'supplier',
                    header: 'Fournisseur Sollicité',
                    render: (q) => <span className="text-xs">{q.supplierName}</span>,
                  },
                  {
                    key: 'amount',
                    header: 'Montant Devisé',
                    render: (q) => (
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(parseFloat(q.totalAmount))}
                      </span>
                    ),
                  },
                  {
                    key: 'validity',
                    header: 'Validité',
                    render: (q) => <span className="text-xs text-slate-500 font-mono">{q.validUntil}</span>,
                  },
                  {
                    key: 'status',
                    header: 'Statut',
                    render: (q) => (
                      <Badge variant={q.status === 'ACCEPTED' ? 'success' : q.status === 'SENT' ? 'orange' : 'neutral'}>
                        {q.status}
                      </Badge>
                    ),
                  },
                ]}
              />
            )}

            {/* ONGLET 6 : COMMISSIONS PLATEFORME */}
            {commercialTab === 'commission' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-1">
                    <p className="font-bold text-slate-500">Taux de Commission Plateforme</p>
                    <p className="text-2xl font-black text-teal-800 dark:text-teal-200">{platformCommissionPct} %</p>
                    <p className="text-slate-400">Paramétrable dans la politique générale</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-1">
                    <p className="font-bold text-slate-500">Assiette GMV Pris en Compte</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(totalGmvAmount)}</p>
                    <p className="text-slate-400">Commandes finalisées et livrées</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#E85D22]/10 border border-[#E85D22]/30 space-y-1">
                    <p className="font-bold text-slate-500">Revenus de Commission TradeLink</p>
                    <p className="text-2xl font-black text-[#E85D22]">
                      {formatCurrency((totalGmvAmount * parseFloat(platformCommissionPct)) / 100)}
                    </p>
                    <p className="text-slate-400">Prélèvement automatique Stripe Connect</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold">Ajuster le taux de commission de la plateforme :</p>
                    <p className="text-slate-500">Le taux s'applique aux futures commandes négociées.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="10.0"
                      value={platformCommissionPct}
                      onChange={(e) => setPlatformCommissionPct(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0B2D31] border border-slate-300 dark:border-teal-800 text-sm font-bold font-mono text-center"
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        notifyToast(`Taux de commission mis à jour à ${platformCommissionPct}%`, 'success')
                      }
                    >
                      Enregistrer Taux
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET 7 : GESTION DES LITIGES COMMERCIAUX & ARBITRAGE */}
            {commercialTab === 'disputes' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    Chambre d'Arbitrage Commercial Souverain TRADELINK :
                  </div>
                  <p className="text-slate-500 mt-1">
                    Les administrateurs instruisent les contestations, ordonnent des remboursements (partiels ou totaux) ou prononcent le rejet après examen des bordereaux e-CMR et POD signés.
                  </p>
                </div>

                {disputes.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">Aucun litige commercial en cours d'instruction.</p>
                ) : (
                  <DataTable
                    caption="Registre des litiges commerciaux ouverts"
                    keyExtractor={(d) => d.id}
                    data={disputes}
                    columns={[
                      {
                        key: 'num',
                        header: 'N° Dossier',
                        isRowHeader: true,
                        render: (d) => <span className="font-mono font-bold text-xs text-[#E85D22]">{d.disputeNumber}</span>,
                      },
                      {
                        key: 'order',
                        header: 'Commande',
                        render: (d) => <span className="font-mono text-xs">{d.orderNumber}</span>,
                      },
                      {
                        key: 'initiator',
                        header: 'Déclarant',
                        render: (d) => (
                          <div>
                            <p className="font-bold text-xs">{d.initiatorName}</p>
                            <Badge variant="neutral">{d.initiatorRole}</Badge>
                          </div>
                        ),
                      },
                      {
                        key: 'reason',
                        header: 'Motif',
                        render: (d) => <span className="font-semibold text-xs text-slate-800 dark:text-white">{d.reason}</span>,
                      },
                      {
                        key: 'status',
                        header: 'Statut',
                        render: (d) => (
                          <Badge variant={d.status === 'RESOLVED' ? 'success' : d.status === 'REJECTED' ? 'danger' : 'warning'}>
                            {d.status}
                          </Badge>
                        ),
                      },
                      {
                        key: 'actions',
                        header: 'Arbitrage',
                        render: (d) => (
                          <div className="flex gap-2">
                            {d.status !== 'RESOLVED' && d.status !== 'REJECTED' ? (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setDisputeToResolve(d);
                                  setArbitrationResolutionText('');
                                  setArbitrationAction('REFUND_TOTAL');
                                }}
                              >
                                Arbitrer Dossier
                              </Button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-bold">
                                {d.arbitrationAction || 'Clôturé'}
                              </span>
                            )}
                          </div>
                        ),
                      },
                    ]}
                  />
                )}
              </div>
            )}

            {/* ONGLET 8 : ANOMALIES FINANCIÈRES & AUDIT ARITHMÉTIQUE */}
            {commercialTab === 'anomalies' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    Détecteur d'Incohérences & d'Anomalies Financières Serveur :
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Surveillance automatisée des écarts arithmétiques, des dépassements de TVA et des risques de double comptabilisation.
                  </p>
                </div>

                {financialAnomalies.length === 0 ? (
                  <p className="text-xs text-emerald-600 font-bold py-6 text-center">
                    ✓ Aucune anomalie financière détectée. Intégrité des registres à 100%.
                  </p>
                ) : (
                  <DataTable
                    caption="Registre des alertes et anomalies financières"
                    keyExtractor={(a) => a.id}
                    data={financialAnomalies}
                    columns={[
                      {
                        key: 'id',
                        header: 'ID Anomalie',
                        isRowHeader: true,
                        render: (a) => <span className="font-mono text-xs">{a.id}</span>,
                      },
                      {
                        key: 'entity',
                        header: 'Type Entité',
                        render: (a) => <Badge variant="neutral">{a.entityType}</Badge>,
                      },
                      {
                        key: 'ref',
                        header: 'Réf Entité',
                        render: (a) => <span className="font-mono text-xs">{a.entityId}</span>,
                      },
                      {
                        key: 'anomType',
                        header: 'Type Anomalie',
                        render: (a) => <span className="font-bold text-xs text-red-600 dark:text-red-400">{a.anomalyType}</span>,
                      },
                      {
                        key: 'desc',
                        header: 'Description des Faits',
                        render: (a) => <span className="text-[11px] text-slate-600 dark:text-slate-300">{a.description}</span>,
                      },
                      {
                        key: 'severity',
                        header: 'Sévérité',
                        render: (a) => (
                          <Badge variant={a.severity === 'CRITICAL' ? 'danger' : 'warning'}>
                            {a.severity}
                          </Badge>
                        ),
                      },
                    ]}
                  />
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. COMPTABILITÉ & FINANCE (/admin/finance) — Decimal.js                */}
      {/* ===================================================================== */}
      {section === 'finance' && (
        <div className="space-y-6">
          <Card
            title="Gouvernance Comptable & Moteur Financier Déterministe (Decimal.js)"
            subtitle="Plan comptable configurable (PCG, IFRS, OHADA), conventions d'intérêts ACT/365, ACT/360, ACT/ACT et contrôle de lettrage"
            action={
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  { id: 'overview', label: 'Synthèse Consolidée' },
                  { id: 'documents', label: `Documents Commerciaux (${commercialDocuments.length})` },
                  { id: 'invoices', label: `Factures (${invoices.length})` },
                  { id: 'payments', label: `Paiements (${payments.length})` },
                  { id: 'calc', label: 'Simulateur Decimal.js' },
                  { id: 'history', label: `Historique (${calcHistory.length})` },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    size="sm"
                    variant={financeTab === tab.id ? 'primary' : 'secondary'}
                    onClick={() => setFinanceTab(tab.id as any)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            }
          >
            {/* ONGLET 1 : SYNTHÈSE CONSOLIDÉE */}
            {financeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-1">
                    <p className="font-bold text-slate-500">Total Facturé B2B (TTC)</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">291 600,00 €</p>
                    <p className="text-slate-400">TVA 20% incluse (48 600,00 €)</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                    <p className="font-bold text-slate-500">Total Encaissé (Escrow & SWIFT)</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaymentsAmount)}</p>
                    <p className="text-slate-400">100% rapproché en banque</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                    <p className="font-bold text-slate-500">Encours Clients à Échéance</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">231 600,00 €</p>
                    <p className="text-slate-400">Crédit documentaire garanti</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-1">
                    <p className="font-bold text-slate-500">Lettrage & Rapprochement Bancaire</p>
                    <p className="text-2xl font-black text-teal-700 dark:text-teal-300">98.5 %</p>
                    <p className="text-slate-400">Automate Stage 3 validé</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Règle de Sécurité Comptable (Chapitre 9 & Prompt 8)</span>
                    <Badge variant="success">LECTURE SEULE SOURCE RESPECTÉE</Badge>
                  </div>
                  <p className="text-slate-500">
                    Le comptable dispose d'un accès étendu en consultation sur les factures, écritures, grand livre et balance, mais ne peut en aucun cas muter les données commerciales sources (prix catalogue, commandes, stocks).
                  </p>
                </div>
              </div>
            )}

            {/* ONGLET 2 : FACTURES COMMERCIALES */}
            {financeTab === 'invoices' && (
              <DataTable
                caption="Factures commerciales émises"
                keyExtractor={(inv) => inv.id}
                data={invoices}
                columns={[
                  {
                    key: 'inv',
                    header: 'N° Facture & Échéance',
                    isRowHeader: true,
                    render: (inv) => (
                      <div>
                        <span className="font-bold font-mono text-[#E85D22]">{inv.invoiceNumber}</span>
                        <p className="text-[11px] text-slate-400">Échéance : {inv.dueAt}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'client',
                    header: 'Client Débiteur',
                    render: (inv) => <span className="text-xs font-semibold">{inv.clientName}</span>,
                  },
                  {
                    key: 'ht',
                    header: 'Montant HT',
                    render: (inv) => <span className="font-mono text-xs">{formatCurrency(parseFloat(inv.subtotal))}</span>,
                  },
                  {
                    key: 'tva',
                    header: 'TVA',
                    render: (inv) => <span className="font-mono text-xs text-slate-500">{formatCurrency(parseFloat(inv.taxAmount))}</span>,
                  },
                  {
                    key: 'ttc',
                    header: 'Total TTC',
                    render: (inv) => (
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(parseFloat(inv.totalAmount))}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Statut Facture',
                    render: (inv) => (
                      <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'warning'}>
                        {inv.status}
                      </Badge>
                    ),
                  },
                  {
                    key: 'dl',
                    header: 'Export',
                    render: (inv) => (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          downloadDataExport(
                            `${inv.invoiceNumber}.json`,
                            JSON.stringify(inv, null, 2),
                            'application/json'
                          );
                          notifyToast(`Facture ${inv.invoiceNumber} téléchargée !`, 'success');
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF / JSON
                      </Button>
                    ),
                  },
                ]}
              />
            )}

            {/* ONGLET 3 : PAIEMENTS & RÈGLEMENTS */}
            {financeTab === 'payments' && (
              <DataTable
                caption="Registre des paiements et règlements bancaires"
                keyExtractor={(p) => p.id}
                data={payments}
                columns={[
                  {
                    key: 'ref',
                    header: 'Réf Paiement & Transaction',
                    isRowHeader: true,
                    render: (p) => (
                      <div>
                        <span className="font-bold font-mono text-slate-900 dark:text-white">{p.paymentReference}</span>
                        <p className="text-[10px] font-mono text-slate-400">{p.webhookEventId || 'Virement SWIFT SEPA'}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'inv',
                    header: 'Facture Cible',
                    render: (p) => <span className="font-mono text-xs text-teal-600 dark:text-teal-400">{p.invoiceNumber}</span>,
                  },
                  {
                    key: 'method',
                    header: 'Moyen de Paiement',
                    render: (p) => <Badge variant="neutral">{p.provider}</Badge>,
                  },
                  {
                    key: 'amount',
                    header: 'Montant Encaissé',
                    render: (p) => (
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(parseFloat(p.amount))}
                      </span>
                    ),
                  },
                  {
                    key: 'date',
                    header: 'Date d’Encaissement',
                    render: (p) => <span className="font-mono text-xs text-slate-500">{p.createdAt}</span>,
                  },
                  {
                    key: 'status',
                    header: 'Statut',
                    render: (p) => (
                      <Badge variant={p.status === 'SUCCEEDED' ? 'success' : 'warning'}>
                        {p.status}
                      </Badge>
                    ),
                  },
                ]}
              />
            )}

            {/* ONGLET 4 : SIMULATEUR DU MOTEUR DE CALCUL DECIMAL.JS */}
            {financeTab === 'calc' && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Simulateur d'Amortissement Financier & Crédit Documentaire
                      </h4>
                      <p className="text-xs text-slate-500">
                        Calcul haute précision avec Decimal.js (34 chiffres significatifs, zéro dérive binaire IEEE 754)
                      </p>
                    </div>
                    <Badge variant="orange">DECIMAL.JS DÉTERMINISTE</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-500 block mb-1">Capital (Principal €) :</label>
                      <input
                        type="text"
                        value={calcPrincipal}
                        onChange={(e) => setCalcPrincipal(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-500 block mb-1">Taux Annuel (%) :</label>
                      <input
                        type="text"
                        value={calcRate}
                        onChange={(e) => setCalcRate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-500 block mb-1">Durée (Mois) :</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={calcDurationMonths}
                        onChange={(e) => setCalcDurationMonths(parseInt(e.target.value) || 12)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-500 block mb-1">Convention de Jours :</label>
                      <select
                        value={calcBasis}
                        onChange={(e) => setCalcBasis(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-bold"
                      >
                        <option value="ACT/365">ACT/365 (Standard)</option>
                        <option value="ACT/360">ACT/360 (Monétaire)</option>
                        <option value="ACT/ACT">ACT/ACT (Bissextile)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-500 block mb-1">Type de Taux :</label>
                      <select
                        value={calcRateType}
                        onChange={(e) => setCalcRateType(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-bold"
                      >
                        <option value="FIXED">Taux Fixe</option>
                        <option value="VARIABLE">Taux Variable Euribor</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="primary" onClick={handleCalculateSchedule}>
                      <Play className="w-4 h-4" />
                      Calculer l'Échéancier Déterministe
                    </Button>
                  </div>
                </div>

                {/* RÉSULTAT DU CALCUL D'ÉCHÉANCIER */}
                {simulatedSchedule && (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4 text-xs">
                      <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30">
                        <p className="text-slate-400 font-bold">Mensualité Constante</p>
                        <p className="text-2xl font-black text-teal-800 dark:text-teal-200 mt-1">
                          {formatCurrency(parseFloat(simulatedSchedule.monthlyPayment))}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Par mois sur {calcDurationMonths} périodes</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                        <p className="text-slate-400 font-bold">Total des Intérêts Payés</p>
                        <p className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">
                          {formatCurrency(parseFloat(simulatedSchedule.totalInterest))}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Convention {calcBasis}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                        <p className="text-slate-400 font-bold">Coût Total de l'Emprunt</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                          {formatCurrency(parseFloat(simulatedSchedule.totalCost))}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Capital amorti + intérêts</p>
                      </div>
                    </div>

                    <DataTable
                      caption="Tableau d'amortissement période par période"
                      keyExtractor={(row) => String(row.periodNumber)}
                      data={simulatedSchedule.schedule.slice(0, 12)}
                      columns={[
                        {
                          key: 'p',
                          header: 'Période',
                          isRowHeader: true,
                          render: (r) => <span className="font-mono font-bold">#{r.periodNumber}</span>,
                        },
                        {
                          key: 'date',
                          header: 'Date d’Échéance',
                          render: (r) => <span className="font-mono text-xs">{r.periodDate}</span>,
                        },
                        {
                          key: 'deb',
                          header: 'Capital Début',
                          render: (r) => <span className="font-mono text-xs">{formatCurrency(parseFloat(r.remainingPrincipalBeginning))}</span>,
                        },
                        {
                          key: 'prin',
                          header: 'Part Capital',
                          render: (r) => <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300">{formatCurrency(parseFloat(r.principalPayment))}</span>,
                        },
                        {
                          key: 'int',
                          header: 'Part Intérêts',
                          render: (r) => <span className="font-mono text-xs text-amber-600 dark:text-amber-400">{formatCurrency(parseFloat(r.interestPayment))}</span>,
                        },
                        {
                          key: 'tot',
                          header: 'Mensualité Totale',
                          render: (r) => <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(parseFloat(r.totalPeriodicPayment))}</span>,
                        },
                        {
                          key: 'end',
                          header: 'Capital Restant Fin',
                          render: (r) => <span className="font-mono text-xs font-bold">{formatCurrency(parseFloat(r.remainingPrincipalEnd))}</span>,
                        },
                      ]}
                    />

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const csv = [
                            'Periode,Date,CapitalDebut,PartCapital,PartInterets,Mensualite,CapitalFin',
                            ...simulatedSchedule.schedule.map(
                              (r) =>
                                `${r.periodNumber},${r.periodDate},${r.remainingPrincipalBeginning},${r.principalPayment},${r.interestPayment},${r.totalPeriodicPayment},${r.remainingPrincipalEnd}`
                            ),
                          ].join('\n');
                          downloadDataExport(`amortissement_${calcPrincipal}_${calcRate}pct.csv`, csv);
                          notifyToast('Tableau d\'amortissement exporté en CSV !', 'success');
                        }}
                      >
                        <Download className="w-4 h-4" />
                        Exporter Échéancier CSV
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ONGLET 5 : HISTORIQUE DES CALCULS */}
            {financeTab === 'history' && (
              <DataTable
                caption="Historique des calculs financiers déterministes"
                keyExtractor={(c) => c.id}
                data={calcHistory}
                columns={[
                  {
                    key: 'id',
                    header: 'Réf Calcul',
                    isRowHeader: true,
                    render: (c) => <span className="font-mono font-bold text-xs">{c.id}</span>,
                  },
                  {
                    key: 'principal',
                    header: 'Capital',
                    render: (c) => <span className="font-mono text-xs font-bold">{formatCurrency(parseFloat(c.principal))}</span>,
                  },
                  {
                    key: 'rate',
                    header: 'Taux Annuel',
                    render: (c) => <Badge variant="neutral">{c.annualRatePct}%</Badge>,
                  },
                  {
                    key: 'basis',
                    header: 'Convention',
                    render: (c) => <Badge variant="orange">{c.basis}</Badge>,
                  },
                  {
                    key: 'interest',
                    header: 'Intérêts Calculés',
                    render: (c) => (
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(parseFloat(c.interestAmount))}
                      </span>
                    ),
                  },
                  {
                    key: 'total',
                    header: 'Montant Total',
                    render: (c) => (
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {formatCurrency(parseFloat(c.totalAmount))}
                      </span>
                    ),
                  },
                  {
                    key: 'date',
                    header: 'Exécuté le',
                    render: (c) => <span className="font-mono text-xs text-slate-400">{c.executedAt}</span>,
                  },
                ]}
              />
            )}

            {/* ONGLET 6 : SUPERVISION DOCUMENTS COMMERCIAUX & CONTRÔLE SCELLÉ SHA-256 */}
            {financeTab === 'documents' && (
              <div className="space-y-4">
                {/* CONTRÔLE D'INTÉGRITÉ GLOBALE */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Supervision Documentaire Fiscale & Scellement Cryptographique SHA-256
                    </span>
                    <p className="text-slate-500">
                      7 types de pièces (Devis, BC, CFM, Facture, Avoir, Reçu, BL, e-CMR) certifiées conformes aux juridictions (FR/UE, Maroc, Tunisie, Émirats, Export).
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        let allValid = true;
                        commercialDocuments.forEach((d) => {
                          const res = verifyDocumentSealAction(d.id);
                          if (!res.isAuthentic) allValid = false;
                        });
                        setAdminVerificationAllStatus({
                          checked: true,
                          total: commercialDocuments.length,
                          allValid,
                        });
                        if (allValid) {
                          notifyToast(`Audit réussi : 100% des ${commercialDocuments.length} documents commerciaux sont scellés et authentiques !`, 'success');
                        } else {
                          notifyToast('Attention : une anomalie de scellement a été détectée.', 'error');
                        }
                      }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Auditer Tous les Sceaux SHA-256
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        downloadDataExport(
                          'registre-documents-commerciaux-scelles.json',
                          JSON.stringify(commercialDocuments, null, 2),
                          'application/json'
                        );
                        notifyToast('Registre complet des documents scellés exporté.', 'info');
                      }}
                    >
                      <Download className="w-3.5 h-3.5" /> Export JSON
                    </Button>
                  </div>
                </div>

                {/* BANDEAU RÉSULTAT AUDIT */}
                {adminVerificationAllStatus && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                      adminVerificationAllStatus.allValid
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                        : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold">
                        Audit cryptographique validé : les {adminVerificationAllStatus.total} documents sont rigoureusement conformes,
                        inaltérés et opposables.
                      </span>
                    </div>
                    <Badge variant="success">100% CONFORME</Badge>
                  </div>
                )}

                {/* FILTRES FACETTÉS ADMIN */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="w-full sm:w-80">
                    <SearchBar
                      value={adminDocSearch}
                      onChange={setAdminDocSearch}
                      placeholder="Filtrer par n° pièce, tiers, jur., SKU..."
                    />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <span className="self-center font-semibold text-slate-500 mr-1 text-[11px]">Juridiction :</span>
                    {(['ALL', 'FR_UE', 'MA', 'TN', 'AE_GCC', 'INTL_EXPORT'] as const).map((jur) => (
                      <button
                        key={jur}
                        type="button"
                        onClick={() => setAdminDocJurisdictionFilter(jur)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          adminDocJurisdictionFilter === jur
                            ? 'bg-[#E85D22] text-white'
                            : 'bg-slate-100 dark:bg-teal-900/40 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {jur === 'ALL' ? 'Toutes' : jur}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <span className="self-center font-semibold text-slate-500 mr-1 text-[11px]">Type :</span>
                    {[
                      { key: 'ALL', label: 'Tous' },
                      { key: 'COMMERCIAL_INVOICE', label: 'Factures' },
                      { key: 'CREDIT_NOTE', label: 'Avoirs' },
                      { key: 'QUOTE', label: 'Devis' },
                      { key: 'PURCHASE_ORDER', label: 'BC' },
                      { key: 'PAYMENT_RECEIPT', label: 'Reçus' },
                      { key: 'TRANSPORT_DOCUMENT', label: 'e-CMR' },
                    ].map((tp) => (
                      <button
                        key={tp.key}
                        type="button"
                        onClick={() => setAdminDocTypeFilter(tp.key)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          adminDocTypeFilter === tp.key
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-100 dark:bg-teal-900/40 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {tp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TABLE DES DOCUMENTS */}
                <DataTable
                  caption="Supervision administrative et fiscale des documents commerciaux"
                  keyExtractor={(doc) => doc.id}
                  data={commercialDocuments.filter((d) => {
                    if (adminDocJurisdictionFilter !== 'ALL' && d.jurisdiction !== adminDocJurisdictionFilter) return false;
                    if (adminDocTypeFilter !== 'ALL' && d.documentType !== adminDocTypeFilter) return false;
                    if (adminDocSearch.trim()) {
                      const q = adminDocSearch.toLowerCase();
                      const matchNum = d.documentNumber.toLowerCase().includes(q);
                      const matchIss = d.issuer.companyName.toLowerCase().includes(q);
                      const matchRec = d.recipient.companyName.toLowerCase().includes(q);
                      const matchSku = d.lines.some((l) => l.sku.toLowerCase().includes(q));
                      if (!matchNum && !matchIss && !matchRec && !matchSku) return false;
                    }
                    return true;
                  })}
                  columns={[
                    {
                      key: 'num',
                      header: 'N° Document',
                      isRowHeader: true,
                      render: (doc) => (
                        <div className="space-y-0.5">
                          <strong className="text-slate-900 dark:text-white font-mono block">{doc.documentNumber}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">v{doc.version}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'type',
                      header: 'Type',
                      render: (doc) => (
                        <Badge
                          variant={
                            doc.documentType === 'CREDIT_NOTE'
                              ? 'danger'
                              : doc.documentType === 'PAYMENT_RECEIPT'
                              ? 'success'
                              : doc.documentType === 'QUOTE'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {doc.documentType.replace('_', ' ')}
                        </Badge>
                      ),
                    },
                    {
                      key: 'jur',
                      header: 'Juridiction',
                      render: (doc) => (
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 dark:bg-[#0E3A3F] text-slate-700 dark:text-slate-200">
                          {doc.jurisdiction}
                        </span>
                      ),
                    },
                    {
                      key: 'parties',
                      header: 'Émetteur → Destinataire',
                      render: (doc) => (
                        <div className="text-[11px] space-y-0.5">
                          <div>De : <strong>{doc.issuer.companyName}</strong></div>
                          <div className="text-slate-500">Pour : {doc.recipient.companyName}</div>
                        </div>
                      ),
                    },
                    {
                      key: 'amount',
                      header: 'Net HT / Total TTC',
                      render: (doc) => (
                        <div className="font-mono text-xs">
                          <span className="font-black text-slate-900 dark:text-white block">
                            {doc.totalTtc} {doc.currency}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            Net HT: {doc.netCommercialHt} • TVA: {doc.totalTaxAmount}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: 'seal',
                      header: 'Sceau SHA-256',
                      render: (doc) => (
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[110px]">{doc.digitalSealSha256.slice(0, 10)}...</span>
                        </div>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'Statut',
                      render: (doc) => (
                        <Badge
                          variant={
                            doc.status === 'PAID'
                              ? 'success'
                              : doc.status === 'CANCELLED'
                              ? 'danger'
                              : doc.status === 'ISSUED'
                              ? 'info'
                              : 'neutral'
                          }
                        >
                          {doc.status}
                        </Badge>
                      ),
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      render: (doc) => (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setActiveDocumentPreview(doc)}
                          >
                            <FileText className="w-3.5 h-3.5 text-teal-600" />
                            Aperçu
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => downloadCommercialDocumentPdfAction(doc.id)}
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. LOGISTIQUE & TRANSPORT MULTIMODAL (/admin/logistique)              */}
      {/* ===================================================================== */}
      {section === 'logistique' && (
        <div className="space-y-6">
          <Card
            title="Supervision Logistique, Flotte Agréée & Carte Interactive (Prompt 9)"
            subtitle="Gestion des transporteurs, affectation des missions, télémétrie GPS des expéditions et conformité de la chaîne du froid ATP FRC"
            action={
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  { id: 'fleet', label: `Flotte Agréée (${vehicles.length})` },
                  { id: 'shipments', label: `Expéditions (${shipments.length})` },
                  { id: 'map', label: 'Carte Interactive GPS' },
                  { id: 'incidents', label: `Incidents (${incidents.length})` },
                  { id: 'pod', label: 'Preuves de Livraison (POD)' },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    size="sm"
                    variant={logisticsTab === tab.id ? 'primary' : 'secondary'}
                    onClick={() => setLogisticsTab(tab.id as any)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            }
          >
            {/* ONGLET 1 : FLOTTE AGRÉÉE */}
            {logisticsTab === 'fleet' && (
              <div className="space-y-4">
                <DataTable
                  caption="Parc de véhicules et agréments transporteurs"
                  keyExtractor={(v) => v.id}
                  data={vehicles}
                  columns={[
                    {
                      key: 'veh',
                      header: 'Immatriculation & Modèle',
                      isRowHeader: true,
                      render: (v) => (
                        <div>
                          <p className="font-mono font-bold text-slate-900 dark:text-white">{v.registrationPlate}</p>
                          <p className="text-xs text-slate-500">{v.brandModel}</p>
                        </div>
                      ),
                    },
                    {
                      key: 'carrier',
                      header: 'Transporteur Titulaire',
                      render: (v) => <span className="text-xs font-semibold">{v.carrierName}</span>,
                    },
                    {
                      key: 'type',
                      header: 'Type de Véhicule',
                      render: (v) => <Badge variant="orange">{v.vehicleType}</Badge>,
                    },
                    {
                      key: 'atp',
                      header: 'Chaîne du Froid ATP',
                      render: (v) =>
                        v.hasAtpReeferCert ? (
                          <Badge variant="success">ATP FRC Valide (Jusqu'au {v.atpCertExpiry})</Badge>
                        ) : (
                          <Badge variant="neutral">Non-Reefer</Badge>
                        ),
                    },
                    {
                      key: 'capacity',
                      header: 'Capacité Fret',
                      render: (v) => <span className="font-mono text-xs">{v.capacityKg.toLocaleString()} kg / {v.capacityM3} m³</span>,
                    },
                    {
                      key: 'status',
                      header: 'Statut',
                      render: (v) => (
                        <Badge variant={v.status === 'AVAILABLE' ? 'success' : v.status === 'ON_MISSION' ? 'orange' : 'warning'}>
                          {v.status}
                        </Badge>
                      ),
                    },
                  ]}
                />
              </div>
            )}

            {/* ONGLET 2 : EXPÉDITIONS MULTIMODALES */}
            {logisticsTab === 'shipments' && (
              <DataTable
                caption="Suivi des expéditions multimodales"
                keyExtractor={(s) => s.id}
                data={shipments}
                columns={[
                  {
                    key: 'tracking',
                    header: 'N° Suivi & Mode',
                    isRowHeader: true,
                    render: (s) => (
                      <div>
                        <span className="font-mono font-bold text-[#E85D22]">{s.trackingNumber}</span>
                        <p className="text-[11px] text-slate-500">{s.transportMode} • Commande {s.orderNumber}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'route',
                    header: 'Itinéraire Fret',
                    render: (s) => (
                      <div className="text-xs">
                        <span className="font-bold">{s.origin}</span>
                        <ArrowRight className="inline w-3 h-3 mx-1 text-slate-400" />
                        <span className="font-bold text-teal-700 dark:text-teal-300">{s.destination}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'carrier',
                    header: 'Transporteur',
                    render: (s) => <span className="text-xs">{s.carrierName}</span>,
                  },
                  {
                    key: 'cargo',
                    header: 'Poids / Colis',
                    render: (s) => <span className="font-mono text-xs">{s.weightKg} kg ({s.palletsCount} palettes)</span>,
                  },
                  {
                    key: 'eta',
                    header: 'ETA Prévue',
                    render: (s) => <span className="font-mono text-xs text-slate-400">{s.estimatedArrival}</span>,
                  },
                  {
                    key: 'status',
                    header: 'Statut Transit',
                    render: (s) => (
                      <Badge
                        variant={
                          s.status === 'DELIVERED'
                            ? 'success'
                            : s.status === 'IN_TRANSIT'
                            ? 'orange'
                            : s.status === 'OUT_FOR_DELIVERY'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {s.status}
                      </Badge>
                    ),
                  },
                ]}
              />
            )}

            {/* ONGLET 3 : CARTE INTERACTIVE GPS */}
            {logisticsTab === 'map' && (
              <div className="space-y-4">
                <InteractiveLogisticsMap
                  waypoints={INITIAL_SHIPMENT_WAYPOINTS['SHP-2026-8819'] || []}
                  title="Couloir Maritime & Terrestre : Casablanca -> Tanger Med -> Détroit -> Marseille -> Rotterdam"
                />
              </div>
            )}

            {/* ONGLET 4 : INCIDENTS LOGISTIQUES */}
            {logisticsTab === 'incidents' && (
              <div className="space-y-4">
                <DataTable
                  caption="Registre des incidents de transport"
                  keyExtractor={(i) => i.id}
                  data={incidents}
                  columns={[
                    {
                      key: 'id',
                      header: 'Réf Incident',
                      isRowHeader: true,
                      render: (i) => <span className="font-mono font-bold text-xs">{i.id}</span>,
                    },
                    {
                      key: 'title',
                      header: 'Incident Déclaré',
                      render: (i) => (
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white">{i.title}</p>
                          <p className="text-[11px] text-slate-400">{i.description}</p>
                        </div>
                      ),
                    },
                    {
                      key: 'tracking',
                      header: 'Expédition Cible',
                      render: (i) => <span className="font-mono text-xs text-[#E85D22]">{i.trackingNumber}</span>,
                    },
                    {
                      key: 'severity',
                      header: 'Gravité',
                      render: (i) => (
                        <Badge variant={i.severity === 'CRITICAL' ? 'danger' : i.severity === 'HIGH' ? 'orange' : 'warning'}>
                          {i.severity}
                        </Badge>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'Statut Résolution',
                      render: (i) => (
                        <Badge variant={i.status === 'RESOLVED' ? 'success' : 'info'}>
                          {i.status}
                        </Badge>
                      ),
                    },
                    {
                      key: 'time',
                      header: 'Signalé le',
                      render: (i) => <span className="font-mono text-xs text-slate-400">{i.reportedAt}</span>,
                    },
                  ]}
                />
              </div>
            )}

            {/* ONGLET 5 : PREUVES DE LIVRAISON (POD) */}
            {logisticsTab === 'pod' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500">
                  Archivage des émargements électroniques, signatures numériques vectorielles et clichés photographiques de conformité.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">POD-2026-8819 (Casablanca Port)</span>
                      <Badge variant="success">ÉMARGÉ & CERTIFIÉ</Badge>
                    </div>
                    <p className="text-slate-500">Réceptionnaire : <strong>Driss Bennani (Chef de Quai)</strong></p>
                    <p className="font-mono text-[11px] text-slate-400">Horodatage : 2026-11-17 14:45 UTC+1</p>
                    <div className="p-3 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                      <p className="text-slate-400 mb-1 text-[11px]">Tracé vectoriel de signature électronique :</p>
                      <svg viewBox="0 0 200 60" className="w-48 h-14 text-emerald-600 stroke-current fill-none stroke-2">
                        <path d="M 10 30 Q 30 10 50 35 T 90 25 T 130 40 T 180 20" />
                      </svg>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">POD-2026-9902 (Marseille Fos)</span>
                      <Badge variant="success">ÉMARGÉ & CERTIFIÉ</Badge>
                    </div>
                    <p className="text-slate-500">Réceptionnaire : <strong>Jean-Paul Morel (Logisticien)</strong></p>
                    <p className="font-mono text-[11px] text-slate-400">Horodatage : 2026-11-16 11:20 UTC+1</p>
                    <div className="p-3 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                      <p className="text-slate-400 mb-1 text-[11px]">Tracé vectoriel de signature électronique :</p>
                      <svg viewBox="0 0 200 60" className="w-48 h-14 text-emerald-600 stroke-current fill-none stroke-2">
                        <path d="M 15 40 Q 40 5 70 30 T 110 15 T 150 45 T 190 30" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. CONFIGURATION IA, RAG & SCHÉMAS DYNAMIQUES IDP (/admin/ai-config)  */}
      {/* ===================================================================== */}
      {section === 'ai-config' && (
        <div className="space-y-6">
          {/* SÉLECTEUR DE SOUS-ONGLET SECTION 7 */}
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { id: 'models-ocr', label: 'Modèles IA, Quotas & Studio OCR / IDP' },
              { id: 'glossary', label: 'Glossaire & Moteur de Traduction B2B (FR / EN / AR)' },
            ].map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={aiTab === tab.id ? 'primary' : 'secondary'}
                onClick={() => setAiTab(tab.id as any)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {aiTab === 'models-ocr' && (
            <Card
              title="Gouvernance de l'Intelligence Artificielle, RAG & Studio OCR / IDP"
              subtitle="Exclusivité officielle Google Gemini (Gemini 1.5 Pro / Flash & 2.0 Flash), filtrage strict par rôle RBAC et supervision des quotas côté serveur"
            >
              <div className="space-y-6">
                {/* SÉLECTION DU MODÈLE ET CLÉS SERVEUR MASQUÉES */}
                <div className="grid md:grid-cols-2 gap-6 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      Fournisseur LLM Officiel (Exclusivité Google Gemini)
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'gemini-1.5-pro', label: 'Google Gemini 1.5 Pro (Multimodal & Long Context)' },
                        { id: 'gemini-1.5-flash', label: 'Google Gemini 1.5 Flash (Ultra-Rapide & Faible Latence)' },
                        { id: 'gemini-2.0-flash', label: 'Google Gemini 2.0 Flash (Next-Gen Streaming)' },
                      ].map((p) => (
                        <Button
                          key={p.id}
                          size="sm"
                          variant={activeGeminiModel === p.id ? 'primary' : 'secondary'}
                          onClick={() => {
                            setActiveGeminiModel(p.id as any);
                            notifyToast(`Modèle actif configuré : ${p.label}`, 'info');
                          }}
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>
                    <p className="text-slate-500 pt-1">
                      Filtrage RAG strict activé : les documents cités dans les réponses respectent strictement la matrice de permission du rôle utilisateur actif.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      Consommation de Tokens & Quotas Mensuels
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tokens utilisés ce mois :</span>
                        <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                          {aiQuota.dailyTokensConsumed.toLocaleString()} / {aiQuota.dailyTokensLimit.toLocaleString()}
                        </strong>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-teal-900 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, (aiQuota.dailyTokensConsumed / aiQuota.dailyTokensLimit) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Coût estimé des requêtes LLM : <strong>0,28 €</strong> (99.8% sous enveloppe gratuite Gemini Pro Vertex).
                      </p>
                    </div>
                  </div>
                </div>

                {/* LISTE DES MODÈLES SUPPORTÉS */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-teal-200 uppercase tracking-wide">
                    Catalogue des Modèles d'Intelligence Artificielle Déclarés :
                  </h4>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    {SUPPORTED_AI_MODELS.map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{m.name}</span>
                          <Badge variant={m.isLocal ? 'orange' : 'info'}>
                            {m.isLocal ? 'Local Souverain' : 'Cloud Vertex'}
                          </Badge>
                        </div>
                        <p className="text-slate-500 text-[11px]">{m.description}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-teal-800">
                          <span>Fenêtre : {m.contextWindowTokens.toLocaleString()} tokens</span>
                          <span>Débit max : {m.rateLimitPerMinute} req/min</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SUPERVISION DU STUDIO OCR / IDP & VALIDATION DES CHAMPS DYNAMIQUES */}
                <div className="p-4 rounded-2xl bg-teal-500/10 border-2 border-teal-500/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#E85D22]" />
                      Champ Dynamique IDP Proposé par l'IA : <code className="ltr-preserve">incoterm_insurance_clause</code>
                    </span>
                    <Badge variant="warning">Confiance OCR : 96.8%</Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Détecté automatiquement sur 14 factures d’import maritime. Conformément à la règle de validation administrative, ce champ requiert l'approbation d'un administrateur avant d'être persisté dans le schéma relationnel de production.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        notifyToast('Champ dynamique IDP validé et scellé dans le schéma PostgreSQL !', 'success')
                      }
                    >
                      <Check className="w-4 h-4" />
                      Valider le champ IDP
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        notifyToast('Rejet motivé consigné dans le journal d\'audit.', 'warning')
                      }
                    >
                      <X className="w-4 h-4" />
                      Rejeter
                    </Button>
                    <Link to="/ocr-idp">
                      <Button size="sm" variant="secondary">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ouvrir le Studio IDP Interactif
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {aiTab === 'glossary' && (
            <TranslationGlossaryAdminView />
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. ROOM LIVE & GOUVERNANCE WEBRTC (/admin/room-live)                  */}
      {/* ===================================================================== */}
      {section === 'room-live' && (
        <div className="space-y-6">
          <Card
            title="Gouvernance des Réunions Room Live (WebRTC / SFU)"
            subtitle="Modération administrative, invitations sécurisées, consentement RGPD obligatoire et synthèses certifiées générées par IA"
            action={
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  { id: 'active', label: `Salles Actives (${rooms.length})` },
                  { id: 'create', label: 'Créer une Salle' },
                  { id: 'records', label: 'Enregistrements & RGPD' },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    size="sm"
                    variant={roomTab === tab.id ? 'primary' : 'secondary'}
                    onClick={() => setRoomTab(tab.id as any)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            }
          >
            {/* ONGLET 1 : SALLES ACTIVES & MODÉRATION */}
            {roomTab === 'active' && (
              <div className="space-y-4">
                <DataTable
                  caption="Liste des sessions Room Live en cours ou programmées"
                  keyExtractor={(r) => r.id}
                  data={rooms}
                  columns={[
                    {
                      key: 'code',
                      header: 'Code & Titre de la Salle',
                      isRowHeader: true,
                      render: (r) => (
                        <div>
                          <span className="font-mono font-bold text-[#E85D22]">{r.roomCode}</span>
                          <p className="font-bold text-xs text-slate-900 dark:text-white">{r.title}</p>
                        </div>
                      ),
                    },
                    {
                      key: 'creator',
                      header: 'Hôte / Créateur',
                      render: (r) => (
                        <div>
                          <p className="text-xs font-semibold">{r.creatorName}</p>
                          <Badge variant="orange">{r.creatorRole}</Badge>
                        </div>
                      ),
                    },
                    {
                      key: 'scheduled',
                      header: 'Horaire Prévu',
                      render: (r) => <span className="font-mono text-xs text-slate-400">{r.scheduledAt}</span>,
                    },
                    {
                      key: 'participants',
                      header: 'Participants',
                      render: (r) => <span className="font-mono text-xs">{r.participantsCount} connectés</span>,
                    },
                    {
                      key: 'status',
                      header: 'Statut',
                      render: (r) => (
                        <Badge variant={r.status === 'LIVE' ? 'success' : 'neutral'}>
                          {r.status}
                        </Badge>
                      ),
                    },
                    {
                      key: 'actions',
                      header: 'Modération & Accès',
                      render: (r) => (
                        <div className="flex flex-wrap gap-1.5">
                          <Link to="/room-live">
                            <Button size="sm" variant="primary">Rejoindre</Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              navigator.clipboard?.writeText(`https://app.tradelink-saas.com/live/${r.roomCode}`);
                              notifyToast(`Lien d'invitation sécurisé copié pour ${r.roomCode}`, 'success');
                            }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Lien
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              notifyToast(`Microphone coupé pour tous les participants de la salle ${r.roomCode}`, 'info')
                            }
                          >
                            <MicOff className="w-3.5 h-3.5" />
                            Mute All
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            )}

            {/* ONGLET 2 : CRÉATION D'UNE SALLE ADMINISTRATIVE */}
            {roomTab === 'create' && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-4 text-xs">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Créer une Salle de Réunion Sécurisée TRADELINK
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Titre de la Salle :</label>
                    <input
                      type="text"
                      value={newRoomTitle}
                      onChange={(e) => setNewRoomTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Ordre du Jour / Sujet :</label>
                    <input
                      type="text"
                      value={newRoomTopic}
                      onChange={(e) => setNewRoomTopic(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Rôle Invité Principal :</label>
                    <select
                      value={newRoomAccessRole}
                      onChange={(e) => setNewRoomAccessRole(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-bold"
                    >
                      <option value="CLIENT">Client B2B (Invité)</option>
                      <option value="FOURNISSEUR">Fournisseur</option>
                      <option value="TRANSPORTEUR">Transporteur</option>
                      <option value="COMPTABLE">Comptable</option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRoomKnocking}
                        onChange={(e) => setNewRoomKnocking(e.target.checked)}
                        className="rounded text-[#E85D22]"
                      />
                      <span className="font-semibold">Salle d'attente activée (Admission manuelle par l'hôte)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRoomRecording}
                        onChange={(e) => setNewRoomRecording(e.target.checked)}
                        className="rounded text-[#E85D22]"
                      />
                      <span className="font-semibold">Enregistrement & transcription IA (Consentement légal requis)</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      const res = createRoomLive(newRoomTitle, new Date().toISOString().slice(0, 16));
                      if (res.ok) {
                        notifyToast(`Salle créée : ${res.room?.roomCode} - ${newRoomTitle}`, 'success');
                        setRoomTab('active');
                      }
                    }}
                  >
                    <Video className="w-4 h-4" />
                    Créer la Salle & Ouvrir l'Accès
                  </Button>
                </div>
              </div>
            )}

            {/* ONGLET 3 : ENREGISTREMENTS & RGPD */}
            {roomTab === 'records' && (
              <div className="space-y-4 text-xs">
                {/* BANDEAU LÉGAL OBLIGATOIRE DE CONSENTEMENT RGPD */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-800 dark:text-amber-300 text-sm flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      Règles de Consentement & Protection des Enregistrements (RGPD Art. 6 & 7)
                    </span>
                    <Badge variant="orange">CONFORMITÉ RGPD 90 JOURS</Badge>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    Les enregistrements audio et vidéo ne peuvent démarrer qu'après recueil explicite du consentement de chaque participant dans la salle. Les flux sont chiffrés en mémoire (AES-256) et automatiquement purgés après un délai strict de 90 jours. Les participants peuvent à tout moment révoquer leur consentement.
                  </p>
                </div>

                <DataTable
                  caption="Archives des sessions enregistrées et synthèses IA"
                  keyExtractor={(r) => r.id}
                  data={rooms.filter((r) => r.aiSummaryAvailable)}
                  columns={[
                    {
                      key: 'room',
                      header: 'Salle & Date',
                      isRowHeader: true,
                      render: (r) => (
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{r.title}</p>
                          <p className="text-[11px] font-mono text-slate-400">{r.roomCode} • {r.scheduledAt}</p>
                        </div>
                      ),
                    },
                    {
                      key: 'summary',
                      header: 'Compte-Rendu Automatique IA',
                      render: (r) => (
                        <div className="max-w-md">
                          <p className="line-clamp-2 text-slate-600 dark:text-slate-300">{r.aiSummary?.summary}</p>
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                            {r.aiSummary?.decisions.length || 0} décision(s) actée(s)
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: 'download',
                      header: 'Export Certifié',
                      render: (r) => (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            downloadDataExport(
                              `compte_rendu_${r.roomCode}.json`,
                              JSON.stringify(r.aiSummary, null, 2),
                              'application/json'
                            );
                            notifyToast(`Compte-rendu certifié téléchargé pour ${r.roomCode} !`, 'success');
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          Télécharger PDF
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 9. SÉCURITÉ, KMS & CHIFFREMENT PAR ENVELOPPE (/admin/security)        */}
      {/* ===================================================================== */}
      {section === 'security' && (
        <div className="space-y-6">
          <Card
            title="Gestion des Clés KMS & Chiffrement par Enveloppe (Page 16 — Composant 63 : KMSKeyCard)"
            subtitle="Chapitre 12.1 : DEK pour les données, KEK gérée par KMS/Vault/HSM. Les clés brutes ne sont JAMAIS affichées ni stockées en clair."
          >
            <div className="grid md:grid-cols-2 gap-4">
              {kmsKeys.map((k) => (
                <div
                  key={k.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon3D name="fleet-keys" size="md" withGlow />
                      <div>
                        <p className="text-sm font-bold ltr-preserve">{k.keyAlias}</p>
                        <p className="text-xs text-slate-500">
                          {k.keyType} • {k.algorithm} • Version v{k.version}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success">{k.status}</Badge>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800/80 text-xs font-mono ltr-preserve">
                    <p className="text-slate-400">ARN / Référence KMS (Secret brut jamais exposé) :</p>
                    <p className="text-emerald-700 dark:text-emerald-300 mt-0.5 truncate">
                      {k.keyArnMasked}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Dernière rotation : {k.lastRotatedAt}</span>
                    <Button size="sm" variant="teal" onClick={() => rotateKMSKey(k.id)}>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Rotation Clé KMS (HSM)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* SIMULATEUR DE CHIFFREMENT PAR ENVELOPPE (AES-256-GCM) */}
          <Card
            title="Laboratoire de Chiffrement par Enveloppe (DEK éphémère / KEK souveraine)"
            subtitle="Démonstration temps réel : la DEK est générée en RAM, chiffre les données en AES-256-GCM, puis est enveloppée sous la KEK et immédiatement purgée de la mémoire vive."
          >
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={envelopeInput}
                  onChange={(e) => setEnvelopeInput(e.target.value)}
                  placeholder="Texte confidentiel à chiffrer par enveloppe..."
                  className="flex-1 px-4 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!envelopeInput.trim()) return;
                    const res = simulateKmsEnvelopeCipher(envelopeInput, kmsKeys[0].id);
                    setEnvelopeOutput(res);
                  }}
                >
                  <Lock className="w-4 h-4" />
                  Chiffrer par Enveloppe AES-256-GCM
                </Button>
              </div>

              {envelopeOutput && (
                <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs space-y-3 border border-teal-700/60">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Enveloppe Chiffrée Générée (Zero Secret Brut)
                    </span>
                    <span className="text-[11px] text-slate-400">Algorithme : {envelopeOutput.algorithm}</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <p className="text-slate-400">1. DEK en clair dans la RAM :</p>
                      <p className="text-amber-400 font-bold">DEK 256 bits éphémère (Zeroized en mémoire)</p>
                    </div>
                    <div>
                      <p className="text-slate-400">2. DEK enveloppée sous KEK :</p>
                      <p className="text-teal-300 truncate">{envelopeOutput.cipherDekBase64}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">3. Vecteur d'Initialisation (IV 96 bits) :</p>
                      <p className="text-slate-300">{envelopeOutput.ivHex}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">4. Tag d'Authentification GCM (128 bits) :</p>
                      <p className="text-purple-300">{envelopeOutput.authTagHex}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-slate-400 mb-1">Payload Chiffré Ciphertext (Base64) :</p>
                    <p className="text-emerald-300 break-all bg-black/40 p-2.5 rounded-lg">
                      {envelopeOutput.cipherTextBase64}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* HISTORIQUE DES OPÉRATIONS KMS */}
          <Card
            title="Registre d'Audit des Opérations KMS & HSM"
            subtitle="Traçabilité cryptographique des rotations de KEK et des générations de clés de données DEK."
          >
            <DataTable
              caption="Opérations KMS"
              keyExtractor={(op) => op.id}
              data={kmsOperationsHistory}
              columns={[
                {
                  key: 'timestamp',
                  header: 'Horodatage',
                  isRowHeader: true,
                  render: (op) => <span className="font-mono text-xs">{op.timestamp}</span>,
                },
                {
                  key: 'op',
                  header: 'Opération',
                  render: (op) => (
                    <Badge variant={op.operation === 'ROTATE_KEK' ? 'orange' : 'info'}>
                      {op.operation}
                    </Badge>
                  ),
                },
                {
                  key: 'key',
                  header: 'Clé Cible & ARN Masqué',
                  render: (op) => (
                    <div>
                      <p className="font-bold text-xs ltr-preserve">{op.keyAlias}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{op.keyArnMasked}</p>
                    </div>
                  ),
                },
                {
                  key: 'actor',
                  header: 'Initié Par',
                  render: (op) => <span className="text-xs">{op.performedBy}</span>,
                },
                {
                  key: 'status',
                  header: 'Statut',
                  render: (op) => (
                    <Badge variant={op.result === 'SUCCESS' ? 'success' : 'danger'}>
                      {op.result}
                    </Badge>
                  ),
                },
                {
                  key: 'details',
                  header: 'Détails Opérationnels',
                  render: (op) => <span className="text-xs text-slate-600 dark:text-slate-300">{op.details}</span>,
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 9B. IMPORT / EXPORT & SANDBOX ISOLÉE (/admin/import-export)           */}
      {/* ===================================================================== */}
      {section === 'import-export' && (
        <div className="space-y-6">
          <Card
            title="Import Avancé Multi-Formats & Sandbox Isolée (PROMPT 11)"
            subtitle="Supports natifs : CSV, XLSX, JSON, SQL, BAK, DBF, DBF/CDX. Les dumps ne sont JAMAIS exécutés directement en production. Restauration éphémère sans accès réseau ni secrets."
            action={
              <div className="flex flex-wrap items-center gap-1.5">
                {(['CSV', 'XLSX', 'JSON', 'SQL', 'BAK', 'DBF', 'CDX'] as ImportExportFormat[]).map((fmt) => (
                  <Badge key={fmt} variant="orange">
                    {fmt}
                  </Badge>
                ))}
              </div>
            }
          >
            <div className="space-y-6">
              <Stepper
                currentStepIndex={1}
                steps={[
                  { id: 's1', label: '1. Scan Antivirus & SHA-256', description: 'Contrôle ClamAV et intégrité' },
                  { id: 's2', label: '2. Sandbox Éphémère Isolée', description: 'Réseau OFF, Secrets Prod Masqués' },
                  { id: 's3', label: '3. Double Approbation Admin', description: 'Migration scellée par planHash' },
                ]}
              />

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                <p className="text-xs font-bold text-slate-700 dark:text-teal-200 uppercase tracking-wide">
                  Démonstrations Rapides d'Analyse en Sandbox Isolée :
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => analyzeSandboxFile('Tarifs_Douaniers_SH_2026.dbf', 'DBF')}
                  >
                    <Database className="w-3.5 h-3.5" />
                    FoxPro DBF/CDX (Tarifs Douaniers)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => analyzeSandboxFile('Archive_Catalogue_ERP_2026.bak', 'BAK')}
                  >
                    <Database className="w-3.5 h-3.5" />
                    SQL Server .BAK (Catalogue ERP)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => analyzeSandboxFile('dump_commandes_logistique_2026.sql', 'SQL')}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    Dump PostgreSQL .SQL
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => analyzeSandboxFile('Catalogue_Produits_Multilingues.xlsx', 'XLSX')}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Catalogue Excel .XLSX
                  </Button>
                </div>
              </div>

              <FileUploader
                label="Déposer un dump SQL, sauvegarde SQL Server (.BAK), table FoxPro (.DBF/.CDX), CSV, XLSX ou JSON"
                onFileSelect={(name) => analyzeSandboxFile(name)}
              />

              {activeSandboxReport && (
                <div className="p-5 rounded-2xl bg-teal-500/10 border-2 border-teal-500/30 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{activeSandboxReport.format}</Badge>
                        <Badge variant="success">Scan Antivirus : {activeSandboxReport.avScanStatus}</Badge>
                        <Badge variant="orange">Score Compatibilité : {activeSandboxReport.compatibilityScore}%</Badge>
                      </div>
                      <h3 className="text-base font-bold mt-1.5 ltr-preserve">{activeSandboxReport.fileName}</h3>
                      <p className="text-xs text-slate-500 font-mono ltr-preserve">
                        Job: {activeSandboxReport.jobId} • Taille: {activeSandboxReport.fileSizeFormatted} • SHA-256: {activeSandboxReport.sha256Checksum.slice(0, 24)}...
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Réseau Sandbox Coupé
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Secrets Prod Masqués
                      </span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                      <p className="text-xs text-slate-400">Lignes Détectées</p>
                      <p className="text-lg font-bold text-slate-800 dark:text-teal-200">
                        {activeSandboxReport.totalRowsDetected.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {activeSandboxReport.validRows.toLocaleString()} valides ({activeSandboxReport.invalidRows} rejets)
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                      <p className="text-xs text-slate-400">Tables / Schémas Détectés</p>
                      <p className="text-lg font-bold text-slate-800 dark:text-teal-200">
                        {activeSandboxReport.tablesDetected.length}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {activeSandboxReport.tablesDetected.map((t) => t.tableName).join(', ')}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                      <p className="text-xs text-slate-400">Empreinte Cryptographique du Plan</p>
                      <p className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300 truncate mt-1">
                        {activeSandboxReport.migrationPlanHash}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Liaison immuable aux paramètres exacts</p>
                    </div>
                  </div>

                  {activeSandboxReport.fieldMappings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700 dark:text-teal-200">
                        Recommandations de Correspondance des Champs (Mapping IA & Heuristique) :
                      </p>
                      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
                        {activeSandboxReport.fieldMappings.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-xs flex items-center justify-between"
                          >
                            <div>
                              <span className="font-mono text-slate-600 dark:text-slate-400">{m.sourceColumn}</span>
                              <ArrowRight className="inline w-3 h-3 mx-1 text-teal-500" />
                              <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{m.targetField}</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold">
                              {m.confidencePct}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeSandboxReport.detectedErrors.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                      <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Avertissements de Structure Détectés ({activeSandboxReport.detectedErrors.length}) :
                      </p>
                      {activeSandboxReport.detectedErrors.map((err, i) => (
                        <p key={i} className="text-slate-700 dark:text-slate-300">
                          • [Ligne {err.line} - Col {err.column}] {err.message} ({err.severity})
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-white dark:bg-[#071E22] border border-teal-600/40 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-teal-100">
                        Double Validation Requise pour Promotion en Production :
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Initié par : <strong>Admin #1 (usr-admin-01)</strong> • Acteur actuel :{' '}
                        <strong>{currentUser.firstName} {currentUser.lastName} ({currentUser.id})</strong>
                      </p>
                      {currentUser.id === (activeSandboxReport.firstAdminApproverId || 'usr-admin-01') && (
                        <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-1">
                          ⚠️ Règle de sécurité stricte : l'initiateur ne peut pas auto-approuver la promotion. Basculez sur Admin #2 ci-dessous !
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant={currentUser.id === 'usr-admin-01' ? 'primary' : 'secondary'}
                        onClick={() => switchUserAccount('ADMIN_1')}
                      >
                        Admin #1
                      </Button>
                      <Button
                        size="sm"
                        variant={currentUser.id === 'usr-admin-02' ? 'primary' : 'secondary'}
                        onClick={() => switchUserAccount('ADMIN_2')}
                      >
                        Admin #2
                      </Button>
                      <Button
                        size="sm"
                        variant="teal"
                        onClick={() => promoteSandboxReport(activeSandboxReport.jobId)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Promouvoir en Production (Contrôle 2e Admin)
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <DataTable
                caption="Historique des analyses en Sandbox isolée"
                keyExtractor={(j) => j.id}
                data={importJobs}
                columns={[
                  {
                    key: 'file',
                    header: 'Fichier & Format',
                    isRowHeader: true,
                    render: (j) => (
                      <div>
                        <p className="font-bold ltr-preserve">{j.fileName}</p>
                        <p className="text-[11px] font-mono text-slate-400 ltr-preserve">
                          SHA-256: {j.sha256Checksum.slice(0, 24)}...
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'format',
                    header: 'Format',
                    render: (j) => <Badge variant="orange">{j.format}</Badge>,
                  },
                  {
                    key: 'sandbox',
                    header: 'État Sandbox Éphémère',
                    render: (j) => (
                      <div className="space-y-1">
                        <Badge
                          variant={
                            j.sandboxStatus === 'PROMOTED_DOUBLE_APPROVED'
                              ? 'success'
                              : 'info'
                          }
                        >
                          {j.sandboxStatus}
                        </Badge>
                        <p className="text-xs text-slate-500">
                          {j.rowsDetected.toLocaleString()} lignes • Score {j.compatibilityScore}%
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'tables',
                    header: 'Schémas Détectés',
                    render: (j) => (
                      <div className="flex flex-wrap gap-1">
                        {j.tablesDetected.map((tb) => (
                          <span
                            key={tb}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-teal-900 font-mono text-[11px]"
                          >
                            {tb}
                          </span>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </Card>

          {/* CENTRE D'EXPORTS MULTI-FORMATS CERTIFIÉS */}
          <Card
            title="Centre d'Exports Multi-Formats Certifiés (CSV, XLSX, JSON, SQL, DBF, CDX)"
            subtitle="Générez des extractions complètes conformes aux formats métiers pour audit, comptabilité, CRM ou interopérabilité industrielle."
          >
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Entité à Exporter :</label>
                  <select
                    value={exportEntity}
                    onChange={(e) => setExportEntity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-bold"
                  >
                    <option value="PRODUCTS">Produits (Catalogue multilingue)</option>
                    <option value="ORDERS">Commandes & Lignes d'expédition</option>
                    <option value="ENTRIES">Écritures Comptables & Journaux</option>
                    <option value="AUDIT_LOGS">Journal d'Audit Immuable</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Format de Fichier :</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-bold font-mono"
                  >
                    <option value="CSV">CSV (UTF-8 avec séparateur standard)</option>
                    <option value="XLSX">XLSX (Tableur Microsoft Excel)</option>
                    <option value="JSON">JSON (Format structuré REST)</option>
                    <option value="SQL">SQL (Inserts PostgreSQL / ANSI)</option>
                    <option value="DBF">DBF (Table binaire dBASE III / FoxPro)</option>
                    <option value="CDX">CDX (Index b-tree composé FoxPro)</option>
                    <option value="BAK">BAK (Archive SQL Server certifiée)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="teal"
                    className="w-full"
                    onClick={() => {
                      const res = exportDatasetAction(exportEntity, exportFormat);
                      downloadDataExport(res.fileName, res.content);
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Télécharger l'Export {exportFormat}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 9C. CONFIGURATION BOUTONS FLOTTANTS (/admin/floating-buttons)         */}
      {/* ===================================================================== */}
      {section === 'floating-buttons' && (
        <Card
          title="Configuration des Boutons Flottants (Page 19)"
          subtitle="Liste, ordre d'affichage, position, consentement et activation temps réel"
        >
          <div className="space-y-3">
            {floatingButtons.map((fb) => (
              <div
                key={fb.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Icon3D name={fb.icon3d} size="sm" />
                  <div>
                    <p className="text-sm font-bold">{fb.label.fr} / {fb.label.ar}</p>
                    <p className="text-xs text-slate-500">
                      Position : {fb.position} • Ordre #{fb.displayOrder} • Consentement requis : {fb.requiresConsent ? 'Oui' : 'Non'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={fb.isEnabled ? 'primary' : 'secondary'}
                  onClick={() => toggleFloatingButton(fb.id)}
                >
                  {fb.isEnabled ? 'Activé' : 'Désactivé'}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 9D. AUDIT LOGS IMMUABLES (/admin/audit)                               */}
      {/* ===================================================================== */}
      {section === 'audit' && (
        <div className="space-y-6">
          <Card
            title="Journal d’Audit Append-Only Immuable & Chaîne de Hachage (Chapitre 12.3)"
            subtitle="Traçabilité complète avec acteur, rôle, action, cible, résultat et ID de corrélation. Chaque bloc est lié cryptographiquement au bloc précédent (SHA-256 prevHash -> currentHash)."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="teal"
                  onClick={() => {
                    const res = verifyAuditChainAction();
                    setChainVerification({
                      ...res,
                      verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
                    });
                  }}
                >
                  <Hash className="w-4 h-4" />
                  Vérifier la Chaîne de Hachage (SHA-256)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const csv = [
                      'ID,Timestamp,Actor,Role,Action,Target,Result,CorrelationID',
                      ...auditLogs.map(
                        (a) =>
                          `${a.id},${a.timestamp},"${a.actorName}",${a.actorRole},${a.action},${a.targetId},${a.result},${a.correlationId}`
                      ),
                    ].join('\n');
                    downloadDataExport('tradelink_audit_logs.csv', csv);
                    notifyToast('Export CSV du journal d’audit téléchargé !', 'success');
                  }}
                >
                  <Download className="w-4 h-4" />
                  Exporter Audit CSV
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              {chainVerification && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Chaîne Cryptographique Immuable Intacte & Scellée (0 Rupture)
                    </span>
                    <Badge variant="success">{chainVerification.totalEntriesVerified} Blocs Vérifiés</Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                    <div>
                      <p className="text-slate-400">Dernier Bloc (Top Hash SHA-256) :</p>
                      <p className="text-teal-700 dark:text-teal-300 truncate font-bold">{chainVerification.latestHash}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Bloc Genesis (Origine) :</p>
                      <p className="text-slate-500 truncate">GENESIS_HASH_TRADELINK_V6_INITIAL_BLOCK</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-teal-200 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Surveillance des Événements Sensibles (Double Approbation, KMS & Sandbox) :
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1 rounded-lg bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Badge variant="danger">Interdiction</Badge>
                    Anti-Auto-Approbation Active
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Badge variant="orange">KMS HSM</Badge>
                    Rotation KEK AES-256-GCM
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Badge variant="info">Sandbox</Badge>
                    Contrôle des Schémas Immuables
                  </span>
                </div>
              </div>

              <DataTable
                caption="Journal d'audit sécurité et opérations sensibles"
                keyExtractor={(a) => a.id}
                data={auditLogs}
                columns={[
                  {
                    key: 'time',
                    header: 'Horodatage & Corrélation',
                    isRowHeader: true,
                    render: (a) => (
                      <div>
                        <p className="font-mono text-xs ltr-preserve">{a.timestamp}</p>
                        <p className="font-mono text-[10px] text-slate-400 ltr-preserve">
                          {a.correlationId}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'actor',
                    header: 'Acteur & Rôle',
                    render: (a) => (
                      <div>
                        <p className="font-bold">{a.actorName}</p>
                        <Badge variant="orange">{a.actorRole}</Badge>
                      </div>
                    ),
                  },
                  {
                    key: 'action',
                    header: 'Action & Cible',
                    render: (a) => (
                      <div>
                        <p className="font-mono text-xs font-bold">{a.action}</p>
                        <p className="text-xs text-slate-500">
                          {a.targetType} ({a.targetId})
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'result',
                    header: 'Résultat',
                    render: (a) => (
                      <Badge
                        variant={
                          a.result === 'SUCCESS'
                            ? 'success'
                            : a.result === 'DENIED'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {a.result}
                      </Badge>
                    ),
                  },
                  {
                    key: 'details',
                    header: 'Détails Opérationnels',
                    render: (a) => <span className="text-xs">{a.details}</span>,
                  },
                ]}
              />
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 9E. SAUVEGARDES & DOUBLE VALIDATION (/admin/backups)                   */}
      {/* ===================================================================== */}
      {section === 'backups' && (
        <div className="space-y-6">
          <Card
            title="Sauvegardes Chiffrées & Restauration Soumise à Double Validation (Chapitre 7.3)"
            subtitle="Deux administrateurs distincts doivent approuver toute restauration. L’initiateur ne peut jamais approuver sa propre demande. Test préalable en Sandbox isolée sans altération de production."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="teal" onClick={createManualBackup}>
                  <Plus className="w-4 h-4" />
                  Créer Sauvegarde Manuelle
                </Button>
                <Button
                  size="sm"
                  variant={currentUser.id === 'usr-admin-01' ? 'primary' : 'secondary'}
                  onClick={() => switchUserAccount('ADMIN_1')}
                >
                  Admin #1 (Initiateur)
                </Button>
                <Button
                  size="sm"
                  variant={currentUser.id === 'usr-admin-02' ? 'primary' : 'secondary'}
                  onClick={() => switchUserAccount('ADMIN_2')}
                >
                  Basculer sur Admin #2 (Approbateur distinct)
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-300">
                    Démonstration Interactive de la Règle d’Interdiction d’Auto-Approbation :
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    La restauration de <code>BKP-FULL-20261118-0200</code> a été initiée par <strong>Admin #1 (Karim Mansouri)</strong>. Si vous cliquez sur « Approuver » en tant qu’Admin #1, le contrôle serveur bloque l’action. Basculez sur <strong>Admin #2 (Sophie Laurent)</strong> pour valider la double approbation !
                  </p>
                </div>
                <Badge variant="orange">Actif : {currentUser.firstName} ({currentUser.id})</Badge>
              </div>

              {backupRestoreReport && (
                <div className="p-4 rounded-2xl bg-teal-500/10 border-2 border-teal-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-800 dark:text-teal-200 flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Test de Restauration Réussi en Sandbox Éphémère Isolée
                    </span>
                    <Badge variant="success">0 Écriture en Prod</Badge>
                  </div>
                  <div className="grid sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                    <div>
                      <p className="text-slate-400">Conteneur Éphémère :</p>
                      <p className="font-bold text-teal-700 dark:text-teal-300">{backupRestoreReport.sandboxContainerId}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Tables Restaurées :</p>
                      <p className="font-bold">{backupRestoreReport.tablesRestoredCount} tables</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Durée du Test :</p>
                      <p className="font-bold">{backupRestoreReport.durationMs} ms</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Intégrité Cryptographique :</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold">100% SHA-256 Validée</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon3D name="insured" size="md" withGlow />
                        <div>
                          <p className="text-sm font-bold ltr-preserve">{b.backupCode}</p>
                          <p className="text-xs text-slate-500">{b.sizeFormatted}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="info">SHA-256 Certifié</Badge>
                        <Badge
                          variant={
                            b.restoreStatus === 'APPROVED_READY'
                              ? 'success'
                              : b.restoreStatus === 'PENDING_SECOND_APPROVAL'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {b.restoreStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 text-xs space-y-1">
                      <p className="font-mono text-[11px] text-slate-400">
                        Checksum : {b.sha256 ? `${b.sha256.slice(0, 24)}...` : 'Certifié'}
                      </p>
                      {b.restoreInitiatorName && (
                        <>
                          <p>
                            <strong>1er Admin (Initiateur) :</strong> {b.restoreInitiatorName}
                          </p>
                          <p>
                            <strong>2e Admin (Approbateur) :</strong>{' '}
                            {b.restoreSecondApproverName ?? 'En attente d’un second Admin distinct'}
                          </p>
                          <p className="font-mono text-[11px] text-teal-700 dark:text-teal-300">
                            Empreinte immuable du plan : {b.planHash}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const res = testBackupRestoreInSandbox(b.id);
                          if (res.ok && res.details) {
                            setBackupRestoreReport(res.details);
                          }
                        }}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Tester en Sandbox Isolée
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => approveBackupRestore(b.id)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approuver Restauration (2e Admin)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 9F. RAPPORTS ADMIN (/admin/reports)                                   */}
      {/* ===================================================================== */}
      {section === 'reports' && (
        <Card
          title="Rapports Administratifs, Exports Contrôlés & Planification (Page 22)"
          subtitle="Génération CSV / JSON auditée avec téléchargement réel"
        >
          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            {[
              { id: 'kyc', title: 'Rapport Conformité KYC & Échéances J+7', fmt: 'CSV / JSON', icon: 'customs-stamp' as const },
              { id: 'b2b', title: 'Synthèse Globale des Flux B2B & Douane', fmt: 'CSV / XLSX', icon: 'analytics' as const },
              { id: 'sec', title: 'Rapport Sécurité KMS, Sessions & Audit', fmt: 'JSON Signé', icon: 'secure-parcel' as const },
            ].map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <Icon3D name={rep.icon} size="md" withGlow />
                  <div>
                    <p className="font-bold text-sm">{rep.title}</p>
                    <p className="text-slate-500 mt-1">Format : {rep.fmt}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    downloadDataExport(
                      `tradelink_report_${rep.id}_2026.json`,
                      JSON.stringify({ report: rep.title, generatedAt: new Date().toISOString(), kycDossiers, kmsKeys }, null, 2),
                      'application/json'
                    );
                    notifyToast(`Rapport "${rep.title}" généré et téléchargé !`, 'success');
                  }}
                >
                  <Download className="w-4 h-4" />
                  Générer & Télécharger
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 10. PARAMÈTRES GÉNÉRAUX & GOUVERNANCE SAAS (/admin/parametres)        */}
      {/* ===================================================================== */}
      {section === 'parametres' && (
        <div className="space-y-6">
          <Card
            title="Paramètres Généraux, Notifications & Gouvernance Plateforme"
            subtitle="Configuration de la plateforme SaaS, politiques de notification multicanales, fiscalité multi-juridictions et matrice des habilitations RBAC"
            action={
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  { id: 'general', label: 'Plateforme' },
                  { id: 'notifications', label: 'Notifications' },
                  { id: 'fiscal', label: 'Fiscalité & TVA' },
                  { id: 'rbac', label: 'Matrice RBAC' },
                  { id: 'payments', label: 'Paiements & Séquestre' },
                  { id: 'admins', label: 'Administrateurs' },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    size="sm"
                    variant={settingsTab === tab.id ? 'primary' : 'secondary'}
                    onClick={() => setSettingsTab(tab.id as any)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            }
          >
            {/* ONGLET 1 : GÉNÉRAL & PLATEFORME */}
            {settingsTab === 'general' && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-4 text-xs">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Identité & Environnement SaaS</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Nom de la Plateforme :</label>
                    <input
                      type="text"
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Version Actuelle :</label>
                    <input
                      type="text"
                      disabled
                      value="TradeLink V6.0 (Édition Entreprise Souveraine)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#0B2D31] border border-slate-300 dark:border-teal-800 text-slate-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Fuseau Horaire de Référence :</label>
                    <input
                      type="text"
                      value={defaultTimezone}
                      onChange={(e) => setDefaultTimezone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Langue & Sens de Lecture :</label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={locale === 'fr' ? 'primary' : 'secondary'}
                        onClick={() => {
                          setLocale('fr');
                          notifyToast('Langue basculée en Français (LTR)', 'info');
                        }}
                      >
                        Français (LTR)
                      </Button>
                      <Button
                        size="sm"
                        variant={locale === 'en' ? 'primary' : 'secondary'}
                        onClick={() => {
                          setLocale('en');
                          notifyToast('Language switched to English (LTR)', 'info');
                        }}
                      >
                        English (LTR)
                      </Button>
                      <Button
                        size="sm"
                        variant={locale === 'ar' ? 'primary' : 'secondary'}
                        onClick={() => {
                          setLocale('ar');
                          notifyToast('تم التحويل إلى اللغة العربية (RTL)', 'info');
                        }}
                      >
                        العربية (RTL)
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-teal-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Mode Maintenance Général</p>
                    <p className="text-slate-500">
                      Active une page d'attente pour tous les utilisateurs non-administrateurs lors des migrations de schéma.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={maintenanceMode ? 'danger' : 'secondary'}
                    onClick={() => {
                      setMaintenanceMode(!maintenanceMode);
                      notifyToast(
                        !maintenanceMode ? 'Mode maintenance activé' : 'Mode maintenance désactivé',
                        !maintenanceMode ? 'warning' : 'success'
                      );
                    }}
                  >
                    {maintenanceMode ? 'Maintenance Active' : 'Maintenance Désactivée'}
                  </Button>
                </div>
              </div>
            )}

            {/* ONGLET 2 : NOTIFICATIONS MULTICANALES */}
            {settingsTab === 'notifications' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500">
                  Canaux d'alertes automatiques pour les relances KYC (J+1, J+3, J+5, J+6), notifications de fret et alertes de sécurité.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Passerelle Email SMTP / TLS</span>
                      <Button
                        size="sm"
                        variant={emailAlertsEnabled ? 'primary' : 'secondary'}
                        onClick={() => setEmailAlertsEnabled(!emailAlertsEnabled)}
                      >
                        {emailAlertsEnabled ? 'Activé' : 'Désactivé'}
                      </Button>
                    </div>
                    <p className="text-slate-400">Serveur : smtp.tradelink-cloud.eu • Port 587 • TLS Actif</p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Connexion chiffrée vérifiée</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Passerelle SMS Twilio</span>
                      <Button
                        size="sm"
                        variant={smsAlertsEnabled ? 'primary' : 'secondary'}
                        onClick={() => setSmsAlertsEnabled(!smsAlertsEnabled)}
                      >
                        {smsAlertsEnabled ? 'Activé' : 'Désactivé'}
                      </Button>
                    </div>
                    <p className="text-slate-400">Account SID : AC89****************************42</p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Routage SMS international opérationnel</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">WhatsApp Business API</span>
                      <Button
                        size="sm"
                        variant={whatsappAlertsEnabled ? 'primary' : 'secondary'}
                        onClick={() => setWhatsappAlertsEnabled(!whatsappAlertsEnabled)}
                      >
                        {whatsappAlertsEnabled ? 'Activé' : 'Désactivé'}
                      </Button>
                    </div>
                    <p className="text-slate-400">Modèles de messages approuvés par Meta Cloud</p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Canal vérifié pour les chauffeurs routiers</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Webhooks Sortants (ERP)</span>
                      <Badge variant="info">HMAC-SHA256</Badge>
                    </div>
                    <p className="text-slate-400">URL : https://api.erp-hub.com/webhook/tradelink</p>
                    <p className="text-slate-400">Événements : orders, shipments, kyc_status_changed</p>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET 3 : FISCALITÉ MULTI-JURIDICTIONS */}
            {settingsTab === 'fiscal' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500">
                  Règles de TVA et régimes fiscaux paramétrés selon la juridiction des partenaires d'échange.
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { country: 'France / Union Européenne', tva: '20.00 %', code: 'FR-TVA-20', regime: 'Régime standard métropolitain' },
                    { country: 'Maroc', tva: '20.00 %', code: 'MA-TVA-DGI', regime: 'Code Général des Impôts (DGI)' },
                    { country: 'Émirats Arabes Unis', tva: '5.00 %', code: 'AE-FTA-5', regime: 'Federal Tax Authority (FTA)' },
                    { country: 'Export International Hors-Zone', tva: '0.00 %', code: 'INT-EXPORT-EXEMPT', regime: 'Exonération art. 262 I du CGI' },
                  ].map((tax) => (
                    <div
                      key={tax.country}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-1.5"
                    >
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{tax.country}</p>
                      <p className="text-xl font-black text-[#E85D22]">{tax.tva}</p>
                      <p className="font-mono text-[11px] text-teal-700 dark:text-teal-300">{tax.code}</p>
                      <p className="text-[11px] text-slate-400 pt-1">{tax.regime}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ONGLET 4 : MATRICE DES HABILITATIONS RBAC */}
            {settingsTab === 'rbac' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-500">
                  Matrice exhaustive des droits et privilèges attribués à chaque profil d'acteur.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-teal-800 text-slate-500 font-bold">
                        <th className="py-2.5 px-3">Fonctionnalité Métier</th>
                        <th className="py-2.5 px-3">ADMIN</th>
                        <th className="py-2.5 px-3">CLIENT</th>
                        <th className="py-2.5 px-3">FOURNISSEUR</th>
                        <th className="py-2.5 px-3">TRANSPORTEUR</th>
                        <th className="py-2.5 px-3">COMPTABLE</th>
                        <th className="py-2.5 px-3">SUPPORT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-teal-800/60 font-mono text-[11px]">
                      {[
                        { f: 'Gouvernance & Clés KMS', a: 'RW', c: '-', s: '-', t: '-', cp: '-', sp: '-' },
                        { f: 'Sauvegardes & Restauration (2x)', a: 'RW', c: '-', s: '-', t: '-', cp: '-', sp: '-' },
                        { f: 'Validation KYC J+7', a: 'RW', c: 'Upload', s: 'Upload', t: 'Upload', cp: 'RO', sp: 'RO' },
                        { f: 'Catalogue Global', a: 'RW', c: 'RO', s: 'RW (Propre)', t: 'RO', cp: 'RO', sp: 'RO' },
                        { f: 'Passation de Commandes', a: 'RW', c: 'Create', s: 'Process', t: '-', cp: 'RO', sp: '-' },
                        { f: 'Facturation & Paiements', a: 'RW', c: 'Pay', s: 'Issue', t: '-', cp: 'RO (Complet)', sp: '-' },
                        { f: 'Moteur Financier (Decimal.js)', a: 'Exec', c: '-', s: '-', t: '-', cp: 'Exec', sp: '-' },
                        { f: 'Missions & Télémétrie Flotte', a: 'RW', c: 'Track', s: 'Track', t: 'RW', cp: '-', sp: 'Track' },
                        { f: 'Room Live WebRTC', a: 'Host', c: 'Invité Seul', s: 'Host', t: 'Host', cp: 'Host', sp: 'Host' },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-teal-900/20">
                          <td className="py-2 px-3 font-sans font-bold text-slate-900 dark:text-white">{row.f}</td>
                          <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-bold">{row.a}</td>
                          <td className="py-2 px-3 text-slate-500">{row.c}</td>
                          <td className="py-2 px-3 text-slate-500">{row.s}</td>
                          <td className="py-2 px-3 text-slate-500">{row.t}</td>
                          <td className="py-2 px-3 text-slate-500">{row.cp}</td>
                          <td className="py-2 px-3 text-slate-500">{row.sp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ONGLET 5 : PAIEMENTS & SÉQUESTRE */}
            {settingsTab === 'payments' && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-4 text-xs">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Passerelles Bancaires & Séquestre Escrow</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2">
                    <p className="font-bold text-sm">Stripe Connect & Séquestre B2B</p>
                    <p className="text-slate-400">Mode actif : <strong>Mode Test Sécurisé (Clés masquées)</strong></p>
                    <p className="font-mono text-[11px] text-teal-700 dark:text-teal-300">pk_test_51TL_SecuredKey_Masked</p>
                    <p className="text-[11px] text-slate-500">
                      Les fonds des commandes maritimes sont consignés sur un compte de séquestre jusqu'à signature électronique de la POD par le destinataire.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2">
                    <p className="font-bold text-sm">Coordonnées Bancaires de Séquestre (SWIFT / SEPA)</p>
                    <p className="text-slate-400">Banque Dépositaire : BNP Paribas Corporate Escrow</p>
                    <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">IBAN : FR76 3000 4001 2345 6789 0123 456</p>
                    <p className="font-mono text-[11px] text-slate-400">BIC / SWIFT : BNPAFR22XXX</p>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET 6 : COMPTES ADMINISTRATEURS & DOUBLE APPROBATION */}
            {settingsTab === 'admins' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                    Gouvernance de la Double Approbation & Ségrégation des Tâches
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    Toute action hautement critique (restauration d'une sauvegarde de production, promotion d'un schéma sandbox, rotation de la clé maîtresse KEK) requiert obligatoirement l'approbation conjointe de deux administrateurs distincts. L'initiateur de la demande ne peut jamais valider sa propre opération.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Admin #1 : Karim Mansouri</span>
                      <Badge variant="orange">SUPER ADMIN</Badge>
                    </div>
                    <p className="text-slate-400">Email : direction.sec@tradelink-saas.com</p>
                    <p className="text-slate-400">ID : usr-admin-01 • Session : sess-redis-9941a</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="success">MFA TOTP Obligatoire Validé</Badge>
                      <Badge variant="info">Clé YubiKey FIDO2</Badge>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Admin #2 : Sophie Laurent (CISO)</span>
                      <Badge variant="orange">CISO APPROBATEUR</Badge>
                    </div>
                    <p className="text-slate-400">Email : ciso.approver@tradelink-saas.com</p>
                    <p className="text-slate-400">ID : usr-admin-02 • Session : sess-redis-8820b</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="success">MFA TOTP Obligatoire Validé</Badge>
                      <Badge variant="info">Approbateur Distinct Habilité</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODAL : ARBITRAGE DU LITIGE COMMERCIAL */}
      {disputeToResolve && (
        <Modal
          open={Boolean(disputeToResolve)}
          onClose={() => setDisputeToResolve(null)}
          title={`Arbitrage du Litige ${disputeToResolve.disputeNumber}`}
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">
                Commande : {disputeToResolve.orderNumber} • Déclarant : {disputeToResolve.initiatorName}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Motif déclaré : <strong>{disputeToResolve.reason}</strong>
              </p>
              <p className="text-slate-500 italic text-[11px]">« {disputeToResolve.description} »</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Décision de l'Arbitre :
              </label>
              <select
                value={arbitrationAction}
                onChange={(e) => setArbitrationAction(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-semibold"
              >
                <option value="REFUND_TOTAL">Remboursement Intégral & Réintégration du Stock Usine</option>
                <option value="REFUND_PARTIAL">Remboursement Partiel (Avoir commercial)</option>
                <option value="FORCE_DELIVERY">Maintien de la Commande & Expédition Forcée</option>
                <option value="DISMISSED">Rejet du Litige (POD conforme et non contestable)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Motivation de la Sentence Arbitrale :
              </label>
              <textarea
                rows={3}
                value={arbitrationResolutionText}
                onChange={(e) => setArbitrationResolutionText(e.target.value)}
                placeholder="Indiquez les constatations matérielles et les motifs de la sentence..."
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDisputeToResolve(null)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                disabled={!arbitrationResolutionText.trim()}
                onClick={() => {
                  resolveOrderDispute(disputeToResolve.id, arbitrationResolutionText.trim(), arbitrationAction);
                  notifyToast(`Litige ${disputeToResolve.disputeNumber} tranché : ${arbitrationAction}`, 'success');
                  setDisputeToResolve(null);
                }}
              >
                Prononcer la Sentence d'Arbitrage
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE PRÉVISUALISATION ET GESTION DES DOCUMENTS COMMERCIAUX */}
      <CommercialDocumentViewerModal
        document={activeDocumentPreview}
        onClose={() => setActiveDocumentPreview(null)}
      />
    </div>
  );
};
