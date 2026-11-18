// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS INTÉGRATION ÉCOSYSTÈME COMMERCIAL (PROMPT 7)
// - Catégories multilingues FR/EN/AR & Produits
// - Restrictions Comptable Stage 3 (403 lecture seule sur données sources)
// - Mouvements de stock traçables & Alertes de seuil minimum
// - Cycle Devis complet (Demande -> Chiffrage Fournisseur -> Acceptation)
// - Conversion atomique Devis -> Commande & Réservation de stock
// - Facturation légale & Paiements Stripe Idempotents (prévention double débit)
// ============================================================================

import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { ServerRequestContext, ServerResponsePayload } from '../middlewares/errorAndSecurity.middleware';
import { ProductItem, UserRoleCode } from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Échec Assertion : ${message}`);
  }
}

export function createInitialTestDatabase() {
  const initialProducts: (ProductItem & { deletedAt?: string | null })[] = [
    {
      id: 'prod-01',
      sku: 'PAL-EUR-ISO-1200',
      supplierId: 'usr-supp-01',
      supplierName: 'EuroTech Industrial & ColdChain GmbH',
      category: 'COLD_CHAIN',
      name: {
        fr: 'Palette Euro Certifiée Chaîne du Froid',
        en: 'Certified Cold Chain Euro Pallet',
        ar: 'منصة شحن معتمدة لسلسلة التبريد',
      },
      description: {
        fr: 'Palette de manutention traitée NIMP15 pour transport sous température dirigée',
        en: 'ISPM15 treated handling pallet for temperature-controlled logistics',
        ar: 'منصة مناولة معالجة لمعايير الشحن الدولي والمبرد',
      },
      unitPrice: '145.50',
      currency: 'EUR',
      taxRate: '20.00',
      unit: 'PAL',
      stockAvailable: 250,
      stockReserved: 10,
      minStockAlert: 50,
      icon3d: 'cold-chain',
      originCountry: 'Allemagne',
      incoterm: 'CIF',
      leadTimeDays: 3,
      isPublished: true,
    },
  ];

  return {
    products: initialProducts,
    orders: [],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
    quotes: [],
    invoices: [],
    payments: [],
    shipments: [],
    incidents: [],
    stockMovements: [],
    accountingEntries: [],
    logisticsMissions: [],
    vehicles: [],
    transportDocuments: [],
  };
}

export function runCommercialWorkflowTests(): { passed: number; results: string[] } {
  const repo = new TradeLinkRepositoryStore(createInitialTestDatabase(), false);
  const app = new TradeLinkApiApplication(repo);
  const results: string[] = [];
  let passed = 0;

  const makeReq = (
    partial: Partial<ServerRequestContext> & { method: ServerRequestContext['method']; path: string }
  ): ServerResponsePayload<any> => {
    const ctx: ServerRequestContext = {
      correlationId: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ipAddress: '192.168.1.100',
      headers: {},
      query: {},
      params: {},
      body: {},
      ...partial,
    };
    return app.handleRequest(ctx);
  };

  // 1. Initialisation des sessions actives via /api/v1/auth/login
  const clientLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { userId: 'usr-client-01', email: 'client@atlas-distribution.ma', role: 'CLIENT', companyName: 'Atlas Import-Export Distribution' },
  });
  const clientSessionId = (clientLogin.body.data as { sessionId: string }).sessionId;
  const clientUser = {
    id: 'usr-client-01',
    email: 'client@atlas-distribution.ma',
    role: 'CLIENT' as UserRoleCode,
    sessionId: clientSessionId,
    companyName: 'Atlas Import-Export Distribution',
    mfaVerified: true,
  };

  const supplierLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { userId: 'usr-supp-01', email: 'contact@eurotech-gmbh.de', role: 'FOURNISSEUR', companyName: 'EuroTech Industrial & ColdChain GmbH' },
  });
  const supplierSessionId = (supplierLogin.body.data as { sessionId: string }).sessionId;
  const supplierUser = {
    id: 'usr-supp-01',
    email: 'contact@eurotech-gmbh.de',
    role: 'FOURNISSEUR' as UserRoleCode,
    sessionId: supplierSessionId,
    companyName: 'EuroTech Industrial & ColdChain GmbH',
    mfaVerified: true,
  };

  const accountantLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { userId: 'usr-acct-01', email: 'comptable@cabinet-audit.fr', role: 'COMPTABLE', companyName: 'Audit & Expertise Internationale' },
  });
  const accountantSessionId = (accountantLogin.body.data as { sessionId: string }).sessionId;
  const accountantUser = {
    id: 'usr-acct-01',
    email: 'comptable@cabinet-audit.fr',
    role: 'COMPTABLE' as UserRoleCode,
    sessionId: accountantSessionId,
    companyName: 'Audit & Expertise Internationale',
    mfaVerified: true,
  };

  // ==========================================================================
  // [COMM-01] Catalogue & Catégories trilingues avec Icônes 3D
  // ==========================================================================
  const catRes = makeReq({
    method: 'GET',
    path: '/api/v1/categories',
    user: clientUser,
  });
  assert(catRes.statusCode === 200, 'GET /api/v1/categories doit retourner 200');
  assert(catRes.body.data.length >= 5, 'Doit contenir au moins 5 catégories de commerce international');
  assert(catRes.body.data[0].name.fr && catRes.body.data[0].name.ar, 'Catégories trilingues FR/EN/AR avec icône 3D');
  passed++;
  results.push(
    `✓ [COMM-01] Référentiel des catégories trilingues FR/EN/AR avec icônes 3D validé (${catRes.body.data.length} catégories)`
  );

  // ==========================================================================
  // [COMM-02] Création Produit par Fournisseur & Blocage Stage 3 Comptable (403)
  // ==========================================================================
  // 1. Comptable tente de créer un produit -> 403 Forbidden
  const comptableBlock = makeReq({
    method: 'POST',
    path: '/api/v1/products',
    user: accountantUser,
    body: {
      sku: 'ILLEGAL-PRODUCT',
      name: { fr: 'Tentative Comptable', en: 'Attempt', ar: 'محاولة' },
    },
  });
  assert(
    comptableBlock.statusCode === 403,
    'Le rôle COMPTABLE doit être bloqué en 403 sur la création de produit'
  );
  assert(
    comptableBlock.body.error?.code === 'COMPTABLE_STAGE3_READONLY_SOURCE_DATA',
    'Code erreur COMPTABLE_STAGE3_READONLY_SOURCE_DATA obligatoire'
  );

  // 2. Fournisseur crée un produit légitime
  const createProdRes = makeReq({
    method: 'POST',
    path: '/api/v1/products',
    user: supplierUser,
    body: {
      sku: 'CONT-REEFER-40HC-COLD',
      supplierId: supplierUser.id,
      supplierName: supplierUser.companyName,
      category: 'COLD_CHAIN',
      name: {
        fr: 'Conteneur Maritime 40ft Frigorifique High Cube (-25°C)',
        en: '40ft High Cube Refrigerated Sea Container (-25°C)',
        ar: 'حاوية بحرية مبردة 40 قدماً عالية السعة',
      },
      description: {
        fr: 'Conteneur maritime certifié CSC avec groupe frigorifique Carrier Transicold',
        en: 'CSC certified sea container with Carrier Transicold cooling system',
        ar: 'حاوية شحن بحري مبردة معتمدة لمعايير السلامة الدولية',
      },
      unitPrice: '18500.00',
      currency: 'EUR',
      taxRate: '20.00',
      unit: 'CONT',
      stockAvailable: 15,
      stockReserved: 0,
      minStockAlert: 3,
      icon3d: 'container',
      originCountry: 'Allemagne',
      incoterm: 'FOB',
      leadTimeDays: 7,
      isPublished: true,
    },
  });
  assert(createProdRes.statusCode === 201, 'Création produit par Fournisseur doit renvoyer 201');
  const createdProdId = createProdRes.body.data.id;
  passed++;
  results.push(
    `✓ [COMM-02] Création de produit multilingue par le Fournisseur validée & Mutation bloquée en 403 pour le Comptable (Stage 3)`
  );

  // ==========================================================================
  // [COMM-03] Mouvements de stock & Alerte seuil minimum
  // ==========================================================================
  // 1. Comptable tente de modifier le stock -> 403
  const acctStockBlock = makeReq({
    method: 'POST',
    path: '/api/v1/stocks/movements',
    user: accountantUser,
    body: {
      productId: createdProdId,
      movementType: 'IN_PURCHASE',
      quantity: 10,
      reason: 'Ajustement comptable interdit',
    },
  });
  assert(acctStockBlock.statusCode === 403, 'Comptable bloqué sur les mouvements de stock (403)');

  // 2. Fournisseur effectue une sortie déclenchant l'alerte de seuil mini (15 - 13 = 2 <= 3)
  const stockMoveRes = makeReq({
    method: 'POST',
    path: '/api/v1/stocks/movements',
    user: supplierUser,
    body: {
      productId: createdProdId,
      movementType: 'OUT_SALE',
      quantity: 13,
      reason: 'Livraison commande grand export port Hambourg',
      referenceDocument: 'BL-EXP-9921',
    },
  });
  assert(stockMoveRes.statusCode === 201, 'Sortie de stock enregistrée avec 201');
  assert(stockMoveRes.body.data.updatedProduct.stockAvailable === 2, 'Stock restant = 2');
  assert(stockMoveRes.body.data.alertTriggered === true, 'Alerte seuil mini déclenchée (2 <= 3)');
  passed++;
  results.push(
    `✓ [COMM-03] Mouvements de stock traçables & Déclenchement automatique de l’alerte seuil minimum validés`
  );

  // ==========================================================================
  // [COMM-04] Cycle Devis complet : Demande Client -> Chiffrage Fournisseur -> Acceptation
  // ==========================================================================
  // 1. Client demande un devis
  const createQuoteRes = makeReq({
    method: 'POST',
    path: '/api/v1/quotes',
    user: clientUser,
    body: {
      clientId: clientUser.id,
      clientName: clientUser.companyName,
      supplierId: supplierUser.id,
      supplierName: supplierUser.companyName,
      currency: 'EUR',
      validityDays: 15,
      lines: [
        {
          productId: 'prod-01',
          description: 'Palette Euro Certifiée Chaîne du Froid',
          quantity: 20,
          targetPrice: '140.00',
        },
      ],
    },
  });
  assert(createQuoteRes.statusCode === 201, 'Demande de devis Client créée en 201');
  const quoteId = createQuoteRes.body.data.id;
  assert(createQuoteRes.body.data.status === 'SENT', 'Statut initial du devis = SENT');

  // 2. Fournisseur chiffre le devis avec remise 5%
  const quoteRespondRes = makeReq({
    method: 'PUT',
    path: `/api/v1/quotes/${quoteId}/respond`,
    user: supplierUser,
    body: {
      lines: [
        {
          description: 'Palette Euro Certifiée Chaîne du Froid',
          quantity: 20,
          unitPrice: '145.50',
          discountPct: '5.00',
        },
      ],
      validUntilDate: '2026-12-15',
    },
  });
  assert(quoteRespondRes.statusCode === 200, 'Chiffrage Fournisseur validé en 200');
  assert(quoteRespondRes.body.data.status === 'RESPONDED', 'Statut devis = RESPONDED');

  // 3. Client accepte le devis chiffré
  const acceptQuoteRes = makeReq({
    method: 'PUT',
    path: `/api/v1/quotes/${quoteId}/accept`,
    user: clientUser,
  });
  assert(acceptQuoteRes.statusCode === 200, 'Acceptation Client validée en 200');
  assert(acceptQuoteRes.body.data.status === 'ACCEPTED', 'Statut devis = ACCEPTED');
  passed++;
  results.push(
    `✓ [COMM-04] Cycle de vie Devis complet : Demande Client -> Chiffrage Fournisseur (avec remise 5%) -> Acceptation Client validé`
  );

  // ==========================================================================
  // [COMM-05] Conversion atomique Devis -> Commande avec réservation de stock
  // ==========================================================================
  const convertRes = makeReq({
    method: 'POST',
    path: `/api/v1/quotes/${quoteId}/convert`,
    user: clientUser,
    body: {
      shippingAddress: 'Zone Franche Port Tanger Med, Lot 8, Maroc',
    },
  });
  assert(convertRes.statusCode === 201, 'Conversion Devis -> Commande réussie en 201');
  assert(convertRes.body.data.updatedQuote.status === 'CONVERTED', 'Devis marqué CONVERTED');
  const orderCreated = convertRes.body.data.createdOrder;
  assert(orderCreated.status === 'ACCEPTED', 'Commande créée au statut ACCEPTED');
  assert(orderCreated.items[0].quantity === 20, '20 unités commandées');

  // Vérification de la réservation de stock atomique (250 - 20 = 230 disponible, 10 + 20 = 30 réservé)
  const productAfterConvert = repo.findActiveProductById('prod-01');
  assert(productAfterConvert?.stockAvailable === 230, 'Stock disponible décrémenté atomiquement à 230');
  assert(productAfterConvert?.stockReserved === 30, 'Stock réservé incrémenté atomiquement à 30');
  passed++;
  results.push(
    `✓ [COMM-05] Conversion atomique Devis -> Commande avec réservation de stock déterministe validée`
  );

  // ==========================================================================
  // [COMM-06] Facturation & Paiement Stripe Test Webhook Idempotent
  // ==========================================================================
  // 1. Génération de facture à partir de la commande
  const invoiceRes = makeReq({
    method: 'POST',
    path: '/api/v1/invoices/generate',
    user: supplierUser,
    body: {
      orderId: orderCreated.id,
      dueInDays: 30,
      jurisdiction: 'France / UE (TVA 20%)',
    },
  });
  assert(invoiceRes.statusCode === 201, 'Facture légale générée en 201');
  const invoiceData = invoiceRes.body.data;
  assert(invoiceData.invoiceNumber.startsWith('FAC-2026-'), 'Numérotation de facture conforme');
  assert(invoiceData.status === 'ISSUED', 'Statut facture = ISSUED');

  // 2. Création session de paiement Stripe Test
  const stripeSessionRes = makeReq({
    method: 'POST',
    path: '/api/v1/payments/stripe/checkout-session',
    user: clientUser,
    body: {
      orderId: orderCreated.id,
      invoiceId: invoiceData.id,
    },
  });
  assert(stripeSessionRes.statusCode === 201, 'Session Stripe Test générée en 201');
  const sessionData = stripeSessionRes.body.data;
  assert(sessionData.sessionId.startsWith('cs_test_'), 'ID session Stripe cs_test_...');

  // 3. Simulation Webhook Stripe checkout.session.completed
  const webhookEventId = `evt_stripe_test_${Date.now()}`;
  const amountCents = Math.round(parseFloat(invoiceData.totalAmount) * 100);

  const webhookPayload = {
    id: webhookEventId,
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: sessionData.sessionId,
        amount_total: amountCents,
        currency: 'eur',
        customer_email: clientUser.email,
        metadata: {
          orderId: orderCreated.id,
          invoiceId: invoiceData.id,
          clientId: clientUser.id,
          supplierId: supplierUser.id,
        },
        payment_status: 'paid',
      },
    },
  };

  const webhookRes = makeReq({
    method: 'POST',
    path: '/api/v1/payments/stripe/webhook',
    body: webhookPayload,
  });
  assert(webhookRes.statusCode === 200, 'Webhook Stripe traité avec 200');
  assert(webhookRes.body.data.status === 'PROCESSED', 'Webhook marqué PROCESSED');
  assert(webhookRes.body.data.invoice.status === 'PAID', 'Facture passée au statut PAID');
  assert(webhookRes.body.data.order.status === 'PREPARING', 'Commande passée au statut PREPARING');

  // 4. Test d'idempotence stricte : Rejeu immédiat du même événement webhook
  const replayWebhookRes = makeReq({
    method: 'POST',
    path: '/api/v1/payments/stripe/webhook',
    body: webhookPayload,
  });
  assert(replayWebhookRes.statusCode === 200, 'Rejeu webhook retourne 200');
  assert(
    replayWebhookRes.body.data.status === 'IDEMPOTENT_REPLAY',
    'Rejeu détecté comme IDEMPOTENT_REPLAY sans créer de second paiement'
  );

  const allPayments = repo.getSnapshot().payments;
  const paymentsForEvent = allPayments.filter((p) => p.webhookEventId === webhookEventId);
  assert(paymentsForEvent.length === 1, 'Exactement UN paiement enregistré pour cet eventId (aucun doublon)');
  passed++;
  results.push(
    `✓ [COMM-06] Facturation légale, Intégration Stripe Webhook & Idempotence stricte anti-double débit validées`
  );

  return { passed, results };
}

// Exécution directe si invoqué par Node.js
if (typeof require !== 'undefined' && require.main === module) {
  const { passed, results } = runCommercialWorkflowTests();
  console.log('\n=== SUITE DE TESTS ÉCOSYSTÈME COMMERCIAL TRADELINK V6.0 (' + passed + '/6 RÉUSSIS) ===');
  results.forEach((r) => console.log(r));
}
