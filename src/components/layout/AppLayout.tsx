// ============================================================================
// TRADELINK V6.0 — LAYOUT GLOBAL HARMONISÉ, SIDEBAR PAR RÔLE, TOPBAR,
// FIL D'ARIANE, PANIER LATÉRAL (CartDrawer), ÉTATS UX, ASSISTANT IA & DICTÉE STT
// ============================================================================

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Bot,
  ChevronRight,
  Lock,
  LogOut,
  Menu,
  Mic,
  Moon,
  Plus,
  Minus,
  ShieldCheck,
  ShoppingCart,
  Sun,
  Trash2,
  X,
  Send,
  Volume2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useApp, DEMO_USERS, UXPreviewState } from '../../contexts/AppContext';
import { formatCurrency } from '../../i18n/translations';
import { Icon3D } from '../ui/Icon3D';
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Drawer,
  EmptyState,
  Modal,
  Skeleton,
  ToastNotification,
} from '../ui/DesignSystem';
import { Icon3DName, Locale, UserRoleCode } from '../../types';
import {
  SUPPORTED_AI_MODELS,
  SUPPORTED_VOICE_LANGUAGES,
} from '../../services/aiIntelligenceEngine';

// Logo officiel TradeLink (bascule automatique Thème Clair / Thème Noir, protégé contre l'inversion RTL)
export const BrandLogo: React.FC<{ variant?: 'horizontal' | 'full'; className?: string }> = ({
  variant = 'horizontal',
  className = 'h-10',
}) => {
  const { resolvedDark } = useApp();
  const src =
    variant === 'full'
      ? resolvedDark
        ? '/logos/logo-dark.png'
        : '/logos/logo-light.png'
      : resolvedDark
      ? '/logos/logo-dark-horizontal.png'
      : '/logos/logo-light-horizontal.png';

  return (
    <div className="inline-flex items-center gap-2.5 ltr-preserve select-none">
      <img
        src={src}
        alt="TradeLink™ Official Logo"
        className={`${className} w-auto object-contain rounded-lg transition-all duration-200`}
      />
    </div>
  );
};

interface NavItem {
  label: Record<Locale, string>;
  path: string;
  icon3d: Icon3DName;
  badge?: string;
}

