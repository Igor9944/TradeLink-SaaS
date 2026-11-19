// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.

import assert from 'assert';
import Decimal from 'decimal.js';
import {
  CentralCatalogEngine,
} from '../../services/catalogEngine';
import {
  CentralStockEngine,
} from '../../services/stockEngine';
import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { registerSingleActiveSession, ServerRequestContext } from '../middlewares/errorAndSecurity.middleware';

console.log('\n====================================================================');
console.log('TRADELINK V6.0 — SUITE DE TESTS GESTION DES STOCKS & DISPONIBILITÉS');
console.log('====================================================================\n');

async function runStockManagementTestSuite() {
  // Initialisation dédiée du moteur de catalogue et du moteur de stock
  const catalog = new CentralCatalogEngine([], []);
  const stock = new CentralStockEngine(catalog);

  // Acteurs de test
  const adminActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-admin-01',
    email: 'direction@tradelink-saas.com',
    role: 'ADMIN',
    companyName: 'TradeLink Direction Générale',
    sessionId: 'sess-stk-admin-01',
    mfaVerified: true,
  };
  registerSingleActiveSession(adminActor.id, adminActor.sessionId);

  const supplierActorA: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-supp-01',
    email: 'export@eurotech-gmbh.de',
    role: 'FOURNISSEUR',
    companyName: 'EuroTech Industrial GmbH',
    sessionId: 'sess-stk-supp-01',
  };
  registerSingleActiveSession(supplierActorA.id, supplierActorA.sessionId);

  const supplierActorB: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-supp-02',
    email: 'contact@maghreb-agri.ma',
    role: 'FOURNISSEUR',
    companyName: 'Maghreb Agro-Export S.A.',
    sessionId: 'sess-stk-supp-02',
  };
  registerSingleActiveSession(supplierActorB.id, supplierActorB.sessionId);

  const comptableActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-compta-01',
    email: 'finance@tradelink-saas.com',
    role: 'COMPTABLE',
    companyName: 'Cabinet Audit & Finance',
    sessionId: 'sess-stk-compta-01',
  };
  registerSingleActiveSession(comptableActor.id, comptableActor.sessionId);

  const clientActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-client-01',
    email: 'youssef@atlastrading.ma',
    role: 'CLIENT',
    companyName: 'Atlas Trading & Imports',
    sessionId: 'sess-stk-client-01',
  };
  registerSingleActiveSession(clientActor.id, clientActor.sessionId);

  // Produit de test Fournisseur A
  const productA = catalog.createProduct({
    sku: 'TL-TEST-PHARMA-100',
    supplierId: supplierActorA.id,
    supplierName: supplierActorA.companyName || 'EuroTech GmbH',
    category: 'Chaîne du Froid',
    originCountry: 'DE',
    incoterm: 'CIP',
    leadTimeDays: 4,
    name: {
      fr: 'Conteneur Isotherme Pharma Active 100L',
      en: 'Active Pharma Container 100L',
      ar: 'حاوية أدوية عازلة للحرارة 100 لتر',
    },
    description: {
      fr: 'Conteneur certifié ATP pour transport thermosensible.',
      en: 'ATP-certified container for cold-chain logistics.',
      ar: 'حاوية معتمدة لسلسلة التبريد الدوائي.',
    },
    unitPrice: '1200.00',
    currency: 'EUR',
    stockAvailable: 50,
    minStockAlert: 10,
    minOrderQuantity: 2,
    unit: 'UNITÉ',
  });

  // Produit de test Fournisseur B
  const productB = catalog.createProduct({
    sku: 'TL-TEST-DATES-MEDJOOL',
    supplierId: supplierActorB.id,
    supplierName: supplierActorB.companyName || 'Maghreb Agro',
    category: 'Agroalimentaire',
    originCountry: 'MA',
    incoterm: 'FOB',
    leadTimeDays: 7,
    name: {
      fr: 'Dattes Medjool Premium Export 5kg',
      en: 'Premium Medjool Dates 5kg',
      ar: 'تمور المجهول الفاخرة للتصدير 5 كغ',
    },
    description: {
      fr: 'Dattes Medjool calibrées calibre Jumbo pour marché européen.',
      en: 'Calibrated Medjool dates Jumbo grade for European distribution.',
      ar: 'تمور مجهول صنف ممتاز للأسواق الأوروبية.',
    },
    unitPrice: '45.00',
    currency: 'EUR',
    stockAvailable: 200,
    minStockAlert: 25,
    minOrderQuantity: 10,
    unit: 'CARTON',
  });

  // --------------------------------------------------------------------------
  // [STK-01] Multi-États des Stocks & Cohérence Arithmétique
  // --------------------------------------------------------------------------
  console.log('🔹 [STK-01] Multi-États des Stocks & Cohérence Arithmétique...');
  {
    const overview = stock.getOverview(supplierActorA.id);
    assert.strictEqual(overview.totalReferences, 1, 'Le fournisseur A doit avoir 1 référence.');
    assert.strictEqual(overview.totalAvailable, 50, 'Le stock disponible initial doit être 50.');
    assert.strictEqual(overview.totalReserved, 0, 'Le stock réservé initial doit être 0.');
    assert.strictEqual(overview.totalOrdered, 0, 'Le stock commandé initial doit être 0.');
    assert.strictEqual(overview.totalShipped, 0, 'Le stock expédié initial doit être 0.');
    assert.strictEqual(overview.products[0].stockStatus, 'IN_STOCK', 'Le statut doit être IN_STOCK.');
    console.log('  ✅ [STK-01] Multi-quantités initiales et états vérifiés avec succès.');
  }

  // --------------------------------------------------------------------------
  // [STK-02] Entrées de Stock (INBOUND_RECEIPT) & Traçabilité Complète
  // --------------------------------------------------------------------------
  console.log('🔹 [STK-02] Entrées de Stock (INBOUND_RECEIPT) & Traçabilité...');
  {
    const inbound = stock.recordInbound({
      productId: productA.id,
      quantity: 30,
      reason: 'Réception bon de livraison fournisseur BL-2026-9921',
      referenceDocument: 'BL-2026-9921',
      batchNumber: 'LOT-PHARMA-2026-A1',
      actor: supplierActorA,
    });

    assert.strictEqual(inbound.movementType, 'INBOUND_RECEIPT', 'Type de mouvement INBOUND_RECEIPT attendu.');
    assert.strictEqual(inbound.quantityChange, 30, 'Variation de quantité de +30.');
    assert.strictEqual(inbound.resultingAvailable, 80, 'Stock dispo résultant 80.');
    assert.strictEqual(inbound.referenceDocument, 'BL-2026-9921');
    assert.strictEqual(inbound.batchNumber, 'LOT-PHARMA-2026-A1');
    assert.strictEqual(inbound.performedByUserId, supplierActorA.id);

    const refreshed = catalog.getProductById(productA.id)!;
    assert.strictEqual(refreshed.stockAvailable, 80, 'Catalogue synchronisé à 80.');

    // Erreur si quantité <= 0
    assert.throws(
      () =>
        stock.recordInbound({
          productId: productA.id,
          quantity: -5,
          reason: 'Erreur',
          actor: supplierActorA,
        }),
      (err: any) => err.code === 'INVALID_QUANTITY'
    );

    // Erreur si motif manquant
    assert.throws(
      () =>
        stock.recordInbound({
          productId: productA.id,
          quantity: 10,
          reason: '',
          actor: supplierActorA,
        }),
      (err: any) => err.code === 'MISSING_REASON'
    );

    console.log('  ✅ [STK-02] Entrée de stock et contrôles de validation certifiés.');
  }

  // --------------------------------------------------------------------------
  // [STK-03] Réservations Atomiques Côté Serveur & Prévention Anti-Overselling
  // --------------------------------------------------------------------------
  console.log('🔹 [STK-03] Réservations Atomiques Côté Serveur & Anti-Overselling...');
  {
    // Réservation normale de 20 unités sur les 80 disponibles
    const reservations = stock.reserveStockForOrder({
      orderId: 'ord-test-1001',
      orderNumber: 'CMD-2026-1001',
      clientId: clientActor.id,
      clientName: clientActor.companyName,
      items: [{ productId: productA.id, quantity: 20 }],
      ttlMinutes: 45,
      actor: clientActor,
    });

    assert.strictEqual(reservations.length, 1);
    assert.strictEqual(reservations[0].quantity, 20);
    assert.strictEqual(reservations[0].status, 'ACTIVE');

    const refreshed = catalog.getProductById(productA.id)!;
    assert.strictEqual(refreshed.stockAvailable, 60, 'Stock dispo décrémenté à 60 (80 - 20).');
    assert.strictEqual(refreshed.stockReserved, 20, 'Stock réservé incrémenté à 20.');
    assert.strictEqual(refreshed.stockOrdered, 20, 'Stock commandé incrémenté à 20.');

    // Tentative de sur-réservation concurrente : demande 70 alors que dispo = 60
    assert.throws(
      () =>
        stock.reserveStockForOrder({
          orderId: 'ord-test-1002',
          orderNumber: 'CMD-2026-1002',
          clientId: clientActor.id,
          items: [{ productId: productA.id, quantity: 70 }],
          actor: clientActor,
        }),
      (err: any) => {
        assert.strictEqual(err.code, 'INSUFFICIENT_STOCK_FOR_RESERVATION');
        return true;
      }
    );

    // Vérifier l'atomicité stricte : le stock n'a pas bougé suite au rejet
    const unchanged = catalog.getProductById(productA.id)!;
    assert.strictEqual(unchanged.stockAvailable, 60, 'Le stock disponible doit rester à 60.');
    assert.strictEqual(unchanged.stockReserved, 20, 'Le stock réservé doit rester à 20.');

    console.log('  ✅ [STK-03] Réservation atomique et protection anti-surréservation validées.');
  }

  // --------------------------------------------------------------------------
  // [STK-04] Libération de Réservation (RESERVATION_RELEASE / Annulation)
  // --------------------------------------------------------------------------
  console.log('🔹 [STK-04] Libération de Réservation suite à Annulation...');
  {
    const releaseMovements = stock.releaseReservation({
      orderId: 'ord-test-1001',
      reason: 'Annulation de commande par le client',
      actor: clientActor,
    });

    assert.strictEqual(releaseMovements.length, 1);
    assert.strictEqual(releaseMovements[0].movementType, 'RESERVATION_RELEASE');
    assert.strictEqual(releaseMovements[0].quantityChange, 20);

    const restored = catalog.getProductById(productA.id)!;
    assert.strictEqual(restored.stockAvailable, 80, 'Stock dispo restauré à 80.');
    assert.strictEqual(restored.stockReserved, 0, 'Stock réservé remis à 0.');
    assert.strictEqual(restored.stockOrdered, 0, 'Stock commandé remis à 0.');

    const resList = stock.listReservations({ orderId: 'ord-test-1001' });
    assert.strictEqual(resList[0].status, 'CANCELLED');

    console.log('  ✅ [STK-04] Restitution complète des stocks lors de l’annulation certifiée.');
  }

  // --------------------------------------------------------------------------
  // [STK-05] Balayage Automatique des Réservations Expirées (TTL Sweep)
  // --------------------------------------------------------------------------
  console.log('🔹 [STK-05] Balayage TTL des Réservations Expirées...');
  {
    // Création d'une réservation avec expiration passée
    const reservations = stock.reserveStockForOrder({
      orderId: 'ord-test-ttl-expired',
      orderNumber: 'CMD-2026-TTL',
      clientId: clientActor.id,
      items: [{ productId: productA.id, quantity: 15 }],
      ttlMinutes: -10, // Expirée il y a 10 minutes !
      actor: clientActor,
    });

    assert.strictEqual(reservations[0].status, 'ACTIVE');
    assert.strictEqual(catalog.getProductById(productA.id)!.stockAvailable, 65);

    // Déclenchement du balayage TTL
    const sweepResult = stock.expirePendingReservations();
    assert.strictEqual(sweepResult.expiredCount, 1, '1 réservation doit être expirée.');
    assert.strictEqual(sweepResult.releasedMovements[0].movementType, 'RESERVATION_RELEASE');

    const sweepRestored = catalog.getProductById(productA.id)!;
    assert.strictEqual(sweepRestored.stockAvailable, 80, 'Stock restauré à 80.');
    assert.strictEqual(sweepRestored.stockReserved, 0, 'Stock réservé à 0.');

    const res = stock.getReservationById(reservations[0].id)!;
    assert.strictEqual(res.status, 'EXPIRED', 'Statut de réservation passé à EXPIRED.');

    console.log('  ✅ [STK-05] Nettoyage et libération automatique TTL opérationnels.');
  }

  // --------------------------------------------------------------------------
  // [STK-06] Sortie Définitive Expédition (OUTBOUND_SHIPMENT / FULFILLMENT)
  // --------------------------------------------------------------------------
  console.log('🔹 [STK-06] Sortie Définitive Expédition (SHIPPED)...');
  {
    // Réservation de 25 unités pour expédition
    stock.reserveStockForOrder({
      orderId: 'ord-test-to-ship',
      orderNumber: 'CMD-2026-EXP-01',
      clientId: clientActor.id,
      items: [{ productId: productA.id, quantity: 25 }],
      actor: clientActor,
    });

    // Confirmation d'expédition
    const fulfillMovements = stock.fulfillReservation({
      orderId: 'ord-test-to-ship',
      referenceDocument: 'BL-EXP-2026-0044',
      reason: 'Expédition prise en charge par le transporteur',
      actor: supplierActorA,
    });

    assert.strictEqual(fulfillMovements.length, 1);
    assert.strictEqual(fulfillMovements[0].movementType, 'OUTBOUND_SHIPMENT');
    assert.strictEqual(fulfillMovements[0].quantityChange, -25);

    const shippedProduct = catalog.getProductById(productA.id)!;
    assert.strictEqual(shippedProduct.stockAvailable, 55, 'Dispo reste à 55.');
    assert.strictEqual(shippedProduct.stockReserved, 0, 'Réservé soldé à 0.');
    assert.strictEqual(shippedProduct.stockShipped, 25, 'Quantité expédiée à 25.');

    console.log('  ✅ [STK-06] Confirmation de sortie définitive et expédition validées.');
  }

  // --------------------------------------------------------------------------
  // [STK-07] Ajustements Manuels de Stock (Casse, Perte, Régularisation)
  // --------------------------------------------------------------------------
  console.log('🔹 [STK-07] Ajustements Manuels de Stock (Casse & Perte)...');
  {
    // Perte / casse de 5 unités
    const scrapMovement = stock.adjustStock({
      productId: productA.id,
      deltaAvailable: -5,
      reason: 'Casse accidentelle lors de la manipulation en entrepôt',
      movementType: 'SCRAP_OR_LOSS',
      referenceDocument: 'INC-2026-CASSE-01',
      actor: supplierActorA,
    });

    assert.strictEqual(scrapMovement.movementType, 'SCRAP_OR_LOSS');
    assert.strictEqual(scrapMovement.quantityChange, -5);
    assert.strictEqual(scrapMovement.resultingAvailable, 50);

    // Rejet si l'ajustement rendrait le stock négatif
    assert.throws(
      () =>
        stock.adjustStock({
          productId: productA.id,
          deltaAvailable: -100,
          reason: 'Perte excessive impossible',
          actor: supplierActorA,
        }),
      (err: any) => err.code === 'INVALID_NEGATIVE_STOCK'
    );

    console.log('  ✅ [STK-07] Ajustements manuels avec contrôle négatif certifiés.');
  }

  // --------------------------------------------------------------------------
  // [STK-08] Session d'Inventaire Physique & Rapprochement d'Écarts Multi-Produits
  // --------------------------------------------------------------------------
  console.log('🔹 [STK-08] Session d’Inventaire Physique & Rapprochement...');
  {
    // Création session d'inventaire pour Fournisseur A
    const session = stock.createInventorySession({
      supplierId: supplierActorA.id,
      supplierName: supplierActorA.companyName || 'EuroTech GmbH',
      title: 'Inventaire Trimestriel Q4 Entrepôt Central',
      conductedBy: supplierActorA,
      notes: 'Comptage physique contradictoire',
    });

    assert.strictEqual(session.status, 'IN_PROGRESS');
    assert.strictEqual(session.lines.length, 1);
    assert.strictEqual(session.totalTheoreticalQty, 50);

    // Saisie du comptage physique : on constate 53 unités (+3 unités en surplus)
    const updatedSession = stock.updateInventoryCount(
      session.id,
      [{ productId: productA.id, physicalCounted: 53, notes: 'Surplus trouvé en travée B4' }],
      supplierActorA
    );

    assert.strictEqual(updatedSession.lines[0].varianceQuantity, 3);
    const expectedVarianceVal = new Decimal(3).times(1200).toFixed(2); // 3600.00 EUR
    assert.strictEqual(updatedSession.lines[0].varianceValueEur, expectedVarianceVal);
    assert.strictEqual(updatedSession.totalVarianceValueEur, expectedVarianceVal);

    // Rapprochement officiel de l'inventaire
    const reconcileResult = stock.reconcileInventorySession(
      session.id,
      supplierActorA,
      'Validation finale des écarts d’inventaire'
    );

    assert.strictEqual(reconcileResult.session.status, 'COMPLETED');
    assert.strictEqual(reconcileResult.adjustmentsMade.length, 1);
    assert.strictEqual(reconcileResult.adjustmentsMade[0].movementType, 'INVENTORY_ADJUSTMENT');
    assert.strictEqual(reconcileResult.adjustmentsMade[0].resultingAvailable, 53);

    const reconciledProd = catalog.getProductById(productA.id)!;
    assert.strictEqual(reconciledProd.stockAvailable, 53, 'Stock ajusté au comptage réel 53.');

    console.log('  ✅ [STK-08] Inventaire physique, calcul des variances et valorisation validés.');
  }

  // --------------------------------------------------------------------------
  // [STK-09] Alertes Automatiques de Seuil Bas & Ruptures de Stock
  // --------------------------------------------------------------------------
  console.log('🔹 [STK-09] Alertes de Seuil Bas & Ruptures de Stock...');
  {
    // Seuil d'alerte configuré sur productA = 10.
    // Stock actuel = 53.
    // Ajustons à 8 (inférieur au seuil de 10)
    stock.adjustStock({
      productId: productA.id,
      newStockAvailable: 8,
      reason: 'Sortie importante',
      actor: supplierActorA,
    });

    const lowAlerts = stock.getAlerts(supplierActorA.id);
    assert(lowAlerts.length >= 1, 'Au moins 1 alerte doit être levée.');
    assert.strictEqual(lowAlerts[0].severity, 'WARNING_LOW');
    assert.strictEqual(lowAlerts[0].stockAvailable, 8);

    // Ajustons maintenant à 0 (rupture critique)
    stock.adjustStock({
      productId: productA.id,
      newStockAvailable: 0,
      reason: 'Rupture totale',
      actor: supplierActorA,
    });

    const criticalAlerts = stock.getAlerts(supplierActorA.id);
    const critical = criticalAlerts.find((a) => a.severity === 'CRITICAL_OUT' && !a.resolved);
    assert(critical, 'Une alerte critique de rupture doit être active.');

    // Réapprovisionnement : entrée de stock de 50 unités
    stock.recordInbound({
      productId: productA.id,
      quantity: 50,
      reason: 'Réapprovisionnement d’urgence',
      actor: supplierActorA,
    });

    const unresolvedAfterInbound = stock.getAlerts(supplierActorA.id, true);
    assert.strictEqual(unresolvedAfterInbound.length, 0, 'Toutes les alertes doivent être résolues après réapprovisionnement.');

    console.log('  ✅ [STK-09] Cycle complet des alertes de seuil et ruptures certifié.');
  }

  // --------------------------------------------------------------------------
  // [STK-10] Cloisonnement RBAC & Sécurité Anti-IDOR (Stage 3 : Comptable en Lecture Seule)
  // --------------------------------------------------------------------------
  console.log('🔹 [STK-10] Sécurité Anti-IDOR & Lecture Seule Comptable (Stage 3)...');
  {
    // 1. Anti-IDOR : Fournisseur B essaie de modifier le stock du Fournisseur A
    assert.throws(
      () =>
        stock.adjustStock({
          productId: productA.id, // Appartient à supplierActorA
          newStockAvailable: 10,
          reason: 'Tentative malveillante',
          actor: supplierActorB,
        }),
      (err: any) => err.code === 'FORBIDDEN_IDOR_STOCK_ACCESS'
    );

    // 2. Anti-IDOR : Fournisseur A essaie d'inventorier les produits du Fournisseur B
    assert.throws(
      () =>
        stock.createInventorySession({
          supplierId: supplierActorB.id,
          supplierName: 'Maghreb Agro',
          title: 'Tentative intrusion inventaire',
          conductedBy: supplierActorA,
        }),
      (err: any) => err.code === 'FORBIDDEN_IDOR_INVENTORY'
    );

    // 3. Règle Stage 3 : Le COMPTABLE est en lecture seule stricte
    assert.throws(
      () =>
        stock.recordInbound({
          productId: productA.id,
          quantity: 10,
          reason: 'Tentative saisie par comptable',
          actor: comptableActor,
        }),
      (err: any) => err.code === 'FORBIDDEN_COMPTABLE_READ_ONLY'
    );

    assert.throws(
      () =>
        stock.adjustStock({
          productId: productA.id,
          deltaAvailable: 5,
          reason: 'Ajustement comptable interdit',
          actor: comptableActor,
        }),
      (err: any) => err.code === 'FORBIDDEN_COMPTABLE_READ_ONLY'
    );

    assert.throws(
      () =>
        stock.createInventorySession({
          supplierId: supplierActorA.id,
          supplierName: 'EuroTech',
          title: 'Inventaire lancé par comptable',
          conductedBy: comptableActor,
        }),
      (err: any) => err.code === 'FORBIDDEN_COMPTABLE_READ_ONLY'
    );

    console.log('  ✅ [STK-10] Cloisonnement Anti-IDOR et interdiction de mutation comptable certifiés.');
  }

  // --------------------------------------------------------------------------
  // [STK-11] Rapport Financier de Valorisation & Rotation des Stocks (Decimal.js)
  // --------------------------------------------------------------------------
  console.log('🔹 [STK-11] Rapport Financier de Valorisation & Rotation...');
  {
    const reportA = stock.getValuationReport(supplierActorA.id);
    assert.strictEqual(reportA.totalReferencesCount, 1);
    assert.strictEqual(reportA.totalAvailableUnits, 50); // Suite à réapprovisionnement
    // 50 * 1200.00 = 60000.00 EUR
    assert.strictEqual(reportA.totalAvailableValueEur, '60000.00');
    assert(reportA.turnoverRatioAnnualEstimate !== undefined);
    assert(Array.isArray(reportA.topMovingProducts));

    // Rapport consolidé global (ADMIN / COMPTABLE)
    const globalReport = stock.getValuationReport();
    assert.strictEqual(globalReport.totalReferencesCount, 2);
    // Product B: 200 * 45 = 9000.00 EUR. Total: 60000 + 9000 = 69000.00 EUR
    assert.strictEqual(globalReport.totalAvailableValueEur, '69000.00');

    console.log('  ✅ [STK-11] Rapport financier et valorisation en devises validés.');
  }

  // --------------------------------------------------------------------------
  // [API-01] Validation des Routes REST API sous /api/v1/stocks/*
  // --------------------------------------------------------------------------
  console.log('🔹 [API-01] Validation des Routes REST API sous /api/v1/stocks/*...');
  {
    const store = new TradeLinkRepositoryStore({
      products: [
        { ...productA, stockAvailable: 50, stockReserved: 0, minStockAlert: 10, deletedAt: null },
        { ...productB, stockAvailable: 200, stockReserved: 0, minStockAlert: 25, deletedAt: null },
      ],
      orders: [],
      quotes: [],
      invoices: [],
      payments: [],
      shipments: [],
      incidents: [],
      stockMovements: [],
      auditLogs: [],
      kycDossiers: [],
      backups: [],
      rooms: [],
      calcHistory: [],
    });
    const app = new TradeLinkApiApplication(store);

    const req = (opts: Partial<ServerRequestContext> & { method: string; path: string; user?: any }): ServerRequestContext => ({
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'corr-stk-api',
      ipAddress: '127.0.0.1',
      ...opts,
    });

    // 1. GET /api/v1/stocks/overview
    const resOverview = app.handleRequest(req({
      method: 'GET',
      path: '/api/v1/stocks/overview',
      user: adminActor,
    }));
    assert.strictEqual(resOverview.statusCode, 200);
    assert((resOverview.body as any).data.totalAvailable !== undefined);

    // 2. POST /api/v1/stocks/inbound
    const resInbound = app.handleRequest(req({
      method: 'POST',
      path: '/api/v1/stocks/inbound',
      user: supplierActorA,
      body: {
        productId: productA.id,
        quantity: 15,
        reason: 'Livraison express BL-API-001',
        referenceDocument: 'BL-API-001',
      },
    }));
    assert.strictEqual(resInbound.statusCode, 201);
    assert.strictEqual((resInbound.body as any).data.movementType, 'INBOUND_RECEIPT');

    // 3. POST /api/v1/stocks/adjust
    const resAdjust = app.handleRequest(req({
      method: 'POST',
      path: '/api/v1/stocks/adjust',
      user: supplierActorA,
      body: {
        productId: productA.id,
        deltaAvailable: -2,
        reason: 'Contrôle qualité échantillon',
      },
    }));
    assert.strictEqual(resAdjust.statusCode, 200);

    // 4. POST /api/v1/stocks/reserve
    const resReserve = app.handleRequest(req({
      method: 'POST',
      path: '/api/v1/stocks/reserve',
      user: supplierActorA,
      body: {
        orderId: 'ord-api-test-1',
        orderNumber: 'CMD-API-01',
        clientId: clientActor.id,
        items: [{ productId: productA.id, quantity: 5 }],
      },
    }));
    assert.strictEqual(resReserve.statusCode, 201);
    assert.strictEqual((resReserve.body as any).data.length, 1);

    // 5. POST /api/v1/stocks/release
    const resRelease = app.handleRequest(req({
      method: 'POST',
      path: '/api/v1/stocks/release',
      user: supplierActorA,
      body: {
        orderId: 'ord-api-test-1',
        reason: 'Annulation commande API',
      },
    }));
    assert.strictEqual(resRelease.statusCode, 200);

    // 6. POST /api/v1/stocks/inventory
    const resInv = app.handleRequest(req({
      method: 'POST',
      path: '/api/v1/stocks/inventory',
      user: supplierActorA,
      body: {
        supplierId: supplierActorA.id,
        title: 'Inventaire API Fournisseur',
      },
    }));
    assert.strictEqual(resInv.statusCode, 201);
    const invSessionId = (resInv.body as any).data.id;

    // 7. PUT /api/v1/stocks/inventory/:id/count
    const resCount = app.handleRequest(req({
      method: 'PUT',
      path: `/api/v1/stocks/inventory/${invSessionId}/count`,
      user: supplierActorA,
      body: {
        counts: [{ productId: productA.id, physicalCounted: 60 }],
      },
    }));
    assert.strictEqual(resCount.statusCode, 200);

    // 8. PUT /api/v1/stocks/inventory/:id/reconcile
    const resReconcile = app.handleRequest(req({
      method: 'PUT',
      path: `/api/v1/stocks/inventory/${invSessionId}/reconcile`,
      user: supplierActorA,
      body: { notes: 'Clôturé via API' },
    }));
    assert.strictEqual(resReconcile.statusCode, 200);
    assert.strictEqual((resReconcile.body as any).data.session.status, 'COMPLETED');

    // 9. GET /api/v1/stocks/movements
    const resMovements = app.handleRequest(req({
      method: 'GET',
      path: '/api/v1/stocks/movements',
      user: supplierActorA,
    }));
    assert.strictEqual(resMovements.statusCode, 200);
    assert(Array.isArray((resMovements.body as any).data));

    // 10. GET /api/v1/stocks/reports/valuation (accessible au Comptable)
    const resValuation = app.handleRequest(req({
      method: 'GET',
      path: '/api/v1/stocks/reports/valuation',
      user: comptableActor,
    }));
    assert.strictEqual(resValuation.statusCode, 200);
    assert((resValuation.body as any).data.totalAvailableValueEur !== undefined);

    // 11. Test Stage 3 : Comptable bloqué en écriture (POST /inbound -> 403)
    const resComptaBlocked = app.handleRequest(req({
      method: 'POST',
      path: '/api/v1/stocks/inbound',
      user: comptableActor,
      body: {
        productId: productA.id,
        quantity: 10,
        reason: 'Tentative comptable',
      },
    }));
    assert.strictEqual(resComptaBlocked.statusCode, 403);

    console.log('  ✅ [API-01] 11 endpoints REST /api/v1/stocks/* certifiés et protégés.');
  }

  console.log('\n====================================================================');
  console.log('🎉 TOUS LES TESTS DE GESTION DES STOCKS (12/12) ONT RÉUSSI !');
  console.log('Disponibilités, réservations, inventaires et alertes 100% opérationnels.');
  console.log('====================================================================\n');
}

runStockManagementTestSuite().catch((err) => {
  console.error('\n❌ ÉCHEC DE LA SUITE DE TESTS GESTION DES STOCKS :', err);
  process.exit(1);
});
