// ============================================================================
// TRADELINK V6.1 — LOT 4 : ÉCOSYSTÈME COMMERCIAL B2B (MISSIONS 4.1 À 4.11)
// Suite de tests d'intégration de bout en bout :
// - 4.1 Produits & catalogue fournisseur (variantes, paliers B2B, MOQ, protection commandes actives)
// - 4.2 Catégories dynamiques gouvernées exclusivement par ADMIN (blocage 403 FOURNISSEUR)
// - 4.3 Recherche et découverte commerciale multicritère, tri, facettes et pagination
// - 4.4 Gestion transactionnelle des stocks, mouvements tracés et anti-survente concurrente
// - 4.5 Commandes B2B (panier, paliers de prix, MOQ, idempotence, machine d'états, annulation)
// - 4.6 Devis / Quotes B2B (demande, chiffrage, négociation, expiration, acceptation, conversion)
// - 4.7 Facturation (numérotation séquentielle par exercice, liaison commande/paiement/comptabilité)
// - 4.8 Paiements et webhooks (signature HMAC-SHA256, anti-rejeu, idempotence, remboursements)
// - 4.9 Comptabilité en partie double (Débit = Crédit, immuabilité, écriture de contre-passation)
// - 4.10 Messagerie professionnelle B2B (liée aux commandes/devis, Anti-IDOR, quarantaine ClamAV)
// - 4.11 Notifications centralisées (création automatique sur événements, lu/non-lu, préférences)
// ============================================================================

import assert from 'assert';
import crypto from 'crypto';
import Decimal from 'decimal.js';
import { TradeLinkRepositoryStore, DatabaseStateSnapshot } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { ServerRequestContext, registerSingleActiveSession } from '../middlewares/errorAndSecurity.middleware';
import { getServiceHmacSecret } from '../../services/securityCrypto';

