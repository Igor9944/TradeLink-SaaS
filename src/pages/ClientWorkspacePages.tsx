// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — ESPACE CLIENT COMPLET & SOUVERAIN (PAGES 23 À 39)
// 8 PILIERS : Dashboard, Catalogue & Comparateur, Panier & Commandes (Annulation),
// Suivi Logistique (GPS & Incidents), Factures & Documents, Assistant IA & STT,
// Room Live (Invité strict), Profil & Paramètres (Thème 3 États & KYC J+7).
// ============================================================================

import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ShoppingCart,
  Lock,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Heart,
  Scale,
  Download,
  AlertTriangle,
  Sparkles,
  Mic,
  MicOff,
  Send,
  FileCheck,
  X,
  Ban,
  QrCode,
  Building2,
  CreditCard,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, downloadDataExport } from '../i18n/translations';
import { ActorKycWorkspaceView } from '../components/kyc/KycModuleViews';
import { Icon3D } from '../components/ui/Icon3D';
import { InteractiveLogisticsMap } from '../components/logistics/InteractiveLogisticsMap';
import { CommercialDocumentViewerModal } from '../components/CommercialDocumentViewerModal';
import { INITIAL_SHIPMENT_WAYPOINTS } from '../services/logisticsEngine';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Drawer,
  Input,
  Modal,
  RadioGroup,
  SearchBar,
  Stepper,
} from '../components/ui/DesignSystem';
import { VoiceDictationButton } from '../components/voice/VoiceDictationButton';
import {
  ProductItem,
  ThemeMode,
  IncidentRecord,
  CartValidationResult,
  PaymentReceiptRecord,
  DisputeReason,
  PaymentProvider,
} from '../types';

