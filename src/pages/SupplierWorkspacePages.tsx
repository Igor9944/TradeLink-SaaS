// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — ESPACE FOURNISSEUR COMPLET & SOUVERAIN (PAGES 40 À 52)
// 10 PILIERS :
// 1. Tableau de bord (CA, Commandes, Alertes Stocks, Top Ventes, Activité)
// 2. Gestion des produits (CRUD, Variantes, Prix, MOQ, Multi-images, Bulk CSV)
// 3. Gestion des stocks (Dispo, Réservé, Vendu, Alertes < Seuil, Mouvements tracés)
// 4. Commandes (Détails, Acceptation, Refus motivé, Préparation, Expédition)
// 5. Devis & Facturation (RFQ, Propositions commerciales négociées, Factures)
// 6. Clients & Communication (Portefeuille B2B, Messagerie sécurisée, Demandes)
// 7. Logistique & Fret (Colisage, Ordre de transport MedFreight, e-CMR, Tracking)
// 8. Assistant IA & Outils (Fiches produits IA, Traduction FR/EN/AR, OCR, Dictée STT)
// 9. Room Live (Création autorisée de salles B2B, Invitations, Visioconférence)
// 10. Paramètres & Gouvernance (Profil, Coordonnées, IBAN protégé KMS, KYC J+7, RTL)
// ISOLATION DES DONNÉES : Strict Anti-IDOR (supplierId === currentUser.id)
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Truck,
  DollarSign,
  Mic,
  MicOff,
  Sparkles,
  Download,
  Eye,
  Video,
  ShieldCheck,
  Warehouse,
  Boxes,
  Building,
  Mail,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { VoiceDictationButton } from '../components/voice/VoiceDictationButton';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, translateStatus, downloadDataExport } from '../i18n/translations';
import { ActorKycWorkspaceView } from '../components/kyc/KycModuleViews';
import { ALL_3D_ICONS, Icon3D } from '../components/ui/Icon3D';
import { InteractiveLogisticsMap } from '../components/logistics/InteractiveLogisticsMap';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  SearchBar,
  ConfirmDialog,
} from '../components/ui/DesignSystem';
import { Icon3DName, ThemeMode, ProductItem } from '../types';