export const ROLE_NAVIGATION: Record<UserRoleCode, NavItem[]> = {
  VISITEUR: [
    { label: { fr: 'Accueil Public', en: 'Public Home', ar: 'الرئيسية' }, path: '/', icon3d: 'global-reach' },
    { label: { fr: 'Inscription KYC', en: 'Register KYC', ar: 'التسجيل' }, path: '/register', icon3d: 'customs-stamp' },
  ],
  ADMIN: [
    { label: { fr: '1. Dashboard Admin', en: 'Admin Dashboard', ar: 'لوحة التحكم' }, path: '/admin/dashboard', icon3d: 'analytics' },
    { label: { fr: '2. Utilisateurs & Sessions', en: 'Users & Sessions', ar: 'المستخدمون والجلسات' }, path: '/admin/users', icon3d: 'fleet-keys' },
    { label: { fr: '3. Validation KYC (J+7)', en: 'KYC Validation (D+7)', ar: 'اعتماد KYC' }, path: '/admin/kyc', icon3d: 'customs-stamp', badge: '3' },
    { label: { fr: '4. Gestion Commerciale', en: 'Commercial Admin', ar: 'الإدارة التجارية' }, path: '/admin/commercial', icon3d: 'pallet-load' },
    { label: { fr: '5. Comptabilité & Finance', en: 'Finance & Accounts', ar: 'المالية والمحاسبة' }, path: '/admin/finance', icon3d: 'payment' },
    { label: { fr: '6. Logistique & Flotte', en: 'Logistics Overview', ar: 'إشراف اللوجستيات' }, path: '/admin/logistique', icon3d: 'route-map' },
    { label: { fr: '7. Config IA & OCR', en: 'AI & OCR Config', ar: 'إعدادات الذكاء الاصطناعي' }, path: '/admin/ai-config', icon3d: 'warehouse-robot' },
    { label: { fr: '8. Room Live Gouvernance', en: 'Room Live Governance', ar: 'غرف الاجتماعات' }, path: '/admin/room-live', icon3d: 'support' },
    { label: { fr: '9. Sécurité & Clés KMS', en: 'Security & KMS Keys', ar: 'الأمان ومفاتيح KMS' }, path: '/admin/security', icon3d: 'secure-parcel' },
    { label: { fr: 'Import Sandbox Isolée', en: 'SQL/BAK Sandbox Import', ar: 'استيراد معزول Sandbox' }, path: '/admin/import-export', icon3d: 'conveyor' },
    { label: { fr: 'Boutons Flottants', en: 'Floating Buttons', ar: 'الأزرار العائمة' }, path: '/admin/floating-buttons', icon3d: 'live-tracking' },
    { label: { fr: 'Audit Logs Immuables', en: 'Immutable Audit Logs', ar: 'سجل التدقيق' }, path: '/admin/audit', icon3d: 'checklist' },
    { label: { fr: 'Sauvegardes (2x Admin)', en: 'Backups (Dual Admin)', ar: 'النسخ الاحتياطي' }, path: '/admin/backups', icon3d: 'insured', badge: '2x' },
    { label: { fr: 'Rapports & Exports', en: 'Admin Reports', ar: 'التقارير' }, path: '/admin/reports', icon3d: 'invoice' },
    { label: { fr: '10. Paramètres Généraux', en: 'Platform Settings', ar: 'إعدادات المنصة' }, path: '/admin/parametres', icon3d: 'fleet-keys' },
  ],
  CLIENT: [
    { label: { fr: 'Dashboard Client', en: 'Client Dashboard', ar: 'لوحة العميل' }, path: '/client/dashboard', icon3d: 'analytics' },
    { label: { fr: 'Mon KYC (Échéance J+7)', en: 'My KYC (D+7 Timer)', ar: 'ملف التحقق KYC' }, path: '/client/kyc', icon3d: 'customs-stamp', badge: 'J+4' },
    { label: { fr: 'Catalogue B2B', en: 'B2B Catalog', ar: 'كتالوج المنتجات' }, path: '/client/catalogue', icon3d: 'pallet-load' },
    { label: { fr: 'Panier & Checkout', en: 'Cart & Checkout', ar: 'سلة المشتريات' }, path: '/client/panier', icon3d: 'hand-truck' },
    { label: { fr: 'Mes Commandes', en: 'My Orders', ar: 'طلباتي' }, path: '/client/commandes', icon3d: 'parcel-stack' },
    { label: { fr: 'Mes Devis', en: 'My Quotes', ar: 'عروض الأسعار' }, path: '/client/devis', icon3d: 'checklist' },
    { label: { fr: 'Factures & Paiements', en: 'Invoices & Payments', ar: 'الفواتير والمدفوعات' }, path: '/client/factures', icon3d: 'payment' },
    { label: { fr: 'Suivi Logistique', en: 'Logistics Tracking', ar: 'تتبع الشحنات' }, path: '/client/logistique', icon3d: 'route-map' },
    { label: { fr: 'Mes Documents & OCR', en: 'My Documents & OCR', ar: 'مستنداتي' }, path: '/client/documents', icon3d: 'scanner' },
    { label: { fr: 'Room Live (Invité)', en: 'Room Live (Invited)', ar: 'غرف الاجتماعات' }, path: '/client/room-live', icon3d: 'support' },
    { label: { fr: 'Paramètres', en: 'Settings', ar: 'الإعدادات' }, path: '/client/parametres', icon3d: 'fleet-keys' },
  ],
  FOURNISSEUR: [
    { label: { fr: 'Dashboard Fournisseur', en: 'Supplier Dashboard', ar: 'لوحة المورد' }, path: '/fournisseur/dashboard', icon3d: 'warehouse' },
    { label: { fr: 'Mon KYC Fournisseur', en: 'Supplier KYC', ar: 'تحقق المورد KYC' }, path: '/fournisseur/kyc', icon3d: 'customs-stamp' },
    { label: { fr: 'Catalogue & Création', en: 'Products Catalog', ar: 'إدارة المنتجات' }, path: '/fournisseur/catalogue', icon3d: 'shipping-label' },
    { label: { fr: 'Gestion des Stocks', en: 'Inventory & Stock', ar: 'المخزون والحركات' }, path: '/fournisseur/stocks', icon3d: 'shelving-rack' },
    { label: { fr: 'Commandes Reçues', en: 'Received Orders', ar: 'الطلبات الواردة' }, path: '/fournisseur/commandes', icon3d: 'forklift' },
    { label: { fr: 'Devis à Chiffrer', en: 'Quotes to Price', ar: 'عروض الأسعار' }, path: '/fournisseur/devis', icon3d: 'checklist' },
    { label: { fr: 'Factures & Bons', en: 'Issued Documents', ar: 'الفواتير الصادرة' }, path: '/fournisseur/documents', icon3d: 'invoice' },
    { label: { fr: 'Paiements Reçus', en: 'Received Payments', ar: 'المدفوعات المستلمة' }, path: '/fournisseur/paiements', icon3d: 'payment' },
    { label: { fr: 'Room Live (Créateur)', en: 'Room Live (Host)', ar: 'غرف الاجتماعات' }, path: '/fournisseur/room-live', icon3d: 'support' },
    { label: { fr: 'Paramètres', en: 'Settings', ar: 'الإعدادات' }, path: '/fournisseur/parametres', icon3d: 'fleet-keys' },
  ],
  TRANSPORTEUR: [
    { label: { fr: 'Dashboard Transporteur', en: 'Carrier Dashboard', ar: 'لوحة الناقل' }, path: '/transporteur/dashboard', icon3d: 'semi-truck' },
    { label: { fr: 'KYC Flotte & Assurance', en: 'Carrier KYC & Fleet', ar: 'وثائق الناقل KYC' }, path: '/transporteur/kyc', icon3d: 'customs-stamp' },
    { label: { fr: 'Missions & POD', en: 'Missions & POD', ar: 'المهام وإثبات التسليم' }, path: '/transporteur/missions', icon3d: 'proof-of-delivery' },
    { label: { fr: 'Carte des Expéditions', en: 'Shipments Map', ar: 'خريطة الشحنات' }, path: '/transporteur/expeditions', icon3d: 'route-map' },
    { label: { fr: 'Documents CMR / Douane', en: 'CMR & Customs Docs', ar: 'وثائق الشحن والجمارك' }, path: '/transporteur/documents', icon3d: 'shipping-label' },
    { label: { fr: 'Signalement Incidents', en: 'Incidents Reporting', ar: 'البلاغات والحوادث' }, path: '/transporteur/incidents', icon3d: 'hazardous-goods' },
    { label: { fr: 'Room Live Logistique', en: 'Logistics Room Live', ar: 'غرفة التنسيق المباشر' }, path: '/transporteur/room-live', icon3d: 'support' },
    { label: { fr: 'Paramètres Véhicules', en: 'Vehicle Settings', ar: 'إعدادات الأسطول' }, path: '/transporteur/parametres', icon3d: 'fuel' },
  ],
  COMPTABLE: [
    { label: { fr: 'Dashboard Comptable', en: 'Accounting Dashboard', ar: 'لوحة المحاسبة' }, path: '/comptable/dashboard', icon3d: 'analytics' },
    { label: { fr: 'Moteur de Calcul (ACT)', en: 'Financial Calc Engine', ar: 'محرك الحساب المالي' }, path: '/comptable/calcul', icon3d: 'weight-check', badge: 'Decimal' },
    { label: { fr: 'Factures (Lecture Seule)', en: 'Invoices (Read-Only)', ar: 'الفواتير (قراءة فقط)' }, path: '/comptable/factures', icon3d: 'invoice' },
    { label: { fr: 'Journaux Comptables', en: 'Accounting Journals', ar: 'اليوميات المحاسبية' }, path: '/comptable/journaux', icon3d: 'checklist' },
    { label: { fr: 'Grand Livre & Balance', en: 'General Ledger', ar: 'دفتر الأستاذ والميزان' }, path: '/comptable/grand-livre', icon3d: 'shelving-rack' },
    { label: { fr: 'Bilan & États Financiers', en: 'Financial Statements', ar: 'القوائم المالية' }, path: '/comptable/etats-financiers', icon3d: 'payment' },
    { label: { fr: 'Paramètres Référentiel', en: 'Chart Settings', ar: 'إعدادات المحاسبة' }, path: '/comptable/parametres', icon3d: 'fleet-keys' },
  ],
  SUPPORT: [
    { label: { fr: 'Dashboard Support', en: 'Support Dashboard', ar: 'لوحة الدعم الفني' }, path: '/support/dashboard', icon3d: 'support' },
    { label: { fr: 'Tickets & SLA', en: 'Tickets & SLA', ar: 'تذاكر الدعم' }, path: '/support/tickets', icon3d: 'mailbox', badge: '4' },
    { label: { fr: 'Room Live Assistance', en: 'Support Room Live', ar: 'غرفة الدعم المرئي' }, path: '/support/room-live', icon3d: 'live-tracking' },
    { label: { fr: 'Paramètres Support', en: 'Support Settings', ar: 'إعدادات الدعم' }, path: '/support/parametres', icon3d: 'fleet-keys' },
  ],
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    locale,
    setLocale,
    t,
    resolvedDark,
    toggleQuickTheme,
    uxPreviewState,
    setUxPreviewState,
    currentUser,
    switchUserAccount,
    cart,
    updateCartQuantity,
    removeFromCart,
    cartDrawerOpen,
    setCartDrawerOpen,
    notificationsList,
    floatingButtons,
    aiDrawerOpen,
    setAiDrawerOpen,
    voiceModalOpen,
    setVoiceModalOpen,
    toastMessage,
    notifyToast,
    aiThreads,
    activeAiThreadId,
    setActiveAiThreadId,
    selectedAiModelId,
    setSelectedAiModelId,
    sendAiAssistantQuery,
    createNewAiThread,
    aiQuota,
    activeVoiceLang,
    setActiveVoiceLang,
    voiceTranscript,
    setVoiceTranscript,
    isVoiceRecording,
    startVoiceDictation,
    stopVoiceDictation,
    speakVoiceText,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isAiSending, setIsAiSending] = useState(false);

  const activeThread = aiThreads.find((t) => t.id === activeAiThreadId) || aiThreads[0];

  const navItems = ROLE_NAVIGATION[currentUser.role] ?? ROLE_NAVIGATION.CLIENT;
  const unreadNotifCount = notificationsList.filter((n) => !n.isRead).length;

  const handleRoleSwitchAndNavigate = (userKey: keyof typeof DEMO_USERS) => {
    switchUserAccount(userKey);
    const targetRole = DEMO_USERS[userKey].role;
    const defaultPaths: Record<UserRoleCode, string> = {
      ADMIN: '/admin/dashboard',
      CLIENT: '/client/dashboard',
      FOURNISSEUR: '/fournisseur/dashboard',
      TRANSPORTEUR: '/transporteur/dashboard',
      COMPTABLE: '/comptable/dashboard',
      SUPPORT: '/support/dashboard',
      VISITEUR: '/',
    };
    navigate(defaultPaths[targetRole]);
  };

  // Fil d'Ariane dynamique à partir de l'URL active
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbItems = [
    { label: 'TRADELINK V6.0', to: '/' },
    ...pathSegments.map((seg, idx) => ({
      label: seg.toUpperCase(),
      to: '/' + pathSegments.slice(0, idx + 1).join('/'),
    })),
  ];

  const handleSendAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || isAiSending) return;
    const query = aiInput;
    setAiInput('');
    setIsAiSending(true);
    try {
      await sendAiAssistantQuery(query);
    } finally {
      setIsAiSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#071E21] text-slate-900 dark:text-slate-100">
      <ToastNotification toast={toastMessage} />

      {/* BARRE DE SIMULATION MULTI-RÔLES (Permet de tester les 6 rôles + Admin #2 en 1 clic) */}
      <div className="bg-[#062023] text-slate-200 border-b border-teal-800/80 px-4 py-2 text-xs">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#E85D22] text-white font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              SIMULATEUR RBAC V6.0
            </span>
            <span className="text-slate-400 hidden xl:inline">
              Testez les 6 espaces métier + la double validation Admin :
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: 'ADMIN_1', label: 'Admin #1 (Karim)' },
                { key: 'ADMIN_2', label: 'Admin #2 (Sophie - 2x Approb.)' },
                { key: 'CLIENT', label: 'Client B2B' },
                { key: 'FOURNISSEUR', label: 'Fournisseur' },
                { key: 'TRANSPORTEUR', label: 'Transporteur' },
                { key: 'COMPTABLE', label: 'Comptable (Lecture Seule)' },
                { key: 'SUPPORT', label: 'Support' },
              ] as const
            ).map((u) => {
              const active = currentUser.id === DEMO_USERS[u.key].id;
              return (
                <button
                  key={u.key}
                  type="button"
                  onClick={() => handleRoleSwitchAndNavigate(u.key)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    active
                      ? 'bg-[#E85D22] text-white shadow-sm ring-1 ring-orange-300'
                      : 'bg-teal-950/90 hover:bg-teal-900 text-slate-300 border border-teal-800/70'
                  }`}
                >
                  {u.label}
                </button>
              );
            })}
            <Link
              to="/"
              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold"
            >
              Landing Public ↗
            </Link>
          </div>
        </div>
      </div>

      {/* BANDEAU STATUT KYC (Composant 30 : KYCBanner) */}
      {(currentUser.role === 'CLIENT' ||
        currentUser.role === 'FOURNISSEUR' ||
        currentUser.role === 'TRANSPORTEUR') && (
        <div className="bg-gradient-to-r from-[#0B3438] via-[#12464B] to-[#0B3438] text-white px-4 py-2 border-b border-teal-700/60 text-xs">
          <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Icon3D name="customs-stamp" size="xs" />
              <span className="font-semibold">{t('kyc.banner.submitted_in_time')}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                Soumis à J+4 / Échéance J+7 protégée
              </span>
            </div>
            <Link
              to={
                currentUser.role === 'CLIENT'
                  ? '/client/kyc'
                  : currentUser.role === 'FOURNISSEUR'
                  ? '/fournisseur/kyc'
                  : '/transporteur/kyc'
              }
              className="underline font-semibold text-orange-300 hover:text-orange-200"
            >
              Consulter mon dossier KYC chiffré →
            </Link>
          </div>
        </div>
      )}

      {/* BANDEAU LECTURE SEULE STAGE 3 POUR COMPTABLE */}
      {currentUser.role === 'COMPTABLE' && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2">
            <span className="font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#E85D22]" />
              {t('compta.readonly.notice')}
            </span>
            <Link to="/comptable/calcul" className="font-bold underline">
              Ouvrir le Moteur de Calcul Decimal (ACT/365, ACT/360, ACT/ACT) →
            </Link>
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* OVERLAY MOBILE POUR SIDEBAR */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* SIDEBAR DYNAMIQUE PAR RÔLE (Composant 26) */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-y-0 inset-inline-start-0 z-40 flex' : 'hidden lg:flex'
          } w-72 flex-col bg-white dark:bg-[#09272A] border-e border-slate-200 dark:border-teal-800/70 shrink-0`}
        >
          <div className="p-4 border-b border-slate-200 dark:border-teal-800/70 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <BrandLogo variant="horizontal" className="h-11" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fermer le menu"
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-teal-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Carte Profil & Session Unique Redis avec Avatar (#19) */}
          <div className="p-4 mx-3 my-3 rounded-2xl bg-slate-100/80 dark:bg-[#0D353A] border border-slate-200/80 dark:border-teal-700/50">
            <div className="flex items-center gap-3">
              <Avatar initials={currentUser.avatarInitials} status="online" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300 truncate">
                  {currentUser.companyName}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-teal-800 flex items-center justify-between text-[11px]">
              <Badge variant="orange">{t(`role.${currentUser.role}`)}</Badge>
              <span
                className="font-mono text-emerald-700 dark:text-emerald-300 ltr-preserve"
                title="Session unique active (Redis)"
              >
                ● {currentUser.activeSessionId}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Navigation principale">
            {navItems.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-[#0B3438] text-white dark:bg-[#E85D22] dark:text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-teal-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon3D name={item.icon3d} size="sm" />
                    <span className="truncate">{item.label[locale]}</span>
                  </div>
                  {item.badge ? (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-orange-500/20 text-[#E85D22] dark:bg-white/20 dark:text-white">
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 opacity-40 rtl:rotate-180" />
                  )}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-teal-800/70">
              <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t('common.transversal')}
              </p>
              <Link
                to="/ocr-idp"
                onClick={() => setMobileMenuOpen(false)}
                className="group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-teal-900/50"
              >
                <Icon3D name="scanner" size="sm" />
                <span>{t('common.ocr_studio')}</span>
              </Link>
              <Link
                to="/room/room-01"
                onClick={() => setMobileMenuOpen(false)}
                className="group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-teal-900/50"
              >
                <Icon3D name="support" size="sm" />
                <span>{t('common.room_active')}</span>
              </Link>
              <Link
                to="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-teal-900/50"
              >
                <Icon3D name="mailbox" size="sm" />
                <span>{t('common.notifications')}</span>
              </Link>
            </div>
          </nav>

          {/* Footer Sidebar */}
          <div className="p-3 border-t border-slate-200 dark:border-teal-800/70">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-teal-900/60"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('common.auth_portal')}</span>
            </Link>
          </div>
        </aside>

        {/* CONTENU PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* TOPBAR (Composant 27 & 28) */}
          <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#09272A]/90 backdrop-blur-md border-b border-slate-200 dark:border-teal-800/70 px-4 lg:px-8 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Ouvrir le menu"
                  className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-teal-800"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#E85D22]">
                      {t('common.workspace')} {t(`role.${currentUser.role}`)}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('common.jurisdiction')} : {currentUser.jurisdiction}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 hidden sm:block">
                    {t('app.subtitle')}
                  </p>
                </div>
              </div>

              {/* Actions Topbar : Sélecteur d'État UX, Assistant IA, Dictée Vocale, FR/EN/AR, Thème, Panier Drawer, Notifications */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Sélecteur d'états UX (Normal / Skeleton / Vide / Erreur) */}
                <div
                  role="group"
                  aria-label="Simulateur d'états UX"
                  className="hidden xl:inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-teal-800 bg-slate-50 dark:bg-[#062023] px-2 py-1 text-[11px]"
                >
                  <Layers className="w-3.5 h-3.5 text-[#E85D22]" />
                  {(['normal', 'loading', 'empty', 'error'] as UXPreviewState[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setUxPreviewState(st)}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        uxPreviewState === st
                          ? 'bg-[#0B3438] text-white dark:bg-[#E85D22]'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      {t(`ux.state.${st}`)}
                    </button>
                  ))}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAiDrawerOpen(true)}
                  title="Ouvrir l’Assistant IA & RAG"
                >
                  <Bot className="w-4 h-4 text-[#E85D22]" />
                  <span className="hidden md:inline">{t('common.ai_assistant')}</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVoiceModalOpen(true)}
                  title="Dictée vocale multilingue STT"
                >
                  <Mic className="w-4 h-4 text-emerald-500" />
                  <span className="hidden md:inline">{t('common.voice_stt')}</span>
                </Button>

                {/* Sélecteur de langue FR / EN / AR (RTL réel) */}
                <div
                  role="group"
                  aria-label="Sélecteur de langue"
                  className="inline-flex items-center rounded-xl border border-slate-300 dark:border-teal-800 bg-slate-100 dark:bg-[#062023] p-0.5 text-xs font-bold"
                >
                  {(['fr', 'en', 'ar'] as const).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocale(loc)}
                      className={`px-2.5 py-1 rounded-lg uppercase transition-colors ${
                        locale === loc
                          ? 'bg-[#E85D22] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {loc === 'ar' ? 'عربي' : loc.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Bascule Thème Clair / Thème Noir (avec changement automatique du logo) */}
                <button
                  type="button"
                  onClick={toggleQuickTheme}
                  aria-label={resolvedDark ? 'Passer au thème clair' : 'Passer au thème noir'}
                  title={resolvedDark ? 'Thème Noir actif (Cliquer pour Thème Blanc)' : 'Thème Blanc actif (Cliquer pour Thème Noir)'}
                  className="p-2 rounded-xl border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0D353A] hover:border-[#E85D22] transition-colors"
                >
                  {resolvedDark ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-[#0B3438]" />
                  )}
                </button>

                {/* Bouton Panier Latéral (CartDrawer #43) */}
                <button
                  type="button"
                  onClick={() => setCartDrawerOpen(true)}
                  className="relative p-2 rounded-xl border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0D353A] hover:border-[#E85D22]"
                  title="Ouvrir le Panier Latéral (CartDrawer)"
                  aria-label="Ouvrir le panier"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1.5 -inset-inline-end-1.5 w-5 h-5 rounded-full bg-[#E85D22] text-white text-[10px] font-bold flex items-center justify-center">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </button>

                {/* Centre de Notifications */}
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-xl border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0D353A] hover:border-[#E85D22]"
                  title="Centre de Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1.5 -inset-inline-end-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotifCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </header>

          {/* CONTENU DE LA PAGE AVEC FIL D'ARIANE & GESTION DES ÉTATS UX (Skeleton / EmptyState / Error) */}
          <main className="flex-1 p-4 lg:p-8 max-w-[1600px] w-full mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Breadcrumb items={breadcrumbItems} />
              {uxPreviewState !== 'normal' && (
                <button
                  type="button"
                  onClick={() => setUxPreviewState('normal')}
                  className="text-xs font-bold text-[#E85D22] underline"
                >
                  Quitter le mode d’aperçu « {t(`ux.state.${uxPreviewState}`)} » →
                </button>
              )}
            </div>

            {uxPreviewState === 'loading' ? (
              <div className="space-y-4">
                <Skeleton rows={2} />
                <Skeleton rows={5} />
              </div>
            ) : uxPreviewState === 'empty' ? (
              <EmptyState
                title="Aucune donnée disponible dans cet état de prévisualisation"
                description="Cet écran démontre le composant EmptyState standardisé du Design System TradeLink V6.0 (Chapitre 5.1 #21)."
                actionLabel="Restaurer les données actives"
                onAction={() => setUxPreviewState('normal')}
              />
            ) : uxPreviewState === 'error' ? (
              <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200 space-y-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold">
                      Erreur de communication API simulée (Corrélation : corr-err-99201)
                    </h3>
                    <p className="text-xs opacity-80">
                      Conformément au chapitre 9.20, aucun secret ni stack trace interne n’est exposé à l’utilisateur.
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="primary" onClick={() => setUxPreviewState('normal')}>
                  Réessayer & Recharger les données
                </Button>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      {/* BOUTONS FLOTTANTS CONFIGURABLES (Composant 29 : FloatingButtons) */}
      <div className="fixed bottom-5 inset-inline-end-5 z-40 flex flex-col gap-2.5">
        {floatingButtons
          .filter((fb) => fb.isEnabled)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((fb) => (
            <button
              key={fb.id}
              type="button"
              onClick={() => {
                if (fb.code === 'AI_ASSISTANT') setAiDrawerOpen(true);
                else if (fb.code === 'VOICE_DICTATION') setVoiceModalOpen(true);
                else
                  notifyToast(
                    'Canal WhatsApp B2B ouvert (Consentement vérifié & Journalisé)',
                    'success'
                  );
              }}
              className="group flex items-center gap-2.5 ps-2.5 pe-4 py-2 rounded-2xl bg-white/95 dark:bg-[#0B3438]/95 text-slate-900 dark:text-white shadow-xl border border-slate-200 dark:border-teal-600/60 hover:border-[#E85D22] transition-all"
            >
              <Icon3D name={fb.icon3d} size="sm" />
              <span className="text-xs font-bold">{fb.label[locale]}</span>
            </button>
          ))}
      </div>

      {/* PANIER LATÉRAL (Composant 43 : CartDrawer) */}
      <Drawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        title="Panier Commercial B2B (Composant 43 : CartDrawer)"
        subtitle="Réservation automatique du stock & Calcul HT/TVA"
      >
        {cart.length === 0 ? (
          <EmptyState
            title="Votre panier B2B est vide"
            description="Parcourez le catalogue pour ajouter des équipements ou conteneurs."
            actionLabel="Aller au Catalogue"
            onAction={() => {
              setCartDrawerOpen(false);
              navigate('/client/catalogue');
            }}
          />
        ) : (
          <div className="space-y-4 text-xs">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0D353A] border border-slate-200 dark:border-teal-800 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Icon3D name={item.product.icon3d} size="sm" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {item.product.name[locale]}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">{item.product.sku}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    aria-label="Supprimer du panier"
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-teal-800/60">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.product.id, -1)}
                      aria-label="Diminuer la quantité"
                      className="p-1 rounded-lg border border-slate-300 dark:border-teal-700 hover:bg-slate-200 dark:hover:bg-teal-800"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold px-2">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.product.id, 1)}
                      aria-label="Augmenter la quantité"
                      className="p-1 rounded-lg border border-slate-300 dark:border-teal-700 hover:bg-slate-200 dark:hover:bg-teal-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-extrabold text-sm text-[#E85D22]">
                    {formatCurrency(
                      parseFloat(item.product.unitPrice) * item.quantity,
                      'EUR',
                      locale
                    )}
                  </span>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-slate-200 dark:border-teal-800 space-y-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('/client/checkout');
                }}
              >
                Passer au Checkout B2B →
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* PANNEAU LATÉRAL ASSISTANT IA & RAG FILTRÉ PAR RÔLE (Composant 34 : AssistantChat) */}
      <Drawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        title="Assistant IA TradeLink & RAG"
        subtitle={`Contexte filtré : Rôle ${currentUser.role} • ${currentUser.companyName}`}
      >
        <div className="flex flex-col h-full justify-between gap-4">
          <div className="space-y-4">
            {/* Barre de contrôle du modèle IA & Création de fil */}
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-teal-300 block mb-1">
                    Modèle d'Intelligence Artificielle :
                  </label>
                  <select
                    value={selectedAiModelId}
                    onChange={(e) => setSelectedAiModelId(e.target.value)}
                    aria-label="Sélectionner le modèle IA"
                    className="w-full text-xs rounded-xl bg-white dark:bg-[#062023] border border-slate-300 dark:border-teal-700 px-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#E85D22]"
                  >
                    {SUPPORTED_AI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.isLocal ? '🔒 Local Sovereign' : '☁️ Cloud'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="shrink-0 pt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => createNewAiThread()}
                    title="Ouvrir une nouvelle conversation"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nouveau
                  </Button>
                </div>
              </div>

              {/* Jauge de Quota et Rate Limit */}
              <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-teal-800/80">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-teal-300">Quota Journalier de Jetons :</span>
                  <span className="font-mono font-bold text-[#E85D22]">
                    {aiQuota.dailyTokensConsumed.toLocaleString()} / {aiQuota.dailyTokensLimit.toLocaleString()} ({Math.min(100, Math.round((aiQuota.dailyTokensConsumed / aiQuota.dailyTokensLimit) * 100))}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E85D22] transition-all duration-300"
                    style={{ width: `${Math.min(100, (aiQuota.dailyTokensConsumed / aiQuota.dailyTokensLimit) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Sélecteur de Fils de discussion */}
              {aiThreads.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pt-1 pb-0.5">
                  {aiThreads.map((th) => (
                    <button
                      key={th.id}
                      onClick={() => setActiveAiThreadId(th.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${
                        th.id === activeAiThreadId
                          ? 'bg-[#E85D22] text-white font-bold'
                          : 'bg-white dark:bg-[#062023] border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-slate-300 hover:border-[#E85D22]'
                      }`}
                    >
                      {th.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Liste des messages de la conversation */}
            <div className="space-y-3.5 max-h-[calc(100vh-360px)] overflow-y-auto pe-1">
              {activeThread.messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'USER'
                      ? 'bg-[#E85D22] text-white ms-8 shadow-sm'
                      : 'bg-slate-100 dark:bg-[#0E393E] text-slate-800 dark:text-slate-100 me-4 border border-slate-200 dark:border-teal-800 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75 mb-1.5">
                    <span className="font-bold">
                      {m.sender === 'USER' ? 'Vous' : `Assistant IA • ${m.modelUsed || 'RAG Engine'}`}
                    </span>
                    <span>{m.timestamp}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {/* Sources RAG avec badges de confiance */}
                  {m.ragSources && m.ragSources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-teal-700/60 space-y-1.5">
                      <p className="text-[10px] font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#E85D22]" />
                        Sources RAG Retenues (Contrôle RBAC {currentUser.role}) :
                      </p>
                      {m.ragSources.map((src, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-2 rounded-xl bg-white/60 dark:bg-black/30 border border-slate-200 dark:border-teal-800/80 text-[11px] space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{src.title}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                              {(src.confidence * 100).toFixed(1)}% RAG
                            </span>
                          </div>
                          <p className="text-[10px] opacity-80">{src.snippet}</p>
                          <p className="text-[9px] font-mono opacity-60">Réf : {src.referenceId}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isAiSending && (
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#0E393E] text-slate-800 dark:text-slate-100 me-4 border border-slate-200 dark:border-teal-800 flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#E85D22] animate-ping" />
                  <span className="italic">L'Assistant IA consulte l'index RAG et prépare la réponse...</span>
                </div>
              )}
            </div>
          </div>

          {/* Formulaire d'envoi avec bouton micro rapide intégré */}
          <form
            onSubmit={handleSendAi}
            className="pt-3 border-t border-slate-200 dark:border-teal-800 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Posez une question sur vos commandes, calculs, KYC..."
                className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#062023] ps-3 pe-9 py-2 text-xs focus:outline-none focus:border-[#E85D22]"
              />
              <button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                title="Dicter la question vocalement (FR/EN/AR)"
                aria-label="Dicter vocalement"
                className="absolute inset-inline-end-2 top-2 p-1 text-slate-500 hover:text-[#E85D22] transition-colors"
              >
                <Mic className="w-3.5 h-3.5 text-emerald-500" />
              </button>
            </div>
            <Button type="submit" size="sm" variant="primary" disabled={isAiSending || !aiInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Drawer>

      {/* MODAL DICTÉE VOCALE MULTILINGUE STT/TTS (Composants 35 & 36) */}
      <Modal
        open={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        title="Dictée Vocale Multilingue STT / TTS (FR • EN • AR)"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon3D name="support" size="md" />
              <div>
                <p className="text-sm font-bold">Consentement Microphone & Garde-Fous IA</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Transcription directe en mémoire sans conservation non autorisée. Aucune action critique n’est soumise sans validation humaine explicite.
                </p>
              </div>
            </div>
            <Badge variant="success">Consentement Actif</Badge>
          </div>

          {/* Sélecteur de langue trilingue avec RTL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
              Langue de Dictée STT / Synthèse TTS :
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_VOICE_LANGUAGES.map((vLang) => (
                <button
                  key={vLang.code}
                  type="button"
                  onClick={() => setActiveVoiceLang(vLang.code)}
                  className={`p-2.5 rounded-xl border text-xs text-center font-bold transition-all ${
                    activeVoiceLang === vLang.code
                      ? 'border-[#E85D22] bg-[#E85D22]/10 text-[#E85D22]'
                      : 'border-slate-200 dark:border-teal-800 bg-white dark:bg-[#062023] hover:border-[#E85D22]'
                  }`}
                >
                  <span className="text-sm me-1.5">{vLang.flag}</span>
                  <span>{vLang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Commandes audio STT et TTS avec indicateur de pulsation */}
          <div className="flex flex-wrap items-center justify-center gap-3 py-3 border-y border-slate-200 dark:border-teal-800">
            <Button
              variant={isVoiceRecording ? 'danger' : 'primary'}
              onClick={() => {
                if (isVoiceRecording) {
                  stopVoiceDictation();
                } else {
                  startVoiceDictation(activeVoiceLang);
                }
              }}
            >
              <Mic className="w-4 h-4" />
              {isVoiceRecording ? 'Arrêter l’enregistrement STT' : `Démarrer la dictée (${activeVoiceLang})`}
            </Button>
            <Button
              variant="secondary"
              onClick={() => speakVoiceText(voiceTranscript, activeVoiceLang)}
            >
              <Volume2 className="w-4 h-4 text-teal-500" />
              Écouter la Synthèse (TTS)
            </Button>
          </div>

          {/* Indicateur visuel d'ondes audio en cours d'enregistrement */}
          {isVoiceRecording && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-bold text-red-500">
                Microphone actif — Détection de la voix ({activeVoiceLang}) en continu...
              </span>
            </div>
          )}

          {/* Zone de texte de transcription éditable */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <label className="font-bold">
                Transcription temps réel (éditable avant validation) :
              </label>
              <span className="text-slate-500 font-mono text-[11px]">
                {voiceTranscript.trim().split(/\s+/).filter(Boolean).length} mots • {voiceTranscript.length} caractères
              </span>
            </div>
            <textarea
              rows={4}
              value={voiceTranscript}
              dir={activeVoiceLang === 'ar-SA' ? 'rtl' : 'ltr'}
              onChange={(e) => setVoiceTranscript(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-teal-800 bg-slate-50 dark:bg-[#062023] p-3 text-sm focus:outline-none focus:border-[#E85D22]"
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setVoiceModalOpen(false)}>
              Fermer
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(voiceTranscript);
                notifyToast('Texte transcrit copié dans le presse-papier !', 'info');
              }}
            >
              Copier le texte
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setAiInput(voiceTranscript);
                setVoiceModalOpen(false);
                setAiDrawerOpen(true);
              }}
            >
              <Sparkles className="w-4 h-4" />
              Envoyer vers l’Assistant IA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