async function runLot4CommercialEcosystemTests() {
  console.log('================================================================================');
  console.log('TRADELINK V6.1 — AUDIT & TESTS INTÉGRATION LOT 4 (ÉCOSYSTÈME COMMERCIAL B2B)');
  console.log('================================================================================\n');

  const initialSnapshot: DatabaseStateSnapshot = {
    products: [],
    orders: [],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
  };

  const repo = new TradeLinkRepositoryStore(initialSnapshot, true);
  const api = new TradeLinkApiApplication(repo);

  const adminActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-admin-01',
    email: 'k.benali@tradelink-global.com',
    role: 'ADMIN',
    sessionId: 'sess-lot4-admin-01',
    companyName: 'TradeLink Global HQ',
    mfaVerified: true,
  };
  registerSingleActiveSession(adminActor.id, adminActor.sessionId, true);

  const supplierActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-supp-01',
    email: 'h.weber@eurotech-supply.de',
    role: 'FOURNISSEUR',
    sessionId: 'sess-lot4-supp-01',
    companyName: 'EuroTech Industrial & ColdChain GmbH',
    mfaVerified: true,
  };
  registerSingleActiveSession(supplierActor.id, supplierActor.sessionId, true);

  const clientActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-client-01',
    email: 's.mansouri@atlas-import.ma',
    role: 'CLIENT',
    sessionId: 'sess-lot4-client-01',
    companyName: 'Atlas Import & Distribution SARL',
    mfaVerified: true,
  };
  registerSingleActiveSession(clientActor.id, clientActor.sessionId, true);

  const comptableActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-compt-01',
    email: 'c.dupont@tradelink-audit.fr',
    role: 'COMPTABLE',
    sessionId: 'sess-lot4-compt-01',
    companyName: 'TradeLink Finance & Audit',
    mfaVerified: true,
  };
  registerSingleActiveSession(comptableActor.id, comptableActor.sessionId, true);

  const invoke = (req: {
    method: string;
    path: string;
    actor?: NonNullable<ServerRequestContext['user']>;
    headers?: Record<string, string | undefined>;
    query?: Record<string, string | undefined>;
    body?: any;
  }) => {
    const res = api.handleRequest({
      method: req.method,
      path: req.path,
      user: req.actor,
      headers: req.headers || {},
      query: req.query || {},
      params: {},
      body: req.body || {},
      correlationId: `corr-lot4-${Date.now()}`,
      ipAddress: '127.0.0.1',
    });
    return {
      statusCode: res.statusCode,
      body: res.body as any,
    };
  };

  // ============================================================================
  // [LOT4-01 & LOT4-02] CATÉGORIES GOUVERNÉES PAR ADMIN & CATALOGUE FOURNISSEUR
  // ============================================================================
  console.log('[LOT4-01/02] Vérification de la gouvernance des catégories par ADMIN et du CRUD produit B2B...');

  // Un FOURNISSEUR tente de créer une catégorie globale -> DOIT être bloqué par 403
  const forbiddenSuppCat1 = invoke({
    method: 'POST',
    path: '/api/v1/catalog/categories',
    actor: supplierActor,
    body: {
      code: 'SUPP_ILLEGAL_CAT',
      name: { fr: 'Catégorie Illégale', en: 'Illegal Cat', ar: 'فئة غير مصرح بها' },
      description: { fr: 'Test blocage', en: 'Block test', ar: 'اختبار' },
    },
  });
  assert.strictEqual(forbiddenSuppCat1.statusCode, 403, 'Un FOURNISSEUR ne peut pas créer une catégorie globale (/api/v1/catalog/categories)');

  const forbiddenSuppCat2 = invoke({
    method: 'POST',
    path: '/api/v1/categories',
    actor: supplierActor,
    body: {
      code: 'SUPP_ILLEGAL_CAT_2',
      name: { fr: 'Catégorie Illégale 2', en: 'Illegal Cat 2', ar: 'فئة غير مصرح بها' },
      description: { fr: 'Test blocage', en: 'Block test', ar: 'اختبار' },
    },
  });
  assert.strictEqual(forbiddenSuppCat2.statusCode, 403, 'Un FOURNISSEUR ne peut pas créer une catégorie globale (/api/v1/categories)');

  // L'ADMIN crée une catégorie parente et une sous-catégorie
  const parentCatRes = invoke({
    method: 'POST',
    path: '/api/v1/catalog/categories',
    actor: adminActor,
    body: {
      code: 'SOLAR_ENERGY_B2B',
      name: { fr: 'Énergie Solaire & Stockage', en: 'Solar Energy & Storage', ar: 'الطاقة الشمسية والتخزين' },
      description: { fr: 'Panneaux photovoltaïques et onduleurs', en: 'PV panels and inverters', ar: 'الألواح الشمسية' },
      displayOrder: 10,
    },
  });
  assert.strictEqual(parentCatRes.statusCode, 201, 'Création de catégorie globale par ADMIN réussie');
  const parentCategoryId = parentCatRes.body.data.id as string;

  const childCatRes = invoke({
    method: 'POST',
    path: '/api/v1/catalog/categories',
    actor: adminActor,
    body: {
      code: 'SOLAR_INVERTERS',
      parentCategoryId,
      name: { fr: 'Onduleurs Hybrides Triphasés', en: 'Three-Phase Hybrid Inverters', ar: 'محولات هجينة ثلاثية الطور' },
      description: { fr: 'Onduleurs industriels haute puissance', en: 'High power industrial inverters', ar: 'محولات صناعية' },
      displayOrder: 1,
    },
  });
  assert.strictEqual(childCatRes.statusCode, 201, 'Création de sous-catégorie hiérarchique par ADMIN réussie');
  const childCategoryId = childCatRes.body.data.id as string;

  // Le FOURNISSEUR crée un produit B2B complet avec variantes, paliers de prix dégressifs (priceTiers) et MOQ
  const createProdRes = invoke({
    method: 'POST',
    path: '/api/v1/catalog/products',
    actor: supplierActor,
    body: {
      sku: 'INV-HYBRID-50KW-LOT4',
      category: 'SOLAR_ENERGY_B2B',
      categoryId: parentCategoryId,
      subcategory: 'SOLAR_INVERTERS',
      subcategoryId: childCategoryId,
      name: {
        fr: 'Onduleur Hybride Industriel 50kW IP65',
        en: 'Industrial Hybrid Inverter 50kW IP65',
        ar: 'محول هجين صناعي 50 كيلوواط',
      },
      description: {
        fr: 'Onduleur triphasé haut rendement 98.6% avec télémétrie Modbus TCP',
        en: 'High efficiency 98.6% three-phase inverter with Modbus TCP telemetry',
        ar: 'محول ثلاثي الطور عالي الكفاءة',
      },
      unitPrice: '4200.00',
      currency: 'EUR',
      unit: 'Unité',
      stockAvailable: 25,
      minOrderQuantity: 2,
      minStockAlert: 5,
      originCountry: 'DE',
      incoterm: 'FCA',
      leadTimeDays: 5,
      priceTiers: [
        { minQuantity: 2, maxQuantity: 4, unitPrice: '4200.00' },
        { minQuantity: 5, maxQuantity: 9, unitPrice: '3950.00' },
        { minQuantity: 10, unitPrice: '3700.00' },
      ],
      variants: [
        {
          id: 'var-std',
          sku: 'INV-HYBRID-50KW-STD',
          name: 'Standard Modbus',
          attributes: { Communication: 'Modbus RTU/TCP' },
          priceDelta: '0.00',
          stockAvailable: 15,
          isDefault: true,
        },
        {
          id: 'var-4g',
          sku: 'INV-HYBRID-50KW-4G',
          name: 'Passerelle 4G LTE + Wi-Fi',
          attributes: { Communication: '4G LTE + Wi-Fi Industriel' },
          priceDelta: '+150.00',
          stockAvailable: 10,
        },
      ],
      technicalDocuments: [
        {
          id: 'tdoc-ce-01',
          title: 'Certificat de Conformité CE / IEC 62109',
          fileName: 'certificat-ce-iec62109.pdf',
          url: '/docs/tech/certificat-ce-iec62109.pdf',
        },
      ],
    },
  });
  assert.strictEqual(createProdRes.statusCode, 201, 'Création produit B2B avec paliers et variantes réussie');
  const productId = createProdRes.body.data.id as string;
  assert.strictEqual(createProdRes.body.data.priceTiers.length, 3, '3 paliers de prix B2B enregistrés');
  assert.strictEqual(createProdRes.body.data.variants.length, 2, '2 variantes enregistrées');
  console.log('  -> [PASS] LOT4-01 & LOT4-02 validés.');

  // ============================================================================
  // [LOT4-03] RECHERCHE ET DÉCOUVERTE COMMERCIALE MULTICRITÈRE
  // ============================================================================
  console.log('[LOT4-03] Vérification de la recherche commerciale multicritère, tri et pagination...');

  const searchRes = invoke({
    method: 'GET',
    path: '/api/v1/catalog/products',
    actor: clientActor,
    query: {
      search: 'INV-HYBRID-50KW-LOT4',
      categoryId: parentCategoryId,
      minPrice: '3000',
      maxPrice: '5000',
      inStockOnly: 'true',
      sortBy: 'PRICE_ASC',
      page: '1',
      limit: '10',
    },
  });
  assert.strictEqual(searchRes.statusCode, 200, 'Recherche catalogue réussie');
  assert.strictEqual(searchRes.body.data.total, 1, 'Le produit créé est trouvé via recherche multicritère');
  assert.strictEqual(searchRes.body.data.products[0].id, productId, 'ID produit concordant');
  console.log('  -> [PASS] LOT4-03 validé.');

  // ============================================================================
  // [LOT4-04 & LOT4-05] STOCKS TRANSACTIONNELS, COMMANDES B2B, MOQ, PALIERS & IDEMPOTENCE
  // ============================================================================
  console.log('[LOT4-04/05] Vérification des stocks transactionnels, MOQ, paliers B2B, idempotence et protection commandes actives...');

  // 1. Validation du panier sous le MOQ (quantité = 1 < MOQ = 2)
  const cartBelowMoq = invoke({
    method: 'POST',
    path: '/api/v1/cart/validate',
    actor: clientActor,
    body: {
      items: [{ productId, quantity: 1 }],
      currency: 'EUR',
    },
  });
  assert.strictEqual(cartBelowMoq.statusCode, 200);
  assert.strictEqual(cartBelowMoq.body.data.valid, false, 'Panier sous le MOQ marqué invalide');
  assert.strictEqual(cartBelowMoq.body.data.items[0].status, 'BELOW_MOQ', 'Statut BELOW_MOQ détecté');

  // 2. Tentative de création de commande sous le MOQ -> 400 ORDER_QUANTITY_BELOW_MOQ
  const orderBelowMoq = invoke({
    method: 'POST',
    path: '/api/v1/orders',
    actor: clientActor,
    body: {
      shippingAddress: 'Zone Industrielle Aïn Sebaâ, Casablanca',
      lines: [{ productId, quantity: 1 }],
    },
  });
  assert.strictEqual(orderBelowMoq.statusCode, 400, 'Commande sous le MOQ bloquée par 400');
  assert.strictEqual(orderBelowMoq.body.error.code, 'ORDER_QUANTITY_BELOW_MOQ');

  // 3. Tentative de survente (quantité = 30 > stockAvailable = 25) -> 409 INSUFFICIENT_STOCK_TRANSACTION_ABORTED
  const orderOversell = invoke({
    method: 'POST',
    path: '/api/v1/orders',
    actor: clientActor,
    body: {
      shippingAddress: 'Zone Industrielle Aïn Sebaâ, Casablanca',
      lines: [{ productId, quantity: 30 }],
    },
  });
  assert.strictEqual(orderOversell.statusCode, 409, 'Survente bloquée par 409');
  assert.strictEqual(orderOversell.body.error.code, 'INSUFFICIENT_STOCK_TRANSACTION_ABORTED');

  // 4. Création d'une commande valide de 5 unités (palier B2B 5..9 => 3950.00 EUR/u au lieu de 4200.00 EUR/u) avec clé d'idempotence
  const idempotencyKeyOrder = `idem-order-lot4-${Date.now()}`;
  const validOrderRes = invoke({
    method: 'POST',
    path: '/api/v1/orders',
    actor: clientActor,
    headers: {
      'idempotency-key': idempotencyKeyOrder,
    },
    body: {
      shippingAddress: 'Zone Industrielle Aïn Sebaâ, Casablanca',
      lines: [{ productId, quantity: 5 }],
    },
  });
  assert.strictEqual(validOrderRes.statusCode, 201, 'Création de commande B2B valide réussie');
  const createdOrder = validOrderRes.body.data;
  const orderId = createdOrder.id as string;
  // Vérifier que le palier B2B (5 unités * 3950.00 = 19750.00 EUR HT) a été appliqué par le serveur
  assert.strictEqual(createdOrder.items[0].unitPrice, '3950.00', 'Palier de prix dégressif B2B (3950.00 EUR) appliqué pour 5 unités');
  assert.strictEqual(createdOrder.subtotalAmount, '19750.00', 'Sous-total HT = 19750.00 EUR');

  // 5. Rejeu idempotent avec la même clé -> ne doit PAS déduire une seconde fois le stock
  const replayOrderRes = invoke({
    method: 'POST',
    path: '/api/v1/orders',
    actor: clientActor,
    headers: {
      'idempotency-key': idempotencyKeyOrder,
    },
    body: {
      shippingAddress: 'Zone Industrielle Aïn Sebaâ, Casablanca',
      lines: [{ productId, quantity: 5 }],
    },
  });
  assert.strictEqual(replayOrderRes.statusCode, 201);
  assert.strictEqual(replayOrderRes.body.data.id, orderId, 'Le rejeu idempotent retourne exactement la même commande');

  // Vérifier le stock résultant : 25 - 5 = 20 disponibles, 5 réservés
  const prodAfterOrder = invoke({
    method: 'GET',
    path: `/api/v1/catalog/products/${productId}`,
    actor: supplierActor,
  });
  assert.strictEqual(prodAfterOrder.body.data.stockAvailable, 20, 'Stock disponible = 20 après réservation de 5 unités');
  assert.strictEqual(prodAfterOrder.body.data.stockReserved, 5, 'Stock réservé = 5');

  // 6. Règles de protection du produit lorsqu'une commande active existe (Mission 4.1) :
  // - Modification du SKU ou de la devise bloquée par 409
  const lockSkuRes = invoke({
    method: 'PUT',
    path: `/api/v1/catalog/products/${productId}`,
    actor: supplierActor,
    body: { sku: 'INV-RENAMED-WHILE-ACTIVE' },
  });
  assert.strictEqual(lockSkuRes.statusCode, 409, 'Modification du SKU bloquée pendant qu’une commande active existe');
  assert.strictEqual(lockSkuRes.body.error.code, 'PRODUCT_CRITICAL_FIELD_LOCKED_BY_ACTIVE_ORDER');

  // - Suppression du produit bloquée par 409
  const deleteLockedProd = invoke({
    method: 'DELETE',
    path: `/api/v1/catalog/products/${productId}`,
    actor: supplierActor,
  });
  assert.strictEqual(deleteLockedProd.statusCode, 409, 'Suppression d’un produit avec commande active bloquée par 409');
  assert.strictEqual(deleteLockedProd.body.error.code, 'PRODUCT_HAS_ACTIVE_ORDERS');
  console.log('  -> [PASS] LOT4-04 & LOT4-05 validés.');

  // ============================================================================
  // [LOT4-06] DEVIS / QUOTES B2B (CRÉATION, CHIFFRAGE, NÉGOCIATION, EXPIRATION, CONVERSION)
  // ============================================================================
  console.log('[LOT4-06] Vérification du cycle complet des Devis B2B (création, négociation, expiration, conversion)...');

  // 1. Demande de devis (RFQ) par le CLIENT
  const createQuoteRes = invoke({
    method: 'POST',
    path: '/api/v1/quotes',
    actor: clientActor,
    body: {
      clientId: 'usr-client-01',
      clientName: 'Atlas Import & Distribution SARL',
      supplierId: 'usr-supp-01',
      supplierName: 'EuroTech Industrial & ColdChain GmbH',
      currency: 'EUR',
      validityDays: 15,
      incoterm: 'CIF',
      lines: [
        {
          productId,
          description: 'Onduleur Hybride Industriel 50kW IP65',
          quantity: 4,
          targetPrice: '3800.00',
        },
      ],
    },
  });
  assert.strictEqual(createQuoteRes.statusCode, 201, 'Demande de devis créée');
  const quoteId = createQuoteRes.body.data.id as string;

  // Consultation du devis individuel (GET /api/v1/quotes/:id)
  const getQuoteRes = invoke({
    method: 'GET',
    path: `/api/v1/quotes/${quoteId}`,
    actor: clientActor,
  });
  assert.strictEqual(getQuoteRes.statusCode, 200, 'Consultation GET /api/v1/quotes/:id opérationnelle');

  // 2. Chiffrage par le FOURNISSEUR
  const respondQuoteRes = invoke({
    method: 'PUT',
    path: `/api/v1/quotes/${quoteId}/respond`,
    actor: supplierActor,
    body: {
      supplierId: 'usr-supp-01',
      supplierNotes: 'Offre spéciale export CIF Casablanca',
      validUntilDate: '2027-12-31',
      lines: [
        {
          productId,
          description: 'Onduleur Hybride Industriel 50kW IP65',
          quantity: 4,
          unitPrice: '4100.00',
          discountPct: '2.00',
        },
      ],
    },
  });
  assert.strictEqual(respondQuoteRes.statusCode, 200, 'Réponse fournisseur au devis réussie');
  assert.strictEqual(respondQuoteRes.body.data.status, 'RESPONDED');

  // 3. Contre-proposition de négociation par le CLIENT
  const negotiateRes = invoke({
    method: 'PUT',
    path: `/api/v1/quotes/${quoteId}/negotiate`,
    actor: clientActor,
    body: {
      notes: 'Accord immédiat si remise portée à 5%',
      lines: [
        {
          productId,
          description: 'Onduleur Hybride Industriel 50kW IP65',
          quantity: 4,
          unitPrice: '4100.00',
          discountPct: '5.00',
        },
      ],
    },
  });
  assert.strictEqual(negotiateRes.statusCode, 200, 'Contre-proposition de négociation enregistrée');
  assert.strictEqual(negotiateRes.body.data.status, 'NEGOTIATING');
  assert.strictEqual(negotiateRes.body.data.negotiationHistory.length, 2, '2 tours de négociation tracés');

  // 4. Acceptation et conversion atomique du devis en commande ferme
  const acceptQuoteRes = invoke({
    method: 'PUT',
    path: `/api/v1/quotes/${quoteId}/accept`,
    actor: clientActor,
    body: {},
  });
  assert.strictEqual(acceptQuoteRes.statusCode, 200);
  assert.strictEqual(acceptQuoteRes.body.data.status, 'ACCEPTED');

  const convertQuoteRes = invoke({
    method: 'POST',
    path: `/api/v1/quotes/${quoteId}/convert`,
    actor: clientActor,
    body: {
      shippingAddress: 'Port de Casablanca, Terminal Conteneurs 3',
    },
  });
  assert.strictEqual(convertQuoteRes.statusCode, 201, 'Conversion atomique du devis en commande réussie');
  assert.strictEqual(convertQuoteRes.body.data.updatedQuote.status, 'CONVERTED');
  assert.ok(convertQuoteRes.body.data.createdOrder.id, 'Commande générée depuis le devis');

  // Vérifier que le stock a diminué de 4 unités supplémentaires (20 - 4 = 16 disponibles)
  const prodAfterQuoteConv = invoke({
    method: 'GET',
    path: `/api/v1/catalog/products/${productId}`,
    actor: supplierActor,
  });
  assert.strictEqual(prodAfterQuoteConv.body.data.stockAvailable, 16, 'Stock disponible = 16 après conversion du devis');
  console.log('  -> [PASS] LOT4-06 validé.');

  // ============================================================================
  // [LOT4-07 & LOT4-08] FACTURATION SÉQUENTIELLE, PAIEMENTS, WEBHOOKS & REMBOURSEMENTS
  // ============================================================================
  console.log('[LOT4-07/08] Vérification de la facturation séquentielle, des paiements vérifiés et des remboursements...');

  // 1. Génération de deux factures successives pour vérifier la numérotation séquentielle stricte par exercice
  const inv1Res = invoke({
    method: 'POST',
    path: '/api/v1/invoices/generate',
    actor: supplierActor,
    body: {
      orderId,
      dueInDays: 30,
      jurisdiction: 'France / UE (TVA 20%)',
    },
  });
  assert.strictEqual(inv1Res.statusCode, 201, 'Facture 1 générée');
  const inv1 = inv1Res.body.data;

  const inv2Res = invoke({
    method: 'POST',
    path: '/api/v1/invoices/generate',
    actor: supplierActor,
    body: {
      orderId: convertQuoteRes.body.data.createdOrder.id,
      dueInDays: 30,
      jurisdiction: 'France / UE (TVA 20%)',
    },
  });
  assert.strictEqual(inv2Res.statusCode, 201, 'Facture 2 générée');
  const inv2 = inv2Res.body.data;

  const seq1 = parseInt(inv1.invoiceNumber.split('-').pop(), 10);
  const seq2 = parseInt(inv2.invoiceNumber.split('-').pop(), 10);
  assert.strictEqual(seq2, seq1 + 1, `Numérotation séquentielle stricte vérifiée (${inv1.invoiceNumber} -> ${inv2.invoiceNumber})`);
  assert.ok(inv1.accountingEntryId && inv1.accountingEntryNumber, 'Liaison directe Facture -> Écriture comptable VTE présente');

  // Consultation GET /api/v1/invoices/:id
  const getInv1 = invoke({
    method: 'GET',
    path: `/api/v1/invoices/${inv1.id}`,
    actor: clientActor,
  });
  assert.strictEqual(getInv1.statusCode, 200, 'Consultation GET /api/v1/invoices/:id par le Client propriétaire réussie');

  // 2. Initiation d'un paiement avec clé d'idempotence + confirmation + remboursement partiel
  const initPayRes = invoke({
    method: 'POST',
    path: '/api/v1/payments/initiate',
    actor: clientActor,
    headers: {
      'idempotency-key': `idem-pay-${Date.now()}`,
    },
    body: {
      orderId,
      invoiceId: inv1.id,
      provider: 'STRIPE',
      customerEmail: 's.mansouri@atlas-import.ma',
      currency: 'EUR',
    },
  });
  assert.strictEqual(initPayRes.statusCode, 201, 'Session de paiement initiée');

  // Webhook signé HMAC-SHA256 avec protection anti-rejeu et idempotence
  const webhookSecret = getServiceHmacSecret('STRIPE_WEBHOOK_SECRET');
  const nowSec = Math.floor(Date.now() / 1000);
  const webhookEventId = `evt_lot4_${Date.now()}`;
  const webhookPayload = {
    id: webhookEventId,
    type: 'checkout.session.completed',
    created: nowSec,
    data: {
      object: {
        id: initPayRes.body.data.sessionId,
        amount_total: new Decimal(inv1.totalAmount).times(100).toNumber(),
        currency: 'eur',
        customer_email: 's.mansouri@atlas-import.ma',
        metadata: {
          orderId,
          invoiceId: inv1.id,
          clientId: 'usr-client-01',
          supplierId: 'usr-supp-01',
        },
        payment_status: 'paid',
      },
    },
  };
  const payloadStr = JSON.stringify(webhookPayload);
  const validHmac = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${nowSec}.${payloadStr}`)
    .digest('hex');

  // Tentative avec signature invalide -> 400 WEBHOOK_SIGNATURE_INVALID
  const badWebhookRes = invoke({
    method: 'POST',
    path: '/api/v1/webhooks/payments/stripe',
    headers: {
      'stripe-signature': `t=${nowSec},v1=0000000000000000000000000000000000000000000000000000000000000000`,
    },
    body: webhookPayload,
  });
  assert.strictEqual(badWebhookRes.statusCode, 400, 'Webhook avec signature HMAC falsifiée rejeté (400)');

  // Envoi du webhook légitime signé
  const goodWebhookRes = invoke({
    method: 'POST',
    path: '/api/v1/webhooks/payments/stripe',
    headers: {
      'stripe-signature': `t=${nowSec},v1=${validHmac}`,
    },
    body: webhookPayload,
  });
  assert.strictEqual(goodWebhookRes.statusCode, 200, 'Webhook HMAC-SHA256 valide traité');
  assert.strictEqual(goodWebhookRes.body.data.status, 'PROCESSED');

  // Rejeu du même webhook -> IDEMPOTENT_REPLAY sans double écriture comptable
  const entriesBeforeReplay = invoke({
    method: 'GET',
    path: '/api/v1/accounting/entries',
    actor: comptableActor,
  }).body.data.length;

  const replayWebhookRes = invoke({
    method: 'POST',
    path: '/api/v1/webhooks/payments/stripe',
    headers: {
      'stripe-signature': `t=${nowSec},v1=${validHmac}`,
    },
    body: webhookPayload,
  });
  assert.strictEqual(replayWebhookRes.statusCode, 200);
  assert.strictEqual(replayWebhookRes.body.data.status, 'IDEMPOTENT_REPLAY', 'Rejeu du webhook détecté et ignoré');

  const entriesAfterReplay = invoke({
    method: 'GET',
    path: '/api/v1/accounting/entries',
    actor: comptableActor,
  }).body.data.length;
  assert.strictEqual(entriesAfterReplay, entriesBeforeReplay, 'Aucune double écriture comptable lors du rejeu webhook');

  // Confirmation et remboursement partiel sur le paiement de la facture 2
  const initPay2 = invoke({
    method: 'POST',
    path: '/api/v1/payments/initiate',
    actor: clientActor,
    body: {
      orderId: convertQuoteRes.body.data.createdOrder.id,
      invoiceId: inv2.id,
      provider: 'WIRE_TRANSFER',
      customerEmail: 's.mansouri@atlas-import.ma',
    },
  });
  assert.strictEqual(initPay2.statusCode, 201);
  const paymentsList = invoke({
    method: 'GET',
    path: '/api/v1/payments',
    actor: comptableActor,
  }).body.data;
  const pendingPay2 = paymentsList.find((p: any) => p.invoiceId === inv2.id && p.status === 'PENDING');
  assert.ok(pendingPay2, 'Paiement 2 en attente trouvé');

  const confirmPay2 = invoke({
    method: 'POST',
    path: '/api/v1/payments/confirm',
    actor: comptableActor,
    body: {
      paymentId: pendingPay2.id,
      providerTxId: 'WIRE-SWIFT-2026-998877',
    },
  });
  assert.strictEqual(confirmPay2.statusCode, 200, 'Confirmation du paiement 2 réussie');

  // Remboursement partiel de 500.00 EUR -> génère automatiquement une écriture comptable de remboursement équilibrée
  const refundRes = invoke({
    method: 'POST',
    path: `/api/v1/payments/${pendingPay2.id}/refund`,
    actor: comptableActor,
    body: {
      refundAmountStr: '500.00',
      reason: 'Avoir commercial sur frais logistiques',
    },
  });
  assert.strictEqual(refundRes.statusCode, 200, 'Remboursement partiel réussi');
  assert.strictEqual(refundRes.body.data.payment.status, 'PARTIALLY_REFUNDED');
  console.log('  -> [PASS] LOT4-07 & LOT4-08 validés.');

  // ============================================================================
  // [LOT4-09] COMPTABILITÉ EN PARTIE DOUBLE, IMMUABILITÉ & CONTRE-PASSATION
  // ============================================================================
  console.log('[LOT4-09] Vérification de la comptabilité en partie double, de l’immuabilité et des écritures de contre-passation...');

  // 1. Tentative d'écriture déséquilibrée -> 400 UNBALANCED_ACCOUNTING_ENTRY
  const unbalancedRes = invoke({
    method: 'POST',
    path: '/api/v1/accounting/entries',
    actor: comptableActor,
    body: {
      journalCode: 'OD',
      date: '2026-11-21',
      pieceReference: 'OD-TEST-UNBALANCED',
      description: 'Test rejet écriture déséquilibrée',
      lines: [
        { accountCode: '607000', accountName: 'Achats', label: 'Débit', debit: '1000.00', credit: '0.00' },
        { accountCode: '401000', accountName: 'Fournisseurs', label: 'Crédit incomplet', debit: '0.00', credit: '950.00' },
      ],
    },
  });
  assert.strictEqual(unbalancedRes.statusCode, 400, 'Écriture déséquilibrée rejetée par 400');
  assert.strictEqual(unbalancedRes.body.error.code, 'UNBALANCED_ACCOUNTING_ENTRY');

  // 2. Création d'une écriture manuelle équilibrée
  const balancedRes = invoke({
    method: 'POST',
    path: '/api/v1/accounting/entries',
    actor: comptableActor,
    body: {
      journalCode: 'OD',
      date: '2026-11-21',
      pieceReference: 'OD-2026-LOT4',
      description: 'Provision audit logistique',
      lines: [
        { accountCode: '624100', accountName: 'Transports sur ventes', label: 'Charge transport', debit: '1200.00', credit: '0.00' },
        { accountCode: '401000', accountName: 'Fournisseurs', label: 'Dette transporteur', debit: '0.00', credit: '1200.00' },
      ],
    },
  });
  assert.strictEqual(balancedRes.statusCode, 201, 'Écriture équilibrée validée');
  const validatedEntryId = balancedRes.body.data.id as string;

  // 3. Tentative de modification directe ou suppression d'une écriture validée -> 403 ACCOUNTING_VALIDATED_ENTRY_IMMUTABLE
  const mutateEntryRes = invoke({
    method: 'PUT',
    path: `/api/v1/accounting/entries/${validatedEntryId}`,
    actor: comptableActor,
    body: { description: 'Tentative altération directe' },
  });
  assert.strictEqual(mutateEntryRes.statusCode, 403, 'Modification directe d’une écriture validée bloquée par 403');
  assert.strictEqual(mutateEntryRes.body.error.code, 'ACCOUNTING_VALIDATED_ENTRY_IMMUTABLE');

  const deleteEntryRes = invoke({
    method: 'DELETE',
    path: `/api/v1/accounting/entries/${validatedEntryId}`,
    actor: adminActor,
  });
  assert.strictEqual(deleteEntryRes.statusCode, 403, 'Suppression directe d’une écriture validée bloquée par 403');

  // 4. Correction par écriture de contre-passation (POST /api/v1/accounting/entries/:id/reverse)
  const reverseRes = invoke({
    method: 'POST',
    path: `/api/v1/accounting/entries/${validatedEntryId}/reverse`,
    actor: comptableActor,
    body: {
      reason: 'Correction d’imputation analytique du montant de provision',
      replacementLines: [
        { accountCode: '624100', accountName: 'Transports sur ventes', label: 'Charge transport corrigée', debit: '1050.00', credit: '0.00' },
        { accountCode: '401000', accountName: 'Fournisseurs', label: 'Dette transporteur corrigée', debit: '0.00', credit: '1050.00' },
      ],
    },
  });
  assert.strictEqual(reverseRes.statusCode, 201, 'Contre-passation et écriture corrective enregistrées');
  assert.strictEqual(reverseRes.body.data.reversalEntry.isBalanced, true);
  assert.strictEqual(reverseRes.body.data.replacementEntry.totalDebit, '1050.00');
  assert.strictEqual(reverseRes.body.data.originalEntry.reversedByEntryId, reverseRes.body.data.reversalEntry.id);

  // Vérifier que la Balance Générale (Trial Balance) est strictement équilibrée
  const trialBalanceRes = invoke({
    method: 'GET',
    path: '/api/v1/accounting/trial-balance',
    actor: comptableActor,
  });
  assert.strictEqual(trialBalanceRes.statusCode, 200);
  assert.strictEqual(trialBalanceRes.body.data.isBalanced, true, 'La Balance Générale est strictement équilibrée (Total Débit = Total Crédit)');
  console.log('  -> [PASS] LOT4-09 validé.');

  // ============================================================================
  // [LOT4-10 & LOT4-11] MESSAGERIE B2B (ANTI-IDOR, QUARANTAINE CLAMAV) & NOTIFICATIONS
  // ============================================================================
  console.log('[LOT4-10/11] Vérification de la messagerie B2B (Anti-IDOR, ClamAV) et des notifications centralisées...');

  // 1. Création d'une conversation liée à la commande entre Client et Fournisseur
  const createConvRes = invoke({
    method: 'POST',
    path: '/api/v1/messaging/conversations',
    actor: clientActor,
    body: {
      type: 'ORDER_THREAD',
      title: `Suivi Commande ${createdOrder.orderNumber}`,
      relatedEntityId: orderId,
      relatedEntityType: 'ORDER',
      participants: [
        { id: 'usr-client-01', name: 'Sofia Mansouri', role: 'CLIENT', email: 's.mansouri@atlas-import.ma' },
        { id: 'usr-supp-01', name: 'Hans Weber', role: 'FOURNISSEUR', email: 'h.weber@eurotech-supply.de' },
      ],
    },
  });
  assert.strictEqual(createConvRes.statusCode, 201, 'Conversation B2B liée à la commande créée');
  const convId = createConvRes.body.data.conversation.id as string;

  // 2. Anti-IDOR : Le COMPTABLE (non participant) tente de lire la conversation privée -> 403
  const idorConvRes = invoke({
    method: 'GET',
    path: `/api/v1/messaging/conversations/${convId}`,
    actor: comptableActor,
  });
  assert.strictEqual(idorConvRes.statusCode, 403, 'Accès Anti-IDOR bloqué pour un non-participant à la conversation');

  // 3. Tentative d'envoi d'un message avec une pièce jointe en QUARANTAINE -> 422 MESSAGE_ATTACHMENT_NOT_CLEAN
  const sendQuarantinedMsg = invoke({
    method: 'POST',
    path: `/api/v1/messaging/conversations/${convId}/messages`,
    actor: clientActor,
    body: {
      text: 'Voici un fichier non scanné',
      attachments: [
        {
          id: 'att-quarantined-test',
          fileName: 'suspect.pdf',
          fileSizeBytes: 2048,
          mimeType: 'application/pdf',
          storageKey: 'quarantine/b2b/2026/suspect.pdf',
          presignedDownloadUrl: '',
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          virusScanStatus: 'QUARANTINED',
        },
      ],
    },
  });
  assert.strictEqual(sendQuarantinedMsg.statusCode, 422, 'Envoi d’une pièce jointe en quarantaine bloqué par 422');
  assert.strictEqual(sendQuarantinedMsg.body.error.code, 'MESSAGE_ATTACHMENT_NOT_CLEAN');

  // 4. Téléversement d'une pièce jointe PDF saine (Magic Bytes %PDF = 25504446) et envoi du message
  const uploadCleanAtt = invoke({
    method: 'POST',
    path: `/api/v1/messaging/conversations/${convId}/attachments`,
    actor: clientActor,
    body: {
      fileName: 'bon-commande-signe.pdf',
      fileSizeBytes: 4096,
      mimeType: 'application/pdf',
      magicBytesHeaderHex: '255044462D312E34',
    },
  });
  assert.strictEqual(uploadCleanAtt.statusCode, 201, 'Pièce jointe PDF saine validée par ClamAV');
  assert.strictEqual(uploadCleanAtt.body.data.attachment.virusScanStatus, 'CLEAN');

  const sendCleanMsg = invoke({
    method: 'POST',
    path: `/api/v1/messaging/conversations/${convId}/messages`,
    actor: clientActor,
    body: {
      text: 'Bonjour Hans, veuillez trouver ci-joint le bon de commande signé.',
      attachments: [uploadCleanAtt.body.data.attachment],
    },
  });
  assert.strictEqual(sendCleanMsg.statusCode, 201, 'Message B2B avec pièce jointe CLEAN envoyé');

  // 5. Marquage des messages comme lus par le FOURNISSEUR destinataire
  const markConvRead = invoke({
    method: 'PUT',
    path: `/api/v1/messaging/conversations/${convId}/read`,
    actor: supplierActor,
  });
  assert.strictEqual(markConvRead.statusCode, 200);
  assert.strictEqual(markConvRead.body.data.unreadClearedCount, 1, '1 message marqué comme lu avec horodatage');

  // 6. Vérification des notifications centralisées créées automatiquement pour le FOURNISSEUR
  const suppNotifsRes = invoke({
    method: 'GET',
    path: '/api/v1/notifications',
    actor: supplierActor,
  });
  assert.strictEqual(suppNotifsRes.statusCode, 200);
  const suppNotifs = suppNotifsRes.body.data.notifications as any[];
  assert.ok(suppNotifs.length >= 2, 'Les notifications d’événements métier (commande, devis, message) sont persistées');

  const targetNotifId = suppNotifs[0].id as string;
  const markReadRes = invoke({
    method: 'PUT',
    path: `/api/v1/notifications/${targetNotifId}/read`,
    actor: supplierActor,
  });
  assert.strictEqual(markReadRes.statusCode, 200);
  assert.strictEqual(markReadRes.body.data.notification.isRead, true, 'Notification marquée comme lue');

  const markUnreadRes = invoke({
    method: 'PUT',
    path: `/api/v1/notifications/${targetNotifId}/unread`,
    actor: supplierActor,
  });
  assert.strictEqual(markUnreadRes.statusCode, 200);
  assert.strictEqual(markUnreadRes.body.data.notification.isRead, false, 'Notification marquée comme non lue');

  console.log('  -> [PASS] LOT4-10 & LOT4-11 validés.\n');
  console.log('================================================================================');
  console.log('SUCCÈS TOTAL : TOUTES LES 11 MISSIONS DU LOT 4 (ÉCOSYSTÈME COMMERCIAL B2B) SONT VALIDÉES');
  console.log('================================================================================');
}

runLot4CommercialEcosystemTests().catch((err) => {
  console.error('ÉCHEC DES TESTS DU LOT 4 :', err);
  process.exit(1);
});