export const ClientWorkspacePage: React.FC<{
  section:
    | 'dashboard'
    | 'kyc'
    | 'kyc-upload'
    | 'catalogue'
    | 'product-detail'
    | 'panier'
    | 'checkout'
    | 'commandes'
    | 'order-detail'
    | 'devis'
    | 'quote-new'
    | 'factures'
    | 'paiements'
    | 'logistique'
    | 'documents'
    | 'room-live'
    | 'parametres';
}> = ({ section }) => {
  const {
    locale,
    setLocale,
    theme,
    setTheme,
    currentUser,
    products,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    categories,
    catalogFavorites,
    toggleCatalogFavorite,
    comparisonProductIds,
    toggleComparisonProduct,
    clearComparison,
    orders,
    updateOrderStatus,
    createOrderFromCart,
    quotes,
    createQuote,
    convertQuoteToOrder,
    rejectQuote,
    invoices,
    payInvoice,
    payments,
    shipments,
    reportIncident,
    rooms,
    createRoomLive,
    sendAiAssistantQuery,
    isVoiceRecording,
    startVoiceDictation,
    stopVoiceDictation,
    voiceTranscript,
    notificationsList,
    notifyToast,
    disputes,
    paymentReceipts,
    validateCartServer,
    openOrderDispute,
    initiatePaymentMultiProvider,
    confirmPaymentTransaction,
    commercialDocuments,
    activeDocumentPreview,
    setActiveDocumentPreview,
    downloadCommercialDocumentPdfAction,
  } = useApp();

  const navigate = useNavigate();
  const params = useParams();

  // Filtrage strict Ownership Client : le client n'accède qu'à ses propres données
  const myOrders = orders.filter(
    (o) => o.clientId === currentUser.id || currentUser.role === 'ADMIN'
  );
  const myInvoices = invoices.filter(
    (i) => i.clientId === currentUser.id || currentUser.role === 'ADMIN'
  );
  const myCommercialDocuments = commercialDocuments.filter(
    (d) =>
      d.recipient.id === currentUser.id ||
      d.issuer.id === currentUser.id ||
      d.createdByUserId === currentUser.id ||
      currentUser.role === 'ADMIN'
  );
  const myQuotes = quotes.filter(
    (q) => q.clientId === currentUser.id || currentUser.role === 'ADMIN'
  );
  const myShipments = shipments.filter(
    (s) => s.clientId === currentUser.id || currentUser.role === 'ADMIN'
  );
  const myDisputes = disputes.filter(
    (d) => d.initiatorId === currentUser.id || currentUser.role === 'ADMIN'
  );
  const myReceipts = paymentReceipts.filter(
    (r) => r.clientId === currentUser.id || currentUser.role === 'ADMIN'
  );

  // États Catalogue & Filtres
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [incotermFilter, setIncotermFilter] = useState<string>('ALL');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const favorites = catalogFavorites;
  const toggleFavorite = toggleCatalogFavorite;
  const comparedProducts = products.filter((p) => comparisonProductIds.includes(p.id));
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = useState(false);
  const toggleCompare = (prod: ProductItem) => {
    toggleComparisonProduct(prod.id);
    setIsCompareDrawerOpen(true);
  };

  // États Cycle Commercial & Panier Multi-Devises
  const [cartCurrency, setCartCurrency] = useState<'EUR' | 'USD' | 'TND' | 'MAD'>('EUR');
  const [serverCartValidation, setServerCartValidation] = useState<CartValidationResult | null>(null);
  const [isValidatingCart, setIsValidatingCart] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('STRIPE');
  const [activePaymentSession, setActivePaymentSession] = useState<any>(null);
  const [viewingReceipt, setViewingReceipt] = useState<PaymentReceiptRecord | null>(null);

  // États Refus de Devis
  const [rejectQuoteModalOpen, setRejectQuoteModalOpen] = useState(false);
  const [quoteToRejectId, setQuoteToRejectId] = useState<string | null>(null);
  const [quoteRejectReason, setQuoteRejectReason] = useState('');

  // États Litige Commercial
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeOrderId, setDisputeOrderId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>('DAMAGED_GOODS');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeClaimedAmount, setDisputeClaimedAmount] = useState('150.00');

  // États Checkout & Commande
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [shippingAddr, setShippingAddr] = useState(
    'Zone Logistique Zenata, Quai B - Lot 14, Casablanca, Maroc'
  );
  const [cancelOrderTarget, setCancelOrderTarget] = useState<string | null>(null);

  // États Devis (RFQ)
  const [newQuoteDesc, setNewQuoteDesc] = useState('Conteneur Maritime 40HC Certifié CSC (x5)');
  const [newQuoteQty, setNewQuoteQty] = useState(5);
  const [newQuotePrice, setNewQuotePrice] = useState('3500.00');

  // États Signalement Incident Logistique
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentShipmentId, setIncidentShipmentId] = useState('');
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState<IncidentRecord['severity']>('MEDIUM');

  // États Assistant IA B2B Client
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<
    { sender: 'USER' | 'ASSISTANT'; text: string; sources?: string[] }[]
  >([
    {
      sender: 'ASSISTANT',
      text: 'Bonjour ! Je suis votre assistant B2B TradeLink. Je peux vous aider à identifier des équipements en stock, comparer des incoterms (DAP vs CIF), résumer vos commandes ou calculer les coûts logistiques.',
    },
  ]);

  // Sélection Produit / Commande active
  const selectedProduct =
    products.find((p) => p.id === params.id) ?? products[0];
  const similarProducts = products
    .filter((p) => p.id !== selectedProduct?.id)
    .slice(0, 3);
  const selectedOrder =
    myOrders.find((o) => o.id === params.id) ?? myOrders[0];

  // Calculs financiers du Panier
  const cartSubtotal = cart.reduce(
    (s, item) => s + parseFloat(item.product.unitPrice) * item.quantity,
    0
  );
  const cartTax = cartSubtotal * 0.2;
  const freightAmount = cart.length > 0 ? 650 : 0;
  const cartTotal = cartSubtotal + cartTax + freightAmount;

  // KPIs du Tableau de bord
  const ordersPendingCount = myOrders.filter((o) => o.status === 'PENDING').length;
  const ordersConfirmedCount = myOrders.filter((o) => o.status === 'ACCEPTED' || o.status === 'PREPARING').length;
  const ordersInTransitCount = myOrders.filter((o) => o.status === 'SHIPPED').length;
  const ordersCompletedCount = myOrders.filter((o) => o.status === 'DELIVERED').length;
  const unpaidInvoices = myInvoices.filter((i) => i.status !== 'PAID');
  const unpaidTotalAmount = unpaidInvoices.reduce(
    (acc, inv) => acc + parseFloat(inv.totalAmount || '0'),
    0
  );



  // Annulation de commande selon règles métier
  const handleConfirmCancelOrder = () => {
    if (!cancelOrderTarget) return;
    const target = myOrders.find((o) => o.id === cancelOrderTarget);
    if (!target) return;

    if (target.status === 'SHIPPED' || target.status === 'DELIVERED') {
      notifyToast(
        'Règle commerciale : L’annulation est impossible car la marchandise est déjà en transit maritime sous connaissement ou livrée.',
        'error'
      );
      setCancelOrderTarget(null);
      return;
    }

    updateOrderStatus(cancelOrderTarget, 'CANCELLED');
    notifyToast(
      `Commande ${target.orderNumber} annulée avec succès conformément aux conditions commerciales.`,
      'success'
    );
    setCancelOrderTarget(null);
  };

  // Soumission d'un signalement d'incident
  const handleSubmitIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentShipmentId || !incidentTitle.trim()) {
      notifyToast('Veuillez sélectionner une expédition et renseigner le motif.', 'warning');
      return;
    }
    reportIncident(incidentShipmentId, incidentTitle, incidentDescription, incidentSeverity);
    notifyToast(`Incident déclaré pour l'expédition ${incidentShipmentId}. Le transporteur et l'administration ont été notifiés.`, 'success');
    setIncidentModalOpen(false);
    setIncidentTitle('');
    setIncidentDescription('');
  };

  // Requête Assistant IA B2B
  const handleSendAiQuery = async (queryText?: string) => {
    const q = queryText || aiQuery;
    if (!q.trim() || aiLoading) return;
    const userMsg = q.trim();
    setAiQuery('');
    setAiMessages((prev) => [...prev, { sender: 'USER', text: userMsg }]);
    setAiLoading(true);

    try {
      const res = await sendAiAssistantQuery(userMsg);
      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'ASSISTANT',
          text: res.answer,
          sources: res.sources?.map((s) => `${s.title} (${s.domain})`),
        },
      ]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'ASSISTANT',
          text: 'Désolé, une erreur réseau temporaire est survenue lors du traitement de votre demande. Veuillez réessayer.',
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* EN-TÊTE ESPACE CLIENT & NAVIGATION MULTI-PAGES                       */}
      {/* ===================================================================== */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0B3438] via-[#104348] to-[#0B3438] text-white p-6 shadow-lg border border-teal-700/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Icon3D name="pallet-load" size="xl" withGlow />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="orange">ESPACE ACHETEUR B2B</Badge>
              <Badge variant="success">OWNERSHIP CLIENT CLOISONNÉ</Badge>
            </div>
            <h1 className="text-2xl font-extrabold mt-1">{currentUser.companyName}</h1>
            <p className="text-xs text-teal-200 mt-0.5">
              Contact acheteur : <strong>{currentUser.firstName} {currentUser.lastName}</strong> • Session : <code className="ltr-preserve">{currentUser.activeSessionId}</code>
            </p>
          </div>
        </div>

        {/* Liens de navigation directe */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { to: '/client/dashboard', label: '1. Dashboard' },
            { to: '/client/catalogue', label: '2. Catalogue B2B' },
            { to: '/client/panier', label: `3. Panier (${cart.reduce((s, i) => s + i.quantity, 0)})` },
            { to: '/client/commandes', label: `Commandes (${myOrders.length})` },
            { to: '/client/devis', label: `Devis (${myQuotes.length})` },
            { to: '/client/logistique', label: `4. Logistique GPS` },
            { to: '/client/factures', label: `5. Factures (${myInvoices.length})` },
            { to: '/client/documents', label: 'GED & OCR' },
            { to: '/client/room-live', label: '7. Room Live' },
            { to: '/client/parametres', label: '8. Paramètres' },
            { to: '/client/kyc', label: 'Mon KYC (J+7)' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                (section === 'dashboard' && l.to.includes('dashboard')) ||
                (section === 'catalogue' && l.to.includes('catalogue')) ||
                (section === 'panier' && l.to.includes('panier')) ||
                (section === 'commandes' && l.to.includes('commandes')) ||
                (section === 'devis' && l.to.includes('devis')) ||
                (section === 'logistique' && l.to.includes('logistique')) ||
                (section === 'factures' && l.to.includes('factures')) ||
                (section === 'documents' && l.to.includes('documents')) ||
                (section === 'room-live' && l.to.includes('room-live')) ||
                (section === 'parametres' && l.to.includes('parametres')) ||
                (section === 'kyc' && l.to.includes('kyc'))
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
      {/* 1. TABLEAU DE BORD CLIENT (/client/dashboard)                         */}
      {/* ===================================================================== */}
      {section === 'dashboard' && (
        <div className="space-y-6">
          {/* BANDEAU BIENVENUE & STATUT KYC PROTÉGÉ */}
          <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-teal-800 dark:text-teal-200 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Statut KYC Protégé : Dossier soumis dans les délais à J+2
              </span>
              <p className="text-slate-600 dark:text-slate-300">
                Conformément à la règle 7 jours, votre compte bénéficie d'une <strong>immunité légale contre toute suspension automatique</strong> en attendant l'instruction finale par notre équipe conformité.
              </p>
            </div>
            <Link to="/client/kyc">
              <Button size="sm" variant="secondary">Consulter mes Pièces KYC</Button>
            </Link>
          </div>

          {/* RÉSUMÉ DES COMMANDES (5 CARTES D'ÉTAT) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {[
              { label: 'Total Commandes', count: myOrders.length, sub: 'Historique d\'achats', icon: 'parcel-stack' as const, badge: 'orange' as const },
              { label: 'En attente', count: ordersPendingCount, sub: 'Validation fournisseur', icon: 'checklist' as const, badge: 'neutral' as const },
              { label: 'Confirmées', count: ordersConfirmedCount, sub: 'En préparation usine', icon: 'warehouse' as const, badge: 'info' as const },
              { label: 'En livraison', count: ordersInTransitCount, sub: 'En transit maritime/routier', icon: 'semi-truck' as const, badge: 'warning' as const },
              { label: 'Terminées', count: ordersCompletedCount, sub: 'Livrées & émargées', icon: 'proof-of-delivery' as const, badge: 'success' as const },
            ].map((k) => (
              <Card key={k.label} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{k.label}</p>
                    <p className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{k.count}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>
                  </div>
                  <Icon3D name={k.icon} size="md" withGlow />
                </div>
              </Card>
            ))}
          </div>

          {/* FACTURES IMPAYÉES & ACTION DIRECTE */}
          {unpaidInvoices.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-amber-800 dark:text-amber-300">
                    Facture(s) en attente de règlement : {formatCurrency(unpaidTotalAmount)} TTC
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    {unpaidInvoices.length} facture(s) émise(s) sous contrat cadre. Le règlement déclenche immédiatement le bon d'enlèvement transporteur.
                  </p>
                </div>
              </div>
              <Link to="/client/factures">
                <Button size="sm" variant="primary">Payer en Ligne via Stripe Escrow</Button>
              </Link>
            </div>
          )}

          {/* DERNIERS ACHATS & ACTIONS DIRECTES */}
          <Card
            title="Derniers Achats & Commandes B2B"
            subtitle="Suivi temps réel de vos commandes en cours"
            action={
              <Link to="/client/catalogue">
                <Button size="sm" variant="primary">+ Nouvelle Commande</Button>
              </Link>
            }
          >
            <DataTable
              caption="Liste des commandes récentes du client"
              keyExtractor={(o) => o.id}
              data={myOrders.slice(0, 5)}
              columns={[
                {
                  key: 'ref',
                  header: 'N° Commande',
                  isRowHeader: true,
                  render: (o) => (
                    <Link to={`/client/commandes/${o.id}`} className="font-mono font-bold text-[#E85D22] hover:underline">
                      {o.orderNumber}
                    </Link>
                  ),
                },
                {
                  key: 'supp',
                  header: 'Fournisseur',
                  render: (o) => <span className="text-xs font-semibold">{o.supplierName}</span>,
                },
                {
                  key: 'date',
                  header: 'Date',
                  render: (o) => <span className="font-mono text-xs text-slate-400">{o.createdAt}</span>,
                },
                {
                  key: 'total',
                  header: 'Montant TTC',
                  render: (o) => (
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(parseFloat(o.totalAmount))}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Statut',
                  render: (o) => (
                    <Badge
                      variant={
                        o.status === 'DELIVERED'
                          ? 'success'
                          : o.status === 'SHIPPED'
                          ? 'orange'
                          : o.status === 'CANCELLED'
                          ? 'danger'
                          : 'info'
                      }
                    >
                      {o.status}
                    </Badge>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Action',
                  render: (o) => (
                    <Link to={`/client/commandes/${o.id}`}>
                      <Button size="sm" variant="secondary">Timeline & Détails</Button>
                    </Link>
                  ),
                },
              ]}
            />
          </Card>

          {/* NOTIFICATIONS & ACTIVITÉS RÉCENTES DU CLIENT */}
          <div className="grid md:grid-cols-2 gap-6 text-xs">
            <Card title="Notifications & Alertes de Livraison">
              <div className="space-y-2.5">
                {notificationsList.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-start gap-3"
                  >
                    <Icon3D name={n.icon} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
                      </div>
                      <p className="text-slate-500 mt-0.5">{n.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Activités Récentes du Compte">
              <div className="space-y-2.5">
                {[
                  { text: 'Connexion sécurisée depuis Casablanca (Workstation Chrome)', time: 'Aujourd\'hui 10:14', icon: 'fleet-keys' as const },
                  { text: 'Connaissement e-CMR signé électroniquement pour SHP-2026-8819', time: 'Hier 16:30', icon: 'proof-of-delivery' as const },
                  { text: 'Règlement de 60 000,00 € consigné sur compte séquestre Stripe', time: '16 Nov 2026', icon: 'payment' as const },
                  { text: 'Devis négocié DEV-2026-004 validé et converti en commande', time: '15 Nov 2026', icon: 'checklist' as const },
                ].map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon3D name={act.icon} size="sm" />
                      <span className="text-slate-700 dark:text-slate-300">{act.text}</span>
                    </div>
                    <span className="font-mono text-slate-400 shrink-0">{act.time}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. CATALOGUE PRODUITS & COMPARATEUR (/client/catalogue)               */}
      {/* ===================================================================== */}
      {section === 'catalogue' && (
        <div className="space-y-6">
          {/* BARRE DE RECHERCHE INTELLIGENTE & FILTRES MULTICRITÈRES */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[280px]">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Recherche intelligente par mot-clé, SKU, équipement, Incoterm (DAP/CIF)..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Button
                  size="sm"
                  variant={showOnlyFavorites ? 'primary' : 'secondary'}
                  onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                >
                  <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-current' : ''}`} />
                  Mes Favoris ({favorites.length})
                </Button>

                <Button
                  size="sm"
                  variant={comparedProducts.length > 0 ? 'teal' : 'secondary'}
                  onClick={() => setIsCompareDrawerOpen(true)}
                >
                  <Scale className="w-3.5 h-3.5" />
                  Comparateur ({comparedProducts.length})
                </Button>

                <Link to="/client/panier">
                  <Button size="sm" variant="primary">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Panier ({cart.reduce((s, i) => s + i.quantity, 0)})
                  </Button>
                </Link>
              </div>
            </div>

            {/* FILTRES PAR CATÉGORIES & INCOTERMS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Catégorie de Produits :</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-semibold"
                >
                  <option value="ALL">Toutes les catégories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.name[locale] || c.name.fr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Incoterm International :</label>
                <select
                  value={incotermFilter}
                  onChange={(e) => setIncotermFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-semibold"
                >
                  <option value="ALL">Tous Incoterms</option>
                  <option value="DAP">DAP (Delivered At Place)</option>
                  <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                  <option value="FOB">FOB (Free On Board)</option>
                  <option value="EXW">EXW (Ex Works Usine)</option>
                </select>
              </div>

              <div className="flex items-end">
                <p className="text-[11px] text-slate-500 pb-2">
                  Affichage de <strong>{products.length}</strong> références d'équipements certifiés.
                </p>
              </div>
            </div>
          </div>

          {/* GRILLE DES PRODUITS DU CATALOGUE */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products
              .filter((p) => {
                const matchSearch =
                  p.name[locale]?.toLowerCase().includes(search.toLowerCase()) ||
                  p.name.fr.toLowerCase().includes(search.toLowerCase()) ||
                  p.sku.toLowerCase().includes(search.toLowerCase()) ||
                  p.category.toLowerCase().includes(search.toLowerCase());
                const matchCategory =
                  categoryFilter === 'ALL' || p.category.includes(categoryFilter);
                const matchIncoterm =
                  incotermFilter === 'ALL' || p.incoterm === incotermFilter;
                const matchFavorite = !showOnlyFavorites || favorites.includes(p.id);
                return matchSearch && matchCategory && matchIncoterm && matchFavorite;
              })
              .map((prod) => {
                const isFav = favorites.includes(prod.id);
                const isCompared = comparedProducts.some((cp) => cp.id === prod.id);

                return (
                  <Card key={prod.id} className="flex flex-col justify-between hover:border-[#E85D22] transition-all">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <Icon3D name={prod.icon3d} size="xl" withGlow />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleFavorite(prod.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isFav
                                ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                : 'bg-slate-100 dark:bg-teal-900/60 border-slate-200 dark:border-teal-800 text-slate-400 hover:text-red-500'
                            }`}
                            title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                          >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleCompare(prod)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isCompared
                                ? 'bg-[#E85D22]/10 border-[#E85D22]/30 text-[#E85D22]'
                                : 'bg-slate-100 dark:bg-teal-900/60 border-slate-200 dark:border-teal-800 text-slate-400 hover:text-[#E85D22]'
                            }`}
                            title={isCompared ? 'Retirer du comparateur' : 'Comparer ce produit'}
                          >
                            <Scale className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#E85D22]">{prod.category}</span>
                          <Badge variant="orange">{prod.incoterm}</Badge>
                        </div>
                        <Link
                          to={`/client/catalogue/${prod.id}`}
                          className="block text-base font-bold mt-1 text-slate-900 dark:text-white hover:text-[#E85D22]"
                        >
                          {prod.name[locale] || prod.name.fr}
                        </Link>
                        <p className="text-xs text-slate-500 mt-0.5">Fournisseur : {prod.supplierName}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                          {prod.description[locale] || prod.description.fr}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-teal-800/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-black text-slate-900 dark:text-white">
                            {formatCurrency(parseFloat(prod.unitPrice))}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            HT / {prod.unit} • En stock : <strong className="text-emerald-600 dark:text-emerald-400">{prod.stockAvailable}</strong>
                          </p>
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                            MOQ min. : {prod.minOrderQuantity || 1} {prod.unit}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <Link to={`/client/catalogue/${prod.id}`}>
                            <Button size="sm" variant="secondary">Détails</Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              addToCart(prod, prod.minOrderQuantity || 1);
                            }}
                          >
                            + Panier
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>

          {/* TIROIR DU COMPARATEUR DE PRODUITS B2B */}
          <Drawer
            open={isCompareDrawerOpen}
            onClose={() => setIsCompareDrawerOpen(false)}
            title={`Comparateur de Produits B2B (${comparedProducts.length}/4)`}
            subtitle="Analyse comparative côte-à-côte des spécifications et coûts logistiques"
          >
            {comparedProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <Scale className="w-8 h-8 mx-auto text-slate-400" />
                <p>Aucun produit sélectionné pour comparaison.</p>
                <p className="text-[11px]">Cliquez sur l'icône balance sur les fiches produits du catalogue.</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  {comparedProducts.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2 relative"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCompare(p)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <Icon3D name={p.icon3d} size="md" />
                      <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{p.name[locale] || p.name.fr}</p>
                      <p className="font-mono text-xs text-[#E85D22] font-extrabold">{formatCurrency(parseFloat(p.unitPrice))}</p>
                      <div className="space-y-1 text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-teal-800">
                        <p>Stock : <strong>{p.stockAvailable} {p.unit}</strong></p>
                        <p>Incoterm : <Badge variant="neutral">{p.incoterm}</Badge></p>
                        <p>Origine : {p.originCountry}</p>
                        <p>Délai : {p.leadTimeDays} jours</p>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full mt-2"
                        onClick={() => {
                          addToCart(p, 1);
                          notifyToast(`${p.name[locale] || p.name.fr} ajouté au panier !`, 'success');
                        }}
                      >
                        Ajouter Panier
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-teal-800">
                  <Button size="sm" variant="secondary" onClick={() => clearComparison()}>
                    Réinitialiser
                  </Button>
                  <Button size="sm" variant="teal" onClick={() => setIsCompareDrawerOpen(false)}>
                    Fermer Comparateur
                  </Button>
                </div>
              </div>
            )}
          </Drawer>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2B. FICHE PRODUIT DÉTAILLÉE (/client/catalogue/:id)                   */}
      {/* ===================================================================== */}
      {section === 'product-detail' && (
        <div className="space-y-6">
          <Card
            title={`Fiche Produit B2B : ${selectedProduct.name[locale] || selectedProduct.name.fr}`}
            subtitle={`SKU : ${selectedProduct.sku} • Fournisseur : ${selectedProduct.supplierName} • Origine : ${selectedProduct.originCountry}`}
            action={
              <Link to="/client/catalogue">
                <Button size="sm" variant="secondary">← Retour Catalogue</Button>
              </Link>
            }
          >
            <div className="grid md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-5 flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-4">
                <Icon3D name={selectedProduct.icon3d} size="2xl" withGlow />
                <div className="flex items-center gap-2">
                  <Badge variant="orange">{selectedProduct.incoterm}</Badge>
                  <Badge variant="info">Origine {selectedProduct.originCountry}</Badge>
                  <Badge variant="success">Norme ISO / CSC</Badge>
                </div>
              </div>

              <div className="md:col-span-7 space-y-4 text-xs">
                <div>
                  <span className="text-xs font-bold text-[#E85D22] uppercase tracking-wide">
                    {selectedProduct.category}
                  </span>
                  <h2 className="text-xl font-black mt-1 text-slate-900 dark:text-white">
                    {selectedProduct.name[locale] || selectedProduct.name.fr}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300 mt-2 leading-relaxed text-sm">
                    {selectedProduct.description[locale] || selectedProduct.description.fr}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                  <div>
                    <span className="text-slate-400 font-medium">Prix Unitaire HT</span>
                    <p className="text-xl font-black text-[#E85D22] mt-0.5">
                      {formatCurrency(parseFloat(selectedProduct.unitPrice))}
                    </p>
                    <p className="text-[10px] text-slate-400">TVA 20% applicable</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Stock Disponible</span>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {selectedProduct.stockAvailable} {selectedProduct.unit}
                    </p>
                    <p className="text-[10px] text-slate-400">Réservé : {selectedProduct.stockReserved}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Délai d’Expédition</span>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedProduct.leadTimeDays} Jours
                    </p>
                    <p className="text-[10px] text-slate-400">Fret direct assuré</p>
                  </div>
                </div>

                {/* CARACTÉRISTIQUES TECHNIQUES */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">Spécifications & Conformité Industrielle :</h4>
                  <ul className="grid sm:grid-cols-2 gap-1.5 text-slate-600 dark:text-slate-300 text-[11px]">
                    <li>• Poids unitaire : 240 kg brut</li>
                    <li>• Certificat de traçabilité matière 3.1 fourni</li>
                    <li>• Compatible chaîne logistique sous température dirigée</li>
                    <li>• Emballage maritime NIMP15 pour conteneurisation</li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => {
                      addToCart(selectedProduct, 1);
                      notifyToast(`${selectedProduct.name[locale] || selectedProduct.name.fr} ajouté à votre panier !`, 'success');
                    }}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Ajouter au Panier B2B
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => toggleCompare(selectedProduct)}
                  >
                    <Scale className="w-4 h-4" />
                    Comparer ce Produit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => toggleFavorite(selectedProduct.id)}
                  >
                    <Heart className={`w-4 h-4 ${favorites.includes(selectedProduct.id) ? 'fill-current text-red-500' : ''}`} />
                    {favorites.includes(selectedProduct.id) ? 'Favori' : 'Ajouter aux Favoris'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* PRODUITS SIMILAIRES */}
          <Card title="Produits Similaires Recommandés (Même Chaîne d'Approvisionnement)">
            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              {similarProducts.map((sp) => (
                <div
                  key={sp.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon3D name={sp.icon3d} size="md" withGlow />
                    <div>
                      <Link to={`/client/catalogue/${sp.id}`} className="font-bold text-slate-900 dark:text-white hover:text-[#E85D22]">
                        {sp.name[locale] || sp.name.fr}
                      </Link>
                      <p className="text-slate-500 font-mono mt-0.5">{formatCurrency(parseFloat(sp.unitPrice))}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      addToCart(sp, 1);
                      notifyToast(`${sp.name[locale] || sp.name.fr} ajouté au panier !`, 'success');
                    }}
                  >
                    +
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. PANIER COMMERCIAL B2B (/client/panier)                             */}
      {/* ===================================================================== */}
      {section === 'panier' && (
        <Card
          title="Mon Panier Commercial B2B"
          subtitle="Vérification serveur stricte des stocks, calculs déterministes et gestion multi-devises (EUR / USD / TND / MAD)"
          action={
            <div className="flex items-center gap-2">
              <select
                value={cartCurrency}
                onChange={(e) => {
                  const newCurr = e.target.value as any;
                  setCartCurrency(newCurr);
                  setServerCartValidation(null);
                }}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-bold"
                title="Sélectionner la devise commerciale"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="TND">TND (DT)</option>
                <option value="MAD">MAD (DH)</option>
              </select>
              <Link to="/client/checkout">
                <Button size="sm" variant="primary" disabled={cart.length === 0}>
                  Procéder au Checkout →
                </Button>
              </Link>
            </div>
          }
        >
          {cart.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Icon3D name="hand-truck" size="xl" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Votre panier B2B est actuellement vide.</p>
              <Link to="/client/catalogue">
                <Button variant="primary">Explorer le Catalogue B2B</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* BANDEAU DE VALIDATION SERVEUR DES PRIX ET DES STOCKS */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Contrôle Serveur Zéro-Confiance :
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Validation temps réel des seuils MOQ, des stocks disponibles et calcul des taxes douanières.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isValidatingCart}
                  onClick={() => {
                    setIsValidatingCart(true);
                    const res = validateCartServer();
                    setServerCartValidation(res);
                    setIsValidatingCart(false);
                    if (res.valid) {
                      notifyToast('Contrôle serveur validé : Stocks confirmés et prix garantis !', 'success');
                    } else {
                      notifyToast('Attention : Des ajustements ou ruptures ont été signalés par le serveur.', 'warning');
                    }
                  }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isValidatingCart ? 'animate-spin' : ''}`} />
                  Vérifier Validité & Stocks Serveur
                </Button>
              </div>

              {/* ALERTES SERVEUR LE CAS ÉCHÉANT */}
              {serverCartValidation && !serverCartValidation.valid && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    Alertes de disponibilité commerciale :
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
                    {serverCartValidation.warnings.map((anom: string, idx: number) => (
                      <li key={idx}>{anom}</li>
                    ))}
                  </ul>
                </div>
              )}

              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Icon3D name={item.product.icon3d} size="md" withGlow />
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.product.name[locale] || item.product.name.fr}
                      </p>
                      <p className="text-slate-500 font-mono">
                        SKU : {item.product.sku} • Prix de base : {formatCurrency(parseFloat(item.product.unitPrice))} HT / {item.product.unit}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="inline-flex items-center gap-2 bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 rounded-xl px-2.5 py-1">
                      <button
                        type="button"
                        onClick={() => {
                          updateCartQuantity(item.product.id, -1);
                          setServerCartValidation(null);
                        }}
                        className="p-1 hover:text-[#E85D22]"
                        title="Diminuer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold px-2">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => {
                          updateCartQuantity(item.product.id, 1);
                          setServerCartValidation(null);
                        }}
                        className="p-1 hover:text-[#E85D22]"
                        title="Augmenter"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-black text-sm text-slate-900 dark:text-white min-w-[90px] text-end font-mono">
                      {formatCurrency(parseFloat(item.product.unitPrice) * item.quantity)}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        removeFromCart(item.product.id);
                        setServerCartValidation(null);
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                      title="Retirer l'article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="p-4 rounded-2xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sous-total HT :</span>
                  <span className="font-mono font-bold">
                    {serverCartValidation
                      ? `${serverCartValidation.subtotalAmount} ${serverCartValidation.currency}`
                      : formatCurrency(cartSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TVA Déductible ({serverCartValidation ? `${serverCartValidation.taxRatePct}%` : '20%'}) :</span>
                  <span className="font-mono">
                    {serverCartValidation
                      ? `${serverCartValidation.taxAmount} ${serverCartValidation.currency}`
                      : formatCurrency(cartTax)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Frais de Fret Multimodal Estimés :</span>
                  <span className="font-mono">
                    {serverCartValidation
                      ? `${serverCartValidation.shippingAmount} ${serverCartValidation.currency}`
                      : formatCurrency(freightAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black pt-2 border-t border-slate-200 dark:border-teal-800 text-[#E85D22]">
                  <span>Total TTC Déterminé :</span>
                  <span className="font-mono">
                    {serverCartValidation
                      ? `${serverCartValidation.totalAmount} ${serverCartValidation.currency}`
                      : formatCurrency(cartTotal)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-3 pt-2">
                <Link to="/client/devis/nouveau">
                  <Button variant="secondary">Demander un Devis Formalisé sur ce Panier</Button>
                </Link>
                <Link to="/client/checkout">
                  <Button variant="primary" size="lg">
                    Passer au Checkout ({formatCurrency(cartTotal)} TTC) →
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 3B. CHECKOUT VALIDATION & STEPPER (/client/checkout)                  */}
      {/* ===================================================================== */}
      {section === 'checkout' && (
        <Card
          title="Passage de Commande B2B — Validation & Séquestre Escrow"
          subtitle="Validation sécurisée avec clé d'idempotence et réservation immédiate des stocks usine"
        >
          <div className="space-y-6">
            <Stepper
              currentStepIndex={checkoutStep}
              onStepClick={setCheckoutStep}
              steps={[
                { id: 'addr', label: '1. Destination & Entrepôt', description: 'Adresse logistique' },
                { id: 'mode', label: '2. Transport Multimodal', description: 'Routier ATP / Maritime' },
                { id: 'pay', label: '3. Règlement Sécurisé', description: 'Stripe Escrow / SWIFT' },
              ]}
            />

            <div className="grid md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Adresse de Livraison / Entrepôt Réceptionnaire :
                  </label>
                  <input
                    type="text"
                    value={shippingAddr}
                    onChange={(e) => setShippingAddr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Prestataire de Paiement Sécurisé (Multi-Providers) :
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        id: 'STRIPE' as PaymentProvider,
                        title: 'Stripe B2B Séquestre Escrow',
                        sub: 'Cartes bancaires internationales, 3D-Secure 2.0 & séquestre automatisé',
                        icon: CreditCard,
                      },
                      {
                        id: 'KONNECT' as PaymentProvider,
                        title: 'Konnect Passerelle Maghreb',
                        sub: 'Règlement direct dinars tunisiens (TND) ou multidevises Maghreb',
                        icon: Building2,
                      },
                      {
                        id: 'FLOUCI' as PaymentProvider,
                        title: 'Flouci Wallet Mobile B2B',
                        sub: 'Paiement instantané par QR Code et signature mobile souveraine',
                        icon: QrCode,
                      },
                      {
                        id: 'CMI' as PaymentProvider,
                        title: 'CMI — Centre Monétique Interbancaire Maroc',
                        sub: 'Cartes bancaires marocaines & internationales en dirhams (MAD)',
                        icon: CreditCard,
                      },
                      {
                        id: 'WIRE_TRANSFER' as PaymentProvider,
                        title: 'Virement B2B avec IBAN Virtuel Dédié',
                        sub: 'Attribution d’un IBAN virtuel unique TradeLink pour rapprochement automatique sous 24h',
                        icon: Building2,
                      },
                    ].map((p) => {
                      const IconComp = p.icon;
                      const isSelected = selectedProvider === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedProvider(p.id);
                            setCheckoutStep(2);
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'border-[#E85D22] bg-[#E85D22]/10 ring-1 ring-[#E85D22]'
                              : 'border-slate-200 dark:border-teal-800 bg-white dark:bg-[#071E22] hover:border-slate-300'
                          }`}
                        >
                          <IconComp className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-[#E85D22]' : 'text-slate-400'}`} />
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 dark:text-white">{p.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{p.sub}</p>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#E85D22] shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                <p className="font-bold text-sm text-slate-900 dark:text-white">Récapitulatif Financier Contractuel</p>
                <div className="space-y-1.5 border-b border-slate-200 dark:border-teal-800 pb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Articles ({cart.length}) :</span>
                    <strong className="font-mono">{formatCurrency(cartSubtotal)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">TVA (20%) :</span>
                    <strong className="font-mono">{formatCurrency(cartTax)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fret & Assurance Maritime :</span>
                    <strong className="font-mono">{formatCurrency(freightAmount)}</strong>
                  </div>
                </div>

                <div className="flex justify-between text-base font-black text-[#E85D22]">
                  <span>Total TTC Définitif :</span>
                  <span className="font-mono">{formatCurrency(cartTotal)}</span>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-4"
                  disabled={cart.length === 0}
                  onClick={() => {
                    const created = createOrderFromCart(shippingAddr, selectedProvider);
                    if (created) {
                      const session = initiatePaymentMultiProvider(created.id, selectedProvider, 'EUR');
                      setActivePaymentSession(session);
                      notifyToast(`Commande ${created.orderNumber} enregistrée ! Session de paiement ${selectedProvider} initialisée.`, 'success');
                      if (session?.checkoutUrl) {
                        navigate(`/client/commandes/${created.id}`);
                      }
                    }
                  }}
                >
                  <Lock className="w-4 h-4" />
                  Valider et Initier le Règlement ({formatCurrency(cartTotal)})
                </Button>

                {activePaymentSession && (
                  <div className="mt-4 p-4 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Session {activePaymentSession.provider} active
                    </div>
                    {activePaymentSession.qrCodeData && (
                      <div className="text-center py-2 space-y-2">
                        <div className="inline-block p-3 bg-white rounded-lg border border-slate-300">
                          <QrCode className="w-24 h-24 text-slate-800 mx-auto" />
                        </div>
                        <p className="text-[11px] font-mono text-slate-500">Scannez avec votre application Flouci B2B</p>
                      </div>
                    )}
                    {activePaymentSession.virtualIban && (
                      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono space-y-1">
                        <p><strong>IBAN Virtuel :</strong> {activePaymentSession.virtualIban}</p>
                        <p><strong>Réf Virement :</strong> {activePaymentSession.sessionId}</p>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        confirmPaymentTransaction(activePaymentSession.sessionId, `tx_manual_${Date.now()}`);
                        notifyToast('Règlement validé avec succès ! Quittance certifiée générée.', 'success');
                        setActivePaymentSession(null);
                      }}
                    >
                      Confirmer le Règlement & Obtenir la Quittance
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* COMMENTAIRES & ÉVALUATION CLIENT DE LA COMMANDE */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-slate-400">
                  Commentaires, Instructions & Avis sur la Commande :
                </p>
                <VoiceDictationButton
                  onTranscript={(t) => {
                    notifyToast(`Commentaire dicté : "${t}"`, 'info');
                  }}
                  size="sm"
                />
              </div>
              <textarea
                rows={2}
                placeholder="Ajouter une instruction de livraison, un commentaire de réception ou une remarque qualité..."
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
              />
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 3C. MES COMMANDES B2B (/client/commandes)                             */}
      {/* ===================================================================== */}
      {section === 'commandes' && (
        <Card
          title="Mes Commandes B2B & Suivi Contractuel"
          subtitle="Historique de vos commandes d'achat avec traçabilité complète"
        >
          <div className="space-y-3">
            {myOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/client/commandes/${ord.id}`} className="text-sm font-bold text-[#E85D22] hover:underline font-mono">
                      {ord.orderNumber}
                    </Link>
                    <Badge
                      variant={
                        ord.status === 'DELIVERED'
                          ? 'success'
                          : ord.status === 'SHIPPED'
                          ? 'orange'
                          : ord.status === 'CANCELLED'
                          ? 'danger'
                          : 'info'
                      }
                    >
                      {ord.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-slate-500">
                    Fournisseur : <strong>{ord.supplierName}</strong> • Date : {ord.createdAt}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                    {formatCurrency(parseFloat(ord.totalAmount))}
                  </span>
                  <Link to={`/client/commandes/${ord.id}`}>
                    <Button size="sm" variant="secondary">Détail & Timeline</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 3D. DÉTAIL COMMANDE & ANNULATION (/client/commandes/:id)              */}
      {/* ===================================================================== */}
      {section === 'order-detail' && (
        <Card
          title={`Commande ${selectedOrder.orderNumber}`}
          subtitle={`Fournisseur : ${selectedOrder.supplierName} • Destination : ${selectedOrder.shippingAddress}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {/* BOUTON SIGNALEMENT DE LITIGE COMMERCIAL */}
              {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'REFUSED' && selectedOrder.status !== 'DISPUTED' && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-amber-600 hover:text-amber-700"
                  onClick={() => {
                    setDisputeOrderId(selectedOrder.id);
                    setDisputeClaimedAmount(selectedOrder.totalAmount);
                    setDisputeModalOpen(true);
                  }}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  Signaler un Litige
                </Button>
              )}

              {/* RÈGLE D'ANNULATION MÉTIER */}
              {selectedOrder.status === 'PENDING' || selectedOrder.status === 'PENDING_VALIDATION' || selectedOrder.status === 'ACCEPTED' ? (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setCancelOrderTarget(selectedOrder.id)}
                >
                  <Ban className="w-3.5 h-3.5" />
                  Annuler la Commande
                </Button>
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  (Annulation verrouillée : marchandise en acheminement ou engagée)
                </span>
              )}

              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  downloadDataExport(
                    `bon_commande_${selectedOrder.orderNumber}.json`,
                    JSON.stringify(selectedOrder, null, 2),
                    'application/json'
                  );
                  notifyToast(`Bon de commande ${selectedOrder.orderNumber} téléchargé !`, 'success');
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Bon de Commande (PDF/JSON)
              </Button>

              <Link to="/client/commandes">
                <Button size="sm" variant="secondary">← Retour Commandes</Button>
              </Link>
            </div>
          }
        >
          <div className="space-y-6">
            {/* ARTICLES DE LA COMMANDE */}
            <div className="grid sm:grid-cols-2 gap-3">
              {selectedOrder.items.map((it) => (
                <div
                  key={it.sku}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Icon3D name={it.icon3d} size="sm" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{it.name}</p>
                      <p className="text-slate-400 font-mono text-[11px]">
                        SKU: {it.sku} • Qté: {it.quantity} × {formatCurrency(parseFloat(it.unitPrice))}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(parseFloat(it.totalLine))}
                  </span>
                </div>
              ))}
            </div>

            {/* BANDEAU LITIGE COMMERCIAL SI OUVERT */}
            {(selectedOrder.status === 'DISPUTED' || myDisputes.some((d) => d.orderId === selectedOrder.id)) && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="w-5 h-5" />
                    Litige Commercial en Cours d'Instruction :
                  </div>
                  <Badge variant="warning">
                    {myDisputes.find((d) => d.orderId === selectedOrder.id)?.status || 'EN_ARBITRAGE'}
                  </Badge>
                </div>
                {myDisputes.filter((d) => d.orderId === selectedOrder.id).map((disp) => (
                  <div key={disp.id} className="p-3 rounded-xl bg-white dark:bg-[#071E22] border border-amber-500/20 space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-white">
                      Motif : <span className="font-mono text-[#E85D22]">{disp.reason}</span> • N° Dossier : <span className="font-mono font-bold">{disp.disputeNumber}</span>
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 italic text-[11px]">« {disp.description} »</p>
                    {disp.resolution && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Arbitrage Admin : {disp.resolution} (Action : {disp.arbitrationAction || 'EN_ATTENTE'})
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TIMELINE DE SUIVI DU CYCLE COMMERCIAL COMPLET EN 9 ÉTAPES */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-slate-400">
                  Cycle Commercial TRADELINK (9 Étapes Déterministes) :
                </p>
                <Badge variant={selectedOrder.status === 'COMPLETED' ? 'success' : selectedOrder.status === 'DISPUTED' ? 'warning' : 'info'}>
                  Statut : {selectedOrder.status}
                </Badge>
              </div>

              {/* GRILLE DES 9 ÉTAPES DU WORKFLOW */}
              <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 text-xs">
                {[
                  { key: 'PANIER', label: '1. Panier' },
                  { key: 'DEVIS', label: '2. Devis' },
                  { key: 'VALIDATION', label: '3. Validé' },
                  { key: 'COMMANDE', label: '4. Commande' },
                  { key: 'CONFIRMATION', label: '5. Stock' },
                  { key: 'PREPARATION', label: '6. Usine' },
                  { key: 'EXPEDITION', label: '7. Fret' },
                  { key: 'LIVRAISON', label: '8. Livré' },
                  { key: 'CLOTURE', label: '9. Clôturé' },
                ].map((step, idx) => {
                  const statusOrder = [
                    'DRAFT',
                    'PENDING',
                    'PENDING_VALIDATION',
                    'ACCEPTED',
                    'CONFIRMED',
                    'IN_PREPARATION',
                    'SHIPPED',
                    'DELIVERED',
                    'COMPLETED',
                  ];
                  const currentIdx = statusOrder.indexOf(selectedOrder.status);
                  const isPastOrCurrent = currentIdx >= idx || (selectedOrder.status === 'PAID' && idx <= 4);
                  return (
                    <div
                      key={step.key}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        isPastOrCurrent
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-bold'
                          : 'bg-white dark:bg-[#0B2D31] border-slate-200 dark:border-teal-800 opacity-50 text-slate-400'
                      }`}
                    >
                      <p className="text-[10px] truncate">{step.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid sm:grid-cols-5 gap-2.5 text-xs pt-2">
                {selectedOrder.timeline.map((step, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border ${
                      step.completed
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-white dark:bg-[#0B2D31] border-slate-200 dark:border-teal-800 opacity-60'
                    }`}
                  >
                    <p className="font-bold text-slate-900 dark:text-white">{step.step}</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">{step.timestamp}</p>
                    <p className="text-[10px] font-mono text-[#E85D22] mt-0.5">{step.actor}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* COMMENTAIRES & ÉVALUATION CLIENT DE LA COMMANDE */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-slate-400">
                  Commentaires, Instructions & Avis sur la Commande :
                </p>
                <VoiceDictationButton
                  onTranscript={(t) => {
                    notifyToast(`Commentaire dicté : "${t}"`, 'info');
                  }}
                  size="sm"
                />
              </div>
              <textarea
                rows={2}
                placeholder="Ajouter une instruction de livraison, un commentaire de réception ou une remarque qualité..."
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
              />
            </div>
          </div>
        </Card>
      )}

      {/* CONFIRM DIALOG : ANNULATION DE COMMANDE */}
      <ConfirmDialog
        open={Boolean(cancelOrderTarget)}
        onClose={() => setCancelOrderTarget(null)}
        title="Confirmer l'annulation de la commande"
        description="Voulez-vous vraiment annuler cette commande ? Les stocks usine seront immédiatement libérés et le séquestre bancaire sera annulé sans pénalité."
        confirmLabel="Confirmer l'annulation"
        onConfirm={handleConfirmCancelOrder}
      />

      {/* ===================================================================== */}
      {/* 3E. MES DEVIS (RFQ) & CONVERSION (/client/devis & /client/devis/nouveau) */}
      {/* ===================================================================== */}
      {section === 'devis' && (
        <Card
          title="Mes Devis B2B & Demandes de Cotation (RFQ)"
          subtitle="Négociation commerciale et conversion en commande ferme en 1 clic"
          action={
            <Link to="/client/devis/nouveau">
              <Button size="sm" variant="primary">+ Nouvelle Demande de Devis</Button>
            </Link>
          }
        >
          <div className="space-y-3">
            {myQuotes.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#E85D22]">{q.quoteNumber}</span>
                    <Badge variant={q.status === 'ACCEPTED' ? 'success' : q.status === 'CONVERTED' ? 'neutral' : 'info'}>
                      {q.status}
                    </Badge>
                  </div>
                  <p className="mt-1 font-medium">
                    Fournisseur : <strong>{q.supplierName}</strong> • Total :{' '}
                    <strong className="font-mono">{formatCurrency(parseFloat(q.totalAmount))}</strong>
                  </p>
                  <p className="text-slate-400 italic text-[11px]">« {q.amountInWords} »</p>
                </div>

                <div className="flex items-center gap-2">
                  {q.status !== 'CONVERTED' && q.status !== 'REFUSED' && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          convertQuoteToOrder(q.id);
                          notifyToast(`Devis ${q.quoteNumber} accepté et converti en commande ferme avec succès !`, 'success');
                        }}
                      >
                        Accepter & Commander
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setQuoteToRejectId(q.id);
                          setQuoteRejectReason('');
                          setRejectQuoteModalOpen(true);
                        }}
                      >
                        Refuser
                      </Button>
                    </>
                  )}
                  {q.status === 'REFUSED' && (
                    <Badge variant="danger">Refusé par l'acheteur</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      downloadDataExport(`devis_${q.quoteNumber}.json`, JSON.stringify(q, null, 2), 'application/json');
                      notifyToast(`Devis ${q.quoteNumber} téléchargé !`, 'success');
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 3F. FORMULAIRE DE CRÉATION DE DEVIS */}
      {section === 'quote-new' && (
        <Card
          title="Création d'une Demande de Devis B2B (RFQ)"
          subtitle="Calcul automatique du montant HT, de la TVA et conversion en lettres"
          action={
            <Link to="/client/devis">
              <Button size="sm" variant="secondary">← Retour Mes Devis</Button>
            </Link>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const sub = newQuoteQty * parseFloat(newQuotePrice || '0');
              const tax = sub * 0.2;
              const tot = sub + tax;
              createQuote({
                clientId: currentUser.id,
                clientName: currentUser.companyName,
                supplierId: 'usr-supp-01',
                supplierName: 'EuroTech Industrial & ColdChain GmbH',
                status: 'RESPONDED',
                subtotalAmount: sub.toFixed(2),
                taxAmount: tax.toFixed(2),
                totalAmount: tot.toFixed(2),
                currency: 'EUR',
                amountInWords: `${tot.toFixed(2)} Euros TTC (Arrêté à la présente cotation)`,
                validUntil: '2026-12-31',
                lines: [
                  {
                    description: newQuoteDesc,
                    quantity: newQuoteQty,
                    unitPrice: newQuotePrice,
                    discountPct: '0.00',
                    totalLine: sub.toFixed(2),
                  },
                ],
              });
              notifyToast('Demande de devis enregistrée et transmise au fournisseur !', 'success');
              navigate('/client/devis');
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-500">Désignation de l'équipement (ou dictée) :</label>
                  <VoiceDictationButton
                    onTranscript={(t) => setNewQuoteDesc((prev) => (prev ? `${prev} ${t}` : t))}
                    size="sm"
                  />
                </div>
                <input
                  type="text"
                  value={newQuoteDesc}
                  onChange={(e) => setNewQuoteDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Quantité :</label>
                <input
                  type="number"
                  min="1"
                  value={newQuoteQty}
                  onChange={(e) => setNewQuoteQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Prix Unitaire Estimé (EUR) :</label>
                <input
                  type="text"
                  value={newQuotePrice}
                  onChange={(e) => setNewQuotePrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-bold font-mono"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex justify-between items-center">
              <div>
                <p className="font-bold">Estimation Financière :</p>
                <p className="text-slate-400">
                  Sous-total : {(newQuoteQty * parseFloat(newQuotePrice || '0')).toFixed(2)} € • Total TTC (20%) :{' '}
                  <strong className="text-[#E85D22] font-mono">
                    {((newQuoteQty * parseFloat(newQuotePrice || '0')) * 1.2).toFixed(2)} €
                  </strong>
                </p>
              </div>
              <Button type="submit" variant="primary">
                Transmettre la Demande de Devis
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 4. SUIVI LOGISTIQUE GPS & INCIDENTS (/client/logistique)             */}
      {/* ===================================================================== */}
      {section === 'logistique' && (
        <div className="space-y-6">
          {/* CARTE INTERACTIVE GÉOLOCALISÉE */}
          <InteractiveLogisticsMap
            waypoints={INITIAL_SHIPMENT_WAYPOINTS['SHP-2026-8819'] || []}
            title="Carte Interactive & Télémétrie en Direct de vos Expéditions"
          />

          <Card
            title="Suivi des Expéditions Multimodales & Télémétrie"
            subtitle="Suivi satellite et IoT embarqué de vos cargaisons"
            action={
              <Button size="sm" variant="danger" onClick={() => setIncidentModalOpen(true)}>
                <AlertTriangle className="w-3.5 h-3.5" />
                Signaler un Incident de Transport
              </Button>
            }
          >
            <div className="grid md:grid-cols-2 gap-4">
              {myShipments.map((s) => (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon3D name={s.icon3d} size="md" withGlow />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{s.trackingNumber}</p>
                        <p className="text-slate-500">{s.carrierName} • {s.transportMode}</p>
                      </div>
                    </div>
                    <Badge variant={s.status === 'DELIVERED' ? 'success' : s.status === 'IN_TRANSIT' ? 'orange' : 'info'}>
                      {s.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-slate-600 dark:text-slate-300">
                    <p>
                      <strong>Trajet :</strong> {s.origin} → <strong>{s.destination}</strong>
                    </p>
                    <p>
                      <strong>Cargaison :</strong> {s.weightKg} kg • {s.volumeM3} m³ ({s.palletsCount} palettes)
                    </p>
                    <p>
                      <strong>Arrivée estimée :</strong> {s.estimatedArrival} •{' '}
                      <span className={s.customsCleared ? 'text-emerald-600 font-semibold' : 'text-amber-600'}>
                        {s.customsCleared ? '✓ Dédouanement validé' : 'En transit douanier'}
                      </span>
                    </p>
                  </div>

                  {s.podSigned && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Preuve de Livraison POD Certifiée
                        </span>
                        <span className="text-[10px] text-slate-400">{s.podTimestamp}</span>
                      </div>
                      <p className="text-[11px]">Sceau cryptographique SHA-256 scellé et archivé.</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-teal-800/60">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        downloadDataExport(`e-cmr_${s.trackingNumber}.json`, JSON.stringify(s, null, 2), 'application/json');
                        notifyToast(`e-CMR certifié téléchargé pour ${s.trackingNumber} !`, 'info');
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Télécharger e-CMR
                    </Button>
                    {s.podSigned && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          downloadDataExport(`preuve_pod_${s.trackingNumber}.json`, JSON.stringify({ tracking: s.trackingNumber, podSigned: true, timestamp: s.podTimestamp }), 'application/json');
                          notifyToast(`Bordereau POD certifié téléchargé pour ${s.trackingNumber} !`, 'success');
                        }}
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        Preuve POD Signée
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* MODAL SIGNALEMENT INCIDENT LOGISTIQUE */}
          <Modal
            open={incidentModalOpen}
            onClose={() => setIncidentModalOpen(false)}
            title="Signaler un Incident de Transport / Litige Fret"
            maxWidthClass="max-w-md"
          >
            <form onSubmit={handleSubmitIncident} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Expédition Concernée :</label>
                <select
                  value={incidentShipmentId}
                  onChange={(e) => setIncidentShipmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-semibold"
                >
                  <option value="">Sélectionner une expédition...</option>
                  {myShipments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.trackingNumber} ({s.origin} → {s.destination})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Motif / Titre de l'Incident :</label>
                <input
                  type="text"
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  placeholder="Ex : Retard maritime de plus de 48h, rupture de scellé..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Niveau de Gravité :</label>
                <select
                  value={incidentSeverity}
                  onChange={(e) => setIncidentSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-semibold"
                >
                  <option value="LOW">Faible (Informationnel)</option>
                  <option value="MEDIUM">Moyen (Impact délai partiel)</option>
                  <option value="HIGH">Élevé (Arrêt de transit / Dégât constaté)</option>
                  <option value="CRITICAL">Critique (Chaîne du froid compromise / Perte totale)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Description des Faits :</label>
                <textarea
                  rows={3}
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  placeholder="Détaillez les anomalies constatées..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIncidentModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="danger">
                  Transmettre le Signalement
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. FACTURES & HISTORIQUE DES PAIEMENTS (/client/factures)              */}
      {/* ===================================================================== */}
      {section === 'factures' && (
        <div className="space-y-6">
          {/* NOUVEAU : FACTURATION LÉGALE MULTI-JURIDICTIONS SCELLÉE SHA-256 */}
          <Card
            title="Facturation B2B Multi-Juridictions & Avoirs Scellés"
            subtitle="Conforme aux exigences fiscales (FR/UE, Maroc, Tunisie, Émirats GCC, International) avec scellement SHA-256"
            action={
              <Link to="/client/paiements">
                <Button size="sm" variant="secondary">Historique des Règlements →</Button>
              </Link>
            }
          >
            <DataTable
              caption="Registre officiel des factures et avoirs scellés"
              keyExtractor={(doc) => doc.id}
              data={myCommercialDocuments.filter(
                (d) => d.documentType === 'COMMERCIAL_INVOICE' || d.documentType === 'CREDIT_NOTE'
              )}
              columns={[
                {
                  key: 'num',
                  header: 'N° Document',
                  isRowHeader: true,
                  render: (doc) => (
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold text-[#E85D22] block">{doc.documentNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">v{doc.version}</span>
                    </div>
                  ),
                },
                {
                  key: 'type',
                  header: 'Nature',
                  render: (doc) => (
                    <Badge variant={doc.documentType === 'CREDIT_NOTE' ? 'danger' : 'info'}>
                      {doc.documentType === 'CREDIT_NOTE' ? 'AVOIR' : 'FACTURE'}
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
                  key: 'issuer',
                  header: 'Émetteur',
                  render: (doc) => <span className="text-xs font-semibold">{doc.issuer.companyName}</span>,
                },
                {
                  key: 'dates',
                  header: 'Émission / Échéance',
                  render: (doc) => (
                    <div className="text-[11px] font-mono text-slate-500">
                      <div>Émis : {doc.issuedAt.slice(0, 10)}</div>
                      {doc.dueAt && <div className="text-slate-400">Éch : {doc.dueAt.slice(0, 10)}</div>}
                    </div>
                  ),
                },
                {
                  key: 'tot',
                  header: 'Total TTC',
                  render: (doc) => (
                    <span
                      className={`font-mono font-bold ${
                        doc.documentType === 'CREDIT_NOTE'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {doc.documentType === 'CREDIT_NOTE' ? '-' : ''}
                      {doc.totalTtc} {doc.currency}
                    </span>
                  ),
                },
                {
                  key: 'seal',
                  header: 'Sceau SHA-256',
                  render: (doc) => (
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[100px]">{doc.digitalSealSha256.slice(0, 10)}...</span>
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
          </Card>

          {/* FACTURES DU COMPTE HISTORIQUES */}
          <Card
            title="Mes Factures Commerciales & Règlements"
            subtitle="Facturation conforme aux exigences comptables et fiscales de votre juridiction"
          >
            <DataTable
              caption="Liste des factures du client"
              keyExtractor={(inv) => inv.id}
              data={myInvoices}
              columns={[
                {
                  key: 'num',
                  header: 'N° Facture',
                  isRowHeader: true,
                  render: (inv) => <span className="font-mono font-bold text-[#E85D22]">{inv.invoiceNumber}</span>,
                },
                {
                  key: 'ord',
                  header: 'Commande',
                  render: (inv) => <span className="font-mono text-xs">{inv.orderNumber}</span>,
                },
                {
                  key: 'due',
                  header: 'Échéance',
                  render: (inv) => <span className="font-mono text-xs text-slate-400">{inv.dueAt}</span>,
                },
                {
                  key: 'ht',
                  header: 'Montant HT',
                  render: (inv) => <span className="font-mono text-xs">{formatCurrency(parseFloat(inv.subtotal))}</span>,
                },
                {
                  key: 'tot',
                  header: 'Total TTC',
                  render: (inv) => (
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(parseFloat(inv.totalAmount))}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Statut',
                  render: (inv) => (
                    <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'warning'}>
                      {inv.status}
                    </Badge>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (inv) => (
                    <div className="flex items-center gap-1.5">
                      {inv.status !== 'PAID' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            payInvoice(inv.id);
                            notifyToast(`Facture ${inv.invoiceNumber} réglée via Stripe avec succès !`, 'success');
                          }}
                        >
                          Payer via Stripe
                        </Button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-bold">✓ Réglée</span>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          downloadDataExport(`facture_${inv.invoiceNumber}.json`, JSON.stringify(inv, null, 2), 'application/json');
                          notifyToast(`Facture ${inv.invoiceNumber} téléchargée !`, 'info');
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        JSON
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* 5B. HISTORIQUE DES PAIEMENTS (/client/paiements) */}
      {section === 'paiements' && (
        <div className="space-y-6">
          <Card
            title="Historique des Règlements & Séquestre B2B"
            subtitle="Paiements multi-prestataires sécurisés avec clé d'idempotence et traçabilité bancaire"
          >
            <DataTable
              caption="Registre des paiements du compte"
              keyExtractor={(p) => p.id}
              data={payments.filter((p) => p.clientId === currentUser.id || currentUser.role === 'ADMIN')}
              columns={[
                {
                  key: 'ref',
                  header: 'Réf Paiement',
                  isRowHeader: true,
                  render: (p) => <span className="font-mono font-bold text-xs">{p.paymentReference}</span>,
                },
                {
                  key: 'inv',
                  header: 'Facture Cible',
                  render: (p) => <span className="font-mono text-xs text-[#E85D22]">{p.invoiceNumber}</span>,
                },
                {
                  key: 'method',
                  header: 'Moyen',
                  render: (p) => <Badge variant="neutral">{p.provider}</Badge>,
                },
                {
                  key: 'amount',
                  header: 'Montant',
                  render: (p) => (
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(parseFloat(p.amount))}
                    </span>
                  ),
                },
                {
                  key: 'date',
                  header: 'Date',
                  render: (p) => <span className="font-mono text-xs text-slate-400">{p.createdAt}</span>,
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
          </Card>

          {/* SECTION QUITTANCES ET REÇUS CERTIFIÉS SHA-256 */}
          <Card
            title="Quittances de Règlement Sécurisées (Signature SHA-256)"
            subtitle="Documents officiels certifiés infalsifiables et opposables aux tiers"
          >
            {myReceipts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Aucune quittance émise pour l'instant. Les quittances sont générées dès validation d'un règlement.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 text-xs">
                {myReceipts.map((rec) => (
                  <div
                    key={rec.receiptNumber}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-500" />
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {rec.receiptNumber}
                        </span>
                      </div>
                      <Badge variant="success">CERTIFIÉ CONFORME</Badge>
                    </div>

                    <div className="space-y-1 text-slate-600 dark:text-slate-300">
                      <p>
                        Montant réglé : <strong className="font-mono font-bold text-slate-900 dark:text-white">{rec.amountPaid} {rec.currency}</strong>
                      </p>
                      <p>
                        Prestataire : <Badge variant="neutral">{rec.provider}</Badge> • Réf Tx : <span className="font-mono text-[11px]">{rec.paymentReference}</span>
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        Date d'encaissement : {rec.issuedAt}
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800/60 font-mono text-[10px] text-slate-500 truncate">
                      SHA256: {rec.digitalSignatureSha256}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setViewingReceipt(rec)}
                      >
                        Consulter la Quittance
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          downloadDataExport(`quittance_${rec.receiptNumber}.json`, JSON.stringify(rec, null, 2), 'application/json');
                          notifyToast(`Quittance ${rec.receiptNumber} téléchargée !`, 'success');
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Télécharger
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5C. DOCUMENTS GED & EXTRACTION OCR (/client/documents)                */}
      {/* ===================================================================== */}
      {section === 'documents' && (
        <div className="space-y-6">
          {/* REGISTRE CENTRAL DES DOCUMENTS COMMERCIAUX SCELLÉS (7 TYPES B2B) */}
          <Card
            title="Registre Central des Pièces Commerciales Scellées"
            subtitle="Devis, Bons de commande, Confirmations, Factures, Avoirs, Reçus, BL et e-CMR avec sceau SHA-256"
            action={
              <Link to="/ocr-idp">
                <Button size="sm" variant="primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  Studio OCR / IDP →
                </Button>
              </Link>
            }
          >
            <DataTable
              caption="Registre officiel des documents commerciaux du compte"
              keyExtractor={(doc) => doc.id}
              data={myCommercialDocuments}
              columns={[
                {
                  key: 'num',
                  header: 'N° Document',
                  isRowHeader: true,
                  render: (doc) => (
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold text-[#E85D22] block">{doc.documentNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">v{doc.version}</span>
                    </div>
                  ),
                },
                {
                  key: 'type',
                  header: 'Type de Pièce',
                  render: (doc) => {
                    const badgeVariants: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
                      QUOTE: 'warning',
                      PURCHASE_ORDER: 'info',
                      ORDER_CONFIRMATION: 'info',
                      COMMERCIAL_INVOICE: 'neutral',
                      CREDIT_NOTE: 'danger',
                      PAYMENT_RECEIPT: 'success',
                      DELIVERY_NOTE: 'info',
                      TRANSPORT_DOCUMENT: 'info',
                    };
                    return (
                      <Badge variant={badgeVariants[doc.documentType] || 'neutral'}>
                        {doc.documentType.replace('_', ' ')}
                      </Badge>
                    );
                  },
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
                  header: 'Parties',
                  render: (doc) => (
                    <div className="text-[11px] space-y-0.5">
                      <div>Émetteur : <strong>{doc.issuer.companyName}</strong></div>
                      <div className="text-slate-400">Dest : {doc.recipient.companyName}</div>
                    </div>
                  ),
                },
                {
                  key: 'total',
                  header: 'Montant TTC',
                  render: (doc) => (
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {doc.totalTtc} {doc.currency}
                    </span>
                  ),
                },
                {
                  key: 'seal',
                  header: 'Sceau SHA-256',
                  render: (doc) => (
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[120px]">{doc.digitalSealSha256.slice(0, 12)}...</span>
                    </div>
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
          </Card>

          {/* FICHIERS ATTACHÉS GED & CLAMAV */}
          <Card
            title="Mes Documents GED, Contrats Cadres & Extraction OCR"
            subtitle="Chiffrement KMS AES-256-GCM et contrôle antivirus ClamAV sur tous les fichiers"
          >
            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              {[
                { name: 'Contrat_Cadre_B2B_Atlas_EuroTech_2026.pdf', cat: 'Contrat Cadre', icon: 'checklist' as const, size: '1.4 Mo' },
                { name: 'Facture_FAC-2026-9901_Signee.pdf', cat: 'Facture Commerciale', icon: 'invoice' as const, size: '420 Ko' },
                { name: 'Certificat_Origine_Douane_EUR1_Zenata.pdf', cat: 'Document Douanier', icon: 'customs-stamp' as const, size: '890 Ko' },
                { name: 'e-CMR_International_SHP-2026-8819.pdf', cat: 'Document de Transport', icon: 'shipping-label' as const, size: '610 Ko' },
                { name: 'Bordereau_POD_Emargement_Casablanca.pdf', cat: 'Preuve de Livraison', icon: 'proof-of-delivery' as const, size: '520 Ko' },
                { name: 'Certificat_GDP_ChaineDuFroid_ATP.pdf', cat: 'Conformité Froid', icon: 'cold-chain' as const, size: '780 Ko' },
              ].map((d) => (
                <div
                  key={d.name}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Icon3D name={d.icon} size="sm" />
                      <Badge variant="success">ClamAV CLEAN</Badge>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{d.name}</p>
                    <p className="text-slate-400">{d.cat} • {d.size}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      downloadDataExport(d.name, `Contenu certifié du document ${d.name}`);
                      notifyToast(`Téléchargement sécurisé de ${d.name}...`, 'info');
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. ASSISTANT IA & OUTILS INTELLIGENTS                                 */}
      {/* ===================================================================== */}
      <Card
        title="Assistant IA B2B TradeLink & Outils Intelligents"
        subtitle="Recherche de références, compréhension des incoterms, synthèse des commandes et dictée vocale STT"
      >
        <div className="space-y-4 text-xs">
          {/* SUGGESTIONS DE QUESTIONS RAPIDES */}
          <div className="flex flex-wrap gap-2">
            {[
              'Quels sont les conteneurs maritimes disponibles en stock immédiat ?',
              'Explique-moi la différence entre les incoterms DAP et CIF pour Casablanca.',
              'Fais-moi un résumé de mes livraisons en transit.',
              'Quelle est la procédure pour régulariser mon dossier KYC avant J+7 ?',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendAiQuery(q)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-slate-300 hover:border-[#E85D22] transition-colors text-start"
              >
                💡 {q}
              </button>
            ))}
          </div>

          {/* HISTORIQUE DE CONVERSATION */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3 max-h-72 overflow-y-auto">
            {aiMessages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${m.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ASSISTANT' && <Icon3D name="warehouse-robot" size="sm" />}
                <div
                  className={`p-3 rounded-2xl max-w-lg leading-relaxed ${
                    m.sender === 'USER'
                      ? 'bg-[#E85D22] text-white rounded-tr-xs'
                      : 'bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-slate-800 dark:text-slate-100 rounded-tl-xs'
                  }`}
                >
                  <p>{m.text}</p>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-teal-800/50 text-[10px] text-teal-600 dark:text-teal-300">
                      <strong>Sources citées :</strong> {m.sources.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex items-center gap-2 text-slate-400 italic">
                <Sparkles className="w-4 h-4 animate-spin text-[#E85D22]" />
                L'assistant analyse votre demande selon les règles commerciales...
              </div>
            )}
          </div>

          {/* BARRE DE SAISIE AVEC DICTÉE VOCALE */}
          <div className="flex gap-2">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAiQuery()}
              placeholder="Posez votre question à l'assistant d'achat..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#E85D22]"
            />
            <Button
              type="button"
              variant={isVoiceRecording ? 'danger' : 'secondary'}
              onClick={() => {
                if (isVoiceRecording) {
                  stopVoiceDictation();
                  if (voiceTranscript) setAiQuery(voiceTranscript);
                } else {
                  startVoiceDictation(locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'fr-FR');
                }
              }}
              title="Dictée vocale multilingue STT"
            >
              {isVoiceRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button variant="primary" onClick={() => handleSendAiQuery()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ===================================================================== */}
      {/* 7. ROOM LIVE CLIENT (/client/room-live) — INVITÉ STRICT               */}
      {/* ===================================================================== */}
      {section === 'room-live' && (
        <Card
          title="Room Live Client — Réunions & Négociations Autorisées"
          subtitle="Règle stricte (Annexe B) : Le Client rejoint uniquement les salles auxquelles il a été convié. La création de salle est strictement réservée aux fournisseurs, transporteurs et administrateurs."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const res = createRoomLive('Tentative Création Client', '2026-11-20');
                if (!res.ok) {
                  notifyToast(res.message, 'warning');
                }
              }}
            >
              <Lock className="w-3.5 h-3.5 text-red-500" />
              Tester le blocage serveur « Créer une salle » (Client)
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-slate-700 dark:text-slate-300 space-y-1">
              <p className="font-bold text-amber-800 dark:text-amber-300">
                Protocole de Réunion & Ségrégation des Rôles :
              </p>
              <p>
                Vous pouvez accéder ci-dessous à l'ensemble des salles pour lesquelles vous avez reçu une invitation formelle. Sur la salle <code>RM-LIVE-8890</code>, une délégation ponctuelle de co-hôte vous a été conférée par l'organisateur pour la durée de cette session.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {rooms.map((rm) => (
                <div
                  key={rm.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{rm.title}</span>
                      <Badge variant={rm.status === 'LIVE' ? 'success' : 'info'}>
                        {rm.status}
                      </Badge>
                    </div>
                    <p className="text-slate-500">
                      Organisateur : <strong>{rm.creatorName}</strong> ({rm.creatorRole})
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">Code : {rm.roomCode} • {rm.scheduledAt}</p>
                    {rm.delegatedClientHostId === currentUser.id && (
                      <Badge variant="orange">Délégation ponctuelle Co-Hôte sur cette salle</Badge>
                    )}
                  </div>
                  <Link to={`/room/${rm.id}`}>
                    <Button size="sm" variant="primary">Rejoindre la Réunion</Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 8. PROFIL & PARAMÈTRES DU COMPTE (/client/parametres)                  */}
      {/* ===================================================================== */}
      {section === 'parametres' && (
        <Card
          title="Profil Acheteur, Adresses Logistiques & Préférences"
          subtitle="Gestion des coordonnées de l'entreprise, des entrepôts de livraison, du thème 3 états et de la langue"
        >
          <div className="space-y-6 text-xs">
            {/* SÉLECTEUR DE THÈME 3 ÉTATS */}
            <RadioGroup
              label="Préférence d'Apparence & Thème Visuel :"
              name="themePref"
              value={theme}
              onChange={(val) => setTheme(val as ThemeMode)}
              options={[
                { value: 'system', label: 'Système (Auto)', description: 'S\'adapte automatiquement aux réglages de votre système' },
                { value: 'light', label: 'Thème Blanc (Clair)', description: 'Affichage haute visibilité pour la journée' },
                { value: 'dark', label: 'Thème Noir (Sombre)', description: 'Affichage sombre reposant pour écrans OLED' },
              ]}
            />

            {/* CHOIX DE LA LANGUE */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Langue de l'Interface & Directionnalité :
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { code: 'fr' as const, label: 'Français (LTR)' },
                  { code: 'en' as const, label: 'English (LTR)' },
                  { code: 'ar' as const, label: 'العربية (RTL)' },
                ].map((l) => (
                  <Button
                    key={l.code}
                    size="sm"
                    variant={locale === l.code ? 'primary' : 'secondary'}
                    onClick={() => {
                      setLocale(l.code);
                      notifyToast(`Langue basculée en ${l.label}`, 'info');
                    }}
                  >
                    {l.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* COORDONNÉES SOCIÉTÉ & FACTURATION */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Raison Sociale de l'Entreprise" defaultValue={currentUser.companyName} />
              <Input label="Registre du Commerce (RC)" defaultValue="RC Casablanca 448912" />
              <Input label="Identifiant Commun Entreprise (ICE)" defaultValue="002918440000045" />
              <Input label="Patente / Numéro Fiscal" defaultValue="341098 / IF 401892" />
              <Input label="Email de Contact Acheteur" defaultValue={currentUser.email} />
              <Input label="Téléphone Standard" defaultValue={currentUser.phone} />
            </div>

            {/* ADRESSES LOGISTIQUES DES ENTREPÔTS */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Entrepôt Logistique Principal de Réception</h4>
              <p className="text-slate-600 dark:text-slate-300">
                Plateforme Zenata Logistique, Quai de déchargement B, Lot 14, 20600 Casablanca, Maroc
              </p>
              <p className="text-[11px] text-slate-400">
                Accès semi-remorque 40 pieds & dépotage frigo ATP validés • Contact quai : +212 5 22 90 14 56
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={() => notifyToast('Modifications du profil acheteur enregistrées avec succès !', 'success')}
              >
                Enregistrer les Modifications
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 8B. MON KYC & UPLOAD PIÈCES (/client/kyc & /client/kyc/upload)        */}
      {/* ===================================================================== */}
      {section === 'kyc' && <ActorKycWorkspaceView actorProfile="CLIENT" />}
      {section === 'kyc-upload' && (
        <ActorKycWorkspaceView actorProfile="CLIENT" focusUploadSection />
      )}

      {/* MODAL : REFUS DE DEVIS (MOTIF OBLIGATOIRE) */}
      <Modal
        open={rejectQuoteModalOpen}
        onClose={() => setRejectQuoteModalOpen(false)}
        title="Refuser la Proposition Commerciale"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Conformément aux règles commerciales TRADELINK, tout refus de cotation doit faire l'objet d'un motif explicite notifié au fournisseur.
          </p>
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Motif du Refus (Obligatoire) :
            </label>
            <textarea
              rows={3}
              value={quoteRejectReason}
              onChange={(e) => setQuoteRejectReason(e.target.value)}
              placeholder="Ex: Tarification supérieure au budget alloué, délai d'acheminement incompatible..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setRejectQuoteModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={!quoteRejectReason.trim()}
              onClick={() => {
                if (!quoteToRejectId || !quoteRejectReason.trim()) return;
                rejectQuote(quoteToRejectId, quoteRejectReason.trim());
                notifyToast('Proposition commerciale refusée. Le fournisseur a été notifié du motif.', 'info');
                setRejectQuoteModalOpen(false);
                setQuoteToRejectId(null);
                setQuoteRejectReason('');
              }}
            >
              Confirmer le Refus
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL : OUVERTURE D'UN LITIGE COMMERCIAL */}
      <Modal
        open={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        title="Ouverture d'un Litige Commercial"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            L'ouverture d'un litige suspend la clôture financière et transfère le dossier aux arbitres assermentés de la plateforme TRADELINK.
          </p>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Motif du Litige :</label>
            <select
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value as DisputeReason)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-semibold"
            >
              <option value="DAMAGED_GOODS">Marchandise endommagée / Avarie de transport</option>
              <option value="LATE_DELIVERY">Retard de livraison excessif hors Incoterm</option>
              <option value="WRONG_ITEMS">Articles non conformes aux spécifications SKU</option>
              <option value="MISSING_QUANTITY">Quantités manquantes au dépotage</option>
              <option value="PRICE_MISMATCH">Écart tarifaire avec le devis contractuel</option>
              <option value="OTHER">Autre contestation commerciale</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Montant Contesté / Réclamé (€) :</label>
            <input
              type="number"
              step="0.01"
              value={disputeClaimedAmount}
              onChange={(e) => setDisputeClaimedAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-bold font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Exposé Détaillé des Faits :</label>
            <textarea
              rows={3}
              value={disputeDescription}
              onChange={(e) => setDisputeDescription(e.target.value)}
              placeholder="Décrivez avec précision l'avarie ou l'incident constaté..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDisputeModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={!disputeDescription.trim()}
              onClick={() => {
                if (!disputeOrderId || !disputeDescription.trim()) return;
                openOrderDispute(disputeOrderId, disputeReason, disputeDescription.trim());
                notifyToast('Litige commercial enregistré ! Arbitrage engagé sous 24h ouvrées.', 'success');
                setDisputeModalOpen(false);
                setDisputeOrderId(null);
                setDisputeDescription('');
              }}
            >
              Engager la Procédure de Litige
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL : VISUALISATION DE QUITTANCE CERTIFIÉE */}
      {viewingReceipt && (
        <Modal
          open={Boolean(viewingReceipt)}
          onClose={() => setViewingReceipt(null)}
          title={`Quittance Certifiée : ${viewingReceipt.receiptNumber}`}
        >
          <div className="p-4 rounded-2xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-teal-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-sm text-slate-900 dark:text-white">CERTIFICAT DE RÈGLEMENT OFFICIEL</span>
              </div>
              <Badge variant="success">ACQUITTÉ SANS RÉSERVE</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400">Réf. Quittance :</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white">{viewingReceipt.receiptNumber}</p>
              </div>
              <div>
                <span className="text-slate-400">Date d'émission :</span>
                <p className="font-mono text-slate-900 dark:text-white">{viewingReceipt.issuedAt}</p>
              </div>
              <div>
                <span className="text-slate-400">Montant Décaissé :</span>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {viewingReceipt.amountPaid} {viewingReceipt.currency}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Prestataire Bancaire :</span>
                <p className="font-bold text-slate-900 dark:text-white">{viewingReceipt.provider}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B2D31] space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Empreinte Cryptographique (SHA-256) :</span>
              <p className="font-mono text-[10px] break-all text-slate-700 dark:text-slate-300">
                {viewingReceipt.digitalSignatureSha256}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setViewingReceipt(null)}>
                Fermer
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  downloadDataExport(`quittance_${viewingReceipt.receiptNumber}.json`, JSON.stringify(viewingReceipt, null, 2), 'application/json');
                  notifyToast(`Quittance ${viewingReceipt.receiptNumber} exportée !`, 'success');
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Exporter Certificat
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