export const SupplierWorkspacePage: React.FC<{
  section:
    | 'dashboard'
    | 'kyc'
    | 'catalogue'
    | 'product-new'
    | 'product-edit'
    | 'stocks'
    | 'commandes'
    | 'order-detail'
    | 'devis'
    | 'documents'
    | 'paiements'
    | 'clients'
    | 'logistique'
    | 'assistant-ia'
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
    addProduct,
    updateProductDetails,
    updateProductStock,
    deleteProduct,
    importProductsBulk,
    orders,
    updateOrderStatus,
    updateOrderStatusWithReason,
    quotes,
    respondToQuote,
    convertQuoteToOrder,
    invoices,
    payments,
    missions,
    createLogisticsMission,
    rooms,
    createRoomLive,
    isVoiceRecording,
    startVoiceDictation,
    stopVoiceDictation,
    voiceTranscript,
    notifyToast,
  } = useApp();

  const navigate = useNavigate();
  const params = useParams();

  // --------------------------------------------------------------------------
  // ISOLATION STRICTE ANTI-IDOR (Chapitre 6.4)
  // Un fournisseur ne consulte et ne gère que les données qui lui appartiennent.
  // --------------------------------------------------------------------------
  const myProducts = useMemo(() => {
    return products.filter(
      (p) => p.supplierId === currentUser.id || currentUser.role === 'ADMIN'
    );
  }, [products, currentUser.id, currentUser.role]);

  const myOrders = useMemo(() => {
    return orders.filter(
      (o) => o.supplierId === currentUser.id || currentUser.role === 'ADMIN'
    );
  }, [orders, currentUser.id, currentUser.role]);

  const myQuotes = useMemo(() => {
    return quotes.filter(
      (q) => q.supplierId === currentUser.id || currentUser.role === 'ADMIN'
    );
  }, [quotes, currentUser.id, currentUser.role]);

  const myInvoices = useMemo(() => {
    return invoices.filter(
      (i) => i.supplierId === currentUser.id || currentUser.role === 'ADMIN'
    );
  }, [invoices, currentUser.id, currentUser.role]);

  const myPayments = useMemo(() => {
    return payments.filter(
      (p) => p.supplierId === currentUser.id || currentUser.role === 'ADMIN'
    );
  }, [payments, currentUser.id, currentUser.role]);

  // --------------------------------------------------------------------------
  // ÉTATS LOCAUX : FORMULAIRE DE CRÉATION DE PRODUIT
  // --------------------------------------------------------------------------
  const [newSku, setNewSku] = useState('TL-COLD-DRONE-800');
  const [newNameFr, setNewNameFr] = useState('Drone Fret Cargo Autonome Pharma & Chaîne du Froid');
  const [newNameEn, setNewNameEn] = useState('Pharma Cold-Chain Autonomous Cargo Drone 800L');
  const [newNameAr, setNewNameAr] = useState('طائرة شحن بدون طيار للمنتجات الدوائية والتبريد');
  const [newCategory, setNewCategory] = useState('Innovation & Chaîne du Froid');
  const [newDescFr, setNewDescFr] = useState('Caisse isotherme certifiée GDP (-20°C à +4°C) avec télémétrie IoT temps réel.');
  const [newDescEn, setNewDescEn] = useState('GDP certified isothermal payload (-20°C to +4°C) with real-time IoT tracking.');
  const [newDescAr, setNewDescAr] = useState('حمولة متساوية الحرارة معتمدة مع تتبع مباشر ومراقبة مستمرة.');
  const [newPrice, setNewPrice] = useState('4850.00');
  const [newStock, setNewStock] = useState(15);
  const [newMinAlert, setNewMinAlert] = useState(4);
  const [newMoq, setNewMoq] = useState(1);
  const [newLeadTime, setNewLeadTime] = useState(3);
  const [newOrigin, setNewOrigin] = useState('Allemagne (DE)');
  const [newIncoterm, setNewIncoterm] = useState('CIP Casablanca Port');
  const [newIcon, setNewIcon] = useState<Icon3DName>('drone');

  // --------------------------------------------------------------------------
  // ÉTATS LOCAUX : ÉDITION PRODUIT
  // --------------------------------------------------------------------------
  const editingProduct = useMemo(() => {
    return myProducts.find((p) => p.id === params.id) ?? myProducts[0] ?? products[0];
  }, [myProducts, products, params.id]);

  const [editSku, setEditSku] = useState(editingProduct?.sku || '');
  const [editPrice, setEditPrice] = useState(editingProduct?.unitPrice || '0.00');
  const [editNameFr, setEditNameFr] = useState(editingProduct?.name?.fr || '');
  const [editNameAr, setEditNameAr] = useState(editingProduct?.name?.ar || '');

  // --------------------------------------------------------------------------
  // ÉTATS LOCAUX : RECHERCHE ET FILTRES CATALOGUE & STOCKS
  // --------------------------------------------------------------------------
  const [productSearch, setProductSearch] = useState('');
  const [stockFilterCritique, setStockFilterCritique] = useState(false);

  // --------------------------------------------------------------------------
  // ÉTATS LOCAUX : COMMANDE SÉLECTIONNÉE
  // --------------------------------------------------------------------------
  const selectedOrder = useMemo(() => {
    return myOrders.find((o) => o.id === params.id) ?? myOrders[0] ?? orders[0];
  }, [myOrders, orders, params.id]);

  // Modal de refus motivé
  const [orderToRefuse, setOrderToRefuse] = useState<string | null>(null);
  const [refusalReason, setRefusalReason] = useState('Rupture imprévue sur chaîne d’assemblage usine');

  // Modal d'ajustement de stock
  const [stockAdjustProductId, setStockAdjustProductId] = useState<string | null>(null);
  const [stockDelta, setStockDelta] = useState<number>(5);
  const [stockAdjustReason, setStockAdjustReason] = useState('Réapprovisionnement lot usine Hambourg');

  // Modal de suppression / archivage
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);

  // Modal d'import en masse CSV / JSON
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState(
    JSON.stringify(
      [
        {
          sku: 'TL-BULK-001',
          nameFr: 'Capteur Température IoT Chaîne du Froid',
          nameEn: 'IoT Cold Chain Temperature Sensor',
          nameAr: 'حساس درجة حرارة التبريد الذكي',
          price: '89.00',
          stock: 120,
          category: 'IoT & Télémétrie',
          icon3d: 'iot-sensor',
        },
        {
          sku: 'TL-BULK-002',
          nameFr: 'Palette Europe Isotherme Reconditionnée',
          nameEn: 'Refurbished Isothermal Euro-Pallet',
          nameAr: 'لوح تحميل معزول حرارياً',
          price: '145.00',
          stock: 60,
          category: 'Emballage & Logistique',
          icon3d: 'pallet-load',
        },
      ],
      null,
      2
    )
  );

  // --------------------------------------------------------------------------
  // ÉTATS LOCAUX : DEVIS ET PROPOSITION COMMERCIALE
  // --------------------------------------------------------------------------
  const [quoteToRespond, setQuoteToRespond] = useState<string | null>(null);
  const [negotiatedAmount, setNegotiatedAmount] = useState('11500.00');
  const [negotiationNotes, setNegotiationNotes] = useState('Remise de 8% accordée pour engagement semestriel.');

  // --------------------------------------------------------------------------
  // ÉTATS LOCAUX : ASSISTANT IA & GÉNÉRATEUR DE FICHES
  // --------------------------------------------------------------------------
  const [aiPromptTopic, setAiPromptTopic] = useState('Groupe Frigorifique Industriel Solaire pour Conteneur Maritime 40ft');
  const [aiGeneratedResult, setAiGeneratedResult] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // --------------------------------------------------------------------------
  // ÉTATS LOCAUX : ROOM LIVE CRÉATION
  // --------------------------------------------------------------------------
  const [roomTitle, setRoomTitle] = useState('Négociation Accord-Cadre & Validation Frigo 2026');
  const [roomScheduledAt, setRoomScheduledAt] = useState('2026-11-20 10:00');

  // --------------------------------------------------------------------------
  // CALCULS STATISTIQUES TABLEAU DE BORD FOURNISSEUR
  // --------------------------------------------------------------------------
  const stats = useMemo(() => {
    const totalCa = myOrders.reduce((acc, o) => acc + parseFloat(o.totalAmount || '0'), 0);
    const pendingOrders = myOrders.filter((o) => o.status === 'PENDING').length;
    const acceptedOrders = myOrders.filter((o) => ['ACCEPTED', 'PREPARING'].includes(o.status)).length;
    const shippedOrders = myOrders.filter((o) => ['SHIPPED', 'DELIVERED'].includes(o.status)).length;
    const lowStockCount = myProducts.filter((p) => p.stockAvailable <= p.minStockAlert).length;
    const activeProducts = myProducts.filter((p) => p.isPublished).length;
    return {
      totalCa,
      pendingOrders,
      acceptedOrders,
      shippedOrders,
      lowStockCount,
      activeProducts,
      totalOrders: myOrders.length,
    };
  }, [myOrders, myProducts]);

  // Clients uniques ayant commandé
  const uniqueClients = useMemo(() => {
    const map = new Map<string, { id: string; name: string; totalSpent: number; ordersCount: number }>();
    myOrders.forEach((o) => {
      const existing = map.get(o.clientId);
      const amount = parseFloat(o.totalAmount || '0');
      if (existing) {
        existing.totalSpent += amount;
        existing.ordersCount += 1;
      } else {
        map.set(o.clientId, {
          id: o.clientId,
          name: o.clientName,
          totalSpent: amount,
          ordersCount: 1,
        });
      }
    });
    return Array.from(map.values());
  }, [myOrders]);

  // Produits filtrés
  const filteredProducts = useMemo(() => {
    return myProducts.filter((p) => {
      const matchesSearch =
        p.name[locale]?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase());
      const matchesCritical = stockFilterCritique ? p.stockAvailable <= p.minStockAlert : true;
      return matchesSearch && matchesCritical;
    });
  }, [myProducts, productSearch, stockFilterCritique, locale]);

  // --------------------------------------------------------------------------
  // HANDLERS MÉTIER
  // --------------------------------------------------------------------------
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    addProduct({
      sku: newSku.trim(),
      supplierId: currentUser.id,
      supplierName: currentUser.companyName,
      category: newCategory,
      name: { fr: newNameFr, en: newNameEn, ar: newNameAr },
      description: { fr: newDescFr, en: newDescEn, ar: newDescAr },
      unitPrice: newPrice,
      currency: 'EUR',
      taxRate: '20.00',
      unit: 'UNITÉ',
      stockAvailable: Number(newStock),
      stockReserved: 0,
      minStockAlert: Number(newMinAlert),
      icon3d: newIcon,
      originCountry: newOrigin,
      incoterm: newIncoterm,
      leadTimeDays: Number(newLeadTime),
      isPublished: true,
    });
    navigate('/fournisseur/catalogue');
  };

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProductDetails(editingProduct.id, editSku, editPrice, editNameFr, editNameAr);
    navigate('/fournisseur/catalogue');
  };

  const handleExecuteDeleteOrArchive = () => {
    if (!productToDelete) return;
    deleteProduct(productToDelete.id);
    setProductToDelete(null);
  };

  const handleApplyStockAdjustment = () => {
    if (!stockAdjustProductId) return;
    updateProductStock(stockAdjustProductId, stockDelta, stockAdjustReason);
    setStockAdjustProductId(null);
  };

  const handleApplyRefusal = () => {
    if (!orderToRefuse) return;
    updateOrderStatusWithReason(orderToRefuse, 'REFUSED', refusalReason);
    setOrderToRefuse(null);
  };

  const handleProcessBulkImport = () => {
    try {
      const parsed = JSON.parse(bulkImportText);
      if (!Array.isArray(parsed)) {
        notifyToast('Le format JSON doit être un tableau d’objets produits.', 'error');
        return;
      }
      const formattedItems = parsed.map((item: any) => ({
        sku: item.sku || `TL-BULK-${Date.now()}`,
        supplierId: currentUser.id,
        supplierName: currentUser.companyName,
        category: item.category || 'Équipements Industriels',
        name: {
          fr: item.nameFr || item.sku,
          en: item.nameEn || item.sku,
          ar: item.nameAr || item.sku,
        },
        description: {
          fr: `Produit importé en masse certifié TradeLink V6.0.`,
          en: `Bulk imported product TradeLink V6.0 certified.`,
          ar: `منتج مستورد بالجملة معتمد مع تتبع كامل.`,
        },
        unitPrice: String(item.price || '100.00'),
        currency: 'EUR',
        taxRate: '20.00',
        unit: 'UNITÉ',
        stockAvailable: Number(item.stock || 10),
        stockReserved: 0,
        minStockAlert: 5,
        icon3d: (item.icon3d as Icon3DName) || 'pallet-load',
        originCountry: 'Allemagne (DE)',
        incoterm: 'CIP Casablanca Port',
        leadTimeDays: 4,
        isPublished: true,
      }));

      const count = importProductsBulk(formattedItems);
      notifyToast(`${count} produits intégrés avec succès au catalogue vendeur !`, 'success');
      setBulkImportModalOpen(false);
    } catch {
      notifyToast('Erreur d’analyse de la syntaxe JSON.', 'error');
    }
  };

  const handleGenerateAiProductCard = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      setIsGeneratingAi(false);
      setAiGeneratedResult(`### Fiche Produit IA Recommandée pour B2B :
- **Titre FR** : ${aiPromptTopic}
- **Title EN** : High-Efficiency Marine Grade ${aiPromptTopic}
- **العنوان AR** : ${aiPromptTopic} عالي الكفاءة للاستخدام الصناعي
- **Arguments B2B** : Réduction de 34% de la consommation d'énergie, conformité stricte CE & ATP, connectivité LoRaWAN/Satellite, garantie 5 ans constructeur.
- **Prix suggéré** : 14 800,00 EUR (Marge brute estimée : 38%).`);
      notifyToast('Fiche produit et argumentaire commercial générés par l’IA !', 'success');
    }, 450);
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* EN-TÊTE SUPÉRIEUR & HUB DE NAVIGATION FOURNISSEUR                     */}
      {/* ===================================================================== */}
      <div className="rounded-3xl bg-white dark:bg-[#0B2D31] p-5 border border-slate-200 dark:border-teal-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Icon3D name="warehouse" size="lg" withGlow />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="orange">PORTAIL VENDEUR B2B & EXPORT V6.0</Badge>
              <Badge variant="info">{currentUser.role}</Badge>
            </div>
            <h1 className="text-xl font-extrabold mt-1 text-slate-900 dark:text-white">
              {currentUser.companyName}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Munich Hub & Hambourg Port Quai B • TVA DE 314 982 741
            </p>
          </div>
        </div>

        {/* Liens de navigation vers les 10 piliers */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { to: '/fournisseur/dashboard', label: '1. Dashboard' },
            { to: '/fournisseur/catalogue', label: '2. Catalogue' },
            { to: '/fournisseur/catalogue/nouveau', label: '+ Produit' },
            { to: '/fournisseur/stocks', label: '3. Stocks' },
            { to: '/fournisseur/commandes', label: '4. Commandes' },
            { to: '/fournisseur/devis', label: '5. Devis RFQ' },
            { to: '/fournisseur/documents', label: 'Factures' },
            { to: '/fournisseur/paiements', label: 'Paiements' },
            { to: '/fournisseur/clients', label: '6. Clients' },
            { to: '/fournisseur/logistique', label: '7. Logistique' },
            { to: '/fournisseur/ia', label: '8. Assistant IA' },
            { to: '/fournisseur/room-live', label: '9. Room Live' },
            { to: '/fournisseur/kyc', label: 'KYC J+7' },
            { to: '/fournisseur/parametres', label: '10. Paramètres' },
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

      {/* ===================================================================== */}
      {/* 1. TABLEAU DE BORD FOURNISSEUR (/fournisseur/dashboard)               */}
      {/* ===================================================================== */}
      {section === 'dashboard' && (
        <div className="space-y-6">
          {/* Métriques KPI */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Chiffre d’Affaires Réalisé" subtitle="Facturé & Rapproché SWIFT">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-extrabold text-emerald-600">
                    {formatCurrency(stats.totalCa, 'EUR', locale)}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">{stats.totalOrders} commandes traitées</p>
                </div>
                <Icon3D name="payment" size="lg" withGlow />
              </div>
            </Card>

            <Card title="Commandes à Traiter" subtitle="Décision requise">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-2xl font-extrabold ${stats.pendingOrders > 0 ? 'text-amber-500' : 'text-slate-700'}`}>
                    {stats.pendingOrders} en attente
                  </span>
                  <p className="text-xs text-slate-400 mt-1">{stats.acceptedOrders} en préparation</p>
                </div>
                <Icon3D name="forklift" size="lg" withGlow />
              </div>
            </Card>

            <Card title="Stocks Critiques" subtitle="Seuil d’alerte usine">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-2xl font-extrabold ${stats.lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {stats.lowStockCount} référence(s)
                  </span>
                  <p className="text-xs text-slate-400 mt-1">Sur {stats.activeProducts} produits actifs</p>
                </div>
                <Icon3D name="pallet-load" size="lg" withGlow />
              </div>
            </Card>

            <Card title="Expéditions Effectuées" subtitle="Fret maritime & routier">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-extrabold text-[#E85D22]">
                    {stats.shippedOrders} expédiée(s)
                  </span>
                  <p className="text-xs text-slate-400 mt-1">Partenaire MedFreight</p>
                </div>
                <Icon3D name="sea-freight" size="lg" withGlow />
              </div>
            </Card>
          </div>

          {/* Alertes d'action & Bannière d'alerte stock faible */}
          {stats.lowStockCount > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-rose-900 dark:text-rose-200">
                    Alerte de Stock Faible ({stats.lowStockCount} articles sous le seuil critique)
                  </h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    Des références risquent la rupture immédiate lors des prochaines commandes B2B. Procédez à un ajustement de réapprovisionnement.
                  </p>
                </div>
              </div>
              <Link to="/fournisseur/stocks">
                <Button size="sm" variant="danger">Gérer les Stocks</Button>
              </Link>
            </div>
          )}

          {/* Grille : Top Produits Vendus & Activité Récente */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card title="Top Ventes & Produits les Plus Demandés" subtitle="Classement par volume commandé">
              <div className="space-y-3">
                {myProducts.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Icon3D name={p.icon3d} size="sm" withGlow />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{p.name[locale]}</p>
                        <p className="text-slate-400 font-mono">{p.sku} • {p.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm block">
                        {formatCurrency(p.unitPrice, p.currency, locale)}
                      </span>
                      <Badge variant={p.stockAvailable <= p.minStockAlert ? 'danger' : 'success'}>
                        Stock : {p.stockAvailable}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Activité Récente & Événements Vendeur" subtitle="Journal chronologique audité">
              <div className="space-y-3">
                {[
                  {
                    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                    title: 'Paiement rapproché Stripe Escrow',
                    time: 'Il y a 25 min',
                    detail: 'Facture FAC-2026-901 réglée par Atlas Import & Distribution S.A.',
                  },
                  {
                    icon: <Truck className="w-4 h-4 text-[#E85D22]" />,
                    title: 'Ordre de transport MedFreight généré',
                    time: 'Il y a 2h',
                    detail: 'Mission logistique affectée pour commande CMD-2026-9122 (Fret chaîne du froid).',
                  },
                  {
                    icon: <TrendingUp className="w-4 h-4 text-blue-500" />,
                    title: 'Demande de devis RFQ reçue',
                    time: 'Il y a 4h',
                    detail: 'Devis DEV-2026-401 reçu pour 50 unités de capteurs IoT.',
                  },
                  {
                    icon: <ShieldCheck className="w-4 h-4 text-teal-500" />,
                    title: 'Dossier KYC Fournisseur certifié',
                    time: 'Hier',
                    detail: '3/3 pièces vérifiées sous KMS avec immunité J+7 confirmée.',
                  },
                ].map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-start gap-3 text-xs"
                  >
                    <div className="mt-0.5">{act.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 dark:text-white">{act.title}</strong>
                        <span className="text-slate-400 text-[10px]">{act.time}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-300 mt-0.5">{act.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. GESTION DES PRODUITS (/fournisseur/catalogue)                       */}
      {/* ===================================================================== */}
      {section === 'catalogue' && (
        <Card
          title="Gestion du Catalogue Produits Vendeur (Page 42)"
          subtitle="Seuls les produits détenus par EuroTech Industrial sont administrables ici (Anti-IDOR)."
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setBulkImportModalOpen(true)}>
                <FileSpreadsheet className="w-4 h-4" /> Import Masse (CSV/JSON)
              </Button>
              <Link to="/fournisseur/catalogue/nouveau">
                <Button size="sm" variant="primary">
                  <Plus className="w-4 h-4" /> + Créer un Produit
                </Button>
              </Link>
            </div>
          }
        >
          {/* Barre de recherche et filtre */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="w-full sm:w-80">
              <SearchBar
                value={productSearch}
                onChange={setProductSearch}
                placeholder="Rechercher par référence SKU, nom ou catégorie..."
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStockFilterCritique(!stockFilterCritique)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  stockFilterCritique
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'border-slate-300 dark:border-teal-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                ⚠️ Stocks Critiques Seuls ({stats.lowStockCount})
              </button>
            </div>
          </div>

          <DataTable
            caption="Catalogue des références produits détenues par le fournisseur"
            keyExtractor={(p) => p.id}
            data={filteredProducts}
            columns={[
              {
                key: 'prod',
                header: 'Produit & Référence',
                isRowHeader: true,
                render: (p) => (
                  <div className="flex items-center gap-3">
                    <Icon3D name={p.icon3d} size="sm" withGlow />
                    <div>
                      <Link
                        to={`/fournisseur/catalogue/${p.id}`}
                        className="font-bold text-[#E85D22] hover:underline"
                      >
                        {p.name[locale]}
                      </Link>
                      <p className="text-xs text-slate-400 font-mono">{p.sku} • {p.category}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'price',
                header: 'Prix HT',
                render: (p) => (
                  <div>
                    <span className="font-extrabold">
                      {formatCurrency(p.unitPrice, p.currency, locale)}
                    </span>
                    <p className="text-[10px] text-slate-400">TVA 20%</p>
                  </div>
                ),
              },
              {
                key: 'stock',
                header: 'Stock Dispo / Réservé',
                render: (p) => (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={p.stockAvailable <= p.minStockAlert ? 'danger' : 'success'}>
                        Dispo : {p.stockAvailable}
                      </Badge>
                      <Badge variant="info">Réservé : {p.stockReserved}</Badge>
                    </div>
                    {p.stockAvailable <= p.minStockAlert && (
                      <p className="text-[10px] text-rose-500 font-bold">Alerte seuil min ({p.minStockAlert})</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Disponibilité',
                render: (p) => (
                  <Badge variant={p.isPublished ? 'success' : 'neutral'}>
                    {p.isPublished ? 'Actif au catalogue' : 'Archivé'}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (p) => (
                  <div className="flex flex-wrap gap-1.5">
                    <Link to={`/fournisseur/catalogue/${p.id}`}>
                      <Button size="sm" variant="secondary" title="Modifier la fiche">
                        Éditer
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setStockAdjustProductId(p.id);
                        setStockDelta(10);
                        setStockAdjustReason('Réapprovisionnement lot usine');
                      }}
                      title="Ajuster le stock"
                    >
                      + Stock
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setProductToDelete(p)}
                      title="Supprimer ou archiver selon les règles métier"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 2. CRÉATION PRODUIT MULTILINGUE (/fournisseur/catalogue/nouveau)       */}
      {/* ===================================================================== */}
      {section === 'product-new' && (
        <Card
          title="Créer une Nouvelle Fiche Produit B2B (Page 43)"
          subtitle="Formulaire complet multilingue (FR / EN / AR), variantes, MOQ, Incoterms et Icône 3D."
          action={
            <Link to="/fournisseur/catalogue">
              <Button size="sm" variant="secondary">← Annuler</Button>
            </Link>
          }
        >
          <form onSubmit={handleCreateProduct} className="space-y-6 text-xs">
            {/* 1. Identification générale */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Input
                label="Référence SKU unique"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                required
              />
              <Input
                label="Prix unitaire HT (EUR)"
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                required
              />
              <Input
                label="Catégorie métier"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                required
              />
            </div>

            {/* 2. Libellés multilingues (FR / EN / AR avec RTL) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Désignation Multilingue du Produit (FR / EN / AR)
              </h4>
              <div className="grid sm:grid-cols-3 gap-4">
                <Input
                  label="Nom en Français (FR)"
                  value={newNameFr}
                  onChange={(e) => setNewNameFr(e.target.value)}
                  required
                />
                <Input
                  label="Product Name (English - EN)"
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  required
                />
                <div dir="rtl">
                  <Input
                    label="اسم المنتج (العربية - RTL)"
                    value={newNameAr}
                    onChange={(e) => setNewNameAr(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold">Description détaillée (FR)</label>
                    <VoiceDictationButton
                      language="fr-FR"
                      onTranscript={(t) => setNewDescFr((prev) => (prev ? `${prev} ${t}` : t))}
                      size="sm"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={newDescFr}
                    onChange={(e) => setNewDescFr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#082225] border border-slate-300 dark:border-teal-800 text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold">Detailed Description (EN)</label>
                    <VoiceDictationButton
                      language="en-US"
                      onTranscript={(t) => setNewDescEn((prev) => (prev ? `${prev} ${t}` : t))}
                      size="sm"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={newDescEn}
                    onChange={(e) => setNewDescEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#082225] border border-slate-300 dark:border-teal-800 text-xs"
                  />
                </div>
                <div dir="rtl">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold">الوصف التفصيلي (AR)</label>
                    <VoiceDictationButton
                      language="ar-SA"
                      onTranscript={(t) => setNewDescAr((prev) => (prev ? `${prev} ${t}` : t))}
                      size="sm"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={newDescAr}
                    onChange={(e) => setNewDescAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#082225] border border-slate-300 dark:border-teal-800 text-xs text-right"
                  />
                </div>
              </div>
            </div>

            {/* 3. Paramètres de stock, MOQ et Incoterms */}
            <div className="grid sm:grid-cols-4 gap-4">
              <Input
                label="Stock initial disponible"
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(Number(e.target.value))}
                required
              />
              <Input
                label="Seuil critique d'alerte min."
                type="number"
                value={newMinAlert}
                onChange={(e) => setNewMinAlert(Number(e.target.value))}
                required
              />
              <Input
                label="Quantité minimale (MOQ)"
                type="number"
                value={newMoq}
                onChange={(e) => setNewMoq(Number(e.target.value))}
                required
              />
              <Input
                label="Délai d'expédition (Jours)"
                type="number"
                value={newLeadTime}
                onChange={(e) => setNewLeadTime(Number(e.target.value))}
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Pays d'origine & fabrication"
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
                required
              />
              <Input
                label="Incoterm supporté par défaut"
                value={newIncoterm}
                onChange={(e) => setNewIncoterm(e.target.value)}
                required
              />
            </div>

            {/* 4. Choix de l'icône 3D et Galerie d'images */}
            <div>
              <label className="text-xs font-semibold block mb-2">Choisir une Icône 3D Métier :</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {ALL_3D_ICONS.slice(0, 18).map((ic) => (
                  <button
                    key={ic.name}
                    type="button"
                    onClick={() => setNewIcon(ic.name)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs transition-all ${
                      newIcon === ic.name
                        ? 'border-[#E85D22] bg-orange-500/10 font-bold'
                        : 'border-slate-200 dark:border-teal-800 hover:border-slate-300'
                    }`}
                  >
                    <Icon3D name={ic.name} size="xs" />
                    <span className="truncate">{ic.labelFr}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-teal-800">
              <Link to="/fournisseur/catalogue">
                <Button variant="secondary">Annuler</Button>
              </Link>
              <Button type="submit" variant="primary">
                Publier le Produit au Catalogue B2B
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 2. ÉDITION PRODUIT DÉTENU (/fournisseur/catalogue/:id)                 */}
      {/* ===================================================================== */}
      {section === 'product-edit' && (
        <Card
          title={`Édition Produit Détenu : ${editingProduct?.sku || ''} (Page 44)`}
          subtitle={editingProduct?.name?.[locale] || 'Fiche produit'}
          action={
            <Link to="/fournisseur/catalogue">
              <Button size="sm" variant="secondary">← Retour Catalogue</Button>
            </Link>
          }
        >
          <form onSubmit={handleUpdateProduct} className="grid sm:grid-cols-2 gap-4 text-xs">
            <Input
              label="Référence SKU"
              value={editSku}
              onChange={(e) => setEditSku(e.target.value)}
              required
            />
            <Input
              label="Prix Unitaire HT (EUR)"
              type="number"
              step="0.01"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              required
            />
            <Input
              label="Désignation (Français)"
              value={editNameFr}
              onChange={(e) => setEditNameFr(e.target.value)}
              required
            />
            <div dir="rtl">
              <Input
                label="الاسم بالعربية (العربية - RTL)"
                value={editNameAr}
                onChange={(e) => setEditNameAr(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2 flex justify-between items-center pt-4 border-t border-slate-200 dark:border-teal-800">
              <Button
                type="button"
                variant="danger"
                onClick={() => setProductToDelete(editingProduct)}
              >
                Supprimer / Archiver
              </Button>
              <Button type="submit" variant="primary">
                Enregistrer les Modifications
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 3. GESTION DES STOCKS & MOUVEMENTS (/fournisseur/stocks)              */}
      {/* ===================================================================== */}
      {section === 'stocks' && (
        <Card
          title="Gestion des Niveaux de Stocks, Mouvements & Alertes de Seuil (Page 45)"
          subtitle="Suivi temps réel du stock disponible, réservé par les commandes et alertes de rupture."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                downloadDataExport('stocks-fournisseur-export.json', JSON.stringify(myProducts, null, 2), 'application/json');
                notifyToast('Export des stocks téléchargé.', 'success');
              }}
            >
              <Download className="w-4 h-4" /> Export Stocks JSON
            </Button>
          }
        >
          <div className="space-y-4">
            <DataTable
              caption="Stocks détaillés par référence et gestion des mouvements"
              keyExtractor={(p) => p.id}
              data={myProducts}
              columns={[
                {
                  key: 'prod',
                  header: 'Produit',
                  isRowHeader: true,
                  render: (p) => (
                    <div className="flex items-center gap-3">
                      <Icon3D name={p.icon3d} size="sm" withGlow />
                      <div>
                        <strong className="text-slate-900 dark:text-white">{p.name[locale]}</strong>
                        <p className="text-xs text-slate-400 font-mono">{p.sku}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'avail',
                  header: 'Disponible',
                  render: (p) => (
                    <span className={`font-extrabold text-sm ${p.stockAvailable <= p.minStockAlert ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                      {p.stockAvailable} unités
                    </span>
                  ),
                },
                {
                  key: 'reserved',
                  header: 'Réservé (Commandes)',
                  render: (p) => (
                    <Badge variant="info">{p.stockReserved} unités</Badge>
                  ),
                },
                {
                  key: 'alert',
                  header: 'Seuil d’Alerte Min',
                  render: (p) => (
                    <span className="text-xs font-mono">{p.minStockAlert} unités</span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Ajustements Rapides',
                  render: (p) => (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateProductStock(p.id, 10, 'Réapprovisionnement usine lot régulier')}
                      >
                        +10
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateProductStock(p.id, -2, 'Sortie échantillon commercial ou rebut')}
                      >
                        -2
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setStockAdjustProductId(p.id);
                          setStockDelta(5);
                          setStockAdjustReason('Ajustement inventaire contradictoire');
                        }}
                      >
                        Ajuster...
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 4. COMMANDES REÇUES (/fournisseur/commandes)                          */}
      {/* ===================================================================== */}
      {section === 'commandes' && (
        <Card
          title="Commandes Reçues à Traiter (Page 46 — Accepter / Préparer / Expédier)"
          subtitle="Cycle de traitement B2B contrôlé côté serveur et consigné dans le journal d'audit append-only."
        >
          <div className="space-y-4">
            {myOrders.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Aucune commande reçue pour ce fournisseur.</p>
            ) : (
              myOrders.map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/fournisseur/commandes/${o.id}`}
                        className="text-sm font-bold text-[#E85D22] hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                      <Badge
                        variant={
                          o.status === 'ACCEPTED'
                            ? 'success'
                            : o.status === 'PREPARING'
                            ? 'orange'
                            : o.status === 'SHIPPED'
                            ? 'info'
                            : o.status === 'REFUSED'
                            ? 'danger'
                            : 'neutral'
                        }
                      >
                        {translateStatus(o.status, locale)}
                      </Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      Client : <strong>{o.clientName}</strong> • Date : {o.createdAt}
                    </p>
                    <p className="text-slate-500">
                      Montant Total : <strong>{formatCurrency(o.totalAmount, o.currency, locale)}</strong> • {o.items?.length || 0} ligne(s)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/fournisseur/commandes/${o.id}`}>
                      <Button size="sm" variant="secondary">
                        <Eye className="w-3.5 h-3.5" /> Consulter Détails
                      </Button>
                    </Link>

                    {o.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => updateOrderStatus(o.id, 'ACCEPTED')}
                        >
                          <Check className="w-3.5 h-3.5" /> 1. Accepter
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setOrderToRefuse(o.id)}
                        >
                          <X className="w-3.5 h-3.5" /> Refuser...
                        </Button>
                      </>
                    )}

                    {o.status === 'ACCEPTED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateOrderStatus(o.id, 'PREPARING')}
                      >
                        2. Lancer la Préparation
                      </Button>
                    )}

                    {o.status === 'PREPARING' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          updateOrderStatus(o.id, 'SHIPPED');
                          createLogisticsMission(o.id, 'usr-trans-01', true);
                          notifyToast(`Commande ${o.orderNumber} remise au transporteur MedFreight !`, 'success');
                        }}
                      >
                        <Truck className="w-3.5 h-3.5" /> 3. Remettre au Transporteur
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 4. DÉTAIL COMMANDE FOURNISSEUR (/fournisseur/commandes/:id)           */}
      {/* ===================================================================== */}
      {section === 'order-detail' && (
        <Card
          title={`Traitement Commande ${selectedOrder?.orderNumber || ''} & Affectation Logistique (Page 47)`}
          subtitle={`Acheteur : ${selectedOrder?.clientName || ''} • Destination : ${selectedOrder?.shippingAddress || ''}`}
          action={
            <Link to="/fournisseur/commandes">
              <Button size="sm" variant="secondary">← Retour Commandes</Button>
            </Link>
          }
        >
          <div className="space-y-6 text-xs">
            {/* Lignes d'articles */}
            <div>
              <h4 className="font-bold text-sm mb-3 text-slate-900 dark:text-white">
                Articles & Postes à Préparer en Entrepôt
              </h4>
              <div className="space-y-2">
                {selectedOrder?.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <Icon3D name={item.icon3d || 'pallet-load'} size="sm" withGlow />
                      <div>
                        <strong className="text-slate-900 dark:text-white">{item.name}</strong>
                        <p className="text-slate-400 font-mono">SKU: {item.sku} • Qté: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm block">
                        {formatCurrency(item.totalLine, selectedOrder.currency, locale)}
                      </span>
                      <span className="text-slate-400">PU : {formatCurrency(item.unitPrice, selectedOrder.currency, locale)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ordre de transport et documents logistiques */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#E85D22]" /> Ordre de Transport Multimodal & Documents d’Exportation
              </h4>

              {(() => {
                const linkedMission = missions.find((m) => m.orderId === selectedOrder?.id);
                if (linkedMission) {
                  return (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-900 dark:text-emerald-200">
                            Mission Logistique Active : {linkedMission.orderNumber}
                          </span>
                          <Badge variant="success">{linkedMission.status}</Badge>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">
                          Compagnie de Fret : <strong>{linkedMission.carrierName}</strong> • Type de caisse :{' '}
                          <Badge variant="orange">{linkedMission.requiredVehicleType}</Badge>
                        </p>
                        <p className="text-slate-500">
                          Enlèvement : {linkedMission.pickupAddress} → Livraison : {linkedMission.deliveryAddress}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => notifyToast('Lettre de voiture e-CMR générée pour le transporteur.', 'info')}
                        >
                          Télécharger e-CMR
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => notifyToast('Certificat d’origine EUR.1 téléchargé.', 'info')}
                        >
                          Télécharger EUR.1
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => notifyToast('Packing List de colisage PDF téléchargée.', 'info')}
                        >
                          Télécharger Packing List
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <p className="text-slate-600 dark:text-slate-300">
                      Cette commande est prête pour l’enlèvement. Vous pouvez mandater le transporteur partenaire MedFreight Multimodal Carriers :
                    </p>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        const m = createLogisticsMission(selectedOrder.id, 'usr-trans-01', true);
                        if (m) {
                          notifyToast(`Ordre de transport émis et transmis à MedFreight !`, 'success');
                        }
                      }}
                    >
                      Affecter MedFreight & Émettre Ordre de Transport
                    </Button>
                  </div>
                );
              })()}
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 5. DEVIS & PROPOSITIONS COMMERCIALES (/fournisseur/devis)              */}
      {/* ===================================================================== */}
      {section === 'devis' && (
        <Card
          title="Demandes de Devis (RFQ) & Propositions Commerciales (Page 48)"
          subtitle="Réceptionnez les demandes des acheteurs, proposez des tarifs négociés et convertissez en commandes fermes."
        >
          <div className="space-y-4">
            {myQuotes.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Aucune demande de devis en cours.</p>
            ) : (
              myQuotes.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-slate-900 dark:text-white">{q.quoteNumber}</strong>
                      <Badge variant={q.status === 'CONVERTED' ? 'success' : 'info'}>{q.status}</Badge>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      Client : <strong>{q.clientName}</strong> • Date : {q.createdAt}
                    </p>
                    <p className="text-slate-500">
                      Montant chiffré : <strong>{formatCurrency(q.totalAmount, q.currency, locale)}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {q.status !== 'CONVERTED' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setQuoteToRespond(q.id);
                            setNegotiatedAmount(q.totalAmount);
                          }}
                        >
                          Répondre / Ajuster Tarif
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => convertQuoteToOrder(q.id)}
                        >
                          Convertir en Commande Ferme
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        downloadDataExport(`devis-${q.quoteNumber}.json`, JSON.stringify(q, null, 2), 'application/json');
                        notifyToast(`Devis ${q.quoteNumber} téléchargé.`, 'info');
                      }}
                    >
                      <Download className="w-3.5 h-3.5" /> Télécharger Devis
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 5. DOCUMENTS / FACTURES ÉMISES (/fournisseur/documents)               */}
      {/* ===================================================================== */}
      {section === 'documents' && (
        <Card
          title="Factures Commerciales Émises & Archivées (Page 49)"
          subtitle="Consultation des factures fournisseurs, états de paiement et rapprochements bancaires."
        >
          <div className="space-y-3 text-xs">
            {myInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {inv.invoiceNumber} (Commande {inv.orderNumber})
                  </p>
                  <p className="text-slate-500">
                    Acheteur : {inv.clientName} • Montant : {formatCurrency(inv.totalAmount, inv.currency, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>
                    {translateStatus(inv.status, locale)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      downloadDataExport(`facture-${inv.invoiceNumber}.json`, JSON.stringify(inv, null, 2), 'application/json');
                      notifyToast(`Facture ${inv.invoiceNumber} exportée.`, 'info');
                    }}
                  >
                    <Download className="w-3.5 h-3.5" /> PDF / JSON
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 5. PAIEMENTS & ENCAISSEMENTS (/fournisseur/paiements)                  */}
      {/* ===================================================================== */}
      {section === 'paiements' && (
        <Card
          title="Paiements Reçus & Rapprochements Bancaires (Page 50)"
          subtitle="Suivi des virements SWIFT, séquestres Stripe Escrow et commissions plateforme TradeLink (2%)."
        >
          <div className="space-y-4 text-xs">
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-slate-500 block text-[11px]">Total Encaissé Réel</span>
                <span className="text-xl font-extrabold text-emerald-600">
                  {formatCurrency(stats.totalCa * 0.98, 'EUR', locale)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <span className="text-slate-500 block text-[11px]">En Séquestre (Escrow Livraisons)</span>
                <span className="text-xl font-extrabold text-blue-600">
                  {formatCurrency(14800, 'EUR', locale)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-teal-900/40 border border-slate-200 dark:border-teal-800">
                <span className="text-slate-500 block text-[11px]">Commissions Plateforme (2%)</span>
                <span className="text-xl font-extrabold text-slate-700 dark:text-slate-300">
                  {formatCurrency(stats.totalCa * 0.02, 'EUR', locale)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {myPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
                >
                  <div>
                    <strong className="text-slate-900 dark:text-white text-sm">
                      {p.paymentReference} ({p.provider})
                    </strong>
                    <p className="text-slate-500">
                      Facture associée : {p.invoiceNumber} • Reçu le {p.createdAt}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-sm text-emerald-600 block">
                      +{formatCurrency(p.amount, p.currency, locale)}
                    </span>
                    <Badge variant="success">{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 6. CLIENTS & COMMUNICATION (/fournisseur/clients)                     */}
      {/* ===================================================================== */}
      {section === 'clients' && (
        <Card
          title="Portefeuille Clients B2B & Messagerie Commerciale"
          subtitle="Historique des acheteurs ayant contracté avec EuroTech Industrial et messagerie directe."
        >
          <div className="space-y-4 text-xs">
            <DataTable
              caption="Clients actifs ayant réalisé des transactions commerciales"
              keyExtractor={(c) => c.id}
              data={uniqueClients}
              columns={[
                {
                  key: 'client',
                  header: 'Client & Société',
                  isRowHeader: true,
                  render: (c) => (
                    <div className="flex items-center gap-3">
                      <Building className="w-4 h-4 text-[#E85D22]" />
                      <div>
                        <strong className="text-slate-900 dark:text-white text-sm">{c.name}</strong>
                        <p className="text-slate-400">ID: {c.id}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'orders',
                  header: 'Commandes Cumulées',
                  render: (c) => <Badge variant="info">{c.ordersCount} commande(s)</Badge>,
                },
                {
                  key: 'total',
                  header: 'Volume d’Affaires Total',
                  render: (c) => (
                    <span className="font-extrabold text-sm">
                      {formatCurrency(c.totalSpent, 'EUR', locale)}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions & Contact',
                  render: (c) => (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        notifyToast(`Fil de messagerie sécurisé ouvert avec ${c.name}.`, 'info')
                      }
                    >
                      <Mail className="w-3.5 h-3.5" /> Message Direct
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 7. LOGISTIQUE & EXPÉDITIONS (/fournisseur/logistique)                  */}
      {/* ===================================================================== */}
      {section === 'logistique' && (
        <div className="space-y-6">
          <Card
            title="Hub Logistique Vendeur & Préparation des Expéditions"
            subtitle="Calculateur de colisage par palettes Europe, température dirigée et transmission transporteur."
          >
            <div className="grid md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-[#E85D22]" /> Quai de Chargement Départ
                </span>
                <p className="text-slate-500">
                  Hambourg Port ColdChain Hub — Terminal Conteneurs Quai B
                </p>
                <Badge variant="orange">Départ Maritime Régulier</Badge>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-500" /> Colisage & Palettisation
                </span>
                <p className="text-slate-500">
                  Palettes Europe 1200x800 mm • Filmage isotherme sous vide
                </p>
                <Badge variant="info">Norme ATP & GDP</Badge>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-500" /> Transporteur Agréé
                </span>
                <p className="text-slate-500">
                  MedFreight Multimodal Carriers (Route maritime & routière)
                </p>
                <Badge variant="success">Sous Contrat Cadre</Badge>
              </div>
            </div>
          </Card>

          {/* Carte interactive des corridors de fret */}
          <Card
            title="Traçabilité GPS & Corridors de Transit Maritime / Routier"
            subtitle="Visualisation interactive des flux logistiques entre l’Allemagne et le Maroc."
          >
            <InteractiveLogisticsMap />
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. ASSISTANT IA & OUTILS INTELLIGENTS (/fournisseur/ia)                */}
      {/* ===================================================================== */}
      {section === 'assistant-ia' && (
        <div className="space-y-6">
          <Card
            title="Assistant IA Vendeur : Générateur de Fiches & Argumentaires B2B"
            subtitle="Génération assistée, traduction instantanée (FR/EN/AR), analyse des ventes et prédictions."
          >
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Nom ou idée du produit à développer :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPromptTopic}
                    onChange={(e) => setAiPromptTopic(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
                    placeholder="Ex: Drone cargo, Groupe frigo solaire, Capteur RFID..."
                  />
                  <Button
                    type="button"
                    variant="primary"
                    disabled={isGeneratingAi}
                    onClick={handleGenerateAiProductCard}
                  >
                    <Sparkles className="w-4 h-4" /> {isGeneratingAi ? 'Génération...' : 'Générer avec l’IA'}
                  </Button>
                </div>
              </div>

              {aiGeneratedResult && (
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 whitespace-pre-line text-xs font-mono text-slate-800 dark:text-slate-100">
                  {aiGeneratedResult}
                </div>
              )}
            </div>
          </Card>

          {/* Dictée Vocale Intégrée */}
          <Card
            title="Dictée Vocale Multilingue STT / TTS"
            subtitle="Dictez vos fiches produits, notes d'expédition ou messages clients en Français, Anglais ou Arabe."
          >
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Statut du Microphone : {isVoiceRecording ? 'Enregistrement actif...' : 'En veille'}
                </span>
                <Button
                  variant={isVoiceRecording ? 'danger' : 'primary'}
                  onClick={() => {
                    if (isVoiceRecording) {
                      stopVoiceDictation();
                    } else {
                      startVoiceDictation(locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'fr-FR');
                    }
                  }}
                >
                  {isVoiceRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isVoiceRecording ? 'Arrêter Enregistrement' : 'Démarrer la Dictée'}
                </Button>
              </div>
              {voiceTranscript && (
                <div className="p-3 rounded-xl bg-white dark:bg-[#082225] border border-slate-200 dark:border-teal-800 font-mono">
                  Transcription : {voiceTranscript}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 9. ROOM LIVE FOURNISSEUR (/fournisseur/room-live) — CRÉATION AUTORISÉE */}
      {/* ===================================================================== */}
      {section === 'room-live' && (
        <Card
          title="Room Live Vendeur B2B — Création de Salles & Négociations Directes (Page 51)"
          subtitle="En tant que Fournisseur opérationnel, vous disposez du privilège de créer des salles, inviter des acheteurs et modérer les sessions."
        >
          <div className="space-y-6 text-xs">
            {/* Formulaire de création */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-[#E85D22]" /> Créer une Nouvelle Salle Room Live
              </h4>
              <div className="grid sm:grid-cols-3 gap-3 items-end">
                <Input
                  label="Titre de la visioconférence"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                />
                <Input
                  label="Date & Heure programmée"
                  value={roomScheduledAt}
                  onChange={(e) => setRoomScheduledAt(e.target.value)}
                />
                <div>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      const res = createRoomLive(roomTitle, roomScheduledAt);
                      if (res.ok) {
                        notifyToast(`Salle Room Live créée avec succès ! Code : ${res.room?.roomCode}`, 'success');
                      }
                    }}
                  >
                    + Créer la Salle
                  </Button>
                </div>
              </div>
            </div>

            {/* Salles existantes */}
            <div className="grid md:grid-cols-2 gap-4">
              {rooms.map((rm) => (
                <div
                  key={rm.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
                >
                  <div>
                    <strong className="text-slate-900 dark:text-white text-sm block">{rm.title}</strong>
                    <p className="text-slate-400 font-mono text-[11px]">
                      Code: {rm.roomCode} • Prévue le {rm.scheduledAt}
                    </p>
                    <div className="mt-1">
                      <Badge variant={rm.status === 'LIVE' ? 'success' : 'neutral'}>
                        {rm.status === 'LIVE' ? 'En Direct' : 'Programmée'}
                      </Badge>
                    </div>
                  </div>
                  <Link to={`/room/${rm.id}`}>
                    <Button size="sm" variant="secondary">
                      Entrer en Salle
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 10. KYC DU FOURNISSEUR (/fournisseur/kyc)                             */}
      {/* ===================================================================== */}
      {section === 'kyc' && <ActorKycWorkspaceView actorProfile="FOURNISSEUR" />}

      {/* ===================================================================== */}
      {/* 10. PARAMÈTRES & GOUVERNANCE (/fournisseur/parametres)                */}
      {/* ===================================================================== */}
      {section === 'parametres' && (
        <div className="space-y-6">
          <Card
            title="Profil Entreprise & Coordonnées Vendeur (Page 52)"
            subtitle="Informations légales certifiées au registre du commerce allemand (Handelsregister)."
          >
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <Input
                label="Raison Sociale"
                defaultValue={currentUser.companyName}
                readOnly
              />
              <Input
                label="Numéro de TVA Intracommunautaire"
                defaultValue="DE 314 982 741"
                readOnly
              />
              <Input
                label="Entrepôt Principal d'Enlèvement"
                defaultValue="Hambourg Port Logistics Zone B - Terminal Frigorifique"
              />
              <Input
                label="Contact Commercial Référent"
                defaultValue={`${currentUser.firstName} ${currentUser.lastName} (${currentUser.email})`}
              />
            </div>
          </Card>

          <Card
            title="Informations Bancaires Protégées (KMS AES-256-GCM)"
            subtitle="Coordonnées pour le versement des fonds après levée du séquestre de livraison."
          >
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <Input
                label="IBAN Allemand (Protégé & Masqué)"
                defaultValue="DE89 3704 **** **** **** 0130 00"
                readOnly
              />
              <Input
                label="Code BIC / SWIFT"
                defaultValue="DEUTDEDDFXXX"
                readOnly
              />
            </div>
          </Card>

          <Card
            title="Préférences d’Affichage, Langues & Thème"
            subtitle="Personnalisation de l’expérience utilisateur multilingue."
          >
            <div className="grid sm:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="font-semibold block mb-2">Langue de l’Interface :</label>
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
                <label className="font-semibold block mb-2">Thème (3 États) :</label>
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
      {/* MODAL : REFUS MOTIVÉ D'UNE COMMANDE                                   */}
      {/* ===================================================================== */}
      {orderToRefuse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Refus Motivé de la Commande
            </h3>
            <p className="text-slate-500">
              Conformément aux règles de la plateforme TradeLink, tout refus doit comporter une justification objective afin de libérer le séquestre client.
            </p>

            <div>
              <label className="block text-xs font-semibold mb-1">Motif de rejet :</label>
              <select
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
              >
                <option value="Rupture imprévue sur chaîne d’assemblage usine">Rupture imprévue sur chaîne d’assemblage usine</option>
                <option value="Impossibilité logistique d'honorer le délai exigé">Impossibilité logistique d'honorer le délai exigé</option>
                <option value="Incompatibilité d’emballage pour fret maritime">Incompatibilité d’emballage pour fret maritime</option>
                <option value="Désaccord commercial ou vérification solvabilité">Désaccord commercial ou vérification solvabilité</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setOrderToRefuse(null)}>
                Annuler
              </Button>
              <Button variant="danger" onClick={handleApplyRefusal}>
                Confirmer le Refus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : AJUSTEMENT DE STOCK AVEC MOTIF OBLIGATOIRE                    */}
      {/* ===================================================================== */}
      {stockAdjustProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#E85D22]" />
              Ajustement Manuel de Stock
            </h3>

            <div>
              <label className="block text-xs font-semibold mb-1">Quantité (+/- unités) :</label>
              <input
                type="number"
                value={stockDelta}
                onChange={(e) => setStockDelta(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Motif obligatoire de l'ajustement :</label>
              <input
                type="text"
                value={stockAdjustReason}
                onChange={(e) => setStockAdjustReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
                placeholder="Ex: Réception lot usine, Casse quai..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setStockAdjustProductId(null)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={handleApplyStockAdjustment}>
                Valider l'Ajustement
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : IMPORT EN MASSE CSV / JSON                                    */}
      {/* ===================================================================== */}
      {bulkImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#E85D22]" />
              Importation de Produits en Masse (JSON / CSV)
            </h3>
            <p className="text-slate-500">
              Collez ci-dessous votre tableau de produits structuré. Le système validera les références SKU et les intégrera au catalogue.
            </p>

            <textarea
              rows={8}
              value={bulkImportText}
              onChange={(e) => setBulkImportText(e.target.value)}
              className="w-full p-3 font-mono text-[11px] rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800"
            />

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setBulkImportModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={handleProcessBulkImport}>
                Lancer l'Importation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : PROPOSITION COMMERCIALE NÉGOCIÉE POUR DEVIS                   */}
      {/* ===================================================================== */}
      {quoteToRespond && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Émettre une Proposition Commerciale Négociée
            </h3>

            <div>
              <label className="block text-xs font-semibold mb-1">Montant total négocié (EUR) :</label>
              <input
                type="number"
                step="0.01"
                value={negotiatedAmount}
                onChange={(e) => setNegotiatedAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Notes et conditions accordées :</label>
              <textarea
                rows={3}
                value={negotiationNotes}
                onChange={(e) => setNegotiationNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setQuoteToRespond(null)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  respondToQuote(quoteToRespond, negotiatedAmount, negotiationNotes);
                  setQuoteToRespond(null);
                }}
              >
                Transmettre l'Offre au Client
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DIALOGUE DE CONFIRMATION : SUPPRESSION OU ARCHIVAGE SELON RÈGLE MÉTIER */}
      {/* ===================================================================== */}
      <ConfirmDialog
        open={Boolean(productToDelete)}
        title="Suppression ou Archivage du Produit"
        description={`Confirmez-vous l'opération sur ${productToDelete?.sku || ''} ? Si des commandes en cours référencent cet article, il sera automatiquement archivé afin de préserver l'intégrité comptable et douanière.`}
        confirmLabel="Confirmer"
        onConfirm={handleExecuteDeleteOrArchive}
        onClose={() => setProductToDelete(null)}
      />
    </div>
  );
};
