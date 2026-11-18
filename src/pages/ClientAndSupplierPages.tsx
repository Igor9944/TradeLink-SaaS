// ============================================================================
// TRADELINK V6.0 — ESPACE CLIENT (PAGES 23 À 39) & FOURNISSEUR (PAGES 40 À 52)
// UX/UI Finalisée : Stepper Checkout, Quantités Panier, Produits Similaires,
// Sélecteur de Thème 3 États (Système/Clair/Noir) & Édition Produit Réelle
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
  Truck,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, translateStatus } from '../i18n/translations';
import { ActorKycWorkspaceView } from '../components/kyc/KycModuleViews';
import { ALL_3D_ICONS, Icon3D } from '../components/ui/Icon3D';
import { InteractiveLogisticsMap } from '../components/logistics/InteractiveLogisticsMap';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  RadioGroup,
  SearchBar,
  Stepper,
} from '../components/ui/DesignSystem';
import { Icon3DName, ThemeMode } from '../types';

// ============================================================================
// ESPACE CLIENT (PAGES 23 À 39)
// ============================================================================

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
    theme,
    setTheme,
    currentUser,
    products,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    orders,
    createOrderFromCart,
    quotes,
    createQuote,
    convertQuoteToOrder,
    invoices,
    payInvoice,
    payments,
    shipments,
    waypoints,
    vehicles,
    rooms,
    createRoomLive,
    notifyToast,
  } = useApp();

  const navigate = useNavigate();
  const params = useParams();
  const [search, setSearch] = useState('');
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [shippingAddr, setShippingAddr] = useState(
    'Zone Logistique Zenata, Lot 14, Casablanca, Maroc'
  );
  const [paymentMethod, setPaymentMethod] = useState('STRIPE_B2B');
  const [newQuoteDesc, setNewQuoteDesc] = useState('Conteneur Maritime 40HC Certifié CSC (x5)');
  const [newQuoteQty, setNewQuoteQty] = useState(5);
  const [newQuotePrice, setNewQuotePrice] = useState('3500.00');

  const myOrders = orders;
  const myInvoices = invoices;
  const myQuotes = quotes;

  const selectedProduct =
    products.find((p) => p.id === params.id) ?? products[0];
  const similarProducts = products
    .filter((p) => p.id !== selectedProduct.id)
    .slice(0, 3);
  const selectedOrder =
    myOrders.find((o) => o.id === params.id) ?? myOrders[0];

  const cartSubtotal = cart.reduce(
    (s, item) => s + parseFloat(item.product.unitPrice) * item.quantity,
    0
  );
  const cartTax = cartSubtotal * 0.2;
  const cartTotal = cartSubtotal + cartTax + (cart.length > 0 ? 650 : 0);

  return (
    <div className="space-y-6">
      {/* Navigation rapide Espace Client (17 routes) */}
      <div className="rounded-3xl bg-white dark:bg-[#0B2D31] p-5 border border-slate-200 dark:border-teal-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Icon3D name="pallet-load" size="lg" withGlow />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="orange">ESPACE CLIENT B2B</Badge>
              <Badge variant="success">OWNERSHIP VÉRIFIÉ</Badge>
            </div>
            <h1 className="text-xl font-extrabold mt-1">{currentUser.companyName}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { to: '/client/dashboard', label: '23. Dashboard' },
            { to: '/client/kyc', label: '24. Mon KYC' },
            { to: '/client/kyc/upload', label: '25. Upload KYC' },
            { to: '/client/catalogue', label: '26. Catalogue' },
            { to: '/client/panier', label: `28. Panier (${cart.length})` },
            { to: '/client/checkout', label: '29. Checkout' },
            { to: '/client/commandes', label: '30. Commandes' },
            { to: '/client/devis', label: '32. Devis' },
            { to: '/client/devis/nouveau', label: '33. Nouveau Devis' },
            { to: '/client/factures', label: '34. Factures' },
            { to: '/client/paiements', label: '35. Paiements' },
            { to: '/client/logistique', label: '36. Logistique' },
            { to: '/client/documents', label: '37. Documents' },
            { to: '/client/room-live', label: '38. Room Live' },
            { to: '/client/parametres', label: '39. Paramètres' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-teal-900/60 hover:bg-[#E85D22] hover:text-white font-semibold transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 23. DASHBOARD CLIENT (/client/dashboard) */}
      {section === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Commandes Actives</p>
                  <p className="text-2xl font-extrabold mt-1">{myOrders.length}</p>
                  <p className="text-xs text-emerald-600 mt-1">1 en transit aérien</p>
                </div>
                <Icon3D name="parcel-stack" size="lg" withGlow />
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Volume Facturé TTC</p>
                  <p className="text-2xl font-extrabold mt-1">
                    {formatCurrency(67060, 'EUR', locale)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">1 payée • 1 à échéance</p>
                </div>
                <Icon3D name="invoice" size="lg" withGlow />
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Statut KYC (7 Jours)</p>
                  <p className="text-lg font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">
                    Soumis à J+4
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Protégé contre suspension J+7</p>
                </div>
                <Icon3D name="customs-stamp" size="lg" withGlow />
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Salles Room Live</p>
                  <p className="text-2xl font-extrabold mt-1">{rooms.length} Invitations</p>
                  <p className="text-xs text-orange-500 mt-1">1 délégation d’hôte ponctuelle</p>
                </div>
                <Icon3D name="support" size="lg" withGlow />
              </div>
            </Card>
          </div>

          <Card
            title="Dernières Commandes & Expéditions (Ownership Client)"
            action={
              <Link to="/client/catalogue">
                <Button size="sm" variant="primary">Parcourir le Catalogue B2B</Button>
              </Link>
            }
          >
            <DataTable
              caption="Commandes récentes du client"
              keyExtractor={(o) => o.id}
              data={myOrders}
              columns={[
                {
                  key: 'num',
                  header: 'Référence Commande',
                  isRowHeader: true,
                  render: (o) => (
                    <Link
                      to={`/client/commandes/${o.id}`}
                      className="font-bold text-[#E85D22] hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  ),
                },
                {
                  key: 'supp',
                  header: 'Fournisseur',
                  render: (o) => <span>{o.supplierName}</span>,
                },
                {
                  key: 'status',
                  header: 'Statut',
                  render: (o) => (
                    <Badge variant={o.status === 'SHIPPED' ? 'success' : 'warning'}>
                      {translateStatus(o.status, locale)}
                    </Badge>
                  ),
                },
                {
                  key: 'total',
                  header: 'Total TTC',
                  render: (o) => (
                    <span className="font-bold">
                      {formatCurrency(o.totalAmount, o.currency, locale)}
                    </span>
                  ),
                },
                {
                  key: 'act',
                  header: 'Actions',
                  render: (o) => (
                    <Link to={`/client/commandes/${o.id}`}>
                      <Button size="sm" variant="secondary">Timeline & Détails</Button>
                    </Link>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* 24. MON KYC (/client/kyc) */}
      {section === 'kyc' && <ActorKycWorkspaceView actorProfile="CLIENT" />}

      {/* 25. UPLOAD KYC (/client/kyc/upload) */}
      {section === 'kyc-upload' && (
        <ActorKycWorkspaceView actorProfile="CLIENT" focusUploadSection />
      )}

      {/* 26. CATALOGUE B2B (/client/catalogue) */}
      {section === 'catalogue' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[260px]">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Rechercher un produit B2B, SKU, Incoterm, équipement chaîne du froid..."
              />
            </div>
            <Link to="/client/panier">
              <Button variant="primary">
                <ShoppingCart className="w-4 h-4" />
                Voir le Panier ({cart.reduce((s, i) => s + i.quantity, 0)})
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products
              .filter(
                (p) =>
                  p.name[locale].toLowerCase().includes(search.toLowerCase()) ||
                  p.sku.toLowerCase().includes(search.toLowerCase()) ||
                  p.category.toLowerCase().includes(search.toLowerCase())
              )
              .map((prod) => (
                <Card key={prod.id} className="flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <Icon3D name={prod.icon3d} size="xl" withGlow />
                      <div className="text-end">
                        <Badge variant="orange">{prod.sku}</Badge>
                        <p className="text-[11px] text-slate-500 mt-1">{prod.incoterm}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#E85D22]">{prod.category}</span>
                      <Link
                        to={`/client/catalogue/${prod.id}`}
                        className="block text-base font-bold mt-0.5 hover:text-[#E85D22]"
                      >
                        {prod.name[locale]}
                      </Link>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {prod.description[locale]}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-teal-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                          {formatCurrency(prod.unitPrice, prod.currency, locale)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          HT / {prod.unit} • Dispo : <strong>{prod.stockAvailable}</strong>
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <Link to={`/client/catalogue/${prod.id}`}>
                          <Button size="sm" variant="secondary">Fiche (27)</Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => addToCart(prod, 1)}
                        >
                          + Panier
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* 27. FICHE PRODUIT DÉTAILLÉE & PRODUITS SIMILAIRES (/client/catalogue/:id) */}
      {section === 'product-detail' && (
        <div className="space-y-6">
          <Card
            title={`Fiche Produit B2B : ${selectedProduct.name[locale]} (Page 27)`}
            subtitle={`SKU : ${selectedProduct.sku} • Fournisseur : ${selectedProduct.supplierName} • Origine : ${selectedProduct.originCountry}`}
            action={
              <Link to="/client/catalogue">
                <Button size="sm" variant="secondary">← Retour Catalogue</Button>
              </Link>
            }
          >
            <div className="grid md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                <Icon3D name={selectedProduct.icon3d} size="2xl" withGlow />
                <Badge variant="orange">{selectedProduct.incoterm}</Badge>
              </div>
              <div className="md:col-span-8 space-y-4 text-xs">
                <p className="text-sm leading-relaxed">{selectedProduct.description[locale]}</p>
                <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                  <div>
                    <span className="text-slate-500">Prix Unitaire HT</span>
                    <p className="text-lg font-extrabold text-[#E85D22]">
                      {formatCurrency(selectedProduct.unitPrice, selectedProduct.currency, locale)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Stock Disponible</span>
                    <p className="text-lg font-extrabold">{selectedProduct.stockAvailable} {selectedProduct.unit}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Délai Logistique</span>
                    <p className="text-lg font-extrabold">{selectedProduct.leadTimeDays} jours</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="primary" onClick={() => addToCart(selectedProduct, 1)}>
                    Ajouter au Panier B2B
                  </Button>
                  <Link to="/client/panier">
                    <Button variant="secondary">Aller au Panier</Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Produits Similaires Recommandés (Même Fil Logistique B2B)">
            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              {similarProducts.map((sp) => (
                <div
                  key={sp.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon3D name={sp.icon3d} size="md" withGlow />
                    <div>
                      <Link
                        to={`/client/catalogue/${sp.id}`}
                        className="font-bold hover:text-[#E85D22]"
                      >
                        {sp.name[locale]}
                      </Link>
                      <p className="text-slate-500">
                        {formatCurrency(sp.unitPrice, sp.currency, locale)}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => addToCart(sp, 1)}>
                    +
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 28. PANIER (/client/panier) */}
      {section === 'panier' && (
        <Card
          title="Panier Commercial B2B (Page 28)"
          subtitle="Ajustement des quantités (+/-), calcul des taxes et réservation de stock"
          action={
            <Link to="/client/checkout">
              <Button size="sm" variant="primary" disabled={cart.length === 0}>
                Passer au Checkout (Page 29) →
              </Button>
            </Link>
          }
        >
          {cart.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Icon3D name="hand-truck" size="xl" />
              <p className="text-sm text-slate-500">Votre panier B2B est vide.</p>
              <Link to="/client/catalogue">
                <Button variant="primary">Explorer le Catalogue</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <Icon3D name={item.product.icon3d} size="md" withGlow />
                    <div>
                      <p className="text-sm font-bold">{item.product.name[locale]}</p>
                      <p className="text-xs text-slate-500">
                        SKU: {item.product.sku} • Prix unitaire :{' '}
                        {formatCurrency(item.product.unitPrice, 'EUR', locale)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-2 bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.product.id, -1)}
                        aria-label="Diminuer la quantité"
                        className="p-1 hover:text-[#E85D22]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold px-2">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.product.id, 1)}
                        aria-label="Augmenter la quantité"
                        className="p-1 hover:text-[#E85D22]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="font-extrabold text-sm">
                      {formatCurrency(
                        parseFloat(item.product.unitPrice) * item.quantity,
                        'EUR',
                        locale
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      aria-label="Retirer l'article"
                      className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-teal-800">
                <Link to="/client/checkout">
                  <Button variant="primary" size="lg">
                    Procéder au Checkout ({formatCurrency(cartTotal, 'EUR', locale)} TTC)
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 29. CHECKOUT AVEC STEPPER (/client/checkout) */}
      {section === 'checkout' && (
        <Card
          title="Passage de Commande B2B — Stepper Adresse, Livraison & Paiement (Page 29)"
          subtitle="Validation avec clé d’idempotence anti-doublon et réservation immédiate du stock"
        >
          <div className="space-y-6">
            <Stepper
              currentStepIndex={checkoutStep}
              onStepClick={setCheckoutStep}
              steps={[
                { id: 'addr', label: '1. Adresse & Incoterm', description: 'Destination logistique' },
                { id: 'ship', label: '2. Mode de Transport', description: 'Aérien / Maritime / TIR' },
                { id: 'pay', label: '3. Règlement B2B', description: 'Stripe / SWIFT / L/C' },
              ]}
            />

            <div className="grid md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <Input
                  label="1. Adresse de livraison logistique / Entrepôt destinataire"
                  value={shippingAddr}
                  onChange={(e) => setShippingAddr(e.target.value)}
                />
                <RadioGroup
                  label="2. Moyen de règlement B2B :"
                  name="paymentMethod"
                  value={paymentMethod}
                  onChange={(val) => {
                    setPaymentMethod(val);
                    setCheckoutStep(2);
                  }}
                  options={[
                    { value: 'STRIPE_B2B', label: 'Stripe B2B', description: 'Webhook idempotent' },
                    { value: 'WIRE_SWIFT', label: 'Virement SWIFT', description: 'IBAN / Rapprochement' },
                    { value: 'LETTER_OF_CREDIT', label: 'Crédoc L/C', description: 'Trade Finance' },
                  ]}
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
                <p className="font-bold text-sm">Récapitulatif Financier</p>
                <div className="flex justify-between">
                  <span>Sous-total HT :</span>
                  <strong>{formatCurrency(cartSubtotal, 'EUR', locale)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>TVA (20%) :</span>
                  <strong>{formatCurrency(cartTax, 'EUR', locale)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Fret Multimodal :</span>
                  <strong>{formatCurrency(cart.length > 0 ? 650 : 0, 'EUR', locale)}</strong>
                </div>
                <div className="flex justify-between text-base font-extrabold pt-2 border-t border-slate-200 dark:border-teal-800 text-[#E85D22]">
                  <span>Total TTC :</span>
                  <span>{formatCurrency(cartTotal, 'EUR', locale)}</span>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-3"
                  disabled={cart.length === 0}
                  onClick={() => {
                    const created = createOrderFromCart(shippingAddr, paymentMethod);
                    if (created) navigate(`/client/commandes/${created.id}`);
                  }}
                >
                  Confirmer & Créer la Commande ({paymentMethod})
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 30. MES COMMANDES (/client/commandes) */}
      {section === 'commandes' && (
        <Card
          title="Mes Commandes B2B (Page 30)"
          subtitle="Liste filtrée par propriété de ressource (Ownership Client)"
        >
          <div className="space-y-4">
            {myOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/client/commandes/${ord.id}`}
                      className="text-sm font-bold text-[#E85D22] hover:underline"
                    >
                      {ord.orderNumber}
                    </Link>
                    <Badge variant="success">{translateStatus(ord.status, locale)}</Badge>
                  </div>
                  <p className="mt-1">
                    Fournisseur : <strong>{ord.supplierName}</strong> • Créée le {ord.createdAt}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm">
                    {formatCurrency(ord.totalAmount, ord.currency, locale)}
                  </span>
                  <Link to={`/client/commandes/${ord.id}`}>
                    <Button size="sm" variant="secondary">Détail & Timeline (Page 31)</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 31. DÉTAIL COMMANDE (/client/commandes/:id) */}
      {section === 'order-detail' && (
        <Card
          title={`Détail Commande ${selectedOrder.orderNumber} (Page 31)`}
          subtitle={`Fournisseur : ${selectedOrder.supplierName} • Livraison : ${selectedOrder.shippingAddress}`}
          action={
            <div className="flex gap-2">
              {selectedOrder.authorizedRoomId && (
                <Link to={`/room/${selectedOrder.authorizedRoomId}`}>
                  <Button size="sm" variant="primary">Rejoindre Room Live Associée</Button>
                </Link>
              )}
              <Link to="/client/commandes">
                <Button size="sm" variant="secondary">← Retour Commandes</Button>
              </Link>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {selectedOrder.items.map((it) => (
                <div
                  key={it.sku}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Icon3D name={it.icon3d} size="sm" />
                    <div>
                      <p className="font-bold">{it.name}</p>
                      <p className="text-slate-500">
                        Qté : {it.quantity} × {formatCurrency(it.unitPrice, selectedOrder.currency, locale)}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold">
                    {formatCurrency(it.totalLine, selectedOrder.currency, locale)}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
              <p className="text-xs font-bold uppercase text-slate-400 mb-3">
                Timeline de Suivi Audité (Composant 44 : OrderTimeline)
              </p>
              <div className="grid sm:grid-cols-5 gap-2.5 text-xs">
                {selectedOrder.timeline.map((step, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border ${
                      step.completed
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-white dark:bg-[#0B2D31] border-slate-200 dark:border-teal-800 opacity-60'
                    }`}
                  >
                    <p className="font-bold">{step.step}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{step.timestamp}</p>
                    <p className="text-[10px] font-mono text-[#E85D22] mt-0.5">{step.actor}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 32. MES DEVIS (/client/devis) */}
      {section === 'devis' && (
        <Card
          title="Mes Devis B2B & Conversion en Commande (Page 32)"
          action={
            <Link to="/client/devis/nouveau">
              <Button size="sm" variant="primary">+ Nouveau Devis (Page 33)</Button>
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
                    <span className="text-sm font-bold text-[#E85D22]">{q.quoteNumber}</span>
                    <Badge variant="info">{q.status}</Badge>
                  </div>
                  <p className="mt-1 font-medium">
                    Total TTC : <strong>{formatCurrency(q.totalAmount, q.currency, locale)}</strong>
                  </p>
                  <p className="text-slate-500 italic">« {q.amountInWords} »</p>
                </div>
                {q.status !== 'CONVERTED' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => convertQuoteToOrder(q.id)}
                  >
                    Convertir en Commande B2B
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 33. CRÉATION DEVIS (/client/devis/nouveau) */}
      {section === 'quote-new' && (
        <Card
          title="Création d’un Devis B2B avec Calcul Automatique & Montant en Lettres (Page 33)"
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
                amountInWords: `${tot.toFixed(2)} Euros TTC (Arrêté au présent devis)`,
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
              navigate('/client/devis');
            }}
            className="grid sm:grid-cols-4 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <Input
                label="Désignation de l’équipement"
                value={newQuoteDesc}
                onChange={(e) => setNewQuoteDesc(e.target.value)}
              />
            </div>
            <Input
              label="Quantité"
              type="number"
              value={newQuoteQty}
              onChange={(e) => setNewQuoteQty(Number(e.target.value))}
            />
            <Input
              label="Prix Unitaire HT (EUR)"
              value={newQuotePrice}
              onChange={(e) => setNewQuotePrice(e.target.value)}
            />
            <div className="sm:col-span-4 flex justify-end">
              <Button type="submit" variant="primary">Enregistrer le Devis</Button>
            </div>
          </form>
        </Card>
      )}

      {/* 34. MES FACTURES (/client/factures) */}
      {section === 'factures' && (
        <Card
          title="Mes Factures PDF & Règlement (Page 34)"
          subtitle="Téléchargement PDF conforme à la juridiction et paiement Stripe idempotent"
          action={
            <Link to="/client/paiements">
              <Button size="sm" variant="secondary">Historique Paiements (Page 35) →</Button>
            </Link>
          }
        >
          <DataTable
            caption="Liste des factures client"
            keyExtractor={(inv) => inv.id}
            data={myInvoices}
            columns={[
              {
                key: 'num',
                header: 'Facture',
                isRowHeader: true,
                render: (inv) => <span className="font-bold">{inv.invoiceNumber}</span>,
              },
              {
                key: 'ord',
                header: 'Commande',
                render: (inv) => <span>{inv.orderNumber}</span>,
              },
              {
                key: 'tot',
                header: 'Montant TTC',
                render: (inv) => (
                  <span className="font-bold">
                    {formatCurrency(inv.totalAmount, inv.currency, locale)}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Statut',
                render: (inv) => (
                  <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>
                    {translateStatus(inv.status, locale)}
                  </Badge>
                ),
              },
              {
                key: 'act',
                header: 'Action',
                render: (inv) =>
                  inv.status === 'PAID' ? (
                    <span className="text-xs text-emerald-600 font-semibold">
                      Payée le {inv.paidAt}
                    </span>
                  ) : (
                    <Button size="sm" variant="primary" onClick={() => payInvoice(inv.id)}>
                      Payer via Stripe (Idempotent)
                    </Button>
                  ),
              },
            ]}
          />
        </Card>
      )}

      {/* 35. HISTORIQUE DES PAIEMENTS (/client/paiements) */}
      {section === 'paiements' && (
        <Card
          title="Historique des Paiements & Rapprochements Idempotents (Page 35)"
          subtitle="Webhooks signés, horodatés et protégés contre la double comptabilisation"
        >
          <DataTable
            caption="Historique des paiements client"
            keyExtractor={(p) => p.id}
            data={payments}
            columns={[
              {
                key: 'ref',
                header: 'Référence Paiement',
                isRowHeader: true,
                render: (p) => <span className="font-mono font-bold text-xs">{p.paymentReference}</span>,
              },
              { key: 'inv', header: 'Facture', render: (p) => <span>{p.invoiceNumber}</span> },
              { key: 'prov', header: 'Canal', render: (p) => <Badge variant="orange">{p.provider}</Badge> },
              {
                key: 'amt',
                header: 'Montant',
                render: (p) => <span className="font-bold">{formatCurrency(p.amount, p.currency, locale)}</span>,
              },
              {
                key: 'wh',
                header: 'Idempotence Webhook',
                render: (p) => (
                  <span className="font-mono text-xs text-emerald-600 ltr-preserve">
                    ✓ {p.webhookEventId}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* 36. LOGISTIQUE (/client/logistique) */}
      {section === 'logistique' && (
        <div className="space-y-6">
          {/* CARTE INTERACTIVE GÉOLOCALISÉE */}
          <InteractiveLogisticsMap
            shipment={shipments.find((s) => s.id === 'shp-03') ?? shipments[0]}
            waypoints={waypoints[shipments.find((s) => s.id === 'shp-03')?.id || 'shp-03'] || []}
            vehicle={vehicles[0]}
            title="Suivi Géographique en Temps Réel de vos Expéditions Clientes"
          />

          <Card title="Suivi Multimodal des Expéditions Client (Page 36)">
            <div className="grid md:grid-cols-2 gap-4">
              {shipments.map((s) => (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon3D name={s.icon3d} size="md" withGlow />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{s.trackingNumber}</p>
                        <p className="text-slate-500">{s.carrierName} • Mode : {s.transportMode}</p>
                      </div>
                    </div>
                    <Badge variant={s.status === 'DELIVERED' ? 'success' : 'orange'}>
                      {translateStatus(s.status, locale)}
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
                      onClick={() => notifyToast(`Téléchargement du CMR certifié pour ${s.trackingNumber}...`, 'info')}
                    >
                      Télécharger e-CMR
                    </Button>
                    {s.podSigned && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => notifyToast(`Téléchargement de la Preuve POD signée pour ${s.trackingNumber}...`, 'success')}
                      >
                        Télécharger Preuve POD
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 37. MES DOCUMENTS GED (/client/documents) */}
      {section === 'documents' && (
        <Card
          title="Mes Documents GED, Contrats, CMR & Extraction OCR (Page 37)"
          subtitle="Scan antivirus automatique, prévisualisation et partage selon consentement"
          action={
            <Link to="/ocr-idp">
              <Button size="sm" variant="primary">Ouvrir Studio OCR / IDP →</Button>
            </Link>
          }
        >
          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            {[
              { name: 'Facture_FAC-2026-9901_Signee.pdf', cat: 'Facture PDF', icon: 'invoice' as const },
              { name: 'LTA_AirWaybill_TRK-9041.pdf', cat: 'Transport Aérien', icon: 'air-freight' as const },
              { name: 'Certificat_GDP_ChaineDuFroid.pdf', cat: 'Conformité IoT', icon: 'temperature' as const },
            ].map((d) => (
              <div
                key={d.name}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Icon3D name={d.icon} size="sm" />
                  <Badge variant="success">Antivirus CLEAN</Badge>
                </div>
                <p className="font-bold truncate">{d.name}</p>
                <p className="text-slate-500">{d.cat}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => notifyToast(`Aperçu sécurisé de ${d.name} ouvert.`, 'info')}
                >
                  Prévisualiser / Partager
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 38. ROOM LIVE CLIENT (/client/room-live) */}
      {section === 'room-live' && (
        <Card
          title="Room Live Client — Réunions Autorisées (Page 38 — Chapitre 6.10 & Annexe B)"
          subtitle="Règle métier : Le Client rejoint uniquement les salles auxquelles il est invité. Il ne dispose pas d’un droit général de création de salle."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => createRoomLive('Tentative Client', '2026-11-20')}
            >
              <Lock className="w-3.5 h-3.5 text-red-500" />
              Tester le blocage serveur « Créer une salle » (Client)
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs">
              <strong>Conformité Annexe B :</strong> En tant que Client, vous pouvez rejoindre vos salles autorisées ci-dessous. Sur la salle <code>RM-LIVE-8890</code>, l’Administrateur vous a accordé une <strong>délégation ponctuelle d’hôte</strong> limitée à cette seule réunion, sans vous conférer de droit général de création.
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {rooms.map((rm) => (
                <div
                  key={rm.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{rm.title}</span>
                      <Badge variant={rm.status === 'LIVE' ? 'success' : 'info'}>
                        {translateStatus(rm.status, locale)}
                      </Badge>
                    </div>
                    <p className="text-slate-500">
                      Créée par : {rm.creatorName} • Code : {rm.roomCode}
                    </p>
                    {rm.delegatedClientHostId === currentUser.id && (
                      <Badge variant="orange">Délégation ponctuelle Co-Hôte sur cette salle</Badge>
                    )}
                  </div>
                  <Link to={`/room/${rm.id}`}>
                    <Button size="sm" variant="primary">Rejoindre la salle</Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* 39. PARAMÈTRES CLIENT (/client/parametres — Avec Sélecteur de Thème 3 États) */}
      {section === 'parametres' && (
        <Card
          title="Paramètres du Compte Client B2B, Apparence 3 États & Sécurité (Page 39)"
          subtitle="Profil entreprise, préférence de thème (Système / Clair / Noir) et langue (FR/EN/AR)"
        >
          <div className="space-y-6 text-xs">
            <RadioGroup
              label="Préférence de Thème (Contrôle 3 états conforme au guide dark-mode-toggle) :"
              name="themePref"
              value={theme}
              onChange={(val) => setTheme(val as ThemeMode)}
              options={[
                { value: 'system', label: 'Système (Auto)', description: 'Suit les préférences de l’OS' },
                { value: 'light', label: 'Thème Blanc (Clair)', description: 'Logo TradeLink Clair actif' },
                { value: 'dark', label: 'Thème Noir (Sombre)', description: 'Logo TradeLink Noir actif' },
              ]}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Raison Sociale" defaultValue={currentUser.companyName} />
              <Input label="Email de contact" defaultValue={currentUser.email} />
              <Input label="Téléphone" defaultValue={currentUser.phone} />
              <Input label="Juridiction Fiscale & KYC" defaultValue={currentUser.jurisdiction} />
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => notifyToast('Préférences du profil Client sauvegardées.', 'success')}
              >
                Enregistrer les modifications
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// ESPACE FOURNISSEUR (PAGES 40 À 52)
// ============================================================================

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
    | 'room-live'
    | 'parametres';
}> = ({ section }) => {
  const {
    locale,
    products,
    addProduct,
    updateProductDetails,
    updateProductStock,
    orders,
    updateOrderStatus,
    quotes,
    invoices,
    payments,
    missions,
    createLogisticsMission,
    rooms,
    createRoomLive,
    notifyToast,
  } = useApp();

  const navigate = useNavigate();
  const params = useParams();
  const [newSku, setNewSku] = useState('TL-DRONE-500X');
  const [newNameFr, setNewNameFr] = useState('Drone Cargo Inventaire Entrepôt Autonome');
  const [newNameEn, setNewNameEn] = useState('Autonomous Warehouse Inventory Cargo Drone');
  const [newNameAr, setNewNameAr] = useState('درون جرد المستودعات الذكي');
  const [newPrice, setNewPrice] = useState('3450.00');
  const [newStock, setNewStock] = useState(25);
  const [newIcon, setNewIcon] = useState<Icon3DName>('drone');
  const [roomTitle, setRoomTitle] = useState('Point Logistique Fournisseur & Douane Export');

  const editingProduct =
    products.find((p) => p.id === params.id) ?? products[0];
  const [editSku, setEditSku] = useState(editingProduct.sku);
  const [editPrice, setEditPrice] = useState(editingProduct.unitPrice);
  const [editNameFr, setEditNameFr] = useState(editingProduct.name.fr);
  const [editNameAr, setEditNameAr] = useState(editingProduct.name.ar);

  const selectedOrder =
    orders.find((o) => o.id === params.id) ?? orders[0];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white dark:bg-[#0B2D31] p-5 border border-slate-200 dark:border-teal-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Icon3D name="warehouse" size="lg" withGlow />
          <div>
            <Badge variant="orange">ESPACE FOURNISSEUR & GESTION DES STOCKS</Badge>
            <h1 className="text-xl font-extrabold mt-1">EuroTech Industrial & ColdChain GmbH</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { to: '/fournisseur/dashboard', label: '40. Dashboard' },
            { to: '/fournisseur/kyc', label: '41. Mon KYC' },
            { to: '/fournisseur/catalogue', label: '42. Catalogue' },
            { to: '/fournisseur/catalogue/nouveau', label: '43. + Produit' },
            { to: '/fournisseur/stocks', label: '45. Stocks' },
            { to: '/fournisseur/commandes', label: '46. Commandes' },
            { to: '/fournisseur/devis', label: '48. Devis' },
            { to: '/fournisseur/documents', label: '49. Documents' },
            { to: '/fournisseur/paiements', label: '50. Paiements' },
            { to: '/fournisseur/room-live', label: '51. Room Live' },
            { to: '/fournisseur/parametres', label: '52. Paramètres' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-teal-900/60 hover:bg-[#E85D22] hover:text-white font-semibold transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 40. DASHBOARD FOURNISSEUR (/fournisseur/dashboard) */}
      {section === 'dashboard' && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Card title="Références Publiées" subtitle="Catalogue Fournisseur">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-extrabold">{products.length} Produits</span>
              <Icon3D name="shipping-label" size="lg" withGlow />
            </div>
          </Card>
          <Card title="Commandes Reçues" subtitle="À préparer / expédier">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-extrabold">{orders.length} Commandes</span>
              <Icon3D name="forklift" size="lg" withGlow />
            </div>
          </Card>
          <Card title="Chiffre d’Affaires Facturé" subtitle="Rapproché Stripe / SWIFT">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-extrabold text-emerald-600">
                {formatCurrency(67060, 'EUR', locale)}
              </span>
              <Icon3D name="payment" size="lg" withGlow />
            </div>
          </Card>
        </div>
      )}

      {/* 41. MON KYC FOURNISSEUR (/fournisseur/kyc) */}
      {section === 'kyc' && <ActorKycWorkspaceView actorProfile="FOURNISSEUR" />}

      {/* 42 & 45. CATALOGUE & STOCKS FOURNISSEUR (/fournisseur/catalogue & /fournisseur/stocks) */}
      {(section === 'catalogue' || section === 'stocks') && (
        <Card
          title={
            section === 'stocks'
              ? 'Gestion des Stocks, Mouvements & Alertes de Seuil (Page 45)'
              : 'Catalogue Produits Détenus par le Fournisseur (Page 42)'
          }
          subtitle="Entrées, sorties, ajustements et édition des fiches produits"
          action={
            <Link to="/fournisseur/catalogue/nouveau">
              <Button size="sm" variant="primary">+ Créer un Produit (Page 43)</Button>
            </Link>
          }
        >
          <DataTable
            caption="Produits et niveaux de stock du fournisseur"
            keyExtractor={(p) => p.id}
            data={products}
            columns={[
              {
                key: 'prod',
                header: 'Produit & Icône 3D',
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
                      <p className="text-xs text-slate-400 font-mono">{p.sku}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'price',
                header: 'Prix HT',
                render: (p) => (
                  <span className="font-bold">
                    {formatCurrency(p.unitPrice, p.currency, locale)}
                  </span>
                ),
              },
              {
                key: 'stock',
                header: 'Disponible / Réservé',
                render: (p) => (
                  <div className="flex items-center gap-2">
                    <Badge variant={p.stockAvailable <= p.minStockAlert ? 'danger' : 'success'}>
                      Dispo : {p.stockAvailable}
                    </Badge>
                    <Badge variant="info">Réservé : {p.stockReserved}</Badge>
                  </div>
                ),
              },
              {
                key: 'moves',
                header: 'Actions & Mouvements',
                render: (p) => (
                  <div className="flex flex-wrap gap-1.5">
                    <Link to={`/fournisseur/catalogue/${p.id}`}>
                      <Button size="sm" variant="secondary">Éditer (Page 44)</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        updateProductStock(p.id, 10, 'Réapprovisionnement lot industriel')
                      }
                    >
                      +10 Entrée
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateProductStock(p.id, -2, 'Sortie préparation commande')}
                    >
                      -2 Sortie
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* 43. CRÉATION PRODUIT MULTILINGUE (/fournisseur/catalogue/nouveau) */}
      {section === 'product-new' && (
        <Card
          title="Créer une Fiche Produit Multilingue (FR / EN / AR) avec Icône 3D (Page 43)"
          subtitle="Chapitre 6.4 : Un fournisseur gère uniquement les produits qui lui appartiennent."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addProduct({
                sku: newSku,
                supplierId: 'usr-supp-01',
                supplierName: 'EuroTech Industrial & ColdChain GmbH',
                category: 'Innovation & Automatisation',
                name: { fr: newNameFr, en: newNameEn, ar: newNameAr },
                description: {
                  fr: 'Équipement certifié TradeLink V6.0 avec télémétrie temps réel.',
                  en: 'TradeLink V6.0 certified equipment with real-time telemetry.',
                  ar: 'معدات معتمدة مع تتبع مباشر للبيانات.',
                },
                unitPrice: newPrice,
                currency: 'EUR',
                taxRate: '20.00',
                unit: 'UNITÉ',
                stockAvailable: newStock,
                stockReserved: 0,
                minStockAlert: 5,
                icon3d: newIcon,
                originCountry: 'Allemagne (DE)',
                incoterm: 'CIP Casablanca',
                leadTimeDays: 5,
                isPublished: true,
              });
              navigate('/fournisseur/catalogue');
            }}
            className="grid sm:grid-cols-2 gap-4"
          >
            <Input label="Référence SKU unique" value={newSku} onChange={(e) => setNewSku(e.target.value)} required />
            <Input label="Prix unitaire HT (EUR)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required />
            <Input label="Nom du produit (Français)" value={newNameFr} onChange={(e) => setNewNameFr(e.target.value)} required />
            <Input label="Product Name (English)" value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} required />
            <Input label="اسم المنتج (العربية - RTL)" value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)} required />
            <Input
              label="Stock initial disponible"
              type="number"
              value={newStock}
              onChange={(e) => setNewStock(Number(e.target.value))}
              required
            />
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold block mb-2">Choisir une Icône 3D Métier :</label>
              <div className="flex flex-wrap gap-2">
                {ALL_3D_ICONS.slice(0, 12).map((ic) => (
                  <button
                    key={ic.name}
                    type="button"
                    onClick={() => setNewIcon(ic.name)}
                    className={`p-2 rounded-xl border flex items-center gap-2 text-xs ${
                      newIcon === ic.name
                        ? 'border-[#E85D22] bg-orange-500/10 font-bold'
                        : 'border-slate-200 dark:border-teal-800'
                    }`}
                  >
                    <Icon3D name={ic.name} size="xs" />
                    <span>{ic.labelFr}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="primary">Publier au Catalogue B2B</Button>
            </div>
          </form>
        </Card>
      )}

      {/* 44. ÉDITION PRODUIT CONNECTÉE À L'ÉTAT (/fournisseur/catalogue/:id) */}
      {section === 'product-edit' && (
        <Card
          title={`Édition Produit Détenu : ${editingProduct.sku} (Page 44)`}
          subtitle={editingProduct.name[locale]}
          action={
            <Link to="/fournisseur/catalogue">
              <Button size="sm" variant="secondary">← Retour Catalogue</Button>
            </Link>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateProductDetails(editingProduct.id, editSku, editPrice, editNameFr, editNameAr);
              navigate('/fournisseur/catalogue');
            }}
            className="grid sm:grid-cols-2 gap-4 text-xs"
          >
            <Input label="SKU" value={editSku} onChange={(e) => setEditSku(e.target.value)} required />
            <Input label="Prix Unitaire HT (EUR)" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required />
            <Input label="Libellé FR" value={editNameFr} onChange={(e) => setEditNameFr(e.target.value)} required />
            <Input label="Libellé AR (RTL)" value={editNameAr} onChange={(e) => setEditNameAr(e.target.value)} required />
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="primary">
                Enregistrer les modifications
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 46. COMMANDES REÇUES (/fournisseur/commandes) */}
      {section === 'commandes' && (
        <Card
          title="Commandes Reçues à Traiter (Page 46 — Accepter / Préparer / Expédier)"
          subtitle="Transitions validées côté serveur, horodatées et auditées"
        >
          <div className="space-y-3">
            {orders.map((o) => (
              <div
                key={o.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/fournisseur/commandes/${o.id}`}
                      className="text-sm font-bold text-[#E85D22] hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <Badge variant="info">{translateStatus(o.status, locale)}</Badge>
                  </div>
                  <p className="mt-1">
                    Client : <strong>{o.clientName}</strong> • Montant :{' '}
                    <strong>{formatCurrency(o.totalAmount, o.currency, locale)}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/fournisseur/commandes/${o.id}`}>
                    <Button size="sm" variant="secondary">Détail & Bons (Page 47)</Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateOrderStatus(o.id, 'ACCEPTED')}
                  >
                    1. Accepter
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateOrderStatus(o.id, 'PREPARING')}
                  >
                    2. En préparation
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => updateOrderStatus(o.id, 'SHIPPED')}
                  >
                    3. Remettre au Transporteur
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 47. DÉTAIL COMMANDE FOURNISSEUR (/fournisseur/commandes/:id) */}
      {section === 'order-detail' && (
        <Card
          title={`Traitement Commande ${selectedOrder.orderNumber} & Affectation Transporteur (Page 47)`}
          subtitle={`Client : ${selectedOrder.clientName} • Adresse de livraison : ${selectedOrder.shippingAddress}`}
          action={
            <Link to="/fournisseur/commandes">
              <Button size="sm" variant="secondary">← Retour Commandes</Button>
            </Link>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#E85D22]" /> Expédition & Ordre de Transport Multimodal
              </h4>

              {(() => {
                const linkedMission = missions.find((m) => m.orderId === selectedOrder.id);
                if (linkedMission) {
                  return (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-900 dark:text-emerald-200">
                            Mission Logistique Affectée : {linkedMission.orderNumber}
                          </span>
                          <Badge variant="success">{linkedMission.status}</Badge>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">
                          Transporteur : <strong>{linkedMission.carrierName}</strong> • Type de caisse requis :{' '}
                          <Badge variant="orange">{linkedMission.requiredVehicleType}</Badge>
                        </p>
                        <p className="text-slate-500">
                          Prise en charge : {linkedMission.pickupAddress} → Livraison : {linkedMission.deliveryAddress}
                        </p>
                        {linkedMission.isColdChain && (
                          <Badge variant="info">Chaîne du Froid sous Température Dirigée (-20°C à +12°C)</Badge>
                        )}
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
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <p className="text-slate-600 dark:text-slate-300">
                      Aucun ordre de transport n'est actuellement émis pour cette commande préparée. Vous pouvez assigner la compagnie de fret partenaire MedFreight Multimodal Carriers et générer la mission logistique :
                    </p>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        const m = createLogisticsMission(selectedOrder.id, 'usr-trans-01', true);
                        if (m) {
                          notifyToast(`Ordre de transport ${m.orderNumber} émis et transmis à MedFreight !`, 'success');
                        }
                      }}
                    >
                      Affecter MedFreight & Émettre Ordre de Transport (Mission)
                    </Button>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() =>
                  notifyToast(`Bon de préparation et colisage PDF générés pour ${selectedOrder.orderNumber}.`, 'success')
                }
              >
                Générer Bon de Livraison & Colisage
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 48, 49, 50. DEVIS REÇUS, DOCUMENTS ÉMIS & PAIEMENTS REÇUS */}
      {section === 'devis' && (
        <Card title="Devis Reçus à Chiffrer & Convertir (Page 48)">
          <div className="space-y-3 text-xs">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-sm">{q.quoteNumber} — {q.clientName}</p>
                  <p className="text-slate-500">Total chiffré : {formatCurrency(q.totalAmount, q.currency, locale)}</p>
                </div>
                <Badge variant="info">{q.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {section === 'documents' && (
        <Card title="Factures Émises & Bons de Livraison Générés (Page 49)">
          <div className="space-y-3 text-xs">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-sm">{inv.invoiceNumber} ({inv.orderNumber})</p>
                  <p className="text-slate-500">Client : {inv.clientName} • {formatCurrency(inv.totalAmount, inv.currency, locale)}</p>
                </div>
                <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>
                  {translateStatus(inv.status, locale)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {section === 'paiements' && (
        <Card title="Paiements Reçus & Suivi des Encaissements Fournisseur (Page 50)">
          <div className="space-y-3 text-xs">
            {payments.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-sm">{p.paymentReference} — {p.invoiceNumber}</p>
                  <p className="text-slate-500">Montant encaissé : {formatCurrency(p.amount, p.currency, locale)}</p>
                </div>
                <Badge variant="success">{p.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 51. ROOM LIVE FOURNISSEUR (/fournisseur/room-live — Création autorisée) */}
      {section === 'room-live' && (
        <Card
          title="Room Live Fournisseur — Création & Gestion des Salles (Page 51)"
          subtitle="En tant que Fournisseur opérationnel, vous êtes habilité à créer des salles Room Live."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1">
                <Input
                  label="Titre de la réunion Room Live"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                onClick={() => createRoomLive(roomTitle, '2026-11-19 11:00')}
              >
                + Créer une Salle Room Live
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-xs">
              {rooms.map((rm) => (
                <div
                  key={rm.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-sm">{rm.title}</p>
                    <p className="text-slate-500">{rm.roomCode} • {rm.scheduledAt}</p>
                  </div>
                  <Link to={`/room/${rm.id}`}>
                    <Button size="sm" variant="secondary">Ouvrir Salle</Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* 52. PARAMÈTRES FOURNISSEUR (/fournisseur/parametres) */}
      {section === 'parametres' && (
        <Card title="Paramètres Profil & Entrepôts Fournisseur (Page 52)">
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <Input label="Société Fournisseur" defaultValue="EuroTech Industrial & ColdChain GmbH" />
            <Input label="Entrepôt Principal" defaultValue="Hambourg Port Logistics Zone B" />
            <div className="sm:col-span-2 flex justify-end">
              <Button
                variant="primary"
                onClick={() => notifyToast('Paramètres Fournisseur enregistrés.', 'success')}
              >
                Sauvegarder
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
